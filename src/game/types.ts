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
  | 'aluminiumPlate'
  | 'steelRod'
  | 'tinWire'
  | 'tinCable'
  | 'copperWire'
  | 'glass'
  | 'glassTube'
  | 'woodPulp'
  | 'carbonDust'
  | 'redAlloyIngot'
  | 'redAlloyPlate'
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

export type MachineId =
  | 'furnace'
  | 'well'
  | 'steamBoiler'
  | 'steamTank'
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
  | 'lvBatteryBuffer'
  | 'liquidSteamBoiler'
  | 'lvWiremill'
  | 'lvBender'
  | 'lvLathe'
  | 'lvElectrolyzer'
  | 'lvAssembler'
  | 'lvCentrifuge'
  | 'lvAutoMiner'
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
  | 'buildFurnace'
  | 'craftMortar'
  | 'firstDirt'
  | 'copperAndTin'
  | 'bronzeAge'
  | 'gatherClay'
  | 'makeBricks'
  | 'buildFoundation'
  | 'buildWell'
  | 'craftSteamCasingQuest'
  | 'makeSteam'
  | 'pipeSteam'
  | 'steamMaceratorQuest'
  | 'steamForgeHammerQuest'
  | 'steamOrePrepQuest'
  | 'steamUtilityBranch'
  | 'treeTapQuest'
  | 'cokeOvenBrickQuest'
  | 'cokeOvenQuest'
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
  | 'bufferLvPowerQuest'
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
  | 'findBauxiteQuest'
  | 'makeAluminiumDustQuest'
  | 'buildArcBlastFurnaceQuest'
  | 'bufferArcBlastFurnaceQuest'
  | 'firstAluminiumQuest'

export type QuestChapterId = 'gettingStarted' | 'stoneAndFire' | 'steamAge' | 'cokeAndSteel' | 'lvFoundations' | 'blastPrep' | 'lvAge' | 'multiblocks'

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

export type FluidId = 'water' | 'creosote'

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

export type Recipe = {
  id: string
  name: string
  description: string
  tier: Tier
  stationType?: StationType
  recipeType?: RecipeType
  pattern?: (ResourceId | null)[]
  durationMs: number
  inputs: ResourceAmount[]
  outputs: ResourceAmount[]
  catalysts?: ResourceAmount[]
  durabilityCosts?: ResourceAmount[]
  machineInputs?: MachineAmount[]
  machineOutputs?: MachineAmount[]
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
  input: ResourceAmount
  secondaryInput?: ResourceAmount
  fuelInput?: ResourceAmount
  fluidInput?: {
    id: FluidId
    amount: number
  }
  minimumEuStored?: number
  startupEu?: number
  output: ResourceAmount
  fluidOutput?: {
    id: FluidId
    amount: number
  }
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
  | { type: 'resource'; id: ResourceId; amount: number; label?: string }
  | { type: 'machine'; id: MachineId; amount: number; label?: string }
  | { type: 'placedMachine'; id: MachineId; amount: number; label?: string }
  | { type: 'factoryFoundation'; level: number; label?: string }

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
  euCapacity?: number
  euOutputPerSecond?: number
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
}

export type GameState = {
  version: number
  resources: Record<ResourceId, number>
  machines: Record<MachineId, number>
  machineInstances: MachineInstance[]
  factoryFoundationLevel: number
  scrip: number
  shopCooldowns: Partial<Record<ResourceId, number>>
  completedQuests: QuestId[]
  claimedQuests: QuestId[]
  unlockedQuests: QuestId[]
  craftedResources: ResourceId[]
  discoveredResources: ResourceId[]
  equipment: EquipmentState
  durability: Partial<Record<ResourceId, number>>
  gatherProgress: Partial<Record<GatherTargetId, number>>
  autoMinerAssignments: Record<string, GatherTargetId>
  machineProgress: Partial<Record<MachineId, number>>
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

export type ProcessSlotId = 'input' | 'secondaryInput' | 'fuel' | 'output'
export type PipeDirection = 'north' | 'east' | 'south' | 'west'

export type MachineProcessState = {
  input: ProcessSlot
  secondaryInput: ProcessSlot
  fuel: ProcessSlot
  output: ProcessSlot
  activeRecipeId: string | null
  progressMs: number
  durationMs: number
  fuelRemainingMs: number
  fuelDurationMs: number
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
  process: MachineProcessState
}

export type TickResult = {
  state: GameState
  machineOutputs: ResourceAmount[]
  questCompletions: QuestId[]
}
