import {
  createInitialState,
  fuelDefinitions,
  fluidLabels,
  fluidIds,
  gatherTargets,
  initialEquipment,
  initialMachines,
  initialResources,
  canAutoMinerTarget,
  isAutoMinerMachine,
  isEuBlastMachine,
  isEuCableMachine,
  isEuHatchMachine,
  isEuNetworkMachine,
  isEuPoweredMachine,
  isEuProducerMachine,
  isEuStorageMachine,
  isItemBusMachine,
  isItemHopperMachine,
  isItemStorageMachine,
  isLiquidSteamBoilerMachine,
  isResourceBackedMachine,
  isSteamNetworkMachine,
  isSteamPipeMachine,
  isSteamPoweredMachine,
  isSteamStorageMachine,
  machineEuCableLossPerTile,
  machineEuCapacity,
  machineEuAmps,
  machineEuOutputPerSecond,
  machineFluidCapacityLitres,
  machineFluidOutputLitresPerSecond,
  machinePipeTransferLitresPerSecond,
  machineSteamCapacityLitres,
  machines,
  processRecipes,
  quests,
  recipes,
  resourceRegistry,
  resourceBackedMachineIds,
  resourceLabels,
  sellItems,
  shopItems,
  tools,
} from './content'
import {
  recipeMachineInputs,
  recipeMachineOutputs,
  recipeResourceInputs,
  recipeResourceOutputs,
  recipesProducingResource,
  recipesUsingResource,
} from './recipeGraph'
import type {
  CraftSlot,
  EquipmentSlotId,
  EquipmentState,
  FluidContainerInstance,
  FluidContainerKind,
  FluidId,
  GatherTargetId,
  GameState,
  MachineAmount,
  MachineId,
  MachineInstance,
  MachineProcessState,
  MachineFluidBufferSpec,
  ProcessRecipe,
  ProcessSlot,
  ProcessSlotId,
  PipeDirection,
  PipeSideMode,
  Quest,
  QuestObjective,
  QuestId,
  Recipe,
  ResourceAmount,
  ResourceId,
  OfflineProgressResult,
  SellItem,
  ShopItem,
  TickResult,
} from './types'

export const saveKey = 'block-tech-idle-save'
export const currentSaveVersion = 12
export const factoryGrid = { width: 10, height: 8 }
export const maxFactoryFoundationLevel = 6
export const factoryFoundationSizes = [
  { width: 0, height: 0 },
  { width: 7, height: 7 },
  { width: 10, height: 8 },
  { width: 12, height: 10 },
  { width: 14, height: 12 },
  { width: 16, height: 14 },
  { width: 18, height: 16 },
] as const
export const factoryFoundationCosts: Record<number, ResourceAmount[]> = {
  1: [
    { id: 'plank', amount: 16 },
    { id: 'cobblestone', amount: 24 },
  ],
  2: [
    { id: 'cobblestone', amount: 64 },
    { id: 'brick', amount: 32 },
    { id: 'ironPlate', amount: 4 },
  ],
  3: [
    { id: 'cobblestone', amount: 128 },
    { id: 'brick', amount: 64 },
    { id: 'ironPlate', amount: 12 },
  ],
  4: [
    { id: 'cobblestone', amount: 192 },
    { id: 'brick', amount: 96 },
    { id: 'ironPlate', amount: 24 },
  ],
  5: [
    { id: 'cobblestone', amount: 256 },
    { id: 'brick', amount: 128 },
    { id: 'ironPlate', amount: 32 },
    { id: 'steelPlate', amount: 8 },
  ],
  6: [
    { id: 'cobblestone', amount: 384 },
    { id: 'brick', amount: 192 },
    { id: 'steelPlate', amount: 16 },
    { id: 'aluminiumPlate', amount: 16 },
  ],
}
export const processStackLimit = 64
export const offlineProgressCapMs = 8 * 60 * 60 * 1000
export const suspiciousOfflineJumpMs = 72 * 60 * 60 * 1000
export const negativeClockToleranceMs = 5 * 60 * 1000
export const offlineSimulationChunkMs = 1000
export const steamMsPerLitre = 1000
export const boilerSteamCapacityMs = machineSteamCapacityLitres('steamBoiler') * steamMsPerLitre
export const steamMaceratorCapacityMs = machineSteamCapacityLitres('steamMacerator') * steamMsPerLitre
export const steamTankCapacityMs = machineSteamCapacityLitres('steamTank') * steamMsPerLitre
export const cokeOvenFluidCapacityLitres = machineFluidCapacityLitres('cokeOven')
export const ironTankFluidCapacityLitres = machineFluidCapacityLitres('steamTank')
export const steamMachineInternalCapacityMs = machineSteamCapacityLitres('steamMacerator') * steamMsPerLitre
export const euPerSteamLitre = 2
export const boilerSteamProductionLitresPerSecond = 12
export const wellWaterCapacityLitres = machineFluidCapacityLitres('well')
export const wellWaterProductionLitresPerSecond = 48
export const wellWaterOutputLitresPerSecond = 96
export const steamTurbineSteamUseLitresPerSecond = 16
export const steamTurbineEuCapacity = machineEuCapacity('steamTurbine')
export const lvMachineInternalEuCapacity = machineEuCapacity('lvWiremill')
export const lvEuPerAmpSecond = 32
export const sodiumBatteryEuCapacity = 2048
export const lithiumBatteryEuCapacity = 4096
export const lvBatteryEuCapacity = sodiumBatteryEuCapacity
export const lvBatteryBufferEuCapacity = machineEuCapacity('lvBatteryBuffer')
export const lvBatteryBufferOutputEuPerSecond = lvEuPerAmpSecond
export const tinCableLossEuPerTile = machineEuCableLossPerTile('tinCable')
export const liquidSteamBoilerCapacityMs = machineSteamCapacityLitres('liquidSteamBoiler') * steamMsPerLitre
export const liquidSteamBoilerFluidCapacityLitres = machineFluidCapacityLitres('liquidSteamBoiler')
export const liquidSteamBoilerSteamProductionLitresPerSecond = 36
export const liquidSteamBoilerCreosoteUseLitresPerSecond = 1
export const bucketFluidTransferLitres = 1
export const fluidContainerCapacities: Record<FluidContainerKind, number> = { bucket: 1, steelCell: 8 }
export const steamAutoMinerActionDamage = 10
export const steamAutoMinerActionMs = 5000
export const steamAutoMinerSteamUseLitres = 16
export const lvAutoMinerActionDamage = 16
export const lvAutoMinerActionMs = 4000
export const lvAutoMinerEuUse = 16

let activeSteamTransferBudgets: Map<string, number> | null = null
let activeEuTransferBudgets: Map<string, number> | null = null
let activeFluidTransferBudgets: Map<string, number> | null = null

type CachedEuNetworkEntry = { uid: string; cableDistance: number }
type CachedMultiblockCenter = {
  x: number
  y: number
  spec: NonNullable<(typeof machines)[MachineId]['multiblock']>
}
type FactoryTopologyCache = {
  signature: string
  euNetworks: Map<string, CachedEuNetworkEntry[]>
  euReachability: Map<string, Set<string>>
  euProducers: Map<string, CachedEuNetworkEntry[]>
  euSources: Map<string, CachedEuNetworkEntry[]>
  euNetworkKeys: Map<string, string>
  euNetworkCableAmps: Map<string, number>
  euNearestSourceDistances: Map<string, number>
  steamNetworks: Map<string, string[]>
  fluidNetworks: Map<string, string[]>
  fluidNetworksForInstance: Map<string, string[]>
  flowCells: Map<string, string[]>
  multiblockCenters: Map<string, CachedMultiblockCenter | null>
}
type ActiveFactoryTopology = {
  state: GameState
  byPosition: Map<string, MachineInstance>
  byUid: Map<string, MachineInstance>
  cache: FactoryTopologyCache
}

let reusableFactoryTopologyCache: FactoryTopologyCache | null = null
let activeFactoryTopology: ActiveFactoryTopology | null = null

function transferNetworkKey(prefix: string, instances: MachineInstance[]) {
  const connectorInstances = instances.filter((instance) => isSteamPipeMachine(instance.machineId) || isEuCableMachine(instance.machineId))
  const keyInstances = connectorInstances.length > 0 ? connectorInstances : instances
  return `${prefix}:${keyInstances
    .map((instance) => instance.uid)
    .sort()
    .join('|')}`
}

function consumeTickBudget(budgets: Map<string, number> | null, key: string, initialAmount: number, requested: number) {
  if (!budgets) return Math.max(0, requested)
  if (!budgets.has(key)) budgets.set(key, Math.max(0, initialAmount))
  const available = Math.max(0, budgets.get(key) ?? 0)
  return Math.min(Math.max(0, requested), available)
}

function spendTickBudget(budgets: Map<string, number> | null, key: string, amount: number) {
  if (!budgets || amount <= 0) return
  budgets.set(key, Math.max(0, (budgets.get(key) ?? 0) - amount))
}
export const steamPipeTransferLitresPerSecond = Object.fromEntries(
  (Object.keys(machines) as MachineId[])
    .map((machineId) => [machineId, machinePipeTransferLitresPerSecond(machineId)] as const)
    .filter(([, transferRate]) => transferRate > 0),
) as Partial<Record<MachineId, number>>
export function steamPipeBufferCapacityMs(machineId: MachineId) {
  const rate = steamPipeTransferLitresPerSecond[machineId] ?? 0
  return isSteamPipeMachine(machineId) ? Math.max(4, Math.ceil(rate / 4)) * steamMsPerLitre : 0
}
export function fluidPipeBufferCapacityLitres(machineId: MachineId) {
  const rate = steamPipeTransferLitresPerSecond[machineId] ?? 0
  return isSteamPipeMachine(machineId) ? Math.max(4, Math.ceil(rate / 4)) : 0
}
export function euCableBufferCapacity(machineId: MachineId) {
  return isEuCableMachine(machineId) ? Math.max(6, machineEuCapacity(machineId)) : 0
}

const durabilityMaximums: Partial<Record<ResourceId, number>> = {
  woodenAxe: 32,
  treeTap: 64,
  woodenPickaxe: 48,
  woodenShovel: 32,
  stoneAxe: 64,
  stonePickaxe: 64,
  ironAxe: 128,
  ironPickaxe: 128,
  diamondPickaxe: 384,
  ironShovel: 128,
  stoneShovel: 64,
  stoneHammer: 48,
  ironHammer: 160,
  ironFile: 96,
  bronzeFile: 160,
  ironWireCutters: 128,
  ironWrench: 128,
  bronzeWrench: 192,
  ironCrowbar: 128,
  mortar: 64,
  ironMortar: 128,
  bronzeMortar: 192,
}

const durableCostAlternatives: Partial<Record<ResourceId, ResourceId[]>> = {
  stoneHammer: ['stoneHammer', 'ironHammer'],
  mortar: ['bronzeMortar', 'ironMortar', 'mortar'],
  ironFile: ['bronzeFile', 'ironFile'],
  ironWrench: ['bronzeWrench', 'ironWrench'],
}

export const pipeDirections: PipeDirection[] = ['north', 'east', 'south', 'west']
export const pipeSideModes: PipeSideMode[] = ['blocked', 'output', 'input', 'both']
export const pipeSideModeLabels: Record<PipeSideMode, string> = {
  both: 'Both',
  output: 'Out',
  input: 'In',
  blocked: 'Closed',
}
const oppositePipeDirection: Record<PipeDirection, PipeDirection> = {
  north: 'south',
  east: 'west',
  south: 'north',
  west: 'east',
}
const pipeDirectionOffsets: Record<PipeDirection, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  east: { dx: 1, dy: 0 },
  south: { dx: 0, dy: 1 },
  west: { dx: -1, dy: 0 },
}

function emptyProcessState(): MachineProcessState {
  return {
    input: null,
    secondaryInput: null,
    extraInput1: null,
    extraInput2: null,
    extraInput3: null,
    extraInput4: null,
    fuel: null,
    output: null,
    output2: null,
    storageSlots: [],
    batterySlots: [],
    activeRecipeId: null,
    configuredRecipeId: null,
    progressMs: 0,
    durationMs: 0,
    fuelRemainingMs: 0,
    fuelDurationMs: 0,
    miningDamage: 0,
    steamStoredMs: 0,
    steamCapacityMs: 0,
    euStored: 0,
    euCapacity: 0,
    fluids: {},
    fluidCapacityLitres: 0,
  }
}

function cloneProcessSlot(slot: ProcessSlot): ProcessSlot {
  return slot ? { ...slot } : null
}

function cloneProcessState(process: MachineProcessState): MachineProcessState {
  return {
    input: cloneProcessSlot(process.input),
    secondaryInput: cloneProcessSlot(process.secondaryInput),
    extraInput1: cloneProcessSlot(process.extraInput1),
    extraInput2: cloneProcessSlot(process.extraInput2),
    extraInput3: cloneProcessSlot(process.extraInput3),
    extraInput4: cloneProcessSlot(process.extraInput4),
    fuel: cloneProcessSlot(process.fuel),
    output: cloneProcessSlot(process.output),
    output2: cloneProcessSlot(process.output2),
    storageSlots: process.storageSlots.map(cloneProcessSlot),
    batterySlots: [...process.batterySlots],
    activeRecipeId: process.activeRecipeId,
    configuredRecipeId: process.configuredRecipeId,
    progressMs: process.progressMs,
    durationMs: process.durationMs,
    fuelRemainingMs: process.fuelRemainingMs,
    fuelDurationMs: process.fuelDurationMs,
    miningDamage: process.miningDamage,
    steamStoredMs: process.steamStoredMs,
    steamCapacityMs: process.steamCapacityMs,
    euStored: process.euStored,
    euCapacity: process.euCapacity,
    fluids: { ...process.fluids },
    fluidCapacityLitres: process.fluidCapacityLitres,
  }
}

function normalizeFluidStore(fluids?: Partial<Record<FluidId, number>>) {
  return Object.fromEntries(fluidIds.map((id) => [id, normalizeLitres(fluids?.[id] ?? 0)])) as Partial<Record<FluidId, number>>
}

function normalizeLitres(amount: number) {
  return Math.max(0, Math.round((Number(amount) || 0) * 1000) / 1000)
}

function normalizeFluidContainers(parsed: unknown): FluidContainerInstance[] {
  if (!Array.isArray(parsed)) return []
  const seen = new Set<string>()
  return parsed.flatMap((entry): FluidContainerInstance[] => {
    if (!entry || typeof entry !== 'object') return []
    const candidate = entry as Partial<FluidContainerInstance>
    if (!candidate.uid || seen.has(candidate.uid) || (candidate.kind !== 'bucket' && candidate.kind !== 'steelCell') || !candidate.fluidId || !fluidIds.includes(candidate.fluidId)) return []
    const amountLitres = Math.min(fluidContainerCapacities[candidate.kind], normalizeLitres(candidate.amountLitres ?? 0))
    if (amountLitres <= 0) return []
    seen.add(candidate.uid)
    return [{ uid: candidate.uid, kind: candidate.kind, fluidId: candidate.fluidId, amountLitres }]
  })
}

function enforceSingleFluidStore(process: MachineProcessState) {
  const normalized = normalizeFluidStore(process.fluids)
  const selected = fluidIds
    .map((id) => ({ id, amount: normalized[id] ?? 0 }))
    .filter((entry) => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount)[0]
  process.fluids = normalizeFluidStore(selected ? { [selected.id]: selected.amount } : undefined)
}

function normalizeProcessSlot(slot: unknown): ProcessSlot {
  if (!slot || typeof slot !== 'object') return null
  const candidate = slot as Partial<NonNullable<ProcessSlot>>
  if (!candidate.id || !(candidate.id in resourceLabels)) return null
  const amount = Math.min(processStackLimit, Math.floor(candidate.amount ?? 0))
  return amount > 0 ? { id: candidate.id, amount } : null
}

function normalizeProcessState(process?: Partial<MachineProcessState>): MachineProcessState {
  if (!process) return emptyProcessState()
  return {
    input: normalizeProcessSlot(process.input),
    secondaryInput: normalizeProcessSlot(process.secondaryInput),
    extraInput1: normalizeProcessSlot(process.extraInput1),
    extraInput2: normalizeProcessSlot(process.extraInput2),
    extraInput3: normalizeProcessSlot(process.extraInput3),
    extraInput4: normalizeProcessSlot(process.extraInput4),
    fuel: normalizeProcessSlot(process.fuel),
    output: normalizeProcessSlot(process.output),
    output2: normalizeProcessSlot(process.output2),
    storageSlots: Array.isArray(process.storageSlots) ? process.storageSlots.map(normalizeProcessSlot).slice(0, 12) : [],
    batterySlots: Array.isArray(process.batterySlots)
      ? process.batterySlots.map((id) => (id && isBufferBatteryId(id) ? id : null)).slice(0, 8)
      : [],
    activeRecipeId: process.activeRecipeId ?? null,
    configuredRecipeId: process.configuredRecipeId ?? null,
    progressMs: Math.max(0, Math.floor(process.progressMs ?? 0)),
    durationMs: Math.max(0, Math.floor(process.durationMs ?? 0)),
    fuelRemainingMs: Math.max(0, Math.floor(process.fuelRemainingMs ?? 0)),
    fuelDurationMs: Math.max(0, Math.floor(process.fuelDurationMs ?? 0)),
    miningDamage: Math.max(0, Math.floor(process.miningDamage ?? 0)),
    steamStoredMs: Math.max(0, Math.floor(process.steamStoredMs ?? 0)),
    steamCapacityMs: Math.max(0, Math.floor(process.steamCapacityMs ?? 0)),
    euStored: Math.max(0, process.euStored ?? 0),
    euCapacity: Math.max(0, Math.floor(process.euCapacity ?? 0)),
    fluids: normalizeFluidStore(process.fluids),
    fluidCapacityLitres: Math.max(0, Math.floor(process.fluidCapacityLitres ?? 0)),
  }
}

function normalizePipeDisabledSides(parsed?: Partial<Record<PipeDirection, boolean>>) {
  const normalized: Partial<Record<PipeDirection, boolean>> = {}
  if (!parsed) return normalized
  for (const direction of pipeDirections) {
    if (parsed[direction]) normalized[direction] = true
  }
  return normalized
}

function normalizePipeSideModes(parsed?: Partial<Record<PipeDirection, PipeSideMode>>, disabledSides?: Partial<Record<PipeDirection, boolean>>) {
  const normalized: Partial<Record<PipeDirection, PipeSideMode>> = {}
  for (const direction of pipeDirections) {
    const parsedMode = parsed?.[direction]
    if (parsedMode && pipeSideModes.includes(parsedMode)) {
      if (parsedMode !== 'both') normalized[direction] = parsedMode
      continue
    }
    if (disabledSides?.[direction]) normalized[direction] = 'blocked'
  }
  return normalized
}

const equipmentSlotItems: Record<EquipmentSlotId, ResourceId[]> = {
  helmet: [],
  chestplate: [],
  leggings: [],
  boots: [],
  axe: ['woodenAxe', 'stoneAxe', 'ironAxe', 'treeTap'],
  shovel: ['woodenShovel', 'stoneShovel', 'ironShovel'],
  pickaxe: ['woodenPickaxe', 'stonePickaxe', 'ironPickaxe', 'diamondPickaxe'],
  weapon: [],
}

export const equipmentSlots = Object.keys(initialEquipment) as EquipmentSlotId[]

function normalizeEquipment(equipment?: Partial<EquipmentState>) {
  const normalized = { ...initialEquipment }
  if (!equipment) return normalized

  for (const slot of equipmentSlots) {
    const value = equipment[slot]
    normalized[slot] = value && equipmentSlotItems[slot].includes(value) ? value : null
  }

  return normalized
}

function isInsideGridSize(grid: { width: number; height: number }, x: number, y: number) {
  return x >= 0 && x < grid.width && y >= 0 && y < grid.height
}

function normalizeMachineInstances(instances: Partial<MachineInstance>[] | undefined, foundationLevel: number, legacyHopperImplicitInputs = false) {
  if (!instances) return []
  const grid = factoryFoundationSizes[clampFactoryFoundationLevel(foundationLevel)] ?? factoryFoundationSizes[0]
  const occupied = new Set<string>()
  const normalized: MachineInstance[] = []
  for (const instance of instances
    .filter((instance): instance is Partial<MachineInstance> => Boolean(instance?.uid && instance.machineId && instance.machineId in machines))
    .filter((instance) => isInsideGridSize(grid, instance.x ?? -1, instance.y ?? -1))) {
    const x = Math.floor(instance.x ?? 0)
    const y = Math.floor(instance.y ?? 0)
    const key = `${x},${y}`
    if (occupied.has(key)) continue
    occupied.add(key)
    const pipeDisabledSides = normalizePipeDisabledSides(instance.pipeDisabledSides)
    const machineId = instance.machineId as MachineId
    let pipeSideModes = normalizePipeSideModes(instance.pipeSideModes, pipeDisabledSides)
    let normalizedPipeDisabledSides = pipeDisabledSides
    if (isFluidOutletConfigurableMachine(machineId) && Object.keys(pipeSideModes).length < 1 && Object.keys(pipeDisabledSides).length < 1) {
      pipeSideModes = Object.fromEntries(pipeDirections.map((direction) => [direction, 'blocked'])) as Partial<Record<PipeDirection, PipeSideMode>>
      normalizedPipeDisabledSides = Object.fromEntries(pipeDirections.map((direction) => [direction, true])) as Partial<Record<PipeDirection, boolean>>
    }
    if (legacyHopperImplicitInputs && isItemHopperMachine(machineId)) {
      const outputDirections = pipeDirections.filter((direction) => pipeSideModes[direction] === 'output')
      const explicitInputDirections = pipeDirections.filter((direction) => pipeSideModes[direction] === 'input' || pipeSideModes[direction] === 'both')
      if (outputDirections.length === 1 && explicitInputDirections.length < 1) {
        pipeSideModes = Object.fromEntries(
          pipeDirections.map((direction) => [direction, direction === outputDirections[0] ? 'output' : 'input']),
        ) as Partial<Record<PipeDirection, PipeSideMode>>
        normalizedPipeDisabledSides = {}
      }
    }
    const process = normalizeProcessState(instance.process)
    if (machineId === 'standardChest' && process.storageSlots.length < 1) {
      process.storageSlots = [process.input, process.secondaryInput, process.fuel].map(cloneProcessSlot)
      process.input = null
      process.secondaryInput = null
      process.fuel = null
    }
    if (machineId === 'standardChest') {
      process.storageSlots = Array.from({ length: 12 }, (_, index) => cloneProcessSlot(process.storageSlots[index] ?? null))
    }
    if (isEuStorageMachine(machineId) && process.batterySlots.length < 1 && process.input && isBufferBatteryId(process.input.id)) {
      process.batterySlots = Array.from({ length: Math.min(batteryBufferSlots(machineId), process.input.amount) }, () => process.input!.id)
      process.input = null
    }
    if (isEuStorageMachine(machineId)) {
      process.batterySlots = Array.from({ length: batteryBufferSlots(machineId) }, (_, index) => process.batterySlots[index] ?? null)
    }
    normalized.push({
      uid: String(instance.uid),
      machineId,
      x,
      y,
      level:
        instance.machineId === 'steamTank'
          ? Math.max(0, Math.floor(instance.level ?? 1))
          : Math.max(1, Math.floor(instance.level ?? 1)),
      pipeDisabledSides: normalizedPipeDisabledSides,
      pipeSideModes,
      itemOutputDirection: pipeDirections.includes(instance.itemOutputDirection as PipeDirection)
        ? instance.itemOutputDirection as PipeDirection
        : undefined,
      itemTransferProgressMs: Math.max(0, Number(instance.itemTransferProgressMs) || 0),
      surveyCardTarget:
        instance.surveyCardTarget && instance.surveyCardTarget in gatherTargets
          ? instance.surveyCardTarget as GatherTargetId
          : undefined,
      process,
    })
  }
  return normalized
}

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    resources: { ...state.resources },
    machines: { ...state.machines },
    bucketFluid: state.bucketFluid ? { ...state.bucketFluid } : null,
    fluidContainers: state.fluidContainers.map((container) => ({ ...container })),
    fluidTransferMilestones: { ...state.fluidTransferMilestones },
    machineInstances: state.machineInstances.map((instance) => ({
      ...instance,
      pipeDisabledSides: { ...instance.pipeDisabledSides },
      pipeSideModes: { ...instance.pipeSideModes },
      process: cloneProcessState(instance.process),
    })),
    scrip: Math.max(0, Math.floor(state.scrip ?? 0)),
    shopCooldowns: { ...(state.shopCooldowns ?? {}) },
    completedQuests: [...state.completedQuests],
    claimedQuests: [...state.claimedQuests],
    unlockedQuests: [...state.unlockedQuests],
    craftedResources: [...state.craftedResources],
    discoveredResources: [...(state.discoveredResources ?? [])],
    resourceMilestones: { ...(state.resourceMilestones ?? {}) },
    machineMilestones: { ...(state.machineMilestones ?? {}) },
    surveyCards: { ...(state.surveyCards ?? {}) },
    recipeMilestones: { ...(state.recipeMilestones ?? {}) },
    equipment: { ...state.equipment },
    durability: { ...state.durability },
    gatherProgress: { ...state.gatherProgress },
    autoMinerAssignments: { ...state.autoMinerAssignments },
    machineProgress: { ...state.machineProgress },
    migrationNotices: [...(state.migrationNotices ?? [])],
  }
}

function clampFactoryFoundationLevel(level: unknown) {
  return Math.max(0, Math.min(maxFactoryFoundationLevel, Math.floor(typeof level === 'number' ? level : 0)))
}

export function factoryGridForState(state: GameState) {
  return factoryFoundationSizes[clampFactoryFoundationLevel(state.factoryFoundationLevel)] ?? factoryFoundationSizes[0]
}

export function hasFactoryFloor(state: GameState) {
  return factoryGridForState(state).width > 0 && factoryGridForState(state).height > 0
}

export function factoryFoundationCost(state: GameState) {
  const nextLevel = clampFactoryFoundationLevel(state.factoryFoundationLevel) + 1
  return factoryFoundationCosts[nextLevel] ?? []
}

export function canExpandFactoryFloor(state: GameState) {
  const cost = factoryFoundationCost(state)
  return cost.length > 0 && hasResources(state, cost)
}

export function expandFactoryFloor(state: GameState) {
  if (!canExpandFactoryFloor(state)) return state
  const next = subtractResources(state, factoryFoundationCost(state))
  const expanded = cloneState(next)
  expanded.factoryFoundationLevel = clampFactoryFoundationLevel(expanded.factoryFoundationLevel + 1)
  expanded.lastSavedAt = Date.now()
  return expanded
}

export function addResources(state: GameState, amounts: ResourceAmount[]) {
  const next = cloneState(state)
  for (const amount of amounts) {
    next.resources[amount.id] += amount.amount
  }
  next.discoveredResources = Array.from(new Set([...next.discoveredResources, ...amounts.filter((amount) => amount.amount > 0).map((amount) => amount.id)]))
  next.lastSavedAt = Date.now()
  return next
}

export function hasResources(state: GameState, amounts: ResourceAmount[] = []) {
  return amounts.every((amount) => state.resources[amount.id] >= amount.amount)
}

export function equippedResourceCounts(state: GameState) {
  return equipmentSlots.reduce(
    (counts, slot) => {
      const resourceId = state.equipment[slot]
      if (resourceId) counts[resourceId] = (counts[resourceId] ?? 0) + 1
      return counts
    },
    {} as Partial<Record<ResourceId, number>>,
  )
}

export function availableResourceAmount(state: GameState, resourceId: ResourceId) {
  return state.resources[resourceId] - (equippedResourceCounts(state)[resourceId] ?? 0)
}

export function isResourceDiscovered(state: GameState, resourceId: ResourceId) {
  return state.discoveredResources.includes(resourceId) || state.craftedResources.includes(resourceId) || state.resources[resourceId] > 0 || Object.values(state.equipment).includes(resourceId)
}

export function isShopUnlocked(state: GameState) {
  return state.completedQuests.includes('buildFoundation')
}

function recordResourceMilestones(state: GameState, amounts: ResourceAmount[]) {
  state.resourceMilestones ??= {}
  for (const amount of amounts) state.resourceMilestones[amount.id] = (state.resourceMilestones[amount.id] ?? 0) + amount.amount
}

function recordMachineMilestones(state: GameState, amounts: MachineAmount[]) {
  state.machineMilestones ??= {}
  for (const amount of amounts) state.machineMilestones[amount.id] = (state.machineMilestones[amount.id] ?? 0) + amount.amount
}

export function isShopAgeUnlocked(state: GameState, item: ShopItem) {
  if (item.age === 'gettingStarted') return isShopUnlocked(state)
  if (item.age === 'steamAge') return state.completedQuests.includes('bronzeAge')
  if (item.age === 'lvAge') return state.completedQuests.includes('steelPlateQuest')
  return false
}

function canShopSellResource(resourceId: ResourceId) {
  return resourceRegistry[resourceId].category !== 'tool'
}

const shopPartCategories = new Set(['plate', 'rod', 'wire', 'component', 'machinePart'])
const shopCooldownMinuteMs = 60 * 1000
const shopPartCooldownsMs: Partial<Record<ResourceId, number>> = {
  brick: 5 * shopCooldownMinuteMs,
  rubber: 5 * shopCooldownMinuteMs,
  glass: 5 * shopCooldownMinuteMs,
  glassTube: 5 * shopCooldownMinuteMs,
  ironPlate: 5 * shopCooldownMinuteMs,
  bronzePlate: 5 * shopCooldownMinuteMs,
  ironRod: 5 * shopCooldownMinuteMs,
  copperWire: 5 * shopCooldownMinuteMs,
  tinWire: 5 * shopCooldownMinuteMs,
  redAlloyWire: 10 * shopCooldownMinuteMs,
  conductiveWire: 10 * shopCooldownMinuteMs,
  tinCable: 10 * shopCooldownMinuteMs,
  steelPlate: 10 * shopCooldownMinuteMs,
  steelRod: 10 * shopCooldownMinuteMs,
  resistor: 10 * shopCooldownMinuteMs,
  vacuumTube: 10 * shopCooldownMinuteMs,
  steamCasing: 10 * shopCooldownMinuteMs,
  cokeOvenBrick: 10 * shopCooldownMinuteMs,
  firebrick: 15 * shopCooldownMinuteMs,
  heatingCoil: 15 * shopCooldownMinuteMs,
  bbfCasing: 25 * shopCooldownMinuteMs,
  heatProofCasing: 25 * shopCooldownMinuteMs,
}

export function isShopPartItem(item: ShopItem) {
  return shopPartCategories.has(resourceRegistry[item.id].category)
}

export function shopItemCooldownMs(item: ShopItem) {
  return shopPartCooldownsMs[item.id] ?? (isShopPartItem(item) ? 5 * shopCooldownMinuteMs : 0)
}

export function shopItemCooldownRemainingMs(state: GameState, item: ShopItem, now = Date.now()) {
  return Math.max(0, Math.floor((state.shopCooldowns[item.id] ?? 0) - now))
}

export function canBuyShopItem(state: GameState, item: ShopItem) {
  return (
    isShopUnlocked(state) &&
    isShopAgeUnlocked(state, item) &&
    canShopSellResource(item.id) &&
    isResourceDiscovered(state, item.id) &&
    shopItemCooldownRemainingMs(state, item) <= 0 &&
    state.scrip >= item.buyPrice
  )
}

export function buyShopItem(state: GameState, itemId: ResourceId, quantity = 1) {
  const item = shopItems.find((candidate) => candidate.id === itemId)
  const requestedQuantity = Math.max(1, Math.floor(quantity))
  if (!item || !canShopSellResource(item.id) || !isShopUnlocked(state) || !isShopAgeUnlocked(state, item) || !isResourceDiscovered(state, item.id)) return state
  const cooldownMs = shopItemCooldownMs(item)
  const now = Date.now()
  if (cooldownMs > 0 && requestedQuantity > 1) return state
  if (shopItemCooldownRemainingMs(state, item, now) > 0) return state
  const totalPrice = item.buyPrice * requestedQuantity
  if (state.scrip < totalPrice) return state

  let next = cloneState(state)
  next.scrip -= totalPrice
  if (cooldownMs > 0) next.shopCooldowns[item.id] = now + cooldownMs
  next.lastSavedAt = now
  next = addResources(next, [{ id: item.id, amount: requestedQuantity }])
  return next
}

export function canSellShopItem(state: GameState, item: SellItem) {
  return isShopUnlocked(state) && availableResourceAmount(state, item.id) > 0
}

export function sellShopItem(state: GameState, itemId: ResourceId, quantity = 1) {
  const item = sellItems.find((candidate) => candidate.id === itemId)
  const requestedQuantity = Math.max(1, Math.floor(quantity))
  if (!item || !isShopUnlocked(state) || availableResourceAmount(state, item.id) < requestedQuantity) return state

  const next = subtractResources(state, [{ id: item.id, amount: requestedQuantity }])
  const paid = cloneState(next)
  paid.scrip += item.sellPrice * requestedQuantity
  paid.lastSavedAt = Date.now()
  return paid
}

export function maxDurability(resourceId: ResourceId) {
  return durabilityMaximums[resourceId] ?? 0
}

export function durabilityRemaining(state: GameState, resourceId: ResourceId) {
  const max = maxDurability(resourceId)
  if (max < 1 || state.resources[resourceId] < 1) return 0
  return Math.max(0, Math.min(max, state.durability[resourceId] ?? max))
}

function durabilityCostCandidates(resourceId: ResourceId) {
  return durableCostAlternatives[resourceId] ?? [resourceId]
}

function totalDurableUses(state: GameState, resourceId: ResourceId, useAvailable = true) {
  const candidates = durabilityCostCandidates(resourceId)
  return candidates.reduce((total, candidate) => {
    const count = useAvailable ? availableResourceAmount(state, candidate) : state.resources[candidate]
    const max = maxDurability(candidate)
    if (count < 1 || max < 1) return total
    return total + Math.max(0, (count - 1) * max + durabilityRemaining(state, candidate))
  }, 0)
}

function totalSpecificDurableUses(state: GameState, resourceId: ResourceId, useAvailable = true) {
  const count = useAvailable ? availableResourceAmount(state, resourceId) : state.resources[resourceId]
  const max = maxDurability(resourceId)
  if (count < 1 || max < 1) return 0
  return Math.max(0, (count - 1) * max + durabilityRemaining(state, resourceId))
}

export function hasDurableUses(state: GameState, costs: ResourceAmount[] = []) {
  return costs.every((cost) => totalDurableUses(state, cost.id) >= cost.amount)
}

function applyDurabilityCostToResource(state: GameState, resourceId: ResourceId, amount: number) {
  const max = maxDurability(resourceId)
  if (max < 1 || amount < 1 || state.resources[resourceId] < 1) return state

  let next = cloneState(state)
  let remainingCost = amount

  while (remainingCost > 0 && next.resources[resourceId] > 0) {
    const currentDurability = Math.max(1, durabilityRemaining(next, resourceId))
    if (remainingCost < currentDurability) {
      next.durability[resourceId] = currentDurability - remainingCost
      remainingCost = 0
      break
    }

    remainingCost -= currentDurability
    next.resources[resourceId] -= 1
    for (const slot of equipmentSlots) {
      if (next.equipment[slot] === resourceId && next.resources[resourceId] < 1) next.equipment[slot] = null
    }
    if (next.resources[resourceId] > 0) {
      next.durability[resourceId] = max
    } else {
      delete next.durability[resourceId]
    }
  }

  next.lastSavedAt = Date.now()
  return next
}

export function applyDurabilityCosts(state: GameState, costs: ResourceAmount[] = []) {
  return costs.reduce((current, cost) => {
    let next = current
    let remaining = cost.amount
    for (const resourceId of durabilityCostCandidates(cost.id)) {
      if (remaining < 1) break
      const spend = Math.min(remaining, totalSpecificDurableUses(next, resourceId, false))
      if (spend < 1) continue
      next = applyDurabilityCostToResource(next, resourceId, spend)
      remaining -= spend
    }
    return next
  }, state)
}

function hasAvailableResources(state: GameState, amounts: ResourceAmount[] = []) {
  const remaining = { ...state.resources }
  for (const [id, amount] of Object.entries(equippedResourceCounts(state))) {
    remaining[id as ResourceId] -= amount ?? 0
  }

  return amounts.every((amount) => {
    if (remaining[amount.id] < amount.amount) return false
    remaining[amount.id] -= amount.amount
    return true
  })
}

function resourceCostCandidates(resourceId: ResourceId) {
  return durableCostAlternatives[resourceId] ?? [resourceId]
}

function totalAvailableForCost(state: GameState, resourceId: ResourceId) {
  return resourceCostCandidates(resourceId).reduce((sum, id) => sum + availableResourceAmount(state, id), 0)
}

function hasAvailableResourceCosts(state: GameState, amounts: ResourceAmount[] = []) {
  return amounts.every((amount) => totalAvailableForCost(state, amount.id) >= amount.amount)
}

export function hasMachines(state: GameState, amounts: MachineAmount[] = []) {
  return amounts.every((amount) => state.machines[amount.id] >= amount.amount)
}

export function subtractResources(state: GameState, amounts: ResourceAmount[]) {
  const next = cloneState(state)
  for (const amount of amounts) {
    next.resources[amount.id] -= amount.amount
  }
  next.lastSavedAt = Date.now()
  return next
}

export function equipmentSlotAccepts(slotId: EquipmentSlotId, resourceId: ResourceId) {
  return equipmentSlotItems[slotId].includes(resourceId)
}

export function equipResource(state: GameState, slotId: EquipmentSlotId, resourceId: ResourceId) {
  if (!equipmentSlotAccepts(slotId, resourceId)) return state
  if (state.equipment[slotId] === resourceId) return state
  if (availableResourceAmount(state, resourceId) < 1) return state

  const next = cloneState(state)
  next.equipment[slotId] = resourceId
  next.lastSavedAt = Date.now()
  return next
}

export function unequipSlot(state: GameState, slotId: EquipmentSlotId) {
  if (!state.equipment[slotId]) return state

  const next = cloneState(state)
  next.equipment[slotId] = null
  next.lastSavedAt = Date.now()
  return next
}

export function getBestToolForTarget(state: GameState, targetId: GatherTargetId) {
  if (targetId === 'tree') {
    if (state.equipment.axe === 'ironAxe') return tools.ironAxe
    if (state.equipment.axe === 'stoneAxe') return tools.stoneAxe
    if (state.equipment.axe === 'woodenAxe') return tools.woodenAxe
  }
  if (targetId === 'rubberTree' && state.equipment.axe === 'treeTap') return tools.treeTap
  if (targetId === 'stone') {
    if (state.equipment.pickaxe === 'diamondPickaxe') return tools.diamondPickaxe
    if (state.equipment.pickaxe === 'ironPickaxe') return tools.ironPickaxe
    if (state.equipment.pickaxe === 'stonePickaxe') return tools.stonePickaxe
    if (state.equipment.pickaxe === 'woodenPickaxe') return tools.woodenPickaxe
  }
  if (targetId === 'ironVein') {
    if (state.equipment.pickaxe === 'diamondPickaxe') return tools.diamondPickaxe
    if (state.equipment.pickaxe === 'ironPickaxe') return tools.ironPickaxe
    if (state.equipment.pickaxe === 'stonePickaxe') return tools.stonePickaxe
  }
  if (targetId === 'clayPatch' || targetId === 'sandPatch' || targetId === 'gravelPatch') {
    if (state.equipment.shovel === 'ironShovel') return tools.ironShovel
    if (state.equipment.shovel === 'stoneShovel') return tools.stoneShovel
    if (state.equipment.shovel === 'woodenShovel') return tools.woodenShovel
  }
  if (
    (targetId === 'copperVein' ||
      targetId === 'tinVein' ||
      targetId === 'redstoneVein' ||
      targetId === 'coalSeam' ||
      targetId === 'nickelVein' ||
      targetId === 'bauxiteVein' ||
      targetId === 'diamondVein') &&
    (state.equipment.pickaxe === 'ironPickaxe' || state.equipment.pickaxe === 'diamondPickaxe')
  ) {
    if (state.equipment.pickaxe === 'diamondPickaxe') return tools.diamondPickaxe
    return tools.ironPickaxe
  }
  if ((targetId === 'leadVein' || targetId === 'saltDeposit') && state.equipment.pickaxe === 'diamondPickaxe') {
    return tools.diamondPickaxe
  }
  if (targetId === 'obsidianDeposit' && state.equipment.pickaxe === 'diamondPickaxe') return tools.diamondPickaxe
  if (targetId === 'sulfurVent' && (state.equipment.pickaxe === 'ironPickaxe' || state.equipment.pickaxe === 'diamondPickaxe')) {
    return state.equipment.pickaxe === 'diamondPickaxe' ? tools.diamondPickaxe : tools.ironPickaxe
  }
  return tools.bareHand
}

export function hitGatherTarget(state: GameState, targetId: GatherTargetId) {
  const target = gatherTargets[targetId]
  if (target.area === 'shatteredReach' && !isReachGateFormed(state)) {
    return { state, completed: false, drops: [] as ResourceAmount[], tool: tools.bareHand, toolBroke: undefined }
  }
  const tool = getBestToolForTarget(state, targetId)
  const damage = tool.damageByTarget[targetId] ?? 0
  let next = cloneState(state)
  if (damage < 1) {
    next.lastSavedAt = Date.now()
    return { state: next, completed: false, drops: [] as ResourceAmount[], tool, toolBroke: undefined }
  }

  let toolBroke: ResourceId | undefined
  if (tool.id !== 'bareHand') {
    const hadTool = next.resources[tool.id] > 0
    next = applyDurabilityCosts(next, [{ id: tool.id, amount: 1 }])
    toolBroke = hadTool && next.resources[tool.id] < 1 ? tool.id : undefined
  }

  const progress = (next.gatherProgress[targetId] ?? 0) + damage

  if (progress < target.maxHp) {
    next.gatherProgress[targetId] = progress
    next.lastSavedAt = Date.now()
    return { state: next, completed: false, drops: [] as ResourceAmount[], tool, toolBroke }
  }

  const cycles = Math.floor(progress / target.maxHp)
  next.gatherProgress[targetId] = progress % target.maxHp
  const drops = target.drops.map((drop) => ({ ...drop, amount: drop.amount * cycles }))
  const withDrops = addResources(next, drops)
  recordResourceMilestones(withDrops, drops)
  return { state: withDrops, completed: true, drops, tool, toolBroke }
}

export function isRecipeVisible(state: GameState, recipe: Recipe) {
  if (recipe.unlockedBy && state.completedQuests.includes(recipe.unlockedBy)) return true
  if (recipe.recipeType === 'processing' && recipe.requiredMachine && state.machines[recipe.requiredMachine] < 1) return false
  if (canCraftByRequirements(state, recipe)) return true
  if (recipe.id === 'craft_planks') return state.resources.log > 0 || state.resources.plank > 0
  if (recipe.id === 'craft_sticks') return state.resources.plank > 0 || state.resources.stick > 0
  if (recipe.id === 'craft_wooden_axe') return state.resources.plank > 0 && (state.resources.stick > 0 || state.resources.woodenAxe > 0)
  if (recipe.id === 'craft_wooden_pickaxe') return state.resources.plank > 0 && (state.resources.stick > 0 || state.resources.woodenPickaxe > 0)
  if (recipe.id === 'craft_stone_axe') {
    return state.resources.cobblestone > 0 && (state.resources.stick > 0 || state.resources.stoneAxe > 0)
  }
  if (recipe.id === 'craft_stone_pickaxe') {
    return state.resources.cobblestone > 0 && (state.resources.stick > 0 || state.resources.stonePickaxe > 0)
  }
  if (recipe.id === 'craft_iron_axe') {
    return state.resources.ironIngot > 0 && (state.resources.stick > 0 || state.resources.ironAxe > 0)
  }
  if (recipe.id === 'craft_iron_pickaxe') {
    return state.resources.ironIngot > 0 && (state.resources.stick > 0 || state.resources.ironPickaxe > 0)
  }
  return [...recipe.inputs, ...(recipe.catalysts ?? []), ...(recipe.durabilityCosts ?? []), ...recipe.outputs].some(
    (amount) => state.resources[amount.id] > 0,
  )
}

export function visibleRecipes(state: GameState) {
  return recipes.filter((recipe) => isRecipeVisible(state, recipe))
}

function countGridItems(grid: CraftSlot[]) {
  return grid.reduce(
    (counts, slot) => {
      if (slot && !slot.ghost) counts[slot.id] = (counts[slot.id] ?? 0) + 1
      return counts
    },
    {} as Partial<Record<ResourceId, number>>,
  )
}

function resourceAmountKey(amounts: ResourceAmount[]) {
  return amounts
    .filter((amount) => amount.amount > 0)
    .map((amount) => `${amount.id}:${amount.amount}`)
    .sort()
    .join('|')
}

export function gridAmounts(grid: CraftSlot[]): ResourceAmount[] {
  return Object.entries(countGridItems(grid))
    .filter(([, amount]) => (amount ?? 0) > 0)
    .map(([id, amount]) => ({ id: id as ResourceId, amount: amount ?? 0 }))
}

export function createCreativeState(base: GameState, now = Date.now()): GameState {
  const resourceIds = Object.keys(initialResources) as ResourceId[]
  const machineIds = Object.keys(initialMachines) as MachineId[]
  return {
    ...cloneState(base),
    resources: resourceIds.reduce((resources, id) => ({ ...resources, [id]: Math.max(32, base.resources[id] ?? 0) }), {} as Record<ResourceId, number>),
    machines: machineIds.reduce(
      (builtMachines, id) => ({
        ...builtMachines,
        [id]: isResourceBackedMachine(id) ? 0 : machines[id].multiblock ? (base.machines[id] ?? 0) : Math.max(32, base.machines[id] ?? 0),
      }),
      {} as Record<MachineId, number>,
    ),
    factoryFoundationLevel: maxFactoryFoundationLevel,
    craftedResources: resourceIds,
    lastSavedAt: now,
  }
}

export function topUpCreativeState(base: GameState, now = Date.now()): GameState {
  const resourceIds = Object.keys(initialResources) as ResourceId[]
  const machineIds = Object.keys(initialMachines) as MachineId[]
  const depletedResources = resourceIds.filter((id) => (base.resources[id] ?? 0) < 32)
  const depletedMachines = machineIds.filter((id) => !isResourceBackedMachine(id) && !machines[id].multiblock && (base.machines[id] ?? 0) < 32)
  const needsFoundation = base.factoryFoundationLevel < maxFactoryFoundationLevel
  const needsCraftedResources = resourceIds.some((id) => !base.craftedResources.includes(id))

  if (depletedResources.length < 1 && depletedMachines.length < 1 && !needsFoundation && !needsCraftedResources) return base

  const next = cloneState(base)
  for (const id of depletedResources) next.resources[id] = 32
  for (const id of depletedMachines) next.machines[id] = 32
  if (needsFoundation) next.factoryFoundationLevel = maxFactoryFoundationLevel
  if (needsCraftedResources) next.craftedResources = resourceIds
  next.lastSavedAt = now
  return next
}

type CreativeFactoryPlacement = {
  id: MachineId
  x: number
  y: number
}

const creativeFactoryPlacements: CreativeFactoryPlacement[] = [
  { id: 'well', x: 0, y: 0 },
  { id: 'steamBoiler', x: 1, y: 0 },
  { id: 'steamTank', x: 2, y: 0 },
  { id: 'steamMacerator', x: 3, y: 0 },
  { id: 'steamForgeHammer', x: 4, y: 0 },
  { id: 'steamCompressor', x: 5, y: 0 },
  { id: 'steamExtractor', x: 6, y: 0 },
  { id: 'steamAlloySmelter', x: 7, y: 0 },
  { id: 'steamFurnace', x: 8, y: 0 },
  { id: 'steamAutoMiner', x: 9, y: 0 },
  { id: 'steamTurbine', x: 10, y: 0 },
  { id: 'liquidSteamBoiler', x: 11, y: 0 },
  { id: 'well', x: 12, y: 0 },
  { id: 'steamTank', x: 13, y: 0 },
  { id: 'copperPipe', x: 0, y: 1 },
  { id: 'bronzePipe', x: 1, y: 1 },
  { id: 'ironPipe', x: 2, y: 1 },
  { id: 'ironPipe', x: 3, y: 1 },
  { id: 'ironPipe', x: 4, y: 1 },
  { id: 'ironPipe', x: 5, y: 1 },
  { id: 'ironPipe', x: 6, y: 1 },
  { id: 'ironPipe', x: 7, y: 1 },
  { id: 'ironPipe', x: 8, y: 1 },
  { id: 'ironPipe', x: 9, y: 1 },
  { id: 'ironPipe', x: 10, y: 1 },
  { id: 'ironPipe', x: 11, y: 1 },
  { id: 'ironPipe', x: 12, y: 1 },
  { id: 'ironPipe', x: 13, y: 1 },
  { id: 'ironPipe', x: 14, y: 1 },
  { id: 'lvBatteryBuffer', x: 0, y: 2 },
  { id: 'lvBatteryBuffer2A', x: 4, y: 2 },
  { id: 'lvBatteryBuffer4A', x: 7, y: 2 },
  { id: 'lvBatteryBuffer8A', x: 11, y: 2 },
  { id: 'tinCable', x: 0, y: 3 },
  { id: 'tinCable', x: 1, y: 3 },
  { id: 'tinCable', x: 2, y: 3 },
  { id: 'tinCable', x: 3, y: 3 },
  { id: 'tinCable2A', x: 4, y: 3 },
  { id: 'tinCable2A', x: 5, y: 3 },
  { id: 'tinCable2A', x: 6, y: 3 },
  { id: 'tinCable4A', x: 7, y: 3 },
  { id: 'tinCable4A', x: 8, y: 3 },
  { id: 'tinCable4A', x: 9, y: 3 },
  { id: 'tinCable4A', x: 10, y: 3 },
  { id: 'tinCable8A', x: 11, y: 3 },
  { id: 'tinCable8A', x: 12, y: 3 },
  { id: 'tinCable8A', x: 13, y: 3 },
  { id: 'tinCable8A', x: 14, y: 3 },
  { id: 'lvMacerator', x: 0, y: 4 },
  { id: 'lvForgeHammer', x: 1, y: 4 },
  { id: 'lvCompressor', x: 2, y: 4 },
  { id: 'lvExtractor', x: 3, y: 4 },
  { id: 'lvAlloySmelter', x: 4, y: 4 },
  { id: 'lvFurnace', x: 5, y: 4 },
  { id: 'lvWiremill', x: 6, y: 4 },
  { id: 'lvBender', x: 7, y: 4 },
  { id: 'lvLathe', x: 8, y: 4 },
  { id: 'lvElectrolyzer', x: 9, y: 4 },
  { id: 'lvAssembler', x: 10, y: 4 },
  { id: 'lvCentrifuge', x: 11, y: 4 },
  { id: 'lvCanner', x: 12, y: 4 },
  { id: 'lvChemicalReactor', x: 13, y: 4 },
  { id: 'lvAutoMiner', x: 14, y: 4 },
  { id: 'standardChest', x: 0, y: 6 },
  { id: 'hopper', x: 1, y: 6 },
  { id: 'furnace', x: 2, y: 6 },
  { id: 'hopper', x: 3, y: 6 },
  { id: 'standardChest', x: 4, y: 6 },
  { id: 'cokeOvenPart', x: 0, y: 8 },
  { id: 'cokeOvenPart', x: 1, y: 8 },
  { id: 'cokeOvenPart', x: 0, y: 9 },
  { id: 'cokeOvenPart', x: 1, y: 9 },
  { id: 'bronzePipe', x: 2, y: 8 },
  { id: 'steamTank', x: 3, y: 8 },
  { id: 'liquidSteamBoiler', x: 4, y: 8 },
  { id: 'well', x: 4, y: 9 },
  { id: 'brickedBlastFurnacePart', x: 6, y: 8 },
  { id: 'brickedBlastFurnacePart', x: 7, y: 8 },
  { id: 'brickedBlastFurnacePart', x: 6, y: 9 },
  { id: 'brickedBlastFurnacePart', x: 7, y: 9 },
  { id: 'lvBatteryBuffer4A', x: 10, y: 10 },
  { id: 'tinCable4A', x: 11, y: 10 },
  { id: 'tinCable4A', x: 12, y: 10 },
  { id: 'tinCable4A', x: 13, y: 10 },
  { id: 'tinCable4A', x: 14, y: 10 },
  { id: 'reachGateCasing', x: 0, y: 12 },
  { id: 'reachGateCasing', x: 1, y: 12 },
  { id: 'reachGateCasing', x: 0, y: 13 },
  { id: 'reachGateCasing', x: 1, y: 13 },
  { id: 'lvEnergyHatch2A', x: 13, y: 11 },
  { id: 'lvEnergyHatch2A', x: 14, y: 11 },
  { id: 'arcBlastFurnacePart', x: 15, y: 11 },
  { id: 'lvInputBus', x: 13, y: 12 },
  { id: 'arcBlastFurnace', x: 14, y: 12 },
  { id: 'lvOutputBus', x: 15, y: 12 },
  { id: 'lvFluidInputHatch', x: 13, y: 13 },
  { id: 'lvFluidOutputHatch', x: 14, y: 13 },
  { id: 'arcBlastFurnacePart', x: 15, y: 13 },
]

function machineAtPosition(state: GameState, x: number, y: number) {
  return state.machineInstances.find((instance) => instance.x === x && instance.y === y)
}

function setAllPipeSidesOpen(state: GameState, instance: MachineInstance) {
  let next = state
  for (const direction of pipeDirections) next = setPipeSideMode(next, instance.uid, direction, 'both')
  return next
}

function placeCreativeFactoryMachine(state: GameState, placement: CreativeFactoryPlacement) {
  const next = cloneState(state)
  next.machines[placement.id] = Math.max(next.machines[placement.id] ?? 0, availableUnplacedMachineCount(next, placement.id) + 1)
  const placed = placeMachineInstance(next, placement.id, placement.x, placement.y)
  if (!machineAtPosition(placed, placement.x, placement.y)) {
    throw new Error(`Could not place creative factory machine ${placement.id} at ${placement.x},${placement.y}`)
  }
  return placed
}

export function createCreativeFactoryState(base: GameState = createInitialState(), now = Date.now()): GameState {
  let state = createCreativeState(base, now)
  const resourceIds = Object.keys(initialResources) as ResourceId[]
  const machineIds = Object.keys(initialMachines) as MachineId[]

  state.machineInstances = []
  state.autoMinerAssignments = {}
  state.factoryFoundationLevel = maxFactoryFoundationLevel
  state.resources = resourceIds.reduce(
    (resources, id) => ({ ...resources, [id]: Math.max(256, state.resources[id] ?? 0) }),
    {} as Record<ResourceId, number>,
  )
  state.machines = machineIds.reduce(
    (builtMachines, id) => ({
      ...builtMachines,
      [id]: isResourceBackedMachine(id) ? 0 : machines[id].placeable ? Math.max(32, state.machines[id] ?? 0) : 0,
    }),
    {} as Record<MachineId, number>,
  )

  for (const placement of creativeFactoryPlacements) state = placeCreativeFactoryMachine(state, placement)

  for (const instance of state.machineInstances) {
    if (isSteamPipeMachine(instance.machineId) || isEuCableMachine(instance.machineId)) state = setAllPipeSidesOpen(state, instance)
  }

  const cokeOutputCell = machineAtPosition(state, 1, 8)
  if (cokeOutputCell) state = setFluidOutputDirection(state, cokeOutputCell.uid, 'east')
  const reactor = machineAtPosition(state, 13, 4)
  if (reactor) state = setFluidOutputDirection(state, reactor.uid, 'south')
  const hoppers = state.machineInstances.filter((instance) => instance.machineId === 'hopper')
  if (hoppers[0]) {
    state = setPipeSideMode(state, hoppers[0].uid, 'west', 'input')
    state = setHopperOutputDirection(state, hoppers[0].uid, 'east')
  }
  if (hoppers[1]) {
    state = setPipeSideMode(state, hoppers[1].uid, 'east', 'input')
    state = setHopperOutputDirection(state, hoppers[1].uid, 'west')
  }

  const batteryBuffers = state.machineInstances.filter((instance) => isEuStorageMachine(instance.machineId))
  for (const buffer of batteryBuffers) {
    for (let index = 0; index < batteryBufferSlots(buffer.machineId); index += 1) {
      state = installLvBatteryInBuffer(state, buffer.uid, index % 2 === 0 ? 'lithiumBattery' : 'sodiumBattery')
    }
    const filled = state.machineInstances.find((instance) => instance.uid === buffer.uid)
    if (filled) filled.process.euStored = filled.process.euCapacity
  }

  const steamMiner = state.machineInstances.find((instance) => instance.machineId === 'steamAutoMiner')
  if (steamMiner) state = assignAutoMiner(state, steamMiner.uid, 'ironVein')
  const lvMiner = state.machineInstances.find((instance) => instance.machineId === 'lvAutoMiner')
  if (lvMiner) {
    state.surveyCards.sulfurVent = Math.max(1, state.surveyCards.sulfurVent ?? 0)
    state = installSurveyCardInAutoMiner(state, lvMiner.uid, 'sulfurVent')
    state = assignAutoMiner(state, lvMiner.uid, 'sulfurVent')
  }

  state = cloneState(state)
  for (const instance of state.machineInstances) {
    if (instance.machineId === 'well') {
      instance.process.fluidCapacityLitres = wellWaterCapacityLitres
      instance.process.fluids.water = wellWaterCapacityLitres
    }
    if (instance.machineId === 'steamBoiler') {
      instance.process.fuel = { id: 'coal', amount: 16 }
      instance.process.fuelDurationMs = 8000
      instance.process.fuelRemainingMs = 4000
      instance.process.fluidCapacityLitres = machineFluidCapacityLitres(instance.machineId)
      instance.process.fluids.water = 96
      instance.process.steamCapacityMs = boilerSteamCapacityMs
      instance.process.steamStoredMs = boilerSteamCapacityMs * 0.75
    }
    if (instance.machineId === 'steamTank') {
      instance.process.steamCapacityMs = steamTankCapacityMsForInstance(state, instance)
      instance.process.steamStoredMs = instance.process.steamCapacityMs * 0.8
      instance.process.fluidCapacityLitres = steamTankFluidCapacityLitresForInstance(state, instance)
      if (instance.x === 3 && instance.y === 8) {
        instance.process.steamStoredMs = 0
        instance.process.fluids.creosote = Math.min(instance.process.fluidCapacityLitres, 128)
      }
    }
    if (isSteamPoweredMachine(instance.machineId)) {
      instance.process.steamCapacityMs = machineSteamCapacityLitres(instance.machineId) * steamMsPerLitre
      instance.process.steamStoredMs = instance.process.steamCapacityMs * 0.5
    }
    if (instance.machineId === 'steamMacerator') instance.process.input = { id: 'ironOre', amount: 8 }
    if (instance.machineId === 'steamForgeHammer') instance.process.input = { id: 'ironIngot', amount: 8 }
    if (instance.machineId === 'steamCompressor') instance.process.input = { id: 'firebrick', amount: 8 }
    if (instance.machineId === 'steamExtractor') instance.process.input = { id: 'rubberSap', amount: 8 }
    if (instance.machineId === 'steamAlloySmelter') {
      instance.process.input = { id: 'copperDust', amount: 8 }
      instance.process.secondaryInput = { id: 'tinDust', amount: 4 }
    }
    if (instance.machineId === 'steamFurnace') instance.process.input = { id: 'crushedIronOre', amount: 8 }
    if (instance.machineId === 'steamTurbine') {
      instance.process.euCapacity = steamTurbineEuCapacity
      instance.process.euStored = steamTurbineEuCapacity * 0.75
      instance.process.steamCapacityMs = steamMachineInternalCapacityMs
      instance.process.steamStoredMs = steamMachineInternalCapacityMs * 0.5
    }
    if (instance.machineId === 'liquidSteamBoiler') {
      instance.process.fluidCapacityLitres = liquidSteamBoilerFluidCapacityLitres
      instance.process.fluids.water = 96
      instance.process.fluids.creosote = 96
      instance.process.steamCapacityMs = liquidSteamBoilerCapacityMs
      instance.process.steamStoredMs = liquidSteamBoilerCapacityMs * 0.65
      instance.process.activeRecipeId = 'burn_creosote'
    }
    if (isEuPoweredMachine(instance.machineId) && instance.machineId !== 'arcBlastFurnace') {
      instance.process.euCapacity = machineEuCapacity(instance.machineId)
      instance.process.euStored = instance.process.euCapacity * 0.75
    }
    if (instance.machineId === 'lvMacerator') instance.process.input = { id: 'bauxiteOre', amount: 8 }
    if (instance.machineId === 'lvForgeHammer') instance.process.input = { id: 'steelIngot', amount: 8 }
    if (instance.machineId === 'lvCompressor') instance.process.input = { id: 'carbonDust', amount: 8 }
    if (instance.machineId === 'lvExtractor') instance.process.input = { id: 'rubberSap', amount: 8 }
    if (instance.machineId === 'lvAlloySmelter') {
      instance.process.input = { id: 'nickelDust', amount: 8 }
      instance.process.secondaryInput = { id: 'ironDust', amount: 8 }
    }
    if (instance.machineId === 'lvFurnace') instance.process.input = { id: 'aluminiumDust', amount: 8 }
    if (instance.machineId === 'lvWiremill') instance.process.input = { id: 'tinIngot', amount: 8 }
    if (instance.machineId === 'lvBender') instance.process.input = { id: 'steelIngot', amount: 8 }
    if (instance.machineId === 'lvLathe') instance.process.input = { id: 'aluminiumIngot', amount: 8 }
    if (instance.machineId === 'lvElectrolyzer') {
      instance.process.input = { id: 'bauxiteDust', amount: 8 }
      instance.process.secondaryInput = { id: 'sodiumDust', amount: 4 }
    }
    if (instance.machineId === 'lvAssembler') {
      instance.process.input = { id: 'tinWire', amount: 16 }
      instance.process.fluidCapacityLitres = machineFluidCapacityLitres(instance.machineId)
      instance.process.fluids.liquidRubber = 64
    }
    if (instance.machineId === 'lvCentrifuge') {
      instance.process.input = { id: 'clay', amount: 16 }
      instance.process.secondaryInput = { id: 'sand', amount: 8 }
    }
    if (instance.machineId === 'lvCanner') {
      instance.process.input = { id: 'emptyBatteryCell', amount: 8 }
      instance.process.secondaryInput = { id: 'lithiumDust', amount: 8 }
    }
    if (instance.machineId === 'lvChemicalReactor') {
      instance.process.input = { id: 'rubberSap', amount: 16 }
      instance.process.secondaryInput = { id: 'sulfurDust', amount: 8 }
      instance.process.fluidCapacityLitres = machineFluidCapacityLitres(instance.machineId)
      instance.process.fluids.liquidRubber = 24
    }
    if (instance.machineId === 'cokeOven') {
      instance.process.input = { id: 'coal', amount: 16 }
      instance.process.output = { id: 'coalCoke', amount: 8 }
      instance.process.fluidCapacityLitres = cokeOvenFluidCapacityLitres
      instance.process.fluids.creosote = 96
    }
    if (instance.machineId === 'brickedBlastFurnace') {
      instance.process.input = { id: 'ironIngot', amount: 8 }
      instance.process.fuel = { id: 'coalCoke', amount: 8 }
      instance.process.output = { id: 'steelIngot', amount: 4 }
    }
    if (instance.machineId === 'arcBlastFurnace') {
      instance.process.input = { id: 'aluminiumDust', amount: 4 }
      instance.process.activeRecipeId = 'arc_blast_aluminium'
      instance.process.durationMs = 18000
      instance.process.progressMs = 9000
    }
    if (instance.machineId === 'lvInputBus') instance.process.input = { id: 'aluminiumDust', amount: 8 }
    if (instance.machineId === 'lvOutputBus') instance.process.output = { id: 'aluminiumIngot', amount: 4 }
    if (instance.machineId === 'lvFluidInputHatch') {
      instance.process.fluidCapacityLitres = machineFluidCapacityLitres(instance.machineId)
      instance.process.fluids.liquidRubber = 32
    }
    if (instance.machineId === 'lvFluidOutputHatch') {
      instance.process.fluidCapacityLitres = machineFluidCapacityLitres(instance.machineId)
      instance.process.fluids.creosote = 16
    }
    if (instance.machineId === 'standardChest') {
      instance.process.storageSlots = Array.from({ length: 12 }, (_, index) => {
        const stored: ResourceId[] = ['log', 'ironOre', 'copperOre', 'tinOre', 'coal', 'rubberSap', 'steelIngot', 'aluminiumIngot']
        const id = stored[index]
        return id ? { id, amount: 32 } : null
      })
    }
    if (instance.machineId === 'hopper') instance.process.input = { id: 'ironOre', amount: 32 }
  }

  state.fluidContainers = [
    { uid: 'cell-creative-liquid-rubber-1', kind: 'steelCell', fluidId: 'liquidRubber', amountLitres: fluidContainerCapacities.steelCell },
    { uid: 'cell-creative-creosote-1', kind: 'steelCell', fluidId: 'creosote', amountLitres: fluidContainerCapacities.steelCell },
    { uid: 'bucket-creative-water-1', kind: 'bucket', fluidId: 'water', amountLitres: fluidContainerCapacities.bucket },
  ]
  state.fluidTransferMilestones = {
    [fluidTransferMilestoneKey('fill', 'steelCell', 'liquidRubber', 'lvChemicalReactor')]: fluidContainerCapacities.steelCell,
    [fluidTransferMilestoneKey('fill', 'steelCell', 'liquidRubber')]: fluidContainerCapacities.steelCell,
    [fluidTransferMilestoneKey('drain', 'steelCell', 'liquidRubber', 'lvAssembler')]: fluidContainerCapacities.steelCell,
    [fluidTransferMilestoneKey('drain', 'steelCell', 'liquidRubber')]: fluidContainerCapacities.steelCell,
  }
  state.unlockedQuests = quests.map((quest) => quest.id)
  state.craftedResources = resourceIds
  state.discoveredResources = resourceIds
  state.resourceMilestones = Object.fromEntries(resourceIds.map((id) => [id, Math.max(256, state.resources[id] ?? 0)]))
  state.machineMilestones = Object.fromEntries(machineIds.map((id) => [id, state.machines[id] ?? 0]))
  state.recipeMilestones = Object.fromEntries(recipes.map((recipe) => [recipe.id, 1]))
  state.lastSavedAt = now
  state.migrationNotices = []
  return state
}

function recipeInputTotal(recipe: Recipe) {
  return [...recipe.inputs, ...(recipe.catalysts ?? [])].reduce((sum, amount) => sum + amount.amount, 0)
}

export function recipeFitsTerminalGrid(recipe: Recipe) {
  if (recipe.machineInputs?.length) return false
  if (recipe.recipeType && recipe.recipeType !== 'crafting') return false
  if (recipe.stationType && recipe.stationType !== 'hand') return false
  return recipeInputTotal(recipe) <= 9
}

function recipeGridAmounts(recipe: Recipe) {
  return [...recipe.inputs, ...(recipe.catalysts ?? [])]
}

function recipeCatalystIds(recipe: Recipe) {
  return new Set((recipe.catalysts ?? []).map((amount) => amount.id))
}

function gridResourceMatches(expected: ResourceId, actual: ResourceId | undefined, recipe: Recipe) {
  if (!actual) return false
  if (actual === expected) return true
  return recipeCatalystIds(recipe).has(expected) && resourceCostCandidates(expected).includes(actual)
}

function patternMatchesGrid(recipe: Recipe, grid: CraftSlot[]) {
  const pattern = recipe.pattern ?? []
  return Array.from({ length: 9 }).every((_, index) => {
    const expected = pattern[index] ?? null
    const slot = grid[index]
    if (!expected) return !slot || slot.ghost
    return Boolean(slot && !slot.ghost && gridResourceMatches(expected, slot.id, recipe))
  })
}

export function findGridRecipe(grid: CraftSlot[], availableRecipes: Recipe[]) {
  const filledSlots = grid.filter((slot) => slot && !slot.ghost)
  if (filledSlots.length === 0) return undefined

  return availableRecipes.filter(recipeFitsTerminalGrid).find((recipe) => {
    if (recipe.pattern) return patternMatchesGrid(recipe, grid)
    return resourceAmountKey(recipeGridAmounts(recipe)) === resourceAmountKey(gridAmounts(grid))
  })
}

export function missingForRecipe(state: GameState, recipe: Recipe) {
  const missingResources = recipe.inputs
    .map((amount) => ({ ...amount, amount: Math.max(0, amount.amount - availableResourceAmount(state, amount.id)) }))
    .filter((amount) => amount.amount > 0)
  const missingCatalysts = (recipe.catalysts ?? [])
    .map((amount) => ({ ...amount, amount: Math.max(0, amount.amount - totalAvailableForCost(state, amount.id)) }))
    .filter((amount) => amount.amount > 0)
  const missingDurability = (recipe.durabilityCosts ?? [])
    .map((amount) => ({ ...amount, amount: Math.max(0, amount.amount - totalDurableUses(state, amount.id)) }))
    .filter((amount) => amount.amount > 0)
  const missingMachines = [
    ...(recipe.requiredMachine && state.machines[recipe.requiredMachine] < 1 ? [{ id: recipe.requiredMachine, amount: 1 }] : []),
    ...(recipe.machineInputs ?? []).filter((amount) => state.machines[amount.id] < amount.amount),
  ]
  return { missingResources, missingCatalysts, missingDurability, missingMachines }
}

export function makeGridForRecipe(recipe: Recipe, state?: GameState): CraftSlot[] {
  const remaining = state
    ? Object.fromEntries(
        Object.keys(state.resources).map((id) => [id, availableResourceAmount(state, id as ResourceId)]),
      ) as Record<ResourceId, number>
    : undefined
  const slots: CraftSlot[] = Array.from({ length: 9 }, () => null)

  if (recipe.pattern) {
    recipe.pattern.slice(0, 9).forEach((id, index) => {
      if (!id) return
      const candidates = recipeCatalystIds(recipe).has(id) ? resourceCostCandidates(id) : [id]
      const displayId = remaining ? (candidates.find((candidate) => remaining[candidate] > 0) ?? id) : id
      const ghost = remaining ? candidates.every((candidate) => remaining[candidate] < 1) : false
      slots[index] = { id: displayId, ghost }
      if (remaining && !ghost) remaining[displayId] -= 1
    })
    return slots
  }

  let slotIndex = 0
  for (const input of recipeGridAmounts(recipe)) {
    for (let index = 0; index < input.amount && slotIndex < slots.length; index += 1) {
      const ghost = remaining ? remaining[input.id] < 1 : false
      slots[slotIndex] = { id: input.id, ghost }
      if (remaining && !ghost) remaining[input.id] -= 1
      slotIndex += 1
    }
  }

  return slots
}

export function terminalAvailableAmount(state: GameState, grid: CraftSlot[], resourceId: ResourceId) {
  return availableResourceAmount(state, resourceId) - (countGridItems(grid)[resourceId] ?? 0)
}

function batchAvailableResourceAmount(state: GameState, resourceId: ResourceId, grid?: CraftSlot[]) {
  const available = availableResourceAmount(state, resourceId)
  const realGridAmount = grid ? (countGridItems(grid)[resourceId] ?? 0) : 0
  const outsideGridAmount = Math.max(0, available - realGridAmount)
  return outsideGridAmount + Math.min(realGridAmount, available)
}

function scaleResourceAmounts(amounts: ResourceAmount[], quantity: number) {
  return combineResourceAmounts(amounts.map((amount) => ({ ...amount, amount: amount.amount * quantity })))
}

function scaleMachineAmounts(amounts: MachineAmount[] = [], quantity: number) {
  return amounts.map((amount) => ({ ...amount, amount: amount.amount * quantity }))
}

export function craftableQuantity(state: GameState, recipe: Recipe, grid?: CraftSlot[]) {
  if (recipe.requiredMachine && state.machines[recipe.requiredMachine] < 1) return 0
  if (!hasMachines(state, recipe.machineInputs)) return 0
  if (!hasAvailableResourceCosts(state, recipe.catalysts)) return 0
  if (!hasDurableUses(state, recipe.durabilityCosts)) return 0

  const inputs = combineResourceAmounts(recipe.inputs)
  if (inputs.length === 0) return 0

  const resourceQuantity = inputs.reduce((maxQuantity, amount) => {
    const available = batchAvailableResourceAmount(state, amount.id, grid)
    return Math.max(0, Math.min(maxQuantity, Math.floor(available / amount.amount)))
  }, Number.POSITIVE_INFINITY)
  const durabilityQuantity = (recipe.durabilityCosts ?? []).reduce((maxQuantity, amount) => {
    return Math.max(0, Math.min(maxQuantity, Math.floor(totalDurableUses(state, amount.id) / amount.amount)))
  }, Number.POSITIVE_INFINITY)

  return Math.min(resourceQuantity, durabilityQuantity)
}

export function missingForQuantity(state: GameState, recipe: Recipe, quantity: number, grid?: CraftSlot[]) {
  const requestedQuantity = Math.max(1, Math.floor(quantity))
  return scaleResourceAmounts([...recipe.inputs, ...(recipe.durabilityCosts ?? [])], requestedQuantity)
    .map((amount) => ({
      ...amount,
      amount: Math.max(
        0,
        amount.amount -
          (recipe.durabilityCosts?.some((cost) => cost.id === amount.id)
            ? totalDurableUses(state, amount.id)
            : batchAvailableResourceAmount(state, amount.id, grid)),
      ),
    }))
    .filter((amount) => amount.amount > 0)
}

export function searchTerminalRecipes(query: string, candidates = recipes) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return candidates

  return candidates.filter((recipe) => {
    const resourceMatches = [...recipeResourceInputs(recipe), ...recipeResourceOutputs(recipe)].some((amount) => {
      const label = resourceLabels[amount.id].toLowerCase()
      return amount.id.toLowerCase().includes(normalized) || label.includes(normalized)
    })
    const machineMatches = [...recipeMachineInputs(recipe), ...recipeMachineOutputs(recipe)].some((amount) => {
      const machine = machines[amount.id]
      return amount.id.toLowerCase().includes(normalized) || machine.name.toLowerCase().includes(normalized)
    })
    const fluidMatches = [...(recipe.fluidInputs ?? []), ...(recipe.fluidOutputs ?? [])].some((amount) => {
      const label = fluidLabels[amount.id].toLowerCase()
      return amount.id.toLowerCase().includes(normalized) || label.includes(normalized)
    })
    const fuelMatches =
      recipe.stationType === 'furnace' &&
      Object.values(fuelDefinitions).some((fuel) => {
        const label = resourceLabels[fuel.id].toLowerCase()
        return fuel.id.toLowerCase().includes(normalized) || label.includes(normalized)
      })

    return (
      recipe.name.toLowerCase().includes(normalized) ||
      recipe.description.toLowerCase().includes(normalized) ||
      resourceMatches ||
      machineMatches ||
      fluidMatches ||
      fuelMatches
    )
  })
}

export function recipesForOutput(resourceId: ResourceId, candidates = recipes) {
  return recipesProducingResource(resourceId, candidates)
}

export function recipesUsingInput(resourceId: ResourceId, candidates = recipes) {
  return recipesUsingResource(resourceId, candidates)
}

function canCraftByRequirements(state: GameState, recipe: Recipe) {
  if (recipe.requiredMachine && state.machines[recipe.requiredMachine] < 1) return false
  if (!hasMachines(state, recipe.machineInputs)) return false
  if (!hasAvailableResourceCosts(state, recipe.catalysts)) return false
  if (!hasDurableUses(state, recipe.durabilityCosts)) return false
  return hasAvailableResources(state, recipe.inputs)
}

export function canCraft(state: GameState, recipe: Recipe) {
  return canCraftByRequirements(state, recipe)
}

export function craftRecipeInstant(state: GameState, recipe: Recipe, quantity: number) {
  const requestedQuantity = Math.max(1, Math.floor(quantity))
  if (craftableQuantity(state, recipe) < requestedQuantity) return state

  let next = subtractResources(state, scaleResourceAmounts(recipe.inputs, requestedQuantity))
  next = addResources(next, scaleResourceAmounts(recipe.outputs, requestedQuantity))
  next = applyDurabilityCosts(next, scaleResourceAmounts(recipe.durabilityCosts ?? [], requestedQuantity))
  if (recipe.outputs.length) {
    next = cloneState(next)
    next.craftedResources = Array.from(new Set([...next.craftedResources, ...recipe.outputs.map((output) => output.id)]))
    recordResourceMilestones(next, scaleResourceAmounts(recipe.outputs, requestedQuantity))
    next.lastSavedAt = Date.now()
  }

  if (recipe.machineOutputs?.length) {
    next = cloneState(next)
    for (const machine of scaleMachineAmounts(recipe.machineOutputs, requestedQuantity)) {
      next.machines[machine.id] += machine.amount
    }
    recordMachineMilestones(next, scaleMachineAmounts(recipe.machineOutputs, requestedQuantity))
    next.lastSavedAt = Date.now()
  }

  next = cloneState(next)
  next.recipeMilestones[recipe.id] = (next.recipeMilestones[recipe.id] ?? 0) + requestedQuantity
  if (recipe.surveyCardOutput) {
    next.surveyCards[recipe.surveyCardOutput] = Math.max(1, next.surveyCards[recipe.surveyCardOutput] ?? 0)
  }
  next.lastSavedAt = Date.now()

  return next
}

function combineResourceAmounts(amounts: ResourceAmount[]) {
  const totals = new Map<ResourceId, number>()
  for (const amount of amounts) {
    totals.set(amount.id, (totals.get(amount.id) ?? 0) + amount.amount)
  }
  return [...totals].map(([id, amount]) => ({ id, amount }))
}

function isInsideFactoryGrid(state: GameState, x: number, y: number) {
  const grid = factoryGridForState(state)
  return x >= 0 && x < grid.width && y >= 0 && y < grid.height
}

function nextMachineUid(state: GameState, machineId: MachineId) {
  let index = state.machineInstances.length + 1
  let uid = `${machineId}-${index}`
  const used = new Set(state.machineInstances.map((instance) => instance.uid))
  while (used.has(uid)) {
    index += 1
    uid = `${machineId}-${index}`
  }
  return uid
}

type MatchedProcessRecipe = {
  recipe: ProcessRecipe
  inputCost: ResourceAmount
  secondaryInputCost?: ResourceAmount
  extraInputCosts?: ResourceAmount[]
  assemblerInputAmounts?: number[]
}

const assemblerExtraInputSlotIds = ['extraInput1', 'extraInput2', 'extraInput3', 'extraInput4'] as const
const assemblerInputSlotIds = ['input', 'secondaryInput', ...assemblerExtraInputSlotIds] as const

function extraProcessInputSlots(process: MachineProcessState): ProcessSlot[] {
  return assemblerExtraInputSlotIds.map((slotId) => process[slotId])
}

function isAlloySmelterIngredient(resourceId: ResourceId) {
  return resourceId.endsWith('Ingot') || resourceId.endsWith('Dust')
}

function isAlloySmelterOutput(resourceId: ResourceId) {
  return resourceId.endsWith('Ingot')
}

function processSlotCanPay(slot: ProcessSlot, cost: ResourceAmount) {
  if (cost.amount <= 0) return true
  return Boolean(slot && slot.id === cost.id && slot.amount >= cost.amount)
}

function recipeItemOutputs(recipe: ProcessRecipe) {
  if (recipe.fluidOnly) return []
  return [recipe.output, recipe.secondaryOutput].filter((output): output is ResourceAmount => Boolean(output && output.amount > 0))
}

function recipeFluidInputs(recipe: ProcessRecipe) {
  return recipe.fluidInputs ?? (recipe.fluidInput ? [recipe.fluidInput] : [])
}

function recipeFluidOutputs(recipe: ProcessRecipe) {
  return recipe.fluidOutputs ?? (recipe.fluidOutput ? [recipe.fluidOutput] : [])
}

function matchProcessRecipeInputs(recipe: ProcessRecipe, input: ProcessSlot, secondaryInput: ProcessSlot, extraInputs: ProcessSlot[] = []): MatchedProcessRecipe | undefined {
  if (recipe.fluidOnly) return { recipe, inputCost: recipe.input }
  if (recipe.machineId === 'lvAssembler') {
    const slots = [input, secondaryInput, ...extraInputs]
    const costs = [recipe.input, ...(recipe.secondaryInput ? [recipe.secondaryInput] : []), ...(recipe.extraInputs ?? [])]
    const requiredByResource = new Map<ResourceId, number>()
    for (const cost of costs) requiredByResource.set(cost.id, (requiredByResource.get(cost.id) ?? 0) + cost.amount)
    if (slots.some((slot) => slot && !requiredByResource.has(slot.id))) return undefined
    for (const [resourceId, required] of requiredByResource) {
      const stored = slots.reduce((total, slot) => total + (slot?.id === resourceId ? slot.amount : 0), 0)
      if (stored < required) return undefined
    }

    const remainingByResource = new Map(requiredByResource)
    const assemblerInputAmounts = slots.map((slot) => {
      if (!slot) return 0
      const remaining = remainingByResource.get(slot.id) ?? 0
      const consumed = Math.min(slot.amount, remaining)
      remainingByResource.set(slot.id, remaining - consumed)
      return consumed
    })
    return {
      recipe,
      inputCost: recipe.input,
      secondaryInputCost: recipe.secondaryInput,
      extraInputCosts: recipe.extraInputs,
      assemblerInputAmounts,
    }
  }

  const extraCosts = recipe.extraInputs ?? []
  if (extraCosts.length > 0) {
    if (!processSlotCanPay(input, recipe.input)) return undefined
    if (recipe.secondaryInput && !processSlotCanPay(secondaryInput, recipe.secondaryInput)) return undefined
    if (!recipe.secondaryInput && secondaryInput) return undefined
    if (!extraCosts.every((cost, index) => processSlotCanPay(extraInputs[index] ?? null, cost))) return undefined
    if (extraInputs.slice(extraCosts.length).some(Boolean)) return undefined
    return { recipe, inputCost: recipe.input, secondaryInputCost: recipe.secondaryInput, extraInputCosts: extraCosts }
  }
  if (extraInputs.some(Boolean)) return undefined

  if (!recipe.secondaryInput) {
    if (secondaryInput) return undefined
    return processSlotCanPay(input, recipe.input) ? { recipe, inputCost: recipe.input } : undefined
  }

  if (!secondaryInput) return undefined
  if (recipe.machineId === 'steamAlloySmelter') {
    if (!isAlloySmelterIngredient(recipe.input.id) || !isAlloySmelterIngredient(recipe.secondaryInput.id) || !isAlloySmelterOutput(recipe.output.id)) return undefined
  }
  if (processSlotCanPay(input, recipe.input) && processSlotCanPay(secondaryInput, recipe.secondaryInput)) {
    return { recipe, inputCost: recipe.input, secondaryInputCost: recipe.secondaryInput }
  }
  if (processSlotCanPay(input, recipe.secondaryInput) && processSlotCanPay(secondaryInput, recipe.input)) {
    return { recipe, inputCost: recipe.secondaryInput, secondaryInputCost: recipe.input }
  }
  return undefined
}

function findMatchedProcessRecipe(machineId: MachineId, input: ProcessSlot, secondaryInput: ProcessSlot = null, extraInputs: ProcessSlot[] = [], configuredRecipeId: string | null = null) {
  return processRecipes
    .filter((recipe) => recipe.machineId === machineId)
    .filter((recipe) => configuredRecipeId ? recipe.id === configuredRecipeId : recipe.autoSelectable !== false)
    .map((recipe) => matchProcessRecipeInputs(recipe, input, secondaryInput, extraInputs))
    .find((match): match is MatchedProcessRecipe => Boolean(match))
}

function findProcessRecipeForInput(machineId: MachineId, input: ProcessSlot) {
  if (!input) return undefined
  return findMatchedProcessRecipe(machineId, input)?.recipe
}

function findProcessRecipeForInputAndFuel(machineId: MachineId, input: ProcessSlot, fuel: ProcessSlot) {
  const candidates = processRecipes
    .filter((recipe) => recipe.machineId === machineId)
    .map((recipe) => matchProcessRecipeInputs(recipe, input, null))
    .filter((match): match is MatchedProcessRecipe => Boolean(match))
  return candidates.find((match) => !match.recipe.fuelInput || (fuel?.id === match.recipe.fuelInput.id && fuel.amount >= match.recipe.fuelInput.amount))?.recipe
}

function canOutputAccept(output: ProcessSlot, produced: ResourceAmount) {
  if (!output) return true
  return output.id === produced.id && output.amount + produced.amount <= processStackLimit
}

function canRecipeItemOutputsAccept(process: MachineProcessState, recipe: ProcessRecipe) {
  return recipeItemOutputs(recipe).every((produced, index) => canOutputAccept(index === 0 ? process.output : process.output2, produced))
}

function addRecipeItemOutputs(process: MachineProcessState, recipe: ProcessRecipe) {
  const outputs = recipeItemOutputs(recipe)
  if (outputs[0]) process.output = addToProcessOutput(process.output, outputs[0])
  if (outputs[1]) process.output2 = addToProcessOutput(process.output2, outputs[1])
}

function canFluidOutputAccept(process: MachineProcessState, recipe: ProcessRecipe) {
  return recipeFluidOutputs(recipe).every((output) => (process.fluids[output.id] ?? 0) + output.amount <= process.fluidCapacityLitres)
}

function addFluidOutput(process: MachineProcessState, recipe: ProcessRecipe) {
  for (const output of recipeFluidOutputs(recipe)) process.fluids[output.id] = (process.fluids[output.id] ?? 0) + output.amount
}

function machinePositionKey(x: number, y: number) {
  return `${x},${y}`
}

function factoryTopologySignature(state: GameState) {
  const instances = state.machineInstances
    .map((instance) => {
      const sideModes = pipeDirections.map((direction) => pipeSideMode(instance, direction)).join(',')
      return `${instance.uid}:${instance.machineId}:${instance.x}:${instance.y}:${instance.level}:${sideModes}`
    })
    .sort()
    .join('|')
  return `${state.factoryFoundationLevel}|${instances}`
}

function createFactoryTopologyCache(signature: string): FactoryTopologyCache {
  return {
    signature,
    euNetworks: new Map(),
    euReachability: new Map(),
    euProducers: new Map(),
    euSources: new Map(),
    euNetworkKeys: new Map(),
    euNetworkCableAmps: new Map(),
    euNearestSourceDistances: new Map(),
    steamNetworks: new Map(),
    fluidNetworks: new Map(),
    fluidNetworksForInstance: new Map(),
    flowCells: new Map(),
    multiblockCenters: new Map(),
  }
}

function activateFactoryTopology(state: GameState) {
  const signature = factoryTopologySignature(state)
  if (!reusableFactoryTopologyCache || reusableFactoryTopologyCache.signature !== signature) {
    reusableFactoryTopologyCache = createFactoryTopologyCache(signature)
  }
  return {
    state,
    byPosition: new Map(state.machineInstances.map((instance) => [machinePositionKey(instance.x, instance.y), instance])),
    byUid: new Map(state.machineInstances.map((instance) => [instance.uid, instance])),
    cache: reusableFactoryTopologyCache,
  } satisfies ActiveFactoryTopology
}

function activeTopologyFor(state: GameState) {
  return activeFactoryTopology?.state === state ? activeFactoryTopology : null
}

function refreshActiveTopologyAfterMutation(state: GameState) {
  const context = activeTopologyFor(state)
  if (!context) return
  const signature = factoryTopologySignature(state)
  if (context.cache.signature === signature) return
  const cache = createFactoryTopologyCache(signature)
  reusableFactoryTopologyCache = cache
  context.cache = cache
}

function currentInstancesForUids(context: ActiveFactoryTopology, uids: string[]) {
  return uids.map((uid) => context.byUid.get(uid)).filter((instance): instance is MachineInstance => Boolean(instance))
}

function currentEuEntries(context: ActiveFactoryTopology, entries: CachedEuNetworkEntry[]) {
  return entries
    .map((entry) => {
      const instance = context.byUid.get(entry.uid)
      return instance ? { instance, cableDistance: entry.cableDistance } : null
    })
    .filter((entry): entry is { instance: MachineInstance; cableDistance: number } => Boolean(entry))
}

function adjacentPositions(state: GameState, x: number, y: number) {
  return [
    { x: x - 1, y },
    { x: x + 1, y },
    { x, y: y - 1 },
    { x, y: y + 1 },
  ].filter((position) => isInsideFactoryGrid(state, position.x, position.y))
}

function machineAt(state: GameState, x: number, y: number) {
  const context = activeTopologyFor(state)
  if (context) return context.byPosition.get(machinePositionKey(x, y))
  return state.machineInstances.find((instance) => instance.x === x && instance.y === y)
}

export function isFluidOutletConfigurableMachine(machineId: MachineId) {
  return machineId === 'cokeOven' || machineId === 'cokeOvenPart' || machineId === 'lvChemicalReactor' || machineId === 'lvCentrifuge' || machineId === 'lvAirCollector'
}

function isConfigurableConnector(machineId: MachineId) {
  return (
    isSteamPipeMachine(machineId) ||
    isEuCableMachine(machineId) ||
    isItemHopperMachine(machineId) ||
    isFluidOutletConfigurableMachine(machineId) ||
    machineId === 'lvEnergyHatch2A' ||
    machineId === 'lvInputBus' ||
    machineId === 'lvOutputBus' ||
    machineId === 'lvFluidInputHatch' ||
    machineId === 'lvFluidOutputHatch'
  )
}

function connectorsCanAutoConnect(first: MachineId, second: MachineId) {
  return (isSteamPipeMachine(first) && isSteamPipeMachine(second)) || (isEuCableMachine(first) && isEuCableMachine(second))
}

function setConnectorSideModeInPlace(instance: MachineInstance, direction: PipeDirection, mode: PipeSideMode) {
  const modes = { ...instance.pipeSideModes }
  const disabledSides = { ...instance.pipeDisabledSides }
  if (mode === 'both') delete modes[direction]
  else modes[direction] = mode
  if (mode === 'blocked') disabledSides[direction] = true
  else delete disabledSides[direction]
  instance.pipeSideModes = modes
  instance.pipeDisabledSides = disabledSides
}

function directionBetween(from: MachineInstance, to: MachineInstance): PipeDirection | null {
  if (to.x === from.x && to.y === from.y - 1) return 'north'
  if (to.x === from.x + 1 && to.y === from.y) return 'east'
  if (to.x === from.x && to.y === from.y + 1) return 'south'
  if (to.x === from.x - 1 && to.y === from.y) return 'west'
  return null
}

function connectorAllowsDirection(instance: MachineInstance, direction: PipeDirection) {
  return !isConfigurableConnector(instance.machineId) || pipeSideMode(instance, direction) !== 'blocked'
}

export function pipeSideMode(instance: MachineInstance, direction: PipeDirection): PipeSideMode {
  if (!isConfigurableConnector(instance.machineId)) return 'both'
  if (instance.pipeSideModes?.[direction]) return instance.pipeSideModes[direction]
  if (instance.pipeDisabledSides?.[direction]) return 'blocked'
  if (isFluidOutletConfigurableMachine(instance.machineId)) return 'blocked'
  return 'both'
}

function connectorAllowsFlowOut(instance: MachineInstance, direction: PipeDirection) {
  if (!isConfigurableConnector(instance.machineId)) return true
  const mode = pipeSideMode(instance, direction)
  return mode === 'both' || mode === 'output'
}

function connectorAllowsFlowIn(instance: MachineInstance, direction: PipeDirection) {
  if (!isConfigurableConnector(instance.machineId)) return true
  const mode = pipeSideMode(instance, direction)
  return mode === 'both' || mode === 'input'
}

export function machinesCanConnect(from: MachineInstance, to: MachineInstance) {
  const direction = directionBetween(from, to)
  if (!direction) return false
  return connectorAllowsDirection(from, direction) && connectorAllowsDirection(to, oppositePipeDirection[direction])
}

function machinesCanConnectEu(from: MachineInstance, to: MachineInstance) {
  const direction = directionBetween(from, to)
  if (!direction) return false
  const allowsEuConnection = (instance: MachineInstance, side: PipeDirection) => {
    if (isEuPoweredMachine(instance.machineId) && isFluidOutletConfigurableMachine(instance.machineId)) return true
    return connectorAllowsDirection(instance, side)
  }
  return allowsEuConnection(from, direction) && allowsEuConnection(to, oppositePipeDirection[direction])
}

function machinesCanFlow(from: MachineInstance, to: MachineInstance) {
  const direction = directionBetween(from, to)
  if (!direction) return false
  return connectorAllowsFlowOut(from, direction) && connectorAllowsFlowIn(to, oppositePipeDirection[direction])
}

function multiblockControllerSpecs() {
  return (Object.keys(machines) as MachineId[])
    .map((machineId) => machines[machineId].multiblock)
    .filter((spec): spec is NonNullable<(typeof machines)[MachineId]['multiblock']> => Boolean(spec))
}

function multiblockSpecForMachine(machineId: MachineId) {
  return multiblockControllerSpecs().find((spec) => spec.controller === machineId || spec.part === machineId) ?? null
}

export function multiblockPositions(state: GameState, controllerX: number, controllerY: number, spec: NonNullable<(typeof machines)[MachineId]['multiblock']>) {
  const offsetX = spec.controllerOffsetX ?? 0
  const offsetY = spec.controllerOffsetY ?? 0
  const originX = controllerX - offsetX
  const originY = controllerY - offsetY
  const positions = Array.from({ length: spec.width * spec.height }, (_, index) => ({
    x: originX + (index % spec.width),
    y: originY + Math.floor(index / spec.width),
  }))
  return positions.every((position) => isInsideFactoryGrid(state, position.x, position.y)) ? positions : []
}

function multiblockCenterForInstance(state: GameState, instance: MachineInstance) {
  const context = activeTopologyFor(state)
  if (context?.cache.multiblockCenters.has(instance.uid)) {
    return context.cache.multiblockCenters.get(instance.uid) ?? null
  }
  const spec = multiblockSpecForMachine(instance.machineId)
  if (!spec) {
    context?.cache.multiblockCenters.set(instance.uid, null)
    return null
  }
  const offsetX = spec.controllerOffsetX ?? 0
  const offsetY = spec.controllerOffsetY ?? 0

  for (let dy = 0; dy < spec.height; dy += 1) {
    for (let dx = 0; dx < spec.width; dx += 1) {
      const controllerX = instance.x - dx + offsetX
      const controllerY = instance.y - dy + offsetY
      const positions = multiblockPositions(state, controllerX, controllerY, spec)
      if (positions.length < spec.width * spec.height) continue
      const controller = machineAt(state, controllerX, controllerY)
      if (controller?.machineId !== spec.controller) continue
      const complete = positions.every((position) => {
        const candidate = machineAt(state, position.x, position.y)
        if (!candidate) return false
        if (position.x === controllerX && position.y === controllerY) return candidate.machineId === spec.controller
        return candidate.machineId === spec.part
      })
      if (complete) {
        const center = { x: controllerX, y: controllerY, spec }
        context?.cache.multiblockCenters.set(instance.uid, center)
        return center
      }
    }
  }
  context?.cache.multiblockCenters.set(instance.uid, null)
  return null
}

function tryFormMultiblock(state: GameState, placed: MachineInstance) {
  const spec = multiblockControllerSpecs().find((candidate) => candidate.part === placed.machineId)
  if (!spec) return false
  const offsetX = spec.controllerOffsetX ?? 0
  const offsetY = spec.controllerOffsetY ?? 0

  for (let dy = 0; dy < spec.height; dy += 1) {
    for (let dx = 0; dx < spec.width; dx += 1) {
      const controllerX = placed.x - dx + offsetX
      const controllerY = placed.y - dy + offsetY
      const positions = multiblockPositions(state, controllerX, controllerY, spec)
      if (positions.length < spec.width * spec.height) continue
      if (!positions.every((position) => machineAt(state, position.x, position.y)?.machineId === spec.part)) continue
      const controller = machineAt(state, controllerX, controllerY)
      if (!controller) continue
      controller.uid = nextMachineUid(state, spec.controller)
      controller.machineId = spec.controller
      controller.process = emptyProcessState()
      state.machines[spec.part] = Math.max(0, state.machines[spec.part] - 1)
      state.machines[spec.controller] += 1
      return true
    }
  }
  return false
}

export function multiblockControllerForInstance(state: GameState, instance: MachineInstance) {
  return multiblockCenterForInstance(state, instance)
}

export function isReachGateFormed(state: GameState) {
  return state.machineInstances.some(
    (instance) => instance.machineId === 'reachGate' && Boolean(multiblockCenterForInstance(state, instance)),
  )
}

const arcPerimeterMachineIds = new Set<MachineId>([
  'arcBlastFurnacePart',
  'lvEnergyHatch2A',
  'lvInputBus',
  'lvOutputBus',
  'lvFluidInputHatch',
  'lvFluidOutputHatch',
])

export type ArcBlastFurnaceStructure = {
  controller: MachineInstance
  positions: Array<{ x: number; y: number }>
  perimeter: MachineInstance[]
  energyHatches: MachineInstance[]
  inputBus: MachineInstance | null
  outputBus: MachineInstance | null
  fluidInputHatch: MachineInstance | null
  fluidOutputHatch: MachineInstance | null
  formed: boolean
  faults: string[]
}

function arcControllerNearInstance(state: GameState, instance: MachineInstance) {
  if (instance.machineId === 'arcBlastFurnace') return instance
  if (!arcPerimeterMachineIds.has(instance.machineId)) return null
  return state.machineInstances.find(
    (candidate) => candidate.machineId === 'arcBlastFurnace' && Math.abs(candidate.x - instance.x) <= 1 && Math.abs(candidate.y - instance.y) <= 1,
  ) ?? null
}

export function arcBlastFurnaceStructureForInstance(state: GameState, instance: MachineInstance): ArcBlastFurnaceStructure | null {
  const controller = arcControllerNearInstance(state, instance)
  if (!controller) return null
  const positions = Array.from({ length: 9 }, (_, index) => ({
    x: controller.x + (index % 3) - 1,
    y: controller.y + Math.floor(index / 3) - 1,
  }))
  const faults: string[] = []
  if (!positions.every((position) => isInsideFactoryGrid(state, position.x, position.y))) faults.push('The 3x3 structure extends beyond the factory floor.')
  const perimeter = positions
    .filter((position) => position.x !== controller.x || position.y !== controller.y)
    .map((position) => machineAt(state, position.x, position.y))
    .filter((candidate): candidate is MachineInstance => Boolean(candidate))
  const invalid = perimeter.filter((candidate) => !arcPerimeterMachineIds.has(candidate.machineId))
  const energyHatches = perimeter.filter((candidate) => candidate.machineId === 'lvEnergyHatch2A')
  const inputBuses = perimeter.filter((candidate) => candidate.machineId === 'lvInputBus')
  const outputBuses = perimeter.filter((candidate) => candidate.machineId === 'lvOutputBus')
  const fluidInputHatches = perimeter.filter((candidate) => candidate.machineId === 'lvFluidInputHatch')
  const fluidOutputHatches = perimeter.filter((candidate) => candidate.machineId === 'lvFluidOutputHatch')
  if (perimeter.length !== 8) faults.push(`Install ${8 - perimeter.length} more perimeter component${8 - perimeter.length === 1 ? '' : 's'}.`)
  if (invalid.length > 0) faults.push('Replace invalid perimeter machines with Arc Furnace components.')
  if (energyHatches.length !== 2) faults.push('Install exactly two 2A LV Energy Hatches.')
  if (inputBuses.length !== 1) faults.push('Install exactly one LV Input Bus.')
  if (outputBuses.length !== 1) faults.push('Install exactly one LV Output Bus.')
  if (fluidInputHatches.length > 1) faults.push('Install no more than one LV Fluid Input Hatch.')
  if (fluidOutputHatches.length > 1) faults.push('Install no more than one LV Fluid Output Hatch.')
  return {
    controller,
    positions,
    perimeter,
    energyHatches,
    inputBus: inputBuses[0] ?? null,
    outputBus: outputBuses[0] ?? null,
    fluidInputHatch: fluidInputHatches[0] ?? null,
    fluidOutputHatch: fluidOutputHatches[0] ?? null,
    formed: faults.length === 0,
    faults,
  }
}

function arcPortOutwardDirections(structure: ArcBlastFurnaceStructure, port: MachineInstance) {
  const directions: PipeDirection[] = []
  if (port.x < structure.controller.x) directions.push('west')
  if (port.x > structure.controller.x) directions.push('east')
  if (port.y < structure.controller.y) directions.push('north')
  if (port.y > structure.controller.y) directions.push('south')
  return directions
}

function normalizeArcPortFaces(structure: ArcBlastFurnaceStructure) {
  for (const port of structure.perimeter.filter((candidate) => candidate.machineId !== 'arcBlastFurnacePart')) {
    const outward = arcPortOutwardDirections(structure, port)
    const activeMode: PipeSideMode = port.machineId === 'lvOutputBus' || port.machineId === 'lvFluidOutputHatch' ? 'output' : port.machineId === 'lvInputBus' || port.machineId === 'lvFluidInputHatch' ? 'input' : 'both'
    for (const direction of pipeDirections) setConnectorSideModeInPlace(port, direction, outward.includes(direction) ? activeMode : 'blocked')
  }
}

function repairDisconnectedArcEnergyHatchFace(state: GameState, structure: ArcBlastFurnaceStructure, hatch: MachineInstance) {
  const outward = arcPortOutwardDirections(structure, hatch)
  const hasConnectedFace = outward.some((direction) => {
    if (pipeSideMode(hatch, direction) === 'blocked') return false
    const offset = pipeDirectionOffsets[direction]
    const neighbour = machineAt(state, hatch.x + offset.dx, hatch.y + offset.dy)
    return Boolean(neighbour && isEuNetworkMachine(neighbour.machineId) && machinesCanConnect(hatch, neighbour))
  })
  if (hasConnectedFace) return
  const replacement = outward.find((direction) => {
    const offset = pipeDirectionOffsets[direction]
    const neighbour = machineAt(state, hatch.x + offset.dx, hatch.y + offset.dy)
    return Boolean(neighbour && isEuNetworkMachine(neighbour.machineId))
  })
  if (!replacement) return
  for (const direction of pipeDirections) setConnectorSideModeInPlace(hatch, direction, direction === replacement ? 'both' : 'blocked')
  refreshActiveTopologyAfterMutation(state)
}

const steamTankStructureSpecs = [
  { width: 3, height: 3 },
  { width: 3, height: 2 },
  { width: 2, height: 2 },
] as const

type SteamTankStructureSpec = (typeof steamTankStructureSpecs)[number]

function steamTankStructurePositions(state: GameState, originX: number, originY: number, spec: SteamTankStructureSpec) {
  const positions = Array.from({ length: spec.width * spec.height }, (_, index) => ({
    x: originX + (index % spec.width),
    y: originY + Math.floor(index / spec.width),
  }))
  return positions.every((position) => isInsideFactoryGrid(state, position.x, position.y)) ? positions : []
}

function steamTankStructureSpecForLevel(level: number) {
  return steamTankStructureSpecs.find((spec) => spec.width * spec.height === level) ?? null
}

function steamTankStructureAtOrigin(state: GameState, originX: number, originY: number, spec: SteamTankStructureSpec) {
  const area = spec.width * spec.height
  const positions = steamTankStructurePositions(state, originX, originY, spec)
  if (positions.length < area) return null
  const controller = machineAt(state, originX, originY)
  if (!controller || controller.machineId !== 'steamTank' || controller.level !== area) return null

  const complete = positions.every((position) => {
    const candidate = machineAt(state, position.x, position.y)
    if (!candidate || candidate.machineId !== 'steamTank') return false
    if (candidate.uid === controller.uid) return true
    return candidate.level === 0
  })
  if (!complete) return null

  return {
    controller,
    x: originX,
    y: originY,
    width: spec.width,
    height: spec.height,
    area,
    positions,
  }
}

export function steamTankStructureForInstance(state: GameState, instance: MachineInstance) {
  if (instance.machineId !== 'steamTank') return null

  if (instance.level > 1) {
    const spec = steamTankStructureSpecForLevel(instance.level)
    return spec ? steamTankStructureAtOrigin(state, instance.x, instance.y, spec) : null
  }

  if (instance.level !== 0) return null

  for (const spec of steamTankStructureSpecs) {
    for (let dy = 0; dy < spec.height; dy += 1) {
      for (let dx = 0; dx < spec.width; dx += 1) {
        const structure = steamTankStructureAtOrigin(state, instance.x - dx, instance.y - dy, spec)
        if (structure) return structure
      }
    }
  }
  return null
}

function steamTankStorageForInstance(state: GameState, instance: MachineInstance) {
  return steamTankStructureForInstance(state, instance)?.controller ?? instance
}

function uniqueMachineInstances(instances: MachineInstance[]) {
  const unique = new Map<string, MachineInstance>()
  for (const instance of instances) unique.set(instance.uid, instance)
  return [...unique.values()]
}

export function steamTankCapacityMsForInstance(state: GameState, instance: MachineInstance) {
  const structure = steamTankStructureForInstance(state, instance)
  if (structure && structure.controller.uid !== instance.uid) return 0
  return steamTankCapacityMs * (structure?.area ?? 1)
}

export function steamTankFluidCapacityLitresForInstance(state: GameState, instance: MachineInstance) {
  const structure = steamTankStructureForInstance(state, instance)
  if (structure && structure.controller.uid !== instance.uid) return 0
  return ironTankFluidCapacityLitres * (structure?.area ?? 1)
}

function canAbsorbSteamTankStructures(state: GameState, positions: Array<{ x: number; y: number }>) {
  const positionKeys = new Set(positions.map((position) => `${position.x},${position.y}`))
  for (const position of positions) {
    const tank = machineAt(state, position.x, position.y)
    const structure = tank ? steamTankStructureForInstance(state, tank) : null
    if (!structure) continue
    if (!structure.positions.every((structurePosition) => positionKeys.has(`${structurePosition.x},${structurePosition.y}`))) return false
  }
  return true
}

function tryFormSteamTankStructure(state: GameState, placed: MachineInstance) {
  if (placed.machineId !== 'steamTank') return false

  for (const spec of steamTankStructureSpecs) {
    const area = spec.width * spec.height
    for (let dy = 0; dy < spec.height; dy += 1) {
      for (let dx = 0; dx < spec.width; dx += 1) {
        const originX = placed.x - dx
        const originY = placed.y - dy
        const positions = steamTankStructurePositions(state, originX, originY, spec)
        if (positions.length < area) continue
        if (!positions.every((position) => machineAt(state, position.x, position.y)?.machineId === 'steamTank')) continue
        if (!canAbsorbSteamTankStructures(state, positions)) continue

        const tanks = positions.map((position) => machineAt(state, position.x, position.y)!).sort((a, b) => a.uid.localeCompare(b.uid))
        const controller = machineAt(state, originX, originY)
        if (!controller) continue

        const steamStoredMs = Math.min(
          tanks.reduce((sum, tank) => sum + tank.process.steamStoredMs, 0),
          steamTankCapacityMs * area,
        )
        const fluidTotals = tanks.reduce(
          (totals, tank) => {
            for (const fluidId of fluidIds) totals[fluidId] = (totals[fluidId] ?? 0) + (tank.process.fluids[fluidId] ?? 0)
            return totals
          },
          {} as Partial<Record<FluidId, number>>,
        )
        const fluidCapacityLitres = ironTankFluidCapacityLitres * area
        const selectedFluid = fluidIds
          .map((id) => ({ id, amount: fluidTotals[id] ?? 0 }))
          .filter((fluid) => fluid.amount > 0)
          .sort((a, b) => b.amount - a.amount || fluidIds.indexOf(a.id) - fluidIds.indexOf(b.id))[0]

        controller.level = area
        controller.process.steamCapacityMs = steamTankCapacityMs * area
        controller.process.steamStoredMs = steamStoredMs
        controller.process.fluidCapacityLitres = fluidCapacityLitres
        controller.process.fluids = selectedFluid
          ? normalizeFluidStore({ [selectedFluid.id]: Math.min(selectedFluid.amount, fluidCapacityLitres) })
          : normalizeFluidStore()

        for (const tank of tanks) {
          if (tank.uid === controller.uid) continue
          tank.level = 0
          tank.process.steamCapacityMs = 0
          tank.process.steamStoredMs = 0
          tank.process.fluidCapacityLitres = 0
          tank.process.fluids = normalizeFluidStore()
        }
        return true
      }
    }
  }
  return false
}

function hasAdjacentWaterSource(state: GameState, boiler: MachineInstance) {
  return adjacentPositions(state, boiler.x, boiler.y).some((position) => machineAt(state, position.x, position.y)?.machineId === 'well')
}

function hasConnectedWaterSource(state: GameState, boiler: MachineInstance) {
  const visited = new Set<string>()
  const queue = [boiler]

  while (queue.length > 0) {
    const instance = queue.shift()!
    if (visited.has(instance.uid)) continue
    visited.add(instance.uid)

    if (instance.uid !== boiler.uid && instance.machineId === 'well') return true
    if (instance.uid !== boiler.uid && !isSteamPipeMachine(instance.machineId)) continue

    for (const position of adjacentPositions(state, instance.x, instance.y)) {
      const next = machineAt(state, position.x, position.y)
      if (!next || visited.has(next.uid)) continue
      if ((isSteamPipeMachine(next.machineId) || next.machineId === 'well') && machinesCanFlow(next, instance)) queue.push(next)
    }
  }

  return false
}

export function boilerHasWater(state: GameState, boiler: MachineInstance) {
  if (boiler.machineId !== 'steamBoiler' && !isLiquidSteamBoilerMachine(boiler.machineId)) return false
  return (boiler.process.fluids.water ?? 0) > 0 || hasAdjacentWaterSource(state, boiler) || hasConnectedWaterSource(state, boiler)
}

export function currentWellWaterFlowLitresPerSecond(state: GameState, well: MachineInstance) {
  if (well.machineId !== 'well') return 0
  const visited = new Set<string>()
  const queue = [well]
  while (queue.length > 0) {
    const instance = queue.shift()!
    if (visited.has(instance.uid)) continue
    visited.add(instance.uid)
    for (const position of adjacentPositions(state, instance.x, instance.y)) {
      const next = machineAt(state, position.x, position.y)
      if (!next || visited.has(next.uid) || !machinesCanFlow(instance, next)) continue
      if (next.machineId === 'steamBoiler' && next.process.steamStoredMs < boilerSteamCapacityMs) {
        return Math.min(wellWaterOutputLitresPerSecond, connectedFluidTransferRateLitres(state, well))
      }
      if (isSteamPipeMachine(next.machineId)) queue.push(next)
    }
  }
  return 0
}

function machineFluidCapacity(machineId: MachineId) {
  return machineFluidCapacityLitres(machineId)
}

function machineFluidCapacityForInstance(state: GameState, instance: MachineInstance) {
  if (instance.machineId === 'steamTank') return steamTankFluidCapacityLitresForInstance(state, instance)
  return machineFluidCapacity(instance.machineId)
}

export function fluidBufferAcceptedFluids(machineId: MachineId, buffer: MachineFluidBufferSpec) {
  if (Array.isArray(buffer.fluidRule)) return buffer.fluidRule
  if (buffer.fluidRule === 'any') return fluidIds
  const recipesForMachine = processRecipes.filter((recipe) => recipe.machineId === machineId)
  const accepted = buffer.fluidRule === 'recipe-inputs'
    ? recipesForMachine.flatMap(recipeFluidInputs).filter((fluid) => !fluid.bufferId || fluid.bufferId === buffer.id).map((fluid) => fluid.id)
    : recipesForMachine.flatMap(recipeFluidOutputs).filter((fluid) => !fluid.bufferId || fluid.bufferId === buffer.id).map((fluid) => fluid.id)
  return [...new Set(accepted)]
}

export function machineFluidBuffersForInstance(state: GameState, instance: MachineInstance) {
  return (machines[instance.machineId].fluidBuffers ?? []).map((buffer) => ({
    ...buffer,
    capacityLitres: instance.machineId === 'steamTank' ? steamTankFluidCapacityLitresForInstance(state, instance) : buffer.capacityLitres,
    acceptedFluids: fluidBufferAcceptedFluids(instance.machineId, buffer),
  }))
}

function compatibleFluidBuffer(state: GameState, instance: MachineInstance, fluidId: FluidId, direction: 'input' | 'output') {
  return machineFluidBuffersForInstance(state, instance).find((buffer) => {
    const accessMatches = buffer.access === 'both' || buffer.access === direction
    return accessMatches && buffer.acceptedFluids.includes(fluidId)
  })
}

function fluidCapacityForFluid(state: GameState, instance: MachineInstance, fluidId: FluidId, direction: 'input' | 'output' = 'input') {
  return compatibleFluidBuffer(state, instance, fluidId, direction)?.capacityLitres ?? 0
}

function storedFluidTypes(process: MachineProcessState) {
  return (Object.keys(process.fluids) as FluidId[]).filter((id) => (process.fluids[id] ?? 0) > 0)
}

function canStoreFluid(state: GameState, instance: MachineInstance, fluidId: FluidId) {
  const capacity = fluidCapacityForFluid(state, instance, fluidId, 'input')
  if (capacity < 1) return false
  const buffer = compatibleFluidBuffer(state, instance, fluidId, 'input')
  if (buffer?.fluidRule !== 'any') return true
  const storedTypes = storedFluidTypes(instance.process)
  return storedTypes.length < 1 || storedTypes.every((id) => id === fluidId)
}

function connectedFluidNetwork(state: GameState, start: MachineInstance, flowOnly = false) {
  const context = activeTopologyFor(state)
  const cacheKey = `${start.uid}:${flowOnly ? 'flow' : 'connect'}`
  const cached = context?.cache.fluidNetworks.get(cacheKey)
  if (context && cached) return currentInstancesForUids(context, cached)

  const visited = new Set<string>()
  const queue = [start]
  const network: MachineInstance[] = []
  let queueIndex = 0

  while (queueIndex < queue.length) {
    const instance = queue[queueIndex++]
    if (visited.has(instance.uid)) continue
    visited.add(instance.uid)
    network.push(instance)

    if (instance.uid !== start.uid && !isSteamPipeMachine(instance.machineId)) continue

    for (const position of adjacentPositions(state, instance.x, instance.y)) {
      const next = machineAt(state, position.x, position.y)
      if (
        next &&
        (flowOnly ? machinesCanFlow(instance, next) : machinesCanConnect(instance, next)) &&
        (isSteamPipeMachine(next.machineId) || machineFluidCapacity(next.machineId) > 0 || next.machineId === 'well') &&
        !visited.has(next.uid)
      ) {
        queue.push(next)
      }
    }
  }

  context?.cache.fluidNetworks.set(cacheKey, network.map((instance) => instance.uid))
  return network
}

function connectedSteamNetwork(state: GameState, start: MachineInstance, flowOnly = false) {
  if (!isSteamNetworkMachine(start.machineId)) return [] as MachineInstance[]
  const context = activeTopologyFor(state)
  const cacheKey = `${start.uid}:${flowOnly ? 'flow' : 'connect'}`
  const cached = context?.cache.steamNetworks.get(cacheKey)
  if (context && cached) return currentInstancesForUids(context, cached)

  const visited = new Set<string>()
  const queue = [start]
  const network: MachineInstance[] = []
  let queueIndex = 0

  while (queueIndex < queue.length) {
    const instance = queue[queueIndex++]
    if (visited.has(instance.uid)) continue
    visited.add(instance.uid)
    network.push(instance)

    if (instance.uid !== start.uid && !isSteamPipeMachine(instance.machineId)) continue

    for (const position of adjacentPositions(state, instance.x, instance.y)) {
      const next = machineAt(state, position.x, position.y)
      if (next && (flowOnly ? machinesCanFlow(instance, next) : machinesCanConnect(instance, next)) && isSteamNetworkMachine(next.machineId) && !visited.has(next.uid)) queue.push(next)
    }
  }
  context?.cache.steamNetworks.set(cacheKey, network.map((instance) => instance.uid))
  return network
}

function connectedEuNetworkWithDistance(state: GameState, start: MachineInstance) {
  if (!isEuNetworkMachine(start.machineId)) return [] as Array<{ instance: MachineInstance; cableDistance: number }>
  const context = activeTopologyFor(state)
  const cached = context?.cache.euNetworks.get(start.uid)
  if (context && cached) return currentEuEntries(context, cached)

  const visited = new Map<string, number>()
  const queue = [{ instance: start, cableDistance: 0 }]
  const network: Array<{ instance: MachineInstance; cableDistance: number }> = []
  let queueIndex = 0

  const isEuMultiblockBridge = (instance: MachineInstance) => {
    const controller = multiblockCenterForInstance(state, instance)
    return Boolean(controller && isEuNetworkMachine(controller.spec.controller))
  }

  while (queueIndex < queue.length) {
    const current = queue[queueIndex++]
    const previousDistance = visited.get(current.instance.uid)
    if (typeof previousDistance === 'number' && previousDistance <= current.cableDistance) continue
    visited.set(current.instance.uid, current.cableDistance)
    network.push(current)

    if (current.instance.uid !== start.uid && !isEuCableMachine(current.instance.machineId) && !isEuMultiblockBridge(current.instance)) continue

    for (const position of adjacentPositions(state, current.instance.x, current.instance.y)) {
      const next = machineAt(state, position.x, position.y)
      if (!next || (!isEuNetworkMachine(next.machineId) && !isEuMultiblockBridge(next))) continue
      if (!machinesCanConnectEu(current.instance, next)) continue
      const nextDistance = current.cableDistance + (isEuCableMachine(next.machineId) ? 1 : 0)
      const knownDistance = visited.get(next.uid)
      if (typeof knownDistance !== 'number' || nextDistance < knownDistance) {
        queue.push({ instance: next, cableDistance: nextDistance })
      }
    }
  }

  if (context) {
    const cachedNetwork = network.map(({ instance, cableDistance }) => ({ uid: instance.uid, cableDistance }))
    context.cache.euNetworks.set(start.uid, cachedNetwork)
    context.cache.euReachability.set(start.uid, new Set(cachedNetwork.map((entry) => entry.uid)))
  }
  return network
}

function canEuFlowBetween(state: GameState, source: MachineInstance, target: MachineInstance) {
  const context = activeTopologyFor(state)
  const reachable = context?.cache.euReachability.get(source.uid)
  if (reachable) return reachable.has(target.uid)
  return connectedEuNetworkWithDistance(state, source).some((entry) => entry.instance.uid === target.uid)
}

function flowCellsForInstance(state: GameState, instance: MachineInstance) {
  const context = activeTopologyFor(state)
  const cached = context?.cache.flowCells.get(instance.uid)
  if (context && cached) return currentInstancesForUids(context, cached)

  const tankStructure = instance.machineId === 'steamTank' ? steamTankStructureForInstance(state, instance) : null
  if (tankStructure) {
    const cells = tankStructure.positions.map((position) => machineAt(state, position.x, position.y)).filter((cell): cell is MachineInstance => Boolean(cell))
    context?.cache.flowCells.set(instance.uid, cells.map((cell) => cell.uid))
    return cells
  }

  const multiblock = multiblockCenterForInstance(state, instance)
  if (multiblock && isFluidOutletConfigurableMachine(multiblock.spec.controller)) {
    const cells = multiblockPositions(state, multiblock.x, multiblock.y, multiblock.spec)
      .map((position) => machineAt(state, position.x, position.y))
      .filter((cell): cell is MachineInstance => Boolean(cell))
    context?.cache.flowCells.set(instance.uid, cells.map((cell) => cell.uid))
    return cells
  }

  context?.cache.flowCells.set(instance.uid, [instance.uid])
  return [instance]
}

function connectedFluidNetworkForInstance(state: GameState, start: MachineInstance, flowOnly = false) {
  const context = activeTopologyFor(state)
  const cacheKey = `${start.uid}:${flowOnly ? 'flow' : 'connect'}`
  const cached = context?.cache.fluidNetworksForInstance.get(cacheKey)
  if (context && cached) return currentInstancesForUids(context, cached)
  const network = uniqueMachineInstances(flowCellsForInstance(state, start).flatMap((cell) => connectedFluidNetwork(state, cell, flowOnly)))
  context?.cache.fluidNetworksForInstance.set(cacheKey, network.map((instance) => instance.uid))
  return network
}

function canSteamFlowBetween(state: GameState, source: MachineInstance, target: MachineInstance) {
  const targetUids = new Set(flowCellsForInstance(state, target).map((cell) => cell.uid))
  return flowCellsForInstance(state, source).some((sourceCell) => connectedSteamNetwork(state, sourceCell, true).some((instance) => targetUids.has(instance.uid)))
}

function canFluidFlowBetween(state: GameState, source: MachineInstance, target: MachineInstance) {
  const targetUids = new Set(flowCellsForInstance(state, target).map((cell) => cell.uid))
  return flowCellsForInstance(state, source).some((sourceCell) => connectedFluidNetwork(state, sourceCell, true).some((instance) => targetUids.has(instance.uid)))
}

function connectedEuProducers(state: GameState, start: MachineInstance) {
  const context = activeTopologyFor(state)
  const cached = context?.cache.euProducers.get(start.uid)
  if (context && cached) return currentEuEntries(context, cached)
  const producers = connectedEuNetworkWithDistance(state, start)
    .filter((entry) => entry.instance.uid !== start.uid && isEuProducerMachine(entry.instance.machineId) && canEuFlowBetween(state, entry.instance, start))
    .sort((a, b) => a.cableDistance - b.cableDistance || a.instance.uid.localeCompare(b.instance.uid))
  context?.cache.euProducers.set(start.uid, producers.map(({ instance, cableDistance }) => ({ uid: instance.uid, cableDistance })))
  return producers
}

function connectedEuSources(state: GameState, start: MachineInstance) {
  const context = activeTopologyFor(state)
  const cached = context?.cache.euSources.get(start.uid)
  if (context && cached) return currentEuEntries(context, cached)
  const sources = connectedEuNetworkWithDistance(state, start)
    .filter((entry) => entry.instance.uid !== start.uid && (isEuProducerMachine(entry.instance.machineId) || isEuStorageMachine(entry.instance.machineId)) && canEuFlowBetween(state, entry.instance, start))
    .sort((a, b) => {
      const aStorage = isEuStorageMachine(a.instance.machineId) ? 0 : 1
      const bStorage = isEuStorageMachine(b.instance.machineId) ? 0 : 1
      return aStorage - bStorage || a.cableDistance - b.cableDistance || a.instance.uid.localeCompare(b.instance.uid)
    })
  context?.cache.euSources.set(start.uid, sources.map(({ instance, cableDistance }) => ({ uid: instance.uid, cableDistance })))
  return sources
}

function euNetworkKey(state: GameState, start: MachineInstance) {
  const context = activeTopologyFor(state)
  const cached = context?.cache.euNetworkKeys.get(start.uid)
  if (typeof cached === 'string') return cached
  const key = uniqueMachineInstances(connectedEuNetworkWithDistance(state, start).map((entry) => entry.instance))
    .filter((instance) => isEuCableMachine(instance.machineId))
    .map((instance) => instance.uid)
    .sort()
    .join('|')
  context?.cache.euNetworkKeys.set(start.uid, key)
  return key
}

function euNetworkCableAmps(state: GameState, start: MachineInstance) {
  const context = activeTopologyFor(state)
  const cached = context?.cache.euNetworkCableAmps.get(start.uid)
  if (typeof cached === 'number') return cached
  const cables = uniqueMachineInstances(connectedEuNetworkWithDistance(state, start).map((entry) => entry.instance)).filter((instance) => isEuCableMachine(instance.machineId))
  const amps = cables.length < 1 ? Number.POSITIVE_INFINITY : Math.min(...cables.map((instance) => Math.max(1, machineEuAmps(instance.machineId))))
  context?.cache.euNetworkCableAmps.set(start.uid, amps)
  return amps
}

export function batteryBufferSlots(machineId: MachineId) {
  return isEuStorageMachine(machineId) ? Math.max(1, machineEuAmps(machineId)) : 0
}

const bufferBatteryIds = ['sodiumBattery', 'lithiumBattery', 'lvBattery'] as const
type BufferBatteryId = (typeof bufferBatteryIds)[number]

function isBufferBatteryId(resourceId: ResourceId): resourceId is BufferBatteryId {
  return bufferBatteryIds.includes(resourceId as BufferBatteryId)
}

export function batteryEuCapacity(resourceId: ResourceId) {
  if (resourceId === 'lithiumBattery') return lithiumBatteryEuCapacity
  if (resourceId === 'sodiumBattery' || resourceId === 'lvBattery') return sodiumBatteryEuCapacity
  return 0
}

export function batteryBufferInstalledBatteries(instance: MachineInstance) {
  if (!isEuStorageMachine(instance.machineId)) return 0
  return instance.process.batterySlots.filter((id): id is BufferBatteryId => Boolean(id && isBufferBatteryId(id))).length
}

export function batteryBufferInstalledBatteryId(instance: MachineInstance) {
  return instance.process.batterySlots.find((id): id is BufferBatteryId => Boolean(id && isBufferBatteryId(id))) ?? null
}

function batteryBufferEuCapacity(instance: MachineInstance) {
  return instance.process.batterySlots.reduce((total, batteryId) => total + (batteryId ? batteryEuCapacity(batteryId) : 0), 0)
}

function euSourceOutputAmps(instance: MachineInstance) {
  if (isEuStorageMachine(instance.machineId)) return batteryBufferInstalledBatteries(instance)
  return Math.max(0, machineEuAmps(instance.machineId))
}

function euSourceOutputPerSecond(instance: MachineInstance) {
  if (isEuStorageMachine(instance.machineId)) return euSourceOutputAmps(instance) * lvEuPerAmpSecond
  return machineEuOutputPerSecond(instance.machineId)
}

export function availableConnectedEuAmps(state: GameState, instance: MachineInstance) {
  const sourceAmps = connectedEuSources(state, instance).reduce((sum, source) => sum + euSourceOutputAmps(source.instance), 0)
  const cableAmps = euNetworkCableAmps(state, instance)
  return Math.max(0, Math.min(sourceAmps, cableAmps))
}

function canSteamTankReceiveFromNetwork(state: GameState, tank: MachineInstance) {
  const structure = steamTankStructureForInstance(state, tank)
  const tankCells = structure?.positions.map((position) => machineAt(state, position.x, position.y)).filter((cell): cell is MachineInstance => Boolean(cell)) ?? [tank]

  return tankCells.some((cell) => {
    return adjacentPositions(state, cell.x, cell.y).some((position) => {
      const adjacent = machineAt(state, position.x, position.y)
      return Boolean(
        adjacent &&
          machinesCanConnect(cell, adjacent) &&
          (adjacent.machineId === 'steamBoiler' || isLiquidSteamBoilerMachine(adjacent.machineId) || isSteamPipeMachine(adjacent.machineId)),
      )
    })
  })
}

function connectedSteamStorage(state: GameState, start: MachineInstance) {
  const startStorage = start.machineId === 'steamTank' ? steamTankStorageForInstance(state, start) : start
  return uniqueMachineInstances(
    connectedSteamNetwork(state, start)
      .filter((instance) => instance.uid !== start.uid && isSteamStorageMachine(instance.machineId))
      .map((instance) => (instance.machineId === 'steamTank' ? steamTankStorageForInstance(state, instance) : instance))
      .filter((instance) => instance.uid !== startStorage.uid && canSteamFlowBetween(state, instance, startStorage)),
  )
}

function connectedSteamTransferRateMs(state: GameState, start: MachineInstance) {
  const pipeRates = connectedSteamNetwork(state, start)
    .map((instance) => steamPipeTransferLitresPerSecond[instance.machineId])
    .filter((rate): rate is number => typeof rate === 'number')
  const litresPerSecond = pipeRates.length > 0 ? Math.min(...pipeRates) : 24
  return litresPerSecond * steamMsPerLitre
}

export function availableConnectedSteam(state: GameState, instance: MachineInstance) {
  return connectedSteamStorage(state, instance).reduce((sum, storage) => sum + storage.process.steamStoredMs, 0)
}

export function availableConnectedEu(state: GameState, instance: MachineInstance) {
  return connectedEuSources(state, instance).reduce((sum, source) => sum + source.instance.process.euStored, 0)
}

export function availableConnectedEuStorage(state: GameState, instance: MachineInstance) {
  return connectedEuNetworkWithDistance(state, instance)
    .filter((entry) => entry.instance.uid !== instance.uid && isEuStorageMachine(entry.instance.machineId))
    .filter((entry) => canEuFlowBetween(state, entry.instance, instance))
    .reduce((sum, storage) => sum + storage.instance.process.euStored, 0)
}

function nearestConnectedEuSourceDistance(state: GameState, instance: MachineInstance) {
  const context = activeTopologyFor(state)
  const cached = context?.cache.euNearestSourceDistances.get(instance.uid)
  if (typeof cached === 'number') return cached
  const distance = connectedEuSources(state, instance)[0]?.cableDistance ?? Number.POSITIVE_INFINITY
  context?.cache.euNearestSourceDistances.set(instance.uid, distance)
  return distance
}

export function isAutoMinerPowered(state: GameState, instance: MachineInstance) {
  if (instance.machineId === 'steamAutoMiner') return instance.process.steamStoredMs + availableConnectedSteam(state, instance) > 0
  if (instance.machineId === 'lvAutoMiner') return instance.process.euStored + availableConnectedEu(state, instance) > 0
  return false
}

function connectedFluidStorage(state: GameState, start: MachineInstance, fluidId: FluidId) {
  const startStorage = start.machineId === 'steamTank' ? steamTankStorageForInstance(state, start) : start
  return uniqueMachineInstances(
    connectedFluidNetworkForInstance(state, start, true)
      .filter((instance) => instance.uid !== start.uid)
      .map((instance) => (instance.machineId === 'steamTank' ? steamTankStorageForInstance(state, instance) : instance))
      .filter((instance) => instance.uid !== startStorage.uid && canStoreFluid(state, instance, fluidId)),
  )
}

function connectedFluidSources(state: GameState, start: MachineInstance, fluidId: FluidId) {
  const startStorage = start.machineId === 'steamTank' ? steamTankStorageForInstance(state, start) : start
  return uniqueMachineInstances(
    connectedFluidNetworkForInstance(state, start)
      .filter((instance) => instance.uid !== start.uid)
      .map((instance) => (instance.machineId === 'steamTank' ? steamTankStorageForInstance(state, instance) : instance))
      .filter((instance) => instance.uid !== startStorage.uid && canExportFluidSource(instance) && (instance.process.fluids[fluidId] ?? 0) > 0 && canFluidFlowBetween(state, instance, startStorage)),
  ).sort((a, b) => a.uid.localeCompare(b.uid))
}

function connectedFluidTransferRateLitres(state: GameState, start: MachineInstance) {
  const pipeRates = connectedFluidNetworkForInstance(state, start)
    .map((instance) => steamPipeTransferLitresPerSecond[instance.machineId])
    .filter((rate): rate is number => typeof rate === 'number')
  const directRate = machineFluidOutputLitresPerSecond(start.machineId) || 24
  return pipeRates.length > 0 ? Math.min(...pipeRates) : directRate
}

function fluidExportSourceCountForNetwork(state: GameState, source: MachineInstance, fluidId: FluidId) {
  const network = connectedFluidNetworkForInstance(state, source)
  const sourceTargetUids = new Set(connectedFluidOutputTargets(state, source, fluidId).map((target) => target.uid))
  const sources = uniqueMachineInstances(
    network
      .map((instance) => (instance.machineId === 'steamTank' ? steamTankStorageForInstance(state, instance) : instance))
      .filter(
        (candidate) =>
          canExportFluidSource(candidate) &&
          (candidate.process.fluids[fluidId] ?? 0) > 0 &&
          connectedFluidOutputTargets(state, candidate, fluidId).some((target) => sourceTargetUids.has(target.uid)),
      ),
  )
  return Math.max(1, sources.length)
}

function fluidExportTransferRateLitres(state: GameState, source: MachineInstance, fluidId: FluidId) {
  const sourceLimit = machineFluidOutputLitresPerSecond(source.machineId)
  if (sourceLimit <= 0) return 0
  const sharedRouteLimit = connectedFluidTransferRateLitres(state, source) / fluidExportSourceCountForNetwork(state, source, fluidId)
  return Math.min(sourceLimit, sharedRouteLimit)
}

function canExportFluidSource(instance: MachineInstance) {
  return machineFluidOutputLitresPerSecond(instance.machineId) > 0
}

function connectedFluidOutputTargets(state: GameState, source: MachineInstance, fluidId: FluidId) {
  const targets = connectedFluidStorage(state, source, fluidId)
  if (source.machineId === 'steamTank') return targets.filter((target) => isLiquidSteamBoilerMachine(target.machineId))
  return targets
}

function freeFluidCapacity(state: GameState, instance: MachineInstance, fluidId: FluidId) {
  const capacity = fluidCapacityForFluid(state, instance, fluidId, 'input')
  return Math.max(0, capacity - (instance.process.fluids[fluidId] ?? 0))
}

function emptyContainerResource(kind: FluidContainerKind): ResourceId {
  return kind === 'bucket' ? 'bucket' : 'emptySteelCell'
}

function nextFluidContainerUid(state: GameState, kind: FluidContainerKind) {
  const prefix = kind === 'bucket' ? 'bucket' : 'cell'
  let index = state.fluidContainers.length + 1
  while (state.fluidContainers.some((container) => container.uid === `${prefix}-${index}`)) index += 1
  return `${prefix}-${index}`
}

export function fluidTransferMilestoneKey(direction: 'fill' | 'drain', kind: FluidContainerKind, fluidId: FluidId, machineId?: MachineId) {
  return [direction, kind, fluidId, machineId ?? 'any'].join(':')
}

function recordFluidTransfer(state: GameState, direction: 'fill' | 'drain', kind: FluidContainerKind, fluidId: FluidId, machineId: MachineId, amountLitres: number) {
  const amount = normalizeLitres(amountLitres)
  for (const key of [fluidTransferMilestoneKey(direction, kind, fluidId), fluidTransferMilestoneKey(direction, kind, fluidId, machineId)]) {
    state.fluidTransferMilestones[key] = normalizeLitres((state.fluidTransferMilestones[key] ?? 0) + amount)
  }
}

export function fluidContainerGroups(state: GameState) {
  const groups = new Map<string, { key: string; kind: FluidContainerKind; fluidId: FluidId; amountLitres: number; count: number; containerUid: string }>()
  for (const container of state.fluidContainers) {
    const key = `${container.kind}:${container.fluidId}:${container.amountLitres.toFixed(3)}`
    const existing = groups.get(key)
    if (existing) existing.count += 1
    else groups.set(key, { key, kind: container.kind, fluidId: container.fluidId, amountLitres: container.amountLitres, count: 1, containerUid: container.uid })
  }
  return [...groups.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.fluidId.localeCompare(b.fluidId) || b.amountLitres - a.amountLitres)
}

function manualFluidTarget(state: GameState, instance: MachineInstance) {
  return instance.machineId === 'steamTank' ? steamTankStorageForInstance(state, instance) : instance
}

export function fillPortableFluidContainer(
  state: GameState,
  machineUid: string,
  kind: FluidContainerKind,
  options: { containerUid?: string; fluidId?: FluidId; bufferId?: string } = {},
) {
  const sourceInstance = state.machineInstances.find((candidate) => candidate.uid === machineUid)
  if (!sourceInstance) return state
  const source = manualFluidTarget(state, sourceInstance)
  const existing = options.containerUid ? state.fluidContainers.find((container) => container.uid === options.containerUid && container.kind === kind) : undefined
  if (options.containerUid && !existing) return state
  if (!existing && availableResourceAmount(state, emptyContainerResource(kind)) < 1) return state
  const outputBuffers = machineFluidBuffersForInstance(state, source).filter((buffer) => buffer.access === 'output' || buffer.access === 'both')
  const selectedFluid = existing?.fluidId ?? options.fluidId ?? outputBuffers.flatMap((buffer) => buffer.acceptedFluids).find((fluidId) => (source.process.fluids[fluidId] ?? 0) > 0)
  if (!selectedFluid) return state
  const outputBuffer = outputBuffers.find((buffer) => (!options.bufferId || buffer.id === options.bufferId) && buffer.acceptedFluids.includes(selectedFluid))
  if (!outputBuffer) return state
  const stored = source.process.fluids[selectedFluid] ?? 0
  const free = fluidContainerCapacities[kind] - (existing?.amountLitres ?? 0)
  const transfer = normalizeLitres(Math.min(stored, free))
  if (transfer <= 0) return state

  const next = cloneState(state)
  const nextSourceInstance = next.machineInstances.find((candidate) => candidate.uid === machineUid)!
  const nextSource = manualFluidTarget(next, nextSourceInstance)
  nextSource.process.fluids[selectedFluid] = normalizeLitres((nextSource.process.fluids[selectedFluid] ?? 0) - transfer)
  if (existing) {
    const nextContainer = next.fluidContainers.find((container) => container.uid === existing.uid)!
    nextContainer.amountLitres = normalizeLitres(nextContainer.amountLitres + transfer)
  } else {
    next.resources[emptyContainerResource(kind)] -= 1
    next.fluidContainers.push({ uid: nextFluidContainerUid(next, kind), kind, fluidId: selectedFluid, amountLitres: transfer })
  }
  recordFluidTransfer(next, 'fill', kind, selectedFluid, sourceInstance.machineId, transfer)
  next.lastSavedAt = Date.now()
  return next
}

export function drainPortableFluidContainer(state: GameState, machineUid: string, containerUid: string, bufferId?: string) {
  const targetInstance = state.machineInstances.find((candidate) => candidate.uid === machineUid)
  const container = state.fluidContainers.find((candidate) => candidate.uid === containerUid)
  if (!targetInstance || !container) return state
  const target = manualFluidTarget(state, targetInstance)
  const inputBuffer = machineFluidBuffersForInstance(state, target).find((buffer) =>
    (!bufferId || buffer.id === bufferId) && (buffer.access === 'input' || buffer.access === 'both') && buffer.acceptedFluids.includes(container.fluidId),
  )
  if (!inputBuffer || !canStoreFluid(state, target, container.fluidId)) return state
  const transfer = normalizeLitres(Math.min(container.amountLitres, inputBuffer.capacityLitres - (target.process.fluids[container.fluidId] ?? 0)))
  if (transfer <= 0) return state

  const next = cloneState(state)
  const nextTargetInstance = next.machineInstances.find((candidate) => candidate.uid === machineUid)!
  const nextTarget = manualFluidTarget(next, nextTargetInstance)
  nextTarget.process.fluids[container.fluidId] = normalizeLitres((nextTarget.process.fluids[container.fluidId] ?? 0) + transfer)
  nextTarget.process.fluidCapacityLitres = Math.max(nextTarget.process.fluidCapacityLitres, inputBuffer.capacityLitres)
  const nextContainer = next.fluidContainers.find((candidate) => candidate.uid === containerUid)!
  nextContainer.amountLitres = normalizeLitres(nextContainer.amountLitres - transfer)
  if (nextContainer.amountLitres <= 0) {
    next.fluidContainers = next.fluidContainers.filter((candidate) => candidate.uid !== containerUid)
    next.resources[emptyContainerResource(container.kind)] += 1
  }
  recordFluidTransfer(next, 'drain', container.kind, container.fluidId, targetInstance.machineId, transfer)
  next.lastSavedAt = Date.now()
  return next
}

export type CurrentFluidOutputFlow = {
  fluidId: FluidId
  litresPerSecond: number
  storedLitres: number
  freeLitres: number
}

export function currentFluidOutputFlows(state: GameState, instance: MachineInstance): CurrentFluidOutputFlow[] {
  const transferRate = connectedFluidTransferRateLitres(state, instance)

  if (isSteamPipeMachine(instance.machineId)) {
    const network = connectedFluidNetwork(state, instance)
    const networkUids = new Set(network.map((networkInstance) => networkInstance.uid))

    return fluidIds
      .map((fluidId) => {
        const sources = uniqueMachineInstances(
          network
            .map((networkInstance) => (networkInstance.machineId === 'steamTank' ? steamTankStorageForInstance(state, networkInstance) : networkInstance))
            .filter((source) => canExportFluidSource(source) && ((source.process.fluids[fluidId] ?? 0) > 0 || (source.machineId === 'well' && fluidId === 'water'))),
        )
        const storedLitres = sources.reduce(
          (sum, source) => sum + Math.max(source.process.fluids[fluidId] ?? 0, source.machineId === 'well' && fluidId === 'water' ? machineFluidOutputLitresPerSecond(source.machineId) : 0),
          0,
        )
        if (storedLitres <= 0) return null

        const targets = uniqueMachineInstances(
          sources.flatMap((source) => connectedFluidOutputTargets(state, source, fluidId).filter((target) => networkUids.has(target.uid))),
        )
        const freeLitres = targets.reduce((sum, target) => sum + freeFluidCapacity(state, target, fluidId), 0)

        return {
          fluidId,
          litresPerSecond: Math.min(transferRate, storedLitres, freeLitres),
          storedLitres,
          freeLitres,
        }
      })
      .filter((flow): flow is CurrentFluidOutputFlow => Boolean(flow))
  }

  const source = instance.machineId === 'steamTank' ? steamTankStorageForInstance(state, instance) : instance
  if (!canExportFluidSource(source)) return []

  return fluidIds
    .map((fluidId) => {
      const storedLitres = source.process.fluids[fluidId] ?? 0
      if (storedLitres <= 0) return null
      const freeLitres = connectedFluidOutputTargets(state, source, fluidId).reduce((sum, target) => sum + freeFluidCapacity(state, target, fluidId), 0)
      const sourceTransferRate = fluidExportTransferRateLitres(state, source, fluidId)
      return {
        fluidId,
        litresPerSecond: Math.min(sourceTransferRate, storedLitres, freeLitres),
        storedLitres,
        freeLitres,
      }
    })
    .filter((flow): flow is CurrentFluidOutputFlow => Boolean(flow))
}

export function currentSteamPipeFlowLitresPerSecond(state: GameState, instance: MachineInstance) {
  if (!isSteamPipeMachine(instance.machineId)) return 0
  const sourceSteamMs = availableConnectedSteam(state, instance)
  if (sourceSteamMs <= 0) return 0

  const sourceUids = new Set(connectedSteamStorage(state, instance).map((source) => source.uid))
  const demandMs = uniqueMachineInstances(connectedSteamNetwork(state, instance, true))
    .filter((target) => target.uid !== instance.uid && !sourceUids.has(target.uid))
    .reduce((sum, target) => {
      if (isSteamPoweredMachine(target.machineId)) {
        const capacity = machineSteamCapacityLitres(target.machineId) * steamMsPerLitre
        return sum + Math.max(0, capacity - target.process.steamStoredMs)
      }
      if (isEuProducerMachine(target.machineId)) {
        return sum + (target.process.euStored < steamTurbineEuCapacity ? steamTurbineSteamUseLitresPerSecond * steamMsPerLitre : 0)
      }
      if (target.machineId === 'steamTank') {
        const storage = steamTankStorageForInstance(state, target)
        if (sourceUids.has(storage.uid)) return sum
        return sum + Math.max(0, steamTankCapacityMsForInstance(state, storage) - storage.process.steamStoredMs)
      }
      return sum
    }, 0)

  if (demandMs <= 0) return 0
  return Math.min(connectedSteamTransferRateMs(state, instance) / steamMsPerLitre, sourceSteamMs / steamMsPerLitre, demandMs / steamMsPerLitre)
}

export function currentEuCableFlowEuPerSecond(state: GameState, instance: MachineInstance) {
  if (!isEuCableMachine(instance.machineId)) return 0
  const availableEu = availableConnectedEu(state, instance)
  if (availableEu <= 0) return 0

  const sourceUids = new Set(connectedEuSources(state, instance).map((source) => source.instance.uid))
  const demandEu = uniqueMachineInstances(connectedEuNetworkWithDistance(state, instance).map((entry) => entry.instance))
    .filter((target) => target.uid !== instance.uid && !sourceUids.has(target.uid))
    .reduce((sum, target) => {
      if (isEuStorageMachine(target.machineId) || isEuPoweredMachine(target.machineId)) {
        const capacity = isEuStorageMachine(target.machineId) ? batteryBufferEuCapacity(target) : machineEuCapacity(target.machineId)
        return sum + Math.max(0, capacity - target.process.euStored)
      }
      return sum
    }, 0)

  if (demandEu <= 0) return 0
  return Math.min(euNetworkCableAmps(state, instance) * lvEuPerAmpSecond, availableEu, demandEu)
}

function tickPipeDisplayBuffers(state: GameState) {
  const steamDisplayCache = new Map<string, { steamFlowLitres: number; sourceSteamMs: number }>()
  const fluidDisplayCache = new Map<string, CurrentFluidOutputFlow | undefined>()
  const euDisplayCache = new Map<string, { flowEu: number; availableEu: number }>()

  for (const instance of state.machineInstances) {
    if (isSteamPipeMachine(instance.machineId)) {
      const steamCapacity = steamPipeBufferCapacityMs(instance.machineId)
      const fluidCapacity = fluidPipeBufferCapacityLitres(instance.machineId)
      const steamKey = transferNetworkKey('steam-display', connectedSteamNetwork(state, instance))
      const steamDisplay = steamDisplayCache.get(steamKey) ?? (() => {
        const value = {
          steamFlowLitres: currentSteamPipeFlowLitresPerSecond(state, instance),
          sourceSteamMs: availableConnectedSteam(state, instance),
        }
        steamDisplayCache.set(steamKey, value)
        return value
      })()
      const fluidKey = transferNetworkKey('fluid-display', connectedFluidNetworkForInstance(state, instance))
      if (!fluidDisplayCache.has(fluidKey)) {
        fluidDisplayCache.set(fluidKey, [...currentFluidOutputFlows(state, instance)].sort((a, b) => b.litresPerSecond - a.litresPerSecond)[0])
      }
      const primaryFluidFlow = fluidDisplayCache.get(fluidKey)

      instance.process.steamCapacityMs = steamCapacity
      instance.process.steamStoredMs =
        steamDisplay.sourceSteamMs > 0
          ? Math.min(steamCapacity, steamDisplay.sourceSteamMs, Math.max(steamDisplay.steamFlowLitres * steamMsPerLitre * 0.5, steamCapacity * 0.35))
          : 0
      instance.process.fluidCapacityLitres = fluidCapacity
      instance.process.fluids = primaryFluidFlow
        ? {
            [primaryFluidFlow.fluidId]: Math.min(
              fluidCapacity,
              primaryFluidFlow.storedLitres,
              Math.max(primaryFluidFlow.litresPerSecond * 0.5, fluidCapacity * 0.35),
            ),
          }
        : normalizeFluidStore()
    } else if (isEuCableMachine(instance.machineId)) {
      const capacity = euCableBufferCapacity(instance.machineId)
      const euKey = euNetworkKey(state, instance) || instance.uid
      const euDisplay = euDisplayCache.get(euKey) ?? (() => {
        const value = {
          flowEu: currentEuCableFlowEuPerSecond(state, instance),
          availableEu: availableConnectedEu(state, instance),
        }
        euDisplayCache.set(euKey, value)
        return value
      })()
      instance.process.euCapacity = capacity
      instance.process.euStored = euDisplay.availableEu > 0 ? Math.min(capacity, euDisplay.availableEu, Math.max(euDisplay.flowEu * 0.5, capacity * 0.35)) : 0
    }
  }
}

function pushFluidToConnectedStorage(state: GameState, source: MachineInstance, fluidId: FluidId, elapsedMs: number) {
  const stored = source.process.fluids[fluidId] ?? 0
  if (stored < 1) return 0

  const key = transferNetworkKey(`fluid:${fluidId}`, connectedFluidNetworkForInstance(state, source))
  const sourceTransferLimit = Math.max(0, Math.floor((fluidExportTransferRateLitres(state, source, fluidId) * elapsedMs) / 1000))
  const networkTransferLimit = Math.max(0, Math.floor((connectedFluidTransferRateLitres(state, source) * elapsedMs) / 1000))
  let remaining = Math.min(stored, sourceTransferLimit, consumeTickBudget(activeFluidTransferBudgets, key, networkTransferLimit, networkTransferLimit))
  let moved = 0
  const storages = connectedFluidStorage(state, source, fluidId).sort((a, b) => a.uid.localeCompare(b.uid))
  for (const [index, storage] of storages.entries()) {
    if (remaining < 1) break
    storage.process.fluidCapacityLitres = machineFluidCapacityForInstance(state, storage)
    const free = storage.process.fluidCapacityLitres - (storage.process.fluids[fluidId] ?? 0)
    const fairShare = Math.ceil(remaining / Math.max(1, storages.length - index))
    const transfer = Math.min(remaining, free, fairShare)
    if (transfer < 1) continue
    storage.process.fluids[fluidId] = (storage.process.fluids[fluidId] ?? 0) + transfer
    remaining -= transfer
    moved += transfer
  }
  source.process.fluids[fluidId] = stored - moved
  spendTickBudget(activeFluidTransferBudgets, key, moved)
  return moved
}

function consumeConnectedSteam(state: GameState, instance: MachineInstance, amount: number) {
  const key = transferNetworkKey('steam', connectedSteamNetwork(state, instance))
  const requested = activeSteamTransferBudgets?.has(key) ? Math.min(amount, activeSteamTransferBudgets.get(key) ?? 0) : amount
  let remaining = requested
  for (const storage of connectedSteamStorage(state, instance).sort((a, b) => a.uid.localeCompare(b.uid))) {
    if (remaining < 1) break
    const spend = Math.min(remaining, storage.process.steamStoredMs)
    storage.process.steamStoredMs -= spend
    remaining -= spend
  }
  const moved = requested - remaining
  spendTickBudget(activeSteamTransferBudgets, key, moved)
  return moved
}

function steamTransferAllowanceMs(state: GameState, instance: MachineInstance, elapsedMs: number) {
  const fullAllowance = elapsedMs === Number.POSITIVE_INFINITY
    ? Number.POSITIVE_INFINITY
    : Math.max(0, Math.floor((connectedSteamTransferRateMs(state, instance) * elapsedMs) / 1000))
  if (!activeSteamTransferBudgets) return fullAllowance
  const key = transferNetworkKey('steam', connectedSteamNetwork(state, instance))
  if (!activeSteamTransferBudgets.has(key)) activeSteamTransferBudgets.set(key, fullAllowance)
  return Math.min(fullAllowance, activeSteamTransferBudgets.get(key) ?? 0)
}

function fillInternalSteamFromConnectedStorage(state: GameState, instance: MachineInstance, transferLimitMs: number) {
  const capacity = isSteamPoweredMachine(instance.machineId) ? machineSteamCapacityLitres(instance.machineId) * steamMsPerLitre : 0
  if (capacity < 1) return 0
  instance.process.steamCapacityMs = capacity
  instance.process.steamStoredMs = Math.min(instance.process.steamStoredMs, capacity)
  const needed = capacity - instance.process.steamStoredMs
  if (needed < 1) return 0
  const moved = consumeConnectedSteam(state, instance, Math.min(needed, Math.max(0, Math.floor(transferLimitMs))))
  instance.process.steamStoredMs += moved
  return moved
}

function fillSteamTankFromConnectedStorage(state: GameState, instance: MachineInstance, elapsedMs: number) {
  if (instance.machineId !== 'steamTank') return 0
  const structure = steamTankStructureForInstance(state, instance)
  if (structure && structure.controller.uid !== instance.uid) return 0
  const capacity = steamTankCapacityMsForInstance(state, instance)
  instance.process.steamCapacityMs = capacity
  instance.process.steamStoredMs = Math.min(instance.process.steamStoredMs, capacity)
  if (!canSteamTankReceiveFromNetwork(state, instance)) return 0
  const needed = capacity - instance.process.steamStoredMs
  if (needed < 1) return 0
  const transferLimit = Math.max(0, Math.floor((connectedSteamTransferRateMs(state, instance) * elapsedMs) / 1000))
  const moved = consumeConnectedSteam(state, instance, Math.min(needed, transferLimit))
  instance.process.steamStoredMs += moved
  return moved
}

function recipeSteamCostMs(recipe: ProcessRecipe) {
  return (recipe.steamCostLitres ?? Math.ceil(recipe.durationMs / steamMsPerLitre)) * steamMsPerLitre
}

function recipeEuCost(recipe: ProcessRecipe) {
  return recipe.euCost ?? Math.ceil(recipe.durationMs / 1000) * 8
}

function consumeConnectedEuFromProducers(state: GameState, instance: MachineInstance, amount: number, elapsedMs: number, maxRouteAmps = Number.POSITIVE_INFINITY) {
  let remaining = amount
  let deliveredTotal = 0
  const networkKey = euNetworkKey(state, instance)
  const networkAmps = euNetworkCableAmps(state, instance)
  const networkBudgetKey = networkKey ? `eu-network:${networkKey}` : ''
  const networkLimit = Number.isFinite(networkAmps) ? (networkAmps * lvEuPerAmpSecond * elapsedMs) / 1000 : Number.POSITIVE_INFINITY

  for (const producer of connectedEuProducers(state, instance)) {
    if (remaining <= 0) break
    const routeAmps = Math.min(euSourceOutputAmps(producer.instance), networkAmps, maxRouteAmps)
    if (routeAmps <= 0) continue
    const outputPerSecond = Math.min(euSourceOutputPerSecond(producer.instance), routeAmps * lvEuPerAmpSecond)
    const lossPerSecond = producer.cableDistance * tinCableLossEuPerTile * Math.max(1, routeAmps)
    const deliverablePerSecond = Math.max(0, outputPerSecond - lossPerSecond)
    const fullTransferLimit = (deliverablePerSecond * elapsedMs) / 1000
    const budgetKey = `eu-source:${producer.instance.uid}`
    const fullSourceLimit = (euSourceOutputPerSecond(producer.instance) * elapsedMs) / 1000
    const sourceLimit = consumeTickBudget(activeEuTransferBudgets, budgetKey, fullSourceLimit, fullTransferLimit)
    const cableLimit = networkBudgetKey
      ? consumeTickBudget(activeEuTransferBudgets, networkBudgetKey, networkLimit, networkLimit)
      : Number.POSITIVE_INFINITY
    const transferLimit = Math.min(sourceLimit, cableLimit)
    if (transferLimit <= 0) continue

    const routeLoss = (lossPerSecond * elapsedMs) / 1000
    const stored = producer.instance.process.euStored
    const availableAfterLoss = Math.max(0, stored - routeLoss)
    const delivered = Math.min(remaining, transferLimit, availableAfterLoss)
    if (delivered <= 0) continue

    producer.instance.process.euStored = Math.max(0, stored - delivered - routeLoss)
    spendTickBudget(activeEuTransferBudgets, budgetKey, delivered)
    if (networkBudgetKey) spendTickBudget(activeEuTransferBudgets, networkBudgetKey, delivered)
    remaining -= delivered
    deliveredTotal += delivered
  }

  return deliveredTotal
}

function consumeConnectedEu(state: GameState, instance: MachineInstance, amount: number, elapsedMs: number, maxRouteAmps = Number.POSITIVE_INFINITY) {
  let remaining = amount
  let deliveredTotal = 0
  const networkKey = euNetworkKey(state, instance)
  const networkAmps = euNetworkCableAmps(state, instance)
  const networkBudgetKey = networkKey ? `eu-network:${networkKey}` : ''
  const networkLimit = Number.isFinite(networkAmps) ? (networkAmps * lvEuPerAmpSecond * elapsedMs) / 1000 : Number.POSITIVE_INFINITY

  for (const producer of connectedEuSources(state, instance)) {
    if (remaining <= 0) break
    const routeAmps = Math.min(euSourceOutputAmps(producer.instance), networkAmps, maxRouteAmps)
    if (routeAmps <= 0) continue
    const outputPerSecond = Math.min(euSourceOutputPerSecond(producer.instance), routeAmps * lvEuPerAmpSecond)
    const lossPerSecond = producer.cableDistance * tinCableLossEuPerTile * Math.max(1, routeAmps)
    const deliverablePerSecond = Math.max(0, outputPerSecond - lossPerSecond)
    const fullTransferLimit = (deliverablePerSecond * elapsedMs) / 1000
    const budgetKey = `eu-source:${producer.instance.uid}`
    const fullSourceLimit = (euSourceOutputPerSecond(producer.instance) * elapsedMs) / 1000
    const sourceLimit = consumeTickBudget(activeEuTransferBudgets, budgetKey, fullSourceLimit, fullTransferLimit)
    const cableLimit = networkBudgetKey
      ? consumeTickBudget(activeEuTransferBudgets, networkBudgetKey, networkLimit, networkLimit)
      : Number.POSITIVE_INFINITY
    const transferLimit = Math.min(sourceLimit, cableLimit)
    if (transferLimit <= 0) continue

    const routeLoss = (lossPerSecond * elapsedMs) / 1000
    const stored = producer.instance.process.euStored
    const availableAfterLoss = Math.max(0, stored - routeLoss)
    const delivered = Math.min(remaining, transferLimit, availableAfterLoss)
    if (delivered <= 0) continue

    producer.instance.process.euStored = Math.max(0, stored - delivered - routeLoss)
    spendTickBudget(activeEuTransferBudgets, budgetKey, delivered)
    if (networkBudgetKey) spendTickBudget(activeEuTransferBudgets, networkBudgetKey, delivered)
    remaining -= delivered
    deliveredTotal += delivered
  }

  return deliveredTotal
}

function fillInternalEuFromConnectedStorage(state: GameState, instance: MachineInstance, elapsedMs: number, requiredAmps = 1) {
  const capacity = machineEuCapacity(instance.machineId)
  if (capacity < 1) return 0
  instance.process.euCapacity = capacity
  instance.process.euStored = Math.min(instance.process.euStored, capacity)
  if (availableConnectedEuAmps(state, instance) < requiredAmps) return 0
  const needed = capacity - instance.process.euStored
  if (needed <= 0) return 0
  const consumerLimit = (Math.max(1, requiredAmps) * lvEuPerAmpSecond * elapsedMs) / 1000
  const moved = consumeConnectedEu(state, instance, Math.min(needed, consumerLimit), elapsedMs, requiredAmps)
  instance.process.euStored += moved
  return moved
}

function addToProcessOutput(output: ProcessSlot, produced: ResourceAmount): ProcessSlot {
  if (produced.amount <= 0) return output
  if (!output) return { ...produced }
  return { ...output, amount: output.amount + produced.amount }
}

function decrementProcessSlot(slot: ProcessSlot, amount: number): ProcessSlot {
  if (!slot) return null
  const remaining = slot.amount - amount
  return remaining > 0 ? { ...slot, amount: remaining } : null
}

export function availableUnplacedMachineCount(state: GameState, machineId: MachineId) {
  if (isResourceBackedMachine(machineId)) return Math.max(0, availableResourceAmount(state, machineId))
  const placed = state.machineInstances.filter((instance) => instance.machineId === machineId).length
  return Math.max(0, state.machines[machineId] - placed)
}

export function installLvBatteryInBuffer(state: GameState, uid: string, batteryId: BufferBatteryId = 'sodiumBattery') {
  const instance = state.machineInstances.find((machine) => machine.uid === uid)
  if (!instance || !isEuStorageMachine(instance.machineId) || availableResourceAmount(state, batteryId) < 1) return state
  const emptySlot = instance.process.batterySlots.findIndex((id) => !id)
  if (emptySlot < 0) return state

  const next = cloneState(state)
  const target = next.machineInstances.find((machine) => machine.uid === uid)
  if (!target) return state
  next.resources[batteryId] -= 1
  target.process.batterySlots[emptySlot] = batteryId
  target.process.euCapacity = batteryBufferEuCapacity(target)
  target.process.euStored = Math.min(target.process.euStored, target.process.euCapacity)
  next.lastSavedAt = Date.now()
  return next
}

export function removeLvBatteryFromBuffer(state: GameState, uid: string, slotIndex?: number) {
  const instance = state.machineInstances.find((machine) => machine.uid === uid)
  if (!instance || !isEuStorageMachine(instance.machineId) || batteryBufferInstalledBatteries(instance) < 1) return state

  const next = cloneState(state)
  const target = next.machineInstances.find((machine) => machine.uid === uid)
  if (!target) return state
  const resolvedIndex = slotIndex ?? target.process.batterySlots.findLastIndex((id) => Boolean(id))
  const batteryId = target.process.batterySlots[resolvedIndex]
  if (!batteryId || !isBufferBatteryId(batteryId)) return state
  target.process.batterySlots[resolvedIndex] = null
  target.process.euCapacity = batteryBufferEuCapacity(target)
  target.process.euStored = Math.min(target.process.euStored, target.process.euCapacity)
  next.resources[batteryId] += 1
  next.lastSavedAt = Date.now()
  return next
}

export function insertMachineStorageSlot(state: GameState, uid: string, slotIndex: number, resourceId: ResourceId, amount = processStackLimit) {
  const instance = state.machineInstances.find((machine) => machine.uid === uid)
  if (!instance || instance.machineId !== 'standardChest' || slotIndex < 0 || slotIndex >= 12) return state
  const existing = instance.process.storageSlots[slotIndex]
  if ((existing && existing.id !== resourceId) || availableResourceAmount(state, resourceId) < 1) return state
  const moved = Math.min(amount, processStackLimit - (existing?.amount ?? 0), availableResourceAmount(state, resourceId))
  if (moved < 1) return state
  const next = cloneState(state)
  const target = next.machineInstances.find((machine) => machine.uid === uid)!
  target.process.storageSlots[slotIndex] = { id: resourceId, amount: (existing?.amount ?? 0) + moved }
  next.resources[resourceId] -= moved
  next.lastSavedAt = Date.now()
  return next
}

export function removeMachineStorageSlot(state: GameState, uid: string, slotIndex: number) {
  const instance = state.machineInstances.find((machine) => machine.uid === uid)
  const stored = instance?.process.storageSlots[slotIndex]
  if (!instance || instance.machineId !== 'standardChest' || !stored) return state
  const next = cloneState(state)
  const target = next.machineInstances.find((machine) => machine.uid === uid)!
  target.process.storageSlots[slotIndex] = null
  next.resources[stored.id] += stored.amount
  next.lastSavedAt = Date.now()
  return next
}

export function placeMachineInstance(state: GameState, machineId: MachineId, x: number, y: number) {
  if (!isInsideFactoryGrid(state, x, y)) return state
  if (availableUnplacedMachineCount(state, machineId) < 1) return state
  if (state.machineInstances.some((instance) => instance.x === x && instance.y === y)) return state

  const next = cloneState(state)
  if (isResourceBackedMachine(machineId)) next.resources[machineId] -= 1
  const placed: MachineInstance = {
    uid: nextMachineUid(next, machineId),
    machineId,
    x,
    y,
    level: 1,
    process: emptyProcessState(),
  }
  if (machineId === 'standardChest') placed.process.storageSlots = Array.from({ length: 12 }, () => null)
  if (isEuStorageMachine(machineId)) placed.process.batterySlots = Array.from({ length: batteryBufferSlots(machineId) }, () => null)
  if (machineId === 'lvChemicalReactor') placed.process.fluidCapacityLitres = machineFluidCapacityLitres(machineId)
  if (isEuHatchMachine(machineId)) {
    placed.process.euCapacity = machineEuCapacity(machineId)
    placed.process.euStored = 0
  }
  if (machineId === 'lvFluidInputHatch' || machineId === 'lvFluidOutputHatch') placed.process.fluidCapacityLitres = 64
  if (isConfigurableConnector(machineId)) {
    placed.pipeDisabledSides = Object.fromEntries(pipeDirections.map((direction) => [direction, true])) as Partial<Record<PipeDirection, boolean>>
    placed.pipeSideModes = Object.fromEntries(pipeDirections.map((direction) => [direction, 'blocked'])) as Partial<Record<PipeDirection, PipeSideMode>>
    for (const direction of pipeDirections) {
      const offset = pipeDirectionOffsets[direction]
      const neighbour = machineAt(next, x + offset.dx, y + offset.dy)
      if (!neighbour || !connectorsCanAutoConnect(machineId, neighbour.machineId)) continue
      setConnectorSideModeInPlace(placed, direction, 'both')
      setConnectorSideModeInPlace(neighbour, oppositePipeDirection[direction], 'both')
    }
  }
  next.machineInstances.push(placed)
  const arcStructure = arcBlastFurnaceStructureForInstance(next, placed)
  if (arcStructure) normalizeArcPortFaces(arcStructure)
  tryFormMultiblock(next, placed)
  tryFormSteamTankStructure(next, placed)
  next.lastSavedAt = Date.now()
  return next
}

function pullFluidFromConnectedSources(state: GameState, instance: MachineInstance, fluidId: FluidId, amount: number, elapsedMs: number) {
  const key = transferNetworkKey(`fluid:${fluidId}`, connectedFluidNetworkForInstance(state, instance))
  const fullTransferLimit = Math.max(0, Math.floor((connectedFluidTransferRateLitres(state, instance) * elapsedMs) / 1000))
  const transferLimit = consumeTickBudget(activeFluidTransferBudgets, key, fullTransferLimit, fullTransferLimit)
  let remaining = Math.min(Math.max(0, Math.floor(amount)), transferLimit)
  let moved = 0
  for (const source of connectedFluidSources(state, instance, fluidId)) {
    if (remaining < 1) break
    const stored = source.process.fluids[fluidId] ?? 0
    const sourceLimit = Math.max(0, Math.floor((fluidExportTransferRateLitres(state, source, fluidId) * elapsedMs) / 1000))
    const transfer = Math.min(remaining, stored, sourceLimit)
    if (transfer < 1) continue
    source.process.fluids[fluidId] = stored - transfer
    remaining -= transfer
    moved += transfer
  }
  spendTickBudget(activeFluidTransferBudgets, key, moved)
  return moved
}

export function assignAutoMiner(state: GameState, uid: string, targetId: GatherTargetId) {
  const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
  if (!instance || !isAutoMinerMachine(instance.machineId) || !canAutoMinerTarget(instance.machineId, targetId)) return state
  if (gatherTargets[targetId].area === 'shatteredReach' && !isReachGateFormed(state)) return state
  const requiresSurveyCard = instance.machineId === 'lvAutoMiner' && !canAutoMinerTarget('steamAutoMiner', targetId)
  if (requiresSurveyCard && instance.surveyCardTarget !== targetId) return state

  const next = cloneState(state)
  next.autoMinerAssignments[uid] = targetId
  next.lastSavedAt = Date.now()
  return next
}

export function installSurveyCardInAutoMiner(state: GameState, uid: string, targetId: GatherTargetId) {
  const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
  if (
    !instance ||
    instance.machineId !== 'lvAutoMiner' ||
    canAutoMinerTarget('steamAutoMiner', targetId) ||
    (state.surveyCards[targetId] ?? 0) < 1 ||
    instance.surveyCardTarget === targetId
  ) return state

  const next = cloneState(state)
  const nextInstance = next.machineInstances.find((candidate) => candidate.uid === uid)!
  if (nextInstance.surveyCardTarget) {
    next.surveyCards[nextInstance.surveyCardTarget] = (next.surveyCards[nextInstance.surveyCardTarget] ?? 0) + 1
  }
  next.surveyCards[targetId] = (next.surveyCards[targetId] ?? 0) - 1
  if ((next.surveyCards[targetId] ?? 0) < 1) delete next.surveyCards[targetId]
  nextInstance.surveyCardTarget = targetId
  const assignedTarget = next.autoMinerAssignments[uid]
  if (assignedTarget && !canAutoMinerTarget('steamAutoMiner', assignedTarget) && assignedTarget !== targetId) {
    delete next.autoMinerAssignments[uid]
  }
  next.lastSavedAt = Date.now()
  return next
}

export function removeSurveyCardFromAutoMiner(state: GameState, uid: string) {
  const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
  if (!instance || instance.machineId !== 'lvAutoMiner' || !instance.surveyCardTarget) return state

  const next = cloneState(state)
  const nextInstance = next.machineInstances.find((candidate) => candidate.uid === uid)!
  const targetId = nextInstance.surveyCardTarget!
  next.surveyCards[targetId] = (next.surveyCards[targetId] ?? 0) + 1
  nextInstance.surveyCardTarget = undefined
  if (next.autoMinerAssignments[uid] && !canAutoMinerTarget('steamAutoMiner', next.autoMinerAssignments[uid])) {
    delete next.autoMinerAssignments[uid]
  }
  next.lastSavedAt = Date.now()
  return next
}

export function unassignAutoMiner(state: GameState, uid: string) {
  if (!state.autoMinerAssignments[uid]) return state

  const next = cloneState(state)
  delete next.autoMinerAssignments[uid]
  next.lastSavedAt = Date.now()
  return next
}

export function setPipeSideDisabled(state: GameState, uid: string, direction: PipeDirection, disabled: boolean) {
  const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
  if (!instance || !isConfigurableConnector(instance.machineId)) return state
  return setPipeSideMode(state, uid, direction, disabled ? 'blocked' : 'both')
}

export function setPipeSideMode(state: GameState, uid: string, direction: PipeDirection, mode: PipeSideMode) {
  const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
  if (!instance || !isConfigurableConnector(instance.machineId) || !pipeSideModes.includes(mode)) return state
  if (isFluidOutletConfigurableMachine(instance.machineId) && mode !== 'output' && mode !== 'blocked') return state
  const nextMode = isEuCableMachine(instance.machineId) && mode !== 'blocked' ? 'both' : mode

  const arcStructure = arcBlastFurnaceStructureForInstance(state, instance)
  if (arcStructure && instance.machineId !== 'arcBlastFurnacePart') {
    const outward = arcPortOutwardDirections(arcStructure, instance)
    if (!outward.includes(direction)) return state
    const next = cloneState(state)
    const nextInstance = next.machineInstances.find((candidate) => candidate.uid === uid)!
    const activeMode: PipeSideMode = nextInstance.machineId === 'lvOutputBus' || nextInstance.machineId === 'lvFluidOutputHatch' ? 'output' : nextInstance.machineId === 'lvInputBus' || nextInstance.machineId === 'lvFluidInputHatch' ? 'input' : 'both'
    for (const candidate of pipeDirections) setConnectorSideModeInPlace(nextInstance, candidate, candidate === direction && mode !== 'blocked' ? activeMode : 'blocked')
    next.lastSavedAt = Date.now()
    return next
  }

  const next = cloneState(state)
  const nextInstance = next.machineInstances.find((candidate) => candidate.uid === uid)
  if (!nextInstance) return state
  const modes = { ...nextInstance.pipeSideModes }
  const disabledSides = { ...nextInstance.pipeDisabledSides }
  if (nextMode === 'both') delete modes[direction]
  else modes[direction] = nextMode
  if (nextMode === 'blocked') disabledSides[direction] = true
  else delete disabledSides[direction]
  nextInstance.pipeSideModes = modes
  nextInstance.pipeDisabledSides = disabledSides
  next.lastSavedAt = Date.now()
  return next
}

export function setFluidOutputDirection(state: GameState, uid: string, direction: PipeDirection) {
  const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
  if (!instance || !isFluidOutletConfigurableMachine(instance.machineId)) return state

  const nextMode: PipeSideMode = pipeSideMode(instance, direction) === 'output' ? 'blocked' : 'output'
  const next = cloneState(state)
  const nextInstance = next.machineInstances.find((candidate) => candidate.uid === uid)
  if (!nextInstance) return state

  setConnectorSideModeInPlace(nextInstance, direction, nextMode)
  next.lastSavedAt = Date.now()
  return next
}

export function setHopperOutputDirection(state: GameState, uid: string, direction: PipeDirection) {
  const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
  if (!instance || !isItemHopperMachine(instance.machineId)) return state
  return setPipeSideMode(state, uid, direction, pipeSideMode(instance, direction) === 'output' ? 'blocked' : 'output')
}

export function togglePipeSideDisabled(state: GameState, uid: string, direction: PipeDirection) {
  const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
  if (!instance || !isConfigurableConnector(instance.machineId)) return state
  return setPipeSideDisabled(state, uid, direction, !instance.pipeDisabledSides?.[direction])
}

export function cyclePipeSideMode(state: GameState, uid: string, direction: PipeDirection) {
  const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
  if (!instance || !isConfigurableConnector(instance.machineId)) return state
  if (isFluidOutletConfigurableMachine(instance.machineId)) return setFluidOutputDirection(state, uid, direction)
  const currentMode = pipeSideMode(instance, direction)
  if (isEuCableMachine(instance.machineId)) return setPipeSideMode(state, uid, direction, currentMode === 'blocked' ? 'both' : 'blocked')
  const currentIndex = pipeSideModes.indexOf(currentMode)
  const nextMode = pipeSideModes[(currentIndex + 1) % pipeSideModes.length]
  return setPipeSideMode(state, uid, direction, nextMode)
}

export function autoMinerAssignmentCounts(state: GameState, targetId: GatherTargetId, machineId?: MachineId) {
  return state.machineInstances.filter(
    (instance) =>
      isAutoMinerMachine(instance.machineId) &&
      (!machineId || instance.machineId === machineId) &&
      state.autoMinerAssignments[instance.uid] === targetId,
  ).length
}

export function removeMachineInstance(state: GameState, uid: string) {
  const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
  if (!instance) return state

  const arcStructure = arcBlastFurnaceStructureForInstance(state, instance)
  if (arcStructure) {
    let next = cloneState(state)
    const nextController = next.machineInstances.find((candidate) => candidate.uid === arcStructure.controller.uid)
    const nextInputBus = arcStructure.inputBus ? next.machineInstances.find((candidate) => candidate.uid === arcStructure.inputBus?.uid) : null
    if (nextController?.process.activeRecipeId && nextInputBus?.process.input) {
      const activeRecipe = processRecipes.find((recipe) => recipe.id === nextController.process.activeRecipeId)
      if (activeRecipe) nextInputBus.process.input = decrementProcessSlot(nextInputBus.process.input, activeRecipe.input.amount)
      nextController.process.activeRecipeId = null
      nextController.process.progressMs = 0
      nextController.process.durationMs = 0
    }
    const removed = next.machineInstances.find((candidate) => candidate.uid === uid)!
    const returned = [removed.process.input, removed.process.output].filter((slot): slot is NonNullable<ProcessSlot> => Boolean(slot))
    next.machineInstances = next.machineInstances.filter((candidate) => candidate.uid !== uid)
    next.lastSavedAt = Date.now()
    if (returned.length > 0) next = addResources(next, returned)
    return next
  }

  const tankStructure = instance.machineId === 'steamTank' ? steamTankStructureForInstance(state, instance) : null
  if (tankStructure) {
    const next = cloneState(state)
    const positionKeys = new Set(tankStructure.positions.map((position) => `${position.x},${position.y}`))
    const removedUids = new Set(next.machineInstances.filter((candidate) => positionKeys.has(`${candidate.x},${candidate.y}`)).map((candidate) => candidate.uid))
    next.machineInstances = next.machineInstances.filter((candidate) => !positionKeys.has(`${candidate.x},${candidate.y}`))
    for (const removedUid of removedUids) delete next.autoMinerAssignments[removedUid]
    next.lastSavedAt = Date.now()
    return next
  }

  const multiblockCenter = multiblockCenterForInstance(state, instance)
  if (multiblockCenter) {
    let next = cloneState(state)
    const positions = multiblockPositions(state, multiblockCenter.x, multiblockCenter.y, multiblockCenter.spec)
    const positionKeys = new Set(positions.map((position) => `${position.x},${position.y}`))
    const controller = machineAt(next, multiblockCenter.x, multiblockCenter.y)
    const returned = [
      controller?.process.input,
      controller?.process.secondaryInput,
      controller?.process.extraInput1,
      controller?.process.extraInput2,
      controller?.process.extraInput3,
      controller?.process.extraInput4,
      controller?.process.fuel,
      controller?.process.output,
    ].filter(
      (slot): slot is NonNullable<ProcessSlot> => Boolean(slot),
    )
    next.machineInstances = next.machineInstances.filter((candidate) => !positionKeys.has(`${candidate.x},${candidate.y}`))
    next.machines[multiblockCenter.spec.controller] = Math.max(0, next.machines[multiblockCenter.spec.controller] - 1)
    next.machines[multiblockCenter.spec.part] += 1
    next.lastSavedAt = Date.now()
    if (returned.length > 0) next = addResources(next, returned)
    return next
  }

  let next = cloneState(state)
  const returned = [
    instance.process.input,
    instance.process.secondaryInput,
    instance.process.extraInput1,
    instance.process.extraInput2,
    instance.process.extraInput3,
    instance.process.extraInput4,
    instance.process.fuel,
    instance.process.output,
    ...instance.process.storageSlots,
    ...instance.process.batterySlots.map((id) => (id ? { id, amount: 1 } : null)),
  ].filter(
    (slot): slot is NonNullable<ProcessSlot> => Boolean(slot),
  )
  next.machineInstances = next.machineInstances.filter((candidate) => candidate.uid !== uid)
  delete next.autoMinerAssignments[uid]
  if (isResourceBackedMachine(instance.machineId)) next.resources[instance.machineId] += 1
  next.lastSavedAt = Date.now()
  if (returned.length > 0) next = addResources(next, returned)
  return next
}

export function canCrowbarRemoveMachine(state: GameState) {
  return hasDurableUses(state, [{ id: 'ironCrowbar', amount: 1 }])
}

export function crowbarRemoveMachineInstance(state: GameState, uid: string) {
  if (!canCrowbarRemoveMachine(state)) return state
  return removeMachineInstance(applyDurabilityCosts(state, [{ id: 'ironCrowbar', amount: 1 }]), uid)
}

export function canResourceEnterProcessSlot(machineId: MachineId, slotId: ProcessSlotId, resourceId: ResourceId) {
  if (isItemStorageMachine(machineId)) return slotId === 'input' || slotId === 'secondaryInput' || slotId === 'fuel'
  if (isItemHopperMachine(machineId)) return slotId === 'input' || slotId === 'secondaryInput' || slotId === 'fuel' || slotId === 'output'
  if (machineId === 'lvAssembler' && assemblerInputSlotIds.includes(slotId as typeof assemblerInputSlotIds[number])) {
    return processRecipes.some(
      (recipe) =>
        recipe.machineId === machineId &&
        [recipe.input, ...(recipe.secondaryInput ? [recipe.secondaryInput] : []), ...(recipe.extraInputs ?? [])].some((cost) => cost.id === resourceId),
    )
  }
  const extraSlotIndex = assemblerExtraInputSlotIds.findIndex((extraSlotId) => extraSlotId === slotId)
  if (extraSlotIndex >= 0) {
    return (
      machineId === 'lvAssembler' &&
      processRecipes.some((recipe) => recipe.machineId === machineId && recipe.extraInputs?.[extraSlotIndex]?.id === resourceId)
    )
  }
  if (slotId === 'input') {
    return processRecipes.some(
      (recipe) =>
        recipe.machineId === machineId &&
        (recipe.input.id === resourceId || Boolean(recipe.secondaryInput && recipe.secondaryInput.id === resourceId)) &&
        (machineId !== 'steamAlloySmelter' || isAlloySmelterIngredient(resourceId)),
    )
  }
  if (slotId === 'secondaryInput') {
    return processRecipes.some(
      (recipe) =>
        recipe.machineId === machineId &&
        Boolean(recipe.secondaryInput) &&
        (recipe.input.id === resourceId || recipe.secondaryInput?.id === resourceId) &&
        (machineId !== 'steamAlloySmelter' || isAlloySmelterIngredient(resourceId)),
    )
  }
  if (slotId === 'fuel') {
    if (machineId === 'brickedBlastFurnace') {
      return processRecipes.some((recipe) => recipe.machineId === machineId && recipe.fuelInput?.id === resourceId)
    }
    return (machineId === 'furnace' || machineId === 'steamBoiler') && resourceId in fuelDefinitions
  }
  return false
}

function arcProcessSlotOwner(state: GameState, instance: MachineInstance, slotId: ProcessSlotId) {
  if (instance.machineId !== 'arcBlastFurnace') return instance
  const structure = arcBlastFurnaceStructureForInstance(state, instance)
  if (slotId === 'input') return structure?.inputBus ?? instance
  if (slotId === 'output') return structure?.outputBus ?? instance
  return instance
}

export function insertProcessSlot(state: GameState, uid: string, slotId: ProcessSlotId, resourceId: ResourceId, amount = processStackLimit) {
  const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
  if (!instance || !canResourceEnterProcessSlot(instance.machineId, slotId, resourceId)) return state
  if (slotId === 'output' && !isItemHopperMachine(instance.machineId)) return state

  const owner = arcProcessSlotOwner(state, instance, slotId)
  const currentSlot = owner.process[slotId]
  if (currentSlot && currentSlot.id !== resourceId) return state
  const currentAmount = currentSlot?.amount ?? 0
  const capacity = processStackLimit - currentAmount
  const moved = Math.min(Math.max(1, Math.floor(amount)), capacity, availableResourceAmount(state, resourceId))
  if (moved < 1) return state

  const next = subtractResources(state, [{ id: resourceId, amount: moved }])
  const nextInstance = next.machineInstances.find((candidate) => candidate.uid === owner.uid)
  if (!nextInstance) return state
  nextInstance.process[slotId] = { id: resourceId, amount: currentAmount + moved }
  next.lastSavedAt = Date.now()
  return next
}

export type ProcessRecipeInputLoadStatus = {
  canLoad: boolean
  ready: boolean
  itemsToLoad: number
  missingResources: ResourceAmount[]
  blockedSlots: ProcessSlotId[]
}

function processRecipeItemAssignments(recipe: ProcessRecipe): Array<{ slotId: ProcessSlotId; amount: ResourceAmount }> {
  if (recipe.fluidOnly) return []
  return [
    { slotId: 'input', amount: recipe.input },
    ...(recipe.secondaryInput ? [{ slotId: 'secondaryInput' as ProcessSlotId, amount: recipe.secondaryInput }] : []),
    ...(recipe.extraInputs ?? []).map((amount, index) => ({ slotId: assemblerExtraInputSlotIds[index], amount })),
    ...(recipe.fuelInput ? [{ slotId: 'fuel' as ProcessSlotId, amount: recipe.fuelInput }] : []),
  ].filter((assignment): assignment is { slotId: ProcessSlotId; amount: ResourceAmount } => Boolean(assignment.slotId))
}

export function processRecipeInputLoadStatus(state: GameState, uid: string, recipeId: string): ProcessRecipeInputLoadStatus {
  const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
  const recipe = instance
    ? processRecipes.find((candidate) => candidate.id === recipeId && candidate.machineId === instance.machineId)
    : undefined
  if (!instance || !recipe) {
    return { canLoad: false, ready: false, itemsToLoad: 0, missingResources: [], blockedSlots: [] }
  }

  const remainingAvailable = new Map<ResourceId, number>()
  const missingByResource = new Map<ResourceId, number>()
  const blockedSlots: ProcessSlotId[] = []
  let itemsToLoad = 0

  for (const { slotId, amount } of processRecipeItemAssignments(recipe)) {
    const owner = arcProcessSlotOwner(state, instance, slotId)
    const currentSlot = owner.process[slotId]
    if ((currentSlot && currentSlot.id !== amount.id) || amount.amount > processStackLimit) {
      blockedSlots.push(slotId)
      continue
    }

    const needed = Math.max(0, amount.amount - (currentSlot?.amount ?? 0))
    if (needed < 1) continue
    const available = remainingAvailable.get(amount.id) ?? availableResourceAmount(state, amount.id)
    const moved = Math.min(needed, available)
    remainingAvailable.set(amount.id, available - moved)
    itemsToLoad += needed
    if (moved < needed) missingByResource.set(amount.id, (missingByResource.get(amount.id) ?? 0) + needed - moved)
  }

  const missingResources = Array.from(missingByResource, ([id, amount]) => ({ id, amount }))
  const canLoad = blockedSlots.length === 0 && missingResources.length === 0
  return {
    canLoad,
    ready: canLoad && itemsToLoad === 0,
    itemsToLoad,
    missingResources,
    blockedSlots,
  }
}

export function loadProcessRecipeInputs(state: GameState, uid: string, recipeId: string) {
  const status = processRecipeInputLoadStatus(state, uid, recipeId)
  if (!status.canLoad || status.ready) return state
  const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
  const recipe = instance
    ? processRecipes.find((candidate) => candidate.id === recipeId && candidate.machineId === instance.machineId)
    : undefined
  if (!instance || !recipe) return state

  let next = state
  for (const { slotId, amount } of processRecipeItemAssignments(recipe)) {
    const currentInstance = next.machineInstances.find((candidate) => candidate.uid === uid)
    if (!currentInstance) return state
    const owner = arcProcessSlotOwner(next, currentInstance, slotId)
    const currentAmount = owner.process[slotId]?.amount ?? 0
    const needed = Math.max(0, amount.amount - currentAmount)
    if (needed > 0) next = insertProcessSlot(next, uid, slotId, amount.id, needed)
  }
  return next
}

export function removeProcessSlot(state: GameState, uid: string, slotId: ProcessSlotId) {
  const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
  if (slotId === 'output' && instance && !isItemHopperMachine(instance.machineId)) return collectProcessOutput(state, uid)
  const owner = instance ? arcProcessSlotOwner(state, instance, slotId) : null
  const slot = owner?.process[slotId]
  if (!instance || !slot) return state

  const next = addResources(state, [slot])
  const nextInstance = next.machineInstances.find((candidate) => candidate.uid === owner.uid)
  if (!nextInstance) return state
  nextInstance.process[slotId] = null
  if (slotId === 'input' || slotId === 'secondaryInput' || assemblerExtraInputSlotIds.includes(slotId as typeof assemblerExtraInputSlotIds[number])) {
    nextInstance.process.activeRecipeId = null
    nextInstance.process.progressMs = 0
    nextInstance.process.durationMs = 0
  }
  next.lastSavedAt = Date.now()
  return next
}

export function collectProcessOutput(state: GameState, uid: string, outputIndex: 0 | 1 = 0) {
  const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
  const slotId: 'output' | 'output2' = outputIndex === 0 ? 'output' : 'output2'
  const owner = instance ? arcProcessSlotOwner(state, instance, slotId) : null
  const output = owner?.process[slotId]
  if (!instance || !output) return state

  const next = addResources(state, [output])
  const nextInstance = next.machineInstances.find((candidate) => candidate.uid === owner.uid)
  if (!nextInstance) return state
  nextInstance.process[slotId] = null
  next.craftedResources = Array.from(new Set([...next.craftedResources, output.id]))
  next.discoveredResources = Array.from(new Set([...next.discoveredResources, output.id]))
  recordResourceMilestones(next, [output])
  next.lastSavedAt = Date.now()
  return next
}

function consumeProcessFuel(process: MachineProcessState) {
  if (process.fuelRemainingMs > 0) return true
  if (!process.fuel) return false
  const fuel = fuelDefinitions[process.fuel.id]
  if (!fuel) return false
  process.fuelRemainingMs += fuel.burnMs
  process.fuelDurationMs = fuel.burnMs
  process.fuel = decrementProcessSlot(process.fuel, 1)
  return true
}

function burnProcessFuel(process: MachineProcessState, elapsedMs: number) {
  const burnedMs = Math.min(process.fuelRemainingMs, elapsedMs)
  process.fuelRemainingMs -= burnedMs
  if (process.fuelRemainingMs < 1) process.fuelDurationMs = 0
  return burnedMs
}

function tickFurnaceProcess(instance: MachineInstance, elapsedMs: number) {
  const process = instance.process
  let remainingMs = elapsedMs

  while (remainingMs > 0) {
    const recipe = findProcessRecipeForInput(instance.machineId, process.input)
    if (!recipe) {
      process.activeRecipeId = null
      process.progressMs = 0
      process.durationMs = 0
      if (process.fuelRemainingMs > 0) {
        remainingMs -= burnProcessFuel(process, remainingMs)
      }
      break
    }
    if (!canOutputAccept(process.output, recipe.output)) {
      process.activeRecipeId = null
      if (process.fuelRemainingMs > 0) {
        remainingMs -= burnProcessFuel(process, remainingMs)
      }
      break
    }
    if (!consumeProcessFuel(process)) break

    process.activeRecipeId = recipe.id
    process.durationMs = recipe.durationMs
    const workMs = Math.min(remainingMs, process.fuelRemainingMs, recipe.durationMs - process.progressMs)
    process.progressMs += workMs
    burnProcessFuel(process, workMs)
    remainingMs -= workMs

    if (process.progressMs < recipe.durationMs) continue

    process.input = decrementProcessSlot(process.input, recipe.input.amount)
    process.output = addToProcessOutput(process.output, recipe.output)
    process.progressMs = 0
    process.activeRecipeId = null
    process.durationMs = 0
  }
}

function tickSteamBoiler(instance: MachineInstance, elapsedMs: number) {
  const process = instance.process
  process.steamCapacityMs = boilerSteamCapacityMs
  process.fluidCapacityLitres = machineFluidCapacity(instance.machineId)
  process.steamStoredMs = Math.min(process.steamStoredMs, boilerSteamCapacityMs)
  if ((process.fluids.water ?? 0) <= 0) {
    process.activeRecipeId = null
    return
  }

  if (process.steamStoredMs >= boilerSteamCapacityMs) {
    process.activeRecipeId = null
    return
  }

  if (!consumeProcessFuel(process)) {
    process.activeRecipeId = null
    return
  }

  const maxBurnByWater = ((process.fluids.water ?? 0) / boilerSteamProductionLitresPerSecond) * 1000
  const burnMs = Math.min(elapsedMs, process.fuelRemainingMs, (boilerSteamCapacityMs - process.steamStoredMs) / boilerSteamProductionLitresPerSecond, maxBurnByWater)
  const produced = burnMs * boilerSteamProductionLitresPerSecond
  if (produced < 1) return
  process.activeRecipeId = 'make_steam'
  process.progressMs = 0
  process.durationMs = 0
  burnProcessFuel(process, burnMs)
  process.fluids.water = Math.max(0, (process.fluids.water ?? 0) - (burnMs / 1000) * boilerSteamProductionLitresPerSecond)
  process.steamStoredMs += produced
}

function tickSteamProcessMachine(state: GameState, instance: MachineInstance, elapsedMs: number) {
  const process = instance.process
  process.steamCapacityMs = steamMachineInternalCapacityMs
  process.steamStoredMs = Math.min(process.steamStoredMs, steamMachineInternalCapacityMs)
  let transferBudgetMs = steamTransferAllowanceMs(state, instance, elapsedMs)
  transferBudgetMs -= fillInternalSteamFromConnectedStorage(state, instance, transferBudgetMs)
  let remainingMs = elapsedMs

  while (remainingMs > 0) {
    const match = findMatchedProcessRecipe(instance.machineId, process.input, process.secondaryInput, extraProcessInputSlots(process))
    const recipe = match?.recipe
    if (!recipe || !canOutputAccept(process.output, recipe.output)) {
      process.activeRecipeId = null
      if (!recipe) {
        process.progressMs = 0
        process.durationMs = 0
      }
      break
    }

    transferBudgetMs -= fillInternalSteamFromConnectedStorage(state, instance, transferBudgetMs)
    if (process.steamStoredMs < 1) {
      process.activeRecipeId = null
      break
    }

    process.activeRecipeId = recipe.id
    process.durationMs = recipe.durationMs
    const steamCostMs = recipeSteamCostMs(recipe)
    const remainingWorkMs = recipe.durationMs - process.progressMs
    const maxWorkBySteam = Math.floor((process.steamStoredMs * recipe.durationMs) / steamCostMs)
    const workMs = Math.min(remainingMs, remainingWorkMs, maxWorkBySteam)
    if (workMs < 1) break
    const consumedSteam = Math.min(process.steamStoredMs, Math.ceil((workMs * steamCostMs) / recipe.durationMs))
    process.steamStoredMs -= consumedSteam
    process.progressMs += workMs
    remainingMs -= workMs

    if (process.progressMs < recipe.durationMs) continue

    process.input = decrementProcessSlot(process.input, match.inputCost.amount)
    if (match.secondaryInputCost) process.secondaryInput = decrementProcessSlot(process.secondaryInput, match.secondaryInputCost.amount)
    match.extraInputCosts?.forEach((cost, index) => {
      const slotId = assemblerExtraInputSlotIds[index]
      if (slotId) process[slotId] = decrementProcessSlot(process[slotId], cost.amount)
    })
    process.output = addToProcessOutput(process.output, recipe.output)
    process.progressMs = 0
    process.activeRecipeId = null
    process.durationMs = 0
  }
}

function tickSteamTurbine(state: GameState, instance: MachineInstance, elapsedMs: number) {
  const process = instance.process
  process.euCapacity = steamTurbineEuCapacity
  process.euStored = Math.min(process.euStored, steamTurbineEuCapacity)
  const freeEu = steamTurbineEuCapacity - process.euStored
  if (freeEu <= 0) {
    process.activeRecipeId = null
    return
  }

  const steamByRateMs = steamTurbineSteamUseLitresPerSecond * steamMsPerLitre * (elapsedMs / 1000)
  const steamByEuCapacityMs = (freeEu / euPerSteamLitre) * steamMsPerLitre
  const steamByPipeMs = steamTransferAllowanceMs(state, instance, elapsedMs)
  const requestedSteam = Math.min(steamByRateMs, steamByEuCapacityMs, steamByPipeMs)
  if (requestedSteam <= 0) {
    process.activeRecipeId = null
    return
  }

  const consumedSteam = consumeConnectedSteam(state, instance, requestedSteam)
  if (consumedSteam <= 0) {
    process.activeRecipeId = null
    return
  }

  process.euStored = Math.min(steamTurbineEuCapacity, process.euStored + (consumedSteam / steamMsPerLitre) * euPerSteamLitre)
  process.activeRecipeId = 'generate_lv_eu'
  process.progressMs = 0
  process.durationMs = 0
}

function tickEuStorage(state: GameState, instance: MachineInstance, elapsedMs: number) {
  const process = instance.process
  process.euCapacity = batteryBufferEuCapacity(instance)
  process.euStored = Math.min(process.euStored, process.euCapacity)
  const needed = process.euCapacity - process.euStored
  if (needed <= 0) {
    process.activeRecipeId = null
    return
  }

  const consumerLimit = (Math.max(1, batteryBufferInstalledBatteries(instance)) * lvEuPerAmpSecond * elapsedMs) / 1000
  const installedBatteries = batteryBufferInstalledBatteries(instance)
  const moved = consumeConnectedEuFromProducers(state, instance, Math.min(needed, consumerLimit), elapsedMs, installedBatteries)
  process.euStored += moved
  process.activeRecipeId = moved > 0 ? 'store_lv_eu' : null
  process.progressMs = 0
  process.durationMs = 0
}

function tickLiquidSteamBoiler(state: GameState, instance: MachineInstance, elapsedMs: number) {
  const process = instance.process
  process.steamCapacityMs = liquidSteamBoilerCapacityMs
  process.steamStoredMs = Math.min(process.steamStoredMs, liquidSteamBoilerCapacityMs)
  process.fluidCapacityLitres = liquidSteamBoilerFluidCapacityLitres
  process.fluids.water = Math.min(128, process.fluids.water ?? 0)
  process.fluids.creosote = Math.min(process.fluids.creosote ?? 0, liquidSteamBoilerFluidCapacityLitres)

  const freeFluid = liquidSteamBoilerFluidCapacityLitres - (process.fluids.creosote ?? 0)
  if (freeFluid > 0) {
    process.fluids.creosote = (process.fluids.creosote ?? 0) + pullFluidFromConnectedSources(state, instance, 'creosote', freeFluid, elapsedMs)
  }

  const waterFree = Math.max(0, 128 - (process.fluids.water ?? 0))
  if (waterFree > 0) {
    process.fluids.water = (process.fluids.water ?? 0) + pullFluidFromConnectedSources(state, instance, 'water', waterFree, elapsedMs)
  }

  if ((process.fluids.water ?? 0) <= 0) {
    process.activeRecipeId = null
    return
  }

  const freeSteamMs = liquidSteamBoilerCapacityMs - process.steamStoredMs
  const storedCreosote = process.fluids.creosote ?? 0
  if (freeSteamMs < 1 || storedCreosote <= 0) {
    process.activeRecipeId = null
    return
  }

  const maxSteamByRate = liquidSteamBoilerSteamProductionLitresPerSecond * steamMsPerLitre * (elapsedMs / 1000)
  const maxSteamByFuel = (storedCreosote / liquidSteamBoilerCreosoteUseLitresPerSecond) * liquidSteamBoilerSteamProductionLitresPerSecond * steamMsPerLitre
  const maxSteamByWater = ((process.fluids.water ?? 0) / boilerSteamProductionLitresPerSecond) * liquidSteamBoilerSteamProductionLitresPerSecond * steamMsPerLitre
  const producedSteam = Math.min(freeSteamMs, maxSteamByRate, maxSteamByFuel, maxSteamByWater)
  if (producedSteam < 1) {
    process.activeRecipeId = null
    return
  }

  const consumedCreosote = producedSteam / steamMsPerLitre / liquidSteamBoilerSteamProductionLitresPerSecond * liquidSteamBoilerCreosoteUseLitresPerSecond
  const consumedWater = producedSteam / steamMsPerLitre / liquidSteamBoilerSteamProductionLitresPerSecond * boilerSteamProductionLitresPerSecond
  process.fluids.creosote = Math.max(0, storedCreosote - consumedCreosote)
  process.fluids.water = Math.max(0, (process.fluids.water ?? 0) - consumedWater)
  process.steamStoredMs += producedSteam
  process.activeRecipeId = 'burn_creosote_steam'
  process.progressMs = 0
  process.durationMs = 0
}

function tickEuProcessMachine(state: GameState, instance: MachineInstance, elapsedMs: number) {
  const process = instance.process
  const arcStructure = instance.machineId === 'arcBlastFurnace' ? arcBlastFurnaceStructureForInstance(state, instance) : null
  if (instance.machineId === 'arcBlastFurnace') {
    if (!arcStructure?.formed || !arcStructure.inputBus || !arcStructure.outputBus) {
      process.activeRecipeId = null
      process.progressMs = 0
      process.durationMs = 0
      process.euStored = 0
      process.euCapacity = 0
      process.input = null
      process.output = null
      return
    }
    process.input = arcStructure.inputBus.process.input
    process.output = arcStructure.outputBus.process.output
    process.fluids = { ...(arcStructure.fluidInputHatch?.process.fluids ?? normalizeFluidStore()) }
    process.fluidCapacityLitres = arcStructure.fluidInputHatch?.process.fluidCapacityLitres ?? 0
    for (const hatch of arcStructure.energyHatches) {
      repairDisconnectedArcEnergyHatchFace(state, arcStructure, hatch)
      fillInternalEuFromConnectedStorage(state, hatch, elapsedMs, 2)
    }
    process.euCapacity = arcStructure.energyHatches.reduce((sum, hatch) => sum + hatch.process.euCapacity, 0)
    process.euStored = arcStructure.energyHatches.reduce((sum, hatch) => sum + hatch.process.euStored, 0)
  } else {
    process.euCapacity = machineEuCapacity(instance.machineId)
    process.euStored = Math.min(process.euStored, process.euCapacity)
  }
  const initialMatch = findMatchedProcessRecipe(instance.machineId, process.input, process.secondaryInput, extraProcessInputSlots(process), process.configuredRecipeId)
  if (!initialMatch && !arcStructure) fillInternalEuFromConnectedStorage(state, instance, elapsedMs)
  if (arcStructure && initialMatch) {
    const requiredPerHatch = ((recipeEuCost(initialMatch.recipe) / initialMatch.recipe.durationMs) * elapsedMs) / arcStructure.energyHatches.length
    if (arcStructure.energyHatches.some((hatch) => hatch.process.euStored + 0.0001 < requiredPerHatch)) {
      process.activeRecipeId = null
      process.progressMs = 0
      process.durationMs = initialMatch.recipe.durationMs
      process.euStored = arcStructure.energyHatches.reduce((sum, hatch) => sum + hatch.process.euStored, 0)
      process.input = null
      process.output = null
      process.euCapacity = 0
      return
    }
  }
  const arcEuBefore = arcStructure ? process.euStored : 0
  let remainingMs = elapsedMs

  while (remainingMs > 0) {
    const match = findMatchedProcessRecipe(instance.machineId, process.input, process.secondaryInput, extraProcessInputSlots(process), process.configuredRecipeId)
    const recipe = match?.recipe
    if (!recipe || !canRecipeItemOutputsAccept(process, recipe) || (!arcStructure && !canFluidOutputAccept(process, recipe))) {
      process.activeRecipeId = null
      if (!recipe) {
        process.progressMs = 0
        process.durationMs = 0
      }
      break
    }
    const requiredEuAmps = recipe.requiredEuAmps ?? 1
    if (!arcStructure) fillInternalEuFromConnectedStorage(state, instance, remainingMs, requiredEuAmps)

    if (arcStructure && recipeFluidOutputs(recipe).length > 0) {
      const hatch = arcStructure.fluidOutputHatch
      const outputsFit = hatch && recipeFluidOutputs(recipe).every((output) => {
        const otherFluid = storedFluidTypes(hatch.process).some((fluidId) => fluidId !== output.id)
        return !otherFluid && (hatch.process.fluids[output.id] ?? 0) + output.amount <= hatch.process.fluidCapacityLitres
      })
      if (!outputsFit) {
        process.activeRecipeId = null
        break
      }
    }

    const requiredFluids = recipeFluidInputs(recipe)
    if (requiredFluids.length > 0) {
      if (arcStructure && !arcStructure.fluidInputHatch) {
        process.activeRecipeId = null
        break
      }
      for (const requiredFluid of requiredFluids) {
        const storedFluid = process.fluids[requiredFluid.id] ?? 0
        const fluidNeeded = Math.max(0, requiredFluid.amount - storedFluid)
        if (fluidNeeded > 0) {
          const fluidTarget = arcStructure?.fluidInputHatch ?? instance
          process.fluids[requiredFluid.id] = storedFluid + pullFluidFromConnectedSources(state, fluidTarget, requiredFluid.id, fluidNeeded, remainingMs)
        }
        if ((process.fluids[requiredFluid.id] ?? 0) < requiredFluid.amount) {
          process.activeRecipeId = null
          break
        }
      }
      if (requiredFluids.some((fluid) => (process.fluids[fluid.id] ?? 0) < fluid.amount)) break
    }

    if (process.euStored <= 0) {
      process.activeRecipeId = null
      break
    }

    if (isEuBlastMachine(instance.machineId) && process.progressMs === 0 && !arcStructure) {
      const minimumEuStored = recipe.minimumEuStored ?? 0
      if (minimumEuStored > 0 && process.euStored + availableConnectedEuStorage(state, instance) < minimumEuStored) {
        process.activeRecipeId = null
        break
      }
      if (requiredEuAmps > 1 && availableConnectedEuAmps(state, instance) < requiredEuAmps) {
        process.activeRecipeId = null
        break
      }
      const startupEu = recipe.startupEu ?? 0
      if (startupEu > 0) {
        fillInternalEuFromConnectedStorage(state, instance, elapsedMs, requiredEuAmps)
        if (process.euStored < startupEu) {
          process.activeRecipeId = null
          break
        }
        process.euStored -= startupEu
      }
    }

    process.activeRecipeId = recipe.id
    process.durationMs = recipe.durationMs
    const euCost = recipeEuCost(recipe)
    const remainingWorkMs = recipe.durationMs - process.progressMs
    const maxWorkByEu = Math.floor((process.euStored * recipe.durationMs) / euCost)
    const workMs = Math.min(remainingMs, remainingWorkMs, maxWorkByEu)
    if (workMs < 1) break
    const consumedEu = Math.min(process.euStored, (workMs * euCost) / recipe.durationMs)
    process.euStored -= consumedEu
    process.progressMs += workMs
    remainingMs -= workMs

    if (process.progressMs < recipe.durationMs) continue

    if (match.assemblerInputAmounts) {
      match.assemblerInputAmounts.forEach((amount, index) => {
        const slotId = assemblerInputSlotIds[index]
        if (slotId && amount > 0) process[slotId] = decrementProcessSlot(process[slotId], amount)
      })
    } else {
      process.input = decrementProcessSlot(process.input, match.inputCost.amount)
      if (match.secondaryInputCost) process.secondaryInput = decrementProcessSlot(process.secondaryInput, match.secondaryInputCost.amount)
      match.extraInputCosts?.forEach((cost, index) => {
        const slotId = assemblerExtraInputSlotIds[index]
        if (slotId) process[slotId] = decrementProcessSlot(process[slotId], cost.amount)
      })
    }
    if (recipe.machineOutput) {
      state.machines[recipe.machineOutput.id] += recipe.machineOutput.amount
      recordMachineMilestones(state, [recipe.machineOutput])
    } else {
      addRecipeItemOutputs(process, recipe)
    }
    for (const inputFluid of requiredFluids) process.fluids[inputFluid.id] = Math.max(0, (process.fluids[inputFluid.id] ?? 0) - inputFluid.amount)
    if (recipeFluidOutputs(recipe).length > 0 && arcStructure?.fluidOutputHatch) {
      for (const outputFluid of recipeFluidOutputs(recipe)) {
        arcStructure.fluidOutputHatch.process.fluids[outputFluid.id] = (arcStructure.fluidOutputHatch.process.fluids[outputFluid.id] ?? 0) + outputFluid.amount
      }
    } else {
      addFluidOutput(process, recipe)
    }
    state.recipeMilestones[recipe.id] = (state.recipeMilestones[recipe.id] ?? 0) + 1
    process.progressMs = 0
    process.activeRecipeId = null
    process.durationMs = 0
  }
  if (arcStructure?.formed && arcStructure.inputBus && arcStructure.outputBus) {
    const consumedEu = Math.max(0, arcEuBefore - process.euStored)
    const consumedPerHatch = consumedEu / arcStructure.energyHatches.length
    for (const hatch of arcStructure.energyHatches) hatch.process.euStored = Math.max(0, hatch.process.euStored - consumedPerHatch)
    arcStructure.inputBus.process.input = process.input
    arcStructure.outputBus.process.output = process.output
    if (arcStructure.fluidInputHatch) arcStructure.fluidInputHatch.process.fluids = { ...process.fluids }
    process.input = null
    process.output = null
    process.euStored = 0
    process.euCapacity = 0
    process.fluids = normalizeFluidStore()
    process.fluidCapacityLitres = 0
  }
}

function tickCokeOven(state: GameState, instance: MachineInstance, elapsedMs: number) {
  const process = instance.process
  process.fluidCapacityLitres = cokeOvenFluidCapacityLitres
  process.fluids.creosote = Math.min(process.fluids.creosote ?? 0, cokeOvenFluidCapacityLitres)
  pushFluidToConnectedStorage(state, instance, 'creosote', elapsedMs)

  let remainingMs = elapsedMs
  while (remainingMs > 0) {
    const recipe = findProcessRecipeForInput(instance.machineId, process.input)
    if (!recipe || !canOutputAccept(process.output, recipe.output) || !canFluidOutputAccept(process, recipe)) {
      process.activeRecipeId = null
      if (!recipe) {
        process.progressMs = 0
        process.durationMs = 0
      }
      break
    }

    process.activeRecipeId = recipe.id
    process.durationMs = recipe.durationMs
    const workMs = Math.min(remainingMs, recipe.durationMs - process.progressMs)
    process.progressMs += workMs
    remainingMs -= workMs

    if (process.progressMs < recipe.durationMs) continue

    process.input = decrementProcessSlot(process.input, recipe.input.amount)
    process.output = addToProcessOutput(process.output, recipe.output)
    addFluidOutput(process, recipe)
    process.progressMs = 0
    process.activeRecipeId = null
    process.durationMs = 0
    pushFluidToConnectedStorage(state, instance, 'creosote', remainingMs)
  }
}

function tickBrickedBlastFurnace(instance: MachineInstance, elapsedMs: number) {
  const process = instance.process
  let remainingMs = elapsedMs

  while (remainingMs > 0) {
    const recipe = findProcessRecipeForInputAndFuel(instance.machineId, process.input, process.fuel)
    if (!recipe || !canOutputAccept(process.output, recipe.output)) {
      process.activeRecipeId = null
      if (!recipe) {
        process.progressMs = 0
        process.durationMs = 0
      }
      break
    }

    process.activeRecipeId = recipe.id
    process.durationMs = recipe.durationMs
    const workMs = Math.min(remainingMs, recipe.durationMs - process.progressMs)
    process.progressMs += workMs
    remainingMs -= workMs

    if (process.progressMs < recipe.durationMs) continue

    process.input = decrementProcessSlot(process.input, recipe.input.amount)
    if (recipe.fuelInput) process.fuel = decrementProcessSlot(process.fuel, recipe.fuelInput.amount)
    process.output = addToProcessOutput(process.output, recipe.output)
    process.progressMs = 0
    process.activeRecipeId = null
    process.durationMs = 0
  }
}

function applyAutoMinerDamage(instance: MachineInstance, targetId: GatherTargetId, damage: number) {
  if (damage <= 0) return false
  const target = gatherTargets[targetId]
  const progress = instance.process.miningDamage + damage
  const cycles = Math.floor(progress / target.maxHp)
  if (cycles > 0) {
    const produced = target.drops[0]
    if (!produced || target.drops.length !== 1) return false
    const amount = produced.amount * cycles
    const output = instance.process.output
    if (output && (output.id !== produced.id || output.amount + amount > processStackLimit)) return false
    instance.process.output = output ? { id: output.id, amount: output.amount + amount } : { id: produced.id, amount }
  }
  instance.process.miningDamage = progress % target.maxHp
  return true
}

function tickAutoMiner(state: GameState, instance: MachineInstance, elapsedMs: number) {
  if (instance.machineId === 'steamAutoMiner') {
    instance.process.steamCapacityMs = machineSteamCapacityLitres(instance.machineId) * steamMsPerLitre
    instance.process.steamStoredMs = Math.min(instance.process.steamStoredMs, instance.process.steamCapacityMs)
    fillInternalSteamFromConnectedStorage(state, instance, steamTransferAllowanceMs(state, instance, elapsedMs))
  } else if (instance.machineId === 'lvAutoMiner') {
    instance.process.euCapacity = machineEuCapacity(instance.machineId)
    instance.process.euStored = Math.min(instance.process.euStored, instance.process.euCapacity)
    fillInternalEuFromConnectedStorage(state, instance, elapsedMs)
  }

  const targetId = state.autoMinerAssignments[instance.uid]
  const requiresSurveyCard = instance.machineId === 'lvAutoMiner' && Boolean(targetId) && !canAutoMinerTarget('steamAutoMiner', targetId)
  if (
    !targetId ||
    !canAutoMinerTarget(instance.machineId, targetId) ||
    (requiresSurveyCard && instance.surveyCardTarget !== targetId) ||
    (gatherTargets[targetId].area === 'shatteredReach' && !isReachGateFormed(state))
  ) {
    instance.process.activeRecipeId = null
    instance.process.progressMs = 0
    instance.process.durationMs = 0
    return
  }

  const actionMs = instance.machineId === 'steamAutoMiner' ? steamAutoMinerActionMs : lvAutoMinerActionMs
  const damage = instance.machineId === 'steamAutoMiner' ? steamAutoMinerActionDamage : lvAutoMinerActionDamage
  instance.process.durationMs = actionMs
  instance.process.progressMs += elapsedMs
  let completedAction = false

  if (instance.machineId === 'steamAutoMiner') {
    const steamCostMs = steamAutoMinerSteamUseLitres * steamMsPerLitre
    while (instance.process.progressMs >= actionMs) {
      fillInternalSteamFromConnectedStorage(state, instance, steamTransferAllowanceMs(state, instance, actionMs))
      if (instance.process.steamStoredMs < steamCostMs) {
        instance.process.progressMs = actionMs
        break
      }
      if (!applyAutoMinerDamage(instance, targetId, damage)) {
        instance.process.progressMs = actionMs
        break
      }
      instance.process.steamStoredMs -= steamCostMs
      instance.process.progressMs -= actionMs
      completedAction = true
    }
  } else if (instance.machineId === 'lvAutoMiner') {
    while (instance.process.progressMs >= actionMs) {
      fillInternalEuFromConnectedStorage(state, instance, actionMs)
      if (instance.process.euStored < lvAutoMinerEuUse) {
        instance.process.progressMs = actionMs
        break
      }
      if (!applyAutoMinerDamage(instance, targetId, damage)) {
        instance.process.progressMs = actionMs
        break
      }
      instance.process.euStored -= lvAutoMinerEuUse
      instance.process.progressMs -= actionMs
      completedAction = true
    }
  }

  instance.process.activeRecipeId = completedAction || (instance.process.progressMs > 0 && isAutoMinerPowered(state, instance)) ? `auto_mine_${targetId}` : null
}

function processSlotAcceptsItem(slot: ProcessSlot, resourceId: ResourceId) {
  return !slot || (slot.id === resourceId && slot.amount < processStackLimit)
}

const hopperStorageSlotIds = ['input', 'secondaryInput', 'fuel', 'output'] as const satisfies readonly ProcessSlotId[]
type HopperStorageSlotId = (typeof hopperStorageSlotIds)[number]
type HopperFeedCandidate =
  | { hopperSlotId: HopperStorageSlotId; targetStorageSlotIndex: number; targetSlotId?: never; stored: NonNullable<ProcessSlot> }
  | { hopperSlotId: HopperStorageSlotId; targetSlotId: Exclude<ProcessSlotId, 'output'>; targetStorageSlotIndex?: never; stored: NonNullable<ProcessSlot> }
type HopperPullCandidate =
  | { source: MachineInstance; sourceStorageSlotIndex: number; sourceSlotId?: never; hopperSlotId: HopperStorageSlotId; stored: NonNullable<ProcessSlot> }
  | { source: MachineInstance; sourceSlotId: 'output' | 'output2'; sourceStorageSlotIndex?: never; hopperSlotId: HopperStorageSlotId; stored: NonNullable<ProcessSlot> }

function hopperTargetSlot(machineId: MachineId, process: MachineProcessState, resourceId: ResourceId): Exclude<ProcessSlotId, 'output'> | null {
  const slotIds: Array<Exclude<ProcessSlotId, 'output'>> = ['input', 'secondaryInput', 'fuel']
  return slotIds.find((slotId) => canResourceEnterProcessSlot(machineId, slotId, resourceId) && processSlotAcceptsItem(process[slotId], resourceId)) ?? null
}

function hopperStorageTargetSlot(process: MachineProcessState, resourceId: ResourceId) {
  const existingIndex = process.storageSlots.findIndex((slot) => slot?.id === resourceId && slot.amount < processStackLimit)
  if (existingIndex >= 0) return existingIndex
  return process.storageSlots.findIndex((slot) => !slot)
}

function hopperFeedCandidate(target: MachineInstance, hopperProcess: MachineProcessState): HopperFeedCandidate | null {
  for (const hopperSlotId of hopperStorageSlotIds) {
    const stored = hopperProcess[hopperSlotId]
    if (!stored) continue
    if (target.process.storageSlots.length > 0) {
      const targetStorageSlotIndex = hopperStorageTargetSlot(target.process, stored.id)
      if (targetStorageSlotIndex >= 0) return { hopperSlotId, targetStorageSlotIndex, stored }
    }
    const targetSlotId = hopperTargetSlot(target.machineId, target.process, stored.id)
    if (targetSlotId) return { hopperSlotId, targetSlotId, stored }
  }
  return null
}

function hopperInputDirections(instance: MachineInstance) {
  return pipeDirections.filter((direction) => {
    const mode = pipeSideMode(instance, direction)
    return mode === 'input' || mode === 'both'
  })
}

function tickAirCollector(state: GameState, instance: MachineInstance, elapsedMs: number) {
  const process = instance.process
  fillInternalEuFromConnectedStorage(state, instance, elapsedMs)
  const capacity = machineFluidCapacityLitres(instance.machineId)
  const freeAir = Math.max(0, capacity - (process.fluids.air ?? 0))
  const collected = Math.min(elapsedMs / 1000, process.euStored / 8, freeAir)
  if (collected <= 0) {
    process.activeRecipeId = null
    process.durationMs = 1000
    process.progressMs = 0
    return
  }
  process.euStored -= collected * 8
  process.fluids.air = (process.fluids.air ?? 0) + collected
  process.activeRecipeId = 'collect_air'
  process.durationMs = 1000
  process.progressMs = Math.min(999, process.progressMs + elapsedMs)
  pushFluidToConnectedStorage(state, instance, 'air', elapsedMs)
}

function hopperOutputDirections(instance: MachineInstance) {
  return pipeDirections.filter((direction) => {
    const mode = pipeSideMode(instance, direction)
    return mode === 'output' || mode === 'both'
  })
}

function hopperFeedTarget(state: GameState, target: MachineInstance) {
  const multiblock = multiblockCenterForInstance(state, target)
  if (!multiblock) return target
  return machineAt(state, multiblock.x, multiblock.y) ?? target
}

function hopperPullCandidate(state: GameState, instance: MachineInstance, sourceDirections: PipeDirection[]): HopperPullCandidate | null {
  for (const direction of sourceDirections) {
    const offset = pipeDirectionOffsets[direction]
    const adjacentSource = machineAt(state, instance.x + offset.dx, instance.y + offset.dy)
    if (!adjacentSource || isItemHopperMachine(adjacentSource.machineId) || isItemBusMachine(adjacentSource.machineId)) continue
    const source = hopperFeedTarget(state, adjacentSource)

    if (isItemStorageMachine(source.machineId)) {
      for (let sourceStorageSlotIndex = 0; sourceStorageSlotIndex < source.process.storageSlots.length; sourceStorageSlotIndex += 1) {
        const stored = source.process.storageSlots[sourceStorageSlotIndex]
        if (!stored) continue
        const hopperSlotId = hopperStorageSlotIds.find((slotId) => processSlotAcceptsItem(instance.process[slotId], stored.id))
        if (hopperSlotId) return { source, sourceStorageSlotIndex, hopperSlotId, stored }
      }
      continue
    }

    for (const sourceSlotId of ['output', 'output2'] as const) {
      const stored = source.process[sourceSlotId]
      if (!stored) continue
      const hopperSlotId = hopperStorageSlotIds.find((slotId) => processSlotAcceptsItem(instance.process[slotId], stored.id))
      if (hopperSlotId) return { source, sourceSlotId, hopperSlotId, stored }
    }
  }
  return null
}

function hopperPullFromMachineOutputs(state: GameState, instance: MachineInstance, elapsedMs: number) {
  const sourceDirections = hopperInputDirections(instance)
  if (sourceDirections.length < 1) {
    instance.itemTransferProgressMs = 0
    return
  }
  instance.itemTransferProgressMs = (instance.itemTransferProgressMs ?? 0) + elapsedMs
  while (instance.itemTransferProgressMs >= 1000) {
    const candidate = hopperPullCandidate(state, instance, sourceDirections)
    if (!candidate) break
    const hopperSlot = instance.process[candidate.hopperSlotId]
    instance.process[candidate.hopperSlotId] = hopperSlot ? { id: candidate.stored.id, amount: hopperSlot.amount + 1 } : { id: candidate.stored.id, amount: 1 }
    if (candidate.sourceStorageSlotIndex !== undefined) {
      candidate.source.process.storageSlots[candidate.sourceStorageSlotIndex] = decrementProcessSlot(candidate.stored, 1)
    } else {
      candidate.source.process[candidate.sourceSlotId] = decrementProcessSlot(candidate.stored, 1)
    }
    instance.itemTransferProgressMs -= 1000
  }
  if (!hopperPullCandidate(state, instance, sourceDirections)) instance.itemTransferProgressMs = 0
}

function tickItemHopper(state: GameState, instance: MachineInstance, elapsedMs: number) {
  hopperPullFromMachineOutputs(state, instance, elapsedMs)
  const outputDirections = hopperOutputDirections(instance)
  if (!hopperStorageSlotIds.some((slotId) => instance.process[slotId]) || outputDirections.length < 1) {
    instance.process.activeRecipeId = null
    instance.process.progressMs = 0
    instance.process.durationMs = 0
    return
  }

  const targets = outputDirections
    .map((direction) => {
      const offset = pipeDirectionOffsets[direction]
      const adjacentTarget = machineAt(state, instance.x + offset.dx, instance.y + offset.dy)
      const target = adjacentTarget ? hopperFeedTarget(state, adjacentTarget) : null
      return target && !isItemHopperMachine(target.machineId) && !isItemBusMachine(target.machineId) ? target : null
    })
    .filter((target): target is MachineInstance => Boolean(target))

  if (targets.length < 1) {
    instance.process.activeRecipeId = null
    instance.process.progressMs = 0
    instance.process.durationMs = 0
    return
  }

  const nextFeedTarget = () => targets.find((target) => hopperFeedCandidate(target, instance.process))
  if (!nextFeedTarget()) {
    instance.process.activeRecipeId = null
    instance.process.progressMs = 0
    instance.process.durationMs = 1000
    return
  }

  instance.process.durationMs = 1000
  instance.process.progressMs += elapsedMs
  let moved = 0

  while (instance.process.progressMs >= instance.process.durationMs) {
    const target = nextFeedTarget()
    if (!target) break
    const candidate = hopperFeedCandidate(target, instance.process)
    if (!candidate) break

    if (candidate.targetStorageSlotIndex !== undefined) {
      const targetSlot = target.process.storageSlots[candidate.targetStorageSlotIndex]
      target.process.storageSlots[candidate.targetStorageSlotIndex] = targetSlot ? { id: candidate.stored.id, amount: targetSlot.amount + 1 } : { id: candidate.stored.id, amount: 1 }
    } else {
      const targetSlot = target.process[candidate.targetSlotId]
      target.process[candidate.targetSlotId] = targetSlot ? { id: candidate.stored.id, amount: targetSlot.amount + 1 } : { id: candidate.stored.id, amount: 1 }
    }
    instance.process[candidate.hopperSlotId] = decrementProcessSlot(instance.process[candidate.hopperSlotId], 1)
    instance.process.progressMs -= instance.process.durationMs
    moved += 1
  }

  if (!hopperStorageSlotIds.some((slotId) => instance.process[slotId])) instance.process.progressMs = 0
  if (moved < 1 && !nextFeedTarget()) instance.process.progressMs = 0
  instance.process.activeRecipeId = moved > 0 || (instance.process.progressMs > 0 && Boolean(nextFeedTarget())) ? 'hopper_feed' : null
}

export function isLvItemAutomationMachine(machineId: MachineId) {
  return machines[machineId].tier === 'lv' && machines[machineId].processKind === 'euProcess'
}

function lvAutomationTargetSlot(target: MachineInstance, resourceId: ResourceId): Exclude<ProcessSlotId, 'output'> | null {
  const slotIds: Array<Exclude<ProcessSlotId, 'output'>> = ['input', 'secondaryInput', 'extraInput1', 'extraInput2', 'extraInput3', 'extraInput4', 'fuel']
  return slotIds.find((slotId) => canResourceEnterProcessSlot(target.machineId, slotId, resourceId) && processSlotAcceptsItem(target.process[slotId], resourceId)) ?? null
}

function lvAutomationAcceptsResource(machineId: MachineId, resourceId: ResourceId) {
  const slotIds: Array<Exclude<ProcessSlotId, 'output'>> = ['input', 'secondaryInput', 'extraInput1', 'extraInput2', 'extraInput3', 'extraInput4', 'fuel']
  return slotIds.some((slotId) => canResourceEnterProcessSlot(machineId, slotId, resourceId))
}

function lvAutomationDestination(state: GameState, source: MachineInstance) {
  const direction = source.itemOutputDirection
  if (!direction) return null
  const offset = pipeDirectionOffsets[direction]
  return machineAt(state, source.x + offset.dx, source.y + offset.dy)
}

function lvAutomationCanReceive(target: MachineInstance, incomingDirection: PipeDirection, resourceId: ResourceId) {
  if (isLvItemAutomationMachine(target.machineId) && target.itemOutputDirection === incomingDirection) return false
  if (target.machineId === 'standardChest') {
    return target.process.storageSlots.some((slot) => !slot || (slot.id === resourceId && slot.amount < processStackLimit))
  }
  return isLvItemAutomationMachine(target.machineId) && Boolean(lvAutomationTargetSlot(target, resourceId))
}

function insertLvAutomationItem(target: MachineInstance, resourceId: ResourceId) {
  if (target.machineId === 'standardChest') return insertOneIntoInventory(target, resourceId)
  const slotId = lvAutomationTargetSlot(target, resourceId)
  if (!slotId) return false
  const slot = target.process[slotId]
  target.process[slotId] = slot ? { id: resourceId, amount: slot.amount + 1 } : { id: resourceId, amount: 1 }
  return true
}

export type LvItemAutomationStatusCode = 'disabled' | 'ready' | 'transferring' | 'no-neighbour' | 'invalid-item' | 'destination-full' | 'output-conflict'

export function lvItemAutomationStatus(state: GameState, source: MachineInstance): { code: LvItemAutomationStatusCode; label: string; target: MachineInstance | null } {
  if (!isLvItemAutomationMachine(source.machineId) || !source.itemOutputDirection) return { code: 'disabled', label: 'Disabled', target: null }
  const target = lvAutomationDestination(state, source)
  if (!target) return { code: 'no-neighbour', label: 'No neighbour', target: null }
  const incomingDirection = oppositePipeDirection[source.itemOutputDirection]
  if (isLvItemAutomationMachine(target.machineId) && target.itemOutputDirection === incomingDirection) {
    return { code: 'output-conflict', label: 'Output face conflict', target }
  }
  const output = source.process.output
  if (!output) return { code: 'ready', label: 'Ready', target }
  if (target.machineId !== 'standardChest' && !isLvItemAutomationMachine(target.machineId)) return { code: 'invalid-item', label: 'Invalid destination', target }
  if (!lvAutomationCanReceive(target, incomingDirection, output.id)) {
    const acceptsResource = target.machineId === 'standardChest'
      ? target.process.storageSlots.some((slot) => !slot || slot.id === output.id)
      : isLvItemAutomationMachine(target.machineId) && lvAutomationAcceptsResource(target.machineId, output.id)
    return { code: acceptsResource ? 'destination-full' : 'invalid-item', label: acceptsResource ? 'Destination full' : 'Invalid item', target }
  }
  return { code: (source.itemTransferProgressMs ?? 0) > 0 ? 'transferring' : 'ready', label: (source.itemTransferProgressMs ?? 0) > 0 ? 'Transferring' : 'Ready', target }
}

export function setLvItemOutputDirection(state: GameState, uid: string, direction?: PipeDirection) {
  const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
  if (!instance || !isLvItemAutomationMachine(instance.machineId) || (direction && !pipeDirections.includes(direction))) return state
  const next = cloneState(state)
  const target = next.machineInstances.find((candidate) => candidate.uid === uid)!
  target.itemOutputDirection = target.itemOutputDirection === direction ? undefined : direction
  target.itemTransferProgressMs = 0
  next.lastSavedAt = Date.now()
  return next
}

export function setConfiguredProcessRecipe(state: GameState, uid: string, recipeId: string | null) {
  const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
  if (!instance || instance.machineId !== 'arcBlastFurnace' || instance.process.progressMs > 0) return state
  const validRecipe = recipeId === null || processRecipes.some((recipe) => recipe.id === recipeId && recipe.machineId === instance.machineId && recipe.autoSelectable === false)
  if (!validRecipe) return state
  const next = cloneState(state)
  const target = next.machineInstances.find((candidate) => candidate.uid === uid)!
  target.process.configuredRecipeId = recipeId
  target.process.activeRecipeId = null
  target.process.durationMs = 0
  next.lastSavedAt = Date.now()
  return next
}

function tickLvItemAutomation(state: GameState, source: MachineInstance, elapsedMs: number) {
  if (!isLvItemAutomationMachine(source.machineId) || !source.itemOutputDirection) {
    source.itemTransferProgressMs = 0
    return
  }
  if (!source.process.output) {
    source.itemTransferProgressMs = 0
    return
  }
  source.itemTransferProgressMs = (source.itemTransferProgressMs ?? 0) + elapsedMs
  const target = lvAutomationDestination(state, source)
  const incomingDirection = oppositePipeDirection[source.itemOutputDirection]
  while (source.itemTransferProgressMs >= 1000 && source.process.output) {
    if (!target || !lvAutomationCanReceive(target, incomingDirection, source.process.output.id)) {
      source.itemTransferProgressMs = 1000
      return
    }
    if (!insertLvAutomationItem(target, source.process.output.id)) {
      source.itemTransferProgressMs = 1000
      return
    }
    source.process.output = decrementProcessSlot(source.process.output, 1)
    source.itemTransferProgressMs -= 1000
  }
  if (!source.process.output) source.itemTransferProgressMs = 0
}

function configuredArcPortNeighbour(state: GameState, structure: ArcBlastFurnaceStructure, port: MachineInstance) {
  const outward = arcPortOutwardDirections(structure, port)
  const direction = outward.find((candidate) => pipeSideMode(port, candidate) !== 'blocked')
  if (!direction) return null
  const offset = pipeDirectionOffsets[direction]
  const neighbour = machineAt(state, port.x + offset.dx, port.y + offset.dy)
  if (!neighbour || !machinesCanConnect(port, neighbour)) return null
  return neighbour
}

function removableInventorySlots(instance: MachineInstance) {
  const slots: Array<{ get: () => ProcessSlot; set: (slot: ProcessSlot) => void }> = []
  for (let index = 0; index < instance.process.storageSlots.length; index += 1) {
    slots.push({
      get: () => instance.process.storageSlots[index],
      set: (slot) => { instance.process.storageSlots[index] = slot },
    })
  }
  if (isItemHopperMachine(instance.machineId)) {
    for (const slotId of hopperStorageSlotIds) slots.push({ get: () => instance.process[slotId], set: (slot) => { instance.process[slotId] = slot } })
  } else if (!isItemBusMachine(instance.machineId)) {
    slots.push({ get: () => instance.process.output, set: (slot) => { instance.process.output = slot } })
    if (machines[instance.machineId].itemOutputSlots === 2) slots.push({ get: () => instance.process.output2, set: (slot) => { instance.process.output2 = slot } })
  }
  return slots
}

function insertOneIntoInventory(instance: MachineInstance, resourceId: ResourceId) {
  if (isItemBusMachine(instance.machineId)) return false
  if (instance.process.storageSlots.length > 0) {
    const existingIndex = instance.process.storageSlots.findIndex((slot) => slot?.id === resourceId && slot.amount < processStackLimit)
    const targetIndex = existingIndex >= 0 ? existingIndex : instance.process.storageSlots.findIndex((slot) => !slot)
    if (targetIndex < 0) return false
    const slot = instance.process.storageSlots[targetIndex]
    instance.process.storageSlots[targetIndex] = slot ? { id: resourceId, amount: slot.amount + 1 } : { id: resourceId, amount: 1 }
    return true
  }
  const candidateSlots: ProcessSlotId[] = isItemHopperMachine(instance.machineId)
    ? [...hopperStorageSlotIds]
    : ['input', 'secondaryInput', 'extraInput1', 'extraInput2', 'extraInput3', 'extraInput4', 'fuel']
  for (const slotId of candidateSlots) {
    const slot = instance.process[slotId]
    if (slot && (slot.id !== resourceId || slot.amount >= processStackLimit)) continue
    if (!isItemHopperMachine(instance.machineId) && !canResourceEnterProcessSlot(instance.machineId, slotId, resourceId)) continue
    instance.process[slotId] = slot ? { id: resourceId, amount: slot.amount + 1 } : { id: resourceId, amount: 1 }
    return true
  }
  return false
}

function tickArcInputBus(state: GameState, structure: ArcBlastFurnaceStructure, elapsedMs: number) {
  const bus = structure.inputBus
  if (!structure.formed || !bus) return
  const neighbour = configuredArcPortNeighbour(state, structure, bus)
  const slots = neighbour ? removableInventorySlots(neighbour) : []
  const source = slots.find((slot) => {
    const stored = slot.get()
    return Boolean(stored && canResourceEnterProcessSlot('arcBlastFurnace', 'input', stored.id) && (!bus.process.input || bus.process.input.id === stored.id) && (bus.process.input?.amount ?? 0) < processStackLimit)
  })
  if (!source) {
    bus.process.activeRecipeId = null
    bus.process.progressMs = 0
    return
  }
  bus.process.activeRecipeId = 'arc_bus_input'
  bus.process.durationMs = 1000
  bus.process.progressMs += elapsedMs
  while (bus.process.progressMs >= 1000) {
    const stored = source.get()
    if (!stored || !canResourceEnterProcessSlot('arcBlastFurnace', 'input', stored.id)) break
    bus.process.input = bus.process.input ? { ...bus.process.input, amount: bus.process.input.amount + 1 } : { id: stored.id, amount: 1 }
    source.set(decrementProcessSlot(stored, 1))
    bus.process.progressMs -= 1000
  }
}

function tickArcOutputBus(state: GameState, structure: ArcBlastFurnaceStructure, elapsedMs: number) {
  const bus = structure.outputBus
  if (!structure.formed || !bus?.process.output) return
  const neighbour = configuredArcPortNeighbour(state, structure, bus)
  if (!neighbour) {
    bus.process.activeRecipeId = null
    bus.process.progressMs = 0
    return
  }
  bus.process.activeRecipeId = 'arc_bus_output'
  bus.process.durationMs = 1000
  bus.process.progressMs += elapsedMs
  while (bus.process.progressMs >= 1000 && bus.process.output) {
    if (!insertOneIntoInventory(neighbour, bus.process.output.id)) break
    bus.process.output = decrementProcessSlot(bus.process.output, 1)
    bus.process.progressMs -= 1000
  }
}

export function tickMachineInstances(state: GameState, elapsedMs: number, now = Date.now()) {
  const next = cloneState(state)
  const previousFactoryTopology = activeFactoryTopology
  activeFactoryTopology = activateFactoryTopology(next)
  try {
    activeSteamTransferBudgets = new Map()
    activeEuTransferBudgets = new Map()
    activeFluidTransferBudgets = new Map()
  for (const instance of next.machineInstances) {
    if (isItemHopperMachine(instance.machineId)) tickItemHopper(next, instance, elapsedMs)
  }
  for (const instance of next.machineInstances) {
    if (instance.machineId !== 'arcBlastFurnace') continue
    const structure = arcBlastFurnaceStructureForInstance(next, instance)
    if (structure) tickArcInputBus(next, structure, elapsedMs)
  }
  for (const instance of next.machineInstances) {
    if (instance.machineId !== 'well') continue
    instance.process.fluidCapacityLitres = wellWaterCapacityLitres
    instance.process.fluids.water = Math.min(wellWaterCapacityLitres, (instance.process.fluids.water ?? 0) + wellWaterProductionLitresPerSecond * (elapsedMs / 1000))
  }
  for (const instance of next.machineInstances) {
    if (instance.machineId === 'well') pushFluidToConnectedStorage(next, instance, 'water', elapsedMs)
  }
  for (const instance of next.machineInstances) {
    if (instance.machineId === 'well') {
      instance.process.fluidCapacityLitres = wellWaterCapacityLitres
    }
    if (instance.machineId === 'furnace') tickFurnaceProcess(instance, elapsedMs)
    if (instance.machineId === 'steamBoiler') tickSteamBoiler(instance, elapsedMs)
    if (instance.machineId === 'steamTank') {
      const tankStructure = steamTankStructureForInstance(next, instance)
      if (tankStructure && tankStructure.controller.uid !== instance.uid) {
        instance.process.steamCapacityMs = 0
        instance.process.steamStoredMs = 0
        instance.process.fluidCapacityLitres = 0
        instance.process.fluids = normalizeFluidStore()
      } else {
        const capacity = steamTankCapacityMsForInstance(next, instance)
        instance.process.steamCapacityMs = capacity
        instance.process.steamStoredMs = Math.min(instance.process.steamStoredMs, capacity)
        instance.process.fluidCapacityLitres = steamTankFluidCapacityLitresForInstance(next, instance)
        enforceSingleFluidStore(instance.process)
      }
    }
    if (instance.machineId === 'steamTurbine') {
      instance.process.euCapacity = steamTurbineEuCapacity
      instance.process.euStored = Math.min(instance.process.euStored, steamTurbineEuCapacity)
    }
    if (isEuStorageMachine(instance.machineId)) {
      instance.process.euCapacity = batteryBufferEuCapacity(instance)
      instance.process.euStored = Math.min(instance.process.euStored, instance.process.euCapacity)
    }
    if (isEuCableMachine(instance.machineId)) {
      instance.process.euCapacity = 0
      instance.process.euStored = 0
    }
    if (isEuPoweredMachine(instance.machineId)) {
      instance.process.euCapacity = machineEuCapacity(instance.machineId)
      instance.process.euStored = Math.min(instance.process.euStored, instance.process.euCapacity)
      instance.process.fluidCapacityLitres = machineFluidCapacityLitres(instance.machineId)
    }
    if (isEuHatchMachine(instance.machineId)) {
      instance.process.euCapacity = machineEuCapacity(instance.machineId)
      instance.process.euStored = Math.min(instance.process.euStored, instance.process.euCapacity)
    }
    if (instance.machineId === 'cokeOven') tickCokeOven(next, instance, elapsedMs)
    if (isLiquidSteamBoilerMachine(instance.machineId)) tickLiquidSteamBoiler(next, instance, elapsedMs)
    if (instance.machineId === 'brickedBlastFurnace') tickBrickedBlastFurnace(instance, elapsedMs)
  }
  for (const instance of next.machineInstances) {
    if (instance.machineId === 'steamTank') fillSteamTankFromConnectedStorage(next, instance, elapsedMs)
  }
  for (const instance of next.machineInstances) {
    if (isSteamPoweredMachine(instance.machineId) && !isAutoMinerMachine(instance.machineId)) tickSteamProcessMachine(next, instance, elapsedMs)
  }
  for (const instance of next.machineInstances) {
    if (isEuProducerMachine(instance.machineId)) tickSteamTurbine(next, instance, elapsedMs)
  }
  const euConsumersByDistance = next.machineInstances
    .map((instance) => ({ instance, sourceDistance: nearestConnectedEuSourceDistance(next, instance) }))
    .sort((a, b) => a.sourceDistance - b.sourceDistance || a.instance.uid.localeCompare(b.instance.uid))
    .map(({ instance }) => instance)
  for (const instance of euConsumersByDistance) {
    if (isEuStorageMachine(instance.machineId)) tickEuStorage(next, instance, elapsedMs)
  }
  for (const instance of euConsumersByDistance) {
    if (isEuHatchMachine(instance.machineId)) fillInternalEuFromConnectedStorage(next, instance, elapsedMs, 2)
  }
  for (const instance of euConsumersByDistance) {
    if (instance.machineId === 'lvAirCollector') tickAirCollector(next, instance, elapsedMs)
    else if (isEuPoweredMachine(instance.machineId) && !isAutoMinerMachine(instance.machineId)) tickEuProcessMachine(next, instance, elapsedMs)
  }
  for (const instance of next.machineInstances) {
    if (!isFluidOutletConfigurableMachine(instance.machineId)) continue
    for (const fluidId of storedFluidTypes(instance.process)) pushFluidToConnectedStorage(next, instance, fluidId, elapsedMs)
  }
  for (const instance of euConsumersByDistance) {
    if (isAutoMinerMachine(instance.machineId)) tickAutoMiner(next, instance, elapsedMs)
  }
  for (const instance of next.machineInstances) {
    if (instance.machineId !== 'arcBlastFurnace') continue
    const structure = arcBlastFurnaceStructureForInstance(next, instance)
    if (structure) {
      tickArcOutputBus(next, structure, elapsedMs)
      if (structure.formed && structure.fluidOutputHatch) {
        for (const fluidId of storedFluidTypes(structure.fluidOutputHatch.process)) pushFluidToConnectedStorage(next, structure.fluidOutputHatch, fluidId, elapsedMs)
      }
    }
  }
  for (const instance of next.machineInstances) tickLvItemAutomation(next, instance, elapsedMs)
  tickPipeDisplayBuffers(next)
  next.lastSavedAt = now
  return next
  } finally {
    activeSteamTransferBudgets = null
    activeEuTransferBudgets = null
    activeFluidTransferBudgets = null
    activeFactoryTopology = previousFactoryTopology
  }
}

export function tickGame(state: GameState, elapsedMs: number, now = Date.now()): TickResult {
  let next = cloneState(state)
  const machineOutputs: ResourceAmount[] = []

  for (const machineId of Object.keys(next.machines) as MachineId[]) {
    const count = next.machines[machineId]
    const machine = machines[machineId]
    if (!machine || count < 1 || !machine.intervalMs || !machine.produces) continue
    if (machine.consumes && !hasResources(next, machine.consumes)) continue

    const currentProgress = (next.machineProgress[machineId] ?? 0) + elapsedMs
    const cycles = Math.floor(currentProgress / machine.intervalMs)
    next.machineProgress[machineId] = currentProgress % machine.intervalMs
    if (cycles < 1) continue

    if (machine.consumes) {
      const consumption = machine.consumes.map((amount) => ({ ...amount, amount: amount.amount * cycles * count }))
      if (!hasResources(next, consumption)) continue
      next = subtractResources(next, consumption)
    }

    const produced = machine.produces.map((amount) => ({
      ...amount,
      amount: amount.amount * cycles * count,
    }))
    next = addResources(next, produced)
    recordResourceMilestones(next, produced)
    machineOutputs.push(...produced)
  }

  next = tickMachineInstances(next, elapsedMs, now)
  const questSync = autoCompleteQuests(next)
  next = questSync.state
  next.lastSavedAt = now
  return {
    state: next,
    machineOutputs: combineResourceAmounts(machineOutputs),
    questCompletions: questSync.completedQuestIds,
  }
}

function emptyOfflineProgress(reason: OfflineProgressResult['reason'], elapsedMs = 0, suspicious = false): OfflineProgressResult {
  return {
    applied: false,
    elapsedMs,
    simulatedMs: 0,
    capped: false,
    suspicious,
    reason,
    resourceDelta: [],
    questCompletions: [],
  }
}

function resourceDelta(before: GameState, after: GameState) {
  return (Object.keys(after.resources) as ResourceId[])
    .map((id) => ({ id, amount: after.resources[id] - before.resources[id] }))
    .filter((amount) => amount.amount > 0)
}

function savedLastSavedAt(raw: string | null) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<GameState>
    return typeof parsed.lastSavedAt === 'number' && Number.isFinite(parsed.lastSavedAt) ? parsed.lastSavedAt : null
  } catch {
    return null
  }
}

export function simulateOfflineProgress(state: GameState, elapsedMs: number, now = Date.now()): { state: GameState; offline: OfflineProgressResult } {
  if (elapsedMs < -negativeClockToleranceMs) {
    return { state: { ...state, lastSavedAt: now }, offline: emptyOfflineProgress('negative-clock', elapsedMs, true) }
  }
  if (elapsedMs <= 0) {
    return { state: { ...state, lastSavedAt: now }, offline: emptyOfflineProgress('no-elapsed-time', elapsedMs) }
  }
  if (elapsedMs > suspiciousOfflineJumpMs) {
    return { state: { ...state, lastSavedAt: now }, offline: emptyOfflineProgress('clock-jump', elapsedMs, true) }
  }

  const simulatedMs = Math.min(elapsedMs, offlineProgressCapMs)
  const before = cloneState(state)
  let next = cloneState(state)
  let remainingMs = simulatedMs
  const completedQuestIds = new Set<QuestId>()
  let simulatedAt = Math.max(now - simulatedMs, state.lastSavedAt)

  while (remainingMs > 0) {
    const chunkMs = Math.min(remainingMs, offlineSimulationChunkMs)
    simulatedAt += chunkMs
    const result = tickGame(next, chunkMs, simulatedAt)
    next = result.state
    for (const questId of result.questCompletions) completedQuestIds.add(questId)
    remainingMs -= chunkMs
  }

  next.lastSavedAt = now
  return {
    state: next,
    offline: {
      applied: simulatedMs > 0,
      elapsedMs,
      simulatedMs,
      capped: elapsedMs > offlineProgressCapMs,
      suspicious: false,
      reason: 'applied',
      resourceDelta: resourceDelta(before, next),
      questCompletions: [...completedQuestIds],
    },
  }
}

export type QuestStatus = 'locked' | 'available' | 'ready' | 'completed'

export type QuestObjectiveProgress = {
  objective: QuestObjective
  label: string
  current: number
  required: number
  complete: boolean
}

export function questObjectives(quest: Quest): QuestObjective[] {
  if (quest.objectives?.length) return quest.objectives
  const currentStockQuestIds = new Set<QuestId>([
    'copperAndTin',
    'firstSteel',
    'smeltRedAlloy',
    'cutRedAlloyWireQuest',
    'extractRubberQuest',
    'gatherBatteryMineralsQuest',
    'fillLvBatteryQuest',
    'buildFourAmpBufferQuest',
    'runLvBenderQuest',
    'runLvLatheQuest',
    'makeAluminiumDustQuest',
    'firstAluminiumQuest',
  ])
  const resourceProgressMode = currentStockQuestIds.has(quest.id) ? 'current' : 'lifetime'
  return [
    ...(quest.requirements.resources ?? []).map((amount): QuestObjective => ({ type: 'resource', id: amount.id, amount: amount.amount, progressMode: resourceProgressMode })),
    ...(quest.requirements.machines ?? []).map((amount): QuestObjective => ({ type: 'machine', id: amount.id, amount: amount.amount, progressMode: 'lifetime' })),
    ...(quest.requirements.surveyCards ?? []).map((amount): QuestObjective => ({ type: 'surveyCard', id: amount.id, amount: amount.amount })),
    ...(quest.requirements.recipes ?? []).map((amount): QuestObjective => ({ type: 'recipe', id: amount.id, amount: amount.amount })),
    ...(quest.requirements.fluidTransfers ?? []).map((transfer): QuestObjective => ({ type: 'fluidTransfer', ...transfer })),
  ]
}

function questObjectiveCurrent(state: GameState, objective: QuestObjective) {
  if (objective.type === 'resource') return objective.progressMode === 'current' ? state.resources[objective.id] : Math.max(state.resources[objective.id], state.resourceMilestones[objective.id] ?? 0)
  if (objective.type === 'machine') {
    if (objective.progressMode === 'current') return state.machines[objective.id]
    return Math.max(state.machineMilestones[objective.id] ?? 0, state.machines[objective.id])
  }
  if (objective.type === 'surveyCard') {
    const installedCards = state.machineInstances.filter((instance) => instance.surveyCardTarget === objective.id).length
    return (state.surveyCards[objective.id] ?? 0) + installedCards
  }
  if (objective.type === 'recipe') return state.recipeMilestones[objective.id] ?? 0
  if (objective.type === 'placedMachine') {
    if (objective.id === 'arcBlastFurnace') {
      return state.machineInstances.filter(
        (instance) => instance.machineId === objective.id && Boolean(arcBlastFurnaceStructureForInstance(state, instance)?.formed),
      ).length
    }
    return state.machineInstances.filter((instance) => instance.machineId === objective.id).length
  }
  if (objective.type === 'fluidTransfer') {
    return state.fluidTransferMilestones[fluidTransferMilestoneKey(objective.direction, objective.kind, objective.fluidId, objective.machineId)] ?? 0
  }
  return state.factoryFoundationLevel
}

export function questObjectiveLabel(objective: QuestObjective) {
  if (objective.label) return objective.label
  if (objective.type === 'resource') return resourceLabels[objective.id]
  if (objective.type === 'surveyCard') return `${gatherTargets[objective.id].name} Survey Card`
  if (objective.type === 'recipe') return processRecipes.find((recipe) => recipe.id === objective.id)?.name ?? recipes.find((recipe) => recipe.id === objective.id)?.name ?? objective.id
  if (objective.type === 'factoryFoundation') return `Factory foundation level ${objective.level}`
  if (objective.type === 'fluidTransfer') {
    const container = objective.kind === 'bucket' ? 'Bucket' : 'Steel Cell'
    const action = objective.direction === 'fill' ? 'Fill' : 'Drain'
    return `${action} ${container} with ${objective.fluidId === 'liquidRubber' ? 'Liquid Rubber' : objective.fluidId[0].toUpperCase() + objective.fluidId.slice(1)}`
  }
  return machines[objective.id].name
}

export function questObjectiveProgress(state: GameState, objective: QuestObjective): QuestObjectiveProgress {
  const required = objective.type === 'factoryFoundation' ? objective.level : objective.type === 'fluidTransfer' ? objective.amountLitres : objective.amount
  const current = questObjectiveCurrent(state, objective)
  return {
    objective,
    label: questObjectiveLabel(objective),
    current,
    required,
    complete: current >= required,
  }
}

export function questPrerequisitesMet(state: GameState, quest: Quest) {
  return (quest.prerequisites ?? []).every((questId) => state.completedQuests.includes(questId))
}

function questPrerequisitesMetBySet(completedQuests: Set<QuestId>, quest: Quest) {
  return (quest.prerequisites ?? []).every((questId) => completedQuests.has(questId))
}

export function questProgress(state: GameState, quest: Quest) {
  const objectives = questObjectives(quest)
  if (!objectives.length) return 1
  return objectives.filter((objective) => questObjectiveProgress(state, objective).complete).length / objectives.length
}

export function questStatus(state: GameState, quest: Quest): QuestStatus {
  if (state.completedQuests.includes(quest.id)) return 'completed'
  if (!questPrerequisitesMet(state, quest)) return 'locked'
  return questObjectives(quest).every((objective) => questObjectiveProgress(state, objective).complete) ? 'ready' : 'available'
}

export function canCompleteQuest(state: GameState, quest: Quest) {
  return questStatus(state, quest) === 'ready'
}

export function questKind(quest: Quest): NonNullable<Quest['kind']> {
  if (quest.kind) return quest.kind
  if (['buildFoundation', 'steelPlateQuest', 'buildSteamTurbineQuest', 'firstAluminiumQuest'].includes(quest.id)) return 'gate'
  if (
    [
      'chopFaster',
      'steamUtilityBranch',
      'creosoteBoilerQuest',
    ].includes(quest.id)
  ) {
    return 'optional'
  }
  return 'main'
}

export function questScripReward(quest: Quest) {
  if (typeof quest.rewards.scrip === 'number') return quest.rewards.scrip
  const kind = questKind(quest)
  if (kind === 'gate') return 30
  if (kind === 'optional') return 8
  return 12
}

export function autoCompleteQuests(state: GameState): { state: GameState; completedQuestIds: QuestId[] } {
  const completed = new Set(state.completedQuests)
  const completedQuestIds: QuestId[] = []
  let changed = true

  while (changed) {
    changed = false
    for (const quest of quests) {
      if (completed.has(quest.id)) continue
      if (!questPrerequisitesMetBySet(completed, quest)) continue
      if (!questObjectives(quest).every((objective) => questObjectiveProgress(state, objective).complete)) continue
      completed.add(quest.id)
      completedQuestIds.push(quest.id)
      changed = true
    }
  }

  if (!completedQuestIds.length) return { state, completedQuestIds }

  const next = cloneState(state)
  next.completedQuests.push(...completedQuestIds)
  for (const questId of completedQuestIds) {
    if (!next.unlockedQuests.includes(questId)) next.unlockedQuests.push(questId)
  }
  next.lastSavedAt = Date.now()
  return { state: next, completedQuestIds }
}

export function completeQuest(state: GameState, questId: string) {
  const quest = quests.find((candidate) => candidate.id === questId)
  if (!quest || !canCompleteQuest(state, quest)) return state

  const next = cloneState(state)
  next.completedQuests.push(quest.id)
  if (!next.unlockedQuests.includes(quest.id)) next.unlockedQuests.push(quest.id)
  next.lastSavedAt = Date.now()
  return next
}

export function claimQuestReward(state: GameState, questId: QuestId) {
  if (!state.completedQuests.includes(questId) || state.claimedQuests.includes(questId)) return state
  const quest = quests.find((candidate) => candidate.id === questId)
  if (!quest) return state
  const next = cloneState(state)
  next.claimedQuests.push(questId)
  next.scrip += questScripReward(quest)
  next.discoveredResources = Array.from(
    new Set([...next.discoveredResources, ...(quest.rewards.resources ?? []).filter((amount) => amount.amount > 0).map((amount) => amount.id)]),
  )
  for (const amount of quest.rewards.resources ?? []) {
    next.resources[amount.id] += amount.amount
  }
  for (const machine of quest.rewards.machines ?? []) {
    next.machines[machine.id] += machine.amount
  }
  for (const unlock of quest.rewards.unlocks ?? []) {
    if (!next.unlockedQuests.includes(unlock)) next.unlockedQuests.push(unlock)
  }
  next.lastSavedAt = Date.now()
  return next
}

export function claimAllQuestRewards(state: GameState) {
  let next = state
  for (const questId of state.completedQuests) {
    next = claimQuestReward(next, questId)
  }
  return next
}

export function visibleQuests(state: GameState) {
  return quests.filter((quest) => state.completedQuests.includes(quest.id) || questPrerequisitesMet(state, quest))
}

export function nextQuest(state: GameState) {
  return quests.find((quest) => questStatus(state, quest) !== 'completed') ?? quests.at(-1)
}

function migrateResources(resources: Record<ResourceId, number> & Partial<Record<string, number>>) {
  if (resources.stone > 0) {
    resources.cobblestone += resources.stone
    resources.stone = 0
  }
  if ((resources.lithiumOre ?? 0) > 0) {
    resources.lithiumDust += Math.max(0, Math.floor(resources.lithiumOre ?? 0))
    resources.lithiumOre = 0
  }
  if (resources.lvBattery > 0) {
    resources.sodiumBattery += resources.lvBattery
    resources.lvBattery = 0
  }
  return resources
}

function migrateMachines(parsedMachines?: Partial<Record<string, number>>): Record<MachineId, number> {
  const migrated = { ...createInitialState().machines }
  for (const machineId of Object.keys(machines) as MachineId[]) {
    const amount = parsedMachines?.[machineId]
    if (typeof amount === 'number') migrated[machineId] = Math.max(0, Math.floor(amount))
  }
  return migrated
}

function migrateResourceBackedMachines(
  parsedVersion: number,
  machinesState: Record<MachineId, number>,
  resourcesState: Record<ResourceId, number>,
  instances: MachineInstance[],
) {
  if (parsedVersion >= 10) return
  for (const machineId of resourceBackedMachineIds) {
    const placed = instances.filter((instance) => instance.machineId === machineId).length
    resourcesState[machineId] += Math.max(0, machinesState[machineId] - placed)
    machinesState[machineId] = 0
  }
}

function normalizeDurability(durability?: Partial<Record<ResourceId, number>>) {
  const normalized: Partial<Record<ResourceId, number>> = {}
  if (!durability) return normalized
  for (const [id, amount] of Object.entries(durability)) {
    const resourceId = id as ResourceId
    const max = maxDurability(resourceId)
    if (max > 0 && typeof amount === 'number') normalized[resourceId] = Math.max(0, Math.min(max, Math.floor(amount)))
  }
  return normalized
}

function normalizeCraftedResources(parsed: Partial<GameState>) {
  const crafted = new Set<ResourceId>()
  for (const id of parsed.craftedResources ?? []) {
    if (id in resourceLabels) crafted.add(id)
  }

  for (const id of ['woodenPickaxe', 'stonePickaxe', 'ironPickaxe', 'diamondPickaxe'] as ResourceId[]) {
    if ((parsed.resources?.[id] ?? 0) > 0 || Object.values(parsed.equipment ?? {}).includes(id)) {
      crafted.add(id)
    }
  }

  return [...crafted]
}

function normalizeDiscoveredResources(parsed: Partial<GameState>, migratedResources: Record<ResourceId, number>) {
  const discovered = new Set<ResourceId>()
  for (const id of parsed.discoveredResources ?? []) {
    if (id in resourceLabels) discovered.add(id)
  }
  for (const id of parsed.craftedResources ?? []) {
    if (id in resourceLabels) discovered.add(id)
  }
  for (const [id, amount] of Object.entries(migratedResources)) {
    if (amount > 0 && id in resourceLabels) discovered.add(id as ResourceId)
  }
  for (const id of Object.values(parsed.equipment ?? {})) {
    if (id && id in resourceLabels) discovered.add(id)
  }
  return [...discovered]
}

function normalizeShopCooldowns(parsed: Partial<GameState>, now: number) {
  const normalized: Partial<Record<ResourceId, number>> = {}
  for (const [id, timestamp] of Object.entries(parsed.shopCooldowns ?? {})) {
    if (!(id in resourceLabels) || typeof timestamp !== 'number' || !Number.isFinite(timestamp)) continue
    if (timestamp > now) normalized[id as ResourceId] = Math.floor(timestamp)
  }
  return normalized
}

function legacySaveHasFactoryMachines(parsed: Partial<GameState>) {
  if ((parsed.machineInstances?.length ?? 0) > 0) return true
  return Object.values(parsed.machines ?? {}).some((amount) => typeof amount === 'number' && amount > 0)
}

function normalizeFactoryFoundationLevel(parsed: Partial<GameState>) {
  if (typeof parsed.factoryFoundationLevel === 'number') return clampFactoryFoundationLevel(parsed.factoryFoundationLevel)
  return legacySaveHasFactoryMachines(parsed) ? 2 : 0
}

function addReturnedProcessSlots(resources: Record<ResourceId, number>, instance: MachineInstance) {
  for (const slot of [
    instance.process.input,
    instance.process.secondaryInput,
    instance.process.extraInput1,
    instance.process.extraInput2,
    instance.process.extraInput3,
    instance.process.extraInput4,
    instance.process.fuel,
    instance.process.output,
    instance.process.output2,
    ...instance.process.storageSlots,
    ...instance.process.batterySlots.map((id) => (id ? { id, amount: 1 } : null)),
  ]) {
    if (!slot) continue
    resources[slot.id] += slot.amount
  }
}

function migrateMachineInstances(
  machinesState: Record<MachineId, number>,
  resourcesState: Record<ResourceId, number>,
  foundationLevel: number,
  legacyCokeOvenSave: boolean,
  legacyBatteryBufferSave: boolean,
  legacyArcFurnaceSave: boolean,
  legacyHopperImplicitInputs: boolean,
  migrationNotices: string[],
  parsedInstances?: Partial<MachineInstance>[],
) {
  const instances = normalizeMachineInstances(parsedInstances, foundationLevel, legacyHopperImplicitInputs)
  for (const instance of instances) {
    if (isEuStorageMachine(instance.machineId) && instance.process.input?.id === 'lvBattery') {
      instance.process.input = { id: 'sodiumBattery', amount: instance.process.input.amount }
      instance.process.euCapacity = batteryBufferEuCapacity(instance)
      instance.process.euStored = Math.min(instance.process.euStored, instance.process.euCapacity)
    }
  }
  if (legacyCokeOvenSave) {
    const placedLegacyCokeOvens = instances.filter((instance) => instance.machineId === 'cokeOven')
    const legacyCokeOvenCount = Math.max(machinesState.cokeOven, placedLegacyCokeOvens.length)
    if (legacyCokeOvenCount > 0) {
      for (const instance of placedLegacyCokeOvens) addReturnedProcessSlots(resourcesState, instance)
      machinesState.cokeOven = 0
      machinesState.cokeOvenPart += legacyCokeOvenCount * 4
      migrationNotices.push('coke-oven-multiblock')
    }
  }
  let migratedInstances = legacyCokeOvenSave ? instances.filter((instance) => instance.machineId !== 'cokeOven') : instances
  if (legacyBatteryBufferSave) {
    const placedBuffers = migratedInstances.filter((instance) => isEuStorageMachine(instance.machineId))
    let filledPlacedBuffers = 0
    for (const instance of placedBuffers) {
      if (batteryBufferInstalledBatteries(instance) > 0) continue
      instance.process.batterySlots = Array.from({ length: batteryBufferSlots(instance.machineId) }, (_, index) => index === 0 ? 'sodiumBattery' : null)
      instance.process.euCapacity = batteryBufferEuCapacity(instance)
      instance.process.euStored = Math.min(instance.process.euStored || instance.process.euCapacity, instance.process.euCapacity)
      filledPlacedBuffers += 1
    }
    const unplacedOldBuffers = Math.max(0, machinesState.lvBatteryBuffer - placedBuffers.filter((instance) => instance.machineId === 'lvBatteryBuffer').length)
    if (unplacedOldBuffers > 0) resourcesState.sodiumBattery += unplacedOldBuffers
    if (filledPlacedBuffers > 0 || unplacedOldBuffers > 0) migrationNotices.push('lv-buffer-batteries')
  }
  if (legacyArcFurnaceSave) {
    const placedControllers = migratedInstances.filter((instance) => instance.machineId === 'arcBlastFurnace')
    const placedParts = migratedInstances.filter((instance) => instance.machineId === 'arcBlastFurnacePart')
    for (const controller of placedControllers) {
      const activeRecipe = controller.process.activeRecipeId ? processRecipes.find((recipe) => recipe.id === controller.process.activeRecipeId) : null
      if (controller.process.input && activeRecipe) controller.process.input = decrementProcessSlot(controller.process.input, activeRecipe.input.amount)
      addReturnedProcessSlots(resourcesState, controller)
    }
    const unplacedParts = Math.max(0, machinesState.arcBlastFurnacePart - placedParts.length)
    resourcesState.heatProofCasing += placedControllers.length * 8 + unplacedParts * 2
    machinesState.arcBlastFurnace = 0
    machinesState.arcBlastFurnacePart = 0
    migratedInstances = migratedInstances.filter((instance) => instance.machineId !== 'arcBlastFurnace' && instance.machineId !== 'arcBlastFurnacePart')
    if (placedControllers.length > 0 || placedParts.length > 0 || unplacedParts > 0) migrationNotices.push('arc-furnace-3x3')
  }
  if (parsedInstances) {
    const placedBlastFurnaces = migratedInstances.filter((instance) => instance.machineId === 'brickedBlastFurnace').length
    const unplacedLegacyBlastFurnaces = Math.max(0, machinesState.brickedBlastFurnace - placedBlastFurnaces)
    if (unplacedLegacyBlastFurnaces > 0) {
      machinesState.brickedBlastFurnace -= unplacedLegacyBlastFurnaces
      machinesState.brickedBlastFurnacePart += unplacedLegacyBlastFurnaces * 4
    }
    return migratedInstances
  }

  const migrated = [...migratedInstances]
  const furnaceCount = machinesState.furnace ?? 0
  const grid = factoryFoundationSizes[clampFactoryFoundationLevel(foundationLevel)] ?? factoryGrid
  if (grid.width < 1 || grid.height < 1) return migrated
  for (let index = migrated.length; index < furnaceCount; index += 1) {
    migrated.push({
      uid: `furnace-${index + 1}`,
      machineId: 'furnace',
      x: index % grid.width,
      y: Math.floor(index / grid.width),
      level: 1,
      pipeDisabledSides: {},
      pipeSideModes: {},
      process: emptyProcessState(),
    })
  }
  return migrated.filter((instance) => isInsideGridSize(grid, instance.x, instance.y))
}

function normalizeAutoMinerAssignments(parsed: Partial<GameState>, instances: MachineInstance[]) {
  const normalized: Record<string, GatherTargetId> = {}
  const instanceByUid = new Map(instances.map((instance) => [instance.uid, instance]))
  for (const [uid, targetId] of Object.entries(parsed.autoMinerAssignments ?? {})) {
    const instance = instanceByUid.get(uid)
    if (!instance || !isAutoMinerMachine(instance.machineId)) continue
    if (targetId in gatherTargets && canAutoMinerTarget(instance.machineId, targetId as GatherTargetId)) {
      normalized[uid] = targetId as GatherTargetId
    }
  }
  return normalized
}

export function loadGame(raw: string | null, now = Date.now()): GameState {
  if (!raw) return createInitialState(now)

  try {
    const parsed = JSON.parse(raw) as Partial<GameState>
    const fresh = createInitialState(now)
    const unlockedQuests = parsed.unlockedQuests?.length ? [...parsed.unlockedQuests] : [...fresh.unlockedQuests]
    if (!unlockedQuests.includes('punchTree') && !parsed.completedQuests?.includes('punchTree')) {
      unlockedQuests.unshift('punchTree')
    }

    const parsedVersion = typeof parsed.version === 'number' ? parsed.version : 1
    const migrationNotices: string[] = []
    const legacyCokeOvenSave = parsedVersion < 2
    const legacyBatteryBufferSave = parsedVersion < 3
    const legacyArcFurnaceSave = parsedVersion < 5
    const legacyHopperImplicitInputs = parsedVersion < 11
    const machinesState = migrateMachines(parsed.machines as Partial<Record<string, number>> | undefined)
    const factoryFoundationLevel = normalizeFactoryFoundationLevel(parsed)
    const parsedResources = (parsed.resources ?? {}) as Partial<Record<string, number>>
    const migratedResources = migrateResources({ ...fresh.resources, ...parsedResources })
    const machineInstances = migrateMachineInstances(
      machinesState,
      migratedResources,
      factoryFoundationLevel,
      legacyCokeOvenSave,
      legacyBatteryBufferSave,
      legacyArcFurnaceSave,
      legacyHopperImplicitInputs,
      migrationNotices,
      parsed.machineInstances,
    )
    migrateResourceBackedMachines(parsedVersion, machinesState, migratedResources, machineInstances)
    const craftedResources = normalizeCraftedResources(parsed)
    const discoveredResources = normalizeDiscoveredResources(parsed, migratedResources)
    const resourceMilestones = { ...(parsed.resourceMilestones ?? {}) }
    for (const resourceId of Object.keys(migratedResources) as ResourceId[]) {
      const legacyEvidence = craftedResources.includes(resourceId) || discoveredResources.includes(resourceId) ? 1 : 0
      resourceMilestones[resourceId] = Math.max(resourceMilestones[resourceId] ?? 0, migratedResources[resourceId], legacyEvidence)
    }
    if (parsedVersion < 10) {
      for (const cableId of resourceBackedMachineIds) {
        resourceMilestones[cableId] = Math.max(
          resourceMilestones[cableId] ?? 0,
          Number(parsed.machineMilestones?.[cableId]) || 0,
          Number(parsed.machines?.[cableId]) || 0,
          machineInstances.filter((instance) => instance.machineId === cableId).length,
        )
      }
    }
    const machineMilestones = { ...(parsed.machineMilestones ?? {}) }
    for (const machineId of Object.keys(machinesState) as MachineId[]) {
      const placed = machineInstances.filter((instance) => instance.machineId === machineId).length
      machineMilestones[machineId] = Math.max(machineMilestones[machineId] ?? 0, machinesState[machineId], placed)
    }
    const surveyCards = Object.fromEntries(
      Object.entries(parsed.surveyCards ?? {})
        .filter(([targetId, amount]) => targetId in gatherTargets && Number(amount) > 0)
        .map(([targetId, amount]) => [targetId, Math.max(1, Math.floor(Number(amount)))])
    ) as Partial<Record<GatherTargetId, number>>
    const autoMinerAssignments = normalizeAutoMinerAssignments(parsed, machineInstances)
    if (parsedVersion < 7) {
      let migratedSurveyMiner = false
      for (const [uid, targetId] of Object.entries(autoMinerAssignments)) {
        const instance = machineInstances.find((candidate) => candidate.uid === uid)
        if (instance?.machineId !== 'lvAutoMiner' || canAutoMinerTarget('steamAutoMiner', targetId)) continue
        surveyCards[targetId] = Math.max(1, surveyCards[targetId] ?? 0)
        instance.surveyCardTarget = targetId
        migratedSurveyMiner = true
      }
      if (migratedSurveyMiner) migrationNotices.push('survey-card-miners')
    }
    if (parsedVersion < 8) {
      let migratedInstalledCard = false
      for (const instance of machineInstances) {
        const targetId = instance.machineId === 'lvAutoMiner' ? instance.surveyCardTarget : undefined
        if (!targetId) continue
        const inventoryCount = surveyCards[targetId] ?? 0
        if (inventoryCount > 0) {
          surveyCards[targetId] = inventoryCount - 1
          if (surveyCards[targetId]! < 1) delete surveyCards[targetId]
        }
        migratedInstalledCard = true
      }
      if (migratedInstalledCard) migrationNotices.push('survey-card-inventory')
    }

    let fluidContainers = normalizeFluidContainers(parsed.fluidContainers)
    if (parsedVersion < 9) {
      const legacyCells: Array<{ resourceId: string; fluidId: FluidId }> = [
        { resourceId: 'waterSteelCell', fluidId: 'water' },
        { resourceId: 'creosoteSteelCell', fluidId: 'creosote' },
        { resourceId: 'liquidRubberSteelCell', fluidId: 'liquidRubber' },
      ]
      for (const legacy of legacyCells) {
        const count = Math.max(0, Math.floor(Number(parsedResources[legacy.resourceId]) || 0))
        for (let index = 0; index < count; index += 1) {
          fluidContainers.push({ uid: `cell-migrated-${legacy.fluidId}-${index + 1}`, kind: 'steelCell', fluidId: legacy.fluidId, amountLitres: fluidContainerCapacities.steelCell })
        }
        delete (migratedResources as Partial<Record<string, number>>)[legacy.resourceId]
      }
      const legacyBucket = parsed.bucketFluid as Partial<{ id: FluidId; amount: number }> | null | undefined
      if (legacyBucket?.id && fluidIds.includes(legacyBucket.id) && Number(legacyBucket.amount) > 0) {
        const bucketCount = Math.max(0, migratedResources.bucket)
        if (bucketCount > 0) migratedResources.bucket -= 1
        fluidContainers.push({ uid: 'bucket-migrated-1', kind: 'bucket', fluidId: legacyBucket.id, amountLitres: Math.min(1, normalizeLitres(legacyBucket.amount ?? 0)) })
      }
      fluidContainers = normalizeFluidContainers(fluidContainers)
      if (fluidContainers.length > 0) migrationNotices.push('portable-fluid-containers')
    }

    return {
      ...fresh,
      resources: migratedResources,
      machines: machinesState,
      machineInstances,
      bucketFluid: null,
      fluidContainers,
      fluidTransferMilestones: Object.fromEntries(
        Object.entries(parsed.fluidTransferMilestones ?? {}).map(([key, amount]) => [key, normalizeLitres(Number(amount) || 0)]),
      ),
      factoryFoundationLevel,
      scrip: Math.max(0, Math.floor(parsed.scrip ?? 0)),
      shopCooldowns: normalizeShopCooldowns(parsed, now),
      completedQuests: parsed.completedQuests ?? [],
      claimedQuests: parsed.claimedQuests ?? [],
      unlockedQuests: unlockedQuests as QuestId[],
      craftedResources,
      discoveredResources,
      resourceMilestones,
      machineMilestones,
      surveyCards,
      recipeMilestones: Object.fromEntries(
        Object.entries(parsed.recipeMilestones ?? {}).map(([recipeId, amount]) => [recipeId, Math.max(0, Math.floor(Number(amount) || 0))]),
      ),
      equipment: normalizeEquipment(parsed.equipment),
      durability: normalizeDurability(parsed.durability),
      gatherProgress: parsed.gatherProgress ?? {},
      autoMinerAssignments,
      machineProgress: parsed.machineProgress ?? {},
      migrationNotices,
      lastSavedAt: now,
      version: currentSaveVersion,
    }
  } catch {
    return createInitialState(now)
  }
}

export function loadGameWithOfflineProgress(raw: string | null, now = Date.now()): { state: GameState; offline: OfflineProgressResult } {
  const state = loadGame(raw, now)
  if (!raw) return { state, offline: emptyOfflineProgress('new-save') }

  const savedAt = savedLastSavedAt(raw)
  if (savedAt === null) return { state, offline: emptyOfflineProgress('missing-save-time') }

  return simulateOfflineProgress({ ...state, lastSavedAt: savedAt }, now - savedAt, now)
}

export function saveGame(state: GameState, now = Date.now()) {
  return JSON.stringify({ ...state, migrationNotices: [], version: currentSaveVersion, lastSavedAt: now })
}
