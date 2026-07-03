import {
  Axe,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Check,
  Database,
  Download,
  Factory,
  Pickaxe,
  Save,
  Sparkles,
  Toolbox,
  Trash2,
  Undo2,
  Upload,
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
import {
  fuelDefinitions,
  gatherTargets,
  canAutoMinerTarget,
  isAutoMinerMachine,
  isEuCableMachine,
  isEuBlastMachine,
  isEuNetworkMachine,
  isEuPoweredMachine,
  isEuProducerMachine,
  isEuStorageMachine,
  isLiquidSteamBoilerMachine,
  isPlaceableMachine,
  isSteamNetworkMachine,
  isSteamPipeMachine,
  isSteamPoweredMachine,
  machines,
  processRecipes,
  questChapters,
  quests as questDefinitions,
  recipes,
  resourceLabels,
  tools,
} from './game/content'
import {
  availableResourceAmount,
  availableUnplacedMachineCount,
  availableConnectedEu,
  availableConnectedEuStorage,
  availableConnectedSteam,
  assignAutoMiner,
  boilerSteamProductionLitresPerSecond,
  boilerHasWater,
  boilerSteamCapacityMs,
  cokeOvenFluidCapacityLitres,
  canCrowbarRemoveMachine,
  canCraft,
  claimQuestReward,
  collectProcessOutput,
  createCreativeState,
  craftableQuantity,
  craftRecipeInstant,
  equipResource,
  equipmentSlots,
  equipmentSlotAccepts,
  expandFactoryFloor,
  findGridRecipe,
  factoryFoundationCost,
  factoryFoundationSizes,
  factoryGridForState,
  getBestToolForTarget,
  hasFactoryFloor,
  hitGatherTarget,
  isAutoMinerPowered,
  insertProcessSlot,
  loadGame,
  simulateOfflineProgress,
  makeGridForRecipe,
  maxDurability,
  missingForQuantity,
  missingForRecipe,
  machinesCanConnect,
  multiblockControllerForInstance,
  placeMachineInstance,
  pipeDirections,
  processStackLimit,
  questProgress,
  questObjectiveProgress,
  questObjectives,
  questStatus,
  recipeFitsTerminalGrid,
  recipesUsingInput,
  removeProcessSlot,
  searchTerminalRecipes,
  steamMaceratorCapacityMs,
  steamMachineInternalCapacityMs,
  steamAutoMinerActionDamage,
  steamAutoMinerActionMs,
  steamAutoMinerSteamUseLitres,
  steamPipeTransferLitresPerSecond,
  steamTurbineEuCapacity,
  steamTurbineSteamUseLitresPerSecond,
  steamTankCapacityMs,
  lvBatteryBufferEuCapacity,
  lvBatteryBufferOutputEuPerSecond,
  liquidSteamBoilerCapacityMs,
  liquidSteamBoilerCreosoteUseLitresPerSecond,
  liquidSteamBoilerFluidCapacityLitres,
  liquidSteamBoilerSteamProductionLitresPerSecond,
  tinCableLossEuPerTile,
  lvAutoMinerActionDamage,
  lvAutoMinerActionMs,
  lvAutoMinerEuUse,
  ironTankFluidCapacityLitres,
  canExpandFactoryFloor,
  terminalAvailableAmount,
  tickGame,
  togglePipeSideDisabled,
  unassignAutoMiner,
  unequipSlot,
  visibleQuests,
  visibleRecipes,
  durabilityRemaining,
  crowbarRemoveMachineInstance,
} from './game/engine'
import {
  defaultSaveSlotId,
  listSaveSlots,
  clearSavedGame,
  exportSavedGame,
  importSavedGame,
  loadSavedGame,
  loadSavedGameWithOfflineProgress,
  persistGameState,
  renameSaveSlot,
  type SaveSlotId,
  type SaveSlotSummary,
} from './game/saveStorage'
import { deploymentInfo, hasNewerDeployment, reloadLatestDeployment } from './game/deployment'
import { localTimeProvider } from './game/time'
import {
  groupRecipesByOutput,
  recipeGroupKeyForOutput,
  recipeGroupOutput,
  type RecipeGroup,
} from './game/recipeGroups'
import { formatAmount, formatDuration, formatLitres, formatSteamLitres } from './game/format'
import { GatherTapArt, MachineGlyph, PixelIcon, type PipeConnections } from './components/GameIcons'
import { preloadGeneratedIconImages } from './components/gameIconAssets'
import { IconSpriteDefs } from './components/iconSprites'
import { DurabilityBar, ItemSlot, MachineSlot, ProcessItemSlot } from './components/InventorySlots'
import type {
  CraftSlot,
  EquipmentSlotId,
  GatherTargetId,
  GameState,
  MachineId,
  MachineInstance,
  OfflineProgressResult,
  PipeDirection,
  ProcessSlot,
  ProcessSlotId,
  Quest,
  QuestChapterId,
  QuestId,
  Recipe,
  ResourceAmount,
  ResourceId,
} from './game/types'

type FloatText = {
  id: number
  label: string
  variant?: 'break' | 'particle'
  targetId?: GatherTargetId
}

type AchievementToast = {
  id: number
  questId: QuestId
  title: string
}

type Page = 'home' | 'gather' | 'terminal' | 'processing' | 'guide'
type TerminalMode = 'recipes' | 'uses'
type DragPreview = { id: ResourceId; x: number; y: number }
type FactoryPan = { x: number; y: number }
type NavigationSnapshot = {
  page: Page
  gatherArea: GatherAreaId
  terminalMode: TerminalMode
  recipeSearch: string
  selectedResource: ResourceId | null
  selectedMachineUid: string | null
  selectedPipeConfigUid: string | null
  selectedQuestId: QuestId | null
  selectedRecipeGroupKey: string | null
  selectedRecipeIndex: number
  isRecipeModalOpen: boolean
  isFactoryExpandModalOpen: boolean
}
type PendingProcessInsert = {
  uid: string
  slotId: Exclude<ProcessSlotId, 'output'>
  resourceId: ResourceId
  quantity: number
}

type RecipeDisplayOutput =
  | { kind: 'resource'; id: ResourceId; amount: number; label: string }
  | { kind: 'machine'; id: MachineId; amount: number; label: string }

const autoSaveIntervalMs = 5000
const machineOrder: MachineId[] = [
  'furnace',
  'well',
  'steamBoiler',
  'steamTank',
  'copperPipe',
  'bronzePipe',
  'ironPipe',
  'steamMacerator',
  'steamForgeHammer',
  'steamCompressor',
  'steamExtractor',
  'steamAlloySmelter',
  'steamFurnace',
  'steamAutoMiner',
  'steamTurbine',
  'tinCable',
  'lvBatteryBuffer',
  'liquidSteamBoiler',
  'lvWiremill',
  'lvBender',
  'lvLathe',
  'lvElectrolyzer',
  'lvAssembler',
  'lvCentrifuge',
  'lvAutoMiner',
  'cokeOven',
  'brickedBlastFurnacePart',
  'brickedBlastFurnace',
  'arcBlastFurnacePart',
  'arcBlastFurnace',
]
const placeableFactoryMachineOrder = machineOrder.filter(isPlaceableMachine)
const factoryToolOrder: ResourceId[] = ['ironCrowbar', 'bronzeWrench', 'ironWrench']

const pipeDirectionOffsets: Record<PipeDirection, { dx: number; dy: number; label: string }> = {
  north: { dx: 0, dy: -1, label: 'North' },
  east: { dx: 1, dy: 0, label: 'East' },
  south: { dx: 0, dy: 1, label: 'South' },
  west: { dx: -1, dy: 0, label: 'West' },
}

const resourceOrder = Object.keys(resourceLabels) as ResourceId[]

type GatherAreaId = 'forest' | 'lake' | 'mine'

const gatherAreas: Array<{ id: GatherAreaId; label: string; targets: GatherTargetId[] }> = [
  { id: 'forest', label: 'Forest', targets: ['tree', 'rubberTree'] },
  { id: 'lake', label: 'Lake', targets: ['sandPatch', 'clayPatch', 'gravelPatch'] },
  { id: 'mine', label: 'Mine', targets: ['stone', 'ironVein', 'copperVein', 'tinVein', 'nickelVein', 'bauxiteVein', 'redstoneVein', 'coalSeam'] },
]
const gatherTargetIcons: Record<GatherTargetId, ResourceId> = {
  tree: 'log',
  rubberTree: 'rubberSap',
  stone: 'cobblestone',
  clayPatch: 'clay',
  sandPatch: 'sand',
  ironVein: 'ironOre',
  gravelPatch: 'gravel',
  copperVein: 'copperOre',
  tinVein: 'tinOre',
  nickelVein: 'nickelOre',
  bauxiteVein: 'bauxiteOre',
  redstoneVein: 'redstoneDust',
  coalSeam: 'coal',
}
const craftSlotHitboxScale = 0.64

function isCenteredCraftSlotHit(element: HTMLElement, clientX: number, clientY: number) {
  const rect = element.getBoundingClientRect()
  if (rect.width < 1 || rect.height < 1) return false

  const activeWidth = rect.width * craftSlotHitboxScale
  const activeHeight = rect.height * craftSlotHitboxScale
  const left = rect.left + (rect.width - activeWidth) / 2
  const top = rect.top + (rect.height - activeHeight) / 2

  return clientX >= left && clientX <= left + activeWidth && clientY >= top && clientY <= top + activeHeight
}

function saveSlotsFallbackLabel(slotId: SaveSlotId) {
  return `Save ${slotId.replace('slot-', '')}`
}

function formatOfflineDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h`
  return `${Math.max(1, minutes)}m`
}

function offlineProgressNotice(offline: OfflineProgressResult) {
  if (offline.reason === 'new-save' || offline.reason === 'no-elapsed-time') return ''
  if (offline.reason === 'missing-save-time') return 'Offline progress will start from now for this older save.'
  if (offline.suspicious) return 'Offline progress skipped because the device clock changed unexpectedly.'
  if (!offline.applied || offline.simulatedMs < 60_000) return ''

  const resourceLine = offline.resourceDelta
    .slice()
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .map((amount) => `+${formatAmount(amount.amount)} ${resourceLabels[amount.id]}`)
    .join(', ')
  const questLine = offline.questCompletions
    .map((questId) => questDefinitions.find((quest) => quest.id === questId)?.title)
    .filter(Boolean)
    .slice(0, 2)
    .join(', ')
  const parts = [
    `Offline progress: ${formatOfflineDuration(offline.simulatedMs)} simulated${offline.capped ? ' (capped)' : ''}.`,
    resourceLine ? `Produced ${resourceLine}.` : '',
    questLine ? `Quests completed: ${questLine}.` : '',
  ].filter(Boolean)
  return parts.join(' ')
}

function isMobileClientAllowed() {
  if (import.meta.env.DEV) return true
  if (typeof window === 'undefined') return true

  const userAgent = window.navigator.userAgent
  const maxTouchPoints = window.navigator.maxTouchPoints ?? 0
  const mobileUserAgent = /Android|iPhone|iPod|IEMobile|Mobile|CriOS|FxiOS/i.test(userAgent)
  const iPadOs = /Macintosh/i.test(userAgent) && maxTouchPoints > 1
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const compactScreen = Math.min(window.screen.width, window.screen.height) <= 900

  return compactScreen && (mobileUserAgent || iPadOs || (coarsePointer && maxTouchPoints > 0))
}

function gatherAreaForResource(resourceId: ResourceId) {
  const target = Object.values(gatherTargets).find((candidate) => candidate.drops.some((drop) => drop.id === resourceId))
  if (!target) return null
  const area = gatherAreas.find((candidate) => candidate.targets.includes(target.id))
  return area ? { areaId: area.id, targetId: target.id, targetName: target.name } : null
}

const factoryCellSize = 58
const factoryCellGap = 6
const factoryViewportPadding = 14
const factoryPanThreshold = 6

function factoryGridPixelSize(grid: { width: number; height: number }) {
  return {
    width: grid.width > 0 ? grid.width * factoryCellSize + Math.max(0, grid.width - 1) * factoryCellGap : 0,
    height: grid.height > 0 ? grid.height * factoryCellSize + Math.max(0, grid.height - 1) * factoryCellGap : 0,
  }
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

function isFactoryFloorLayoutRecipe(recipe: Recipe) {
  return recipe.id === 'build_bricked_blast_furnace' || recipe.id === 'build_arc_blast_furnace'
}

function FactoryFloorLayoutPreview({ recipe }: { recipe: Recipe }) {
  if (!isFactoryFloorLayoutRecipe(recipe)) return null
  const machineId = recipe.id === 'build_arc_blast_furnace' ? 'arcBlastFurnace' : 'brickedBlastFurnace'
  const partId = recipe.id === 'build_arc_blast_furnace' ? 'arcBlastFurnacePart' : 'brickedBlastFurnacePart'
  const label = recipe.id === 'build_arc_blast_furnace' ? 'heat-proof casings' : 'BBF Casings'

  return (
    <div className="factory-layout-preview" aria-label={`${recipe.name} factory floor layout`}>
      <div className="factory-layout-multiblock">
        <MachineGlyph id={machineId} />
        {Array.from({ length: 4 }, (_, index) => (
          <span className={index === 0 ? 'factory-layout-cell controller' : 'factory-layout-cell'} key={index}>
            <MachineGlyph id={index === 0 ? machineId : partId} />
          </span>
        ))}
      </div>
      <p>Place 4 {label} as a 2x2 on the factory floor.</p>
    </div>
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

function SteamTank({ storedMs, capacityMs }: { storedMs: number; capacityMs: number }) {
  const storedLitres = formatSteamLitres(storedMs)
  const capacityLitres = formatSteamLitres(capacityMs)
  const fillPercent = capacityMs > 0 ? Math.max(0, Math.min(100, (storedMs / capacityMs) * 100)) : 0

  return (
    <div className="steam-tank" aria-label={`Steam tank ${storedLitres} of ${capacityLitres} litres`}>
      <div className="steam-tank-gauge">
        <span style={{ height: `${fillPercent}%` }} />
      </div>
      <div className="steam-tank-readout">
        <span>Steam tank</span>
        <strong>{storedLitres}L</strong>
        <small>{capacityLitres}L max</small>
      </div>
    </div>
  )
}

function FluidTank({ label, storedLitres, capacityLitres }: { label: string; storedLitres: number; capacityLitres: number }) {
  const fillPercent = capacityLitres > 0 ? Math.max(0, Math.min(100, (storedLitres / capacityLitres) * 100)) : 0
  return (
    <div className="steam-tank fluid-tank" aria-label={`${label} ${storedLitres} of ${capacityLitres} litres`}>
      <div className="steam-tank-gauge fluid-tank-gauge">
        <span style={{ height: `${fillPercent}%` }} />
      </div>
      <div className="steam-tank-readout">
        <span>{label}</span>
        <strong>{formatLitres(storedLitres)}L</strong>
        <small>{formatLitres(capacityLitres)}L max</small>
      </div>
    </div>
  )
}

function EnergyTank({ storedEu, capacityEu }: { storedEu: number; capacityEu: number }) {
  const stored = Math.floor(storedEu)
  const capacity = Math.floor(capacityEu)
  const fillPercent = capacityEu > 0 ? Math.max(0, Math.min(100, (storedEu / capacityEu) * 100)) : 0

  return (
    <div className="steam-tank energy-tank" aria-label={`EU buffer ${stored} of ${capacity}`}>
      <div className="steam-tank-gauge energy-tank-gauge">
        <span style={{ height: `${fillPercent}%` }} />
      </div>
      <div className="steam-tank-readout">
        <span>EU buffer</span>
        <strong>{stored} EU</strong>
        <small>{capacity} EU max</small>
      </div>
    </div>
  )
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

function missingResourceLine(state: GameState, costs: ResourceAmount[]) {
  return costs
    .filter((amount) => availableResourceAmount(state, amount.id) < amount.amount)
    .map((amount) => `${amount.amount - availableResourceAmount(state, amount.id)} ${resourceLabels[amount.id]}`)
    .join(', ')
}

function canResourceEnterProcessSlot(machineId: MachineId, slotId: Exclude<ProcessSlotId, 'output'>, resourceId: ResourceId) {
  if (slotId === 'input') {
    return processRecipes.some(
      (recipe) =>
        recipe.machineId === machineId &&
        (recipe.input.id === resourceId || Boolean(recipe.secondaryInput && recipe.secondaryInput.id === resourceId)) &&
        (machineId !== 'steamAlloySmelter' || resourceId.endsWith('Ingot') || resourceId.endsWith('Dust')),
    )
  }
  if (slotId === 'secondaryInput') {
    return processRecipes.some(
      (recipe) =>
        recipe.machineId === machineId &&
        Boolean(recipe.secondaryInput) &&
        (recipe.input.id === resourceId || recipe.secondaryInput?.id === resourceId) &&
        (machineId !== 'steamAlloySmelter' || resourceId.endsWith('Ingot') || resourceId.endsWith('Dust')),
    )
  }
  if (machineId === 'brickedBlastFurnace') return processRecipes.some((recipe) => recipe.machineId === machineId && recipe.fuelInput?.id === resourceId)
  return (machineId === 'furnace' || machineId === 'steamBoiler') && resourceId in fuelDefinitions
}

function canResourceEnterMachine(machineId: MachineId, resourceId: ResourceId) {
  return canResourceEnterProcessSlot(machineId, 'input', resourceId) || canResourceEnterProcessSlot(machineId, 'fuel', resourceId)
}

function suggestedProcessInsertQuantity(
  instance: MachineInstance,
  slotId: Exclude<ProcessSlotId, 'output'>,
  resourceId: ResourceId,
  available: number,
) {
  const currentAmount = instance.process[slotId]?.id === resourceId ? instance.process[slotId]?.amount ?? 0 : 0
  const candidates = processRecipes.filter((recipe) => recipe.machineId === instance.machineId)
  const recipe =
    slotId === 'fuel'
      ? candidates.find((candidate) => candidate.fuelInput?.id === resourceId)
      : candidates.find((candidate) => candidate.input.id === resourceId || candidate.secondaryInput?.id === resourceId)
  const required =
    slotId === 'fuel'
      ? recipe?.fuelInput?.amount
      : recipe?.input.id === resourceId
        ? recipe.input.amount
        : recipe?.secondaryInput?.id === resourceId
          ? recipe.secondaryInput.amount
          : undefined
  const wanted = required ? Math.max(1, required - currentAmount) : 1
  return Math.max(1, Math.min(wanted, available, processStackLimit - currentAmount))
}

function processSlotCanPay(slot: ProcessSlot, amount: ResourceAmount) {
  return Boolean(slot && slot.id === amount.id && slot.amount >= amount.amount)
}

function findSelectedProcessRecipe(instance: MachineInstance | null) {
  if (!instance?.process.input) return undefined
  return processRecipes.find((recipe) => {
    if (recipe.machineId !== instance.machineId) return false
    if (!recipe.secondaryInput) return !instance.process.secondaryInput && processSlotCanPay(instance.process.input, recipe.input)
    if (!instance.process.secondaryInput) return false
    return (
      (processSlotCanPay(instance.process.input, recipe.input) && processSlotCanPay(instance.process.secondaryInput, recipe.secondaryInput)) ||
      (processSlotCanPay(instance.process.input, recipe.secondaryInput) && processSlotCanPay(instance.process.secondaryInput, recipe.input))
    )
  })
}

function machineUsesProcessStorage(machineId: MachineId) {
  if (isAutoMinerMachine(machineId)) return false
  return (
    machineId === 'furnace' ||
    machineId === 'steamBoiler' ||
    machineId === 'cokeOven' ||
    machineId === 'brickedBlastFurnace' ||
    machineId === 'arcBlastFurnace' ||
    isSteamPoweredMachine(machineId) ||
    isEuPoweredMachine(machineId)
  )
}

function machineStatus(state: GameState, instance: MachineInstance) {
  const process = instance.process
  const recipe = findSelectedProcessRecipe(instance)
  if (instance.machineId === 'well') return 'Supplying water'
  if (instance.machineId === 'steamTank') {
    if ((process.fluids.creosote ?? 0) > 0) return 'Holding creosote'
    if ((process.fluids.water ?? 0) > 0) return 'Holding water'
    return process.steamStoredMs > 0 ? 'Holding steam' : 'Empty tank'
  }
  if (isSteamPipeMachine(instance.machineId)) return `${steamPipeTransferLitresPerSecond[instance.machineId] ?? 0}L/s transfer`
  if (isEuCableMachine(instance.machineId)) return `${tinCableLossEuPerTile} EU/tile loss`
  if (isEuStorageMachine(instance.machineId)) {
    if (process.euStored >= (process.euCapacity || lvBatteryBufferEuCapacity)) return 'EU buffer full'
    return process.activeRecipeId ? 'Charging EU' : 'Buffer ready'
  }
  if (isLiquidSteamBoilerMachine(instance.machineId)) {
    if ((process.fluids.creosote ?? 0) < 1) return 'No creosote'
    if (process.steamStoredMs >= liquidSteamBoilerCapacityMs) return 'Steam full'
    return process.activeRecipeId ? 'Burning creosote' : 'Ready'
  }
  if (isEuProducerMachine(instance.machineId)) {
    if (process.euStored >= steamTurbineEuCapacity) return 'EU full'
    if (availableConnectedSteam(state, instance) < 1) return 'No steam'
    return process.activeRecipeId ? 'Generating EU' : 'Ready'
  }
  if (isAutoMinerMachine(instance.machineId)) {
    const assignedTarget = state.autoMinerAssignments[instance.uid]
    if (!assignedTarget) return 'No assignment'
    if (!isAutoMinerPowered(state, instance)) return 'No power'
    return process.activeRecipeId ? `Mining ${gatherTargets[assignedTarget].name}` : 'Ready'
  }
  if (instance.machineId === 'steamBoiler') {
    if (!boilerHasWater(state, instance)) return 'No water'
    if (process.steamStoredMs >= boilerSteamCapacityMs && process.fuelRemainingMs > 0) return 'Venting full tank'
    if (process.steamStoredMs >= boilerSteamCapacityMs) return 'Steam full'
    if (!process.fuel && process.fuelRemainingMs < 1) return 'No fuel'
    return process.fuelRemainingMs > 0 ? 'Making steam' : 'Ready'
  }
  if (instance.machineId === 'cokeOven') {
    if (!recipe) return 'No input'
    if (process.output && recipe && (process.output.id !== recipe.output.id || process.output.amount + recipe.output.amount > processStackLimit)) return 'Output full'
    if (recipe.fluidOutput && (process.fluids[recipe.fluidOutput.id] ?? 0) + recipe.fluidOutput.amount > (process.fluidCapacityLitres || cokeOvenFluidCapacityLitres)) {
      return 'Creosote full'
    }
    return process.activeRecipeId ? 'Coking' : 'Ready'
  }
  if (instance.machineId === 'brickedBlastFurnace') {
    const inputRecipe = process.input
      ? processRecipes.find((candidate) => candidate.machineId === instance.machineId && candidate.input.id === process.input?.id)
      : undefined
    if (!inputRecipe) return 'Needs iron'
    if (process.input && process.input.amount < inputRecipe.input.amount) return `Needs ${inputRecipe.input.amount} ${resourceLabels[inputRecipe.input.id]}`
    const blastRecipe = process.fuel
      ? processRecipes.find(
          (candidate) =>
            candidate.machineId === instance.machineId &&
            candidate.input.id === process.input?.id &&
            candidate.fuelInput?.id === process.fuel?.id,
        )
      : undefined
    if (!blastRecipe) return 'Needs coke'
    if (blastRecipe.fuelInput && (!process.fuel || process.fuel.amount < blastRecipe.fuelInput.amount)) {
      return `Needs ${blastRecipe.fuelInput.amount} ${resourceLabels[blastRecipe.fuelInput.id]}`
    }
    if (process.output && (process.output.id !== blastRecipe.output.id || process.output.amount + blastRecipe.output.amount > processStackLimit)) return 'Output full'
    return process.activeRecipeId ? 'Blasting' : 'Ready'
  }
  if (instance.machineId === 'arcBlastFurnace') {
    if (!recipe) return 'No input'
    if (process.output && recipe && (process.output.id !== recipe.output.id || process.output.amount + recipe.output.amount > processStackLimit)) return 'Output full'
    const minimumEuStored = recipe.minimumEuStored ?? 0
    if (minimumEuStored > 0 && process.progressMs === 0 && process.euStored + availableConnectedEuStorage(state, instance) < minimumEuStored) return 'Waiting for buffer'
    if (process.euStored + availableConnectedEu(state, instance) < 1) return 'Underpowered'
    return process.activeRecipeId ? 'Blasting' : 'Ready'
  }
  if (isSteamPoweredMachine(instance.machineId)) {
    if (!recipe) return 'No input'
    if (process.output && recipe && (process.output.id !== recipe.output.id || process.output.amount + recipe.output.amount > processStackLimit)) return 'Output full'
    if (process.steamStoredMs + availableConnectedSteam(state, instance) < 1) return 'No steam'
    return process.activeRecipeId ? 'Running' : 'Ready'
  }
  if (isEuPoweredMachine(instance.machineId)) {
    if (!recipe) return 'No input'
    if (process.output && recipe && (process.output.id !== recipe.output.id || process.output.amount + recipe.output.amount > processStackLimit)) return 'Output full'
    if (process.euStored + availableConnectedEu(state, instance) < 1) return 'No power'
    return process.activeRecipeId ? 'Running' : 'Ready'
  }
  if (!recipe) return 'No input'
  if (process.output && recipe && (process.output.id !== recipe.output.id || process.output.amount + recipe.output.amount > processStackLimit)) return 'Output full'
  if (!process.fuel && process.fuelRemainingMs < 1) return 'No fuel'
  return process.activeRecipeId ? 'Smelting' : 'Ready'
}

function hasResourceUnlocked(state: GameState, resourceId: ResourceId) {
  return state.craftedResources.includes(resourceId) || state.resources[resourceId] > 0 || Object.values(state.equipment).includes(resourceId)
}

function hasToolTierUnlocked(state: GameState, resourceId: ResourceId) {
  if (resourceId === 'woodenShovel') return (['woodenShovel', 'stoneShovel', 'ironShovel'] satisfies ResourceId[]).some((id) => hasResourceUnlocked(state, id))
  if (resourceId === 'stoneShovel') return (['stoneShovel', 'ironShovel'] satisfies ResourceId[]).some((id) => hasResourceUnlocked(state, id))
  if (resourceId === 'woodenPickaxe') return (['woodenPickaxe', 'stonePickaxe', 'ironPickaxe'] satisfies ResourceId[]).some((id) => hasResourceUnlocked(state, id))
  if (resourceId === 'stonePickaxe') return (['stonePickaxe', 'ironPickaxe'] satisfies ResourceId[]).some((id) => hasResourceUnlocked(state, id))
  if (resourceId === 'woodenAxe') return (['woodenAxe', 'stoneAxe', 'ironAxe'] satisfies ResourceId[]).some((id) => hasResourceUnlocked(state, id))
  if (resourceId === 'stoneAxe') return (['stoneAxe', 'ironAxe'] satisfies ResourceId[]).some((id) => hasResourceUnlocked(state, id))
  return hasResourceUnlocked(state, resourceId)
}

function isGatherTargetVisible(state: GameState, targetId: GatherTargetId) {
  if (targetId === 'tree') return true
  if (targetId === 'rubberTree') return hasToolTierUnlocked(state, 'treeTap')
  if (targetId === 'clayPatch') return hasToolTierUnlocked(state, 'woodenShovel')
  if (targetId === 'sandPatch') return hasToolTierUnlocked(state, 'woodenShovel')
  if (targetId === 'gravelPatch') return hasToolTierUnlocked(state, 'woodenShovel')
  if (targetId === 'stone') {
    return hasToolTierUnlocked(state, 'woodenPickaxe') || hasToolTierUnlocked(state, 'stonePickaxe') || hasToolTierUnlocked(state, 'ironPickaxe')
  }
  if (targetId === 'ironVein') {
    return hasToolTierUnlocked(state, 'stonePickaxe') || hasToolTierUnlocked(state, 'ironPickaxe')
  }
  return hasToolTierUnlocked(state, 'ironPickaxe')
}

function QuestIcon({ quest, muted = false }: { quest: Quest; muted?: boolean }) {
  const icon = quest.icon
  return (
    <span className={muted ? 'quest-icon-art muted' : 'quest-icon-art'}>
      {icon?.type === 'machine' ? (
        <MachineGlyph id={icon.id} />
      ) : icon?.type === 'gather' ? (
        <PixelIcon id={gatherTargetIcons[icon.id]} />
      ) : (
        <PixelIcon id={icon?.id ?? quest.requirements.resources?.[0]?.id ?? 'log'} />
      )}
    </span>
  )
}

function questStatusText(status: ReturnType<typeof questStatus>) {
  if (status === 'completed') return 'Complete'
  if (status === 'ready') return 'Ready'
  if (status === 'available') return 'Open'
  return 'Locked'
}

function QuestObjectiveRow({
  progress,
  state,
  onSelectResource,
  onSelectMachine,
}: {
  progress: ReturnType<typeof questObjectiveProgress>
  state: GameState
  onSelectResource: (resourceId: ResourceId) => void
  onSelectMachine: (machineId: MachineId) => void
}) {
  const { objective } = progress
  const current = Math.min(progress.current, progress.required)
  const amountLabel = `${formatAmount(current)}/${formatAmount(progress.required)}`
  const actionLabel = progress.complete ? 'Completed' : amountLabel

  if (objective.type === 'resource') {
    return (
      <button type="button" className={progress.complete ? 'quest-objective complete' : 'quest-objective'} onClick={() => onSelectResource(objective.id)}>
        <ItemSlot amount={{ id: objective.id, amount: objective.amount }} disabled={!progress.complete} state={state} />
        <span>{progress.label}</span>
        <strong>{actionLabel}</strong>
      </button>
    )
  }

  if (objective.type === 'machine' || objective.type === 'placedMachine') {
    return (
      <button type="button" className={progress.complete ? 'quest-objective complete' : 'quest-objective'} onClick={() => onSelectMachine(objective.id)}>
        <MachineSlot id={objective.id} amount={objective.amount} muted={!progress.complete} />
        <span>{progress.label}</span>
        <strong>{actionLabel}</strong>
      </button>
    )
  }

  return (
    <div className={progress.complete ? 'quest-objective complete' : 'quest-objective'}>
      <span className="mini-slot">
        <Factory size={18} />
      </span>
      <span>{progress.label}</span>
      <strong>{actionLabel}</strong>
    </div>
  )
}

function QuestDetail({
  quest,
  state,
  onClose,
  onClaim,
  onSelectResource,
  onSelectMachine,
}: {
  quest: Quest
  state: GameState
  onClose: () => void
  onClaim: (questId: QuestId) => void
  onSelectResource: (resourceId: ResourceId) => void
  onSelectMachine: (machineId: MachineId) => void
}) {
  const status = questStatus(state, quest)
  const claimed = state.claimedQuests.includes(quest.id)
  const claimReady = status === 'completed' && !claimed
  const progressRows = questObjectives(quest).map((objective) => questObjectiveProgress(state, objective))

  return (
    <div className="modal-backdrop compact-backdrop" role="presentation" onClick={onClose}>
      <section className="missing-modal quest-detail-modal" role="dialog" aria-modal="true" aria-label={quest.title} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">{quest.chapter}</p>
            <h2>{quest.title}</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close quest" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className={`quest-detail-hero ${status}`}>
          <span className="quest-detail-icon">
            <QuestIcon quest={quest} muted={status === 'locked'} />
          </span>
          <div>
            <strong>{questStatusText(status)}</strong>
            <p>{quest.description}</p>
          </div>
        </div>
        <div className="progress-track quest-progress">
          <span style={{ width: `${questProgress(state, quest) * 100}%` }} />
        </div>
        <div className="quest-objective-list">
          {progressRows.map((progress) => (
            <QuestObjectiveRow
              progress={progress}
              state={state}
              onSelectResource={onSelectResource}
              onSelectMachine={onSelectMachine}
              key={`${progress.objective.type}-${'id' in progress.objective ? progress.objective.id : progress.objective.level}`}
            />
          ))}
        </div>
        <button
          type="button"
          className={claimReady ? 'load-recipe-button quest-claim-button unclaimed' : 'load-recipe-button quest-claim-button'}
          disabled={!claimReady}
          onClick={() => onClaim(quest.id)}
        >
          {claimed ? 'Reward claimed' : status === 'completed' ? 'Claim reward' : 'Reward locked'}
        </button>
      </section>
    </div>
  )
}

function QuestBook({
  quests,
  state,
  activeChapterId,
  selectedQuestId,
  onSelectChapter,
  onSelectQuest,
}: {
  quests: Quest[]
  state: GameState
  activeChapterId: QuestChapterId
  selectedQuestId: QuestId | null
  onSelectChapter: (chapterId: QuestChapterId) => void
  onSelectQuest: (questId: QuestId) => void
}) {
  const chapter = questChapters.find((candidate) => candidate.id === activeChapterId) ?? questChapters[0]
  const chapterQuests = quests.filter((quest) => (quest.chapterId ?? 'gettingStarted') === chapter.id)
  const questById = new Map(quests.map((quest) => [quest.id, quest]))
  const nodeWidth = 142
  const nodeHeight = 74
  const mapMargin = 16
  const questXs = chapterQuests.map((quest) => quest.position?.x ?? 0)
  const questYs = chapterQuests.map((quest) => quest.position?.y ?? 0)
  const offsetX = mapMargin - (questXs.length ? Math.min(...questXs) : 0)
  const offsetY = mapMargin - (questYs.length ? Math.min(...questYs) : 0)
  const questX = (quest: Quest) => (quest.position?.x ?? 0) + offsetX
  const questY = (quest: Quest) => (quest.position?.y ?? 0) + offsetY
  const mapWidth = Math.max(360, ...chapterQuests.map((quest) => questX(quest) + nodeWidth + mapMargin))
  const mapHeight = Math.max(160, ...chapterQuests.map((quest) => questY(quest) + nodeHeight + mapMargin))

  return (
    <>
      <div className="quest-chapter-tabs" aria-label="Quest chapters">
        {questChapters.map((candidate) => (
          <button
            type="button"
            className={candidate.id === chapter.id ? 'active' : ''}
            onClick={() => onSelectChapter(candidate.id)}
            key={candidate.id}
          >
            {candidate.title}
          </button>
        ))}
      </div>
      <div className="quest-book-head">
        <div>
          <p className="eyebrow">Quest book</p>
          <h2>{chapter.title}</h2>
        </div>
        <p>{chapter.description}</p>
      </div>
      <div className="quest-map-scroll" aria-label={`${chapter.title} quest map`}>
        <div className="quest-map" style={{ width: mapWidth, height: mapHeight }}>
          <svg className="quest-lines" viewBox={`0 0 ${mapWidth} ${mapHeight}`} aria-hidden="true">
            {chapterQuests.flatMap((quest) =>
              (quest.prerequisites ?? []).map((parentId) => {
                const parent = questById.get(parentId)
                if (!parent || (parent.chapterId ?? 'gettingStarted') !== chapter.id || !parent.position || !quest.position) return null
                const parentStatus = questStatus(state, parent)
                const childStatus = questStatus(state, quest)
                const className = parentStatus === 'completed' && childStatus !== 'locked' ? 'complete' : childStatus === 'locked' ? 'locked' : 'open'
                const startX = questX(parent) + nodeWidth
                const startY = questY(parent) + nodeHeight / 2
                const endX = questX(quest)
                const endY = questY(quest) + nodeHeight / 2
                const midX = startX + Math.max(24, (endX - startX) / 2)
                const path = `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`
                return (
                  <g key={`${parent.id}-${quest.id}`}>
                    <path className="quest-line-shadow" d={path} />
                    <path className={className} d={path} />
                    <rect className={`quest-line-joint ${className}`} x={startX - 3} y={startY - 3} width="6" height="6" />
                    <rect className={`quest-line-joint ${className}`} x={endX - 3} y={endY - 3} width="6" height="6" />
                  </g>
                )
              }),
            )}
          </svg>
          {chapterQuests.map((quest) => {
            const status = questStatus(state, quest)
            const selected = quest.id === selectedQuestId
            return (
              <button
                type="button"
                className={`quest-node ${status}${selected ? ' selected' : ''}`}
                style={{ left: questX(quest), minHeight: nodeHeight, top: questY(quest), width: nodeWidth }}
                onClick={() => onSelectQuest(quest.id)}
                key={quest.id}
              >
                <span className="quest-node-icon">
                  <QuestIcon quest={quest} muted={status === 'locked'} />
                </span>
                <span className="quest-node-title">{quest.title}</span>
                <span className="quest-node-state">{questStatusText(status)}</span>
                {status === 'available' && (
                  <span className="quest-node-progress" aria-hidden="true">
                    <span style={{ width: `${Math.round(questProgress(state, quest) * 100)}%` }} />
                  </span>
                )}
                {status === 'completed' && <Check size={14} />}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

function App() {
  const [state, setState] = useState<GameState>(() => loadGame(null))
  const [hasLoadedSave, setHasLoadedSave] = useState(false)
  const [floatTexts, setFloatTexts] = useState<FloatText[]>([])
  const [achievementToasts, setAchievementToasts] = useState<AchievementToast[]>([])
  const [page, setPage] = useState<Page>('home')
  const [selectedSaveSlotId, setSelectedSaveSlotId] = useState<SaveSlotId>(defaultSaveSlotId)
  const [saveSlotSummaries, setSaveSlotSummaries] = useState<SaveSlotSummary[]>([])
  const [saveNameDraft, setSaveNameDraft] = useState('')
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)
  const [isMobileClient, setIsMobileClient] = useState(() => isMobileClientAllowed())
  const [gatherArea, setGatherArea] = useState<GatherAreaId>('forest')
  const [terminalGrid, setTerminalGrid] = useState<CraftSlot[]>(() => Array.from({ length: 9 }, () => null))
  const [terminalSearch, setTerminalSearch] = useState('')
  const [recipeSearch, setRecipeSearch] = useState('')
  const [factoryMachineSearch, setFactoryMachineSearch] = useState('')
  const [terminalMode, setTerminalMode] = useState<TerminalMode>('recipes')
  const [selectedResource, setSelectedResource] = useState<ResourceId | null>(null)
  const [activeQuestChapterId, setActiveQuestChapterId] = useState<QuestChapterId>('gettingStarted')
  const [selectedQuestId, setSelectedQuestId] = useState<QuestId | null>(null)
  const [terminalNotice, setTerminalNotice] = useState('')
  const [offlineNotice, setOfflineNotice] = useState('')
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false)
  const [isFactoryExpandModalOpen, setIsFactoryExpandModalOpen] = useState(false)
  const [isCreativeMode, setIsCreativeMode] = useState(false)
  const [isEquipmentOpen, setIsEquipmentOpen] = useState(false)
  const [isFactoryToolboxOpen, setIsFactoryToolboxOpen] = useState(false)
  const [placingMachineId, setPlacingMachineId] = useState<MachineId | null>(null)
  const [selectedFactoryTool, setSelectedFactoryTool] = useState<ResourceId | null>(null)
  const [selectedMachineUid, setSelectedMachineUid] = useState<string | null>(null)
  const [selectedPipeConfigUid, setSelectedPipeConfigUid] = useState<string | null>(null)
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
  const [factoryPan, setFactoryPan] = useState<FactoryPan>({ x: 0, y: 0 })
  const [navigationStack, setNavigationStack] = useState<NavigationSnapshot[]>([])
  const [highlightedGatherTarget, setHighlightedGatherTarget] = useState<GatherTargetId | null>(null)
  const floatTextIdRef = useRef(0)
  const achievementToastIdRef = useRef(0)
  const knownCompletedQuestsRef = useRef(new Set<QuestId>(state.completedQuests))
  const stateRef = useRef(state)
  const selectedSaveSlotIdRef = useRef(selectedSaveSlotId)
  const hasLoadedSaveRef = useRef(hasLoadedSave)
  const isCreativeModeRef = useRef(isCreativeMode)
  const backgroundedAtRef = useRef<number | null>(null)
  const importSaveInputRef = useRef<HTMLInputElement | null>(null)
  const gatherHighlightTimeoutRef = useRef<number | null>(null)
  const pointerDragRef = useRef<{ id: ResourceId; startX: number; startY: number; dragged: boolean } | null>(null)
  const factoryViewportRef = useRef<HTMLDivElement | null>(null)
  const factoryPanDragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number; dragged: boolean } | null>(null)
  const suppressFactoryCellClickRef = useRef(false)
  const suppressClickRef = useRef(false)
  const isFactoryRemoveMode = selectedFactoryTool === 'ironCrowbar'
  const isFactoryPipeConfigMode = selectedFactoryTool === 'bronzeWrench' || selectedFactoryTool === 'ironWrench'

  const refreshSaveSlots = async () => {
    const slots = await listSaveSlots()
    setSaveSlotSummaries(slots)
    return slots
  }

  const pendingSaveRef = useRef<{ state: GameState; slotId: SaveSlotId } | null>(null)
  const saveTimerRef = useRef<number | null>(null)

  const cancelPendingSave = () => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    pendingSaveRef.current = null
  }

  const flushPendingSave = () => {
    const pending = pendingSaveRef.current
    cancelPendingSave()
    if (!pending) return
    void persistGameState(pending.state, pending.slotId).then(refreshSaveSlots)
  }

  const applyOfflineNotice = (offline: OfflineProgressResult) => {
    const notice = offlineProgressNotice(offline)
    if (notice) setOfflineNotice(notice)
  }

  const loadSlotIntoGame = async (slotId: SaveSlotId, applyOffline = true) => {
    const now = localTimeProvider.now()
    if (!applyOffline) {
      const loadedState = await loadSavedGame(slotId, now)
      stateRef.current = loadedState
      setState(loadedState)
      knownCompletedQuestsRef.current = new Set(loadedState.completedQuests)
      return loadedState
    }

    const { state: loadedState, offline } = await loadSavedGameWithOfflineProgress(slotId, now)
    stateRef.current = loadedState
    setState(loadedState)
    knownCompletedQuestsRef.current = new Set(loadedState.completedQuests)
    applyOfflineNotice(offline)
    if (offline.reason !== 'new-save' && (offline.applied || offline.suspicious || offline.reason === 'missing-save-time')) {
      await persistGameState(loadedState, slotId)
      await refreshSaveSlots()
    }
    return loadedState
  }

  const applyOfflineToCurrentState = () => {
    if (!hasLoadedSaveRef.current || isCreativeModeRef.current) return
    const now = localTimeProvider.now()
    const elapsedMs = now - stateRef.current.lastSavedAt
    if (elapsedMs < 60_000) return

    const { state: nextState, offline } = simulateOfflineProgress(stateRef.current, elapsedMs, now)
    if (!offline.applied && !offline.suspicious) return

    setState(nextState)
    stateRef.current = nextState
    applyOfflineNotice(offline)
    void persistGameState(nextState, selectedSaveSlotIdRef.current).then(refreshSaveSlots)
  }

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    selectedSaveSlotIdRef.current = selectedSaveSlotId
  }, [selectedSaveSlotId])

  useEffect(() => {
    hasLoadedSaveRef.current = hasLoadedSave
  }, [hasLoadedSave])

  useEffect(() => {
    isCreativeModeRef.current = isCreativeMode
  }, [isCreativeMode])

  useEffect(() => {
    void preloadGeneratedIconImages()
  }, [])

  useEffect(() => {
    const updateMobileGate = () => setIsMobileClient(isMobileClientAllowed())
    const pointerQuery = window.matchMedia('(pointer: coarse)')

    updateMobileGate()
    window.addEventListener('resize', updateMobileGate)
    window.addEventListener('orientationchange', updateMobileGate)
    pointerQuery.addEventListener('change', updateMobileGate)

    return () => {
      window.removeEventListener('resize', updateMobileGate)
      window.removeEventListener('orientationchange', updateMobileGate)
      pointerQuery.removeEventListener('change', updateMobileGate)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void loadSlotIntoGame(defaultSaveSlotId)
      .then(() => listSaveSlots())
      .then((slots) => {
        if (cancelled) return
        setSaveSlotSummaries(slots)
        setHasLoadedSave(true)
      })
      .catch(() => {
        if (!cancelled) setHasLoadedSave(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const checkForUpdate = async () => {
      try {
        if ((await hasNewerDeployment()) && !cancelled) setIsUpdateAvailable(true)
      } catch {
        // Update checks should never interrupt the game.
      }
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void checkForUpdate()
    }

    void checkForUpdate()
    window.addEventListener('focus', checkForUpdate)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    const interval = window.setInterval(checkForUpdate, 60_000)

    return () => {
      cancelled = true
      window.removeEventListener('focus', checkForUpdate)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setState((current) => {
        if (page === 'home') return current
        const ticked = tickGame(current, 250).state
        return isCreativeMode ? createCreativeState(ticked) : ticked
      })
    }, 250)

    return () => window.clearInterval(interval)
  }, [isCreativeMode, page])

  useEffect(() => {
    if (isUpdateAvailable && page === 'home') reloadLatestDeployment()
  }, [isUpdateAvailable, page])

  useEffect(() => {
    const selectedSlot = saveSlotSummaries.find((slot) => slot.id === selectedSaveSlotId)
    setSaveNameDraft(selectedSlot?.label ?? saveSlotsFallbackLabel(selectedSaveSlotId))
  }, [selectedSaveSlotId, saveSlotSummaries])

  useEffect(() => {
    if (!hasLoadedSave || isCreativeMode || page === 'home') return
    pendingSaveRef.current = { state, slotId: selectedSaveSlotId }
    if (saveTimerRef.current === null) {
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null
        flushPendingSave()
      }, autoSaveIntervalMs)
    }
  }, [hasLoadedSave, isCreativeMode, page, selectedSaveSlotId, state])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        backgroundedAtRef.current = localTimeProvider.now()
        flushPendingSave()
        return
      }
      if (document.visibilityState === 'visible' && backgroundedAtRef.current !== null) {
        backgroundedAtRef.current = null
        applyOfflineToCurrentState()
      }
    }
    window.addEventListener('pagehide', flushPendingSave)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', flushPendingSave)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      flushPendingSave()
    }
  }, [])

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
    if (selectedPipeConfigUid && !state.machineInstances.some((instance) => instance.uid === selectedPipeConfigUid)) {
      setSelectedPipeConfigUid(null)
    }
  }, [selectedPipeConfigUid, state.machineInstances])

  useEffect(() => {
    if (isFactoryRemoveMode && !canCrowbarRemoveMachine(state)) setSelectedFactoryTool(null)
  }, [isFactoryRemoveMode, state])

  useEffect(() => {
    if (!pendingProcessInsert) return
    const instance = state.machineInstances.find((candidate) => candidate.uid === pendingProcessInsert.uid)
    const slot = instance?.process[pendingProcessInsert.slotId]
    const currentAmount = slot?.id === pendingProcessInsert.resourceId ? slot.amount : 0
    const max = Math.min(processStackLimit - currentAmount, availableResourceAmount(state, pendingProcessInsert.resourceId))
    if (!instance || max < 1) setPendingProcessInsert(null)
  }, [pendingProcessInsert, state])

  useEffect(
    () => () => {
      if (gatherHighlightTimeoutRef.current) window.clearTimeout(gatherHighlightTimeoutRef.current)
    },
    [],
  )

  useEffect(() => {
    if (page !== 'gather' || !highlightedGatherTarget) return
    const frame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-gather-target="${highlightedGatherTarget}"]`)?.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: 'smooth',
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [page, gatherArea, highlightedGatherTarget])

  const gatherPouchItems = useMemo(() => {
    const targets = gatherAreas.find((area) => area.id === gatherArea)?.targets ?? []
    const dropIds = [...new Set(targets.flatMap((targetId) => gatherTargets[targetId].drops.map((drop) => drop.id)))]
    return dropIds.filter((id) => state.resources[id] > 0)
  }, [gatherArea, state])

  const unlockedRecipes = useMemo(() => visibleRecipes(state), [state])
  const guideQuests = useMemo(() => visibleQuests(state), [state])
  const selectedQuest = useMemo(() => guideQuests.find((quest) => quest.id === selectedQuestId) ?? null, [guideQuests, selectedQuestId])
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
          stationType: isEuPoweredMachine(recipe.machineId) ? 'lv' : recipe.machineId === 'furnace' ? 'furnace' : 'steam',
          recipeType: 'processing',
          durationMs: recipe.durationMs,
          inputs: [recipe.input, ...(recipe.secondaryInput ? [recipe.secondaryInput] : []), ...(recipe.fuelInput ? [recipe.fuelInput] : [])],
          outputs: [recipe.output],
          requiredMachine: recipe.machineId,
        }),
      ),
    [],
  )
  const recipeCatalog = useMemo(() => [...recipes, ...processRecipeCards], [processRecipeCards])
  const unplacedMachineCounts = Object.fromEntries(machineOrder.map((id) => [id, availableUnplacedMachineCount(state, id)])) as Record<MachineId, number>
  const autoMinerInstances = state.machineInstances.filter((instance) => isAutoMinerMachine(instance.machineId))
  const inventoryResources = resourceOrder.filter((id) => terminalAvailableAmount(state, terminalGrid, id) > 0)
  const filteredResources = inventoryResources.filter((id) => {
    const query = terminalSearch.trim().toLowerCase()
    if (!query) return true
    return id.toLowerCase().includes(query) || resourceLabels[id].toLowerCase().includes(query)
  })
  const filteredMachines = placeableFactoryMachineOrder.filter((id) => {
    if (unplacedMachineCounts[id] < 1) return false
    const query = terminalSearch.trim().toLowerCase()
    if (!query) return true
    return id.toLowerCase().includes(query) || machines[id].name.toLowerCase().includes(query)
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
  const selectedPipeConfig = state.machineInstances.find((instance) => instance.uid === selectedPipeConfigUid) ?? null
  const selectedMachineRecipe = findSelectedProcessRecipe(selectedMachine)
  const selectedMachineSteamCostLitres = selectedMachineRecipe?.steamCostLitres ?? null
  const selectedMachineEuCost = selectedMachineRecipe?.euCost ?? null
  const selectedMachineSteamUsagePerSecond = selectedMachineRecipe && selectedMachineSteamCostLitres !== null
    ? selectedMachineSteamCostLitres / (selectedMachineRecipe.durationMs / 1000)
    : 0
  const selectedMachineEuUsagePerSecond = selectedMachineRecipe && selectedMachineEuCost !== null
    ? selectedMachineEuCost / (selectedMachineRecipe.durationMs / 1000)
    : 0
  const steamAutoMinerSteamUsagePerSecond = steamAutoMinerSteamUseLitres / (steamAutoMinerActionMs / 1000)
  const lvAutoMinerEuUsagePerSecond = lvAutoMinerEuUse / (lvAutoMinerActionMs / 1000)
  const pendingProcessMachine = pendingProcessInsert
    ? state.machineInstances.find((instance) => instance.uid === pendingProcessInsert.uid) ?? null
    : null
  const pendingProcessSlot = pendingProcessInsert && pendingProcessMachine ? pendingProcessMachine.process[pendingProcessInsert.slotId] : null
  const pendingProcessCurrentAmount =
    pendingProcessSlot && pendingProcessInsert && pendingProcessSlot.id === pendingProcessInsert.resourceId ? pendingProcessSlot.amount : 0
  const pendingProcessMax = pendingProcessInsert
    ? Math.min(processStackLimit - pendingProcessCurrentAmount, availableResourceAmount(state, pendingProcessInsert.resourceId))
    : 0
  const furnaceStorageResources = selectedMachine
    ? resourceOrder.filter((id) => availableResourceAmount(state, id) > 0 && canResourceEnterMachine(selectedMachine.machineId, id))
    : []
  const selectedMachineStorageResource = selectedResource && furnaceStorageResources.includes(selectedResource) ? selectedResource : null
  const unplacedMachines = placeableFactoryMachineOrder.filter((id) => {
    if (unplacedMachineCounts[id] < 1) return false
    const query = factoryMachineSearch.trim().toLowerCase()
    if (!query) return true
    return id.toLowerCase().includes(query) || machines[id].name.toLowerCase().includes(query)
  })
  const factoryTools = factoryToolOrder.filter((id) => availableResourceAmount(state, id) > 0)
  const factoryToolCount = factoryTools.reduce((total, id) => total + availableResourceAmount(state, id), 0)
  const toggleFactoryToolbox = () => {
    setIsFactoryToolboxOpen((current) => {
      const next = !current
      if (next) {
        setPlacingMachineId(null)
        setSelectedPipeConfigUid(null)
      }
      return next
    })
  }
  const selectedFactoryItemLabel = placingMachineId
    ? machines[placingMachineId].name
    : selectedFactoryTool
      ? resourceLabels[selectedFactoryTool]
      : 'Select a factory part or tool'
  const factoryGridSize = factoryGridForState(state)
  const factoryFloorUnlocked = hasFactoryFloor(state)
  const factoryExpansionCost = factoryFoundationCost(state)
  const canExpandFactory = canExpandFactoryFloor(state)
  const nextFactoryLevel = Math.min(state.factoryFoundationLevel + 1, factoryFoundationSizes.length - 1)
  const nextFactoryGridSize = factoryFoundationSizes[nextFactoryLevel]
  const isFactoryMaxed = factoryExpansionCost.length < 1

  const clampFactoryPan = (pan: FactoryPan, grid = factoryGridSize): FactoryPan => {
    const viewport = factoryViewportRef.current
    if (!viewport) return { x: 0, y: 0 }
    const pixelSize = factoryGridPixelSize(grid)
    const minX = Math.min(0, viewport.clientWidth - pixelSize.width - factoryViewportPadding * 2)
    const minY = Math.min(0, viewport.clientHeight - pixelSize.height - factoryViewportPadding * 2)
    return {
      x: Math.max(minX, Math.min(0, pan.x)),
      y: Math.max(minY, Math.min(0, pan.y)),
    }
  }

  useEffect(() => {
    setFactoryPan((current) => clampFactoryPan(current))
  }, [factoryGridSize.width, factoryGridSize.height])

  const machineAtFactoryCell = (x: number, y: number) => state.machineInstances.find((candidate) => candidate.x === x && candidate.y === y)

  const pipeConnectionsForInstance = (instance: MachineInstance): PipeConnections | undefined => {
    const isSteamPipe = isSteamPipeMachine(instance.machineId)
    const isEuCable = isEuCableMachine(instance.machineId)
    if (!isSteamPipe && !isEuCable) return undefined
    const connectsTo = (x: number, y: number) => {
      const neighbour = machineAtFactoryCell(x, y)
      if (!neighbour) return false
      return machinesCanConnect(instance, neighbour) && (isSteamPipe ? isSteamNetworkMachine(neighbour.machineId) : isEuNetworkMachine(neighbour.machineId))
    }
    return {
      up: connectsTo(instance.x, instance.y - 1),
      right: connectsTo(instance.x + 1, instance.y),
      down: connectsTo(instance.x, instance.y + 1),
      left: connectsTo(instance.x - 1, instance.y),
    }
  }

  const controllerForMultiblockPart = (instance: MachineInstance) => {
    const controller = multiblockControllerForInstance(state, instance)
    return controller ? machineAtFactoryCell(controller.x, controller.y) : null
  }

  const addFloatText = (label: string, targetId?: GatherTargetId, variant?: FloatText['variant']) => {
    const id = (floatTextIdRef.current += 1)
    setFloatTexts((current) => [...current.slice(-4), { id, label, targetId, variant }])
    window.setTimeout(() => {
      setFloatTexts((current) => current.filter((floatText) => floatText.id !== id))
    }, 850)
  }

  const dismissAchievementToast = (id: number) => {
    setAchievementToasts((current) => current.filter((toast) => toast.id !== id))
  }

  const addAchievementToast = (questId: QuestId) => {
    const quest = questDefinitions.find((candidate) => candidate.id === questId)
    if (!quest) return
    const id = (achievementToastIdRef.current += 1)
    setAchievementToasts((current) => [...current.slice(-2), { id, questId, title: quest.title }])
    window.setTimeout(() => dismissAchievementToast(id), 6500)
  }

  useEffect(() => {
    const known = knownCompletedQuestsRef.current
    const newlyCompleted = state.completedQuests.filter((questId) => !known.has(questId))
    for (const questId of state.completedQuests) known.add(questId)
    for (const questId of newlyCompleted) addAchievementToast(questId)
  }, [state.completedQuests])

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
      addFloatText('', targetId, 'particle')
      if (result.completed) {
        for (const drop of result.drops) {
          addFloatText(`+${formatAmount(drop.amount)} ${resourceLabels[drop.id]}`, targetId, 'break')
        }
      }
      if (result.toolBroke) addFloatText(`${resourceLabels[result.toolBroke]} broke`, targetId)
      return result.state
    })
  }

  const handleAssignAutoMiner = (targetId: GatherTargetId, machineId: MachineId) => {
    setState((current) => {
      const miner = current.machineInstances.find(
        (instance) => instance.machineId === machineId && !current.autoMinerAssignments[instance.uid] && canAutoMinerTarget(instance.machineId, targetId),
      )
      if (!miner) return current
      return assignAutoMiner(current, miner.uid, targetId)
    })
  }

  const handleUnassignAutoMiner = (targetId: GatherTargetId, machineId: MachineId) => {
    setState((current) => {
      const miner = current.machineInstances.find(
        (instance) => instance.machineId === machineId && current.autoMinerAssignments[instance.uid] === targetId,
      )
      if (!miner) return current
      return unassignAutoMiner(current, miner.uid)
    })
  }

  const handleCraft = (recipe: Recipe) => {
    addFloatText(recipe.id === 'craft_wooden_axe' ? 'axe crafted' : recipe.machineOutputs ? 'built' : 'crafted')
    setState((current) => craftRecipeInstant(current, recipe, 1))
  }

  const handleFactoryExpand = () => {
    setState((current) => {
      const cost = factoryFoundationCost(current)
      if (!canExpandFactoryFloor(current)) {
        const missing = missingResourceLine(current, cost)
        setTerminalNotice(missing ? `Missing ${missing}` : 'Factory floor is already max size.')
        return current
      }
      const next = expandFactoryFloor(current)
      const grid = factoryGridForState(next)
      setTerminalNotice(current.factoryFoundationLevel < 1 ? `Factory foundation built (${grid.width}x${grid.height}).` : `Factory floor expanded to ${grid.width}x${grid.height}.`)
      setIsFactoryExpandModalOpen(false)
      return next
    })
  }

  const handleFactoryPanPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    factoryPanDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: factoryPan.x,
      originY: factoryPan.y,
      dragged: false,
    }
  }

  const handleFactoryPanPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = factoryPanDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!drag.dragged && Math.hypot(dx, dy) >= factoryPanThreshold) {
      drag.dragged = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    if (drag.dragged) {
      suppressFactoryCellClickRef.current = true
      setFactoryPan(clampFactoryPan({ x: drag.originX + dx, y: drag.originY + dy }))
    }
  }

  const handleFactoryPanPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = factoryPanDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (drag.dragged) window.setTimeout(() => (suppressFactoryCellClickRef.current = false), 0)
    factoryPanDragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const handleFactoryCellPress = (x: number, y: number, instance?: MachineInstance) => {
    if (suppressFactoryCellClickRef.current) return
    if (instance) {
      if (isFactoryRemoveMode) {
        setState((current) => {
          if (!canCrowbarRemoveMachine(current)) {
            setTerminalNotice('Need an iron crowbar.')
            setSelectedFactoryTool(null)
            return current
          }
          const next = crowbarRemoveMachineInstance(current, instance.uid)
          if (next !== current) setTerminalNotice('')
          return next
        })
        return
      }
      if (isFactoryPipeConfigMode) {
        if (isSteamPipeMachine(instance.machineId) || isEuCableMachine(instance.machineId)) {
          setSelectedMachineUid(null)
          setSelectedPipeConfigUid(instance.uid)
          return
        }
        setTerminalNotice('Wrench only configures pipes and cables.')
        return
      }
      if (machines[instance.machineId].multiblock || machines[instance.machineId].processKind === 'none') {
        const controller = controllerForMultiblockPart(instance)
        if (controller) {
          setSelectedMachineUid(controller.uid)
          return
        }
        if (instance.machineId === 'brickedBlastFurnacePart') setTerminalNotice('Place BBF casings in a full 2x2 to form the furnace.')
        if (instance.machineId === 'arcBlastFurnacePart') setTerminalNotice('Place arc casings in a full 2x2 to form the furnace.')
        return
      }
      setSelectedMachineUid(instance.uid)
      return
    }
    if (!placingMachineId) return
    setState((current) => {
      const next = placeMachineInstance(current, placingMachineId, x, y)
      if (next !== current) {
        const remaining = availableUnplacedMachineCount(next, placingMachineId)
        if (remaining < 1) setPlacingMachineId(null)
        setTerminalNotice('')
      }
      return next
    })
  }

  const handleTogglePipeSide = (uid: string, direction: PipeDirection) => {
    setState((current) => togglePipeSideDisabled(current, uid, direction))
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
      setPendingProcessInsert({
        uid: selectedMachine.uid,
        slotId,
        resourceId: selectedResource,
        quantity: suggestedProcessInsertQuantity(selectedMachine, slotId, selectedResource, max),
      })
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
    setPendingProcessInsert({
      uid: selectedMachine.uid,
      slotId,
      resourceId: selectedResource,
      quantity: suggestedProcessInsertQuantity(selectedMachine, slotId, selectedResource, max),
    })
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

  const firstEquipmentSlotForResource = (resourceId: ResourceId) => equipmentSlots.find((slotId) => equipmentSlotAccepts(slotId, resourceId)) ?? null

  const handleInventorySlotDoubleClick = (event: ReactMouseEvent<HTMLButtonElement>, resourceId: ResourceId) => {
    event.preventDefault()
    const slotId = firstEquipmentSlotForResource(resourceId)
    if (!slotId) {
      setTerminalNotice(`${resourceLabels[resourceId]} cannot be equipped.`)
      return
    }
    handleEquipResource(slotId, resourceId)
  }

  const handleCraftSlotPress = (event: ReactMouseEvent<HTMLButtonElement>, slotIndex: number) => {
    if (event.detail !== 0 && !isCenteredCraftSlotHit(event.currentTarget, event.clientX, event.clientY)) return

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
    if (!isCenteredCraftSlotHit(event.currentTarget, event.clientX, event.clientY)) return

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
      if (!slotElement || !isCenteredCraftSlotHit(slotElement, upEvent.clientX, upEvent.clientY)) return

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

  const handleRecipeBrowserAction = (recipe: Recipe) => {
    if (recipeFitsTerminalGrid(recipe)) {
      handleLoadRecipe(recipe)
      return
    }

    if (!canCraft(state, recipe)) {
      showMissingBatch(recipe, 1)
      return
    }

    handleCraft(recipe)
    setTerminalNotice(`${recipe.name} ${recipe.machineOutputs ? 'built' : 'crafted'}.`)
    setIsRecipeModalOpen(false)
  }

  const handleSelectRecipeGroup = (groupKey: string, trackNavigation = false) => {
    if (trackNavigation && (selectedRecipeGroupKey !== groupKey || selectedRecipeIndex !== 0)) pushNavigationSnapshot()
    setSelectedRecipeGroupKey(groupKey)
    setSelectedRecipeIndex(0)
  }

  const handleCycleRecipeVariant = (direction: -1 | 1) => {
    if (!selectedRecipeGroup || selectedRecipeGroup.recipes.length < 2) return
    const nextIndex =
      direction < 0
        ? clampedSelectedRecipeIndex <= 0
          ? selectedRecipeGroup.recipes.length - 1
          : clampedSelectedRecipeIndex - 1
        : (clampedSelectedRecipeIndex + 1) % selectedRecipeGroup.recipes.length
    if (nextIndex === clampedSelectedRecipeIndex) return
    pushNavigationSnapshot()
    setSelectedRecipeIndex(nextIndex)
  }

  const triggerGatherTargetHighlight = (targetId: GatherTargetId) => {
    if (gatherHighlightTimeoutRef.current) window.clearTimeout(gatherHighlightTimeoutRef.current)
    setHighlightedGatherTarget(targetId)
    gatherHighlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedGatherTarget(null)
      gatherHighlightTimeoutRef.current = null
    }, 2000)
  }

  const handleJumpToResourceRecipe = (resourceId: ResourceId) => {
    const gatherLocation = gatherAreaForResource(resourceId)
    if (gatherLocation) {
      pushNavigationSnapshot()
      setGatherArea(gatherLocation.areaId)
      setPage('gather')
      setIsRecipeModalOpen(false)
      setIsFactoryExpandModalOpen(false)
      setMissingBatch(null)
      setSelectedMachineUid(null)
      setPendingProcessInsert(null)
      setSelectedQuestId(null)
      triggerGatherTargetHighlight(gatherLocation.targetId)
      setTerminalNotice(`${resourceLabels[resourceId]} comes from ${gatherLocation.targetName}.`)
      return
    }

    const targetOutput = { kind: 'resource' as const, id: resourceId, amount: 1 }
    const targetKey = recipeGroupKeyForOutput(targetOutput)
    const targetGroup = groupRecipesByOutput(recipeCatalog).find((group) => group.key === targetKey)
    if (!targetGroup) {
      setTerminalNotice(`No recipe found for ${resourceLabels[resourceId]}.`)
      return
    }

    pushNavigationSnapshot()
    setTerminalMode('recipes')
    setRecipeSearch('')
    setPage('terminal')
    setIsRecipeModalOpen(true)
    setIsFactoryExpandModalOpen(false)
    setMissingBatch(null)
    setSelectedMachineUid(null)
    setSelectedQuestId(null)
    handleSelectRecipeGroup(targetKey)
    setTerminalNotice(`Showing recipes for ${resourceLabels[resourceId]}.`)
  }

  const handleJumpToMachineRecipe = (machineId: MachineId) => {
    const targetOutput = { kind: 'machine' as const, id: machineId, amount: 1 }
    const targetKey = recipeGroupKeyForOutput(targetOutput)
    const targetGroup = groupRecipesByOutput(recipeCatalog).find((group) => group.key === targetKey)
    if (!targetGroup) {
      setTerminalNotice(`No recipe found for ${machines[machineId].name}.`)
      return
    }

    pushNavigationSnapshot()
    setTerminalMode('recipes')
    setRecipeSearch('')
    setPage('terminal')
    setIsRecipeModalOpen(true)
    setIsFactoryExpandModalOpen(false)
    setMissingBatch(null)
    setSelectedMachineUid(null)
    setSelectedQuestId(null)
    handleSelectRecipeGroup(targetKey)
    setTerminalNotice(`Showing recipes for ${machines[machineId].name}.`)
  }

  const handleSelectQuest = (questId: QuestId) => {
    if (selectedQuestId !== questId) pushNavigationSnapshot()
    setSelectedQuestId(questId)
  }

  const handleClaimQuestReward = (questId: QuestId) => {
    setState((current) => claimQuestReward(current, questId))
    addFloatText('reward claimed')
  }

  const handleReset = async () => {
    cancelPendingSave()
    await clearSavedGame(selectedSaveSlotId)
    setIsCreativeMode(false)
    await refreshSaveSlots()
    const freshState = loadGame(null)
    setState(freshState)
    knownCompletedQuestsRef.current = new Set(freshState.completedQuests)
    handleClearGrid()
    setOfflineNotice('')
    setTerminalNotice('')
    setTerminalSearch('')
    setRecipeSearch('')
    setFactoryMachineSearch('')
    setSelectedResource(null)
    setBatchQuantity(1)
    setPendingProcessInsert(null)
    setMissingBatch(null)
    setIsRecipeModalOpen(false)
    setIsFactoryExpandModalOpen(false)
    setAchievementToasts([])
    setPlacingMachineId(null)
    setSelectedMachineUid(null)
    setSelectedQuestId(null)
    setSelectedRecipeGroupKey(null)
    setSelectedRecipeIndex(0)
    setNavigationStack([])
    setHighlightedGatherTarget(null)
    setPage('gather')
    addFloatText('new save')
  }

  const handleToggleCreativeMode = async () => {
    const nextCreative = !isCreativeMode
    setPendingProcessInsert(null)
    setPlacingMachineId(null)
    setSelectedMachineUid(null)
    if (nextCreative) {
      setIsCreativeMode(true)
      setState((currentState) => createCreativeState(currentState))
    } else {
      const savedState = await loadSlotIntoGame(selectedSaveSlotId, false)
      setState(savedState)
      knownCompletedQuestsRef.current = new Set(savedState.completedQuests)
      setIsCreativeMode(false)
    }
    addFloatText(nextCreative ? 'creative on' : 'creative off')
  }

  const handleContinueFromHome = async () => {
    const savedState = await loadSlotIntoGame(selectedSaveSlotId)
    setState(savedState)
    knownCompletedQuestsRef.current = new Set(savedState.completedQuests)
    setIsCreativeMode(false)
    setNavigationStack([])
    setPage('gather')
  }

  const handleRenameSelectedSave = async () => {
    await renameSaveSlot(selectedSaveSlotId, saveNameDraft)
    await refreshSaveSlots()
  }

  const handleManualSave = async () => {
    if (isCreativeMode) {
      addFloatText('creative not saved')
      return
    }
    cancelPendingSave()
    await persistGameState(state, selectedSaveSlotId)
    await refreshSaveSlots()
    addFloatText('saved')
  }

  const handleExportSave = async () => {
    const raw = await exportSavedGame(selectedSaveSlotId)
    if (!raw) {
      setOfflineNotice(`${selectedSaveLabel} has no save to export yet.`)
      return
    }
    const blob = new Blob([raw], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${selectedSaveLabel.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || selectedSaveSlotId}.click-foundry-save.json`
    anchor.click()
    URL.revokeObjectURL(url)
    addFloatText('exported')
  }

  const handleImportSaveFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const raw = await file.text()
      await importSavedGame(raw, selectedSaveSlotId)
      await loadSlotIntoGame(selectedSaveSlotId, false)
      await refreshSaveSlots()
      setOfflineNotice(`Imported save into ${selectedSaveLabel}. Offline progress starts from now.`)
      addFloatText('imported')
    } catch (error) {
      setOfflineNotice(error instanceof Error ? error.message : 'Could not import that save file.')
    } finally {
      if (importSaveInputRef.current) importSaveInputRef.current.value = ''
    }
  }

  const handleGoHome = () => {
    flushPendingSave()
    setPage('home')
    setPendingProcessInsert(null)
    setMissingBatch(null)
    setIsRecipeModalOpen(false)
    setIsFactoryExpandModalOpen(false)
    setSelectedMachineUid(null)
    setSelectedPipeConfigUid(null)
    setSelectedQuestId(null)
    setNavigationStack([])
  }

  const selectedAvailable = selectedResource ? terminalAvailableAmount(state, terminalGrid, selectedResource) : 0
  const terminalOutput = terminalMatch ? recipePrimaryOutput(terminalMatch) : undefined
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

  const captureNavigationSnapshot = (): NavigationSnapshot => ({
    page,
    gatherArea,
    terminalMode,
    recipeSearch,
    selectedResource,
    selectedMachineUid,
    selectedPipeConfigUid,
    selectedQuestId,
    selectedRecipeGroupKey,
    selectedRecipeIndex,
    isRecipeModalOpen,
    isFactoryExpandModalOpen,
  })

  const restoreNavigationSnapshot = (snapshot: NavigationSnapshot) => {
    setPage(snapshot.page)
    setGatherArea(snapshot.gatherArea)
    setTerminalMode(snapshot.terminalMode)
    setRecipeSearch(snapshot.recipeSearch)
    setSelectedResource(snapshot.selectedResource)
    setSelectedMachineUid(snapshot.selectedMachineUid)
    setSelectedPipeConfigUid(snapshot.selectedPipeConfigUid)
    setSelectedQuestId(snapshot.selectedQuestId)
    setSelectedRecipeGroupKey(snapshot.selectedRecipeGroupKey)
    setSelectedRecipeIndex(snapshot.selectedRecipeIndex)
    setIsRecipeModalOpen(snapshot.isRecipeModalOpen)
    setIsFactoryExpandModalOpen(snapshot.isFactoryExpandModalOpen)
    setMissingBatch(null)
    setPendingProcessInsert(null)
    setHighlightedGatherTarget(null)
  }

  const pushNavigationSnapshot = () => {
    const snapshot = captureNavigationSnapshot()
    setNavigationStack((current) => [...current.slice(-7), snapshot])
  }

  const handleBackNavigation = () => {
    const snapshot = navigationStack.at(-1)
    if (snapshot) {
      restoreNavigationSnapshot(snapshot)
      setNavigationStack((current) => current.slice(0, -1))
      return
    }

    if (missingBatch) {
      setMissingBatch(null)
      return
    }
    if (selectedPipeConfigUid) {
      setSelectedPipeConfigUid(null)
      return
    }
    if (selectedQuestId) {
      setSelectedQuestId(null)
      return
    }
    if (isFactoryExpandModalOpen) {
      setIsFactoryExpandModalOpen(false)
      return
    }
    if (isRecipeModalOpen) {
      setIsRecipeModalOpen(false)
      return
    }
    if (selectedMachineUid) {
      setPendingProcessInsert(null)
      setSelectedMachineUid(null)
      return
    }
    if (page !== 'home') setPage('home')
  }

  const handleAchievementToastClick = (toast: AchievementToast) => {
    const quest = questDefinitions.find((candidate) => candidate.id === toast.questId)
    if (!quest) return
    pushNavigationSnapshot()
    setActiveQuestChapterId(quest.chapterId ?? 'gettingStarted')
    setPage('guide')
    setIsRecipeModalOpen(false)
    setIsFactoryExpandModalOpen(false)
    setMissingBatch(null)
    setPendingProcessInsert(null)
    setSelectedMachineUid(null)
    window.setTimeout(() => setSelectedQuestId(toast.questId), 0)
    dismissAchievementToast(toast.id)
  }

  const handlePageNavigation = (nextPage: Page) => {
    if (nextPage === page) return
    pushNavigationSnapshot()
    setPage(nextPage)
    setSelectedMachineUid(null)
    setIsRecipeModalOpen(false)
    setIsFactoryExpandModalOpen(false)
    setSelectedQuestId(null)
    setMissingBatch(null)
    setPendingProcessInsert(null)
  }

  const shellClassName = page === 'home' ? 'game-shell home-shell' : page === 'processing' ? 'game-shell processing-shell' : 'game-shell'
  const selectedSaveSlot = saveSlotSummaries.find((slot) => slot.id === selectedSaveSlotId)
  const selectedSaveLabel = selectedSaveSlot?.label ?? saveSlotsFallbackLabel(selectedSaveSlotId)
  const saveStatus = !hasLoadedSave
    ? 'Loading local save...'
    : selectedSaveSlot?.exists
      ? `${selectedSaveLabel} ready - ${selectedSaveSlot.updatedAt ? new Date(selectedSaveSlot.updatedAt).toLocaleString() : 'saved'}`
      : `${selectedSaveLabel} is empty`
  const deployedAtLabel = new Date(deploymentInfo.deployedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  const buildLabel = deploymentInfo.version === 'local' ? 'Local build' : `Build ${deploymentInfo.version}`

  if (!isMobileClient) {
    return (
      <main className="mobile-gate-shell">
        <section className="mobile-gate-panel" aria-label="Mobile only">
          <div className="mobile-gate-glyph" aria-hidden="true">
            <MachineGlyph id="steamBoiler" active />
            <MachineGlyph id="tinCable" active />
            <MachineGlyph id="lvWiremill" active />
          </div>
          <p className="eyebrow">Desktop detected</p>
          <h1>Nice try, factory overlord.</h1>
          <p>This foundry runs on pocket power only. Put the spreadsheet away, grab your phone, and go touch some grass before the boiler files a complaint.</p>
          <strong>Open Click Foundry on mobile to play.</strong>
          <span>{buildLabel} · {deployedAtLabel}</span>
        </section>
      </main>
    )
  }

  return (
    <main className={shellClassName}>
      <IconSpriteDefs />
      {page !== 'home' && (
        <header className="game-header">
          <button type="button" className="header-title-button" aria-label="Go to Home" title="Home" onClick={handleGoHome}>
            <p className="eyebrow">Block-tech idle</p>
            <h1>Click Foundry</h1>
          </button>
          <div className="header-actions">
            {isUpdateAvailable && (
              <button type="button" className="deploy-update-button" onClick={reloadLatestDeployment}>
                Update
              </button>
            )}
            <button type="button" className="icon-button global-back-button" aria-label="Back" title="Back" onClick={handleBackNavigation}>
              <ChevronLeft size={18} />
            </button>
            <button type="button" className="icon-button" aria-label="Save game" title={`Save ${selectedSaveSlotId.replace('slot-', '')}`} onClick={handleManualSave}>
              <Save size={18} />
            </button>
            <button
              type="button"
              className={isCreativeMode ? 'creative-toggle active' : 'creative-toggle'}
              aria-pressed={isCreativeMode}
              aria-label={isCreativeMode ? 'Turn creative mode off' : 'Turn creative mode on'}
              title={isCreativeMode ? 'Creative mode on - not saving' : 'Creative mode'}
              onClick={handleToggleCreativeMode}
            >
              <Sparkles size={18} />
            </button>
          </div>
        </header>
      )}

      <div className="achievement-toast-stack" aria-label="Quest achievements" aria-live="polite">
        {achievementToasts.map((toast) => (
          <button
            type="button"
            className="achievement-toast"
            onPointerDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
              handleAchievementToastClick(toast)
            }}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
            key={toast.id}
          >
            <span>Quest complete</span>
            <strong>{toast.title}</strong>
          </button>
        ))}
      </div>

      {offlineNotice && (
        <div className="offline-progress-notice" aria-live="polite">
          <span>{offlineNotice}</span>
          <button type="button" aria-label="Dismiss offline progress notice" onClick={() => setOfflineNotice('')}>
            <X size={14} />
          </button>
        </div>
      )}

      {page === 'home' && (
        <section className="home-panel" aria-label="Click Foundry home">
          <div className="home-hero">
            <div className="home-foundry-mark" aria-hidden="true">
              <span className="home-foundry-stack">
                <MachineGlyph id="furnace" active />
                <MachineGlyph id="steamBoiler" active />
                <MachineGlyph id="steamTank" active />
              </span>
              <span className="home-conveyor">
                <PixelIcon id="ironOre" />
                <PixelIcon id="coal" />
                <PixelIcon id="ironPlate" />
              </span>
            </div>
            <div className="home-copy">
              <p className="eyebrow">Block-tech idle</p>
              <h1><span>Click</span><span>Foundry</span></h1>
              <p className="home-save-status">{saveStatus}</p>
              <p className="home-deploy-version">{buildLabel} · {deployedAtLabel}</p>
            </div>
          </div>
          <div className="home-save-slots" aria-label="Save slots">
            {(saveSlotSummaries.length > 0 ? saveSlotSummaries : [{ id: 'slot-1' as const, label: 'Save 1', updatedAt: null, exists: false }, { id: 'slot-2' as const, label: 'Save 2', updatedAt: null, exists: false }, { id: 'slot-3' as const, label: 'Save 3', updatedAt: null, exists: false }]).map((slot) => (
              <button
                type="button"
                className={slot.id === selectedSaveSlotId ? 'home-save-slot selected' : 'home-save-slot'}
                aria-pressed={slot.id === selectedSaveSlotId}
                onClick={() => setSelectedSaveSlotId(slot.id)}
                key={slot.id}
              >
                <strong>{slot.label}</strong>
                <span>{slot.exists && slot.updatedAt ? new Date(slot.updatedAt).toLocaleString() : 'Empty slot'}</span>
              </button>
            ))}
          </div>
          <form
            className="home-save-name-form"
            onSubmit={(event) => {
              event.preventDefault()
              void handleRenameSelectedSave()
            }}
          >
            <label htmlFor="home-save-name">Save name</label>
            <input
              id="home-save-name"
              maxLength={28}
              value={saveNameDraft}
              onBlur={() => void handleRenameSelectedSave()}
              onChange={(event) => setSaveNameDraft(event.target.value)}
            />
            <button type="submit">Rename</button>
          </form>
          <div className="home-actions">
            <button type="button" className="home-action primary" disabled={!hasLoadedSave} onClick={handleContinueFromHome}>
              Continue {selectedSaveLabel}
            </button>
            <button type="button" className="home-action danger" disabled={!hasLoadedSave} onClick={handleReset}>
              New Game In {selectedSaveLabel}
            </button>
          </div>
          <div className="home-save-tools">
            <button type="button" className="home-action" disabled={!hasLoadedSave || !selectedSaveSlot?.exists} onClick={handleExportSave}>
              <Download size={16} />
              Export
            </button>
            <button type="button" className="home-action" disabled={!hasLoadedSave} onClick={() => importSaveInputRef.current?.click()}>
              <Upload size={16} />
              Import
            </button>
            <input
              ref={importSaveInputRef}
              type="file"
              accept="application/json,.json,.click-foundry-save"
              className="visually-hidden-file-input"
              onChange={(event) => {
                void handleImportSaveFile(event.target.files?.[0])
              }}
            />
          </div>
        </section>
      )}

      {page !== 'home' && (
        <section className="page-tabs" aria-label="Game pages">
          <button type="button" className={page === 'gather' ? 'active' : ''} onClick={() => handlePageNavigation('gather')}>
            <Pickaxe size={18} />
            Gather
          </button>
          <button type="button" className={page === 'terminal' ? 'active' : ''} onClick={() => handlePageNavigation('terminal')}>
            <Database size={18} />
            Terminal
          </button>
          <button type="button" className={page === 'processing' ? 'active' : ''} onClick={() => handlePageNavigation('processing')}>
            <Factory size={18} />
            Processing
          </button>
          <button type="button" className={page === 'guide' ? 'active' : ''} onClick={() => handlePageNavigation('guide')}>
            <BookOpen size={18} />
            Guide
          </button>
        </section>
      )}

      {page === 'gather' && (
        <section className="tap-panel" aria-label="Manual gathering">
          <div className="gather-area-tabs" aria-label="Gathering areas">
            {gatherAreas.map((area) => (
              <button type="button" className={gatherArea === area.id ? 'active' : ''} onClick={() => setGatherArea(area.id)} key={area.id}>
                {area.label}
              </button>
            ))}
          </div>
          <div className="gather-panels">
            {(gatherAreas.find((area) => area.id === gatherArea)?.targets ?? []).filter((targetId) => isGatherTargetVisible(state, targetId)).map((targetId) => {
              const target = gatherTargets[targetId]
              const progress = state.gatherProgress[targetId] ?? 0
              const tool = getBestToolForTarget(state, targetId)
              const damage = tool.damageByTarget[targetId] ?? 0
              const toolResource = tool.id === 'bareHand' ? null : (tool.id as ResourceId)
              const progressPercent = Math.min(100, (progress / target.maxHp) * 100)
              const targetFloats = floatTexts.filter((floatText) => floatText.targetId === targetId)
              const hitButtonVerb =
                targetId === 'rubberTree' ? 'Tap' : target.preferredTool === 'woodenShovel' || target.preferredTool === 'stoneShovel' ? 'Dig' : 'Mine'
              const hitButtonLabel = `${hitButtonVerb} ${target.name}`
              const steamMinerCompatible = canAutoMinerTarget('steamAutoMiner', targetId)
              const lvMinerCompatible = canAutoMinerTarget('lvAutoMiner', targetId)
              const assignedSteamMiners = autoMinerInstances.filter(
                (instance) => instance.machineId === 'steamAutoMiner' && state.autoMinerAssignments[instance.uid] === targetId,
              )
              const assignedLvMiners = autoMinerInstances.filter(
                (instance) => instance.machineId === 'lvAutoMiner' && state.autoMinerAssignments[instance.uid] === targetId,
              )
              const unassignedSteamMiners = autoMinerInstances.filter(
                (instance) => instance.machineId === 'steamAutoMiner' && !state.autoMinerAssignments[instance.uid] && steamMinerCompatible,
              )
              const unassignedLvMiners = autoMinerInstances.filter(
                (instance) => instance.machineId === 'lvAutoMiner' && !state.autoMinerAssignments[instance.uid] && lvMinerCompatible,
              )
              const showAutoMinerControls =
                assignedSteamMiners.length > 0 ||
                assignedLvMiners.length > 0 ||
                unassignedSteamMiners.length > 0 ||
                unassignedLvMiners.length > 0

              return (
                <article className={highlightedGatherTarget === targetId ? 'gather-panel resource-focus' : 'gather-panel'} data-gather-target={targetId} key={targetId}>
                  <div className="gather-card-layout">
                    <div className="gather-card-info">
                      <div className="mine-face">
                        <h2>{target.name}</h2>
                      </div>

                      <div className="break-panel">
                        <div className="break-stats">
                          <div className="stat-cell">
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
                        </div>
                        {damage < 1 && <p className="gather-warning">Requires {tools[target.preferredTool].name}</p>}
                      </div>
                      {showAutoMinerControls && (
                        <div className="auto-miner-controls" aria-label={`${target.name} auto miners`}>
                          <span>Auto miners</span>
                          {steamMinerCompatible && (
                            <div className="auto-miner-control">
                              <strong>
                                Steam {assignedSteamMiners.filter((instance) => isAutoMinerPowered(state, instance)).length}/{assignedSteamMiners.length}
                              </strong>
                              <button
                                type="button"
                                disabled={assignedSteamMiners.length < 1}
                                aria-label={`Remove steam auto miner from ${target.name}`}
                                onClick={() => handleUnassignAutoMiner(targetId, 'steamAutoMiner')}
                              >
                                -
                              </button>
                              <button
                                type="button"
                                disabled={unassignedSteamMiners.length < 1}
                                aria-label={`Assign steam auto miner to ${target.name}`}
                                onClick={() => handleAssignAutoMiner(targetId, 'steamAutoMiner')}
                              >
                                +
                              </button>
                            </div>
                          )}
                          {lvMinerCompatible && (
                            <div className="auto-miner-control">
                              <strong>
                                LV {assignedLvMiners.filter((instance) => isAutoMinerPowered(state, instance)).length}/{assignedLvMiners.length}
                              </strong>
                              <button
                                type="button"
                                disabled={assignedLvMiners.length < 1}
                                aria-label={`Remove LV auto miner from ${target.name}`}
                                onClick={() => handleUnassignAutoMiner(targetId, 'lvAutoMiner')}
                              >
                                -
                              </button>
                              <button
                                type="button"
                                disabled={unassignedLvMiners.length < 1}
                                aria-label={`Assign LV auto miner to ${target.name}`}
                                onClick={() => handleAssignAutoMiner(targetId, 'lvAutoMiner')}
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button type="button" className="resource-tap-target" disabled={damage < 1} aria-label={hitButtonLabel} onClick={() => handleGatherTarget(targetId)}>
                      <span className="resource-tap-art-stack">
                        <GatherTapArt iconId={gatherTargetIcons[targetId]} />
                        <span className="progress-track resource-progress-track">
                          <span style={{ width: `${progressPercent}%` }} />
                        </span>
                      </span>
                      <span className="float-layer tap-fx-layer" aria-hidden="true">
                        {targetFloats.map((floatText) =>
                          floatText.variant === 'particle' ? (
                            <span className={`hit-particles hit-particles-${targetId}`} key={floatText.id} />
                          ) : floatText.label ? (
                            <span key={floatText.id}>{floatText.label}</span>
                          ) : null,
                        )}
                      </span>
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
          {gatherPouchItems.length > 0 && (
            <div className="gather-pouch" aria-label="Gathered materials">
              <span className="gather-pouch-label">Pouch</span>
              <div className="gather-pouch-items">
                {gatherPouchItems.map((id) => (
                  <ItemSlot amount={{ id, amount: state.resources[id] }} state={state} onClick={handleJumpToResourceRecipe} key={id} />
                ))}
              </div>
            </div>
          )}
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
            {filteredResources.length > 0 || filteredMachines.length > 0 ? (
              <>
                {filteredResources.map((id) => {
                  const available = terminalAvailableAmount(state, terminalGrid, id)
                  return (
                    <button
                      type="button"
                      className={selectedResource === id ? 'item-slot selected' : 'item-slot'}
                      aria-label={`${resourceLabels[id]} ${formatAmount(available)}`}
                      title={resourceLabels[id]}
                      draggable
                      onClick={(event) => handleInventorySlotClick(event, id)}
                      onDoubleClick={(event) => handleInventorySlotDoubleClick(event, id)}
                      onDragStart={(event) => handleInventoryDragStart(event, id)}
                      onPointerDown={(event) => handleInventoryPointerDown(event, id)}
                      key={id}
                    >
                      <PixelIcon id={id} />
                      <span className="item-count">{formatAmount(available)}</span>
                      <DurabilityBar state={state} id={id} />
                    </button>
                  )
                })}
                {filteredMachines.map((id) => (
                  <span className="item-slot machine-inventory-slot" title={machines[id].name} key={`machine-${id}`}>
                    <MachineGlyph id={id} />
                    <span className="item-count">{formatAmount(unplacedMachineCounts[id])}</span>
                  </span>
                ))}
              </>
            ) : (
              <div className="empty-storage">
                <p>No stored items</p>
                <span>Gather materials, then craft them here.</span>
              </div>
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
                    onClick={(event) => handleCraftSlotPress(event, index)}
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
                  {terminalOutput ? (
                    terminalOutput.kind === 'resource' ? (
                      <PixelIcon id={terminalOutput.id} />
                    ) : (
                      <span className="output-machine-glyph">
                        <MachineGlyph id={terminalOutput.id} />
                      </span>
                    )
                  ) : (
                    <span className="empty-output" />
                  )}
                  {terminalOutput && <span className="item-count output-count">{formatAmount(terminalOutput.amount)}</span>}
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
                        onClick={() => handleSelectRecipeGroup(group.key, true)}
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
                                onClick={() => handleCycleRecipeVariant(-1)}
                              >
                                <ChevronLeft size={15} />
                              </button>
                              <span>{clampedSelectedRecipeIndex + 1}/{selectedRecipeGroup.recipes.length}</span>
                              <button
                                type="button"
                                aria-label="Next recipe"
                                onClick={() => handleCycleRecipeVariant(1)}
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

                      {selectedRecipe.recipeType === 'processing' && (
                        <div className="recipe-meta-row">
                          <span>Time</span>
                          <strong>{formatDuration(selectedRecipe.durationMs)}</strong>
                        </div>
                      )}

                      {isFactoryFloorLayoutRecipe(selectedRecipe) && (
                        <div className="recipe-slot-section factory-layout-section">
                          <span>Factory Floor</span>
                          <FactoryFloorLayoutPreview recipe={selectedRecipe} />
                        </div>
                      )}

                      {!isFactoryFloorLayoutRecipe(selectedRecipe) && recipeFitsTerminalGrid(selectedRecipe) ? (
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
                        onClick={() => handleRecipeBrowserAction(selectedRecipe)}
                      >
                        {isFactoryFloorLayoutRecipe(selectedRecipe)
                          ? 'Create factory parts'
                          : recipeFitsTerminalGrid(selectedRecipe)
                            ? 'Load recipe'
                            : selectedRecipe.machineOutputs
                              ? 'Build'
                              : 'Craft'}
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
                      <ItemSlot amount={amount} disabled onClick={handleJumpToResourceRecipe} key={amount.id} />
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
            {factoryFloorUnlocked && (
              <div className="factory-head-status">
                <span>Factory Floor</span>
                <strong>{isFactoryMaxed ? `Max ${factoryGridSize.width}x${factoryGridSize.height}` : `${factoryGridSize.width}x${factoryGridSize.height}`}</strong>
                {!isFactoryMaxed && (
                  <button type="button" className="factory-expand-button" onClick={() => setIsFactoryExpandModalOpen(true)}>
                    Expand
                  </button>
                )}
              </div>
            )}
          </div>

          {terminalNotice && <p className="recipe-notice">{terminalNotice}</p>}

          {!factoryFloorUnlocked ? (
            <div className="factory-foundation-panel">
              <div>
                <span className="factory-tray-label">Factory Foundation</span>
                <h3>Build 5x5 Floor</h3>
                <p>Lay basic foundations before machines can be placed.</p>
              </div>
              <div className="factory-cost-row" aria-label="Factory foundation cost">
                {factoryExpansionCost.map((amount) => (
                  <ItemSlot amount={amount} disabled={availableResourceAmount(state, amount.id) < amount.amount} state={state} onClick={handleJumpToResourceRecipe} key={amount.id} />
                ))}
              </div>
              <button type="button" className="load-recipe-button button-primary" disabled={!canExpandFactory} onClick={handleFactoryExpand}>
                Build Foundation
              </button>
            </div>
          ) : (
            <>
              <div className="factory-inventory-panel" aria-label="Factory inventory and tools">
                <div className="processing-storage machine-placement-storage" aria-label="Factory parts">
                  <div className="factory-tray-head">
                    <span className="factory-tray-label">Factory Parts</span>
                    <input
                      className="factory-machine-search"
                      type="search"
                      placeholder="Find"
                      value={factoryMachineSearch}
                      onChange={(event) => setFactoryMachineSearch(event.target.value)}
                      aria-label="Search factory parts"
                    />
                    <button
                      type="button"
                      className={isFactoryToolboxOpen ? 'factory-toolbox-toggle active' : 'factory-toolbox-toggle'}
                      aria-label={isFactoryToolboxOpen ? 'Close toolbox' : 'Open toolbox'}
                      aria-controls="factory-toolbox-drawer"
                      aria-expanded={isFactoryToolboxOpen}
                      title={isFactoryToolboxOpen ? 'Close toolbox' : 'Open toolbox'}
                      onClick={toggleFactoryToolbox}
                    >
                      <Toolbox size={16} />
                      {factoryToolCount > 0 && <span>{formatAmount(factoryToolCount)}</span>}
                    </button>
                  </div>
                  <div className="machine-placement-slots">
                    {unplacedMachines.length > 0 ? (
                      unplacedMachines.map((id) => (
                        <button
                          type="button"
                          className={placingMachineId === id ? 'item-slot machine-inventory-slot selected' : 'item-slot machine-inventory-slot'}
                          aria-label={`${machines[id].name} ${formatAmount(unplacedMachineCounts[id])}`}
                          title={machines[id].name}
                          onClick={() => {
                            setSelectedFactoryTool(null)
                            setSelectedPipeConfigUid(null)
                            setIsFactoryToolboxOpen(false)
                            setTerminalNotice('')
                            setPlacingMachineId((current) => (current === id ? null : id))
                          }}
                          key={id}
                        >
                          <MachineGlyph id={id} />
                          <span className="item-count">{formatAmount(unplacedMachineCounts[id])}</span>
                        </button>
                      ))
                    ) : (
                      <span className="empty-furnace-storage">{factoryMachineSearch.trim() ? 'No matching parts' : 'No factory parts'}</span>
                    )}
                  </div>
                </div>

                <div
                  className={isFactoryToolboxOpen ? 'processing-storage factory-tool-storage open' : 'processing-storage factory-tool-storage closed'}
                  id="factory-toolbox-drawer"
                  aria-label="Factory toolbox"
                >
                  <div className="factory-tool-drawer-head">
                    <span className="factory-tray-label">Toolbox</span>
                    {selectedFactoryTool && <span className="factory-tool-mode">{resourceLabels[selectedFactoryTool]}</span>}
                  </div>
                  <div className="factory-tool-slots">
                    {factoryTools.length > 0 ? (
                      factoryTools.map((id) => (
                        <button
                          type="button"
                          className={selectedFactoryTool === id ? 'item-slot factory-tool-slot selected' : 'item-slot factory-tool-slot'}
                          aria-label={`${resourceLabels[id]} ${formatAmount(availableResourceAmount(state, id))}`}
                          aria-pressed={selectedFactoryTool === id}
                          title={
                            id === 'ironCrowbar'
                              ? `${resourceLabels[id]} - remove floor machines and pipes (${formatAmount(durabilityRemaining(state, id))} uses)`
                              : `${resourceLabels[id]} - configure pipe and cable connections`
                          }
                          onClick={() => {
                            setPlacingMachineId(null)
                            setSelectedMachineUid(null)
                            setSelectedPipeConfigUid(null)
                            setIsFactoryToolboxOpen(true)
                            setSelectedFactoryTool((current) => (current === id ? null : id))
                          }}
                          key={id}
                        >
                          <PixelIcon id={id} />
                          <span className="item-count">{formatAmount(availableResourceAmount(state, id))}</span>
                          <DurabilityBar state={state} id={id} />
                        </button>
                      ))
                    ) : (
                      <span className="empty-furnace-storage">No tools</span>
                    )}
                  </div>
                </div>

                <div className={placingMachineId || selectedFactoryTool ? 'factory-selection-name active' : 'factory-selection-name'} aria-live="polite">
                  <span>Selected</span>
                  <strong>{selectedFactoryItemLabel}</strong>
                </div>
              </div>

              <div
                className="factory-pan-viewport"
                ref={factoryViewportRef}
                onPointerDown={handleFactoryPanPointerDown}
                onPointerMove={handleFactoryPanPointerMove}
                onPointerUp={handleFactoryPanPointerEnd}
                onPointerCancel={handleFactoryPanPointerEnd}
              >
                <div className="factory-pan-content" style={{ transform: `translate(${factoryPan.x}px, ${factoryPan.y}px)` }}>
                  <div className="factory-grid" style={{ gridTemplateColumns: `repeat(${factoryGridSize.width}, ${factoryCellSize}px)` }} aria-label="Factory grid">
                    {Array.from({ length: factoryGridSize.width * factoryGridSize.height }, (_, index) => {
                      const x = index % factoryGridSize.width
                      const y = Math.floor(index / factoryGridSize.width)
                      const instance = state.machineInstances.find((candidate) => candidate.x === x && candidate.y === y)
                      const multiblockController = instance ? controllerForMultiblockPart(instance) : null
                      const isMultiblockController = Boolean(instance?.machineId && machines[instance.machineId].multiblock)
                      const isMultiblockCell = isMultiblockController || Boolean(multiblockController)
                      const multiblockMachineId = multiblockController?.machineId ?? (isMultiblockController ? instance?.machineId : null)
                      const isMachineActive = Boolean(
                        instance &&
                          (instance.process.fuelRemainingMs > 0 ||
                            instance.process.activeRecipeId ||
                            (isSteamNetworkMachine(instance.machineId) && instance.process.steamStoredMs > 0) ||
                            (isEuNetworkMachine(instance.machineId) && instance.process.euStored > 0) ||
                            Object.values(instance.process.fluids).some((amount) => (amount ?? 0) > 0) ||
                            (isSteamPipeMachine(instance.machineId) && availableConnectedSteam(state, instance) > 0) ||
                            (isEuCableMachine(instance.machineId) && availableConnectedEu(state, instance) > 0)),
                      )
                      return (
                        <button
                          type="button"
                          className={
                            instance
                              ? [
                                  'factory-cell',
                                  'occupied',
                                  `machine-${instance.machineId}-cell`,
                                  isMachineActive ? 'active' : '',
                                  isFactoryRemoveMode ? 'removing' : '',
                                  isMultiblockController ? 'multiblock-bbf-controller' : '',
                                  multiblockController ? 'multiblock-bbf-child' : '',
                                ].filter(Boolean).join(' ')
                              : placingMachineId
                                ? 'factory-cell placing'
                                : 'factory-cell'
                          }
                          aria-label={
                            instance
                              ? `${isMultiblockCell && multiblockMachineId ? machines[multiblockMachineId].name : machines[instance.machineId].name} at ${x + 1}, ${y + 1}`
                              : `Empty factory cell ${x + 1}, ${y + 1}`
                          }
                          onClick={() => handleFactoryCellPress(x, y, instance)}
                          key={`${x}-${y}`}
                        >
                          {instance && (!isMultiblockCell || isMultiblockController) ? (
                            <MachineGlyph id={instance.machineId} active={isMachineActive} pipeConnections={pipeConnectionsForInstance(instance)} />
                          ) : (
                            <span />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {isFactoryExpandModalOpen && !isFactoryMaxed && (
            <div className="modal-backdrop compact-backdrop" role="presentation" onClick={() => setIsFactoryExpandModalOpen(false)}>
              <section
                className="missing-modal factory-expand-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Expand factory floor"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="modal-head">
                  <div>
                    <p className="eyebrow">Factory Floor</p>
                    <h2>{factoryGridSize.width}x{factoryGridSize.height} to {nextFactoryGridSize.width}x{nextFactoryGridSize.height}</h2>
                  </div>
                  <button type="button" className="icon-button" aria-label="Close expansion requirements" onClick={() => setIsFactoryExpandModalOpen(false)}>
                    <X size={18} />
                  </button>
                </div>
                <div className="factory-cost-row factory-expand-costs" aria-label="Factory expansion requirements">
                  {factoryExpansionCost.map((amount) => (
                    <ItemSlot amount={amount} disabled={availableResourceAmount(state, amount.id) < amount.amount} state={state} onClick={handleJumpToResourceRecipe} key={amount.id} />
                  ))}
                </div>
                {!canExpandFactory && <p className="missing-line">Missing {missingResourceLine(state, factoryExpansionCost)}</p>}
                <button type="button" className="load-recipe-button" disabled={!canExpandFactory} onClick={handleFactoryExpand}>
                  Expand Floor
                </button>
              </section>
            </div>
          )}

          {selectedPipeConfig && (isSteamPipeMachine(selectedPipeConfig.machineId) || isEuCableMachine(selectedPipeConfig.machineId)) && (
            <div className="modal-backdrop compact-backdrop" role="presentation" onClick={() => setSelectedPipeConfigUid(null)}>
              <section
                className="missing-modal pipe-config-modal"
                role="dialog"
                aria-modal="true"
                aria-label={`Configure ${machines[selectedPipeConfig.machineId].name}`}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="modal-head">
                  <div>
                    <p className="eyebrow">Pipe Routing</p>
                    <h2>{machines[selectedPipeConfig.machineId].name}</h2>
                  </div>
                  <button type="button" className="icon-button" aria-label="Close pipe routing" onClick={() => setSelectedPipeConfigUid(null)}>
                    <X size={18} />
                  </button>
                </div>
                <div className="pipe-config-grid" aria-label="Pipe routing directions">
                  {[-1, 0, 1].flatMap((dy) =>
                    [-1, 0, 1].map((dx) => {
                      const neighbour = machineAtFactoryCell(selectedPipeConfig.x + dx, selectedPipeConfig.y + dy)
                      const direction = pipeDirections.find((candidate) => {
                        const offset = pipeDirectionOffsets[candidate]
                        return offset.dx === dx && offset.dy === dy
                      })
                      const isCenter = dx === 0 && dy === 0
                      const disabled = direction ? Boolean(selectedPipeConfig.pipeDisabledSides?.[direction]) : false
                      const connected = Boolean(direction && neighbour && machinesCanConnect(selectedPipeConfig, neighbour))
                      const className = [
                        'pipe-config-cell',
                        isCenter ? 'center' : '',
                        direction ? 'toggle' : '',
                        disabled ? 'disabled-side' : '',
                        connected ? 'connected-side' : '',
                      ].filter(Boolean).join(' ')
                      const content = isCenter ? (
                        <MachineGlyph id={selectedPipeConfig.machineId} active pipeConnections={pipeConnectionsForInstance(selectedPipeConfig)} />
                      ) : neighbour ? (
                        <MachineGlyph id={neighbour.machineId} active={connected} pipeConnections={pipeConnectionsForInstance(neighbour)} />
                      ) : (
                        <span className="empty-pipe-neighbour" />
                      )
                      if (!direction) {
                        return (
                          <span className={className} key={`${dx},${dy}`}>
                            {content}
                          </span>
                        )
                      }
                      return (
                        <button
                          type="button"
                          className={className}
                          aria-pressed={!disabled}
                          aria-label={`${disabled ? 'Enable' : 'Disable'} ${pipeDirectionOffsets[direction].label} connection`}
                          onClick={() => handleTogglePipeSide(selectedPipeConfig.uid, direction)}
                          key={`${dx},${dy}`}
                        >
                          {content}
                          <strong>{pipeDirectionOffsets[direction].label}</strong>
                        </button>
                      )
                    }),
                  )}
                </div>
                <p className="pipe-config-note">Tap a side to block or restore that pipe connection.</p>
              </section>
            </div>
          )}

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
                {machineUsesProcessStorage(selectedMachine.machineId) && (
                <>
                  <div className="processing-storage furnace-storage" aria-label={`${machines[selectedMachine.machineId].name} storage`}>
                    {furnaceStorageResources.length > 0 ? (
                      furnaceStorageResources.map((id) => (
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
                      ))
                    ) : (
                      <span className="empty-furnace-storage">No valid inputs or fuels</span>
                    )}
                  </div>
                  <div className={selectedMachineStorageResource ? 'machine-selected-item active' : 'machine-selected-item'} aria-live="polite">
                    <span>Selected</span>
                    <strong>
                      {selectedMachineStorageResource
                        ? `${resourceLabels[selectedMachineStorageResource]} x${formatAmount(availableResourceAmount(state, selectedMachineStorageResource))}`
                        : 'Tap an item above'}
                    </strong>
                  </div>
                </>
                )}
                <div className="machine-status-row">
                  <span>{machineStatus(state, selectedMachine)}</span>
                  {selectedMachine.machineId === 'steamBoiler' && (
                    <strong>
                      Steam {formatSteamLitres(selectedMachine.process.steamStoredMs)}L/{formatSteamLitres(boilerSteamCapacityMs)}L
                      {' | '}
                      Produces {formatAmount(boilerSteamProductionLitresPerSecond)}L/s
                    </strong>
                  )}
                  {selectedMachine.machineId === 'steamMacerator' && (
                    <strong>
                      Internal {formatSteamLitres(selectedMachine.process.steamStoredMs)}L/{formatSteamLitres(steamMaceratorCapacityMs)}L
                      {' | '}
                      Supply {formatSteamLitres(availableConnectedSteam(state, selectedMachine))}L
                      {' | '}
                      Uses {formatAmount(selectedMachineSteamUsagePerSecond)}L/s
                    </strong>
                  )}
                  {isSteamPoweredMachine(selectedMachine.machineId) && selectedMachine.machineId !== 'steamMacerator' && !isAutoMinerMachine(selectedMachine.machineId) && (
                    <strong>
                      Internal {formatSteamLitres(selectedMachine.process.steamStoredMs)}L/{formatSteamLitres(steamMaceratorCapacityMs)}L
                      {' | '}
                      Supply {formatSteamLitres(availableConnectedSteam(state, selectedMachine))}L
                      {' | '}
                      Uses {formatAmount(selectedMachineSteamUsagePerSecond)}L/s
                    </strong>
                  )}
                  {selectedMachine.machineId === 'steamTank' && (
                    <strong>
                      Steam {formatSteamLitres(selectedMachine.process.steamStoredMs)}L/{formatSteamLitres(steamTankCapacityMs)}L
                      {(selectedMachine.process.fluids.creosote ?? 0) > 0
                        ? ` | Creosote ${formatLitres(selectedMachine.process.fluids.creosote ?? 0)}L/${ironTankFluidCapacityLitres}L`
                        : ''}
                      {(selectedMachine.process.fluids.water ?? 0) > 0 ? ` | Water ${formatLitres(selectedMachine.process.fluids.water ?? 0)}L/${ironTankFluidCapacityLitres}L` : ''}
                    </strong>
                  )}
                  {selectedMachine.machineId === 'cokeOven' && (
                    <strong>Creosote {formatLitres(selectedMachine.process.fluids.creosote ?? 0)}L/{selectedMachine.process.fluidCapacityLitres || cokeOvenFluidCapacityLitres}L</strong>
                  )}
                  {isLiquidSteamBoilerMachine(selectedMachine.machineId) && (
                    <strong>
                      Steam {formatSteamLitres(selectedMachine.process.steamStoredMs)}L/{formatSteamLitres(liquidSteamBoilerCapacityMs)}L
                      {' | '}
                      Creosote {formatLitres(selectedMachine.process.fluids.creosote ?? 0)}L/{liquidSteamBoilerFluidCapacityLitres}L
                      {' | '}
                      Makes {formatAmount(liquidSteamBoilerSteamProductionLitresPerSecond)}L/s
                    </strong>
                  )}
                  {isEuStorageMachine(selectedMachine.machineId) && (
                    <strong>
                      EU {Math.floor(selectedMachine.process.euStored)}/{selectedMachine.process.euCapacity || lvBatteryBufferEuCapacity}
                      {' | '}
                      Supply {formatAmount(lvBatteryBufferOutputEuPerSecond)} EU/s
                    </strong>
                  )}
                  {isEuProducerMachine(selectedMachine.machineId) && (
                    <strong>
                      EU {Math.floor(selectedMachine.process.euStored)}/{steamTurbineEuCapacity}
                      {' | '}
                      Steam supply {formatSteamLitres(availableConnectedSteam(state, selectedMachine))}L
                      {' | '}
                      Uses {formatAmount(steamTurbineSteamUseLitresPerSecond)}L/s
                      {' | '}
                      Makes {formatAmount(steamTurbineSteamUseLitresPerSecond * 2)} EU/s
                    </strong>
                  )}
                  {isEuPoweredMachine(selectedMachine.machineId) && !isAutoMinerMachine(selectedMachine.machineId) && (
                    <strong>
                      Internal {Math.floor(selectedMachine.process.euStored)}/{selectedMachine.process.euCapacity || 0} EU
                      {' | '}
                      Supply {Math.floor(availableConnectedEu(state, selectedMachine))} EU
                      {' | '}
                      Uses {formatAmount(selectedMachineEuUsagePerSecond)} EU/s
                      {isEuBlastMachine(selectedMachine.machineId) && selectedMachineRecipe?.minimumEuStored
                        ? ` | Needs ${formatAmount(selectedMachineRecipe.minimumEuStored)} buffered EU`
                        : ''}
                    </strong>
                  )}
                  {selectedMachine.machineId === 'steamAutoMiner' && (
                    <strong>
                      Internal {formatSteamLitres(selectedMachine.process.steamStoredMs)}L/{formatSteamLitres(selectedMachine.process.steamCapacityMs || steamMachineInternalCapacityMs)}L
                      {' | '}
                      Supply {formatSteamLitres(availableConnectedSteam(state, selectedMachine))}L
                      {' | '}
                      Uses {formatAmount(steamAutoMinerSteamUsagePerSecond)}L/s
                    </strong>
                  )}
                  {selectedMachine.machineId === 'lvAutoMiner' && (
                    <strong>
                      Internal {Math.floor(selectedMachine.process.euStored)}/{selectedMachine.process.euCapacity || 0} EU
                      {' | '}
                      Supply {Math.floor(availableConnectedEu(state, selectedMachine))} EU
                      {' | '}
                      Uses {formatAmount(lvAutoMinerEuUsagePerSecond)} EU/s
                    </strong>
                  )}
                </div>
                {selectedMachine.machineId === 'well' ? (
                  <div className="well-interface">
                    <MachineGlyph id="well" active />
                    <span>Supplies adjacent boilers</span>
                  </div>
                ) : selectedMachine.machineId === 'steamTank' ? (
                  <div className="well-interface">
                    {(selectedMachine.process.fluids.creosote ?? 0) > 0 ? (
                      <FluidTank label="Creosote" storedLitres={selectedMachine.process.fluids.creosote ?? 0} capacityLitres={ironTankFluidCapacityLitres} />
                    ) : (selectedMachine.process.fluids.water ?? 0) > 0 ? (
                      <FluidTank label="Water" storedLitres={selectedMachine.process.fluids.water ?? 0} capacityLitres={ironTankFluidCapacityLitres} />
                    ) : (
                      <SteamTank storedMs={selectedMachine.process.steamStoredMs} capacityMs={steamTankCapacityMs} />
                    )}
                    <span>Stores steam or one fluid from connected pipes</span>
                  </div>
                ) : isSteamPipeMachine(selectedMachine.machineId) ? (
                  <div className="well-interface">
                    <MachineGlyph id={selectedMachine.machineId} active />
                    <span>Transfers steam at {steamPipeTransferLitresPerSecond[selectedMachine.machineId] ?? 0}L/s</span>
                  </div>
                ) : isEuCableMachine(selectedMachine.machineId) ? (
                  <div className="well-interface">
                    <MachineGlyph id={selectedMachine.machineId} active />
                    <span>Loses {tinCableLossEuPerTile} EU per cable tile in a powered route</span>
                  </div>
                ) : isLiquidSteamBoilerMachine(selectedMachine.machineId) ? (
                  <div className="well-interface">
                    <SteamTank storedMs={selectedMachine.process.steamStoredMs} capacityMs={liquidSteamBoilerCapacityMs} />
                    <FluidTank label="Creosote" storedLitres={selectedMachine.process.fluids.creosote ?? 0} capacityLitres={liquidSteamBoilerFluidCapacityLitres} />
                    <span>
                      Burns {formatAmount(liquidSteamBoilerCreosoteUseLitresPerSecond)}L/s creosote into {formatAmount(liquidSteamBoilerSteamProductionLitresPerSecond)}L/s steam
                    </span>
                  </div>
                ) : isEuStorageMachine(selectedMachine.machineId) ? (
                  <div className="well-interface">
                    <EnergyTank storedEu={selectedMachine.process.euStored} capacityEu={selectedMachine.process.euCapacity || lvBatteryBufferEuCapacity} />
                    <MachineGlyph id={selectedMachine.machineId} active={selectedMachine.process.euStored > 0} />
                    <span>Stores LV power and supplies nearby electric machines through lossy cable routes</span>
                  </div>
                ) : isEuProducerMachine(selectedMachine.machineId) ? (
                  <div className="well-interface">
                    <EnergyTank storedEu={selectedMachine.process.euStored} capacityEu={steamTurbineEuCapacity} />
                    <MachineGlyph id={selectedMachine.machineId} active={selectedMachine.process.activeRecipeId === 'generate_lv_eu'} />
                    <span>
                      Uses {formatAmount(steamTurbineSteamUseLitresPerSecond)}L/s steam to make {formatAmount(steamTurbineSteamUseLitresPerSecond * 2)} EU/s
                    </span>
                  </div>
                ) : isAutoMinerMachine(selectedMachine.machineId) ? (
                  <div className="well-interface auto-miner-interface">
                    {selectedMachine.machineId === 'steamAutoMiner' ? (
                      <SteamTank storedMs={selectedMachine.process.steamStoredMs} capacityMs={selectedMachine.process.steamCapacityMs || steamMachineInternalCapacityMs} />
                    ) : (
                      <EnergyTank storedEu={selectedMachine.process.euStored} capacityEu={selectedMachine.process.euCapacity || 0} />
                    )}
                    <MachineGlyph id={selectedMachine.machineId} active={Boolean(selectedMachine.process.activeRecipeId)} />
                    <div className="furnace-progress auto-miner-action-progress" aria-label="Auto miner action progress">
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
                    <span>
                      {state.autoMinerAssignments[selectedMachine.uid]
                        ? `Assigned to ${gatherTargets[state.autoMinerAssignments[selectedMachine.uid]].name} | ${
                            selectedMachine.machineId === 'steamAutoMiner' ? steamAutoMinerActionDamage : lvAutoMinerActionDamage
                          } damage every ${formatDuration(selectedMachine.machineId === 'steamAutoMiner' ? steamAutoMinerActionMs : lvAutoMinerActionMs)}`
                        : 'Assign this miner from a valid resource card.'}
                    </span>
                  </div>
                ) : (
                <div className={`furnace-interface ${selectedMachine.machineId}-process-interface`}>
                  {selectedMachine.machineId !== 'steamBoiler' && (
                  <div className="furnace-inputs">
                    <ProcessItemSlot slot={selectedMachine.process.input} label="Input" onClick={() => handleProcessSlotPress('input')} />
                    {(selectedMachine.machineId === 'steamAlloySmelter' || selectedMachine.machineId === 'lvAssembler' || selectedMachine.machineId === 'lvCentrifuge') && (
                      <ProcessItemSlot slot={selectedMachine.process.secondaryInput} label="Input 2" onClick={() => handleProcessSlotPress('secondaryInput')} />
                    )}
                    {isSteamPoweredMachine(selectedMachine.machineId) && (
                      <>
                        <SteamTank storedMs={selectedMachine.process.steamStoredMs} capacityMs={steamMachineInternalCapacityMs} />
                        <span className="steam-usage-line">{formatAmount(selectedMachineSteamUsagePerSecond)}L/s</span>
                      </>
                    )}
                    {isEuPoweredMachine(selectedMachine.machineId) && (
                      <>
                        <EnergyTank storedEu={selectedMachine.process.euStored} capacityEu={selectedMachine.process.euCapacity || 0} />
                        <span className="steam-usage-line">{formatAmount(selectedMachineEuUsagePerSecond)} EU/s</span>
                      </>
                    )}
                    {selectedMachine.machineId === 'cokeOven' && (
                      <FluidTank
                        label="Creosote"
                        storedLitres={selectedMachine.process.fluids.creosote ?? 0}
                        capacityLitres={selectedMachine.process.fluidCapacityLitres || cokeOvenFluidCapacityLitres}
                      />
                    )}
                    {selectedMachine.machineId === 'furnace' && (
                    <div
                      className={selectedMachine.process.fuelRemainingMs > 0 ? 'furnace-flame active' : 'furnace-flame'}
                      title={
                        selectedMachine.process.fuelRemainingMs > 0
                          ? `Fuel remaining: ${formatDuration(selectedMachine.process.fuelRemainingMs)}`
                          : 'No burning fuel'
                      }
                    >
                      <span
                        style={{
                          height: `${
                            selectedMachine.process.fuelRemainingMs > 0 && selectedMachine.process.fuelDurationMs > 0
                              ? Math.max(6, Math.min(100, (selectedMachine.process.fuelRemainingMs / selectedMachine.process.fuelDurationMs) * 100))
                              : selectedMachine.process.fuelRemainingMs > 0
                                ? 100
                                : 0
                          }%`,
                        }}
                      />
                      <strong>{selectedMachine.process.fuelRemainingMs > 0 ? formatDuration(selectedMachine.process.fuelRemainingMs) : ''}</strong>
                    </div>
                    )}
                    {selectedMachine.machineId === 'furnace' && (
                    <ProcessItemSlot slot={selectedMachine.process.fuel} label="Fuel" onClick={() => handleProcessSlotPress('fuel')} />
                    )}
                    {selectedMachine.machineId === 'brickedBlastFurnace' && (
                    <ProcessItemSlot slot={selectedMachine.process.fuel} label="Coke" onClick={() => handleProcessSlotPress('fuel')} />
                    )}
                  </div>
                  )}
                  {selectedMachine.machineId === 'steamBoiler' && (
                    <>
                    <SteamTank storedMs={selectedMachine.process.steamStoredMs} capacityMs={boilerSteamCapacityMs} />
                    <div className="furnace-inputs">
                      <div
                        className={selectedMachine.process.fuelRemainingMs > 0 ? 'furnace-flame active' : 'furnace-flame'}
                        title={
                          selectedMachine.process.fuelRemainingMs > 0
                            ? `Fuel remaining: ${formatDuration(selectedMachine.process.fuelRemainingMs)}`
                            : 'No burning fuel'
                        }
                      >
                        <span
                          style={{
                            height: `${
                              selectedMachine.process.fuelRemainingMs > 0 && selectedMachine.process.fuelDurationMs > 0
                                ? Math.max(6, Math.min(100, (selectedMachine.process.fuelRemainingMs / selectedMachine.process.fuelDurationMs) * 100))
                                : selectedMachine.process.fuelRemainingMs > 0
                                  ? 100
                                  : 0
                            }%`,
                          }}
                        />
                        <strong>{selectedMachine.process.fuelRemainingMs > 0 ? formatDuration(selectedMachine.process.fuelRemainingMs) : ''}</strong>
                      </div>
                      <ProcessItemSlot slot={selectedMachine.process.fuel} label="Fuel" onClick={() => handleProcessSlotPress('fuel')} />
                    </div>
                    </>
                  )}
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
                  {selectedMachine.machineId !== 'steamBoiler' && (
                    <ProcessItemSlot slot={selectedMachine.process.output} label="Output" onClick={() => handleProcessSlotPress('output')} />
                  )}
                </div>
                )}
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
                {machineUsesProcessStorage(selectedMachine.machineId) && (
                  <p className="furnace-help">Tap storage, then a valid slot to choose an amount. Tap Output to collect.</p>
                )}
              </section>
            </div>
          )}
        </section>
      )}

      {page === 'guide' && (
        <section className="guide-page" aria-label="Quest guide">
          <QuestBook
            quests={guideQuests}
            state={state}
            activeChapterId={activeQuestChapterId}
            selectedQuestId={selectedQuestId}
            onSelectChapter={setActiveQuestChapterId}
            onSelectQuest={handleSelectQuest}
          />
        </section>
      )}

      {selectedQuest && (
        <QuestDetail
          quest={selectedQuest}
          state={state}
          onClose={() => setSelectedQuestId(null)}
          onClaim={handleClaimQuestReward}
          onSelectResource={handleJumpToResourceRecipe}
          onSelectMachine={handleJumpToMachineRecipe}
        />
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
