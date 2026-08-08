import { describe, expect, it } from 'vitest'
import {
  canAutoMinerTarget,
  createInitialState,
  fuelDefinitions,
  gatherTargets,
  isEuCableMachine,
  isItemConductorMachine,
  isResourceBackedMachine,
  isFluidSinkMachine,
  isTankStorageMachine,
  machines,
  processRecipes,
  quests,
  recipes,
  sellItems,
  shopItems,
} from './content'
import { processRecipesProducingResource, processRecipeToCatalogRecipe, recipesProducingResource, recipesUsingResource } from './recipeGraph'
import { groupRecipesByOutput } from './recipeGroups'
import { mvMachineIds } from './mvIds'
import {
  availableConnectedEu,
  availableConnectedEuAmps,
  availableConnectedEuStorage,
  availableConnectedSteam,
  arcBlastFurnaceStructureForInstance,
  availableResourceAmount,
  availableUnplacedMachineCount,
  assignAutoMiner,
  attachFabricationFace,
  attachFabricationInterface,
  buyShopItem,
  cancelFabricationJob,
  boilerHasWater,
  boilerSteamCapacityMs,
  boilerSteamProductionLitresPerSecond,
  fluidContainerCapacities,
  fluidContainerGroups,
  canBuyShopItem,
  canCrowbarRemoveMachine,
  canResourceEnterProcessSlot,
  canExpandFactoryFloor,
  canSellShopItem,
  cokeOvenFluidCapacityLitres,
  canCraft,
  claimAllQuestRewards,
  claimQuestReward,
  collectProcessMachineOutput,
  collectProcessOutput,
  conductorFaceSettings,
  crowbarRemoveMachineInstance,
  createCreativeFactoryState,
  createCreativeState,
  currentEuCableFlowEuPerSecond,
  currentFluidOutputFlows,
  currentWellWaterFlowLitresPerSecond,
  currentSteamPipeFlowLitresPerSecond,
  craftableQuantity,
  craftRecipeInstant,
  durabilityRemaining,
  encodeCraftingRecipeCard,
  encodeProcessingRecipeCard,
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
  installRecipeCard,
  installLvBatteryInBuffer,
  installSurveyCardInAutoMiner,
  isAutoMinerPowered,
  isReachGateFormed,
  loadGame,
  loadGameWithOfflineProgress,
  loadProcessRecipeInputs,
  drainPortableFluidContainer,
  liquidSteamBoilerCapacityMs,
  liquidSteamBoilerCreosoteUseLitresPerSecond,
  liquidSteamBoilerFluidCapacityLitres,
  lvItemAutomationStatus,
  lvAutoMinerActionMs,
  makeGridForRecipe,
  machinesCanConnectEu,
  maxDurability,
  missingForQuantity,
  missingForRecipe,
  multiblockControllerForInstance,
  placeMachineInstance,
  pipeDirections,
  planningRackStructureForInstance,
  previewFabricationRequest,
  processRecipeInputLoadStatus,
  processStackLimit,
  questKind,
  questObjectiveProgress,
  questObjectiveProgressRows,
  questProgress,
  questScripReward,
  questStatus,
  recipeFitsTerminalGrid,
  recipesUsingInput,
  requestFabricationJob,
  removeMachineInstance,
  removeConductorLane,
  removeFabricationFaceAttachment,
  removeFabricationInterface,
  removeProcessSlot,
  removeRecipeCard,
  removeMachineStorageSlot,
  removeLvBatteryFromBuffer,
  removeSurveyCardFromAutoMiner,
  searchTerminalRecipes,
  saveGame,
  sellShopItem,
  setFluidOutputDirection,
  setFabricationInterfaceFace,
  setConfiguredProcessProgram,
  setConductorFaceSettings,
  setHopperOutputDirection,
  setLvItemOutputDirection,
  setBatteryBufferOutputDirection,
  shopItemCooldownMs,
  shopItemCooldownRemainingMs,
  simulateOfflineProgress,
  setPipeSideMode,
  setPipeSideDisabled,
  pipeSideMode,
  batteryBufferOutputDirection,
  batteryBufferLiveEuRates,
  fluidPipeBufferCapacityLitres,
  steamMsPerLitre,
  steamPipeBufferCapacityMs,
  steamMaceratorCapacityMs,
  steamTankCapacityMs,
  steamTankCapacityMsForInstance,
  steamTankFluidCapacityLitresForInstance,
  steamTankLiveSteamRates,
  steamTankStructureForInstance,
  steelTankCapacityMs,
  steelTankFluidCapacityLitres,
  steamNetworkMetrics,
  steamTurbineEuCapacity,
  steamTurbineSteamUseLitresPerSecond,
  terminalAvailableAmount,
  tickGame,
  toggleFabricationBusFluidFilter,
  wasteOutletCapacityLitres,
  wasteOutletDisposalLitresPerSecond,
  wasteOutletLiveRates,
  toggleFabricationBusItemFilter,
  topUpCreativeState,
  offlineProgressCapMs,
  offlineSimulationStepCount,
  unequipSlot,
  unassignAutoMiner,
  visibleQuests,
  visibleRecipes,
  wellWaterOutputLitresPerSecond,
} from './engine'
import type { CraftSlot, MachineId, PipeDirection, PipeSideMode, QuestId, Recipe, ResourceId } from './types'

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

  it('builds the first 8x8 factory foundation from basic materials', () => {
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
    expect(factoryGridForState(state)).toEqual({ width: 8, height: 8 })
    expect(state.resources.plank).toBe(0)
    expect(state.resources.cobblestone).toBe(0)

    state.machines.furnace = 1
    state = placeMachineInstance(state, 'furnace', 7, 7)
    expect(state.machineInstances).toHaveLength(1)
    expect(placeMachineInstance(state, 'furnace', 8, 0)).toBe(state)
  })

  it('expands the factory floor through capped progression sizes', () => {
    let state = createFactoryState(1000, 1)
    state.resources.cobblestone = 1800
    state.resources.brick = 800
    state.resources.ironPlate = 72
    state.resources.steelPlate = 64
    state.resources.aluminiumPlate = 64
    state.resources.mvMachineCasing = 4

    state = expandFactoryFloor(state)
    expect(state.factoryFoundationLevel).toBe(2)
    expect(factoryGridForState(state)).toEqual({ width: 12, height: 10 })

    state = expandFactoryFloor(state)
    expect(factoryGridForState(state)).toEqual({ width: 14, height: 12 })

    state = expandFactoryFloor(state)
    expect(factoryGridForState(state)).toEqual({ width: 16, height: 14 })

    state = expandFactoryFloor(state)
    expect(factoryGridForState(state)).toEqual({ width: 18, height: 16 })

    expect(factoryFoundationCost(state)).toEqual([
      { id: 'cobblestone', amount: 384 },
      { id: 'brick', amount: 192 },
      { id: 'steelPlate', amount: 16 },
      { id: 'aluminiumPlate', amount: 16 },
    ])

    state = expandFactoryFloor(state)
    expect(state.factoryFoundationLevel).toBe(6)
    expect(factoryGridForState(state)).toEqual({ width: 20, height: 18 })
    expect(factoryFoundationCost(state)).toEqual([
      { id: 'cobblestone', amount: 512 },
      { id: 'brick', amount: 256 },
      { id: 'steelPlate', amount: 32 },
      { id: 'aluminiumPlate', amount: 32 },
      { id: 'mvMachineCasing', amount: 4 },
    ])

    state = expandFactoryFloor(state)
    expect(state.factoryFoundationLevel).toBe(7)
    expect(factoryGridForState(state)).toEqual({ width: 24, height: 20 })
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

  it('keeps a craftable iron pickaxe available before its guide quest completes', () => {
    const state = createInitialState(1000)
    state.resources.ironIngot = 3
    state.resources.stick = 2
    const ironPickaxe = recipes.find((recipe) => recipe.id === 'craft_iron_pickaxe')!

    expect(state.completedQuests).not.toContain('buildFurnace')
    expect(canCraft(state, ironPickaxe)).toBe(true)
    expect(visibleRecipes(state).map((recipe) => recipe.id)).toContain('craft_iron_pickaxe')
  })

  it('guides the early factory and bronze steps in dependency order', () => {
    const quest = (id: (typeof quests)[number]['id']) => quests.find((candidate) => candidate.id === id)!

    expect(quest('buildFoundation').prerequisites).toEqual(['craftAxe', 'mineStone', 'craftShovelQuest'])
    expect(quest('buildFurnace').prerequisites).toEqual(['buildFoundation'])
    expect(quest('firstDirt').prerequisites).toEqual(['buildFurnace'])
    expect(quest('craftMortar').prerequisites).toEqual(['copperAndTin'])
    expect(quest('bronzeAge').prerequisites).toEqual(['craftMortar'])
    expect(quest('buildWell').prerequisites).toEqual(['buildFoundation', 'bronzeAge', 'makeBricks'])
    expect(questKind(quest('craftMortar'))).toBe('main')
    expect(questKind(quest('gatherClay'))).toBe('main')
    expect(recipes.find((recipe) => recipe.id === 'build_furnace')?.unlockedBy).toBe('buildFoundation')
    expect(recipes.find((recipe) => recipe.id === 'craft_mortar')?.unlockedBy).toBe('copperAndTin')
    expect(recipes.find((recipe) => recipe.id === 'bronze_blend')?.unlockedBy).toBe('craftMortar')
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

  it('lets experienced players complete early milestones before returning to the quest book', () => {
    const state = createFactoryState(1000, 1)
    state.resourceMilestones.log = 8
    state.resourceMilestones.plank = 4
    state.resourceMilestones.stick = 4
    state.resourceMilestones.woodenAxe = 1
    state.resourceMilestones.woodenPickaxe = 1
    state.resourceMilestones.woodenShovel = 1
    state.resourceMilestones.cobblestone = 8
    state.resourceMilestones.gravel = 1

    const result = tickGame(state, 250)

    expect(result.state.completedQuests).toEqual(expect.arrayContaining([
      'punchTree',
      'craftPlanks',
      'craftSticks',
      'craftAxe',
      'mineStone',
      'craftShovelQuest',
      'buildFoundation',
    ]))
    expect(result.state.claimedQuests).toEqual([])
    expect(result.state.scrip).toBe(0)
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

  it('keeps workshop tip quests informational rather than adding scrip', () => {
    const tipQuest = quests.find((candidate) => candidate.id === 'equipToolTipQuest')!

    expect(questScripReward(tipQuest)).toBe(0)
  })

  it('keeps historical quest completion authoritative after objectives change', () => {
    const state = createInitialState(1000)
    const quest = quests.find((candidate) => candidate.id === 'makeEmptyBatteryCellQuest')!
    state.completedQuests = [quest.id]
    state.claimedQuests = [quest.id]

    expect(questProgress(state, quest)).toBe(1)
    expect(questObjectiveProgressRows(state, quest).every((progress) => progress.complete)).toBe(true)
  })

  it('credits any valid production route in an alternative-recipe objective', () => {
    const cases = [
      ['cureLiquidRubberQuest', 'lv_furnace_rubber_pulp'],
      ['makeEmptyBatteryCellQuest', 'lv_alloy_battery_alloy_dust'],
      ['insulateWithLiquidRubberQuest', 'lv_assembler_liquid_tin_cable_4a'],
      ['makeLiquidPolyethyleneQuest', 'polymerize_with_air'],
      ['makeLiquidPolyethyleneQuest', 'polymerize_with_oxygen'],
    ] as const

    for (const [questId, recipeId] of cases) {
      const state = createInitialState(1000)
      const quest = quests.find((candidate) => candidate.id === questId)!
      const objective = quest.objectives!.find((candidate) => candidate.type === 'recipeAny')!
      expect(questObjectiveProgress(state, objective).complete, questId).toBe(false)
      state.recipeMilestones[recipeId] = 1
      expect(questObjectiveProgress(state, objective).complete, questId).toBe(true)
    }
  })

  it('completes the solid rubber quest through a running Steam Furnace', () => {
    let state = createFactoryState(1000)
    state.completedQuests = ['separateStickyResinQuest']
    state.machines.well = 1
    state.machines.steamBoiler = 1
    state.machines.steamFurnace = 1
    state.resources.coal = 1
    state.resources.rubberPulp = 1
    state = placeMachineInstance(state, 'well', 0, 0)
    state = placeMachineInstance(state, 'steamBoiler', 1, 0)
    state = placeMachineInstance(state, 'steamFurnace', 2, 0)

    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    const furnace = state.machineInstances.find((instance) => instance.machineId === 'steamFurnace')!
    state = insertProcessSlot(state, boiler.uid, 'fuel', 'coal', 1)
    state = tickGame(state, 32000).state
    expect(state.machineInstances.find((instance) => instance.uid === furnace.uid)!.process.steamStoredMs).toBeGreaterThan(0)
    state = insertProcessSlot(state, furnace.uid, 'input', 'rubberPulp', 1)
    state = tickGame(state, 4000).state

    expect(state.recipeMilestones.steam_furnace_rubber_pulp).toBe(1)
    expect(state.completedQuests).toContain('cureLiquidRubberQuest')
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

  it('batches long offline progress into bounded simulation steps', () => {
    expect(offlineSimulationStepCount(offlineProgressCapMs)).toBeLessThan(250)
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
    expect(quests.some((quest) => String(quest.id) === 'buildLvBenderQuest')).toBe(false)
    expect(bender.prerequisites).toEqual(['fillLvBatteryQuest'])
    expect(bender.requirements.machines).toEqual([{ id: 'lvBender', amount: 1 }])
    expect(questKind(lathe)).toBe('main')
    expect(questKind(bauxite)).toBe('main')
    expect(questKind(aluminiumDust)).toBe('main')
    expect(electrolyzer.prerequisites).toEqual(['runLvBenderQuest', 'runLvLatheQuest'])
    expect(bauxite.prerequisites).toEqual(['buildLvElectrolyzerQuest'])
    expect(aluminiumDust.prerequisites).toEqual(['findBauxiteQuest'])
    expect(diamondPick.prerequisites).toEqual(['bufferLvPowerQuest'])
    expect(batteryMinerals.prerequisites).toEqual(['makeDiamondPickQuest'])
    expect(emptyCell.prerequisites).toEqual(['gatherBatteryMineralsQuest'])
    expect(emptyCell.objectives?.filter((objective) => objective.type === 'machine')).toEqual([
      { type: 'machine', id: 'lvAlloySmelter', amount: 1, progressMode: 'lifetime' },
      { type: 'machine', id: 'lvBender', amount: 1, progressMode: 'lifetime' },
    ])
    expect(emptyCell.objectives?.find((objective) => objective.type === 'recipeAny')).toMatchObject({
      ids: ['lv_alloy_battery_alloy_dust', 'lv_alloy_battery_alloy_ingots'],
      amount: 1,
    })
    expect(emptyCell.objectives).toContainEqual({ type: 'recipe', id: 'lv_bender_battery_alloy_plate', amount: 4 })
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
    expect(coils.requirements.resources).toContainEqual({ id: 'heatProofCasing', amount: 17 })
    expect(arcFurnace.objectives).toContainEqual({ type: 'placedMachine', id: 'arcBlastFurnace', amount: 1, label: 'Formed 3x3 Arc Furnace' })
  })

  it('does not award offline progress from an unverified save timestamp', () => {
    const state = createInitialState(1000)
    const raw = saveGame(state, 1000, false)

    const result = loadGameWithOfflineProgress(raw, 8 * 60 * 60 * 1000 + 1000)

    expect(result.offline).toMatchObject({
      applied: false,
      reason: 'unverified-save-time',
      suspicious: false,
    })
    expect(result.state.lastSavedAt).toBe(8 * 60 * 60 * 1000 + 1000)
    expect(result.state.lastSavedAtVerified).toBe(true)
  })

  it('branches LV separation, gases, and sulfur chemistry without optional gates', () => {
    const quest = (id: QuestId) => quests.find((candidate) => candidate.id === id)!

    expect(quest('buildLvCentrifugeQuest').prerequisites).toEqual(['buildFourAmpBufferQuest'])
    expect(quest('separateStickyResinQuest').prerequisites).toEqual(['buildLvCentrifugeQuest', 'treeTapQuest'])
    expect(quest('buildAirCollectorQuest').prerequisites).toEqual(['buildLvCentrifugeQuest'])
    expect(quest('separateAirQuest').prerequisites).toEqual(['buildAirCollectorQuest'])
    expect(quest('useGlueQuest').prerequisites).toEqual(['buildLvAssemblerForPortsQuest'])
    expect(quest('buildChemicalReactorQuest').prerequisites).toEqual(['makeSulfurDustQuest', 'makeLvMotionPartsQuest'])
    expect(quest('makeLiquidRubberQuest').prerequisites).toEqual(['buildChemicalReactorQuest', 'separateStickyResinQuest'])
    expect(quest('craftArcItemBusesQuest').prerequisites).toEqual(['buildLvAssemblerForPortsQuest'])
    expect(questKind(quest('centrifugeByproductsQuest'))).toBe('optional')
    expect(questKind(quest('routeSeparatedGasesQuest'))).toBe('optional')
    expect(questKind(quest('craftSteelCellsQuest'))).toBe('optional')
  })

  it('completes an already-satisfied child quest when its parent completes', () => {
    const state = createFactoryState(1000)
    state.resources.log = 1
    state.resources.plank = 4

    const result = tickGame(state, 1, 1001)

    expect(result.questCompletions).toEqual(['punchTree', 'craftPlanks', 'recipeBrowserTipQuest'])
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

  it('requires the placed boiler to produce steam before completing the lesson', () => {
    let state = createFactoryState(1000)
    state.completedQuests.push('craftSteamCasingQuest')
    state.machines.steamBoiler = 1
    state.machineMilestones.steamBoiler = 1
    state = placeMachineInstance(state, 'steamBoiler', 0, 0)
    state.recipeMilestones.operation_steam_generated = 1

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
      build_lv_bender: 'gatherBatteryMineralsQuest',
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
      amount: arcFurnace.inputs.find((input) => input.id === 'heatProofCasing')!.amount +
        stagedCasing.inputs.find((input) => input.id === 'heatProofCasing')!.amount * 4,
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

  it('repairs duplicated machine UIDs from saved factories', () => {
    let saved = createFactoryState()
    saved.machines.lvAssembler = 2
    saved = placeMachineInstance(saved, 'lvAssembler', 0, 0)
    saved = placeMachineInstance(saved, 'lvAssembler', 1, 0)
    saved.machineInstances[1].uid = saved.machineInstances[0].uid

    const restored = loadGame(JSON.stringify(saved), 2000)
    const [first, second] = restored.machineInstances
    expect(new Set(restored.machineInstances.map((instance) => instance.uid)).size).toBe(2)
    expect(first.uid).toBe(saved.machineInstances[0].uid)
    expect(second.uid).not.toBe(first.uid)

    const reconfigured = setConfiguredProcessProgram(restored, second.uid, 1)
    expect(reconfigured.machineInstances.find((instance) => instance.uid === first.uid)!.process.configuredProgramNumber).toBe(0)
    expect(reconfigured.machineInstances.find((instance) => instance.uid === second.uid)!.process.configuredProgramNumber).toBe(1)
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
    expect(factoryGridForState(state)).toEqual({ width: 12, height: 10 })
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

    expect(state.version).toBe(20)
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

    expect(state.version).toBe(20)
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

  it('adds multi-output and recipe-program fields when loading version 11 machines', () => {
    const state = loadGame(JSON.stringify({
      version: 11,
      factoryFoundationLevel: 2,
      machines: { lvCentrifuge: 1 },
      machineInstances: [{
        uid: 'old-centrifuge',
        machineId: 'lvCentrifuge',
        x: 0,
        y: 0,
        level: 1,
        process: { input: null, output: { id: 'flint', amount: 2 } },
      }],
    }), 1000)

    expect(state.version).toBe(20)
    expect(state.machineInstances[0].process.output).toEqual({ id: 'flint', amount: 2 })
    expect(state.machineInstances[0].process.output2).toBeNull()
    expect(state.machineInstances[0].process.configuredProgramNumber).toBe(0)
  })

  it('migrates legacy recipe selections to reusable program numbers', () => {
    const state = loadGame(JSON.stringify({
      version: 14,
      factoryFoundationLevel: 2,
      machines: { lvAssembler: 1 },
      machineInstances: [{
        uid: 'old-assembler',
        machineId: 'lvAssembler',
        x: 0,
        y: 0,
        level: 1,
        process: { configuredRecipeId: 'lv_assemble_fluid_output_hatch' },
      }],
    }), 1000)

    expect(state.machineInstances[0].process.configuredProgramNumber).toBe(4)
    expect(state.machineInstances[0].process.configuredRecipeId).toBeNull()
  })

  it('migrates removed rack frames into memory modules', () => {
    const state = loadGame(JSON.stringify({
      version: 15,
      factoryFoundationLevel: 6,
      machines: { rackFrame: 2 },
      machineInstances: [{
        uid: 'legacy-rack-frame',
        machineId: 'rackFrame',
        x: 1,
        y: 1,
        level: 1,
      }],
    }), 1000)

    expect(state.machines.memoryModule).toBe(2)
    expect(state.machineInstances).toContainEqual(expect.objectContaining({
      uid: 'legacy-rack-frame',
      machineId: 'memoryModule',
      x: 1,
      y: 1,
    }))
  })

  it('migrates old empty saves to locked factory and clamps saved factory foundation levels', () => {
    expect(loadGame(JSON.stringify({ resources: { log: 1 } }), 1000).factoryFoundationLevel).toBe(0)
    expect(loadGame(JSON.stringify({ factoryFoundationLevel: -4 }), 1000).factoryFoundationLevel).toBe(0)
    expect(loadGame(JSON.stringify({ factoryFoundationLevel: 99 }), 1000).factoryFoundationLevel).toBe(7)
  })

  it('creates a temporary creative state with 32 of every resource and placeable machine', () => {
    const state = createCreativeState(createInitialState(1000), 2000)

    expect(Object.values(state.resources).every((amount) => amount >= 32)).toBe(true)
    expect(
      Object.entries(state.machines).every(([id, amount]) => {
        const machineId = id as MachineId
        const staysEmpty = Boolean(machines[machineId].multiblock) || isResourceBackedMachine(machineId)
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
    expect(state.factoryFoundationLevel).toBe(7)
    expect(factoryGridForState(state)).toEqual({ width: 24, height: 20 })
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

  it('tops up creative state without cloning when nothing changed', () => {
    const creative = createCreativeState(createInitialState(1000), 2000)

    expect(topUpCreativeState(creative, 3000)).toBe(creative)

    const depleted = createCreativeState(createInitialState(1000), 2000)
    depleted.resources.log = 0
    depleted.machines.furnace = 0
    const toppedUp = topUpCreativeState(depleted, 3000)

    expect(toppedUp).not.toBe(depleted)
    expect(toppedUp.resources.log).toBe(32)
    expect(toppedUp.machines.furnace).toBe(32)
    expect(toppedUp.lastSavedAt).toBe(3000)
  })

  it('creates a dev creative factory with current major machines and formed structures', () => {
    const state = createCreativeFactoryState(createInitialState(1000), 2000)
    const placedMachineIds = new Set(state.machineInstances.map((instance) => instance.machineId))

    expect(state.factoryFoundationLevel).toBe(7)
    expect(state.lastSavedAt).toBe(2000)
    expect([...placedMachineIds]).toEqual(expect.arrayContaining([
      'well',
      'steamBoiler',
      'steamTank',
      'steamMacerator',
      'steamForgeHammer',
      'steamCompressor',
      'steamExtractor',
      'steamAlloySmelter',
      'steamFurnace',
      'steamAutoMiner',
      'steamTurbine',
      'liquidSteamBoiler',
      'copperPipe',
      'bronzePipe',
      'ironPipe',
      'tinCable',
      'tinCable2A',
      'tinCable4A',
      'tinCable8A',
      'lvMacerator',
      'lvForgeHammer',
      'lvCompressor',
      'lvExtractor',
      'lvAlloySmelter',
      'lvFurnace',
      'lvWiremill',
      'lvBender',
      'lvLathe',
      'lvElectrolyzer',
      'lvAssembler',
      'lvCentrifuge',
      'lvCanner',
      'lvChemicalReactor',
      'lvMixer',
      'lvAutoMiner',
      'cokeOven',
      'brickedBlastFurnace',
      'reachGate',
      'arcBlastFurnace',
      'planningController',
      'memoryModule',
      'dispatchModule',
      'fabricationCable',
      'recipeEncoder',
      'autoFabricator',
      'lvWaterSource',
      'poweredFarm',
      'pyrolysisOven',
      'lvDistillery',
      'lvCombustionGenerator',
      'mvCombustionGenerator',
      'mvToLvTransformer',
    ]))
    expect(isReachGateFormed(state)).toBe(true)
    for (const machineId of mvMachineIds) {
      expect(placedMachineIds, `creative factory should place ${machineId}`).toContain(machineId)
    }
    const arc = state.machineInstances.find((instance) => instance.machineId === 'arcBlastFurnace')!
    expect(arcBlastFurnaceStructureForInstance(state, arc)?.formed).toBe(true)
  })

  it('preloads the dev creative factory with power, steam, fluids, and automation state', () => {
    const state = createCreativeFactoryState(createInitialState(1000), 2000)
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    const turbine = state.machineInstances.find((instance) => instance.machineId === 'steamTurbine')!
    const assembler = state.machineInstances.find((instance) => instance.machineId === 'lvAssembler')!
    const reactor = state.machineInstances.find((instance) => instance.machineId === 'lvChemicalReactor')!
    const cokeOven = state.machineInstances.find((instance) => instance.machineId === 'cokeOven')!
    const lvMiner = state.machineInstances.find((instance) => instance.machineId === 'lvAutoMiner')!
    const mvMixer = state.machineInstances.find((instance) => instance.machineId === 'mvMixer')!
    const mvMiner = state.machineInstances.find((instance) => instance.machineId === 'mvAutoMiner')!

    expect(boiler.process.steamStoredMs).toBeGreaterThan(0)
    expect(turbine.process.euStored).toBeGreaterThan(0)
    expect(assembler.process.fluids.liquidRubber).toBeGreaterThan(0)
    expect(reactor.process.fluids.liquidRubber).toBeGreaterThan(0)
    expect(cokeOven.process.fluids.creosote).toBeGreaterThan(0)
    expect(state.fluidContainers).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'steelCell', fluidId: 'liquidRubber', amountLitres: 8 }),
      expect.objectContaining({ kind: 'steelCell', fluidId: 'creosote', amountLitres: 8 }),
      expect.objectContaining({ kind: 'bucket', fluidId: 'water', amountLitres: 1 }),
    ]))
    expect(lvMiner.surveyCardTarget).toBe('sulfurVent')
    expect(state.autoMinerAssignments[lvMiner.uid]).toBe('sulfurVent')
    expect(mvMixer.process.euStored).toBeGreaterThan(0)
    expect(mvMixer.process.input).toEqual({ id: 'galliumDust', amount: 8 })
    expect(mvMixer.process.secondaryInput).toEqual({ id: 'arsenicDust', amount: 8 })
    expect(mvMiner.surveyCardTarget).toBe('realgarDeposit')
    expect(state.autoMinerAssignments[mvMiner.uid]).toBe('realgarDeposit')
    for (const machineId of mvMachineIds.slice(0, 18)) {
      const instance = state.machineInstances.find((candidate) => candidate.machineId === machineId)!
      expect(availableConnectedEu(state, instance), `${machineId} should connect to the creative MV power spine`).toBeGreaterThan(0)
    }
  })

  it('feeds the creative MV Extruder from its 8A buffer over an 8A route', () => {
    let state = createCreativeFactoryState(createInitialState(1000), 2000)
    const buffer = state.machineInstances.find((instance) => instance.machineId === 'mvBatteryBuffer8A' && instance.y === 19)!
    const cable = state.machineInstances.find((instance) => instance.x === 7 && instance.y === 19)!
    const extruder = state.machineInstances.find((instance) => instance.machineId === 'mvExtruder')!

    expect(buffer.machineId).toBe('mvBatteryBuffer8A')
    expect(batteryBufferOutputDirection(buffer)).toBe('east')
    expect(cable.machineId).toBe('aluminiumCable8A')
    expect(availableConnectedEu(state, extruder)).toBeGreaterThan(0)

    extruder.process.euStored = 336
    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === extruder.uid)!.process.euStored).toBeGreaterThan(336)
  })

  it('supplies MV machines at MV voltage instead of the LV 32 EU per amp rate', () => {
    let state = createCreativeFactoryState(createInitialState(1000), 2000)
    const macerator = state.machineInstances.find((instance) => instance.machineId === 'mvMacerator')!
    macerator.process.input = { id: 'copperIngot', amount: 64 }
    macerator.process.output = null
    macerator.process.euStored = macerator.process.euCapacity

    state = tickGame(state, 250).state
    const firstRunningTick = state.machineInstances.find((instance) => instance.uid === macerator.uid)!
    const firstStoredEu = firstRunningTick.process.euStored
    expect(firstRunningTick.process.activeRecipeId).not.toBeNull()

    state = tickGame(state, 250).state
    const secondRunningTick = state.machineInstances.find((instance) => instance.uid === macerator.uid)!

    expect(secondRunningTick.process.euStored).toBeGreaterThanOrEqual(firstStoredEu - 0.001)
  })

  it('loads a routed and power-positive benzene production line in the creative factory', () => {
    let state = createCreativeFactoryState(createInitialState(1000), 2000)
    const farm = state.machineInstances.find((instance) => instance.machineId === 'poweredFarm')!
    const oven = state.machineInstances.find((instance) => instance.machineId === 'pyrolysisOven')!
    const mvGenerator = state.machineInstances.find((instance) => instance.machineId === 'mvCombustionGenerator')!
    const lvGenerator = state.machineInstances.find((instance) => instance.machineId === 'lvCombustionGenerator')!
    const transformer = state.machineInstances.find((instance) => instance.machineId === 'mvToLvTransformer')!
    for (const instance of state.machineInstances) {
      if (instance.machineId === 'mvCombustionGenerator' || instance.machineId === 'lvCombustionGenerator' || isTankStorageMachine(instance.machineId)) {
        instance.process.fluids.benzene = 0
      }
      if (instance.machineId === 'mvCombustionGenerator' || instance.machineId === 'lvCombustionGenerator') instance.process.euStored = 0
    }
    state.recipeMilestones.farm_standard_trees = 0
    state.recipeMilestones.pyrolyse_standard_logs = 0
    state.recipeMilestones.distil_wood_tar_benzene = 0

    expect(farm.process.configuredProgramNumber).toBe(1)
    expect(multiblockControllerForInstance(state, farm)).not.toBeNull()
    expect(multiblockControllerForInstance(state, oven)).not.toBeNull()
    expect(transformer.x).toBe(7)
    expect(transformer.y).toBe(11)
    expect(mvGenerator.process.fluids.benzene ?? 0).toBe(0)
    expect(lvGenerator.process.fluids.benzene ?? 0).toBe(0)

    let generatedBenzenePower = false
    for (let step = 0; step < 37; step += 1) {
      state = tickGame(state, 10000, 12000 + step * 10000).state
      generatedBenzenePower ||= [mvGenerator.uid, lvGenerator.uid].some((uid) => (
        state.machineInstances.find((instance) => instance.uid === uid)?.process.activeRecipeId === 'burn_benzene'
      ))
    }

    const completedFarm = state.recipeMilestones.farm_standard_trees ?? 0
    const completedPyrolysis = state.recipeMilestones.pyrolyse_standard_logs ?? 0
    const completedDistillation = state.recipeMilestones.distil_wood_tar_benzene ?? 0
    expect(completedFarm).toBeGreaterThan(1)
    expect(completedPyrolysis).toBeGreaterThan(1)
    expect(completedDistillation).toBeGreaterThan(1)
    expect(generatedBenzenePower).toBe(true)
  })

  it('loads a fully routed polyethylene production line in the creative factory', () => {
    let state = createCreativeFactoryState(createInitialState(1000), 2000)
    const machineAt = (x: number, y: number) => state.machineInstances.find((instance) => instance.x === x && instance.y === y)!
    const farm = machineAt(22, 14)
    const extractor = machineAt(21, 14)
    const sugarMixer = machineAt(20, 14)
    const fermenter = machineAt(19, 14)
    const ethanolDistillery = machineAt(18, 14)
    const dehydrator = machineAt(17, 14)
    const polymerReactor = machineAt(16, 14)
    const solidifier = machineAt(15, 14)
    const recoveryDistillery = machineAt(17, 12)
    const byproductMixer = machineAt(19, 12)
    const superTank = machineAt(15, 16)
    const airCollector = machineAt(16, 12)

    expect(farm.machineId).toBe('poweredFarm')
    expect(multiblockControllerForInstance(state, farm)).not.toBeNull()
    expect(farm.process.configuredProgramNumber).toBe(4)
    expect(extractor.machineId).toBe('lvExtractor')
    expect(sugarMixer.process.configuredProgramNumber).toBe(1)
    expect(fermenter.process.configuredProgramNumber).toBe(3)
    expect(ethanolDistillery.process.configuredProgramNumber).toBe(2)
    expect(dehydrator.process.configuredProgramNumber).toBe(5)
    expect(polymerReactor.process.configuredProgramNumber).toBe(6)
    expect(solidifier.process.configuredProgramNumber).toBe(1)
    expect(solidifier.process.input).toEqual({ id: 'plateMold', amount: 1 })
    expect(recoveryDistillery.process.configuredProgramNumber).toBe(3)
    expect(byproductMixer.process.configuredProgramNumber).toBe(4)
    expect(superTank.machineId).toBe('lvSuperTank')
    expect(airCollector.machineId).toBe('lvAirCollector')
    expect(farm.itemOutputDirection).toBe('west')
    expect(state.machineInstances.filter((instance) => instance.y === 13 && instance.x >= 15 && isItemConductorMachine(instance.machineId))).toHaveLength(0)
    expect(availableConnectedEu(state, extractor)).toBeGreaterThan(0)
    expect(availableConnectedEu(state, recoveryDistillery)).toBeGreaterThan(0)
    expect(availableConnectedEu(state, airCollector)).toBeGreaterThan(0)

    for (const recipeId of [
      'farm_enriched_sugar_cane',
      'extract_cane_juice',
      'mix_sugar_wash',
      'ferment_sugar_wash',
      'distil_ethanol',
      'dehydrate_ethanol',
      'recover_sulfuric_acid',
      'polymerize_with_air',
      'solidify_polyethylene_plate',
      'mix_fertilizer_liquor',
    ]) {
      state.recipeMilestones[recipeId] = 0
    }

    for (let step = 0; step < 120; step += 1) {
      state = tickGame(state, 10000, 12000 + step * 10000).state
    }
    for (const recipeId of [
      'farm_enriched_sugar_cane',
      'extract_cane_juice',
      'mix_sugar_wash',
      'ferment_sugar_wash',
      'distil_ethanol',
      'dehydrate_ethanol',
      'polymerize_with_air',
      'solidify_polyethylene_plate',
    ]) {
      expect(state.recipeMilestones[recipeId] ?? 0, `${recipeId} should complete in the creative line`).toBeGreaterThan(0)
    }
    expect((state.recipeMilestones.recover_sulfuric_acid ?? 0) + (state.recipeMilestones.mix_fertilizer_liquor ?? 0)).toBeGreaterThan(0)
    const completedSolidifier = state.machineInstances.find((instance) => instance.uid === solidifier.uid)!
    const completedTank = state.machineInstances.find((instance) => instance.uid === superTank.uid)!
    expect((completedSolidifier.process.output?.amount ?? 0) + (completedTank.process.fluids.liquidPolyethylene ?? 0)).toBeGreaterThan(0)
  }, 15_000)

  it('loads a powered end-to-end recursive auto-crafting demonstration', () => {
    let state = createCreativeFactoryState(createInitialState(1000), 2000)
    const controller = state.machineInstances.find((instance) => instance.machineId === 'planningController')!
    const interfaceCable = state.machineInstances.find((instance) => instance.x === 18 && instance.y === 5)!
    const recipeInterface = interfaceCable.fabricationInterfaces!.north!
    const fabricator = state.machineInstances.find((instance) => instance.machineId === 'autoFabricator')!
    const rack = planningRackStructureForInstance(state, controller)
    const processingInterfaces = state.machineInstances
      .filter((instance) => instance.y === 5 && instance.x >= 19 && instance.x <= 22)
      .flatMap((instance) => instance.fabricationInterfaces?.south ? [instance.fabricationInterfaces.south] : [])
    const exportBus = state.machineInstances.find((instance) => instance.x === 23 && instance.y === 5)!.fabricationInterfaces!.north!

    expect(rack?.memoryUnits).toBe(192)
    expect(rack?.dispatchLanes).toBe(2)
    expect(recipeInterface.direction).toBe('north')
    expect(fabricator.x).toBe(interfaceCable.x)
    expect(fabricator.y).toBe(interfaceCable.y - 1)
    expect(state.recipeCards).toHaveLength(16)
    expect(state.recipeCards.filter((card) => card.kind === 'crafting')).toHaveLength(5)
    expect(state.recipeCards.filter((card) => card.kind === 'processing')).toHaveLength(11)
    expect(state.recipeCards.filter((card) => card.kind === 'crafting').every((card) => card.installedInUid === recipeInterface.uid)).toBe(true)
    expect(recipeInterface.installedRecipeCardUids).toHaveLength(5)
    expect(processingInterfaces).toHaveLength(4)
    expect(processingInterfaces.flatMap((attachment) => attachment.installedRecipeCardUids)).toHaveLength(11)
    expect(exportBus.filters).toContainEqual({ kind: 'item', id: 'mvPump' })
    expect(state.fabricationJobs).toHaveLength(1)
    expect(state.fabricationJobs[0].status).toBe('queued')
    expect(state.fabricationJobs[0].requestedOutput).toEqual({ id: 'mvPump', amount: 4 })
    expect(state.fabricationJobs[0].steps).toHaveLength(22)
    expect(state.fabricationJobs[0].steps.map((step) => state.recipeCards.find((card) => card.uid === step.cardUid)?.recipeId)).toEqual(expect.arrayContaining([
      'lv_lathe_steel_rod',
      'material_aluminium_wire_lvWiremill',
      'lv_assembler_aluminium_cable',
      'craft_magnetic_steel_rod',
      'craft_bronze_rotor',
      'craft_steel_pipe_section',
      'craft_mv_motor',
      'craft_mv_pump',
    ]))
    expect(state.fabricationJobs[0].reservedFluids).toContainEqual({ id: 'liquidRubber', amount: 16 })
    expect(controller.process.euStored).toBeGreaterThan(0)
    expect(fabricator.process.euStored).toBe(0)

    for (let step = 0; step < 170 && state.fabricationJobs[0].status !== 'complete'; step += 1) {
      state = tickGame(state, 10000, 12000 + step * 10000).state
    }

    expect(state.fabricationJobs[0].status).toBe('complete')
    const exportChest = state.machineInstances.find((instance) => instance.x === 23 && instance.y === 4)!
    const exportedPumps = exportChest.process.storageSlots
      .filter((slot) => slot?.id === 'mvPump')
      .reduce((total, slot) => total + (slot?.amount ?? 0), 0)
    expect(state.resources.mvPump + exportedPumps).toBe(4)
  }, 10_000)

  it('saves and resumes an active fabrication job without losing cards or reserved materials', () => {
    let state = createCreativeFactoryState(createInitialState(1000), 2000)
    state = tickGame(state, 100, 2100).state
    const activeJob = state.fabricationJobs[0]
    const reservedBeforeSave = activeJob.reservedItems.map((amount) => ({ ...amount }))
    expect(activeJob.status).toBe('running')
    expect(activeJob.steps.some((step) => step.dispatched)).toBe(true)

    state = loadGame(saveGame(state, 2200, true), 2200)
    const resumedJob = state.fabricationJobs[0]
    expect(resumedJob.status).toBe('running')
    expect(resumedJob.reservedItems).toEqual(reservedBeforeSave)
    expect(state.recipeCards).toHaveLength(16)
    expect(state.recipeCards.every((card) => Boolean(card.installedInUid))).toBe(true)
    expect(state.machineInstances.some((instance) => Object.values(instance.fabricationInterfaces ?? {}).some((attachment) => attachment?.installedRecipeCardUids.length === 6))).toBe(true)

    const completedBeforeResume = resumedJob.completedBatches
    for (let step = 0; step < 5; step += 1) state = tickGame(state, 10000, 12000 + step * 10000).state
    expect(state.fabricationJobs[0].status).toBe('running')
    expect(state.fabricationJobs[0].completedBatches).toBeGreaterThan(completedBeforeResume)
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

  it('equips diamond axe and shovel upgrades with LV durability and damage', () => {
    let state = createFactoryState(1000)
    state.resources.diamondAxe = 1
    state.resources.diamondShovel = 1
    state = equipResource(state, 'axe', 'diamondAxe')
    state = equipResource(state, 'shovel', 'diamondShovel')

    let result = hitGatherTarget(state, 'tree')
    expect(result.tool.id).toBe('diamondAxe')
    expect(result.completed).toBe(true)
    expect(durabilityRemaining(result.state, 'diamondAxe')).toBe(383)

    state = result.state
    result = hitGatherTarget(state, 'gravelPatch')
    expect(result.tool.id).toBe('diamondShovel')
    expect(result.state.gatherProgress.gravelPatch).toBe(11)
    expect(durabilityRemaining(result.state, 'diamondShovel')).toBe(383)
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
      { id: 'ironPlate', amount: 4 },
      { id: 'bronzePlate', amount: 3 },
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

  it('builds a Steam-age waste outlet from a mechanical pump', () => {
    const pump = recipes.find((recipe) => recipe.id === 'craft_mechanical_pump')!
    const outlet = recipes.find((recipe) => recipe.id === 'build_waste_outlet')!

    expect(recipeFitsTerminalGrid(pump)).toBe(true)
    expect(pump.outputs).toEqual([{ id: 'mechanicalPump', amount: 1 }])
    expect(pump.inputs).toEqual([
      { id: 'ironPlate', amount: 2 },
      { id: 'bronzeRing', amount: 2 },
      { id: 'bronzeRod', amount: 1 },
      { id: 'bucket', amount: 1 },
      { id: 'redAlloyPlate', amount: 1 },
    ])
    expect(recipeFitsTerminalGrid(outlet)).toBe(true)
    expect(outlet.machineOutputs).toEqual([{ id: 'wasteOutlet', amount: 1 }])
    expect(outlet.inputs).toContainEqual({ id: 'mechanicalPump', amount: 1 })
    expect(isFluidSinkMachine('wasteOutlet')).toBe(true)
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

  it('configured hoppers drip feed accepted items into the chosen adjacent machine', () => {
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

  it('hoppers pull adjacent machine outputs and push them into chests', () => {
    let state = createFactoryState(1000)
    state.machines.furnace = 1
    state.machines.hopper = 1
    state.machines.standardChest = 1
    state = placeMachineInstance(state, 'furnace', 0, 0)
    state = placeMachineInstance(state, 'hopper', 1, 0)
    state = placeMachineInstance(state, 'standardChest', 2, 0)
    const furnace = state.machineInstances.find((instance) => instance.machineId === 'furnace')!
    const hopper = state.machineInstances.find((instance) => instance.machineId === 'hopper')!
    const chest = state.machineInstances.find((instance) => instance.machineId === 'standardChest')!
    state.machineInstances.find((instance) => instance.uid === furnace.uid)!.process.output = { id: 'charcoal', amount: 3 }
    state = setPipeSideMode(state, hopper.uid, 'west', 'input')
    state = setHopperOutputDirection(state, hopper.uid, 'east')

    state = tickGame(state, 3000, 4000).state

    expect(state.machineInstances.find((instance) => instance.uid === furnace.uid)!.process.output).toBeNull()
    expect(state.machineInstances.find((instance) => instance.uid === hopper.uid)!.process.input).toBeNull()
    expect(state.machineInstances.find((instance) => instance.uid === chest.uid)!.process.storageSlots).toContainEqual({ id: 'charcoal', amount: 3 })
  })

  it('hoppers pull items from chests and feed them into adjacent machines', () => {
    let state = createFactoryState(1000)
    Object.assign(state.machines, { standardChest: 1, hopper: 1, furnace: 1 })
    state.resources.ironOre = 2
    state = placeMachineInstance(state, 'standardChest', 0, 0)
    state = placeMachineInstance(state, 'hopper', 1, 0)
    state = placeMachineInstance(state, 'furnace', 2, 0)
    const chest = state.machineInstances.find((instance) => instance.machineId === 'standardChest')!
    const hopper = state.machineInstances.find((instance) => instance.machineId === 'hopper')!
    const furnace = state.machineInstances.find((instance) => instance.machineId === 'furnace')!
    state = insertMachineStorageSlot(state, chest.uid, 0, 'ironOre', 2)
    state = setPipeSideMode(state, hopper.uid, 'west', 'input')
    state = setPipeSideMode(state, hopper.uid, 'east', 'output')

    state = tickGame(state, 2000, 3000).state

    expect(state.machineInstances.find((instance) => instance.uid === chest.uid)!.process.storageSlots.every((slot) => !slot)).toBe(true)
    expect(state.machineInstances.find((instance) => instance.uid === hopper.uid)!.process.input).toBeNull()
    expect(state.machineInstances.find((instance) => instance.uid === furnace.uid)!.process.input).toEqual({ id: 'ironOre', amount: 2 })
  })

  it('hoppers pull from chests while waiting for an output route', () => {
    let state = createFactoryState(1000)
    Object.assign(state.machines, { standardChest: 1, hopper: 1 })
    state.resources.ironOre = 2
    state = placeMachineInstance(state, 'standardChest', 0, 0)
    state = placeMachineInstance(state, 'hopper', 1, 0)
    const chest = state.machineInstances.find((instance) => instance.machineId === 'standardChest')!
    const hopper = state.machineInstances.find((instance) => instance.machineId === 'hopper')!
    state = insertMachineStorageSlot(state, chest.uid, 0, 'ironOre', 2)
    state = setPipeSideMode(state, hopper.uid, 'west', 'input')

    state = tickGame(state, 2000, 3000).state

    expect(state.machineInstances.find((instance) => instance.uid === chest.uid)!.process.storageSlots.every((slot) => !slot)).toBe(true)
    expect(state.machineInstances.find((instance) => instance.uid === hopper.uid)!.process.input).toEqual({ id: 'ironOre', amount: 2 })
  })

  it('pulls a creative chest stack through the input hopper in a two-hopper line', () => {
    let state = createCreativeState(createFactoryState(1000), 1000)
    state = placeMachineInstance(state, 'standardChest', 1, 0)
    state = placeMachineInstance(state, 'hopper', 0, 0)
    state = placeMachineInstance(state, 'hopper', 2, 0)
    const chest = state.machineInstances.find((instance) => instance.machineId === 'standardChest')!
    const leftHopper = state.machineInstances.find((instance) => instance.machineId === 'hopper' && instance.x === 0)!
    const rightHopper = state.machineInstances.find((instance) => instance.machineId === 'hopper' && instance.x === 2)!
    chest.process.storageSlots[0] = { id: 'log', amount: 33 }
    state = setPipeSideMode(state, leftHopper.uid, 'east', 'output')
    state = setPipeSideMode(state, rightHopper.uid, 'west', 'input')

    for (let tick = 0; tick < 4; tick += 1) state = topUpCreativeState(tickGame(state, 250, 1250 + tick * 250).state, 1250 + tick * 250)

    expect(state.machineInstances.find((instance) => instance.uid === chest.uid)!.process.storageSlots[0]).toEqual({ id: 'log', amount: 32 })
    expect(state.machineInstances.find((instance) => instance.uid === rightHopper.uid)!.process.input).toEqual({ id: 'log', amount: 1 })
  })

  it('hoppers collect output produced by a running furnace', () => {
    let state = createFactoryState(1000)
    Object.assign(state.machines, { furnace: 1, hopper: 1, standardChest: 1 })
    state.resources.log = 2
    state = placeMachineInstance(state, 'furnace', 0, 0)
    state = placeMachineInstance(state, 'hopper', 1, 0)
    state = placeMachineInstance(state, 'standardChest', 2, 0)
    const furnace = state.machineInstances.find((instance) => instance.machineId === 'furnace')!
    const hopper = state.machineInstances.find((instance) => instance.machineId === 'hopper')!
    const chest = state.machineInstances.find((instance) => instance.machineId === 'standardChest')!
    state = insertProcessSlot(state, furnace.uid, 'input', 'log', 1)
    state = insertProcessSlot(state, furnace.uid, 'fuel', 'log', 1)
    state = setPipeSideMode(state, hopper.uid, 'west', 'input')
    state = setPipeSideMode(state, hopper.uid, 'east', 'output')

    state = tickGame(state, 10000, 11000).state
    expect(state.machineInstances.find((instance) => instance.uid === furnace.uid)!.process.output).toEqual({ id: 'charcoal', amount: 1 })
    state = tickGame(state, 1000, 12000).state

    expect(state.machineInstances.find((instance) => instance.uid === furnace.uid)!.process.output).toBeNull()
    expect(state.machineInstances.find((instance) => instance.uid === chest.uid)!.process.storageSlots).toContainEqual({ id: 'charcoal', amount: 1 })
  })

  it('hoppers collect secondary machine outputs', () => {
    let state = createFactoryState(1000)
    Object.assign(state.machines, { lvCentrifuge: 1, hopper: 1, standardChest: 1 })
    state = placeMachineInstance(state, 'lvCentrifuge', 0, 0)
    state = placeMachineInstance(state, 'hopper', 1, 0)
    state = placeMachineInstance(state, 'standardChest', 2, 0)
    const centrifuge = state.machineInstances.find((instance) => instance.machineId === 'lvCentrifuge')!
    const hopper = state.machineInstances.find((instance) => instance.machineId === 'hopper')!
    const chest = state.machineInstances.find((instance) => instance.machineId === 'standardChest')!
    centrifuge.process.output2 = { id: 'rubberPulp', amount: 1 }
    state = setPipeSideMode(state, hopper.uid, 'west', 'input')
    state = setPipeSideMode(state, hopper.uid, 'east', 'output')

    state = tickGame(state, 1000, 2000).state

    expect(state.machineInstances.find((instance) => instance.uid === centrifuge.uid)!.process.output2).toBeNull()
    expect(state.machineInstances.find((instance) => instance.uid === chest.uid)!.process.storageSlots).toContainEqual({ id: 'rubberPulp', amount: 1 })
  })

  it('only lets hoppers pull from explicitly configured input sides', () => {
    let state = createFactoryState(1000)
    state.machines.furnace = 1
    state.machines.hopper = 1
    state = placeMachineInstance(state, 'furnace', 0, 0)
    state = placeMachineInstance(state, 'hopper', 1, 0)
    const furnace = state.machineInstances.find((instance) => instance.machineId === 'furnace')!
    const hopper = state.machineInstances.find((instance) => instance.machineId === 'hopper')!
    state.machineInstances.find((instance) => instance.uid === furnace.uid)!.process.output = { id: 'charcoal', amount: 2 }
    state = setHopperOutputDirection(state, hopper.uid, 'east')

    state = tickGame(state, 1000, 2000).state
    expect(state.machineInstances.find((instance) => instance.uid === furnace.uid)!.process.output).toEqual({ id: 'charcoal', amount: 2 })
    expect(state.machineInstances.find((instance) => instance.uid === hopper.uid)!.process.input).toBeNull()

    state = setPipeSideMode(state, hopper.uid, 'west', 'input')
    state = tickGame(state, 1000, 3000).state

    expect(state.machineInstances.find((instance) => instance.uid === furnace.uid)!.process.output).toEqual({ id: 'charcoal', amount: 1 })
    expect(state.machineInstances.find((instance) => instance.uid === hopper.uid)!.process.input).toEqual({ id: 'charcoal', amount: 1 })
  })

  it('migrates legacy output-only hoppers to explicit input sides', () => {
    let state = createFactoryState(1000)
    state.machines.hopper = 1
    state = placeMachineInstance(state, 'hopper', 1, 0)
    const hopper = state.machineInstances.find((instance) => instance.machineId === 'hopper')!
    hopper.pipeSideModes = { north: 'blocked', east: 'output', south: 'blocked', west: 'blocked' }
    hopper.pipeDisabledSides = { north: true, south: true, west: true }

    const migrated = loadGame(JSON.stringify({ ...state, version: 10 }), 2000)
    const migratedHopper = migrated.machineInstances.find((instance) => instance.machineId === 'hopper')!

    expect(pipeSideMode(migratedHopper, 'east')).toBe('output')
    expect(pipeSideMode(migratedHopper, 'west')).toBe('input')
    expect(pipeSideMode(migratedHopper, 'north')).toBe('input')
    expect(pipeSideMode(migratedHopper, 'south')).toBe('input')
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

  it('bundles item and fluid conductors in either placement order and releases individual lanes', () => {
    for (const order of [['itemConductor', 'fluidConductor'], ['fluidConductor', 'itemConductor']] as const) {
      let state = createFactoryState(1000)
      state.machines.itemConductor = 1
      state.machines.fluidConductor = 1
      state = placeMachineInstance(state, order[0], 1, 1)
      const originalUid = state.machineInstances[0].uid
      state = placeMachineInstance(state, order[1], 1, 1)

      expect(state.machineInstances).toHaveLength(1)
      expect(state.machineInstances[0]).toMatchObject({ uid: originalUid, machineId: 'conductorBundle', x: 1, y: 1 })
      expect(availableUnplacedMachineCount(state, 'itemConductor')).toBe(0)
      expect(availableUnplacedMachineCount(state, 'fluidConductor')).toBe(0)

      state = removeConductorLane(state, originalUid, 'item')
      expect(state.machineInstances[0].machineId).toBe('fluidConductor')
      expect(availableUnplacedMachineCount(state, 'itemConductor')).toBe(1)
      expect(availableUnplacedMachineCount(state, 'fluidConductor')).toBe(0)
    }
  })

  it('persists independent bundled conductor face settings and coalesces legacy same-cell lanes', () => {
    const state = loadGame(JSON.stringify({
      version: 13,
      factoryFoundationLevel: 2,
      machines: { itemConductor: 0, fluidConductor: 0 },
      machineInstances: [
        {
          uid: 'legacy-item', machineId: 'itemConductor', x: 1, y: 1, level: 1,
          conductorItemFaces: { west: { mode: 'input', channel: 2, priority: 4, roundRobin: true, selfFeed: false, itemFilter: ['log'] } },
        },
        {
          uid: 'legacy-fluid', machineId: 'fluidConductor', x: 1, y: 1, level: 1,
          conductorFluidFaces: { east: { mode: 'output', channel: 2, priority: 7, roundRobin: false, selfFeed: true, fluidFilter: ['creosote'] } },
        },
      ],
    }), 2000)

    expect(state.machineInstances).toHaveLength(1)
    expect(state.machineInstances[0].machineId).toBe('conductorBundle')
    expect(conductorFaceSettings(state.machineInstances[0], 'item', 'west')).toMatchObject({ mode: 'input', channel: 2, priority: 4 })
    expect(conductorFaceSettings(state.machineInstances[0], 'item', 'west')).not.toHaveProperty('itemFilter')
    expect(conductorFaceSettings(state.machineInstances[0], 'fluid', 'east')).toMatchObject({ mode: 'output', channel: 2, priority: 7, selfFeed: true })
    expect(conductorFaceSettings(state.machineInstances[0], 'fluid', 'east')).not.toHaveProperty('fluidFilter')
    expect(state.machines.itemConductor).toBe(1)
    expect(state.machines.fluidConductor).toBe(1)
    expect(loadGame(saveGame(state, 3000), 3000).machineInstances[0]).toMatchObject({ machineId: 'conductorBundle' })
  })

  it('routes items and fluids through conductor networks on matching channels', () => {
    let state = createFactoryState(1000)
    state.machines.standardChest = 2
    state.machines.steamTank = 2
    state.machines.itemConductor = 2
    state.machines.fluidConductor = 2
    state = placeMachineInstance(state, 'standardChest', 0, 0)
    state = placeMachineInstance(state, 'itemConductor', 1, 0)
    state = placeMachineInstance(state, 'itemConductor', 2, 0)
    state = placeMachineInstance(state, 'standardChest', 3, 0)
    state = placeMachineInstance(state, 'steamTank', 0, 1)
    state = placeMachineInstance(state, 'fluidConductor', 1, 1)
    state = placeMachineInstance(state, 'fluidConductor', 2, 1)
    state = placeMachineInstance(state, 'steamTank', 3, 1)
    const [sourceChest, targetChest] = state.machineInstances.filter((instance) => instance.machineId === 'standardChest')
    const [itemSource, itemTarget] = state.machineInstances.filter((instance) => instance.machineId === 'itemConductor')
    const [sourceTank, targetTank] = state.machineInstances.filter((instance) => instance.machineId === 'steamTank')
    const [fluidSource, fluidTarget] = state.machineInstances.filter((instance) => instance.machineId === 'fluidConductor')
    sourceChest.process.storageSlots[0] = { id: 'log', amount: 3 }
    sourceTank.process.fluids.creosote = 64
    state = setConductorFaceSettings(state, itemSource.uid, 'item', 'west', { mode: 'input', channel: 1 })
    state = setConductorFaceSettings(state, itemTarget.uid, 'item', 'east', { mode: 'output', channel: 1, priority: 3 })
    state = setConductorFaceSettings(state, fluidSource.uid, 'fluid', 'west', { mode: 'input', channel: 2 })
    state = setConductorFaceSettings(state, fluidTarget.uid, 'fluid', 'east', { mode: 'output', channel: 2, priority: 3 })
    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === sourceChest.uid)!.process.storageSlots[0]).toEqual({ id: 'log', amount: 1 })
    expect(state.machineInstances.find((instance) => instance.uid === targetChest.uid)!.process.storageSlots[0]).toEqual({ id: 'log', amount: 2 })
    expect(state.machineInstances.find((instance) => instance.uid === sourceTank.uid)!.process.fluids.creosote).toBe(0)
    expect(state.machineInstances.find((instance) => instance.uid === targetTank.uid)!.process.fluids.creosote).toBe(64)

    const blockedSourceChest = state.machineInstances.find((instance) => instance.uid === sourceChest.uid)!
    const blockedSourceTank = state.machineInstances.find((instance) => instance.uid === sourceTank.uid)!
    blockedSourceChest.process.storageSlots[0] = { id: 'log', amount: 1 }
    blockedSourceTank.process.fluids.creosote = 16
    state = setConductorFaceSettings(state, itemTarget.uid, 'item', 'east', { channel: 0 })
    state = setConductorFaceSettings(state, fluidTarget.uid, 'fluid', 'east', { channel: 0 })
    state = tickGame(state, 1000).state
    expect(state.machineInstances.find((instance) => instance.uid === sourceChest.uid)!.process.storageSlots[0]).toEqual({ id: 'log', amount: 1 })
    expect(state.machineInstances.find((instance) => instance.uid === sourceTank.uid)!.process.fluids.creosote).toBe(16)
  })

  it('round-robins equal-priority conductor outputs and fills higher priorities first', () => {
    let state = createFactoryState(1000)
    state.machines.standardChest = 3
    state.machines.itemConductor = 2
    state = placeMachineInstance(state, 'standardChest', 0, 1)
    state = placeMachineInstance(state, 'itemConductor', 1, 1)
    state = placeMachineInstance(state, 'itemConductor', 2, 1)
    state = placeMachineInstance(state, 'standardChest', 3, 1)
    state = placeMachineInstance(state, 'standardChest', 2, 2)

    const sourceChest = state.machineInstances.find((instance) => instance.machineId === 'standardChest' && instance.x === 0)!
    const eastChest = state.machineInstances.find((instance) => instance.machineId === 'standardChest' && instance.x === 3)!
    const southChest = state.machineInstances.find((instance) => instance.machineId === 'standardChest' && instance.y === 2)!
    const sourceConductor = state.machineInstances.find((instance) => instance.machineId === 'itemConductor' && instance.x === 1)!
    const outputConductor = state.machineInstances.find((instance) => instance.machineId === 'itemConductor' && instance.x === 2)!
    sourceChest.process.storageSlots[0] = { id: 'log', amount: 4 }
    state = setConductorFaceSettings(state, sourceConductor.uid, 'item', 'west', { mode: 'input', channel: 0, roundRobin: true })
    state = setConductorFaceSettings(state, outputConductor.uid, 'item', 'east', { mode: 'output', channel: 0 })
    state = setConductorFaceSettings(state, outputConductor.uid, 'item', 'south', { mode: 'output', channel: 0 })

    state = tickGame(state, 1000).state
    expect(state.machineInstances.find((instance) => instance.uid === eastChest.uid)!.process.storageSlots[0]).toEqual({ id: 'log', amount: 1 })
    expect(state.machineInstances.find((instance) => instance.uid === southChest.uid)!.process.storageSlots[0]).toEqual({ id: 'log', amount: 1 })

    state.machineInstances.find((instance) => instance.uid === eastChest.uid)!.process.storageSlots[0] = null
    state.machineInstances.find((instance) => instance.uid === southChest.uid)!.process.storageSlots[0] = null
    state = setConductorFaceSettings(state, sourceConductor.uid, 'item', 'west', { roundRobin: false })
    state = setConductorFaceSettings(state, outputConductor.uid, 'item', 'east', { priority: 4 })
    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === eastChest.uid)!.process.storageSlots[0]).toEqual({ id: 'log', amount: 2 })
    expect(state.machineInstances.find((instance) => instance.uid === southChest.uid)!.process.storageSlots[0]).toBeNull()
  })

  it('automates both solid outputs from an LV Centrifuge', () => {
    let state = createFactoryState(1000)
    Object.assign(state.machines, { lvCentrifuge: 1, standardChest: 1 })
    state = placeMachineInstance(state, 'lvCentrifuge', 0, 0)
    state = placeMachineInstance(state, 'standardChest', 1, 0)
    const centrifuge = state.machineInstances.find((instance) => instance.machineId === 'lvCentrifuge')!
    centrifuge.process.output = { id: 'aluminiumDust', amount: 1 }
    centrifuge.process.output2 = { id: 'flint', amount: 2 }
    state = setLvItemOutputDirection(state, centrifuge.uid, 'east')

    state = tickGame(state, 3000).state

    const nextCentrifuge = state.machineInstances.find((instance) => instance.uid === centrifuge.uid)!
    const chest = state.machineInstances.find((instance) => instance.machineId === 'standardChest')!
    expect(nextCentrifuge.process.output).toBeNull()
    expect(nextCentrifuge.process.output2).toBeNull()
    expect(chest.process.storageSlots).toContainEqual({ id: 'aluminiumDust', amount: 1 })
    expect(chest.process.storageSlots).toContainEqual({ id: 'flint', amount: 2 })
  })

  it('automates Centrifuge item and fluid outputs through independent faces', () => {
    let state = createFactoryState(1000)
    Object.assign(state.machines, { lvCentrifuge: 1, standardChest: 1, copperPipe: 1, steamTank: 1 })
    state = placeMachineInstance(state, 'lvCentrifuge', 0, 0)
    state = placeMachineInstance(state, 'standardChest', 1, 0)
    state = placeMachineInstance(state, 'copperPipe', 0, 1)
    state = placeMachineInstance(state, 'steamTank', 0, 2)
    const centrifuge = state.machineInstances.find((instance) => instance.machineId === 'lvCentrifuge')!
    const pipe = state.machineInstances.find((instance) => instance.machineId === 'copperPipe')!

    state = setLvItemOutputDirection(state, centrifuge.uid, 'east')
    state = setFluidOutputDirection(state, centrifuge.uid, 'south')
    state = setPipeSideMode(state, pipe.uid, 'north', 'input')
    state = setPipeSideMode(state, pipe.uid, 'south', 'output')
    const configured = state.machineInstances.find((instance) => instance.uid === centrifuge.uid)!
    configured.process.output = { id: 'rubberPulp', amount: 2 }
    configured.process.fluids.glue = 8

    expect(configured.itemOutputDirection).toBe('east')
    expect(pipeSideMode(configured, 'south')).toBe('output')
    expect(pipeSideMode(configured, 'east')).toBe('input')

    state = tickGame(state, 2000).state

    expect(state.machineInstances.find((instance) => instance.machineId === 'standardChest')!.process.storageSlots).toContainEqual({ id: 'rubberPulp', amount: 2 })
    expect(state.machineInstances.find((instance) => instance.uid === centrifuge.uid)!.process.fluids.glue).toBe(0)
    expect(state.machineInstances.find((instance) => instance.machineId === 'steamTank')!.process.fluids.glue).toBe(8)
  })

  it('connects a configured cable to a Centrifuge independently of its automatic fluid input face', () => {
    let state = createFactoryState(1000)
    state.machines.lvCentrifuge = 1
    state.resources.tinCable = 1
    state = placeMachineInstance(state, 'lvCentrifuge', 1, 0)
    state = placeMachineInstance(state, 'tinCable', 0, 0)
    const centrifuge = state.machineInstances.find((instance) => instance.machineId === 'lvCentrifuge')!
    const cable = state.machineInstances.find((instance) => instance.machineId === 'tinCable')!
    state = setPipeSideMode(state, cable.uid, 'east', 'both')
    const configuredCable = state.machineInstances.find((instance) => instance.uid === cable.uid)!
    const configuredCentrifuge = state.machineInstances.find((instance) => instance.uid === centrifuge.uid)!

    expect(pipeSideMode(configuredCable, 'east')).toBe('both')
    expect(pipeSideMode(configuredCentrifuge, 'west')).toBe('input')
    expect(machinesCanConnectEu(configuredCable, configuredCentrifuge)).toBe(true)
  })

  it('returns a legacy Centrifuge second input during save migration', () => {
    let state = createFactoryState(1000)
    state.machines.lvCentrifuge = 1
    state = placeMachineInstance(state, 'lvCentrifuge', 0, 0)
    state.version = 12
    state.machineInstances[0].process.secondaryInput = { id: 'sand', amount: 8 }

    const migrated = loadGame(JSON.stringify(state), 2000)

    expect(migrated.machineInstances[0].process.secondaryInput).toBeNull()
    expect(migrated.resources.sand).toBe(8)
    expect(migrated.migrationNotices).toContain('centrifuge-single-input')
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
    expect(state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!.process.input).toBeNull()
    expect(state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!.process.activeRecipeId).toBe('coke_coal')
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
    state.resources.flint = 4
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

  it('winds heating coils without consuming the wire cutters', () => {
    let state = createFactoryState(1000)
    state.resources.cupronickelIngot = 1
    state.resources.ironWireCutters = 1
    const heatingCoil = recipes.find((recipe) => recipe.id === 'craft_heating_coil')!

    state = craftRecipeInstant(state, heatingCoil, 1)

    expect(state.resources.cupronickelIngot).toBe(0)
    expect(state.resources.heatingCoil).toBe(1)
    expect(state.resources.ironWireCutters).toBe(1)
    expect(durabilityRemaining(state, 'ironWireCutters')).toBe(127)
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

  it('keeps a lit furnace craft running after its committed input leaves the visible slot', () => {
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
    expect(state.machineInstances[0].process.activeRecipeId).toBe('charcoal_from_log')
    expect(state.machineInstances[0].process.progressMs).toBe(6500)
    expect(state.machineInstances[0].process.fuelRemainingMs).toBe(3500)
    expect(state.machineInstances[0].process.fuelDurationMs).toBe(10000)

    state = tickGame(state, 3500).state

    expect(state.machineInstances[0].process.fuelRemainingMs).toBe(0)
    expect(state.machineInstances[0].process.fuelDurationMs).toBe(0)
    expect(state.machineInstances[0].process.output).toEqual({ id: 'charcoal', amount: 1 })
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
    state.resources.steelPlate = 5
    state.resources.steelRod = 4
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
    const reviewedRecipes = [unfiredBrick, bucket, well, boiler, tank, copperPipe, bronzePipe, ironPipe, macerator]
    for (const recipe of reviewedRecipes) {
      for (const input of recipe.inputs) state.resources[input.id] = 100
      for (const catalyst of recipe.catalysts ?? []) state.resources[catalyst.id] = 1
      for (const machineInput of recipe.machineInputs ?? []) state.machines[machineInput.id] = machineInput.amount
    }
    state.resources.unfiredBrick = 0

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

  it('uses valid shaped 3x3 grids for machine crafts', () => {
    const machineCrafts = recipes.filter((recipe) => recipe.machineOutputs?.length)

    for (const recipe of machineCrafts) {
      expect(recipe.pattern, `${recipe.id} should define a shaped 3x3 machine recipe`).toHaveLength(9)
      expect(recipeFitsTerminalGrid(recipe), recipe.id).toBe(true)
    }
  })

  it('routes steam through fluid conductors using configured channels and faces', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 1
    state.machines.fluidConductor = 2
    state.machines.steelTank = 1
    state = placeMachineInstance(state, 'steamTank', 0, 0)
    state = placeMachineInstance(state, 'fluidConductor', 1, 0)
    state = placeMachineInstance(state, 'fluidConductor', 2, 0)
    state = placeMachineInstance(state, 'steelTank', 3, 0)

    const sourceTank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    const targetMachine = state.machineInstances.find((instance) => instance.machineId === 'steelTank')!
    const [sourceConductor, targetConductor] = state.machineInstances.filter((instance) => instance.machineId === 'fluidConductor')
    sourceTank.process.steamStoredMs = 96 * steamMsPerLitre
    targetMachine.process.steamStoredMs = 0
    state = setConductorFaceSettings(state, sourceConductor.uid, 'fluid', 'west', { mode: 'input', channel: 2 })
    state = setConductorFaceSettings(state, targetConductor.uid, 'fluid', 'east', { mode: 'output', channel: 2 })
    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === sourceTank.uid)!.process.steamStoredMs).toBe(32 * steamMsPerLitre)
    expect(state.machineInstances.find((instance) => instance.uid === targetMachine.uid)!.process.steamStoredMs).toBe(64 * steamMsPerLitre)
    expect(steamTankLiveSteamRates(state, state.machineInstances.find((instance) => instance.uid === sourceTank.uid)!)).toEqual({
      inputLitresPerSecond: 0,
      outputLitresPerSecond: 64,
    })
    expect(steamTankLiveSteamRates(state, state.machineInstances.find((instance) => instance.uid === targetMachine.uid)!)).toEqual({
      inputLitresPerSecond: 64,
      outputLitresPerSecond: 0,
    })

    const blockedSource = state.machineInstances.find((instance) => instance.uid === sourceTank.uid)!
    const blockedTarget = state.machineInstances.find((instance) => instance.uid === targetMachine.uid)!
    blockedTarget.process.steamStoredMs = 0
    state = setConductorFaceSettings(state, targetConductor.uid, 'fluid', 'east', { channel: 1 })
    state = tickGame(state, 1000).state
    expect(state.machineInstances.find((instance) => instance.uid === blockedSource.uid)!.process.steamStoredMs).toBe(32 * steamMsPerLitre)
    expect(state.machineInstances.find((instance) => instance.uid === blockedTarget.uid)!.process.steamStoredMs).toBe(0)
    expect(steamTankLiveSteamRates(state, state.machineInstances.find((instance) => instance.uid === blockedSource.uid)!)).toEqual({
      inputLitresPerSecond: 0,
      outputLitresPerSecond: 0,
    })
  })

  it('feeds Steam Turbines through fluid conductors and exposes the connected demand', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 1
    state.machines.fluidConductor = 2
    state.machines.steamTurbine = 1
    state = placeMachineInstance(state, 'steamTank', 0, 0)
    state = placeMachineInstance(state, 'fluidConductor', 1, 0)
    state = placeMachineInstance(state, 'fluidConductor', 2, 0)
    state = placeMachineInstance(state, 'steamTurbine', 3, 0)

    const sourceTank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    const turbine = state.machineInstances.find((instance) => instance.machineId === 'steamTurbine')!
    const [sourceConductor, targetConductor] = state.machineInstances.filter((instance) => instance.machineId === 'fluidConductor')
    sourceTank.process.steamStoredMs = 128 * steamMsPerLitre
    turbine.process.steamStoredMs = 0
    turbine.process.euStored = 0
    state = setConductorFaceSettings(state, sourceConductor.uid, 'fluid', 'west', { mode: 'input', channel: 3 })
    state = setConductorFaceSettings(state, targetConductor.uid, 'fluid', 'east', { mode: 'output', channel: 3 })

    state = tickGame(state, 1000).state
    expect(state.machineInstances.find((instance) => instance.uid === turbine.uid)!.process.steamStoredMs).toBe(32 * steamMsPerLitre)
    state = tickGame(state, 2000).state

    const runningTurbine = state.machineInstances.find((instance) => instance.uid === turbine.uid)!
    const metrics = steamNetworkMetrics(state, state.machineInstances.find((instance) => instance.uid === sourceTank.uid)!)
    expect(runningTurbine.process.euStored).toBe(64)
    expect(runningTurbine.process.steamStoredMs).toBe(32 * steamMsPerLitre)
    expect(metrics.networkSize).toBe(4)
    expect(metrics.demandLitresPerSecond).toBe(steamTurbineSteamUseLitresPerSecond)
  })

  it('uses distinct valid grids for LV input and output port recipes', () => {
    const portPairs = [
      ['lv_input_bus', 'lv_output_bus', 'lvConveyor'],
      ['lv_fluid_input_hatch', 'lv_fluid_output_hatch', 'lvPump'],
    ] as const

    for (const [inputId, outputId, componentId] of portPairs) {
      const input = recipes.find((recipe) => recipe.id === inputId)!
      const output = recipes.find((recipe) => recipe.id === outputId)!
      const asGrid = (recipe: typeof input): CraftSlot[] =>
        recipe.pattern!.map((slot) => {
          if (!slot) return null
          return typeof slot === 'string' ? { id: slot } : { kind: 'machine', id: slot.id }
        })

      expect(input.pattern).toHaveLength(9)
      expect(output.pattern).toHaveLength(9)
      expect(input.pattern).not.toEqual(output.pattern)
      expect(input.inputs).toContainEqual({ id: componentId, amount: 2 })
      expect(output.inputs).toContainEqual({ id: componentId, amount: 2 })
      expect(findGridRecipe(asGrid(input), recipes)?.id).toBe(input.id)
      expect(findGridRecipe(asGrid(output), recipes)?.id).toBe(output.id)
    }
  })

  it('crafts LV casing and hull before LV machines consume hulls', () => {
    let state = createFactoryState(1000)
    state.resources.steelPlate = 17
    state.resources.tinWire = 8
    state.resources.lvMotor = 1
    state.resources.primitiveCircuit = 1
    state.resources.ironWrench = 1

    const casing = recipes.find((recipe) => recipe.id === 'craft_lv_machine_casing')!
    const hull = recipes.find((recipe) => recipe.id === 'craft_lv_machine_hull')!
    const turbine = recipes.find((recipe) => recipe.id === 'build_steam_turbine')!

    expect(casing.pattern?.every(Boolean)).toBe(true)
    expect(hull.pattern?.every(Boolean)).toBe(true)
    expect(hull.inputs).toContainEqual({ id: 'steelPlate', amount: 4 })
    expect(turbine.inputs).toContainEqual({ id: 'lvMachineHull', amount: 1 })

    state = craftRecipeInstant(state, casing, 1)
    state = craftRecipeInstant(state, hull, 1)
    state = craftRecipeInstant(state, turbine, 1)

    expect(state.resources.lvMachineCasing).toBe(0)
    expect(state.resources.lvMachineHull).toBe(0)
    expect(state.machines.steamTurbine).toBe(1)
  })

  it('uses steel rather than iron plates throughout LV crafting recipes', () => {
    const lvRecipesWithIronPlate = recipes
      .filter((recipe) => recipe.tier === 'lv')
      .filter((recipe) => recipe.inputs.some((input) => input.id === 'ironPlate'))

    expect(lvRecipesWithIronPlate.map((recipe) => recipe.id)).toEqual([])
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

    expect(state.machineInstances.find((instance) => instance.uid === adjacentBoiler.uid)!.process.steamStoredMs).toBe(6000)
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

    expect(state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process.steamStoredMs).toBe(6000)
  })

  it('disposes routed liquids at the Waste Outlet rate and reports actual flow', () => {
    let state = createFactoryState(1000)
    Object.assign(state.machines, { steamTank: 1, copperPipe: 1, wasteOutlet: 1 })
    state = placeMachineInstance(state, 'steamTank', 0, 0)
    state = placeMachineInstance(state, 'copperPipe', 1, 0)
    state = placeMachineInstance(state, 'wasteOutlet', 2, 0)
    state = configurePlacedConnector(state, 'copperPipe', { west: 'input', east: 'output' })
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    const outlet = state.machineInstances.find((instance) => instance.machineId === 'wasteOutlet')!
    tank.process.fluids.creosote = 96

    state = tickGame(state, 1000).state

    const nextTank = state.machineInstances.find((instance) => instance.uid === tank.uid)!
    const nextOutlet = state.machineInstances.find((instance) => instance.uid === outlet.uid)!
    expect(wasteOutletCapacityLitres).toBe(96)
    expect(wasteOutletDisposalLitresPerSecond).toBe(24)
    expect(nextTank.process.fluids.creosote).toBe(72)
    expect(nextOutlet.process.fluids.creosote).toBe(0)
    expect(wasteOutletLiveRates(nextOutlet)).toEqual({
      liquidLitresPerSecond: 24,
      steamLitresPerSecond: 0,
      totalLitresPerSecond: 24,
      fluidId: 'creosote',
    })

    nextTank.process.fluids.creosote = 0
    state = tickGame(state, 1000).state
    expect(wasteOutletLiveRates(state.machineInstances.find((instance) => instance.uid === outlet.uid)!)).toMatchObject({
      liquidLitresPerSecond: 0,
      steamLitresPerSecond: 0,
      totalLitresPerSecond: 0,
    })
  })

  it('shares the Waste Outlet disposal cap between its liquid buffer and Steam', () => {
    let state = createFactoryState(1000)
    Object.assign(state.machines, { steamTank: 1, copperPipe: 1, wasteOutlet: 1 })
    state = placeMachineInstance(state, 'steamTank', 0, 0)
    state = placeMachineInstance(state, 'copperPipe', 1, 0)
    state = placeMachineInstance(state, 'wasteOutlet', 2, 0)
    state = configurePlacedConnector(state, 'copperPipe', { west: 'input', east: 'output' })
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    const outlet = state.machineInstances.find((instance) => instance.machineId === 'wasteOutlet')!
    tank.process.steamStoredMs = 48000
    outlet.process.fluids.water = 8

    state = tickGame(state, 1000).state

    const nextTank = state.machineInstances.find((instance) => instance.uid === tank.uid)!
    const nextOutlet = state.machineInstances.find((instance) => instance.uid === outlet.uid)!
    expect(nextOutlet.process.fluids.water).toBe(0)
    expect(nextTank.process.steamStoredMs).toBe(32000)
    expect(wasteOutletLiveRates(nextOutlet)).toMatchObject({
      liquidLitresPerSecond: 8,
      steamLitresPerSecond: 16,
      totalLitresPerSecond: 24,
      fluidId: 'water',
    })
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

    expect(currentWellWaterFlowLitresPerSecond(state, well)).toBe(24)
    state = tickGame(state, 1000).state

    const pipe = state.machineInstances.find((instance) => instance.machineId === 'bronzePipe')!
    const activeWell = state.machineInstances.find((instance) => instance.machineId === 'well')!
    expect(currentWellWaterFlowLitresPerSecond(state, activeWell)).toBe(24)
    expect(pipe.process.fluids.water).toBeGreaterThan(0)
    expect(state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process.steamStoredMs).toBe(6000)
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

    expect(wellWaterOutputLitresPerSecond).toBe(24)
    expect(currentWellWaterFlowLitresPerSecond(state, well)).toBe(24)
    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === well.uid)!.process.fluids.water).toBe(104)
    expect(state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process.steamStoredMs).toBe(6000)
  })

  it('applies source discharge and route limits to stored fluids', () => {
    expect(machines.well.fluidOutputLitresPerSecond).toBe(24)
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

  it('bottlenecks four adjacent boilers behind one basic well', () => {
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

    expect(state.machineInstances.filter((instance) => instance.machineId === 'steamBoiler').reduce((sum, instance) => sum + instance.process.steamStoredMs, 0)).toBe(6000)
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
    expect(process.fuelRemainingMs).toBeGreaterThan(58000)
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

  it('bottlenecks three simultaneous steam machines behind one boiler', () => {
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
    expect(state.machineInstances.find((instance) => instance.uid === extractor.uid)!.process.output).toBeNull()
  })

  it('stress runs well to boiler to machine with every solid fuel through direct and piped routes', () => {
    const routeKinds = ['direct', 'piped'] as const
    const fuelIds = Object.keys(fuelDefinitions) as ResourceId[]

    for (const routeKind of routeKinds) {
      for (const fuelId of fuelIds) {
        let state = createFactoryState(1000)
        state.machines.well = 1
        state.machines.steamBoiler = 1
        state.machines.steamMacerator = 1
        state.resources[fuelId] = 8
        state.resources.copperOre = 1
        state = placeMachineInstance(state, 'well', 0, 0)

        if (routeKind === 'piped') {
          state.machines.copperPipe = 1
          state.machines.bronzePipe = 1
          state = placeMachineInstance(state, 'copperPipe', 1, 0)
          state = placeMachineInstance(state, 'steamBoiler', 2, 0)
          state = placeMachineInstance(state, 'bronzePipe', 3, 0)
          state = placeMachineInstance(state, 'steamMacerator', 4, 0)
          const waterPipe = state.machineInstances.find((instance) => instance.machineId === 'copperPipe')!
          const steamPipe = state.machineInstances.find((instance) => instance.machineId === 'bronzePipe')!
          state = setPipeSideMode(state, waterPipe.uid, 'west', 'input')
          state = setPipeSideMode(state, waterPipe.uid, 'east', 'output')
          state = setPipeSideMode(state, steamPipe.uid, 'west', 'input')
          state = setPipeSideMode(state, steamPipe.uid, 'east', 'output')
        } else {
          state = placeMachineInstance(state, 'steamBoiler', 1, 0)
          state = placeMachineInstance(state, 'steamMacerator', 2, 0)
        }

        const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
        const macerator = state.machineInstances.find((instance) => instance.machineId === 'steamMacerator')!
        state = insertProcessSlot(state, boiler.uid, 'fuel', fuelId, 8)
        state = insertProcessSlot(state, macerator.uid, 'input', 'copperOre', 1)

        for (let elapsed = 0; elapsed < 12_000; elapsed += 250) state = tickGame(state, 250).state

        expect(state.machineInstances.find((instance) => instance.uid === macerator.uid)!.process.output, `${routeKind} route using ${fuelId}`).toEqual({
          id: 'crushedCopperOre',
          amount: 2,
        })
        expect(state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process.steamStoredMs, `${routeKind} route using ${fuelId}`).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('keeps a piped well boiler machine line running across save reload and sustained demand', () => {
    let state = createFactoryState(1000)
    state.machines.well = 1
    state.machines.copperPipe = 1
    state.machines.steamBoiler = 1
    state.machines.bronzePipe = 1
    state.machines.steamMacerator = 1
    state.resources.coalCoke = 8
    state.resources.copperOre = 32
    state = placeMachineInstance(state, 'well', 0, 0)
    state = placeMachineInstance(state, 'copperPipe', 1, 0)
    state = placeMachineInstance(state, 'steamBoiler', 2, 0)
    state = placeMachineInstance(state, 'bronzePipe', 3, 0)
    state = placeMachineInstance(state, 'steamMacerator', 4, 0)
    const waterPipe = state.machineInstances.find((instance) => instance.machineId === 'copperPipe')!
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    const steamPipe = state.machineInstances.find((instance) => instance.machineId === 'bronzePipe')!
    const macerator = state.machineInstances.find((instance) => instance.machineId === 'steamMacerator')!
    state = setPipeSideMode(state, waterPipe.uid, 'west', 'input')
    state = setPipeSideMode(state, waterPipe.uid, 'east', 'output')
    state = setPipeSideMode(state, steamPipe.uid, 'west', 'input')
    state = setPipeSideMode(state, steamPipe.uid, 'east', 'output')
    state = insertProcessSlot(state, boiler.uid, 'fuel', 'coalCoke', 8)
    state = insertProcessSlot(state, macerator.uid, 'input', 'copperOre', 32)

    for (let elapsed = 0; elapsed < 30_000; elapsed += 250) state = tickGame(state, 250).state
    state = loadGame(saveGame(state, 31_000, true), 31_000)
    for (let elapsed = 0; elapsed < 210_000; elapsed += 250) {
      state = tickGame(state, 250).state
      const activeMacerator = state.machineInstances.find((instance) => instance.uid === macerator.uid)!
      if (activeMacerator.process.output) state = collectProcessOutput(state, activeMacerator.uid)
    }

    expect(state.resources.crushedCopperOre).toBeGreaterThanOrEqual(60)
    expect(state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process.fuelRemainingMs).toBeGreaterThan(0)
    expect(state.machineInstances.find((instance) => instance.uid === macerator.uid)!.process.input).toBeNull()
  })

  it('keeps a well boiler machine line running through offline simulation chunks', () => {
    let state = createFactoryState(1000)
    state.machines.well = 1
    state.machines.steamBoiler = 1
    state.machines.steamMacerator = 1
    state.resources.coal = 2
    state.resources.copperOre = 10
    state = placeMachineInstance(state, 'well', 0, 0)
    state = placeMachineInstance(state, 'steamBoiler', 1, 0)
    state = placeMachineInstance(state, 'steamMacerator', 2, 0)
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    const macerator = state.machineInstances.find((instance) => instance.machineId === 'steamMacerator')!
    state = insertProcessSlot(state, boiler.uid, 'fuel', 'coal', 2)
    state = insertProcessSlot(state, macerator.uid, 'input', 'copperOre', 10)

    const result = simulateOfflineProgress(state, 90_000, 91_000)
    const activeBoiler = result.state.machineInstances.find((instance) => instance.uid === boiler.uid)!
    const activeMacerator = result.state.machineInstances.find((instance) => instance.uid === macerator.uid)!

    expect(result.offline.applied).toBe(true)
    expect(activeMacerator.process.output).toEqual({ id: 'crushedCopperOre', amount: 20 })
    expect(activeBoiler.process.steamStoredMs).toBeGreaterThan(0)
    expect(activeBoiler.process.fluids.water).toBeGreaterThan(0)
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

  it('invalidates warmed topology caches when pipe faces change between ticks', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 1
    state.machines.copperPipe = 1
    state.machines.steamMacerator = 1
    state = placeMachineInstance(state, 'steamTank', 0, 0)
    state = placeMachineInstance(state, 'copperPipe', 1, 0)
    state = placeMachineInstance(state, 'steamMacerator', 2, 0)
    state = configurePlacedConnector(state, 'copperPipe', { west: 'input', east: 'output' })
    const tankUid = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!.uid
    const pipeUid = state.machineInstances.find((instance) => instance.machineId === 'copperPipe')!.uid
    const maceratorUid = state.machineInstances.find((instance) => instance.machineId === 'steamMacerator')!.uid
    state.machineInstances.find((instance) => instance.uid === tankUid)!.process.steamStoredMs = steamTankCapacityMs

    state = tickGame(state, 250).state
    expect(state.machineInstances.find((instance) => instance.uid === maceratorUid)!.process.steamStoredMs).toBeGreaterThan(0)

    state = setPipeSideMode(state, pipeUid, 'east', 'blocked')
    state.machineInstances.find((instance) => instance.uid === maceratorUid)!.process.steamStoredMs = 0
    state = tickGame(state, 250).state
    expect(state.machineInstances.find((instance) => instance.uid === maceratorUid)!.process.steamStoredMs).toBe(0)

    state = setPipeSideMode(state, pipeUid, 'east', 'output')
    state = tickGame(state, 250).state
    expect(state.machineInstances.find((instance) => instance.uid === maceratorUid)!.process.steamStoredMs).toBeGreaterThan(0)
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

  it('pressurizes idle pipe buffers from connected steam and liquid sources', () => {
    let steamState = createFactoryState(1000)
    steamState.machines.steamTank = 1
    steamState.machines.copperPipe = 1
    steamState = placeMachineInstance(steamState, 'steamTank', 0, 0)
    steamState = placeMachineInstance(steamState, 'copperPipe', 1, 0)
    const steamTank = steamState.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    const steamPipe = steamState.machineInstances.find((instance) => instance.machineId === 'copperPipe')!
    steamTank.process.steamStoredMs = steamTankCapacityMs
    steamState = setPipeSideMode(steamState, steamPipe.uid, 'west', 'input')

    steamState = tickGame(steamState, 1000).state

    const chargedSteamPipe = steamState.machineInstances.find((instance) => instance.uid === steamPipe.uid)!
    expect(chargedSteamPipe.process.steamStoredMs).toBe(steamPipeBufferCapacityMs('copperPipe'))
    expect(currentSteamPipeFlowLitresPerSecond(steamState, chargedSteamPipe)).toBe(0)

    let liquidState = createFactoryState(1000)
    liquidState.machines.cokeOven = 1
    liquidState.machines.copperPipe = 1
    liquidState = placeMachineInstance(liquidState, 'cokeOven', 0, 0)
    liquidState = placeMachineInstance(liquidState, 'copperPipe', 1, 0)
    const cokeOven = liquidState.machineInstances.find((instance) => instance.machineId === 'cokeOven')!
    const liquidPipe = liquidState.machineInstances.find((instance) => instance.machineId === 'copperPipe')!
    cokeOven.process.fluids.creosote = 32
    liquidState = setFluidOutputDirection(liquidState, cokeOven.uid, 'east')
    liquidState = setPipeSideMode(liquidState, liquidPipe.uid, 'west', 'input')

    liquidState = tickGame(liquidState, 1000).state

    const chargedLiquidPipe = liquidState.machineInstances.find((instance) => instance.uid === liquidPipe.uid)!
    expect(chargedLiquidPipe.process.fluids.creosote).toBe(fluidPipeBufferCapacityLitres('copperPipe'))
    expect(currentFluidOutputFlows(liquidState, chargedLiquidPipe)[0]).toMatchObject({ fluidId: 'creosote', litresPerSecond: 0 })
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
    state = setPipeSideMode(state, controller.uid, 'east', 'output')

    expect(availableConnectedSteam(state, macerator)).toBe(steamTankCapacityMs * 4)

    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === macerator.uid)!.process.steamStoredMs).toBe(24000)
    expect(state.machineInstances.find((instance) => instance.uid === controller.uid)!.process.steamStoredMs).toBe(steamTankCapacityMs * 4 - 24000)
  })

  it('fills an iron steam tank structure through a child cell', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 4
    state.machines.steamBoiler = 1
    state.machines.copperPipe = 1
    for (let y = 0; y < 2; y += 1) {
      for (let x = 0; x < 2; x += 1) state = placeMachineInstance(state, 'steamTank', x, y)
    }
    state = placeMachineInstance(state, 'copperPipe', 2, 1)
    state = placeMachineInstance(state, 'steamBoiler', 3, 1)
    const controller = state.machineInstances.find((instance) => instance.x === 0 && instance.y === 0)!
    const pipe = state.machineInstances.find((instance) => instance.machineId === 'copperPipe')!
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    state = setPipeSideMode(state, controller.uid, 'east', 'input')
    state = setPipeSideMode(state, pipe.uid, 'east', 'input')
    state = setPipeSideMode(state, pipe.uid, 'west', 'output')
    state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process.steamStoredMs = 80000

    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === controller.uid)!.process.steamStoredMs).toBe(24000)
    expect(state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process.steamStoredMs).toBe(56000)
  })

  it('applies tank controller routing modes across the whole multiblock face', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 4
    state.machines.steamBoiler = 1
    state.machines.copperPipe = 1
    for (let y = 0; y < 2; y += 1) {
      for (let x = 0; x < 2; x += 1) state = placeMachineInstance(state, 'steamTank', x, y)
    }
    state = placeMachineInstance(state, 'copperPipe', 2, 1)
    state = placeMachineInstance(state, 'steamBoiler', 3, 1)
    const controller = state.machineInstances.find((instance) => instance.x === 0 && instance.y === 0)!
    const child = state.machineInstances.find((instance) => instance.x === 1 && instance.y === 1)!
    const pipe = state.machineInstances.find((instance) => instance.machineId === 'copperPipe')!
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    state = setPipeSideMode(state, child.uid, 'east', 'blocked')
    state = setPipeSideMode(state, pipe.uid, 'east', 'input')
    state = setPipeSideMode(state, pipe.uid, 'west', 'output')
    state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process.steamStoredMs = 80000

    state = tickGame(state, 1000).state
    expect(state.machineInstances.find((instance) => instance.uid === controller.uid)!.process.steamStoredMs).toBe(0)

    state = setPipeSideMode(state, controller.uid, 'east', 'input')
    state = tickGame(state, 1000).state
    expect(state.machineInstances.find((instance) => instance.uid === controller.uid)!.process.steamStoredMs).toBe(24000)
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
    const drainQuest = quests.find((quest) => quest.id === 'cokeOvenDrainQuest')!
    expect(questObjectiveProgressRows(state, drainQuest).every((row) => row.complete)).toBe(true)
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
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    cokeOven.process.fluids.creosote = 40
    cokeOven.process.fluidCapacityLitres = cokeOvenFluidCapacityLitres

    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!.process.fluids.creosote).toBe(40)
    expect(state.machineInstances.find((instance) => instance.uid === tank.uid)!.process.fluids.creosote ?? 0).toBe(0)

    state = setFluidOutputDirection(state, cokeOven.uid, 'east')
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

  it.each([
    [1, 1, 1],
    [2, 2, 4],
    [3, 2, 6],
    [3, 3, 9],
  ])('gives a %ix%i steel tank three times the storage per block', (width, height, area) => {
    let state = createFactoryState(1000)
    state.machines.steelTank = area
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) state = placeMachineInstance(state, 'steelTank', x, y)
    }

    const controller = state.machineInstances.find((instance) => instance.x === 0 && instance.y === 0)!
    expect(steamTankCapacityMsForInstance(state, controller)).toBe(steelTankCapacityMs * area)
    expect(steamTankFluidCapacityLitresForInstance(state, controller)).toBe(steelTankFluidCapacityLitres * area)
    expect(steamTankStructureForInstance(state, controller)?.area ?? 1).toBe(area)
  })

  it('does not form a mixed iron and steel tank structure', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 2
    state.machines.steelTank = 2
    state = placeMachineInstance(state, 'steamTank', 0, 0)
    state = placeMachineInstance(state, 'steelTank', 1, 0)
    state = placeMachineInstance(state, 'steamTank', 0, 1)
    state = placeMachineInstance(state, 'steelTank', 1, 1)

    for (const tank of state.machineInstances) expect(steamTankStructureForInstance(state, tank)).toBeNull()
  })

  it('reports live steam generation, demand, net pressure, and reserve time', () => {
    let state = createFactoryState(1000)
    state.machines.steamBoiler = 1
    state.machines.steamTank = 1
    state.machines.steamTurbine = 1
    state = placeMachineInstance(state, 'steamBoiler', 0, 0)
    state = placeMachineInstance(state, 'steamTank', 1, 0)
    state = placeMachineInstance(state, 'steamTurbine', 2, 0)
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    const turbine = state.machineInstances.find((instance) => instance.machineId === 'steamTurbine')!
    boiler.process.activeRecipeId = 'make_steam'
    tank.process.steamStoredMs = 100 * steamMsPerLitre
    turbine.process.activeRecipeId = 'generate_lv_eu'

    const metrics = steamNetworkMetrics(state, tank)
    expect(metrics.generationLitresPerSecond).toBe(boilerSteamProductionLitresPerSecond)
    expect(metrics.demandLitresPerSecond).toBe(16)
    expect(metrics.netLitresPerSecond).toBe(-10)
    expect(metrics.reserveSeconds).toBe(10)
  })

  it('measures fluid flow on each pipe segment and aggregates shared routes', () => {
    let state = createFactoryState(1000)
    state.machines.well = 1
    state.machines.copperPipe = 4
    state.machines.steamTank = 2
    state = placeMachineInstance(state, 'well', 0, 1)
    state = placeMachineInstance(state, 'copperPipe', 1, 1)
    state = placeMachineInstance(state, 'copperPipe', 2, 1)
    state = placeMachineInstance(state, 'copperPipe', 2, 0)
    state = placeMachineInstance(state, 'copperPipe', 2, 2)
    state = placeMachineInstance(state, 'steamTank', 3, 0)
    state = placeMachineInstance(state, 'steamTank', 3, 2)
    const pipeAt = (x: number, y: number) => state.machineInstances.find((instance) => instance.machineId === 'copperPipe' && instance.x === x && instance.y === y)!

    state = configurePlacedConnector(state, 'copperPipe', { west: 'input', east: 'output' })
    state = setPipeSideMode(state, pipeAt(2, 1).uid, 'west', 'input')
    state = setPipeSideMode(state, pipeAt(2, 1).uid, 'north', 'output')
    state = setPipeSideMode(state, pipeAt(2, 1).uid, 'south', 'output')
    state = setPipeSideMode(state, pipeAt(2, 0).uid, 'south', 'input')
    state = setPipeSideMode(state, pipeAt(2, 0).uid, 'east', 'output')
    state = setPipeSideMode(state, pipeAt(2, 2).uid, 'north', 'input')
    state = setPipeSideMode(state, pipeAt(2, 2).uid, 'east', 'output')

    state = tickGame(state, 1000).state

    expect(currentFluidOutputFlows(state, pipeAt(1, 1))[0]).toMatchObject({ fluidId: 'water', litresPerSecond: 6 })
    expect(currentFluidOutputFlows(state, pipeAt(2, 1))[0]).toMatchObject({ fluidId: 'water', litresPerSecond: 6 })
    expect(currentFluidOutputFlows(state, pipeAt(2, 0))[0]).toMatchObject({ fluidId: 'water', litresPerSecond: 3 })
    expect(currentFluidOutputFlows(state, pipeAt(2, 2))[0]).toMatchObject({ fluidId: 'water', litresPerSecond: 3 })
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

  it('fills an empty bucket from a well water buffer', () => {
    let state = createFactoryState()
    state.machines.well = 1
    state.resources.bucket = 1
    state = placeMachineInstance(state, 'well', 0, 0)
    const well = state.machineInstances.find((instance) => instance.machineId === 'well')!
    well.process.fluids.water = 12

    state = fillPortableFluidContainer(state, well.uid, 'bucket', { fluidId: 'water', bufferId: 'water' })

    expect(state.machineInstances.find((instance) => instance.uid === well.uid)!.process.fluids.water).toBe(11)
    expect(state.fluidContainers).toContainEqual(expect.objectContaining({ kind: 'bucket', fluidId: 'water', amountLitres: 1 }))
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

  it('fires cobblestone into stone in every furnace tier', () => {
    const routes = [
      ['stone_from_cobblestone', 'furnace'],
      ['steam_furnace_stone', 'steamFurnace'],
      ['lv_furnace_stone', 'lvFurnace'],
      ['mv_inherited_lv_furnace_stone', 'mvFurnace'],
    ] as const

    routes.forEach(([recipeId, machineId]) => {
      const recipe = processRecipes.find((candidate) => candidate.id === recipeId)
      expect(recipe?.machineId).toBe(machineId)
      expect(recipe?.input).toEqual({ id: 'cobblestone', amount: 1 })
      expect(recipe?.output).toEqual({ id: 'stone', amount: 1 })
    })
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
    state.resources.resistor = 2
    state.resources.vacuumTube = 2
    state.resources.redAlloyCable = 3
    state.resources.steelItemCasing = 1
    const circuit = recipes.find((recipe) => recipe.id === 'craft_basic_electronic_circuit')!

    expect(circuit.pattern).toEqual([
      'redAlloyCable',
      'resistor',
      'redAlloyCable',
      'vacuumTube',
      'basicBoard',
      'vacuumTube',
      'redAlloyCable',
      'steelItemCasing',
      'resistor',
    ])
    expect(canCraft(state, circuit)).toBe(true)
    state = craftRecipeInstant(state, circuit, 1)

    expect(state.resources.primitiveCircuit).toBe(1)
    expect(state.resources.basicBoard).toBe(0)
    expect(state.resources.redAlloyCable).toBe(0)
    expect(state.resources.steelItemCasing).toBe(0)
  })

  it('builds printed circuit boards from compressed wooden blanks and surrounding copper wire', () => {
    let state = createFactoryState(1000)
    state.machines.steamCompressor = 1
    state.resources.woodPulp = 4
    state.resources.rubberSap = 2
    state.resources.copperWire = 8
    const board = recipes.find((recipe) => recipe.id === 'craft_basic_board')!
    const coating = recipes.find((recipe) => recipe.id === 'coat_wooden_board_blank')!
    const press = processRecipes.find((recipe) => recipe.id === 'steam_compress_wooden_board_blank')!

    expect(press.input).toEqual({ id: 'woodPulp', amount: 4 })
    expect(press.output).toEqual({ id: 'woodenBoardBlank', amount: 1 })
    expect(board.inputs).toEqual([
      { id: 'coatedBoardBlank', amount: 1 },
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
    state = craftRecipeInstant(state, coating, 1)
    expect(state.resources.coatedBoardBlank).toBe(1)
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
    expect(logPulp.output).toEqual({ id: 'woodPulp', amount: 4 })
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
        .filter((recipe) => recipe.machineId === 'steamFurnace' && recipe.output)
        .map((recipe) => `${recipe.input!.id}:${recipe.input!.amount}->${recipe.output!.id}:${recipe.output!.amount}`),
    )
    const missingSteamRecipes = processRecipes
      .filter((recipe) => recipe.machineId === 'furnace' && recipe.output)
      .map((recipe) => `${recipe.input!.id}:${recipe.input!.amount}->${recipe.output!.id}:${recipe.output!.amount}`)
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

  it('loads every item required by a selected machine recipe', () => {
    let state = createFactoryState()
    state.machines.steamAlloySmelter = 1
    state.resources.copperDust = 2
    state.resources.tinDust = 1
    state = placeMachineInstance(state, 'steamAlloySmelter', 0, 0)
    const alloySmelter = state.machineInstances.find((instance) => instance.machineId === 'steamAlloySmelter')!

    expect(processRecipeInputLoadStatus(state, alloySmelter.uid, 'steam_alloy_bronze')).toMatchObject({
      canLoad: true,
      ready: false,
      itemsToLoad: 3,
      missingResources: [],
      blockedSlots: [],
    })

    state = loadProcessRecipeInputs(state, alloySmelter.uid, 'steam_alloy_bronze')
    const process = state.machineInstances.find((instance) => instance.uid === alloySmelter.uid)!.process
    expect(process.input).toEqual({ id: 'copperDust', amount: 2 })
    expect(process.secondaryInput).toEqual({ id: 'tinDust', amount: 1 })
    expect(state.resources.copperDust).toBe(0)
    expect(state.resources.tinDust).toBe(0)
    expect(processRecipeInputLoadStatus(state, alloySmelter.uid, 'steam_alloy_bronze').ready).toBe(true)
  })

  it('does not partially load a recipe when an item is missing', () => {
    let state = createFactoryState()
    state.machines.steamAlloySmelter = 1
    state.resources.copperDust = 2
    state = placeMachineInstance(state, 'steamAlloySmelter', 0, 0)
    const alloySmelter = state.machineInstances.find((instance) => instance.machineId === 'steamAlloySmelter')!
    const status = processRecipeInputLoadStatus(state, alloySmelter.uid, 'steam_alloy_bronze')

    expect(status.canLoad).toBe(false)
    expect(status.missingResources).toEqual([{ id: 'tinDust', amount: 1 }])
    expect(loadProcessRecipeInputs(state, alloySmelter.uid, 'steam_alloy_bronze')).toBe(state)
    expect(alloySmelter.process.input).toBeNull()
    expect(state.resources.copperDust).toBe(2)
  })

  it('does not replace conflicting contents when loading a recipe', () => {
    let state = createFactoryState()
    state.machines.steamAlloySmelter = 1
    state.resources.copperDust = 2
    state.resources.tinDust = 1
    state.resources.copperIngot = 1
    state = placeMachineInstance(state, 'steamAlloySmelter', 0, 0)
    const alloySmelter = state.machineInstances.find((instance) => instance.machineId === 'steamAlloySmelter')!
    state = insertProcessSlot(state, alloySmelter.uid, 'input', 'copperIngot', 1)
    const status = processRecipeInputLoadStatus(state, alloySmelter.uid, 'steam_alloy_bronze')

    expect(status.canLoad).toBe(false)
    expect(status.blockedSlots).toEqual(['input'])
    expect(loadProcessRecipeInputs(state, alloySmelter.uid, 'steam_alloy_bronze')).toBe(state)
    expect(state.machineInstances.find((instance) => instance.uid === alloySmelter.uid)!.process.input).toEqual({ id: 'copperIngot', amount: 1 })
  })

  it('loads an aggregated assembler ingredient amount without prescribing every bay', () => {
    let state = createFactoryState()
    state.machines.lvAssembler = 1
    state.resources.woodenBoardBlank = 1
    state.resources.copperWire = 2
    state = placeMachineInstance(state, 'lvAssembler', 0, 0)
    const assembler = state.machineInstances.find((instance) => instance.machineId === 'lvAssembler')!

    state = loadProcessRecipeInputs(state, assembler.uid, 'lv_assembler_printed_circuit_board')
    const process = state.machineInstances.find((instance) => instance.uid === assembler.uid)!.process
    expect(process.input).toEqual({ id: 'woodenBoardBlank', amount: 1 })
    expect(process.secondaryInput).toEqual({ id: 'copperWire', amount: 2 })
    expect(process.extraInput1).toBeNull()
    expect(process.extraInput2).toBeNull()
    expect(process.extraInput3).toBeNull()
    expect(process.extraInput4).toBeNull()
    expect(state.resources.copperWire).toBe(0)
  })

  it('defines alloy smelter recipes as ingot outputs only', () => {
    const alloyRecipes = processRecipes.filter((recipe) => recipe.machineId === 'steamAlloySmelter')

    expect(alloyRecipes.every((recipe) => recipe.output?.id.endsWith('Ingot'))).toBe(true)
    expect(processRecipes.find((recipe) => recipe.id === 'steam_alloy_bronze')?.output).toEqual({ id: 'bronzeIngot', amount: 3 })
    expect(processRecipes.find((recipe) => recipe.id === 'steam_alloy_bronze')?.secondaryInput).toEqual({ id: 'tinDust', amount: 1 })
    expect(processRecipes.find((recipe) => recipe.id === 'steam_alloy_red_alloy')?.output).toEqual({ id: 'redAlloyIngot', amount: 2 })
    expect(processRecipes.find((recipe) => recipe.id === 'steam_alloy_red_alloy_ingot')?.input).toEqual({ id: 'copperIngot', amount: 1 })
    expect(processRecipes.find((recipe) => recipe.id === 'steam_alloy_red_alloy_ingot')?.secondaryInput).toEqual({ id: 'redstoneDust', amount: 4 })
    expect(processRecipes.find((recipe) => recipe.id === 'steam_alloy_red_alloy_ingot')?.output).toEqual({ id: 'redAlloyIngot', amount: 2 })
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
    expect(process.input).toEqual({ id: 'tinIngot', amount: 1 })
    expect(process.inputsCommitted).toBe(false)
    expect(process.output).toBeNull()
  })

  it('commits EU machine inputs at startup and resumes the same craft after power returns', () => {
    let state = createFactoryState(1000)
    state.machines.lvWiremill = 1
    state.resources.tinIngot = 1
    state = placeMachineInstance(state, 'lvWiremill', 0, 0)
    const wiremill = state.machineInstances[0]
    state = insertProcessSlot(state, wiremill.uid, 'input', 'tinIngot', 1)
    state.machineInstances[0].process.euStored = 8

    state = tickGame(state, 1000).state

    expect(state.machineInstances[0].process.input).toBeNull()
    expect(state.machineInstances[0].process.activeRecipeId).toBe('lv_wiremill_tin_wire')
    expect(state.machineInstances[0].process.inputsCommitted).toBe(true)
    expect(state.machineInstances[0].process.progressMs).toBe(1000)

    state = tickGame(state, 1000).state

    expect(state.machineInstances[0].process.activeRecipeId).toBe('lv_wiremill_tin_wire')
    expect(state.machineInstances[0].process.progressMs).toBe(1000)
    expect(state.machineInstances[0].process.output).toBeNull()

    state.machineInstances[0].process.euStored = 24
    state = tickGame(state, 3000).state

    expect(state.machineInstances[0].process.activeRecipeId).toBeNull()
    expect(state.machineInstances[0].process.inputsCommitted).toBe(false)
    expect(state.machineInstances[0].process.output).toEqual({ id: 'tinWire', amount: 2 })
  })

  it('preserves committed crafts across saves without consuming their inputs twice', () => {
    let state = createFactoryState(1000)
    state.machines.lvWiremill = 1
    state.resources.tinIngot = 1
    state = placeMachineInstance(state, 'lvWiremill', 0, 0)
    const wiremill = state.machineInstances[0]
    state = insertProcessSlot(state, wiremill.uid, 'input', 'tinIngot', 1)
    state.machineInstances[0].process.euStored = 8
    state = tickGame(state, 1000, 2000).state

    const loaded = loadGame(saveGame(state, 2000, true), 2000)

    expect(loaded.machineInstances[0].process.input).toBeNull()
    expect(loaded.machineInstances[0].process.activeRecipeId).toBe('lv_wiremill_tin_wire')
    expect(loaded.machineInstances[0].process.inputsCommitted).toBe(true)
    expect(loaded.resources.tinIngot).toBe(0)
  })

  it('commits legacy mid-craft inputs once and rejects orphaned committed flags', () => {
    let state = createFactoryState(1000)
    state.machines.lvWiremill = 1
    state.resources.tinIngot = 2
    state = placeMachineInstance(state, 'lvWiremill', 0, 0)
    state = insertProcessSlot(state, state.machineInstances[0].uid, 'input', 'tinIngot', 2)
    state.machineInstances[0].process.activeRecipeId = 'lv_wiremill_tin_wire'
    state.machineInstances[0].process.progressMs = 1000
    state.machineInstances[0].process.durationMs = 4000
    state.machineInstances[0].process.euStored = 8

    state = loadGame(saveGame(state, 1000, true), 1000)
    expect(state.machineInstances[0].process.inputsCommitted).toBe(false)

    state = tickGame(state, 1000, 2000).state
    expect(state.machineInstances[0].process.input).toEqual({ id: 'tinIngot', amount: 1 })
    expect(state.machineInstances[0].process.inputsCommitted).toBe(true)

    state.machineInstances[0].process.activeRecipeId = null
    state.machineInstances[0].process.inputsCommitted = true
    const normalized = loadGame(saveGame(state, 2000, true), 2000)
    expect(normalized.machineInstances[0].process.inputsCommitted).toBe(false)
  })

  it('continues a committed craft after its reusable tooling is removed', () => {
    let state = createFactoryState(1000)
    state.machines.mvExtruder = 1
    state.resources.ironIngot = 4
    state.resources.extrusionMoldGear = 1
    state = placeMachineInstance(state, 'mvExtruder', 0, 0)
    const extruder = state.machineInstances[0]
    state = insertProcessSlot(state, extruder.uid, 'input', 'ironIngot', 4)
    state = insertProcessSlot(state, extruder.uid, 'secondaryInput', 'extrusionMoldGear', 1)
    state.machineInstances[0].process.euStored = 64

    state = tickGame(state, 1000).state

    expect(state.machineInstances[0].process.input).toBeNull()
    expect(state.machineInstances[0].process.secondaryInput).toEqual({ id: 'extrusionMoldGear', amount: 1 })
    expect(state.machineInstances[0].process.activeRecipeId).toBe('mv_extrude_iron_gear')

    state = removeProcessSlot(state, extruder.uid, 'secondaryInput')

    expect(state.machineInstances[0].process.secondaryInput).toBeNull()
    expect(state.machineInstances[0].process.activeRecipeId).toBe('mv_extrude_iron_gear')
    expect(state.resources.extrusionMoldGear).toBe(1)

    state.machineInstances[0].process.euStored = 1024
    state = tickGame(state, 12000).state

    expect(state.machineInstances[0].process.output).toEqual({ id: 'ironGear', amount: 1 })
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

  it('invalidates warmed EU topology caches after cable removal and replacement', () => {
    let state = createFactoryState(1000)
    state.machines.steamTurbine = 1
    state.resources.tinCable = 1
    state.machines.lvWiremill = 1
    state = placeMachineInstance(state, 'steamTurbine', 0, 0)
    state = placeMachineInstance(state, 'tinCable', 1, 0)
    state = placeMachineInstance(state, 'lvWiremill', 2, 0)
    const turbineUid = state.machineInstances.find((instance) => instance.machineId === 'steamTurbine')!.uid
    const cableUid = state.machineInstances.find((instance) => instance.machineId === 'tinCable')!.uid
    const wiremillUid = state.machineInstances.find((instance) => instance.machineId === 'lvWiremill')!.uid
    state.machineInstances.find((instance) => instance.uid === turbineUid)!.process.euStored = 100
    state = setPipeSideMode(state, cableUid, 'west', 'both')
    state = setPipeSideMode(state, cableUid, 'east', 'both')

    state = tickGame(state, 250).state
    expect(state.machineInstances.find((instance) => instance.uid === wiremillUid)!.process.euStored).toBeGreaterThan(0)

    state = removeMachineInstance(state, cableUid)
    state.machineInstances.find((instance) => instance.uid === turbineUid)!.process.euStored = 100
    state.machineInstances.find((instance) => instance.uid === wiremillUid)!.process.euStored = 0
    state = tickGame(state, 250).state
    expect(state.machineInstances.find((instance) => instance.uid === wiremillUid)!.process.euStored).toBe(0)

    state = placeMachineInstance(state, 'tinCable', 1, 0)
    const replacementCableUid = state.machineInstances.find((instance) => instance.machineId === 'tinCable')!.uid
    state = setPipeSideMode(state, replacementCableUid, 'west', 'both')
    state = setPipeSideMode(state, replacementCableUid, 'east', 'both')
    state = tickGame(state, 250).state
    expect(state.machineInstances.find((instance) => instance.uid === wiremillUid)!.process.euStored).toBeGreaterThan(0)
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
    state = setBatteryBufferOutputDirection(state, buffer.uid, 'east')
    state = installLvBatteryInBuffer(state, buffer.uid)
    state.machineInstances.find((instance) => instance.uid === turbine.uid)!.process.euStored = 200

    state = tickGame(state, 10000).state
    const chargedBuffer = state.machineInstances.find((instance) => instance.uid === buffer.uid)!
    const primedWiremill = state.machineInstances.find((instance) => instance.uid === wiremill.uid)!
    expect(chargedBuffer.process.euStored + primedWiremill.process.euStored).toBe(190)
    expect(batteryBufferLiveEuRates(chargedBuffer).inputEuPerSecond).toBeGreaterThan(0)
    expect(batteryBufferLiveEuRates(chargedBuffer).outputEuPerSecond).toBeGreaterThan(0)
    expect(availableConnectedEuStorage(state, primedWiremill)).toBe(chargedBuffer.process.euStored)

    state = insertProcessSlot(state, wiremill.uid, 'input', 'tinIngot', 1)
    state = tickGame(state, 5000).state

    const nextWiremill = state.machineInstances.find((instance) => instance.uid === wiremill.uid)!
    expect(nextWiremill.process.output).toEqual({ id: 'tinWire', amount: 2 })
    expect(state.machineInstances.find((instance) => instance.uid === buffer.uid)!.process.euStored).toBeLessThan(190)
  })

  it('gives LV battery buffers three input faces and one selected EU output', () => {
    let state = createFactoryState(1000)
    state.machines.lvBatteryBuffer = 1
    state.machines.lvWiremill = 2
    state.resources.sodiumBattery = 1
    state = placeMachineInstance(state, 'lvBatteryBuffer', 1, 1)
    state = placeMachineInstance(state, 'lvWiremill', 0, 1)
    state = placeMachineInstance(state, 'lvWiremill', 2, 1)
    const buffer = state.machineInstances.find((instance) => instance.machineId === 'lvBatteryBuffer')!
    const westMachine = state.machineInstances.find((instance) => instance.x === 0 && instance.y === 1)!
    const eastMachine = state.machineInstances.find((instance) => instance.x === 2 && instance.y === 1)!
    state = setBatteryBufferOutputDirection(state, buffer.uid, 'east')
    state = installLvBatteryInBuffer(state, buffer.uid)
    state.machineInstances.find((instance) => instance.uid === buffer.uid)!.process.euStored = 100

    const configuredBuffer = state.machineInstances.find((instance) => instance.uid === buffer.uid)!
    expect(batteryBufferOutputDirection(configuredBuffer)).toBe('east')
    expect(pipeDirections.map((direction) => pipeSideMode(configuredBuffer, direction))).toEqual(['input', 'output', 'input', 'input'])
    expect(availableConnectedEu(state, westMachine)).toBe(0)
    expect(availableConnectedEu(state, eastMachine)).toBe(100)

    state = tickGame(state, 1000).state
    expect(state.machineInstances.find((instance) => instance.uid === westMachine.uid)!.process.euStored).toBe(0)
    expect(state.machineInstances.find((instance) => instance.uid === eastMachine.uid)!.process.euStored).toBe(32)
  })

  it('infers a legacy battery buffer input from its adjacent EU supply cable', () => {
    let state = createFactoryState(1000)
    state.resources.tinCable = 1
    state.machines.lvBatteryBuffer = 1
    state = placeMachineInstance(state, 'tinCable', 1, 0)
    state = placeMachineInstance(state, 'lvBatteryBuffer', 2, 0)
    const buffer = state.machineInstances.find((instance) => instance.machineId === 'lvBatteryBuffer')!
    buffer.pipeSideModes = {}
    buffer.pipeDisabledSides = {}

    const loaded = loadGame(saveGame(state), 2000)
    const migratedBuffer = loaded.machineInstances.find((instance) => instance.uid === buffer.uid)!
    expect(batteryBufferOutputDirection(migratedBuffer)).toBe('west')
    expect(pipeDirections.filter((direction) => pipeSideMode(migratedBuffer, direction) === 'output')).toHaveLength(1)
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
    state.resources.copperWire = 2
    state = placeMachineInstance(state, 'steamTurbine', 0, 0)
    state = placeMachineInstance(state, 'lvAssembler', 1, 0)
    const assembler = state.machineInstances.find((instance) => instance.machineId === 'lvAssembler')!
    state.machineInstances.find((instance) => instance.machineId === 'steamTurbine')!.process.euStored = 200
    assembler.process.fluids.dilutedSulfuricAcid = 1
    state = insertProcessSlot(state, assembler.uid, 'extraInput4', 'woodenBoardBlank', 1)
    state = insertProcessSlot(state, assembler.uid, 'extraInput3', 'copperWire', 2)

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

  it('requires LV cable faces to connect while keeping power non-directional', () => {
    let state = createFactoryState(1000)
    state.machines.steamTurbine = 1
    state.resources.tinCable = 1
    state.machines.lvWiremill = 1
    state = placeMachineInstance(state, 'steamTurbine', 0, 0)
    state = placeMachineInstance(state, 'tinCable', 1, 0)
    state = placeMachineInstance(state, 'lvWiremill', 2, 0)
    const cable = state.machineInstances.find((instance) => instance.machineId === 'tinCable')!
    const turbine = state.machineInstances.find((instance) => instance.machineId === 'steamTurbine')!
    const wiremill = state.machineInstances.find((instance) => instance.machineId === 'lvWiremill')!
    state.machineInstances.find((instance) => instance.uid === turbine.uid)!.process.euStored = 100

    expect(pipeSideMode(state.machineInstances.find((instance) => instance.uid === cable.uid)!, 'west')).toBe('blocked')
    expect(pipeSideMode(state.machineInstances.find((instance) => instance.uid === cable.uid)!, 'east')).toBe('blocked')
    expect(availableConnectedEu(state, wiremill)).toBe(0)

    state = setPipeSideMode(state, cable.uid, 'west', 'output')
    expect(pipeSideMode(state.machineInstances.find((instance) => instance.uid === cable.uid)!, 'west')).toBe('both')
    expect(availableConnectedEu(state, wiremill)).toBe(0)

    state = setPipeSideMode(state, cable.uid, 'east', 'input')
    expect(pipeSideMode(state.machineInstances.find((instance) => instance.uid === cable.uid)!, 'east')).toBe('both')
    expect(availableConnectedEu(state, wiremill)).toBe(100)

    state = setPipeSideMode(state, cable.uid, 'east', 'blocked')
    expect(availableConnectedEu(state, wiremill)).toBe(0)
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
    state = setBatteryBufferOutputDirection(state, buffer.uid, 'east')
    const wiremill = state.machineInstances.find((instance) => instance.machineId === 'lvWiremill')!
    for (let index = 0; index < 4; index += 1) state = installLvBatteryInBuffer(state, buffer.uid)
    state.machineInstances.find((instance) => instance.uid === buffer.uid)!.process.euStored = 8192
    state = insertProcessSlot(state, wiremill.uid, 'input', 'tinIngot', 1)

    state = tickGame(state, 1000).state

    const nextBuffer = state.machineInstances.find((instance) => instance.uid === buffer.uid)!
    expect(8192 - nextBuffer.process.euStored).toBeLessThanOrEqual(33)
  })

  it('measures EU on each cable segment and limits each branch independently', () => {
    let state = createFactoryState(1000)
    state.machines.lvBatteryBuffer4A = 1
    state.resources.tinCable4A = 2
    state.resources.tinCable = 2
    state.machines.lvWiremill = 2
    state.resources.sodiumBattery = 4
    state = placeMachineInstance(state, 'lvBatteryBuffer4A', 0, 1)
    state = placeMachineInstance(state, 'tinCable4A', 1, 1)
    state = placeMachineInstance(state, 'tinCable4A', 2, 1)
    state = placeMachineInstance(state, 'tinCable', 2, 0)
    state = placeMachineInstance(state, 'tinCable', 2, 2)
    state = placeMachineInstance(state, 'lvWiremill', 3, 0)
    state = placeMachineInstance(state, 'lvWiremill', 3, 2)
    const cableAt = (x: number, y: number) => state.machineInstances.find((instance) => isEuCableMachine(instance.machineId) && instance.x === x && instance.y === y)!
    const buffer = state.machineInstances.find((instance) => instance.machineId === 'lvBatteryBuffer4A')!
    state = setBatteryBufferOutputDirection(state, buffer.uid, 'east')
    for (let index = 0; index < 4; index += 1) state = installLvBatteryInBuffer(state, buffer.uid)
    state.machineInstances.find((instance) => instance.uid === buffer.uid)!.process.euStored = 8192

    for (const [x, y, modes] of [
      [1, 1, { west: 'both', east: 'both' }],
      [2, 1, { west: 'both', north: 'both', south: 'both' }],
      [2, 0, { south: 'both', east: 'both' }],
      [2, 2, { north: 'both', east: 'both' }],
    ] as Array<[number, number, Partial<Record<PipeDirection, PipeSideMode>>]>) {
      for (const [direction, mode] of Object.entries(modes) as Array<[PipeDirection, PipeSideMode]>) {
        state = setPipeSideMode(state, cableAt(x, y).uid, direction, mode)
      }
    }

    state = tickGame(state, 1000).state

    expect(currentEuCableFlowEuPerSecond(state, cableAt(1, 1))).toBe(58)
    expect(currentEuCableFlowEuPerSecond(state, cableAt(2, 1))).toBe(58)
    expect(currentEuCableFlowEuPerSecond(state, cableAt(2, 0))).toBe(29)
    expect(currentEuCableFlowEuPerSecond(state, cableAt(2, 2))).toBe(29)
  })

  it('keeps an idle cable empty until a connected machine requests EU', () => {
    let state = createFactoryState(1000)
    state.machines.lvBatteryBuffer = 1
    state.resources.tinCable = 1
    state.resources.sodiumBattery = 1
    state = placeMachineInstance(state, 'lvBatteryBuffer', 0, 0)
    state = placeMachineInstance(state, 'tinCable', 1, 0)
    const buffer = state.machineInstances.find((instance) => instance.machineId === 'lvBatteryBuffer')!
    const cable = state.machineInstances.find((instance) => instance.machineId === 'tinCable')!
    state = installLvBatteryInBuffer(state, buffer.uid)
    state.machineInstances.find((instance) => instance.uid === buffer.uid)!.process.euStored = 2048
    state = setPipeSideMode(state, cable.uid, 'west', 'both')

    state = tickGame(state, 1000).state

    const idleCable = state.machineInstances.find((instance) => instance.uid === cable.uid)!
    expect(currentEuCableFlowEuPerSecond(state, idleCable)).toBe(0)
    expect(idleCable.process.euStored).toBe(0)
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
    expect(boiler.process.steamStoredMs).toBe(120000)
    expect(boiler.process.steamCapacityMs).toBe(liquidSteamBoilerCapacityMs)
    expect(boiler.process.fluidCapacityLitres).toBe(liquidSteamBoilerFluidCapacityLitres)
    expect(boiler.process.fluids.creosote).toBe(20 - 5 * liquidSteamBoilerCreosoteUseLitresPerSecond)
  })

  it('does not burn creosote faster than the best coke oven recipe can produce it', () => {
    const fastestCokeOvenRate = Math.max(...processRecipes
      .filter((recipe) => recipe.machineId === 'cokeOven')
      .flatMap((recipe) => {
        const creosote = recipe.fluidOutput?.id === 'creosote'
          ? recipe.fluidOutput
          : recipe.fluidOutputs?.find((output) => output.id === 'creosote')
        return creosote ? [creosote.amount / (recipe.durationMs / 1000)] : []
      }))

    expect(fastestCokeOvenRate).toBe(0.4)
    expect(liquidSteamBoilerCreosoteUseLitresPerSecond).toBeLessThanOrEqual(fastestCokeOvenRate)
  })

  it('consumes machine components used to craft upgraded machines', () => {
    let state = createFactoryState(1000)
    state.machines.furnace = 2
    state.resources.ironPlate = 4
    const upgradedFurnace: Recipe = {
      id: 'test_upgrade_furnace',
      name: 'Upgrade Furnace',
      description: 'Test recipe with a machine component.',
      tier: 'steam',
      durationMs: 1000,
      inputs: [{ id: 'ironPlate', amount: 2 }],
      machineInputs: [{ id: 'furnace', amount: 1 }],
      outputs: [],
      machineOutputs: [{ id: 'steamFurnace', amount: 1 }],
    }

    expect(craftableQuantity(state, upgradedFurnace)).toBe(2)
    state = craftRecipeInstant(state, upgradedFurnace, 2)

    expect(state.machines.furnace).toBe(0)
    expect(state.resources.ironPlate).toBe(0)
    expect(state.machines.steamFurnace).toBe(2)
  })

  it('loads and matches machine components inside the terminal crafting grid', () => {
    const state = createFactoryState(1000)
    state.machines.furnace = 1
    state.resources.ironPlate = 2
    const upgradedFurnace: Recipe = {
      id: 'test_grid_upgrade_furnace',
      name: 'Grid Upgrade Furnace',
      description: 'Test a machine in a shaped crafting pattern.',
      tier: 'steam',
      durationMs: 1000,
      inputs: [{ id: 'ironPlate', amount: 2 }],
      machineInputs: [{ id: 'furnace', amount: 1 }],
      pattern: [
        'ironPlate', null, null,
        null, { kind: 'machine', id: 'furnace' }, null,
        null, null, 'ironPlate',
      ],
      outputs: [],
      machineOutputs: [{ id: 'steamFurnace', amount: 1 }],
    }

    const grid = makeGridForRecipe(upgradedFurnace, state)

    expect(recipeFitsTerminalGrid(upgradedFurnace)).toBe(true)
    expect(grid[4]).toEqual({ kind: 'machine', id: 'furnace', ghost: false })
    expect(findGridRecipe(grid, [upgradedFurnace])?.id).toBe(upgradedFurnace.id)
  })

  it('pulls water from an exporting tank through a configured pipe into a solid fuel boiler', () => {
    let state = createFactoryState(1000)
    state.machines.steamTank = 1
    state.machines.copperPipe = 1
    state.machines.steamBoiler = 1
    state = placeMachineInstance(state, 'steamTank', 0, 0)
    state = placeMachineInstance(state, 'copperPipe', 1, 0)
    state = placeMachineInstance(state, 'steamBoiler', 2, 0)
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    const pipe = state.machineInstances.find((instance) => instance.machineId === 'copperPipe')!
    const boiler = state.machineInstances.find((instance) => instance.machineId === 'steamBoiler')!
    state = setFluidOutputDirection(state, tank.uid, 'east')
    state = setPipeSideMode(state, pipe.uid, 'west', 'input')
    state = setPipeSideMode(state, pipe.uid, 'east', 'output')
    state.machineInstances.find((instance) => instance.uid === tank.uid)!.process.fluids.water = 64
    state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process.fuel = { id: 'coal', amount: 1 }
    expect(pipeSideMode(state.machineInstances.find((instance) => instance.uid === tank.uid)!, 'east')).toBe('output')
    expect(boilerHasWater(state, state.machineInstances.find((instance) => instance.uid === boiler.uid)!)).toBe(true)

    state = tickGame(state, 1000).state

    const nextTank = state.machineInstances.find((instance) => instance.uid === tank.uid)!
    const nextBoiler = state.machineInstances.find((instance) => instance.uid === boiler.uid)!
    expect(nextTank.process.fluids.water).toBeLessThan(64)
    expect(nextBoiler.process.steamStoredMs).toBeGreaterThan(0)
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
    state = setBatteryBufferOutputDirection(state, buffers.find((buffer) => buffer.x === 0)!.uid, 'east')
    state = setBatteryBufferOutputDirection(state, buffers.find((buffer) => buffer.x === 2)!.uid, 'south')
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
    const leftCable = state.machineInstances.find((instance) => instance.machineId === 'tinCable4A' && instance.x === 1)!
    const rightCable = state.machineInstances.find((instance) => instance.machineId === 'tinCable4A' && instance.x === 2)!
    state = setPipeSideMode(state, leftCable.uid, 'west', 'both')
    state = setPipeSideMode(state, leftCable.uid, 'south', 'both')
    state = setPipeSideMode(state, rightCable.uid, 'south', 'both')
    const buffer = state.machineInstances.find((instance) => instance.machineId === 'lvBatteryBuffer4A')!
    state = setBatteryBufferOutputDirection(state, buffer.uid, 'east')
    for (let index = 0; index < 4; index += 1) state = installLvBatteryInBuffer(state, buffer.uid)
    state.machineInstances.find((instance) => instance.uid === buffer.uid)!.process.euStored = 8192
    const arc = state.machineInstances.find((instance) => instance.machineId === 'arcBlastFurnace')!
    state = insertProcessSlot(state, arc.uid, 'input', 'aluminiumDust', 1)

    state = tickGame(state, 1000).state

    const chargedStructure = arcBlastFurnaceStructureForInstance(state, state.machineInstances.find((instance) => instance.uid === arc.uid)!)!
    expect(chargedStructure.energyHatches.reduce((sum, hatch) => sum + hatch.process.euStored, 0)).toBeGreaterThan(0)
    expect(chargedStructure.controller.process.activeRecipeId).toBe('arc_blast_aluminium')
    expect(chargedStructure.controller.process.inputsCommitted).toBe(true)
    expect(chargedStructure.inputBus?.process.input).toBeNull()

    const pausedProgress = chargedStructure.controller.process.progressMs
    state = setPipeSideMode(state, buffer.uid, 'east', 'blocked')
    state.machineInstances.find((instance) => instance.uid === buffer.uid)!.process.euStored = 0
    for (const hatch of chargedStructure.energyHatches) {
      state.machineInstances.find((instance) => instance.uid === hatch.uid)!.process.euStored = 0
    }
    state = tickGame(state, 2000).state

    const pausedStructure = arcBlastFurnaceStructureForInstance(state, state.machineInstances.find((instance) => instance.uid === arc.uid)!)!
    expect(pausedStructure.controller.process.activeRecipeId).toBe('arc_blast_aluminium')
    expect(pausedStructure.controller.process.progressMs).toBe(pausedProgress)

    state = setBatteryBufferOutputDirection(state, buffer.uid, 'east')
    state.machineInstances.find((instance) => instance.uid === buffer.uid)!.process.euStored = 8192

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
    state = setConfiguredProcessProgram(state, assembler.uid, 1)
    state.machineInstances[0].process.fluids.glue = 2
    state.machineInstances[0].process.euStored = 128

    state = tickGame(state, 8000).state

    expect(state.machines.lvInputBus).toBe(0)
    expect(state.machineInstances[0].process.machineOutput).toEqual({ id: 'lvInputBus', amount: 1 })
    expect(state.machineInstances[0].process.input).toBeNull()
    expect(state.machineInstances[0].process.secondaryInput).toBeNull()

    state = collectProcessMachineOutput(state, assembler.uid)

    expect(state.machines.lvInputBus).toBe(1)
    expect(state.machineInstances[0].process.machineOutput).toBeNull()
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

  it('moves items and fluids directly through Arc Furnace ports with conductors', () => {
    let state = createFactoryState(1000)
    Object.assign(state.machines, {
      arcBlastFurnace: 1,
      arcBlastFurnacePart: 2,
      lvEnergyHatch2A: 2,
      lvInputBus: 1,
      lvOutputBus: 1,
      lvFluidInputHatch: 1,
      lvFluidOutputHatch: 1,
      standardChest: 2,
      steelTank: 2,
      itemConductor: 2,
      fluidConductor: 2,
    })
    for (const [id, x, y] of [
      ['lvEnergyHatch2A', 2, 2], ['lvEnergyHatch2A', 3, 2], ['arcBlastFurnacePart', 4, 2],
      ['lvInputBus', 2, 3], ['arcBlastFurnace', 3, 3], ['lvOutputBus', 4, 3],
      ['lvFluidInputHatch', 2, 4], ['lvFluidOutputHatch', 3, 4], ['arcBlastFurnacePart', 4, 4],
      ['standardChest', 0, 3], ['itemConductor', 1, 3], ['itemConductor', 5, 3], ['standardChest', 6, 3],
      ['steelTank', 0, 4], ['fluidConductor', 1, 4], ['fluidConductor', 3, 5], ['steelTank', 3, 6],
    ] as Array<[MachineId, number, number]>) state = placeMachineInstance(state, id, x, y)

    const structure = arcBlastFurnaceStructureForInstance(state, state.machineInstances.find((instance) => instance.machineId === 'arcBlastFurnace')!)!
    expect(structure.formed).toBe(true)
    const [sourceChest, targetChest] = state.machineInstances.filter((instance) => instance.machineId === 'standardChest')
    const [sourceTank, targetTank] = state.machineInstances.filter((instance) => instance.machineId === 'steelTank')
    const [inputItemConductor, outputItemConductor] = state.machineInstances.filter((instance) => instance.machineId === 'itemConductor')
    const [inputFluidConductor, outputFluidConductor] = state.machineInstances.filter((instance) => instance.machineId === 'fluidConductor')
    sourceChest.process.storageSlots[0] = { id: 'aluminiumDust', amount: 1 }
    sourceTank.process.fluids.oxygen = 16
    structure.outputBus!.process.output = { id: 'aluminiumIngot', amount: 1 }
    structure.fluidOutputHatch!.process.fluids.nitrogen = 16
    state = setConductorFaceSettings(state, inputItemConductor.uid, 'item', 'west', { mode: 'input', channel: 0 })
    state = setConductorFaceSettings(state, inputItemConductor.uid, 'item', 'east', { mode: 'output', channel: 0 })
    state = setConductorFaceSettings(state, outputItemConductor.uid, 'item', 'west', { mode: 'input', channel: 1 })
    state = setConductorFaceSettings(state, outputItemConductor.uid, 'item', 'east', { mode: 'output', channel: 1 })
    state = setConductorFaceSettings(state, inputFluidConductor.uid, 'fluid', 'west', { mode: 'input', channel: 2 })
    state = setConductorFaceSettings(state, inputFluidConductor.uid, 'fluid', 'east', { mode: 'output', channel: 2 })
    state = setConductorFaceSettings(state, outputFluidConductor.uid, 'fluid', 'north', { mode: 'input', channel: 3 })
    state = setConductorFaceSettings(state, outputFluidConductor.uid, 'fluid', 'south', { mode: 'output', channel: 3 })

    state = tickGame(state, 1000).state

    const routedStructure = arcBlastFurnaceStructureForInstance(state, state.machineInstances.find((instance) => instance.machineId === 'arcBlastFurnace')!)!
    expect(routedStructure.inputBus!.process.input).toEqual({ id: 'aluminiumDust', amount: 1 })
    expect(state.machineInstances.find((instance) => instance.uid === targetChest.uid)!.process.storageSlots[0]).toEqual({ id: 'aluminiumIngot', amount: 1 })
    expect(routedStructure.fluidInputHatch!.process.fluids.oxygen).toBe(16)
    expect(state.machineInstances.find((instance) => instance.uid === targetTank.uid)!.process.fluids.nitrogen).toBe(16)
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
      ['lv_assembler_resistors', 'lvAssembler', { id: 'carbonDust', amount: 1 }, { id: 'copperWire', amount: 2 }, { id: 'resistor', amount: 4 }],
      ['lv_assembler_printed_circuit_board', 'lvAssembler', { id: 'woodenBoardBlank', amount: 1 }, { id: 'copperWire', amount: 2 }, { id: 'basicBoard', amount: 1 }],
      ['lv_assembler_aluminium_piston', 'lvAssembler', { id: 'lvMotor', amount: 1 }, { id: 'aluminiumGear', amount: 1 }, { id: 'lvPiston', amount: 1 }],
      ['lv_alloy_cupronickel', 'lvAlloySmelter', { id: 'copperDust', amount: 2 }, { id: 'nickelDust', amount: 2 }, { id: 'cupronickelIngot', amount: 3 }],
      ['lv_alloy_cupronickel_ingots', 'lvAlloySmelter', { id: 'copperIngot', amount: 2 }, { id: 'nickelIngot', amount: 2 }, { id: 'cupronickelIngot', amount: 3 }],
    ] as const

    for (const [id, machineId, input, secondaryInput, output] of expectations) {
      const recipe = processRecipes.find((candidate) => candidate.id === id)
      expect(recipe?.machineId, id).toBe(machineId)
      expect(recipe?.input, id).toEqual(input)
      expect(recipe?.secondaryInput, id).toEqual(secondaryInput)
      if (id === 'lv_assembler_printed_circuit_board') expect(recipe?.extraInputs, id).toBeUndefined()
      if (id === 'lv_assembler_aluminium_piston') {
        expect(recipe?.extraInputs, id).toEqual([
          { id: 'aluminiumRing', amount: 2 },
          { id: 'aluminiumScrew', amount: 2 },
          { id: 'aluminiumRod', amount: 1 },
        ])
      }
      expect(recipe?.output, id).toEqual(output)
      expect(recipe?.euCost, id).toBeGreaterThan(0)
    }
  })

  it('only produces cupronickel in the LV or inherited MV Alloy Smelter', () => {
    const handRecipes = recipes.filter((recipe) =>
      recipe.outputs.some((output) => output.id === 'cupronickelIngot'),
    )
    const machineRecipes = processRecipes.filter((recipe) =>
      recipe.output?.id === 'cupronickelIngot' ||
      recipe.secondaryOutput?.id === 'cupronickelIngot',
    )

    expect(handRecipes).toEqual([])
    expect(machineRecipes.map((recipe) => recipe.id)).toEqual([
      'lv_alloy_cupronickel',
      'lv_alloy_cupronickel_ingots',
      'mv_inherited_lv_alloy_cupronickel',
      'mv_inherited_lv_alloy_cupronickel_ingots',
    ])
    expect(machineRecipes.every((recipe) => recipe.machineId === 'lvAlloySmelter' || recipe.machineId === 'mvAlloySmelter')).toBe(true)
  })

  it('crafts empty battery cells by hand or in an efficient LV Assembler batch', () => {
    const terminalRecipe = recipes.find((recipe) => recipe.id === 'craft_empty_battery_cell')
    const processRecipe = processRecipes.find((recipe) => recipe.id === 'lv_assembler_empty_battery_cells')

    expect(processRecipe).toMatchObject({
      machineId: 'lvAssembler',
      input: { id: 'leadPlate', amount: 1 },
      secondaryInput: { id: 'batteryAlloyPlate', amount: 2 },
      extraInputs: [{ id: 'tinCable', amount: 1 }, { id: 'rubber', amount: 1 }],
      output: { id: 'emptyBatteryCell', amount: 2 },
    })
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
        { id: 'steelPlate', amount: 4 },
        { id: 'redAlloyWire', amount: 2 },
        { id: cableId, amount: 2 },
        { id: 'lvMachineHull', amount: 1 },
      ])
      expect(recipe?.machineInputs, recipeId).toBeUndefined()
      expect(recipe?.pattern, recipeId).toEqual(['steelPlate', 'redAlloyWire', 'steelPlate', cableId, 'lvMachineHull', cableId, 'steelPlate', 'redAlloyWire', 'steelPlate'])
      expect(recipe?.machineOutputs, recipeId).toEqual([{ id: outputId, amount: 1 }])
      expect(recipe && recipeFitsTerminalGrid(recipe), recipeId).toBe(true)
    }

    const eightAmpRecipe = recipes.find((candidate) => candidate.id === 'build_lv_battery_buffer_8a')
    expect(eightAmpRecipe?.inputs).toEqual([
      { id: 'aluminiumPlate', amount: 4 },
      { id: 'redAlloyWire', amount: 2 },
      { id: 'tinCable8A', amount: 2 },
      { id: 'lvMachineHull', amount: 1 },
    ])
    expect(eightAmpRecipe?.pattern).toEqual([
      'aluminiumPlate', 'redAlloyWire', 'aluminiumPlate',
      'tinCable8A', 'lvMachineHull', 'tinCable8A',
      'aluminiumPlate', 'redAlloyWire', 'aluminiumPlate',
    ])
    expect(eightAmpRecipe?.machineOutputs).toEqual([{ id: 'lvBatteryBuffer8A', amount: 1 }])
    expect(eightAmpRecipe && recipeFitsTerminalGrid(eightAmpRecipe)).toBe(true)
  })

  it('uses crafted tin cable for both recipes and factory placement', () => {
    const cableRecipe = recipes.find((recipe) => recipe.id === 'build_tin_cable')!
    const bufferRecipe = recipes.find((recipe) => recipe.id === 'build_lv_battery_buffer')!
    let state = createFactoryState()
    state.resources.tinWire = 3
    state.resources.rubber = 6

    state = craftRecipeInstant(state, cableRecipe, 1)

    expect(state.resources.tinCable).toBe(4)
    expect(state.machines.tinCable).toBe(0)
    expect(availableUnplacedMachineCount(state, 'tinCable')).toBe(4)

    state.resources.lvMachineHull = 1
    state.resources.steelPlate = 4
    state.resources.redAlloyWire = 2
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
      lv_assembler_liquid_tin_cable_2a: 4,
      lv_assembler_liquid_tin_cable_4a: 4,
      lv_assembler_liquid_tin_cable_8a: 4,
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
      ['craft_lv_motor', 'lvMotor', ['steelPlate', 'redAlloyWire', 'steelRod', 'steelGear', 'tinWire'], ['ironWireCutters']],
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
      ['build_lv_wiremill', ['lvMotor']],
      ['build_lv_bender', ['lvPiston']],
      ['build_lv_lathe', ['lvMotor']],
      ['build_lv_electrolyzer', ['lvPump']],
      ['build_lv_assembler', ['lvMotor', 'lvPiston', 'lvConveyor']],
      ['build_lv_canner', ['lvPump']],
      ['build_lv_centrifuge', ['lvMotor']],
      ['build_lv_auto_miner', ['lvMotor']],
    ] as const

    for (const [recipeId, requiredInputs] of expectations) {
      const recipe = recipes.find((candidate) => candidate.id === recipeId)
      const inputIds = new Set(recipe?.inputs.map((input) => input.id))
      for (const inputId of requiredInputs) expect(inputIds.has(inputId), `${recipeId} should use ${inputId}`).toBe(true)
      expect(recipe && recipeFitsTerminalGrid(recipe), recipeId).toBe(true)
      expect(findGridRecipe(makeGridForRecipe(recipe!), recipes)?.id, recipeId).toBe(recipeId)
    }

    expect(recipes.find((candidate) => candidate.id === 'build_lv_furnace')?.machineInputs).toEqual([{ id: 'furnace', amount: 1 }])
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

  it('separates fluid outputs and assembler machine outputs from zero-amount placeholders', () => {
    const liquidRubberRecipe = processRecipes.find((recipe) => recipe.id === 'lv_reactor_liquid_rubber')!
    const cureRubberRecipe = processRecipes.find((recipe) => recipe.id === 'furnace_rubber_pulp')!
    const inputBusRecipe = processRecipes.find((recipe) => recipe.id === 'lv_assemble_input_bus')!
    const liquidRubberCard = processRecipeToCatalogRecipe(liquidRubberRecipe, 'lv')
    const cureRubberCard = processRecipeToCatalogRecipe(cureRubberRecipe, 'lv')
    const inputBusCard = processRecipeToCatalogRecipe(inputBusRecipe, 'lv')

    expect(liquidRubberCard.outputs).toEqual([])
    expect(liquidRubberCard.fluidOutputs).toEqual([{ id: 'liquidRubber', amount: 8 }])
    expect(cureRubberCard.outputs).toEqual([{ id: 'rubber', amount: 1 }])
    expect(inputBusCard.outputs).toEqual([])
    expect(inputBusCard.machineOutputs).toEqual([{ id: 'lvInputBus', amount: 1 }])

    const groups = groupRecipesByOutput([liquidRubberCard, cureRubberCard, inputBusCard])
    expect(groups.map((group) => group.key)).toEqual([
      'fluid:liquidRubber',
      'resource:rubber',
      'machine:lvInputBus',
    ])
    expect(searchTerminalRecipes('rubber', [liquidRubberCard, cureRubberCard]).map((recipe) => recipe.id)).toEqual([
      'lv_reactor_liquid_rubber',
      'furnace_rubber_pulp',
    ])
  })

  it('indexes autonomous fluids and every byproduct under its own recipe result', () => {
    const collectAirCard = processRecipeToCatalogRecipe(processRecipes.find((recipe) => recipe.id === 'collect_air')!, 'lv')
    const separateAirCard = processRecipeToCatalogRecipe(processRecipes.find((recipe) => recipe.id === 'lv_centrifuge_air')!, 'lv')
    const separateGravelCard = processRecipeToCatalogRecipe(processRecipes.find((recipe) => recipe.id === 'lv_centrifuge_gravel_aluminium')!, 'lv')
    const groups = groupRecipesByOutput([collectAirCard, separateAirCard, separateGravelCard])

    expect(groups.map((group) => group.key)).toEqual([
      'fluid:air',
      'fluid:oxygen',
      'fluid:nitrogen',
      'resource:aluminiumDust',
      'resource:flint',
    ])
    expect(groups.find((group) => group.key === 'fluid:nitrogen')?.recipes.map((recipe) => recipe.id)).toEqual(['lv_centrifuge_air'])
    expect(groups.find((group) => group.key === 'resource:flint')?.recipes.map((recipe) => recipe.id)).toEqual(['lv_centrifuge_gravel_aluminium'])
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
      'build_waste_outlet',
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
      'craft_mechanical_pump',
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
    const diamondAxeGrid: CraftSlot[] = [
      { id: 'diamond' },
      { id: 'diamond' },
      null,
      { id: 'diamond' },
      { id: 'steelRod' },
      null,
      null,
      { id: 'steelRod' },
      null,
    ]
    const diamondShovelGrid: CraftSlot[] = [null, { id: 'diamond' }, null, null, { id: 'steelRod' }, null, null, { id: 'steelRod' }, null]
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
      null,
      { id: 'flint' },
      null,
      { id: 'stone' },
      { id: 'flint' },
      { id: 'stone' },
      null,
      { id: 'stone' },
      null,
    ]
    const ironMortarGrid: CraftSlot[] = [
      null,
      { id: 'flint' },
      null,
      { id: 'ironPlate' },
      { id: 'flint' },
      { id: 'ironPlate' },
      null,
      { id: 'ironPlate' },
      null,
    ]
    const bronzeMortarGrid: CraftSlot[] = [
      null,
      { id: 'flint' },
      null,
      { id: 'bronzePlate' },
      { id: 'flint' },
      { id: 'bronzePlate' },
      null,
      { id: 'bronzePlate' },
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
      null,
      { id: 'ironPlate' },
      { id: 'ironRod' },
      null,
      { id: 'ironRod' },
      { id: 'ironPlate' },
      { id: 'ironRod' },
      null,
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
    expect(findGridRecipe(diamondAxeGrid, recipes)?.id).toBe('craft_diamond_axe')
    expect(findGridRecipe(diamondShovelGrid, recipes)?.id).toBe('craft_diamond_shovel')
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

  it('returns an installed Survey Card when an LV Auto Miner is removed', () => {
    let state = createFactoryState()
    state.machines.lvAutoMiner = 1
    state.surveyCards.coalSeam = 1
    state = placeMachineInstance(state, 'lvAutoMiner', 0, 0)
    const miner = state.machineInstances[0]
    state = installSurveyCardInAutoMiner(state, miner.uid, 'coalSeam')
    state = assignAutoMiner(state, miner.uid, 'coalSeam')

    state = removeMachineInstance(state, miner.uid)

    expect(state.machineInstances).toHaveLength(0)
    expect(state.autoMinerAssignments[miner.uid]).toBeUndefined()
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

    expect(state.version).toBe(20)
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
    state.machines.standardChest = 1
    state = placeMachineInstance(state, 'steamAutoMiner', 0, 0)
    state = placeMachineInstance(state, 'hopper', 1, 0)
    state = placeMachineInstance(state, 'standardChest', 2, 0)
    const miner = state.machineInstances.find((instance) => instance.machineId === 'steamAutoMiner')!
    const hopper = state.machineInstances.find((instance) => instance.machineId === 'hopper')!
    miner.process.output = { id: 'cobblestone', amount: 2 }
    state = setPipeSideMode(state, hopper.uid, 'west', 'input')
    state = setHopperOutputDirection(state, hopper.uid, 'east')

    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === miner.uid)?.process.output?.amount).toBe(1)
    expect(state.machineInstances.find((instance) => instance.machineId === 'standardChest')?.process.storageSlots[0]).toEqual({ id: 'cobblestone', amount: 1 })
  })

  it('runs the Chemical Reactor fluid recipe and records engine truth', () => {
    let state = createFactoryState()
    state.machines.lvChemicalReactor = 1
    state = placeMachineInstance(state, 'lvChemicalReactor', 0, 0)
    const reactor = state.machineInstances[0]
    reactor.process.input = { id: 'rubberPulp', amount: 8 }
    reactor.process.secondaryInput = { id: 'sulfurDust', amount: 4 }
    reactor.process.euStored = 128

    expect(reactor.process.fluidCapacityLitres).toBe(32)

    state = tickGame(state, 8000).state

    expect(state.machineInstances[0].process.fluids.liquidRubber).toBe(8)
    expect(state.recipeMilestones.lv_reactor_liquid_rubber).toBe(1)
  })

  it('loads and runs the three-item Phase Crystal recipe in the LV Mixer', () => {
    let state = createFactoryState()
    state.machines.lvMixer = 1
    state.resources.chargedResonantQuartz = 1
    state.resources.voidQuartz = 1
    state.resources.redstoneDust = 1
    state = placeMachineInstance(state, 'lvMixer', 0, 0)
    const mixer = state.machineInstances[0]
    const recipe = processRecipes.find((candidate) => candidate.id === 'lv_reactor_phase_crystal')!

    expect(machines.lvMixer.itemOutputSlots).toBe(1)
    expect(processRecipeInputLoadStatus(state, mixer.uid, recipe.id)).toMatchObject({ canLoad: true })

    state = loadProcessRecipeInputs(state, mixer.uid, recipe.id)
    expect(state.machineInstances[0].process.input).toEqual({ id: 'chargedResonantQuartz', amount: 1 })
    expect(state.machineInstances[0].process.secondaryInput).toEqual({ id: 'voidQuartz', amount: 1 })
    expect(state.machineInstances[0].process.extraInput1).toEqual({ id: 'redstoneDust', amount: 1 })

    state.machineInstances[0].process.fluids.water = 1
    state.machineInstances[0].process.euStored = 128
    state = tickGame(state, 8000).state
    state.machineInstances[0].process.euStored = 64
    state = tickGame(state, 4000).state

    expect(state.machineInstances[0].process.output).toEqual({ id: 'phaseCrystal', amount: 2 })
    expect(state.recipeMilestones.lv_reactor_phase_crystal).toBe(1)
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
    const cable = state.machineInstances.find((instance) => instance.machineId === 'tinCable')!
    const reactor = state.machineInstances.find((instance) => instance.machineId === 'lvChemicalReactor')!
    turbine.process.euStored = 256
    state = setPipeSideMode(state, cable.uid, 'west', 'both')
    state = setPipeSideMode(state, cable.uid, 'east', 'both')

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

    state = fillPortableFluidContainer(state, state.machineInstances[0].uid, 'steelCell', { fluidId: 'liquidRubber', bufferId: 'reactionA' })
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

    expect(state.machineInstances[0].process.steamStoredMs).toBe(24000)
    expect(state.machineInstances[0].process.fluids.water).toBe(6)
    expect(state.machineInstances[0].process.fluids.creosote).toBeCloseTo(0.6)
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

    state = fillPortableFluidContainer(state, reactor.uid, 'steelCell', { fluidId: 'liquidRubber', bufferId: 'reactionA' })
    expect(state.fluidContainers[0].amountLitres).toBe(5)
    expect(state.resources.emptySteelCell).toBe(1)

    state.machineInstances[0].process.fluids.liquidRubber = 5
    state = fillPortableFluidContainer(state, reactor.uid, 'steelCell', { fluidId: 'liquidRubber', bufferId: 'reactionA' })
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

  it('separates Sticky Resin into Rubber Pulp and Glue', () => {
    let state = createFactoryState()
    state.machines.lvCentrifuge = 1
    state = placeMachineInstance(state, 'lvCentrifuge', 0, 0)
    const centrifuge = state.machineInstances[0]
    centrifuge.process.input = { id: 'rubberSap', amount: 1 }
    centrifuge.process.euStored = 128

    state = tickGame(state, 6000).state

    expect(state.machineInstances[0].process.output).toEqual({ id: 'rubberPulp', amount: 2 })
    expect(state.machineInstances[0].process.fluids.glue).toBe(2)
  })

  it('blocks a Centrifuge recipe when its second item output is full', () => {
    let state = createFactoryState()
    state.machines.lvCentrifuge = 1
    state = placeMachineInstance(state, 'lvCentrifuge', 0, 0)
    const centrifuge = state.machineInstances[0]
    centrifuge.process.input = { id: 'gravel', amount: 12 }
    centrifuge.process.output2 = { id: 'flint', amount: processStackLimit }
    centrifuge.process.euStored = 128

    state = tickGame(state, 14000).state

    expect(state.machineInstances[0].process.input).toEqual({ id: 'gravel', amount: 12 })
    expect(state.machineInstances[0].process.output).toBeNull()
  })

  it('separates Air into two generic gas outputs without an item input', () => {
    let state = createFactoryState()
    state.machines.lvCentrifuge = 1
    state = placeMachineInstance(state, 'lvCentrifuge', 0, 0)
    const centrifuge = state.machineInstances[0]
    centrifuge.process.fluids.air = 8
    centrifuge.process.euStored = 128

    for (let cycle = 0; cycle < 5; cycle += 1) {
      state.machineInstances[0].process.euStored = 128
      state = tickGame(state, 9000).state
    }

    expect(state.machineInstances[0].process.fluids.air ?? 0).toBe(0)
    expect(state.machineInstances[0].process.fluids.oxygen).toBe(2)
    expect(state.machineInstances[0].process.fluids.nitrogen).toBe(4)
  })

  it('keeps the Centrifuge item and fluid input channels independent', () => {
    let state = createFactoryState()
    state.machines.lvCentrifuge = 1
    state.resources.rubberSap = 1
    state = placeMachineInstance(state, 'lvCentrifuge', 0, 0)
    const centrifuge = state.machineInstances[0]
    centrifuge.process.fluids.air = 8

    state = insertProcessSlot(state, centrifuge.uid, 'input', 'rubberSap', 1)
    state.fluidContainers.push({ uid: 'test-air-cell', kind: 'steelCell', fluidId: 'air', amountLitres: 8 })
    state = drainPortableFluidContainer(state, centrifuge.uid, 'test-air-cell', 'feed')

    expect(state.machineInstances[0].process.input).toEqual({ id: 'rubberSap', amount: 1 })
    expect(state.machineInstances[0].process.fluids.air).toBe(16)
  })

  it('blocks Centrifuge recipes whose shared output channels contain another product', () => {
    let state = createFactoryState()
    state.machines.lvCentrifuge = 1
    state = placeMachineInstance(state, 'lvCentrifuge', 0, 0)
    const centrifuge = state.machineInstances[0]
    centrifuge.process.fluids.air = 8
    centrifuge.process.fluids.glue = 2
    centrifuge.process.euStored = 128

    state = tickGame(state, 8000).state

    expect(state.machineInstances[0].process.fluids.air).toBe(8)
    expect(state.machineInstances[0].process.fluids.oxygen ?? 0).toBe(0)
    expect(state.machineInstances[0].process.fluids.nitrogen ?? 0).toBe(0)
  })

  it('commits fluid inputs when an EU recipe starts and pauses without losing the craft', () => {
    let state = createFactoryState()
    state.machines.lvCentrifuge = 1
    state = placeMachineInstance(state, 'lvCentrifuge', 0, 0)
    state.machineInstances[0].process.fluids.air = 8
    state.machineInstances[0].process.euStored = 12

    state = tickGame(state, 1000).state

    expect(state.machineInstances[0].process.fluids.air ?? 0).toBe(0)
    expect(state.machineInstances[0].process.activeRecipeId).toBe('lv_centrifuge_air')
    expect(state.machineInstances[0].process.inputsCommitted).toBe(true)
    expect(state.machineInstances[0].process.progressMs).toBe(1000)

    state = tickGame(state, 5000).state

    expect(state.machineInstances[0].process.activeRecipeId).toBe('lv_centrifuge_air')
    expect(state.machineInstances[0].process.progressMs).toBe(1000)
    expect(state.machineInstances[0].process.fluids.oxygen ?? 0).toBe(0)
    expect(state.machineInstances[0].process.fluids.nitrogen ?? 0).toBe(0)

    for (let index = 0; index < 4; index += 1) {
      state.machineInstances[0].process.euStored = 120
      state = tickGame(state, 10000).state
    }
    state.machineInstances[0].process.euStored = 48
    state = tickGame(state, 4000).state

    expect(state.machineInstances[0].process.activeRecipeId).toBeNull()
    expect(state.machineInstances[0].process.fluids.oxygen).toBe(2)
    expect(state.machineInstances[0].process.fluids.nitrogen).toBe(4)
  })

  it('releases one 16L Air batch only after the full powered 80-second cycle', () => {
    let state = createFactoryState()
    state.machines.lvAirCollector = 1
    state = placeMachineInstance(state, 'lvAirCollector', 0, 0)
    state.machineInstances[0].process.euStored = 64

    state = tickGame(state, 40000).state

    expect(state.machineInstances[0].process.fluids.air ?? 0).toBe(0)
    expect(state.machineInstances[0].process.progressMs).toBe(40000)
    expect(state.machineInstances[0].process.euStored).toBe(0)

    state.machineInstances[0].process.euStored = 64
    state = tickGame(state, 40000).state

    expect(state.machineInstances[0].process.fluids.air).toBe(16)
    expect(state.machineInstances[0].process.progressMs).toBe(0)
  })

  it('automatically sends Air directly from an Air Collector output into a Centrifuge input face', () => {
    let state = createFactoryState()
    state.machines.lvAirCollector = 1
    state.machines.lvCentrifuge = 1
    state = placeMachineInstance(state, 'lvAirCollector', 0, 0)
    state = placeMachineInstance(state, 'lvCentrifuge', 1, 0)
    const collector = state.machineInstances.find((instance) => instance.machineId === 'lvAirCollector')!
    const centrifuge = state.machineInstances.find((instance) => instance.machineId === 'lvCentrifuge')!
    centrifuge.process.input = { id: 'rubberSap', amount: 1 }
    collector.process.euStored = 64
    state = setFluidOutputDirection(state, collector.uid, 'east')

    expect(pipeSideMode(state.machineInstances.find((instance) => instance.uid === centrifuge.uid)!, 'west')).toBe('input')

    state = tickGame(state, 40000).state

    expect(state.machineInstances.find((instance) => instance.uid === centrifuge.uid)!.process.fluids.air ?? 0).toBe(0)

    state.machineInstances.find((instance) => instance.uid === collector.uid)!.process.euStored = 64
    state = tickGame(state, 40000).state

    expect(state.machineInstances.find((instance) => instance.uid === collector.uid)!.process.fluids.air ?? 0).toBe(0)
    expect(state.machineInstances.find((instance) => instance.uid === centrifuge.uid)!.process.fluids.air).toBe(16)
  })

  it('automatically sends Air through a configured standard fluid pipe into a Centrifuge input face', () => {
    let state = createFactoryState()
    state.machines.lvAirCollector = 1
    state.machines.copperPipe = 1
    state.machines.lvCentrifuge = 1
    state = placeMachineInstance(state, 'lvCentrifuge', 0, 0)
    state = placeMachineInstance(state, 'copperPipe', 0, 1)
    state = placeMachineInstance(state, 'lvAirCollector', 0, 2)
    const collector = state.machineInstances.find((instance) => instance.machineId === 'lvAirCollector')!
    const pipe = state.machineInstances.find((instance) => instance.machineId === 'copperPipe')!
    const centrifuge = state.machineInstances.find((instance) => instance.machineId === 'lvCentrifuge')!
    centrifuge.process.input = { id: 'rubberSap', amount: 1 }
    collector.process.fluids.air = 8
    state = setFluidOutputDirection(state, collector.uid, 'north')
    state = setPipeSideMode(state, pipe.uid, 'south', 'input')
    state = setPipeSideMode(state, pipe.uid, 'north', 'output')

    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === collector.uid)!.process.fluids.air).toBe(0)
    expect(state.machineInstances.find((instance) => instance.uid === centrifuge.uid)!.process.fluids.air).toBe(8)
    expect(state.machineInstances.find((instance) => instance.uid === pipe.uid)!.process.fluidFlowLitresPerSecond).toBe(8)
  })

  it('does not export Centrifuge Air input through a standard fluid pipe', () => {
    let state = createFactoryState()
    state.machines.lvCentrifuge = 1
    state.machines.copperPipe = 1
    state.machines.steamTank = 1
    state = placeMachineInstance(state, 'lvCentrifuge', 0, 0)
    state = placeMachineInstance(state, 'copperPipe', 1, 0)
    state = placeMachineInstance(state, 'steamTank', 2, 0)
    const centrifuge = state.machineInstances.find((instance) => instance.machineId === 'lvCentrifuge')!
    const pipe = state.machineInstances.find((instance) => instance.machineId === 'copperPipe')!
    const tank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    state = setFluidOutputDirection(state, centrifuge.uid, 'east')
    state = setPipeSideMode(state, pipe.uid, 'west', 'input')
    state = setPipeSideMode(state, pipe.uid, 'east', 'output')
    state.machineInstances.find((instance) => instance.uid === centrifuge.uid)!.process.fluids.air = 8

    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === centrifuge.uid)!.process.fluids.air).toBe(8)
    expect(state.machineInstances.find((instance) => instance.uid === tank.uid)!.process.fluids.air ?? 0).toBe(0)
    expect(currentFluidOutputFlows(state, state.machineInstances.find((instance) => instance.uid === centrifuge.uid)!)).toEqual([])
    expect(state.machineInstances.find((instance) => instance.uid === pipe.uid)!.process.fluidFlowFluidId).toBeUndefined()

    state.machineInstances.find((instance) => instance.uid === centrifuge.uid)!.process.fluids.air = 0
    state.machineInstances.find((instance) => instance.uid === centrifuge.uid)!.process.fluids.oxygen = 2
    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === centrifuge.uid)!.process.fluids.oxygen ?? 0).toBe(0)
    expect(state.machineInstances.find((instance) => instance.uid === tank.uid)!.process.fluids.oxygen).toBe(2)
  })

  it('requires both acid and water before producing diluted sulfuric acid', () => {
    let state = createFactoryState()
    state.machines.lvChemicalReactor = 1
    state = placeMachineInstance(state, 'lvChemicalReactor', 0, 0)
    const reactor = state.machineInstances[0]
    reactor.process.fluids.sulfuricAcid = 4
    reactor.process.euStored = 192

    state = tickGame(state, 6000).state
    expect(state.machineInstances[0].process.fluids.sulfuricAcid).toBe(4)
    expect(state.machineInstances[0].process.fluids.dilutedSulfuricAcid ?? 0).toBe(0)

    state.machineInstances[0].process.fluids.water = 4
    state = tickGame(state, 6000).state

    expect(state.machineInstances[0].process.fluids.sulfuricAcid).toBe(0)
    expect(state.machineInstances[0].process.fluids.water).toBe(0)
    expect(state.machineInstances[0].process.fluids.dilutedSulfuricAcid).toBe(8)
  })

  it('consumes Glue for the reviewed resistor batch', () => {
    let state = createFactoryState()
    state.machines.lvAssembler = 1
    state = placeMachineInstance(state, 'lvAssembler', 0, 0)
    const assembler = state.machineInstances[0]
    assembler.process.input = { id: 'carbonDust', amount: 1 }
    assembler.process.secondaryInput = { id: 'copperWire', amount: 2 }
    assembler.process.extraInput1 = { id: 'fineCopperWire', amount: 2 }
    assembler.process.fluids.glue = 2
    assembler.process.euStored = 48

    state = tickGame(state, 4500).state

    expect(state.machineInstances[0].process.output).toEqual({ id: 'resistor', amount: 4 })
    expect(state.machineInstances[0].process.fluids.glue).toBe(0)
  })

  it('persists an explicit Arc Furnace program and returns to Auto', () => {
    let state = createFactoryState()
    state.machines.arcBlastFurnace = 1
    state = placeMachineInstance(state, 'arcBlastFurnace', 0, 0)
    const controller = state.machineInstances[0]

    state = setConfiguredProcessProgram(state, controller.uid, 1)
    expect(state.machineInstances[0].process.configuredProgramNumber).toBe(1)

    state = setConfiguredProcessProgram(state, controller.uid, 0)
    expect(state.machineInstances[0].process.configuredProgramNumber).toBe(0)
  })

  it('stores reserved programs 0-10 on LV processing machines', () => {
    let state = createFactoryState()
    state.machines.lvMacerator = 1
    state = placeMachineInstance(state, 'lvMacerator', 0, 0)
    const macerator = state.machineInstances[0]

    state = setConfiguredProcessProgram(state, macerator.uid, 10)
    expect(state.machineInstances[0].process.configuredProgramNumber).toBe(10)

    const unchanged = setConfiguredProcessProgram(state, macerator.uid, 11)
    expect(unchanged).toBe(state)

    state.machineInstances[0].process.input = { id: 'copperOre', amount: 1 }
    state.machineInstances[0].process.euStored = 64
    state = tickGame(state, 10000).state
    expect(state.machineInstances[0].process.input).toEqual({ id: 'copperOre', amount: 1 })
    expect(state.machineInstances[0].process.output).toBeNull()
  })

  it('does not apply recipe programs to LV battery buffers', () => {
    let state = createFactoryState()
    state.machines.lvBatteryBuffer = 1
    state = placeMachineInstance(state, 'lvBatteryBuffer', 0, 0)
    const buffer = state.machineInstances[0]

    const unchanged = setConfiguredProcessProgram(state, buffer.uid, 1)

    expect(unchanged).toBe(state)
    expect(unchanged.machineInstances[0].process.configuredProgramNumber).toBe(0)
  })

  it('rejects programs on autonomous LV utilities and keeps legacy saves running', () => {
    let state = createFactoryState()
    state.machines.lvAirCollector = 1
    state.machines.lvAutoMiner = 1
    state = placeMachineInstance(state, 'lvAirCollector', 0, 0)
    state = placeMachineInstance(state, 'lvAutoMiner', 1, 0)
    const collector = state.machineInstances.find((instance) => instance.machineId === 'lvAirCollector')!
    const miner = state.machineInstances.find((instance) => instance.machineId === 'lvAutoMiner')!
    expect(setConfiguredProcessProgram(state, collector.uid, 1)).toBe(state)
    expect(setConfiguredProcessProgram(state, miner.uid, 1)).toBe(state)
    collector.process.configuredProgramNumber = 1
    miner.process.configuredProgramNumber = 1
    state = assignAutoMiner(state, miner.uid, 'stone')
    state.machineInstances.find((instance) => instance.uid === collector.uid)!.process.euStored = 64
    state.machineInstances.find((instance) => instance.uid === miner.uid)!.process.euStored = 64

    state = tickGame(state, lvAutoMinerActionMs * 8).state

    expect(state.machineInstances.find((instance) => instance.uid === collector.uid)!.process.progressMs).toBeGreaterThan(0)
    expect(state.machineInstances.find((instance) => instance.uid === miner.uid)!.process.output).not.toBeNull()
  })

  it('uses one functional stack for each LV item bus', () => {
    let state = createFactoryState()
    state.machines.lvInputBus = 1
    state.machines.lvOutputBus = 1
    state.resources.ironIngot = 3
    state = placeMachineInstance(state, 'lvInputBus', 0, 0)
    state = placeMachineInstance(state, 'lvOutputBus', 1, 0)
    const inputBus = state.machineInstances.find((instance) => instance.machineId === 'lvInputBus')!
    const outputBus = state.machineInstances.find((instance) => instance.machineId === 'lvOutputBus')!

    state = insertProcessSlot(state, inputBus.uid, 'input', 'ironIngot', 2)
    expect(state.machineInstances.find((instance) => instance.uid === inputBus.uid)!.process.input).toEqual({ id: 'ironIngot', amount: 2 })
    expect(insertProcessSlot(state, outputBus.uid, 'input', 'ironIngot', 1)).toBe(state)

    state.machineInstances.find((instance) => instance.uid === outputBus.uid)!.process.output = { id: 'steelIngot', amount: 1 }
    state = collectProcessOutput(state, outputBus.uid, 0)

    expect(state.machineInstances.find((instance) => instance.uid === outputBus.uid)!.process.output).toBeNull()
    expect(state.resources.steelIngot).toBe(1)
  })

  it('allows portable containers to withdraw fluid from an input hatch', () => {
    let state = createFactoryState()
    state.machines.lvFluidInputHatch = 1
    state.machines.lvFluidOutputHatch = 1
    state.resources.bucket = 1
    state = placeMachineInstance(state, 'lvFluidInputHatch', 0, 0)
    state = placeMachineInstance(state, 'lvFluidOutputHatch', 1, 0)
    const inputHatch = state.machineInstances.find((instance) => instance.machineId === 'lvFluidInputHatch')!
    const outputHatch = state.machineInstances.find((instance) => instance.machineId === 'lvFluidOutputHatch')!
    inputHatch.process.fluids.water = 32

    state = fillPortableFluidContainer(state, inputHatch.uid, 'bucket', { fluidId: 'water', bufferId: 'input' })

    expect(state.machineInstances.find((instance) => instance.uid === inputHatch.uid)!.process.fluids.water).toBe(31)
    expect(state.fluidContainers).toContainEqual(expect.objectContaining({ kind: 'bucket', fluidId: 'water', amountLitres: 1 }))

    state = drainPortableFluidContainer(state, outputHatch.uid, state.fluidContainers[0].uid, 'output')

    expect(state.machineInstances.find((instance) => instance.uid === outputHatch.uid)!.process.fluids.water).toBe(1)
    expect(state.fluidContainers).toHaveLength(0)
  })

  it.each([
    ['lvAssembler', 'input', 'glue'],
    ['lvMixer', 'feed-a', 'water'],
    ['lvCentrifuge', 'feed', 'air'],
    ['lvChemicalReactor', 'feedA', 'water'],
  ] as const)('withdraws fluid from the %s input buffer into an empty Steel Cell', (machineId, bufferId, fluidId) => {
    let state = createFactoryState()
    state.machines[machineId] = 1
    state.resources.emptySteelCell = 1
    state = placeMachineInstance(state, machineId, 0, 0)
    state.machineInstances[0].process.fluids[fluidId] = 4

    state = fillPortableFluidContainer(state, state.machineInstances[0].uid, 'steelCell', { fluidId, bufferId })

    expect(state.machineInstances[0].process.fluids[fluidId]).toBe(0)
    expect(state.resources.emptySteelCell).toBe(0)
    expect(state.fluidContainers).toContainEqual(expect.objectContaining({ kind: 'steelCell', fluidId, amountLitres: 4 }))
  })

  it('tops up a partial Steel Cell from a machine input before draining it back into the machine', () => {
    let state = createFactoryState()
    state.machines.lvAssembler = 1
    state = placeMachineInstance(state, 'lvAssembler', 0, 0)
    const assembler = state.machineInstances[0]
    assembler.process.fluids.glue = 4
    state.fluidContainers.push({ uid: 'partial-glue-cell', kind: 'steelCell', fluidId: 'glue', amountLitres: 6 })

    state = fillPortableFluidContainer(state, assembler.uid, 'steelCell', {
      containerUid: 'partial-glue-cell',
      fluidId: 'glue',
      bufferId: 'input',
    })

    expect(state.machineInstances[0].process.fluids.glue).toBe(2)
    expect(state.fluidContainers[0]).toMatchObject({ fluidId: 'glue', amountLitres: 8 })
  })

  it('uses Assembler programs to distinguish matching bus and hatch inputs', () => {
    const programs = processRecipes
      .filter((recipe) =>
        recipe.machineId === 'lvAssembler' &&
        recipe.programNumber !== undefined &&
        ['lv_assemble_input_bus', 'lv_assemble_output_bus', 'lv_assemble_fluid_input_hatch', 'lv_assemble_fluid_output_hatch'].includes(recipe.id),
      )
      .map((recipe) => [recipe.programNumber, recipe.id])
    expect(programs).toEqual([
      [1, 'lv_assemble_input_bus'],
      [2, 'lv_assemble_output_bus'],
      [3, 'lv_assemble_fluid_input_hatch'],
      [4, 'lv_assemble_fluid_output_hatch'],
    ])

    let state = createFactoryState()
    state.machines.lvAssembler = 1
    state = placeMachineInstance(state, 'lvAssembler', 0, 0)
    let assembler = state.machineInstances[0]
    assembler.process.input = { id: 'lvMachineHull', amount: 1 }
    assembler.process.secondaryInput = { id: 'lvConveyor', amount: 1 }
    assembler.process.fluids.glue = 2
    assembler.process.euStored = 128

    state = tickGame(state, 8000).state
    expect(state.machines.lvInputBus).toBe(0)
    expect(state.machines.lvOutputBus).toBe(0)

    assembler = state.machineInstances[0]
    state = loadProcessRecipeInputs(state, assembler.uid, 'lv_assemble_output_bus')
    const outputBusRecipe = processRecipes.find((recipe) => recipe.id === 'lv_assemble_output_bus')!
    state = tickGame(state, outputBusRecipe.durationMs / 2).state

    expect(state.machineInstances[0].process.activeRecipeId).toBe('lv_assemble_output_bus')
    expect(state.machineInstances[0].process.machineOutput).toBeNull()
    expect(state.machines.lvOutputBus).toBe(0)

    state = tickGame(state, outputBusRecipe.durationMs).state

    expect(state.machineInstances[0].process.configuredProgramNumber).toBe(2)
    expect(state.machines.lvInputBus).toBe(0)
    expect(state.machines.lvOutputBus).toBe(0)
    expect(state.machineInstances[0].process.machineOutput).toEqual({ id: 'lvOutputBus', amount: 1 })

    state = collectProcessMachineOutput(state, assembler.uid)

    expect(state.machines.lvOutputBus).toBe(1)
    expect(state.machineInstances[0].process.machineOutput).toBeNull()
  })

  it('keeps Circuit Imprinter dies after stamping components', () => {
    let state = createFactoryState()
    state.machines.circuitImprinter = 1
    state = placeMachineInstance(state, 'circuitImprinter', 0, 0)
    const imprinter = state.machineInstances[0]
    imprinter.process.input = { id: 'goldPlate', amount: 1 }
    imprinter.process.secondaryInput = { id: 'signalImprintDie', amount: 1 }
    imprinter.process.euStored = 128

    state = tickGame(state, 4000).state

    expect(state.machineInstances[0].process.output).toEqual({ id: 'printedSignalCircuit', amount: 1 })
    expect(state.machineInstances[0].process.secondaryInput).toEqual({ id: 'signalImprintDie', amount: 1 })
  })

  it('retains an extrusion mold while consuming ingots', () => {
    let state = createFactoryState()
    state.machines.mvExtruder = 1
    state = placeMachineInstance(state, 'mvExtruder', 0, 0)
    const extruder = state.machineInstances[0]
    extruder.process.input = { id: 'ironIngot', amount: 4 }
    extruder.process.secondaryInput = { id: 'extrusionMoldGear', amount: 1 }
    extruder.process.euStored = 1024

    state = tickGame(state, 12_000).state

    expect(state.machineInstances[0].process.input).toBeNull()
    expect(state.machineInstances[0].process.secondaryInput).toEqual({ id: 'extrusionMoldGear', amount: 1 })
    expect(state.machineInstances[0].process.output).toEqual({ id: 'ironGear', amount: 1 })
  })

  it('forms each supported planning rack footprint around at least one memory module', () => {
    for (const [width, height] of [[1, 1], [2, 2], [3, 2], [3, 3]] as const) {
      let state = createFactoryState()
      state.machines.planningController = 1
      state.machines.memoryModule = 8
      state.machines.dispatchModule = 1
      state = placeMachineInstance(state, 'planningController', 3, 3)
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (x === 0 && y === 0) continue
          const machineId = x === 1 && y === 0 ? 'dispatchModule' : 'memoryModule'
          state = placeMachineInstance(state, machineId, 3 + x, 3 + y)
        }
      }

      const controller = state.machineInstances.find((instance) => instance.machineId === 'planningController')!
      const structure = planningRackStructureForInstance(state, controller)

      expect(structure, `${width}x${height} rack`).not.toBeNull()
      expect(structure?.width).toBe(width)
      expect(structure?.height).toBe(height)
      expect(structure?.memoryUnits).toBe(Math.max(1, width * height - 1) * 64)
      expect(structure?.dispatchLanes).toBe(width * height > 1 ? 2 : 1)
    }
  })

  it('does not form unsupported or incomplete planning rack footprints', () => {
    let unsupported = createFactoryState()
    unsupported.machines.planningController = 1
    unsupported.machines.memoryModule = 3
    unsupported = placeMachineInstance(unsupported, 'planningController', 3, 3)
    unsupported = placeMachineInstance(unsupported, 'memoryModule', 4, 3)
    unsupported = placeMachineInstance(unsupported, 'memoryModule', 5, 3)
    unsupported = placeMachineInstance(unsupported, 'memoryModule', 6, 3)
    const unsupportedController = unsupported.machineInstances.find((instance) => instance.machineId === 'planningController')!

    let incomplete = createFactoryState()
    incomplete.machines.planningController = 1
    incomplete.machines.memoryModule = 1
    incomplete.machines.dispatchModule = 1
    incomplete = placeMachineInstance(incomplete, 'planningController', 3, 3)
    incomplete = placeMachineInstance(incomplete, 'memoryModule', 4, 3)
    incomplete = placeMachineInstance(incomplete, 'dispatchModule', 3, 4)
    const incompleteController = incomplete.machineInstances.find((instance) => instance.machineId === 'planningController')!

    expect(planningRackStructureForInstance(unsupported, unsupportedController)).toBeNull()
    expect(planningRackStructureForInstance(incomplete, incompleteController)).toBeNull()
  })

  it('disassembles a complete Planning Rack and cancels its active jobs', () => {
    let state = createFactoryState()
    state.machines.planningController = 1
    state.machines.memoryModule = 2
    state.machines.dispatchModule = 1
    state = placeMachineInstance(state, 'planningController', 3, 3)
    state = placeMachineInstance(state, 'memoryModule', 4, 3)
    state = placeMachineInstance(state, 'memoryModule', 3, 4)
    state = placeMachineInstance(state, 'dispatchModule', 4, 4)
    const controller = state.machineInstances.find((instance) => instance.machineId === 'planningController')!
    const module = state.machineInstances.find((instance) => instance.machineId === 'dispatchModule')!
    const initialSticks = state.resources.stick
    state.fabricationJobs.push({
      uid: 'job-rack-removal',
      cardUid: 'card-rack-removal',
      requestedOutput: { id: 'plank', amount: 4 },
      batches: 1,
      completedBatches: 0,
      status: 'running',
      controllerUid: controller.uid,
      reservedItems: [{ id: 'stick', amount: 2 }],
      reservedFluids: [{ id: 'oxygen', amount: 3 }],
      steps: [],
      progressMs: 0,
      createdAt: 1,
    })

    state = removeMachineInstance(state, module.uid)

    expect(state.machineInstances.some((instance) => (
      instance.machineId === 'planningController' ||
      instance.machineId === 'memoryModule' ||
      instance.machineId === 'dispatchModule'
    ))).toBe(false)
    expect(state.fabricationJobs[0].status).toBe('cancelled')
    expect(state.fabricationJobs[0].reservedItems).toEqual([])
    expect(state.fabricationJobs[0].reservedFluids).toEqual([])
    expect(state.resources.stick).toBe(initialSticks + 2)
  })

  it('dispatches a processing pattern through a cable-mounted Job Interface Face', () => {
    let state = createFactoryState()
    state.machines.planningController = 1
    state.machines.recipeEncoder = 1
    state.machines.jobInterface = 1
    state.machines.fabricationCable = 3
    state.machines.lvFurnace = 1
    state = placeMachineInstance(state, 'planningController', 0, 0)
    state = placeMachineInstance(state, 'fabricationCable', 1, 0)
    state = placeMachineInstance(state, 'fabricationCable', 2, 0)
    state = placeMachineInstance(state, 'fabricationCable', 3, 0)
    state = placeMachineInstance(state, 'recipeEncoder', 2, 1)
    state = placeMachineInstance(state, 'lvFurnace', 4, 0)
    const interfaceCable = state.machineInstances.find((instance) => instance.x === 3 && instance.y === 0)!
    state = attachFabricationInterface(state, interfaceCable.uid, 'east')
    state.resources.blankRecipeCard = 1
    state.resources.ironOre = 1

    const encoder = state.machineInstances.find((instance) => instance.machineId === 'recipeEncoder')!
    state.machineInstances.find((instance) => instance.machineId === 'planningController')!.process.euStored = 128
    state = encodeProcessingRecipeCard(state, encoder.uid, 'smelt_iron_ingot')
    const recipeInterface = state.machineInstances.find((instance) => instance.uid === interfaceCable.uid)!.fabricationInterfaces!.east!
    state = installRecipeCard(state, recipeInterface.uid, state.recipeCards[0].uid)
    state = requestFabricationJob(state, state.recipeCards[0].uid, 1)
    state.machineInstances.find((instance) => instance.machineId === 'planningController')!.process.euStored = 128
    state.machineInstances.find((instance) => instance.machineId === 'lvFurnace')!.process.euStored = 128

    state = tickGame(state, 100).state
    expect(state.fabricationJobs[0].steps[0].targetUid).toBe(state.machineInstances.find((instance) => instance.machineId === 'lvFurnace')!.uid)
    expect(state.fabricationJobs[0].status).toBe('running')

    state = tickGame(state, 5000).state
    state = tickGame(state, 100).state
    expect(state.fabricationJobs[0].status).toBe('complete')
    expect(state.resources.ironIngot).toBe(1)
  })

  it('dispatches and collects a complete Arc Furnace fabrication job through its input bus', () => {
    let state = createFactoryState()
    state.machines.planningController = 1
    state.machines.recipeEncoder = 1
    state.machines.jobInterface = 1
    state.machines.fabricationCable = 3
    state.machines.arcBlastFurnace = 1
    state.machines.lvEnergyHatch2A = 2
    state.machines.lvInputBus = 1
    state.machines.lvOutputBus = 1
    state.machines.lvFluidInputHatch = 1
    state.machines.lvFluidOutputHatch = 1
    state.machines.arcBlastFurnacePart = 2
    state = placeMachineInstance(state, 'planningController', 0, 3)
    state = placeMachineInstance(state, 'fabricationCable', 1, 3)
    state = placeMachineInstance(state, 'fabricationCable', 2, 3)
    state = placeMachineInstance(state, 'fabricationCable', 3, 3)
    state = placeMachineInstance(state, 'recipeEncoder', 2, 4)
    state = placeMachineInstance(state, 'arcBlastFurnace', 5, 3)
    state = placeMachineInstance(state, 'lvEnergyHatch2A', 4, 2)
    state = placeMachineInstance(state, 'lvEnergyHatch2A', 5, 2)
    state = placeMachineInstance(state, 'arcBlastFurnacePart', 6, 2)
    state = placeMachineInstance(state, 'lvInputBus', 4, 3)
    state = placeMachineInstance(state, 'lvOutputBus', 6, 3)
    state = placeMachineInstance(state, 'lvFluidInputHatch', 4, 4)
    state = placeMachineInstance(state, 'lvFluidOutputHatch', 5, 4)
    state = placeMachineInstance(state, 'arcBlastFurnacePart', 6, 4)
    const interfaceCable = state.machineInstances.find((instance) => instance.x === 3 && instance.y === 3)!
    state = attachFabricationInterface(state, interfaceCable.uid, 'east')
    state.resources.blankRecipeCard = 2
    state.resources.aluminiumDust = 1
    const encoder = state.machineInstances.find((instance) => instance.machineId === 'recipeEncoder')!
    const planningController = state.machineInstances.find((instance) => instance.machineId === 'planningController')!
    planningController.process.euStored = 2048

    state = encodeProcessingRecipeCard(state, encoder.uid, 'lv_assemble_item_conductors')
    expect(state.recipeCards).toHaveLength(0)
    expect(state.resources.blankRecipeCard).toBe(2)
    state = encodeProcessingRecipeCard(state, encoder.uid, 'arc_blast_aluminium')
    const card = state.recipeCards[0]
    const recipeInterface = state.machineInstances.find((instance) => instance.uid === interfaceCable.uid)!.fabricationInterfaces!.east!
    state = installRecipeCard(state, recipeInterface.uid, card.uid)
    expect(previewFabricationRequest(state, card.uid, 1).canStart).toBe(true)
    state = requestFabricationJob(state, card.uid, 1)
    for (const hatch of state.machineInstances.filter((instance) => instance.machineId === 'lvEnergyHatch2A')) {
      hatch.process.euStored = 2048
      hatch.process.euCapacity = 4096
    }

    state = tickGame(state, 100).state
    const controller = state.machineInstances.find((instance) => instance.machineId === 'arcBlastFurnace')!
    const inputBus = state.machineInstances.find((instance) => instance.machineId === 'lvInputBus')!
    expect(state.fabricationJobs[0].steps[0].targetUid).toBe(controller.uid)
    expect(state.machineInstances.find((instance) => instance.uid === inputBus.uid)?.process.input).toEqual({ id: 'aluminiumDust', amount: 1 })
    expect(removeMachineInstance(state, inputBus.uid).machineInstances).toHaveLength(state.machineInstances.length)

    for (let second = 0; second < 19; second += 1) {
      state.machineInstances.find((instance) => instance.machineId === 'planningController')!.process.euStored = 128
      for (const hatch of state.machineInstances.filter((instance) => instance.machineId === 'lvEnergyHatch2A')) {
        hatch.process.euStored = 128
      }
      state = tickGame(state, 1000).state
    }
    state = tickGame(state, 100).state
    expect(state.fabricationJobs[0].status, state.fabricationJobs[0].blockedReason).toBe('complete')
    expect(state.resources.aluminiumIngot).toBe(1)
  })

  it('keeps reserved fabrication fluids visible until a disconnected job can return them', () => {
    let state = createFactoryState()
    const initialSticks = state.resources.stick
    state.fabricationJobs.push({
      uid: 'job-disconnected-fluid',
      cardUid: 'card-missing',
      requestedOutput: { id: 'steelIngot', amount: 1 },
      batches: 1,
      completedBatches: 0,
      status: 'running',
      controllerUid: 'controller-missing',
      reservedItems: [{ id: 'stick', amount: 2 }],
      reservedFluids: [{ id: 'oxygen', amount: 3 }],
      steps: [],
      progressMs: 0,
      createdAt: 1,
    })

    state = cancelFabricationJob(state, 'job-disconnected-fluid')
    expect(state.fabricationJobs[0].status).toBe('blocked')
    expect(state.fabricationJobs[0].blockedReason).toContain('Reconnect')
    expect(state.fabricationJobs[0].reservedFluids).toEqual([{ id: 'oxygen', amount: 3 }])
    expect(state.resources.stick).toBe(initialSticks + 2)

    state = cancelFabricationJob(state, 'job-disconnected-fluid')
    expect(state.resources.stick).toBe(initialSticks + 2)
    expect(state.fabricationJobs[0].reservedFluids).toEqual([{ id: 'oxygen', amount: 3 }])
  })

  it('places a standalone Job Interface on the cable network and dispatches through an automatic machine face', () => {
    let state = createFactoryState()
    state.machines.planningController = 1
    state.machines.recipeEncoder = 1
    state.machines.jobInterface = 1
    state.machines.fabricationCable = 2
    state.machines.lvFurnace = 1
    state = placeMachineInstance(state, 'planningController', 0, 0)
    state = placeMachineInstance(state, 'fabricationCable', 1, 0)
    state = placeMachineInstance(state, 'fabricationCable', 2, 0)
    state = placeMachineInstance(state, 'recipeEncoder', 1, 1)
    state = placeMachineInstance(state, 'jobInterface', 2, 1)
    state = placeMachineInstance(state, 'lvFurnace', 3, 1)
    state.resources.blankRecipeCard = 1
    state.resources.ironOre = 1

    const encoder = state.machineInstances.find((instance) => instance.machineId === 'recipeEncoder')!
    const recipeInterface = state.machineInstances.find((instance) => instance.machineId === 'jobInterface')!
    state.machineInstances.find((instance) => instance.machineId === 'planningController')!.process.euStored = 128
    state = encodeProcessingRecipeCard(state, encoder.uid, 'smelt_iron_ingot')
    state = installRecipeCard(state, recipeInterface.uid, state.recipeCards[0].uid)

    expect(previewFabricationRequest(state, state.recipeCards[0].uid, 1).canStart).toBe(true)
    state = setFabricationInterfaceFace(state, recipeInterface.uid, 'west')
    expect(previewFabricationRequest(state, state.recipeCards[0].uid, 1).canStart).toBe(false)
    state = setFabricationInterfaceFace(state, recipeInterface.uid, 'east')
    state = requestFabricationJob(state, state.recipeCards[0].uid, 1)
    state.machineInstances.find((instance) => instance.machineId === 'planningController')!.process.euStored = 128
    state.machineInstances.find((instance) => instance.machineId === 'lvFurnace')!.process.euStored = 128

    state = tickGame(state, 100).state
    expect(state.fabricationJobs[0].steps[0].targetUid).toBe(state.machineInstances.find((instance) => instance.machineId === 'lvFurnace')!.uid)
    state = tickGame(state, 5000).state
    state = tickGame(state, 100).state
    expect(state.fabricationJobs[0].status).toBe('complete')
    expect(state.resources.ironIngot).toBe(1)
  })

  it('consumes the same Job Interface inventory for standalone blocks and cable faces', () => {
    let state = createFactoryState()
    state.machines.jobInterface = 2
    state.machines.fabricationCable = 1
    state.machines.lvFurnace = 1
    state = placeMachineInstance(state, 'fabricationCable', 2, 2)
    state = placeMachineInstance(state, 'lvFurnace', 3, 2)
    const cable = state.machineInstances.find((instance) => instance.machineId === 'fabricationCable')!

    state = attachFabricationInterface(state, cable.uid, 'east')
    expect(availableUnplacedMachineCount(state, 'jobInterface')).toBe(1)
    state = placeMachineInstance(state, 'jobInterface', 0, 0)
    expect(availableUnplacedMachineCount(state, 'jobInterface')).toBe(0)
    expect(state.machineInstances.some((instance) => instance.machineId === 'jobInterface')).toBe(true)

    const interfaceUid = state.machineInstances.find((instance) => instance.uid === cable.uid)!.fabricationInterfaces!.east!.uid
    state = removeFabricationInterface(state, interfaceUid)
    expect(availableUnplacedMachineCount(state, 'jobInterface')).toBe(1)
    state = removeMachineInstance(state, state.machineInstances.find((instance) => instance.machineId === 'jobInterface')!.uid)
    expect(availableUnplacedMachineCount(state, 'jobInterface')).toBe(2)
  })

  it('imports and exports items through terminal bus faces', () => {
    let state = createFactoryState()
    state.machines.planningController = 1
    state.machines.fabricationCable = 1
    state.machines.standardChest = 1
    state.machines.terminalImportBus = 1
    state.machines.terminalExportBus = 1
    state = placeMachineInstance(state, 'planningController', 0, 0)
    state = placeMachineInstance(state, 'fabricationCable', 1, 0)
    state = placeMachineInstance(state, 'standardChest', 2, 0)
    const controller = state.machineInstances.find((instance) => instance.machineId === 'planningController')!
    const cable = state.machineInstances.find((instance) => instance.machineId === 'fabricationCable')!
    const chest = state.machineInstances.find((instance) => instance.machineId === 'standardChest')!
    controller.process.euStored = 128
    chest.process.storageSlots[0] = { id: 'ironOre', amount: 2 }

    state = attachFabricationFace(state, cable.uid, 'east', 'terminalImportBus')
    expect(availableUnplacedMachineCount(state, 'terminalImportBus')).toBe(0)
    state = tickGame(state, 500).state
    expect(state.resources.ironOre).toBe(1)
    expect(state.machineInstances.find((instance) => instance.uid === chest.uid)!.process.storageSlots[0]).toEqual({ id: 'ironOre', amount: 1 })

    const importFace = state.machineInstances.find((instance) => instance.uid === cable.uid)!.fabricationInterfaces!.east!
    state = removeFabricationFaceAttachment(state, importFace.uid)
    state.resources.ironOre = 2
    state = attachFabricationFace(state, cable.uid, 'east', 'terminalExportBus')
    const exportFace = state.machineInstances.find((instance) => instance.uid === cable.uid)!.fabricationInterfaces!.east!
    state = toggleFabricationBusItemFilter(state, exportFace.uid, 'ironOre')
    state.machineInstances.find((instance) => instance.machineId === 'planningController')!.process.euStored = 128
    state = tickGame(state, 500).state
    expect(state.resources.ironOre).toBe(1)
    expect(state.machineInstances.find((instance) => instance.uid === chest.uid)!.process.storageSlots[0]).toEqual({ id: 'ironOre', amount: 2 })
    expect(availableUnplacedMachineCount(state, 'terminalExportBus')).toBe(0)
  })

  it('moves fluids between adjacent targets and linked fabrication tank storage through bus faces', () => {
    let state = createFactoryState()
    state.machines.planningController = 1
    state.machines.fabricationCable = 2
    state.machines.fluidStorageLink = 1
    state.machines.steamTank = 2
    state.machines.terminalImportBus = 1
    state.machines.terminalExportBus = 1
    state = placeMachineInstance(state, 'planningController', 0, 0)
    state = placeMachineInstance(state, 'fabricationCable', 1, 0)
    state = placeMachineInstance(state, 'fabricationCable', 1, 1)
    state = placeMachineInstance(state, 'fluidStorageLink', 0, 1)
    state = placeMachineInstance(state, 'steamTank', 0, 2)
    state = placeMachineInstance(state, 'steamTank', 2, 0)

    const controller = state.machineInstances.find((instance) => instance.machineId === 'planningController')!
    const cable = state.machineInstances.find((instance) => instance.x === 1 && instance.y === 0)!
    const linkedTank = state.machineInstances.find((instance) => instance.x === 0 && instance.y === 2)!
    const targetTank = state.machineInstances.find((instance) => instance.x === 2 && instance.y === 0)!
    controller.process.euStored = 128
    linkedTank.process.fluidCapacityLitres = ironTankFluidCapacityLitres
    targetTank.process.fluidCapacityLitres = ironTankFluidCapacityLitres
    targetTank.process.fluids.water = 16

    state = attachFabricationFace(state, cable.uid, 'east', 'terminalImportBus')
    state = tickGame(state, 1000).state
    expect(state.machineInstances.find((instance) => instance.uid === targetTank.uid)!.process.fluids.water ?? 0).toBe(0)
    expect(state.machineInstances.find((instance) => instance.uid === linkedTank.uid)!.process.fluids.water ?? 0).toBe(16)

    const importFace = state.machineInstances.find((instance) => instance.uid === cable.uid)!.fabricationInterfaces!.east!
    state = removeFabricationFaceAttachment(state, importFace.uid)
    state = attachFabricationFace(state, cable.uid, 'east', 'terminalExportBus')
    const exportFace = state.machineInstances.find((instance) => instance.uid === cable.uid)!.fabricationInterfaces!.east!
    state = toggleFabricationBusFluidFilter(state, exportFace.uid, 'water')
    state.machineInstances.find((instance) => instance.machineId === 'planningController')!.process.euStored = 128
    state = tickGame(state, 1000).state
    expect(state.machineInstances.find((instance) => instance.uid === targetTank.uid)!.process.fluids.water ?? 0).toBe(16)
    expect(state.machineInstances.find((instance) => instance.uid === linkedTank.uid)!.process.fluids.water ?? 0).toBe(0)
  })

  it('runs a recursive crafting request from encoded recipe cards', () => {
    let state = createFactoryState()
    state.machines.recipeEncoder = 1
    state.machines.jobInterface = 1
    state.machines.autoFabricator = 1
    state.machines.planningController = 1
    state.machines.fabricationCable = 3
    state = placeMachineInstance(state, 'planningController', 0, 0)
    state = placeMachineInstance(state, 'fabricationCable', 1, 0)
    state = placeMachineInstance(state, 'fabricationCable', 2, 0)
    state = placeMachineInstance(state, 'fabricationCable', 3, 0)
    state = placeMachineInstance(state, 'recipeEncoder', 2, 1)
    state = placeMachineInstance(state, 'autoFabricator', 4, 0)
    const interfaceCable = state.machineInstances.find((instance) => instance.x === 3 && instance.y === 0)!
    state = attachFabricationInterface(state, interfaceCable.uid, 'east')
    state.resources.blankRecipeCard = 2
    state.resources.log = 1

    const encoder = state.machineInstances.find((instance) => instance.machineId === 'recipeEncoder')!
    state.machineInstances.find((instance) => instance.machineId === 'planningController')!.process.euStored = 128
    state = encodeCraftingRecipeCard(state, encoder.uid, 'craft_planks')
    state = encodeCraftingRecipeCard(state, encoder.uid, 'craft_sticks')

    const recipeInterface = state.machineInstances.find((instance) => instance.uid === interfaceCable.uid)!.fabricationInterfaces!.east!
    for (const card of state.recipeCards) {
      state = installRecipeCard(state, recipeInterface.uid, card.uid)
    }
    const sticksCard = state.recipeCards.find((card) => card.recipeId === 'craft_sticks')!
    const readyPreview = previewFabricationRequest(state, sticksCard.uid, 4)
    const missingPreview = previewFabricationRequest(state, sticksCard.uid, 16)

    expect(readyPreview.canStart).toBe(true)
    expect(readyPreview.steps.map((step) => state.recipeCards.find((card) => card.uid === step.cardUid)?.recipeId)).toEqual([
      'craft_planks',
      'craft_sticks',
    ])
    expect(readyPreview.rackMemoryUnits).toBe(64)
    expect(missingPreview.canStart).toBe(false)
    expect(missingPreview.missingItems).toContainEqual({ id: 'log', amount: 1 })

    state = requestFabricationJob(state, sticksCard.uid, 4)
    state.machineInstances.find((instance) => instance.machineId === 'planningController')!.process.euStored = 128

    for (let step = 0; step < 5; step += 1) {
      state = tickGame(state, 2100).state
    }

    expect(state.fabricationJobs[0].status).toBe('complete')
    expect(state.resources.stick).toBeGreaterThanOrEqual(4)
  })

  it('bundles fabrication, item, and fluid conductors in one factory cell', () => {
    let state = createFactoryState()
    state.machines.itemConductor = 1
    state.machines.fluidConductor = 1
    state.machines.fabricationCable = 1

    state = placeMachineInstance(state, 'fabricationCable', 2, 2)
    state = placeMachineInstance(state, 'itemConductor', 2, 2)
    state = placeMachineInstance(state, 'fluidConductor', 2, 2)

    expect(state.machineInstances).toHaveLength(1)
    expect(state.machineInstances[0].machineId).toBe('conductorBundle')
    expect(state.machineInstances[0].fabricationCableInstalled).toBe(true)
    expect(availableUnplacedMachineCount(state, 'itemConductor')).toBe(0)
    expect(availableUnplacedMachineCount(state, 'fluidConductor')).toBe(0)
    expect(availableUnplacedMachineCount(state, 'fabricationCable')).toBe(0)

    state = removeConductorLane(state, state.machineInstances[0].uid, 'fluid')
    expect(state.machineInstances[0].machineId).toBe('itemConductor')
    expect(state.machineInstances[0].fabricationCableInstalled).toBe(true)
  })

  it('powers a connected Pattern Terminal only from its Planning Controller', () => {
    let state = createFactoryState()
    state.machines.planningController = 1
    state.machines.fabricationCable = 2
    state.machines.recipeEncoder = 1
    state = placeMachineInstance(state, 'planningController', 0, 0)
    state = placeMachineInstance(state, 'fabricationCable', 1, 0)
    state = placeMachineInstance(state, 'fabricationCable', 2, 0)
    state = placeMachineInstance(state, 'recipeEncoder', 2, 1)
    state.resources.blankRecipeCard = 1
    const controller = state.machineInstances.find((instance) => instance.machineId === 'planningController')!
    const encoder = state.machineInstances.find((instance) => instance.machineId === 'recipeEncoder')!
    controller.process.euStored = 64

    state = encodeCraftingRecipeCard(state, encoder.uid, 'craft_planks')

    expect(state.recipeCards).toHaveLength(1)
    expect(state.machineInstances.find((instance) => instance.uid === controller.uid)?.process.euStored).toBe(0)
    expect(state.machineInstances.find((instance) => instance.uid === encoder.uid)?.process.euStored).toBe(0)

    state = removeConductorLane(state, state.machineInstances.find((instance) => instance.x === 2 && instance.y === 0)!.uid, 'fabrication')
    state.resources.blankRecipeCard = 1
    state.machineInstances.find((instance) => instance.uid === controller.uid)!.process.euStored = 64
    state = encodeCraftingRecipeCard(state, encoder.uid, 'craft_sticks')
    expect(state.recipeCards).toHaveLength(1)
  })

  it('keeps duplicate encoded patterns as separate removable interface items', () => {
    let state = createFactoryState()
    state.machines.planningController = 1
    state.machines.fabricationCable = 3
    state.machines.recipeEncoder = 1
    state.machines.autoFabricator = 1
    state.machines.jobInterface = 1
    state = placeMachineInstance(state, 'planningController', 0, 0)
    state = placeMachineInstance(state, 'fabricationCable', 1, 0)
    state = placeMachineInstance(state, 'fabricationCable', 2, 0)
    state = placeMachineInstance(state, 'fabricationCable', 3, 0)
    state = placeMachineInstance(state, 'recipeEncoder', 2, 1)
    state = placeMachineInstance(state, 'autoFabricator', 4, 0)
    const cable = state.machineInstances.find((instance) => instance.x === 3 && instance.y === 0)!
    state = attachFabricationInterface(state, cable.uid, 'east')
    state.resources.blankRecipeCard = 2
    state.machineInstances.find((instance) => instance.machineId === 'planningController')!.process.euStored = 128
    const encoder = state.machineInstances.find((instance) => instance.machineId === 'recipeEncoder')!
    state = encodeCraftingRecipeCard(state, encoder.uid, 'craft_planks')
    state = encodeCraftingRecipeCard(state, encoder.uid, 'craft_planks')
    const interfaceUid = state.machineInstances.find((instance) => instance.uid === cable.uid)!.fabricationInterfaces!.east!.uid
    for (const card of state.recipeCards) state = installRecipeCard(state, interfaceUid, card.uid)

    expect(new Set(state.recipeCards.map((card) => card.uid)).size).toBe(2)
    expect(state.recipeCards.every((card) => card.installedInUid === interfaceUid)).toBe(true)

    state = removeRecipeCard(state, state.recipeCards[0].uid)
    expect(state.recipeCards.filter((card) => card.installedInUid === interfaceUid)).toHaveLength(1)
    expect(state.recipeCards.filter((card) => !card.installedInUid)).toHaveLength(1)
  })

  it('preserves standalone Job Interfaces and their encoded patterns through save migration', () => {
    let legacy = createFactoryState()
    legacy.version = 15
    legacy.machines.furnace = 1
    legacy.machines.jobInterface = 1
    legacy = placeMachineInstance(legacy, 'furnace', 2, 2)
    legacy.machineInstances[0].machineId = 'jobInterface'
    legacy.machineInstances[0].uid = 'legacy-interface-1'
    legacy.machineInstances[0].installedRecipeCardUids = ['card-1']
    legacy.recipeCards = [{
      uid: 'card-1',
      kind: 'crafting',
      name: 'Planks',
      recipeId: 'craft_planks',
      programNumber: 0,
      itemInputs: [{ id: 'log', amount: 1 }],
      fluidInputs: [],
      itemOutputs: [{ id: 'plank', amount: 4 }],
      fluidOutputs: [],
      installedInUid: 'legacy-interface-1',
    }]

    const migrated = loadGame(JSON.stringify(legacy), 2000)

    expect(migrated.machineInstances.some((instance) => instance.machineId === 'jobInterface')).toBe(true)
    expect(migrated.machines.jobInterface).toBe(1)
    expect(migrated.recipeCards[0].installedInUid).toBe('legacy-interface-1')
    expect(migrated.machineInstances.find((instance) => instance.uid === 'legacy-interface-1')?.installedRecipeCardUids).toEqual(['card-1'])
  })

  it('migrates legacy 3x3 benzene multiblocks into formed 2x2 structures and refunds five parts', () => {
    for (const [partId, controllerId] of [
      ['poweredFarmPart', 'poweredFarm'],
      ['pyrolysisOvenPart', 'pyrolysisOven'],
    ] as const) {
      let legacy = createFactoryState()
      legacy.version = 18
      legacy.machines[partId] = 9
      for (let y = 0; y < 2; y += 1) {
        for (let x = 0; x < 2; x += 1) legacy = placeMachineInstance(legacy, partId, x, y)
      }

      const controller = legacy.machineInstances.find((instance) => instance.machineId === controllerId)!
      const parts = legacy.machineInstances.filter((instance) => instance.machineId === partId)
      const perimeter = [
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
        { x: 0, y: 1 }, { x: 2, y: 1 },
        { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
      ]
      controller.x = 1
      controller.y = 1
      controller.process.progressMs = 1234
      controller.process.euStored = 96
      controller.process.configuredProgramNumber = controllerId === 'poweredFarm' ? 2 : 0
      perimeter.forEach((position, index) => {
        const part = parts[index] ?? {
          ...structuredClone(parts[0]),
          uid: `${partId}-legacy-${index + 1}`,
        }
        part.x = position.x
        part.y = position.y
        if (index >= parts.length) legacy.machineInstances.push(part)
      })

      const migrated = loadGame(JSON.stringify(legacy), 2000)
      const migratedController = migrated.machineInstances.find((instance) => instance.machineId === controllerId)!

      expect(migrated.version).toBe(20)
      expect(migratedController.x).toBe(0)
      expect(migratedController.y).toBe(0)
      expect(migratedController.process.progressMs).toBe(1234)
      expect(migratedController.process.euStored).toBe(96)
      expect(multiblockControllerForInstance(migrated, migratedController)).not.toBeNull()
      expect(migrated.machineInstances.filter((instance) => instance.machineId === partId)).toHaveLength(3)
      expect(availableUnplacedMachineCount(migrated, partId)).toBe(5)
      expect(migrated.migrationNotices).toContain('benzene-multiblocks-2x2')
    }
  })

  it('forms the 2x2 farm and pyrolysis multiblocks from four parts', () => {
    for (const [partId, controllerId] of [
      ['poweredFarmPart', 'poweredFarm'],
      ['pyrolysisOvenPart', 'pyrolysisOven'],
    ] as const) {
      let state = createFactoryState()
      state.machines[partId] = 4
      for (let y = 0; y < 2; y += 1) {
        for (let x = 0; x < 2; x += 1) state = placeMachineInstance(state, partId, x, y)
      }

      expect(state.machineInstances).toHaveLength(4)
      expect(state.machineInstances.find((instance) => instance.x === 0 && instance.y === 0)?.machineId).toBe(controllerId)
      expect(state.machineInstances.filter((instance) => instance.machineId === partId)).toHaveLength(3)
      expect(state.machines[controllerId]).toBe(1)
    }
  })

  it('runs each powered farm program from continuous water and LV power', () => {
    const expectations = [
      { program: 1, durationMs: 60000, output: { id: 'log', amount: 16 }, secondary: null },
      { program: 2, durationMs: 70000, output: { id: 'rubberLog', amount: 8 }, secondary: { id: 'rubberSap', amount: 4 } },
      { program: 3, durationMs: 50000, output: { id: 'sugarCane', amount: 24 }, secondary: null },
    ] as const

    for (const expected of expectations) {
      let state = createFactoryState()
      state.machines.poweredFarmPart = 4
      for (let y = 0; y < 2; y += 1) {
        for (let x = 0; x < 2; x += 1) state = placeMachineInstance(state, 'poweredFarmPart', x, y)
      }
      const controller = state.machineInstances.find((instance) => instance.machineId === 'poweredFarm')!
      state = setConfiguredProcessProgram(state, controller.uid, expected.program)
      const stepMs = 10000
      for (let elapsed = 0; elapsed < expected.durationMs; elapsed += stepMs) {
        const process = state.machineInstances.find((instance) => instance.uid === controller.uid)!.process
        process.euStored = 256
        process.fluids.water = 128
        state = tickGame(state, Math.min(stepMs, expected.durationMs - elapsed)).state
      }

      const process = state.machineInstances.find((instance) => instance.uid === controller.uid)!.process
      expect(process.output).toEqual(expected.output)
      expect(process.output2).toEqual(expected.secondary)
      expect(state.recipeMilestones[`farm_${expected.program === 1 ? 'standard_trees' : expected.program === 2 ? 'rubber_trees' : 'sugar_cane'}`]).toBe(1)
    }
  })

  it('requires and consumes fertilizer for enriched sugar cane', () => {
    let state = createFactoryState()
    state.machines.poweredFarmPart = 4
    for (let y = 0; y < 2; y += 1) {
      for (let x = 0; x < 2; x += 1) state = placeMachineInstance(state, 'poweredFarmPart', x, y)
    }
    const controller = state.machineInstances.find((instance) => instance.machineId === 'poweredFarm')!
    state = setConfiguredProcessProgram(state, controller.uid, 4)
    controller.process.fluids.water = 128
    controller.process.euStored = 256
    state = tickGame(state, 10000).state
    expect(state.machineInstances.find((instance) => instance.uid === controller.uid)!.process.progressMs).toBe(0)

    state.machineInstances.find((instance) => instance.uid === controller.uid)!.process.fluids.fertilizerLiquor = 24
    for (let elapsed = 0; elapsed < 60000; elapsed += 10000) {
      const process = state.machineInstances.find((instance) => instance.uid === controller.uid)!.process
      process.euStored = 256
      process.fluids.water = 128
      state = tickGame(state, 10000).state
    }

    const process = state.machineInstances.find((instance) => instance.uid === controller.uid)!.process
    expect(process.output).toEqual({ id: 'sugarCane', amount: 36 })
    expect(process.fluids.fertilizerLiquor).toBe(0)
    expect(state.recipeMilestones.farm_enriched_sugar_cane).toBe(1)
  })

  it('accepts the Circuit Imprinter third recipe ingredient in its extra slot', () => {
    expect(canResourceEnterProcessSlot('circuitImprinter', 'extraInput1', 'phaseDust')).toBe(true)
  })

  it('carbonizes logs and distils both liquid fractions without hiding byproducts', () => {
    let state = createFactoryState()
    state.machines.pyrolysisOvenPart = 4
    for (let y = 0; y < 2; y += 1) {
      for (let x = 0; x < 2; x += 1) state = placeMachineInstance(state, 'pyrolysisOvenPart', x, y)
    }
    const oven = state.machineInstances.find((instance) => instance.machineId === 'pyrolysisOven')!
    state.resources.log = 8
    state = insertProcessSlot(state, oven.uid, 'input', 'log', 8)
    for (let step = 0; step < 6; step += 1) {
      state.machineInstances.find((instance) => instance.uid === oven.uid)!.process.euStored = 256
      state = tickGame(state, 10000).state
    }

    const ovenProcess = state.machineInstances.find((instance) => instance.uid === oven.uid)!.process
    expect(ovenProcess.output).toEqual({ id: 'charcoal', amount: 10 })
    expect(ovenProcess.fluids.woodTar).toBe(24)
    expect(ovenProcess.fluids.woodGas).toBe(8)

    state.machines.lvDistillery = 1
    state = placeMachineInstance(state, 'lvDistillery', 4, 0)
    const distillery = state.machineInstances.find((instance) => instance.machineId === 'lvDistillery')!
    distillery.process.fluids.woodTar = 16
    for (let step = 0; step < 4; step += 1) {
      state.machineInstances.find((instance) => instance.uid === distillery.uid)!.process.euStored = 128
      state = tickGame(state, 7500).state
    }

    const distilleryProcess = state.machineInstances.find((instance) => instance.uid === distillery.uid)!.process
    expect(distilleryProcess.fluids.woodTar).toBe(0)
    expect(distilleryProcess.fluids.benzene).toBe(10)
    expect(distilleryProcess.fluids.heavyTar).toBe(6)
  })

  it('keeps paired fluid outputs separated across two empty destination tanks', () => {
    let state = createFactoryState()
    state.machines.lvDistillery = 1
    state.machines.steamTank = 2
    state = placeMachineInstance(state, 'steamTank', 0, 1)
    state = placeMachineInstance(state, 'lvDistillery', 1, 1)
    state = placeMachineInstance(state, 'steamTank', 2, 1)
    const distillery = state.machineInstances.find((instance) => instance.machineId === 'lvDistillery')!
    state = setFluidOutputDirection(state, distillery.uid, 'west')
    state = setFluidOutputDirection(state, distillery.uid, 'east')
    const configuredDistillery = state.machineInstances.find((instance) => instance.uid === distillery.uid)!
    configuredDistillery.process.fluids.benzene = 8
    configuredDistillery.process.fluids.heavyTar = 8

    state = tickGame(state, 1000).state

    const tankContents = state.machineInstances
      .filter((instance) => instance.machineId === 'steamTank')
      .map((instance) => ({ benzene: instance.process.fluids.benzene ?? 0, heavyTar: instance.process.fluids.heavyTar ?? 0 }))
    expect(tankContents).toEqual(expect.arrayContaining([
      { benzene: 8, heavyTar: 0 },
      { benzene: 0, heavyTar: 8 },
    ]))
  })

  it('generates exact LV and MV power from benzene only while buffers have room', () => {
    for (const [machineId, expectedEu] of [
      ['lvCombustionGenerator', 256],
      ['mvCombustionGenerator', 1024],
    ] as const) {
      let state = createFactoryState()
      state.machines[machineId] = 1
      state = placeMachineInstance(state, machineId, 0, 0)
      const generator = state.machineInstances[0]
      generator.process.fluids.benzene = 4
      state = tickGame(state, 8000).state

      const process = state.machineInstances[0].process
      expect(process.euStored).toBe(expectedEu)
      expect(process.fluids.benzene).toBe(machineId === 'lvCombustionGenerator' ? 3 : 0)
      process.euStored = machines[machineId].euCapacity!
      const fuelAtCapacity = process.fluids.benzene
      state = tickGame(state, 8000).state
      expect(state.machineInstances[0].process.fluids.benzene).toBe(fuelAtCapacity)
    }
  })

  it('requires a transformer between 32V machines and 128V aluminium cable', () => {
    let state = createFactoryState()
    state.machines.lvMacerator = 1
    state.machines.lvToMvTransformer = 1
    state.resources.aluminiumCable = 2
    state = placeMachineInstance(state, 'lvMacerator', 0, 0)
    state = placeMachineInstance(state, 'aluminiumCable', 1, 0)
    state = setPipeSideMode(state, state.machineInstances.find((instance) => instance.machineId === 'aluminiumCable')!.uid, 'west', 'both')
    const lvMachine = state.machineInstances.find((instance) => instance.machineId === 'lvMacerator')!
    const directCable = state.machineInstances.find((instance) => instance.machineId === 'aluminiumCable')!
    expect(machinesCanConnectEu(lvMachine, directCable)).toBe(false)

    state = removeMachineInstance(state, directCable.uid)
    state = placeMachineInstance(state, 'lvToMvTransformer', 1, 0)
    state = placeMachineInstance(state, 'aluminiumCable', 2, 0)
    state = setPipeSideMode(state, state.machineInstances.find((instance) => instance.machineId === 'aluminiumCable')!.uid, 'west', 'both')
    const transformer = state.machineInstances.find((instance) => instance.machineId === 'lvToMvTransformer')!
    const convertedCable = state.machineInstances.find((instance) => instance.machineId === 'aluminiumCable')!
    expect(machinesCanConnectEu(lvMachine, transformer)).toBe(true)
    expect(machinesCanConnectEu(transformer, convertedCable)).toBe(true)
  })

  it('only exports a formed fluid multiblock through controller-enabled structure edges', () => {
    let state = createFactoryState()
    state.machines.pyrolysisOvenPart = 4
    state.machines.steamTank = 2
    for (let y = 1; y <= 2; y += 1) {
      for (let x = 1; x <= 2; x += 1) state = placeMachineInstance(state, 'pyrolysisOvenPart', x, y)
    }
    state = placeMachineInstance(state, 'steamTank', 1, 3)
    state = placeMachineInstance(state, 'steamTank', 0, 2)
    const oven = state.machineInstances.find((instance) => instance.machineId === 'pyrolysisOven')!
    const southTank = state.machineInstances.find((instance) => instance.x === 1 && instance.y === 3)!
    const westTank = state.machineInstances.find((instance) => instance.x === 0 && instance.y === 2)!
    oven.process.fluids.woodTar = 8

    state = tickGame(state, 1000).state
    expect(state.machineInstances.find((instance) => instance.uid === southTank.uid)!.process.fluids.woodTar ?? 0).toBe(0)

    state = setPipeSideMode(state, oven.uid, 'south', 'output')
    state = tickGame(state, 1000).state
    expect({
      south: state.machineInstances.find((instance) => instance.uid === southTank.uid)!.process.fluids.woodTar ?? 0,
      west: state.machineInstances.find((instance) => instance.uid === westTank.uid)!.process.fluids.woodTar ?? 0,
    }).toEqual({ south: 8, west: 0 })
  })

  it('stops a multi-fluid process before either independent output buffer overfills', () => {
    let state = createFactoryState()
    state.machines.lvDistillery = 1
    state = placeMachineInstance(state, 'lvDistillery', 1, 1)
    const distillery = state.machineInstances.find((instance) => instance.machineId === 'lvDistillery')!
    distillery.process.fluids.woodTar = 16
    distillery.process.fluids.benzene = 60
    distillery.process.fluids.heavyTar = 60
    distillery.process.euStored = 128

    state = tickGame(state, 1000).state
    const process = state.machineInstances.find((instance) => instance.uid === distillery.uid)!.process
    expect(process.activeRecipeId).toBeNull()
    expect(process.progressMs).toBe(0)
    expect(process.fluids.woodTar).toBe(16)
    expect(process.fluids.benzene).toBe(60)
    expect(process.fluids.heavyTar).toBe(60)
  })

  it('converts one MV amp into four LV amps only through the step-down transformer', () => {
    const buildRoute = (transformerId: 'lvToMvTransformer' | 'mvToLvTransformer') => {
      let state = createFactoryState()
      state.machines.mvCombustionGenerator = 1
      state.machines[transformerId] = 1
      state.machines.lvMacerator = 1
      state.resources.aluminiumCable = 1
      state = placeMachineInstance(state, 'mvCombustionGenerator', 0, 0)
      state = placeMachineInstance(state, 'aluminiumCable', 1, 0)
      state = placeMachineInstance(state, transformerId, 2, 0)
      state = placeMachineInstance(state, 'lvMacerator', 3, 0)
      const cable = state.machineInstances.find((instance) => instance.machineId === 'aluminiumCable')!
      state = setPipeSideMode(state, cable.uid, 'west', 'both')
      state = setPipeSideMode(state, cable.uid, 'east', 'both')
      state.machineInstances.find((instance) => instance.machineId === 'mvCombustionGenerator')!.process.euStored = 512
      return state
    }

    const correct = buildRoute('mvToLvTransformer')
    const reversed = buildRoute('lvToMvTransformer')
    expect(availableConnectedEuAmps(correct, correct.machineInstances.find((instance) => instance.machineId === 'lvMacerator')!)).toBe(4)
    expect(availableConnectedEuAmps(reversed, reversed.machineInstances.find((instance) => instance.machineId === 'lvMacerator')!)).toBe(0)
  })

  it('applies aluminium cable loss at its own MV rating', () => {
    let state = createFactoryState()
    state.machines.mvCombustionGenerator = 1
    state.machines.mvToLvTransformer = 1
    state.machines.lvMacerator = 1
    state.resources.aluminiumCable = 1
    state = placeMachineInstance(state, 'mvCombustionGenerator', 0, 0)
    state = placeMachineInstance(state, 'aluminiumCable', 1, 0)
    state = placeMachineInstance(state, 'mvToLvTransformer', 2, 0)
    state = placeMachineInstance(state, 'lvMacerator', 3, 0)
    const cable = state.machineInstances.find((instance) => instance.machineId === 'aluminiumCable')!
    state = setPipeSideMode(state, cable.uid, 'west', 'both')
    state = setPipeSideMode(state, cable.uid, 'east', 'both')
    const generator = state.machineInstances.find((instance) => instance.machineId === 'mvCombustionGenerator')!
    const macerator = state.machineInstances.find((instance) => instance.machineId === 'lvMacerator')!
    generator.process.euStored = 100

    state = tickGame(state, 1000).state
    expect(state.machineInstances.find((instance) => instance.uid === macerator.uid)!.process.euStored).toBe(30)
    expect(state.machineInstances.find((instance) => instance.uid === generator.uid)!.process.euStored).toBe(68)
  })

  it('rates every LV and MV superconductor cable as lossless at its advertised amperage', () => {
    const families = [
      ['lvSuperconductorCable', 'lvSuperconductorCable2A', 'lvSuperconductorCable4A', 'lvSuperconductorCable8A'],
      ['mvSuperconductorCable', 'mvSuperconductorCable2A', 'mvSuperconductorCable4A', 'mvSuperconductorCable8A'],
    ] as const
    for (const [familyIndex, family] of families.entries()) {
      family.forEach((machineId, ampIndex) => {
        expect(machines[machineId].euAmps).toBe(2 ** ampIndex)
        expect(machines[machineId].euVoltage).toBe(familyIndex === 0 ? 32 : 128)
        expect(machines[machineId].euCableLossPerTile).toBe(0)
      })
    }
  })

  it('charges shared source and cable budgets for delivered EU plus route loss', () => {
    let state = createFactoryState()
    state.machines.mvCombustionGenerator = 1
    state.machines.mvToLvTransformer = 2
    state.machines.lvBatteryBuffer4A = 2
    state.resources.aluminiumCable = 1
    state = placeMachineInstance(state, 'mvCombustionGenerator', 0, 1)
    state = placeMachineInstance(state, 'aluminiumCable', 1, 1)
    state = placeMachineInstance(state, 'mvToLvTransformer', 1, 0)
    state = placeMachineInstance(state, 'lvBatteryBuffer4A', 2, 0)
    state = placeMachineInstance(state, 'mvToLvTransformer', 1, 2)
    state = placeMachineInstance(state, 'lvBatteryBuffer4A', 2, 2)
    const cable = state.machineInstances.find((instance) => instance.machineId === 'aluminiumCable')!
    for (const direction of ['west', 'north', 'south'] as PipeDirection[]) state = setPipeSideMode(state, cable.uid, direction, 'both')
    for (const buffer of state.machineInstances.filter((instance) => instance.machineId === 'lvBatteryBuffer4A')) {
      state = setBatteryBufferOutputDirection(state, buffer.uid, 'east')
    }
    const generator = state.machineInstances.find((instance) => instance.machineId === 'mvCombustionGenerator')!
    const buffers = state.machineInstances.filter((instance) => instance.machineId === 'lvBatteryBuffer4A')
    generator.process.euStored = 512
    for (const buffer of buffers) buffer.process.batterySlots = Array(4).fill('lithiumBattery')

    state = tickGame(state, 1000).state

    const consumed = 512 - state.machineInstances.find((instance) => instance.uid === generator.uid)!.process.euStored
    const delivered = state.machineInstances
      .filter((instance) => instance.machineId === 'lvBatteryBuffer4A')
      .reduce((sum, buffer) => sum + buffer.process.euStored, 0)
    expect(consumed).toBe(128)
    expect(delivered).toBe(126)
  })

  it('preserves incomplete legacy benzene structures without discarding process state', () => {
    let legacy = createFactoryState()
    legacy.version = 18
    legacy.machines.furnace = 1
    legacy = placeMachineInstance(legacy, 'furnace', 2, 2)
    const controller = legacy.machineInstances[0]
    controller.machineId = 'poweredFarm'
    controller.uid = 'legacy-incomplete-farm'
    controller.process.progressMs = 4321
    controller.process.euStored = 77
    controller.process.fluids.water = 42
    controller.pipeSideModes = { east: 'output' }
    legacy.machines.furnace = 0
    legacy.machines.poweredFarm = 1

    const migrated = loadGame(JSON.stringify(legacy), 2000)
    const preserved = migrated.machineInstances.find((instance) => instance.uid === controller.uid)!
    expect(preserved.machineId).toBe('poweredFarm')
    expect(preserved.process.progressMs).toBe(4321)
    expect(preserved.process.euStored).toBe(77)
    expect(preserved.process.fluids.water).toBe(42)
    expect(preserved.pipeSideModes?.east).toBe('output')
    expect(migrated.migrationNotices).toContain('benzene-multiblocks-incomplete-preserved')
  })

  it('finishes a fabricated farm batch whose water input exceeds the displayed machine buffer', () => {
    let state = createFactoryState()
    state.machines.planningController = 1
    state.machines.recipeEncoder = 1
    state.machines.jobInterface = 1
    state.machines.fabricationCable = 2
    state.machines.fluidStorageLink = 1
    state.machines.steamTank = 1
    state.machines.poweredFarmPart = 4
    state.machines.lvCombustionGenerator = 2
    state = placeMachineInstance(state, 'planningController', 0, 0)
    state = placeMachineInstance(state, 'fabricationCable', 1, 0)
    state = placeMachineInstance(state, 'fabricationCable', 2, 0)
    state = placeMachineInstance(state, 'recipeEncoder', 1, 1)
    state = placeMachineInstance(state, 'fluidStorageLink', 2, 1)
    state = placeMachineInstance(state, 'steamTank', 2, 2)
    for (let y = 0; y < 2; y += 1) {
      for (let x = 3; x < 5; x += 1) state = placeMachineInstance(state, 'poweredFarmPart', x, y)
    }
    state = placeMachineInstance(state, 'lvCombustionGenerator', 5, 0)
    state = placeMachineInstance(state, 'lvCombustionGenerator', 0, 1)
    const interfaceCable = state.machineInstances.find((instance) => instance.x === 2 && instance.y === 0)!
    state = attachFabricationInterface(state, interfaceCable.uid, 'east')
    const controller = state.machineInstances.find((instance) => instance.machineId === 'planningController')!
    const encoder = state.machineInstances.find((instance) => instance.machineId === 'recipeEncoder')!
    const waterTank = state.machineInstances.find((instance) => instance.machineId === 'steamTank')!
    controller.process.euStored = 8192
    for (const generator of state.machineInstances.filter((instance) => instance.machineId === 'lvCombustionGenerator')) {
      generator.process.euStored = 512
      generator.process.fluids.benzene = 8
    }
    waterTank.process.fluids.water = 480
    state.resources.blankRecipeCard = 1
    state = encodeProcessingRecipeCard(state, encoder.uid, 'farm_standard_trees')
    const recipeInterface = state.machineInstances.find((instance) => instance.uid === interfaceCable.uid)!.fabricationInterfaces!.east!
    state = installRecipeCard(state, recipeInterface.uid, state.recipeCards[0].uid)
    state = requestFabricationJob(state, state.recipeCards[0].uid, 1)

    expect(state.fabricationJobs[0].reservedFluids).toContainEqual({ id: 'water', amount: 480 })
    for (let second = 0; second < 8; second += 1) state = tickGame(state, 1000).state

    let farm = state.machineInstances.find((instance) => instance.machineId === 'poweredFarm')!
    expect(farm.process.fluids.water).toBe(128)
    expect(state.fabricationJobs[0].reservedFluids).toContainEqual(expect.objectContaining({ id: 'water', amount: 352 }))

    state = tickGame(state, 1000).state
    farm = state.machineInstances.find((instance) => instance.machineId === 'poweredFarm')!
    expect(farm.process.fluids.water).toBe(128)
    expect(state.fabricationJobs[0].reservedFluids).toContainEqual(expect.objectContaining({ id: 'water', amount: 344 }))
    expect(
      (farm.process.fluids.water ?? 0) +
      (state.fabricationJobs[0].reservedFluids.find((fluid) => fluid.id === 'water')?.amount ?? 0) +
      farm.process.progressMs * 0.008,
    ).toBe(480)

    for (let second = 0; second < 65; second += 1) state = tickGame(state, 1000).state
    expect(state.fabricationJobs[0].status).toBe('complete')
    expect(state.resources.log).toBeGreaterThanOrEqual(16)
  })

  it('casts polyethylene plates without consuming the reusable plate mold', () => {
    let state = createFactoryState(1000, 6)
    state.machines.lvFluidSolidifier = 1
    state = placeMachineInstance(state, 'lvFluidSolidifier', 0, 0)
    const solidifier = state.machineInstances[0]
    solidifier.process.input = { id: 'plateMold', amount: 1 }
    solidifier.process.fluids.liquidPolyethylene = 8
    solidifier.process.configuredProgramNumber = 1
    solidifier.process.euStored = 128

    state = tickGame(state, 8000, 9000).state
    const completed = state.machineInstances[0]
    expect(completed.process.input).toEqual({ id: 'plateMold', amount: 1 })
    expect(completed.process.output).toEqual({ id: 'polyethylenePlate', amount: 1 })
    expect(completed.process.fluids.liquidPolyethylene).toBe(4)
  })

  it('keeps LV Super Tank I single-block and blocks removal until drained', () => {
    let state = createFactoryState(1000, 6)
    state.machines.lvSuperTank = 2
    state = placeMachineInstance(state, 'lvSuperTank', 0, 0)
    state = placeMachineInstance(state, 'lvSuperTank', 1, 0)
    const first = state.machineInstances.find((instance) => instance.x === 0)!
    const second = state.machineInstances.find((instance) => instance.x === 1)!

    expect(steamTankStructureForInstance(state, first)).toBeNull()
    expect(steamTankStructureForInstance(state, second)).toBeNull()
    expect(steamTankFluidCapacityLitresForInstance(state, first)).toBe(4_000_000)

    first.process.fluids.liquidPolyethylene = 1
    expect(removeMachineInstance(state, first.uid)).toBe(state)
    first.process.fluids.liquidPolyethylene = 0
    const removed = removeMachineInstance(state, first.uid)
    expect(removed.machineInstances.some((instance) => instance.uid === first.uid)).toBe(false)
  })
})

