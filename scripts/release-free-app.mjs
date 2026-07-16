import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const isWindows = process.platform === 'win32'
const rootDir = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)))
const distDir = path.join(rootDir, 'dist')
const androidDir = path.join(rootDir, 'android')
const apkDownloadPath = '/downloads/click-foundry-android.apk'
const apkOutputPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk')
const apkDistPath = path.join(distDir, 'downloads', 'click-foundry-android.apk')
const localJavaHome = path.join(os.homedir(), '.click-foundry', 'jdk-21')

function parseOptions() {
  const parsed = {
    allowDirty: false,
    projectName: process.env.CLOUDFLARE_PAGES_PROJECT || 'click-foundry',
    skipDeploy: false,
  }
  const args = process.argv.slice(2)
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    const next = args[index + 1]
    if (arg === '--allow-dirty') {
      parsed.allowDirty = true
    } else if (arg === '--project-name' && next) {
      parsed.projectName = next
      index += 1
    } else if (arg === '--skip-deploy') {
      parsed.skipDeploy = true
    } else if (arg === '--help') {
      parsed.help = true
    } else {
      throw new Error(`Unknown option: ${arg}`)
    }
  }
  return parsed
}

function quoteForCmd(arg) {
  return /[\s"&|<>^]/.test(arg) ? `"${arg.replaceAll('"', '""')}"` : arg
}

function run(command, commandArgs, options = {}) {
  if (isWindows && command.toLowerCase().endsWith('.bat')) {
    const commandLine = [command, ...commandArgs].map(quoteForCmd).join(' ')
    run(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', commandLine], options)
    return
  }
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', cwd: rootDir, ...options })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} ${commandArgs.join(' ')} exited with ${result.status}.`)
}

function capture(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, { encoding: 'utf8', cwd: rootDir, ...options })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error((result.stderr || `${command} ${commandArgs.join(' ')} failed.`).trim())
  return result.stdout.trim()
}

function runNpm(commandArgs, options = {}) {
  if (isWindows) {
    const commandLine = ['npm', ...commandArgs].map(quoteForCmd).join(' ')
    run(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', commandLine], options)
    return
  }
  run('npm', commandArgs, options)
}

function runNodeBin(command, commandArgs, options = {}) {
  if (isWindows) {
    const commandLine = [command, ...commandArgs].map(quoteForCmd).join(' ')
    run(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', commandLine], options)
    return
  }
  run(command, commandArgs, options)
}

function assertCleanTree() {
  const status = capture('git', ['status', '--porcelain'])
  if (status) throw new Error('Free app release expects a clean git worktree. Commit or stash local changes first, or pass --allow-dirty for a local packaging test.')
}

function assertAndroidSigningConfig() {
  const configPath = path.join(androidDir, 'keystore.properties')
  if (!existsSync(configPath)) {
    throw new Error('Missing android/keystore.properties. Copy android/keystore.properties.example, fill it in, and keep the .jks outside the repo.')
  }
}

function gradleEnv() {
  const javaHome = process.env.CLICK_FOUNDRY_JAVA_HOME || (existsSync(localJavaHome) ? localJavaHome : process.env.JAVA_HOME)
  if (!javaHome) return process.env
  return {
    ...process.env,
    JAVA_HOME: javaHome,
    PATH: `${path.join(javaHome, 'bin')}${path.delimiter}${process.env.PATH ?? ''}`,
  }
}

function printHelp() {
  console.log('Click Foundry free app release')
  console.log('')
  console.log('  npm run release:free-app')
  console.log('    Validates, builds the PWA, builds a signed Android APK, and deploys dist with Wrangler.')
  console.log('')
  console.log('  npm run release:free-app -- --skip-deploy')
  console.log('    Produces dist/downloads/click-foundry-android.apk without uploading to Cloudflare.')
  console.log('')
  console.log('Options:')
  console.log('  --project-name <name>  Cloudflare Pages project name. Default: click-foundry')
  console.log('  --allow-dirty          Allow local packaging with uncommitted changes.')
  console.log('  --skip-deploy          Build artifacts only; do not run Wrangler.')
}

function pruneDistArchives() {
  for (const relativePath of ['icon-reviews', 'recipe-review']) {
    rmSync(path.join(distDir, relativePath), { force: true, recursive: true })
  }
}

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

function fileSizeMb(filePath) {
  return (statSync(filePath).size / 1024 / 1024).toFixed(2)
}

async function main() {
  const options = parseOptions()
  if (options.help) {
    printHelp()
    return
  }

  if (!options.allowDirty) assertCleanTree()
  assertAndroidSigningConfig()

  const headSha = capture('git', ['rev-parse', 'HEAD'])
  const releaseEnv = {
    ...process.env,
    VITE_ANDROID_APK_URL: apkDownloadPath,
    VITE_DEPLOY_VERSION: headSha,
    VITE_DEPLOYED_AT: new Date().toISOString(),
    VITE_RELEASE_CHANNEL: 'release',
  }

  runNpm(['run', 'icons:check'])
  runNpm(['run', 'lint'])
  runNpm(['run', 'test'])
  runNpm(['run', 'build'], { env: releaseEnv })
  runNodeBin('npx', ['cap', 'sync', 'android'])
  run(path.join(androidDir, isWindows ? 'gradlew.bat' : 'gradlew'), ['assembleRelease'], { cwd: androidDir, env: gradleEnv() })

  if (!existsSync(apkOutputPath)) throw new Error(`Expected Android APK was not created at ${apkOutputPath}.`)

  pruneDistArchives()
  mkdirSync(path.dirname(apkDistPath), { recursive: true })
  copyFileSync(apkOutputPath, apkDistPath)

  console.log('')
  console.log('Android APK:')
  console.log(`  ${apkDistPath}`)
  console.log(`  Size: ${fileSizeMb(apkDistPath)} MB`)
  console.log(`  SHA-256: ${sha256(apkDistPath)}`)

  if (options.skipDeploy) {
    console.log('')
    console.log('Skipped Cloudflare Pages deploy.')
    return
  }

  runNpm(['exec', '--', 'wrangler', 'pages', 'deploy', 'dist', '--project-name', options.projectName])

  console.log('')
  console.log('Free app release deployed:')
  console.log(`  https://${options.projectName}.pages.dev/`)
  console.log(`  https://${options.projectName}.pages.dev${apkDownloadPath}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
