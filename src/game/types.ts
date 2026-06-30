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
  | 'ironWrench'
  | 'bronzeWrench'
  | 'stone'
  | 'cobblestone'
  | 'gravel'
  | 'flint'
  | 'ironOre'
  | 'copperOre'
  | 'tinOre'
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
  | 'copperWire'
  | 'bronzeBlend'
  | 'steamCasing'
  | 'cokeOvenBrick'
  | 'firebrick'
  | 'bbfCasing'
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
  | 'cokeOven'
  | 'brickedBlastFurnacePart'
  | 'brickedBlastFurnace'

export type QuestId =
  | 'punchTree'
  | 'craftPlanks'
  | 'craftSticks'
  | 'craftAxe'
  | 'chopFaster'
  | 'firstDirt'
  | 'copperAndTin'
  | 'bronzeAge'

export type Tier = 'manual' | 'bronze' | 'steam' | 'lv'

export type StationType = 'hand' | 'furnace' | 'steam' | 'lv'

export type RecipeType = 'crafting' | 'processing' | 'machine'

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
  input: ResourceAmount
  fuelInput?: ResourceAmount
  output: ResourceAmount
  fluidOutput?: {
    id: FluidId
    amount: number
  }
}

export type Quest = {
  id: QuestId
  chapter: string
  title: string
  description: string
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
  unlockedQuests: QuestId[]
  craftedResources: ResourceId[]
  equipment: EquipmentState
  durability: Partial<Record<ResourceId, number>>
  gatherProgress: Partial<Record<GatherTargetId, number>>
  machineProgress: Partial<Record<MachineId, number>>
  lastSavedAt: number
}

export type ProcessSlotId = 'input' | 'fuel' | 'output'

export type MachineProcessState = {
  input: ProcessSlot
  fuel: ProcessSlot
  output: ProcessSlot
  activeRecipeId: string | null
  progressMs: number
  durationMs: number
  fuelRemainingMs: number
  fuelDurationMs: number
  steamStoredMs: number
  steamCapacityMs: number
  fluids: Partial<Record<FluidId, number>>
  fluidCapacityLitres: number
}

export type MachineInstance = {
  uid: string
  machineId: MachineId
  x: number
  y: number
  level: number
  process: MachineProcessState
}

export type TickResult = {
  state: GameState
  machineOutputs: ResourceAmount[]
}
