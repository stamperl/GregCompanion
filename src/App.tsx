import {
  Axe,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Check,
  Database,
  Factory,
  Pickaxe,
  RotateCcw,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import './App.css'
import { fuelDefinitions, gatherTargets, machines, processRecipes, recipes, resourceLabels, tools } from './game/content'
import {
  availableResourceAmount,
  availableUnplacedMachineCount,
  canCompleteQuest,
  canCraft,
  collectProcessOutput,
  completeQuest,
  craftableQuantity,
  craftRecipeInstant,
  equipResource,
  equipmentSlotAccepts,
  findGridRecipe,
  factoryGrid,
  getBestToolForTarget,
  hitGatherTarget,
  insertProcessSlot,
  loadGame,
  makeGridForRecipe,
  maxDurability,
  missingForQuantity,
  missingForRecipe,
  placeMachineInstance,
  processStackLimit,
  questProgress,
  recipeFitsTerminalGrid,
  recipesUsingInput,
  removeProcessSlot,
  saveGame,
  saveKey,
  searchTerminalRecipes,
  terminalAvailableAmount,
  tickGame,
  unequipSlot,
  visibleQuests,
  visibleRecipes,
  durabilityRemaining,
} from './game/engine'
import {
  groupRecipesByOutput,
  recipeGroupKeyForOutput,
  recipeGroupOutput,
  type RecipeGroup,
} from './game/recipeGroups'
import type {
  CraftSlot,
  EquipmentSlotId,
  GatherTargetId,
  GameState,
  MachineId,
  MachineInstance,
  ProcessSlot,
  ProcessSlotId,
  Quest,
  Recipe,
  ResourceAmount,
  ResourceId,
} from './game/types'

type FloatText = {
  id: number
  label: string
  variant?: 'break'
  targetId?: GatherTargetId
}

type Page = 'gather' | 'terminal' | 'processing' | 'guide'
type TerminalMode = 'recipes' | 'uses'
type DragPreview = { id: ResourceId; x: number; y: number }
type PendingProcessInsert = {
  uid: string
  slotId: Exclude<ProcessSlotId, 'output'>
  resourceId: ResourceId
  quantity: number
}

type RecipeDisplayOutput =
  | { kind: 'resource'; id: ResourceId; amount: number; label: string }
  | { kind: 'machine'; id: MachineId; amount: number; label: string }

const machineOrder: MachineId[] = ['furnace']

const resourceOrder = Object.keys(resourceLabels) as ResourceId[]

const gatherTargetOrder: GatherTargetId[] = ['tree', 'stone', 'ironVein', 'gravelPatch', 'copperVein', 'tinVein', 'coalSeam']
const gatherTargetIcons: Record<GatherTargetId, ResourceId> = {
  tree: 'log',
  stone: 'cobblestone',
  ironVein: 'ironOre',
  gravelPatch: 'gravel',
  copperVein: 'copperOre',
  tinVein: 'tinOre',
  coalSeam: 'coal',
}

const armourEquipmentSlots: EquipmentSlotId[] = ['helmet', 'chestplate', 'leggings', 'boots']
const toolEquipmentSlots: EquipmentSlotId[] = ['axe', 'shovel', 'pickaxe', 'weapon']
const equipmentLabels: Record<EquipmentSlotId, string> = {
  helmet: 'Helmet',
  chestplate: 'Chest',
  leggings: 'Legs',
  boots: 'Boots',
  axe: 'Axe',
  shovel: 'Shovel',
  pickaxe: 'Pickaxe',
  weapon: 'Attack',
}

function isResourceId(value: string): value is ResourceId {
  return value in resourceLabels
}

function formatAmount(amount: number) {
  if (amount >= 1000) return amount.toLocaleString()
  return Number.isInteger(amount) ? `${amount}` : amount.toFixed(1)
}

function DurabilityBar({ state, id }: { state: GameState; id: ResourceId }) {
  const max = maxDurability(id)
  if (max < 1 || state.resources[id] < 1) return null
  const remaining = durabilityRemaining(state, id)
  return (
    <span className="durability-bar" title={`${formatAmount(remaining)}/${formatAmount(max)} uses`}>
      <span style={{ width: `${Math.max(0, Math.min(100, (remaining / max) * 100))}%` }} />
    </span>
  )
}

function PixelIcon({ id }: { id: ResourceId }) {
  return (
    <span className={`pixel-icon pixel-${id}`} aria-hidden="true">
      <span />
    </span>
  )
}

function MachineGlyph({ id }: { id: MachineId }) {
  return (
    <span className={`machine-glyph machine-${id}`} aria-hidden="true">
      <span />
    </span>
  )
}

function ItemSlot({
  amount,
  className = '',
  disabled = false,
  onClick,
  state,
}: {
  amount: ResourceAmount
  className?: string
  disabled?: boolean
  onClick?: (id: ResourceId) => void
  state?: GameState
}) {
  const content = (
    <>
      <PixelIcon id={amount.id} />
      <span className="item-count">{formatAmount(amount.amount)}</span>
      {state && <DurabilityBar state={state} id={amount.id} />}
    </>
  )
  if (onClick) {
    return (
      <button
        type="button"
        className={disabled ? `mini-slot recipe-jump-slot muted ${className}` : `mini-slot recipe-jump-slot ${className}`}
        aria-label={`Recipes for ${resourceLabels[amount.id]}`}
        title={`Recipes for ${resourceLabels[amount.id]}`}
        onClick={() => onClick(amount.id)}
      >
        {content}
      </button>
    )
  }

  return (
    <span className={disabled ? `mini-slot muted ${className}` : `mini-slot ${className}`} title={resourceLabels[amount.id]}>
      {content}
    </span>
  )
}

function RecipePatternPreview({
  recipe,
  state,
  onSelectResource,
}: {
  recipe: Recipe
  state: GameState
  onSelectResource: (id: ResourceId) => void
}) {
  const grid = makeGridForRecipe(recipe, state)

  return (
    <div className="recipe-pattern-grid" aria-label={`${recipe.name} pattern`}>
      {grid.map((slot, index) => {
        const className = slot ? (slot.ghost ? 'recipe-pattern-slot ghost' : 'recipe-pattern-slot filled') : 'recipe-pattern-slot'
        if (!slot) return <span className={className} key={index} />
        return (
          <button
            type="button"
            className={`${className} recipe-jump-slot`}
            aria-label={`Recipes for ${resourceLabels[slot.id]}`}
            title={`Recipes for ${resourceLabels[slot.id]}`}
            onClick={() => onSelectResource(slot.id)}
            key={index}
          >
            <PixelIcon id={slot.id} />
          </button>
        )
      })}
    </div>
  )
}

function MachineSlot({ id, amount = 1, muted = false }: { id: MachineId; amount?: number; muted?: boolean }) {
  return (
    <span className={muted ? 'mini-slot machine-slot muted' : 'mini-slot machine-slot'} title={machines[id].name}>
      <MachineGlyph id={id} />
      <span className="item-count">{formatAmount(amount)}</span>
    </span>
  )
}

function ProcessItemSlot({
  slot,
  label,
  onClick,
}: {
  slot: ProcessSlot
  label: string
  onClick: () => void
}) {
  return (
    <button type="button" className={slot ? 'process-slot filled' : 'process-slot'} aria-label={slot ? `${label} ${resourceLabels[slot.id]}` : label} onClick={onClick}>
      {slot ? (
        <>
          <PixelIcon id={slot.id} />
          <span className="item-count">{formatAmount(slot.amount)}</span>
        </>
      ) : (
        <span className="process-slot-label">{label}</span>
      )}
    </button>
  )
}

function ResourcePill({ amount }: { amount: ResourceAmount }) {
  return (
    <span className="resource-pill">
      <ItemSlot amount={amount} />
      <span>{resourceLabels[amount.id]}</span>
    </span>
  )
}

function recipeOutputLabel(recipe: Recipe) {
  if (recipe.outputs.length > 0) {
    return recipe.outputs.map((amount) => `${amount.amount} ${resourceLabels[amount.id]}`).join(', ')
  }
  return recipe.machineOutputs?.map((amount) => `${amount.amount} ${machines[amount.id].name}`).join(', ') ?? 'No output'
}

function recipePrimaryOutput(recipe: Recipe): RecipeDisplayOutput {
  const resourceOutput = recipe.outputs[0]
  if (resourceOutput) {
    return {
      kind: 'resource',
      id: resourceOutput.id,
      amount: resourceOutput.amount,
      label: resourceLabels[resourceOutput.id],
    }
  }

  const machineOutput = recipe.machineOutputs?.[0]
  if (machineOutput) {
    return {
      kind: 'machine',
      id: machineOutput.id,
      amount: machineOutput.amount,
      label: machines[machineOutput.id].name,
    }
  }

  return { kind: 'machine', id: 'furnace', amount: 0, label: 'No output' }
}

function recipeGroupDisplayOutput(group: RecipeGroup): RecipeDisplayOutput {
  const recipeOutput = recipeGroupOutput(group.recipes[0])
  const output = recipeOutput ?? group.output
  if (output.kind === 'resource') {
    return {
      kind: 'resource',
      id: output.id,
      amount: output.amount,
      label: resourceLabels[output.id],
    }
  }

  return {
    kind: 'machine',
    id: output.id,
    amount: output.amount,
    label: machines[output.id].name,
  }
}

function singleRecipeGroups(recipesToGroup: Recipe[]): RecipeGroup[] {
  return recipesToGroup.map((recipe) => {
    const output = recipeGroupOutput(recipe) ?? { kind: 'machine' as const, id: 'furnace' as const, amount: 0 }
    return { key: `recipe:${recipe.id}`, output, recipes: [recipe] }
  })
}

function missingLine(state: GameState, recipe: Recipe) {
  const missing = missingForRecipe(state, recipe)
  return [
    ...missing.missingResources.map((amount) => `${amount.amount} ${resourceLabels[amount.id]}`),
    ...missing.missingCatalysts.map((amount) => `${amount.amount} ${resourceLabels[amount.id]}`),
    ...(missing.missingDurability ?? []).map((amount) => `${amount.amount} ${resourceLabels[amount.id]} uses`),
    ...missing.missingMachines.map((amount) => machines[amount.id].name),
  ].join(', ')
}

function canResourceEnterProcessSlot(machineId: MachineId, slotId: Exclude<ProcessSlotId, 'output'>, resourceId: ResourceId) {
  if (slotId === 'input') return processRecipes.some((recipe) => recipe.machineId === machineId && recipe.input.id === resourceId)
  return resourceId in fuelDefinitions
}

function hasToolTierUnlocked(state: GameState, resourceId: ResourceId) {
  return state.craftedResources.includes(resourceId) || state.resources[resourceId] > 0 || Object.values(state.equipment).includes(resourceId)
}

function isGatherTargetVisible(state: GameState, targetId: GatherTargetId) {
  if (targetId === 'tree') return true
  if (targetId === 'stone') {
    return hasToolTierUnlocked(state, 'woodenPickaxe') || hasToolTierUnlocked(state, 'stonePickaxe') || hasToolTierUnlocked(state, 'ironPickaxe')
  }
  if (targetId === 'ironVein' || targetId === 'gravelPatch') {
    return hasToolTierUnlocked(state, 'stonePickaxe') || hasToolTierUnlocked(state, 'ironPickaxe')
  }
  return hasToolTierUnlocked(state, 'ironPickaxe')
}

function QuestCard({
  quest,
  state,
  onComplete,
}: {
  quest: Quest
  state: GameState
  onComplete: (questId: string) => void
}) {
  const completed = state.completedQuests.includes(quest.id)

  return (
    <article className={completed ? 'guide-card completed' : 'guide-card'}>
      <div className="section-title">
        <div>
          <p className="eyebrow">{quest.chapter}</p>
          <h3>{quest.title}</h3>
        </div>
        {completed && <Check size={20} />}
      </div>
      <p>{quest.description}</p>
      <div className="progress-track quest-progress">
        <span style={{ width: `${questProgress(state, quest) * 100}%` }} />
      </div>
      <div className="requirement-list">
        {(quest.requirements.resources ?? []).map((amount) => (
          <ResourcePill amount={amount} key={amount.id} />
        ))}
        {(quest.requirements.machines ?? []).map((amount) => (
          <span className="resource-pill" key={amount.id}>
            <MachineSlot id={amount.id} amount={amount.amount} muted={state.machines[amount.id] < amount.amount} />
            <span>{machines[amount.id].name}</span>
          </span>
        ))}
      </div>
      {(quest.rewards.resources?.length || quest.rewards.machines?.length) && (
        <div className="reward-list" aria-label={`${quest.title} rewards`}>
          <span>Reward</span>
          {(quest.rewards.resources ?? []).map((amount) => (
            <ResourcePill amount={amount} key={amount.id} />
          ))}
          {(quest.rewards.machines ?? []).map((amount) => (
            <span className="resource-pill" key={amount.id}>
              <MachineSlot id={amount.id} amount={amount.amount} />
              <span>{machines[amount.id].name}</span>
            </span>
          ))}
        </div>
      )}
      <button type="button" disabled={completed || !canCompleteQuest(state, quest)} onClick={() => onComplete(quest.id)}>
        {completed ? 'Claimed' : 'Claim reward'}
      </button>
    </article>
  )
}

function App() {
  const [state, setState] = useState<GameState>(() => loadGame(localStorage.getItem(saveKey)))
  const [floatTexts, setFloatTexts] = useState<FloatText[]>([])
  const [page, setPage] = useState<Page>('gather')
  const [terminalGrid, setTerminalGrid] = useState<CraftSlot[]>(() => Array.from({ length: 9 }, () => null))
  const [terminalSearch, setTerminalSearch] = useState('')
  const [recipeSearch, setRecipeSearch] = useState('')
  const [terminalMode, setTerminalMode] = useState<TerminalMode>('recipes')
  const [selectedResource, setSelectedResource] = useState<ResourceId | null>(null)
  const [terminalNotice, setTerminalNotice] = useState('')
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false)
  const [isEquipmentOpen, setIsEquipmentOpen] = useState(false)
  const [isPlacingFurnace, setIsPlacingFurnace] = useState(false)
  const [selectedMachineUid, setSelectedMachineUid] = useState<string | null>(null)
  const [selectedRecipeGroupKey, setSelectedRecipeGroupKey] = useState<string | null>(null)
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState(0)
  const [batchQuantity, setBatchQuantity] = useState(1)
  const [pendingProcessInsert, setPendingProcessInsert] = useState<PendingProcessInsert | null>(null)
  const [missingBatch, setMissingBatch] = useState<{
    recipeName: string
    quantity: number
    missingResources: ResourceAmount[]
    missingSetup: string
  } | null>(null)
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null)
  const floatTextIdRef = useRef(0)
  const pointerDragRef = useRef<{ id: ResourceId; startX: number; startY: number; dragged: boolean } | null>(null)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setState((current) => tickGame(current, 250).state)
    }, 250)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    localStorage.setItem(saveKey, saveGame(state))
  }, [state])

  useEffect(() => {
    if (selectedResource && terminalAvailableAmount(state, terminalGrid, selectedResource) < 1) {
      setSelectedResource(null)
    }
  }, [selectedResource, state, terminalGrid])

  useEffect(() => {
    if (selectedMachineUid && !state.machineInstances.some((instance) => instance.uid === selectedMachineUid)) {
      setSelectedMachineUid(null)
    }
  }, [selectedMachineUid, state.machineInstances])

  useEffect(() => {
    if (!pendingProcessInsert) return
    const instance = state.machineInstances.find((candidate) => candidate.uid === pendingProcessInsert.uid)
    const slot = instance?.process[pendingProcessInsert.slotId]
    const currentAmount = slot?.id === pendingProcessInsert.resourceId ? slot.amount : 0
    const max = Math.min(processStackLimit - currentAmount, availableResourceAmount(state, pendingProcessInsert.resourceId))
    if (!instance || max < 1) setPendingProcessInsert(null)
  }, [pendingProcessInsert, state])

  const unlockedRecipes = useMemo(() => visibleRecipes(state), [state])
  const guideQuests = useMemo(() => visibleQuests(state), [state])
  const terminalMatch = findGridRecipe(terminalGrid, unlockedRecipes)
  const totalMachines = machineOrder.reduce((sum, id) => sum + state.machines[id], 0)
  const processRecipeCards = useMemo(
    () =>
      processRecipes.map(
        (recipe): Recipe => ({
          id: recipe.id,
          name: recipe.name,
          description: recipe.description,
          tier: recipe.tier,
          stationType: 'furnace',
          recipeType: 'processing',
          durationMs: recipe.durationMs,
          inputs: [recipe.input],
          outputs: [recipe.output],
          requiredMachine: recipe.machineId,
        }),
      ),
    [],
  )
  const recipeCatalog = useMemo(() => [...recipes, ...processRecipeCards], [processRecipeCards])
  const inventoryResources = resourceOrder.filter((id) => terminalAvailableAmount(state, terminalGrid, id) > 0)
  const filteredResources = inventoryResources.filter((id) => {
    const query = terminalSearch.trim().toLowerCase()
    if (!query) return true
    return id.toLowerCase().includes(query) || resourceLabels[id].toLowerCase().includes(query)
  })
  const recipeCandidates = recipeSearch.trim() ? searchTerminalRecipes(recipeSearch, recipeCatalog) : recipeCatalog
  const selectedResourceForRecipes = selectedResource ?? 'log'
  const usageRecipes = recipesUsingInput(selectedResourceForRecipes, recipeCatalog)
  const listedRecipeGroups = terminalMode === 'recipes' ? groupRecipesByOutput(recipeCandidates) : singleRecipeGroups(usageRecipes)
  const selectedRecipeGroup = listedRecipeGroups.find((group) => group.key === selectedRecipeGroupKey) ?? listedRecipeGroups[0]
  const clampedSelectedRecipeIndex = selectedRecipeGroup
    ? Math.min(selectedRecipeIndex, Math.max(0, selectedRecipeGroup.recipes.length - 1))
    : 0
  const selectedRecipe = selectedRecipeGroup?.recipes[clampedSelectedRecipeIndex]
  const maxBatchQuantity = terminalMatch ? craftableQuantity(state, terminalMatch, terminalGrid) : 0
  const selectedMachine = state.machineInstances.find((instance) => instance.uid === selectedMachineUid) ?? null
  const unplacedFurnaces = availableUnplacedMachineCount(state, 'furnace')
  const pendingProcessMachine = pendingProcessInsert
    ? state.machineInstances.find((instance) => instance.uid === pendingProcessInsert.uid) ?? null
    : null
  const pendingProcessSlot = pendingProcessInsert && pendingProcessMachine ? pendingProcessMachine.process[pendingProcessInsert.slotId] : null
  const pendingProcessCurrentAmount =
    pendingProcessSlot && pendingProcessInsert && pendingProcessSlot.id === pendingProcessInsert.resourceId ? pendingProcessSlot.amount : 0
  const pendingProcessMax = pendingProcessInsert
    ? Math.min(processStackLimit - pendingProcessCurrentAmount, availableResourceAmount(state, pendingProcessInsert.resourceId))
    : 0

  const addFloatText = (label: string, targetId?: GatherTargetId, variant?: FloatText['variant']) => {
    const id = (floatTextIdRef.current += 1)
    setFloatTexts((current) => [...current.slice(-4), { id, label, targetId, variant }])
    window.setTimeout(() => {
      setFloatTexts((current) => current.filter((floatText) => floatText.id !== id))
    }, 850)
  }

  const handleGatherTarget = (targetId: GatherTargetId) => {
    const target = gatherTargets[targetId]
    const tool = getBestToolForTarget(state, targetId)
    const damage = tool.damageByTarget[targetId] ?? 0

    if (damage < 1) {
      addFloatText(`Need ${tools[target.preferredTool].name}`, targetId)
      return
    }

    setState((current) => {
      const result = hitGatherTarget(current, targetId)
      if (result.toolBroke) {
        addFloatText(`X ${resourceLabels[result.toolBroke]} broke!`, targetId, 'break')
      }
      if (result.completed) {
        addFloatText(`${result.drops.map((drop) => resourceLabels[drop.id]).join(', ')} gained`, targetId)
      } else if (targetId === 'tree' && result.tool.id !== 'bareHand') {
        addFloatText('Axe bites', targetId)
      } else if (targetId === 'stone' && result.tool.id !== 'bareHand') {
        addFloatText('Pick chips', targetId)
      } else {
        addFloatText(`${target.name} damaged`, targetId)
      }
      return result.state
    })
  }

  const handleCraft = (recipe: Recipe) => {
    addFloatText(recipe.id === 'craft_wooden_axe' ? 'axe crafted' : recipe.machineOutputs ? 'built' : 'crafted')
    setState((current) => craftRecipeInstant(current, recipe, 1))
  }

  const handleFactoryCellPress = (x: number, y: number, instance?: MachineInstance) => {
    if (instance) {
      setSelectedMachineUid(instance.uid)
      return
    }
    if (!isPlacingFurnace) return
    setState((current) => {
      const next = placeMachineInstance(current, 'furnace', x, y)
      if (next !== current) {
        setIsPlacingFurnace(false)
        setTerminalNotice('Furnace placed.')
      }
      return next
    })
  }

  const handleProcessSlotPress = (slotId: ProcessSlotId) => {
    if (!selectedMachine) return
    const slot = selectedMachine.process[slotId]
    if (slotId === 'output') {
      setState((current) => collectProcessOutput(current, selectedMachine.uid))
      return
    }
    if (slot && slot.id === selectedResource) {
      const max = Math.min(processStackLimit - slot.amount, availableResourceAmount(state, selectedResource))
      if (max < 1) {
        setTerminalNotice(`${resourceLabels[selectedResource]} slot is full.`)
        return
      }
      setPendingProcessInsert({ uid: selectedMachine.uid, slotId, resourceId: selectedResource, quantity: 1 })
      return
    }
    if (slot) {
      setState((current) => removeProcessSlot(current, selectedMachine.uid, slotId))
      return
    }
    if (!selectedResource) {
      setTerminalNotice('Select an item first.')
      return
    }
    if (!canResourceEnterProcessSlot(selectedMachine.machineId, slotId, selectedResource)) {
      setTerminalNotice(`${resourceLabels[selectedResource]} does not fit there.`)
      return
    }
    const max = Math.min(processStackLimit, availableResourceAmount(state, selectedResource))
    if (max < 1) {
      setTerminalNotice(`No ${resourceLabels[selectedResource]} available.`)
      return
    }
    setPendingProcessInsert({ uid: selectedMachine.uid, slotId, resourceId: selectedResource, quantity: 1 })
  }

  const handleAdjustProcessQuantity = (delta: number) => {
    setPendingProcessInsert((current) => {
      if (!current) return current
      const instance = state.machineInstances.find((candidate) => candidate.uid === current.uid)
      const slot = instance?.process[current.slotId]
      const currentAmount = slot?.id === current.resourceId ? slot.amount : 0
      const max = Math.min(processStackLimit - currentAmount, availableResourceAmount(state, current.resourceId))
      return { ...current, quantity: Math.max(1, Math.min(max, current.quantity + delta)) }
    })
  }

  const handleSetProcessQuantityMax = () => {
    setPendingProcessInsert((current) => (current ? { ...current, quantity: Math.max(1, pendingProcessMax) } : current))
  }

  const handleConfirmProcessInsert = () => {
    if (!pendingProcessInsert || pendingProcessMax < 1) return
    const quantity = Math.min(pendingProcessInsert.quantity, pendingProcessMax)
    setState((current) => insertProcessSlot(current, pendingProcessInsert.uid, pendingProcessInsert.slotId, pendingProcessInsert.resourceId, quantity))
    setTerminalNotice(`${resourceLabels[pendingProcessInsert.resourceId]} x${formatAmount(quantity)} inserted.`)
    setPendingProcessInsert(null)
  }

  const placeResourceInGridAt = (resourceId: ResourceId, slotIndex: number) => {
    const targetSlot = terminalGrid[slotIndex]
    const replacingSameResource = targetSlot?.id === resourceId && !targetSlot.ghost
    const available = terminalAvailableAmount(state, terminalGrid, resourceId) + (replacingSameResource ? 1 : 0)
    if (available < 1) {
      addFloatText('none left')
      return
    }

    setTerminalGrid((current) => current.map((slot, index) => (index === slotIndex ? { id: resourceId } : slot)))
  }

  const handleInventorySlotPress = (resourceId: ResourceId) => {
    setSelectedResource(resourceId)
  }

  const handleInventorySlotClick = (event: ReactMouseEvent<HTMLButtonElement>, resourceId: ResourceId) => {
    if (suppressClickRef.current) {
      event.preventDefault()
      return
    }

    handleInventorySlotPress(resourceId)
  }

  const handleCraftSlotPress = (slotIndex: number) => {
    if (terminalGrid[slotIndex]) {
      setTerminalGrid((current) => current.map((slot, index) => (index === slotIndex ? null : slot)))
      return
    }

    if (selectedResource) {
      placeResourceInGridAt(selectedResource, slotIndex)
      return
    }
  }

  const handleInventoryDragStart = (event: DragEvent<HTMLButtonElement>, resourceId: ResourceId) => {
    setSelectedResource(resourceId)
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('text/plain', resourceId)
  }

  const handleCraftSlotDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  const handleDropOnCraftSlot = (event: DragEvent<HTMLButtonElement>, slotIndex: number) => {
    event.preventDefault()
    const resourceId = event.dataTransfer.getData('text/plain')
    if (!isResourceId(resourceId)) return
    setSelectedResource(resourceId)
    placeResourceInGridAt(resourceId, slotIndex)
  }

  const handleEquipResource = (slotId: EquipmentSlotId, resourceId: ResourceId) => {
    if (!equipmentSlotAccepts(slotId, resourceId)) {
      setTerminalNotice(`${resourceLabels[resourceId]} does not fit ${equipmentLabels[slotId]}.`)
      return
    }

    if (terminalAvailableAmount(state, terminalGrid, resourceId) < 1) {
      setTerminalNotice(`${resourceLabels[resourceId]} is already reserved.`)
      return
    }

    setState((current) => equipResource(current, slotId, resourceId))
    setSelectedResource(null)
    setTerminalNotice(`${resourceLabels[resourceId]} equipped.`)
  }

  const handleEquipmentSlotPress = (slotId: EquipmentSlotId) => {
    if (selectedResource) {
      handleEquipResource(slotId, selectedResource)
      return
    }

    const equipped = state.equipment[slotId]
    if (!equipped) return

    setState((current) => unequipSlot(current, slotId))
    setTerminalNotice(`${resourceLabels[equipped]} unequipped.`)
  }

  const handleEquipmentSlotDragOver = (event: DragEvent<HTMLButtonElement>, slotId: EquipmentSlotId) => {
    const resourceId = event.dataTransfer.getData('text/plain')
    event.preventDefault()
    event.dataTransfer.dropEffect = isResourceId(resourceId) && equipmentSlotAccepts(slotId, resourceId) ? 'copy' : 'none'
  }

  const handleDropOnEquipmentSlot = (event: DragEvent<HTMLButtonElement>, slotId: EquipmentSlotId) => {
    event.preventDefault()
    const resourceId = event.dataTransfer.getData('text/plain')
    if (!isResourceId(resourceId)) return
    handleEquipResource(slotId, resourceId)
  }

  const handleInventoryPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, resourceId: ResourceId) => {
    if (event.button !== 0 || terminalAvailableAmount(state, terminalGrid, resourceId) < 1) return

    pointerDragRef.current = {
      id: resourceId,
      startX: event.clientX,
      startY: event.clientY,
      dragged: false,
    }

    const handleMove = (moveEvent: PointerEvent) => {
      const drag = pointerDragRef.current
      if (!drag) return

      const distance = Math.hypot(moveEvent.clientX - drag.startX, moveEvent.clientY - drag.startY)
      if (distance < 8 && !drag.dragged) return

      drag.dragged = true
      setSelectedResource(drag.id)
      setDragPreview({ id: drag.id, x: moveEvent.clientX, y: moveEvent.clientY })
    }

    const finishDrag = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', finishDrag)
      window.removeEventListener('pointercancel', cancelDrag)

      const drag = pointerDragRef.current
      pointerDragRef.current = null
      setDragPreview(null)
      if (!drag?.dragged) return

      suppressClickRef.current = true
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)

      const element = document.elementFromPoint(upEvent.clientX, upEvent.clientY)
      const equipmentSlotElement = element?.closest<HTMLElement>('[data-equipment-slot]')
      const equipmentSlot = equipmentSlotElement?.dataset.equipmentSlot
      if (equipmentSlot && equipmentSlot in equipmentLabels) {
        handleEquipResource(equipmentSlot as EquipmentSlotId, drag.id)
        return
      }

      const slotElement = element?.closest<HTMLElement>('[data-craft-slot]')
      const slotIndex = slotElement ? Number(slotElement.dataset.craftSlot) : Number.NaN
      if (!Number.isInteger(slotIndex)) return

      setSelectedResource(drag.id)
      placeResourceInGridAt(drag.id, slotIndex)
    }

    const cancelDrag = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', finishDrag)
      window.removeEventListener('pointercancel', cancelDrag)
      pointerDragRef.current = null
      setDragPreview(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', finishDrag)
    window.addEventListener('pointercancel', cancelDrag)
  }

  const handleClearGrid = () => {
    setTerminalGrid(Array.from({ length: 9 }, () => null))
  }

  const handleReturnRealItems = () => {
    setTerminalGrid((current) => current.map((slot) => (slot?.ghost ? slot : null)))
  }

  const handleCraftFromGrid = () => {
    if (!terminalMatch || !canCraft(state, terminalMatch)) return
    handleCraft(terminalMatch)
    handleClearGrid()
  }

  const handleAdjustBatchQuantity = (delta: number) => {
    setBatchQuantity((current) => Math.max(1, current + delta))
  }

  const showMissingBatch = (recipe: Recipe, quantity: number) => {
    const missingResources = missingForQuantity(state, recipe, quantity, terminalGrid)
    const missingRecipe = missingForRecipe(state, recipe)
    setMissingBatch({
      recipeName: recipe.name,
      quantity,
      missingResources,
      missingSetup: missingRecipe.missingMachines
        .map((amount) => `${machines[amount.id].name} x${formatAmount(amount.amount)}`)
        .concat(missingRecipe.missingCatalysts.map((amount) => `${resourceLabels[amount.id]} x${formatAmount(amount.amount)}`))
        .join(', '),
    })
  }

  const handleCraftBatch = (quantity: number) => {
    if (!terminalMatch) return

    const requestedQuantity = Math.max(1, Math.floor(quantity))
    if (craftableQuantity(state, terminalMatch, terminalGrid) < requestedQuantity) {
      showMissingBatch(terminalMatch, requestedQuantity)
      return
    }

    setState((current) => craftRecipeInstant(current, terminalMatch, requestedQuantity))
    handleClearGrid()
    setTerminalNotice(`${terminalMatch.name} x${formatAmount(requestedQuantity)} crafted.`)
    addFloatText(`crafted x${formatAmount(requestedQuantity)}`)
  }

  const handleCraftMax = () => {
    if (!terminalMatch) return

    const quantity = craftableQuantity(state, terminalMatch, terminalGrid)
    if (quantity < 1) {
      showMissingBatch(terminalMatch, 1)
      return
    }

    handleCraftBatch(quantity)
  }

  const handleLoadRecipe = (recipe: Recipe) => {
    if (!recipeFitsTerminalGrid(recipe)) {
      setTerminalNotice('This recipe needs a later station.')
      return
    }

    setTerminalGrid(makeGridForRecipe(recipe, state))
    setTerminalNotice(missingLine(state, recipe) ? `Missing ${missingLine(state, recipe)}` : `${recipe.name} loaded.`)
    setIsRecipeModalOpen(false)
    setPage('terminal')
  }

  const handleSelectRecipeGroup = (groupKey: string) => {
    setSelectedRecipeGroupKey(groupKey)
    setSelectedRecipeIndex(0)
  }

  const handleJumpToResourceRecipe = (resourceId: ResourceId) => {
    const targetOutput = { kind: 'resource' as const, id: resourceId, amount: 1 }
    const targetKey = recipeGroupKeyForOutput(targetOutput)
    const targetGroup = groupRecipesByOutput(recipeCatalog).find((group) => group.key === targetKey)
    if (!targetGroup) {
      setTerminalNotice(`No recipe found for ${resourceLabels[resourceId]}.`)
      return
    }

    setTerminalMode('recipes')
    setRecipeSearch('')
    handleSelectRecipeGroup(targetKey)
    setTerminalNotice(`Showing recipes for ${resourceLabels[resourceId]}.`)
  }

  const handleCompleteQuest = (questId: string) => {
    setState((current) => completeQuest(current, questId))
    addFloatText('reward claimed')
  }

  const handleReset = () => {
    localStorage.removeItem(saveKey)
    setState(loadGame(null))
    handleClearGrid()
    setTerminalNotice('')
    setTerminalSearch('')
    setRecipeSearch('')
    setSelectedResource(null)
    setBatchQuantity(1)
    setPendingProcessInsert(null)
    setMissingBatch(null)
    setIsRecipeModalOpen(false)
    setIsPlacingFurnace(false)
    setSelectedMachineUid(null)
    setSelectedRecipeGroupKey(null)
    setSelectedRecipeIndex(0)
    setPage('gather')
    addFloatText('fresh save')
  }

  const selectedAvailable = selectedResource ? terminalAvailableAmount(state, terminalGrid, selectedResource) : 0
  const outputResource = terminalMatch?.outputs[0]?.id
  const selectedRecipeMissing = selectedRecipe ? missingForRecipe(state, selectedRecipe) : undefined
  const selectedRecipeMissingLine = selectedRecipe ? missingLine(state, selectedRecipe) : ''
  const selectedRecipeOutput = selectedRecipe ? recipePrimaryOutput(selectedRecipe) : undefined
  const renderEquipmentSlot = (slotId: EquipmentSlotId) => {
    const equipped = state.equipment[slotId]
    const selectedFits = Boolean(selectedResource && equipmentSlotAccepts(slotId, selectedResource))
    const className = [
      'equipment-slot',
      equipped ? 'filled' : 'empty',
      selectedFits ? 'accepts-selected' : '',
    ].join(' ')

    return (
      <button
        type="button"
        className={className}
        aria-label={equipped ? `Unequip ${resourceLabels[equipped]} from ${equipmentLabels[slotId]}` : `Empty ${equipmentLabels[slotId]} slot`}
        title={equipped ? resourceLabels[equipped] : equipmentLabels[slotId]}
        data-equipment-slot={slotId}
        onClick={() => handleEquipmentSlotPress(slotId)}
        onDragOver={(event) => handleEquipmentSlotDragOver(event, slotId)}
        onDrop={(event) => handleDropOnEquipmentSlot(event, slotId)}
        key={slotId}
      >
        <span className="equipment-label">{equipmentLabels[slotId]}</span>
        <span className="equipment-slot-box">
          {equipped ? (
            <>
              <PixelIcon id={equipped} />
              <DurabilityBar state={state} id={equipped} />
            </>
          ) : (
            <span className={`equipment-placeholder equipment-${slotId}`} aria-hidden="true" />
          )}
        </span>
      </button>
    )
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <div>
          <p className="eyebrow">Block-tech idle</p>
          <h1>Click Foundry</h1>
        </div>
        <button type="button" className="icon-button" aria-label="Reset save" title="Reset save" onClick={handleReset}>
          <RotateCcw size={18} />
        </button>
      </header>

      <section className="page-tabs" aria-label="Game pages">
        <button type="button" className={page === 'gather' ? 'active' : ''} onClick={() => setPage('gather')}>
          <Pickaxe size={18} />
          Gather
        </button>
        <button type="button" className={page === 'terminal' ? 'active' : ''} onClick={() => setPage('terminal')}>
          <Database size={18} />
          Terminal
        </button>
        <button type="button" className={page === 'processing' ? 'active' : ''} onClick={() => setPage('processing')}>
          <Factory size={18} />
          Processing
        </button>
        <button type="button" className={page === 'guide' ? 'active' : ''} onClick={() => setPage('guide')}>
          <BookOpen size={18} />
          Guide
        </button>
      </section>

      {page === 'gather' && (
        <section className="tap-panel" aria-label="Manual gathering">
          <div className="gather-panels">
            {gatherTargetOrder.filter((targetId) => isGatherTargetVisible(state, targetId)).map((targetId) => {
              const target = gatherTargets[targetId]
              const progress = state.gatherProgress[targetId] ?? 0
              const tool = getBestToolForTarget(state, targetId)
              const damage = tool.damageByTarget[targetId] ?? 0
              const toolResource = tool.id === 'bareHand' ? null : (tool.id as ResourceId)
              const remainingHp = Math.max(0, target.maxHp - progress)
              const progressPercent = Math.min(100, (progress / target.maxHp) * 100)
              const targetFloats = floatTexts.filter((floatText) => floatText.targetId === targetId)

              return (
                <article className="gather-panel" key={targetId}>
                  <div className="mine-face">
                    <div className="gather-block" aria-hidden="true">
                      <PixelIcon id={gatherTargetIcons[targetId]} />
                    </div>
                    <div>
                      <h2>{target.name}</h2>
                      <p>{target.description}</p>
                    </div>
                    <div className="float-layer" aria-live="polite">
                      {targetFloats.map((floatText) => (
                        <span className={floatText.variant === 'break' ? 'break-float' : undefined} key={floatText.id}>
                          {floatText.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="break-panel">
                    <div className="break-stats">
                      <div className="stat-cell">
                        <span className="stat-label">Tool</span>
                        <strong className="stat-tool">
                          <span className={toolResource ? 'stat-tool-icon' : 'stat-tool-icon bare-hand'}>
                            {toolResource ? (
                              <>
                                <PixelIcon id={toolResource} />
                                <DurabilityBar state={state} id={toolResource} />
                              </>
                            ) : (
                              <span className="bare-hand-mark" aria-hidden="true" />
                            )}
                          </span>
                          <span>{tool.name}</span>
                        </strong>
                      </div>
                      <div className="stat-cell stat-drop">
                        <span className="stat-label">Drop</span>
                        <strong>
                          {target.drops.map((drop) => (
                            <span className="stat-drop-item" key={drop.id}>
                              <span className="stat-drop-icon">
                                <PixelIcon id={drop.id} />
                              </span>
                              <span className="stat-drop-count">
                                +{formatAmount(drop.amount)} / {formatAmount(state.resources[drop.id])}
                              </span>
                              <span className="stat-drop-name">{resourceLabels[drop.id]}</span>
                            </span>
                          ))}
                        </strong>
                      </div>
                      <div className="stat-cell">
                        <span className="stat-label">HP</span>
                        <strong>{remainingHp}/{target.maxHp}</strong>
                      </div>
                      <div className="stat-cell">
                        <span className="stat-label">Damage</span>
                        <strong>{damage}</strong>
                      </div>
                    </div>
                    <div className="progress-track">
                      <span style={{ width: `${progressPercent}%` }} />
                    </div>
                    {damage < 1 && <p className="gather-warning">Requires {tools[target.preferredTool].name}</p>}
                    <button type="button" className="hit-button" disabled={damage < 1} onClick={() => handleGatherTarget(targetId)}>
                      {targetId === 'tree' ? <Axe size={20} /> : <Pickaxe size={20} />}
                      Mine {target.name}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {page === 'terminal' && (
        <section className="terminal-panel" aria-label="Crafting terminal">
          <div className="terminal-topline">
            <div>
              <p className="eyebrow">Stored items</p>
              <h2>Terminal</h2>
            </div>
            <input
              className="terminal-search"
              type="search"
              placeholder="Search"
              value={terminalSearch}
              onChange={(event) => setTerminalSearch(event.target.value)}
              aria-label="Search stored items"
            />
          </div>

          <div className="terminal-items" aria-label="Stored items">
            {filteredResources.length > 0 ? (
              filteredResources.map((id) => {
                const available = terminalAvailableAmount(state, terminalGrid, id)
                return (
                  <button
                    type="button"
                    className={selectedResource === id ? 'item-slot selected' : 'item-slot'}
                    aria-label={`${resourceLabels[id]} ${formatAmount(available)}`}
                    title={resourceLabels[id]}
                    draggable
                    onClick={(event) => handleInventorySlotClick(event, id)}
                    onDragStart={(event) => handleInventoryDragStart(event, id)}
                    onPointerDown={(event) => handleInventoryPointerDown(event, id)}
                    key={id}
                  >
                    <PixelIcon id={id} />
                    <span className="item-count">{formatAmount(available)}</span>
                    <DurabilityBar state={state} id={id} />
                  </button>
                )
              })
            ) : (
              <p className="empty-storage">No stored items</p>
            )}
          </div>

          <div className={selectedResource ? 'item-tooltip' : 'item-tooltip empty'} role={selectedResource ? 'status' : undefined}>
            {selectedResource ? (
              <>
                <strong>{resourceLabels[selectedResource]}</strong>
                <span>
                  x{formatAmount(Math.max(0, selectedAvailable))}
                  {maxDurability(selectedResource) > 0 && ` | ${formatAmount(durabilityRemaining(state, selectedResource))}/${formatAmount(maxDurability(selectedResource))} uses`}
                </span>
              </>
            ) : (
              <>
                <strong>Select item</strong>
                <span>x0</span>
              </>
            )}
          </div>

          <div className="terminal-crafting-compact">
            <div className="terminal-craft-stack">
              <p className="terminal-subtitle">Crafting Terminal</p>
              <div className="craft-grid three-grid pixel-grid" aria-label="Terminal crafting grid">
                {terminalGrid.map((slot, index) => (
                  <button
                    type="button"
                    className={slot ? (slot.ghost ? 'craft-slot ghost' : 'craft-slot filled') : 'craft-slot'}
                    aria-label={slot ? `Remove ${resourceLabels[slot.id]}` : `Empty crafting slot ${index + 1}`}
                    data-craft-slot={index}
                    onClick={() => handleCraftSlotPress(index)}
                    onDragOver={handleCraftSlotDragOver}
                    onDrop={(event) => handleDropOnCraftSlot(event, index)}
                    key={`${slot?.id ?? 'empty'}-${slot?.ghost ? 'ghost' : 'real'}-${index}`}
                  >
                    {slot && <PixelIcon id={slot.id} />}
                  </button>
                ))}
              </div>
              <button type="button" className="recipe-open-button" onClick={() => setIsRecipeModalOpen(true)}>
                <BookOpen size={16} />
                Recipes
              </button>
            </div>

            <div className="terminal-output-column">
              <div className="output-row">
                <span className="craft-arrow" aria-hidden="true" />
                <button
                  type="button"
                  className={terminalMatch ? 'output-slot matched' : 'output-slot'}
                  disabled={!terminalMatch || !canCraft(state, terminalMatch)}
                  aria-label={terminalMatch ? `Craft ${recipeOutputLabel(terminalMatch)}` : 'No craft output'}
                  onClick={handleCraftFromGrid}
                >
                  {outputResource ? <PixelIcon id={outputResource} /> : <span className="empty-output" />}
                  {terminalMatch && <span className="item-count output-count">{formatAmount(terminalMatch.outputs[0]?.amount ?? 1)}</span>}
                </button>
              </div>
            </div>

            <div className="batch-controls" aria-label="Batch crafting controls">
              <div className="batch-step-row" aria-label="Increase quantity">
                {[1, 10, 100].map((amount) => (
                  <button type="button" onClick={() => handleAdjustBatchQuantity(amount)} key={`plus-${amount}`}>
                    +{amount}
                  </button>
                ))}
              </div>
              <div className="batch-quantity" aria-live="polite">
                <span>Qty</span>
                <strong>{formatAmount(batchQuantity)}</strong>
                <small>Max {formatAmount(maxBatchQuantity)}</small>
              </div>
              <div className="batch-step-row" aria-label="Decrease quantity">
                {[-1, -10, -100].map((amount) => (
                  <button type="button" onClick={() => handleAdjustBatchQuantity(amount)} key={`minus-${amount}`}>
                    {amount}
                  </button>
                ))}
              </div>
              <div className="batch-action-row">
                <button type="button" disabled={!terminalMatch} onClick={() => handleCraftBatch(batchQuantity)}>
                  Craft x{formatAmount(batchQuantity)}
                </button>
                <button type="button" disabled={!terminalMatch} onClick={handleCraftMax}>
                  Max
                </button>
              </div>
            </div>
          </div>

          <div className="compact-actions">
            <button type="button" onClick={handleClearGrid}>
              <Trash2 size={16} />
              Clear
            </button>
            <button type="button" onClick={handleReturnRealItems}>
              <Undo2 size={16} />
              Return
            </button>
          </div>

          <div className={isEquipmentOpen ? 'equipment-drawer open' : 'equipment-drawer closed'}>
            <button
              type="button"
              className="equipment-toggle"
              aria-expanded={isEquipmentOpen}
              onClick={() => setIsEquipmentOpen((current) => !current)}
            >
              <Axe size={16} />
              Player Equipment
            </button>
            <div className="equipment-layout" aria-label="Player equipment" aria-hidden={!isEquipmentOpen}>
              <div className="equipment-column armour-column" aria-label="Armour slots">
                {armourEquipmentSlots.map(renderEquipmentSlot)}
              </div>
              <div className="player-preview" aria-hidden="true">
                <span className="player-head" />
                <span className="player-body" />
                <span className="player-arm left" />
                <span className="player-arm right" />
                <span className="player-leg left" />
                <span className="player-leg right" />
              </div>
              <div className="equipment-column tool-column" aria-label="Tool slots">
                {toolEquipmentSlots.map(renderEquipmentSlot)}
              </div>
            </div>
          </div>

          {terminalNotice && <p className="recipe-notice">{terminalNotice}</p>}

          <details className="machine-drawer">
            <summary>
              <Factory size={16} />
              Machines x{totalMachines}
            </summary>
            <div className="machine-list compact-machines">
              {machineOrder.map((id) => {
                const machine = machines[id]
                const count = state.machines[id]
                const progress = machine.intervalMs ? ((state.machineProgress[id] ?? 0) / machine.intervalMs) * 100 : 0

                return (
                  <article className={count > 0 ? 'machine-card online' : 'machine-card'} key={id}>
                    <div>
                      <h3>{machine.name}</h3>
                      <p>{machine.description}</p>
                    </div>
                    <strong>x{count}</strong>
                    {machine.intervalMs && count > 0 && (
                      <div className="progress-track">
                        <span style={{ width: `${progress}%` }} />
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </details>

          {isRecipeModalOpen && (
            <div className="modal-backdrop" role="presentation" onClick={() => setIsRecipeModalOpen(false)}>
              <section
                className="recipe-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Recipe browser"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="modal-head">
                  <div>
                    <p className="eyebrow">Recipe browser</p>
                    <h2>{terminalMode === 'recipes' ? 'Recipes' : `Uses: ${resourceLabels[selectedResourceForRecipes]}`}</h2>
                  </div>
                  <button type="button" className="icon-button" aria-label="Close recipes" onClick={() => setIsRecipeModalOpen(false)}>
                    <X size={18} />
                  </button>
                </div>

                <input
                  className="recipe-search"
                  type="search"
                  placeholder="Search recipes"
                  value={recipeSearch}
                  onChange={(event) => setRecipeSearch(event.target.value)}
                />

                <div className="mode-tabs" aria-label="Recipe browser mode">
                  <button type="button" className={terminalMode === 'recipes' ? 'active' : ''} onClick={() => setTerminalMode('recipes')}>
                    Recipes
                  </button>
                  <button type="button" className={terminalMode === 'uses' ? 'active' : ''} onClick={() => setTerminalMode('uses')}>
                    Uses
                  </button>
                </div>

                <div className="recipe-modal-body">
                  <div className="recipe-icon-grid" aria-label="Recipe results">
                  {listedRecipeGroups.map((group) => {
                    const output = recipeGroupDisplayOutput(group)
                    const missing = group.recipes.every((recipe) => missingLine(state, recipe))
                    return (
                      <button
                        type="button"
                        className={[
                          'recipe-icon-button',
                          group.key === selectedRecipeGroup?.key ? 'selected' : '',
                          missing ? 'missing' : 'ready',
                        ].join(' ')}
                        aria-label={output.label}
                        title={group.recipes.map((recipe) => recipe.name).join(' / ')}
                        onClick={() => handleSelectRecipeGroup(group.key)}
                        key={group.key}
                      >
                        {output.kind === 'resource' ? <PixelIcon id={output.id} /> : <MachineGlyph id={output.id} />}
                        <span className="item-count">{formatAmount(output.amount)}</span>
                        {group.recipes.length > 1 && <span className="recipe-count-badge">{group.recipes.length}</span>}
                      </button>
                    )
                  })}
                  </div>

                  {selectedRecipe && selectedRecipeOutput && selectedRecipeMissing && selectedRecipeGroup && (
                    <aside className="recipe-detail" aria-label={`${selectedRecipe.name} details`}>
                      <div className="recipe-detail-head">
                        <div>
                          <p className="eyebrow">{selectedRecipe.tier}</p>
                          <h3>{selectedRecipe.name}</h3>
                        </div>
                        <div className="recipe-detail-actions">
                          {selectedRecipeGroup.recipes.length > 1 && (
                            <div className="recipe-cycle" aria-label="Recipe variants">
                              <button
                                type="button"
                                aria-label="Previous recipe"
                                onClick={() =>
                                  setSelectedRecipeIndex((current) =>
                                    current <= 0 ? selectedRecipeGroup.recipes.length - 1 : current - 1,
                                  )
                                }
                              >
                                <ChevronLeft size={15} />
                              </button>
                              <span>{clampedSelectedRecipeIndex + 1}/{selectedRecipeGroup.recipes.length}</span>
                              <button
                                type="button"
                                aria-label="Next recipe"
                                onClick={() =>
                                  setSelectedRecipeIndex((current) => (current + 1) % selectedRecipeGroup.recipes.length)
                                }
                              >
                                <ChevronRight size={15} />
                              </button>
                            </div>
                          )}
                          <span className={selectedRecipeMissingLine ? 'mini-slot muted' : 'mini-slot'}>
                            {selectedRecipeOutput.kind === 'resource' ? (
                              <PixelIcon id={selectedRecipeOutput.id} />
                            ) : (
                              <MachineGlyph id={selectedRecipeOutput.id} />
                            )}
                            <span className="item-count">{formatAmount(selectedRecipeOutput.amount)}</span>
                          </span>
                        </div>
                      </div>

                      {selectedRecipeMissingLine && <p className="missing-line recipe-detail-warning">Missing {selectedRecipeMissingLine}</p>}

                      {recipeFitsTerminalGrid(selectedRecipe) ? (
                        <div className="recipe-slot-section">
                          <span>Pattern</span>
                          <RecipePatternPreview recipe={selectedRecipe} state={state} onSelectResource={handleJumpToResourceRecipe} />
                        </div>
                      ) : (
                        <div className="recipe-slot-section">
                          <span>Inputs</span>
                          <div className="recipe-slot-row">
                            {selectedRecipe.inputs.map((amount) => {
                              const missing = selectedRecipeMissing.missingResources.some((item) => item.id === amount.id)
                              return <ItemSlot amount={amount} disabled={missing} state={state} onClick={handleJumpToResourceRecipe} key={amount.id} />
                            })}
                            {selectedRecipe.catalysts?.map((amount) => {
                              const missing = selectedRecipeMissing.missingCatalysts.some((item) => item.id === amount.id)
                              return <ItemSlot amount={amount} disabled={missing} state={state} onClick={handleJumpToResourceRecipe} key={`catalyst-${amount.id}`} />
                            })}
                          </div>
                        </div>
                      )}

                      {(selectedRecipe.requiredMachine || selectedRecipe.machineInputs?.length) && (
                        <div className="recipe-slot-section">
                          <span>Station</span>
                          <div className="recipe-slot-row">
                            {selectedRecipe.requiredMachine && (
                              <MachineSlot
                                id={selectedRecipe.requiredMachine}
                                muted={state.machines[selectedRecipe.requiredMachine] < 1}
                              />
                            )}
                            {selectedRecipe.machineInputs?.map((amount) => (
                              <MachineSlot
                                id={amount.id}
                                amount={amount.amount}
                                muted={state.machines[amount.id] < amount.amount}
                                key={amount.id}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="recipe-slot-section">
                        <span>Outputs</span>
                        <div className="recipe-slot-row">
                          {selectedRecipe.outputs.map((amount) => (
                            <ItemSlot amount={amount} state={state} onClick={handleJumpToResourceRecipe} key={amount.id} />
                          ))}
                          {selectedRecipe.machineOutputs?.map((amount) => (
                            <MachineSlot id={amount.id} amount={amount.amount} key={amount.id} />
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="load-recipe-button"
                        disabled={!recipeFitsTerminalGrid(selectedRecipe)}
                        onClick={() => handleLoadRecipe(selectedRecipe)}
                      >
                        {recipeFitsTerminalGrid(selectedRecipe) ? 'Load recipe' : 'Station recipe'}
                      </button>
                    </aside>
                  )}
                </div>
              </section>
            </div>
          )}

          {missingBatch && (
            <div className="modal-backdrop compact-backdrop" role="presentation" onClick={() => setMissingBatch(null)}>
              <section
                className="missing-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Missing batch materials"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="modal-head">
                  <div>
                    <p className="eyebrow">Missing items</p>
                    <h2>{missingBatch.recipeName} x{formatAmount(missingBatch.quantity)}</h2>
                  </div>
                  <button type="button" className="icon-button" aria-label="Close missing items" onClick={() => setMissingBatch(null)}>
                    <X size={18} />
                  </button>
                </div>
                {missingBatch.missingResources.length > 0 ? (
                  <div className="missing-slot-list">
                    {missingBatch.missingResources.map((amount) => (
                      <ItemSlot amount={amount} disabled key={amount.id} />
                    ))}
                  </div>
                ) : (
                  <p className="missing-line">{missingBatch.missingSetup || 'Missing required setup.'}</p>
                )}
                {missingBatch.missingSetup && missingBatch.missingResources.length > 0 && (
                  <p className="missing-line">Missing {missingBatch.missingSetup}</p>
                )}
                <button type="button" className="load-recipe-button" onClick={() => setMissingBatch(null)}>
                  Close
                </button>
              </section>
            </div>
          )}
        </section>
      )}

      {page === 'processing' && (
        <section className="processing-panel" aria-label="Processing factory">
          <div className="processing-head">
            <div>
              <p className="eyebrow">Processing</p>
              <h2>Factory Floor</h2>
            </div>
            <button
              type="button"
              className={isPlacingFurnace ? 'place-machine-button active' : 'place-machine-button'}
              disabled={unplacedFurnaces < 1}
              onClick={() => setIsPlacingFurnace((current) => !current)}
            >
              Place Furnace x{formatAmount(unplacedFurnaces)}
            </button>
          </div>

          <div className="processing-storage" aria-label="Processing storage">
            {resourceOrder
              .filter((id) => availableResourceAmount(state, id) > 0)
              .map((id) => (
                <button
                  type="button"
                  className={selectedResource === id ? 'item-slot selected' : 'item-slot'}
                  aria-label={`${resourceLabels[id]} ${formatAmount(availableResourceAmount(state, id))}`}
                  title={resourceLabels[id]}
                  onClick={() => setSelectedResource(id)}
                  key={id}
                >
                  <PixelIcon id={id} />
                  <span className="item-count">{formatAmount(availableResourceAmount(state, id))}</span>
                  <DurabilityBar state={state} id={id} />
                </button>
              ))}
          </div>

          <div className="factory-scroll">
            <div className="factory-grid" aria-label="Factory grid">
              {Array.from({ length: factoryGrid.width * factoryGrid.height }, (_, index) => {
                const x = index % factoryGrid.width
                const y = Math.floor(index / factoryGrid.width)
                const instance = state.machineInstances.find((candidate) => candidate.x === x && candidate.y === y)
                return (
                  <button
                    type="button"
                    className={instance ? 'factory-cell occupied' : isPlacingFurnace ? 'factory-cell placing' : 'factory-cell'}
                    aria-label={instance ? `${machines[instance.machineId].name} at ${x + 1}, ${y + 1}` : `Empty factory cell ${x + 1}, ${y + 1}`}
                    onClick={() => handleFactoryCellPress(x, y, instance)}
                    key={`${x}-${y}`}
                  >
                    {instance ? <MachineGlyph id={instance.machineId} /> : <span />}
                  </button>
                )
              })}
            </div>
          </div>

          {selectedMachine && (
            <div
              className="modal-backdrop"
              role="presentation"
              onClick={() => {
                setPendingProcessInsert(null)
                setSelectedMachineUid(null)
              }}
            >
              <section
                className="furnace-modal"
                role="dialog"
                aria-modal="true"
                aria-label={`${machines[selectedMachine.machineId].name} terminal`}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="modal-head">
                  <div>
                    <p className="eyebrow">Level {selectedMachine.level}</p>
                    <h2>{machines[selectedMachine.machineId].name}</h2>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Close furnace"
                    onClick={() => {
                      setPendingProcessInsert(null)
                      setSelectedMachineUid(null)
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="processing-storage furnace-storage" aria-label="Furnace storage">
                  {resourceOrder
                    .filter((id) => availableResourceAmount(state, id) > 0)
                    .map((id) => (
                      <button
                        type="button"
                        className={selectedResource === id ? 'item-slot selected' : 'item-slot'}
                        aria-label={`${resourceLabels[id]} ${formatAmount(availableResourceAmount(state, id))}`}
                        title={resourceLabels[id]}
                        onClick={() => setSelectedResource(id)}
                        key={id}
                      >
                        <PixelIcon id={id} />
                        <span className="item-count">{formatAmount(availableResourceAmount(state, id))}</span>
                        <DurabilityBar state={state} id={id} />
                      </button>
                    ))}
                </div>
                <div className="furnace-interface">
                  <div className="furnace-inputs">
                    <ProcessItemSlot slot={selectedMachine.process.input} label="Input" onClick={() => handleProcessSlotPress('input')} />
                    <div className="furnace-flame">
                      <span style={{ height: `${selectedMachine.process.fuelRemainingMs > 0 ? 100 : 0}%` }} />
                    </div>
                    <ProcessItemSlot slot={selectedMachine.process.fuel} label="Fuel" onClick={() => handleProcessSlotPress('fuel')} />
                  </div>
                  <div className="furnace-progress">
                    <span
                      style={{
                        width: `${
                          selectedMachine.process.durationMs > 0
                            ? Math.min(100, (selectedMachine.process.progressMs / selectedMachine.process.durationMs) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <ProcessItemSlot slot={selectedMachine.process.output} label="Output" onClick={() => handleProcessSlotPress('output')} />
                </div>
                {pendingProcessInsert && pendingProcessInsert.uid === selectedMachine.uid && (
                  <div className="process-quantity-panel" role="dialog" aria-label={`Insert ${resourceLabels[pendingProcessInsert.resourceId]}`}>
                    <div className="process-quantity-head">
                      <span className="item-slot filled">
                        <PixelIcon id={pendingProcessInsert.resourceId} />
                        <span className="item-count">{formatAmount(pendingProcessInsert.quantity)}</span>
                        <DurabilityBar state={state} id={pendingProcessInsert.resourceId} />
                      </span>
                      <div>
                        <p className="eyebrow">{pendingProcessInsert.slotId}</p>
                        <h3>{resourceLabels[pendingProcessInsert.resourceId]}</h3>
                        <span>
                          Slot {formatAmount(pendingProcessCurrentAmount)}/{formatAmount(processStackLimit)}
                        </span>
                      </div>
                      <button type="button" className="icon-button" aria-label="Cancel insert" onClick={() => setPendingProcessInsert(null)}>
                        <X size={16} />
                      </button>
                    </div>
                    <div className="batch-controls process-quantity-controls" aria-label="Furnace quantity controls">
                      <div className="batch-step-row" aria-label="Increase insert quantity">
                        {[1, 10, 100].map((amount) => (
                          <button type="button" onClick={() => handleAdjustProcessQuantity(amount)} key={`process-plus-${amount}`}>
                            +{amount}
                          </button>
                        ))}
                      </div>
                      <div className="batch-quantity" aria-live="polite">
                        <span>Qty</span>
                        <strong>{formatAmount(Math.min(pendingProcessInsert.quantity, pendingProcessMax))}</strong>
                        <small>Max {formatAmount(pendingProcessMax)}</small>
                      </div>
                      <div className="batch-step-row" aria-label="Decrease insert quantity">
                        {[-1, -10, -100].map((amount) => (
                          <button type="button" onClick={() => handleAdjustProcessQuantity(amount)} key={`process-minus-${amount}`}>
                            {amount}
                          </button>
                        ))}
                      </div>
                      <div className="batch-action-row">
                        <button type="button" disabled={pendingProcessMax < 1} onClick={handleConfirmProcessInsert}>
                          Insert x{formatAmount(Math.min(pendingProcessInsert.quantity, pendingProcessMax))}
                        </button>
                        <button type="button" disabled={pendingProcessMax < 1} onClick={handleSetProcessQuantityMax}>
                          Max
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <p className="furnace-help">Tap storage, then Input or Fuel to choose an amount. Tap Output to collect.</p>
              </section>
            </div>
          )}
        </section>
      )}

      {page === 'guide' && (
        <section className="guide-page" aria-label="Quest guide">
          <div className="section-title">
            <div>
              <p className="eyebrow">Optional guide</p>
              <h2>Quest book</h2>
            </div>
            <BookOpen size={22} />
          </div>

          <div className="guide-list">
            {guideQuests.map((quest) => (
              <QuestCard quest={quest} state={state} onComplete={handleCompleteQuest} key={quest.id} />
            ))}
          </div>
        </section>
      )}

      {dragPreview && (
        <div className="item-drag-preview" style={{ left: dragPreview.x, top: dragPreview.y }} aria-hidden="true">
          <PixelIcon id={dragPreview.id} />
        </div>
      )}
    </main>
  )
}

export default App
