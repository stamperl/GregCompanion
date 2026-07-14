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
  | 'diamondPickaxe'
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
  | 'redstoneDust'
  | 'crushedIronOre'
  | 'crushedCopperOre'
  | 'crushedTinOre'
  | 'crushedBauxiteOre'
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
  | 'bronzeIngot'
  | 'nickelIngot'
  | 'cupronickelIngot'
  | 'invarIngot'
  | 'aluminiumIngot'
  | 'clay'
  | 'sand'
  | 'rubberSap'
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

export type MachineId =
  | 'furnace'
  | 'well'
  | 'steamBoiler'
  | 'steamTank'
  | 'standardChest'
  | 'hopper'
  | 'copperPipe'
  | 'bronzePipe'
  | 'ironPipe'
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
  | 'lvCentrifuge'
  | 'lvCanner'
  | 'lvAutoMiner'
  | 'lvChemicalReactor'
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
  | 'factoryToolsQuest'
  | 'storageAutomationQuest'
  | 'steamMaceratorQuest'
  | 'steamForgeHammerQuest'
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
  | 'buildLvBenderQuest'
  | 'runLvBenderQuest'
  | 'buildLvLatheQuest'
  | 'runLvLatheQuest'
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

export type QuestChapterId = 'gettingStarted' | 'stoneAndFire' | 'steamAge' | 'cokeAndSteel' | 'lvFoundations' | 'blastPrep' | 'lvAge' | 'multiblocks' | 'shatteredReach'

export type Tier = 'manual' | 'bronze' | 'steam' | 'lv'

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
  | 'diamondPickaxe'
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

export type FluidId = 'water' | 'creosote' | 'liquidRubber'

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
  minimumEuStored?: number
  startupEu?: number
  output: ResourceAmount
  machineOutput?: MachineAmount
  fluidOutput?: FluidAmount
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
      kind: FluidContainerKind
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
  | { type: 'placedMachine'; id: MachineId; amount: number; label?: string }
  | { type: 'factoryFoundation'; level: number; label?: string }
  | { type: 'fluidTransfer'; direction: 'fill' | 'drain'; kind: FluidContainerKind; fluidId: FluidId; amountLitres: number; machineId?: MachineId; label?: string }

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
  migrationNotices: string[]
  lastSavedAt: number
}

export type OfflineProgressReason = 'new-save' | 'missing-save-time' | 'negative-clock' | 'clock-jump' | 'no-elapsed-time' | 'applied'

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

export type ProcessSlotId = 'input' | 'secondaryInput' | 'extraInput1' | 'extraInput2' | 'extraInput3' | 'extraInput4' | 'fuel' | 'output'
export type PipeDirection = 'north' | 'east' | 'south' | 'west'
export type PipeSideMode = 'both' | 'input' | 'output' | 'blocked'

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
  storageSlots: ProcessSlot[]
  batterySlots: Array<ResourceId | null>
  activeRecipeId: string | null
  progressMs: number
  durationMs: number
  fuelRemainingMs: number
  fuelDurationMs: number
  miningDamage: number
  steamStoredMs: number
  steamCapacityMs: number
  euStored: number
  euCapacity: number
  fluids: Partial<Record<FluidId, number>>
  fluidCapacityLitres: number
}

export type MachineInstance = {
  uid: string
  machineId: MachineId
  x: number
  y: number
  level: number
  pipeDisabledSides?: Partial<Record<PipeDirection, boolean>>
  pipeSideModes?: Partial<Record<PipeDirection, PipeSideMode>>
  itemOutputDirection?: PipeDirection
  itemTransferProgressMs?: number
  surveyCardTarget?: GatherTargetId
  process: MachineProcessState
}

export type TickResult = {
  state: GameState
  machineOutputs: ResourceAmount[]
  questCompletions: QuestId[]
}
