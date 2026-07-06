import { readFileSync, writeFileSync } from 'node:fs'

const devManifestPath = new URL('../src/dev-manifest.json', import.meta.url)

function readManifest() {
  try {
    return JSON.parse(readFileSync(devManifestPath, 'utf8'))
  } catch {
    return { revision: 0 }
  }
}

const current = readManifest()
const currentRevision = Number.isFinite(current.revision) ? Number(current.revision) : 0
const next = {
  revision: currentRevision + 1,
  updatedAt: new Date().toISOString().slice(0, 10),
}

writeFileSync(devManifestPath, `${JSON.stringify(next, null, 2)}\n`)
console.log(`Dev revision bumped to dev.${next.revision}`)
