import type { MaterialFormId } from './materialIds'
import type { FluidId, MachineId, Recipe, ResourceId, ResourceSpec } from './types'

export type RecipeGroupOutput =
  | {
      kind: 'resource'
      id: ResourceId
      amount: number
    }
  | {
      kind: 'machine'
      id: MachineId
      amount: number
    }
  | {
      kind: 'fluid'
      id: FluidId
      amount: number
    }

export type RecipeGroup = {
  key: string
  output: RecipeGroupOutput
  recipes: Recipe[]
}

export type RecipeGroupCollection = {
  key: string
  label: string
  groups: RecipeGroup[]
  grouped: boolean
}

const materialFormLabels: Record<MaterialFormId, string> = {
  ingot: 'Ingots',
  dust: 'Dusts',
  plate: 'Plates',
  rod: 'Rods',
  bolt: 'Bolts',
  ring: 'Rings',
  screw: 'Screws',
  gear: 'Gears',
  wire: 'Wires',
  fineWire: 'Fine Wires',
  foil: 'Foils',
}

export function recipeGroupOutputs(recipe: Recipe): RecipeGroupOutput[] {
  return [
    ...recipe.outputs.filter((amount) => amount.amount > 0).map((amount) => ({ kind: 'resource' as const, ...amount })),
    ...(recipe.machineOutputs ?? []).filter((amount) => amount.amount > 0).map((amount) => ({ kind: 'machine' as const, ...amount })),
    ...(recipe.fluidOutputs ?? []).filter((amount) => amount.amount > 0).map((amount) => ({ kind: 'fluid' as const, ...amount })),
  ]
}

export function recipeGroupOutput(recipe: Recipe): RecipeGroupOutput | undefined {
  return recipeGroupOutputs(recipe)[0]
}

export function recipeGroupKeyForOutput(output: RecipeGroupOutput) {
  return `${output.kind}:${output.id}`
}

export function recipeGroupKey(recipe: Recipe) {
  const output = recipeGroupOutput(recipe)
  return output ? recipeGroupKeyForOutput(output) : `recipe:${recipe.id}`
}

export function groupRecipesByOutput(recipes: Recipe[]): RecipeGroup[] {
  const groups = new Map<string, RecipeGroup>()

  for (const recipe of recipes) {
    const outputs = recipeGroupOutputs(recipe)
    if (outputs.length < 1) {
      const key = `recipe:${recipe.id}`
      groups.set(key, { key, output: { kind: 'machine', id: 'furnace', amount: 0 }, recipes: [recipe] })
      continue
    }

    for (const output of outputs) {
      const key = recipeGroupKeyForOutput(output)
      const group = groups.get(key)
      if (group) {
        group.recipes.push(recipe)
      } else {
        groups.set(key, { key, output, recipes: [recipe] })
      }
    }
  }

  return [...groups.values()]
}

export function collectRecipeGroupsByItemType(
  groups: RecipeGroup[],
  resourceSpecs: Partial<Record<ResourceId, ResourceSpec>>,
): RecipeGroupCollection[] {
  const collections = new Map<string, RecipeGroupCollection>()

  for (const group of groups) {
    const resourceSpec = group.output.kind === 'resource' ? resourceSpecs[group.output.id] : undefined
    const materialForm = resourceSpec?.materialForm
    const key = materialForm ? `material-form:${materialForm}` : `direct:${group.key}`
    const existing = collections.get(key)

    if (existing) {
      existing.groups.push(group)
      existing.grouped = true
      continue
    }

    collections.set(key, {
      key,
      label: materialForm ? materialFormLabels[materialForm] : resourceSpec?.label ?? group.key,
      groups: [group],
      grouped: false,
    })
  }

  return [...collections.values()]
}
