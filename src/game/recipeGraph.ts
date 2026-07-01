import type { MachineAmount, ProcessRecipe, Recipe, ResourceAmount, ResourceId } from './types'

export function recipeResourceInputs(recipe: Recipe): ResourceAmount[] {
  return [...recipe.inputs, ...(recipe.catalysts ?? []), ...(recipe.durabilityCosts ?? [])]
}

export function recipeResourceOutputs(recipe: Recipe): ResourceAmount[] {
  return recipe.outputs
}

export function recipeMachineInputs(recipe: Recipe): MachineAmount[] {
  return recipe.machineInputs ?? []
}

export function recipeMachineOutputs(recipe: Recipe): MachineAmount[] {
  return recipe.machineOutputs ?? []
}

export function recipeProducesResource(recipe: Recipe, resourceId: ResourceId) {
  return recipeResourceOutputs(recipe).some((amount) => amount.id === resourceId)
}

export function recipeUsesResource(recipe: Recipe, resourceId: ResourceId) {
  return recipeResourceInputs(recipe).some((amount) => amount.id === resourceId)
}

export function recipesProducingResource(resourceId: ResourceId, candidates: Recipe[]) {
  return candidates.filter((recipe) => recipeProducesResource(recipe, resourceId))
}

export function recipesUsingResource(resourceId: ResourceId, candidates: Recipe[]) {
  return candidates.filter((recipe) => recipeUsesResource(recipe, resourceId))
}

export function processRecipeProducesResource(recipe: ProcessRecipe, resourceId: ResourceId) {
  return recipe.output.id === resourceId
}

export function processRecipesProducingResource(resourceId: ResourceId, candidates: ProcessRecipe[]) {
  return candidates.filter((recipe) => processRecipeProducesResource(recipe, resourceId))
}
