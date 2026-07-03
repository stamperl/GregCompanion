import { spawn } from 'node:child_process'
import os from 'node:os'

const isWindows = process.platform === 'win32'
const host = '0.0.0.0'
const port = '4173'

function localUrls() {
  const urls = [`http://localhost:${port}/`]
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        urls.push(`http://${entry.address}:${port}/`)
      }
    }
  }
  return urls
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${command} ${args.join(' ')} exited with ${code ?? 'no status'}.`))
    })
  })
}

function quoteForCmd(arg) {
  return /[\s"&|<>^]/.test(arg) ? `"${arg.replaceAll('"', '""')}"` : arg
}

function runNpm(args) {
  if (isWindows) {
    const commandLine = ['npm', ...args].map(quoteForCmd).join(' ')
    return run(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', commandLine])
  }
  return run('npm', args)
}

function printUrls() {
  console.log('')
  console.log('Local built test environment:')
  for (const url of localUrls()) {
    console.log(`  ${url}`)
  }
  console.log('')
}

if (process.argv.includes('--help')) {
  console.log('Builds Click Foundry and hosts the production preview locally.')
  console.log('Usage: npm run deploy:test')
  console.log('Options:')
  console.log('  --print-only   Print the expected preview URLs without building or hosting.')
  process.exit(0)
}

if (process.argv.includes('--print-only')) {
  printUrls()
  process.exit(0)
}

async function main() {
  await runNpm(['run', 'build'])
  printUrls()
  await runNpm(['run', 'preview', '--', '--host', host, '--port', port, '--strictPort'])
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
