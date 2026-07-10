import { spawnSync } from 'node:child_process'

function capture(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error((result.stderr || `${command} ${args.join(' ')} failed`).trim())
  return result.stdout.trim()
}

function changedFiles() {
  const args = process.argv.slice(2)
  if (args.length > 0) return args

  const unstaged = capture('git', ['diff', '--name-only'])
  const staged = capture('git', ['diff', '--cached', '--name-only'])
  let base = ''
  try {
    base = capture('git', ['merge-base', 'HEAD', 'origin/main'])
  } catch {
    base = ''
  }
  const files = new Set([...unstaged.split(/\r?\n/), ...staged.split(/\r?\n/)].filter(Boolean))
  if (files.size === 0 && base) {
    capture('git', ['diff', '--name-only', `${base}..HEAD`])
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach((file) => files.add(file))
  }
  return [...files]
}

function add(commands, command) {
  commands.add(command)
}

function route(files) {
  const commands = new Set()
  const notes = []

  for (const file of files) {
    const path = file.replaceAll('\\', '/')
    if (path === 'src/game/content.ts') {
      add(commands, 'npm run test:content')
      add(commands, 'npm run test:engine')
      add(commands, 'npm run build')
      notes.push(`${path}: content feeds recipes, quests, machines, and engine behavior.`)
      continue
    }
    if (path === 'src/game/engine.ts') {
      add(commands, 'npm run test:engine')
      add(commands, 'npm run build')
      notes.push(`${path}: engine behavior changed.`)
      continue
    }
    if (path === 'src/game/saveStorage.ts' || path === 'src/game/saveStorage.test.ts') {
      add(commands, 'npm run test:save')
      add(commands, 'npm run build')
      notes.push(`${path}: save storage path changed.`)
      continue
    }
    if (path.endsWith('.test.ts')) {
      add(commands, `npx vitest run ${path}`)
      continue
    }
    if (path === 'src/App.tsx' || path.startsWith('src/components/') || path.endsWith('.css')) {
      add(commands, 'npm run lint')
      add(commands, 'npm run build')
      notes.push(`${path}: UI changed; run a mobile smoke check when practical.`)
      continue
    }
    if (path.startsWith('public/game-icons/') || path.startsWith('public/icon-reviews/')) {
      add(commands, 'npm run icons:check')
      add(commands, 'npm run test:content')
      add(commands, 'npm run build')
      notes.push(`${path}: icon/review asset changed.`)
      continue
    }
    if (path.startsWith('scripts/') || path === 'package.json' || path.startsWith('.github/')) {
      add(commands, 'npm run check')
      notes.push(`${path}: workflow or script changed; run the full gate.`)
      continue
    }
    if (path.startsWith('src/')) {
      add(commands, 'npm run lint')
      add(commands, 'npm run build')
      continue
    }
  }

  if (commands.size === 0) add(commands, 'npm run check')
  return { commands: [...commands], notes }
}

try {
  const files = changedFiles()
  const result = route(files)
  console.log('Changed files:')
  for (const file of files) console.log(`  ${file}`)
  console.log('')
  console.log('Recommended checks:')
  for (const command of result.commands) console.log(`  ${command}`)
  if (result.notes.length > 0) {
    console.log('')
    console.log('Notes:')
    for (const note of result.notes) console.log(`  ${note}`)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
