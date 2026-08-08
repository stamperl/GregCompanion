import { recipeGroupKeyForOutput, type RecipeGroup, type RecipeGroupOutput } from './recipeGroups'
import type { FluidId, MachineId, Recipe, ResourceId } from './types'

export type RecipeFavoriteMap = Record<string, string>
export type RecipePlanBookmark = { targetAmount: number }
export type RecipePlanBookmarkMap = Record<string, RecipePlanBookmark>

export type BulkCraftInventory = {
  resources: Partial<Record<ResourceId, number>>
  machines: Partial<Record<MachineId, number>>
  placedMachines?: Iterable<MachineId>
}

export type BulkCraftIngredient =
  | { kind: 'resource'; id: ResourceId }
  | { kind: 'machine'; id: MachineId }
  | { kind: 'fluid'; id: FluidId }

export type BulkCraftRequirement = BulkCraftIngredient & {
  required: number
  owned?: number
  short?: number
}

export type BulkCraftRecipeStep = BulkCraftIngredient & {
  key: string
  depth: number
  recipe: Recipe
  sourceChoice: 'favorite' | 'default'
  batches: number
  outputAmount: number
  variantCount: number
}

export type BulkCraftSetupRequirement =
  | { kind: 'resource'; id: ResourceId; amount: number; owned: number; short: number; reason: 'catalyst' }
  | { kind: 'machine'; id: MachineId; amount: number; owned: number; short: number; reason: 'station' }

export type BulkCraftPlanWarning = {
  kind: 'cycle' | 'depth-limit' | 'row-limit' | 'missing-recipe'
  key: string
}

export type BulkCraftPlan = {
  target: RecipeGroupOutput
  requestedAmount: number
  targetOwned: number
  targetShort: number
  rootBatches: number
  craftedOutputAmount: number
  totalOutputAmount: number
  requirements: BulkCraftRequirement[]
  recipeSteps: BulkCraftRecipeStep[]
  setup: BulkCraftSetupRequirement[]
  warnings: BulkCraftPlanWarning[]
}

export function bulkCraftRequirementsChanged(previous: BulkCraftPlan, next: BulkCraftPlan) {
  const signature = (plan: BulkCraftPlan) => plan.requirements
    .map((requirement) => `${requirement.kind}:${requirement.id}:${requirement.required}`)
    .sort()
    .join('|')
  return signature(previous) !== signature(next)
}

export type BuildBulkCraftPlanOptions = {
  targetGroup: RecipeGroup
  targetAmount: number
  groupsByOutputKey: Map<string, RecipeGroup>
  favorites: RecipeFavoriteMap
  inventory: BulkCraftInventory
  baseResourceIds?: ReadonlySet<ResourceId>
  maxDepth?: number
  maxRows?: number
}

const defaultMaxDepth = 16
const defaultMaxRows = 512

function ingredientKey(ingredient: BulkCraftIngredient) {
  return `${ingredient.kind}:${ingredient.id}`
}

function outputAmountFor(recipe: Recipe, ingredient: BulkCraftIngredient) {
  if (ingredient.kind === 'resource') return recipe.outputs.find((output) => output.id === ingredient.id)?.amount ?? 0
  if (ingredient.kind === 'machine') return recipe.machineOutputs?.find((output) => output.id === ingredient.id)?.amount ?? 0
  return recipe.fluidOutputs?.find((output) => output.id === ingredient.id)?.amount ?? 0
}

function recipeIngredients(recipe: Recipe): Array<BulkCraftIngredient & { amount: number }> {
  return [
    ...recipe.inputs.filter((input) => input.amount > 0).map((input) => ({ kind: 'resource' as const, ...input })),
    ...(recipe.machineInputs ?? []).filter((input) => input.amount > 0).map((input) => ({ kind: 'machine' as const, ...input })),
    ...(recipe.fluidInputs ?? []).filter((input) => input.amount > 0).map((input) => ({ kind: 'fluid' as const, ...input })),
  ]
}

function sourceRecipe(group: RecipeGroup | undefined, favorites: RecipeFavoriteMap) {
  if (!group) return undefined
  const favoriteId = favorites[group.key]
  return group.recipes.find((recipe) => recipe.id === favoriteId) ?? group.recipes[0]
}

function normalizeTargetAmount(amount: number) {
  return Math.max(1, Math.min(999_999, Math.floor(Number.isFinite(amount) ? amount : 1)))
}

export function parseRecipePlanBookmarks(currentRaw: string | null, legacyRaw: string | null = null): RecipePlanBookmarkMap {
  const parse = (raw: string | null, legacy: boolean) => {
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      const bookmarks: RecipePlanBookmarkMap = {}
      for (const [key, value] of Object.entries(parsed)) {
        if (!key) continue
        const targetAmount = legacy && value === true
          ? 1
          : typeof value === 'number'
            ? value
            : value && typeof value === 'object' && 'targetAmount' in value
              ? Number((value as { targetAmount?: unknown }).targetAmount)
              : Number.NaN
        if (Number.isFinite(targetAmount) && targetAmount > 0) {
          bookmarks[key] = { targetAmount: normalizeTargetAmount(targetAmount) }
        }
      }
      return bookmarks
    } catch {
      return null
    }
  }

  return parse(currentRaw, false) ?? parse(legacyRaw, true) ?? {}
}

export function buildBulkCraftPlan({
  targetGroup,
  targetAmount,
  groupsByOutputKey,
  favorites,
  inventory,
  baseResourceIds = new Set<ResourceId>(),
  maxDepth = defaultMaxDepth,
  maxRows = defaultMaxRows,
}: BuildBulkCraftPlanOptions): BulkCraftPlan {
  const requestedAmount = normalizeTargetAmount(targetAmount)
  const resourceStock = new Map<ResourceId, number>(
    Object.entries(inventory.resources).map(([id, amount]) => [id as ResourceId, Math.max(0, Number(amount) || 0)]),
  )
  const machineStock = new Map<MachineId, number>(
    Object.entries(inventory.machines).map(([id, amount]) => [id as MachineId, Math.max(0, Number(amount) || 0)]),
  )
  const placedMachines = new Set(inventory.placedMachines ?? [])
  const requirementTotals = new Map<string, BulkCraftRequirement>()
  const recipeStepTotals = new Map<string, BulkCraftRecipeStep>()
  const catalystTotals = new Map<ResourceId, number>()
  const stationIds = new Set<MachineId>()
  const warnings: BulkCraftPlanWarning[] = []
  let visitedRows = 0

  const reserve = (ingredient: BulkCraftIngredient, amount: number) => {
    if (ingredient.kind === 'fluid') return { owned: undefined, short: amount }
    if (ingredient.kind === 'resource') {
      const available = resourceStock.get(ingredient.id) ?? 0
      const owned = Math.min(available, amount)
      resourceStock.set(ingredient.id, available - owned)
      return { owned, short: amount - owned }
    }
    const available = machineStock.get(ingredient.id) ?? 0
    const owned = Math.min(available, amount)
    machineStock.set(ingredient.id, available - owned)
    return { owned, short: amount - owned }
  }

  const addOverproduction = (ingredient: BulkCraftIngredient, amount: number) => {
    if (amount <= 0 || ingredient.kind === 'fluid') return
    if (ingredient.kind === 'resource') resourceStock.set(ingredient.id, (resourceStock.get(ingredient.id) ?? 0) + amount)
    else machineStock.set(ingredient.id, (machineStock.get(ingredient.id) ?? 0) + amount)
  }

  const addRequirement = (ingredient: BulkCraftIngredient, required: number, owned: number | undefined, short: number | undefined) => {
    const key = ingredientKey(ingredient)
    const existing = requirementTotals.get(key)
    if (existing) {
      existing.required += required
      if (ingredient.kind !== 'fluid') {
        existing.owned = (existing.owned ?? 0) + (owned ?? 0)
        existing.short = (existing.short ?? 0) + (short ?? 0)
      }
      return
    }
    requirementTotals.set(key, ingredient.kind === 'fluid'
      ? { ...ingredient, required }
      : { ...ingredient, required, owned: owned ?? 0, short: short ?? 0 })
  }

  const addWarning = (kind: BulkCraftPlanWarning['kind'], key: string) => {
    if (!warnings.some((warning) => warning.kind === kind && warning.key === key)) warnings.push({ kind, key })
  }

  const addRecipeStep = (
    ingredient: BulkCraftIngredient,
    depth: number,
    recipe: Recipe,
    batches: number,
    outputAmount: number,
    group: RecipeGroup,
  ) => {
    const key = ingredientKey(ingredient)
    const existing = recipeStepTotals.get(key)
    if (existing) {
      existing.batches += batches
      existing.depth = Math.min(existing.depth, depth)
      return
    }
    recipeStepTotals.set(key, {
      ...ingredient,
      key,
      depth,
      recipe,
      sourceChoice: favorites[key] === recipe.id ? 'favorite' : 'default',
      batches,
      outputAmount,
      variantCount: group.recipes.length,
    })
  }

  const recordSetup = (recipe: Recipe) => {
    for (const catalyst of recipe.catalysts ?? []) {
      catalystTotals.set(catalyst.id, Math.max(catalystTotals.get(catalyst.id) ?? 0, catalyst.amount))
    }
    if (recipe.requiredMachine) stationIds.add(recipe.requiredMachine)
  }

  const expand = (ingredient: BulkCraftIngredient, amount: number, depth: number, path: Set<string>) => {
    visitedRows += 1
    const key = ingredientKey(ingredient)
    const availability = reserve(ingredient, amount)
    if (availability.short <= 0) {
      // Owned subcrafts are still direct requirements for the requested plan.
      // Keep a fully owned root target out of the material list.
      if (depth > 0 || !groupsByOutputKey.get(key)) addRequirement(ingredient, amount, availability.owned, 0)
      return { batches: 0, crafted: 0, owned: availability.owned ?? 0, short: 0 }
    }
    if (visitedRows > maxRows) {
      addRequirement(ingredient, amount, availability.owned, availability.short)
      addWarning('row-limit', key)
      return { batches: 0, crafted: 0, owned: availability.owned ?? 0, short: availability.short }
    }

    // Gathered resources are terminal inputs when they appear inside a plan.
    // They can still use a production route when selected as the root target.
    if (ingredient.kind === 'resource' && depth > 0 && baseResourceIds.has(ingredient.id)) {
      addRequirement(ingredient, amount, availability.owned, availability.short)
      return { batches: 0, crafted: 0, owned: availability.owned ?? 0, short: availability.short }
    }

    // Fluids commonly appear as secondary or recovery outputs. Without an
    // explicit preference, treating those recipes as supply routes can turn a
    // simple water requirement into a backwards chemical chain.
    if (ingredient.kind === 'fluid' && depth > 0 && !favorites[key]) {
      addRequirement(ingredient, amount, undefined, undefined)
      return { batches: 0, crafted: 0, owned: 0, short: amount }
    }

    const group = groupsByOutputKey.get(key)
    const recipe = sourceRecipe(group, favorites)
    const outputAmount = recipe ? outputAmountFor(recipe, ingredient) : 0
    if (!group || !recipe || outputAmount <= 0) {
      addRequirement(ingredient, amount, availability.owned, availability.short)
      if (group && !recipe) addWarning('missing-recipe', key)
      return { batches: 0, crafted: 0, owned: availability.owned ?? 0, short: availability.short }
    }
    if (path.has(key)) {
      addRequirement(ingredient, amount, availability.owned, availability.short)
      addWarning('cycle', key)
      return { batches: 0, crafted: 0, owned: availability.owned ?? 0, short: availability.short }
    }
    if (depth >= maxDepth) {
      addRequirement(ingredient, amount, availability.owned, availability.short)
      addWarning('depth-limit', key)
      return { batches: 0, crafted: 0, owned: availability.owned ?? 0, short: availability.short }
    }

    const batches = Math.ceil(availability.short / outputAmount)
    const crafted = batches * outputAmount
    addRecipeStep(ingredient, depth, recipe, batches, outputAmount, group)
    recordSetup(recipe)
    const nextPath = new Set(path)
    nextPath.add(key)
    for (const child of recipeIngredients(recipe)) {
      const { amount: childAmount, ...childIngredient } = child
      expand(childIngredient, childAmount * batches, depth + 1, nextPath)
    }
    addOverproduction(ingredient, crafted - availability.short)
    return { batches, crafted, owned: availability.owned ?? 0, short: availability.short }
  }

  const target: BulkCraftIngredient = { kind: targetGroup.output.kind, id: targetGroup.output.id } as BulkCraftIngredient
  const root = expand(target, requestedAmount, 0, new Set())
  const setup: BulkCraftSetupRequirement[] = [
    ...[...catalystTotals.entries()].map(([id, amount]): BulkCraftSetupRequirement => {
      const owned = Math.min(inventory.resources[id] ?? 0, amount)
      return { kind: 'resource', id, amount, owned, short: amount - owned, reason: 'catalyst' }
    }),
    ...[...stationIds].map((id): BulkCraftSetupRequirement => {
      const owned = placedMachines.has(id) ? 1 : 0
      return { kind: 'machine', id, amount: 1, owned, short: 1 - owned, reason: 'station' }
    }),
  ]

  return {
    target: targetGroup.output,
    requestedAmount,
    targetOwned: root.owned,
    targetShort: root.short,
    rootBatches: root.batches,
    craftedOutputAmount: root.crafted,
    totalOutputAmount: root.owned + root.crafted,
    requirements: [...requirementTotals.values()],
    recipeSteps: [...recipeStepTotals.values()].sort((left, right) => left.depth - right.depth || left.key.localeCompare(right.key)),
    setup,
    warnings,
  }
}

export function recipePlanTargetKey(output: RecipeGroupOutput) {
  return recipeGroupKeyForOutput(output)
}
