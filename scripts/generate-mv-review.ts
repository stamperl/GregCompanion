import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { machineRegistry, processRecipes, recipes, resourceRegistry } from '../src/game/content'
import { materialFamilies } from '../src/game/materialIds'
import { mvMachineIds, mvResourceIds } from '../src/game/mvIds'

const outputDir = resolve('public', 'mv-review')
await mkdir(outputDir, { recursive: true })
const iconReviewDir = resolve('public', 'icon-reviews', 'mv-engineering')

const relevantResourceIds = new Set([
  ...materialFamilies.flatMap((family) => Object.values(family.forms)),
  ...mvResourceIds,
  'coatedBoardBlank',
  'redAlloyCable',
  'steelItemCasing',
  'resistor',
  'vacuumTube',
  'basicBoard',
  'primitiveCircuit',
])

const relevantMachineIds = new Set(mvMachineIds)
const relevantRecipes = recipes.filter((recipe) => (
  recipe.inputs.some((input) => relevantResourceIds.has(input.id))
  || recipe.outputs.some((output) => relevantResourceIds.has(output.id))
  || recipe.machineOutputs?.some((output) => relevantMachineIds.has(output.id))
))
const relevantProcesses = processRecipes.filter((recipe) => (
  relevantMachineIds.has(recipe.machineId)
  || [recipe.input, recipe.secondaryInput, ...(recipe.extraInputs ?? []), recipe.output, recipe.secondaryOutput]
    .some((entry) => entry && relevantResourceIds.has(entry.id))
))

const data = {
  generatedAt: new Date().toISOString(),
  materials: materialFamilies,
  resources: [...relevantResourceIds].map((id) => resourceRegistry[id]).filter(Boolean),
  machines: [...relevantMachineIds].map((id) => machineRegistry[id]).filter(Boolean),
  craftingRecipes: relevantRecipes,
  processRecipes: relevantProcesses,
}

await writeFile(resolve(outputDir, 'data.json'), `${JSON.stringify(data, null, 2)}\n`)

const candidateKinds = ['resources', 'machines'] as const
const candidateEntries = (await Promise.all(candidateKinds.map(async (kind) => {
  const directory = resolve(iconReviewDir, 'candidates', kind)
  const files = await readdir(directory)
  return files
    .filter((file) => file.endsWith('.png'))
    .map((file) => ({
      id: file.slice(0, -4),
      kind,
      candidate: `candidates/${kind}/${file}`,
      status: 'pending',
      notes: '',
    }))
}))).flat()
let previousApprovals: { entries?: Array<{ id: string; kind: string; status?: string; notes?: string }> } = {}
try {
  previousApprovals = JSON.parse((await readFile(resolve(iconReviewDir, 'approvals.json'), 'utf8')).replace(/^\uFEFF/, ''))
} catch {
  previousApprovals = {}
}
const previousByKey = new Map((previousApprovals.entries ?? []).map((entry) => [`${entry.kind}:${entry.id}`, entry]))
const approvals = {
  generatedAt: new Date().toISOString(),
  installTarget: 'public/game-icons',
  entries: candidateEntries.map((entry) => ({
    ...entry,
    ...previousByKey.get(`${entry.kind}:${entry.id}`),
  })),
}
await writeFile(resolve(iconReviewDir, 'approvals.json'), `${JSON.stringify(approvals, null, 2)}\n`)
console.log(`Generated ${resolve(outputDir, 'data.json')}`)
console.log(`Generated ${resolve(iconReviewDir, 'approvals.json')}`)
