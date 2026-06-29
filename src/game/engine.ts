import {
  createInitialState,
  fuelDefinitions,
  gatherTargets,
  initialEquipment,
  machines,
  processRecipes,
  quests,
  recipes,
  resourceLabels,
  tools,
} from './content'
import type {
  CraftSlot,
  EquipmentSlotId,
  EquipmentState,
  GatherTargetId,
  GameState,
  MachineAmount,
  MachineId,
  MachineInstance,
  MachineProcessState,
  ProcessSlot,
  ProcessSlotId,
  Quest,
  QuestId,
  Recipe,
  ResourceAmount,
  ResourceId,
  TickResult,
} from './types'

export const saveKey = 'block-tech-idle-save'
export const factoryGrid = { width: 8, height: 6 }
export const processStackLimit = 64

const durabilityMaximums: Partial<Record<ResourceId, number>> = {
  woodenAxe: 32,
  woodenPickaxe: 32,
  stoneAxe: 64,
  stonePickaxe: 64,
  ironAxe: 128,
  ironPickaxe: 128,
  stoneHammer: 48,
  ironHammer: 160,
  mortar: 64,
}

const durableCostAlternatives: Partial<Record<ResourceId, ResourceId[]>> = {
  stoneHammer: ['stoneHammer', 'ironHammer'],
}

function emptyProcessState(): MachineProcessState {
  return {
    input: null,
    fuel: null,
    output: null,
    activeRecipeId: null,
    progressMs: 0,
    durationMs: 0,
    fuelRemainingMs: 0,
  }
}

function cloneProcessSlot(slot: ProcessSlot): ProcessSlot {
  return slot ? { ...slot } : null
}

function cloneProcessState(process: MachineProcessState): MachineProcessState {
  return {
    input: cloneProcessSlot(process.input),
    fuel: cloneProcessSlot(process.fuel),
    output: cloneProcessSlot(process.output),
    activeRecipeId: process.activeRecipeId,
    progressMs: process.progressMs,
    durationMs: process.durationMs,
    fuelRemainingMs: process.fuelRemainingMs,
  }
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
    fuel: normalizeProcessSlot(process.fuel),
    output: normalizeProcessSlot(process.output),
    activeRecipeId: process.activeRecipeId ?? null,
    progressMs: Math.max(0, Math.floor(process.progressMs ?? 0)),
    durationMs: Math.max(0, Math.floor(process.durationMs ?? 0)),
    fuelRemainingMs: Math.max(0, Math.floor(process.fuelRemainingMs ?? 0)),
  }
}

const equipmentSlotItems: Record<EquipmentSlotId, ResourceId[]> = {
  helmet: [],
  chestplate: [],
  leggings: [],
  boots: [],
  axe: ['woodenAxe', 'stoneAxe', 'ironAxe'],
  shovel: [],
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

function normalizeMachineInstances(instances?: Partial<MachineInstance>[]) {
  if (!instances) return []
  return instances
    .filter((instance): instance is Partial<MachineInstance> => Boolean(instance?.uid && instance.machineId && instance.machineId in machines))
    .filter((instance) => isInsideFactoryGrid(instance.x ?? -1, instance.y ?? -1))
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
    unlockedQuests: [...state.unlockedQuests],
    craftedResources: [...state.craftedResources],
    equipment: { ...state.equipment },
    durability: { ...state.durability },
    gatherProgress: { ...state.gatherProgress },
    machineProgress: { ...state.machineProgress },
  }
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
  if (targetId === 'stone') {
    if (state.equipment.pickaxe === 'ironPickaxe') return tools.ironPickaxe
    if (state.equipment.pickaxe === 'stonePickaxe') return tools.stonePickaxe
    if (state.equipment.pickaxe === 'woodenPickaxe') return tools.woodenPickaxe
  }
  if (targetId === 'ironVein' || targetId === 'gravelPatch') {
    if (state.equipment.pickaxe === 'ironPickaxe') return tools.ironPickaxe
    if (state.equipment.pickaxe === 'stonePickaxe') return tools.stonePickaxe
  }
  if ((targetId === 'copperVein' || targetId === 'tinVein' || targetId === 'coalSeam') && state.equipment.pickaxe === 'ironPickaxe') {
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
    const resourceMatches = [...recipe.inputs, ...recipe.outputs].some((amount) => {
      const label = resourceLabels[amount.id].toLowerCase()
      return amount.id.toLowerCase().includes(normalized) || label.includes(normalized)
    })
    const catalystMatches = [...(recipe.catalysts ?? []), ...(recipe.durabilityCosts ?? [])].some((amount) => {
      const label = resourceLabels[amount.id].toLowerCase()
      return amount.id.toLowerCase().includes(normalized) || label.includes(normalized)
    })
    const machineMatches = [...(recipe.machineInputs ?? []), ...(recipe.machineOutputs ?? [])].some((amount) => {
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
      catalystMatches ||
      machineMatches ||
      fuelMatches
    )
  })
}

export function recipesForOutput(resourceId: ResourceId, candidates = recipes) {
  return candidates.filter((recipe) => recipe.outputs.some((amount) => amount.id === resourceId))
}

export function recipesUsingInput(resourceId: ResourceId, candidates = recipes) {
  return candidates.filter(
    (recipe) =>
      recipe.inputs.some((amount) => amount.id === resourceId) ||
      recipe.catalysts?.some((amount) => amount.id === resourceId) ||
      recipe.durabilityCosts?.some((amount) => amount.id === resourceId),
  )
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

function isInsideFactoryGrid(x: number, y: number) {
  return x >= 0 && x < factoryGrid.width && y >= 0 && y < factoryGrid.height
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

function findProcessRecipeForInput(machineId: MachineId, input: ProcessSlot) {
  if (!input) return undefined
  return processRecipes.find((recipe) => recipe.machineId === machineId && recipe.input.id === input.id && input.amount >= recipe.input.amount)
}

function canOutputAccept(output: ProcessSlot, produced: ResourceAmount) {
  if (!output) return true
  return output.id === produced.id && output.amount + produced.amount <= processStackLimit
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
  if (!isInsideFactoryGrid(x, y)) return state
  if (availableUnplacedMachineCount(state, machineId) < 1) return state
  if (state.machineInstances.some((instance) => instance.x === x && instance.y === y)) return state

  const next = cloneState(state)
  next.machineInstances.push({
    uid: nextMachineUid(next, machineId),
    machineId,
    x,
    y,
    level: 1,
    process: emptyProcessState(),
  })
  next.lastSavedAt = Date.now()
  return next
}

function canResourceEnterProcessSlot(machineId: MachineId, slotId: ProcessSlotId, resourceId: ResourceId) {
  if (slotId === 'input') return processRecipes.some((recipe) => recipe.machineId === machineId && recipe.input.id === resourceId)
  if (slotId === 'fuel') return resourceId in fuelDefinitions
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
  if (slotId === 'input') {
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
  process.fuel = decrementProcessSlot(process.fuel, 1)
  return true
}

export function tickMachineInstances(state: GameState, elapsedMs: number) {
  const next = cloneState(state)
  for (const instance of next.machineInstances) {
    const process = instance.process
    let remainingMs = elapsedMs

    while (remainingMs > 0) {
      const recipe = findProcessRecipeForInput(instance.machineId, process.input)
      if (!recipe) {
        process.activeRecipeId = null
        process.progressMs = 0
        process.durationMs = 0
        break
      }
      if (!canOutputAccept(process.output, recipe.output)) break
      if (!consumeProcessFuel(process)) break

      process.activeRecipeId = recipe.id
      process.durationMs = recipe.durationMs
      const workMs = Math.min(remainingMs, process.fuelRemainingMs, recipe.durationMs - process.progressMs)
      process.progressMs += workMs
      process.fuelRemainingMs -= workMs
      remainingMs -= workMs

      if (process.progressMs < recipe.durationMs) continue

      process.input = decrementProcessSlot(process.input, recipe.input.amount)
      process.output = addToProcessOutput(process.output, recipe.output)
      process.progressMs = 0
      process.activeRecipeId = null
      process.durationMs = 0
    }
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
  next.lastSavedAt = Date.now()
  return {
    state: next,
    machineOutputs: combineResourceAmounts(machineOutputs),
  }
}

export function questProgress(state: GameState, quest: Quest) {
  const resourceRequirements = quest.requirements.resources ?? []
  const machineRequirements = quest.requirements.machines ?? []
  const resourceMet = resourceRequirements.filter((amount) => state.resources[amount.id] >= amount.amount).length
  const machineMet = machineRequirements.filter((amount) => state.machines[amount.id] >= amount.amount).length
  const total = resourceRequirements.length + machineRequirements.length
  if (total === 0) return 1
  return (resourceMet + machineMet) / total
}

export function canCompleteQuest(state: GameState, quest: Quest) {
  if (!state.unlockedQuests.includes(quest.id)) return false
  if (state.completedQuests.includes(quest.id)) return false
  return hasResources(state, quest.requirements.resources) && hasMachines(state, quest.requirements.machines)
}

export function completeQuest(state: GameState, questId: string) {
  const quest = quests.find((candidate) => candidate.id === questId)
  if (!quest || !canCompleteQuest(state, quest)) return state

  let next = addResources(state, quest.rewards.resources ?? [])
  next = cloneState(next)
  next.completedQuests.push(quest.id)
  for (const unlock of quest.rewards.unlocks ?? []) {
    if (!next.unlockedQuests.includes(unlock)) next.unlockedQuests.push(unlock)
  }
  for (const machine of quest.rewards.machines ?? []) {
    next.machines[machine.id] += machine.amount
  }
  next.lastSavedAt = Date.now()
  return next
}

export function visibleQuests(state: GameState) {
  return quests.filter((quest) => state.unlockedQuests.includes(quest.id))
}

export function nextQuest(state: GameState) {
  return visibleQuests(state).find((quest) => !state.completedQuests.includes(quest.id)) ?? quests.at(-1)
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

function migrateMachineInstances(machinesState: Record<MachineId, number>, parsedInstances?: Partial<MachineInstance>[]) {
  const instances = normalizeMachineInstances(parsedInstances)
  if (parsedInstances) return instances

  const migrated = [...instances]
  const furnaceCount = machinesState.furnace ?? 0
  for (let index = migrated.length; index < furnaceCount; index += 1) {
    migrated.push({
      uid: `furnace-${index + 1}`,
      machineId: 'furnace',
      x: index % factoryGrid.width,
      y: Math.floor(index / factoryGrid.width),
      level: 1,
      process: emptyProcessState(),
    })
  }
  return migrated.filter((instance) => isInsideFactoryGrid(instance.x, instance.y))
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

    return {
      ...fresh,
      ...savedState,
      resources: migrateResources({ ...fresh.resources, ...parsed.resources }),
      machines: machinesState,
      machineInstances: migrateMachineInstances(machinesState, parsed.machineInstances),
      completedQuests: parsed.completedQuests ?? [],
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
