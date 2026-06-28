import { createInitialState, gatherTargets, machines, quests, recipes, tools } from './content'
import type {
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

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    resources: { ...state.resources },
    machines: { ...state.machines },
    completedQuests: [...state.completedQuests],
    unlockedQuests: [...state.unlockedQuests],
    activeCrafts: state.activeCrafts.map((craft) => ({ ...craft })),
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

export function getBestToolForTarget(state: GameState, targetId: GatherTargetId) {
  if (targetId === 'tree' && state.resources.woodenAxe > 0) return tools.woodenAxe
  return tools.bareHand
}

export function hitGatherTarget(state: GameState, targetId: GatherTargetId) {
  const target = gatherTargets[targetId]
  const tool = getBestToolForTarget(state, targetId)
  const damage = tool.damageByTarget[targetId] ?? 1
  const next = cloneState(state)
  const progress = (next.gatherProgress[targetId] ?? 0) + damage

  if (progress < target.hardness) {
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

function canCraftByRequirements(state: GameState, recipe: Recipe) {
  if (recipe.requiredMachine && state.machines[recipe.requiredMachine] < 1) return false
  if (!hasMachines(state, recipe.machineInputs)) return false
  return hasResources(state, recipe.inputs)
}

export function canCraft(state: GameState, recipe: Recipe) {
  return canCraftByRequirements(state, recipe)
}

export function startCraft(state: GameState, recipeId: string, now = Date.now()) {
  const recipe = recipes.find((candidate) => candidate.id === recipeId)
  if (!recipe || !canCraft(state, recipe)) return state

  const next = subtractResources(state, recipe.inputs)
  next.activeCrafts.push({
    recipeId,
    startedAt: now,
    remainingMs: recipe.durationMs,
    durationMs: recipe.durationMs,
  })
  next.lastSavedAt = now
  return next
}

function completeCraft(state: GameState, recipe: Recipe) {
  let next = addResources(state, recipe.outputs)
  if (recipe.machineOutputs) {
    next = cloneState(next)
    for (const machine of recipe.machineOutputs) {
      next.machines[machine.id] += machine.amount
    }
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
  const completedCrafts: string[] = []
  const machineOutputs: ResourceAmount[] = []

  const remainingCrafts = []
  for (const craft of next.activeCrafts) {
    const remainingMs = craft.remainingMs - elapsedMs
    if (remainingMs > 0) {
      remainingCrafts.push({ ...craft, remainingMs })
      continue
    }

    const recipe = recipes.find((candidate) => candidate.id === craft.recipeId)
    if (recipe) {
      next = completeCraft(next, recipe)
      completedCrafts.push(recipe.name)
    }
  }
  next.activeCrafts = remainingCrafts

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
    completedCrafts,
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

export function loadGame(raw: string | null, now = Date.now()): GameState {
  if (!raw) return createInitialState(now)

  try {
    const parsed = JSON.parse(raw) as Partial<GameState>
    const fresh = createInitialState(now)
    const unlockedQuests = parsed.unlockedQuests?.length ? [...parsed.unlockedQuests] : [...fresh.unlockedQuests]
    if (!unlockedQuests.includes('punchTree') && !parsed.completedQuests?.includes('punchTree')) {
      unlockedQuests.unshift('punchTree')
    }

    return {
      ...fresh,
      ...parsed,
      resources: { ...fresh.resources, ...parsed.resources },
      machines: { ...fresh.machines, ...parsed.machines },
      completedQuests: parsed.completedQuests ?? [],
      unlockedQuests: unlockedQuests as QuestId[],
      activeCrafts: parsed.activeCrafts ?? [],
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
