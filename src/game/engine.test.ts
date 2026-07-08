import { describe, expect, it } from 'vitest'
import { canAutoMinerTarget, createInitialState, fuelDefinitions, gatherTargets, processRecipes, quests, recipes, sellItems, shopItems } from './content'
import { processRecipesProducingResource, recipesProducingResource, recipesUsingResource } from './recipeGraph'
import { groupRecipesByOutput } from './recipeGroups'
import {
  availableConnectedEu,
  availableConnectedEuStorage,
  availableConnectedSteam,
  availableResourceAmount,
  availableUnplacedMachineCount,
  assignAutoMiner,
  buyShopItem,
  boilerHasWater,
  boilerSteamCapacityMs,
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
  currentSteamPipeFlowLitresPerSecond,
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
  ironTankFluidCapacityLitres,
  insertProcessSlot,
  isAutoMinerPowered,
  loadGame,
  loadGameWithOfflineProgress,
  liquidSteamBoilerCapacityMs,
  liquidSteamBoilerFluidCapacityLitres,
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
  searchTerminalRecipes,
  sellShopItem,
  setHopperOutputDirection,
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
    const steelShopItem = shopItems.find((item) => item.id === 'steelIngot')!
    state.completedQuests.push('buildFoundation')
    state.discoveredResources = ['copperOre', 'steelIngot']
    state.scrip = 1000

    expect(canBuyShopItem(state, copperShopItem)).toBe(false)
    expect(canBuyShopItem(state, steelShopItem)).toBe(false)

    state.completedQuests.push('bronzeAge')
    expect(canBuyShopItem(state, copperShopItem)).toBe(true)
    expect(canBuyShopItem(state, steelShopItem)).toBe(false)

    state.completedQuests.push('steelPlateQuest')
    expect(canBuyShopItem(state, steelShopItem)).toBe(true)
  })

  it('keeps LV circuit and multiblock casing shortcuts out of the shop', () => {
    expect(shopItems.some((item) => item.id === 'basicBoard' || item.id === 'primitiveCircuit')).toBe(false)
    expect(shopItems.some((item) => item.id === 'bbfCasing' || item.id === 'heatProofCasing')).toBe(false)
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
    const coils = quests.find((quest) => quest.id === 'makeHeatingCoilsQuest')!
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
    expect(arcFurnace.prerequisites).toEqual(['makeHeatingCoilsQuest'])
    expect(chargedArc.prerequisites).toEqual(['buildArcBlastFurnaceQuest', 'bufferLvPowerQuest'])
    expect(aluminium.prerequisites).toEqual(['makeAluminiumDustQuest', 'bufferArcBlastFurnaceQuest'])
    expect(coils.requirements.resources).toContainEqual({ id: 'heatProofCasing', amount: 8 })
    expect(arcFurnace.requirements.machines).toEqual([{ id: 'arcBlastFurnace', amount: 1 }])
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
    expect(coils.requirements.resources).toContainEqual({ id: 'heatProofCasing', amount: arcFurnace.inputs.find((input) => input.id === 'heatProofCasing')!.amount })
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
      'standardChest',
      'hopper',
      'copperPipe',
      'bronzePipe',
      'ironPipe',
      'steamMacerator',
      'steamForgeHammer',
      'steamCompressor',
      'steamExtractor',
      'steamAlloySmelter',
      'steamFurnace',
      'steamAutoMiner',
      'steamTurbine',
      'tinCable',
      'lvBatteryBuffer',
      'liquidSteamBoiler',
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
      'lvAutoMiner',
      'cokeOvenPart',
      'cokeOven',
      'brickedBlastFurnacePart',
      'brickedBlastFurnace',
      'arcBlastFurnacePart',
      'arcBlastFurnace',
    ])
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
    expect(state.machines.lvBatteryBuffer).toBe(0)
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
    expect(state.machines.steamMacerator).toBe(0)
    expect(state.machines.cokeOvenPart).toBe(0)
    expect(state.machines.cokeOven).toBe(0)
    expect(state.machines.brickedBlastFurnace).toBe(0)
    expect(state.factoryFoundationLevel).toBe(2)
    expect(factoryGridForState(state)).toEqual({ width: 8, height: 6 })
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

    expect(state.version).toBe(2)
    expect(state.machines.cokeOven).toBe(0)
    expect(state.machines.cokeOvenPart).toBe(4)
    expect(state.machineInstances.some((instance) => instance.machineId === 'cokeOven')).toBe(false)
    expect(state.resources.log).toBe(1)
    expect(state.resources.charcoal).toBe(1)
    expect(state.migrationNotices).toContain('coke-oven-multiblock')
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
    expect(loadGame(JSON.stringify({ factoryFoundationLevel: 99 }), 1000).factoryFoundationLevel).toBe(5)
  })

  it('creates a temporary creative state with 32 of every resource and placeable machine', () => {
    const state = createCreativeState(createInitialState(1000), 2000)

    expect(Object.values(state.resources).every((amount) => amount >= 32)).toBe(true)
    expect(
      Object.entries(state.machines).every(([id, amount]) =>
        id === 'cokeOven' || id === 'brickedBlastFurnace' || id === 'arcBlastFurnace' ? amount === 0 : amount >= 32,
      ),
    ).toBe(true)
    expect(state.machines.cokeOven).toBe(0)
    expect(state.machines.cokeOvenPart).toBe(32)
    expect(state.machines.brickedBlastFurnace).toBe(0)
    expect(state.machines.brickedBlastFurnacePart).toBe(32)
    expect(state.machines.arcBlastFurnace).toBe(0)
    expect(state.machines.arcBlastFurnacePart).toBe(32)
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

  it('uses filled 3x3 grids for machine crafts except primitive furnace', () => {
    const machineCrafts = recipes.filter((recipe) => recipe.machineOutputs?.length)
    const exceptions = new Set(['build_furnace'])

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

  it('assembles eight heat-proof casings into four arc furnace multiblock parts', () => {
    let state = createFactoryState(1000)
    state.resources.heatProofCasing = 8
    state.resources.ironWrench = 1
    const arcFurnace = recipes.find((recipe) => recipe.id === 'build_arc_blast_furnace')!

    expect(recipeFitsTerminalGrid(arcFurnace)).toBe(true)
    expect(arcFurnace.inputs).toEqual([{ id: 'heatProofCasing', amount: 8 }])
    expect(canCraft(state, arcFurnace)).toBe(true)

    state = craftRecipeInstant(state, arcFurnace, 1)

    expect(state.resources.heatProofCasing).toBe(0)
    expect(state.machines.arcBlastFurnacePart).toBe(4)
    expect(state.machines.arcBlastFurnace).toBe(0)
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

  it('forms and disassembles an Arc Blast Furnace 2x2 multiblock', () => {
    let state = createFactoryState(1000)
    state.machines.arcBlastFurnacePart = 4

    for (let y = 0; y < 2; y += 1) {
      for (let x = 0; x < 2; x += 1) {
        state = placeMachineInstance(state, 'arcBlastFurnacePart', x, y)
      }
    }

    expect(state.machineInstances).toHaveLength(4)
    expect(state.machineInstances.find((instance) => instance.x === 0 && instance.y === 0)?.machineId).toBe('arcBlastFurnace')
    expect(state.machineInstances.filter((instance) => instance.machineId === 'arcBlastFurnacePart')).toHaveLength(3)
    expect(state.machines.arcBlastFurnacePart).toBe(3)
    expect(state.machines.arcBlastFurnace).toBe(1)

    state.resources.ironCrowbar = 1
    const controller = state.machineInstances.find((instance) => instance.machineId === 'arcBlastFurnace')!
    state = crowbarRemoveMachineInstance(state, controller.uid)

    expect(state.machineInstances).toHaveLength(0)
    expect(state.machines.arcBlastFurnacePart).toBe(4)
    expect(state.machines.arcBlastFurnace).toBe(0)
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

    expect(boilerHasWater(state, boiler)).toBe(true)

    state = insertProcessSlot(state, boiler.uid, 'fuel', 'log', 1)
    state = tickGame(state, 1000).state

    expect(state.machineInstances.find((instance) => instance.uid === boiler.uid)!.process.steamStoredMs).toBe(12000)
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
      12000,
      12000,
      12000,
      12000,
    ])
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
    cokeOven.process.fluids.creosote = 80
    cokeOven.process.fluidCapacityLitres = cokeOvenFluidCapacityLitres
    tank.process.steamStoredMs = steamTankCapacityMs

    expect(currentFluidOutputFlows(state, cokeOven)).toEqual([
      { fluidId: 'creosote', litresPerSecond: 24, storedLitres: 80, freeLitres: ironTankFluidCapacityLitres },
    ])
    expect(currentFluidOutputFlows(state, pipe)).toEqual([
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
    cokeOven.process.fluids.creosote = 80
    cokeOven.process.fluidCapacityLitres = cokeOvenFluidCapacityLitres
    tank.process.steamStoredMs = steamTankCapacityMs

    state = tickGame(state, 1000).state

    const nextOven = state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!
    const nextTank = state.machineInstances.find((instance) => instance.uid === tank.uid)!
    expect(nextOven.process.fluids.creosote).toBe(56)
    expect(nextTank.process.steamStoredMs).toBe(steamTankCapacityMs)
    expect(nextTank.process.fluids.creosote).toBe(24)
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
    cokeOven.process.fluids.creosote = 80
    cokeOven.process.fluidCapacityLitres = cokeOvenFluidCapacityLitres

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
    cokeOven.process.fluids.creosote = 80
    cokeOven.process.fluidCapacityLitres = cokeOvenFluidCapacityLitres
    tank.process.fluids.water = 32
    tank.process.fluidCapacityLitres = ironTankFluidCapacityLitres

    state = tickGame(state, 1000).state

    const nextOven = state.machineInstances.find((instance) => instance.uid === cokeOven.uid)!
    const nextTank = state.machineInstances.find((instance) => instance.uid === tank.uid)!
    expect(nextOven.process.fluids.creosote).toBe(80)
    expect(nextTank.process.fluids.water).toBe(32)
    expect(nextTank.process.fluids.creosote).toBe(0)
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
    expect(turbine.process.euStored).toBe(240)
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

    expect(turbine.process.euStored).toBe(240)
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
    state.machines.tinCable = 1
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
    state.machines.tinCable = 1
    state.machines.lvBatteryBuffer = 1
    state.machines.lvWiremill = 1
    state.resources.tinIngot = 1
    state = placeMachineInstance(state, 'steamTurbine', 0, 0)
    state = placeMachineInstance(state, 'tinCable', 1, 0)
    state = placeMachineInstance(state, 'lvBatteryBuffer', 2, 0)
    state = placeMachineInstance(state, 'lvWiremill', 3, 0)
    state = configurePlacedConnector(state, 'tinCable', { west: 'input', east: 'output' })
    const turbine = state.machineInstances.find((instance) => instance.machineId === 'steamTurbine')!
    const buffer = state.machineInstances.find((instance) => instance.machineId === 'lvBatteryBuffer')!
    const wiremill = state.machineInstances.find((instance) => instance.machineId === 'lvWiremill')!
    turbine.process.euStored = 200

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

  it('stores connected creosote but does not burn it in a dry liquid steam boiler', () => {
    let state = createFactoryState(1000)
    state.machines.cokeOven = 1
    state.machines.liquidSteamBoiler = 1
    state = placeMachineInstance(state, 'cokeOven', 0, 0)
    state = placeMachineInstance(state, 'liquidSteamBoiler', 1, 0)
    state.machineInstances.find((instance) => instance.machineId === 'cokeOven')!.process.fluids.creosote = 20

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
    state.machineInstances.find((instance) => instance.machineId === 'cokeOven')!.process.fluids.creosote = 20

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
    state.machineInstances.find((instance) => instance.machineId === 'cokeOven')!.process.fluids.creosote = 200

    state = tickGame(state, 1000).state

    const boiler = state.machineInstances.find((instance) => instance.machineId === 'liquidSteamBoiler')!
    expect(boiler.process.fluids.creosote ?? 0).toBeLessThanOrEqual(24)
  })

  it('requires buffered EU before the Arc Blast Furnace starts aluminium', () => {
    let state = createFactoryState(1000)
    state.machines.arcBlastFurnacePart = 4
    state.machines.lvBatteryBuffer = 1
    state.resources.aluminiumDust = 1
    for (let y = 0; y < 2; y += 1) {
      for (let x = 0; x < 2; x += 1) {
        state = placeMachineInstance(state, 'arcBlastFurnacePart', x, y)
      }
    }
    state = placeMachineInstance(state, 'lvBatteryBuffer', 2, 0)
    const arc = state.machineInstances.find((instance) => instance.machineId === 'arcBlastFurnace')!
    const buffer = state.machineInstances.find((instance) => instance.machineId === 'lvBatteryBuffer')!
    buffer.process.euStored = 700
    state = insertProcessSlot(state, arc.uid, 'input', 'aluminiumDust', 1)

    state = tickGame(state, 5000).state
    expect(state.machineInstances.find((instance) => instance.uid === arc.uid)!.process.progressMs).toBe(0)

    state.machineInstances.find((instance) => instance.uid === buffer.uid)!.process.euStored = 2048
    for (let step = 0; step < 5; step += 1) {
      state = tickGame(state, 5000).state
    }

    const nextArc = state.machineInstances.find((instance) => instance.uid === arc.uid)!
    expect(nextArc.process.output).toEqual({ id: 'aluminiumIngot', amount: 1 })
    expect(nextArc.process.input).toBeNull()
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
      ['lv_lathe_iron_rod', 'lvLathe', { id: 'ironIngot', amount: 1 }, undefined, { id: 'ironRod', amount: 2 }],
      ['lv_lathe_copper_rod', 'lvLathe', { id: 'copperIngot', amount: 1 }, undefined, { id: 'copperRod', amount: 2 }],
      ['lv_lathe_tin_rod', 'lvLathe', { id: 'tinIngot', amount: 1 }, undefined, { id: 'tinRod', amount: 2 }],
      ['lv_lathe_bronze_rod', 'lvLathe', { id: 'bronzeIngot', amount: 1 }, undefined, { id: 'bronzeRod', amount: 2 }],
      ['lv_lathe_steel_rod', 'lvLathe', { id: 'steelIngot', amount: 1 }, undefined, { id: 'steelRod', amount: 2 }],
      ['lv_lathe_glass_tubes', 'lvLathe', { id: 'glass', amount: 1 }, undefined, { id: 'glassTube', amount: 3 }],
      ['lv_assembler_insulated_copper_wire', 'lvAssembler', { id: 'copperWire', amount: 2 }, { id: 'rubber', amount: 1 }, { id: 'conductiveWire', amount: 2 }],
      ['lv_assembler_resistors', 'lvAssembler', { id: 'carbonDust', amount: 1 }, { id: 'copperWire', amount: 2 }, { id: 'resistor', amount: 3 }],
      ['lv_assembler_printed_circuit_board', 'lvAssembler', { id: 'woodenBoardBlank', amount: 1 }, { id: 'copperWire', amount: 6 }, { id: 'basicBoard', amount: 1 }],
      ['lv_alloy_cupronickel', 'lvAlloySmelter', { id: 'copperDust', amount: 2 }, { id: 'nickelDust', amount: 2 }, { id: 'cupronickelIngot', amount: 5 }],
    ] as const

    for (const [id, machineId, input, secondaryInput, output] of expectations) {
      const recipe = processRecipes.find((candidate) => candidate.id === id)
      expect(recipe?.machineId, id).toBe(machineId)
      expect(recipe?.input, id).toEqual(input)
      expect(recipe?.secondaryInput, id).toEqual(secondaryInput)
      expect(recipe?.output, id).toEqual(output)
      expect(recipe?.euCost, id).toBeGreaterThan(0)
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
    expect(canAutoMinerTarget('steamAutoMiner', 'coalSeam')).toBe(true)
    expect(canAutoMinerTarget('steamAutoMiner', 'redstoneVein')).toBe(false)
    expect(canAutoMinerTarget('steamAutoMiner', 'tree')).toBe(false)
  })

  it('lets LV auto miners target non-tree resources only', () => {
    expect(canAutoMinerTarget('lvAutoMiner', 'redstoneVein')).toBe(true)
    expect(canAutoMinerTarget('lvAutoMiner', 'sandPatch')).toBe(true)
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

    expect(state.resources.cobblestone).toBe(5)
    expect(state.gatherProgress.stone).toBeGreaterThan(0)
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

    expect(result.state.resources.cobblestone).toBe(5)
    expect(result.offline.resourceDelta).toContainEqual({ id: 'cobblestone', amount: 5 })
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
    expect(state.gatherProgress.stone ?? 0).toBe(0)
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

    expect(state.resources.cobblestone).toBe(5)
  })

  it('runs LV auto miners from connected EU and clears assignment when removed', () => {
    let state = createFactoryState(1000)
    state.machines.steamTurbine = 1
    state.machines.lvAutoMiner = 1
    state = placeMachineInstance(state, 'steamTurbine', 0, 0)
    state = placeMachineInstance(state, 'lvAutoMiner', 1, 0)
    state.machineInstances.find((instance) => instance.machineId === 'steamTurbine')!.process.euStored = steamTurbineEuCapacity
    const miner = state.machineInstances.find((instance) => instance.machineId === 'lvAutoMiner')!

    state = assignAutoMiner(state, miner.uid, 'sandPatch')
    expect(isAutoMinerPowered(state, miner)).toBe(true)
    state = tickGame(state, 25000).state

    expect(state.resources.sand).toBe(4)
    state = unassignAutoMiner(state, miner.uid)
    expect(state.autoMinerAssignments[miner.uid]).toBeUndefined()
    state = assignAutoMiner(state, miner.uid, 'sandPatch')
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
})

