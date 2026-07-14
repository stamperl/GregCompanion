import type { MachineAmount, MachineId, MachineSpec, ProcessRecipe, Recipe, ResourceAmount, ResourceId, Tier } from './types'

const machineTierRank: Record<Tier, number> = {
  manual: 0,
  bronze: 1,
  steam: 2,
  lv: 3,
}

function resourceKey(amount: ResourceAmount | undefined) {
  return amount?.id ?? '-'
}

function machineAmountKey(amount: MachineAmount | undefined) {
  return amount?.id ?? '-'
}

export function processRecipeOperationKey(recipe: ProcessRecipe) {
  return [
    resourceKey(recipe.input),
    resourceKey(recipe.secondaryInput),
    (recipe.extraInputs ?? []).map(resourceKey).join(','),
    resourceKey(recipe.fuelInput),
    recipe.fluidInput?.id ?? '-',
    resourceKey(recipe.output),
    machineAmountKey(recipe.machineOutput),
    recipe.fluidOutput?.id ?? '-',
  ].join('|')
}

export function equivalentProcessRecipes(recipe: ProcessRecipe, candidates: ProcessRecipe[]) {
  const operationKey = processRecipeOperationKey(recipe)
  return candidates.filter((candidate) => processRecipeOperationKey(candidate) === operationKey)
}

export function processRecipesForMachine(machineId: MachineId, candidates: ProcessRecipe[]) {
  return candidates.filter((recipe) => recipe.machineId === machineId)
}

export function processRecipesInMachineTierOrder(candidates: ProcessRecipe[], machineSpecs: Record<MachineId, MachineSpec>) {
  return [...candidates].sort(
    (left, right) => machineTierRank[machineSpecs[left.machineId].tier] - machineTierRank[machineSpecs[right.machineId].tier],
  )
}

export function minimumMachineForProcessRecipe(
  recipe: ProcessRecipe,
  candidates: ProcessRecipe[],
  machineSpecs: Record<MachineId, MachineSpec>,
) {
  return equivalentProcessRecipes(recipe, candidates).reduce(
    (minimumMachineId, candidate) =>
      machineTierRank[machineSpecs[candidate.machineId].tier] < machineTierRank[machineSpecs[minimumMachineId].tier]
        ? candidate.machineId
        : minimumMachineId,
    recipe.machineId,
  )
}

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
