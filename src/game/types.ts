export type ResourceId =
  | 'log'
  | 'plank'
  | 'stick'
  | 'woodenAxe'
  | 'stone'
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

export type ToolId = 'bareHand' | 'woodenAxe'

export type GatherTargetId = 'tree'

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
  hardness: number
  drops: ResourceAmount[]
  preferredTool: ToolId
}

export type ActiveCraft = {
  recipeId: string
  startedAt: number
  remainingMs: number
  durationMs: number
}

export type GameState = {
  version: number
  resources: Record<ResourceId, number>
  machines: Record<MachineId, number>
  completedQuests: QuestId[]
  unlockedQuests: QuestId[]
  activeCrafts: ActiveCraft[]
  gatherProgress: Partial<Record<GatherTargetId, number>>
  machineProgress: Partial<Record<MachineId, number>>
  lastSavedAt: number
}

export type TickResult = {
  state: GameState
  completedCrafts: string[]
  machineOutputs: ResourceAmount[]
}
