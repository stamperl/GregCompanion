import { spawnSync } from 'node:child_process'

const isWindows = process.platform === 'win32'

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options })
  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with ${result.status}.`)
  }
}

function quoteForCmd(arg) {
  return /[\s"&|<>^]/.test(arg) ? `"${arg.replaceAll('"', '""')}"` : arg
}

function runNpm(args) {
  if (isWindows) {
    const commandLine = ['npm', ...args].map(quoteForCmd).join(' ')
    run(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', commandLine])
    return
  }
  run('npm', args)
}

function capture(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    throw new Error((result.stderr || `${command} ${args.join(' ')} failed.`).trim())
  }
  return result.stdout.trim()
}

function assertCleanTree() {
  const status = capture('git', ['status', '--porcelain'])
  if (status) {
    throw new Error('Release requires a clean git worktree. Commit or stash local changes first.')
  }
}

function hasGhCli() {
  const result = spawnSync('gh', ['--version'], { stdio: 'ignore' })
  return !result.error && result.status === 0
}

function latestPagesRun(headSha) {
  const output = capture('gh', [
    'run',
    'list',
    '--workflow',
    'pages.yml',
    '--branch',
    'main',
    '--limit',
    '5',
    '--json',
    'databaseId,headSha,url',
  ])
  const runs = JSON.parse(output)
  return runs.find((runInfo) => runInfo.headSha === headSha) ?? runs[0]
}

if (process.argv.includes('--help')) {
  console.log('Runs the guarded Click Foundry GitHub Pages release flow.')
  console.log('Usage: npm run deploy:release')
  console.log('Requires: clean main branch, passing lint/tests/build, and origin main access.')
  process.exit(0)
}

try {
  const branch = capture('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
  if (branch !== 'main') {
    throw new Error(`Release must run from main. Current branch is ${branch}.`)
  }

  assertCleanTree()
  runNpm(['run', 'check'])
  assertCleanTree()

  const headSha = capture('git', ['rev-parse', 'HEAD'])
  run('git', ['push', 'origin', 'main'])

  if (!hasGhCli()) {
    console.log('GitHub CLI is not available, so the Pages workflow was not watched locally.')
    console.log('The existing GitHub Actions workflow will publish GitHub Pages from main.')
    process.exit(0)
  }

  let runInfo
  try {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      runInfo = latestPagesRun(headSha)
      if (runInfo) {
        break
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000)
    }

    if (!runInfo) {
      console.log('Could not find the new Pages workflow run yet. Check GitHub Actions in a moment.')
      process.exit(0)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.log(`GitHub Pages workflow watch was skipped: ${message}`)
    process.exit(0)
  }

  console.log(`Watching Pages deployment: ${runInfo.url}`)
  run('gh', ['run', 'watch', String(runInfo.databaseId), '--exit-status'])
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
}
