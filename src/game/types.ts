export type ResourceId =
  | 'log'
  | 'plank'
  | 'stick'
  | 'woodenAxe'
  | 'woodenPickaxe'
  | 'stone'
  | 'cobblestone'
  | 'crushedStone'
  | 'copperOre'
  | 'tinOre'
  | 'coal'
  | 'clay'
  | 'sand'
  | 'rubberSap'
  | 'water'
  | 'copperPlate'
  | 'tinPlate'
  | 'copperWire'
  | 'bronzeBlend'
  | 'firebrick'
  | 'steamCasing'
  | 'basicBoard'
  | 'conductiveWire'
  | 'primitiveCircuit'

export type MachineId =
  | 'workbench'
  | 'furnace'
  | 'steamBoiler'
  | 'steamHammer'
  | 'steamGrinder'
  | 'steamAssembler'
  | 'lvGenerator'
  | 'slowOreTap'

export type QuestId =
  | 'punchTree'
  | 'craftPlanks'
  | 'craftSticks'
  | 'craftAxe'
  | 'chopFaster'
  | 'firstDirt'
  | 'copperAndTin'
  | 'bronzeAge'
  | 'pressureProgress'
  | 'steamWorkshop'
  | 'firstCurrent'

export type Tier = 'manual' | 'bronze' | 'steam' | 'lv'

export type StationType = 'hand' | 'craftingTable' | 'furnace' | 'steam' | 'lv'

export type RecipeType = 'crafting' | 'processing' | 'machine'

export type ToolId = 'bareHand' | 'woodenAxe' | 'woodenPickaxe'

export type GatherTargetId = 'tree' | 'stone'

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
  machineInputs?: MachineAmount[]
  machineOutputs?: MachineAmount[]
  requiredMachine?: MachineId
  unlockedBy?: QuestId
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
  completedQuests: QuestId[]
  unlockedQuests: QuestId[]
  equipment: EquipmentState
  gatherProgress: Partial<Record<GatherTargetId, number>>
  machineProgress: Partial<Record<MachineId, number>>
  lastSavedAt: number
}

export type TickResult = {
  state: GameState
  machineOutputs: ResourceAmount[]
}
