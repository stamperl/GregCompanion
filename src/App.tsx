import {
  Axe,
  BookOpen,
  ChevronLeft,
  ChevronRight,
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
  type CSSProperties,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import './App.css'
import {
  fuelDefinitions,
  fluidIds,
  fluidLabels,
  gatherTargets,
  canAutoMinerTarget,
  isAutoMinerMachine,
  isEuCableMachine,
  isEuBlastMachine,
  isEuNetworkMachine,
  isEuPoweredMachine,
  isEuProducerMachine,
  isEuStorageMachine,
  isItemAutomationMachine,
  isItemHopperMachine,
  isItemStorageMachine,
  isLiquidSteamBoilerMachine,
  isPlaceableMachine,
  isSteamNetworkMachine,
  isSteamPipeMachine,
  isSteamPoweredMachine,
  machines,
  processRecipes,
  questChapters,
  quests as questDefinitions,
  resourceLabels,
  sellItems,
  shopItems,
  tools,
} from './game/content'
import {
  availableResourceAmount,
  availableUnplacedMachineCount,
  availableConnectedEu,
  availableConnectedEuStorage,
  availableConnectedSteam,
  assignAutoMiner,
  buyShopItem,
  boilerSteamProductionLitresPerSecond,
  boilerHasWater,
  boilerSteamCapacityMs,
  bucketFluidTransferLitres,
  canBuyShopItem,
  canSellShopItem,
  cokeOvenFluidCapacityLitres,
  canCrowbarRemoveMachine,
  canCraft,
  claimAllQuestRewards,
  claimQuestReward,
  collectProcessOutput,
  createCreativeState,
  currentFluidOutputFlows,
  currentEuCableFlowEuPerSecond,
  currentSteamPipeFlowLitresPerSecond,
  cyclePipeSideMode,
  craftableQuantity,
  craftRecipeInstant,
  equipResource,
  emptyBucketIntoMachine,
  equipmentSlots,
  equipmentSlotAccepts,
  expandFactoryFloor,
  findGridRecipe,
  fillBucketFromMachine,
  factoryFoundationCost,
  factoryFoundationSizes,
  factoryGridForState,
  fluidPipeBufferCapacityLitres,
  getBestToolForTarget,
  hasFactoryFloor,
  hitGatherTarget,
  isAutoMinerPowered,
  isFluidOutletConfigurableMachine,
  isRecipeVisible,
  isResourceDiscovered,
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
  pipeSideMode,
  pipeSideModeLabels,
  processStackLimit,
  questProgress,
  questObjectiveProgress,
  questObjectives,
  questKind,
  questScripReward,
  questStatus,
  recipeFitsTerminalGrid,
  recipesUsingInput,
  removeProcessSlot,
  searchTerminalRecipes,
  sellShopItem,
  setFluidOutputDirection,
  setHopperOutputDirection,
  shopItemCooldownMs,
  shopItemCooldownRemainingMs,
  steamMachineInternalCapacityMs,
  steamPipeBufferCapacityMs,
  steamAutoMinerActionDamage,
  steamAutoMinerActionMs,
  steamAutoMinerSteamUseLitres,
  steamPipeTransferLitresPerSecond,
  steamTurbineEuCapacity,
  steamTurbineSteamUseLitresPerSecond,
  steamTankCapacityMs,
  steamTankCapacityMsForInstance,
  steamTankFluidCapacityLitresForInstance,
  steamTankStructureForInstance,
  lvBatteryBufferEuCapacity,
  lvBatteryBufferOutputEuPerSecond,
  liquidSteamBoilerCapacityMs,
  liquidSteamBoilerCreosoteUseLitresPerSecond,
  liquidSteamBoilerFluidCapacityLitres,
  liquidSteamBoilerSteamProductionLitresPerSecond,
  tinCableLossEuPerTile,
  euCableBufferCapacity,
  lvAutoMinerActionDamage,
  lvAutoMinerActionMs,
  lvAutoMinerEuUse,
  ironTankFluidCapacityLitres,
  canExpandFactoryFloor,
  terminalAvailableAmount,
  tickGame,
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
import { preloadGeneratedIconImages, preloadGeneratedIconLinks } from './components/gameIconAssets'
import { DurabilityBar, ItemSlot, MachineSlot, ProcessItemSlot } from './components/InventorySlots'
import type {
  CraftSlot,
  EquipmentSlotId,
  FluidId,
  GatherTargetId,
  GameState,
  MachineId,
  MachineInstance,
  MachineProcessState,
  OfflineProgressResult,
  PipeDirection,
  PipeSideMode,
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

function recipeOpensProcessView(recipe: Recipe) {
  return Boolean(recipe.requiredMachine || recipe.recipeType === 'processing' || (recipe.stationType && recipe.stationType !== 'hand'))
}

type Page = 'home' | 'gather' | 'terminal' | 'processing' | 'guide' | 'shop'
type TerminalMode = 'recipes' | 'uses'
type DragPreview = { id: ResourceId; x: number; y: number }
type FactoryPan = { x: number; y: number }
type PipeSideState = 'connected' | 'open' | 'blocked'
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
  slotId: ProcessSlotId
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
  'standardChest',
  'hopper',
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
  'lvMacerator',
  'lvForgeHammer',
  'lvCompressor',
  'lvExtractor',
  'lvAlloySmelter',
  'lvFurnace',
  'lvWiremill',
  'lvBender',
  'lvLathe',
  'lvElectrolyzer',
  'lvAssembler',
  'lvCentrifuge',
  'lvAutoMiner',
  'cokeOvenPart',
  'cokeOven',
  'brickedBlastFurnacePart',
  'brickedBlastFurnace',
  'arcBlastFurnacePart',
  'arcBlastFurnace',
]

const visibleQuestChapterIds = new Set<QuestChapterId>(['gettingStarted', 'steamAge', 'lvAge', 'multiblocks'])
const placeableFactoryMachineOrder = machineOrder.filter(isPlaceableMachine)
const factoryToolOrder: ResourceId[] = ['ironCrowbar', 'bronzeWrench', 'ironWrench']

function fluidLabel(fluidId: FluidId) {
  return fluidLabels[fluidId]
}

function storedFluids(process: MachineProcessState) {
  return fluidIds
    .map((id) => ({ id, amount: process.fluids[id] ?? 0 }))
    .filter((fluid) => fluid.amount > 0)
}

const pipeDirectionOffsets: Record<PipeDirection, { dx: number; dy: number; label: string }> = {
  north: { dx: 0, dy: -1, label: 'North' },
  east: { dx: 1, dy: 0, label: 'East' },
  south: { dx: 0, dy: 1, label: 'South' },
  west: { dx: -1, dy: 0, label: 'West' },
}
const oppositePipeDirection: Record<PipeDirection, PipeDirection> = {
  north: 'south',
  east: 'west',
  south: 'north',
  west: 'east',
}

function pipeFlowDirections(direction: PipeDirection, mode: PipeSideMode) {
  if (mode === 'blocked') return [] as PipeDirection[]
  if (mode === 'output') return [direction]
  if (mode === 'input') return [oppositePipeDirection[direction]]
  return [direction, oppositePipeDirection[direction]]
}

function PipeFlowArrows({ direction, mode }: { direction: PipeDirection; mode: PipeSideMode }) {
  const arrows = pipeFlowDirections(direction, mode)
  return (
    <span className={arrows.length > 1 ? 'pipe-flow-arrows dual' : 'pipe-flow-arrows'} aria-hidden="true">
      {arrows.map((arrow, index) => (
        <span className={`pipe-flow-arrow arrow-${arrow}`} key={`${arrow}-${index}`} />
      ))}
    </span>
  )
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

const multiblockQuestIds = new Set<QuestId>([
  'cokeOvenBrickQuest',
  'cokeOvenQuest',
  'bbfCasingsQuest',
  'buildBbfQuest',
  'makeHeatingCoilsQuest',
  'buildArcBlastFurnaceQuest',
  'bufferArcBlastFurnaceQuest',
])

function questBookChapterId(quest: Quest): QuestChapterId {
  if (quest.chapterId === 'lvFoundations' || quest.chapterId === 'blastPrep') return 'lvAge'
  if (quest.chapterId === 'steamAge' || quest.chapterId === 'cokeAndSteel') return 'steamAge'
  return 'gettingStarted'
}

const questPositionOverrides: Partial<Record<QuestId, { x: number; y: number }>> = {
  punchTree: { x: 70, y: 150 },
  craftPlanks: { x: 245, y: 150 },
  craftSticks: { x: 420, y: 150 },
  craftAxe: { x: 595, y: 70 },
  chopFaster: { x: 770, y: 70 },
  mineStone: { x: 595, y: 250 },
  craftShovelQuest: { x: 770, y: 390 },
  buildFurnace: { x: 770, y: 210 },
  craftMortar: { x: 770, y: 330 },
  firstDirt: { x: 945, y: 270 },
  copperAndTin: { x: 1120, y: 210 },
  bronzeAge: { x: 1295, y: 210 },
  gatherClay: { x: 945, y: 430 },
  makeBricks: { x: 1120, y: 430 },
  buildFoundation: { x: 1295, y: 430 },
  buildWell: { x: 70, y: 200 },
  craftSteamCasingQuest: { x: 245, y: 200 },
  makeSteam: { x: 420, y: 200 },
  pipeSteam: { x: 595, y: 200 },
  factoryToolsQuest: { x: 595, y: 380 },
  steamMaceratorQuest: { x: 770, y: 115 },
  steamForgeHammerQuest: { x: 945, y: 115 },
  steamOrePrepQuest: { x: 945, y: 20 },
  steamUtilityBranch: { x: 1120, y: 115 },
  treeTapQuest: { x: 770, y: 320 },
  cokeOvenBrickQuest: { x: 945, y: 320 },
  cokeOvenQuest: { x: 1120, y: 320 },
  creosoteQuest: { x: 1295, y: 320 },
  firebrickQuest: { x: 1470, y: 230 },
  bbfCasingsQuest: { x: 1645, y: 230 },
  buildBbfQuest: { x: 1820, y: 230 },
  firstSteel: { x: 1995, y: 230 },
  steelPlateQuest: { x: 2170, y: 230 },
  findRedstone: { x: 70, y: 220 },
  smeltRedAlloy: { x: 245, y: 220 },
  cutRedAlloyWireQuest: { x: 420, y: 220 },
  extractRubberQuest: { x: 430, y: 65 },
  insulateWireQuest: { x: 610, y: 65 },
  makeGlassTubes: { x: 430, y: 375 },
  makeCarbonDustQuest: { x: 610, y: 375 },
  makeResistors: { x: 790, y: 375 },
  makeVacuumTubes: { x: 790, y: 220 },
  pulpWoodQuest: { x: 970, y: 105 },
  pressCircuitBoard: { x: 1150, y: 105 },
  firstLvCircuit: { x: 1150, y: 270 },
  buildSteamTurbineQuest: { x: 1335, y: 220 },
  makeTinCableQuest: { x: 1515, y: 220 },
  routeLvPowerQuest: { x: 1695, y: 220 },
  buildLvWiremillQuest: { x: 1875, y: 105 },
  runLvWiremillQuest: { x: 1875, y: 335 },
  bufferLvPowerQuest: { x: 2070, y: 220 },
  creosoteBoilerQuest: { x: 2250, y: 50 },
  buildLvBenderQuest: { x: 2250, y: 190 },
  runLvBenderQuest: { x: 2430, y: 190 },
  buildLvLatheQuest: { x: 2250, y: 330 },
  runLvLatheQuest: { x: 2430, y: 330 },
  buildLvElectrolyzerQuest: { x: 2620, y: 190 },
  findBauxiteQuest: { x: 2800, y: 105 },
  makeAluminiumDustQuest: { x: 2980, y: 105 },
  findNickelQuest: { x: 2250, y: 510 },
  makeCupronickelQuest: { x: 2430, y: 510 },
  makeHeatingCoilsQuest: { x: 2620, y: 510 },
  buildArcBlastFurnaceQuest: { x: 2800, y: 510 },
  bufferArcBlastFurnaceQuest: { x: 2980, y: 510 },
  firstAluminiumQuest: { x: 3160, y: 300 },
}

const multiblockQuestPositionOverrides: Partial<Record<QuestId, { x: number; y: number }>> = {
  bbfCasingsQuest: { x: 70, y: 260 },
  buildBbfQuest: { x: 245, y: 260 },
  makeHeatingCoilsQuest: { x: 70, y: 80 },
  buildArcBlastFurnaceQuest: { x: 245, y: 80 },
  bufferArcBlastFurnaceQuest: { x: 420, y: 80 },
}

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

function waitForEntryLoadingPaint() {
  if (typeof window === 'undefined') return Promise.resolve()
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve())
    })
  })
}

function waitForEntryLoadingMinimum() {
  if (typeof window === 'undefined') return Promise.resolve()
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 2000)
  })
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

function migrationNoticeText(notices: string[]) {
  if (!notices.includes('coke-oven-multiblock')) return ''
  return 'Coke Ovens are now 2x2 multiblocks. Your old Coke Oven has been unpacked and replaced with four Coke Oven Blocks in Factory Parts. Place those four blocks in a 2x2 to form the working oven again.'
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

const factoryCellSize = 50
const factoryCellGap = 5
const factoryViewportPadding = 12
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
    <div className="recipe-pattern-grid" aria-label={`${recipeDisplayName(recipe)} pattern`}>
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
  return recipe.recipeType === 'machine'
}

function FactoryFloorLayoutPreview({ recipe }: { recipe: Recipe }) {
  if (!isFactoryFloorLayoutRecipe(recipe)) return null
  const machineId = recipe.id === 'build_arc_blast_furnace' ? 'arcBlastFurnace' : 'brickedBlastFurnace'
  const partId = recipe.id === 'build_arc_blast_furnace' ? 'arcBlastFurnacePart' : 'brickedBlastFurnacePart'
  const label = recipe.id === 'build_arc_blast_furnace' ? 'arc casing blocks' : 'BBF casing blocks'

  return (
    <div className="factory-layout-preview" aria-label={`${recipeDisplayName(recipe)} factory floor layout`}>
      <div className="factory-layout-multiblock">
        <MachineGlyph id={machineId} />
        {Array.from({ length: 4 }, (_, index) => (
          <span className={index === 0 ? 'factory-layout-cell controller' : 'factory-layout-cell'} key={index}>
            <MachineGlyph id={index === 0 ? machineId : partId} />
          </span>
        ))}
      </div>
      <p>Place the 4 staged {label} as a 2x2 on the factory floor.</p>
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

function recipeDisplayName(recipe: Recipe) {
  return recipePrimaryOutput(recipe).label
}

function SteamTank({ storedMs, capacityMs }: { storedMs: number; capacityMs: number }) {
  const storedLitres = formatSteamLitres(storedMs)
  const capacityLitres = formatSteamLitres(capacityMs)
  const fillPercent = capacityMs > 0 ? Math.max(0, Math.min(100, (storedMs / capacityMs) * 100)) : 0

  return (
    <div className="steam-tank" aria-label={`Steam buffer ${storedLitres} of ${capacityLitres} litres`}>
      <div className="steam-tank-gauge">
        <span style={{ height: `${fillPercent}%` }} />
      </div>
      <div className="steam-tank-readout">
        <span>Steam buffer</span>
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

function EmptyTank({ capacityLitres, label = 'Empty tank' }: { capacityLitres: number; label?: string }) {
  return (
    <div className="empty-storage empty-tank" aria-label={`${label} ${capacityLitres} litres capacity`}>
      <p>{label}</p>
      <span>{formatLitres(capacityLitres)}L capacity</span>
    </div>
  )
}

type MachineMetricTone = 'steam' | 'supply' | 'usage' | 'eu' | 'fluid'

type MachineMetric = {
  label: string
  value: string
  detail: string
  tone: MachineMetricTone
  fillPercent?: number
}

function metricFill(current: number, capacity: number) {
  return capacity > 0 ? Math.max(0, Math.min(100, (current / capacity) * 100)) : 0
}

function MachineMetricTile({ metric }: { metric: MachineMetric }) {
  return (
    <div className={`machine-meter ${metric.tone}`} aria-label={`${metric.label} ${metric.value} ${metric.detail}`}>
      <span>{metric.label}</span>
      <strong>{metric.value}</strong>
      <small>{metric.detail}</small>
      <div className="machine-meter-bar" aria-hidden="true">
        <span style={{ width: `${metric.fillPercent ?? 100}%` }} />
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

function canResourceEnterProcessSlot(machineId: MachineId, slotId: ProcessSlotId, resourceId: ResourceId) {
  if (isItemStorageMachine(machineId)) return slotId === 'input' || slotId === 'secondaryInput' || slotId === 'fuel'
  if (isItemHopperMachine(machineId)) return slotId === 'input' || slotId === 'secondaryInput' || slotId === 'fuel' || slotId === 'output'
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
  if (slotId !== 'fuel') return false
  if (machineId === 'brickedBlastFurnace') return processRecipes.some((recipe) => recipe.machineId === machineId && recipe.fuelInput?.id === resourceId)
  return (machineId === 'furnace' || machineId === 'steamBoiler') && resourceId in fuelDefinitions
}

function canResourceEnterMachine(machineId: MachineId, resourceId: ResourceId) {
  if (isItemAutomationMachine(machineId)) return true
  return canResourceEnterProcessSlot(machineId, 'input', resourceId) || canResourceEnterProcessSlot(machineId, 'fuel', resourceId)
}

function suggestedProcessInsertQuantity(
  instance: MachineInstance,
  slotId: ProcessSlotId,
  resourceId: ResourceId,
  available: number,
) {
  const currentAmount = instance.process[slotId]?.id === resourceId ? instance.process[slotId]?.amount ?? 0 : 0
  const candidates = processRecipes.filter((recipe) => recipe.machineId === instance.machineId)
  const recipe =
    slotId === 'fuel'
      ? candidates.find((candidate) => candidate.fuelInput?.id === resourceId)
      : slotId === 'output'
        ? undefined
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
  if (isItemAutomationMachine(machineId)) return true
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
  const storedItemCount = [process.input, process.secondaryInput, process.fuel, process.output].reduce((sum, slot) => sum + (slot?.amount ?? 0), 0)
  if (instance.machineId === 'well') return 'Supplying water'
  if (isItemStorageMachine(instance.machineId)) return storedItemCount > 0 ? `Storing ${formatAmount(storedItemCount)} items` : 'Empty storage'
  if (isItemHopperMachine(instance.machineId)) {
    const outputDirection = pipeDirections.find((direction) => pipeSideMode(instance, direction) === 'output')
    if (!outputDirection) return 'No output side'
    if (storedItemCount < 1) return 'Empty hopper'
    return process.activeRecipeId ? `Feeding ${pipeDirectionOffsets[outputDirection].label}` : `Ready ${pipeDirectionOffsets[outputDirection].label}`
  }
  if (instance.machineId === 'steamTank') {
    const storedFluid = storedFluids(process)[0]
    if (storedFluid) return `Holding ${fluidLabel(storedFluid.id).toLowerCase()}`
    return process.steamStoredMs > 0 ? 'Holding steam' : 'Empty tank'
  }
  if (isSteamPipeMachine(instance.machineId)) return `${steamPipeTransferLitresPerSecond[instance.machineId] ?? 0}L/s transfer`
  if (isEuCableMachine(instance.machineId)) return `${tinCableLossEuPerTile} EU/tile loss`
  if (isEuStorageMachine(instance.machineId)) {
    if (process.euStored >= (process.euCapacity || lvBatteryBufferEuCapacity)) return 'EU buffer full'
    return process.activeRecipeId ? 'Charging EU' : 'Buffer ready'
  }
  if (isLiquidSteamBoilerMachine(instance.machineId)) {
    if (!boilerHasWater(state, instance)) return 'No water'
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
    if (process.steamStoredMs >= boilerSteamCapacityMs && process.fuelRemainingMs > 0) return 'Steam full - fuel paused'
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
  onOpenFactory,
}: {
  progress: ReturnType<typeof questObjectiveProgress>
  state: GameState
  onSelectResource: (resourceId: ResourceId) => void
  onSelectMachine: (machineId: MachineId) => void
  onOpenFactory: () => void
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

  if (objective.type === 'machine') {
    return (
      <button type="button" className={progress.complete ? 'quest-objective complete' : 'quest-objective'} onClick={() => onSelectMachine(objective.id)}>
        <MachineSlot id={objective.id} amount={objective.amount} muted={!progress.complete} />
        <span>{progress.label}</span>
        <strong>{actionLabel}</strong>
      </button>
    )
  }

  if (objective.type === 'placedMachine') {
    return (
      <button type="button" className={progress.complete ? 'quest-objective complete factory-link' : 'quest-objective factory-link'} onClick={onOpenFactory}>
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
  onOpenFactory,
}: {
  quest: Quest
  state: GameState
  onClose: () => void
  onClaim: (questId: QuestId) => void
  onSelectResource: (resourceId: ResourceId) => void
  onSelectMachine: (machineId: MachineId) => void
  onOpenFactory: () => void
}) {
  const status = questStatus(state, quest)
  const claimed = state.claimedQuests.includes(quest.id)
  const claimReady = status === 'completed' && !claimed
  const progressRows = questObjectives(quest).map((objective) => questObjectiveProgress(state, objective))
  const kind = questKind(quest)
  const scripReward = questScripReward(quest)
  const rewardResources = quest.rewards.resources ?? []
  const rewardMachines = quest.rewards.machines ?? []

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
            <strong>{kind} | {questStatusText(status)}</strong>
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
              onOpenFactory={onOpenFactory}
              key={`${progress.objective.type}-${'id' in progress.objective ? progress.objective.id : progress.objective.level}`}
            />
          ))}
        </div>
        <div className="quest-reward-panel" aria-label="Quest rewards">
          <span>Reward</span>
          <strong>{formatAmount(scripReward)} Foundry Scrip</strong>
          {rewardResources.map((amount) => (
            <span key={`reward-${amount.id}`}>+{formatAmount(amount.amount)} {resourceLabels[amount.id]}</span>
          ))}
          {rewardMachines.map((amount) => (
            <span key={`reward-${amount.id}`}>+{formatAmount(amount.amount)} {machines[amount.id].name}</span>
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
  onClaimAll,
  claimableRewardCount,
}: {
  quests: Quest[]
  state: GameState
  activeChapterId: QuestChapterId
  selectedQuestId: QuestId | null
  onSelectChapter: (chapterId: QuestChapterId) => void
  onSelectQuest: (questId: QuestId) => void
  onClaimAll: () => void
  claimableRewardCount: number
}) {
  const visibleQuestChapters = questChapters.filter((candidate) => visibleQuestChapterIds.has(candidate.id))
  const chapter = visibleQuestChapters.find((candidate) => candidate.id === activeChapterId) ?? visibleQuestChapters[0]
  const chapterQuests = quests.filter((quest) => (chapter.id === 'multiblocks' ? multiblockQuestIds.has(quest.id) : questBookChapterId(quest) === chapter.id))
  const questById = new Map(quests.map((quest) => [quest.id, quest]))
  const [mapView, setMapView] = useState({ x: 0, y: 0, zoom: 0.82 })
  const dragRef = useRef<{ pointerId: number; x: number; y: number; startX: number; startY: number } | null>(null)
  const nodeWidth = 58
  const nodeHeight = 58
  const mapMargin = 24
  const questPosition = (quest: Quest) => {
    const position =
      chapter.id === 'multiblocks'
        ? multiblockQuestPositionOverrides[quest.id] ?? questPositionOverrides[quest.id] ?? quest.position ?? { x: 0, y: 0 }
        : questPositionOverrides[quest.id] ?? quest.position ?? { x: 0, y: 0 }
    return { x: Math.round(position.x * 0.52), y: Math.round(position.y * 0.78) }
  }
  const questXs = chapterQuests.map((quest) => questPosition(quest).x)
  const questYs = chapterQuests.map((quest) => questPosition(quest).y)
  const offsetX = mapMargin - (questXs.length ? Math.min(...questXs) : 0)
  const offsetY = mapMargin - (questYs.length ? Math.min(...questYs) : 0)
  const questX = (quest: Quest) => questPosition(quest).x + offsetX
  const questY = (quest: Quest) => questPosition(quest).y + offsetY
  const mapWidth = Math.max(360, ...chapterQuests.map((quest) => questX(quest) + nodeWidth + mapMargin))
  const mapHeight = Math.max(160, ...chapterQuests.map((quest) => questY(quest) + nodeHeight + mapMargin))
  const clampZoom = (zoom: number) => Math.max(0.55, Math.min(1.35, zoom))
  const clampMapView = (view: { x: number; y: number; zoom: number }, viewport?: { width: number; height: number }) => {
    if (!viewport) return view
    const scaledWidth = mapWidth * view.zoom
    const scaledHeight = mapHeight * view.zoom
    const slack = 42
    const minX = Math.min(slack, viewport.width - scaledWidth - slack)
    const maxX = Math.max(viewport.width - scaledWidth - slack, slack)
    const minY = Math.min(slack, viewport.height - scaledHeight - slack)
    const maxY = Math.max(viewport.height - scaledHeight - slack, slack)
    return {
      ...view,
      x: Math.max(minX, Math.min(maxX, view.x)),
      y: Math.max(minY, Math.min(maxY, view.y)),
    }
  }
  const emptyChapterHint =
    chapter.id === 'lvAge'
      ? 'LV Age opens after the Steam Age ends: make steel in the bricked blast furnace, then hammer the first steel plate.'
      : chapter.id === 'multiblocks'
        ? 'Multiblock structure work appears here once the casing grind starts.'
        : 'Complete the previous visible quest to reveal the next step.'
  const pointerRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const gestureRef = useRef<{
    centerX: number
    centerY: number
    distance: number
    startX: number
    startY: number
    zoom: number
  } | null>(null)

  useEffect(() => {
    pointerRef.current.clear()
    gestureRef.current = null
    dragRef.current = null
    const initialZoom = activeChapterId === 'lvAge' && chapterQuests.length > 8 ? 0.62 : 0.9
    setMapView({ x: 0, y: 0, zoom: initialZoom })
  }, [activeChapterId, chapterQuests.length])

  const pointerDistance = (first: { x: number; y: number }, second: { x: number; y: number }) =>
    Math.hypot(second.x - first.x, second.y - first.y)

  const pointerCenter = (first: { x: number; y: number }, second: { x: number; y: number }) => ({
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  })

  const startPinchGesture = () => {
    const [first, second] = [...pointerRef.current.values()]
    if (!first || !second) return
    const center = pointerCenter(first, second)
    gestureRef.current = {
      centerX: center.x,
      centerY: center.y,
      distance: Math.max(1, pointerDistance(first, second)),
      startX: mapView.x,
      startY: mapView.y,
      zoom: mapView.zoom,
    }
  }

  const handleMapPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('.quest-node')) return
    pointerRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Some synthetic pointer events used by tests are not capturable.
    }
    if (pointerRef.current.size === 1) {
      dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, startX: mapView.x, startY: mapView.y }
      gestureRef.current = null
    } else if (pointerRef.current.size === 2) {
      dragRef.current = null
      startPinchGesture()
    }
  }

  const handleMapPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerRef.current.has(event.pointerId)) {
      pointerRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    }
    if (pointerRef.current.size >= 2 && gestureRef.current) {
      const [first, second] = [...pointerRef.current.values()]
      if (!first || !second) return
      const center = pointerCenter(first, second)
      const nextZoom = clampZoom((gestureRef.current.zoom * pointerDistance(first, second)) / gestureRef.current.distance)
      const zoomRatio = nextZoom / gestureRef.current.zoom
      const rect = event.currentTarget.getBoundingClientRect()
      setMapView(clampMapView({
        x: center.x - rect.left - (gestureRef.current.centerX - rect.left - gestureRef.current.startX) * zoomRatio,
        y: center.y - rect.top - (gestureRef.current.centerY - rect.top - gestureRef.current.startY) * zoomRatio,
        zoom: nextZoom,
      }, rect))
      return
    }
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const rect = event.currentTarget.getBoundingClientRect()
    setMapView((current) =>
      clampMapView(
        {
          ...current,
          x: drag.startX + event.clientX - drag.x,
          y: drag.startY + event.clientY - drag.y,
        },
        rect,
      ),
    )
  }

  const handleMapPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerRef.current.delete(event.pointerId)
    gestureRef.current = null
    if (pointerRef.current.size === 1) {
      const [remainingPointerId] = [...pointerRef.current.keys()]
      const remainingPointer = pointerRef.current.get(remainingPointerId)
      if (remainingPointer) {
        dragRef.current = {
          pointerId: remainingPointerId,
          x: remainingPointer.x,
          y: remainingPointer.y,
          startX: mapView.x,
          startY: mapView.y,
        }
      }
    } else if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null
    }
  }

  const handleMapWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const pointerX = event.clientX - rect.left
    const pointerY = event.clientY - rect.top
    setMapView((current) => {
      const nextZoom = clampZoom(current.zoom + (event.deltaY < 0 ? 0.08 : -0.08))
      const zoomRatio = nextZoom / current.zoom
      return clampMapView(
        {
          x: pointerX - (pointerX - current.x) * zoomRatio,
          y: pointerY - (pointerY - current.y) * zoomRatio,
          zoom: nextZoom,
        },
        rect,
      )
    })
  }

  return (
    <>
      <div className="quest-chapter-tabs" aria-label="Quest chapters">
        {visibleQuestChapters.map((candidate) => (
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
        <div className="quest-book-summary">
          <p>{chapter.description}</p>
          <div className="quest-book-actions">
            <strong>{formatAmount(state.scrip)} Foundry Scrip</strong>
            <button type="button" disabled={claimableRewardCount < 1} onClick={onClaimAll}>
              Claim all rewards{claimableRewardCount > 0 ? ` (${formatAmount(claimableRewardCount)})` : ''}
            </button>
          </div>
        </div>
      </div>
      <div
        className="quest-map-scroll"
        aria-label={`${chapter.title} quest map`}
        onPointerCancel={handleMapPointerEnd}
        onPointerDown={handleMapPointerDown}
        onPointerMove={handleMapPointerMove}
        onPointerUp={handleMapPointerEnd}
        onWheel={handleMapWheel}
      >
        <div
          className="quest-map"
          style={
            {
              '--quest-map-width': `${mapWidth}px`,
              '--quest-map-height': `${mapHeight}px`,
              transform: `translate(${mapView.x}px, ${mapView.y}px) scale(${mapView.zoom})`,
            } as CSSProperties
          }
        >
          <svg className="quest-lines" viewBox={`0 0 ${mapWidth} ${mapHeight}`} aria-hidden="true">
            {chapterQuests.flatMap((quest) =>
              (quest.prerequisites ?? []).map((parentId) => {
                const parent = questById.get(parentId)
                if (!parent) return null
                const parentInChapter = chapter.id === 'multiblocks' ? multiblockQuestIds.has(parent.id) : questBookChapterId(parent) === chapter.id
                if (!parentInChapter) return null
                const parentStatus = questStatus(state, parent)
                const childStatus = questStatus(state, quest)
                const className = parentStatus === 'completed' && childStatus !== 'locked' ? 'complete' : childStatus === 'locked' ? 'locked' : 'open'
                const parentCenterX = questX(parent) + nodeWidth / 2
                const parentCenterY = questY(parent) + nodeHeight / 2
                const childCenterX = questX(quest) + nodeWidth / 2
                const childCenterY = questY(quest) + nodeHeight / 2
                const deltaX = childCenterX - parentCenterX
                const deltaY = childCenterY - parentCenterY
                const distance = Math.max(1, Math.hypot(deltaX, deltaY))
                const edgeInset = nodeWidth / 2
                const startX = parentCenterX + (deltaX / distance) * edgeInset
                const startY = parentCenterY + (deltaY / distance) * edgeInset
                const endX = childCenterX - (deltaX / distance) * edgeInset
                const endY = childCenterY - (deltaY / distance) * edgeInset
                const path = `M ${startX} ${startY} L ${endX} ${endY}`
                return (
                  <g key={`${parent.id}-${quest.id}`}>
                    <path className="quest-line-shadow" d={path} />
                    <path className={className} d={path} />
                  </g>
                )
              }),
            )}
          </svg>
          {!chapterQuests.length && <div className="quest-map-empty">{emptyChapterHint}</div>}
          {chapterQuests.map((quest) => {
            const status = questStatus(state, quest)
                const selected = quest.id === selectedQuestId
                const kind = questKind(quest)
                const claimed = state.claimedQuests.includes(quest.id)
                const claimState = status === 'completed' ? (claimed ? 'claimed' : 'claimable') : status === 'ready' ? 'claimable' : 'not-done'
                const accessibleStatus = status === 'completed' ? (claimed ? 'done' : 'ready to claim') : questStatusText(status)
                return (
                  <button
                    type="button"
                    aria-label={`${quest.title}. ${accessibleStatus}. ${kind}.`}
                    title={`${quest.title} - ${accessibleStatus}`}
                    className={`quest-node ${status} ${kind} ${claimState}${selected ? ' selected' : ''}`}
                    style={{ left: questX(quest), minHeight: nodeHeight, top: questY(quest), width: nodeWidth }}
                    onClick={() => onSelectQuest(quest.id)}
                    key={quest.id}
                  >
                <span className="quest-node-icon">
                  <QuestIcon quest={quest} muted={status === 'locked'} />
                </span>
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
  const [isEnteringGame, setIsEnteringGame] = useState(false)
  const [entryLoadingMessage, setEntryLoadingMessage] = useState('Loading save')
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
  const [, setFactoryNotice] = useState('')
  const [offlineNotice, setOfflineNotice] = useState('')
  const [offlinePrompt, setOfflinePrompt] = useState('')
  const [migrationPrompt, setMigrationPrompt] = useState('')
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
    if (notice) setOfflinePrompt(notice)
  }

  const loadSlotIntoGame = async (slotId: SaveSlotId, applyOffline = true, showMigrationNotice = applyOffline) => {
    const now = localTimeProvider.now()
    if (!applyOffline) {
      const loadedState = await loadSavedGame(slotId, now)
      stateRef.current = loadedState
      setState(loadedState)
      knownCompletedQuestsRef.current = new Set(loadedState.completedQuests)
      if (showMigrationNotice) setMigrationPrompt(migrationNoticeText(loadedState.migrationNotices ?? []))
      return loadedState
    }

    const { state: loadedState, offline } = await loadSavedGameWithOfflineProgress(slotId, now)
    stateRef.current = loadedState
    setState(loadedState)
    knownCompletedQuestsRef.current = new Set(loadedState.completedQuests)
    if (showMigrationNotice) setMigrationPrompt(migrationNoticeText(loadedState.migrationNotices ?? []))
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
    preloadGeneratedIconLinks()
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

    void loadSlotIntoGame(defaultSaveSlotId, false)
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
  const claimableQuestRewardCount = guideQuests.filter((quest) => state.completedQuests.includes(quest.id) && !state.claimedQuests.includes(quest.id)).length
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
  const visibleProcessRecipeCards = useMemo(
    () =>
      processRecipeCards.filter((recipe) => {
        if (recipe.requiredMachine && state.machines[recipe.requiredMachine] > 0) return true
        return isRecipeVisible(state, recipe)
      }),
    [processRecipeCards, state],
  )
  const recipeCatalog = useMemo(() => [...unlockedRecipes, ...visibleProcessRecipeCards], [unlockedRecipes, visibleProcessRecipeCards])
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
  const selectedResourceForRecipes = selectedResource
  const recipeCandidates = useMemo(() => (recipeSearch.trim() ? searchTerminalRecipes(recipeSearch, recipeCatalog) : recipeCatalog), [recipeCatalog, recipeSearch])
  const usageRecipes = useMemo(
    () => (selectedResourceForRecipes ? recipesUsingInput(selectedResourceForRecipes, recipeCatalog) : []),
    [recipeCatalog, selectedResourceForRecipes],
  )
  const listedRecipeGroups = useMemo(
    () => (terminalMode === 'recipes' ? groupRecipesByOutput(recipeCandidates) : singleRecipeGroups(usageRecipes)),
    [recipeCandidates, terminalMode, usageRecipes],
  )
  const selectedRecipeGroup = listedRecipeGroups.find((group) => group.key === selectedRecipeGroupKey) ?? listedRecipeGroups[0]
  const clampedSelectedRecipeIndex = selectedRecipeGroup
    ? Math.min(selectedRecipeIndex, Math.max(0, selectedRecipeGroup.recipes.length - 1))
    : 0
  const selectedRecipe = selectedRecipeGroup?.recipes[clampedSelectedRecipeIndex]
  const maxBatchQuantity = terminalMatch ? craftableQuantity(state, terminalMatch, terminalGrid) : 0
  const selectedMachine = state.machineInstances.find((instance) => instance.uid === selectedMachineUid) ?? null
  const selectedSteamTankCapacityMs =
    selectedMachine?.machineId === 'steamTank' ? steamTankCapacityMsForInstance(state, selectedMachine) || steamTankCapacityMs : steamTankCapacityMs
  const selectedSteamTankFluidCapacityLitres =
    selectedMachine?.machineId === 'steamTank' ? steamTankFluidCapacityLitresForInstance(state, selectedMachine) || ironTankFluidCapacityLitres : ironTankFluidCapacityLitres
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
  const selectedMachineProcessTimeLabel = selectedMachine
    ? selectedMachine.process.durationMs > 0
      ? `${formatDuration(Math.max(0, selectedMachine.process.durationMs - selectedMachine.process.progressMs))} left`
      : selectedMachineRecipe
        ? formatDuration(selectedMachineRecipe.durationMs)
        : ''
    : ''
  const selectedMachineStoredFluids = selectedMachine ? storedFluids(selectedMachine.process) : []
  const selectedMachineCanManualFluidTransfer = Boolean(
    selectedMachine && (selectedMachine.machineId === 'cokeOven' || selectedMachine.machineId === 'steamTank' || isLiquidSteamBoilerMachine(selectedMachine.machineId)),
  )
  const canFillBucketFromSelectedMachine = selectedMachineCanManualFluidTransfer && availableResourceAmount(state, 'bucket') > 0 && !state.bucketFluid && selectedMachineStoredFluids.length > 0
  const canEmptyBucketIntoSelectedMachine = Boolean(
    selectedMachine &&
      state.bucketFluid &&
      (selectedMachine.machineId === 'steamTank' || (isLiquidSteamBoilerMachine(selectedMachine.machineId) && state.bucketFluid.id === 'creosote')),
  )

  useEffect(() => {
    if (terminalMode === 'uses' && !selectedResourceForRecipes) {
      setTerminalMode('recipes')
      return
    }
    if (listedRecipeGroups.length < 1) {
      if (selectedRecipeGroupKey !== null) setSelectedRecipeGroupKey(null)
      if (selectedRecipeIndex !== 0) setSelectedRecipeIndex(0)
      return
    }
    if (!selectedRecipeGroupKey || !listedRecipeGroups.some((group) => group.key === selectedRecipeGroupKey)) {
      setSelectedRecipeGroupKey(listedRecipeGroups[0].key)
      setSelectedRecipeIndex(0)
      return
    }
    if (selectedRecipeIndex !== clampedSelectedRecipeIndex) setSelectedRecipeIndex(clampedSelectedRecipeIndex)
  }, [clampedSelectedRecipeIndex, listedRecipeGroups, selectedRecipeGroupKey, selectedRecipeIndex, selectedResourceForRecipes, terminalMode])
  const selectedMachineMetrics: MachineMetric[] = []
  if (selectedMachine) {
    const process = selectedMachine.process
    const addSteamMetric = (label: string, storedMs: number, capacityMs: number) => {
      selectedMachineMetrics.push({
        label,
        value: `${formatSteamLitres(storedMs)}L`,
        detail: `${formatSteamLitres(capacityMs)}L max`,
        tone: 'steam',
        fillPercent: metricFill(storedMs, capacityMs),
      })
    }
    const addSteamSupplyMetric = (storedMs: number) => {
      selectedMachineMetrics.push({
        label: 'Supply',
        value: `${formatSteamLitres(storedMs)}L`,
        detail: 'steam network',
        tone: 'supply',
        fillPercent: storedMs > 0 ? 100 : 0,
      })
    }
    const addEuMetric = (label: string, storedEu: number, capacityEu: number) => {
      selectedMachineMetrics.push({
        label,
        value: `${Math.floor(storedEu)}`,
        detail: `${Math.floor(capacityEu)} EU max`,
        tone: 'eu',
        fillPercent: metricFill(storedEu, capacityEu),
      })
    }
    const addRateMetric = (label: string, value: number, unit: string, tone: MachineMetricTone, detail = 'per second') => {
      selectedMachineMetrics.push({
        label,
        value: `${formatAmount(value)}${unit}`,
        detail,
        tone,
        fillPercent: value > 0 ? 100 : 0,
      })
    }
    const addFluidMetric = (label: string, storedLitres: number, capacityLitres: number) => {
      selectedMachineMetrics.push({
        label,
        value: `${formatLitres(storedLitres)}L`,
        detail: `${formatLitres(capacityLitres)}L max`,
        tone: 'fluid',
        fillPercent: metricFill(storedLitres, capacityLitres),
      })
    }
    const addStoredFluidMetrics = (fluidProcess: MachineProcessState, capacityLitres: number) => {
      for (const fluid of storedFluids(fluidProcess)) addFluidMetric(fluidLabel(fluid.id), fluid.amount, capacityLitres)
    }

    if (isSteamPipeMachine(selectedMachine.machineId)) {
      const steamCapacity = process.steamCapacityMs || steamPipeBufferCapacityMs(selectedMachine.machineId)
      const fluidCapacity = process.fluidCapacityLitres || fluidPipeBufferCapacityLitres(selectedMachine.machineId)
      const steamFlow = currentSteamPipeFlowLitresPerSecond(state, selectedMachine)
      if (process.steamStoredMs > 0 || steamFlow > 0) addSteamMetric('Steam', process.steamStoredMs, steamCapacity)
      addStoredFluidMetrics(process, fluidCapacity)
      addRateMetric('Flow', steamFlow, 'L/s', 'supply', steamFlow > 0 ? 'steam moving' : 'no contents moving')
    } else if (isEuCableMachine(selectedMachine.machineId)) {
      addEuMetric('Buffer', process.euStored, process.euCapacity || euCableBufferCapacity(selectedMachine.machineId))
      addRateMetric('Flow', currentEuCableFlowEuPerSecond(state, selectedMachine), ' EU/s', 'supply', 'power moving')
    } else if (selectedMachine.machineId === 'steamBoiler') {
      addSteamMetric('Steam', process.steamStoredMs, boilerSteamCapacityMs)
      addRateMetric('Makes', boilerSteamProductionLitresPerSecond, 'L/s', 'supply', 'boiler rate')
    } else if (selectedMachine.machineId === 'steamTank') {
      if (process.steamStoredMs > 0) addSteamMetric('Steam', process.steamStoredMs, selectedSteamTankCapacityMs)
      addStoredFluidMetrics(process, selectedSteamTankFluidCapacityLitres)
    } else if (selectedMachine.machineId === 'cokeOven') {
      if ((process.fluids.creosote ?? 0) > 0) addFluidMetric(fluidLabel('creosote'), process.fluids.creosote ?? 0, process.fluidCapacityLitres || cokeOvenFluidCapacityLitres)
    } else if (isLiquidSteamBoilerMachine(selectedMachine.machineId)) {
      addSteamMetric('Steam', process.steamStoredMs, liquidSteamBoilerCapacityMs)
      if ((process.fluids.creosote ?? 0) > 0) addFluidMetric(fluidLabel('creosote'), process.fluids.creosote ?? 0, liquidSteamBoilerFluidCapacityLitres)
      addRateMetric('Makes', liquidSteamBoilerSteamProductionLitresPerSecond, 'L/s', 'supply', 'boiler rate')
    } else if (isEuStorageMachine(selectedMachine.machineId)) {
      addEuMetric('Stored EU', process.euStored, process.euCapacity || lvBatteryBufferEuCapacity)
      addRateMetric('Output', lvBatteryBufferOutputEuPerSecond, ' EU/s', 'supply', 'buffer limit')
    } else if (isEuProducerMachine(selectedMachine.machineId)) {
      addEuMetric('Stored EU', process.euStored, steamTurbineEuCapacity)
      addSteamSupplyMetric(availableConnectedSteam(state, selectedMachine))
      addRateMetric('Uses', steamTurbineSteamUseLitresPerSecond, 'L/s', 'usage', 'steam draw')
      addRateMetric('Makes', steamTurbineSteamUseLitresPerSecond * 2, ' EU/s', 'supply', 'generator rate')
    } else if (selectedMachine.machineId === 'steamAutoMiner') {
      addSteamSupplyMetric(availableConnectedSteam(state, selectedMachine))
      addRateMetric('Uses', steamAutoMinerSteamUsagePerSecond, 'L/s', 'usage', 'drill draw')
    } else if (selectedMachine.machineId === 'lvAutoMiner') {
      addEuMetric('Internal', process.euStored, process.euCapacity || 0)
      selectedMachineMetrics.push({
        label: 'Supply',
        value: `${Math.floor(availableConnectedEu(state, selectedMachine))}`,
        detail: 'EU network',
        tone: 'supply',
        fillPercent: availableConnectedEu(state, selectedMachine) > 0 ? 100 : 0,
      })
      addRateMetric('Uses', lvAutoMinerEuUsagePerSecond, ' EU/s', 'usage', 'drill draw')
    } else if (isSteamPoweredMachine(selectedMachine.machineId)) {
      addSteamSupplyMetric(availableConnectedSteam(state, selectedMachine))
      addRateMetric('Uses', selectedMachineSteamUsagePerSecond, 'L/s', 'usage', 'recipe draw')
    } else if (isEuPoweredMachine(selectedMachine.machineId)) {
      addEuMetric('Internal', process.euStored, process.euCapacity || 0)
      selectedMachineMetrics.push({
        label: 'Supply',
        value: `${Math.floor(availableConnectedEu(state, selectedMachine))}`,
        detail: 'EU network',
        tone: 'supply',
        fillPercent: availableConnectedEu(state, selectedMachine) > 0 ? 100 : 0,
      })
      addRateMetric('Uses', selectedMachineEuUsagePerSecond, ' EU/s', 'usage', 'recipe draw')
      if (isEuBlastMachine(selectedMachine.machineId) && selectedMachineRecipe?.minimumEuStored) {
        selectedMachineMetrics.push({
          label: 'Buffer',
          value: `${formatAmount(selectedMachineRecipe.minimumEuStored)}`,
          detail: 'EU needed',
          tone: 'eu',
          fillPercent: metricFill(process.euStored, selectedMachineRecipe.minimumEuStored),
        })
      }
    }

    const primaryFluidOutflow = [...currentFluidOutputFlows(state, selectedMachine)].sort((a, b) => b.litresPerSecond - a.litresPerSecond)[0]
    if (primaryFluidOutflow) {
      addRateMetric('Outflow', primaryFluidOutflow.litresPerSecond, 'L/s', 'fluid', `${fluidLabel(primaryFluidOutflow.fluidId)} out`)
    }
  }
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
    const isSteamPipeNeighbour = (machineId: MachineId) => isSteamNetworkMachine(machineId) || (machines[machineId].fluidCapacityLitres ?? 0) > 0 || machineId === 'well'
    const connectsTo = (x: number, y: number) => {
      const neighbour = machineAtFactoryCell(x, y)
      if (!neighbour) return false
      return machinesCanConnect(instance, neighbour) && (isSteamPipe ? isSteamPipeNeighbour(neighbour.machineId) : isEuNetworkMachine(neighbour.machineId))
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

  const controllerForFactoryStructure = (instance: MachineInstance) => {
    const tankStructure = steamTankStructureForInstance(state, instance)
    if (tankStructure) return tankStructure.controller
    return controllerForMultiblockPart(instance)
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
    setAchievementToasts(() => [{ id, questId, title: quest.title }])
    window.setTimeout(() => dismissAchievementToast(id), 3200)
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
        setFactoryNotice(missing ? `Missing ${missing}` : 'Factory floor is already max size.')
        return current
      }
      const next = expandFactoryFloor(current)
      const grid = factoryGridForState(next)
      setFactoryNotice(current.factoryFoundationLevel < 1 ? `Factory foundation built (${grid.width}x${grid.height}).` : `Factory floor expanded to ${grid.width}x${grid.height}.`)
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
            setFactoryNotice('Need an iron crowbar.')
            setSelectedFactoryTool(null)
            return current
          }
          const next = crowbarRemoveMachineInstance(current, instance.uid)
          if (next !== current) setFactoryNotice('')
          return next
        })
        return
      }
      if (isFactoryPipeConfigMode) {
        if (isSteamPipeMachine(instance.machineId) || isEuCableMachine(instance.machineId) || isItemHopperMachine(instance.machineId) || isFluidOutletConfigurableMachine(instance.machineId)) {
          setSelectedMachineUid(null)
          setSelectedPipeConfigUid(instance.uid)
          return
        }
        setFactoryNotice('Wrench configures pipes, cables, hoppers, and fluid outputs.')
        return
      }
      const structureController = controllerForFactoryStructure(instance)
      if (structureController && structureController.uid !== instance.uid) {
        setSelectedMachineUid(structureController.uid)
        return
      }
      if (machines[instance.machineId].multiblock || machines[instance.machineId].processKind === 'none') {
        if (structureController) {
          setSelectedMachineUid(structureController.uid)
          return
        }
        if (instance.machineId === 'cokeOvenPart') setFactoryNotice('Place Coke Oven Blocks in a full 2x2 to form the oven.')
        if (instance.machineId === 'brickedBlastFurnacePart') setFactoryNotice('Place BBF casings in a full 2x2 to form the furnace.')
        if (instance.machineId === 'arcBlastFurnacePart') setFactoryNotice('Place arc casings in a full 2x2 to form the furnace.')
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
        setFactoryNotice('')
      }
      return next
    })
  }

  const handleTogglePipeSide = (uid: string, direction: PipeDirection) => {
    const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
    if (instance && isItemHopperMachine(instance.machineId)) {
      setState((current) => setHopperOutputDirection(current, uid, direction))
      return
    }
    if (instance && isFluidOutletConfigurableMachine(instance.machineId)) {
      setState((current) => setFluidOutputDirection(current, uid, direction))
      return
    }
    setState((current) => cyclePipeSideMode(current, uid, direction))
  }

  const handleFillBucketFromMachine = (uid: string, fluidId?: FluidId) => {
    setState((current) => fillBucketFromMachine(current, uid, fluidId))
  }

  const handleEmptyBucketIntoMachine = (uid: string) => {
    setState((current) => emptyBucketIntoMachine(current, uid))
  }

  const handleProcessSlotPress = (slotId: ProcessSlotId) => {
    if (!selectedMachine) return
    const slot = selectedMachine.process[slotId]
    if (slotId === 'output' && !isItemHopperMachine(selectedMachine.machineId)) {
      setState((current) => collectProcessOutput(current, selectedMachine.uid))
      return
    }
    if (slot && slot.id === selectedResource) {
      const max = Math.min(processStackLimit - slot.amount, availableResourceAmount(state, selectedResource))
      if (max < 1) {
        setFactoryNotice(`${resourceLabels[selectedResource]} slot is full.`)
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
      setFactoryNotice('Select an item first.')
      return
    }
    if (!canResourceEnterProcessSlot(selectedMachine.machineId, slotId, selectedResource)) {
      setFactoryNotice(`${resourceLabels[selectedResource]} does not fit there.`)
      return
    }
    const max = Math.min(processStackLimit, availableResourceAmount(state, selectedResource))
    if (max < 1) {
      setFactoryNotice(`No ${resourceLabels[selectedResource]} available.`)
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
    setFactoryNotice(`${resourceLabels[pendingProcessInsert.resourceId]} x${formatAmount(quantity)} inserted.`)
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
      recipeName: recipeDisplayName(recipe),
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
    setTerminalNotice(`${recipeDisplayName(terminalMatch)} x${formatAmount(requestedQuantity)} crafted.`)
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
    setTerminalNotice(missingLine(state, recipe) ? `Missing ${missingLine(state, recipe)}` : `${recipeDisplayName(recipe)} loaded.`)
    setIsRecipeModalOpen(false)
    setPage('terminal')
  }

  const pipePolarityForInstance = (instance: MachineInstance): Array<{ direction: PipeDirection; state: PipeSideState; mode: PipeSideMode; label: string }> | null => {
    const isSteamPipe = isSteamPipeMachine(instance.machineId)
    const isEuCable = isEuCableMachine(instance.machineId)
    const isHopper = isItemHopperMachine(instance.machineId)
    if (!isSteamPipe && !isEuCable && !isHopper) return null

    return pipeDirections.map((direction) => {
      const offset = pipeDirectionOffsets[direction]
      const neighbour = machineAtFactoryCell(instance.x + offset.dx, instance.y + offset.dy)
      const mode = pipeSideMode(instance, direction)
      const blocked = mode === 'blocked'
      const isSteamPipeNeighbour = (machineId: MachineId) => isSteamNetworkMachine(machineId) || (machines[machineId].fluidCapacityLitres ?? 0) > 0 || machineId === 'well'
      const connected = Boolean(
        !blocked &&
          neighbour &&
          (isHopper
            ? mode === 'output' && !isItemAutomationMachine(neighbour.machineId)
            : machinesCanConnect(instance, neighbour) && (isSteamPipe ? isSteamPipeNeighbour(neighbour.machineId) : isEuNetworkMachine(neighbour.machineId))),
      )
      return {
        direction,
        mode,
        state: blocked ? 'blocked' : connected ? 'connected' : 'open',
        label: `${offset.label} ${pipeSideModeLabels[mode]}`,
      }
    })
  }

  const handleOpenProcessRecipe = (recipe: Recipe) => {
    const matchingMachine = recipe.requiredMachine
      ? state.machineInstances.find((instance) => instance.machineId === recipe.requiredMachine)
      : null

    pushNavigationSnapshot()
    setPage('processing')
    setIsRecipeModalOpen(false)
    setIsFactoryExpandModalOpen(false)
    setMissingBatch(null)
    setPendingProcessInsert(null)
    setSelectedQuestId(null)
    setSelectedPipeConfigUid(null)
    setPlacingMachineId(null)
    setSelectedMachineUid(matchingMachine?.uid ?? null)

    if (recipe.requiredMachine && !matchingMachine) {
      setTerminalNotice(`Place ${machines[recipe.requiredMachine].name} on the factory floor.`)
    }
  }

  const handleRecipeBrowserAction = (recipe: Recipe) => {
    if (recipeOpensProcessView(recipe)) {
      handleOpenProcessRecipe(recipe)
      return
    }

    if (recipeFitsTerminalGrid(recipe)) {
      handleLoadRecipe(recipe)
      return
    }

    if (!canCraft(state, recipe)) {
      showMissingBatch(recipe, 1)
      return
    }

    handleCraft(recipe)
    setTerminalNotice(`${recipeDisplayName(recipe)} ${recipe.machineOutputs ? 'built' : 'crafted'}.`)
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

  const handleJumpToFactoryFromQuest = () => {
    pushNavigationSnapshot()
    setPage('processing')
    setIsRecipeModalOpen(false)
    setIsFactoryExpandModalOpen(false)
    setMissingBatch(null)
    setPendingProcessInsert(null)
    setSelectedMachineUid(null)
    setSelectedQuestId(null)
  }

  const handleSelectQuest = (questId: QuestId) => {
    if (selectedQuestId !== questId) pushNavigationSnapshot()
    setSelectedQuestId(questId)
  }

  const handleClaimQuestReward = (questId: QuestId) => {
    setState((current) => claimQuestReward(current, questId))
    addFloatText('reward claimed')
  }

  const handleClaimAllQuestRewards = () => {
    if (claimableQuestRewardCount < 1) return
    setState((current) => claimAllQuestRewards(current))
    addFloatText(`claimed x${formatAmount(claimableQuestRewardCount)}`)
  }

  const handleBuyShopItem = (resourceId: ResourceId) => {
    setState((current) => {
      const next = buyShopItem(current, resourceId)
      if (next === current) return current
      return next
    })
    addFloatText('bought')
  }

  const handleSellShopItem = (resourceId: ResourceId) => {
    setState((current) => {
      const next = sellShopItem(current, resourceId)
      if (next === current) return current
      return next
    })
    addFloatText('sold')
  }

  const handleReset = async () => {
    if (isEnteringGame) return
    setEntryLoadingMessage(`Preparing ${selectedSaveLabel}`)
    setIsEnteringGame(true)
    await waitForEntryLoadingPaint()
    const minimumLoading = waitForEntryLoadingMinimum()
    cancelPendingSave()
    try {
      await clearSavedGame(selectedSaveSlotId)
      setIsCreativeMode(false)
      await refreshSaveSlots()
      await preloadGeneratedIconImages()
      const freshState = loadGame(null)
      setState(freshState)
      knownCompletedQuestsRef.current = new Set(freshState.completedQuests)
      handleClearGrid()
      setOfflineNotice('')
      setOfflinePrompt('')
      setTerminalNotice('')
      setFactoryNotice('')
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
    } finally {
      await minimumLoading
      setIsEnteringGame(false)
      setEntryLoadingMessage('Loading save')
    }
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
    if (isEnteringGame) return
    setEntryLoadingMessage(`Loading ${selectedSaveLabel}`)
    setIsEnteringGame(true)
    await waitForEntryLoadingPaint()
    const minimumLoading = waitForEntryLoadingMinimum()
    try {
      const savedState = await loadSlotIntoGame(selectedSaveSlotId)
      await preloadGeneratedIconImages()
      setState(savedState)
      knownCompletedQuestsRef.current = new Set(savedState.completedQuests)
      setIsCreativeMode(false)
      setNavigationStack([])
      setPage('gather')
    } finally {
      await minimumLoading
      setIsEnteringGame(false)
      setEntryLoadingMessage('Loading save')
    }
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
    setActiveQuestChapterId(questBookChapterId(quest))
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
    if (nextPage === 'shop' && !state.completedQuests.includes('buildFoundation')) return
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
  const releaseChannelLabel = deploymentInfo.channel === 'release'
    ? 'Full release'
    : deploymentInfo.channel === 'remote-dev'
      ? 'Remote dev'
      : 'Home dev'
  const releaseRevisionLabel = deploymentInfo.channel === 'release' ? `r${deploymentInfo.revision}` : deploymentInfo.revision
  const releaseNotes = deploymentInfo.notes.slice(0, 3)

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
          <span>{releaseChannelLabel} | {releaseRevisionLabel} | {buildLabel} | {deployedAtLabel}</span>
        </section>
      </main>
    )
  }

  return (
    <main className={shellClassName}>
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

      {offlinePrompt && (
        <div className="modal-backdrop compact-backdrop offline-progress-backdrop" role="presentation">
          <section className="missing-modal offline-progress-dialog" role="dialog" aria-modal="true" aria-label="Offline progress">
            <div className="modal-head">
              <div>
                <p className="eyebrow">Offline time</p>
                <h2>Welcome back</h2>
              </div>
            </div>
            <p>{offlinePrompt}</p>
            <button type="button" className="load-recipe-button" onClick={() => setOfflinePrompt('')}>
              Continue
            </button>
          </section>
        </div>
      )}

      {!offlinePrompt && migrationPrompt && (
        <div className="modal-backdrop compact-backdrop offline-progress-backdrop" role="presentation">
          <section className="missing-modal offline-progress-dialog" role="dialog" aria-modal="true" aria-label="Save migration notice">
            <div className="modal-head">
              <div>
                <p className="eyebrow">Factory update</p>
                <h2>Coke oven changed</h2>
              </div>
            </div>
            <p>{migrationPrompt}</p>
            <button type="button" className="load-recipe-button" onClick={() => setMigrationPrompt('')}>
              Continue
            </button>
          </section>
        </div>
      )}

      {isEnteringGame && (
        <div className="modal-backdrop compact-backdrop entry-loading-backdrop" role="presentation">
          <section className="entry-loading-panel" role="status" aria-live="assertive" aria-label="Loading save">
            <p className="eyebrow">Entering save</p>
            <h2>{entryLoadingMessage}</h2>
            <div className="entry-loading-machine" aria-hidden="true">
              <MachineGlyph id="steamBoiler" active />
              <span className="entry-loading-belt">
                <span />
              </span>
              <MachineGlyph id="steamMacerator" active />
            </div>
            <div className="entry-loading-track" aria-hidden="true">
              <span />
            </div>
            <p>Simulating offline time and warming the factory UI.</p>
          </section>
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
              <p className="home-deploy-version">{releaseChannelLabel} | {releaseRevisionLabel} | {buildLabel} | {deployedAtLabel}</p>
            </div>
          </div>
          <section className="home-release-card" aria-label="Release notes">
            <div>
              <span>{releaseChannelLabel}</span>
              <strong>{releaseRevisionLabel}</strong>
            </div>
            <p>{deploymentInfo.title}</p>
            {releaseNotes.length > 0 && (
              <ul>
                {releaseNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
          </section>
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
            <button type="button" className="home-action primary" disabled={!hasLoadedSave || isEnteringGame} onClick={handleContinueFromHome}>
              {isEnteringGame ? 'Loading save...' : `Continue ${selectedSaveLabel}`}
            </button>
            <button type="button" className="home-action danger" disabled={!hasLoadedSave || isEnteringGame} onClick={handleReset}>
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
          <button type="button" className={page === 'shop' ? 'active' : ''} disabled={!state.completedQuests.includes('buildFoundation')} onClick={() => handlePageNavigation('shop')}>
            <Toolbox size={18} />
            Shop
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
                    <h2>{terminalMode === 'recipes' ? 'Recipes' : selectedResourceForRecipes ? `Uses: ${resourceLabels[selectedResourceForRecipes]}` : 'Uses'}</h2>
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
                  <button
                    type="button"
                    className={terminalMode === 'uses' ? 'active' : ''}
                    disabled={!selectedResourceForRecipes}
                    onClick={() => setTerminalMode('uses')}
                  >
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
                        title={recipeGroupDisplayOutput(group).label}
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
                    <aside className="recipe-detail" aria-label={`${recipeDisplayName(selectedRecipe)} details`}>
                      <div className="recipe-detail-head">
                        <div>
                          <p className="eyebrow">{selectedRecipe.tier}</p>
                          <h3>{recipeDisplayName(selectedRecipe)}</h3>
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
                              <button
                                type="button"
                                className="recipe-station-entry"
                                aria-label={`Find ${machines[selectedRecipe.requiredMachine].name}`}
                                onClick={() => handleJumpToMachineRecipe(selectedRecipe.requiredMachine!)}
                              >
                                <MachineSlot
                                  id={selectedRecipe.requiredMachine}
                                  muted={state.machines[selectedRecipe.requiredMachine] < 1}
                                />
                                <span>{machines[selectedRecipe.requiredMachine].name}</span>
                              </button>
                            )}
                            {selectedRecipe.machineInputs?.map((amount) => (
                              <button
                                type="button"
                                className="recipe-station-entry"
                                aria-label={`Find ${machines[amount.id].name}`}
                                onClick={() => handleJumpToMachineRecipe(amount.id)}
                                key={amount.id}
                              >
                                <MachineSlot
                                  id={amount.id}
                                  amount={amount.amount}
                                  muted={state.machines[amount.id] < amount.amount}
                                />
                                <span>{machines[amount.id].name}</span>
                              </button>
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
                          : recipeOpensProcessView(selectedRecipe)
                            ? 'Open process view'
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
                <div className="processing-storage machine-placement-storage" aria-label={isFactoryToolboxOpen ? 'Factory toolbox' : 'Factory parts'}>
                  <div className="factory-tray-head">
                    <span className="factory-tray-label">{isFactoryToolboxOpen ? 'Toolbox' : 'Factory Parts'}</span>
                    {isFactoryToolboxOpen ? (
                      <span className="factory-tool-mode">{selectedFactoryTool ? resourceLabels[selectedFactoryTool] : 'Select tool'}</span>
                    ) : (
                      <input
                        className="factory-machine-search"
                        type="search"
                        placeholder="Find"
                        value={factoryMachineSearch}
                        onChange={(event) => setFactoryMachineSearch(event.target.value)}
                        aria-label="Search factory parts"
                      />
                    )}
                    <button
                      type="button"
                      className={isFactoryToolboxOpen ? 'factory-toolbox-toggle active' : 'factory-toolbox-toggle'}
                      aria-label={isFactoryToolboxOpen ? 'Close toolbox' : 'Open toolbox'}
                      aria-controls="factory-inventory-view"
                      aria-expanded={isFactoryToolboxOpen}
                      title={isFactoryToolboxOpen ? 'Close toolbox' : 'Open toolbox'}
                      onClick={toggleFactoryToolbox}
                    >
                      <Toolbox size={16} />
                      {factoryToolCount > 0 && <span>{formatAmount(factoryToolCount)}</span>}
                    </button>
                  </div>
                  <div className={isFactoryToolboxOpen ? 'machine-placement-slots factory-tool-slots' : 'machine-placement-slots'} id="factory-inventory-view">
                    {isFactoryToolboxOpen ? (
                      factoryTools.length > 0 ? (
                        factoryTools.map((id) => (
                          <button
                            type="button"
                            className={selectedFactoryTool === id ? 'item-slot factory-tool-slot selected' : 'item-slot factory-tool-slot'}
                            aria-label={`${resourceLabels[id]} ${formatAmount(availableResourceAmount(state, id))}`}
                            aria-pressed={selectedFactoryTool === id}
                            title={
                              id === 'ironCrowbar'
                                ? `${resourceLabels[id]} - remove floor machines and pipes (${formatAmount(durabilityRemaining(state, id))} uses)`
                                : `${resourceLabels[id]} - configure pipe, cable, and hopper connections`
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
                      )
                    ) : unplacedMachines.length > 0 ? (
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
                            setFactoryNotice('')
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
                      const tankStructure = instance?.machineId === 'steamTank' ? steamTankStructureForInstance(state, instance) : null
                      const pipePolarity = instance ? pipePolarityForInstance(instance) : null
                      const isMultiblockController = Boolean(instance?.machineId && machines[instance.machineId].multiblock)
                      const isTankStructureController = Boolean(tankStructure && instance && tankStructure.controller.uid === instance.uid && tankStructure.area > 1)
                      const isTankStructureChild = Boolean(tankStructure && instance && tankStructure.controller.uid !== instance.uid)
                      const isStructureController = isMultiblockController || isTankStructureController
                      const isStructureCell = isStructureController || Boolean(multiblockController) || isTankStructureChild
                      const structureMachineId = tankStructure?.controller.machineId ?? multiblockController?.machineId ?? (isMultiblockController ? instance?.machineId : null)
                      const tankStructureStyle =
                        tankStructure && isTankStructureController
                          ? ({
                              '--structure-width': `${tankStructure.width * factoryCellSize + Math.max(0, tankStructure.width - 1) * factoryCellGap}px`,
                              '--structure-height': `${tankStructure.height * factoryCellSize + Math.max(0, tankStructure.height - 1) * factoryCellGap}px`,
                            } as CSSProperties)
                          : undefined
                      const isMachineActive = Boolean(
                        instance &&
                          (instance.process.fuelRemainingMs > 0 ||
                            instance.process.activeRecipeId ||
                            (isSteamNetworkMachine(instance.machineId) && instance.process.steamStoredMs > 0) ||
                            (isEuNetworkMachine(instance.machineId) && instance.process.euStored > 0) ||
                            Object.values(instance.process.fluids).some((amount) => (amount ?? 0) > 0) ||
                            (isSteamPipeMachine(instance.machineId) && availableConnectedSteam(state, instance) > 0) ||
                            (isSteamPipeMachine(instance.machineId) && currentFluidOutputFlows(state, instance).some((flow) => flow.litresPerSecond > 0)) ||
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
                                  isTankStructureController ? 'tank-structure-controller' : '',
                                  isTankStructureChild ? 'tank-structure-child' : '',
                                ].filter(Boolean).join(' ')
                              : placingMachineId
                                ? 'factory-cell placing'
                                : 'factory-cell'
                          }
                          style={tankStructureStyle}
                          aria-label={
                            instance
                              ? `${isStructureCell && structureMachineId ? machines[structureMachineId].name : machines[instance.machineId].name} at ${x + 1}, ${y + 1}`
                              : `Empty factory cell ${x + 1}, ${y + 1}`
                          }
                          onClick={() => handleFactoryCellPress(x, y, instance)}
                          key={`${x}-${y}`}
                        >
                          {instance && (!isStructureCell || isStructureController) ? (
                            <MachineGlyph id={instance.machineId} active={isMachineActive} pipeConnections={pipeConnectionsForInstance(instance)} />
                          ) : (
                            <span />
                          )}
                          {pipePolarity && (
                            <span className="pipe-polarity-overlay" aria-label="Pipe polarity">
                              {pipePolarity.map((side) => (
                                <span className={`pipe-polarity-side ${side.direction} ${side.state} mode-${side.mode}`} title={side.label} key={side.direction}>
                                  <PipeFlowArrows direction={side.direction} mode={side.mode} />
                                </span>
                              ))}
                            </span>
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

          {selectedPipeConfig && (isSteamPipeMachine(selectedPipeConfig.machineId) || isEuCableMachine(selectedPipeConfig.machineId) || isItemHopperMachine(selectedPipeConfig.machineId) || isFluidOutletConfigurableMachine(selectedPipeConfig.machineId)) && (
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
                    <p className="eyebrow">
                      {isItemHopperMachine(selectedPipeConfig.machineId)
                        ? 'Hopper Output'
                        : isFluidOutletConfigurableMachine(selectedPipeConfig.machineId)
                          ? 'Fluid Output'
                          : 'Pipe Routing'}
                    </p>
                    <h2>{machines[selectedPipeConfig.machineId].name}</h2>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={isItemHopperMachine(selectedPipeConfig.machineId) || isFluidOutletConfigurableMachine(selectedPipeConfig.machineId) ? 'Close output routing' : 'Close pipe routing'}
                    onClick={() => setSelectedPipeConfigUid(null)}
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="pipe-config-grid" aria-label={isItemHopperMachine(selectedPipeConfig.machineId) || isFluidOutletConfigurableMachine(selectedPipeConfig.machineId) ? 'Output directions' : 'Pipe routing directions'}>
                  {[-1, 0, 1].flatMap((dy) =>
                    [-1, 0, 1].map((dx) => {
                      const neighbour = machineAtFactoryCell(selectedPipeConfig.x + dx, selectedPipeConfig.y + dy)
                      const direction = pipeDirections.find((candidate) => {
                        const offset = pipeDirectionOffsets[candidate]
                        return offset.dx === dx && offset.dy === dy
                      })
                      const isCenter = dx === 0 && dy === 0
                      const mode = direction ? pipeSideMode(selectedPipeConfig, direction) : null
                      const disabled = mode === 'blocked'
                      const isHopperConfig = isItemHopperMachine(selectedPipeConfig.machineId)
                      const isFluidOutputConfig = isFluidOutletConfigurableMachine(selectedPipeConfig.machineId)
                      const connected = Boolean(
                        direction &&
                          neighbour &&
                          (isHopperConfig
                            ? mode === 'output' && !isItemAutomationMachine(neighbour.machineId)
                            : isFluidOutputConfig
                              ? mode === 'output' && machinesCanConnect(selectedPipeConfig, neighbour)
                              : machinesCanConnect(selectedPipeConfig, neighbour)),
                      )
                      const className = [
                        'pipe-config-cell',
                        isCenter ? 'center' : '',
                        direction ? 'toggle' : '',
                        disabled ? 'disabled-side' : '',
                        connected ? 'connected-side' : '',
                        mode ? `mode-${mode}` : '',
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
                          aria-label={`${pipeDirectionOffsets[direction].label} ${isHopperConfig || isFluidOutputConfig ? 'output' : 'flow'} ${pipeSideModeLabels[mode ?? 'blocked']}. Tap to cycle mode.`}
                          onClick={() => handleTogglePipeSide(selectedPipeConfig.uid, direction)}
                          key={`${dx},${dy}`}
                        >
                          {content}
                          <PipeFlowArrows direction={direction} mode={mode ?? 'blocked'} />
                          <strong>{pipeDirectionOffsets[direction].label}</strong>
                          <span className="pipe-side-mode">{pipeSideModeLabels[mode ?? 'blocked']}</span>
                        </button>
                      )
                    }),
                  )}
                </div>
                <p className="pipe-config-note">
                  {isItemHopperMachine(selectedPipeConfig.machineId)
                    ? 'Tap one side to choose where this hopper pushes items.'
                    : isFluidOutletConfigurableMachine(selectedPipeConfig.machineId)
                      ? 'Tap one side to choose where this machine drains fluid.'
                      : 'Tap a side to cycle flow: Closed, Out, In, Both.'}
                </p>
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
                <div className={selectedMachineMetrics.length > 0 ? 'machine-status-row has-metrics' : 'machine-status-row'}>
                  <span className="machine-status-pill">{machineStatus(state, selectedMachine)}</span>
                  {selectedMachineMetrics.length > 0 && (
                    <div className="machine-meter-grid">
                      {selectedMachineMetrics.map((metric) => (
                        <MachineMetricTile metric={metric} key={`${metric.label}-${metric.tone}`} />
                      ))}
                    </div>
                  )}
                </div>
                {(canFillBucketFromSelectedMachine || canEmptyBucketIntoSelectedMachine || (state.bucketFluid && selectedMachineCanManualFluidTransfer)) && selectedMachine && (
                  <div className="manual-fluid-transfer" aria-label="Manual fluid transfer">
                    <div>
                      <span>Bucket</span>
                      <strong>
                        {state.bucketFluid
                          ? `${formatLitres(state.bucketFluid.amount)}L ${fluidLabel(state.bucketFluid.id)}`
                          : availableResourceAmount(state, 'bucket') > 0
                            ? `Empty | ${bucketFluidTransferLitres}L`
                            : 'Need bucket'}
                      </strong>
                    </div>
                    {canFillBucketFromSelectedMachine && (
                      <button type="button" className="load-recipe-button compact-action-button" onClick={() => handleFillBucketFromMachine(selectedMachine.uid, selectedMachineStoredFluids[0]?.id)}>
                        Fill bucket
                      </button>
                    )}
                    {canEmptyBucketIntoSelectedMachine && (
                      <button type="button" className="load-recipe-button compact-action-button" onClick={() => handleEmptyBucketIntoMachine(selectedMachine.uid)}>
                        Empty bucket
                      </button>
                    )}
                  </div>
                )}
                {isItemAutomationMachine(selectedMachine.machineId) ? (
                  <div className={`furnace-interface ${selectedMachine.machineId}-process-interface item-automation-interface`}>
                    <div className="furnace-inputs">
                      <ProcessItemSlot
                        slot={selectedMachine.process.input}
                        label="Slot 1"
                        onClick={() => handleProcessSlotPress('input')}
                      />
                      {isItemHopperMachine(selectedMachine.machineId) ? (
                        <>
                          <ProcessItemSlot slot={selectedMachine.process.secondaryInput} label="Slot 2" onClick={() => handleProcessSlotPress('secondaryInput')} />
                          <ProcessItemSlot slot={selectedMachine.process.fuel} label="Slot 3" onClick={() => handleProcessSlotPress('fuel')} />
                          <ProcessItemSlot slot={selectedMachine.process.output} label="Slot 4" onClick={() => handleProcessSlotPress('output')} />
                        </>
                      ) : isItemStorageMachine(selectedMachine.machineId) ? (
                        <>
                          <ProcessItemSlot slot={selectedMachine.process.secondaryInput} label="Slot 2" onClick={() => handleProcessSlotPress('secondaryInput')} />
                          <ProcessItemSlot slot={selectedMachine.process.fuel} label="Slot 3" onClick={() => handleProcessSlotPress('fuel')} />
                        </>
                      ) : null}
                      <MachineGlyph
                        id={selectedMachine.machineId}
                        active={Boolean(
                          selectedMachine.process.activeRecipeId ||
                            selectedMachine.process.input ||
                            selectedMachine.process.secondaryInput ||
                            selectedMachine.process.fuel ||
                            selectedMachine.process.output,
                        )}
                      />
                    </div>
                    {isItemHopperMachine(selectedMachine.machineId) && (
                      <span className="hopper-direction-line">
                        Output: {pipeDirections.find((direction) => pipeSideMode(selectedMachine, direction) === 'output')
                          ? pipeDirectionOffsets[pipeDirections.find((direction) => pipeSideMode(selectedMachine, direction) === 'output')!].label
                          : 'Configure with wrench'}
                      </span>
                    )}
                  </div>
                ) : selectedMachine.machineId === 'well' ? (
                  <div className="well-interface">
                    <MachineGlyph id="well" active />
                    <span>Supplies adjacent boilers</span>
                  </div>
                ) : selectedMachine.machineId === 'steamTank' ? (
                  <div className="well-interface dual-tank-interface">
                    {selectedMachine.process.steamStoredMs > 0 && (
                      <SteamTank storedMs={selectedMachine.process.steamStoredMs} capacityMs={selectedSteamTankCapacityMs} />
                    )}
                    {storedFluids(selectedMachine.process).map((fluid) => (
                      <FluidTank label={fluidLabel(fluid.id)} storedLitres={fluid.amount} capacityLitres={selectedSteamTankFluidCapacityLitres} key={fluid.id} />
                    ))}
                    {selectedMachine.process.steamStoredMs < 1 && storedFluids(selectedMachine.process).length < 1 && (
                      <EmptyTank capacityLitres={selectedSteamTankFluidCapacityLitres} />
                    )}
                    <span>Stores one contents type from connected pipes</span>
                  </div>
                ) : isSteamPipeMachine(selectedMachine.machineId) ? (
                  <div className="well-interface dual-tank-interface">
                    {selectedMachine.process.steamStoredMs > 0 && (
                      <SteamTank
                        storedMs={selectedMachine.process.steamStoredMs}
                        capacityMs={selectedMachine.process.steamCapacityMs || steamPipeBufferCapacityMs(selectedMachine.machineId)}
                      />
                    )}
                    {storedFluids(selectedMachine.process).map((fluid) => (
                      <FluidTank
                        label={fluidLabel(fluid.id)}
                        storedLitres={fluid.amount}
                        capacityLitres={selectedMachine.process.fluidCapacityLitres || fluidPipeBufferCapacityLitres(selectedMachine.machineId)}
                        key={fluid.id}
                      />
                    ))}
                    {selectedMachine.process.steamStoredMs < 1 && storedFluids(selectedMachine.process).length < 1 && (
                      <EmptyTank label="Empty pipe" capacityLitres={fluidPipeBufferCapacityLitres(selectedMachine.machineId)} />
                    )}
                    <span>
                      Content flow {formatAmount(currentSteamPipeFlowLitresPerSecond(state, selectedMachine))}L/s | Limit {steamPipeTransferLitresPerSecond[selectedMachine.machineId] ?? 0}L/s
                    </span>
                  </div>
                ) : isEuCableMachine(selectedMachine.machineId) ? (
                  <div className="well-interface">
                    <EnergyTank storedEu={selectedMachine.process.euStored} capacityEu={selectedMachine.process.euCapacity || euCableBufferCapacity(selectedMachine.machineId)} />
                    <span>
                      Flow {formatAmount(currentEuCableFlowEuPerSecond(state, selectedMachine))} EU/s | Loses {tinCableLossEuPerTile} EU per cable tile
                    </span>
                  </div>
                ) : isLiquidSteamBoilerMachine(selectedMachine.machineId) ? (
                  <div className="well-interface liquid-boiler-interface">
                    <SteamTank storedMs={selectedMachine.process.steamStoredMs} capacityMs={liquidSteamBoilerCapacityMs} />
                    {(selectedMachine.process.fluids.creosote ?? 0) > 0 && (
                      <FluidTank label={fluidLabel('creosote')} storedLitres={selectedMachine.process.fluids.creosote ?? 0} capacityLitres={liquidSteamBoilerFluidCapacityLitres} />
                    )}
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
                    {(selectedMachine.machineId === 'steamAlloySmelter' || selectedMachine.machineId === 'lvAlloySmelter' || selectedMachine.machineId === 'lvAssembler' || selectedMachine.machineId === 'lvCentrifuge') && (
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
                    {selectedMachine.machineId === 'cokeOven' && (selectedMachine.process.fluids.creosote ?? 0) > 0 && (
                      <FluidTank
                        label={fluidLabel('creosote')}
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
                    {selectedMachineProcessTimeLabel && <strong>{selectedMachineProcessTimeLabel}</strong>}
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
                  <p className="furnace-help">
                    {isItemHopperMachine(selectedMachine.machineId)
                      ? 'Tap storage, then a hopper slot to choose an amount.'
                      : 'Tap storage, then a valid slot to choose an amount. Tap Output to collect.'}
                  </p>
                )}
              </section>
            </div>
          )}
        </section>
      )}

      {page === 'shop' && (
        <section className="shop-page" aria-label="Foundry Scrip shop">
          <div className="shop-head">
            <div>
              <p className="eyebrow">Foundry Scrip</p>
              <h2>Factory Shop</h2>
            </div>
            <strong>{formatAmount(state.scrip)} Scrip</strong>
          </div>
          <p className="shop-note">Only discovered resources and parts can be bought. Tools and machines are never sold here.</p>
          <div className="shop-section">
            <h3>Buy parts</h3>
            <div className="shop-grid">
              {shopItems.map((item) => {
                const discovered = isResourceDiscovered(state, item.id)
                const canBuy = canBuyShopItem(state, item)
                const cooldownMs = shopItemCooldownMs(item)
                const cooldownRemainingMs = shopItemCooldownRemainingMs(state, item)
                return (
                  <article className={discovered ? 'shop-card' : 'shop-card locked'} key={`buy-${item.id}`}>
                    <span className="item-slot filled">
                      <PixelIcon id={item.id} />
                    </span>
                    <div>
                      <strong>{resourceLabels[item.id]}</strong>
                      <span>{item.age === 'gettingStarted' ? 'Getting Started' : item.age === 'steamAge' ? 'Steam Age' : 'LV Age'}</span>
                      {cooldownMs > 0 && (
                        <span className="shop-cooldown">
                          {cooldownRemainingMs > 0 ? `Part cooldown ${formatDuration(cooldownRemainingMs)}` : `Part cooldown ${formatDuration(cooldownMs)}`}
                        </span>
                      )}
                    </div>
                    <button type="button" disabled={!canBuy} onClick={() => handleBuyShopItem(item.id)}>
                      {!discovered
                        ? 'Undiscovered'
                        : cooldownRemainingMs > 0
                          ? `Wait ${formatDuration(cooldownRemainingMs)}`
                          : `${formatAmount(item.buyPrice)} Scrip`}
                    </button>
                  </article>
                )
              })}
            </div>
          </div>
          <div className="shop-section">
            <h3>Sell gathered materials</h3>
            <div className="shop-grid">
              {sellItems.map((item) => {
                const owned = availableResourceAmount(state, item.id)
                const canSell = canSellShopItem(state, item)
                return (
                  <article className="shop-card sell-card" key={`sell-${item.id}`}>
                    <span className="item-slot filled">
                      <PixelIcon id={item.id} />
                      <span className="item-count">{formatAmount(owned)}</span>
                    </span>
                    <div>
                      <strong>{resourceLabels[item.id]}</strong>
                      <span>Sell 1 for {formatAmount(item.sellPrice)} Scrip</span>
                    </div>
                    <button type="button" disabled={!canSell} onClick={() => handleSellShopItem(item.id)}>
                      Sell
                    </button>
                  </article>
                )
              })}
            </div>
          </div>
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
            onClaimAll={handleClaimAllQuestRewards}
            claimableRewardCount={claimableQuestRewardCount}
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
          onOpenFactory={handleJumpToFactoryFromQuest}
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
