import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import os from 'node:os'

const isWindows = process.platform === 'win32'
const lane = process.argv[2]
const args = process.argv.slice(3)
const releaseManifestPath = new URL('../src/release-manifest.json', import.meta.url)
const devManifestPath = new URL('../src/dev-manifest.json', import.meta.url)

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', ...options })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} ${commandArgs.join(' ')} exited with ${result.status}.`)
}

function capture(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, { encoding: 'utf8', ...options })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error((result.stderr || `${command} ${commandArgs.join(' ')} failed.`).trim())
  return result.stdout.trim()
}

function quoteForCmd(arg) {
  return /[\s"&|<>^]/.test(arg) ? `"${arg.replaceAll('"', '""')}"` : arg
}

function runNpm(commandArgs, options = {}) {
  if (isWindows) {
    const commandLine = ['npm', ...commandArgs].map(quoteForCmd).join(' ')
    run(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', commandLine], options)
    return
  }
  run('npm', commandArgs, options)
}

function parseOptions() {
  const parsed = { notes: [] }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    const next = args[index + 1]
    if (arg === '--revision' && next) {
      parsed.revision = next
      index += 1
    } else if (arg === '--title' && next) {
      parsed.title = next
      index += 1
    } else if (arg === '--note' && next) {
      parsed.notes.push(next)
      index += 1
    } else if (arg === '--notes' && next) {
      parsed.notes.push(...next.split('|').map((note) => note.trim()).filter(Boolean))
      index += 1
    } else if (arg === '--help') {
      parsed.help = true
    } else {
      throw new Error(`Unknown option: ${arg}`)
    }
  }
  return parsed
}

function assertCleanTree(message = 'This release lane requires a clean git worktree. Commit or stash local changes first.') {
  const status = capture('git', ['status', '--porcelain'])
  if (status) throw new Error(message)
}

function assertBranch(expected) {
  const branch = capture('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
  if (branch !== expected) throw new Error(`Expected branch ${expected}. Current branch is ${branch}.`)
}

function localUrls(port) {
  const urls = [`http://localhost:${port}/`]
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) urls.push(`http://${entry.address}:${port}/`)
    }
  }
  return urls
}

function pagesBaseUrl() {
  const remoteUrl = capture('git', ['remote', 'get-url', 'origin'])
  const match = remoteUrl.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/)
  if (!match) return 'https://<github-user>.github.io/<repo>/'
  return `https://${match[1]}.github.io/${match[2]}/`
}

function printHelp() {
  console.log('Click Foundry release lanes')
  console.log('')
  console.log('  npm run release:home-dev')
  console.log('    Builds a production preview and hosts it on the local network.')
  console.log('')
  console.log('  npm run release:remote-dev')
  console.log('    Runs checks and pushes the current clean commit to origin/remote-dev.')
  console.log('    GitHub Pages publishes it at /GregCompanion/remote-dev/.')
  console.log('')
  console.log('  npm run release:full -- --revision 0.2.0 --title "Steam balance" --note "Boilers retuned"')
  console.log('    Updates release notes, commits the manifest, pushes main, and lets Pages publish the public release.')
}

function readManifest() {
  return JSON.parse(readFileSync(releaseManifestPath, 'utf8'))
}

function readDevManifest() {
  return JSON.parse(readFileSync(devManifestPath, 'utf8'))
}

function releaseCommitIfNeeded(manifest) {
  const releasePaths = ['src/release-manifest.json', 'docs/releases', 'public/release-notes']
  const status = capture('git', ['status', '--porcelain', ...releasePaths])
  if (!status) return
  run('git', ['add', ...releasePaths])
  run('git', ['commit', '-m', `Release r${manifest.revision}: ${manifest.title}`])
}

function generateReleaseArtifacts(options) {
  const commandArgs = ['scripts/generate-release-notes.mjs']
  if (options.revision) commandArgs.push('--revision', options.revision)
  if (options.title) commandArgs.push('--title', options.title)
  for (const note of options.notes) commandArgs.push('--note', note)
  run('node', commandArgs)
  return readManifest()
}

function pushAndWatch(branch, refspec = branch) {
  const headSha = capture('git', ['rev-parse', 'HEAD'])
  run('git', ['push', 'origin', refspec])

  const ghVersion = spawnSync('gh', ['--version'], { stdio: 'ignore' })
  if (ghVersion.error || ghVersion.status !== 0) {
    console.log('GitHub CLI is not available, so the Pages workflow was not watched locally.')
    return
  }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const output = capture('gh', [
      'run',
      'list',
      '--workflow',
      'pages.yml',
      '--branch',
      branch,
      '--limit',
      '5',
      '--json',
      'databaseId,headSha,url',
    ])
    const runs = JSON.parse(output)
    const runInfo = runs.find((candidate) => candidate.headSha === headSha)
    if (runInfo) {
      console.log(`Watching Pages deployment: ${runInfo.url}`)
      run('gh', ['run', 'watch', String(runInfo.databaseId), '--exit-status'])
      return
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000)
  }
  console.log('Could not find the new Pages workflow run yet. Check GitHub Actions in a moment.')
}

async function main() {
  const options = parseOptions()
  if (!lane || lane === '--help' || options.help) {
    printHelp()
    return
  }

  if (lane === 'home-dev') {
    const port = '4173'
    const devManifest = readDevManifest()
    runNpm(['run', 'build'], {
      env: {
        ...process.env,
        VITE_RELEASE_CHANNEL: 'home-dev',
        VITE_RELEASE_REVISION: `dev.${devManifest.revision}`,
        VITE_RELEASE_TITLE: 'Home test build',
        VITE_RELEASE_NOTES: 'Local production preview|Only devices on this network can reach it',
      },
    })
    console.log('')
    console.log('Home dev test environment:')
    for (const url of localUrls(port)) console.log(`  ${url}`)
    console.log('')
    runNpm(['run', 'preview', '--', '--host', '0.0.0.0', '--port', port, '--strictPort'])
    return
  }

  if (lane === 'remote-dev') {
    assertCleanTree()
    runNpm(['run', 'check'])
    assertCleanTree()
    pushAndWatch('remote-dev', 'HEAD:remote-dev')
    const baseUrl = pagesBaseUrl()
    console.log('')
    console.log('Remote dev will publish at:')
    console.log(`  ${baseUrl}remote-dev/`)
    return
  }

  if (lane === 'full') {
    assertBranch('main')
    assertCleanTree('Full release expects committed game changes before release notes are stamped.')
    const manifest = generateReleaseArtifacts(options)
    runNpm(['run', 'check'])
    releaseCommitIfNeeded(manifest)
    assertCleanTree()
    pushAndWatch('main')
    console.log('')
    console.log(`Full release r${manifest.revision}: ${manifest.title}`)
    return
  }

  throw new Error(`Unknown release lane: ${lane}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
