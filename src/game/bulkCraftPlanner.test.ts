import { describe, expect, it } from 'vitest'
import { buildBulkCraftPlan, parseRecipePlanBookmarks } from './bulkCraftPlanner'
import { groupRecipesByOutput } from './recipeGroups'
import type { Recipe, ResourceId } from './types'

function recipe(id: string, output: ResourceId, outputAmount: number, inputs: Array<{ id: ResourceId; amount: number }>): Recipe {
  return {
    id,
    name: id,
    description: id,
    tier: 'manual',
    stationType: 'hand',
    recipeType: 'crafting',
    durationMs: 1_000,
    inputs,
    outputs: [{ id: output, amount: outputAmount }],
    pattern: Array.from({ length: 9 }, () => null),
  }
}

function planFor(recipes: Recipe[], targetId: ResourceId, amount: number, resources: Partial<Record<ResourceId, number>> = {}, favorites = {}) {
  const groups = groupRecipesByOutput(recipes)
  const groupsByOutputKey = new Map(groups.map((group) => [group.key, group]))
  const targetGroup = groupsByOutputKey.get(`resource:${targetId}`)!
  return buildBulkCraftPlan({
    targetGroup,
    targetAmount: amount,
    groupsByOutputKey,
    favorites,
    inventory: { resources, machines: {} },
  })
}

describe('bulk craft planner', () => {
  it('reserves target and intermediate inventory before expanding base materials', () => {
    const recipes = [
      recipe('planks', 'plank', 4, [{ id: 'log', amount: 1 }]),
      recipe('sticks', 'stick', 4, [{ id: 'plank', amount: 2 }]),
    ]
    const plan = planFor(recipes, 'stick', 12, { stick: 2, plank: 2, log: 1 })

    expect(plan.targetOwned).toBe(2)
    expect(plan.rootBatches).toBe(3)
    expect(plan.craftedOutputAmount).toBe(12)
    expect(plan.requirements).toContainEqual({ kind: 'resource', id: 'log', required: 1, owned: 1, short: 0 })
  })

  it('shows fully owned craftable inputs instead of hiding them from the plan', () => {
    const recipes = [
      recipe('steel-rods', 'steelRod', 2, [{ id: 'steelIngot', amount: 1 }]),
      recipe('diamond-shovel', 'diamondShovel', 1, [
        { id: 'diamond', amount: 1 },
        { id: 'steelRod', amount: 2 },
      ]),
    ]
    const plan = planFor(recipes, 'diamondShovel', 1, { diamond: 1, steelRod: 2 })

    expect(plan.requirements).toContainEqual({ kind: 'resource', id: 'diamond', required: 1, owned: 1, short: 0 })
    expect(plan.requirements).toContainEqual({ kind: 'resource', id: 'steelRod', required: 2, owned: 2, short: 0 })
    expect(plan.recipeSteps.map((step) => step.key)).toEqual(['resource:diamondShovel'])
  })

  it('does not list a fully owned target as its own material requirement', () => {
    const recipes = [recipe('diamond-shovel', 'diamondShovel', 1, [{ id: 'diamond', amount: 1 }])]
    const plan = planFor(recipes, 'diamondShovel', 1, { diamondShovel: 1 })

    expect(plan.rootBatches).toBe(0)
    expect(plan.requirements).toEqual([])
  })

  it('uses favorites for root and subcrafts and falls back to the first recipe', () => {
    const recipes = [
      recipe('planks-default', 'plank', 4, [{ id: 'log', amount: 1 }]),
      recipe('planks-favorite', 'plank', 2, [{ id: 'stick', amount: 1 }]),
      recipe('gears-default', 'ironGear', 1, [{ id: 'plank', amount: 4 }]),
      recipe('gears-favorite', 'ironGear', 2, [{ id: 'plank', amount: 6 }]),
    ]
    const plan = planFor(recipes, 'ironGear', 2, {}, {
      'resource:ironGear': 'gears-favorite',
      'resource:plank': 'planks-favorite',
    })

    expect(plan.recipeSteps.map((step) => [step.key, step.recipe.id, step.sourceChoice])).toEqual([
      ['resource:ironGear', 'gears-favorite', 'favorite'],
      ['resource:plank', 'planks-favorite', 'favorite'],
    ])
    expect(plan.requirements).toContainEqual({ kind: 'resource', id: 'stick', required: 3, owned: 0, short: 3 })
  })

  it('reuses batch overproduction across shared branches', () => {
    const recipes = [
      recipe('planks', 'plank', 4, [{ id: 'log', amount: 1 }]),
      recipe('gear', 'ironGear', 1, [{ id: 'plank', amount: 3 }, { id: 'stick', amount: 1 }]),
      recipe('sticks', 'stick', 4, [{ id: 'plank', amount: 2 }]),
    ]
    const plan = planFor(recipes, 'ironGear', 1)

    expect(plan.requirements).toContainEqual({ kind: 'resource', id: 'log', required: 2, owned: 0, short: 2 })
  })

  it('reports required fluids without owned or shortage values', () => {
    const fluidRecipe: Recipe = {
      ...recipe('wet-plank', 'plank', 1, [{ id: 'log', amount: 1 }]),
      fluidInputs: [{ id: 'water', amount: 4 }],
    }
    const plan = planFor([fluidRecipe], 'plank', 2)

    expect(plan.requirements).toContainEqual({ kind: 'fluid', id: 'water', required: 8 })
  })

  it('keeps unfavourited subcraft fluids as base requirements instead of using by-product routes', () => {
    const wetPlank: Recipe = {
      ...recipe('wet-plank', 'plank', 1, [{ id: 'log', amount: 1 }]),
      fluidInputs: [{ id: 'water', amount: 5 }],
    }
    const acidRecovery: Recipe = {
      ...recipe('recover-acid', 'stick', 1, []),
      outputs: [],
      fluidInputs: [{ id: 'dilutedSulfuricAcid', amount: 8 }],
      fluidOutputs: [{ id: 'water', amount: 5 }],
    }

    const plan = planFor([wetPlank, acidRecovery], 'plank', 1)

    expect(plan.requirements).toContainEqual({ kind: 'fluid', id: 'water', required: 5 })
    expect(plan.requirements.some((requirement) => requirement.id === 'dilutedSulfuricAcid')).toBe(false)
    expect(plan.recipeSteps.some((step) => step.recipe.id === 'recover-acid')).toBe(false)
  })

  it('expands a subcraft fluid when its production route is favourited', () => {
    const wetPlank: Recipe = {
      ...recipe('wet-plank', 'plank', 1, [{ id: 'log', amount: 1 }]),
      fluidInputs: [{ id: 'water', amount: 5 }],
    }
    const acidRecovery: Recipe = {
      ...recipe('recover-acid', 'stick', 1, []),
      outputs: [],
      fluidInputs: [{ id: 'dilutedSulfuricAcid', amount: 8 }],
      fluidOutputs: [{ id: 'water', amount: 5 }],
    }

    const plan = planFor([wetPlank, acidRecovery], 'plank', 1, {}, {
      'fluid:water': 'recover-acid',
    })

    expect(plan.requirements).toContainEqual({ kind: 'fluid', id: 'dilutedSulfuricAcid', required: 8 })
    expect(plan.recipeSteps.some((step) => step.recipe.id === 'recover-acid')).toBe(true)
  })

  it('reports cycles and depth limits instead of recursing forever', () => {
    const cyclic = [
      recipe('plank-from-stick', 'plank', 1, [{ id: 'stick', amount: 1 }]),
      recipe('stick-from-plank', 'stick', 1, [{ id: 'plank', amount: 1 }]),
    ]
    const cyclePlan = planFor(cyclic, 'plank', 1)
    const depthPlan = buildBulkCraftPlan({
      targetGroup: groupRecipesByOutput(cyclic)[0],
      targetAmount: 1,
      groupsByOutputKey: new Map(groupRecipesByOutput(cyclic).map((group) => [group.key, group])),
      favorites: {},
      inventory: { resources: {}, machines: {} },
      maxDepth: 1,
    })

    expect(cyclePlan.warnings).toContainEqual({ kind: 'cycle', key: 'resource:plank' })
    expect(depthPlan.warnings).toContainEqual({ kind: 'depth-limit', key: 'resource:stick' })
  })

  it('expands long production chains without falling back to intermediate materials', () => {
    const ids = ['plank', 'stick', 'woodenGear', 'stoneGear', 'ironGear', 'steelGear', 'bronzeGear', 'tinGear'] as ResourceId[]
    const recipes = ids.map((output, index) => recipe(
      `step-${index}`,
      output,
      1,
      [{ id: index === 0 ? 'log' : ids[index - 1], amount: 1 }],
    ))

    const plan = planFor(recipes, 'tinGear', 1)

    expect(plan.requirements).toEqual([{ kind: 'resource', id: 'log', required: 1, owned: 0, short: 1 }])
    expect(plan.recipeSteps).toHaveLength(ids.length)
    expect(plan.warnings).toEqual([])
  })
})

describe('bulk plan bookmarks', () => {
  it('loads current quantity records and clamps invalid amounts', () => {
    expect(parseRecipePlanBookmarks(JSON.stringify({
      'resource:plank': { targetAmount: 64 },
      'resource:stick': { targetAmount: 0 },
    }))).toEqual({ 'resource:plank': { targetAmount: 64 } })
  })

  it('migrates legacy boolean recipe bookmarks with quantity one', () => {
    expect(parseRecipePlanBookmarks(null, JSON.stringify({
      'resource:plank': true,
      'resource:stick': false,
    }))).toEqual({ 'resource:plank': { targetAmount: 1 } })
  })
})
