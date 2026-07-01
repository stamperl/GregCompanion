import { describe, expect, it } from 'vitest'
import { createInitialState, fuelDefinitions, processRecipes, quests, recipes } from './content'
import { groupRecipesByOutput } from './recipeGroups'
import {
  availableResourceAmount,
  availableUnplacedMachineCount,
  boilerHasWater,
  boilerSteamCapacityMs,
  canExpandFactoryFloor,
  cokeOvenFluidCapacityLitres,
  canCraft,
  canWrenchRemoveMachine,
  claimQuestReward,
  collectProcessOutput,
  createCreativeState,
  craftableQuantity,
  craftRecipeInstant,
  durabilityRemaining,
  equipResource,
  equippedResourceCounts,
  expandFactoryFloor,
  factoryFoundationCost,
  factoryGridForState,
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
  questObjectiveProgress,
  questProgress,
  questStatus,
  recipeFitsTerminalGrid,
  recipesUsingInput,
  removeMachineInstance,
  removeProcessSlot,
  searchTerminalRecipes,
  steamMaceratorCapacityMs,
  steamTankCapacityMs,
  terminalAvailableAmount,
  tickGame,
  unequipSlot,
  visibleQuests,
  visibleRecipes,
  wrenchRemoveMachineInstance,
} from './engine'
import type { CraftSlot, Recipe } from './types'

describe('game engine', () => {
  function createFactoryState(now = 1000, level = 2) {
    const state = createInitialState(now)
    state.factoryFoundationLevel = level
    return state
  }

  it('starts with no factory floor until foundations are built', () => {
    const state = createInitialState(1000)
    state.machines.furnace = 1

    expect(state.factoryFoundationLevel).toBe(0)
    expect(factoryGridForState(state)).toEqual({ width: 0, height: 0 })
    expect(placeMachineInstance(state, 'furnace', 0, 0)).toBe(state)
  })

  it('builds the first 5x5 factory foundation from basic materials', () => {
    let state = createInitialState(1000)
    state.resources.plank = 16
    state.resources.cobblestone = 24

    expect(factoryFoundationCost(state)).toEqual([
      { id: 'plank', amount: 16 },
      { id: 'cobblestone', amount: 24 },
    ])
    expect(canExpandFactoryFloor(state)).toBe(true)

    state = expandFactoryFloor(state)

    expect(state.factoryFoundationLevel).toBe(1)
    expect(factoryGridForState(state)).toEqual({ width: 5, height: 5 })
    expect(state.resources.plank).toBe(0)
    expect(state.resources.cobblestone).toBe(0)

    state.machines.furnace = 1
    state = placeMachineInstance(state, 'furnace', 4, 4)
    expect(state.machineInstances).toHaveLength(1)
    expect(placeMachineInstance(state, 'furnace', 5, 0)).toBe(state)
  })

  it('expands the factory floor through capped progression sizes', () => {
    let state = createFactoryState(1000, 1)
    state.resources.cobblestone = 640
    state.resources.brick = 320
    state.resources.ironPlate = 72
    state.resources.steelPlate = 8

    state = expandFactoryFloor(state)
    expect(state.factoryFoundationLevel).toBe(2)
    expect(factoryGridForState(state)).toEqual({ width: 8, height: 6 })

    state = expandFactoryFloor(state)
    expect(factoryGridForState(state)).toEqual({ width: 10, height: 8 })

    state = expandFactoryFloor(state)
    expect(factoryGridForState(state)).toEqual({ width: 12, height: 10 })

    state = expandFactoryFloor(state)
    expect(factoryGridForState(state)).toEqual({ width: 14, height: 12 })
    expect(factoryFoundationCost(state)).toEqual([])
    expect(expandFactoryFloor(state)).toBe(state)
  })

  it('takes multiple bare-hand damage actions before a tree drops a log', () => {
    let state = createFactoryState(1000)

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
    let state = createFactoryState(1000)
    for (let hit = 0; hit < 12; hit += 1) {
      state = hitGatherTarget(state, 'tree').state
    }

    expect(state.resources.log).toBe(1)
    expect(state.gatherProgress.tree).toBe(0)
  })

  it('crafts planks, sticks, and early tools with the right ratios', () => {
    let state = createFactoryState(1000)
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
    let state = createFactoryState(1000)
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
    let state = createFactoryState(1000)
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
    let state = createFactoryState(1000)
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

  it('auto-completes ready guide quests and leaves rewards unclaimed', () => {
    let state = createFactoryState(1000)
    state.resources.log = 1

    const quest = quests.find((candidate) => candidate.id === 'punchTree')!
    const nextQuest = quests.find((candidate) => candidate.id === 'craftPlanks')!
    expect(questStatus(state, quest)).toBe('ready')
    expect(questStatus(state, nextQuest)).toBe('locked')

    const result = tickGame(state, 250)
    state = result.state
    expect(result.questCompletions).toEqual(['punchTree'])
    expect(state.completedQuests).toContain('punchTree')
    expect(state.claimedQuests).not.toContain('punchTree')
    expect(questStatus(state, nextQuest)).toBe('available')
    expect(state.resources.plank).toBe(0)

    state = claimQuestReward(state, 'punchTree')
    expect(state.claimedQuests).toContain('punchTree')
  })

  it('shows locked quest book branches and tracks objective progress', () => {
    const state = createFactoryState(1000)
    const furnaceQuest = quests.find((candidate) => candidate.id === 'buildFurnace')!

    expect(visibleQuests(state)).toContain(furnaceQuest)
    expect(questStatus(state, furnaceQuest)).toBe('locked')
    expect(questProgress(state, furnaceQuest)).toBe(0)
  })

  it('tracks factory foundation and placed machine quest objectives', () => {
    let state = createFactoryState(1000, 1)
    const foundationQuest = quests.find((candidate) => candidate.id === 'buildFoundation')!
    const steamQuest = quests.find((candidate) => candidate.id === 'makeSteam')!
    const foundationObjective = foundationQuest.objectives![0]
    const placedObjective = steamQuest.objectives!.find((objective) => objective.type === 'placedMachine')!

    expect(questObjectiveProgress(state, foundationObjective).complete).toBe(true)
    expect(questObjectiveProgress(state, placedObjective).complete).toBe(false)

    state.machines.steamBoiler = 1
    state = placeMachineInstance(state, 'steamBoiler', 0, 0)
    expect(questObjectiveProgress(state, placedObjective).complete).toBe(true)
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

  it('keeps restored firebrick state during save migration', () => {
    const state = loadGame(
      JSON.stringify({
        resources: { firebrick: 8, log: 1 },
        craftedResources: ['firebrick', 'log'],
        durability: { firebrick: 3 },
      }),
      1000,
    )

    expect(state.resources.firebrick).toBe(8)
    expect(state.resources.log).toBe(1)
    expect(state.craftedResources).toContain('firebrick')
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
    expect(Object.keys(state.machines)).toEqual([
      'furnace',
      'well',
      'steamBoiler',
      'steamTank',
      'copperPipe',
      'bronzePipe',
      'ironPipe',
      'steamMacerator',
      'steamForgeHammer',
      'steamCompressor',
      'steamExtractor',
      'steamAlloySmelter',
      'steamFurnace',
      'cokeOven',
      'brickedBlastFurnacePart',
      'brickedBlastFurnace',
    ])
    expect(state.machines.well).toBe(0)
    expect(state.machines.steamBoiler).toBe(3)
    expect(state.machines.steamTank).toBe(0)
    expect(state.machines.copperPipe).toBe(0)
    expect(state.machines.bronzePipe).toBe(0)
    expect(state.machines.ironPipe).toBe(0)
    expect(state.machines.steamMacerator).toBe(0)
    expect(state.machines.cokeOven).toBe(0)
    expect(state.machines.brickedBlastFurnace).toBe(0)
    expect(state.factoryFoundationLevel).toBe(2)
    expect(factoryGridForState(state)).toEqual({ width: 8, height: 6 })
    expect(state.machineInstances).toHaveLength(2)
    expect(state.machineInstances[0]).toMatchObject({ machineId: 'furnace', x: 0, y: 0, level: 1 })
    expect(state.machineInstances[1]).toMatchObject({ machineId: 'steamBoiler', x: 1, y: 0, level: 1 })
  })

  it('migrates old machine process states with an empty secondary input slot', () => {
    const state = loadGame(
      JSON.stringify({
        factoryFoundationLevel: 2,
        machines: { steamAlloySmelter: 1 },
        machineInstances: [
          {
            uid: 'old-alloy',
            machineId: 'steamAlloySmelter',
            x: 0,
            y: 0,
            level: 1,
            process: { input: { id: 'copperDust', amount: 2 }, output: null },
          },
        ],
      }),
      1000,
    )

    expect(state.machineInstances[0].process.input).toEqual({ id: 'copperDust', amount: 2 })
    expect(state.machineInstances[0].process.secondaryInput).toBeNull()
  })

  it('migrates old empty saves to locked factory and clamps saved factory foundation levels', () => {
    expect(loadGame(JSON.stringify({ resources: { log: 1 } }), 1000).factoryFoundationLevel).toBe(0)
    expect(loadGame(JSON.stringify({ factoryFoundationLevel: -4 }), 1000).factoryFoundationLevel).toBe(0)
    expect(loadGame(JSON.stringify({ factoryFoundationLevel: 99 }), 1000).factoryFoundationLevel).toBe(5)
  })

  it('creates a temporary creative state with 32 of every resource and placeable machine', () => {
    const state = createCreativeState(createInitialState(1000), 2000)

    expect(Object.values(state.resources).every((amount) => amount >= 32)).toBe(true)
    expect(Object.entries(state.machines).every(([id, amount]) => id === 'brickedBlastFurnace' || amount >= 32)).toBe(true)
    expect(state.machines.brickedBlastFurnace).toBe(0)
    expect(state.machines.brickedBlastFurnacePart).toBe(32)
    expect(state.factoryFoundationLevel).toBe(5)
    expect(state.craftedResources).toEqual(Object.keys(state.resources))
    expect(state.lastSavedAt).toBe(2000)
  })

  it('does not reduce existing stacks when creating creative state', () => {
    const base = createInitialState(1000)
    base.resources.log = 80
    base.machines.furnace = 40

    const state = createCreativeState(base, 2000)

    expect(state.resources.log).toBe(80)
    expect(state.machines.furnace).toBe(40)
    expect(state.resources.ironOre).toBe(32)
    expect(state.machines.steamMacerator).toBe(32)
  })

  it('reserves equipped items from terminal storage and crafting', () => {
    let state = createFactoryState(1000)
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
    let state = createFactoryState(1000)
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
    let state = createFactoryState(1000)

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

  it('lets a fresh wooden pickaxe mine four cobblestone before breaking', () => {
    let state = createFactoryState(1000)
    state.resources.woodenPickaxe = 1
    state = equipResource(state, 'pickaxe', 'woodenPickaxe')

    let result = hitGatherTarget(state, 'stone')
    for (let hit = 1; hit < 48; hit += 1) {
      state = result.state
      result = hitGatherTarget(state, 'stone')
    }

    expect(result.completed).toBe(true)
    expect(result.toolBroke).toBe('woodenPickaxe')
    expect(result.state.resources.cobblestone).toBe(4)
    expect(result.state.resources.woodenPickaxe).toBe(0)
    expect(result.state.equipment.pickaxe).toBeNull()
  })

  it('requires stone for iron and iron for copper tin and coal', () => {
    let state = createFactoryState(1000)

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

  it('requires wooden or better shovels for gravel and wears tools only on successful damage', () => {
    let state = createFactoryState(1000)
    state.resources.woodenAxe = 1
    state = equipResource(state, 'axe', 'woodenAxe')

    let result = hitGatherTarget(state, 'gravelPatch')
    expect(result.state.gatherProgress.gravelPatch).toBeUndefined()
    expect(durabilityRemaining(result.state, 'woodenAxe')).toBe(32)

    state.resources.woodenShovel = 1
    state = equipResource(state, 'shovel', 'woodenShovel')
    result = hitGatherTarget(state, 'gravelPatch')
    expect(result.state.gatherProgress.gravelPatch).toBe(2)
    expect(durabilityRemaining(result.state, 'woodenShovel')).toBe(31)

    state = unequipSlot(result.state, 'shovel')
    state.resources.ironShovel = 1
    state = equipResource(state, 'shovel', 'ironShovel')
    result = hitGatherTarget(state, 'gravelPatch')
    expect(result.state.gatherProgress.gravelPatch).toBe(9)
    expect(durabilityRemaining(result.state, 'ironShovel')).toBe(127)
  })

  it('destroys a gathering tool when its pooled durability reaches zero', () => {
    let state = createFactoryState(1000)
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
    let state = createFactoryState(1000)
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
    let state = createFactoryState(1000)
    state.machines.furnace = 1

    expect(availableUnplacedMachineCount(state, 'furnace')).toBe(1)
    state = placeMachineInstance(state, 'furnace', 0, 0)

    expect(state.machineInstances).toHaveLength(1)
    expect(availableUnplacedMachineCount(state, 'furnace')).toBe(0)
    expect(placeMachineInstance(state, 'furnace', 0, 0)).toBe(state)
    expect(placeMachineInstance(state, 'furnace', 1, 0)).toBe(state)
  })

  it('removes placed machines back into unplaced factory inventory and returns slotted items', () => {
    let state = createFactoryState(1000)
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

  it('requires wrench durability to remove placed machines in factory remove mode', () => {
    let state = createFactoryState(1000)
    state.machines.furnace = 1
    state = placeMachineInstance(state, 'furnace', 0, 0)
    const furnace = state.machineInstances[0]

    expect(canWrenchRemoveMachine(state)).toBe(false)
    expect(wrenchRemoveMachineInstance(state, furnace.uid)).toBe(state)

    state.resources.ironWrench = 1
    state = wrenchRemoveMachineInstance(state, furnace.uid)

    expect(state.machineInstances).toEqual([])
    expect(availableUnplacedMachineCount(state, 'furnace')).toBe(1)
    expect(durabilityRemaining(state, 'ironWrench')).toBe(127)
  })

  it('spends bronze wrench durability before iron when removing machines', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 1
    state.resources.ironWrench = 1
    state.resources.bronzeWrench = 1
    state = placeMachineInstance(state, 'steamTank', 0, 0)
    const tank = state.machineInstances[0]

    state = wrenchRemoveMachineInstance(state, tank.uid)

    expect(state.machineInstances).toEqual([])
    expect(durabilityRemaining(state, 'bronzeWrench')).toBe(191)
    expect(durabilityRemaining(state, 'ironWrench')).toBe(128)
  })

  it('loses internal steam buffer when a machine is removed and placed again', () => {
    let state = createFactoryState(1000)
    state.machines.well = 1
    state.machines.steamBoiler = 1
    state.machines.steamMacerator = 1
    state.resources.coal = 1
    state = placeMachineInstance(state, 'well', 0, 0)
    state = placeMachineInstance(state, 'steamBoiler', 1, 0)
    state = placeMachineInstance(state, 'steamMacerator', 2, 0)
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    const macerator = state.machineInstances.find((instance) => instance.machineId === 'steamMacerator')!

    state = insertProcessSlot(state, boiler.uid, 'fuel', 'coal', 1)
    state = tickGame(state, 32000).state
    expect(state.machineInstances.find((instance) => instance.uid === macerator.uid)!.process.steamStoredMs).toBe(32000)

    state = removeMachineInstance(state, macerator.uid)
    state = placeMachineInstance(state, 'steamMacerator', 2, 0)

    const replacedMacerator = state.machineInstances.find((instance) => instance.machineId === 'steamMacerator')!
    expect(replacedMacerator.process.steamStoredMs).toBe(0)
  })

  it('smelts ore in multiple furnace instances independently', () => {
    let state = createFactoryState(1000)
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
    let state = createFactoryState(1000)
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
    let state = createFactoryState(1000)
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
    let state = createFactoryState(1000)
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
    let state = createFactoryState(1000)

    let result = hitGatherTarget(state, 'clayPatch')
    expect(result.state.gatherProgress.clayPatch).toBeUndefined()

    state.resources.stoneShovel = 1
    state = equipResource(state, 'shovel', 'stoneShovel')
    result = hitGatherTarget(state, 'clayPatch')

    expect(result.state.gatherProgress.clayPatch).toBe(5)
    expect(durabilityRemaining(result.state, 'stoneShovel')).toBe(63)
  })

  it('supports wooden and iron shovels for clay digging', () => {
    let state = createFactoryState(1000)
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

  it('gathers sand from the lake with a wooden shovel', () => {
    let state = createFactoryState(1000)

    let result = hitGatherTarget(state, 'sandPatch')
    expect(result.state.gatherProgress.sandPatch).toBeUndefined()

    state.resources.woodenShovel = 1
    state = equipResource(state, 'shovel', 'woodenShovel')
    result = hitGatherTarget(state, 'sandPatch')

    expect(result.state.gatherProgress.sandPatch).toBe(3)
    expect(durabilityRemaining(result.state, 'woodenShovel')).toBe(31)
  })

  it('requires a hammer catalyst to make early metal plates', () => {
    let state = createFactoryState(1000)
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
    let state = createFactoryState(1000)
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
    let state = createFactoryState(1000)
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
    let state = createFactoryState(1000)
    state.resources.bronzePlate = 2
    state.resources.stick = 1
    const bronzeFile = recipes.find((recipe) => recipe.id === 'craft_bronze_file')!

    state = craftRecipeInstant(state, bronzeFile, 1)

    expect(state.resources.bronzeFile).toBe(1)
    expect(maxDurability('bronzeFile')).toBeGreaterThan(maxDurability('ironFile'))
    expect(durabilityRemaining(state, 'bronzeFile')).toBe(160)
  })

  it('crafts iron wire cutters from plates and rods using a file', () => {
    let state = createFactoryState(1000)
    state.resources.ironPlate = 2
    state.resources.ironRod = 2
    state.resources.ironFile = 1
    const cutters = recipes.find((recipe) => recipe.id === 'craft_iron_wire_cutters')!

    state = craftRecipeInstant(state, cutters, 1)

    expect(state.resources.ironPlate).toBe(0)
    expect(state.resources.ironRod).toBe(0)
    expect(state.resources.ironFile).toBe(1)
    expect(state.resources.ironWireCutters).toBe(1)
    expect(durabilityRemaining(state, 'ironFile')).toBe(95)
    expect(durabilityRemaining(state, 'ironWireCutters')).toBe(128)
  })

  it('cuts copper wire from copper plates with wire cutters', () => {
    let state = createFactoryState(1000)
    state.resources.copperPlate = 1
    state.resources.copperRod = 1
    state.resources.ironFile = 1
    state.resources.ironWireCutters = 1
    const copperWire = recipes.find((recipe) => recipe.id === 'cut_copper_wire')!
    const oldRodGrid: CraftSlot[] = [null, { id: 'ironFile' }, null, null, { id: 'copperRod' }, null, null, null, null]

    state = craftRecipeInstant(state, copperWire, 1)

    expect(state.resources.copperPlate).toBe(0)
    expect(state.resources.copperRod).toBe(1)
    expect(state.resources.copperWire).toBe(2)
    expect(durabilityRemaining(state, 'ironWireCutters')).toBe(127)
    expect(findGridRecipe(oldRodGrid, recipes)?.id).not.toBe('cut_copper_wire')
  })

  it('hammers red alloy plates and cuts them into red alloy wire', () => {
    let state = createFactoryState(1000)
    state.resources.redAlloyIngot = 2
    state.resources.ironHammer = 1
    state.resources.ironWireCutters = 1
    const plate = recipes.find((recipe) => recipe.id === 'red_alloy_plate')!
    const wire = recipes.find((recipe) => recipe.id === 'cut_red_alloy_wire')!

    state = craftRecipeInstant(state, plate, 1)
    state = craftRecipeInstant(state, wire, 1)

    expect(state.resources.redAlloyIngot).toBe(0)
    expect(state.resources.redAlloyPlate).toBe(0)
    expect(state.resources.redAlloyWire).toBe(2)
    expect(durabilityRemaining(state, 'ironHammer')).toBe(159)
    expect(durabilityRemaining(state, 'ironWireCutters')).toBe(127)
  })

  it('uses upgraded mortars for grinding and spends the upgraded durability first', () => {
    let state = createFactoryState(1000)
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
    let state = createFactoryState(1000)
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
    let state = createFactoryState(1000)
    state.resources.copperIngot = 1
    state.resources.ironFile = 1
    const copperRod = recipes.find((recipe) => recipe.id === 'file_copper_rod')!

    state = craftRecipeInstant(state, copperRod, 1)

    expect(state.resources.copperIngot).toBe(0)
    expect(state.resources.copperRod).toBe(1)
  })

  it('grinds crushed ore into dust one-to-one with a pestle and mortar', () => {
    let state = createFactoryState(1000)
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

    let state = createFactoryState(1000)
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
    let state = createFactoryState(1000)
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
    let state = createFactoryState(1000)
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
    let state = createFactoryState(1000)
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

  it('crafts bricks, bucket, well, steam machines, tanks, and pipes with shaped recipes', () => {
    let state = createFactoryState(1000)
    state.resources.clay = 1
    state.resources.unfiredBrick = 1
    state.resources.ironPlate = 16
    state.resources.brick = 8
    state.resources.bronzePlate = 14
    state.resources.bronzeRod = 5
    state.resources.copperPlate = 2
    state.resources.copperRod = 3
    state.resources.ironRod = 1
    state.resources.steamCasing = 2
    state.resources.bronzeMortar = 1
    const unfiredBrick = recipes.find((recipe) => recipe.id === 'craft_unfired_brick')!
    const bucket = recipes.find((recipe) => recipe.id === 'craft_bucket')!
    const well = recipes.find((recipe) => recipe.id === 'build_well')!
    const boiler = recipes.find((recipe) => recipe.id === 'build_steam_boiler')!
    const tank = recipes.find((recipe) => recipe.id === 'build_steam_tank')!
    const copperPipe = recipes.find((recipe) => recipe.id === 'build_copper_pipe')!
    const bronzePipe = recipes.find((recipe) => recipe.id === 'build_bronze_pipe')!
    const ironPipe = recipes.find((recipe) => recipe.id === 'build_iron_pipe')!
    const macerator = recipes.find((recipe) => recipe.id === 'build_steam_macerator')!

    state = craftRecipeInstant(state, unfiredBrick, 1)
    state = craftRecipeInstant(state, bucket, 2)
    state = craftRecipeInstant(state, well, 1)
    state = craftRecipeInstant(state, boiler, 1)
    state = craftRecipeInstant(state, tank, 1)
    state = craftRecipeInstant(state, copperPipe, 1)
    state = craftRecipeInstant(state, bronzePipe, 1)
    state = craftRecipeInstant(state, ironPipe, 1)
    state = craftRecipeInstant(state, macerator, 1)

    expect(state.resources.unfiredBrick).toBe(2)
    expect(state.resources.bucket).toBe(0)
    expect(state.machines.well).toBe(1)
    expect(state.machines.steamBoiler).toBe(1)
    expect(state.machines.steamTank).toBe(1)
    expect(state.machines.copperPipe).toBe(4)
    expect(state.machines.bronzePipe).toBe(4)
    expect(state.machines.ironPipe).toBe(4)
    expect(state.machines.steamMacerator).toBe(1)
  })

  it('crafts BBF casing items and assembles them into factory multiblock parts', () => {
    let state = createFactoryState(1000)
    state.resources.firebrick = 4
    state.resources.ironPlate = 1
    state.resources.bronzeWrench = 1
    const casing = recipes.find((recipe) => recipe.id === 'craft_bbf_casing')!

    expect(recipeFitsTerminalGrid(casing)).toBe(true)
    expect(canCraft(state, casing)).toBe(true)

    state = craftRecipeInstant(state, casing, 1)

    expect(state.resources.firebrick).toBe(0)
    expect(state.resources.ironPlate).toBe(0)
    expect(state.resources.bronzeWrench).toBe(1)
    expect(state.resources.bbfCasing).toBe(1)
    expect(durabilityRemaining(state, 'bronzeWrench')).toBe(191)

    state.resources.bbfCasing = 4
    const blastFurnace = recipes.find((recipe) => recipe.id === 'build_bricked_blast_furnace')!
    expect(blastFurnace.recipeType).toBe('machine')
    expect(recipeFitsTerminalGrid(blastFurnace)).toBe(false)
    expect(canCraft(state, blastFurnace)).toBe(true)

    state = craftRecipeInstant(state, blastFurnace, 1)

    expect(state.resources.bbfCasing).toBe(0)
    expect(state.machines.brickedBlastFurnacePart).toBe(4)
    expect(state.machines.brickedBlastFurnace).toBe(0)
  })

  it('forms and disassembles a bricked blast furnace 2x2 multiblock', () => {
    let state = createFactoryState(1000)
    state.machines.brickedBlastFurnacePart = 4

    for (let y = 0; y < 2; y += 1) {
      for (let x = 0; x < 2; x += 1) {
        state = placeMachineInstance(state, 'brickedBlastFurnacePart', x, y)
      }
    }

    expect(state.machineInstances).toHaveLength(4)
    expect(state.machineInstances.find((instance) => instance.x === 0 && instance.y === 0)?.machineId).toBe('brickedBlastFurnace')
    expect(state.machineInstances.filter((instance) => instance.machineId === 'brickedBlastFurnacePart')).toHaveLength(3)
    expect(state.machines.brickedBlastFurnacePart).toBe(3)
    expect(state.machines.brickedBlastFurnace).toBe(1)
    expect(availableUnplacedMachineCount(state, 'brickedBlastFurnacePart')).toBe(0)
    expect(availableUnplacedMachineCount(state, 'brickedBlastFurnace')).toBe(0)

    state.resources.bronzeWrench = 1
    const controller = state.machineInstances.find((instance) => instance.machineId === 'brickedBlastFurnace')!
    state = wrenchRemoveMachineInstance(state, controller.uid)

    expect(state.machineInstances).toHaveLength(0)
    expect(state.machines.brickedBlastFurnacePart).toBe(4)
    expect(state.machines.brickedBlastFurnace).toBe(0)
    expect(availableUnplacedMachineCount(state, 'brickedBlastFurnacePart')).toBe(4)
    expect(durabilityRemaining(state, 'bronzeWrench')).toBe(191)
  })

  it('smelts unfired brick into brick in the primitive furnace', () => {
    let state = createFactoryState(1000)
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
    let state = createFactoryState(1000)
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
    let state = createFactoryState(1000)
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

  it('uses a 128L steam boiler buffer', () => {
    expect(boilerSteamCapacityMs).toBe(128000)
  })

  it('burns current boiler fuel out when full but does not consume another fuel item', () => {
    let state = createFactoryState(1000)
    state.machines.well = 1
    state.machines.steamBoiler = 1
    state.resources.coal = 2
    state = placeMachineInstance(state, 'well', 0, 0)
    state = placeMachineInstance(state, 'steamBoiler', 1, 0)
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    state = insertProcessSlot(state, boiler.uid, 'fuel', 'coal', 2)
    state = tickGame(state, 80000).state

    let process = state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process
    expect(process.steamStoredMs).toBe(80000)
    expect(process.fuelRemainingMs).toBe(0)
    expect(process.fuel?.amount).toBe(1)

    state = tickGame(state, 48000).state
    process = state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process
    expect(process.steamStoredMs).toBe(128000)
    expect(process.fuelRemainingMs).toBe(32000)
    expect(process.fuel).toBeNull()

    state = tickGame(state, 32000).state
    process = state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process
    expect(process.steamStoredMs).toBe(128000)
    expect(process.fuelRemainingMs).toBe(0)
    expect(process.fuel).toBeNull()
  })

  it('does not ignite boiler fuel without adjacent well water', () => {
    let state = createFactoryState(1000)
    state.machines.steamBoiler = 1
    state.resources.coal = 1
    state = placeMachineInstance(state, 'steamBoiler', 1, 0)
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    state = insertProcessSlot(state, boiler.uid, 'fuel', 'coal', 1)
    state = tickGame(state, 1000).state

    const process = state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process
    expect(process.steamStoredMs).toBe(0)
    expect(process.fuelRemainingMs).toBe(0)
    expect(process.fuel).toEqual({ id: 'coal', amount: 1 })
  })

  it('fills a steam macerator internal buffer from connected boiler steam', () => {
    let state = createFactoryState(1000)
    state.machines.well = 1
    state.machines.steamBoiler = 1
    state.machines.steamMacerator = 1
    state.resources.coal = 1
    state = placeMachineInstance(state, 'well', 0, 0)
    state = placeMachineInstance(state, 'steamBoiler', 1, 0)
    state = placeMachineInstance(state, 'steamMacerator', 2, 0)
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    const macerator = state.machineInstances.find((instance) => instance.machineId === 'steamMacerator')!
    state = insertProcessSlot(state, boiler.uid, 'fuel', 'coal', 1)
    state = tickGame(state, 32000).state

    const maceratorProcess = state.machineInstances.find((instance) => instance.uid === macerator.uid)!.process
    const boilerProcess = state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process
    expect(maceratorProcess.steamCapacityMs).toBe(steamMaceratorCapacityMs)
    expect(maceratorProcess.steamStoredMs).toBe(32000)
    expect(boilerProcess.steamStoredMs).toBe(0)
  })

  it('fills an iron steam tank from a connected boiler through copper pipes at pipe speed', () => {
    let state = createFactoryState(1000)
    state.machines.well = 1
    state.machines.steamBoiler = 1
    state.machines.copperPipe = 1
    state.machines.steamTank = 1
    state = placeMachineInstance(state, 'well', 0, 0)
    state = placeMachineInstance(state, 'steamBoiler', 1, 0)
    state = placeMachineInstance(state, 'copperPipe', 2, 0)
    state = placeMachineInstance(state, 'steamTank', 3, 0)
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    boiler.process.steamStoredMs = 80000

    state = tickGame(state, 10000).state

    const tankProcess = state.machineInstances.find((instance) => instance.uid === tank.uid)!.process
    const boilerProcess = state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process
    expect(tankProcess.steamCapacityMs).toBe(steamTankCapacityMs)
    expect(tankProcess.steamStoredMs).toBe(40000)
    expect(boilerProcess.steamStoredMs).toBe(40000)
  })

  it('fills an iron steam tank directly from an adjacent boiler', () => {
    let state = createFactoryState(1000)
    state.machines.steamBoiler = 1
    state.machines.steamTank = 1
    state = placeMachineInstance(state, 'steamBoiler', 0, 0)
    state = placeMachineInstance(state, 'steamTank', 1, 0)
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    boiler.process.steamStoredMs = 20000

    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === tank.uid)!.process.steamStoredMs).toBe(16000)
    expect(state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process.steamStoredMs).toBe(4000)
  })

  it('does not fill an iron steam tank through a steam macerator', () => {
    let state = createFactoryState(1000)
    state.machines.steamBoiler = 1
    state.machines.steamMacerator = 1
    state.machines.steamTank = 1
    state = placeMachineInstance(state, 'steamBoiler', 0, 0)
    state = placeMachineInstance(state, 'steamMacerator', 1, 0)
    state = placeMachineInstance(state, 'steamTank', 2, 0)
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    const macerator = state.machineInstances.find((instance) => instance.machineId === 'steamMacerator')!
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    boiler.process.steamStoredMs = 80000

    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === tank.uid)!.process.steamStoredMs).toBe(0)
    expect(state.machineInstances.find((instance) => instance.uid === macerator.uid)!.process.steamStoredMs).toBe(16000)
    expect(state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process.steamStoredMs).toBe(64000)
  })

  it('cokes logs into charcoal and creosote, then transfers creosote into an adjacent tank', () => {
    let state = createFactoryState(1000)
    state.machines.cokeOven = 1
    state.machines.steamTank = 1
    state.resources.log = 1
    state = placeMachineInstance(state, 'cokeOven', 0, 0)
    state = placeMachineInstance(state, 'steamTank', 1, 0)
    const cokeOven = state.machineInstances.find((instance) => instance.machineId === 'cokeOven')!
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    state = insertProcessSlot(state, cokeOven.uid, 'input', 'log', 1)

    state = tickGame(state, 45000).state
    state = tickGame(state, 1000).state

    const ovenProcess = state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!.process
    const tankProcess = state.machineInstances.find((instance) => instance.uid === tank.uid)!.process
    expect(ovenProcess.output).toEqual({ id: 'charcoal', amount: 1 })
    expect(ovenProcess.fluids.creosote ?? 0).toBe(0)
    expect(tankProcess.fluids.creosote).toBe(16)
  })

  it('stops a coke oven when its creosote buffer is full', () => {
    let state = createFactoryState(1000)
    state.machines.cokeOven = 1
    state.resources.log = 1
    state = placeMachineInstance(state, 'cokeOven', 0, 0)
    const cokeOven = state.machineInstances.find((instance) => instance.machineId === 'cokeOven')!
    cokeOven.process.fluids.creosote = cokeOvenFluidCapacityLitres
    cokeOven.process.fluidCapacityLitres = cokeOvenFluidCapacityLitres
    state = insertProcessSlot(state, cokeOven.uid, 'input', 'log', 1)

    state = tickGame(state, 45000).state

    const process = state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!.process
    expect(process.input).toEqual({ id: 'log', amount: 1 })
    expect(process.output).toBeNull()
    expect(process.fluids.creosote).toBe(cokeOvenFluidCapacityLitres)
  })

  it('moves steam from tank to macerator through faster iron pipes', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 1
    state.machines.ironPipe = 1
    state.machines.steamMacerator = 1
    state = placeMachineInstance(state, 'steamTank', 0, 0)
    state = placeMachineInstance(state, 'ironPipe', 1, 0)
    state = placeMachineInstance(state, 'steamMacerator', 2, 0)
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    const macerator = state.machineInstances.find((instance) => instance.machineId === 'steamMacerator')!
    tank.process.steamStoredMs = 64000

    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === macerator.uid)!.process.steamStoredMs).toBe(16000)
    expect(state.machineInstances.find((instance) => instance.uid === tank.uid)!.process.steamStoredMs).toBe(48000)
  })

  it('runs a steam forge hammer from connected boiler steam', () => {
    let state = createFactoryState(1000)
    state.machines.steamBoiler = 1
    state.machines.steamForgeHammer = 1
    state.resources.ironIngot = 2
    state = placeMachineInstance(state, 'steamBoiler', 0, 0)
    state = placeMachineInstance(state, 'steamForgeHammer', 1, 0)
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    const hammer = state.machineInstances.find((instance) => instance.machineId === 'steamForgeHammer')!
    boiler.process.steamStoredMs = 64000
    state = insertProcessSlot(state, hammer.uid, 'input', 'ironIngot', 2)

    state = tickGame(state, 5000).state

    const hammerProcess = state.machineInstances.find((instance) => instance.uid === hammer.uid)!.process
    expect(hammerProcess.output).toEqual({ id: 'ironPlate', amount: 1 })
    expect(hammerProcess.steamStoredMs).toBeLessThan(32000)
  })

  it('blasts one steel ingot from one iron ingot and coal coke', () => {
    let state = createFactoryState(1000)
    state.machines.brickedBlastFurnace = 1
    state.resources.ironIngot = 1
    state.resources.coalCoke = 1
    state = placeMachineInstance(state, 'brickedBlastFurnace', 0, 0)
    const blastFurnace = state.machineInstances.find((instance) => instance.machineId === 'brickedBlastFurnace')!
    state = insertProcessSlot(state, blastFurnace.uid, 'input', 'ironIngot', 1)
    state = insertProcessSlot(state, blastFurnace.uid, 'fuel', 'coalCoke', 1)

    state = tickGame(state, 25000).state

    expect(state.machineInstances.find((instance) => instance.uid === blastFurnace.uid)!.process.output).toEqual({ id: 'steelIngot', amount: 1 })
  })

  it('uses different blast furnace steel times by fuel quality', () => {
    const coalCokeRecipe = processRecipes.find((recipe) => recipe.id === 'steel_from_coal_coke')!
    const coalRecipe = processRecipes.find((recipe) => recipe.id === 'steel_from_coal')!
    const charcoalRecipe = processRecipes.find((recipe) => recipe.id === 'steel_from_charcoal')!
    expect(coalCokeRecipe.input).toEqual({ id: 'ironIngot', amount: 1 })
    expect(coalCokeRecipe.fuelInput).toEqual({ id: 'coalCoke', amount: 1 })
    expect(coalCokeRecipe.output).toEqual({ id: 'steelIngot', amount: 1 })
    expect(coalRecipe.input).toEqual({ id: 'ironIngot', amount: 1 })
    expect(coalRecipe.fuelInput).toEqual({ id: 'coal', amount: 1 })
    expect(coalRecipe.output).toEqual({ id: 'steelIngot', amount: 1 })
    expect(charcoalRecipe.input).toEqual({ id: 'ironIngot', amount: 1 })
    expect(charcoalRecipe.fuelInput).toEqual({ id: 'charcoal', amount: 1 })
    expect(charcoalRecipe.output).toEqual({ id: 'steelIngot', amount: 1 })
    expect(charcoalRecipe.durationMs).toBe(40000)
    expect(coalRecipe.durationMs).toBe(35000)
    expect(coalCokeRecipe.durationMs).toBe(25000)
  })

  it('makes steel plates from steel ingots with hammer recipes', () => {
    expect(recipes.find((recipe) => recipe.id === 'steel_plate')?.outputs).toEqual([{ id: 'steelPlate', amount: 1 }])
    expect(recipes.find((recipe) => recipe.id === 'steel_plate')?.inputs).toEqual([{ id: 'steelIngot', amount: 2 }])
    expect(processRecipes.find((recipe) => recipe.id === 'steam_hammer_steel_plate')?.output).toEqual({ id: 'steelPlate', amount: 1 })
    expect(processRecipes.find((recipe) => recipe.id === 'steam_hammer_steel_plate')?.input).toEqual({ id: 'steelIngot', amount: 2 })
  })

  it('crafts the first basic electronic circuit from LV foundation parts', () => {
    let state = createInitialState(1000)
    state.resources.basicBoard = 1
    state.resources.conductiveWire = 2
    state.resources.resistor = 2
    state.resources.vacuumTube = 2
    state.resources.redstoneDust = 1
    state.resources.steelPlate = 1
    const circuit = recipes.find((recipe) => recipe.id === 'craft_basic_electronic_circuit')!

    expect(canCraft(state, circuit)).toBe(true)
    state = craftRecipeInstant(state, circuit, 1)

    expect(state.resources.primitiveCircuit).toBe(1)
    expect(state.resources.basicBoard).toBe(0)
    expect(state.resources.conductiveWire).toBe(0)
  })

  it('uses different steam costs for steam macerator recipes', () => {
    expect(processRecipes.find((recipe) => recipe.id === 'steam_crush_iron_ore')?.steamCostLitres).toBe(32)
    expect(processRecipes.find((recipe) => recipe.id === 'steam_grind_crushed_iron_ore')?.steamCostLitres).toBe(16)
    expect(processRecipes.find((recipe) => recipe.id === 'steam_grind_iron_ingot')?.steamCostLitres).toBe(48)
  })

  it('runs a steam macerator from its internal buffer', () => {
    let state = createFactoryState(1000)
    state.machines.well = 1
    state.machines.steamBoiler = 1
    state.machines.steamMacerator = 1
    state.resources.coal = 1
    state.resources.ironOre = 1
    state = placeMachineInstance(state, 'well', 0, 0)
    state = placeMachineInstance(state, 'steamBoiler', 1, 0)
    state = placeMachineInstance(state, 'steamMacerator', 2, 0)
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    const macerator = state.machineInstances.find((instance) => instance.machineId === 'steamMacerator')!
    state = insertProcessSlot(state, boiler.uid, 'fuel', 'coal', 1)
    state = tickGame(state, 32000).state
    state = insertProcessSlot(state, macerator.uid, 'input', 'ironOre', 1)
    state = tickGame(state, 7000).state

    const maceratorProcess = state.machineInstances.find((instance) => instance.uid === macerator.uid)!.process
    expect(maceratorProcess.output).toEqual({ id: 'crushedIronOre', amount: 2 })
    expect(maceratorProcess.steamStoredMs).toBe(0)
  })

  it('alloys copper and tin in either slot order into bronze ingots', () => {
    let state = createFactoryState(1000)
    state.machines.well = 1
    state.machines.steamBoiler = 1
    state.machines.steamAlloySmelter = 1
    state.resources.coal = 1
    state.resources.copperIngot = 2
    state.resources.tinIngot = 1
    state = placeMachineInstance(state, 'well', 0, 0)
    state = placeMachineInstance(state, 'steamBoiler', 1, 0)
    state = placeMachineInstance(state, 'steamAlloySmelter', 2, 0)
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    const alloySmelter = state.machineInstances.find((instance) => instance.machineId === 'steamAlloySmelter')!
    state = insertProcessSlot(state, boiler.uid, 'fuel', 'coal', 1)
    state = tickGame(state, 32000).state
    state = insertProcessSlot(state, alloySmelter.uid, 'input', 'tinIngot', 1)
    state = insertProcessSlot(state, alloySmelter.uid, 'secondaryInput', 'copperIngot', 2)

    state = tickGame(state, 7000).state

    const process = state.machineInstances.find((instance) => instance.uid === alloySmelter.uid)!.process
    expect(process.output).toEqual({ id: 'bronzeIngot', amount: 3 })
    expect(process.input).toBeNull()
    expect(process.secondaryInput).toBeNull()
  })

  it('only accepts dusts or ingots in the alloy smelter inputs', () => {
    let state = createFactoryState(1000)
    state.machines.steamAlloySmelter = 1
    state.resources.rubber = 1
    state.resources.copperDust = 1
    state = placeMachineInstance(state, 'steamAlloySmelter', 0, 0)
    const alloySmelter = state.machineInstances.find((instance) => instance.machineId === 'steamAlloySmelter')!

    const rejected = insertProcessSlot(state, alloySmelter.uid, 'input', 'rubber', 1)
    const accepted = insertProcessSlot(state, alloySmelter.uid, 'input', 'copperDust', 1)

    expect(rejected).toBe(state)
    expect(accepted.machineInstances[0].process.input).toEqual({ id: 'copperDust', amount: 1 })
  })

  it('defines alloy smelter recipes as ingot outputs only', () => {
    const alloyRecipes = processRecipes.filter((recipe) => recipe.machineId === 'steamAlloySmelter')

    expect(alloyRecipes.every((recipe) => recipe.output.id.endsWith('Ingot'))).toBe(true)
    expect(processRecipes.find((recipe) => recipe.id === 'steam_alloy_bronze')?.output).toEqual({ id: 'bronzeIngot', amount: 3 })
    expect(processRecipes.find((recipe) => recipe.id === 'steam_alloy_bronze')?.secondaryInput).toEqual({ id: 'tinDust', amount: 1 })
    expect(processRecipes.find((recipe) => recipe.id === 'steam_alloy_red_alloy')?.output).toEqual({ id: 'redAlloyIngot', amount: 1 })
    expect(processRecipes.find((recipe) => recipe.id === 'steam_alloy_red_alloy_ingot')?.input).toEqual({ id: 'copperIngot', amount: 1 })
    expect(processRecipes.find((recipe) => recipe.id === 'steam_alloy_red_alloy_ingot')?.secondaryInput).toEqual({ id: 'redstoneDust', amount: 4 })
    expect(processRecipes.find((recipe) => recipe.id === 'steam_alloy_red_alloy_ingot')?.output).toEqual({ id: 'redAlloyIngot', amount: 1 })
  })

  it('pauses a steam macerator without connected steam and resumes when steam is available', () => {
    let state = createFactoryState(1000)
    state.machines.well = 1
    state.machines.steamBoiler = 1
    state.machines.steamMacerator = 1
    state.resources.coal = 1
    state.resources.copperIngot = 1
    state = placeMachineInstance(state, 'well', 0, 0)
    state = placeMachineInstance(state, 'steamBoiler', 1, 0)
    state = placeMachineInstance(state, 'steamMacerator', 2, 0)
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    const macerator = state.machineInstances.find((instance) => instance.machineId === 'steamMacerator')!
    state = insertProcessSlot(state, macerator.uid, 'input', 'copperIngot', 1)
    state = tickGame(state, 3000).state
    expect(state.machineInstances.find((instance) => instance.uid === macerator.uid)!.process.progressMs).toBe(0)

    state = insertProcessSlot(state, boiler.uid, 'fuel', 'coal', 1)
    state = tickGame(state, 32000).state
    expect(state.machineInstances.find((instance) => instance.uid === macerator.uid)!.process.progressMs).toBe(4000)

    state = tickGame(state, 16000).state

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
      'build_steam_tank',
      'build_copper_pipe',
      'build_bronze_pipe',
      'build_iron_pipe',
      'craft_steam_casing',
      'build_steam_macerator',
      'build_steam_forge_hammer',
      'build_steam_compressor',
      'build_steam_extractor',
      'build_steam_alloy_smelter',
      'build_steam_furnace',
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
    let state = createFactoryState(1000)
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
    const ironWireCuttersGrid: CraftSlot[] = [{ id: 'ironPlate' }, null, { id: 'ironPlate' }, null, { id: 'ironRod' }, null, { id: 'ironRod' }, { id: 'ironFile' }, null]
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
    expect(findGridRecipe(ironWireCuttersGrid, recipes)?.id).toBe('craft_iron_wire_cutters')
    expect(findGridRecipe(mortarGrid, recipes)?.id).toBe('craft_mortar')
    expect(findGridRecipe(ironMortarGrid, recipes)?.id).toBe('craft_iron_mortar')
    expect(findGridRecipe(bronzeMortarGrid, recipes)?.id).toBe('craft_bronze_mortar')
    expect(findGridRecipe(ironWrenchGrid, recipes)?.id).toBe('craft_iron_wrench')
    expect(findGridRecipe(bronzeWrenchGrid, recipes)?.id).toBe('craft_bronze_wrench')
  })

  it('mixes three copper dust and one tin dust into four bronze dust', () => {
    let state = createFactoryState(1000)
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
    let state = createFactoryState(1000)
    state.resources.log = 3
    const planks = recipes.find((recipe) => recipe.id === 'craft_planks')!

    state = craftRecipeInstant(state, planks, 2)

    expect(state.resources.log).toBe(1)
    expect(state.resources.plank).toBe(8)
  })

  it('instant batch crafting multiplies machine outputs', () => {
    let state = createFactoryState(1000)
    state.resources.cobblestone = 16
    const furnace = recipes.find((recipe) => recipe.id === 'build_furnace')!

    state = craftRecipeInstant(state, furnace, 2)

    expect(state.resources.cobblestone).toBe(0)
    expect(state.machines.furnace).toBe(2)
  })

  it('does not batch craft with reserved equipped items', () => {
    let state = createFactoryState(1000)
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

