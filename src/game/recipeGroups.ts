import type { MachineId, Recipe, ResourceId } from './types'

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

export type RecipeGroup = {
  key: string
  output: RecipeGroupOutput
  recipes: Recipe[]
}

export function recipeGroupOutput(recipe: Recipe): RecipeGroupOutput | undefined {
  const resourceOutput = recipe.outputs[0]
  if (resourceOutput) return { kind: 'resource', id: resourceOutput.id, amount: resourceOutput.amount }

  const machineOutput = recipe.machineOutputs?.[0]
  if (machineOutput) return { kind: 'machine', id: machineOutput.id, amount: machineOutput.amount }

  return undefined
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
    const output = recipeGroupOutput(recipe)
    const key = output ? recipeGroupKeyForOutput(output) : `recipe:${recipe.id}`
    const group = groups.get(key)
    if (group) {
      group.recipes.push(recipe)
    } else {
      groups.set(key, { key, output: output ?? { kind: 'machine', id: 'furnace', amount: 0 }, recipes: [recipe] })
    }
  }

  return [...groups.values()]
}
