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
  | 'redstoneDust'
  | 'crushedIronOre'
  | 'crushedCopperOre'
  | 'crushedTinOre'
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
  | 'bronzeIngot'
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
  | 'lvWiremill'
  | 'lvAutoMiner'
  | 'cokeOven'
  | 'brickedBlastFurnacePart'
  | 'brickedBlastFurnace'

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
  | 'makeSteam'
  | 'pipeSteam'
  | 'steamMaceratorQuest'
  | 'steamForgeHammerQuest'
  | 'steamUtilityBranch'
  | 'treeTapQuest'
  | 'cokeOvenQuest'
  | 'creosoteQuest'
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
  | 'buildLvWiremillQuest'
  | 'runLvWiremillQuest'

export type QuestChapterId = 'gettingStarted' | 'stoneAndFire' | 'steamAge' | 'cokeAndSteel' | 'lvFoundations'

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
  | 'euCable'
  | 'euProcess'
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
  }
}

export type QuestChapter = {
  id: QuestChapterId
  title: string
  description: string
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
  completedQuests: QuestId[]
  claimedQuests: QuestId[]
  unlockedQuests: QuestId[]
  craftedResources: ResourceId[]
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
