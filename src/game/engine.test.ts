import { describe, expect, it } from 'vitest'
import { createInitialState, quests, recipes } from './content'
import {
  availableResourceAmount,
  canCompleteQuest,
  canCraft,
  completeQuest,
  craftableQuantity,
  craftRecipeInstant,
  equipResource,
  equippedResourceCounts,
  findGridRecipe,
  getBestToolForTarget,
  hitGatherTarget,
  loadGame,
  makeGridForRecipe,
  missingForQuantity,
  missingForRecipe,
  recipesUsingInput,
  searchTerminalRecipes,
  terminalAvailableAmount,
  tickGame,
  unequipSlot,
  visibleRecipes,
} from './engine'
import type { CraftSlot, Recipe } from './types'

describe('game engine', () => {
  it('takes multiple bare-hand damage actions before a tree drops a log', () => {
    let state = createInitialState(1000)

    for (let hit = 0; hit < 4; hit += 1) {
      const result = hitGatherTarget(state, 'tree')
      state = result.state
      expect(result.completed).toBe(false)
      expect(state.resources.log).toBe(0)
    }

    const result = hitGatherTarget(state, 'tree')
    expect(result.completed).toBe(true)
    expect(result.state.resources.log).toBe(1)
  })

  it('resets tree progress after a log drops', () => {
    let state = createInitialState(1000)
    for (let hit = 0; hit < 5; hit += 1) {
      state = hitGatherTarget(state, 'tree').state
    }

    expect(state.resources.log).toBe(1)
    expect(state.gatherProgress.tree).toBe(0)
  })

  it('crafts planks, a crafting table, sticks, and a wooden axe with the right ratios', () => {
    let state = createInitialState(1000)
    state.resources.log = 3

    const planks = recipes.find((recipe) => recipe.id === 'craft_planks')!
    expect(canCraft(state, planks)).toBe(true)
    state = craftRecipeInstant(state, planks, 1)
    state = craftRecipeInstant(state, planks, 1)
    state = craftRecipeInstant(state, planks, 1)
    expect(state.resources.log).toBe(0)
    expect(state.resources.plank).toBe(12)

    const table = recipes.find((recipe) => recipe.id === 'build_workbench')!
    expect(canCraft(state, table)).toBe(true)
    state = craftRecipeInstant(state, table, 1)
    expect(state.resources.plank).toBe(8)
    expect(state.machines.workbench).toBe(1)

    const sticks = recipes.find((recipe) => recipe.id === 'craft_sticks')!
    state = craftRecipeInstant(state, sticks, 1)
    expect(state.resources.plank).toBe(6)
    expect(state.resources.stick).toBe(4)

    const axe = recipes.find((recipe) => recipe.id === 'craft_wooden_axe')!
    state = craftRecipeInstant(state, axe, 1)
    expect(state.resources.plank).toBe(3)
    expect(state.resources.stick).toBe(2)
    expect(state.resources.woodenAxe).toBe(1)

    state.resources.plank = 3
    state.resources.stick = 2
    const pickaxe = recipes.find((recipe) => recipe.id === 'craft_wooden_pickaxe')!
    state = craftRecipeInstant(state, pickaxe, 1)
    expect(state.resources.plank).toBe(0)
    expect(state.resources.stick).toBe(0)
    expect(state.resources.woodenPickaxe).toBe(1)
  })

  it('does not craft a wooden axe before the crafting table exists', () => {
    const state = createInitialState(1000)
    state.resources.plank = 3
    state.resources.stick = 2

    const axe = recipes.find((recipe) => recipe.id === 'craft_wooden_axe')!
    expect(canCraft(state, axe)).toBe(false)
  })

  it('does not require quests to unlock wood crafting', () => {
    const state = createInitialState(1000)
    state.resources.log = 1

    const planks = recipes.find((recipe) => recipe.id === 'craft_planks')!
    expect(state.completedQuests).not.toContain('punchTree')
    expect(canCraft(state, planks)).toBe(true)
    expect(visibleRecipes(state).map((recipe) => recipe.id)).toContain('craft_planks')
  })

  it('uses an equipped wooden axe to speed up tree gathering', () => {
    let state = createInitialState(1000)
    expect(getBestToolForTarget(state, 'tree').id).toBe('bareHand')

    state.resources.woodenAxe = 1
    expect(getBestToolForTarget(state, 'tree').id).toBe('bareHand')

    state = equipResource(state, 'axe', 'woodenAxe')
    expect(getBestToolForTarget(state, 'tree').id).toBe('woodenAxe')

    const firstHit = hitGatherTarget(state, 'tree').state
    expect(firstHit.gatherProgress.tree).toBe(3)
  })

  it('completes wood guide quests and unlocks the next guide step', () => {
    let state = createInitialState(1000)
    state.resources.log = 1

    const quest = quests.find((candidate) => candidate.id === 'punchTree')!
    expect(canCompleteQuest(state, quest)).toBe(true)

    state = completeQuest(state, 'punchTree')
    expect(state.completedQuests).toContain('punchTree')
    expect(state.unlockedQuests).toContain('craftPlanks')
  })

  it('migrates old saves into the new wood-opening state shape', () => {
    const state = loadGame(
      JSON.stringify({
        resources: { stone: 5 },
        machines: { workbench: 1 },
        activeCrafts: [{ recipeId: 'craft_planks', startedAt: 1, remainingMs: 1, durationMs: 1 }],
      }),
      1000,
    )

    expect(state.resources.stone).toBe(0)
    expect(state.resources.cobblestone).toBe(5)
    expect(state.resources.log).toBe(0)
    expect(state.resources.woodenAxe).toBe(0)
    expect(state.equipment).toEqual({
      helmet: null,
      chestplate: null,
      leggings: null,
      boots: null,
      axe: null,
      shovel: null,
      pickaxe: null,
      weapon: null,
    })
    expect(state.gatherProgress).toEqual({})
    expect(state.unlockedQuests).toContain('punchTree')
    expect('activeCrafts' in state).toBe(false)
  })

  it('reserves equipped items from terminal storage and crafting', () => {
    let state = createInitialState(1000)
    state.resources.woodenAxe = 1

    state = equipResource(state, 'axe', 'woodenAxe')

    expect(state.equipment.axe).toBe('woodenAxe')
    expect(equippedResourceCounts(state)).toEqual({ woodenAxe: 1 })
    expect(availableResourceAmount(state, 'woodenAxe')).toBe(0)
    expect(terminalAvailableAmount(state, Array.from({ length: 9 }, () => null), 'woodenAxe')).toBe(0)

    state = unequipSlot(state, 'axe')

    expect(state.equipment.axe).toBeNull()
    expect(availableResourceAmount(state, 'woodenAxe')).toBe(1)
  })

  it('only equips compatible resources with unreserved availability', () => {
    let state = createInitialState(1000)
    state.resources.woodenAxe = 1
    state.resources.woodenPickaxe = 1
    state.resources.stick = 1

    expect(equipResource(state, 'pickaxe', 'woodenAxe')).toBe(state)
    expect(equipResource(state, 'axe', 'stick')).toBe(state)

    state = equipResource(state, 'axe', 'woodenAxe')
    state = equipResource(state, 'pickaxe', 'woodenPickaxe')
    const unchanged = equipResource(state, 'axe', 'woodenAxe')

    expect(unchanged).toBe(state)
    expect(state.equipment.axe).toBe('woodenAxe')
    expect(state.equipment.pickaxe).toBe('woodenPickaxe')
  })

  it('requires an equipped wooden pickaxe to mine stone into cobblestone', () => {
    let state = createInitialState(1000)

    let result = hitGatherTarget(state, 'stone')
    expect(result.completed).toBe(false)
    expect(result.state.gatherProgress.stone).toBeUndefined()
    expect(result.state.resources.cobblestone).toBe(0)

    state.resources.woodenAxe = 1
    state = equipResource(state, 'axe', 'woodenAxe')
    result = hitGatherTarget(state, 'stone')
    expect(result.state.gatherProgress.stone).toBeUndefined()

    state.resources.woodenPickaxe = 1
    state = equipResource(state, 'pickaxe', 'woodenPickaxe')
    expect(getBestToolForTarget(state, 'stone').id).toBe('woodenPickaxe')

    for (let hit = 0; hit < 4; hit += 1) {
      result = hitGatherTarget(state, 'stone')
      state = result.state
      expect(result.completed).toBe(false)
    }

    expect(state.gatherProgress.stone).toBe(8)
    result = hitGatherTarget(state, 'stone')
    expect(result.completed).toBe(true)
    expect(result.state.gatherProgress.stone).toBe(0)
    expect(result.state.resources.cobblestone).toBe(1)
  })

  it('does not craft with a reserved equipped item', () => {
    let state = createInitialState(1000)
    state.resources.woodenAxe = 1
    state = equipResource(state, 'axe', 'woodenAxe')
    const recycleAxe: Recipe = {
      id: 'test_recycle_axe',
      name: 'Recycle Axe',
      description: 'Synthetic reservation check.',
      tier: 'manual',
      durationMs: 1,
      inputs: [{ id: 'woodenAxe', amount: 1 }],
      outputs: [{ id: 'stick', amount: 1 }],
    }

    expect(canCraft(state, recycleAxe)).toBe(false)
    expect(missingForRecipe(state, recycleAxe).missingResources).toEqual([{ id: 'woodenAxe', amount: 1 }])
  })

  it('runs slow LV automation only when fuel is available', () => {
    const state = createInitialState(1000)
    state.machines.slowOreTap = 1
    state.resources.coal = 1

    const result = tickGame(state, 30000)
    expect(result.state.resources.coal).toBe(0)
    expect(result.state.resources.cobblestone).toBe(2)
    expect(result.state.resources.copperOre).toBe(1)
    expect(result.state.resources.tinOre).toBe(1)
    expect(result.machineOutputs).toEqual([
      { id: 'cobblestone', amount: 2 },
      { id: 'copperOre', amount: 1 },
      { id: 'tinOre', amount: 1 },
    ])
  })

  it('searches terminal recipes by output and ingredient labels', () => {
    const outputMatches = searchTerminalRecipes('wooden axe').map((recipe) => recipe.id)
    const ingredientMatches = searchTerminalRecipes('plank').map((recipe) => recipe.id)

    expect(outputMatches).toContain('craft_wooden_axe')
    expect(ingredientMatches).toContain('craft_sticks')
  })

  it('finds terminal usages for an input resource', () => {
    const usages = recipesUsingInput('plank').map((recipe) => recipe.id)

    expect(usages).toContain('craft_sticks')
    expect(usages).toContain('build_workbench')
  })

  it('loads craftable recipes into the terminal grid and tracks available storage', () => {
    const state = createInitialState(1000)
    state.resources.log = 1
    const planks = recipes.find((recipe) => recipe.id === 'craft_planks')!
    const grid = makeGridForRecipe(planks, state)

    expect(grid[0]).toEqual({ id: 'log', ghost: false })
    expect(terminalAvailableAmount(state, grid, 'log')).toBe(0)
    expect(findGridRecipe(grid, recipes)?.id).toBe('craft_planks')
  })

  it('ghost-fills missing terminal ingredients without matching the craft grid', () => {
    const state = createInitialState(1000)
    state.resources.plank = 1
    const sticks = recipes.find((recipe) => recipe.id === 'craft_sticks')!
    const grid = makeGridForRecipe(sticks, state)

    expect(grid[0]).toEqual({ id: 'plank', ghost: false })
    expect(grid[1]).toEqual({ id: 'plank', ghost: true })
    expect(missingForRecipe(state, sticks).missingResources).toEqual([{ id: 'plank', amount: 1 }])
    expect(findGridRecipe(grid, recipes)).toBeUndefined()
  })

  it('matches a manually-filled terminal grid and crafts instantly', () => {
    let state = createInitialState(1000)
    state.resources.log = 1
    const grid: CraftSlot[] = [{ id: 'log' }, null, null, null, null, null, null, null, null]
    const match = findGridRecipe(grid, recipes)!

    state = craftRecipeInstant(state, match, 1)

    expect(match.id).toBe('craft_planks')
    expect(state.resources.log).toBe(0)
    expect(state.resources.plank).toBe(4)
  })

  it('distinguishes axe and pickaxe by shaped terminal patterns', () => {
    const axeGrid: CraftSlot[] = [
      { id: 'plank' },
      { id: 'plank' },
      null,
      { id: 'plank' },
      { id: 'stick' },
      null,
      null,
      { id: 'stick' },
      null,
    ]
    const pickaxeGrid: CraftSlot[] = [
      { id: 'plank' },
      { id: 'plank' },
      { id: 'plank' },
      null,
      { id: 'stick' },
      null,
      null,
      { id: 'stick' },
      null,
    ]

    expect(findGridRecipe(axeGrid, recipes)?.id).toBe('craft_wooden_axe')
    expect(findGridRecipe(pickaxeGrid, recipes)?.id).toBe('craft_wooden_pickaxe')
  })

  it('calculates max batch crafting from available resources and real grid items', () => {
    const state = createInitialState(1000)
    state.resources.log = 3
    const planks = recipes.find((recipe) => recipe.id === 'craft_planks')!
    const realGrid: CraftSlot[] = [{ id: 'log' }, null, null, null, null, null, null, null, null]
    const ghostGrid: CraftSlot[] = [{ id: 'log', ghost: true }, null, null, null, null, null, null, null, null]

    expect(craftableQuantity(state, planks, realGrid)).toBe(3)
    expect(craftableQuantity(state, planks, ghostGrid)).toBe(3)
  })

  it('reports missing resources for a selected batch quantity', () => {
    const state = createInitialState(1000)
    state.resources.log = 1
    const planks = recipes.find((recipe) => recipe.id === 'craft_planks')!

    expect(missingForQuantity(state, planks, 3)).toEqual([{ id: 'log', amount: 2 }])
  })

  it('instant batch crafting multiplies resource outputs without adding timed crafts', () => {
    let state = createInitialState(1000)
    state.resources.log = 3
    const planks = recipes.find((recipe) => recipe.id === 'craft_planks')!

    state = craftRecipeInstant(state, planks, 2)

    expect(state.resources.log).toBe(1)
    expect(state.resources.plank).toBe(8)
  })

  it('instant batch crafting multiplies machine outputs', () => {
    let state = createInitialState(1000)
    state.resources.plank = 8
    const workbench = recipes.find((recipe) => recipe.id === 'build_workbench')!

    state = craftRecipeInstant(state, workbench, 2)

    expect(state.resources.plank).toBe(0)
    expect(state.machines.workbench).toBe(2)
  })

  it('does not batch craft with reserved equipped items', () => {
    let state = createInitialState(1000)
    state.resources.woodenAxe = 1
    state = equipResource(state, 'axe', 'woodenAxe')
    const recycleAxe: Recipe = {
      id: 'test_batch_recycle_axe',
      name: 'Batch Recycle Axe',
      description: 'Synthetic reservation check.',
      tier: 'manual',
      durationMs: 1,
      inputs: [{ id: 'woodenAxe', amount: 1 }],
      outputs: [{ id: 'stick', amount: 1 }],
    }

    expect(craftableQuantity(state, recycleAxe)).toBe(0)
    expect(missingForQuantity(state, recycleAxe, 1)).toEqual([{ id: 'woodenAxe', amount: 1 }])
    expect(craftRecipeInstant(state, recycleAxe, 1)).toBe(state)
  })
})
