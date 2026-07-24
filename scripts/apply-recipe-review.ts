import { deepStrictEqual } from 'node:assert'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import ts from 'typescript'

import { processRecipes, recipes } from '../src/game/content'

type RecipeKind = 'crafting' | 'process'

interface ReviewChange {
  key: string
  operation: 'update'
  kind: RecipeKind
  id: string
  before: Record<string, unknown>
  after: Record<string, unknown>
  issues: string[]
}

interface ReviewExport {
  schemaVersion: number
  type: string
  changes: ReviewChange[]
}

interface Replacement {
  start: number
  end: number
  text: string
}

const reviewPath = process.argv[2]
if (!reviewPath) {
  throw new Error('Usage: npm run recipes:apply-review -- <review-export.json>')
}

const sourcePath = resolve('src/game/content.ts')
const review = JSON.parse(await readFile(resolve(reviewPath), 'utf8')) as ReviewExport

if (review.schemaVersion !== 4 || review.type !== 'click-foundry-recipe-review') {
  throw new Error('Unsupported recipe review export')
}

if (review.changes.some((change) => change.operation !== 'update')) {
  throw new Error('This importer only supports updates to existing recipes')
}

const invalidChanges = review.changes.filter((change) => change.issues.length > 0)
if (invalidChanges.length > 0) {
  throw new Error(`Review contains invalid changes: ${invalidChanges.map((change) => change.key).join(', ')}`)
}

const currentByKind = {
  crafting: new Map(recipes.map((recipe) => [recipe.id, { kind: 'crafting', ...recipe }])),
  process: new Map(processRecipes.map((recipe) => [recipe.id, { kind: 'process', ...recipe }])),
}

const changesByKey = new Map(review.changes.map((change) => [change.key, change]))
for (const change of review.changes) {
  const current = currentByKind[change.kind].get(change.id)
  if (!current) throw new Error(`Unknown ${change.kind} recipe: ${change.id}`)
  try {
    deepStrictEqual(current, change.before)
  } catch {
    deepStrictEqual(current, change.after, `Current recipe differs from review snapshot and proposed update: ${change.key}`)
  }
}

const spaces = (amount: number) => ' '.repeat(amount)
const quote = (value: string) => `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`

function isSimpleObject(value: unknown): value is Record<string, string | number | boolean | null> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) &&
    Object.values(value).every((entry) => entry === null || ['string', 'number', 'boolean'].includes(typeof entry))
}

function formatInline(value: string | number | boolean | null | Record<string, string | number | boolean | null>) {
  if (value === null) return 'null'
  if (typeof value === 'string') return quote(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return `{ ${Object.entries(value).map(([key, entry]) => `${key}: ${formatInline(entry)}`).join(', ')} }`
}

function formatValue(value: unknown, indent: number, key?: string): string {
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
    return formatInline(value as string | number | boolean | null)
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    const inlineEntries = value.every((entry) => entry === null || ['string', 'number', 'boolean'].includes(typeof entry) || isSimpleObject(entry))
    const keepInline = inlineEntries && (key === 'pattern' || value.length === 1)
    if (keepInline) {
      return `[${value.map((entry) => formatInline(entry as string | number | boolean | null | Record<string, string | number | boolean | null>)).join(', ')}]`
    }
    return `[\n${value.map((entry) => `${spaces(indent + 2)}${isSimpleObject(entry) ? formatInline(entry) : formatValue(entry, indent + 2)},`).join('\n')}\n${spaces(indent)}]`
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value)
    return `{\n${entries.map(([entryKey, entry]) => `${spaces(indent + 2)}${entryKey}: ${formatValue(entry, indent + 2, entryKey)},`).join('\n')}\n${spaces(indent)}}`
  }
  throw new Error(`Unsupported review value: ${String(value)}`)
}

const printRecipe = (recipe: Record<string, unknown>) => {
  const { kind: _kind, ...contentRecipe } = recipe
  return formatValue(contentRecipe, 2)
}

const source = await readFile(sourcePath, 'utf8')
const sourceFile = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
const directNodes = new Map<string, ts.ObjectLiteralExpression[]>()
const recipeRoots = new Map<RecipeKind, ts.Expression>()

function findRecipeRoots(node: ts.Node) {
  if (
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    node.initializer &&
    (node.name.text === 'recipes' || node.name.text === 'processRecipes')
  ) {
    recipeRoots.set(node.name.text === 'recipes' ? 'crafting' : 'process', node.initializer)
  }
  ts.forEachChild(node, findRecipeRoots)
}
findRecipeRoots(sourceFile)

if (!recipeRoots.has('crafting') || !recipeRoots.has('process')) {
  throw new Error('Could not locate recipe catalogue declarations')
}

function catalogKindForNode(node: ts.Node): RecipeKind | null {
  for (const [kind, root] of recipeRoots) {
    if (node.getStart(sourceFile) >= root.getStart(sourceFile) && node.getEnd() <= root.getEnd()) return kind
  }

  let current: ts.Node | undefined = node
  while (current) {
    if (
      ts.isCallExpression(current) &&
      ts.isPropertyAccessExpression(current.expression) &&
      current.expression.name.text === 'push' &&
      ts.isIdentifier(current.expression.expression)
    ) {
      if (current.expression.expression.text === 'recipes') return 'crafting'
      if (current.expression.expression.text === 'processRecipes') return 'process'
    }
    current = current.parent
  }
  return null
}

function visit(node: ts.Node) {
  if (ts.isObjectLiteralExpression(node)) {
    const idProperty = node.properties.find((property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === 'id' &&
      ts.isStringLiteral(property.initializer))
    if (idProperty && ts.isStringLiteral(idProperty.initializer)) {
      const kind = catalogKindForNode(node)
      if (!kind) {
        ts.forEachChild(node, visit)
        return
      }
      const key = `${kind}:${idProperty.initializer.text}`
      if (changesByKey.has(key)) {
        const nodes = directNodes.get(key) ?? []
        nodes.push(node)
        directNodes.set(key, nodes)
      }
    }
  }
  ts.forEachChild(node, visit)
}
visit(sourceFile)

const replacements: Replacement[] = []
const unresolved = new Set(changesByKey.keys())
for (const [key, nodes] of directNodes) {
  if (nodes.length !== 1) throw new Error(`Expected one source object for ${key}, found ${nodes.length}`)
  const change = changesByKey.get(key)!
  replacements.push({
    start: nodes[0].getStart(sourceFile),
    end: nodes[0].getEnd(),
    text: printRecipe(change.after),
  })
  unresolved.delete(key)
}

function spreadForRecipeId(id: string, kind: RecipeKind) {
  const matches: ts.SpreadElement[] = []
  function find(node: ts.Node) {
    if (ts.isStringLiteral(node) && node.text === id) {
      let current: ts.Node | undefined = node
      while (current && !ts.isSpreadElement(current)) current = current.parent
      if (current && catalogKindForNode(current) === kind) matches.push(current)
    }
    ts.forEachChild(node, find)
  }
  find(sourceFile)
  const unique = [...new Map(matches.map((node) => [node.getStart(sourceFile), node])).values()]
  if (unique.length !== 1) throw new Error(`Expected one generated recipe family for ${kind}:${id}, found ${unique.length}`)
  return unique[0]
}

const generatedGroups = new Map<number, { node: ts.SpreadElement; kind: RecipeKind; changedKeys: string[] }>()
for (const key of unresolved) {
  const change = changesByKey.get(key)!
  const node = spreadForRecipeId(change.id, change.kind)
  const start = node.getStart(sourceFile)
  const group = generatedGroups.get(start) ?? { node, kind: change.kind, changedKeys: [] }
  group.changedKeys.push(key)
  generatedGroups.set(start, group)
}

for (const { node, kind, changedKeys } of generatedGroups.values()) {
  const familyIds: string[] = []
  function collectTupleIds(current: ts.Node) {
    if (
      ts.isArrayLiteralExpression(current) &&
      current.elements.length > 0 &&
      ts.isStringLiteral(current.elements[0]) &&
      current.parent &&
      ts.isArrayLiteralExpression(current.parent)
    ) {
      familyIds.push(current.elements[0].text)
    }
    ts.forEachChild(current, collectTupleIds)
  }
  collectTupleIds(node)

  const familyRecipes = familyIds
    .map((id) => {
      const current = currentByKind[kind].get(id)
      if (!current) throw new Error(`Generated family references unknown recipe: ${kind}:${id}`)
      return changesByKey.get(`${kind}:${id}`)?.after ?? current
    })

  for (const key of changedKeys) unresolved.delete(key)
  replacements.push({
    start: node.getStart(sourceFile),
    end: node.getEnd(),
    text: familyRecipes.map((recipe) => printRecipe(recipe)).join(',\n  '),
  })
}

if (unresolved.size > 0) {
  throw new Error(`Could not map review changes to source: ${[...unresolved].join(', ')}`)
}

const ordered = replacements.sort((left, right) => right.start - left.start)
let updated = source
for (const replacement of ordered) {
  updated = `${updated.slice(0, replacement.start)}${replacement.text}${updated.slice(replacement.end)}`
}

await writeFile(sourcePath, updated)
console.log(`Applied ${review.changes.length} recipe updates from ${reviewPath}`)
