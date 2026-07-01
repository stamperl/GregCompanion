import {
  createInitialState,
  fuelDefinitions,
  gatherTargets,
  initialEquipment,
  initialMachines,
  initialResources,
  isSteamNetworkMachine,
  isSteamPipeMachine,
  isSteamPoweredMachine,
  isSteamStorageMachine,
  machineFluidCapacityLitres,
  machinePipeTransferLitresPerSecond,
  machineSteamCapacityLitres,
  machines,
  processRecipes,
  quests,
  recipes,
  resourceLabels,
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
  Quest,
  QuestObjective,
  QuestId,
  Recipe,
  ResourceAmount,
  ResourceId,
  TickResult,
} from './types'

export const saveKey = 'block-tech-idle-save'
export const factoryGrid = { width: 8, height: 6 }
export const maxFactoryFoundationLevel = 5
export const factoryFoundationSizes = [
  { width: 0, height: 0 },
  { width: 5, height: 5 },
  { width: 8, height: 6 },
  { width: 10, height: 8 },
  { width: 12, height: 10 },
  { width: 14, height: 12 },
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
}
export const processStackLimit = 64
export const steamMsPerLitre = 1000
export const boilerSteamCapacityMs = machineSteamCapacityLitres('steamBoiler') * steamMsPerLitre
export const steamMaceratorCapacityMs = machineSteamCapacityLitres('steamMacerator') * steamMsPerLitre
export const steamTankCapacityMs = machineSteamCapacityLitres('steamTank') * steamMsPerLitre
export const cokeOvenFluidCapacityLitres = machineFluidCapacityLitres('cokeOven')
export const ironTankFluidCapacityLitres = machineFluidCapacityLitres('steamTank')
export const steamMachineInternalCapacityMs = machineSteamCapacityLitres('steamMacerator') * steamMsPerLitre
export const steamPipeTransferLitresPerSecond = Object.fromEntries(
  (Object.keys(machines) as MachineId[])
    .map((machineId) => [machineId, machinePipeTransferLitresPerSecond(machineId)] as const)
    .filter(([, transferRate]) => transferRate > 0),
) as Partial<Record<MachineId, number>>

const durabilityMaximums: Partial<Record<ResourceId, number>> = {
  woodenAxe: 32,
  treeTap: 64,
  woodenPickaxe: 48,
  woodenShovel: 32,
  stoneAxe: 64,
  stonePickaxe: 64,
  ironAxe: 128,
  ironPickaxe: 128,
  ironShovel: 128,
  stoneShovel: 64,
  stoneHammer: 48,
  ironHammer: 160,
  ironFile: 96,
  bronzeFile: 160,
  ironWireCutters: 128,
  ironWrench: 128,
  bronzeWrench: 192,
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

function emptyProcessState(): MachineProcessState {
  return {
    input: null,
    secondaryInput: null,
    fuel: null,
    output: null,
    activeRecipeId: null,
    progressMs: 0,
    durationMs: 0,
    fuelRemainingMs: 0,
    fuelDurationMs: 0,
    steamStoredMs: 0,
    steamCapacityMs: 0,
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
    fuel: cloneProcessSlot(process.fuel),
    output: cloneProcessSlot(process.output),
    activeRecipeId: process.activeRecipeId,
    progressMs: process.progressMs,
    durationMs: process.durationMs,
    fuelRemainingMs: process.fuelRemainingMs,
    fuelDurationMs: process.fuelDurationMs,
    steamStoredMs: process.steamStoredMs,
    steamCapacityMs: process.steamCapacityMs,
    fluids: { ...process.fluids },
    fluidCapacityLitres: process.fluidCapacityLitres,
  }
}

function normalizeFluidStore(fluids?: Partial<Record<FluidId, number>>) {
  return {
    water: Math.max(0, Math.floor(fluids?.water ?? 0)),
    creosote: Math.max(0, Math.floor(fluids?.creosote ?? 0)),
  } satisfies Partial<Record<FluidId, number>>
}

function normalizeProcessSlot(slot: unknown): ProcessSlot {
  if (!slot || typeof slot !== 'object') return null
  const candidate = slot as Partial<NonNullable<ProcessSlot>>
  if (!candidate.id || !(candidate.id in resourceLabels)) return null
  const amount = Math.max(1, Math.min(processStackLimit, Math.floor(candidate.amount ?? 0)))
  return amount > 0 ? { id: candidate.id, amount } : null
}

function normalizeProcessState(process?: Partial<MachineProcessState>): MachineProcessState {
  if (!process) return emptyProcessState()
  return {
    input: normalizeProcessSlot(process.input),
    secondaryInput: normalizeProcessSlot(process.secondaryInput),
    fuel: normalizeProcessSlot(process.fuel),
    output: normalizeProcessSlot(process.output),
    activeRecipeId: process.activeRecipeId ?? null,
    progressMs: Math.max(0, Math.floor(process.progressMs ?? 0)),
    durationMs: Math.max(0, Math.floor(process.durationMs ?? 0)),
    fuelRemainingMs: Math.max(0, Math.floor(process.fuelRemainingMs ?? 0)),
    fuelDurationMs: Math.max(0, Math.floor(process.fuelDurationMs ?? 0)),
    steamStoredMs: Math.max(0, Math.floor(process.steamStoredMs ?? 0)),
    steamCapacityMs: Math.max(0, Math.floor(process.steamCapacityMs ?? 0)),
    fluids: normalizeFluidStore(process.fluids),
    fluidCapacityLitres: Math.max(0, Math.floor(process.fluidCapacityLitres ?? 0)),
  }
}

const equipmentSlotItems: Record<EquipmentSlotId, ResourceId[]> = {
  helmet: [],
  chestplate: [],
  leggings: [],
  boots: [],
  axe: ['woodenAxe', 'stoneAxe', 'ironAxe', 'treeTap'],
  shovel: ['woodenShovel', 'stoneShovel', 'ironShovel'],
  pickaxe: ['woodenPickaxe', 'stonePickaxe', 'ironPickaxe'],
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
  return instances
    .filter((instance): instance is Partial<MachineInstance> => Boolean(instance?.uid && instance.machineId && instance.machineId in machines))
    .filter((instance) => isInsideGridSize(grid, instance.x ?? -1, instance.y ?? -1))
    .map((instance) => ({
      uid: String(instance.uid),
      machineId: instance.machineId as MachineId,
      x: Math.floor(instance.x ?? 0),
      y: Math.floor(instance.y ?? 0),
      level: Math.max(1, Math.floor(instance.level ?? 1)),
      process: normalizeProcessState(instance.process),
    }))
}

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    resources: { ...state.resources },
    machines: { ...state.machines },
    machineInstances: state.machineInstances.map((instance) => ({
      ...instance,
      process: cloneProcessState(instance.process),
    })),
    completedQuests: [...state.completedQuests],
    claimedQuests: [...state.claimedQuests],
    unlockedQuests: [...state.unlockedQuests],
    craftedResources: [...state.craftedResources],
    equipment: { ...state.equipment },
    durability: { ...state.durability },
    gatherProgress: { ...state.gatherProgress },
    machineProgress: { ...state.machineProgress },
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
    if (state.equipment.pickaxe === 'ironPickaxe') return tools.ironPickaxe
    if (state.equipment.pickaxe === 'stonePickaxe') return tools.stonePickaxe
    if (state.equipment.pickaxe === 'woodenPickaxe') return tools.woodenPickaxe
  }
  if (targetId === 'ironVein') {
    if (state.equipment.pickaxe === 'ironPickaxe') return tools.ironPickaxe
    if (state.equipment.pickaxe === 'stonePickaxe') return tools.stonePickaxe
  }
  if (targetId === 'clayPatch' || targetId === 'sandPatch' || targetId === 'gravelPatch') {
    if (state.equipment.shovel === 'ironShovel') return tools.ironShovel
    if (state.equipment.shovel === 'stoneShovel') return tools.stoneShovel
    if (state.equipment.shovel === 'woodenShovel') return tools.woodenShovel
  }
  if ((targetId === 'copperVein' || targetId === 'tinVein' || targetId === 'redstoneVein' || targetId === 'coalSeam') && state.equipment.pickaxe === 'ironPickaxe') {
    return tools.ironPickaxe
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

  next.gatherProgress[targetId] = 0
  const withDrops = addResources(next, target.drops)
  return { state: withDrops, completed: true, drops: target.drops, tool, toolBroke }
}

export function isRecipeVisible(state: GameState, recipe: Recipe) {
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
      (builtMachines, id) => ({ ...builtMachines, [id]: id === 'brickedBlastFurnace' ? (base.machines[id] ?? 0) : Math.max(32, base.machines[id] ?? 0) }),
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
    next.lastSavedAt = Date.now()
  }

  if (recipe.machineOutputs?.length) {
    next = cloneState(next)
    for (const machine of scaleMachineAmounts(recipe.machineOutputs, requestedQuantity)) {
      next.machines[machine.id] += machine.amount
    }
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

function matchProcessRecipeInputs(recipe: ProcessRecipe, input: ProcessSlot, secondaryInput: ProcessSlot): MatchedProcessRecipe | undefined {
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

function findMatchedProcessRecipe(machineId: MachineId, input: ProcessSlot, secondaryInput: ProcessSlot = null) {
  return processRecipes
    .filter((recipe) => recipe.machineId === machineId)
    .map((recipe) => matchProcessRecipeInputs(recipe, input, secondaryInput))
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

function brickedBlastFurnacePositions(state: GameState, centerX: number, centerY: number) {
  const positions = [
    { x: centerX, y: centerY },
    { x: centerX + 1, y: centerY },
    { x: centerX, y: centerY + 1 },
    { x: centerX + 1, y: centerY + 1 },
  ]
  return positions.every((position) => isInsideFactoryGrid(state, position.x, position.y)) ? positions : []
}

function brickedBlastFurnaceCenterForInstance(state: GameState, instance: MachineInstance) {
  for (let centerY = instance.y - 1; centerY <= instance.y; centerY += 1) {
    for (let centerX = instance.x - 1; centerX <= instance.x; centerX += 1) {
      const positions = brickedBlastFurnacePositions(state, centerX, centerY)
      if (positions.length < 4) continue
      const center = machineAt(state, centerX, centerY)
      if (center?.machineId !== 'brickedBlastFurnace') continue
      const complete = positions.every((position) => {
        const candidate = machineAt(state, position.x, position.y)
        if (!candidate) return false
        if (position.x === centerX && position.y === centerY) return candidate.machineId === 'brickedBlastFurnace'
        return candidate.machineId === 'brickedBlastFurnacePart'
      })
      if (complete) return { x: centerX, y: centerY }
    }
  }
  return null
}

function tryFormBrickedBlastFurnaceMultiblock(state: GameState, placed: MachineInstance) {
  if (placed.machineId !== 'brickedBlastFurnacePart') return false
  for (let centerY = placed.y - 1; centerY <= placed.y; centerY += 1) {
    for (let centerX = placed.x - 1; centerX <= placed.x; centerX += 1) {
      const positions = brickedBlastFurnacePositions(state, centerX, centerY)
      if (positions.length < 4) continue
      if (!positions.every((position) => machineAt(state, position.x, position.y)?.machineId === 'brickedBlastFurnacePart')) continue
      const center = machineAt(state, centerX, centerY)
      if (!center) continue
      center.uid = nextMachineUid(state, 'brickedBlastFurnace')
      center.machineId = 'brickedBlastFurnace'
      center.process = emptyProcessState()
      state.machines.brickedBlastFurnacePart = Math.max(0, state.machines.brickedBlastFurnacePart - 1)
      state.machines.brickedBlastFurnace += 1
      return true
    }
  }
  return false
}

export function boilerHasWater(state: GameState, boiler: MachineInstance) {
  if (boiler.machineId !== 'steamBoiler') return false
  return adjacentPositions(state, boiler.x, boiler.y).some((position) => machineAt(state, position.x, position.y)?.machineId === 'well')
}

function machineFluidCapacity(machineId: MachineId) {
  return machineFluidCapacityLitres(machineId)
}

function storedFluidTypes(process: MachineProcessState) {
  return (Object.keys(process.fluids) as FluidId[]).filter((id) => (process.fluids[id] ?? 0) > 0)
}

function canStoreFluid(instance: MachineInstance, fluidId: FluidId) {
  const capacity = machineFluidCapacity(instance.machineId)
  if (capacity < 1) return false
  if (instance.process.steamStoredMs > 0) return false
  const storedTypes = storedFluidTypes(instance.process)
  return storedTypes.length < 1 || storedTypes.every((id) => id === fluidId)
}

function connectedFluidNetwork(state: GameState, start: MachineInstance) {
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
      if (next && (isSteamPipeMachine(next.machineId) || machineFluidCapacity(next.machineId) > 0 || next.machineId === 'well') && !visited.has(next.uid)) {
        queue.push(next)
      }
    }
  }

  return network
}

function connectedSteamNetwork(state: GameState, start: MachineInstance) {
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
      if (next && isSteamNetworkMachine(next.machineId) && !visited.has(next.uid)) queue.push(next)
    }
  }
  return network
}

function canSteamTankReceiveFromNetwork(state: GameState, tank: MachineInstance) {
  return adjacentPositions(state, tank.x, tank.y).some((position) => {
    const adjacent = machineAt(state, position.x, position.y)
    return adjacent?.machineId === 'steamBoiler' || Boolean(adjacent && isSteamPipeMachine(adjacent.machineId))
  })
}

function connectedSteamStorage(state: GameState, start: MachineInstance) {
  return connectedSteamNetwork(state, start).filter((instance) => instance.uid !== start.uid && isSteamStorageMachine(instance.machineId))
}

function connectedSteamTransferRateMs(state: GameState, start: MachineInstance) {
  const pipeRates = connectedSteamNetwork(state, start)
    .map((instance) => steamPipeTransferLitresPerSecond[instance.machineId])
    .filter((rate): rate is number => typeof rate === 'number')
  const litresPerSecond = pipeRates.length > 0 ? Math.min(...pipeRates) : 16
  return litresPerSecond * steamMsPerLitre
}

export function availableConnectedSteam(state: GameState, instance: MachineInstance) {
  return connectedSteamStorage(state, instance).reduce((sum, storage) => sum + storage.process.steamStoredMs, 0)
}

function connectedFluidStorage(state: GameState, start: MachineInstance, fluidId: FluidId) {
  return connectedFluidNetwork(state, start).filter((instance) => instance.uid !== start.uid && canStoreFluid(instance, fluidId))
}

function connectedFluidTransferRateLitres(state: GameState, start: MachineInstance) {
  const pipeRates = connectedFluidNetwork(state, start)
    .map((instance) => steamPipeTransferLitresPerSecond[instance.machineId])
    .filter((rate): rate is number => typeof rate === 'number')
  return pipeRates.length > 0 ? Math.min(...pipeRates) : 16
}

function pushFluidToConnectedStorage(state: GameState, source: MachineInstance, fluidId: FluidId, elapsedMs: number) {
  const stored = source.process.fluids[fluidId] ?? 0
  if (stored < 1) return 0

  let remaining = Math.min(stored, Math.max(0, Math.floor((connectedFluidTransferRateLitres(state, source) * elapsedMs) / 1000)))
  let moved = 0
  for (const storage of connectedFluidStorage(state, source, fluidId).sort((a, b) => a.uid.localeCompare(b.uid))) {
    if (remaining < 1) break
    storage.process.fluidCapacityLitres = machineFluidCapacity(storage.machineId)
    const free = storage.process.fluidCapacityLitres - (storage.process.fluids[fluidId] ?? 0)
    const transfer = Math.min(remaining, free)
    if (transfer < 1) continue
    storage.process.fluids[fluidId] = (storage.process.fluids[fluidId] ?? 0) + transfer
    remaining -= transfer
    moved += transfer
  }
  source.process.fluids[fluidId] = stored - moved
  return moved
}

function consumeConnectedSteam(state: GameState, instance: MachineInstance, amount: number) {
  let remaining = amount
  for (const storage of connectedSteamStorage(state, instance).sort((a, b) => a.uid.localeCompare(b.uid))) {
    if (remaining < 1) break
    const spend = Math.min(remaining, storage.process.steamStoredMs)
    storage.process.steamStoredMs -= spend
    remaining -= spend
  }
  return amount - remaining
}

function fillInternalSteamFromConnectedStorage(state: GameState, instance: MachineInstance, elapsedMs: number) {
  const capacity = isSteamPoweredMachine(instance.machineId) ? steamMachineInternalCapacityMs : 0
  if (capacity < 1) return 0
  instance.process.steamCapacityMs = capacity
  instance.process.steamStoredMs = Math.min(instance.process.steamStoredMs, capacity)
  const needed = capacity - instance.process.steamStoredMs
  if (needed < 1) return 0
  const transferLimit = Math.max(0, Math.floor((connectedSteamTransferRateMs(state, instance) * elapsedMs) / 1000))
  const moved = consumeConnectedSteam(state, instance, Math.min(needed, transferLimit))
  instance.process.steamStoredMs += moved
  return moved
}

function fillSteamTankFromConnectedStorage(state: GameState, instance: MachineInstance, elapsedMs: number) {
  if (instance.machineId !== 'steamTank') return 0
  instance.process.steamCapacityMs = steamTankCapacityMs
  instance.process.steamStoredMs = Math.min(instance.process.steamStoredMs, steamTankCapacityMs)
  if (!canSteamTankReceiveFromNetwork(state, instance)) return 0
  const needed = steamTankCapacityMs - instance.process.steamStoredMs
  if (needed < 1) return 0
  const transferLimit = Math.max(0, Math.floor((connectedSteamTransferRateMs(state, instance) * elapsedMs) / 1000))
  const moved = consumeConnectedSteam(state, instance, Math.min(needed, transferLimit))
  instance.process.steamStoredMs += moved
  return moved
}

function recipeSteamCostMs(recipe: ProcessRecipe) {
  return (recipe.steamCostLitres ?? Math.ceil(recipe.durationMs / steamMsPerLitre)) * steamMsPerLitre
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
  next.machineInstances.push(placed)
  tryFormBrickedBlastFurnaceMultiblock(next, placed)
  next.lastSavedAt = Date.now()
  return next
}

export function removeMachineInstance(state: GameState, uid: string) {
  const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
  if (!instance) return state

  const multiblockCenter =
    instance.machineId === 'brickedBlastFurnace' || instance.machineId === 'brickedBlastFurnacePart'
      ? brickedBlastFurnaceCenterForInstance(state, instance)
      : null
  if (multiblockCenter) {
    let next = cloneState(state)
    const positions = brickedBlastFurnacePositions(state, multiblockCenter.x, multiblockCenter.y)
    const positionKeys = new Set(positions.map((position) => `${position.x},${position.y}`))
    const controller = machineAt(next, multiblockCenter.x, multiblockCenter.y)
    const returned = [controller?.process.input, controller?.process.secondaryInput, controller?.process.fuel, controller?.process.output].filter(
      (slot): slot is NonNullable<ProcessSlot> => Boolean(slot),
    )
    next.machineInstances = next.machineInstances.filter((candidate) => !positionKeys.has(`${candidate.x},${candidate.y}`))
    next.machines.brickedBlastFurnace = Math.max(0, next.machines.brickedBlastFurnace - 1)
    next.machines.brickedBlastFurnacePart += 1
    next.lastSavedAt = Date.now()
    if (returned.length > 0) next = addResources(next, returned)
    return next
  }

  let next = cloneState(state)
  const returned = [instance.process.input, instance.process.secondaryInput, instance.process.fuel, instance.process.output].filter(
    (slot): slot is NonNullable<ProcessSlot> => Boolean(slot),
  )
  next.machineInstances = next.machineInstances.filter((candidate) => candidate.uid !== uid)
  next.lastSavedAt = Date.now()
  if (returned.length > 0) next = addResources(next, returned)
  return next
}

export function canWrenchRemoveMachine(state: GameState) {
  return hasDurableUses(state, [{ id: 'ironWrench', amount: 1 }])
}

export function wrenchRemoveMachineInstance(state: GameState, uid: string) {
  if (!canWrenchRemoveMachine(state)) return state
  return removeMachineInstance(applyDurabilityCosts(state, [{ id: 'ironWrench', amount: 1 }]), uid)
}

function canResourceEnterProcessSlot(machineId: MachineId, slotId: ProcessSlotId, resourceId: ResourceId) {
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
  if (slotId === 'output') return state
  const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
  if (!instance || !canResourceEnterProcessSlot(instance.machineId, slotId, resourceId)) return state

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
  if (slotId === 'output') return collectProcessOutput(state, uid)
  const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
  const slot = instance?.process[slotId]
  if (!instance || !slot) return state

  const next = addResources(state, [slot])
  const nextInstance = next.machineInstances.find((candidate) => candidate.uid === uid)
  if (!nextInstance) return state
  nextInstance.process[slotId] = null
  if (slotId === 'input' || slotId === 'secondaryInput') {
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

function tickSteamBoiler(state: GameState, instance: MachineInstance, elapsedMs: number) {
  const process = instance.process
  process.steamCapacityMs = boilerSteamCapacityMs
  process.steamStoredMs = Math.min(process.steamStoredMs, boilerSteamCapacityMs)

  if (!boilerHasWater(state, instance)) {
    process.activeRecipeId = null
    if (process.fuelRemainingMs > 0) burnProcessFuel(process, elapsedMs)
    return
  }

  if (process.steamStoredMs >= boilerSteamCapacityMs) {
    process.activeRecipeId = null
    if (process.fuelRemainingMs > 0) burnProcessFuel(process, elapsedMs)
    return
  }

  if (!consumeProcessFuel(process)) {
    process.activeRecipeId = null
    return
  }

  const produced = Math.min(elapsedMs, process.fuelRemainingMs, boilerSteamCapacityMs - process.steamStoredMs)
  if (produced < 1) return
  process.activeRecipeId = 'make_steam'
  process.progressMs = 0
  process.durationMs = 0
  burnProcessFuel(process, produced)
  process.steamStoredMs += produced
}

function tickSteamProcessMachine(state: GameState, instance: MachineInstance, elapsedMs: number) {
  const process = instance.process
  process.steamCapacityMs = steamMachineInternalCapacityMs
  process.steamStoredMs = Math.min(process.steamStoredMs, steamMachineInternalCapacityMs)
  fillInternalSteamFromConnectedStorage(state, instance, elapsedMs)
  let remainingMs = elapsedMs

  while (remainingMs > 0) {
    const match = findMatchedProcessRecipe(instance.machineId, process.input, process.secondaryInput)
    const recipe = match?.recipe
    if (!recipe || !canOutputAccept(process.output, recipe.output)) {
      process.activeRecipeId = null
      if (!recipe) {
        process.progressMs = 0
        process.durationMs = 0
      }
      break
    }

    fillInternalSteamFromConnectedStorage(state, instance, remainingMs)
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
    process.output = addToProcessOutput(process.output, recipe.output)
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

export function tickMachineInstances(state: GameState, elapsedMs: number) {
  const next = cloneState(state)
  for (const instance of next.machineInstances) {
    if (instance.machineId === 'furnace') tickFurnaceProcess(instance, elapsedMs)
    if (instance.machineId === 'steamBoiler') tickSteamBoiler(next, instance, elapsedMs)
    if (instance.machineId === 'steamTank') {
      instance.process.steamCapacityMs = steamTankCapacityMs
      instance.process.steamStoredMs = Math.min(instance.process.steamStoredMs, steamTankCapacityMs)
      instance.process.fluidCapacityLitres = ironTankFluidCapacityLitres
    }
    if (instance.machineId === 'cokeOven') tickCokeOven(next, instance, elapsedMs)
    if (instance.machineId === 'brickedBlastFurnace') tickBrickedBlastFurnace(instance, elapsedMs)
  }
  for (const instance of next.machineInstances) {
    if (instance.machineId === 'steamTank') fillSteamTankFromConnectedStorage(next, instance, elapsedMs)
  }
  for (const instance of next.machineInstances) {
    if (isSteamPoweredMachine(instance.machineId)) tickSteamProcessMachine(next, instance, elapsedMs)
  }
  next.lastSavedAt = Date.now()
  return next
}

export function tickGame(state: GameState, elapsedMs: number): TickResult {
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
      const consumption = machine.consumes.map((amount) => ({ ...amount, amount: amount.amount * cycles }))
      if (!hasResources(next, consumption)) continue
      next = subtractResources(next, consumption)
    }

    const produced = machine.produces.map((amount) => ({
      ...amount,
      amount: amount.amount * cycles * count,
    }))
    next = addResources(next, produced)
    machineOutputs.push(...produced)
  }

  next = tickMachineInstances(next, elapsedMs)
  const questSync = autoCompleteQuests(next)
  next = questSync.state
  next.lastSavedAt = Date.now()
  return {
    state: next,
    machineOutputs: combineResourceAmounts(machineOutputs),
    questCompletions: questSync.completedQuestIds,
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
  return [
    ...(quest.requirements.resources ?? []).map((amount): QuestObjective => ({ type: 'resource', id: amount.id, amount: amount.amount })),
    ...(quest.requirements.machines ?? []).map((amount): QuestObjective => ({ type: 'machine', id: amount.id, amount: amount.amount })),
  ]
}

function questObjectiveCurrent(state: GameState, objective: QuestObjective) {
  if (objective.type === 'resource') return state.resources[objective.id]
  if (objective.type === 'machine') return state.machines[objective.id]
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
  const next = cloneState(state)
  next.claimedQuests.push(questId)
  next.lastSavedAt = Date.now()
  return next
}

export function visibleQuests(_state: GameState) {
  return quests
}

export function nextQuest(state: GameState) {
  return quests.find((quest) => questStatus(state, quest) !== 'completed') ?? quests.at(-1)
}

function migrateResources(resources: Record<ResourceId, number>) {
  if (resources.stone > 0) {
    resources.cobblestone += resources.stone
    resources.stone = 0
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

  for (const id of ['woodenPickaxe', 'stonePickaxe', 'ironPickaxe'] as ResourceId[]) {
    if ((parsed.resources?.[id] ?? 0) > 0 || Object.values(parsed.equipment ?? {}).includes(id)) {
      crafted.add(id)
    }
  }

  return [...crafted]
}

function legacySaveHasFactoryMachines(parsed: Partial<GameState>) {
  if ((parsed.machineInstances?.length ?? 0) > 0) return true
  return Object.values(parsed.machines ?? {}).some((amount) => typeof amount === 'number' && amount > 0)
}

function normalizeFactoryFoundationLevel(parsed: Partial<GameState>) {
  if (typeof parsed.factoryFoundationLevel === 'number') return clampFactoryFoundationLevel(parsed.factoryFoundationLevel)
  return legacySaveHasFactoryMachines(parsed) ? 2 : 0
}

function migrateMachineInstances(machinesState: Record<MachineId, number>, foundationLevel: number, parsedInstances?: Partial<MachineInstance>[]) {
  const instances = normalizeMachineInstances(parsedInstances, foundationLevel)
  if (parsedInstances) {
    const placedBlastFurnaces = instances.filter((instance) => instance.machineId === 'brickedBlastFurnace').length
    const unplacedLegacyBlastFurnaces = Math.max(0, machinesState.brickedBlastFurnace - placedBlastFurnaces)
    if (unplacedLegacyBlastFurnaces > 0) {
      machinesState.brickedBlastFurnace -= unplacedLegacyBlastFurnaces
      machinesState.brickedBlastFurnacePart += unplacedLegacyBlastFurnaces * 4
    }
    return instances
  }

  const migrated = [...instances]
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
      process: emptyProcessState(),
    })
  }
  return migrated.filter((instance) => isInsideGridSize(grid, instance.x, instance.y))
}

export function loadGame(raw: string | null, now = Date.now()): GameState {
  if (!raw) return createInitialState(now)

  try {
    const parsed = JSON.parse(raw) as Partial<GameState> & { activeCrafts?: unknown }
    const { activeCrafts: _ignoredActiveCrafts, ...savedState } = parsed
    const fresh = createInitialState(now)
    const unlockedQuests = parsed.unlockedQuests?.length ? [...parsed.unlockedQuests] : [...fresh.unlockedQuests]
    if (!unlockedQuests.includes('punchTree') && !parsed.completedQuests?.includes('punchTree')) {
      unlockedQuests.unshift('punchTree')
    }

    const machinesState = migrateMachines(parsed.machines as Partial<Record<string, number>> | undefined)
    const factoryFoundationLevel = normalizeFactoryFoundationLevel(parsed)

    return {
      ...fresh,
      ...savedState,
      resources: migrateResources({ ...fresh.resources, ...parsed.resources }),
      machines: machinesState,
      machineInstances: migrateMachineInstances(machinesState, factoryFoundationLevel, parsed.machineInstances),
      factoryFoundationLevel,
      completedQuests: parsed.completedQuests ?? [],
      claimedQuests: parsed.claimedQuests ?? [],
      unlockedQuests: unlockedQuests as QuestId[],
      craftedResources: normalizeCraftedResources(parsed),
      equipment: normalizeEquipment(parsed.equipment),
      durability: normalizeDurability(parsed.durability),
      gatherProgress: parsed.gatherProgress ?? {},
      machineProgress: parsed.machineProgress ?? {},
      lastSavedAt: now,
      version: 1,
    }
  } catch {
    return createInitialState(now)
  }
}

export function saveGame(state: GameState) {
  return JSON.stringify({ ...state, lastSavedAt: Date.now() })
}
