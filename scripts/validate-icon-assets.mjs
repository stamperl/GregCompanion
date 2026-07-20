import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)))
const contentPath = path.join(root, 'src/game/content.ts')
const resourcesDir = path.join(root, 'public/game-icons/resources')
const machinesDir = path.join(root, 'public/game-icons/machines')

function registryKeys(source, exportName) {
  const start = source.indexOf(`export const ${exportName}`)
  if (start < 0) throw new Error(`Could not find ${exportName}.`)
  const bodyStart = source.indexOf('{', start)
  let depth = 0
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index]
    if (char === '{') depth += 1
    if (char === '}') depth -= 1
    if (depth === 0) {
      const body = source.slice(bodyStart + 1, index)
      return [...body.matchAll(/^\s{2}([A-Za-z0-9_]+):\s*{/gm)].map((match) => match[1])
    }
  }
  throw new Error(`Could not parse ${exportName}.`)
}

function pngInfo(filePath) {
  const buffer = readFileSync(filePath)
  if (buffer.length < 33 || buffer.toString('ascii', 1, 4) !== 'PNG') throw new Error(`${filePath} is not a PNG.`)
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
    size: buffer.length,
  }
}

function checkSet(kind, ids, dir) {
  const failures = []
  const files = new Set(readdirSync(dir).filter((file) => file.endsWith('.png')))
  const expectedFiles = new Set(ids.map((id) => `${id}.png`))

  for (const file of files) {
    if (!expectedFiles.has(file)) failures.push(`${kind} ${file}: unexpected runtime icon`)
  }

  for (const id of ids) {
    const file = `${id}.png`
    const filePath = path.join(dir, file)
    if (!files.has(file)) {
      failures.push(`${kind} ${id}: missing ${filePath}`)
      continue
    }
    const info = pngInfo(filePath)
    if (info.width !== 128 || info.height !== 128) failures.push(`${kind} ${id}: expected 128x128, found ${info.width}x${info.height}`)
    if (![4, 6].includes(info.colorType)) failures.push(`${kind} ${id}: expected alpha-capable PNG color type, found ${info.colorType}`)
    if (statSync(filePath).size < 100) failures.push(`${kind} ${id}: suspiciously small PNG`)
  }

  return failures
}

const source = readFileSync(contentPath, 'utf8')
const resourceIds = registryKeys(source, 'resourceRegistry')
const machineIds = registryKeys(source, 'machineRegistry')
const codeNativeMachineIds = new Set(['itemConductor', 'fluidConductor', 'conductorBundle', 'fabricationCable'])
const failures = [
  ...checkSet('resource', resourceIds, resourcesDir),
  ...checkSet('machine', machineIds.filter((id) => !codeNativeMachineIds.has(id)), machinesDir),
]

if (failures.length > 0) {
  console.error('Icon asset validation failed:')
  for (const failure of failures) console.error(`  ${failure}`)
  process.exit(1)
}

console.log(`Icon asset validation passed for ${resourceIds.length} resources and ${machineIds.length} machines.`)
