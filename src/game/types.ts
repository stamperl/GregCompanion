export type ResourceId =
  | 'log'
  | 'plank'
  | 'stick'
  | 'treeTap'
  | 'woodenAxe'
  | 'woodenPickaxe'
  | 'woodenShovel'
  | 'stoneAxe'
  | 'stonePickaxe'
  | 'stoneShovel'
  | 'ironAxe'
  | 'ironPickaxe'
  | 'diamond'
  | 'diamondAxe'
  | 'diamondPickaxe'
  | 'diamondShovel'
  | 'ironShovel'
  | 'stoneHammer'
  | 'ironHammer'
  | 'ironFile'
  | 'bronzeFile'
  | 'ironWireCutters'
  | 'ironWrench'
  | 'bronzeWrench'
  | 'ironCrowbar'
  | 'stone'
  | 'cobblestone'
  | 'gravel'
  | 'flint'
  | 'ironOre'
  | 'copperOre'
  | 'tinOre'
  | 'nickelOre'
  | 'bauxiteOre'
  | 'goldOre'
  | 'resonantQuartz'
  | 'voidQuartz'
  | 'redstoneDust'
  | 'crushedIronOre'
  | 'crushedCopperOre'
  | 'crushedTinOre'
  | 'crushedBauxiteOre'
  | 'crushedGoldOre'
  | 'coal'
  | 'charcoal'
  | 'coalCoke'
  | 'mortar'
  | 'ironMortar'
  | 'bronzeMortar'
  | 'unfiredBrick'
  | 'brick'
  | 'bucket'
  | 'ironIngot'
  | 'copperIngot'
  | 'tinIngot'
  | 'ironDust'
  | 'copperDust'
  | 'tinDust'
  | 'nickelDust'
  | 'bauxiteDust'
  | 'aluminiumDust'
  | 'goldDust'
  | 'resonantQuartzDust'
  | 'voidQuartzDust'
  | 'phaseDust'
  | 'bronzeIngot'
  | 'nickelIngot'
  | 'cupronickelIngot'
  | 'invarIngot'
  | 'aluminiumIngot'
  | 'goldIngot'
  | 'clay'
  | 'sand'
  | 'rubberSap'
  | 'rubberPulp'
  | 'pipeSealant'
  | 'rubber'
  | 'water'
  | 'ironPlate'
  | 'copperPlate'
  | 'tinPlate'
  | 'bronzePlate'
  | 'ironRod'
  | 'copperRod'
  | 'tinRod'
  | 'bronzeRod'
  | 'steelIngot'
  | 'steelPlate'
  | 'invarPlate'
  | 'aluminiumPlate'
  | 'goldPlate'
  | 'steelRod'
  | 'aluminiumRod'
  | 'steelRing'
  | 'aluminiumRing'
  | 'steelScrew'
  | 'aluminiumScrew'
  | 'steelGear'
  | 'aluminiumGear'
  | 'tinWire'
  | 'tinCable'
  | 'tinCable2A'
  | 'tinCable4A'
  | 'tinCable8A'
  | 'copperWire'
  | 'glass'
  | 'glassTube'
  | 'woodPulp'
  | 'woodenBoardBlank'
  | 'carbonDust'
  | 'redAlloyIngot'
  | 'redAlloyPlate'
  | 'mechanicalPiston'
  | 'redAlloyWire'
  | 'resistor'
  | 'vacuumTube'
  | 'bronzeBlend'
  | 'steamCasing'
  | 'cokeOvenBrick'
  | 'firebrick'
  | 'bbfCasing'
  | 'lvMachineCasing'
  | 'lvMachineHull'
  | 'heatingCoil'
  | 'heatProofCasing'
  | 'basicBoard'
  | 'conductiveWire'
  | 'primitiveCircuit'
  | 'lvMotor'
  | 'lvPiston'
  | 'lvPump'
  | 'lvConveyor'
  | 'leadOre'
  | 'crushedLeadOre'
  | 'leadDust'
  | 'leadIngot'
  | 'leadPlate'
  | 'sodiumSalt'
  | 'sodiumDust'
  | 'lithiumDust'
  | 'batteryAlloyIngot'
  | 'batteryAlloyPlate'
  | 'emptyBatteryCell'
  | 'sodiumBattery'
  | 'lithiumBattery'
  | 'lvBattery'
  | 'obsidian'
  | 'sulfurOre'
  | 'sulfurDust'
  | 'surveyKit'
  | 'emptySteelCell'
  | 'chargedResonantQuartz'
  | 'phaseCrystal'
  | 'silicon'
  | 'hardenedDieBlank'
  | 'signalImprintDie'
  | 'computationImprintDie'
  | 'structuralImprintDie'
  | 'siliconImprintDie'
  | 'printedSignalCircuit'
  | 'printedComputationCircuit'
  | 'printedStructuralCircuit'
  | 'printedSilicon'
  | 'signalProcessor'
  | 'computationProcessor'
  | 'structuralProcessor'
  | 'blankRecipeCard'

export type MachineId =
  | 'furnace'
  | 'well'
  | 'steamBoiler'
  | 'steamTank'
  | 'steelTank'
  | 'standardChest'
  | 'hopper'
  | 'copperPipe'
  | 'bronzePipe'
  | 'ironPipe'
  | 'itemConductor'
  | 'fluidConductor'
  | 'conductorBundle'
  | 'fabricationCable'
  | 'steamMacerator'
  | 'steamForgeHammer'
  | 'steamCompressor'
  | 'steamExtractor'
  | 'steamAlloySmelter'
  | 'steamFurnace'
  | 'steamAutoMiner'
  | 'steamTurbine'
  | 'tinCable'
  | 'tinCable2A'
  | 'tinCable4A'
  | 'tinCable8A'
  | 'lvBatteryBuffer'
  | 'lvBatteryBuffer2A'
  | 'lvBatteryBuffer4A'
  | 'lvBatteryBuffer8A'
  | 'liquidSteamBoiler'
  | 'lvMacerator'
  | 'lvForgeHammer'
  | 'lvCompressor'
  | 'lvExtractor'
  | 'lvAlloySmelter'
  | 'lvFurnace'
  | 'lvWiremill'
  | 'lvBender'
  | 'lvLathe'
  | 'lvElectrolyzer'
  | 'lvAssembler'
  | 'lvMixer'
  | 'lvCentrifuge'
  | 'lvCanner'
  | 'lvAutoMiner'
  | 'lvChemicalReactor'
  | 'lvAirCollector'
  | 'reachGateCasing'
  | 'reachGate'
  | 'lvEnergyHatch2A'
  | 'lvInputBus'
  | 'lvOutputBus'
  | 'lvFluidInputHatch'
  | 'lvFluidOutputHatch'
  | 'cokeOvenPart'
  | 'cokeOven'
  | 'brickedBlastFurnacePart'
  | 'brickedBlastFurnace'
  | 'arcBlastFurnacePart'
  | 'arcBlastFurnace'
  | 'crystalEnergizer'
  | 'circuitImprinter'
  | 'recipeEncoder'
  | 'jobInterface'
  | 'autoFabricator'
  | 'fluidStorageLink'
  | 'planningController'
  | 'memoryModule'
  | 'dispatchModule'

export type QuestId =
  | 'punchTree'
  | 'craftPlanks'
  | 'craftSticks'
  | 'craftAxe'
  | 'chopFaster'
  | 'mineStone'
  | 'craftShovelQuest'
  | 'buildFurnace'
  | 'craftMortar'
  | 'firstDirt'
  | 'copperAndTin'
  | 'bronzeAge'
  | 'gatherClay'
  | 'makeBricks'
  | 'buildFoundation'
  | 'buildWell'
  | 'transferWaterBucketQuest'
  | 'craftSteamCasingQuest'
  | 'makeSteam'
  | 'pipeSteam'
  | 'storageAutomationQuest'
  | 'steamMaceratorQuest'
  | 'steamForgeHammerQuest'
  | 'steamCompressorQuest'
  | 'steamExtractorQuest'
  | 'steamPressureReserveQuest'
  | 'steamOrePrepQuest'
  | 'steamUtilityBranch'
  | 'treeTapQuest'
  | 'cokeOvenBrickQuest'
  | 'cokeOvenQuest'
  | 'cokeOvenDrainQuest'
  | 'creosoteQuest'
  | 'firebrickQuest'
  | 'bbfCasingsQuest'
  | 'buildBbfQuest'
  | 'firstSteel'
  | 'steelPlateQuest'
  | 'steelTankQuest'
  | 'findRedstone'
  | 'smeltRedAlloy'
  | 'cutRedAlloyWireQuest'
  | 'extractRubberQuest'
  | 'insulateWireQuest'
  | 'makeGlassTubes'
  | 'makeCarbonDustQuest'
  | 'makeResistors'
  | 'makeVacuumTubes'
  | 'pulpWoodQuest'
  | 'pressCircuitBoard'
  | 'firstLvCircuit'
  | 'circuitStockpileQuest'
  | 'buildSteamTurbineQuest'
  | 'makeTinCableQuest'
  | 'routeLvPowerQuest'
  | 'makeSteelMechanicsQuest'
  | 'makeLvMotorQuest'
  | 'makeLvMotionPartsQuest'
  | 'bufferLvPowerQuest'
  | 'makeDiamondPickQuest'
  | 'gatherBatteryMineralsQuest'
  | 'makeEmptyBatteryCellQuest'
  | 'buildLvCannerQuest'
  | 'fillLvBatteryQuest'
  | 'buildTwoAmpCableQuest'
  | 'buildFourAmpCableQuest'
  | 'buildFourAmpBufferQuest'
  | 'creosoteBoilerQuest'
  | 'buildLvWiremillQuest'
  | 'runLvWiremillQuest'
  | 'runLvBenderQuest'
  | 'buildLvLatheQuest'
  | 'runLvLatheQuest'
  | 'buildLvCentrifugeQuest'
  | 'centrifugeByproductsQuest'
  | 'buildLvElectrolyzerQuest'
  | 'findNickelQuest'
  | 'makeCupronickelQuest'
  | 'makeHeatingCoilsQuest'
  | 'makeInvarQuest'
  | 'craftArcControllerQuest'
  | 'craftArcItemBusesQuest'
  | 'craftArcEnergyHatchesQuest'
  | 'buildLvAssemblerForPortsQuest'
  | 'craftArcFluidHatchesQuest'
  | 'findBauxiteQuest'
  | 'makeAluminiumDustQuest'
  | 'buildArcBlastFurnaceQuest'
  | 'bufferArcBlastFurnaceQuest'
  | 'firstAluminiumQuest'
  | 'buildConductorsQuest'
  | 'buildLvAutoMinerQuest'
  | 'craftSurveyKitQuest'
  | 'encodeCoalSurveyCardQuest'
  | 'gatherObsidianQuest'
  | 'craftReachGateQuest'
  | 'formReachGateQuest'
  | 'gatherSulfurQuest'
  | 'encodeSulfurSurveyCardQuest'
  | 'makeSulfurDustQuest'
  | 'craftSteelCellsQuest'
  | 'transferLiquidRubberCellQuest'
  | 'buildChemicalReactorQuest'
  | 'makeLiquidRubberQuest'
  | 'insulateWithLiquidRubberQuest'
  | 'cureLiquidRubberQuest'
  | 'separateStickyResinQuest'
  | 'useGlueQuest'
  | 'buildAirCollectorQuest'
  | 'separateAirQuest'
  | 'routeSeparatedGasesQuest'
  | 'makeSulfuricAcidQuest'
  | 'diluteSulfuricAcidQuest'
  | 'etchCircuitBoardsQuest'
  | 'runGasArcRecipesQuest'
  | 'findGoldQuest'
  | 'findResonantQuartzQuest'
  | 'findVoidQuartzQuest'
  | 'buildLvMixerQuest'
  | 'makePhaseCrystalQuest'
  | 'makeSiliconQuest'
  | 'buildCircuitImprinterQuest'
  | 'makeProcessorDiesQuest'
  | 'makeProcessorsQuest'
  | 'encodeRecipeCardQuest'
  | 'formPlanningRackQuest'
  | 'runFabricationJobQuest'

export type QuestChapterId = 'gettingStarted' | 'stoneAndFire' | 'steamAge' | 'cokeAndSteel' | 'lvFoundations' | 'blastPrep' | 'lvAge' | 'multiblocks' | 'shatteredReach' | 'mvFoundations'

export type Tier = 'manual' | 'bronze' | 'steam' | 'lv' | 'mv'

export type StationType = 'hand' | 'furnace' | 'steam' | 'lv'

export type RecipeType = 'crafting' | 'processing' | 'machine'

export type ResourceCategory =
  | 'raw'
  | 'tool'
  | 'fuel'
  | 'fluid'
  | 'ingot'
  | 'dust'
  | 'plate'
  | 'rod'
  | 'wire'
  | 'component'
  | 'machinePart'
  | 'circuit'

export type ResourceSpec = {
  id: ResourceId
  label: string
  category: ResourceCategory
  tier: Tier
  iconKey?: string
  sortGroup?: string
}

export type MachineProcessKind =
  | 'none'
  | 'furnace'
  | 'waterSource'
  | 'steamBoiler'
  | 'steamStorage'
  | 'itemStorage'
  | 'itemHopper'
  | 'steamPipe'
  | 'steamProcess'
  | 'steamToEu'
  | 'euStorage'
  | 'euCable'
  | 'euProcess'
  | 'euBlastProcess'
  | 'liquidSteamBoiler'
  | 'cokeOven'
  | 'blastFurnace'
  | 'euHatch'
  | 'itemBus'
  | 'fluidHatch'
  | 'itemConductor'
  | 'fluidConductor'
  | 'conductorBundle'
  | 'fabricationCable'
  | 'fabricationInterface'
  | 'fabricationController'
  | 'fabricationModule'

export type ToolId =
  | 'bareHand'
  | 'woodenAxe'
  | 'woodenPickaxe'
  | 'woodenShovel'
  | 'stoneAxe'
  | 'stonePickaxe'
  | 'stoneShovel'
  | 'ironAxe'
  | 'ironPickaxe'
  | 'diamondAxe'
  | 'diamondPickaxe'
  | 'diamondShovel'
  | 'ironShovel'
  | 'treeTap'

export type GatherTargetId =
  | 'tree'
  | 'rubberTree'
  | 'stone'
  | 'clayPatch'
  | 'sandPatch'
  | 'gravelPatch'
  | 'ironVein'
  | 'copperVein'
  | 'tinVein'
  | 'nickelVein'
  | 'bauxiteVein'
  | 'redstoneVein'
  | 'coalSeam'
  | 'diamondVein'
  | 'leadVein'
  | 'saltDeposit'
  | 'obsidianDeposit'
  | 'sulfurVent'
  | 'goldVein'
  | 'resonantQuartzSeam'
  | 'voidQuartzOutcrop'

export type FluidId =
  | 'water'
  | 'creosote'
  | 'liquidRubber'
  | 'glue'
  | 'air'
  | 'oxygen'
  | 'nitrogen'
  | 'sulfuricAcid'
  | 'dilutedSulfuricAcid'

export type FluidContainerKind = 'bucket' | 'steelCell'

export type FluidContainerInstance = {
  uid: string
  kind: FluidContainerKind
  fluidId: FluidId
  amountLitres: number
}

export type MachineFluidBufferSpec = {
  id: string
  label: string
  capacityLitres: number
  access: 'input' | 'output' | 'both'
  fluidRule: 'any' | 'recipe-inputs' | 'recipe-outputs' | FluidId[]
}

export type EquipmentSlotId = 'helmet' | 'chestplate' | 'leggings' | 'boots' | 'axe' | 'shovel' | 'pickaxe' | 'weapon'

export type EquipmentState = Record<EquipmentSlotId, ResourceId | null>

export type CraftSlot = {
  id: ResourceId
  ghost?: boolean
  amount?: number
} | null

export type ResourceAmount = {
  id: ResourceId
  amount: number
}

export type ProcessSlot = ResourceAmount | null

export type MachineAmount = {
  id: MachineId
  amount: number
}

export type FluidAmount = {
  id: FluidId
  amount: number
  bufferId?: string
}

export type RecipeCardKind = 'crafting' | 'processing'

export type RecipeCardInstance = {
  uid: string
  kind: RecipeCardKind
  name: string
  recipeId?: string
  targetMachineId?: MachineId
  programNumber: number
  itemInputs: ResourceAmount[]
  fluidInputs: FluidAmount[]
  itemOutputs: ResourceAmount[]
  fluidOutputs: FluidAmount[]
  installedInUid?: string
}

export type FabricationInterfaceAttachment = {
  uid: string
  direction: PipeDirection
  installedRecipeCardUids: string[]
  priority: number
}

export type FabricationJobStatus = 'queued' | 'running' | 'blocked' | 'complete' | 'cancelled'

export type FabricationStep = {
  uid: string
  cardUid: string
  batches: number
  completedBatches: number
  interfaceUid?: string
  targetUid?: string
  dispatched: boolean
}

export type FabricationJob = {
  uid: string
  cardUid: string
  requestedOutput: ResourceAmount
  batches: number
  completedBatches: number
  status: FabricationJobStatus
  blockedReason?: string
  controllerUid?: string
  interfaceUid?: string
  reservedItems: ResourceAmount[]
  reservedFluids: FluidAmount[]
  steps: FabricationStep[]
  progressMs: number
  createdAt: number
}

export type Recipe = {
  id: string
  name: string
  description: string
  tier: Tier
  stationType?: StationType
  recipeType?: RecipeType
  pattern?: (ResourceId | null)[]
  durationMs: number
  steamCostLitres?: number
  euCost?: number
  inputs: ResourceAmount[]
  outputs: ResourceAmount[]
  catalysts?: ResourceAmount[]
  durabilityCosts?: ResourceAmount[]
  machineInputs?: MachineAmount[]
  machineOutputs?: MachineAmount[]
  fluidInputs?: FluidAmount[]
  fluidOutputs?: FluidAmount[]
  surveyCardOutput?: GatherTargetId
  requiredMachine?: MachineId
  unlockedBy?: QuestId
}

export type FuelDefinition = {
  id: ResourceId
  burnMs: number
}

export type ProcessRecipe = {
  id: string
  name: string
  description: string
  tier: Tier
  machineId: MachineId
  durationMs: number
  steamCostLitres?: number
  euCost?: number
  requiredEuAmps?: number
  input: ResourceAmount
  secondaryInput?: ResourceAmount
  fuelInput?: ResourceAmount
  extraInputs?: ResourceAmount[]
  fluidInput?: FluidAmount
  fluidInputs?: FluidAmount[]
  minimumEuStored?: number
  startupEu?: number
  output?: ResourceAmount
  secondaryOutput?: ResourceAmount
  machineOutput?: MachineAmount
  fluidOutput?: FluidAmount
  fluidOutputs?: FluidAmount[]
  programNumber?: number
  autoSelectable?: boolean
  fluidOnly?: boolean
}

export type Quest = {
  id: QuestId
  chapterId?: QuestChapterId
  chapter: string
  title: string
  description: string
  kind?: 'main' | 'optional' | 'gate'
  position?: {
    x: number
    y: number
  }
  icon?: QuestIcon
  prerequisites?: QuestId[]
  objectives?: QuestObjective[]
  requirements: {
    resources?: ResourceAmount[]
    machines?: MachineAmount[]
    surveyCards?: Array<{ id: GatherTargetId; amount: number }>
    recipes?: Array<{ id: string; amount: number }>
    fluidTransfers?: Array<{
      direction: 'fill' | 'drain'
      kind: FluidContainerKind | 'any'
      fluidId: FluidId
      amountLitres: number
      machineId?: MachineId
    }>
  }
  rewards: {
    resources?: ResourceAmount[]
    machines?: MachineAmount[]
    unlocks?: QuestId[]
    scrip?: number
  }
}

export type QuestChapter = {
  id: QuestChapterId
  title: string
  description: string
}

export type ShopAge = 'gettingStarted' | 'steamAge' | 'lvAge'

export type ShopItem = {
  id: ResourceId
  age: ShopAge
  buyPrice: number
}

export type SellItem = {
  id: ResourceId
  sellPrice: number
}

export type QuestIcon =
  | { type: 'resource'; id: ResourceId }
  | { type: 'machine'; id: MachineId }
  | { type: 'gather'; id: GatherTargetId }

export type QuestObjective =
  | { type: 'resource'; id: ResourceId; amount: number; label?: string; progressMode?: 'current' | 'lifetime' }
  | { type: 'machine'; id: MachineId; amount: number; label?: string; progressMode?: 'current' | 'lifetime' }
  | { type: 'surveyCard'; id: GatherTargetId; amount: number; label?: string }
  | { type: 'recipe'; id: string; amount: number; label?: string }
  | { type: 'recipeAny'; ids: string[]; amount: number; label: string }
  | { type: 'placedMachine'; id: MachineId; amount: number; label?: string }
  | { type: 'installedBattery'; id: MachineId; amount: number; label?: string }
  | { type: 'factoryFoundation'; level: number; label?: string }
  | { type: 'fluidTransfer'; direction: 'fill' | 'drain'; kind: FluidContainerKind | 'any'; fluidId: FluidId; amountLitres: number; machineId?: MachineId; label?: string }
  | { type: 'fabrication'; id: 'cardEncoded' | 'rackFormed' | 'jobComplete'; amount: number; label?: string }

export type Machine = {
  id: MachineId
  name: string
  description: string
  tier: Tier
  produces?: ResourceAmount[]
  consumes?: ResourceAmount[]
  intervalMs?: number
  unlockedBy?: QuestId
}

export type MachineSpec = Machine & {
  placeable: boolean
  glyphKey?: string
  processKind: MachineProcessKind
  pipeTransferLitresPerSecond?: number
  steamCapacityLitres?: number
  fluidCapacityLitres?: number
  fluidOutputLitresPerSecond?: number
  fluidBuffers?: MachineFluidBufferSpec[]
  itemOutputSlots?: 1 | 2
  euCapacity?: number
  euOutputPerSecond?: number
  euAmps?: number
  euCableLossPerTile?: number
  multiblock?: {
    width: number
    height: number
    controller: MachineId
    part: MachineId
    controllerOffsetX?: number
    controllerOffsetY?: number
  }
}

export type Tool = {
  id: ToolId
  name: string
  description: string
  damageByTarget: Partial<Record<GatherTargetId, number>>
}

export type GatherTarget = {
  id: GatherTargetId
  name: string
  description: string
  maxHp: number
  drops: ResourceAmount[]
  preferredTool: ToolId
  area?: 'forest' | 'lake' | 'mine' | 'shatteredReach'
  autoMinerProfile?: 'basic' | 'survey'
}

export type GameState = {
  version: number
  resources: Record<ResourceId, number>
  machines: Record<MachineId, number>
  machineInstances: MachineInstance[]
  bucketFluid: BucketFluidState | null
  fluidContainers: FluidContainerInstance[]
  fluidTransferMilestones: Record<string, number>
  factoryFoundationLevel: number
  scrip: number
  shopCooldowns: Partial<Record<ResourceId, number>>
  completedQuests: QuestId[]
  claimedQuests: QuestId[]
  unlockedQuests: QuestId[]
  craftedResources: ResourceId[]
  discoveredResources: ResourceId[]
  resourceMilestones: Partial<Record<ResourceId, number>>
  machineMilestones: Partial<Record<MachineId, number>>
  equipment: EquipmentState
  durability: Partial<Record<ResourceId, number>>
  gatherProgress: Partial<Record<GatherTargetId, number>>
  autoMinerAssignments: Record<string, GatherTargetId>
  surveyCards: Partial<Record<GatherTargetId, number>>
  recipeMilestones: Partial<Record<string, number>>
  machineProgress: Partial<Record<MachineId, number>>
  recipeCards: RecipeCardInstance[]
  fabricationJobs: FabricationJob[]
  migrationNotices: string[]
  lastSavedAt: number
  lastSavedAtVerified: boolean
}

export type OfflineProgressReason = 'new-save' | 'missing-save-time' | 'unverified-save-time' | 'negative-clock' | 'clock-jump' | 'no-elapsed-time' | 'applied'

export type OfflineProgressResult = {
  applied: boolean
  elapsedMs: number
  simulatedMs: number
  capped: boolean
  suspicious: boolean
  reason: OfflineProgressReason
  resourceDelta: ResourceAmount[]
  questCompletions: QuestId[]
}

export type ProcessSlotId =
  | 'input'
  | 'secondaryInput'
  | 'extraInput1'
  | 'extraInput2'
  | 'extraInput3'
  | 'extraInput4'
  | 'fuel'
  | 'output'
  | 'output2'
export type PipeDirection = 'north' | 'east' | 'south' | 'west'
export type PipeSideMode = 'both' | 'input' | 'output' | 'blocked'
export type ConductorChannel = 0 | 1 | 2 | 3

export type ConductorFaceSettings = {
  mode: PipeSideMode
  channel: ConductorChannel
  priority: number
  roundRobin: boolean
  selfFeed: boolean
}

export type BucketFluidState = {
  id: FluidId
  amount: number
}

export type MachineProcessState = {
  input: ProcessSlot
  secondaryInput: ProcessSlot
  extraInput1: ProcessSlot
  extraInput2: ProcessSlot
  extraInput3: ProcessSlot
  extraInput4: ProcessSlot
  fuel: ProcessSlot
  output: ProcessSlot
  output2: ProcessSlot
  machineOutput: MachineAmount | null
  storageSlots: ProcessSlot[]
  batterySlots: Array<ResourceId | null>
  activeRecipeId: string | null
  configuredProgramNumber: number
  configuredRecipeId?: string | null
  progressMs: number
  durationMs: number
  fuelRemainingMs: number
  fuelDurationMs: number
  miningDamage: number
  steamStoredMs: number
  steamCapacityMs: number
  steamFlowLitresPerSecond?: number
  euStored: number
  euCapacity: number
  euFlowPerSecond?: number
  euInputPerSecond?: number
  euOutputPerSecond?: number
  fluids: Partial<Record<FluidId, number>>
  fluidCapacityLitres: number
  fluidFlowLitresPerSecond?: number
  fluidFlowFluidId?: FluidId
}

export type MachineInstance = {
  uid: string
  machineId: MachineId
  x: number
  y: number
  level: number
  pipeDisabledSides?: Partial<Record<PipeDirection, boolean>>
  pipeSideModes?: Partial<Record<PipeDirection, PipeSideMode>>
  conductorItemFaces?: Partial<Record<PipeDirection, ConductorFaceSettings>>
  conductorFluidFaces?: Partial<Record<PipeDirection, ConductorFaceSettings>>
  conductorItemRoundRobinCursor?: number
  conductorFluidRoundRobinCursor?: number
  fabricationCableInstalled?: boolean
  fabricationInterfaces?: Partial<Record<PipeDirection, FabricationInterfaceAttachment>>
  itemOutputDirection?: PipeDirection
  itemTransferProgressMs?: number
  installedRecipeCardUids?: string[]
  fabricationPriority?: number
  fabricationFace?: PipeDirection
  surveyCardTarget?: GatherTargetId
  process: MachineProcessState
}

export type TickResult = {
  state: GameState
  machineOutputs: ResourceAmount[]
  questCompletions: QuestId[]
}
