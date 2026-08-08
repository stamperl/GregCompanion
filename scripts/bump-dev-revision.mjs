import { readFileSync, writeFileSync } from 'node:fs'

const devManifestPath = new URL('../src/dev-manifest.json', import.meta.url)
const publicDevManifestPath = new URL('../public/dev-revision.json', import.meta.url)

function readManifest() {
  try {
    return JSON.parse(readFileSync(devManifestPath, 'utf8'))
  } catch {
    return { revision: 0 }
  }
}

function readNote() {
  const args = process.argv.slice(2)
  const noteIndex = args.findIndex((arg) => arg === '--note')
  const note = noteIndex >= 0 ? args[noteIndex + 1]?.trim() : ''

  if (!note || args.length !== 2 || noteIndex !== 0) {
    throw new Error('Usage: npm run dev:bump -- --note "Short player-facing summary"')
  }
  if (note.includes('\n') || note.includes('|')) {
    throw new Error('The dev note must be one line and cannot contain a pipe character.')
  }
  return note
}

const current = readManifest()
const currentRevision = Number.isFinite(current.revision) ? Number(current.revision) : 0
const next = {
  revision: currentRevision + 1,
  updatedAt: new Date().toISOString(),
  summary: readNote(),
}

writeFileSync(devManifestPath, `${JSON.stringify(next, null, 2)}\n`)
writeFileSync(publicDevManifestPath, `${JSON.stringify(next, null, 2)}\n`)
console.log(`Dev revision bumped to dev.${next.revision}: ${next.summary}`)
