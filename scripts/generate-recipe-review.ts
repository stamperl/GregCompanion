import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { machineRegistry, processRecipes, quests, recipes, resourceRegistry } from '../src/game/content'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(root, 'public/recipe-review/recipes.json')

const payload = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  resources: Object.values(resourceRegistry).map(({ id, label, category, tier, iconKey }) => ({ id, label, category, tier, iconKey })),
  machines: Object.values(machineRegistry).map(({ id, name, tier, iconKey }) => ({ id, label: name, tier, iconKey })),
  quests: quests.map(({ id, title, chapter }) => ({ id, label: title, chapter })),
  recipes: recipes.map((recipe) => ({ kind: 'crafting', ...recipe })),
  processRecipes: processRecipes.map((recipe) => ({ kind: 'process', ...recipe })),
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
console.log(`Recipe review data: ${outputPath}`)
console.log(`${recipes.length} crafting recipes, ${processRecipes.length} process recipes`)
