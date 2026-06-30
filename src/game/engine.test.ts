import { describe, expect, it } from 'vitest'
import { createInitialState, fuelDefinitions, quests, recipes } from './content'
import { groupRecipesByOutput } from './recipeGroups'
import {
  availableResourceAmount,
  availableUnplacedMachineCount,
  boilerHasWater,
  boilerSteamCapacityMs,
  canCompleteQuest,
  canCraft,
  collectProcessOutput,
  completeQuest,
  craftableQuantity,
  craftRecipeInstant,
  durabilityRemaining,
  equipResource,
  equippedResourceCounts,
  findGridRecipe,
  getBestToolForTarget,
  hitGatherTarget,
  insertProcessSlot,
  loadGame,
  makeGridForRecipe,
  maxDurability,
  missingForQuantity,
  missingForRecipe,
  placeMachineInstance,
  processStackLimit,
  recipesUsingInput,
  removeMachineInstance,
  removeProcessSlot,
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

    for (let hit = 0; hit < 11; hit += 1) {
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
    for (let hit = 0; hit < 12; hit += 1) {
      state = hitGatherTarget(state, 'tree').state
    }

    expect(state.resources.log).toBe(1)
    expect(state.gatherProgress.tree).toBe(0)
  })

  it('crafts planks, sticks, and early tools with the right ratios', () => {
    let state = createInitialState(1000)
    state.resources.log = 3

    const planks = recipes.find((recipe) => recipe.id === 'craft_planks')!
    expect(canCraft(state, planks)).toBe(true)
    state = craftRecipeInstant(state, planks, 1)
    state = craftRecipeInstant(state, planks, 1)
    state = craftRecipeInstant(state, planks, 1)
    expect(state.resources.log).toBe(0)
    expect(state.resources.plank).toBe(12)

    const sticks = recipes.find((recipe) => recipe.id === 'craft_sticks')!
    state = craftRecipeInstant(state, sticks, 1)
    expect(state.resources.plank).toBe(10)
    expect(state.resources.stick).toBe(4)

    const axe = recipes.find((recipe) => recipe.id === 'craft_wooden_axe')!
    state = craftRecipeInstant(state, axe, 1)
    expect(state.resources.plank).toBe(7)
    expect(state.resources.stick).toBe(2)
    expect(state.resources.woodenAxe).toBe(1)

    state.resources.plank = 3
    state.resources.stick = 2
    const pickaxe = recipes.find((recipe) => recipe.id === 'craft_wooden_pickaxe')!
    state = craftRecipeInstant(state, pickaxe, 1)
    expect(state.resources.plank).toBe(0)
    expect(state.resources.stick).toBe(0)
    expect(state.resources.woodenPickaxe).toBe(1)
    expect(state.craftedResources).toContain('woodenPickaxe')

    state.resources.cobblestone = 6
    state.resources.stick = 4
    const stoneAxe = recipes.find((recipe) => recipe.id === 'craft_stone_axe')!
    state = craftRecipeInstant(state, stoneAxe, 1)
    expect(state.resources.cobblestone).toBe(3)
    expect(state.resources.stick).toBe(2)
    expect(state.resources.stoneAxe).toBe(1)

    const stonePickaxe = recipes.find((recipe) => recipe.id === 'craft_stone_pickaxe')!
    state = craftRecipeInstant(state, stonePickaxe, 1)
    expect(state.resources.cobblestone).toBe(0)
    expect(state.resources.stick).toBe(0)
    expect(state.resources.stonePickaxe).toBe(1)
    expect(state.craftedResources).toContain('stonePickaxe')

    state.resources.ironIngot = 6
    state.resources.stick = 4
    const ironAxe = recipes.find((recipe) => recipe.id === 'craft_iron_axe')!
    state = craftRecipeInstant(state, ironAxe, 1)
    expect(state.resources.ironIngot).toBe(3)
    expect(state.resources.stick).toBe(2)
    expect(state.resources.ironAxe).toBe(1)

    const ironPickaxe = recipes.find((recipe) => recipe.id === 'craft_iron_pickaxe')!
    state = craftRecipeInstant(state, ironPickaxe, 1)
    expect(state.resources.ironIngot).toBe(0)
    expect(state.resources.stick).toBe(0)
    expect(state.resources.ironPickaxe).toBe(1)
    expect(state.craftedResources).toContain('ironPickaxe')
  })

  it('crafts hammers with a distinct six-head one-stick recipe', () => {
    let state = createInitialState(1000)
    state.resources.cobblestone = 6
    state.resources.stick = 1
    const stoneHammer = recipes.find((recipe) => recipe.id === 'craft_stone_hammer')!

    state = craftRecipeInstant(state, stoneHammer, 1)
    expect(state.resources.cobblestone).toBe(0)
    expect(state.resources.stick).toBe(0)
    expect(state.resources.stoneHammer).toBe(1)

    state.resources.ironIngot = 6
    state.resources.stick = 1
    const ironHammer = recipes.find((recipe) => recipe.id === 'craft_iron_hammer')!

    state = craftRecipeInstant(state, ironHammer, 1)
    expect(state.resources.ironIngot).toBe(0)
    expect(state.resources.stick).toBe(0)
    expect(state.resources.ironHammer).toBe(1)
  })

  it('crafts wooden tools without a crafting table', () => {
    const state = createInitialState(1000)
    state.resources.plank = 3
    state.resources.stick = 2

    const axe = recipes.find((recipe) => recipe.id === 'craft_wooden_axe')!
    expect(canCraft(state, axe)).toBe(true)
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
    expect(durabilityRemaining(firstHit, 'woodenAxe')).toBe(31)
  })

  it('uses stone tools as stronger equipment upgrades', () => {
    let state = createInitialState(1000)
    state.resources.stoneAxe = 1
    state.resources.stonePickaxe = 1
    state.resources.stoneShovel = 1
    state.resources.ironAxe = 1
    state.resources.ironPickaxe = 1

    state = equipResource(state, 'axe', 'stoneAxe')
    state = equipResource(state, 'pickaxe', 'stonePickaxe')
    state = equipResource(state, 'shovel', 'stoneShovel')

    expect(getBestToolForTarget(state, 'tree').id).toBe('stoneAxe')
    expect(getBestToolForTarget(state, 'stone').id).toBe('stonePickaxe')
    expect(getBestToolForTarget(state, 'clayPatch').id).toBe('stoneShovel')

    expect(hitGatherTarget(state, 'tree').state.gatherProgress.tree).toBe(5)
    expect(hitGatherTarget(state, 'stone').state.gatherProgress.stone).toBe(4)
    expect(hitGatherTarget(state, 'clayPatch').state.gatherProgress.clayPatch).toBe(5)

    state = unequipSlot(state, 'axe')
    state = unequipSlot(state, 'pickaxe')
    state = equipResource(state, 'axe', 'ironAxe')
    state = equipResource(state, 'pickaxe', 'ironPickaxe')

    expect(getBestToolForTarget(state, 'tree').id).toBe('ironAxe')
    expect(getBestToolForTarget(state, 'copperVein').id).toBe('ironPickaxe')
    expect(hitGatherTarget(state, 'copperVein').state.gatherProgress.copperVein).toBe(6)
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
    expect(state.craftedResources).toEqual([])
    expect(state.gatherProgress).toEqual({})
    expect(state.machineInstances).toEqual([])
    expect(state.durability).toEqual({})
    expect(state.unlockedQuests).toContain('punchTree')
    expect('activeCrafts' in state).toBe(false)
  })

  it('removes old firebrick state during save migration', () => {
    const state = loadGame(
      JSON.stringify({
        resources: { firebrick: 8, log: 1 },
        craftedResources: ['firebrick', 'log'],
        durability: { firebrick: 3 },
      }),
      1000,
    )

    expect('firebrick' in state.resources).toBe(false)
    expect(state.resources.log).toBe(1)
    expect(state.craftedResources).not.toContain('firebrick')
    expect('firebrick' in state.durability).toBe(false)
  })

  it('migrates old furnace counts into placed factory instances', () => {
    const state = loadGame(
      JSON.stringify({
        machines: { furnace: 2, steamBoiler: 3, slowOreTap: 1 },
        machineInstances: [
          { uid: 'old-furnace', machineId: 'furnace', x: 0, y: 0, level: 1 },
          { uid: 'old-boiler', machineId: 'steamBoiler', x: 1, y: 0, level: 1 },
        ],
      }),
      1000,
    )

    expect(state.machines.furnace).toBe(2)
    expect(Object.keys(state.machines)).toEqual(['furnace', 'well', 'steamBoiler', 'steamMacerator'])
    expect(state.machines.well).toBe(0)
    expect(state.machines.steamBoiler).toBe(3)
    expect(state.machines.steamMacerator).toBe(0)
    expect(state.machineInstances).toHaveLength(2)
    expect(state.machineInstances[0]).toMatchObject({ machineId: 'furnace', x: 0, y: 0, level: 1 })
    expect(state.machineInstances[1]).toMatchObject({ machineId: 'steamBoiler', x: 1, y: 0, level: 1 })
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
    state.resources.stoneAxe = 1
    state.resources.stonePickaxe = 1
    state.resources.stoneShovel = 1
    state.resources.ironAxe = 1
    state.resources.ironPickaxe = 1
    state.resources.stick = 1

    expect(equipResource(state, 'pickaxe', 'woodenAxe')).toBe(state)
    expect(equipResource(state, 'axe', 'stick')).toBe(state)
    expect(equipResource(state, 'axe', 'stonePickaxe')).toBe(state)
    expect(equipResource(state, 'pickaxe', 'stoneAxe')).toBe(state)
    expect(equipResource(state, 'axe', 'stoneShovel')).toBe(state)
    expect(equipResource(state, 'pickaxe', 'stoneShovel')).toBe(state)
    expect(equipResource(state, 'axe', 'ironPickaxe')).toBe(state)
    expect(equipResource(state, 'pickaxe', 'ironAxe')).toBe(state)

    state = equipResource(state, 'axe', 'woodenAxe')
    state = equipResource(state, 'pickaxe', 'woodenPickaxe')
    const unchanged = equipResource(state, 'axe', 'woodenAxe')

    expect(unchanged).toBe(state)
    expect(state.equipment.axe).toBe('woodenAxe')
    expect(state.equipment.pickaxe).toBe('woodenPickaxe')

    state = unequipSlot(state, 'axe')
    state = unequipSlot(state, 'pickaxe')
    state = equipResource(state, 'axe', 'stoneAxe')
    state = equipResource(state, 'pickaxe', 'stonePickaxe')

    expect(state.equipment.axe).toBe('stoneAxe')
    expect(state.equipment.pickaxe).toBe('stonePickaxe')
    state = equipResource(state, 'shovel', 'stoneShovel')
    expect(state.equipment.shovel).toBe('stoneShovel')

    state = unequipSlot(state, 'axe')
    state = unequipSlot(state, 'pickaxe')
    state = equipResource(state, 'axe', 'ironAxe')
    state = equipResource(state, 'pickaxe', 'ironPickaxe')

    expect(state.equipment.axe).toBe('ironAxe')
    expect(state.equipment.pickaxe).toBe('ironPickaxe')
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

    for (let hit = 0; hit < 11; hit += 1) {
      result = hitGatherTarget(state, 'stone')
      state = result.state
      expect(result.completed).toBe(false)
    }

    expect(state.gatherProgress.stone).toBe(22)
    result = hitGatherTarget(state, 'stone')
    expect(result.completed).toBe(true)
    expect(result.state.gatherProgress.stone).toBe(0)
    expect(result.state.resources.cobblestone).toBe(1)
  })

  it('requires stone for iron and iron for copper tin and coal', () => {
    let state = createInitialState(1000)

    let result = hitGatherTarget(state, 'ironVein')
    expect(result.state.gatherProgress.ironVein).toBeUndefined()

    state.resources.woodenPickaxe = 1
    state = equipResource(state, 'pickaxe', 'woodenPickaxe')
    result = hitGatherTarget(state, 'ironVein')
    expect(result.state.gatherProgress.ironVein).toBeUndefined()

    state = unequipSlot(state, 'pickaxe')
    state.resources.stonePickaxe = 1
    state = equipResource(state, 'pickaxe', 'stonePickaxe')
    result = hitGatherTarget(state, 'ironVein')
    expect(result.state.gatherProgress.ironVein).toBe(4)

    result = hitGatherTarget(state, 'copperVein')
    expect(result.state.gatherProgress.copperVein).toBeUndefined()

    state = unequipSlot(state, 'pickaxe')
    state.resources.ironPickaxe = 1
    state = equipResource(state, 'pickaxe', 'ironPickaxe')
    result = hitGatherTarget(state, 'coalSeam')
    expect(result.state.gatherProgress.coalSeam).toBe(6)
  })

  it('requires stone or better pickaxes for gravel and wears tools only on successful damage', () => {
    let state = createInitialState(1000)
    state.resources.woodenAxe = 1
    state = equipResource(state, 'axe', 'woodenAxe')

    let result = hitGatherTarget(state, 'gravelPatch')
    expect(result.state.gatherProgress.gravelPatch).toBeUndefined()
    expect(durabilityRemaining(result.state, 'woodenAxe')).toBe(32)

    state.resources.stonePickaxe = 1
    state = equipResource(state, 'pickaxe', 'stonePickaxe')
    result = hitGatherTarget(state, 'gravelPatch')
    expect(result.state.gatherProgress.gravelPatch).toBe(3)
    expect(durabilityRemaining(result.state, 'stonePickaxe')).toBe(63)

    state = unequipSlot(result.state, 'pickaxe')
    state.resources.ironPickaxe = 1
    state = equipResource(state, 'pickaxe', 'ironPickaxe')
    result = hitGatherTarget(state, 'gravelPatch')
    expect(result.state.gatherProgress.gravelPatch).toBe(9)
    expect(durabilityRemaining(result.state, 'ironPickaxe')).toBe(127)
  })

  it('destroys a gathering tool when its pooled durability reaches zero', () => {
    let state = createInitialState(1000)
    state.resources.woodenAxe = 1
    state.durability.woodenAxe = 1
    state = equipResource(state, 'axe', 'woodenAxe')

    const result = hitGatherTarget(state, 'tree')
    state = result.state

    expect(result.toolBroke).toBe('woodenAxe')
    expect(state.resources.woodenAxe).toBe(0)
    expect(state.equipment.axe).toBeNull()
    expect(durabilityRemaining(state, 'woodenAxe')).toBe(0)
  })

  it('migrates old saves with owned or equipped pickaxes into persistent gather unlocks', () => {
    const state = loadGame(
      JSON.stringify({
        resources: { stonePickaxe: 1 },
        equipment: {
          helmet: null,
          chestplate: null,
          leggings: null,
          boots: null,
          axe: null,
          shovel: null,
          pickaxe: 'ironPickaxe',
          weapon: null,
        },
      }),
      1000,
    )

    expect(state.craftedResources).toContain('stonePickaxe')
    expect(state.craftedResources).toContain('ironPickaxe')
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

  it('places owned furnaces on empty factory cells only', () => {
    let state = createInitialState(1000)
    state.machines.furnace = 1

    expect(availableUnplacedMachineCount(state, 'furnace')).toBe(1)
    state = placeMachineInstance(state, 'furnace', 0, 0)

    expect(state.machineInstances).toHaveLength(1)
    expect(availableUnplacedMachineCount(state, 'furnace')).toBe(0)
    expect(placeMachineInstance(state, 'furnace', 0, 0)).toBe(state)
    expect(placeMachineInstance(state, 'furnace', 1, 0)).toBe(state)
  })

  it('removes placed machines back into unplaced factory inventory and returns slotted items', () => {
    let state = createInitialState(1000)
    state.machines.furnace = 1
    state.resources.log = 2
    state = placeMachineInstance(state, 'furnace', 0, 0)
    const furnace = state.machineInstances[0]
    state = insertProcessSlot(state, furnace.uid, 'input', 'log', 1)

    expect(availableUnplacedMachineCount(state, 'furnace')).toBe(0)
    state = removeMachineInstance(state, furnace.uid)

    expect(state.machineInstances).toEqual([])
    expect(state.machines.furnace).toBe(1)
    expect(availableUnplacedMachineCount(state, 'furnace')).toBe(1)
    expect(state.resources.log).toBe(2)
  })

  it('smelts ore in multiple furnace instances independently', () => {
    let state = createInitialState(1000)
    state.machines.furnace = 3
    state.resources.ironOre = 1
    state.resources.copperOre = 1
    state.resources.tinOre = 1
    state.resources.plank = 4
    state.resources.coal = 2

    state = placeMachineInstance(state, 'furnace', 0, 0)
    state = placeMachineInstance(state, 'furnace', 1, 0)
    state = placeMachineInstance(state, 'furnace', 2, 0)
    const [ironFurnace, copperFurnace, tinFurnace] = state.machineInstances

    state = insertProcessSlot(state, ironFurnace.uid, 'input', 'ironOre', processStackLimit)
    state = insertProcessSlot(state, ironFurnace.uid, 'fuel', 'coal', 1)
    state = insertProcessSlot(state, copperFurnace.uid, 'input', 'copperOre', processStackLimit)
    state = insertProcessSlot(state, copperFurnace.uid, 'fuel', 'plank', processStackLimit)
    state = insertProcessSlot(state, tinFurnace.uid, 'input', 'tinOre', processStackLimit)
    state = insertProcessSlot(state, tinFurnace.uid, 'fuel', 'coal', 1)

    state = tickGame(state, 14000).state

    const ironProcess = state.machineInstances.find((instance) => instance.uid === ironFurnace.uid)!.process
    const copperProcess = state.machineInstances.find((instance) => instance.uid === copperFurnace.uid)!.process
    const tinProcess = state.machineInstances.find((instance) => instance.uid === tinFurnace.uid)!.process
    expect(ironProcess.output).toEqual({ id: 'ironIngot', amount: 1 })
    expect(copperProcess.output).toEqual({ id: 'copperIngot', amount: 1 })
    expect(tinProcess.output).toEqual({ id: 'tinIngot', amount: 1 })
    expect(copperProcess.fuel).toBeNull()
    expect(tinProcess.fuelRemainingMs).toBeGreaterThan(60000)

    state = collectProcessOutput(state, copperFurnace.uid)
    expect(state.resources.copperIngot).toBe(1)
  })

  it('caps furnace slot inserts at stack size and returns input stacks', () => {
    let state = createInitialState(1000)
    state.machines.furnace = 1
    state.resources.copperOre = 80
    state.resources.stick = 1
    state = placeMachineInstance(state, 'furnace', 0, 0)
    const furnace = state.machineInstances[0]

    expect(insertProcessSlot(state, furnace.uid, 'input', 'stick', 1)).toBe(state)
    expect(insertProcessSlot(state, furnace.uid, 'fuel', 'copperOre', 1)).toBe(state)

    state = insertProcessSlot(state, furnace.uid, 'input', 'copperOre', 80)
    expect(state.machineInstances[0].process.input).toEqual({ id: 'copperOre', amount: 64 })
    expect(state.resources.copperOre).toBe(16)

    state = removeProcessSlot(state, furnace.uid, 'input')
    expect(state.machineInstances[0].process.input).toBeNull()
    expect(state.resources.copperOre).toBe(80)
  })

  it('requires pestle and mortar as a non-consumed catalyst for dust grinding', () => {
    let state = createInitialState(1000)
    state.resources.copperIngot = 2
    const grindCopper = recipes.find((recipe) => recipe.id === 'grind_copper_ingot')!

    expect(canCraft(state, grindCopper)).toBe(false)
    expect(missingForRecipe(state, grindCopper).missingCatalysts).toEqual([{ id: 'mortar', amount: 1 }])

    state.resources.mortar = 1
    expect(craftableQuantity(state, grindCopper)).toBe(2)
    state = craftRecipeInstant(state, grindCopper, 2)

    expect(state.resources.copperIngot).toBe(0)
    expect(state.resources.copperDust).toBe(2)
    expect(state.resources.mortar).toBe(1)
    expect(durabilityRemaining(state, 'mortar')).toBe(62)
  })

  it('uses hammers as durable non-consumed catalysts for ore crushing', () => {
    let state = createInitialState(1000)
    state.resources.ironOre = 1
    const crushIron = recipes.find((recipe) => recipe.id === 'crush_iron_ore')!

    expect(canCraft(state, crushIron)).toBe(false)
    expect(missingForRecipe(state, crushIron).missingCatalysts).toEqual([{ id: 'stoneHammer', amount: 1 }])

    state.resources.ironHammer = 1
    expect(canCraft(state, crushIron)).toBe(true)
    state = craftRecipeInstant(state, crushIron, 1)

    expect(state.resources.ironOre).toBe(0)
    expect(state.resources.crushedIronOre).toBe(2)
    expect(state.resources.ironHammer).toBe(1)
    expect(durabilityRemaining(state, 'ironHammer')).toBe(159)
  })

  it('requires a stone shovel to dig clay and wears the shovel', () => {
    let state = createInitialState(1000)

    let result = hitGatherTarget(state, 'clayPatch')
    expect(result.state.gatherProgress.clayPatch).toBeUndefined()

    state.resources.stoneShovel = 1
    state = equipResource(state, 'shovel', 'stoneShovel')
    result = hitGatherTarget(state, 'clayPatch')

    expect(result.state.gatherProgress.clayPatch).toBe(5)
    expect(durabilityRemaining(result.state, 'stoneShovel')).toBe(63)
  })

  it('supports wooden and iron shovels for clay digging', () => {
    let state = createInitialState(1000)
    state.resources.woodenShovel = 1
    state.resources.ironShovel = 1

    state = equipResource(state, 'shovel', 'woodenShovel')
    expect(getBestToolForTarget(state, 'clayPatch').id).toBe('woodenShovel')
    expect(hitGatherTarget(state, 'clayPatch').state.gatherProgress.clayPatch).toBe(3)

    state = unequipSlot(state, 'shovel')
    state = equipResource(state, 'shovel', 'ironShovel')
    expect(getBestToolForTarget(state, 'clayPatch').id).toBe('ironShovel')
    expect(hitGatherTarget(state, 'clayPatch').state.gatherProgress.clayPatch).toBe(8)
  })

  it('requires a hammer catalyst to make early metal plates', () => {
    let state = createInitialState(1000)
    state.resources.copperIngot = 2
    const copperPlate = recipes.find((recipe) => recipe.id === 'copper_plate')!

    expect(canCraft(state, copperPlate)).toBe(false)
    expect(missingForRecipe(state, copperPlate).missingCatalysts).toEqual([{ id: 'stoneHammer', amount: 1 }])

    state.resources.ironHammer = 1
    expect(canCraft(state, copperPlate)).toBe(true)
    state = craftRecipeInstant(state, copperPlate, 1)

    expect(state.resources.copperIngot).toBe(0)
    expect(state.resources.copperPlate).toBe(1)
    expect(state.resources.ironHammer).toBe(1)
    expect(durabilityRemaining(state, 'ironHammer')).toBe(159)
  })

  it('crafts an iron file and uses it to file one ingot into one rod', () => {
    let state = createInitialState(1000)
    state.resources.ironPlate = 2
    state.resources.stick = 1
    const ironFile = recipes.find((recipe) => recipe.id === 'craft_iron_file')!

    state = craftRecipeInstant(state, ironFile, 1)
    expect(state.resources.ironPlate).toBe(0)
    expect(state.resources.stick).toBe(0)
    expect(state.resources.ironFile).toBe(1)

    state.resources.ironIngot = 1
    const ironRod = recipes.find((recipe) => recipe.id === 'file_iron_rod')!
    state = craftRecipeInstant(state, ironRod, 1)

    expect(state.resources.ironIngot).toBe(0)
    expect(state.resources.ironRod).toBe(1)
    expect(state.resources.ironFile).toBe(1)
    expect(durabilityRemaining(state, 'ironFile')).toBe(95)
  })

  it('crafts upgraded pestle and mortar tools with higher durability', () => {
    let state = createInitialState(1000)
    state.resources.ironPlate = 3
    state.resources.bronzePlate = 3
    state.resources.flint = 2
    state.resources.stick = 2
    const ironMortar = recipes.find((recipe) => recipe.id === 'craft_iron_mortar')!
    const bronzeMortar = recipes.find((recipe) => recipe.id === 'craft_bronze_mortar')!

    state = craftRecipeInstant(state, ironMortar, 1)
    state = craftRecipeInstant(state, bronzeMortar, 1)

    expect(state.resources.ironMortar).toBe(1)
    expect(state.resources.bronzeMortar).toBe(1)
    expect(durabilityRemaining(state, 'mortar')).toBe(0)
    expect(durabilityRemaining(state, 'ironMortar')).toBe(128)
    expect(durabilityRemaining(state, 'bronzeMortar')).toBe(192)
  })

  it('crafts a bronze file with more durability than iron', () => {
    let state = createInitialState(1000)
    state.resources.bronzePlate = 2
    state.resources.stick = 1
    const bronzeFile = recipes.find((recipe) => recipe.id === 'craft_bronze_file')!

    state = craftRecipeInstant(state, bronzeFile, 1)

    expect(state.resources.bronzeFile).toBe(1)
    expect(maxDurability('bronzeFile')).toBeGreaterThan(maxDurability('ironFile'))
    expect(durabilityRemaining(state, 'bronzeFile')).toBe(160)
  })

  it('uses upgraded mortars for grinding and spends the upgraded durability first', () => {
    let state = createInitialState(1000)
    state.resources.copperIngot = 2
    state.resources.mortar = 1
    state.resources.ironMortar = 1
    state.resources.bronzeMortar = 1
    const grindCopper = recipes.find((recipe) => recipe.id === 'grind_copper_ingot')!

    state = craftRecipeInstant(state, grindCopper, 2)

    expect(state.resources.copperDust).toBe(2)
    expect(durabilityRemaining(state, 'bronzeMortar')).toBe(190)
    expect(durabilityRemaining(state, 'ironMortar')).toBe(128)
    expect(durabilityRemaining(state, 'mortar')).toBe(64)
  })

  it('uses bronze files for rod filing and spends bronze durability first', () => {
    let state = createInitialState(1000)
    state.resources.bronzeIngot = 1
    state.resources.ironFile = 1
    state.resources.bronzeFile = 1
    const bronzeRod = recipes.find((recipe) => recipe.id === 'file_bronze_rod')!

    state = craftRecipeInstant(state, bronzeRod, 1)

    expect(state.resources.bronzeRod).toBe(1)
    expect(durabilityRemaining(state, 'bronzeFile')).toBe(159)
    expect(durabilityRemaining(state, 'ironFile')).toBe(96)
  })

  it('files one ingot into exactly one rod for early hand filing', () => {
    let state = createInitialState(1000)
    state.resources.copperIngot = 1
    state.resources.ironFile = 1
    const copperRod = recipes.find((recipe) => recipe.id === 'file_copper_rod')!

    state = craftRecipeInstant(state, copperRod, 1)

    expect(state.resources.copperIngot).toBe(0)
    expect(state.resources.copperRod).toBe(1)
  })

  it('grinds crushed ore into dust one-to-one with a pestle and mortar', () => {
    let state = createInitialState(1000)
    state.resources.crushedIronOre = 2
    state.resources.mortar = 1
    const grindCrushedIron = recipes.find((recipe) => recipe.id === 'grind_crushed_iron_ore')!

    expect(craftableQuantity(state, grindCrushedIron)).toBe(2)
    state = craftRecipeInstant(state, grindCrushedIron, 2)

    expect(state.resources.crushedIronOre).toBe(0)
    expect(state.resources.ironDust).toBe(2)
    expect(state.resources.mortar).toBe(1)
    expect(durabilityRemaining(state, 'mortar')).toBe(62)
  })

  it('requires durable catalysts to be placed in the terminal grid pattern', () => {
    const crushIron = recipes.find((recipe) => recipe.id === 'crush_iron_ore')!
    const missingHammerGrid: CraftSlot[] = [null, null, null, null, { id: 'ironOre' }, null, null, null, null]
    const stoneHammerGrid: CraftSlot[] = [null, { id: 'stoneHammer' }, null, null, { id: 'ironOre' }, null, null, null, null]
    const ironHammerGrid: CraftSlot[] = [null, { id: 'ironHammer' }, null, null, { id: 'ironOre' }, null, null, null, null]

    expect(findGridRecipe(missingHammerGrid, recipes)).toBeUndefined()
    expect(findGridRecipe(stoneHammerGrid, recipes)?.id).toBe(crushIron.id)
    expect(findGridRecipe(ironHammerGrid, recipes)?.id).toBe(crushIron.id)
  })

  it('matches only the shaped eight-cobblestone furnace ring', () => {
    const furnaceRing: CraftSlot[] = [
      { id: 'cobblestone' },
      { id: 'cobblestone' },
      { id: 'cobblestone' },
      { id: 'cobblestone' },
      null,
      { id: 'cobblestone' },
      { id: 'cobblestone' },
      { id: 'cobblestone' },
      { id: 'cobblestone' },
    ]
    const arbitraryEight: CraftSlot[] = [
      { id: 'cobblestone' },
      { id: 'cobblestone' },
      { id: 'cobblestone' },
      { id: 'cobblestone' },
      { id: 'cobblestone' },
      { id: 'cobblestone' },
      { id: 'cobblestone' },
      { id: 'cobblestone' },
      null,
    ]

    expect(findGridRecipe(furnaceRing, recipes)?.id).toBe('build_furnace')
    expect(findGridRecipe(arbitraryEight, recipes)?.id).not.toBe('build_furnace')
  })

  it('loads catalyst recipes into the grid with catalyst tools included', () => {
    const state = createInitialState(1000)
    state.resources.ironOre = 1
    state.resources.ironHammer = 1
    const crushIron = recipes.find((recipe) => recipe.id === 'crush_iron_ore')!
    const grid = makeGridForRecipe(crushIron, state)

    expect(grid[1]).toEqual({ id: 'ironHammer', ghost: false })
    expect(grid[4]).toEqual({ id: 'ironOre', ghost: false })
    expect(findGridRecipe(grid, recipes)?.id).toBe('crush_iron_ore')
  })

  it('loads mortar and file recipe previews with the best owned valid tool', () => {
    const state = createInitialState(1000)
    state.resources.ironIngot = 2
    state.resources.mortar = 1
    state.resources.ironMortar = 1
    state.resources.bronzeMortar = 1
    state.resources.ironFile = 1
    state.resources.bronzeFile = 1
    const grindIron = recipes.find((recipe) => recipe.id === 'grind_iron_ingot')!
    const fileIron = recipes.find((recipe) => recipe.id === 'file_iron_rod')!

    expect(makeGridForRecipe(grindIron, state)[1]).toEqual({ id: 'bronzeMortar', ghost: false })
    expect(makeGridForRecipe(fileIron, state)[1]).toEqual({ id: 'bronzeFile', ghost: false })
  })

  it('smelts charcoal and uses it as a middle-strength furnace fuel', () => {
    expect(fuelDefinitions.log.burnMs).toBeLessThan(fuelDefinitions.charcoal.burnMs)
    expect(fuelDefinitions.plank.burnMs).toBeLessThan(fuelDefinitions.charcoal.burnMs)
    expect(fuelDefinitions.charcoal.burnMs).toBeLessThan(fuelDefinitions.coal.burnMs)

    let state = createInitialState(1000)
    state.machines.furnace = 1
    state.resources.log = 2
    state = placeMachineInstance(state, 'furnace', 0, 0)
    const furnace = state.machineInstances[0]

    state = insertProcessSlot(state, furnace.uid, 'input', 'log', 1)
    state = insertProcessSlot(state, furnace.uid, 'fuel', 'log', 1)
    state = tickGame(state, 10000).state

    expect(state.machineInstances[0].process.output).toEqual({ id: 'charcoal', amount: 1 })
  })

  it('keeps lit furnace fuel burning even after the recipe becomes invalid', () => {
    let state = createInitialState(1000)
    state.machines.furnace = 1
    state.resources.log = 2
    state = placeMachineInstance(state, 'furnace', 0, 0)
    const furnace = state.machineInstances[0]

    state = insertProcessSlot(state, furnace.uid, 'input', 'log', 1)
    state = insertProcessSlot(state, furnace.uid, 'fuel', 'log', 1)
    state = tickGame(state, 4000).state

    expect(state.machineInstances[0].process.fuelRemainingMs).toBe(6000)
    expect(state.machineInstances[0].process.fuelDurationMs).toBe(10000)

    state = removeProcessSlot(state, furnace.uid, 'input')
    state = tickGame(state, 2500).state

    expect(state.machineInstances[0].process.input).toBeNull()
    expect(state.machineInstances[0].process.activeRecipeId).toBeNull()
    expect(state.machineInstances[0].process.fuelRemainingMs).toBe(3500)
    expect(state.machineInstances[0].process.fuelDurationMs).toBe(10000)

    state = tickGame(state, 3500).state

    expect(state.machineInstances[0].process.fuelRemainingMs).toBe(0)
    expect(state.machineInstances[0].process.fuelDurationMs).toBe(0)
  })

  it('does not light a new furnace fuel item without a valid process recipe', () => {
    let state = createInitialState(1000)
    state.machines.furnace = 1
    state.resources.log = 1
    state = placeMachineInstance(state, 'furnace', 0, 0)
    const furnace = state.machineInstances[0]

    state = insertProcessSlot(state, furnace.uid, 'fuel', 'log', 1)
    state = tickGame(state, 1000).state

    expect(state.machineInstances[0].process.fuel).toEqual({ id: 'log', amount: 1 })
    expect(state.machineInstances[0].process.fuelRemainingMs).toBe(0)
    expect(state.machineInstances[0].process.fuelDurationMs).toBe(0)
  })

  it('smelts crushed ore into ingots one-to-one after the crushing bonus', () => {
    let state = createInitialState(1000)
    state.machines.furnace = 2
    state.resources.ironOre = 1
    state.resources.crushedIronOre = 1
    state.resources.charcoal = 2
    state = placeMachineInstance(state, 'furnace', 0, 0)
    state = placeMachineInstance(state, 'furnace', 1, 0)
    const [directFurnace, crushedFurnace] = state.machineInstances

    state = insertProcessSlot(state, directFurnace.uid, 'input', 'ironOre', 1)
    state = insertProcessSlot(state, directFurnace.uid, 'fuel', 'charcoal', 1)
    state = insertProcessSlot(state, crushedFurnace.uid, 'input', 'crushedIronOre', 1)
    state = insertProcessSlot(state, crushedFurnace.uid, 'fuel', 'charcoal', 1)
    state = tickGame(state, 14000).state

    expect(state.machineInstances[0].process.output).toEqual({ id: 'ironIngot', amount: 1 })
    expect(state.machineInstances[1].process.output).toEqual({ id: 'ironIngot', amount: 1 })
  })

  it('crafts bricks, bucket, well, and steam machines with shaped recipes', () => {
    let state = createInitialState(1000)
    state.resources.clay = 1
    state.resources.unfiredBrick = 1
    state.resources.ironPlate = 3
    state.resources.brick = 8
    state.resources.bronzePlate = 12
    state.resources.bronzeRod = 4
    state.resources.copperRod = 2
    state.resources.steamCasing = 2
    state.resources.bronzeMortar = 1
    const unfiredBrick = recipes.find((recipe) => recipe.id === 'craft_unfired_brick')!
    const bucket = recipes.find((recipe) => recipe.id === 'craft_bucket')!
    const well = recipes.find((recipe) => recipe.id === 'build_well')!
    const boiler = recipes.find((recipe) => recipe.id === 'build_steam_boiler')!
    const macerator = recipes.find((recipe) => recipe.id === 'build_steam_macerator')!

    state = craftRecipeInstant(state, unfiredBrick, 1)
    state = craftRecipeInstant(state, bucket, 1)
    state = craftRecipeInstant(state, well, 1)
    state = craftRecipeInstant(state, boiler, 1)
    state = craftRecipeInstant(state, macerator, 1)

    expect(state.resources.unfiredBrick).toBe(2)
    expect(state.resources.bucket).toBe(0)
    expect(state.machines.well).toBe(1)
    expect(state.machines.steamBoiler).toBe(1)
    expect(state.machines.steamMacerator).toBe(1)
  })

  it('smelts unfired brick into brick in the primitive furnace', () => {
    let state = createInitialState(1000)
    state.machines.furnace = 1
    state.resources.unfiredBrick = 1
    state.resources.log = 1
    state = placeMachineInstance(state, 'furnace', 0, 0)
    const furnace = state.machineInstances[0]

    state = insertProcessSlot(state, furnace.uid, 'input', 'unfiredBrick', 1)
    state = insertProcessSlot(state, furnace.uid, 'fuel', 'log', 1)
    state = tickGame(state, 8000).state

    expect(state.machineInstances[0].process.output).toEqual({ id: 'brick', amount: 1 })
  })

  it('requires the well ring recipe to build a well', () => {
    const wellRing: CraftSlot[] = [
      { id: 'brick' },
      { id: 'brick' },
      { id: 'brick' },
      { id: 'brick' },
      { id: 'bucket' },
      { id: 'brick' },
      { id: 'brick' },
      { id: 'brick' },
      { id: 'brick' },
    ]
    const missingBucket: CraftSlot[] = [
      { id: 'brick' },
      { id: 'brick' },
      { id: 'brick' },
      { id: 'brick' },
      { id: 'brick' },
      { id: 'brick' },
      { id: 'brick' },
      { id: 'brick' },
      null,
    ]

    expect(findGridRecipe(wellRing, recipes)?.id).toBe('build_well')
    expect(findGridRecipe(missingBucket, recipes)?.id).not.toBe('build_well')
  })

  it('uses adjacent wells to supply steam boilers', () => {
    let state = createInitialState(1000)
    state.machines.well = 1
    state.machines.steamBoiler = 2
    state.resources.log = 2
    state = placeMachineInstance(state, 'well', 1, 1)
    state = placeMachineInstance(state, 'steamBoiler', 1, 0)
    state = placeMachineInstance(state, 'steamBoiler', 4, 4)
    const adjacentBoiler = state.machineInstances.find((instance) => instance.x === 1 && instance.y === 0)!
    const distantBoiler = state.machineInstances.find((instance) => instance.x === 4 && instance.y === 4)!

    expect(boilerHasWater(state, adjacentBoiler)).toBe(true)
    expect(boilerHasWater(state, distantBoiler)).toBe(false)

    state = insertProcessSlot(state, adjacentBoiler.uid, 'fuel', 'log', 1)
    state = insertProcessSlot(state, distantBoiler.uid, 'fuel', 'log', 1)
    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === adjacentBoiler.uid)!.process.steamStoredMs).toBe(1000)
    expect(state.machineInstances.find((instance) => instance.uid === distantBoiler.uid)!.process.steamStoredMs).toBe(0)
  })

  it('lets one well supply four adjacent boilers', () => {
    let state = createInitialState(1000)
    state.machines.well = 1
    state.machines.steamBoiler = 4
    state.resources.log = 4
    state = placeMachineInstance(state, 'well', 2, 2)
    state = placeMachineInstance(state, 'steamBoiler', 2, 1)
    state = placeMachineInstance(state, 'steamBoiler', 2, 3)
    state = placeMachineInstance(state, 'steamBoiler', 1, 2)
    state = placeMachineInstance(state, 'steamBoiler', 3, 2)

    for (const boiler of state.machineInstances.filter((instance) => instance.machineId === 'steamBoiler')) {
      state = insertProcessSlot(state, boiler.uid, 'fuel', 'log', 1)
    }
    state = tickGame(state, 1000).state

    expect(state.machineInstances.filter((instance) => instance.machineId === 'steamBoiler').map((instance) => instance.process.steamStoredMs)).toEqual([
      1000,
      1000,
      1000,
      1000,
    ])
  })

  it('stops a steam boiler when its steam buffer is full', () => {
    let state = createInitialState(1000)
    state.machines.well = 1
    state.machines.steamBoiler = 1
    state.resources.coal = 1
    state = placeMachineInstance(state, 'well', 0, 0)
    state = placeMachineInstance(state, 'steamBoiler', 1, 0)
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    state = insertProcessSlot(state, boiler.uid, 'fuel', 'coal', 1)
    state = tickGame(state, boilerSteamCapacityMs + 10000).state

    const process = state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process
    expect(process.steamStoredMs).toBe(boilerSteamCapacityMs)
    expect(process.fuelRemainingMs).toBeGreaterThan(0)
  })

  it('runs a steam macerator from connected boiler steam', () => {
    let state = createInitialState(1000)
    state.machines.well = 1
    state.machines.steamBoiler = 1
    state.machines.steamMacerator = 1
    state.resources.log = 1
    state.resources.ironOre = 1
    state = placeMachineInstance(state, 'well', 0, 0)
    state = placeMachineInstance(state, 'steamBoiler', 1, 0)
    state = placeMachineInstance(state, 'steamMacerator', 2, 0)
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    const macerator = state.machineInstances.find((instance) => instance.machineId === 'steamMacerator')!
    state = insertProcessSlot(state, boiler.uid, 'fuel', 'log', 1)
    state = tickGame(state, 7000).state
    state = insertProcessSlot(state, macerator.uid, 'input', 'ironOre', 1)
    state = tickGame(state, 7000).state

    const maceratorProcess = state.machineInstances.find((instance) => instance.uid === macerator.uid)!.process
    expect(maceratorProcess.output).toEqual({ id: 'crushedIronOre', amount: 2 })
  })

  it('pauses a steam macerator without connected steam and resumes when steam is available', () => {
    let state = createInitialState(1000)
    state.machines.well = 1
    state.machines.steamBoiler = 1
    state.machines.steamMacerator = 1
    state.resources.log = 1
    state.resources.copperIngot = 1
    state = placeMachineInstance(state, 'well', 0, 0)
    state = placeMachineInstance(state, 'steamBoiler', 1, 0)
    state = placeMachineInstance(state, 'steamMacerator', 2, 0)
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    const macerator = state.machineInstances.find((instance) => instance.machineId === 'steamMacerator')!
    state = insertProcessSlot(state, macerator.uid, 'input', 'copperIngot', 1)
    state = tickGame(state, 3000).state
    expect(state.machineInstances.find((instance) => instance.uid === macerator.uid)!.process.progressMs).toBe(0)

    state = insertProcessSlot(state, boiler.uid, 'fuel', 'log', 1)
    state = tickGame(state, 6000).state
    state = tickGame(state, 6000).state

    expect(state.machineInstances.find((instance) => instance.uid === macerator.uid)!.process.output).toEqual({ id: 'copperDust', amount: 1 })
  })

  it('searches terminal recipes by output and ingredient labels', () => {
    const outputMatches = searchTerminalRecipes('wooden axe').map((recipe) => recipe.id)
    const ingredientMatches = searchTerminalRecipes('plank').map((recipe) => recipe.id)

    expect(outputMatches).toContain('craft_wooden_axe')
    expect(ingredientMatches).toContain('craft_sticks')
  })

  it('groups duplicate output recipes into one recipe browser result', () => {
    const groups = groupRecipesByOutput([
      {
        id: 'test_direct_iron',
        name: 'Direct Iron',
        description: 'Synthetic direct smelt.',
        tier: 'bronze',
        durationMs: 1,
        inputs: [{ id: 'ironOre', amount: 1 }],
        outputs: [{ id: 'ironIngot', amount: 1 }],
      },
      {
        id: 'test_crushed_iron',
        name: 'Crushed Iron',
        description: 'Synthetic crushed smelt.',
        tier: 'bronze',
        durationMs: 1,
        inputs: [{ id: 'crushedIronOre', amount: 1 }],
        outputs: [{ id: 'ironIngot', amount: 2 }],
      },
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe('resource:ironIngot')
    expect(groups[0].recipes.map((recipe) => recipe.id)).toEqual(['test_direct_iron', 'test_crushed_iron'])
  })

  it('keeps ingredient search matches inside the grouped recipe output', () => {
    const matchingRecipes = searchTerminalRecipes('crushed iron', [
      {
        id: 'test_direct_iron',
        name: 'Direct Iron',
        description: 'Synthetic direct smelt.',
        tier: 'bronze',
        durationMs: 1,
        inputs: [{ id: 'ironOre', amount: 1 }],
        outputs: [{ id: 'ironIngot', amount: 1 }],
      },
      {
        id: 'test_crushed_iron',
        name: 'Crushed Iron',
        description: 'Synthetic crushed smelt.',
        tier: 'bronze',
        durationMs: 1,
        inputs: [{ id: 'crushedIronOre', amount: 1 }],
        outputs: [{ id: 'ironIngot', amount: 2 }],
      },
    ])
    const groups = groupRecipesByOutput(matchingRecipes)

    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe('resource:ironIngot')
    expect(groups[0].recipes.map((recipe) => recipe.id)).toEqual(['test_crushed_iron'])
  })

  it('exposes steam machine recipes without restoring removed machines', () => {
    expect(searchTerminalRecipes('steam').map((recipe) => recipe.id)).toEqual([
      'build_steam_boiler',
      'craft_steam_casing',
      'build_steam_macerator',
    ])
    expect(searchTerminalRecipes('dynamo').map((recipe) => recipe.id)).toEqual([])
  })

  it('finds terminal usages for an input resource', () => {
    const usages = recipesUsingInput('plank').map((recipe) => recipe.id)

    expect(usages).toContain('craft_sticks')
    expect(usages).toContain('craft_wooden_pickaxe')
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
    const stoneAxeGrid: CraftSlot[] = [
      { id: 'cobblestone' },
      { id: 'cobblestone' },
      null,
      { id: 'cobblestone' },
      { id: 'stick' },
      null,
      null,
      { id: 'stick' },
      null,
    ]
    const stonePickaxeGrid: CraftSlot[] = [
      { id: 'cobblestone' },
      { id: 'cobblestone' },
      { id: 'cobblestone' },
      null,
      { id: 'stick' },
      null,
      null,
      { id: 'stick' },
      null,
    ]
    const stoneHammerGrid: CraftSlot[] = [
      { id: 'cobblestone' },
      { id: 'cobblestone' },
      null,
      { id: 'cobblestone' },
      { id: 'cobblestone' },
      { id: 'stick' },
      { id: 'cobblestone' },
      { id: 'cobblestone' },
      null,
      null,
    ]
    const ironAxeGrid: CraftSlot[] = [
      { id: 'ironIngot' },
      { id: 'ironIngot' },
      null,
      { id: 'ironIngot' },
      { id: 'stick' },
      null,
      null,
      { id: 'stick' },
      null,
    ]
    const ironPickaxeGrid: CraftSlot[] = [
      { id: 'ironIngot' },
      { id: 'ironIngot' },
      { id: 'ironIngot' },
      null,
      { id: 'stick' },
      null,
      null,
      { id: 'stick' },
      null,
    ]
    const ironHammerGrid: CraftSlot[] = [
      { id: 'ironIngot' },
      { id: 'ironIngot' },
      null,
      { id: 'ironIngot' },
      { id: 'ironIngot' },
      { id: 'stick' },
      { id: 'ironIngot' },
      { id: 'ironIngot' },
      null,
      null,
    ]
    const stoneShovelGrid: CraftSlot[] = [null, { id: 'cobblestone' }, null, null, { id: 'stick' }, null, null, { id: 'stick' }, null]
    const woodenShovelGrid: CraftSlot[] = [null, { id: 'plank' }, null, null, { id: 'stick' }, null, null, { id: 'stick' }, null]
    const ironShovelGrid: CraftSlot[] = [null, { id: 'ironIngot' }, null, null, { id: 'stick' }, null, null, { id: 'stick' }, null]
    const ironFileGrid: CraftSlot[] = [null, { id: 'ironPlate' }, null, null, { id: 'ironPlate' }, null, null, { id: 'stick' }, null]
    const bronzeFileGrid: CraftSlot[] = [null, { id: 'bronzePlate' }, null, null, { id: 'bronzePlate' }, null, null, { id: 'stick' }, null]
    const mortarGrid: CraftSlot[] = [
      { id: 'cobblestone' },
      { id: 'flint' },
      { id: 'cobblestone' },
      null,
      { id: 'cobblestone' },
      null,
      null,
      { id: 'stick' },
      null,
    ]
    const ironMortarGrid: CraftSlot[] = [
      { id: 'ironPlate' },
      { id: 'flint' },
      { id: 'ironPlate' },
      null,
      { id: 'ironPlate' },
      null,
      null,
      { id: 'stick' },
      null,
    ]
    const bronzeMortarGrid: CraftSlot[] = [
      { id: 'bronzePlate' },
      { id: 'flint' },
      { id: 'bronzePlate' },
      null,
      { id: 'bronzePlate' },
      null,
      null,
      { id: 'stick' },
      null,
    ]
    const ironWrenchGrid: CraftSlot[] = [
      { id: 'ironIngot' },
      null,
      { id: 'ironIngot' },
      { id: 'ironIngot' },
      { id: 'ironIngot' },
      { id: 'ironIngot' },
      null,
      { id: 'ironIngot' },
      null,
    ]
    const bronzeWrenchGrid: CraftSlot[] = [
      { id: 'bronzeIngot' },
      null,
      { id: 'bronzeIngot' },
      { id: 'bronzeIngot' },
      { id: 'bronzeIngot' },
      { id: 'bronzeIngot' },
      null,
      { id: 'bronzeIngot' },
      null,
    ]

    expect(findGridRecipe(axeGrid, recipes)?.id).toBe('craft_wooden_axe')
    expect(findGridRecipe(pickaxeGrid, recipes)?.id).toBe('craft_wooden_pickaxe')
    expect(findGridRecipe(stoneAxeGrid, recipes)?.id).toBe('craft_stone_axe')
    expect(findGridRecipe(stonePickaxeGrid, recipes)?.id).toBe('craft_stone_pickaxe')
    expect(findGridRecipe(stoneShovelGrid, recipes)?.id).toBe('craft_stone_shovel')
    expect(findGridRecipe(woodenShovelGrid, recipes)?.id).toBe('craft_wooden_shovel')
    expect(findGridRecipe(ironShovelGrid, recipes)?.id).toBe('craft_iron_shovel')
    expect(findGridRecipe(stoneHammerGrid, recipes)?.id).toBe('craft_stone_hammer')
    expect(findGridRecipe(ironAxeGrid, recipes)?.id).toBe('craft_iron_axe')
    expect(findGridRecipe(ironPickaxeGrid, recipes)?.id).toBe('craft_iron_pickaxe')
    expect(findGridRecipe(ironHammerGrid, recipes)?.id).toBe('craft_iron_hammer')
    expect(findGridRecipe(ironFileGrid, recipes)?.id).toBe('craft_iron_file')
    expect(findGridRecipe(bronzeFileGrid, recipes)?.id).toBe('craft_bronze_file')
    expect(findGridRecipe(mortarGrid, recipes)?.id).toBe('craft_mortar')
    expect(findGridRecipe(ironMortarGrid, recipes)?.id).toBe('craft_iron_mortar')
    expect(findGridRecipe(bronzeMortarGrid, recipes)?.id).toBe('craft_bronze_mortar')
    expect(findGridRecipe(ironWrenchGrid, recipes)?.id).toBe('craft_iron_wrench')
    expect(findGridRecipe(bronzeWrenchGrid, recipes)?.id).toBe('craft_bronze_wrench')
  })

  it('mixes three copper dust and one tin dust into four bronze dust', () => {
    let state = createInitialState(1000)
    state.resources.copperDust = 3
    state.resources.tinDust = 1
    const grid: CraftSlot[] = [
      { id: 'copperDust' },
      { id: 'copperDust' },
      { id: 'copperDust' },
      { id: 'tinDust' },
      null,
      null,
      null,
      null,
      null,
    ]
    const match = findGridRecipe(grid, recipes)!

    state = craftRecipeInstant(state, match, 1)

    expect(match.id).toBe('bronze_blend')
    expect(state.resources.copperDust).toBe(0)
    expect(state.resources.tinDust).toBe(0)
    expect(state.resources.bronzeBlend).toBe(4)
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
    state.resources.cobblestone = 16
    const furnace = recipes.find((recipe) => recipe.id === 'build_furnace')!

    state = craftRecipeInstant(state, furnace, 2)

    expect(state.resources.cobblestone).toBe(0)
    expect(state.machines.furnace).toBe(2)
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
