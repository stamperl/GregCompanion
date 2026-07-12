import {
  createInitialState,
  fuelDefinitions,
  fluidIds,
  gatherTargets,
  initialEquipment,
  initialMachines,
  initialResources,
  canAutoMinerTarget,
  isAutoMinerMachine,
  isEuBlastMachine,
  isEuCableMachine,
  isEuNetworkMachine,
  isEuPoweredMachine,
  isEuProducerMachine,
  isEuStorageMachine,
  isItemAutomationMachine,
  isItemHopperMachine,
  isItemStorageMachine,
  isLiquidSteamBoilerMachine,
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
  BucketFluidState,
  EquipmentSlotId,
  EquipmentState,
  FluidId,
  GatherTargetId,
  GameState,
  MachineAmount,
  MachineId,
  MachineInstance,
  MachineProcessState,
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
export const currentSaveVersion = 4
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
export const bucketFluidTransferLitres = 16
export const steamAutoMinerActionDamage = 10
export const steamAutoMinerActionMs = 5000
export const steamAutoMinerSteamUseLitres = 16
export const lvAutoMinerActionDamage = 16
export const lvAutoMinerActionMs = 4000
export const lvAutoMinerEuUse = 16

let activeSteamTransferBudgets: Map<string, number> | null = null
let activeEuTransferBudgets: Map<string, number> | null = null
let activeFluidTransferBudgets: Map<string, number> | null = null

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
    storageSlots: [],
    batterySlots: [],
    activeRecipeId: null,
    progressMs: 0,
    durationMs: 0,
    fuelRemainingMs: 0,
    fuelDurationMs: 0,
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
    storageSlots: process.storageSlots.map(cloneProcessSlot),
    batterySlots: [...process.batterySlots],
    activeRecipeId: process.activeRecipeId,
    progressMs: process.progressMs,
    durationMs: process.durationMs,
    fuelRemainingMs: process.fuelRemainingMs,
    fuelDurationMs: process.fuelDurationMs,
    steamStoredMs: process.steamStoredMs,
    steamCapacityMs: process.steamCapacityMs,
    euStored: process.euStored,
    euCapacity: process.euCapacity,
    fluids: { ...process.fluids },
    fluidCapacityLitres: process.fluidCapacityLitres,
  }
}

function normalizeFluidStore(fluids?: Partial<Record<FluidId, number>>) {
  const selected = fluidIds
    .map((id) => ({ id, amount: Math.max(0, Math.floor(fluids?.[id] ?? 0)) }))
    .filter((fluid) => fluid.amount > 0)
    .sort((a, b) => b.amount - a.amount || fluidIds.indexOf(a.id) - fluidIds.indexOf(b.id))[0]

  return Object.fromEntries(fluidIds.map((id) => [id, selected?.id === id ? selected.amount : 0])) as Partial<Record<FluidId, number>>
}

function enforceSingleFluidStore(process: MachineProcessState) {
  process.fluids = normalizeFluidStore(process.fluids)
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
    storageSlots: Array.isArray(process.storageSlots) ? process.storageSlots.map(normalizeProcessSlot).slice(0, 12) : [],
    batterySlots: Array.isArray(process.batterySlots)
      ? process.batterySlots.map((id) => (id && isBufferBatteryId(id) ? id : null)).slice(0, 8)
      : [],
    activeRecipeId: process.activeRecipeId ?? null,
    progressMs: Math.max(0, Math.floor(process.progressMs ?? 0)),
    durationMs: Math.max(0, Math.floor(process.durationMs ?? 0)),
    fuelRemainingMs: Math.max(0, Math.floor(process.fuelRemainingMs ?? 0)),
    fuelDurationMs: Math.max(0, Math.floor(process.fuelDurationMs ?? 0)),
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

function normalizeBucketFluid(parsed?: Partial<BucketFluidState> | null): BucketFluidState | null {
  if (!parsed || !parsed.id || !fluidIds.includes(parsed.id)) return null
  const amount = Math.max(0, Math.floor(parsed.amount ?? 0))
  return amount > 0 ? { id: parsed.id, amount } : null
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

function normalizeMachineInstances(instances: Partial<MachineInstance>[] | undefined, foundationLevel: number) {
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
  return tools.bareHand
}

export function hitGatherTarget(state: GameState, targetId: GatherTargetId) {
  const target = gatherTargets[targetId]
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
      (builtMachines, id) => ({ ...builtMachines, [id]: machines[id].multiblock ? (base.machines[id] ?? 0) : Math.max(32, base.machines[id] ?? 0) }),
      {} as Record<MachineId, number>,
    ),
    factoryFoundationLevel: maxFactoryFoundationLevel,
    craftedResources: resourceIds,
    lastSavedAt: now,
  }
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
  return Boolean(slot && slot.id === cost.id && slot.amount >= cost.amount)
}

function matchProcessRecipeInputs(recipe: ProcessRecipe, input: ProcessSlot, secondaryInput: ProcessSlot, extraInputs: ProcessSlot[] = []): MatchedProcessRecipe | undefined {
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

function findMatchedProcessRecipe(machineId: MachineId, input: ProcessSlot, secondaryInput: ProcessSlot = null, extraInputs: ProcessSlot[] = []) {
  return processRecipes
    .filter((recipe) => recipe.machineId === machineId)
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

function canFluidOutputAccept(process: MachineProcessState, recipe: ProcessRecipe) {
  if (!recipe.fluidOutput) return true
  const otherStored = Object.entries(process.fluids).some(([id, amount]) => id !== recipe.fluidOutput?.id && (amount ?? 0) > 0)
  if (otherStored) return false
  return (process.fluids[recipe.fluidOutput.id] ?? 0) + recipe.fluidOutput.amount <= process.fluidCapacityLitres
}

function addFluidOutput(process: MachineProcessState, recipe: ProcessRecipe) {
  if (!recipe.fluidOutput) return
  process.fluids[recipe.fluidOutput.id] = (process.fluids[recipe.fluidOutput.id] ?? 0) + recipe.fluidOutput.amount
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
  return state.machineInstances.find((instance) => instance.x === x && instance.y === y)
}

export function isFluidOutletConfigurableMachine(machineId: MachineId) {
  return machineId === 'cokeOven' || machineId === 'cokeOvenPart'
}

function isConfigurableConnector(machineId: MachineId) {
  return isSteamPipeMachine(machineId) || isItemHopperMachine(machineId) || isFluidOutletConfigurableMachine(machineId)
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
  if (isEuCableMachine(instance.machineId)) return 'both'
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
  const spec = multiblockSpecForMachine(instance.machineId)
  if (!spec) return null
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
      if (complete) return { x: controllerX, y: controllerY, spec }
    }
  }
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

function storedFluidTypes(process: MachineProcessState) {
  return (Object.keys(process.fluids) as FluidId[]).filter((id) => (process.fluids[id] ?? 0) > 0)
}

function canStoreFluid(state: GameState, instance: MachineInstance, fluidId: FluidId) {
  if (instance.machineId === 'steamBoiler' && fluidId !== 'water') return false
  const capacity = machineFluidCapacityForInstance(state, instance)
  if (capacity < 1) return false
  const storedTypes = storedFluidTypes(instance.process)
  return storedTypes.length < 1 || storedTypes.every((id) => id === fluidId)
}

function connectedFluidNetwork(state: GameState, start: MachineInstance, flowOnly = false) {
  const visited = new Set<string>()
  const queue = [start]
  const network: MachineInstance[] = []

  while (queue.length > 0) {
    const instance = queue.shift()!
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

  return network
}

function connectedSteamNetwork(state: GameState, start: MachineInstance, flowOnly = false) {
  if (!isSteamNetworkMachine(start.machineId)) return [] as MachineInstance[]
  const visited = new Set<string>()
  const queue = [start]
  const network: MachineInstance[] = []

  while (queue.length > 0) {
    const instance = queue.shift()!
    if (visited.has(instance.uid)) continue
    visited.add(instance.uid)
    network.push(instance)

    if (instance.uid !== start.uid && !isSteamPipeMachine(instance.machineId)) continue

    for (const position of adjacentPositions(state, instance.x, instance.y)) {
      const next = machineAt(state, position.x, position.y)
      if (next && (flowOnly ? machinesCanFlow(instance, next) : machinesCanConnect(instance, next)) && isSteamNetworkMachine(next.machineId) && !visited.has(next.uid)) queue.push(next)
    }
  }
  return network
}

function connectedEuNetworkWithDistance(state: GameState, start: MachineInstance) {
  if (!isEuNetworkMachine(start.machineId)) return [] as Array<{ instance: MachineInstance; cableDistance: number }>
  const visited = new Map<string, number>()
  const queue = [{ instance: start, cableDistance: 0 }]
  const network: Array<{ instance: MachineInstance; cableDistance: number }> = []

  const isEuMultiblockBridge = (instance: MachineInstance) => {
    const controller = multiblockCenterForInstance(state, instance)
    return Boolean(controller && isEuNetworkMachine(controller.spec.controller))
  }

  while (queue.length > 0) {
    const current = queue.shift()!
    const previousDistance = visited.get(current.instance.uid)
    if (typeof previousDistance === 'number' && previousDistance <= current.cableDistance) continue
    visited.set(current.instance.uid, current.cableDistance)
    network.push(current)

    if (current.instance.uid !== start.uid && !isEuCableMachine(current.instance.machineId) && !isEuMultiblockBridge(current.instance)) continue

    for (const position of adjacentPositions(state, current.instance.x, current.instance.y)) {
      const next = machineAt(state, position.x, position.y)
      if (!next || (!isEuNetworkMachine(next.machineId) && !isEuMultiblockBridge(next))) continue
      if (!machinesCanConnect(current.instance, next)) continue
      const nextDistance = current.cableDistance + (isEuCableMachine(next.machineId) ? 1 : 0)
      const knownDistance = visited.get(next.uid)
      if (typeof knownDistance !== 'number' || nextDistance < knownDistance) {
        queue.push({ instance: next, cableDistance: nextDistance })
      }
    }
  }

  return network
}

function canEuFlowBetween(state: GameState, source: MachineInstance, target: MachineInstance) {
  return connectedEuNetworkWithDistance(state, source).some((entry) => entry.instance.uid === target.uid)
}

function flowCellsForInstance(state: GameState, instance: MachineInstance) {
  const tankStructure = instance.machineId === 'steamTank' ? steamTankStructureForInstance(state, instance) : null
  if (tankStructure) return tankStructure.positions.map((position) => machineAt(state, position.x, position.y)).filter((cell): cell is MachineInstance => Boolean(cell))

  const multiblock = multiblockCenterForInstance(state, instance)
  if (multiblock && isFluidOutletConfigurableMachine(multiblock.spec.controller)) {
    return multiblockPositions(state, multiblock.x, multiblock.y, multiblock.spec)
      .map((position) => machineAt(state, position.x, position.y))
      .filter((cell): cell is MachineInstance => Boolean(cell))
  }

  return [instance]
}

function connectedFluidNetworkForInstance(state: GameState, start: MachineInstance, flowOnly = false) {
  return uniqueMachineInstances(flowCellsForInstance(state, start).flatMap((cell) => connectedFluidNetwork(state, cell, flowOnly)))
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
  return connectedEuNetworkWithDistance(state, start)
    .filter((entry) => entry.instance.uid !== start.uid && isEuProducerMachine(entry.instance.machineId) && canEuFlowBetween(state, entry.instance, start))
    .sort((a, b) => a.cableDistance - b.cableDistance || a.instance.uid.localeCompare(b.instance.uid))
}

function connectedEuSources(state: GameState, start: MachineInstance) {
  return connectedEuNetworkWithDistance(state, start)
    .filter((entry) => entry.instance.uid !== start.uid && (isEuProducerMachine(entry.instance.machineId) || isEuStorageMachine(entry.instance.machineId)) && canEuFlowBetween(state, entry.instance, start))
    .sort((a, b) => {
      const aStorage = isEuStorageMachine(a.instance.machineId) ? 0 : 1
      const bStorage = isEuStorageMachine(b.instance.machineId) ? 0 : 1
      return aStorage - bStorage || a.cableDistance - b.cableDistance || a.instance.uid.localeCompare(b.instance.uid)
    })
}

function euNetworkKey(state: GameState, start: MachineInstance) {
  return uniqueMachineInstances(connectedEuNetworkWithDistance(state, start).map((entry) => entry.instance))
    .filter((instance) => isEuCableMachine(instance.machineId))
    .map((instance) => instance.uid)
    .sort()
    .join('|')
}

function euNetworkCableAmps(state: GameState, start: MachineInstance) {
  const cables = uniqueMachineInstances(connectedEuNetworkWithDistance(state, start).map((entry) => entry.instance)).filter((instance) => isEuCableMachine(instance.machineId))
  if (cables.length < 1) return Number.POSITIVE_INFINITY
  return Math.min(...cables.map((instance) => Math.max(1, machineEuAmps(instance.machineId))))
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
  return connectedEuSources(state, instance)[0]?.cableDistance ?? Number.POSITIVE_INFINITY
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
      .filter(
        (instance) =>
          instance.uid !== startStorage.uid &&
          (instance.machineId === 'steamTank' || instance.machineId === 'steamBoiler' || (isLiquidSteamBoilerMachine(instance.machineId) && fluidId !== 'water')) &&
          canStoreFluid(state, instance, fluidId),
      ),
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
  const capacity = machineFluidCapacityForInstance(state, instance)
  return Math.max(0, capacity - (instance.process.fluids[fluidId] ?? 0))
}

function manualBucketTargetForInstance(state: GameState, instance: MachineInstance) {
  if (instance.machineId === 'steamTank') return steamTankStorageForInstance(state, instance)
  if (isLiquidSteamBoilerMachine(instance.machineId)) return instance
  if (instance.machineId === 'lvAssembler') return instance
  return null
}

export function fillBucketFromMachine(state: GameState, uid: string, fluidId?: FluidId) {
  if (availableResourceAmount(state, 'bucket') < 1 || state.bucketFluid) return state
  const source = state.machineInstances.find((candidate) => candidate.uid === uid)
  if (!source) return state
  const availableFluids = storedFluidTypes(source.process)
  const selectedFluid = fluidId && availableFluids.includes(fluidId) ? fluidId : availableFluids[0]
  if (!selectedFluid) return state
  const stored = source.process.fluids[selectedFluid] ?? 0
  const amount = Math.min(bucketFluidTransferLitres, stored)
  if (amount < 1) return state

  const next = cloneState(state)
  const nextSource = next.machineInstances.find((candidate) => candidate.uid === uid)
  if (!nextSource) return state
  nextSource.process.fluids[selectedFluid] = Math.max(0, (nextSource.process.fluids[selectedFluid] ?? 0) - amount)
  next.bucketFluid = { id: selectedFluid, amount }
  next.lastSavedAt = Date.now()
  return next
}

export function emptyBucketIntoMachine(state: GameState, uid: string) {
  if (!state.bucketFluid) return state
  const target = state.machineInstances.find((candidate) => candidate.uid === uid)
  if (!target) return state

  const next = cloneState(state)
  const nextTarget = next.machineInstances.find((candidate) => candidate.uid === uid)
  if (!nextTarget || !next.bucketFluid) return state
  if (isLiquidSteamBoilerMachine(nextTarget.machineId) && next.bucketFluid.id !== 'creosote') return state
  const storage = manualBucketTargetForInstance(next, nextTarget)
  if (!storage || !canStoreFluid(next, storage, next.bucketFluid.id)) return state

  storage.process.fluidCapacityLitres = machineFluidCapacityForInstance(next, storage)
  const free = freeFluidCapacity(next, storage, next.bucketFluid.id)
  const transfer = Math.min(next.bucketFluid.amount, free)
  if (transfer < 1) return state

  storage.process.fluids[next.bucketFluid.id] = (storage.process.fluids[next.bucketFluid.id] ?? 0) + transfer
  const remaining = next.bucketFluid.amount - transfer
  next.bucketFluid = remaining > 0 ? { ...next.bucketFluid, amount: remaining } : null
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
  for (const instance of state.machineInstances) {
    if (isSteamPipeMachine(instance.machineId)) {
      const steamCapacity = steamPipeBufferCapacityMs(instance.machineId)
      const fluidCapacity = fluidPipeBufferCapacityLitres(instance.machineId)
      const steamFlowLitres = currentSteamPipeFlowLitresPerSecond(state, instance)
      const sourceSteamMs = availableConnectedSteam(state, instance)
      const primaryFluidFlow = [...currentFluidOutputFlows(state, instance)].sort((a, b) => b.litresPerSecond - a.litresPerSecond)[0]

      instance.process.steamCapacityMs = steamCapacity
      instance.process.steamStoredMs =
        sourceSteamMs > 0 ? Math.min(steamCapacity, sourceSteamMs, Math.max(steamFlowLitres * steamMsPerLitre * 0.5, steamCapacity * 0.35)) : 0
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
      const flowEu = currentEuCableFlowEuPerSecond(state, instance)
      const availableEu = availableConnectedEu(state, instance)
      instance.process.euCapacity = capacity
      instance.process.euStored = availableEu > 0 ? Math.min(capacity, availableEu, Math.max(flowEu * 0.5, capacity * 0.35)) : 0
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
    const sourceLimit = consumeTickBudget(activeEuTransferBudgets, budgetKey, fullTransferLimit, fullTransferLimit)
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
    const sourceLimit = consumeTickBudget(activeEuTransferBudgets, budgetKey, fullTransferLimit, fullTransferLimit)
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
  if (!output) return { ...produced }
  return { ...output, amount: output.amount + produced.amount }
}

function decrementProcessSlot(slot: ProcessSlot, amount: number): ProcessSlot {
  if (!slot) return null
  const remaining = slot.amount - amount
  return remaining > 0 ? { ...slot, amount: remaining } : null
}

export function availableUnplacedMachineCount(state: GameState, machineId: MachineId) {
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

  const next = cloneState(state)
  next.autoMinerAssignments[uid] = targetId
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

  const next = cloneState(state)
  const nextInstance = next.machineInstances.find((candidate) => candidate.uid === uid)
  if (!nextInstance) return state
  const modes = { ...nextInstance.pipeSideModes }
  const disabledSides = { ...nextInstance.pipeDisabledSides }
  if (mode === 'both') delete modes[direction]
  else modes[direction] = mode
  if (mode === 'blocked') disabledSides[direction] = true
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

  const nextMode: PipeSideMode = pipeSideMode(instance, direction) === 'output' ? 'blocked' : 'output'
  const next = cloneState(state)
  const nextInstance = next.machineInstances.find((candidate) => candidate.uid === uid)
  if (!nextInstance) return state

  nextInstance.pipeSideModes = Object.fromEntries(pipeDirections.map((candidate) => [candidate, candidate === direction ? nextMode : 'blocked'])) as Partial<Record<PipeDirection, PipeSideMode>>
  nextInstance.pipeDisabledSides = Object.fromEntries(
    pipeDirections.filter((candidate) => candidate !== direction || nextMode === 'blocked').map((candidate) => [candidate, true]),
  ) as Partial<Record<PipeDirection, boolean>>
  next.lastSavedAt = Date.now()
  return next
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

export function insertProcessSlot(state: GameState, uid: string, slotId: ProcessSlotId, resourceId: ResourceId, amount = processStackLimit) {
  const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
  if (!instance || !canResourceEnterProcessSlot(instance.machineId, slotId, resourceId)) return state
  if (slotId === 'output' && !isItemHopperMachine(instance.machineId)) return state

  const currentSlot = instance.process[slotId]
  if (currentSlot && currentSlot.id !== resourceId) return state
  const currentAmount = currentSlot?.amount ?? 0
  const capacity = processStackLimit - currentAmount
  const moved = Math.min(Math.max(1, Math.floor(amount)), capacity, availableResourceAmount(state, resourceId))
  if (moved < 1) return state

  const next = subtractResources(state, [{ id: resourceId, amount: moved }])
  const nextInstance = next.machineInstances.find((candidate) => candidate.uid === uid)
  if (!nextInstance) return state
  nextInstance.process[slotId] = { id: resourceId, amount: currentAmount + moved }
  next.lastSavedAt = Date.now()
  return next
}

export function removeProcessSlot(state: GameState, uid: string, slotId: ProcessSlotId) {
  const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
  if (slotId === 'output' && instance && !isItemHopperMachine(instance.machineId)) return collectProcessOutput(state, uid)
  const slot = instance?.process[slotId]
  if (!instance || !slot) return state

  const next = addResources(state, [slot])
  const nextInstance = next.machineInstances.find((candidate) => candidate.uid === uid)
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

export function collectProcessOutput(state: GameState, uid: string) {
  const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
  const output = instance?.process.output
  if (!instance || !output) return state

  const next = addResources(state, [output])
  const nextInstance = next.machineInstances.find((candidate) => candidate.uid === uid)
  if (!nextInstance) return state
  nextInstance.process.output = null
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
  process.fluids.creosote = Math.min(process.fluids.creosote ?? 0, liquidSteamBoilerFluidCapacityLitres)

  const freeFluid = liquidSteamBoilerFluidCapacityLitres - (process.fluids.creosote ?? 0)
  if (freeFluid > 0) {
    process.fluids.creosote = (process.fluids.creosote ?? 0) + pullFluidFromConnectedSources(state, instance, 'creosote', freeFluid, elapsedMs)
  }

  if (!boilerHasWater(state, instance)) {
    process.activeRecipeId = null
    return
  }

  const freeSteamMs = liquidSteamBoilerCapacityMs - process.steamStoredMs
  const storedCreosote = process.fluids.creosote ?? 0
  if (freeSteamMs < 1 || storedCreosote <= 0) {
    process.activeRecipeId = null
    return
  }

  const waterRequested = boilerSteamProductionLitresPerSecond * (elapsedMs / 1000)
  const waterReceived = pullFluidFromConnectedSources(state, instance, 'water', waterRequested, elapsedMs)
  if (waterReceived <= 0) {
    process.activeRecipeId = null
    return
  }

  const maxSteamByRate = liquidSteamBoilerSteamProductionLitresPerSecond * steamMsPerLitre * (elapsedMs / 1000)
  const maxSteamByFuel = (storedCreosote / liquidSteamBoilerCreosoteUseLitresPerSecond) * liquidSteamBoilerSteamProductionLitresPerSecond * steamMsPerLitre
  const maxSteamByWater = (waterReceived / boilerSteamProductionLitresPerSecond) * liquidSteamBoilerSteamProductionLitresPerSecond * steamMsPerLitre
  const producedSteam = Math.min(freeSteamMs, maxSteamByRate, maxSteamByFuel, maxSteamByWater)
  if (producedSteam < 1) {
    process.activeRecipeId = null
    return
  }

  const consumedCreosote = producedSteam / steamMsPerLitre / liquidSteamBoilerSteamProductionLitresPerSecond * liquidSteamBoilerCreosoteUseLitresPerSecond
  process.fluids.creosote = Math.max(0, storedCreosote - consumedCreosote)
  process.steamStoredMs += producedSteam
  process.activeRecipeId = 'burn_creosote_steam'
  process.progressMs = 0
  process.durationMs = 0
}

function tickEuProcessMachine(state: GameState, instance: MachineInstance, elapsedMs: number) {
  const process = instance.process
  process.euCapacity = machineEuCapacity(instance.machineId)
  process.euStored = Math.min(process.euStored, process.euCapacity)
  const initialMatch = findMatchedProcessRecipe(instance.machineId, process.input, process.secondaryInput, extraProcessInputSlots(process))
  if (!initialMatch) fillInternalEuFromConnectedStorage(state, instance, elapsedMs)
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
    const requiredEuAmps = recipe.requiredEuAmps ?? 1
    fillInternalEuFromConnectedStorage(state, instance, remainingMs, requiredEuAmps)

    if (recipe.fluidInput) {
      const otherFluidStored = storedFluidTypes(process).some((fluidId) => fluidId !== recipe.fluidInput?.id)
      if (otherFluidStored) {
        process.activeRecipeId = null
        break
      }
      const storedFluid = process.fluids[recipe.fluidInput.id] ?? 0
      const fluidNeeded = Math.max(0, recipe.fluidInput.amount - storedFluid)
      if (fluidNeeded > 0) {
        process.fluids[recipe.fluidInput.id] = storedFluid + pullFluidFromConnectedSources(state, instance, recipe.fluidInput.id, fluidNeeded, remainingMs)
      }
      if ((process.fluids[recipe.fluidInput.id] ?? 0) < recipe.fluidInput.amount) {
        process.activeRecipeId = null
        break
      }
    }

    if (process.euStored <= 0) {
      process.activeRecipeId = null
      break
    }

    if (isEuBlastMachine(instance.machineId) && process.progressMs === 0) {
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
    process.output = addToProcessOutput(process.output, recipe.output)
    if (recipe.fluidInput) process.fluids[recipe.fluidInput.id] = Math.max(0, (process.fluids[recipe.fluidInput.id] ?? 0) - recipe.fluidInput.amount)
    process.progressMs = 0
    process.activeRecipeId = null
    process.durationMs = 0
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

function addGatherDropsInPlace(state: GameState, targetId: GatherTargetId, cycles: number) {
  if (cycles < 1) return
  const produced: ResourceAmount[] = []
  for (const drop of gatherTargets[targetId].drops) {
    const amount = drop.amount * cycles
    state.resources[drop.id] += amount
    produced.push({ id: drop.id, amount })
  }
  recordResourceMilestones(state, produced)
}

function applyAutoMinerDamage(state: GameState, targetId: GatherTargetId, damage: number) {
  if (damage <= 0) return
  const target = gatherTargets[targetId]
  const progress = (state.gatherProgress[targetId] ?? 0) + damage
  const cycles = Math.floor(progress / target.maxHp)
  state.gatherProgress[targetId] = progress % target.maxHp
  addGatherDropsInPlace(state, targetId, cycles)
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
  if (!targetId || !canAutoMinerTarget(instance.machineId, targetId)) {
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
      instance.process.steamStoredMs -= steamCostMs
      applyAutoMinerDamage(state, targetId, damage)
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
      instance.process.euStored -= lvAutoMinerEuUse
      applyAutoMinerDamage(state, targetId, damage)
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

function hopperTargetSlot(machineId: MachineId, process: MachineProcessState, resourceId: ResourceId): Exclude<ProcessSlotId, 'output'> | null {
  const slotIds: Array<Exclude<ProcessSlotId, 'output'>> = ['input', 'secondaryInput', 'fuel']
  return slotIds.find((slotId) => canResourceEnterProcessSlot(machineId, slotId, resourceId) && processSlotAcceptsItem(process[slotId], resourceId)) ?? null
}

function hopperFeedCandidate(target: MachineInstance, hopperProcess: MachineProcessState) {
  for (const hopperSlotId of hopperStorageSlotIds) {
    const stored = hopperProcess[hopperSlotId]
    if (!stored) continue
    const targetSlotId = hopperTargetSlot(target.machineId, target.process, stored.id)
    if (targetSlotId) return { hopperSlotId, targetSlotId, stored }
  }
  return null
}

function hopperOutputDirection(instance: MachineInstance): PipeDirection | null {
  return pipeDirections.find((direction) => pipeSideMode(instance, direction) === 'output') ?? null
}

function hopperFeedTarget(state: GameState, target: MachineInstance) {
  const multiblock = multiblockCenterForInstance(state, target)
  if (!multiblock) return target
  return machineAt(state, multiblock.x, multiblock.y) ?? target
}

function tickItemHopper(state: GameState, instance: MachineInstance, elapsedMs: number) {
  const direction = hopperOutputDirection(instance)
  if (!hopperStorageSlotIds.some((slotId) => instance.process[slotId]) || !direction) {
    instance.process.activeRecipeId = null
    instance.process.progressMs = 0
    instance.process.durationMs = 0
    return
  }

  const offset = pipeDirectionOffsets[direction]
  const adjacentTarget = machineAt(state, instance.x + offset.dx, instance.y + offset.dy)
  const target = adjacentTarget ? hopperFeedTarget(state, adjacentTarget) : null
  if (!target || isItemAutomationMachine(target.machineId)) {
    instance.process.activeRecipeId = null
    instance.process.progressMs = 0
    instance.process.durationMs = 0
    return
  }

  if (!hopperFeedCandidate(target, instance.process)) {
    instance.process.activeRecipeId = null
    instance.process.progressMs = 0
    instance.process.durationMs = 1000
    return
  }

  instance.process.durationMs = 1000
  instance.process.progressMs += elapsedMs
  let moved = 0

  while (instance.process.progressMs >= instance.process.durationMs) {
    const candidate = hopperFeedCandidate(target, instance.process)
    if (!candidate) break

    const targetSlot = target.process[candidate.targetSlotId]
    target.process[candidate.targetSlotId] = targetSlot ? { id: candidate.stored.id, amount: targetSlot.amount + 1 } : { id: candidate.stored.id, amount: 1 }
    instance.process[candidate.hopperSlotId] = decrementProcessSlot(instance.process[candidate.hopperSlotId], 1)
    instance.process.progressMs -= instance.process.durationMs
    moved += 1
  }

  if (!hopperStorageSlotIds.some((slotId) => instance.process[slotId])) instance.process.progressMs = 0
  if (moved < 1 && !hopperFeedCandidate(target, instance.process)) instance.process.progressMs = 0
  instance.process.activeRecipeId = moved > 0 || (instance.process.progressMs > 0 && Boolean(hopperFeedCandidate(target, instance.process))) ? 'hopper_feed' : null
}

export function tickMachineInstances(state: GameState, elapsedMs: number, now = Date.now()) {
  const next = cloneState(state)
  activeSteamTransferBudgets = new Map()
  activeEuTransferBudgets = new Map()
  activeFluidTransferBudgets = new Map()
  for (const instance of next.machineInstances) {
    if (isItemHopperMachine(instance.machineId)) tickItemHopper(next, instance, elapsedMs)
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
      enforceSingleFluidStore(instance.process)
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
  const euConsumersByDistance = [...next.machineInstances].sort((a, b) => nearestConnectedEuSourceDistance(next, a) - nearestConnectedEuSourceDistance(next, b) || a.uid.localeCompare(b.uid))
  for (const instance of euConsumersByDistance) {
    if (isEuStorageMachine(instance.machineId)) tickEuStorage(next, instance, elapsedMs)
  }
  for (const instance of euConsumersByDistance) {
    if (isEuPoweredMachine(instance.machineId) && !isAutoMinerMachine(instance.machineId)) tickEuProcessMachine(next, instance, elapsedMs)
  }
  for (const instance of euConsumersByDistance) {
    if (isAutoMinerMachine(instance.machineId)) tickAutoMiner(next, instance, elapsedMs)
  }
  activeSteamTransferBudgets = null
  activeEuTransferBudgets = null
  activeFluidTransferBudgets = null
  tickPipeDisplayBuffers(next)
  next.lastSavedAt = now
  return next
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
  ]
}

function questObjectiveCurrent(state: GameState, objective: QuestObjective) {
  if (objective.type === 'resource') return objective.progressMode === 'current' ? state.resources[objective.id] : Math.max(state.resources[objective.id], state.resourceMilestones[objective.id] ?? 0)
  if (objective.type === 'machine') {
    if (objective.progressMode === 'current') return state.machines[objective.id]
    return Math.max(state.machineMilestones[objective.id] ?? 0, state.machines[objective.id])
  }
  if (objective.type === 'placedMachine') {
    return state.machineInstances.filter((instance) => instance.machineId === objective.id).length
  }
  return state.factoryFoundationLevel
}

export function questObjectiveLabel(objective: QuestObjective) {
  if (objective.label) return objective.label
  if (objective.type === 'resource') return resourceLabels[objective.id]
  if (objective.type === 'factoryFoundation') return `Factory foundation level ${objective.level}`
  return machines[objective.id].name
}

export function questObjectiveProgress(state: GameState, objective: QuestObjective): QuestObjectiveProgress {
  const required = objective.type === 'factoryFoundation' ? objective.level : objective.amount
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
      'craftMortar',
      'gatherClay',
      'treeTapQuest',
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
  migrationNotices: string[],
  parsedInstances?: Partial<MachineInstance>[],
) {
  const instances = normalizeMachineInstances(parsedInstances, foundationLevel)
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
  const migratedInstances = legacyCokeOvenSave ? instances.filter((instance) => instance.machineId !== 'cokeOven') : instances
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
  if (parsedInstances) {
    const placedBlastFurnaces = migratedInstances.filter((instance) => instance.machineId === 'brickedBlastFurnace').length
    const unplacedLegacyBlastFurnaces = Math.max(0, machinesState.brickedBlastFurnace - placedBlastFurnaces)
    if (unplacedLegacyBlastFurnaces > 0) {
      machinesState.brickedBlastFurnace -= unplacedLegacyBlastFurnaces
      machinesState.brickedBlastFurnacePart += unplacedLegacyBlastFurnaces * 4
    }
    const placedArcBlastFurnaces = migratedInstances.filter((instance) => instance.machineId === 'arcBlastFurnace').length
    const unplacedLegacyArcBlastFurnaces = Math.max(0, machinesState.arcBlastFurnace - placedArcBlastFurnaces)
    if (unplacedLegacyArcBlastFurnaces > 0) {
      machinesState.arcBlastFurnace -= unplacedLegacyArcBlastFurnaces
      machinesState.arcBlastFurnacePart += unplacedLegacyArcBlastFurnaces * 4
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
    const machinesState = migrateMachines(parsed.machines as Partial<Record<string, number>> | undefined)
    const factoryFoundationLevel = normalizeFactoryFoundationLevel(parsed)
    const migratedResources = migrateResources({ ...fresh.resources, ...parsed.resources })
    const machineInstances = migrateMachineInstances(
      machinesState,
      migratedResources,
      factoryFoundationLevel,
      legacyCokeOvenSave,
      legacyBatteryBufferSave,
      migrationNotices,
      parsed.machineInstances,
    )
    const craftedResources = normalizeCraftedResources(parsed)
    const discoveredResources = normalizeDiscoveredResources(parsed, migratedResources)
    const resourceMilestones = { ...(parsed.resourceMilestones ?? {}) }
    for (const resourceId of Object.keys(migratedResources) as ResourceId[]) {
      const legacyEvidence = craftedResources.includes(resourceId) || discoveredResources.includes(resourceId) ? 1 : 0
      resourceMilestones[resourceId] = Math.max(resourceMilestones[resourceId] ?? 0, migratedResources[resourceId], legacyEvidence)
    }
    const machineMilestones = { ...(parsed.machineMilestones ?? {}) }
    for (const machineId of Object.keys(machinesState) as MachineId[]) {
      const placed = machineInstances.filter((instance) => instance.machineId === machineId).length
      machineMilestones[machineId] = Math.max(machineMilestones[machineId] ?? 0, machinesState[machineId], placed)
    }

    return {
      ...fresh,
      resources: migratedResources,
      machines: machinesState,
      machineInstances,
      bucketFluid: normalizeBucketFluid(parsed.bucketFluid),
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
      equipment: normalizeEquipment(parsed.equipment),
      durability: normalizeDurability(parsed.durability),
      gatherProgress: parsed.gatherProgress ?? {},
      autoMinerAssignments: normalizeAutoMinerAssignments(parsed, machineInstances),
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
