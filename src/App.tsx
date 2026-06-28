import {
  Axe,
  BookOpen,
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
import { gatherTargets, machines, recipes, resourceLabels, tools } from './game/content'
import {
  canCompleteQuest,
  canCraft,
  completeQuest,
  craftableQuantity,
  craftRecipeInstant,
  equipResource,
  equipmentSlotAccepts,
  findGridRecipe,
  getBestToolForTarget,
  hitGatherTarget,
  loadGame,
  makeGridForRecipe,
  missingForQuantity,
  missingForRecipe,
  questProgress,
  recipeFitsTerminalGrid,
  recipesUsingInput,
  saveGame,
  saveKey,
  searchTerminalRecipes,
  terminalAvailableAmount,
  tickGame,
  unequipSlot,
  visibleQuests,
  visibleRecipes,
} from './game/engine'
import type {
  CraftSlot,
  EquipmentSlotId,
  GatherTargetId,
  GameState,
  MachineId,
  Quest,
  Recipe,
  ResourceAmount,
  ResourceId,
} from './game/types'

type FloatText = {
  id: number
  label: string
}

type Page = 'gather' | 'terminal' | 'guide'
type TerminalMode = 'recipes' | 'uses'
type DragPreview = { id: ResourceId; x: number; y: number }

type RecipeDisplayOutput =
  | { kind: 'resource'; id: ResourceId; amount: number; label: string }
  | { kind: 'machine'; id: MachineId; amount: number; label: string }

const machineOrder: MachineId[] = [
  'workbench',
  'furnace',
  'steamBoiler',
  'steamHammer',
  'steamGrinder',
  'steamAssembler',
  'lvGenerator',
  'slowOreTap',
]

const resourceOrder = Object.keys(resourceLabels) as ResourceId[]

const gatherTargetOrder: GatherTargetId[] = ['tree', 'stone']
const gatherTargetIcons: Record<GatherTargetId, ResourceId> = {
  tree: 'log',
  stone: 'cobblestone',
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
}: {
  amount: ResourceAmount
  className?: string
  disabled?: boolean
}) {
  return (
    <span className={disabled ? `mini-slot muted ${className}` : `mini-slot ${className}`} title={resourceLabels[amount.id]}>
      <PixelIcon id={amount.id} />
      <span className="item-count">{formatAmount(amount.amount)}</span>
    </span>
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

  return { kind: 'machine', id: 'workbench', amount: 0, label: 'No output' }
}

function missingLine(state: GameState, recipe: Recipe) {
  const missing = missingForRecipe(state, recipe)
  return [
    ...missing.missingResources.map((amount) => `${amount.amount} ${resourceLabels[amount.id]}`),
    ...missing.missingMachines.map((amount) => machines[amount.id].name),
  ].join(', ')
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
  const [selectedGatherTarget, setSelectedGatherTarget] = useState<GatherTargetId>('tree')
  const [terminalNotice, setTerminalNotice] = useState('')
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false)
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [batchQuantity, setBatchQuantity] = useState(1)
  const [missingBatch, setMissingBatch] = useState<{
    recipeName: string
    quantity: number
    missingResources: ResourceAmount[]
    missingSetup: string
  } | null>(null)
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null)
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

  const unlockedRecipes = useMemo(() => visibleRecipes(state), [state])
  const guideQuests = useMemo(() => visibleQuests(state), [state])
  const terminalMatch = findGridRecipe(terminalGrid, unlockedRecipes)
  const currentTarget = gatherTargets[selectedGatherTarget]
  const currentTool = getBestToolForTarget(state, selectedGatherTarget)
  const currentDamage = currentTool.damageByTarget[selectedGatherTarget] ?? 0
  const targetProgress = state.gatherProgress[selectedGatherTarget] ?? 0
  const targetRemainingHp = Math.max(0, currentTarget.maxHp - targetProgress)
  const targetProgressPercent = Math.min(100, (targetProgress / currentTarget.maxHp) * 100)
  const totalMachines = machineOrder.reduce((sum, id) => sum + state.machines[id], 0)
  const inventoryResources = resourceOrder.filter((id) => terminalAvailableAmount(state, terminalGrid, id) > 0)
  const filteredResources = inventoryResources.filter((id) => {
    const query = terminalSearch.trim().toLowerCase()
    if (!query) return true
    return id.toLowerCase().includes(query) || resourceLabels[id].toLowerCase().includes(query)
  })
  const recipeCandidates = recipeSearch.trim() ? searchTerminalRecipes(recipeSearch, recipes) : recipes
  const selectedResourceForRecipes = selectedResource ?? 'log'
  const usageRecipes = recipesUsingInput(selectedResourceForRecipes, recipes)
  const listedRecipes = terminalMode === 'recipes' ? recipeCandidates : usageRecipes
  const selectedRecipe = listedRecipes.find((recipe) => recipe.id === selectedRecipeId) ?? listedRecipes[0]
  const maxBatchQuantity = terminalMatch ? craftableQuantity(state, terminalMatch, terminalGrid) : 0

  const addFloatText = (label: string) => {
    const id = Date.now() + Math.random()
    setFloatTexts((current) => [...current.slice(-4), { id, label }])
    window.setTimeout(() => {
      setFloatTexts((current) => current.filter((floatText) => floatText.id !== id))
    }, 850)
  }

  const handleGatherTarget = () => {
    if (currentDamage < 1) {
      addFloatText(`Need ${tools[currentTarget.preferredTool].name}`)
      return
    }

    setState((current) => {
      const result = hitGatherTarget(current, selectedGatherTarget)
      if (result.completed) {
        addFloatText(`${result.drops.map((drop) => resourceLabels[drop.id]).join(', ')} gained`)
      } else if (result.tool.id === 'woodenAxe') {
        addFloatText('Axe bites')
      } else if (result.tool.id === 'woodenPickaxe') {
        addFloatText('Pick chips')
      } else {
        addFloatText(`${currentTarget.name} damaged`)
      }
      return result.state
    })
  }

  const handleCraft = (recipe: Recipe) => {
    addFloatText(recipe.id === 'craft_wooden_axe' ? 'axe crafted' : recipe.machineOutputs ? 'built' : 'crafted')
    setState((current) => craftRecipeInstant(current, recipe, 1))
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
    if (selectedResource) {
      placeResourceInGridAt(selectedResource, slotIndex)
      return
    }

    setTerminalGrid((current) => current.map((slot, index) => (index === slotIndex ? null : slot)))
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
    setSelectedGatherTarget('tree')
    setBatchQuantity(1)
    setMissingBatch(null)
    setIsRecipeModalOpen(false)
    setSelectedRecipeId(null)
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
          {equipped ? <PixelIcon id={equipped} /> : <span className={`equipment-placeholder equipment-${slotId}`} aria-hidden="true" />}
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
        <button type="button" className={page === 'guide' ? 'active' : ''} onClick={() => setPage('guide')}>
          <BookOpen size={18} />
          Guide
        </button>
      </section>

      {page === 'gather' && (
        <section className="tap-panel" aria-label="Manual gathering">
          <div className="gather-targets" aria-label="Gather targets">
            {gatherTargetOrder.map((targetId) => {
              const target = gatherTargets[targetId]
              const progress = state.gatherProgress[targetId] ?? 0
              return (
                <button
                  type="button"
                  className={selectedGatherTarget === targetId ? 'gather-target selected' : 'gather-target'}
                  onClick={() => setSelectedGatherTarget(targetId)}
                  key={targetId}
                >
                  <PixelIcon id={gatherTargetIcons[targetId]} />
                  <span>{target.name}</span>
                  <strong>{Math.max(0, target.maxHp - progress)}/{target.maxHp}</strong>
                </button>
              )
            })}
          </div>

          <div className="mine-face">
            <div className="gather-block" aria-hidden="true">
              <PixelIcon id={gatherTargetIcons[selectedGatherTarget]} />
            </div>
            <div>
              <h2>{currentTarget.name}</h2>
              <p>{currentTarget.description}</p>
            </div>
            <div className="float-layer" aria-live="polite">
              {floatTexts.map((floatText) => (
                <span key={floatText.id}>{floatText.label}</span>
              ))}
            </div>
          </div>

          <div className="break-panel">
            <div className="break-stats">
              <span>
                Tool <strong>{currentTool.name}</strong>
              </span>
              <span>
                Drop <strong>{currentTarget.drops.map((drop) => `${drop.amount} ${resourceLabels[drop.id]}`).join(', ')}</strong>
              </span>
              <span>
                HP <strong>{targetRemainingHp}/{currentTarget.maxHp}</strong>
              </span>
              <span>
                Damage <strong>{currentDamage}</strong>
              </span>
            </div>
            <div className="progress-track">
              <span style={{ width: `${targetProgressPercent}%` }} />
            </div>
            {currentDamage < 1 && <p className="gather-warning">Requires {tools[currentTarget.preferredTool].name}</p>}
            <button type="button" className="hit-button" disabled={currentDamage < 1} onClick={handleGatherTarget}>
              {currentTool.id === 'woodenPickaxe' ? <Pickaxe size={20} /> : <Axe size={20} />}
              Mine {currentTarget.name}
            </button>
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
                  </button>
                )
              })
            ) : (
              <p className="empty-storage">No stored items</p>
            )}
          </div>

          {selectedResource && (
            <div className="item-tooltip" role="status">
              <strong>{resourceLabels[selectedResource]}</strong>
              <span>x{formatAmount(Math.max(0, selectedAvailable))}</span>
            </div>
          )}

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

          <details className="equipment-drawer">
            <summary>
              <Axe size={16} />
              Player Equipment
            </summary>
            <div className="equipment-layout" aria-label="Player equipment">
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
          </details>

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
                  {listedRecipes.map((recipe) => {
                    const output = recipePrimaryOutput(recipe)
                    const missing = missingLine(state, recipe)
                    return (
                      <button
                        type="button"
                        className={[
                          'recipe-icon-button',
                          recipe.id === selectedRecipe?.id ? 'selected' : '',
                          missing ? 'missing' : 'ready',
                        ].join(' ')}
                        aria-label={recipe.name}
                        title={recipe.name}
                        onClick={() => setSelectedRecipeId(recipe.id)}
                        key={recipe.id}
                      >
                        {output.kind === 'resource' ? <PixelIcon id={output.id} /> : <MachineGlyph id={output.id} />}
                        <span className="item-count">{formatAmount(output.amount)}</span>
                      </button>
                    )
                  })}
                  </div>

                  {selectedRecipe && selectedRecipeOutput && selectedRecipeMissing && (
                    <aside className="recipe-detail" aria-label={`${selectedRecipe.name} details`}>
                      <div className="recipe-detail-head">
                        <div>
                          <p className="eyebrow">{selectedRecipe.tier}</p>
                          <h3>{selectedRecipe.name}</h3>
                        </div>
                        <span className={selectedRecipeMissingLine ? 'mini-slot muted' : 'mini-slot'}>
                          {selectedRecipeOutput.kind === 'resource' ? (
                            <PixelIcon id={selectedRecipeOutput.id} />
                          ) : (
                            <MachineGlyph id={selectedRecipeOutput.id} />
                          )}
                          <span className="item-count">{formatAmount(selectedRecipeOutput.amount)}</span>
                        </span>
                      </div>

                      <div className="recipe-slot-section">
                        <span>Inputs</span>
                        <div className="recipe-slot-row">
                          {selectedRecipe.inputs.map((amount) => {
                            const missing = selectedRecipeMissing.missingResources.some((item) => item.id === amount.id)
                            return <ItemSlot amount={amount} disabled={missing} key={amount.id} />
                          })}
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

                      <div className="recipe-slot-section">
                        <span>Outputs</span>
                        <div className="recipe-slot-row">
                          {selectedRecipe.outputs.map((amount) => (
                            <ItemSlot amount={amount} key={amount.id} />
                          ))}
                          {selectedRecipe.machineOutputs?.map((amount) => (
                            <MachineSlot id={amount.id} amount={amount.amount} key={amount.id} />
                          ))}
                        </div>
                      </div>

                      {selectedRecipeMissingLine && <p className="missing-line">Missing {selectedRecipeMissingLine}</p>}
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
