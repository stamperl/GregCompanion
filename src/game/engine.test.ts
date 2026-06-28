import { describe, expect, it } from 'vitest'
import { createInitialState, quests, recipes } from './content'
import {
  canCompleteQuest,
  canCraft,
  completeQuest,
  getBestToolForTarget,
  hitGatherTarget,
  loadGame,
  startCraft,
  tickGame,
  visibleRecipes,
} from './engine'

describe('game engine', () => {
  it('takes multiple bare-hand hits before a tree drops a log', () => {
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

  it('crafts planks, sticks, and a wooden axe with the right ratios', () => {
    let state = createInitialState(1000)
    state.resources.log = 2

    const planks = recipes.find((recipe) => recipe.id === 'craft_planks')!
    expect(canCraft(state, planks)).toBe(true)
    state = tickGame(startCraft(state, planks.id, 1000), planks.durationMs).state
    state = tickGame(startCraft(state, planks.id, 2000), planks.durationMs).state
    expect(state.resources.log).toBe(0)
    expect(state.resources.plank).toBe(8)

    const sticks = recipes.find((recipe) => recipe.id === 'craft_sticks')!
    state = tickGame(startCraft(state, sticks.id, 3000), sticks.durationMs).state
    expect(state.resources.plank).toBe(6)
    expect(state.resources.stick).toBe(4)

    const axe = recipes.find((recipe) => recipe.id === 'craft_wooden_axe')!
    state = tickGame(startCraft(state, axe.id, 4000), axe.durationMs).state
    expect(state.resources.plank).toBe(3)
    expect(state.resources.stick).toBe(2)
    expect(state.resources.woodenAxe).toBe(1)
  })

  it('does not require quests to unlock wood crafting', () => {
    const state = createInitialState(1000)
    state.resources.log = 1

    const planks = recipes.find((recipe) => recipe.id === 'craft_planks')!
    expect(state.completedQuests).not.toContain('punchTree')
    expect(canCraft(state, planks)).toBe(true)
    expect(visibleRecipes(state).map((recipe) => recipe.id)).toContain('craft_planks')
  })

  it('uses a wooden axe to speed up tree gathering', () => {
    let state = createInitialState(1000)
    expect(getBestToolForTarget(state, 'tree').id).toBe('bareHand')

    state.resources.woodenAxe = 1
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
    const state = loadGame(JSON.stringify({ resources: { stone: 5 }, machines: { workbench: 1 } }), 1000)

    expect(state.resources.stone).toBe(5)
    expect(state.resources.log).toBe(0)
    expect(state.resources.woodenAxe).toBe(0)
    expect(state.gatherProgress).toEqual({})
    expect(state.unlockedQuests).toContain('punchTree')
  })

  it('runs slow LV automation only when fuel is available', () => {
    const state = createInitialState(1000)
    state.machines.slowOreTap = 1
    state.resources.coal = 1

    const result = tickGame(state, 30000)
    expect(result.state.resources.coal).toBe(0)
    expect(result.state.resources.stone).toBe(2)
    expect(result.state.resources.copperOre).toBe(1)
    expect(result.state.resources.tinOre).toBe(1)
    expect(result.machineOutputs).toEqual([
      { id: 'stone', amount: 2 },
      { id: 'copperOre', amount: 1 },
      { id: 'tinOre', amount: 1 },
    ])
  })
})
