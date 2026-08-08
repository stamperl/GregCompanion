import { readFileSync, writeFileSync } from 'node:fs'

const publicDevManifestPath = new URL('../public/dev-revision.json', import.meta.url)
const deployedAt = process.env.VITE_DEPLOYED_AT?.trim()

if (!deployedAt || Number.isNaN(Date.parse(deployedAt))) {
  throw new Error('VITE_DEPLOYED_AT must contain a valid deployment timestamp.')
}

const manifest = JSON.parse(readFileSync(publicDevManifestPath, 'utf8'))
const stampedManifest = { ...manifest, updatedAt: deployedAt }

writeFileSync(publicDevManifestPath, `${JSON.stringify(stampedManifest, null, 2)}\n`)
console.log(`Stamped dev.${manifest.revision} as published at ${deployedAt}`)
