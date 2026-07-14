import { describe, expect, it } from 'vitest'
import {
  canAutoMinerTarget,
  createInitialState,
  fuelDefinitions,
  gatherTargets,
  isResourceBackedMachine,
  machines,
  processRecipes,
  quests,
  recipes,
  sellItems,
  shopItems,
} from './content'
import { processRecipesProducingResource, recipesProducingResource, recipesUsingResource } from './recipeGraph'
import { groupRecipesByOutput } from './recipeGroups'
import {
  availableConnectedEu,
  availableConnectedEuStorage,
  availableConnectedSteam,
  arcBlastFurnaceStructureForInstance,
  availableResourceAmount,
  availableUnplacedMachineCount,
  assignAutoMiner,
  buyShopItem,
  boilerHasWater,
  boilerSteamCapacityMs,
  fluidContainerCapacities,
  fluidContainerGroups,
  canBuyShopItem,
  canCrowbarRemoveMachine,
  canExpandFactoryFloor,
  canSellShopItem,
  cokeOvenFluidCapacityLitres,
  canCraft,
  claimAllQuestRewards,
  claimQuestReward,
  collectProcessOutput,
  crowbarRemoveMachineInstance,
  createCreativeState,
  currentFluidOutputFlows,
  currentWellWaterFlowLitresPerSecond,
  currentSteamPipeFlowLitresPerSecond,
  craftableQuantity,
  craftRecipeInstant,
  durabilityRemaining,
  equipResource,
  equippedResourceCounts,
  expandFactoryFloor,
  factoryFoundationCost,
  fillPortableFluidContainer,
  factoryGridForState,
  findGridRecipe,
  getBestToolForTarget,
  hitGatherTarget,
  ironTankFluidCapacityLitres,
  insertProcessSlot,
  insertMachineStorageSlot,
  installLvBatteryInBuffer,
  installSurveyCardInAutoMiner,
  isAutoMinerPowered,
  isReachGateFormed,
  loadGame,
  loadGameWithOfflineProgress,
  drainPortableFluidContainer,
  liquidSteamBoilerCapacityMs,
  liquidSteamBoilerFluidCapacityLitres,
  lvItemAutomationStatus,
  lvAutoMinerActionMs,
  makeGridForRecipe,
  maxDurability,
  missingForQuantity,
  missingForRecipe,
  placeMachineInstance,
  processStackLimit,
  questKind,
  questObjectiveProgress,
  questProgress,
  questScripReward,
  questStatus,
  recipeFitsTerminalGrid,
  recipesUsingInput,
  removeMachineInstance,
  removeProcessSlot,
  removeMachineStorageSlot,
  removeLvBatteryFromBuffer,
  removeSurveyCardFromAutoMiner,
  searchTerminalRecipes,
  sellShopItem,
  setFluidOutputDirection,
  setHopperOutputDirection,
  setLvItemOutputDirection,
  shopItemCooldownMs,
  shopItemCooldownRemainingMs,
  simulateOfflineProgress,
  setPipeSideMode,
  setPipeSideDisabled,
  pipeSideMode,
  steamMsPerLitre,
  steamPipeBufferCapacityMs,
  steamMaceratorCapacityMs,
  steamTankCapacityMs,
  steamTankCapacityMsForInstance,
  steamTankFluidCapacityLitresForInstance,
  steamTankStructureForInstance,
  steamTurbineEuCapacity,
  terminalAvailableAmount,
  tickGame,
  offlineProgressCapMs,
  unequipSlot,
  unassignAutoMiner,
  visibleQuests,
  visibleRecipes,
  wellWaterOutputLitresPerSecond,
} from './engine'
import type { CraftSlot, MachineId, PipeDirection, PipeSideMode, Recipe } from './types'

describe('game engine', () => {
  function createFactoryState(now = 1000, level = 2) {
    const state = createInitialState(now)
    state.factoryFoundationLevel = level
    return state
  }

  function configurePlacedConnector(
    state: ReturnType<typeof createInitialState>,
    machineId: MachineId,
    modes: Partial<Record<PipeDirection, PipeSideMode>>,
  ) {
    const connector = state.machineInstances.find((instance) => instance.machineId === machineId)
    if (!connector) return state
    let next = state
    for (const [direction, mode] of Object.entries(modes) as Array<[PipeDirection, PipeSideMode]>) {
      next = setPipeSideMode(next, connector.uid, direction, mode)
    }
    return next
  }

  it('starts with no factory floor until foundations are built', () => {
    const state = createInitialState(1000)
    state.machines.furnace = 1

    expect(state.factoryFoundationLevel).toBe(0)
    expect(factoryGridForState(state)).toEqual({ width: 0, height: 0 })
    expect(placeMachineInstance(state, 'furnace', 0, 0)).toBe(state)
  })

  it('builds the first 7x7 factory foundation from basic materials', () => {
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
    expect(factoryGridForState(state)).toEqual({ width: 7, height: 7 })
    expect(state.resources.plank).toBe(0)
    expect(state.resources.cobblestone).toBe(0)

    state.machines.furnace = 1
    state = placeMachineInstance(state, 'furnace', 6, 6)
    expect(state.machineInstances).toHaveLength(1)
    expect(placeMachineInstance(state, 'furnace', 7, 0)).toBe(state)
  })

  it('expands the factory floor through capped progression sizes', () => {
    let state = createFactoryState(1000, 1)
    state.resources.cobblestone = 1100
    state.resources.brick = 540
    state.resources.ironPlate = 72
    state.resources.steelPlate = 24
    state.resources.aluminiumPlate = 16

    state = expandFactoryFloor(state)
    expect(state.factoryFoundationLevel).toBe(2)
    expect(factoryGridForState(state)).toEqual({ width: 10, height: 8 })

    state = expandFactoryFloor(state)
    expect(factoryGridForState(state)).toEqual({ width: 12, height: 10 })

    state = expandFactoryFloor(state)
    expect(factoryGridForState(state)).toEqual({ width: 14, height: 12 })

    state = expandFactoryFloor(state)
    expect(factoryGridForState(state)).toEqual({ width: 16, height: 14 })

    expect(factoryFoundationCost(state)).toEqual([
      { id: 'cobblestone', amount: 384 },
      { id: 'brick', amount: 192 },
      { id: 'steelPlate', amount: 16 },
      { id: 'aluminiumPlate', amount: 16 },
    ])

    state = expandFactoryFloor(state)
    expect(state.factoryFoundationLevel).toBe(6)
    expect(factoryGridForState(state)).toEqual({ width: 18, height: 16 })
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
    expect(hitGatherTarget(state, 'nickelVein').state.gatherProgress.nickelVein).toBe(5)
    expect(hitGatherTarget(state, 'bauxiteVein').state.gatherProgress.bauxiteVein).toBe(5)
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
    expect(state.scrip).toBe(questScripReward(quest))
    expect(claimQuestReward(state, 'punchTree').scrip).toBe(state.scrip)
  })

  it('claims all completed quest rewards without double-paying claimed quests', () => {
    let state = createInitialState(1000)
    const firstQuest = quests.find((candidate) => candidate.id === 'punchTree')!
    const secondQuest = quests.find((candidate) => candidate.id === 'craftPlanks')!

    state.completedQuests = ['punchTree', 'craftPlanks']

    state = claimAllQuestRewards(state)
    expect(state.claimedQuests).toEqual(['punchTree', 'craftPlanks'])
    expect(state.scrip).toBe(questScripReward(firstQuest) + questScripReward(secondQuest))

    const paidScrip = state.scrip
    state = claimAllQuestRewards(state)
    expect(state.scrip).toBe(paidScrip)
    expect(state.claimedQuests).toEqual(['punchTree', 'craftPlanks'])
  })

  it('unlocks the shop after the getting started gate and buys only discovered resources', () => {
    let state = createInitialState(1000)
    const logShopItem = shopItems.find((item) => item.id === 'log')!
    const ironShopItem = shopItems.find((item) => item.id === 'ironIngot')!

    state.resources.log = 1
    state.discoveredResources = ['log']
    state.scrip = 100

    expect(canBuyShopItem(state, logShopItem)).toBe(false)

    state.completedQuests.push('buildFoundation')
    expect(canBuyShopItem(state, logShopItem)).toBe(true)
    expect(canBuyShopItem(state, ironShopItem)).toBe(false)

    state = buyShopItem(state, 'log', 2)
    expect(state.resources.log).toBe(3)
    expect(state.scrip).toBe(100 - logShopItem.buyPrice * 2)

    expect(buyShopItem(state, 'woodenAxe')).toBe(state)
  })

  it('puts manufactured shop parts on cooldown and blocks bulk part buys', () => {
    let state = createInitialState(1000)
    const brickShopItem = shopItems.find((item) => item.id === 'brick')!

    state.completedQuests.push('buildFoundation')
    state.discoveredResources = ['brick']
    state.scrip = 1000

    expect(shopItemCooldownMs(brickShopItem)).toBe(5 * 60 * 1000)
    expect(canBuyShopItem(state, brickShopItem)).toBe(true)
    expect(buyShopItem(state, 'brick', 2)).toBe(state)

    state = buyShopItem(state, 'brick')

    expect(state.resources.brick).toBe(1)
    expect(state.scrip).toBe(1000 - brickShopItem.buyPrice)
    expect(shopItemCooldownRemainingMs(state, brickShopItem)).toBeGreaterThan(0)
    expect(canBuyShopItem(state, brickShopItem)).toBe(false)
    expect(buyShopItem(state, 'brick')).toBe(state)
  })

  it('gates shop stock by the displayed age', () => {
    let state = createInitialState(1000)
    const copperShopItem = shopItems.find((item) => item.id === 'copperOre')!
    const nickelShopItem = shopItems.find((item) => item.id === 'nickelOre')!
    state.completedQuests.push('buildFoundation')
    state.discoveredResources = ['copperOre', 'nickelOre']
    state.scrip = 1000

    expect(canBuyShopItem(state, copperShopItem)).toBe(false)
    expect(canBuyShopItem(state, nickelShopItem)).toBe(false)

    state.completedQuests.push('bronzeAge')
    expect(canBuyShopItem(state, copperShopItem)).toBe(true)
    expect(canBuyShopItem(state, nickelShopItem)).toBe(false)

    state.completedQuests.push('steelPlateQuest')
    expect(canBuyShopItem(state, nickelShopItem)).toBe(true)
  })

  it('keeps processed bottlenecks and machine shortcuts out of the shop', () => {
    expect(shopItems.some((item) => item.id === 'basicBoard' || item.id === 'primitiveCircuit')).toBe(false)
    expect(shopItems.some((item) => item.id === 'bbfCasing' || item.id === 'heatProofCasing')).toBe(false)
    for (const resourceId of ['rubber', 'conductiveWire', 'redAlloyIngot', 'redAlloyWire', 'steelIngot', 'steelPlate', 'steelRod', 'aluminiumDust']) {
      expect(shopItems.some((item) => item.id === resourceId), resourceId).toBe(false)
    }
  })

  it('sells only the fixed gathered material list for Foundry Scrip', () => {
    let state = createInitialState(1000)
    state.completedQuests.push('buildFoundation')
    state.resources.log = 3
    state.resources.ironPlate = 3
    const logSellItem = sellItems.find((item) => item.id === 'log')!

    expect(canSellShopItem(state, logSellItem)).toBe(true)
    state = sellShopItem(state, 'log', 2)

    expect(state.resources.log).toBe(1)
    expect(state.scrip).toBe(logSellItem.sellPrice * 2)
    expect(sellShopItem(state, 'ironPlate')).toBe(state)
  })

  it('loads old saves without offline reward when no saved timestamp exists', () => {
    const result = loadGameWithOfflineProgress(JSON.stringify({ resources: { log: 1 } }), 60_000)

    expect(result.offline).toMatchObject({
      applied: false,
      reason: 'missing-save-time',
      resourceDelta: [],
    })
    expect(result.state.resources.log).toBe(1)
    expect(result.state.lastSavedAt).toBe(60_000)
    expect(result.state.scrip).toBe(0)
    expect(result.state.discoveredResources).toContain('log')
  })

  it('rejects suspicious offline clock changes', () => {
    const state = createFactoryState(10_000)

    expect(simulateOfflineProgress(state, -301_000, 20_000).offline).toMatchObject({
      applied: false,
      suspicious: true,
      reason: 'negative-clock',
    })
    expect(simulateOfflineProgress(state, 73 * 60 * 60 * 1000, 20_000).offline).toMatchObject({
      applied: false,
      suspicious: true,
      reason: 'clock-jump',
    })
  })

  it('caps offline simulation at eight hours', () => {
    const state = createFactoryState(1000)
    const result = simulateOfflineProgress(state, 24 * 60 * 60 * 1000, 1000 + 24 * 60 * 60 * 1000)

    expect(result.offline.applied).toBe(true)
    expect(result.offline.capped).toBe(true)
    expect(result.offline.simulatedMs).toBe(offlineProgressCapMs)
    expect(result.state.lastSavedAt).toBe(1000 + 24 * 60 * 60 * 1000)
  })

  it('auto-completes quests after offline progress', () => {
    const state = createFactoryState(1000)
    state.resources.log = 1

    const result = simulateOfflineProgress(state, 60_000, 61_000)

    expect(result.offline.questCompletions).toEqual(['punchTree'])
    expect(result.state.completedQuests).toContain('punchTree')
  })

  it('reveals only ready quest book branches and tracks hidden objective progress', () => {
    const state = createFactoryState(1000)
    const punchQuest = quests.find((candidate) => candidate.id === 'punchTree')!
    const plankQuest = quests.find((candidate) => candidate.id === 'craftPlanks')!
    const furnaceQuest = quests.find((candidate) => candidate.id === 'buildFurnace')!

    expect(visibleQuests(state)).toContain(punchQuest)
    expect(visibleQuests(state)).not.toContain(plankQuest)
    expect(visibleQuests(state)).not.toContain(furnaceQuest)
    expect(questStatus(state, furnaceQuest)).toBe('locked')
    expect(questProgress(state, furnaceQuest)).toBe(0)
  })

  it('keeps LV guide steps hidden until their parent quest is complete', () => {
    const state = createFactoryState(1000)
    state.completedQuests.push('steelPlateQuest')
    const redstoneQuest = quests.find((candidate) => candidate.id === 'findRedstone')!
    const alloyQuest = quests.find((candidate) => candidate.id === 'smeltRedAlloy')!
    const wireQuest = quests.find((candidate) => candidate.id === 'cutRedAlloyWireQuest')!

    expect(visibleQuests(state)).toContain(redstoneQuest)
    expect(visibleQuests(state)).not.toContain(alloyQuest)
    expect(visibleQuests(state)).not.toContain(wireQuest)

    state.completedQuests.push('findRedstone')
    expect(visibleQuests(state)).not.toContain(alloyQuest)

    state.completedQuests.push('steamUtilityBranch')
    expect(visibleQuests(state)).toContain(alloyQuest)
    expect(visibleQuests(state)).not.toContain(wireQuest)
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

  it('guides LV circuit prep through the missing material branches', () => {
    const questIds = new Set(quests.map((quest) => quest.id))
    for (const id of ['cutRedAlloyWireQuest', 'makeCarbonDustQuest', 'pulpWoodQuest'] as const) {
      expect(questIds.has(id), `${id} should be part of the LV guide`).toBe(true)
    }

    const vacuumTubes = quests.find((quest) => quest.id === 'makeVacuumTubes')!
    const pulpWood = quests.find((quest) => quest.id === 'pulpWoodQuest')!
    const circuitBoard = quests.find((quest) => quest.id === 'pressCircuitBoard')!
    const firstCircuit = quests.find((quest) => quest.id === 'firstLvCircuit')!

    expect(vacuumTubes.prerequisites).toEqual(['insulateWireQuest', 'makeGlassTubes'])
    expect(pulpWood.prerequisites).toEqual(['makeVacuumTubes', 'makeResistors'])
    expect(circuitBoard.prerequisites).toEqual(['pulpWoodQuest'])
    expect(firstCircuit.prerequisites).toEqual(['pressCircuitBoard'])

    const lvResourceObjectives = quests
      .filter((quest) => quest.chapterId === 'lvFoundations')
      .flatMap((quest) => quest.requirements.resources ?? [])

    for (const objective of lvResourceObjectives) {
      const craftingSources = recipesProducingResource(objective.id, recipes)
      const processingSources = processRecipesProducingResource(objective.id, processRecipes)
      const gatherSources = Object.values(gatherTargets).filter((target) => target.drops.some((drop) => drop.id === objective.id))
      expect(
        craftingSources.length + processingSources.length + gatherSources.length,
        `${objective.id} should have a recipe, machine process, or gather source`,
      ).toBeGreaterThan(0)
    }
  })

  it('offers bauxite, clay, and gravel routes into aluminium dust', () => {
    const aluminiumDustRoutes = processRecipesProducingResource('aluminiumDust', processRecipes).map((recipe) => recipe.id)

    expect(aluminiumDustRoutes).toContain('lv_electrolyze_bauxite')
    expect(aluminiumDustRoutes).toContain('lv_centrifuge_clay_aluminium')
    expect(aluminiumDustRoutes).toContain('lv_centrifuge_gravel_aluminium')
  })

  it('carries the LV guide through the arc furnace into aluminium', () => {
    const bender = quests.find((quest) => quest.id === 'runLvBenderQuest')!
    const lathe = quests.find((quest) => quest.id === 'runLvLatheQuest')!
    const electrolyzer = quests.find((quest) => quest.id === 'buildLvElectrolyzerQuest')!
    const bauxite = quests.find((quest) => quest.id === 'findBauxiteQuest')!
    const aluminiumDust = quests.find((quest) => quest.id === 'makeAluminiumDustQuest')!
    const diamondPick = quests.find((quest) => quest.id === 'makeDiamondPickQuest')!
    const batteryMinerals = quests.find((quest) => quest.id === 'gatherBatteryMineralsQuest')!
    const emptyCell = quests.find((quest) => quest.id === 'makeEmptyBatteryCellQuest')!
    const canner = quests.find((quest) => quest.id === 'buildLvCannerQuest')!
    const filledBattery = quests.find((quest) => quest.id === 'fillLvBatteryQuest')!
    const fourAmpCable = quests.find((quest) => quest.id === 'buildFourAmpCableQuest')!
    const fourAmpBuffer = quests.find((quest) => quest.id === 'buildFourAmpBufferQuest')!
    const coils = quests.find((quest) => quest.id === 'makeHeatingCoilsQuest')!
    const invar = quests.find((quest) => quest.id === 'makeInvarQuest')!
    const controller = quests.find((quest) => quest.id === 'craftArcControllerQuest')!
    const itemBuses = quests.find((quest) => quest.id === 'craftArcItemBusesQuest')!
    const energyHatches = quests.find((quest) => quest.id === 'craftArcEnergyHatchesQuest')!
    const arcFurnace = quests.find((quest) => quest.id === 'buildArcBlastFurnaceQuest')!
    const chargedArc = quests.find((quest) => quest.id === 'bufferArcBlastFurnaceQuest')!
    const aluminium = quests.find((quest) => quest.id === 'firstAluminiumQuest')!

    expect(questKind(bender)).toBe('main')
    expect(questKind(lathe)).toBe('main')
    expect(questKind(bauxite)).toBe('main')
    expect(questKind(aluminiumDust)).toBe('main')
    expect(electrolyzer.prerequisites).toEqual(['runLvBenderQuest', 'runLvLatheQuest'])
    expect(bauxite.prerequisites).toEqual(['buildLvElectrolyzerQuest'])
    expect(aluminiumDust.prerequisites).toEqual(['findBauxiteQuest'])
    expect(diamondPick.prerequisites).toEqual(['bufferLvPowerQuest'])
    expect(batteryMinerals.prerequisites).toEqual(['makeDiamondPickQuest'])
    expect(emptyCell.prerequisites).toEqual(['gatherBatteryMineralsQuest'])
    expect(canner.prerequisites).toEqual(['makeEmptyBatteryCellQuest'])
    expect(filledBattery.prerequisites).toEqual(['buildLvCannerQuest'])
    expect(fourAmpCable.prerequisites).toEqual(['buildTwoAmpCableQuest'])
    expect(fourAmpBuffer.prerequisites).toEqual(['buildFourAmpCableQuest'])
    expect(invar.prerequisites).toEqual(['makeCupronickelQuest', 'runLvBenderQuest'])
    expect(controller.prerequisites).toEqual(['makeHeatingCoilsQuest', 'makeInvarQuest'])
    expect(itemBuses.requirements.machines).toEqual([{ id: 'lvInputBus', amount: 1 }, { id: 'lvOutputBus', amount: 1 }])
    expect(energyHatches.requirements.machines).toEqual([{ id: 'lvEnergyHatch2A', amount: 2 }])
    expect(arcFurnace.prerequisites).toEqual(['craftArcControllerQuest', 'craftArcItemBusesQuest', 'craftArcEnergyHatchesQuest'])
    expect(chargedArc.prerequisites).toEqual(['buildArcBlastFurnaceQuest', 'buildFourAmpBufferQuest'])
    expect(aluminium.prerequisites).toEqual(['makeAluminiumDustQuest', 'bufferArcBlastFurnaceQuest'])
    expect(coils.requirements.resources).toContainEqual({ id: 'heatProofCasing', amount: 5 })
    expect(arcFurnace.objectives).toContainEqual({ type: 'placedMachine', id: 'arcBlastFurnace', amount: 1, label: 'Formed 3x3 Arc Furnace' })
  })

  it('completes an already-satisfied child quest when its parent completes', () => {
    const state = createFactoryState(1000)
    state.resources.log = 1
    state.resources.plank = 4

    const result = tickGame(state, 1, 1001)

    expect(result.questCompletions).toEqual(['punchTree', 'craftPlanks'])
    expect(result.state.completedQuests).toContain('punchTree')
    expect(result.state.completedQuests).toContain('craftPlanks')
  })

  it('keeps lifetime quest credit after an early-crafted item is consumed', () => {
    let state = createFactoryState(1000)
    state.completedQuests.push('punchTree')
    state.resources.plank = 6
    const sticks = recipes.find((recipe) => recipe.id === 'craft_sticks')!

    state = craftRecipeInstant(state, sticks, 1)
    state.resources.stick = 0
    state = tickGame(state, 1, 1001).state

    expect(state.completedQuests).toContain('craftPlanks')
    expect(state.completedQuests).toContain('craftSticks')
  })

  it('keeps explicit stockpile quests tied to current inventory', () => {
    const state = createFactoryState(1000)
    state.completedQuests.push('buildBbfQuest', 'steamOrePrepQuest')
    state.resourceMilestones.steelIngot = 4

    expect(tickGame(state, 1, 1001).state.completedQuests).not.toContain('firstSteel')
  })

  it('counts a placed machine toward build milestones', () => {
    let state = createFactoryState(1000)
    state.completedQuests.push('craftSteamCasingQuest')
    state.machines.steamBoiler = 1
    state.machineMilestones.steamBoiler = 1
    state = placeMachineInstance(state, 'steamBoiler', 0, 0)

    state = tickGame(state, 1, 1001).state

    expect(state.completedQuests).toContain('makeSteam')
  })

  it('reveals guided LV recipes alongside their production lessons', () => {
    const unlocks = {
      build_tin_cable: 'buildSteamTurbineQuest',
      bundle_tin_cable_2a: 'fillLvBatteryQuest',
      bundle_tin_cable_4a: 'buildTwoAmpCableQuest',
      bundle_tin_cable_8a: 'firstAluminiumQuest',
      craft_lv_motor: 'makeSteelMechanicsQuest',
      craft_lv_piston: 'makeLvMotorQuest',
      craft_lv_pump: 'makeLvMotorQuest',
      craft_lv_conveyor: 'makeLvMotorQuest',
      build_lv_wiremill: 'makeLvMotionPartsQuest',
      build_lv_battery_buffer: 'runLvWiremillQuest',
      craft_empty_battery_cell: 'gatherBatteryMineralsQuest',
      build_lv_canner: 'makeEmptyBatteryCellQuest',
      build_lv_bender: 'fillLvBatteryQuest',
      build_lv_lathe: 'fillLvBatteryQuest',
      build_lv_electrolyzer: 'runLvBenderQuest',
      build_lv_battery_buffer_4a: 'buildFourAmpCableQuest',
      build_lv_battery_buffer_8a: 'firstAluminiumQuest',
    } as const

    for (const [recipeId, questId] of Object.entries(unlocks)) {
      expect(recipes.find((recipe) => recipe.id === recipeId)?.unlockedBy, recipeId).toBe(questId)
    }

    const state = createFactoryState(1000)
    state.completedQuests.push('steelPlateQuest')
    const earlyLvRecipes = new Set(visibleRecipes(state).map((recipe) => recipe.id))
    expect(earlyLvRecipes.has('craft_lv_motor')).toBe(false)
    expect(earlyLvRecipes.has('build_lv_wiremill')).toBe(false)
    expect(earlyLvRecipes.has('bundle_tin_cable_8a')).toBe(false)

    state.completedQuests.push('makeSteelMechanicsQuest')
    expect(visibleRecipes(state).map((recipe) => recipe.id)).toContain('craft_lv_motor')
  })

  it('keeps quest-unlocked LV recipes visible before all ingredients are owned', () => {
    const state = createFactoryState(1000)
    state.completedQuests.push('steelPlateQuest')

    expect(visibleRecipes(state).map((recipe) => recipe.id)).toContain('craft_heat_proof_casing')
  })

  it('keeps coke oven and blast multiblock quest counts aligned with their assembly recipes', () => {
    const cokeBrickQuest = quests.find((quest) => quest.id === 'cokeOvenBrickQuest')!
    const coils = quests.find((quest) => quest.id === 'makeHeatingCoilsQuest')!
    const cokeOven = recipes.find((recipe) => recipe.id === 'build_coke_oven')!
    const arcFurnace = recipes.find((recipe) => recipe.id === 'build_arc_blast_furnace')!

    expect(cokeBrickQuest.requirements.resources).toContainEqual({ id: 'cokeOvenBrick', amount: cokeOven.inputs.find((input) => input.id === 'cokeOvenBrick')!.amount * 4 })
    const stagedCasing = recipes.find((recipe) => recipe.id === 'stage_arc_blast_furnace_casing')!
    expect(coils.requirements.resources).toContainEqual({
      id: 'heatProofCasing',
      amount: arcFurnace.inputs.find((input) => input.id === 'heatProofCasing')!.amount + stagedCasing.inputs[0].amount * 4,
    })
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

  it('migrates legacy cable machine stock into the shared resource inventory', () => {
    const state = loadGame(
      JSON.stringify({
        version: 9,
        resources: { tinCable: 1 },
        machines: { tinCable: 4, tinCable2A: 3 },
        factoryFoundationLevel: 1,
        machineInstances: [{ uid: 'legacy-cable', machineId: 'tinCable', x: 0, y: 0, level: 1 }],
      }),
      1000,
    )

    expect(state.resources.tinCable).toBe(4)
    expect(state.resources.tinCable2A).toBe(3)
    expect(state.machines.tinCable).toBe(0)
    expect(state.machines.tinCable2A).toBe(0)
    expect(state.resourceMilestones.tinCable).toBe(4)
    expect(state.resourceMilestones.tinCable2A).toBe(3)
    expect(state.machineInstances).toContainEqual(expect.objectContaining({ uid: 'legacy-cable', machineId: 'tinCable' }))
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
    expect(Object.keys(state.machines)).toEqual(Object.keys(machines))
    expect(state.machines.well).toBe(0)
    expect(state.machines.steamBoiler).toBe(3)
    expect(state.machines.steamTank).toBe(0)
    expect(state.machines.standardChest).toBe(0)
    expect(state.machines.hopper).toBe(0)
    expect(state.machines.copperPipe).toBe(0)
    expect(state.machines.bronzePipe).toBe(0)
    expect(state.machines.ironPipe).toBe(0)
    expect(state.machines.steamTurbine).toBe(0)
    expect(state.machines.tinCable).toBe(0)
    expect(state.machines.tinCable2A).toBe(0)
    expect(state.machines.tinCable4A).toBe(0)
    expect(state.machines.tinCable8A).toBe(0)
    expect(state.machines.lvBatteryBuffer).toBe(0)
    expect(state.machines.lvBatteryBuffer2A).toBe(0)
    expect(state.machines.lvBatteryBuffer4A).toBe(0)
    expect(state.machines.lvBatteryBuffer8A).toBe(0)
    expect(state.machines.liquidSteamBoiler).toBe(0)
    expect(state.machines.lvMacerator).toBe(0)
    expect(state.machines.lvForgeHammer).toBe(0)
    expect(state.machines.lvCompressor).toBe(0)
    expect(state.machines.lvExtractor).toBe(0)
    expect(state.machines.lvAlloySmelter).toBe(0)
    expect(state.machines.lvFurnace).toBe(0)
    expect(state.machines.lvWiremill).toBe(0)
    expect(state.machines.lvBender).toBe(0)
    expect(state.machines.lvLathe).toBe(0)
    expect(state.machines.lvElectrolyzer).toBe(0)
    expect(state.machines.lvAssembler).toBe(0)
    expect(state.machines.lvCentrifuge).toBe(0)
    expect(state.machines.lvCanner).toBe(0)
    expect(state.machines.steamMacerator).toBe(0)
    expect(state.machines.cokeOvenPart).toBe(0)
    expect(state.machines.cokeOven).toBe(0)
    expect(state.machines.brickedBlastFurnace).toBe(0)
    expect(state.factoryFoundationLevel).toBe(2)
    expect(factoryGridForState(state)).toEqual({ width: 10, height: 8 })
    expect(state.machineInstances).toHaveLength(2)
    expect(state.machineInstances[0]).toMatchObject({ machineId: 'furnace', x: 0, y: 0, level: 1 })
    expect(state.machineInstances[1]).toMatchObject({ machineId: 'steamBoiler', x: 1, y: 0, level: 1 })
  })

  it('unpacks legacy coke ovens into four new placeable coke oven blocks', () => {
    const state = loadGame(
      JSON.stringify({
        version: 1,
        factoryFoundationLevel: 2,
        machines: { cokeOven: 1 },
        resources: { log: 0, charcoal: 0 },
        machineInstances: [
          {
            uid: 'old-coke',
            machineId: 'cokeOven',
            x: 0,
            y: 0,
            level: 1,
            process: {
              input: { id: 'log', amount: 1 },
              secondaryInput: null,
              fuel: null,
              output: { id: 'charcoal', amount: 1 },
              fluids: { creosote: 20 },
            },
          },
        ],
      }),
      1000,
    )

    expect(state.version).toBe(10)
    expect(state.machines.cokeOven).toBe(0)
    expect(state.machines.cokeOvenPart).toBe(4)
    expect(state.machineInstances.some((instance) => instance.machineId === 'cokeOven')).toBe(false)
    expect(state.resources.log).toBe(1)
    expect(state.resources.charcoal).toBe(1)
    expect(state.migrationNotices).toContain('coke-oven-multiblock')
  })

  it('migrates legacy discovery and ownership into lifetime quest milestones', () => {
    const state = loadGame(
      JSON.stringify({
        version: 3,
        resources: { stick: 0, steelIngot: 3 },
        machines: { steamBoiler: 1 },
        craftedResources: ['stick'],
        discoveredResources: ['steelIngot'],
      }),
      2000,
    )

    expect(state.version).toBe(10)
    expect(state.resourceMilestones.stick).toBe(1)
    expect(state.resourceMilestones.steelIngot).toBe(3)
    expect(state.machineMilestones.steamBoiler).toBe(1)
  })

  it('dismantles legacy 2x2 Arc Furnaces into refunded heatproof casings', () => {
    const state = loadGame(JSON.stringify({
      version: 4,
      factoryFoundationLevel: 2,
      machines: { arcBlastFurnace: 1, arcBlastFurnacePart: 3 },
      machineInstances: [
        { uid: 'old-arc', machineId: 'arcBlastFurnace', x: 0, y: 0, level: 1 },
        { uid: 'old-arc-part-1', machineId: 'arcBlastFurnacePart', x: 1, y: 0, level: 1 },
        { uid: 'old-arc-part-2', machineId: 'arcBlastFurnacePart', x: 0, y: 1, level: 1 },
        { uid: 'old-arc-part-3', machineId: 'arcBlastFurnacePart', x: 1, y: 1, level: 1 },
      ],
    }), 2000)

    expect(state.resources.heatProofCasing).toBe(8)
    expect(state.machineInstances.some((instance) => instance.machineId === 'arcBlastFurnace' || instance.machineId === 'arcBlastFurnacePart')).toBe(false)
    expect(state.migrationNotices).toContain('arc-furnace-3x3')
  })

  it('keeps current 2x2 coke oven multiblocks intact when loading current saves', () => {
    const state = loadGame(
      JSON.stringify({
        version: 2,
        factoryFoundationLevel: 2,
        machines: { cokeOven: 1, cokeOvenPart: 3 },
        machineInstances: [
          { uid: 'coke-controller', machineId: 'cokeOven', x: 0, y: 0, level: 1 },
          { uid: 'coke-part-1', machineId: 'cokeOvenPart', x: 1, y: 0, level: 1 },
          { uid: 'coke-part-2', machineId: 'cokeOvenPart', x: 0, y: 1, level: 1 },
          { uid: 'coke-part-3', machineId: 'cokeOvenPart', x: 1, y: 1, level: 1 },
        ],
      }),
      1000,
    )

    expect(state.machines.cokeOven).toBe(1)
    expect(state.machines.cokeOvenPart).toBe(3)
    expect(state.machineInstances.filter((instance) => instance.machineId === 'cokeOven')).toHaveLength(1)
    expect(state.machineInstances.filter((instance) => instance.machineId === 'cokeOvenPart')).toHaveLength(3)
    expect(state.migrationNotices).toEqual([])
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
    expect(loadGame(JSON.stringify({ factoryFoundationLevel: 99 }), 1000).factoryFoundationLevel).toBe(6)
  })

  it('creates a temporary creative state with 32 of every resource and placeable machine', () => {
    const state = createCreativeState(createInitialState(1000), 2000)

    expect(Object.values(state.resources).every((amount) => amount >= 32)).toBe(true)
    expect(
      Object.entries(state.machines).every(([id, amount]) => {
        const staysEmpty = id === 'cokeOven' || id === 'brickedBlastFurnace' || id === 'reachGate' || isResourceBackedMachine(id as MachineId)
        return staysEmpty ? amount === 0 : amount >= 32
      }),
    ).toBe(true)
    expect(state.machines.cokeOven).toBe(0)
    expect(state.machines.cokeOvenPart).toBe(32)
    expect(state.machines.brickedBlastFurnace).toBe(0)
    expect(state.machines.brickedBlastFurnacePart).toBe(32)
    expect(state.machines.arcBlastFurnace).toBe(32)
    expect(state.machines.arcBlastFurnacePart).toBe(32)
    expect(state.machines.reachGate).toBe(0)
    expect(state.machines.reachGateCasing).toBe(32)
    expect(state.factoryFoundationLevel).toBe(6)
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

  it('requires a diamond pickaxe for lead and salt after diamonds are mined with iron', () => {
    let state = createFactoryState(1000)
    state.resources.ironPickaxe = 1
    state = equipResource(state, 'pickaxe', 'ironPickaxe')

    let result = hitGatherTarget(state, 'diamondVein')
    expect(result.state.gatherProgress.diamondVein).toBe(3)

    result = hitGatherTarget(state, 'leadVein')
    expect(result.state.gatherProgress.leadVein).toBeUndefined()
    result = hitGatherTarget(state, 'saltDeposit')
    expect(result.state.gatherProgress.saltDeposit).toBeUndefined()

    state.resources.diamondPickaxe = 1
    state = equipResource(state, 'pickaxe', 'diamondPickaxe')
    result = hitGatherTarget(state, 'leadVein')
    expect(result.tool.id).toBe('diamondPickaxe')
    expect(result.state.gatherProgress.leadVein).toBe(7)
    result = hitGatherTarget(state, 'saltDeposit')
    expect(result.state.gatherProgress.saltDeposit).toBe(8)
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

  it('requires crowbar durability to remove placed machines in factory remove mode', () => {
    let state = createFactoryState(1000)
    state.machines.furnace = 1
    state = placeMachineInstance(state, 'furnace', 0, 0)
    const furnace = state.machineInstances[0]

    expect(canCrowbarRemoveMachine(state)).toBe(false)
    expect(crowbarRemoveMachineInstance(state, furnace.uid)).toBe(state)

    state.resources.ironCrowbar = 1
    state = crowbarRemoveMachineInstance(state, furnace.uid)

    expect(state.machineInstances).toEqual([])
    expect(availableUnplacedMachineCount(state, 'furnace')).toBe(1)
    expect(durabilityRemaining(state, 'ironCrowbar')).toBe(127)
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

  it('builds steam-age chests and hoppers as factory automation parts', () => {
    const chest = recipes.find((recipe) => recipe.id === 'build_standard_chest')!
    const hopper = recipes.find((recipe) => recipe.id === 'build_hopper')!

    expect(chest.machineOutputs).toEqual([{ id: 'standardChest', amount: 1 }])
    expect(recipeFitsTerminalGrid(chest)).toBe(true)
    expect(chest.inputs).toEqual([
      { id: 'plank', amount: 4 },
      { id: 'ironPlate', amount: 3 },
      { id: 'ironRod', amount: 2 },
    ])
    expect(hopper.machineOutputs).toEqual([{ id: 'hopper', amount: 1 }])
    expect(recipeFitsTerminalGrid(hopper)).toBe(true)
    expect(hopper.inputs).toEqual([
      { id: 'ironPlate', amount: 3 },
      { id: 'bronzePlate', amount: 2 },
      { id: 'bronzeRod', amount: 2 },
      { id: 'mechanicalPiston', amount: 1 },
    ])
  })

  it('gates hoppers behind a red-alloy mechanical piston', () => {
    const piston = recipes.find((recipe) => recipe.id === 'craft_mechanical_piston')!
    const hopper = recipes.find((recipe) => recipe.id === 'build_hopper')!

    expect(recipeFitsTerminalGrid(piston)).toBe(true)
    expect(piston.inputs).toEqual([
      { id: 'ironPlate', amount: 2 },
      { id: 'bronzeRod', amount: 2 },
      { id: 'plank', amount: 2 },
      { id: 'redAlloyPlate', amount: 1 },
    ])
    expect(hopper.inputs).toContainEqual({ id: 'mechanicalPiston', amount: 1 })
  })

  it('stores arbitrary items in chests and hoppers', () => {
    let state = createFactoryState(1000)
    state.machines.standardChest = 1
    state.machines.hopper = 1
    state.resources.log = 4
    state.resources.ironOre = 2
    state.resources.plank = 64
    state.resources.coal = 64
    state.resources.copperOre = 64
    state = placeMachineInstance(state, 'standardChest', 0, 0)
    state = placeMachineInstance(state, 'hopper', 1, 0)
    const chest = state.machineInstances.find((instance) => instance.machineId === 'standardChest')!
    const hopper = state.machineInstances.find((instance) => instance.machineId === 'hopper')!

    state = insertProcessSlot(state, chest.uid, 'input', 'log', 3)
    state = insertProcessSlot(state, chest.uid, 'secondaryInput', 'ironOre', 2)
    state = insertProcessSlot(state, hopper.uid, 'input', 'log', 1)
    state = insertProcessSlot(state, hopper.uid, 'secondaryInput', 'plank', processStackLimit)
    state = insertProcessSlot(state, hopper.uid, 'fuel', 'coal', processStackLimit)
    state = insertProcessSlot(state, hopper.uid, 'output', 'copperOre', processStackLimit)

    const nextChest = state.machineInstances.find((instance) => instance.uid === chest.uid)!
    const nextHopper = state.machineInstances.find((instance) => instance.uid === hopper.uid)!
    expect(nextChest.process.input).toEqual({ id: 'log', amount: 3 })
    expect(nextChest.process.secondaryInput).toEqual({ id: 'ironOre', amount: 2 })
    expect(nextHopper.process.input).toEqual({ id: 'log', amount: 1 })
    expect(nextHopper.process.secondaryInput).toEqual({ id: 'plank', amount: processStackLimit })
    expect(nextHopper.process.fuel).toEqual({ id: 'coal', amount: processStackLimit })
    expect(nextHopper.process.output).toEqual({ id: 'copperOre', amount: processStackLimit })
  })

  it('wrench-configured hoppers drip feed accepted items into the chosen adjacent machine', () => {
    let state = createFactoryState(1000)
    state.machines.hopper = 1
    state.machines.furnace = 1
    state.resources.ironOre = 3
    state = placeMachineInstance(state, 'hopper', 0, 0)
    state = placeMachineInstance(state, 'furnace', 1, 0)
    const hopper = state.machineInstances.find((instance) => instance.machineId === 'hopper')!
    const furnace = state.machineInstances.find((instance) => instance.machineId === 'furnace')!
    state = insertProcessSlot(state, hopper.uid, 'input', 'ironOre', 3)

    state = tickGame(state, 3000, 4000).state
    expect(state.machineInstances.find((instance) => instance.uid === furnace.uid)!.process.input).toBeNull()

    state = setHopperOutputDirection(state, hopper.uid, 'east')
    expect(pipeSideMode(state.machineInstances.find((instance) => instance.uid === hopper.uid)!, 'east')).toBe('output')
    state = tickGame(state, 2500, 6500).state

    expect(state.machineInstances.find((instance) => instance.uid === hopper.uid)!.process.input).toEqual({ id: 'ironOre', amount: 1 })
    expect(state.machineInstances.find((instance) => instance.uid === furnace.uid)!.process.input).toEqual({ id: 'ironOre', amount: 2 })
  })

  it('hoppers feed valid items from any internal storage slot', () => {
    let state = createFactoryState(1000)
    state.machines.hopper = 1
    state.machines.furnace = 1
    state.resources.rubberSap = 1
    state.resources.ironOre = 2
    state = placeMachineInstance(state, 'hopper', 0, 0)
    state = placeMachineInstance(state, 'furnace', 1, 0)
    const hopper = state.machineInstances.find((instance) => instance.machineId === 'hopper')!
    const furnace = state.machineInstances.find((instance) => instance.machineId === 'furnace')!
    state = insertProcessSlot(state, hopper.uid, 'input', 'rubberSap', 1)
    state = insertProcessSlot(state, hopper.uid, 'output', 'ironOre', 2)
    state = setHopperOutputDirection(state, hopper.uid, 'east')

    state = tickGame(state, 2100, 3100).state

    const nextHopper = state.machineInstances.find((instance) => instance.uid === hopper.uid)!
    const nextFurnace = state.machineInstances.find((instance) => instance.uid === furnace.uid)!
    expect(nextHopper.process.input).toEqual({ id: 'rubberSap', amount: 1 })
    expect(nextHopper.process.output).toBeNull()
    expect(nextFurnace.process.input).toEqual({ id: 'ironOre', amount: 2 })
  })

  it('automates a hopper through an LV macerator and furnace into a chest', () => {
    let state = createFactoryState(1000)
    Object.assign(state.machines, { hopper: 1, lvMacerator: 1, lvFurnace: 1, standardChest: 1 })
    state.resources.ironOre = 1
    state = placeMachineInstance(state, 'hopper', 0, 0)
    state = placeMachineInstance(state, 'lvMacerator', 1, 0)
    state = placeMachineInstance(state, 'lvFurnace', 2, 0)
    state = placeMachineInstance(state, 'standardChest', 3, 0)
    const hopper = state.machineInstances.find((instance) => instance.machineId === 'hopper')!
    const macerator = state.machineInstances.find((instance) => instance.machineId === 'lvMacerator')!
    const furnace = state.machineInstances.find((instance) => instance.machineId === 'lvFurnace')!
    state = insertProcessSlot(state, hopper.uid, 'input', 'ironOre', 1)
    state = setHopperOutputDirection(state, hopper.uid, 'east')
    state = setLvItemOutputDirection(state, macerator.uid, 'east')
    state = setLvItemOutputDirection(state, furnace.uid, 'east')

    for (let second = 0; second < 30; second += 1) {
      for (const instance of state.machineInstances) {
        if (instance.machineId === 'lvMacerator' || instance.machineId === 'lvFurnace') instance.process.euStored = 128
      }
      state = tickGame(state, 1000).state
    }

    const chest = state.machineInstances.find((instance) => instance.machineId === 'standardChest')!
    expect(chest.process.storageSlots).toContainEqual({ id: 'ironIngot', amount: 3 })
    expect(state.machineInstances.find((instance) => instance.uid === macerator.uid)?.process.output).toBeNull()
    expect(state.machineInstances.find((instance) => instance.uid === furnace.uid)?.process.output).toBeNull()
  })

  it('keeps machine output stored when the destination face is also an output', () => {
    let state = createFactoryState(1000)
    state.machines.lvMacerator = 1
    state.machines.lvFurnace = 1
    state = placeMachineInstance(state, 'lvMacerator', 0, 0)
    state = placeMachineInstance(state, 'lvFurnace', 1, 0)
    const macerator = state.machineInstances.find((instance) => instance.machineId === 'lvMacerator')!
    const furnace = state.machineInstances.find((instance) => instance.machineId === 'lvFurnace')!
    state.machineInstances.find((instance) => instance.uid === macerator.uid)!.process.output = { id: 'crushedIronOre', amount: 2 }
    state = setLvItemOutputDirection(state, macerator.uid, 'east')
    state = setLvItemOutputDirection(state, furnace.uid, 'west')

    state = tickGame(state, 2000).state

    const nextMacerator = state.machineInstances.find((instance) => instance.uid === macerator.uid)!
    expect(nextMacerator.process.output).toEqual({ id: 'crushedIronOre', amount: 2 })
    expect(state.machineInstances.find((instance) => instance.uid === furnace.uid)?.process.input).toBeNull()
    expect(lvItemAutomationStatus(state, nextMacerator).code).toBe('output-conflict')
  })

  it('hoppers feed formed coke ovens through adjacent multiblock parts', () => {
    let state = createFactoryState(1000)
    state.machines.cokeOvenPart = 4
    state.machines.hopper = 1
    state.resources.coal = 2

    for (const [x, y] of [
      [1, 1],
      [2, 1],
      [1, 2],
      [2, 2],
    ] as const) {
      state = placeMachineInstance(state, 'cokeOvenPart', x, y)
    }
    state = placeMachineInstance(state, 'hopper', 3, 2)

    const hopper = state.machineInstances.find((instance) => instance.machineId === 'hopper')!
    const cokeOven = state.machineInstances.find((instance) => instance.machineId === 'cokeOven')!
    expect(state.machineInstances.find((instance) => instance.x === 2 && instance.y === 2)?.machineId).toBe('cokeOvenPart')

    state = insertProcessSlot(state, hopper.uid, 'input', 'coal', 2)
    state = setHopperOutputDirection(state, hopper.uid, 'west')
    state = tickGame(state, 1200, 2200).state

    expect(state.machineInstances.find((instance) => instance.uid === hopper.uid)!.process.input).toEqual({ id: 'coal', amount: 1 })
    expect(state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!.process.input).toEqual({ id: 'coal', amount: 1 })
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

  it('smelts cobblestone back into stone in furnace and steam furnace', () => {
    expect(processRecipes.find((recipe) => recipe.id === 'smelt_stone')).toMatchObject({
      machineId: 'furnace',
      input: { id: 'cobblestone', amount: 1 },
      output: { id: 'stone', amount: 1 },
    })
    expect(processRecipes.find((recipe) => recipe.id === 'steam_furnace_stone')).toMatchObject({
      machineId: 'steamFurnace',
      input: { id: 'cobblestone', amount: 1 },
      output: { id: 'stone', amount: 1 },
    })
  })

  it('continues furnace processing during offline progress and respects full outputs', () => {
    let state = createFactoryState(1000)
    state.machines.furnace = 1
    state.resources.log = 2
    state = placeMachineInstance(state, 'furnace', 0, 0)
    const furnace = state.machineInstances[0]
    state = insertProcessSlot(state, furnace.uid, 'input', 'log', 1)
    state = insertProcessSlot(state, furnace.uid, 'fuel', 'log', 1)

    let offline = simulateOfflineProgress(state, 10_000, 11_000).state

    expect(offline.machineInstances[0].process.output).toEqual({ id: 'charcoal', amount: 1 })

    offline.machineInstances[0].process.output = { id: 'charcoal', amount: processStackLimit }
    offline = simulateOfflineProgress(offline, 60_000, 71_000).state

    expect(offline.machineInstances[0].process.output).toEqual({ id: 'charcoal', amount: processStackLimit })
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
    state.resources.ironPlate = 19
    state.resources.brick = 8
    state.resources.bronzePlate = 14
    state.resources.bronzeRod = 6
    state.resources.copperPlate = 5
    state.resources.copperRod = 7
    state.resources.ironRod = 4
    state.resources.steamCasing = 2
    state.resources.bronzeMortar = 2
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

  it('uses terminal grids or processing machines for every recipe', () => {
    const looseHandRecipes = recipes.filter((recipe) => {
      if (recipe.recipeType && recipe.recipeType !== 'crafting') return false
      if (recipe.stationType && recipe.stationType !== 'hand') return false
      if (recipe.machineInputs?.length) return false
      return !recipeFitsTerminalGrid(recipe)
    })
    expect(looseHandRecipes.map((recipe) => recipe.id)).toEqual([])
    expect(recipes.filter((recipe) => recipe.recipeType === 'machine').map((recipe) => recipe.id)).toEqual([])
  })

  it('builds every core Steam machine around one heavy riveted casing', () => {
    const steamMachineRecipeIds = [
      'build_steam_boiler',
      'build_steam_macerator',
      'build_steam_forge_hammer',
      'build_steam_compressor',
      'build_steam_extractor',
      'build_steam_alloy_smelter',
      'build_steam_furnace',
      'build_steam_auto_miner',
    ]

    for (const recipeId of steamMachineRecipeIds) {
      const recipe = recipes.find((candidate) => candidate.id === recipeId)!
      expect(recipe.inputs).toContainEqual({ id: 'steamCasing', amount: 1 })
      expect(recipeFitsTerminalGrid(recipe), recipeId).toBe(true)
      expect(recipe.pattern?.every(Boolean), recipeId).toBe(true)
    }

    const casing = recipes.find((recipe) => recipe.id === 'craft_steam_casing')!
    expect(casing.inputs).toEqual([{ id: 'bronzePlate', amount: 8 }])
    expect(casing.catalysts).toEqual([{ id: 'bronzeWrench', amount: 1 }])
    expect(casing.durabilityCosts).toEqual([{ id: 'bronzeWrench', amount: 1 }])
    expect(casing.pattern).toEqual([
      'bronzePlate', 'bronzePlate', 'bronzePlate',
      'bronzePlate', 'bronzeWrench', 'bronzePlate',
      'bronzePlate', 'bronzePlate', 'bronzePlate',
    ])
  })

  it('uses filled 3x3 grids for machine crafts except primitive furnace', () => {
    const machineCrafts = recipes.filter((recipe) => recipe.machineOutputs?.length)
    const exceptions = new Set([
      'build_furnace',
      'stage_arc_blast_furnace_casing',
      'lv_energy_hatch_2a',
      'lv_input_bus',
      'lv_output_bus',
      'lv_fluid_input_hatch',
      'lv_fluid_output_hatch',
    ])

    for (const recipe of machineCrafts) {
      if (exceptions.has(recipe.id)) continue
      expect(recipe.pattern, `${recipe.id} should define a shaped 3x3 machine recipe`).toHaveLength(9)
      expect(recipe.pattern?.every(Boolean), `${recipe.id} should fill every slot`).toBe(true)
    }

    expect(recipes.find((recipe) => recipe.id === 'build_furnace')?.pattern?.filter(Boolean)).toHaveLength(8)
  })

  it('crafts LV casing and hull before LV machines consume hulls', () => {
    let state = createFactoryState(1000)
    state.resources.steelPlate = 13
    state.resources.ironPlate = 4
    state.resources.tinWire = 8
    state.resources.bronzePlate = 1
    state.resources.bronzeRod = 2
    state.resources.primitiveCircuit = 1

    const casing = recipes.find((recipe) => recipe.id === 'craft_lv_machine_casing')!
    const hull = recipes.find((recipe) => recipe.id === 'craft_lv_machine_hull')!
    const turbine = recipes.find((recipe) => recipe.id === 'build_steam_turbine')!

    expect(casing.pattern?.every(Boolean)).toBe(true)
    expect(hull.pattern?.every(Boolean)).toBe(true)
    expect(turbine.inputs).toContainEqual({ id: 'lvMachineHull', amount: 1 })

    state = craftRecipeInstant(state, casing, 1)
    state = craftRecipeInstant(state, hull, 1)
    state = craftRecipeInstant(state, turbine, 1)

    expect(state.resources.lvMachineCasing).toBe(0)
    expect(state.resources.lvMachineHull).toBe(0)
    expect(state.machines.steamTurbine).toBe(1)
  })

  it('crafts BBF casing items and assembles them into factory multiblock parts', () => {
    let state = createFactoryState(1000)
    state.resources.firebrick = 6
    state.resources.ironPlate = 2
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

    state.resources.bbfCasing = 8
    const blastFurnace = recipes.find((recipe) => recipe.id === 'build_bricked_blast_furnace')!
    expect(recipeFitsTerminalGrid(blastFurnace)).toBe(true)
    expect(canCraft(state, blastFurnace)).toBe(true)

    state = craftRecipeInstant(state, blastFurnace, 1)

    expect(state.resources.bbfCasing).toBe(0)
    expect(state.machines.brickedBlastFurnacePart).toBe(4)
    expect(state.machines.brickedBlastFurnace).toBe(0)
  })

  it('crafts the expensive Arc Furnace controller in the terminal grid', () => {
    let state = createFactoryState(1000)
    state.resources.heatProofCasing = 1
    state.resources.invarPlate = 4
    state.resources.primitiveCircuit = 3
    state.resources.ironWrench = 1
    const arcFurnace = recipes.find((recipe) => recipe.id === 'build_arc_blast_furnace')!

    expect(recipeFitsTerminalGrid(arcFurnace)).toBe(true)
    expect(arcFurnace.inputs).toEqual([
      { id: 'heatProofCasing', amount: 1 },
      { id: 'invarPlate', amount: 4 },
      { id: 'primitiveCircuit', amount: 3 },
    ])
    expect(canCraft(state, arcFurnace)).toBe(true)

    state = craftRecipeInstant(state, arcFurnace, 1)

    expect(state.resources.heatProofCasing).toBe(0)
    expect(state.resources.invarPlate).toBe(0)
    expect(state.resources.primitiveCircuit).toBe(0)
    expect(state.machines.arcBlastFurnace).toBe(1)
  })

  it('assembles and forms a Coke Oven from four 2x2 multiblock parts', () => {
    let state = createFactoryState(1000)
    state.resources.cokeOvenBrick = 24
    state.resources.ironPlate = 8
    state.resources.pipeSealant = 4
    state.resources.bronzeWrench = 1
    const cokeOven = recipes.find((recipe) => recipe.id === 'build_coke_oven')!

    expect(recipeFitsTerminalGrid(cokeOven)).toBe(true)
    expect(cokeOven.inputs).toEqual([
      { id: 'cokeOvenBrick', amount: 6 },
      { id: 'ironPlate', amount: 2 },
      { id: 'pipeSealant', amount: 1 },
    ])
    expect(canCraft(state, cokeOven)).toBe(true)

    state = craftRecipeInstant(state, cokeOven, 4)

    expect(state.resources.cokeOvenBrick).toBe(0)
    expect(state.resources.ironPlate).toBe(0)
    expect(state.resources.pipeSealant).toBe(0)
    expect(state.machines.cokeOvenPart).toBe(4)
    expect(state.machines.cokeOven).toBe(0)

    for (let y = 0; y < 2; y += 1) {
      for (let x = 0; x < 2; x += 1) {
        state = placeMachineInstance(state, 'cokeOvenPart', x, y)
      }
    }

    expect(state.machineInstances).toHaveLength(4)
    expect(state.machineInstances.find((instance) => instance.x === 0 && instance.y === 0)?.machineId).toBe('cokeOven')
    expect(state.machineInstances.filter((instance) => instance.machineId === 'cokeOvenPart')).toHaveLength(3)
    expect(state.machines.cokeOvenPart).toBe(3)
    expect(state.machines.cokeOven).toBe(1)
    expect(availableUnplacedMachineCount(state, 'cokeOvenPart')).toBe(0)

    state.resources.ironCrowbar = 1
    const controller = state.machineInstances.find((instance) => instance.machineId === 'cokeOven')!
    state = crowbarRemoveMachineInstance(state, controller.uid)

    expect(state.machineInstances).toHaveLength(0)
    expect(state.machines.cokeOvenPart).toBe(4)
    expect(state.machines.cokeOven).toBe(0)
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

    state.resources.ironCrowbar = 1
    const controller = state.machineInstances.find((instance) => instance.machineId === 'brickedBlastFurnace')!
    state = crowbarRemoveMachineInstance(state, controller.uid)

    expect(state.machineInstances).toHaveLength(0)
    expect(state.machines.brickedBlastFurnacePart).toBe(4)
    expect(state.machines.brickedBlastFurnace).toBe(0)
    expect(availableUnplacedMachineCount(state, 'brickedBlastFurnacePart')).toBe(4)
    expect(durabilityRemaining(state, 'ironCrowbar')).toBe(127)
  })

  it('forms a flexible 3x3 Arc Furnace and invalidates it when a casing is removed', () => {
    let state = createFactoryState(1000)
    state.machines.arcBlastFurnacePart = 4
    state.machines.arcBlastFurnace = 1
    state.machines.lvEnergyHatch2A = 2
    state.machines.lvInputBus = 1
    state.machines.lvOutputBus = 1
    state = placeMachineInstance(state, 'lvEnergyHatch2A', 0, 0)
    state = placeMachineInstance(state, 'lvEnergyHatch2A', 1, 0)
    state = placeMachineInstance(state, 'arcBlastFurnacePart', 2, 0)
    state = placeMachineInstance(state, 'lvInputBus', 0, 1)
    state = placeMachineInstance(state, 'arcBlastFurnace', 1, 1)
    state = placeMachineInstance(state, 'lvOutputBus', 2, 1)
    state = placeMachineInstance(state, 'arcBlastFurnacePart', 0, 2)
    state = placeMachineInstance(state, 'arcBlastFurnacePart', 1, 2)
    state = placeMachineInstance(state, 'arcBlastFurnacePart', 2, 2)

    const controller = state.machineInstances.find((instance) => instance.machineId === 'arcBlastFurnace')!
    expect(arcBlastFurnaceStructureForInstance(state, controller)?.formed).toBe(true)
    state.resources.aluminiumDust = 1
    state = insertProcessSlot(state, controller.uid, 'input', 'aluminiumDust', 1)
    state.machineInstances.find((instance) => instance.uid === controller.uid)!.process.activeRecipeId = 'arc_blast_aluminium'
    state.machineInstances.find((instance) => instance.uid === controller.uid)!.process.progressMs = 1000

    state.resources.ironCrowbar = 1
    const casing = state.machineInstances.find((instance) => instance.machineId === 'arcBlastFurnacePart')!
    state = crowbarRemoveMachineInstance(state, casing.uid)

    expect(state.machineInstances).toHaveLength(8)
    expect(arcBlastFurnaceStructureForInstance(state, state.machineInstances.find((instance) => instance.uid === controller.uid)!)?.formed).toBe(false)
    expect(state.machineInstances.find((instance) => instance.machineId === 'lvInputBus')?.process.input).toBeNull()
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

    expect(state.machineInstances.find((instance) => instance.uid === adjacentBoiler.uid)!.process.steamStoredMs).toBe(12000)
    expect(state.machineInstances.find((instance) => instance.uid === distantBoiler.uid)!.process.steamStoredMs).toBe(0)
  })

  it('uses wells connected through configured pipes to supply steam boilers', () => {
    let state = createFactoryState(1000)
    state.machines.well = 1
    state.machines.copperPipe = 1
    state.machines.steamBoiler = 1
    state.resources.log = 1
    state = placeMachineInstance(state, 'well', 0, 0)
    state = placeMachineInstance(state, 'copperPipe', 1, 0)
    state = placeMachineInstance(state, 'steamBoiler', 2, 0)
    state = configurePlacedConnector(state, 'copperPipe', { west: 'input', east: 'output' })
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    const well = state.machineInstances.find((instance) => instance.machineId === 'well')!
    well.process.fluids.water = 64

    expect(boilerHasWater(state, boiler)).toBe(true)
    expect(currentWellWaterFlowLitresPerSecond(state, well)).toBe(24)

    state = insertProcessSlot(state, boiler.uid, 'fuel', 'log', 1)
    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process.steamStoredMs).toBe(12000)
  })

  it('moves water at Bronze pipe throughput and exposes live pipe contents', () => {
    let state = createFactoryState(1000)
    state.machines.well = 1
    state.machines.bronzePipe = 1
    state.machines.steamBoiler = 1
    state.resources.log = 1
    state = placeMachineInstance(state, 'well', 0, 0)
    state = placeMachineInstance(state, 'bronzePipe', 1, 0)
    state = placeMachineInstance(state, 'steamBoiler', 2, 0)
    state = configurePlacedConnector(state, 'bronzePipe', { west: 'input', east: 'output' })
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    const well = state.machineInstances.find((instance) => instance.machineId === 'well')!
    state = insertProcessSlot(state, boiler.uid, 'fuel', 'log', 1)

    expect(currentWellWaterFlowLitresPerSecond(state, well)).toBe(48)
    state = tickGame(state, 1000).state

    const pipe = state.machineInstances.find((instance) => instance.machineId === 'bronzePipe')!
    const activeWell = state.machineInstances.find((instance) => instance.machineId === 'well')!
    expect(currentWellWaterFlowLitresPerSecond(state, activeWell)).toBe(48)
    expect(pipe.process.fluids.water).toBeGreaterThan(0)
    expect(state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process.steamStoredMs).toBe(12000)
  })

  it('lets an Iron route drain the Well buffer above its recovery rate', () => {
    let state = createFactoryState(1000)
    state.machines.well = 1
    state.machines.ironPipe = 1
    state.machines.steamBoiler = 1
    state.resources.log = 1
    state = placeMachineInstance(state, 'well', 0, 0)
    state = placeMachineInstance(state, 'ironPipe', 1, 0)
    state = placeMachineInstance(state, 'steamBoiler', 2, 0)
    state = configurePlacedConnector(state, 'ironPipe', { west: 'input', east: 'output' })
    const well = state.machineInstances.find((instance) => instance.machineId === 'well')!
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    well.process.fluids.water = 128
    state = insertProcessSlot(state, boiler.uid, 'fuel', 'log', 1)

    expect(wellWaterOutputLitresPerSecond).toBe(96)
    expect(currentWellWaterFlowLitresPerSecond(state, well)).toBe(96)
    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === well.uid)!.process.fluids.water).toBe(32)
    expect(state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process.steamStoredMs).toBe(12000)
  })

  it('applies source discharge and route limits to stored fluids', () => {
    expect(machines.well.fluidOutputLitresPerSecond).toBe(96)
    expect(machines.cokeOven.fluidOutputLitresPerSecond).toBe(24)
    expect(machines.steamTank.fluidOutputLitresPerSecond).toBe(96)

    let state = createFactoryState(1000)
    state.machines.steamTank = 1
    state.machines.ironPipe = 1
    state.machines.liquidSteamBoiler = 1
    state = placeMachineInstance(state, 'steamTank', 0, 0)
    state = placeMachineInstance(state, 'ironPipe', 1, 0)
    state = placeMachineInstance(state, 'liquidSteamBoiler', 2, 0)
    state = configurePlacedConnector(state, 'ironPipe', { west: 'input', east: 'output' })
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    tank.process.fluids.creosote = 128

    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === tank.uid)!.process.fluids.creosote).toBe(32)
    expect(state.machineInstances.find((instance) => instance.machineId === 'liquidSteamBoiler')!.process.fluids.creosote).toBe(96)
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

    expect(state.machineInstances.filter((instance) => instance.machineId === 'steamBoiler').reduce((sum, instance) => sum + instance.process.steamStoredMs, 0)).toBe(48000)
    expect(state.machineInstances.find((instance) => instance.machineId === 'well')?.process.fluids.water).toBe(0)
  })

  it('uses a 128L steam boiler buffer', () => {
    expect(boilerSteamCapacityMs).toBe(128000)
  })

  it('pauses current boiler fuel while full and resumes when steam is drained', () => {
    let state = createFactoryState(1000)
    state.machines.well = 1
    state.machines.steamBoiler = 1
    state.machines.steamTank = 1
    state.resources.coal = 2
    state = placeMachineInstance(state, 'well', 0, 0)
    state = placeMachineInstance(state, 'steamBoiler', 1, 0)
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    state = insertProcessSlot(state, boiler.uid, 'fuel', 'coal', 2)
    state = tickGame(state, 80000).state

    let process = state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process
    expect(process.steamStoredMs).toBe(128000)
    expect(process.fuelRemainingMs).toBeGreaterThan(69000)
    expect(process.fuel?.amount).toBe(1)
    const pausedFuelRemainingMs = process.fuelRemainingMs

    state = tickGame(state, 48000).state
    process = state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process
    expect(process.steamStoredMs).toBe(128000)
    expect(process.fuelRemainingMs).toBe(pausedFuelRemainingMs)
    expect(process.fuel?.amount).toBe(1)

    state = placeMachineInstance(state, 'steamTank', 2, 0)
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    state = tickGame(state, 1000).state
    expect(state.machineInstances.find((instance) => instance.uid === tank.uid)!.process.steamStoredMs).toBe(24000)

    state = tickGame(state, 1000).state
    process = state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process
    expect(process.fuelRemainingMs).toBe(pausedFuelRemainingMs - 1000)
    expect(process.fuel?.amount).toBe(1)
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
    expect(boilerProcess.steamStoredMs).toBe(96000)
  })

  it('continues steam machine processing during offline progress', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 1
    state.machines.steamMacerator = 1
    state.resources.copperOre = 1
    state = placeMachineInstance(state, 'steamTank', 0, 0)
    state = placeMachineInstance(state, 'steamMacerator', 1, 0)
    state.machineInstances.find((instance) => instance.machineId === 'steamTank')!.process.steamStoredMs = steamTankCapacityMs
    const macerator = state.machineInstances.find((instance) => instance.machineId === 'steamMacerator')!
    state = insertProcessSlot(state, macerator.uid, 'input', 'copperOre', 1)

    const offline = simulateOfflineProgress(state, 80_000, 81_000).state
    const nextMacerator = offline.machineInstances.find((instance) => instance.uid === macerator.uid)!

    expect(nextMacerator.process.output).toEqual({ id: 'crushedCopperOre', amount: 2 })
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
    state = configurePlacedConnector(state, 'copperPipe', { west: 'input', east: 'output' })
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    boiler.process.steamStoredMs = 80000

    state = tickGame(state, 10000).state

    const tankProcess = state.machineInstances.find((instance) => instance.uid === tank.uid)!.process
    const boilerProcess = state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process
    expect(tankProcess.steamCapacityMs).toBe(steamTankCapacityMs)
    expect(tankProcess.steamStoredMs).toBe(80000)
    expect(boilerProcess.steamStoredMs).toBe(0)
  })

  it('lets one steam boiler sustain three light steam machines over normal ticking', () => {
    let state = createFactoryState(1000)
    state.machines.well = 1
    state.machines.steamBoiler = 1
    state.machines.steamForgeHammer = 1
    state.machines.steamCompressor = 1
    state.machines.steamExtractor = 1
    state.resources.coal = 1
    state.resources.ironIngot = 2
    state.resources.firebrick = 2
    state.resources.rubberSap = 1
    state = placeMachineInstance(state, 'well', 1, 0)
    state = placeMachineInstance(state, 'steamBoiler', 1, 1)
    state = placeMachineInstance(state, 'steamForgeHammer', 2, 1)
    state = placeMachineInstance(state, 'steamCompressor', 1, 2)
    state = placeMachineInstance(state, 'steamExtractor', 0, 1)
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    const hammer = state.machineInstances.find((instance) => instance.machineId === 'steamForgeHammer')!
    const compressor = state.machineInstances.find((instance) => instance.machineId === 'steamCompressor')!
    const extractor = state.machineInstances.find((instance) => instance.machineId === 'steamExtractor')!
    state = insertProcessSlot(state, boiler.uid, 'fuel', 'coal', 1)
    state = insertProcessSlot(state, hammer.uid, 'input', 'ironIngot', 2)
    state = insertProcessSlot(state, compressor.uid, 'input', 'firebrick', 2)
    state = insertProcessSlot(state, extractor.uid, 'input', 'rubberSap', 1)

    for (let elapsed = 0; elapsed < 20_000; elapsed += 250) {
      state = tickGame(state, 250).state
    }

    expect(state.machineInstances.find((instance) => instance.uid === hammer.uid)!.process.output).toEqual({ id: 'ironPlate', amount: 1 })
    expect(state.machineInstances.find((instance) => instance.uid === compressor.uid)!.process.output).toEqual({ id: 'cokeOvenBrick', amount: 1 })
    expect(state.machineInstances.find((instance) => instance.uid === extractor.uid)!.process.output).toEqual({ id: 'rubber', amount: 1 })
  })

  it('lets pipe side configuration block and restore connected steam routing', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 1
    state.machines.copperPipe = 1
    state.machines.steamMacerator = 1
    state = placeMachineInstance(state, 'steamTank', 0, 0)
    state = placeMachineInstance(state, 'copperPipe', 1, 0)
    state = placeMachineInstance(state, 'steamMacerator', 2, 0)
    state = configurePlacedConnector(state, 'copperPipe', { west: 'input', east: 'output' })
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    const pipe = state.machineInstances.find((instance) => instance.machineId === 'copperPipe')!
    const macerator = state.machineInstances.find((instance) => instance.machineId === 'steamMacerator')!
    tank.process.steamStoredMs = steamTankCapacityMs

    expect(availableConnectedSteam(state, macerator)).toBe(steamTankCapacityMs)

    state = setPipeSideDisabled(state, pipe.uid, 'east', true)

    expect(availableConnectedSteam(state, macerator)).toBe(0)

    state = setPipeSideDisabled(state, pipe.uid, 'east', false)

    expect(availableConnectedSteam(state, macerator)).toBe(steamTankCapacityMs)
  })

  it('records collected machine outputs as permanent production milestones', () => {
    let state = createFactoryState(1000)
    state.machines.furnace = 1
    state = placeMachineInstance(state, 'furnace', 0, 0)
    const furnace = state.machineInstances.find((instance) => instance.machineId === 'furnace')!
    furnace.process.output = { id: 'ironIngot', amount: 2 }

    state = collectProcessOutput(state, furnace.uid)
    state.resources.ironIngot = 0

    expect(state.resourceMilestones.ironIngot).toBe(2)
    expect(state.craftedResources).toContain('ironIngot')
    expect(state.discoveredResources).toContain('ironIngot')
  })

  it('places new pipes with every side closed until the player configures flow', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 1
    state.machines.copperPipe = 1
    state.machines.steamMacerator = 1
    state = placeMachineInstance(state, 'steamTank', 0, 0)
    state = placeMachineInstance(state, 'copperPipe', 1, 0)
    state = placeMachineInstance(state, 'steamMacerator', 2, 0)
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    const pipe = state.machineInstances.find((instance) => instance.machineId === 'copperPipe')!
    const macerator = state.machineInstances.find((instance) => instance.machineId === 'steamMacerator')!
    tank.process.steamStoredMs = steamTankCapacityMs

    expect(pipeSideMode(pipe, 'west')).toBe('blocked')
    expect(pipeSideMode(pipe, 'east')).toBe('blocked')
    expect(availableConnectedSteam(state, macerator)).toBe(0)
  })

  it('auto-connects newly placed pipes to compatible pipes but not machines', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 1
    state.machines.copperPipe = 2
    state.machines.steamMacerator = 1
    state = placeMachineInstance(state, 'steamTank', 0, 0)
    state = placeMachineInstance(state, 'copperPipe', 1, 0)
    state = placeMachineInstance(state, 'copperPipe', 2, 0)
    state = placeMachineInstance(state, 'steamMacerator', 3, 0)
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    const firstPipe = state.machineInstances.find((instance) => instance.x === 1 && instance.y === 0)!
    const secondPipe = state.machineInstances.find((instance) => instance.x === 2 && instance.y === 0)!
    const macerator = state.machineInstances.find((instance) => instance.machineId === 'steamMacerator')!
    tank.process.steamStoredMs = steamTankCapacityMs

    expect(pipeSideMode(firstPipe, 'west')).toBe('blocked')
    expect(pipeSideMode(firstPipe, 'east')).toBe('both')
    expect(pipeSideMode(secondPipe, 'west')).toBe('both')
    expect(pipeSideMode(secondPipe, 'east')).toBe('blocked')
    expect(availableConnectedSteam(state, macerator)).toBe(0)
  })

  it('fills pipe display buffers and reports current steam flow on configured pipe lines', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 1
    state.machines.copperPipe = 2
    state.machines.steamMacerator = 1
    state = placeMachineInstance(state, 'steamTank', 0, 0)
    state = placeMachineInstance(state, 'copperPipe', 1, 0)
    state = placeMachineInstance(state, 'copperPipe', 2, 0)
    state = placeMachineInstance(state, 'steamMacerator', 3, 0)
    let firstPipe = state.machineInstances.find((instance) => instance.x === 1 && instance.y === 0)!
    let secondPipe = state.machineInstances.find((instance) => instance.x === 2 && instance.y === 0)!
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    tank.process.steamStoredMs = 64000
    state = setPipeSideMode(state, firstPipe.uid, 'west', 'input')
    state = setPipeSideMode(state, secondPipe.uid, 'east', 'output')

    state = tickGame(state, 1000).state

    firstPipe = state.machineInstances.find((instance) => instance.x === 1 && instance.y === 0)!
    secondPipe = state.machineInstances.find((instance) => instance.x === 2 && instance.y === 0)!
    expect(firstPipe.process.steamCapacityMs).toBe(steamPipeBufferCapacityMs('copperPipe'))
    expect(firstPipe.process.steamStoredMs).toBeGreaterThan(0)
    expect(secondPipe.process.steamStoredMs).toBeGreaterThan(0)
    expect(currentSteamPipeFlowLitresPerSecond(state, firstPipe)).toBeGreaterThan(0)
  })

  it('shares one steam pipe transfer budget across multiple consumers', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 1
    state.machines.copperPipe = 1
    state.machines.steamMacerator = 2
    state = placeMachineInstance(state, 'steamTank', 0, 0)
    state = placeMachineInstance(state, 'copperPipe', 1, 0)
    state = placeMachineInstance(state, 'steamMacerator', 2, 0)
    state = placeMachineInstance(state, 'steamMacerator', 1, 1)
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    const pipe = state.machineInstances.find((instance) => instance.machineId === 'copperPipe')!
    tank.process.steamStoredMs = steamTankCapacityMs
    state = setPipeSideMode(state, pipe.uid, 'west', 'input')
    state = setPipeSideMode(state, pipe.uid, 'east', 'output')
    state = setPipeSideMode(state, pipe.uid, 'south', 'output')

    state = tickGame(state, 1000).state

    const storedSteam = state.machineInstances
      .filter((instance) => instance.machineId === 'steamMacerator')
      .reduce((sum, instance) => sum + instance.process.steamStoredMs, 0)
    expect(storedSteam).toBeLessThanOrEqual(24 * steamMsPerLitre)
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

    expect(state.machineInstances.find((instance) => instance.uid === tank.uid)!.process.steamStoredMs).toBe(20000)
    expect(state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process.steamStoredMs).toBe(0)
  })

  it('keeps a single iron steam tank at 512L storage', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 1
    state = placeMachineInstance(state, 'steamTank', 0, 0)
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!

    state = tickGame(state, 1000).state
    const nextTank = state.machineInstances.find((instance) => instance.uid === tank.uid)!

    expect(steamTankStructureForInstance(state, nextTank)).toBeNull()
    expect(steamTankCapacityMsForInstance(state, nextTank)).toBe(steamTankCapacityMs)
    expect(steamTankFluidCapacityLitresForInstance(state, nextTank)).toBe(ironTankFluidCapacityLitres)
    expect(nextTank.process.steamCapacityMs).toBe(steamTankCapacityMs)
  })

  it.each([
    [2, 2, 4],
    [3, 2, 6],
    [3, 3, 9],
  ])('forms a %ix%i iron steam tank with 512L storage per tank block', (width, height, area) => {
    let state = createFactoryState(1000)
    state.machines.steamTank = area
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        state = placeMachineInstance(state, 'steamTank', x, y)
      }
    }

    const controller = state.machineInstances.find((instance) => instance.x === 0 && instance.y === 0)!
    const structure = steamTankStructureForInstance(state, controller)!

    expect(structure.width).toBe(width)
    expect(structure.height).toBe(height)
    expect(structure.area).toBe(area)
    expect(controller.level).toBe(area)
    expect(steamTankCapacityMsForInstance(state, controller)).toBe(steamTankCapacityMs * area)
    expect(steamTankFluidCapacityLitresForInstance(state, controller)).toBe(ironTankFluidCapacityLitres * area)
    for (const tank of state.machineInstances.filter((instance) => instance.uid !== controller.uid)) {
      expect(tank.level).toBe(0)
      expect(steamTankStructureForInstance(state, tank)?.controller.uid).toBe(controller.uid)
    }
  })

  it('keeps one liquid type when forming a steam tank structure that already has steam', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 4
    state = placeMachineInstance(state, 'steamTank', 1, 0)
    state = placeMachineInstance(state, 'steamTank', 0, 0)
    state = placeMachineInstance(state, 'steamTank', 0, 1)
    const firstTank = state.machineInstances.find((instance) => instance.x === 0 && instance.y === 0)!
    firstTank.process.steamStoredMs = steamTankCapacityMs
    firstTank.process.fluids.creosote = 64
    state = placeMachineInstance(state, 'steamTank', 1, 1)

    const controller = state.machineInstances.find((instance) => instance.x === 0 && instance.y === 0)!

    expect(steamTankStructureForInstance(state, controller)?.area).toBe(4)
    expect(controller.process.steamStoredMs).toBe(steamTankCapacityMs)
    expect(controller.process.fluids.creosote).toBe(64)
  })

  it('removes an entire formed iron steam tank structure from any cell', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 4
    for (let y = 0; y < 2; y += 1) {
      for (let x = 0; x < 2; x += 1) {
        state = placeMachineInstance(state, 'steamTank', x, y)
      }
    }
    const child = state.machineInstances.find((instance) => instance.x === 1 && instance.y === 1)!

    state = removeMachineInstance(state, child.uid)

    expect(state.machineInstances.filter((instance) => instance.machineId === 'steamTank')).toHaveLength(0)
    expect(availableUnplacedMachineCount(state, 'steamTank')).toBe(4)
  })

  it('lets steam machines draw from an iron steam tank structure through a child cell', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 4
    state.machines.steamMacerator = 1
    for (let y = 0; y < 2; y += 1) {
      for (let x = 0; x < 2; x += 1) {
        state = placeMachineInstance(state, 'steamTank', x, y)
      }
    }
    state = placeMachineInstance(state, 'steamMacerator', 2, 1)
    const controller = state.machineInstances.find((instance) => instance.x === 0 && instance.y === 0)!
    const macerator = state.machineInstances.find((instance) => instance.machineId === 'steamMacerator')!
    controller.process.steamStoredMs = steamTankCapacityMs * 4

    expect(availableConnectedSteam(state, macerator)).toBe(steamTankCapacityMs * 4)

    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === macerator.uid)!.process.steamStoredMs).toBe(24000)
    expect(state.machineInstances.find((instance) => instance.uid === controller.uid)!.process.steamStoredMs).toBe(steamTankCapacityMs * 4 - 24000)
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
    expect(state.machineInstances.find((instance) => instance.uid === macerator.uid)!.process.steamStoredMs).toBe(24000)
    expect(state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process.steamStoredMs).toBe(56000)
  })

  it('cokes logs into charcoal and holds creosote until an output side is configured', () => {
    let state = createFactoryState(1000)
    state.machines.cokeOven = 1
    state.machines.steamTank = 1
    state.resources.log = 1
    state = placeMachineInstance(state, 'cokeOven', 0, 0)
    state = placeMachineInstance(state, 'steamTank', 1, 0)
    const cokeOven = state.machineInstances.find((instance) => instance.machineId === 'cokeOven')!
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    state = insertProcessSlot(state, cokeOven.uid, 'input', 'log', 1)

    state = tickGame(state, 30000).state
    state = tickGame(state, 1000).state

    let ovenProcess = state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!.process
    let tankProcess = state.machineInstances.find((instance) => instance.uid === tank.uid)!.process
    expect(ovenProcess.output).toEqual({ id: 'charcoal', amount: 1 })
    expect(ovenProcess.fluids.creosote).toBe(8)
    expect(tankProcess.fluids.creosote ?? 0).toBe(0)

    state = setFluidOutputDirection(state, cokeOven.uid, 'east')
    state = tickGame(state, 1000).state

    ovenProcess = state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!.process
    tankProcess = state.machineInstances.find((instance) => instance.uid === tank.uid)!.process
    expect(ovenProcess.fluids.creosote).toBe(0)
    expect(tankProcess.fluids.creosote).toBe(8)
  })

  it('reports current liquid output flow through connected pipes', () => {
    let state = createFactoryState(1000)
    state.machines.cokeOven = 1
    state.machines.copperPipe = 1
    state.machines.steamTank = 1
    state = placeMachineInstance(state, 'cokeOven', 0, 0)
    state = placeMachineInstance(state, 'copperPipe', 1, 0)
    state = placeMachineInstance(state, 'steamTank', 2, 0)
    state = configurePlacedConnector(state, 'copperPipe', { west: 'input', east: 'output' })
    const cokeOven = state.machineInstances.find((instance) => instance.machineId === 'cokeOven')!
    const pipe = state.machineInstances.find((instance) => instance.machineId === 'copperPipe')!
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    state = setFluidOutputDirection(state, cokeOven.uid, 'east')
    state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!.process.fluids.creosote = 80
    state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!.process.fluidCapacityLitres = cokeOvenFluidCapacityLitres
    state.machineInstances.find((instance) => instance.uid === tank.uid)!.process.steamStoredMs = steamTankCapacityMs

    expect(currentFluidOutputFlows(state, state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!)).toEqual([
      { fluidId: 'creosote', litresPerSecond: 24, storedLitres: 80, freeLitres: ironTankFluidCapacityLitres },
    ])
    expect(currentFluidOutputFlows(state, state.machineInstances.find((instance) => instance.uid === pipe.uid)!)).toEqual([
      { fluidId: 'creosote', litresPerSecond: 24, storedLitres: 80, freeLitres: ironTankFluidCapacityLitres },
    ])

    state = setPipeSideDisabled(state, pipe.uid, 'east', true)

    expect(currentFluidOutputFlows(state, state.machineInstances.find((instance) => instance.machineId === 'copperPipe')!)).toEqual([
      { fluidId: 'creosote', litresPerSecond: 0, storedLitres: 80, freeLitres: 0 },
    ])
  })

  it('moves coke oven creosote into a connected steam tank that already holds steam', () => {
    let state = createFactoryState(1000)
    state.machines.cokeOven = 1
    state.machines.copperPipe = 1
    state.machines.steamTank = 1
    state = placeMachineInstance(state, 'cokeOven', 0, 0)
    state = placeMachineInstance(state, 'copperPipe', 1, 0)
    state = placeMachineInstance(state, 'steamTank', 2, 0)
    state = configurePlacedConnector(state, 'copperPipe', { west: 'input', east: 'output' })
    const cokeOven = state.machineInstances.find((instance) => instance.machineId === 'cokeOven')!
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    state = setFluidOutputDirection(state, cokeOven.uid, 'east')
    state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!.process.fluids.creosote = 80
    state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!.process.fluidCapacityLitres = cokeOvenFluidCapacityLitres
    state.machineInstances.find((instance) => instance.uid === tank.uid)!.process.steamStoredMs = steamTankCapacityMs

    state = tickGame(state, 1000).state

    const nextOven = state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!
    const nextTank = state.machineInstances.find((instance) => instance.uid === tank.uid)!
    expect(nextOven.process.fluids.creosote).toBe(56)
    expect(nextTank.process.steamStoredMs).toBe(steamTankCapacityMs)
    expect(nextTank.process.fluids.creosote).toBe(24)
  })

  it('moves coke oven creosote from a configured multiblock casing face', () => {
    let state = createFactoryState(1000)
    state.machines.cokeOvenPart = 4
    state.machines.steamTank = 1
    for (let y = 0; y < 2; y += 1) {
      for (let x = 0; x < 2; x += 1) {
        state = placeMachineInstance(state, 'cokeOvenPart', x, y)
      }
    }
    state = placeMachineInstance(state, 'steamTank', 2, 1)
    const cokeOven = state.machineInstances.find((instance) => instance.machineId === 'cokeOven')!
    const lowerRightCasing = state.machineInstances.find((instance) => instance.x === 1 && instance.y === 1)!
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    cokeOven.process.fluids.creosote = 40
    cokeOven.process.fluidCapacityLitres = cokeOvenFluidCapacityLitres

    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!.process.fluids.creosote).toBe(40)
    expect(state.machineInstances.find((instance) => instance.uid === tank.uid)!.process.fluids.creosote ?? 0).toBe(0)

    state = setFluidOutputDirection(state, lowerRightCasing.uid, 'east')
    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!.process.fluids.creosote).toBe(16)
    expect(state.machineInstances.find((instance) => instance.uid === tank.uid)!.process.fluids.creosote).toBe(24)
  })

  it('shares one pipe network transfer rate across multiple liquid exporters', () => {
    let state = createFactoryState(1000)
    state.machines.cokeOven = 2
    state.machines.copperPipe = 2
    state.machines.steamTank = 1
    state = placeMachineInstance(state, 'cokeOven', 0, 0)
    state = placeMachineInstance(state, 'cokeOven', 0, 1)
    state = placeMachineInstance(state, 'copperPipe', 1, 0)
    state = placeMachineInstance(state, 'copperPipe', 1, 1)
    state = placeMachineInstance(state, 'steamTank', 2, 0)
    const [topPipe, bottomPipe] = state.machineInstances.filter((instance) => instance.machineId === 'copperPipe').sort((a, b) => a.y - b.y)
    state = setPipeSideMode(state, topPipe.uid, 'west', 'input')
    state = setPipeSideMode(state, topPipe.uid, 'south', 'input')
    state = setPipeSideMode(state, topPipe.uid, 'east', 'output')
    state = setPipeSideMode(state, bottomPipe.uid, 'west', 'input')
    state = setPipeSideMode(state, bottomPipe.uid, 'north', 'output')

    for (const oven of state.machineInstances.filter((instance) => instance.machineId === 'cokeOven')) {
      state = setFluidOutputDirection(state, oven.uid, 'east')
    }

    for (const oven of state.machineInstances.filter((instance) => instance.machineId === 'cokeOven')) {
      oven.process.fluids.creosote = 80
      oven.process.fluidCapacityLitres = cokeOvenFluidCapacityLitres
    }

    state = tickGame(state, 1000).state

    const ovens = state.machineInstances.filter((instance) => instance.machineId === 'cokeOven').sort((a, b) => a.y - b.y)
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    expect(ovens.map((oven) => oven.process.fluids.creosote)).toEqual([68, 68])
    expect(tank.process.fluids.creosote).toBe(24)
  })

  it('uses pipe side modes to control liquid flow direction', () => {
    let state = createFactoryState(1000)
    state.machines.cokeOven = 1
    state.machines.copperPipe = 1
    state.machines.steamTank = 1
    state = placeMachineInstance(state, 'cokeOven', 0, 0)
    state = placeMachineInstance(state, 'copperPipe', 1, 0)
    state = placeMachineInstance(state, 'steamTank', 2, 0)
    state = configurePlacedConnector(state, 'copperPipe', { west: 'input', east: 'output' })
    const cokeOven = state.machineInstances.find((instance) => instance.machineId === 'cokeOven')!
    const pipe = state.machineInstances.find((instance) => instance.machineId === 'copperPipe')!
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    state = setFluidOutputDirection(state, cokeOven.uid, 'east')
    state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!.process.fluids.creosote = 80
    state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!.process.fluidCapacityLitres = cokeOvenFluidCapacityLitres

    state = setPipeSideMode(state, pipe.uid, 'west', 'input')
    state = setPipeSideMode(state, pipe.uid, 'east', 'input')
    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!.process.fluids.creosote).toBe(80)
    expect(state.machineInstances.find((instance) => instance.uid === tank.uid)!.process.fluids.creosote ?? 0).toBe(0)

    state = setPipeSideMode(state, pipe.uid, 'east', 'output')
    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!.process.fluids.creosote).toBe(56)
    expect(state.machineInstances.find((instance) => instance.uid === tank.uid)!.process.fluids.creosote).toBe(24)
  })

  it('does not mix two liquid types in one steam tank', () => {
    let state = createFactoryState(1000)
    state.machines.cokeOven = 1
    state.machines.copperPipe = 1
    state.machines.steamTank = 1
    state = placeMachineInstance(state, 'cokeOven', 0, 0)
    state = placeMachineInstance(state, 'copperPipe', 1, 0)
    state = placeMachineInstance(state, 'steamTank', 2, 0)
    state = configurePlacedConnector(state, 'copperPipe', { west: 'input', east: 'output' })
    const cokeOven = state.machineInstances.find((instance) => instance.machineId === 'cokeOven')!
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    state = setFluidOutputDirection(state, cokeOven.uid, 'east')
    state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!.process.fluids.creosote = 80
    state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!.process.fluidCapacityLitres = cokeOvenFluidCapacityLitres
    state.machineInstances.find((instance) => instance.uid === tank.uid)!.process.fluids.water = 32
    state.machineInstances.find((instance) => instance.uid === tank.uid)!.process.fluidCapacityLitres = ironTankFluidCapacityLitres

    state = tickGame(state, 1000).state

    const nextOven = state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!
    const nextTank = state.machineInstances.find((instance) => instance.uid === tank.uid)!
    expect(nextOven.process.fluids.creosote).toBe(80)
    expect(nextTank.process.fluids.water).toBe(32)
    expect(nextTank.process.fluids.creosote).toBe(0)
  })

  it('moves coke oven creosote manually with a bucket', () => {
    let state = createFactoryState(1000)
    state.machines.cokeOven = 1
    state.machines.steamTank = 1
    state.resources.bucket = 1
    state = placeMachineInstance(state, 'cokeOven', 0, 0)
    state = placeMachineInstance(state, 'steamTank', 1, 0)
    const cokeOven = state.machineInstances.find((instance) => instance.machineId === 'cokeOven')!
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    cokeOven.process.fluids.creosote = 20
    cokeOven.process.fluidCapacityLitres = cokeOvenFluidCapacityLitres

    state = fillPortableFluidContainer(state, cokeOven.uid, 'bucket', { fluidId: 'creosote', bufferId: 'creosote' })

    expect(state.fluidContainers).toEqual([{ uid: 'bucket-1', kind: 'bucket', fluidId: 'creosote', amountLitres: 1 }])
    expect(state.resources.bucket).toBe(0)
    expect(state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!.process.fluids.creosote).toBe(19)

    state = drainPortableFluidContainer(state, tank.uid, state.fluidContainers[0].uid, 'storage')

    expect(state.fluidContainers).toEqual([])
    expect(state.resources.bucket).toBe(1)
    expect(state.machineInstances.find((instance) => instance.uid === tank.uid)!.process.fluids.creosote).toBe(1)
  })

  it('does not empty a bucket into a tank holding another liquid', () => {
    let state = createFactoryState(1000)
    state.machines.cokeOven = 1
    state.machines.steamTank = 1
    state.resources.bucket = 1
    state = placeMachineInstance(state, 'cokeOven', 0, 0)
    state = placeMachineInstance(state, 'steamTank', 1, 0)
    const cokeOven = state.machineInstances.find((instance) => instance.machineId === 'cokeOven')!
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    cokeOven.process.fluids.creosote = 20
    tank.process.fluids.water = 20
    tank.process.fluidCapacityLitres = ironTankFluidCapacityLitres

    state = fillPortableFluidContainer(state, cokeOven.uid, 'bucket', { fluidId: 'creosote', bufferId: 'creosote' })
    state = drainPortableFluidContainer(state, tank.uid, state.fluidContainers[0].uid, 'storage')

    expect(state.fluidContainers[0]).toMatchObject({ kind: 'bucket', fluidId: 'creosote', amountLitres: 1 })
    expect(state.machineInstances.find((instance) => instance.uid === tank.uid)!.process.fluids.water).toBe(20)
    expect(state.machineInstances.find((instance) => instance.uid === tank.uid)!.process.fluids.creosote ?? 0).toBe(0)
  })

  it('normalizes mixed liquid tank save state to one liquid type', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 1
    state = placeMachineInstance(state, 'steamTank', 0, 0)
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    tank.process.fluids.water = 20
    tank.process.fluids.creosote = 30

    state = tickGame(state, 1000).state

    const nextTank = state.machineInstances.find((instance) => instance.uid === tank.uid)!
    expect(nextTank.process.fluids.water).toBe(0)
    expect(nextTank.process.fluids.creosote).toBe(30)
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

    state = tickGame(state, 30000).state

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
    state = configurePlacedConnector(state, 'ironPipe', { west: 'input', east: 'output' })
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    const macerator = state.machineInstances.find((instance) => instance.machineId === 'steamMacerator')!
    tank.process.steamStoredMs = 64000

    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === macerator.uid)!.process.steamStoredMs).toBe(32000)
    expect(state.machineInstances.find((instance) => instance.uid === tank.uid)!.process.steamStoredMs).toBe(32000)
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

    state = tickGame(state, 50000).state

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
    expect(charcoalRecipe.durationMs).toBe(80000)
    expect(coalRecipe.durationMs).toBe(70000)
    expect(coalCokeRecipe.durationMs).toBe(50000)
  })

  it('makes steel plates from steel ingots with hammer recipes', () => {
    expect(recipes.find((recipe) => recipe.id === 'steel_plate')?.outputs).toEqual([{ id: 'steelPlate', amount: 1 }])
    expect(recipes.find((recipe) => recipe.id === 'steel_plate')?.inputs).toEqual([{ id: 'steelIngot', amount: 2 }])
    expect(processRecipes.find((recipe) => recipe.id === 'steam_hammer_steel_plate')?.output).toEqual({ id: 'steelPlate', amount: 1 })
    expect(processRecipes.find((recipe) => recipe.id === 'steam_hammer_steel_plate')?.input).toEqual({ id: 'steelIngot', amount: 2 })
  })

  it('gives every plate a steam forge hammer machine recipe from ingots', () => {
    expect(processRecipes.find((recipe) => recipe.id === 'steam_hammer_copper_plate')?.input).toEqual({ id: 'copperIngot', amount: 2 })
    expect(processRecipes.find((recipe) => recipe.id === 'steam_hammer_copper_plate')?.output).toEqual({ id: 'copperPlate', amount: 1 })
    expect(processRecipes.find((recipe) => recipe.id === 'steam_hammer_tin_plate')?.input).toEqual({ id: 'tinIngot', amount: 2 })
    expect(processRecipes.find((recipe) => recipe.id === 'steam_hammer_tin_plate')?.output).toEqual({ id: 'tinPlate', amount: 1 })
    expect(processRecipes.find((recipe) => recipe.id === 'steam_hammer_iron_plate')?.input).toEqual({ id: 'ironIngot', amount: 2 })
    expect(processRecipes.find((recipe) => recipe.id === 'steam_hammer_iron_plate')?.output).toEqual({ id: 'ironPlate', amount: 1 })
    expect(processRecipes.find((recipe) => recipe.id === 'steam_hammer_bronze_plate')?.input).toEqual({ id: 'bronzeIngot', amount: 2 })
    expect(processRecipes.find((recipe) => recipe.id === 'steam_hammer_bronze_plate')?.output).toEqual({ id: 'bronzePlate', amount: 1 })
    expect(processRecipes.find((recipe) => recipe.id === 'steam_hammer_steel_plate')?.input).toEqual({ id: 'steelIngot', amount: 2 })
    expect(processRecipes.find((recipe) => recipe.id === 'steam_hammer_steel_plate')?.output).toEqual({ id: 'steelPlate', amount: 1 })
    expect(processRecipes.find((recipe) => recipe.id === 'steam_hammer_red_alloy_plate')?.input).toEqual({ id: 'redAlloyIngot', amount: 2 })
    expect(processRecipes.find((recipe) => recipe.id === 'steam_hammer_red_alloy_plate')?.output).toEqual({ id: 'redAlloyPlate', amount: 1 })
  })

  it('crafts the first basic electronic circuit from LV foundation parts', () => {
    let state = createInitialState(1000)
    state.resources.basicBoard = 1
    state.resources.conductiveWire = 2
    state.resources.resistor = 2
    state.resources.vacuumTube = 2
    state.resources.redAlloyWire = 1
    state.resources.steelPlate = 1
    const circuit = recipes.find((recipe) => recipe.id === 'craft_basic_electronic_circuit')!

    expect(circuit.pattern).toEqual([
      'conductiveWire',
      'redAlloyWire',
      'conductiveWire',
      'resistor',
      'basicBoard',
      'resistor',
      'vacuumTube',
      'steelPlate',
      'vacuumTube',
    ])
    expect(canCraft(state, circuit)).toBe(true)
    state = craftRecipeInstant(state, circuit, 1)

    expect(state.resources.primitiveCircuit).toBe(1)
    expect(state.resources.basicBoard).toBe(0)
    expect(state.resources.conductiveWire).toBe(0)
    expect(state.resources.redAlloyWire).toBe(0)
  })

  it('builds printed circuit boards from compressed wooden blanks and surrounding copper wire', () => {
    let state = createFactoryState(1000)
    state.machines.steamCompressor = 1
    state.resources.woodPulp = 4
    state.resources.copperWire = 8
    const board = recipes.find((recipe) => recipe.id === 'craft_basic_board')!
    const press = processRecipes.find((recipe) => recipe.id === 'steam_compress_wooden_board_blank')!

    expect(press.input).toEqual({ id: 'woodPulp', amount: 4 })
    expect(press.output).toEqual({ id: 'woodenBoardBlank', amount: 1 })
    expect(board.inputs).toEqual([
      { id: 'woodenBoardBlank', amount: 1 },
      { id: 'copperWire', amount: 8 },
    ])

    state = placeMachineInstance(state, 'steamCompressor', 0, 0)
    const compressor = state.machineInstances.find((instance) => instance.machineId === 'steamCompressor')!
    state = insertProcessSlot(state, compressor.uid, 'input', 'woodPulp', 4)
    const nextCompressor = state.machineInstances.find((instance) => instance.uid === compressor.uid)!
    nextCompressor.process.steamStoredMs = 24000
    state = tickGame(state, 6000).state
    const pressed = state.machineInstances.find((instance) => instance.uid === compressor.uid)!.process.output

    expect(pressed).toEqual({ id: 'woodenBoardBlank', amount: 1 })
    state.resources.woodenBoardBlank = pressed!.amount
    state.machineInstances.find((instance) => instance.uid === compressor.uid)!.process.output = null
    state = craftRecipeInstant(state, board, 1)

    expect(state.resources.basicBoard).toBe(1)
    expect(state.resources.copperWire).toBe(0)
  })

  it('macerates logs into a larger, slower wood pulp batch than planks', () => {
    const plankPulp = processRecipes.find((recipe) => recipe.id === 'steam_pulp_planks')!
    const logPulp = processRecipes.find((recipe) => recipe.id === 'steam_pulp_logs')!

    expect(plankPulp.machineId).toBe('steamMacerator')
    expect(logPulp.machineId).toBe('steamMacerator')
    expect(plankPulp.input).toEqual({ id: 'plank', amount: 1 })
    expect(logPulp.input).toEqual({ id: 'log', amount: 1 })
    expect(plankPulp.output).toEqual({ id: 'woodPulp', amount: 2 })
    expect(logPulp.output).toEqual({ id: 'woodPulp', amount: 10 })
    expect(logPulp.durationMs).toBeGreaterThan(plankPulp.durationMs)
    expect(logPulp.steamCostLitres).toBe(48)
    expect(plankPulp.steamCostLitres).toBe(16)
  })

  it('uses different steam costs for steam macerator recipes', () => {
    expect(processRecipes.find((recipe) => recipe.id === 'steam_crush_iron_ore')?.steamCostLitres).toBe(32)
    expect(processRecipes.find((recipe) => recipe.id === 'steam_grind_crushed_iron_ore')?.steamCostLitres).toBe(16)
    expect(processRecipes.find((recipe) => recipe.id === 'steam_grind_iron_ingot')?.steamCostLitres).toBe(48)
  })

  it('lets the steam furnace smelt every primitive furnace input', () => {
    const steamFurnaceOutputs = new Set(
      processRecipes
        .filter((recipe) => recipe.machineId === 'steamFurnace')
        .map((recipe) => `${recipe.input.id}:${recipe.input.amount}->${recipe.output.id}:${recipe.output.amount}`),
    )
    const missingSteamRecipes = processRecipes
      .filter((recipe) => recipe.machineId === 'furnace')
      .map((recipe) => `${recipe.input.id}:${recipe.input.amount}->${recipe.output.id}:${recipe.output.amount}`)
      .filter((recipeKey) => !steamFurnaceOutputs.has(recipeKey))

    expect(missingSteamRecipes).toEqual([])
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
    expect(state.machineInstances.find((instance) => instance.uid === macerator.uid)!.process.output).toEqual({ id: 'copperDust', amount: 1 })
  })

  it('generates LV EU from connected steam in a steam turbine', () => {
    let state = createFactoryState(1000)
    state.machines.steamBoiler = 1
    state.machines.steamTurbine = 1
    state = placeMachineInstance(state, 'steamBoiler', 0, 0)
    state = placeMachineInstance(state, 'steamTurbine', 1, 0)
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process.steamStoredMs = 128000

    state = tickGame(state, 10000).state

    const turbine = state.machineInstances.find((instance) => instance.machineId === 'steamTurbine')!
    expect(turbine.process.euStored).toBe(256)
    expect(turbine.process.euCapacity).toBe(steamTurbineEuCapacity)
  })

  it('continues steam turbine EU generation during offline progress', () => {
    let state = createFactoryState(1000)
    state.machines.steamBoiler = 1
    state.machines.steamTurbine = 1
    state = placeMachineInstance(state, 'steamBoiler', 0, 0)
    state = placeMachineInstance(state, 'steamTurbine', 1, 0)
    state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!.process.steamStoredMs = 128000

    const offline = simulateOfflineProgress(state, 10_000, 11_000).state
    const turbine = offline.machineInstances.find((instance) => instance.machineId === 'steamTurbine')!

    expect(turbine.process.euStored).toBe(256)
  })

  it('does not run an LV Wiremill without connected EU', () => {
    let state = createFactoryState(1000)
    state.machines.lvWiremill = 1
    state.resources.tinIngot = 1
    state = placeMachineInstance(state, 'lvWiremill', 0, 0)
    const wiremill = state.machineInstances.find((instance) => instance.machineId === 'lvWiremill')!
    state = insertProcessSlot(state, wiremill.uid, 'input', 'tinIngot', 1)

    state = tickGame(state, 5000).state

    const process = state.machineInstances.find((instance) => instance.uid === wiremill.uid)!.process
    expect(process.progressMs).toBe(0)
    expect(process.output).toBeNull()
  })

  it('runs an LV Wiremill through tin cable and applies per-tile power loss', () => {
    let state = createFactoryState(1000)
    state.machines.steamTurbine = 1
    state.resources.tinCable = 1
    state.machines.lvWiremill = 1
    state.resources.tinIngot = 1
    state = placeMachineInstance(state, 'steamTurbine', 0, 0)
    state = placeMachineInstance(state, 'tinCable', 1, 0)
    state = placeMachineInstance(state, 'lvWiremill', 2, 0)
    state = configurePlacedConnector(state, 'tinCable', { west: 'input', east: 'output' })
    const turbine = state.machineInstances.find((instance) => instance.machineId === 'steamTurbine')!
    const wiremill = state.machineInstances.find((instance) => instance.machineId === 'lvWiremill')!
    state.machineInstances.find((instance) => instance.uid === turbine.uid)!.process.euStored = 100
    state = insertProcessSlot(state, wiremill.uid, 'input', 'tinIngot', 1)

    expect(availableConnectedEu(state, state.machineInstances.find((instance) => instance.uid === wiremill.uid)!)).toBe(100)
    state = tickGame(state, 5000).state

    const nextTurbine = state.machineInstances.find((instance) => instance.uid === turbine.uid)!
    const nextWiremill = state.machineInstances.find((instance) => instance.uid === wiremill.uid)!
    expect(nextWiremill.process.output).toEqual({ id: 'tinWire', amount: 2 })
    expect(nextWiremill.process.euStored).toBe(32)
    expect(nextTurbine.process.euStored).toBe(31)
  })

  it('charges an LV battery buffer from turbine EU through lossy tin cable', () => {
    let state = createFactoryState(1000)
    state.machines.steamTurbine = 1
    state.resources.tinCable = 1
    state.machines.lvBatteryBuffer = 1
    state.machines.lvWiremill = 1
    state.resources.tinIngot = 1
    state.resources.sodiumBattery = 1
    state = placeMachineInstance(state, 'steamTurbine', 0, 0)
    state = placeMachineInstance(state, 'tinCable', 1, 0)
    state = placeMachineInstance(state, 'lvBatteryBuffer', 2, 0)
    state = placeMachineInstance(state, 'lvWiremill', 3, 0)
    state = configurePlacedConnector(state, 'tinCable', { west: 'input', east: 'output' })
    const turbine = state.machineInstances.find((instance) => instance.machineId === 'steamTurbine')!
    const buffer = state.machineInstances.find((instance) => instance.machineId === 'lvBatteryBuffer')!
    const wiremill = state.machineInstances.find((instance) => instance.machineId === 'lvWiremill')!
    state = installLvBatteryInBuffer(state, buffer.uid)
    state.machineInstances.find((instance) => instance.uid === turbine.uid)!.process.euStored = 200

    state = tickGame(state, 10000).state
    const chargedBuffer = state.machineInstances.find((instance) => instance.uid === buffer.uid)!
    const primedWiremill = state.machineInstances.find((instance) => instance.uid === wiremill.uid)!
    expect(chargedBuffer.process.euStored + primedWiremill.process.euStored).toBe(190)
    expect(availableConnectedEuStorage(state, primedWiremill)).toBe(chargedBuffer.process.euStored)

    state = insertProcessSlot(state, wiremill.uid, 'input', 'tinIngot', 1)
    state = tickGame(state, 5000).state

    const nextWiremill = state.machineInstances.find((instance) => instance.uid === wiremill.uid)!
    expect(nextWiremill.process.output).toEqual({ id: 'tinWire', amount: 2 })
    expect(state.machineInstances.find((instance) => instance.uid === buffer.uid)!.process.euStored).toBeLessThan(190)
  })

  it('fills an idle LV machine internal buffer before a valid recipe is loaded', () => {
    let state = createFactoryState(1000)
    state.machines.steamTurbine = 1
    state.machines.lvWiremill = 1
    state = placeMachineInstance(state, 'steamTurbine', 0, 0)
    state = placeMachineInstance(state, 'lvWiremill', 1, 0)
    state.machineInstances.find((instance) => instance.machineId === 'steamTurbine')!.process.euStored = 100

    state = tickGame(state, 1000).state

    const wiremill = state.machineInstances.find((instance) => instance.machineId === 'lvWiremill')!
    expect(wiremill.process.euStored).toBe(32)
    expect(wiremill.process.activeRecipeId).toBeNull()
  })

  it('accepts and consumes assembler ingredients from any of its six input bays', () => {
    let state = createFactoryState(1000)
    state.machines.steamTurbine = 1
    state.machines.lvAssembler = 1
    state.resources.woodenBoardBlank = 1
    state.resources.copperWire = 6
    state = placeMachineInstance(state, 'steamTurbine', 0, 0)
    state = placeMachineInstance(state, 'lvAssembler', 1, 0)
    const assembler = state.machineInstances.find((instance) => instance.machineId === 'lvAssembler')!
    state.machineInstances.find((instance) => instance.machineId === 'steamTurbine')!.process.euStored = 200
    state = insertProcessSlot(state, assembler.uid, 'extraInput4', 'woodenBoardBlank', 1)
    state = insertProcessSlot(state, assembler.uid, 'extraInput3', 'copperWire', 6)

    state = tickGame(state, 6000).state

    const nextAssembler = state.machineInstances.find((instance) => instance.uid === assembler.uid)!
    expect(nextAssembler.process.output).toEqual({ id: 'basicBoard', amount: 1 })
    expect(nextAssembler.process.extraInput3).toBeNull()
    expect(nextAssembler.process.extraInput4).toBeNull()
  })

  it('gives lithium batteries more buffer capacity than sodium batteries', () => {
    let sodiumState = createFactoryState(1000)
    sodiumState.machines.lvBatteryBuffer = 1
    sodiumState.resources.sodiumBattery = 1
    sodiumState = placeMachineInstance(sodiumState, 'lvBatteryBuffer', 0, 0)
    const sodiumBuffer = sodiumState.machineInstances.find((instance) => instance.machineId === 'lvBatteryBuffer')!
    sodiumState = installLvBatteryInBuffer(sodiumState, sodiumBuffer.uid, 'sodiumBattery')
    const chargedSodiumBuffer = sodiumState.machineInstances.find((instance) => instance.uid === sodiumBuffer.uid)!

    let lithiumState = createFactoryState(1000)
    lithiumState.machines.lvBatteryBuffer = 1
    lithiumState.resources.lithiumBattery = 1
    lithiumState = placeMachineInstance(lithiumState, 'lvBatteryBuffer', 0, 0)
    const lithiumBuffer = lithiumState.machineInstances.find((instance) => instance.machineId === 'lvBatteryBuffer')!
    lithiumState = installLvBatteryInBuffer(lithiumState, lithiumBuffer.uid, 'lithiumBattery')
    const chargedLithiumBuffer = lithiumState.machineInstances.find((instance) => instance.uid === lithiumBuffer.uid)!

    expect(chargedLithiumBuffer.process.euCapacity).toBeGreaterThan(chargedSodiumBuffer.process.euCapacity)
    expect(chargedSodiumBuffer.process.euCapacity).toBe(2048)
    expect(chargedLithiumBuffer.process.euCapacity).toBe(4096)
  })

  it('supports mixed battery chemistries in indexed buffer slots', () => {
    let state = createFactoryState(1000)
    state.machines.lvBatteryBuffer2A = 1
    state.resources.sodiumBattery = 1
    state.resources.lithiumBattery = 1
    state = placeMachineInstance(state, 'lvBatteryBuffer2A', 0, 0)
    const buffer = state.machineInstances[0]

    state = installLvBatteryInBuffer(state, buffer.uid, 'sodiumBattery')
    state = installLvBatteryInBuffer(state, buffer.uid, 'lithiumBattery')
    const filled = state.machineInstances[0]
    expect(filled.process.batterySlots).toEqual(['sodiumBattery', 'lithiumBattery'])
    expect(filled.process.euCapacity).toBe(6144)

    state = removeLvBatteryFromBuffer(state, buffer.uid, 0)
    expect(state.machineInstances[0].process.batterySlots).toEqual([null, 'lithiumBattery'])
    expect(state.machineInstances[0].process.euCapacity).toBe(4096)
    expect(state.resources.sodiumBattery).toBe(1)
  })

  it('stores twelve independent mixed stacks in a standard chest', () => {
    let state = createFactoryState(1000)
    state.machines.standardChest = 1
    state.resources.log = 3
    state.resources.ironOre = 2
    state = placeMachineInstance(state, 'standardChest', 0, 0)
    const chest = state.machineInstances[0]

    state = insertMachineStorageSlot(state, chest.uid, 0, 'log', 3)
    state = insertMachineStorageSlot(state, chest.uid, 11, 'ironOre', 2)
    expect(state.machineInstances[0].process.storageSlots).toHaveLength(12)
    expect(state.machineInstances[0].process.storageSlots[0]).toEqual({ id: 'log', amount: 3 })
    expect(state.machineInstances[0].process.storageSlots[11]).toEqual({ id: 'ironOre', amount: 2 })

    state = removeMachineStorageSlot(state, chest.uid, 0)
    expect(state.machineInstances[0].process.storageSlots[0]).toBeNull()
    expect(state.resources.log).toBe(3)
  })

  it('treats LV cables as automatic non-directional networks', () => {
    let state = createFactoryState(1000)
    state.machines.steamTurbine = 1
    state.resources.tinCable = 1
    state.machines.lvWiremill = 1
    state = placeMachineInstance(state, 'steamTurbine', 0, 0)
    state = placeMachineInstance(state, 'tinCable', 1, 0)
    state = placeMachineInstance(state, 'lvWiremill', 2, 0)
    const cable = state.machineInstances.find((instance) => instance.machineId === 'tinCable')!
    state = setPipeSideMode(state, cable.uid, 'west', 'blocked')
    state = setPipeSideMode(state, cable.uid, 'east', 'blocked')
    const turbine = state.machineInstances.find((instance) => instance.machineId === 'steamTurbine')!
    const wiremill = state.machineInstances.find((instance) => instance.machineId === 'lvWiremill')!
    state.machineInstances.find((instance) => instance.uid === turbine.uid)!.process.euStored = 100

    expect(pipeSideMode(state.machineInstances.find((instance) => instance.uid === cable.uid)!, 'west')).toBe('both')
    expect(availableConnectedEu(state, wiremill)).toBe(100)
  })

  it('caps ordinary LV machine EU input to one amp on higher amp cable', () => {
    let state = createFactoryState(1000)
    state.machines.lvBatteryBuffer4A = 1
    state.resources.tinCable4A = 1
    state.machines.lvWiremill = 1
    state.resources.sodiumBattery = 4
    state.resources.tinIngot = 1
    state = placeMachineInstance(state, 'lvBatteryBuffer4A', 0, 0)
    state = placeMachineInstance(state, 'tinCable4A', 1, 0)
    state = placeMachineInstance(state, 'lvWiremill', 2, 0)
    const buffer = state.machineInstances.find((instance) => instance.machineId === 'lvBatteryBuffer4A')!
    const wiremill = state.machineInstances.find((instance) => instance.machineId === 'lvWiremill')!
    for (let index = 0; index < 4; index += 1) state = installLvBatteryInBuffer(state, buffer.uid)
    state.machineInstances.find((instance) => instance.uid === buffer.uid)!.process.euStored = 8192
    state = insertProcessSlot(state, wiremill.uid, 'input', 'tinIngot', 1)

    state = tickGame(state, 1000).state

    const nextBuffer = state.machineInstances.find((instance) => instance.uid === buffer.uid)!
    expect(8192 - nextBuffer.process.euStored).toBeLessThanOrEqual(33)
  })

  it('stores connected creosote but does not burn it in a dry liquid steam boiler', () => {
    let state = createFactoryState(1000)
    state.machines.cokeOven = 1
    state.machines.liquidSteamBoiler = 1
    state = placeMachineInstance(state, 'cokeOven', 0, 0)
    state = placeMachineInstance(state, 'liquidSteamBoiler', 1, 0)
    const cokeOven = state.machineInstances.find((instance) => instance.machineId === 'cokeOven')!
    state = setFluidOutputDirection(state, cokeOven.uid, 'east')
    state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!.process.fluids.creosote = 20

    state = tickGame(state, 5000).state

    const boiler = state.machineInstances.find((instance) => instance.machineId === 'liquidSteamBoiler')!
    expect(boilerHasWater(state, boiler)).toBe(false)
    expect(boiler.process.steamStoredMs).toBe(0)
    expect(boiler.process.fluids.creosote).toBe(20)
    expect(boiler.process.activeRecipeId).toBeNull()
  })

  it('burns connected creosote into steam in a watered liquid steam boiler', () => {
    let state = createFactoryState(1000)
    state.machines.cokeOven = 1
    state.machines.well = 1
    state.machines.liquidSteamBoiler = 1
    state = placeMachineInstance(state, 'cokeOven', 0, 0)
    state = placeMachineInstance(state, 'well', 1, 1)
    state = placeMachineInstance(state, 'liquidSteamBoiler', 1, 0)
    const cokeOven = state.machineInstances.find((instance) => instance.machineId === 'cokeOven')!
    state = setFluidOutputDirection(state, cokeOven.uid, 'east')
    state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!.process.fluids.creosote = 20

    state = tickGame(state, 5000).state

    const boiler = state.machineInstances.find((instance) => instance.machineId === 'liquidSteamBoiler')!
    expect(boilerHasWater(state, boiler)).toBe(true)
    expect(boiler.process.steamStoredMs).toBe(180000)
    expect(boiler.process.steamCapacityMs).toBe(liquidSteamBoilerCapacityMs)
    expect(boiler.process.fluidCapacityLitres).toBe(liquidSteamBoilerFluidCapacityLitres)
    expect(boiler.process.fluids.creosote).toBe(15)
  })

  it('limits liquid steam boiler creosote pulls by pipe transfer rate', () => {
    let state = createFactoryState(1000)
    state.machines.cokeOven = 1
    state.machines.copperPipe = 1
    state.machines.well = 1
    state.machines.liquidSteamBoiler = 1
    state = placeMachineInstance(state, 'cokeOven', 0, 0)
    state = placeMachineInstance(state, 'copperPipe', 1, 0)
    state = placeMachineInstance(state, 'liquidSteamBoiler', 2, 0)
    state = placeMachineInstance(state, 'well', 2, 1)
    const pipe = state.machineInstances.find((instance) => instance.machineId === 'copperPipe')!
    state = setPipeSideMode(state, pipe.uid, 'west', 'input')
    state = setPipeSideMode(state, pipe.uid, 'east', 'output')
    const cokeOven = state.machineInstances.find((instance) => instance.machineId === 'cokeOven')!
    state = setFluidOutputDirection(state, cokeOven.uid, 'east')
    state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!.process.fluids.creosote = 200

    state = tickGame(state, 1000).state

    const boiler = state.machineInstances.find((instance) => instance.machineId === 'liquidSteamBoiler')!
    expect(boiler.process.fluids.creosote ?? 0).toBeLessThanOrEqual(24)
  })

  it('requires both 2A Energy Hatches to sustain Arc Furnace processing', () => {
    let state = createFactoryState(1000)
    state.machines.arcBlastFurnacePart = 4
    state.machines.arcBlastFurnace = 1
    state.machines.lvEnergyHatch2A = 2
    state.machines.lvInputBus = 1
    state.machines.lvOutputBus = 1
    state.machines.lvBatteryBuffer2A = 2
    state.resources.aluminiumDust = 1
    state.resources.sodiumBattery = 4
    state = placeMachineInstance(state, 'lvEnergyHatch2A', 1, 1)
    state = placeMachineInstance(state, 'lvEnergyHatch2A', 2, 1)
    state = placeMachineInstance(state, 'arcBlastFurnacePart', 3, 1)
    state = placeMachineInstance(state, 'lvInputBus', 1, 2)
    state = placeMachineInstance(state, 'arcBlastFurnace', 2, 2)
    state = placeMachineInstance(state, 'lvOutputBus', 3, 2)
    state = placeMachineInstance(state, 'arcBlastFurnacePart', 1, 3)
    state = placeMachineInstance(state, 'arcBlastFurnacePart', 2, 3)
    state = placeMachineInstance(state, 'arcBlastFurnacePart', 3, 3)
    state = placeMachineInstance(state, 'lvBatteryBuffer2A', 0, 1)
    state = placeMachineInstance(state, 'lvBatteryBuffer2A', 2, 0)
    const arc = state.machineInstances.find((instance) => instance.machineId === 'arcBlastFurnace')!
    const buffers = state.machineInstances.filter((instance) => instance.machineId === 'lvBatteryBuffer2A')
    for (const buffer of buffers) {
      state = installLvBatteryInBuffer(state, buffer.uid)
      state = installLvBatteryInBuffer(state, buffer.uid)
      state.machineInstances.find((instance) => instance.uid === buffer.uid)!.process.euStored = 4096
    }
    state = insertProcessSlot(state, arc.uid, 'input', 'aluminiumDust', 1)

    for (let step = 0; step < 20; step += 1) state = tickGame(state, 1000).state

    const structure = arcBlastFurnaceStructureForInstance(state, state.machineInstances.find((instance) => instance.uid === arc.uid)!)!
    expect(structure.outputBus?.process.output).toEqual({ id: 'aluminiumIngot', amount: 1 })
    expect(structure.inputBus?.process.input).toBeNull()
  })

  it('charges Arc Furnace energy hatches through connected lossy cable routes', () => {
    let state = createFactoryState(1000)
    Object.assign(state.machines, {
      arcBlastFurnace: 1,
      arcBlastFurnacePart: 4,
      lvEnergyHatch2A: 2,
      lvInputBus: 1,
      lvOutputBus: 1,
      lvBatteryBuffer4A: 1,
    })
    state.resources.tinCable4A = 2
    state.resources.sodiumBattery = 4
    state.resources.aluminiumDust = 1
    for (const [id, x, y] of [
      ['lvBatteryBuffer4A', 0, 0], ['tinCable4A', 1, 0], ['tinCable4A', 2, 0],
      ['lvEnergyHatch2A', 1, 1], ['lvEnergyHatch2A', 2, 1], ['arcBlastFurnacePart', 3, 1],
      ['lvInputBus', 1, 2], ['arcBlastFurnace', 2, 2], ['lvOutputBus', 3, 2],
      ['arcBlastFurnacePart', 1, 3], ['arcBlastFurnacePart', 2, 3], ['arcBlastFurnacePart', 3, 3],
    ] as Array<[MachineId, number, number]>) state = placeMachineInstance(state, id, x, y)
    const buffer = state.machineInstances.find((instance) => instance.machineId === 'lvBatteryBuffer4A')!
    for (let index = 0; index < 4; index += 1) state = installLvBatteryInBuffer(state, buffer.uid)
    state.machineInstances.find((instance) => instance.uid === buffer.uid)!.process.euStored = 8192
    const arc = state.machineInstances.find((instance) => instance.machineId === 'arcBlastFurnace')!
    state = insertProcessSlot(state, arc.uid, 'input', 'aluminiumDust', 1)

    state = tickGame(state, 1000).state

    const chargedStructure = arcBlastFurnaceStructureForInstance(state, state.machineInstances.find((instance) => instance.uid === arc.uid)!)!
    expect(chargedStructure.energyHatches.reduce((sum, hatch) => sum + hatch.process.euStored, 0)).toBeGreaterThan(0)
    expect(chargedStructure.controller.process.activeRecipeId).toBe('arc_blast_aluminium')

    for (let step = 0; step < 30; step += 1) state = tickGame(state, 1000).state

    const completedStructure = arcBlastFurnaceStructureForInstance(state, state.machineInstances.find((instance) => instance.uid === arc.uid)!)!
    expect(completedStructure.outputBus?.process.output).toEqual({ id: 'aluminiumIngot', amount: 1 })
  })

  it('uses the LV Assembler to make multiblock ports with half the functional parts', () => {
    let state = createFactoryState(1000)
    state.machines.lvAssembler = 1
    state.resources.lvMachineHull = 1
    state.resources.lvConveyor = 1
    state = placeMachineInstance(state, 'lvAssembler', 0, 0)
    const assembler = state.machineInstances[0]
    state = insertProcessSlot(state, assembler.uid, 'input', 'lvMachineHull', 1)
    state = insertProcessSlot(state, assembler.uid, 'secondaryInput', 'lvConveyor', 1)
    state.machineInstances[0].process.euStored = 128

    state = tickGame(state, 8000).state

    expect(state.machines.lvInputBus).toBe(1)
    expect(state.machineInstances[0].process.input).toBeNull()
    expect(state.machineInstances[0].process.secondaryInput).toBeNull()
  })

  it('moves Arc items through outward-facing buses at one item per second', () => {
    let state = createFactoryState(1000)
    Object.assign(state.machines, {
      arcBlastFurnace: 1,
      arcBlastFurnacePart: 4,
      lvEnergyHatch2A: 2,
      lvInputBus: 1,
      lvOutputBus: 1,
      standardChest: 2,
    })
    for (const [id, x, y] of [
      ['lvEnergyHatch2A', 1, 1], ['lvEnergyHatch2A', 2, 1], ['arcBlastFurnacePart', 3, 1],
      ['lvInputBus', 1, 2], ['arcBlastFurnace', 2, 2], ['lvOutputBus', 3, 2],
      ['arcBlastFurnacePart', 1, 3], ['arcBlastFurnacePart', 2, 3], ['arcBlastFurnacePart', 3, 3],
      ['standardChest', 0, 2], ['standardChest', 4, 2],
    ] as Array<[MachineId, number, number]>) state = placeMachineInstance(state, id, x, y)
    const source = state.machineInstances.find((instance) => instance.machineId === 'standardChest' && instance.x === 0)!
    const destination = state.machineInstances.find((instance) => instance.machineId === 'standardChest' && instance.x === 4)!
    const inputBus = state.machineInstances.find((instance) => instance.machineId === 'lvInputBus')!
    const outputBus = state.machineInstances.find((instance) => instance.machineId === 'lvOutputBus')!
    source.process.storageSlots[0] = { id: 'aluminiumDust', amount: 2 }
    outputBus.process.output = { id: 'aluminiumIngot', amount: 2 }

    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === inputBus.uid)?.process.input).toEqual({ id: 'aluminiumDust', amount: 1 })
    expect(state.machineInstances.find((instance) => instance.uid === source.uid)?.process.storageSlots[0]).toEqual({ id: 'aluminiumDust', amount: 1 })
    expect(state.machineInstances.find((instance) => instance.uid === outputBus.uid)?.process.output).toEqual({ id: 'aluminiumIngot', amount: 1 })
    expect(state.machineInstances.find((instance) => instance.uid === destination.uid)?.process.storageSlots[0]).toEqual({ id: 'aluminiumIngot', amount: 1 })
  })

  it('keeps LV machine routes more efficient than hand shaping for repeated parts', () => {
    const expectations = [
      ['lv_wiremill_tin_wire', 'lvWiremill', { id: 'tinIngot', amount: 1 }, undefined, { id: 'tinWire', amount: 2 }],
      ['lv_wiremill_copper_wire', 'lvWiremill', { id: 'copperIngot', amount: 1 }, undefined, { id: 'copperWire', amount: 2 }],
      ['lv_wiremill_red_alloy_wire', 'lvWiremill', { id: 'redAlloyIngot', amount: 1 }, undefined, { id: 'redAlloyWire', amount: 2 }],
      ['lv_bender_iron_plate', 'lvBender', { id: 'ironIngot', amount: 1 }, undefined, { id: 'ironPlate', amount: 1 }],
      ['lv_bender_copper_plate', 'lvBender', { id: 'copperIngot', amount: 1 }, undefined, { id: 'copperPlate', amount: 1 }],
      ['lv_bender_tin_plate', 'lvBender', { id: 'tinIngot', amount: 1 }, undefined, { id: 'tinPlate', amount: 1 }],
      ['lv_bender_bronze_plate', 'lvBender', { id: 'bronzeIngot', amount: 1 }, undefined, { id: 'bronzePlate', amount: 1 }],
      ['lv_bender_steel_plate', 'lvBender', { id: 'steelIngot', amount: 1 }, undefined, { id: 'steelPlate', amount: 1 }],
      ['lv_bender_red_alloy_plate', 'lvBender', { id: 'redAlloyIngot', amount: 1 }, undefined, { id: 'redAlloyPlate', amount: 1 }],
      ['lv_bender_aluminium_plate', 'lvBender', { id: 'aluminiumIngot', amount: 1 }, undefined, { id: 'aluminiumPlate', amount: 1 }],
      ['lv_lathe_iron_rod', 'lvLathe', { id: 'ironIngot', amount: 1 }, undefined, { id: 'ironRod', amount: 2 }],
      ['lv_lathe_copper_rod', 'lvLathe', { id: 'copperIngot', amount: 1 }, undefined, { id: 'copperRod', amount: 2 }],
      ['lv_lathe_tin_rod', 'lvLathe', { id: 'tinIngot', amount: 1 }, undefined, { id: 'tinRod', amount: 2 }],
      ['lv_lathe_bronze_rod', 'lvLathe', { id: 'bronzeIngot', amount: 1 }, undefined, { id: 'bronzeRod', amount: 2 }],
      ['lv_lathe_steel_rod', 'lvLathe', { id: 'steelIngot', amount: 1 }, undefined, { id: 'steelRod', amount: 2 }],
      ['lv_lathe_aluminium_rod', 'lvLathe', { id: 'aluminiumIngot', amount: 1 }, undefined, { id: 'aluminiumRod', amount: 2 }],
      ['lv_lathe_aluminium_rings', 'lvLathe', { id: 'aluminiumRod', amount: 1 }, undefined, { id: 'aluminiumRing', amount: 2 }],
      ['lv_lathe_aluminium_screws', 'lvLathe', { id: 'aluminiumRod', amount: 1 }, undefined, { id: 'aluminiumScrew', amount: 2 }],
      ['lv_lathe_glass_tubes', 'lvLathe', { id: 'glass', amount: 1 }, undefined, { id: 'glassTube', amount: 3 }],
      ['lv_assembler_insulated_copper_wire', 'lvAssembler', { id: 'copperWire', amount: 2 }, { id: 'rubber', amount: 1 }, { id: 'conductiveWire', amount: 2 }],
      ['lv_assembler_resistors', 'lvAssembler', { id: 'carbonDust', amount: 1 }, { id: 'copperWire', amount: 2 }, { id: 'resistor', amount: 3 }],
      ['lv_assembler_printed_circuit_board', 'lvAssembler', { id: 'woodenBoardBlank', amount: 1 }, { id: 'copperWire', amount: 2 }, { id: 'basicBoard', amount: 1 }],
      ['lv_alloy_cupronickel', 'lvAlloySmelter', { id: 'copperDust', amount: 2 }, { id: 'nickelDust', amount: 2 }, { id: 'cupronickelIngot', amount: 5 }],
    ] as const

    for (const [id, machineId, input, secondaryInput, output] of expectations) {
      const recipe = processRecipes.find((candidate) => candidate.id === id)
      expect(recipe?.machineId, id).toBe(machineId)
      expect(recipe?.input, id).toEqual(input)
      expect(recipe?.secondaryInput, id).toEqual(secondaryInput)
      if (id === 'lv_assembler_printed_circuit_board') {
        expect(recipe?.extraInputs, id).toEqual([
          { id: 'copperWire', amount: 1 },
          { id: 'copperWire', amount: 1 },
          { id: 'copperWire', amount: 1 },
          { id: 'copperWire', amount: 1 },
        ])
      }
      expect(recipe?.output, id).toEqual(output)
      expect(recipe?.euCost, id).toBeGreaterThan(0)
    }
  })

  it('crafts empty battery cells only from a shaped terminal recipe', () => {
    const terminalRecipe = recipes.find((recipe) => recipe.id === 'craft_empty_battery_cell')
    const processRecipe = processRecipes.find((recipe) => recipe.output.id === 'emptyBatteryCell')

    expect(processRecipe).toBeUndefined()
    expect(terminalRecipe?.inputs).toEqual([
      { id: 'batteryAlloyPlate', amount: 4 },
      { id: 'tinCable', amount: 1 },
      { id: 'rubber', amount: 1 },
    ])
    expect(terminalRecipe?.pattern).toEqual([
      null,
      'tinCable',
      null,
      'batteryAlloyPlate',
      'rubber',
      'batteryAlloyPlate',
      'batteryAlloyPlate',
      null,
      'batteryAlloyPlate',
    ])
    expect(terminalRecipe?.outputs).toEqual([{ id: 'emptyBatteryCell', amount: 1 }])
  })

  it('stages LV battery buffers through red-alloy controls and aluminium frames', () => {
    const expectations = [
      ['build_lv_battery_buffer', 'tinCable', 'lvBatteryBuffer'],
      ['build_lv_battery_buffer_2a', 'tinCable2A', 'lvBatteryBuffer2A'],
      ['build_lv_battery_buffer_4a', 'tinCable4A', 'lvBatteryBuffer4A'],
    ] as const

    for (const [recipeId, cableId, outputId] of expectations) {
      const recipe = recipes.find((candidate) => candidate.id === recipeId)
      expect(recipe?.inputs, recipeId).toEqual([
        { id: 'lvMachineHull', amount: 1 },
        { id: 'tinRod', amount: 4 },
        { id: cableId, amount: 2 },
        { id: 'redAlloyWire', amount: 1 },
        { id: 'primitiveCircuit', amount: 1 },
      ])
      expect(recipe?.machineInputs, recipeId).toBeUndefined()
      expect(recipe?.pattern, recipeId).toEqual(['tinRod', 'redAlloyWire', 'tinRod', cableId, 'lvMachineHull', cableId, 'tinRod', 'primitiveCircuit', 'tinRod'])
      expect(recipe?.machineOutputs, recipeId).toEqual([{ id: outputId, amount: 1 }])
      expect(recipe && recipeFitsTerminalGrid(recipe), recipeId).toBe(true)
    }

    const eightAmpRecipe = recipes.find((candidate) => candidate.id === 'build_lv_battery_buffer_8a')
    expect(eightAmpRecipe?.inputs).toEqual([
      { id: 'lvMachineHull', amount: 1 },
      { id: 'aluminiumPlate', amount: 4 },
      { id: 'tinCable8A', amount: 2 },
      { id: 'redAlloyWire', amount: 1 },
      { id: 'primitiveCircuit', amount: 1 },
    ])
    expect(eightAmpRecipe?.pattern).toEqual([
      'aluminiumPlate', 'redAlloyWire', 'aluminiumPlate',
      'tinCable8A', 'lvMachineHull', 'tinCable8A',
      'aluminiumPlate', 'primitiveCircuit', 'aluminiumPlate',
    ])
    expect(eightAmpRecipe?.machineOutputs).toEqual([{ id: 'lvBatteryBuffer8A', amount: 1 }])
    expect(eightAmpRecipe && recipeFitsTerminalGrid(eightAmpRecipe)).toBe(true)
  })

  it('uses crafted tin cable for both recipes and factory placement', () => {
    const cableRecipe = recipes.find((recipe) => recipe.id === 'build_tin_cable')!
    const bufferRecipe = recipes.find((recipe) => recipe.id === 'build_lv_battery_buffer')!
    let state = createFactoryState()
    state.resources.tinWire = 5
    state.resources.rubber = 4

    state = craftRecipeInstant(state, cableRecipe, 1)

    expect(state.resources.tinCable).toBe(4)
    expect(state.machines.tinCable).toBe(0)
    expect(availableUnplacedMachineCount(state, 'tinCable')).toBe(4)

    state.resources.lvMachineHull = 1
    state.resources.tinRod = 4
    state.resources.redAlloyWire = 1
    state.resources.primitiveCircuit = 1
    state = craftRecipeInstant(state, bufferRecipe, 1)

    expect(state.machines.lvBatteryBuffer).toBe(1)
    expect(state.resources.tinCable).toBe(2)

    state = placeMachineInstance(state, 'tinCable', 0, 0)
    expect(state.resources.tinCable).toBe(1)
    expect(availableUnplacedMachineCount(state, 'tinCable')).toBe(1)

    const placedCable = state.machineInstances.find((instance) => instance.machineId === 'tinCable')!
    state = removeMachineInstance(state, placedCable.uid)
    expect(state.resources.tinCable).toBe(2)
    expect(availableUnplacedMachineCount(state, 'tinCable')).toBe(2)
  })

  it('assembles tin cable from tin wire and liquid rubber', () => {
    const recipe = processRecipes.find((candidate) => candidate.id === 'lv_assembler_liquid_tin_cable')!
    expect(recipe.input).toEqual({ id: 'tinWire', amount: 4 })
    expect(recipe.fluidInput).toEqual({ id: 'liquidRubber', amount: 4 })
    expect(recipe.output).toEqual({ id: 'tinCable', amount: 4 })

    let state = createFactoryState()
    state.machines.lvAssembler = 1
    state = placeMachineInstance(state, 'lvAssembler', 0, 0)
    const assembler = state.machineInstances[0]
    assembler.process.input = { id: 'tinWire', amount: 4 }
    assembler.process.fluids.liquidRubber = 4
    assembler.process.euStored = recipe.euCost ?? 0

    state = tickGame(state, recipe.durationMs).state

    expect(state.machineInstances[0].process.input).toBeNull()
    expect(state.machineInstances[0].process.fluids.liquidRubber).toBe(0)
    expect(state.machineInstances[0].process.output).toEqual({ id: 'tinCable', amount: 4 })
  })

  it('uses liquid rubber efficiently across the tin cable assembler recipes', () => {
    const expectedFluidCosts = {
      lv_assembler_liquid_tin_cable: 4,
      lv_assembler_liquid_tin_cable_2a: 3,
      lv_assembler_liquid_tin_cable_4a: 3,
      lv_assembler_liquid_tin_cable_8a: 2,
    }

    for (const [recipeId, amount] of Object.entries(expectedFluidCosts)) {
      const recipe = processRecipes.find((candidate) => candidate.id === recipeId)
      expect(recipe?.fluidInput).toEqual({ id: 'liquidRubber', amount })
    }
  })

  it('crafts LV backbone components from shaped terminal recipes', () => {
    const expectations = [
      ['file_steel_ring', 'steelRing', ['steelRod'], ['ironFile']],
      ['cut_steel_screws', 'steelScrew', ['steelRod'], ['ironWireCutters']],
      ['file_steel_gear', 'steelGear', ['steelPlate'], ['ironFile', 'stoneHammer']],
      ['file_aluminium_gear', 'aluminiumGear', ['aluminiumPlate'], ['ironFile', 'stoneHammer']],
      ['craft_lv_motor', 'lvMotor', ['steelRod', 'copperWire', 'tinWire', 'steelGear'], ['ironWireCutters']],
      ['craft_lv_piston', 'lvPiston', ['lvMotor', 'steelPlate', 'steelRod', 'steelGear'], ['bronzeWrench']],
      ['craft_lv_pump', 'lvPump', ['lvMotor', 'steelRing', 'pipeSealant', 'steelScrew', 'bucket'], ['bronzeWrench']],
      ['craft_lv_conveyor', 'lvConveyor', ['lvMotor', 'rubber', 'tinWire'], ['ironWireCutters']],
    ] as const

    for (const [recipeId, outputId, requiredInputs, requiredCatalysts] of expectations) {
      const recipe = recipes.find((candidate) => candidate.id === recipeId)
      expect(recipe?.outputs.some((output) => output.id === outputId), recipeId).toBe(true)
      expect(recipe?.pattern, recipeId).toHaveLength(9)
      expect(recipe && recipeFitsTerminalGrid(recipe), recipeId).toBe(true)
      expect(findGridRecipe(makeGridForRecipe(recipe!), recipes)?.id, recipeId).toBe(recipeId)
      const inputIds = new Set(recipe?.inputs.map((input) => input.id))
      for (const inputId of requiredInputs) expect(inputIds.has(inputId), `${recipeId} should use ${inputId}`).toBe(true)
      const catalystIds = new Set(recipe?.catalysts?.map((input) => input.id) ?? [])
      for (const catalystId of requiredCatalysts) expect(catalystIds.has(catalystId), `${recipeId} should use ${catalystId}`).toBe(true)
    }

    expect(recipes.find((candidate) => candidate.id === 'craft_lv_motor')?.inputs.some((input) => input.id === 'primitiveCircuit')).toBe(false)
  })

  it('uses LV backbone components in LV machine recipes', () => {
    const expectations = [
      ['build_lv_macerator', ['lvMotor']],
      ['build_lv_forge_hammer', ['lvPiston']],
      ['build_lv_compressor', ['lvPiston']],
      ['build_lv_extractor', ['lvPump']],
      ['build_lv_alloy_smelter', ['lvConveyor']],
      ['build_lv_furnace', ['lvConveyor']],
      ['build_lv_wiremill', ['lvMotor']],
      ['build_lv_bender', ['lvPiston']],
      ['build_lv_lathe', ['lvMotor']],
      ['build_lv_electrolyzer', ['lvPump']],
      ['build_lv_assembler', ['lvMotor', 'lvPiston', 'lvConveyor']],
      ['build_lv_canner', ['lvPump']],
      ['build_lv_centrifuge', ['lvMotor']],
      ['build_lv_auto_miner', ['lvMotor', 'lvPiston']],
    ] as const

    for (const [recipeId, requiredInputs] of expectations) {
      const recipe = recipes.find((candidate) => candidate.id === recipeId)
      const inputIds = new Set(recipe?.inputs.map((input) => input.id))
      for (const inputId of requiredInputs) expect(inputIds.has(inputId), `${recipeId} should use ${inputId}`).toBe(true)
      expect(recipe && recipeFitsTerminalGrid(recipe), recipeId).toBe(true)
      expect(findGridRecipe(makeGridForRecipe(recipe!), recipes)?.id, recipeId).toBe(recipeId)
    }
  })

  it('loses internal EU buffers when a machine is removed and placed again', () => {
    let state = createFactoryState(1000)
    state.machines.steamTurbine = 1
    state = placeMachineInstance(state, 'steamTurbine', 0, 0)
    const firstTurbine = state.machineInstances.find((instance) => instance.machineId === 'steamTurbine')!
    state.machineInstances.find((instance) => instance.uid === firstTurbine.uid)!.process.euStored = 100

    state = removeMachineInstance(state, firstTurbine.uid)
    state = placeMachineInstance(state, 'steamTurbine', 1, 0)

    expect(state.machineInstances.find((instance) => instance.machineId === 'steamTurbine')!.process.euStored).toBe(0)
  })

  it('crafts steam and LV auto miners from full shaped machine grids', () => {
    const steamRecipe = recipes.find((recipe) => recipe.id === 'build_steam_auto_miner')!
    const lvRecipe = recipes.find((recipe) => recipe.id === 'build_lv_auto_miner')!

    expect(findGridRecipe(makeGridForRecipe(steamRecipe), recipes)?.machineOutputs).toEqual([{ id: 'steamAutoMiner', amount: 1 }])
    expect(findGridRecipe(makeGridForRecipe(lvRecipe), recipes)?.machineOutputs).toEqual([{ id: 'lvAutoMiner', amount: 1 }])
  })

  it('keeps steam auto miners limited to basic mine resources', () => {
    expect(canAutoMinerTarget('steamAutoMiner', 'stone')).toBe(true)
    expect(canAutoMinerTarget('steamAutoMiner', 'ironVein')).toBe(true)
    expect(canAutoMinerTarget('steamAutoMiner', 'copperVein')).toBe(true)
    expect(canAutoMinerTarget('steamAutoMiner', 'tinVein')).toBe(true)
    expect(canAutoMinerTarget('steamAutoMiner', 'coalSeam')).toBe(false)
    expect(canAutoMinerTarget('steamAutoMiner', 'redstoneVein')).toBe(false)
    expect(canAutoMinerTarget('steamAutoMiner', 'tree')).toBe(false)
  })

  it('lets LV auto miners target non-tree resources only', () => {
    expect(canAutoMinerTarget('lvAutoMiner', 'redstoneVein')).toBe(true)
    expect(canAutoMinerTarget('lvAutoMiner', 'sulfurVent')).toBe(true)
    expect(canAutoMinerTarget('lvAutoMiner', 'sandPatch')).toBe(false)
    expect(canAutoMinerTarget('lvAutoMiner', 'tree')).toBe(false)
    expect(canAutoMinerTarget('lvAutoMiner', 'rubberTree')).toBe(false)
  })

  it('runs a powered steam auto miner as passive gather damage', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 1
    state.machines.steamAutoMiner = 1
    state = placeMachineInstance(state, 'steamTank', 0, 0)
    state = placeMachineInstance(state, 'steamAutoMiner', 1, 0)
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    tank.process.steamStoredMs = steamTankCapacityMs
    const miner = state.machineInstances.find((instance) => instance.machineId === 'steamAutoMiner')!

    state = assignAutoMiner(state, miner.uid, 'stone')
    state = tickGame(state, 70000).state

    expect(state.resources.cobblestone).toBe(0)
    expect(state.machineInstances.find((instance) => instance.uid === miner.uid)?.process.output).toEqual({ id: 'cobblestone', amount: 5 })
    expect(state.machineInstances.find((instance) => instance.uid === miner.uid)?.process.miningDamage).toBeGreaterThan(0)
    expect(state.machineInstances.find((instance) => instance.uid === miner.uid)?.process.steamStoredMs ?? 0).toBeLessThan(32000)
  })

  it('runs powered auto miners during offline progress', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 1
    state.machines.steamAutoMiner = 1
    state = placeMachineInstance(state, 'steamTank', 0, 0)
    state = placeMachineInstance(state, 'steamAutoMiner', 1, 0)
    state.machineInstances.find((instance) => instance.machineId === 'steamTank')!.process.steamStoredMs = steamTankCapacityMs
    const miner = state.machineInstances.find((instance) => instance.machineId === 'steamAutoMiner')!
    state = assignAutoMiner(state, miner.uid, 'stone')

    const result = simulateOfflineProgress(state, 70_000, 71_000)

    expect(result.state.resources.cobblestone).toBe(0)
    expect(result.state.machineInstances.find((instance) => instance.uid === miner.uid)?.process.output).toEqual({ id: 'cobblestone', amount: 5 })
    expect(result.offline.resourceDelta).toEqual([])
  })

  it('does not deal auto miner damage before the action lands', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 1
    state.machines.steamAutoMiner = 1
    state = placeMachineInstance(state, 'steamTank', 0, 0)
    state = placeMachineInstance(state, 'steamAutoMiner', 1, 0)
    state.machineInstances.find((instance) => instance.machineId === 'steamTank')!.process.steamStoredMs = steamTankCapacityMs
    const miner = state.machineInstances.find((instance) => instance.machineId === 'steamAutoMiner')!

    state = assignAutoMiner(state, miner.uid, 'stone')
    state = tickGame(state, 4000).state

    const nextMiner = state.machineInstances.find((instance) => instance.uid === miner.uid)!
    expect(nextMiner.process.progressMs).toBe(4000)
    expect(nextMiner.process.miningDamage).toBe(0)
    expect(state.resources.cobblestone).toBe(0)
  })

  it('fills an unassigned steam auto miner buffer when connected to steam', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 1
    state.machines.steamAutoMiner = 1
    state = placeMachineInstance(state, 'steamTank', 0, 0)
    state = placeMachineInstance(state, 'steamAutoMiner', 1, 0)
    state.machineInstances.find((instance) => instance.machineId === 'steamTank')!.process.steamStoredMs = steamTankCapacityMs
    const miner = state.machineInstances.find((instance) => instance.machineId === 'steamAutoMiner')!

    state = tickGame(state, 1000).state

    const nextMiner = state.machineInstances.find((instance) => instance.uid === miner.uid)!
    expect(nextMiner.process.steamStoredMs).toBeGreaterThan(0)
    expect(nextMiner.process.activeRecipeId).toBeNull()
    expect(state.resources.cobblestone).toBe(0)
  })

  it('stacks multiple powered auto miners on the same resource', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 1
    state.machines.steamAutoMiner = 2
    state = placeMachineInstance(state, 'steamTank', 0, 0)
    state = placeMachineInstance(state, 'steamAutoMiner', 1, 0)
    state = placeMachineInstance(state, 'steamAutoMiner', 0, 1)
    state.machineInstances.find((instance) => instance.machineId === 'steamTank')!.process.steamStoredMs = steamTankCapacityMs
    const miners = state.machineInstances.filter((instance) => instance.machineId === 'steamAutoMiner')

    state = assignAutoMiner(state, miners[0].uid, 'stone')
    state = assignAutoMiner(state, miners[1].uid, 'stone')
    state = tickGame(state, 35000).state

    expect(
      state.machineInstances
        .filter((instance) => instance.machineId === 'steamAutoMiner')
        .reduce((total, instance) => total + (instance.process.output?.amount ?? 0), 0),
    ).toBe(4)
  })

  it('runs LV auto miners from connected EU and clears assignment when removed', () => {
    let state = createFactoryState(1000)
    state.machines.steamTurbine = 1
    state.machines.lvAutoMiner = 1
    state = placeMachineInstance(state, 'steamTurbine', 0, 0)
    state = placeMachineInstance(state, 'lvAutoMiner', 1, 0)
    state.machineInstances.find((instance) => instance.machineId === 'steamTurbine')!.process.euStored = steamTurbineEuCapacity
    const miner = state.machineInstances.find((instance) => instance.machineId === 'lvAutoMiner')!

    state = assignAutoMiner(state, miner.uid, 'ironVein')
    expect(isAutoMinerPowered(state, miner)).toBe(true)
    state = tickGame(state, 25000).state

    expect(state.resources.ironOre).toBe(0)
    expect(state.machineInstances.find((instance) => instance.uid === miner.uid)?.process.output?.id).toBe('ironOre')
    state = unassignAutoMiner(state, miner.uid)
    expect(state.autoMinerAssignments[miner.uid]).toBeUndefined()
    state = assignAutoMiner(state, miner.uid, 'ironVein')
    state = removeMachineInstance(state, miner.uid)
    expect(state.autoMinerAssignments[miner.uid]).toBeUndefined()
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
      'build_steam_auto_miner',
      'build_steam_turbine',
      'build_liquid_steam_boiler',
    ])
    expect(searchTerminalRecipes('dynamo').map((recipe) => recipe.id)).toEqual([])
  })

  it('finds terminal usages for an input resource', () => {
    const usages = recipesUsingInput('plank').map((recipe) => recipe.id)

    expect(usages).toContain('craft_sticks')
    expect(usages).toContain('craft_wooden_pickaxe')
  })

  it('indexes recipe graph resource producers and users', () => {
    expect(recipesProducingResource('plank', recipes).map((recipe) => recipe.id)).toContain('craft_planks')
    expect(recipesUsingResource('mortar', recipes).map((recipe) => recipe.id)).toContain('grind_iron_ingot')
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
    const ironCrowbarGrid: CraftSlot[] = [
      { id: 'ironRod' },
      null,
      null,
      null,
      { id: 'ironRod' },
      null,
      { id: 'ironPlate' },
      { id: 'ironPlate' },
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
    expect(findGridRecipe(ironCrowbarGrid, recipes)?.id).toBe('craft_iron_crowbar')
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

  it('encodes reusable survey cards and records the exact recipe milestone', () => {
    let state = createFactoryState()
    state.resources.surveyKit = 1
    state.resources.coal = 8
    const recipe = recipes.find((candidate) => candidate.id === 'encode_coalSeam_survey_card')!

    state = craftRecipeInstant(state, recipe, 1)

    expect(state.resources.surveyKit).toBe(0)
    expect(state.resources.coal).toBe(0)
    expect(state.surveyCards.coalSeam).toBe(1)
    expect(state.recipeMilestones[recipe.id]).toBe(1)
  })

  it('opens Reach gathering only while the 2x2 gate is formed', () => {
    let state = createFactoryState()
    state.resources.ironPickaxe = 1
    state = equipResource(state, 'pickaxe', 'ironPickaxe')

    expect(hitGatherTarget(state, 'sulfurVent').state.gatherProgress.sulfurVent).toBeUndefined()

    state.machines.reachGateCasing = 4
    state = placeMachineInstance(state, 'reachGateCasing', 0, 0)
    state = placeMachineInstance(state, 'reachGateCasing', 1, 0)
    state = placeMachineInstance(state, 'reachGateCasing', 0, 1)
    state = placeMachineInstance(state, 'reachGateCasing', 1, 1)

    expect(isReachGateFormed(state)).toBe(true)
    expect(hitGatherTarget(state, 'sulfurVent').state.gatherProgress.sulfurVent).toBe(5)
  })

  it('requires a matching Survey Card in the LV miner inventory', () => {
    let state = createFactoryState()
    state.machines.lvAutoMiner = 1
    state = placeMachineInstance(state, 'lvAutoMiner', 0, 0)
    const miner = state.machineInstances[0]

    expect(assignAutoMiner(state, miner.uid, 'coalSeam')).toBe(state)
    state.surveyCards.coalSeam = 1
    expect(assignAutoMiner(state, miner.uid, 'coalSeam')).toBe(state)
    state = installSurveyCardInAutoMiner(state, miner.uid, 'coalSeam')

    expect(state.surveyCards.coalSeam).toBeUndefined()
    expect(state.machineInstances[0].surveyCardTarget).toBe('coalSeam')
    expect(questObjectiveProgress(state, { type: 'surveyCard', id: 'coalSeam', amount: 1 }).current).toBe(1)
    state = assignAutoMiner(state, miner.uid, 'coalSeam')

    expect(state.autoMinerAssignments[miner.uid]).toBe('coalSeam')
    state = removeSurveyCardFromAutoMiner(state, miner.uid)
    expect(state.autoMinerAssignments[miner.uid]).toBeUndefined()
    expect(state.machineInstances[0].surveyCardTarget).toBeUndefined()
    expect(state.surveyCards.coalSeam).toBe(1)
  })

  it('migrates legacy duplicated Survey Cards into the miner inventory', () => {
    const state = loadGame(JSON.stringify({
      version: 7,
      factoryFoundationLevel: 2,
      machines: { lvAutoMiner: 0 },
      surveyCards: { coalSeam: 1 },
      autoMinerAssignments: { miner: 'coalSeam' },
      machineInstances: [{
        uid: 'miner',
        machineId: 'lvAutoMiner',
        x: 0,
        y: 0,
        level: 1,
        surveyCardTarget: 'coalSeam',
      }],
    }), 3000)

    expect(state.version).toBe(10)
    expect(state.machineInstances[0].surveyCardTarget).toBe('coalSeam')
    expect(state.surveyCards.coalSeam).toBeUndefined()
    expect(state.autoMinerAssignments.miner).toBe('coalSeam')
  })

  it('stores auto-mined drops in the miner output instead of global inventory', () => {
    let state = createFactoryState()
    state.machines.lvAutoMiner = 1
    state = placeMachineInstance(state, 'lvAutoMiner', 0, 0)
    const uid = state.machineInstances[0].uid
    state = assignAutoMiner(state, uid, 'stone')
    state.machineInstances[0].process.euStored = 128

    state = tickGame(state, lvAutoMinerActionMs * 8).state

    expect(state.resources.cobblestone).toBe(0)
    expect(state.machineInstances[0].process.output?.id).toBe('cobblestone')
    expect(state.machineInstances[0].process.output?.amount).toBeGreaterThan(0)
  })

  it('lets a hopper extract a Steam Auto Miner local output', () => {
    let state = createFactoryState()
    state.machines.steamAutoMiner = 1
    state.machines.hopper = 1
    state.machines.furnace = 1
    state = placeMachineInstance(state, 'steamAutoMiner', 0, 0)
    state = placeMachineInstance(state, 'hopper', 1, 0)
    state = placeMachineInstance(state, 'furnace', 2, 0)
    const miner = state.machineInstances.find((instance) => instance.machineId === 'steamAutoMiner')!
    const hopper = state.machineInstances.find((instance) => instance.machineId === 'hopper')!
    miner.process.output = { id: 'cobblestone', amount: 2 }
    state = setHopperOutputDirection(state, hopper.uid, 'east')

    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === miner.uid)?.process.output?.amount).toBe(1)
    expect(state.machineInstances.find((instance) => instance.machineId === 'furnace')?.process.input).toEqual({ id: 'cobblestone', amount: 1 })
  })

  it('runs the Chemical Reactor fluid recipe and records engine truth', () => {
    let state = createFactoryState()
    state.machines.lvChemicalReactor = 1
    state = placeMachineInstance(state, 'lvChemicalReactor', 0, 0)
    const reactor = state.machineInstances[0]
    reactor.process.input = { id: 'rubberSap', amount: 2 }
    reactor.process.secondaryInput = { id: 'sulfurDust', amount: 1 }
    reactor.process.euStored = 128

    expect(reactor.process.fluidCapacityLitres).toBe(32)

    state = tickGame(state, 8000).state

    expect(state.machineInstances[0].process.fluids.liquidRubber).toBe(8)
    expect(state.recipeMilestones.lv_reactor_liquid_rubber).toBe(1)
  })

  it('powers the Chemical Reactor independently of its closed fluid outlet faces', () => {
    let state = createFactoryState()
    state.machines.steamTurbine = 1
    state.resources.tinCable = 1
    state.machines.lvChemicalReactor = 1
    state = placeMachineInstance(state, 'steamTurbine', 0, 0)
    state = placeMachineInstance(state, 'tinCable', 1, 0)
    state = placeMachineInstance(state, 'lvChemicalReactor', 2, 0)
    const turbine = state.machineInstances.find((instance) => instance.machineId === 'steamTurbine')!
    const reactor = state.machineInstances.find((instance) => instance.machineId === 'lvChemicalReactor')!
    turbine.process.euStored = 256

    expect(reactor.pipeSideModes).toEqual({ north: 'blocked', east: 'blocked', south: 'blocked', west: 'blocked' })

    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === reactor.uid)?.process.euStored).toBeGreaterThan(0)
    expect(state.machineInstances.find((instance) => instance.uid === turbine.uid)?.process.euStored).toBeLessThan(256)
  })

  it('moves supported fluids through reusable 8L steel cells', () => {
    let state = createFactoryState()
    state.machines.lvChemicalReactor = 1
    state.machines.lvAssembler = 1
    state = placeMachineInstance(state, 'lvChemicalReactor', 0, 0)
    state = placeMachineInstance(state, 'lvAssembler', 2, 0)
    state.resources.emptySteelCell = 1
    state.machineInstances[0].process.fluidCapacityLitres = 32
    state.machineInstances[0].process.fluids.liquidRubber = 8

    state = fillPortableFluidContainer(state, state.machineInstances[0].uid, 'steelCell', { fluidId: 'liquidRubber', bufferId: 'reaction' })
    expect(state.fluidContainers[0]).toMatchObject({ kind: 'steelCell', fluidId: 'liquidRubber', amountLitres: 8 })
    expect(fluidContainerGroups(state)[0].count).toBe(1)
    state = drainPortableFluidContainer(state, state.machineInstances[1].uid, state.fluidContainers[0].uid, 'input')

    expect(state.resources.emptySteelCell).toBe(1)
    expect(state.machineInstances[1].process.fluids.liquidRubber).toBe(8)
  })

  it('feeds a liquid steam boiler from water and fuel drained into its named buffers', () => {
    let state = createFactoryState()
    state.machines.liquidSteamBoiler = 1
    state = placeMachineInstance(state, 'liquidSteamBoiler', 0, 0)
    const boiler = state.machineInstances[0]
    boiler.process.fluids.water = 12
    boiler.process.fluids.creosote = 1

    state = tickGame(state, 1000).state

    expect(state.machineInstances[0].process.steamStoredMs).toBe(36000)
    expect(state.machineInstances[0].process.fluids.water).toBe(0)
    expect(state.machineInstances[0].process.fluids.creosote).toBe(0)
  })

  it('routes generic recipe fluids through pipes into a compatible machine buffer', () => {
    let state = createFactoryState()
    state.machines.lvChemicalReactor = 1
    state.machines.copperPipe = 1
    state.machines.lvAssembler = 1
    state = placeMachineInstance(state, 'lvChemicalReactor', 0, 0)
    state = placeMachineInstance(state, 'copperPipe', 1, 0)
    state = placeMachineInstance(state, 'lvAssembler', 2, 0)
    const reactor = state.machineInstances.find((instance) => instance.machineId === 'lvChemicalReactor')!
    const pipe = state.machineInstances.find((instance) => instance.machineId === 'copperPipe')!
    state = setFluidOutputDirection(state, reactor.uid, 'east')
    state = setPipeSideMode(state, pipe.uid, 'west', 'input')
    state = setPipeSideMode(state, pipe.uid, 'east', 'output')
    state.machineInstances.find((instance) => instance.uid === reactor.uid)!.process.fluids.liquidRubber = 16

    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.machineId === 'lvAssembler')!.process.fluids.liquidRubber).toBeGreaterThan(0)
    expect(state.machineInstances.find((instance) => instance.uid === reactor.uid)!.process.fluids.liquidRubber).toBeLessThan(16)
  })

  it('keeps partial portable containers as exact metadata and groups identical fills', () => {
    let state = createFactoryState()
    state.machines.lvChemicalReactor = 1
    state = placeMachineInstance(state, 'lvChemicalReactor', 0, 0)
    const reactor = state.machineInstances[0]
    reactor.process.fluids.liquidRubber = 5
    state.resources.emptySteelCell = 2

    state = fillPortableFluidContainer(state, reactor.uid, 'steelCell', { fluidId: 'liquidRubber', bufferId: 'reaction' })
    expect(state.fluidContainers[0].amountLitres).toBe(5)
    expect(state.resources.emptySteelCell).toBe(1)

    state.machineInstances[0].process.fluids.liquidRubber = 5
    state = fillPortableFluidContainer(state, reactor.uid, 'steelCell', { fluidId: 'liquidRubber', bufferId: 'reaction' })
    expect(fluidContainerGroups(state)).toHaveLength(1)
    expect(fluidContainerGroups(state)[0]).toMatchObject({ amountLitres: 5, count: 2 })
    expect(fluidContainerCapacities.steelCell).toBe(8)
  })

  it('migrates legacy filled cells and clamps an old bucket to 1L', () => {
    const state = loadGame(JSON.stringify({
      version: 8,
      resources: { bucket: 1, waterSteelCell: 2, liquidRubberSteelCell: 1 },
      bucketFluid: { id: 'creosote', amount: 16 },
    }), 1000)

    expect(state.resources.bucket).toBe(0)
    expect(state.fluidContainers.filter((container) => container.kind === 'steelCell')).toHaveLength(3)
    expect(state.fluidContainers.find((container) => container.kind === 'bucket')).toMatchObject({ fluidId: 'creosote', amountLitres: 1 })
    expect(state.migrationNotices).toContain('portable-fluid-containers')
  })
})

