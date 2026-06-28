import { createInitialState, gatherTargets, initialEquipment, machines, quests, recipes, resourceLabels, tools } from './content'
import type {
  CraftSlot,
  EquipmentSlotId,
  EquipmentState,
  GatherTargetId,
  GameState,
  MachineAmount,
  MachineId,
  Quest,
  QuestId,
  Recipe,
  ResourceAmount,
  ResourceId,
  TickResult,
} from './types'

export const saveKey = 'block-tech-idle-save'

const equipmentSlotItems: Record<EquipmentSlotId, ResourceId[]> = {
  helmet: [],
  chestplate: [],
  leggings: [],
  boots: [],
  axe: ['woodenAxe'],
  shovel: [],
  pickaxe: ['woodenPickaxe'],
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

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    resources: { ...state.resources },
    machines: { ...state.machines },
    completedQuests: [...state.completedQuests],
    unlockedQuests: [...state.unlockedQuests],
    equipment: { ...state.equipment },
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
  if (targetId === 'tree' && state.equipment.axe === 'woodenAxe') return tools.woodenAxe
  if (targetId === 'stone' && state.equipment.pickaxe === 'woodenPickaxe') return tools.woodenPickaxe
  return tools.bareHand
}

export function hitGatherTarget(state: GameState, targetId: GatherTargetId) {
  const target = gatherTargets[targetId]
  const tool = getBestToolForTarget(state, targetId)
  const damage = tool.damageByTarget[targetId] ?? 0
  const next = cloneState(state)
  if (damage < 1) {
    next.lastSavedAt = Date.now()
    return { state: next, completed: false, drops: [] as ResourceAmount[], tool }
  }

  const progress = (next.gatherProgress[targetId] ?? 0) + damage

  if (progress < target.maxHp) {
    next.gatherProgress[targetId] = progress
    next.lastSavedAt = Date.now()
    return { state: next, completed: false, drops: [] as ResourceAmount[], tool }
  }

  next.gatherProgress[targetId] = 0
  const withDrops = addResources(next, target.drops)
  return { state: withDrops, completed: true, drops: target.drops, tool }
}

export function isRecipeVisible(state: GameState, recipe: Recipe) {
  if (canCraftByRequirements(state, recipe)) return true
  if (recipe.id === 'craft_planks') return state.resources.log > 0 || state.resources.plank > 0
  if (recipe.id === 'craft_sticks') return state.resources.plank > 0 || state.resources.stick > 0
  if (recipe.id === 'craft_wooden_axe') return state.resources.plank > 0 && (state.resources.stick > 0 || state.resources.woodenAxe > 0)
  return [...recipe.inputs, ...recipe.outputs].some((amount) => state.resources[amount.id] > 0)
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
  return recipe.inputs.reduce((sum, amount) => sum + amount.amount, 0)
}

export function recipeFitsTerminalGrid(recipe: Recipe) {
  if (recipe.machineInputs?.length) return false
  if (recipe.recipeType && recipe.recipeType !== 'crafting') return false
  if (recipe.stationType && recipe.stationType !== 'hand' && recipe.stationType !== 'craftingTable') return false
  return recipeInputTotal(recipe) <= 9
}

function patternMatchesGrid(pattern: (ResourceId | null)[], grid: CraftSlot[]) {
  return Array.from({ length: 9 }).every((_, index) => {
    const expected = pattern[index] ?? null
    const slot = grid[index]
    if (!expected) return !slot || slot.ghost
    return slot?.id === expected && !slot.ghost
  })
}

export function findGridRecipe(grid: CraftSlot[], availableRecipes: Recipe[]) {
  const filledSlots = grid.filter((slot) => slot && !slot.ghost)
  if (filledSlots.length === 0) return undefined

  return availableRecipes.filter(recipeFitsTerminalGrid).find((recipe) => {
    if (recipe.pattern) return patternMatchesGrid(recipe.pattern, grid)
    return resourceAmountKey(recipe.inputs) === resourceAmountKey(gridAmounts(grid))
  })
}

export function missingForRecipe(state: GameState, recipe: Recipe) {
  const missingResources = recipe.inputs
    .map((amount) => ({ ...amount, amount: Math.max(0, amount.amount - availableResourceAmount(state, amount.id)) }))
    .filter((amount) => amount.amount > 0)
  const missingMachines = [
    ...(recipe.requiredMachine && state.machines[recipe.requiredMachine] < 1 ? [{ id: recipe.requiredMachine, amount: 1 }] : []),
    ...(recipe.machineInputs ?? []).filter((amount) => state.machines[amount.id] < amount.amount),
  ]
  return { missingResources, missingMachines }
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
      const ghost = remaining ? remaining[id] < 1 : false
      slots[index] = { id, ghost }
      if (remaining && !ghost) remaining[id] -= 1
    })
    return slots
  }

  let slotIndex = 0
  for (const input of recipe.inputs) {
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

  const inputs = combineResourceAmounts(recipe.inputs)
  if (inputs.length === 0) return 0

  return inputs.reduce((maxQuantity, amount) => {
    const available = batchAvailableResourceAmount(state, amount.id, grid)
    return Math.max(0, Math.min(maxQuantity, Math.floor(available / amount.amount)))
  }, Number.POSITIVE_INFINITY)
}

export function missingForQuantity(state: GameState, recipe: Recipe, quantity: number, grid?: CraftSlot[]) {
  const requestedQuantity = Math.max(1, Math.floor(quantity))
  return scaleResourceAmounts(recipe.inputs, requestedQuantity)
    .map((amount) => ({
      ...amount,
      amount: Math.max(0, amount.amount - batchAvailableResourceAmount(state, amount.id, grid)),
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
    const machineMatches = [...(recipe.machineInputs ?? []), ...(recipe.machineOutputs ?? [])].some((amount) => {
      const machine = machines[amount.id]
      return amount.id.toLowerCase().includes(normalized) || machine.name.toLowerCase().includes(normalized)
    })

    return (
      recipe.name.toLowerCase().includes(normalized) ||
      recipe.description.toLowerCase().includes(normalized) ||
      resourceMatches ||
      machineMatches
    )
  })
}

export function recipesForOutput(resourceId: ResourceId, candidates = recipes) {
  return candidates.filter((recipe) => recipe.outputs.some((amount) => amount.id === resourceId))
}

export function recipesUsingInput(resourceId: ResourceId, candidates = recipes) {
  return candidates.filter((recipe) => recipe.inputs.some((amount) => amount.id === resourceId))
}

function canCraftByRequirements(state: GameState, recipe: Recipe) {
  if (recipe.requiredMachine && state.machines[recipe.requiredMachine] < 1) return false
  if (!hasMachines(state, recipe.machineInputs)) return false
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

export function tickGame(state: GameState, elapsedMs: number): TickResult {
  let next = cloneState(state)
  const machineOutputs: ResourceAmount[] = []

  for (const machineId of Object.keys(next.machines) as MachineId[]) {
    const count = next.machines[machineId]
    const machine = machines[machineId]
    if (count < 1 || !machine.intervalMs || !machine.produces) continue
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

    return {
      ...fresh,
      ...savedState,
      resources: migrateResources({ ...fresh.resources, ...parsed.resources }),
      machines: { ...fresh.machines, ...parsed.machines },
      completedQuests: parsed.completedQuests ?? [],
      unlockedQuests: unlockedQuests as QuestId[],
      equipment: normalizeEquipment(parsed.equipment),
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
