import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { machineRegistry, resourceRegistry } from '../src/game/content'

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)))
const resourcesDir = path.join(root, 'public/game-icons/resources')
const machinesDir = path.join(root, 'public/game-icons/machines')
const approvalsPath = path.join(root, 'public/icon-reviews/approvals.json')
const mvApprovalsPath = path.join(root, 'public/icon-reviews/mv-engineering/approvals.json')

function pngInfo(filePath: string) {
  const buffer = readFileSync(filePath)
  if (buffer.length < 33 || buffer.toString('ascii', 1, 4) !== 'PNG') throw new Error(`${filePath} is not a PNG.`)
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
    size: buffer.length,
  }
}

function checkSet(kind: string, ids: string[], dir: string) {
  const failures: string[] = []
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
    if (info.size < 100) failures.push(`${kind} ${id}: suspiciously small PNG`)
  }

  return failures
}

const readJson = (filePath: string) => JSON.parse(readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''))
const approvals = readJson(approvalsPath).approvals ?? []
const mvApprovals = readJson(mvApprovalsPath).entries ?? []
const resourceIds = Object.keys(resourceRegistry)
const machineIds = Object.keys(machineRegistry)
const failures = [
  ...checkSet('resource', resourceIds, resourcesDir),
  ...checkSet('machine', machineIds, machinesDir),
  ...approvals
    .filter((approval: { status: string }) => approval.status !== 'approved')
    .map((approval: { id: string; status: string }) => `approval ${approval.id}: status is ${approval.status}`),
  ...mvApprovals
    .filter((approval: { status: string }) => approval.status !== 'approved')
    .map((approval: { id: string; status: string }) => `MV approval ${approval.id}: status is ${approval.status}`),
]

if (failures.length > 0) {
  console.error('Icon asset validation failed:')
  for (const failure of failures) console.error(`  ${failure}`)
  process.exit(1)
}

console.log(`Icon asset validation passed for ${resourceIds.length} resources and ${machineIds.length} machines.`)
