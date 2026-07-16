import {
  Axe,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  Droplet,
  Download,
  Factory,
  LayoutGrid,
  Maximize2,
  Pickaxe,
  Route,
  Save,
  Sparkles,
  Toolbox,
  Trash2,
  Undo2,
  Upload,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import {
  memo,
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
  fluidColors,
  fluidIds,
  fluidLabels,
  gatherTargets,
  canAutoMinerTarget,
  createInitialState,
  isAutoMinerMachine,
  isEuCableMachine,
  isEuBlastMachine,
  isEuNetworkMachine,
  isEuPoweredMachine,
  isEuProducerMachine,
  isEuStorageMachine,
  isItemAutomationMachine,
  isItemBusMachine,
  isItemHopperMachine,
  isItemStorageMachine,
  isLiquidSteamBoilerMachine,
  isPlaceableMachine,
  isResourceBackedMachine,
  isSteamNetworkMachine,
  isSteamPipeMachine,
  isSteamPoweredMachine,
  machines,
  processRecipes,
  questChapters,
  quests as questDefinitions,
  recipes,
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
  arcBlastFurnaceStructureForInstance,
  assignAutoMiner,
  buyShopItem,
  boilerSteamProductionLitresPerSecond,
  boilerHasWater,
  boilerSteamCapacityMs,
  canBuyShopItem,
  canSellShopItem,
  cokeOvenFluidCapacityLitres,
  canCraft,
  claimAllQuestRewards,
  claimQuestReward,
  collectProcessOutput,
  createCreativeFactoryState,
  createCreativeState,
  currentFluidOutputFlows,
  currentWellWaterFlowLitresPerSecond,
  currentEuCableFlowEuPerSecond,
  availableConnectedEuAmps,
  currentSteamPipeFlowLitresPerSecond,
  cyclePipeSideMode,
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
  fillPortableFluidContainer,
  drainPortableFluidContainer,
  fluidContainerCapacities,
  fluidContainerGroups,
  fluidPipeBufferCapacityLitres,
  getBestToolForTarget,
  hasFactoryFloor,
  hitGatherTarget,
  isAutoMinerPowered,
  isReachGateFormed,
  isFluidOutletConfigurableMachine,
  isLvItemAutomationMachine,
  isResourceDiscovered,
  insertProcessSlot,
  loadProcessRecipeInputs,
  insertMachineStorageSlot,
  installLvBatteryInBuffer,
  installSurveyCardInAutoMiner,
  loadGame,
  machineFluidBuffersForInstance,
  lvItemAutomationStatus,
  simulateOfflineProgress,
  makeGridForRecipe,
  maxDurability,
  missingForQuantity,
  missingForRecipe,
  machinesCanConnect,
  multiblockControllerForInstance,
  multiblockPositions,
  placeMachineInstance,
  pipeDirections,
  pipeSideMode,
  pipeSideModeLabels,
  processStackLimit,
  processRecipeInputLoadStatus,
  questProgress,
  questObjectiveProgress,
  questObjectives,
  questKind,
  questScripReward,
  questStatus,
  recipeFitsTerminalGrid,
  removeProcessSlot,
  removeMachineInstance,
  removeMachineStorageSlot,
  searchTerminalRecipes,
  sellShopItem,
  setFluidOutputDirection,
  setConfiguredProcessRecipe,
  setLvItemOutputDirection,
  setPipeSideMode,
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
  wellWaterProductionLitresPerSecond,
  steamTankCapacityMs,
  steamTankCapacityMsForInstance,
  steamTankFluidCapacityLitresForInstance,
  steamTankStructureForInstance,
  lvBatteryBufferEuCapacity,
  lvBatteryBufferOutputEuPerSecond,
  batteryBufferInstalledBatteries,
  batteryBufferSlots,
  batteryEuCapacity,
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
  topUpCreativeState,
  removeLvBatteryFromBuffer,
  removeSurveyCardFromAutoMiner,
  unassignAutoMiner,
  unequipSlot,
  visibleQuests,
  visibleRecipes,
  durabilityRemaining,
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
  type RecipeGroup,
} from './game/recipeGroups'
import { minimumMachineForProcessRecipe, processRecipesForMachine, processRecipesInMachineTierOrder, processRecipeToCatalogRecipe } from './game/recipeGraph'
import { formatAmount, formatDuration, formatLitres, formatSteamLitres } from './game/format'
import { GatherTapArt, MachineGlyph, PixelIcon, type PipeConnections } from './components/GameIcons'
import { FluidIcon } from './components/FluidIcon'
import { machineUiChamberSrc, machineUiPanelSrc, machineUiStageSrc } from './components/machineUiAssets'
import { DurabilityBar, ItemSlot, MachineSlot, ProcessItemSlot } from './components/InventorySlots'
import type {
  CraftSlot,
  EquipmentSlotId,
  FluidContainerKind,
  FluidId,
  GatherTargetId,
  GameState,
  MachineId,
  MachineInstance,
  MachineProcessState,
  OfflineProgressResult,
  PipeDirection,
  PipeSideMode,
  ProcessRecipe,
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

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean
}

function recipeOpensProcessView(recipe: Recipe) {
  return Boolean(recipe.requiredMachine || recipe.recipeType === 'processing' || (recipe.stationType && recipe.stationType !== 'hand'))
}

type Page = 'home' | 'gather' | 'terminal' | 'processing' | 'guide' | 'shop'
type TerminalMode = 'recipes' | 'machines'
type MachineTerminalMode = 'items' | 'fluids'
type MachineReviewState = 'idle' | 'active' | 'filled' | 'blocked' | 'missing' | 'disconnected'
type MachineFluidBufferView = ReturnType<typeof machineFluidBuffersForInstance>[number]
type DragPreview = { id: ResourceId; x: number; y: number }
type FactoryView = { x: number; y: number; zoom: number }
type FactoryFloorViewMode = 'production' | 'maintenance'
type FactoryMaintenanceState = 'running' | 'power-loss' | 'output-full' | 'idle'
type FactoryPointerPosition = { x: number; y: number; clientX: number; clientY: number }
type FactoryGesture =
  | { mode: 'pan'; pointerId: number; startX: number; startY: number; originX: number; originY: number; dragged: boolean }
  | { mode: 'pinch'; startDistance: number; originZoom: number; contentX: number; contentY: number; dragged: boolean }
const assemblerExtraInputSlotIds = ['extraInput1', 'extraInput2', 'extraInput3', 'extraInput4'] as const
const assemblerInputSlotIds = ['input', 'secondaryInput', ...assemblerExtraInputSlotIds] as const
const machineReviewStates: MachineReviewState[] = ['idle', 'active', 'filled', 'blocked', 'missing', 'disconnected']
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
  | { kind: 'fluid'; id: FluidId; amount: number; label: string }

type MachineHmiConfig = {
  kind: string
  runningLabel: string
  secondaryInput?: boolean
}

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
  'tinCable2A',
  'tinCable4A',
  'tinCable8A',
  'lvBatteryBuffer',
  'lvBatteryBuffer2A',
  'lvBatteryBuffer4A',
  'lvBatteryBuffer8A',
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
  'lvChemicalReactor',
  'lvCentrifuge',
  'lvCanner',
  'lvAutoMiner',
  'lvEnergyHatch2A',
  'lvInputBus',
  'lvOutputBus',
  'lvFluidInputHatch',
  'lvFluidOutputHatch',
  'cokeOvenPart',
  'cokeOven',
  'brickedBlastFurnacePart',
  'brickedBlastFurnace',
  'arcBlastFurnacePart',
  'arcBlastFurnace',
  'reachGateCasing',
  'reachGate',
]

const machineHmiConfigs: Partial<Record<MachineId, MachineHmiConfig>> = {
  steamForgeHammer: { kind: 'forgeHammer', runningLabel: 'Forging' },
  steamMacerator: { kind: 'macerator', runningLabel: 'Crushing' },
  steamCompressor: { kind: 'compressor', runningLabel: 'Compressing' },
  steamExtractor: { kind: 'extractor', runningLabel: 'Extracting' },
  steamAlloySmelter: { kind: 'alloySmelter', runningLabel: 'Smelting', secondaryInput: true },
  steamFurnace: { kind: 'furnace', runningLabel: 'Smelting' },
  lvForgeHammer: { kind: 'forgeHammer', runningLabel: 'Forging' },
  lvMacerator: { kind: 'macerator', runningLabel: 'Crushing' },
  lvCompressor: { kind: 'compressor', runningLabel: 'Compressing' },
  lvExtractor: { kind: 'extractor', runningLabel: 'Extracting' },
  lvAlloySmelter: { kind: 'alloySmelter', runningLabel: 'Smelting', secondaryInput: true },
  lvFurnace: { kind: 'furnace', runningLabel: 'Smelting' },
  lvWiremill: { kind: 'wiremill', runningLabel: 'Drawing' },
  lvBender: { kind: 'bender', runningLabel: 'Bending' },
  lvLathe: { kind: 'lathe', runningLabel: 'Turning' },
  lvElectrolyzer: { kind: 'electrolyzer', runningLabel: 'Splitting' },
  lvCentrifuge: { kind: 'centrifuge', runningLabel: 'Spinning', secondaryInput: true },
  lvCanner: { kind: 'canner', runningLabel: 'Canning', secondaryInput: true },
  lvChemicalReactor: { kind: 'chemicalReactor', runningLabel: 'Reacting', secondaryInput: true },
}

const visibleQuestChapterIds = new Set<QuestChapterId>(['gettingStarted', 'steamAge', 'lvAge', 'multiblocks', 'shatteredReach'])
const placeableFactoryMachineOrder = machineOrder.filter(isPlaceableMachine)
const inventoryMachineOrder = machineOrder.filter((id) => !isResourceBackedMachine(id))

function fluidLabel(fluidId: FluidId) {
  return fluidLabels[fluidId]
}

function fluidVisualColor(fluidId: FluidId | undefined) {
  return fluidId ? fluidColors[fluidId] : '#73c6b8'
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

type GatherAreaId = 'forest' | 'lake' | 'mine' | 'shatteredReach'

const gatherAreas: Array<{ id: GatherAreaId; label: string; targets: GatherTargetId[] }> = [
  { id: 'forest', label: 'Forest', targets: ['tree', 'rubberTree'] },
  { id: 'lake', label: 'Lake', targets: ['sandPatch', 'clayPatch', 'gravelPatch'] },
  {
    id: 'mine',
    label: 'Mine',
    targets: ['stone', 'ironVein', 'copperVein', 'tinVein', 'nickelVein', 'bauxiteVein', 'redstoneVein', 'coalSeam', 'diamondVein', 'leadVein', 'saltDeposit', 'obsidianDeposit'],
  },
  { id: 'shatteredReach', label: 'Shattered Reach', targets: ['sulfurVent'] },
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
  diamondVein: 'diamond',
  leadVein: 'leadOre',
  saltDeposit: 'sodiumSalt',
  obsidianDeposit: 'obsidian',
  sulfurVent: 'sulfurOre',
}
const craftSlotHitboxScale = 0.64

const multiblockQuestIds = new Set<QuestId>([
  'cokeOvenBrickQuest',
  'cokeOvenQuest',
  'bbfCasingsQuest',
  'buildBbfQuest',
  'makeHeatingCoilsQuest',
  'makeInvarQuest',
  'craftArcControllerQuest',
  'buildLvAssemblerForPortsQuest',
  'craftArcItemBusesQuest',
  'craftArcEnergyHatchesQuest',
  'craftArcFluidHatchesQuest',
  'buildArcBlastFurnaceQuest',
  'bufferArcBlastFurnaceQuest',
])

function questBookChapterId(quest: Quest): QuestChapterId {
  if (quest.chapterId === 'shatteredReach') return 'shatteredReach'
  if (quest.chapterId === 'lvAge') return 'lvAge'
  if (quest.chapterId === 'multiblocks') return 'multiblocks'
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
  buildFoundation: { x: 770, y: 210 },
  buildFurnace: { x: 945, y: 210 },
  firstDirt: { x: 1120, y: 210 },
  copperAndTin: { x: 1295, y: 210 },
  craftMortar: { x: 1470, y: 130 },
  bronzeAge: { x: 1645, y: 210 },
  gatherClay: { x: 1295, y: 430 },
  makeBricks: { x: 1470, y: 430 },
  buildWell: { x: 70, y: 200 },
  craftSteamCasingQuest: { x: 245, y: 200 },
  makeSteam: { x: 420, y: 200 },
  pipeSteam: { x: 595, y: 200 },
  storageAutomationQuest: { x: 595, y: 380 },
  steamMaceratorQuest: { x: 770, y: 115 },
  steamForgeHammerQuest: { x: 945, y: 115 },
  steamOrePrepQuest: { x: 945, y: 20 },
  steamUtilityBranch: { x: 1120, y: 115 },
  treeTapQuest: { x: 770, y: 320 },
  cokeOvenBrickQuest: { x: 945, y: 320 },
  cokeOvenQuest: { x: 1120, y: 320 },
  cokeOvenDrainQuest: { x: 1295, y: 420 },
  creosoteQuest: { x: 1470, y: 320 },
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
  makeSteelMechanicsQuest: { x: 1875, y: 90 },
  makeLvMotorQuest: { x: 2055, y: 90 },
  makeLvMotionPartsQuest: { x: 2235, y: 90 },
  buildLvWiremillQuest: { x: 2415, y: 105 },
  runLvWiremillQuest: { x: 2415, y: 335 },
  bufferLvPowerQuest: { x: 2610, y: 220 },
  creosoteBoilerQuest: { x: 2790, y: 50 },
  makeDiamondPickQuest: { x: 2790, y: 190 },
  gatherBatteryMineralsQuest: { x: 2970, y: 190 },
  makeEmptyBatteryCellQuest: { x: 3150, y: 190 },
  buildLvCannerQuest: { x: 3330, y: 190 },
  fillLvBatteryQuest: { x: 3510, y: 190 },
  buildTwoAmpCableQuest: { x: 3690, y: 190 },
  buildFourAmpCableQuest: { x: 3870, y: 190 },
  buildFourAmpBufferQuest: { x: 4050, y: 190 },
  buildLvBenderQuest: { x: 2790, y: 350 },
  runLvBenderQuest: { x: 2970, y: 350 },
  buildLvLatheQuest: { x: 2790, y: 500 },
  runLvLatheQuest: { x: 2970, y: 500 },
  buildLvElectrolyzerQuest: { x: 4230, y: 350 },
  findBauxiteQuest: { x: 4410, y: 260 },
  makeAluminiumDustQuest: { x: 4590, y: 260 },
  findNickelQuest: { x: 4230, y: 510 },
  makeCupronickelQuest: { x: 4410, y: 510 },
  makeHeatingCoilsQuest: { x: 4590, y: 510 },
  makeInvarQuest: { x: 4770, y: 620 },
  craftArcControllerQuest: { x: 4950, y: 510 },
  craftArcItemBusesQuest: { x: 5130, y: 440 },
  craftArcEnergyHatchesQuest: { x: 5130, y: 580 },
  buildLvAssemblerForPortsQuest: { x: 4950, y: 720 },
  craftArcFluidHatchesQuest: { x: 5130, y: 720 },
  buildArcBlastFurnaceQuest: { x: 5310, y: 510 },
  bufferArcBlastFurnaceQuest: { x: 5490, y: 510 },
  firstAluminiumQuest: { x: 5670, y: 360 },
}

const multiblockQuestPositionOverrides: Partial<Record<QuestId, { x: number; y: number }>> = {
  cokeOvenBrickQuest: { x: 70, y: 380 },
  cokeOvenQuest: { x: 245, y: 380 },
  bbfCasingsQuest: { x: 420, y: 380 },
  buildBbfQuest: { x: 595, y: 380 },
  makeHeatingCoilsQuest: { x: 70, y: 80 },
  makeInvarQuest: { x: 245, y: 80 },
  craftArcControllerQuest: { x: 420, y: 145 },
  buildLvAssemblerForPortsQuest: { x: 420, y: 290 },
  craftArcItemBusesQuest: { x: 595, y: 80 },
  craftArcEnergyHatchesQuest: { x: 595, y: 210 },
  craftArcFluidHatchesQuest: { x: 595, y: 290 },
  buildArcBlastFurnaceQuest: { x: 770, y: 145 },
  bufferArcBlastFurnaceQuest: { x: 945, y: 145 },
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
  if (notices.includes('portable-fluid-containers')) return 'Buckets and Steel Cells now keep their exact fluid and fill level. Legacy filled cells were converted, and old overfilled buckets were safely limited to their new 1L capacity.'
  if (notices.includes('arc-furnace-3x3')) return 'Arc Furnaces now use flexible 3x3 structures. Legacy furnaces were dismantled and their heatproof casings returned so you can build the new controller, buses, and Energy Hatches.'
  if (notices.includes('survey-card-inventory')) return 'Survey Cards are now physical LV Auto Miner inventory items. Cards assigned by an older save have been moved into their miner without losing the target or card.'
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

function isIosClient() {
  if (typeof window === 'undefined') return false
  const userAgent = window.navigator.userAgent
  return /iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && (window.navigator.maxTouchPoints ?? 0) > 1)
}

function isStandaloneInstall() {
  if (typeof window === 'undefined') return false
  const navigatorWithStandalone = window.navigator as NavigatorWithStandalone
  return Boolean(navigatorWithStandalone.standalone) || window.matchMedia('(display-mode: standalone)').matches
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
const factoryDefaultZoom = 0.85
const factoryMinZoom = 0.55
const factoryMaxZoom = 1.65
const factoryZoomStep = 0.15

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

type FactoryFloorGridProps = {
  state: GameState
  width: number
  height: number
  viewMode: FactoryFloorViewMode
  placingMachineId: MachineId | null
  cellPressRef: { current: (x: number, y: number, instance?: MachineInstance) => void }
}

const FactoryFloorGrid = memo(function FactoryFloorGrid({
  state,
  width,
  height,
  viewMode,
  placingMachineId,
  cellPressRef,
}: FactoryFloorGridProps) {
  const machineByCell = useMemo(
    () => new Map(state.machineInstances.map((instance) => [`${instance.x},${instance.y}`, instance])),
    [state.machineInstances],
  )
  const machineAtCell = (x: number, y: number) => machineByCell.get(`${x},${y}`)

  const pipeConnectionsForInstance = (instance: MachineInstance): PipeConnections | undefined => {
    const isSteamPipe = isSteamPipeMachine(instance.machineId)
    const isEuCable = isEuCableMachine(instance.machineId)
    if (!isSteamPipe && !isEuCable) return undefined
    const isSteamPipeNeighbour = (machineId: MachineId) =>
      isSteamNetworkMachine(machineId) || (machines[machineId].fluidCapacityLitres ?? 0) > 0 || machineId === 'well'
    const connectsTo = (x: number, y: number) => {
      const neighbour = machineAtCell(x, y)
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
    return controller ? machineAtCell(controller.x, controller.y) : null
  }

  const controllerForStructure = (instance: MachineInstance) => {
    const tankStructure = steamTankStructureForInstance(state, instance)
    if (tankStructure) return tankStructure.controller
    const arcStructure = arcBlastFurnaceStructureForInstance(state, instance)
    if (arcStructure) return arcStructure.controller
    return controllerForMultiblockPart(instance)
  }

  const fluidOutputFacesForInstance = (instance: MachineInstance) => {
    const controller = controllerForStructure(instance) ?? instance
    const multiblock = multiblockControllerForInstance(state, controller)
    if (!multiblock || !isFluidOutletConfigurableMachine(multiblock.spec.controller)) return []
    const originX = multiblock.x - (multiblock.spec.controllerOffsetX ?? 0)
    const originY = multiblock.y - (multiblock.spec.controllerOffsetY ?? 0)
    const maxX = originX + multiblock.spec.width - 1
    const maxY = originY + multiblock.spec.height - 1
    return multiblockPositions(state, multiblock.x, multiblock.y, multiblock.spec)
      .flatMap((position) => {
        const cell = machineAtCell(position.x, position.y)
        if (!cell) return []
        const directions: PipeDirection[] = []
        if (position.y === originY) directions.push('north')
        if (position.x === maxX) directions.push('east')
        if (position.y === maxY) directions.push('south')
        if (position.x === originX) directions.push('west')
        return directions.map((direction) => ({ cell, direction }))
      })
  }

  const pipePolarityForInstance = (instance: MachineInstance) => {
    const isSteamPipe = isSteamPipeMachine(instance.machineId)
    const isEuCable = isEuCableMachine(instance.machineId)
    const isHopper = isItemHopperMachine(instance.machineId)
    const fluidFaces = isFluidOutletConfigurableMachine(instance.machineId)
      ? fluidOutputFacesForInstance(instance).filter((face) => face.cell.uid === instance.uid)
      : []
    if (!isSteamPipe && !isEuCable && !isHopper && fluidFaces.length < 1) return null

    if (fluidFaces.length > 0) {
      const sides = fluidFaces.flatMap((face) => {
        const offset = pipeDirectionOffsets[face.direction]
        const mode = pipeSideMode(face.cell, face.direction)
        if (mode !== 'output') return []
        const neighbour = machineAtCell(face.cell.x + offset.dx, face.cell.y + offset.dy)
        return [{
          direction: face.direction,
          mode,
          state: neighbour && machinesCanConnect(face.cell, neighbour) ? 'connected' as const : 'open' as const,
          label: `${offset.label} ${pipeSideModeLabels[mode]}`,
        }]
      })
      return sides.length > 0 ? sides : null
    }

    return pipeDirections.map((direction) => {
      const offset = pipeDirectionOffsets[direction]
      const neighbour = machineAtCell(instance.x + offset.dx, instance.y + offset.dy)
      const mode = pipeSideMode(instance, direction)
      const blocked = mode === 'blocked'
      const isSteamPipeNeighbour = (machineId: MachineId) =>
        isSteamNetworkMachine(machineId) || (machines[machineId].fluidCapacityLitres ?? 0) > 0 || machineId === 'well'
      const connected = Boolean(
        !blocked &&
          neighbour &&
          (isHopper
            ? (((mode === 'input' || mode === 'both') && !isItemHopperMachine(neighbour.machineId) && !isItemBusMachine(neighbour.machineId)) ||
                ((mode === 'output' || mode === 'both') && (isItemStorageMachine(neighbour.machineId) || !isItemAutomationMachine(neighbour.machineId))))
            : machinesCanConnect(instance, neighbour) && (isEuCable ? isEuNetworkMachine(neighbour.machineId) : isSteamPipeNeighbour(neighbour.machineId))),
      )
      return {
        direction,
        mode,
        state: blocked ? 'blocked' as const : connected ? 'connected' as const : 'open' as const,
        label: `${offset.label} ${pipeSideModeLabels[mode]}`,
      }
    })
  }

  return (
    <div className={`factory-grid factory-view-${viewMode}`} style={{ gridTemplateColumns: `repeat(${width}, ${factoryCellSize}px)` }} aria-label="Factory grid">
      {Array.from({ length: width * height }, (_, index) => {
        const x = index % width
        const y = Math.floor(index / width)
        const instance = machineAtCell(x, y)
        const arcStructure = instance ? arcBlastFurnaceStructureForInstance(state, instance) : null
        const isFormedArc = Boolean(arcStructure?.formed)
        const isFormedArcController = Boolean(isFormedArc && arcStructure && instance?.uid === arcStructure.controller.uid)
        const isFormedArcInspection = false
        const showFormedArc = isFormedArcController && !isFormedArcInspection
        const multiblockController = instance ? controllerForMultiblockPart(instance) : null
        const tankStructure = instance?.machineId === 'steamTank' ? steamTankStructureForInstance(state, instance) : null
        const isMultiblockController = Boolean(instance?.machineId && machines[instance.machineId].multiblock)
        const isTankStructureController = Boolean(tankStructure && instance && tankStructure.controller.uid === instance.uid && tankStructure.area > 1)
        const isTankStructureChild = Boolean(tankStructure && instance && tankStructure.controller.uid !== instance.uid)
        const isStructureController = isMultiblockController || isTankStructureController
        const isStructureCell = isStructureController || Boolean(multiblockController) || isTankStructureChild
        const isConnector = Boolean(instance && (isSteamPipeMachine(instance.machineId) || isEuCableMachine(instance.machineId)))
        const pipePolarity = viewMode === 'maintenance' && instance ? pipePolarityForInstance(instance) : null
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
            !isConnector &&
            (instance.process.fuelRemainingMs > 0 ||
              instance.process.activeRecipeId ||
              (isSteamNetworkMachine(instance.machineId) && instance.process.steamStoredMs > 0) ||
              (isEuNetworkMachine(instance.machineId) && instance.process.euStored > 0) ||
              Object.values(instance.process.fluids).some((amount) => (amount ?? 0) > 0)),
        )
        const statusLabel = viewMode === 'maintenance' && instance && !isConnector ? machineStatus(state, instance) : ''
        const hasPowerFailure = Boolean(
          viewMode === 'maintenance' &&
            instance &&
            !isConnector &&
            ((isSteamPoweredMachine(instance.machineId) && availableConnectedSteam(state, instance) < 1) ||
              (isEuPoweredMachine(instance.machineId) && availableConnectedEu(state, instance) < 1)),
        )
        const maintenanceState: FactoryMaintenanceState =
          viewMode !== 'maintenance' || !instance || isConnector
            ? 'idle'
            : statusLabel === 'Output full' || (instance.process.output?.amount ?? 0) >= processStackLimit
              ? 'output-full'
              : hasPowerFailure ||
                  statusLabel === 'No power' ||
                  statusLabel === 'Underpowered' ||
                  statusLabel === 'No steam' ||
                  statusLabel === 'Waiting for buffer' ||
                  /^Needs \d+A route$/.test(statusLabel)
                ? 'power-loss'
                : instance.process.activeRecipeId || instance.process.fuelRemainingMs > 0 || statusLabel === 'Supplying water'
                  ? 'running'
                  : 'idle'
        const animateMachine = viewMode === 'maintenance' && maintenanceState === 'running'

        return (
          <button
            type="button"
            className={
              instance
                ? [
                    'factory-cell',
                    'occupied',
                    `machine-${instance.machineId}-cell`,
                    isConnector ? 'connector-cell' : '',
                    isMachineActive ? 'active' : '',
                    `maintenance-${maintenanceState}`,
                    isMultiblockController ? 'multiblock-bbf-controller' : '',
                    multiblockController ? 'multiblock-bbf-child' : '',
                    isTankStructureController ? 'tank-structure-controller' : '',
                    isTankStructureChild ? 'tank-structure-child' : '',
                    isFormedArc ? 'formed-arc-cell' : '',
                    isFormedArcController ? 'formed-arc-controller-cell' : '',
                    isFormedArc && !isFormedArcController ? 'formed-arc-child-cell' : '',
                    isFormedArcInspection ? 'formed-arc-inspection-cell' : '',
                  ].filter(Boolean).join(' ')
                : placingMachineId
                  ? 'factory-cell placing'
                  : 'factory-cell'
            }
            style={tankStructureStyle}
            aria-label={
              instance
                ? `${isStructureCell && structureMachineId ? machines[structureMachineId].name : machines[instance.machineId].name} at ${x + 1}, ${y + 1}${statusLabel ? `, ${statusLabel}` : ''}`
                : `Empty factory cell ${x + 1}, ${y + 1}`
            }
            onClick={() => cellPressRef.current(x, y, instance)}
            key={`${x}-${y}`}
          >
            {showFormedArc && arcStructure ? (
              <span className={animateMachine ? 'formed-arc-render active' : 'formed-arc-render'} aria-hidden="true">
                <img src={`${import.meta.env.BASE_URL}game-art/formed-arc-blast-furnace.png`} alt="" draggable={false} />
                <span className="formed-arc-core" />
                {arcStructure.perimeter
                  .filter((part) => part.machineId !== 'arcBlastFurnacePart')
                  .map((part) => {
                    const activeDirection = pipeDirections.find((direction) => pipeSideMode(part, direction) !== 'blocked') ?? 'east'
                    return (
                      <span
                        className={`formed-arc-port formed-arc-port-${part.machineId} formed-arc-port-direction-${activeDirection}`}
                        style={{
                          left: `${(part.x - arcStructure.controller.x + 1) * (factoryCellSize + factoryCellGap) + factoryCellSize / 2}px`,
                          top: `${(part.y - arcStructure.controller.y + 1) * (factoryCellSize + factoryCellGap) + factoryCellSize / 2}px`,
                        }}
                        key={part.uid}
                      >
                        <span className="formed-arc-port-mark" />
                      </span>
                    )
                  })}
              </span>
            ) : instance && (!isFormedArc || isFormedArcInspection) && (!isStructureCell || isStructureController || isFormedArcInspection) ? (
              <MachineGlyph id={instance.machineId} active={animateMachine} pipeConnections={pipeConnectionsForInstance(instance)} />
            ) : (
              <span />
            )}
            {pipePolarity && (
              <span className="pipe-polarity-overlay" aria-label="Pipe polarity">
                {pipePolarity.map((side) => (
                  <span className={`pipe-polarity-side ${side.direction} ${side.state} mode-${side.mode}`} title={side.label} key={side.direction}>
                    {instance && isEuCableMachine(instance.machineId) ? <span className="cable-connection-mark" /> : <PipeFlowArrows direction={side.direction} mode={side.mode} />}
                    {instance && isItemHopperMachine(instance.machineId) && side.mode !== 'blocked' && (
                      <span className="hopper-route-mark">{side.mode === 'input' ? 'IN' : side.mode === 'output' ? 'OUT' : 'I/O'}</span>
                    )}
                  </span>
                ))}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
})

function FactoryFloorLayoutPreview({ recipe }: { recipe: Recipe }) {
  if (!isFactoryFloorLayoutRecipe(recipe)) return null
  const isArc = recipe.id === 'build_arc_blast_furnace'
  const machineId = isArc ? 'arcBlastFurnace' : 'brickedBlastFurnace'
  const partId = isArc ? 'arcBlastFurnacePart' : 'brickedBlastFurnacePart'
  const arcLayout: MachineId[] = ['lvEnergyHatch2A', 'lvEnergyHatch2A', partId, 'lvInputBus', machineId, 'lvOutputBus', partId, partId, partId]

  return (
    <div className="factory-layout-preview" aria-label={`${recipeDisplayName(recipe)} factory floor layout`}>
      <div className={isArc ? 'factory-layout-multiblock arc-layout-preview' : 'factory-layout-multiblock'}>
        {!isArc && <MachineGlyph id={machineId} />}
        {(isArc ? arcLayout : Array.from({ length: 4 }, (_, index) => index === 0 ? machineId : partId)).map((id, index) => (
          <span className={id === machineId ? 'factory-layout-cell controller' : 'factory-layout-cell'} key={index}>
            <MachineGlyph id={id} />
          </span>
        ))}
      </div>
      <p>{isArc ? 'Controller in the centre; arrange two Energy Hatches and the item buses anywhere around its perimeter.' : 'Place the 4 staged BBF casing blocks as a 2x2 on the factory floor.'}</p>
    </div>
  )
}

function recipeOutputLabel(recipe: Recipe) {
  if (recipe.surveyCardOutput) return `1 ${gatherTargets[recipe.surveyCardOutput].name} Survey Card`
  if (recipe.outputs.length > 0) {
    return recipe.outputs.map((amount) => `${amount.amount} ${resourceLabels[amount.id]}`).join(', ')
  }
  if (recipe.machineOutputs?.length) return recipe.machineOutputs.map((amount) => `${amount.amount} ${machines[amount.id].name}`).join(', ')
  return recipe.fluidOutputs?.map((amount) => `${formatLitres(amount.amount)}L ${fluidLabel(amount.id)}`).join(', ') ?? 'No output'
}

function recipePrimaryOutput(recipe: Recipe): RecipeDisplayOutput {
  if (recipe.surveyCardOutput) {
    return {
      kind: 'resource',
      id: 'surveyKit',
      amount: 1,
      label: `${gatherTargets[recipe.surveyCardOutput].name} Survey Card`,
    }
  }
  const resourceOutput = recipe.outputs.find((amount) => amount.amount > 0)
  if (resourceOutput) {
    return {
      kind: 'resource',
      id: resourceOutput.id,
      amount: resourceOutput.amount,
      label: resourceLabels[resourceOutput.id],
    }
  }

  const machineOutput = recipe.machineOutputs?.find((amount) => amount.amount > 0)
  if (machineOutput) {
    return {
      kind: 'machine',
      id: machineOutput.id,
      amount: machineOutput.amount,
      label: machines[machineOutput.id].name,
    }
  }

  const fluidOutput = recipe.fluidOutputs?.find((amount) => amount.amount > 0)
  if (fluidOutput) {
    return {
      kind: 'fluid',
      id: fluidOutput.id,
      amount: fluidOutput.amount,
      label: fluidLabel(fluidOutput.id),
    }
  }

  return { kind: 'machine', id: 'furnace', amount: 0, label: 'No output' }
}

function processRecipePrimaryOutput(recipe: ProcessRecipe): RecipeDisplayOutput {
  if (!recipe.fluidOnly && recipe.output.amount > 0) {
    return {
      kind: 'resource',
      id: recipe.output.id,
      amount: recipe.output.amount,
      label: resourceLabels[recipe.output.id],
    }
  }
  if (recipe.machineOutput) {
    return {
      kind: 'machine',
      id: recipe.machineOutput.id,
      amount: recipe.machineOutput.amount,
      label: machines[recipe.machineOutput.id].name,
    }
  }
  const fluidOutput = recipe.fluidOutputs?.[0] ?? recipe.fluidOutput
  if (fluidOutput) {
    return {
      kind: 'fluid',
      id: fluidOutput.id,
      amount: fluidOutput.amount,
      label: fluidLabel(fluidOutput.id),
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
      <div className="steam-tank-readout">
        <span>Steam buffer</span>
        <strong>{storedLitres}L</strong>
      </div>
      <div className="steam-tank-gauge">
        <span style={{ height: `${fillPercent}%` }} />
      </div>
      <small className="steam-tank-capacity">{capacityLitres}L max</small>
    </div>
  )
}

function FluidTank({ label, storedLitres, capacityLitres }: { label: string; storedLitres: number; capacityLitres: number }) {
  const fillPercent = capacityLitres > 0 ? Math.max(0, Math.min(100, (storedLitres / capacityLitres) * 100)) : 0
  return (
    <div className="steam-tank fluid-tank" aria-label={`${label} ${storedLitres} of ${capacityLitres} litres`}>
      <div className="steam-tank-readout">
        <span>{label}</span>
        <strong>{formatLitres(storedLitres)}L</strong>
      </div>
      <div className="steam-tank-gauge fluid-tank-gauge">
        <span style={{ height: `${fillPercent}%` }} />
      </div>
      <small className="steam-tank-capacity">{formatLitres(capacityLitres)}L max</small>
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
      <div className="steam-tank-readout">
        <span>EU buffer</span>
        <strong>{stored} EU</strong>
      </div>
      <div className="steam-tank-gauge energy-tank-gauge">
        <span style={{ height: `${fillPercent}%` }} />
      </div>
      <small className="steam-tank-capacity">{capacity} EU max</small>
    </div>
  )
}

function recipeGroupDisplayOutput(group: RecipeGroup): RecipeDisplayOutput {
  if (group.recipes[0]?.surveyCardOutput) return recipePrimaryOutput(group.recipes[0])
  const output = group.output
  if (output.kind === 'resource') {
    return {
      kind: 'resource',
      id: output.id,
      amount: output.amount,
      label: resourceLabels[output.id],
    }
  }

  if (output.kind === 'fluid') {
    return {
      kind: 'fluid',
      id: output.id,
      amount: output.amount,
      label: fluidLabel(output.id),
    }
  }

  return {
    kind: 'machine',
    id: output.id,
    amount: output.amount,
    label: machines[output.id].name,
  }
}

function RecipeDisplayIcon({ output }: { output: RecipeDisplayOutput }) {
  if (output.kind === 'resource') return <PixelIcon id={output.id} />
  if (output.kind === 'machine') return <MachineGlyph id={output.id} />
  return <FluidIcon id={output.id} />
}

function recipeDisplayAmount(output: RecipeDisplayOutput) {
  return output.kind === 'fluid' ? `${formatLitres(output.amount)}L` : formatAmount(output.amount)
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

function lockedLine(state: GameState, recipe: Recipe) {
  if (recipe.recipeType === 'processing' && recipe.requiredMachine && state.machines[recipe.requiredMachine] < 1) return `Place ${machines[recipe.requiredMachine].name}`
  return ''
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

function processSlotRecipeCost(recipe: { input: ResourceAmount; secondaryInput?: ResourceAmount; extraInputs?: ResourceAmount[]; fuelInput?: ResourceAmount }, slotId: ProcessSlotId) {
  if (slotId === 'input') return recipe.input
  if (slotId === 'secondaryInput') return recipe.secondaryInput
  if (slotId === 'fuel') return recipe.fuelInput
  const extraSlotIndex = assemblerExtraInputSlotIds.findIndex((extraSlotId) => extraSlotId === slotId)
  return extraSlotIndex >= 0 ? recipe.extraInputs?.[extraSlotIndex] : undefined
}

function canResourceEnterMachine(machineId: MachineId, resourceId: ResourceId) {
  if (isItemAutomationMachine(machineId)) return true
  if (isEuStorageMachine(machineId)) return resourceId === 'sodiumBattery' || resourceId === 'lithiumBattery'
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
  if (instance.machineId === 'lvAssembler' && assemblerInputSlotIds.includes(slotId as typeof assemblerInputSlotIds[number])) {
    const recipe = candidates.find((candidate) =>
      [candidate.input, ...(candidate.secondaryInput ? [candidate.secondaryInput] : []), ...(candidate.extraInputs ?? [])].some((cost) => cost.id === resourceId),
    )
    const required = recipe
      ? [recipe.input, ...(recipe.secondaryInput ? [recipe.secondaryInput] : []), ...(recipe.extraInputs ?? [])]
          .filter((cost) => cost.id === resourceId)
          .reduce((total, cost) => total + cost.amount, 0)
      : 1
    const stored = assemblerInputSlotIds.reduce(
      (total, candidateSlotId) => total + (instance.process[candidateSlotId]?.id === resourceId ? instance.process[candidateSlotId]?.amount ?? 0 : 0),
      0,
    )
    return Math.max(1, Math.min(Math.max(1, required - stored), available, processStackLimit - currentAmount))
  }
  const recipe =
    slotId === 'output'
      ? undefined
      : candidates.find((candidate) => processSlotRecipeCost(candidate, slotId)?.id === resourceId)
  const required = recipe ? processSlotRecipeCost(recipe, slotId)?.amount : undefined
  const wanted = required ? Math.max(1, required - currentAmount) : 1
  return Math.max(1, Math.min(wanted, available, processStackLimit - currentAmount))
}

function processSlotCanPay(slot: ProcessSlot, amount: ResourceAmount) {
  return Boolean(slot && slot.id === amount.id && slot.amount >= amount.amount)
}

function findSelectedProcessRecipe(instance: MachineInstance | null) {
  if (!instance) return undefined
  return processRecipes.find((recipe) => {
    if (recipe.machineId !== instance.machineId) return false
    if (instance.process.configuredRecipeId ? recipe.id !== instance.process.configuredRecipeId : recipe.autoSelectable === false) return false
    if (recipe.fluidOnly) return true
    if (instance.machineId === 'lvAssembler') {
      const slots = assemblerInputSlotIds.map((slotId) => instance.process[slotId])
      if (!slots.some(Boolean)) return false
      const costs = [recipe.input, ...(recipe.secondaryInput ? [recipe.secondaryInput] : []), ...(recipe.extraInputs ?? [])]
      const requiredByResource = new Map<ResourceId, number>()
      for (const cost of costs) requiredByResource.set(cost.id, (requiredByResource.get(cost.id) ?? 0) + cost.amount)
      if (slots.some((slot) => slot && !requiredByResource.has(slot.id))) return false
      return [...requiredByResource].every(
        ([resourceId, required]) => slots.reduce((total, slot) => total + (slot?.id === resourceId ? slot.amount : 0), 0) >= required,
      )
    }
    const extraInputs = assemblerExtraInputSlotIds.map((slotId) => instance.process[slotId])
    if (recipe.extraInputs?.length) {
      if (!processSlotCanPay(instance.process.input, recipe.input)) return false
      if (recipe.secondaryInput && !processSlotCanPay(instance.process.secondaryInput, recipe.secondaryInput)) return false
      if (!recipe.secondaryInput && instance.process.secondaryInput) return false
      if (!recipe.extraInputs.every((cost, index) => processSlotCanPay(extraInputs[index] ?? null, cost))) return false
      return !extraInputs.slice(recipe.extraInputs.length).some(Boolean)
    }
    if (extraInputs.some(Boolean)) return false
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
  if (isEuStorageMachine(machineId)) return true
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
  const storedItemCount = [
    process.input,
    process.secondaryInput,
    process.extraInput1,
    process.extraInput2,
    process.extraInput3,
    process.extraInput4,
    process.fuel,
    process.output,
    process.output2,
    ...process.storageSlots,
  ].reduce((sum, slot) => sum + (slot?.amount ?? 0), 0)
  if (instance.machineId === 'well') return 'Supplying water'
  if (isItemStorageMachine(instance.machineId)) return storedItemCount > 0 ? `Storing ${formatAmount(storedItemCount)} items` : 'Empty storage'
  if (isItemHopperMachine(instance.machineId)) {
    const inputDirections = pipeDirections.filter((direction) => {
      const mode = pipeSideMode(instance, direction)
      return mode === 'input' || mode === 'both'
    })
    const outputDirections = pipeDirections.filter((direction) => {
      const mode = pipeSideMode(instance, direction)
      return mode === 'output' || mode === 'both'
    })
    if (inputDirections.length < 1 && outputDirections.length < 1) return 'No route set'
    if (outputDirections.length < 1) return storedItemCount > 0 ? `Holding ${formatAmount(storedItemCount)} items; no output side` : 'No output side'
    if (storedItemCount < 1) return 'Empty hopper'
    const outputLabel = outputDirections.map((direction) => pipeDirectionOffsets[direction].label).join(', ')
    return process.activeRecipeId ? `Feeding ${outputLabel}` : `Ready ${outputLabel}`
  }
  if (instance.machineId === 'steamTank') {
    const storedFluid = storedFluids(process)[0]
    if (storedFluid) return `Holding ${fluidLabel(storedFluid.id).toLowerCase()}`
    return process.steamStoredMs > 0 ? 'Holding steam' : 'Empty tank'
  }
  if (isSteamPipeMachine(instance.machineId)) return `${steamPipeTransferLitresPerSecond[instance.machineId] ?? 0}L/s transfer`
  if (isEuCableMachine(instance.machineId)) {
    const cableAmps = machines[instance.machineId].euAmps ?? 1
    return `${cableAmps}A LV cable`
  }
  if (isEuStorageMachine(instance.machineId)) {
    const installedBatteries = batteryBufferInstalledBatteries(instance)
    if (installedBatteries < 1) return 'Needs battery'
    if (process.euStored >= process.euCapacity) return 'EU buffer full'
    return process.activeRecipeId ? 'Charging EU' : 'Buffer ready'
  }
  if (isLiquidSteamBoilerMachine(instance.machineId)) {
    if (!boilerHasWater(state, instance)) return 'No water'
    if ((process.fluids.creosote ?? 0) < 1) return 'No creosote'
    if (process.steamStoredMs >= liquidSteamBoilerCapacityMs) return 'Steam full'
    return process.activeRecipeId ? 'Burning creosote' : 'Ready'
  }
  if (instance.machineId === 'lvAirCollector') {
    if ((process.fluids.air ?? 0) >= process.fluidCapacityLitres) return 'Air buffer full'
    if (process.euStored + availableConnectedEu(state, instance) < 1) return 'No power'
    return process.activeRecipeId ? 'Collecting air' : 'Ready'
  }
  if (isEuProducerMachine(instance.machineId)) {
    if (process.euStored >= steamTurbineEuCapacity) return 'EU full'
    if (availableConnectedSteam(state, instance) < 1) return 'No steam'
    return process.activeRecipeId ? 'Generating EU' : 'Ready'
  }
  if (isAutoMinerMachine(instance.machineId)) {
    const assignedTarget = state.autoMinerAssignments[instance.uid]
    if (!assignedTarget) return 'No assignment'
    if ((process.output?.amount ?? 0) >= processStackLimit) return 'Output full'
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
    const missingFluid = (recipe.fluidInputs ?? (recipe.fluidInput ? [recipe.fluidInput] : [])).find((fluid) => (process.fluids[fluid.id] ?? 0) < fluid.amount)
    if (missingFluid) return `Needs ${fluidLabel(missingFluid.id)}`
    const minimumEuStored = recipe.minimumEuStored ?? 0
    if (minimumEuStored > 0 && process.progressMs === 0 && process.euStored + availableConnectedEuStorage(state, instance) < minimumEuStored) return 'Waiting for buffer'
    if (recipe.requiredEuAmps && availableConnectedEuAmps(state, instance) < recipe.requiredEuAmps) return `Needs ${recipe.requiredEuAmps}A route`
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
    if (recipe.secondaryOutput && process.output2 && (process.output2.id !== recipe.secondaryOutput.id || process.output2.amount + recipe.secondaryOutput.amount > processStackLimit)) return 'Output 2 full'
    const missingFluid = (recipe.fluidInputs ?? (recipe.fluidInput ? [recipe.fluidInput] : [])).find((fluid) => (process.fluids[fluid.id] ?? 0) < fluid.amount)
    if (missingFluid) return `Needs ${fluidLabel(missingFluid.id)}`
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
  if (resourceId === 'woodenPickaxe') return (['woodenPickaxe', 'stonePickaxe', 'ironPickaxe', 'diamondPickaxe'] satisfies ResourceId[]).some((id) => hasResourceUnlocked(state, id))
  if (resourceId === 'stonePickaxe') return (['stonePickaxe', 'ironPickaxe', 'diamondPickaxe'] satisfies ResourceId[]).some((id) => hasResourceUnlocked(state, id))
  if (resourceId === 'ironPickaxe') return (['ironPickaxe', 'diamondPickaxe'] satisfies ResourceId[]).some((id) => hasResourceUnlocked(state, id))
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
  if (targetId === 'leadVein' || targetId === 'saltDeposit') return hasToolTierUnlocked(state, 'diamondPickaxe')
  if (targetId === 'obsidianDeposit') return hasToolTierUnlocked(state, 'diamondPickaxe')
  if (targetId === 'sulfurVent') return isReachGateFormed(state) && hasToolTierUnlocked(state, 'ironPickaxe')
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
              key={`${progress.objective.type}-${'id' in progress.objective ? progress.objective.id : progress.objective.type === 'factoryFoundation' ? progress.objective.level : `${progress.objective.kind}-${progress.objective.fluidId}-${progress.objective.direction}`}`}
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
  showLockedQuests,
  onToggleLockedQuests,
}: {
  quests: Quest[]
  state: GameState
  activeChapterId: QuestChapterId
  selectedQuestId: QuestId | null
  onSelectChapter: (chapterId: QuestChapterId) => void
  onSelectQuest: (questId: QuestId) => void
  onClaimAll: () => void
  claimableRewardCount: number
  showLockedQuests: boolean
  onToggleLockedQuests: () => void
}) {
  const visibleQuestChapters = questChapters.filter((candidate) => visibleQuestChapterIds.has(candidate.id))
  const chapter = visibleQuestChapters.find((candidate) => candidate.id === activeChapterId) ?? visibleQuestChapters[0]
  const chapterQuests = quests.filter((quest) => (chapter.id === 'multiblocks' ? multiblockQuestIds.has(quest.id) : questBookChapterId(quest) === chapter.id))
  const questById = new Map(quests.map((quest) => [quest.id, quest]))
  const [mapView, setMapView] = useState({ x: 0, y: 0, zoom: 0.82 })
  const dragRef = useRef<{ pointerId: number; x: number; y: number; startX: number; startY: number } | null>(null)
  const mapMargin = 24
  const questNodeSize = (quest: Quest) => {
    const kind = questKind(quest)
    if (kind === 'gate') return 68
    if (kind === 'optional') return 50
    return 58
  }
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
  const mapWidth = Math.max(360, ...chapterQuests.map((quest) => questX(quest) + questNodeSize(quest) + mapMargin))
  const mapHeight = Math.max(160, ...chapterQuests.map((quest) => questY(quest) + questNodeSize(quest) + mapMargin))
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
            <button type="button" className={showLockedQuests ? 'active' : ''} aria-pressed={showLockedQuests} onClick={onToggleLockedQuests}>
              {showLockedQuests ? 'Hide locked quests' : 'Show locked quests'}
            </button>
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
                const className = `${parentStatus === 'completed' && childStatus !== 'locked' ? 'complete' : childStatus === 'locked' ? 'locked' : 'open'} ${questKind(quest)}`
                const parentSize = questNodeSize(parent)
                const childSize = questNodeSize(quest)
                const parentCenterX = questX(parent) + parentSize / 2
                const parentCenterY = questY(parent) + parentSize / 2
                const childCenterX = questX(quest) + childSize / 2
                const childCenterY = questY(quest) + childSize / 2
                const horizontal = Math.abs(childCenterX - parentCenterX) >= Math.abs(childCenterY - parentCenterY)
                const movingRight = childCenterX >= parentCenterX
                const movingDown = childCenterY >= parentCenterY
                const startX = horizontal ? parentCenterX + (movingRight ? parentSize / 2 : -parentSize / 2) : parentCenterX
                const startY = horizontal ? parentCenterY : parentCenterY + (movingDown ? parentSize / 2 : -parentSize / 2)
                const endX = horizontal ? childCenterX - (movingRight ? childSize / 2 : -childSize / 2) : childCenterX
                const endY = horizontal ? childCenterY : childCenterY - (movingDown ? childSize / 2 : -childSize / 2)
                const path = horizontal
                  ? `M ${startX} ${startY} H ${(startX + endX) / 2} V ${endY} H ${endX}`
                  : `M ${startX} ${startY} V ${(startY + endY) / 2} H ${endX} V ${endY}`
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
                const nodeSize = questNodeSize(quest)
                return (
                  <button
                    type="button"
                    aria-label={`${quest.title}. ${accessibleStatus}. ${kind}.`}
                    title={`${quest.title} - ${accessibleStatus}`}
                    className={`quest-node ${status} ${kind} ${claimState}${selected ? ' selected' : ''}`}
                    style={{ left: questX(quest), minHeight: nodeSize, top: questY(quest), width: nodeSize }}
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
  const reviewParams = useMemo(() => new URLSearchParams(window.location.search), [])
  const reviewMachineId = reviewParams.get('reviewMachine') as MachineId | null
  const reviewStateParam = reviewParams.get('reviewState') as MachineReviewState | null
  const reviewState = reviewStateParam && machineReviewStates.includes(reviewStateParam) ? reviewStateParam : null
  const reviewSetup = useMemo(() => {
    if (!import.meta.env.DEV || !reviewMachineId || !(reviewMachineId in machines) || !reviewState) return null
    let reviewGame = createCreativeState(createInitialState())
    const controllerSpec = machines[reviewMachineId].multiblock
    if (reviewMachineId === 'arcBlastFurnace') {
      const layout: Array<[MachineId, number, number]> = [
        ['lvEnergyHatch2A', 1, 1], ['lvEnergyHatch2A', 2, 1], ['arcBlastFurnacePart', 3, 1],
        ['lvInputBus', 1, 2], ['arcBlastFurnace', 2, 2], ['lvOutputBus', 3, 2],
        ['arcBlastFurnacePart', 1, 3], ['arcBlastFurnacePart', 2, 3], ['arcBlastFurnacePart', 3, 3],
      ]
      for (const [machineId, x, y] of layout) reviewGame = placeMachineInstance(reviewGame, machineId, x, y)
    } else if (controllerSpec && !machines[reviewMachineId].placeable) {
      for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1]]) reviewGame = placeMachineInstance(reviewGame, controllerSpec.part, x, y)
    } else {
      reviewGame = placeMachineInstance(reviewGame, reviewMachineId, 1, 0)
    }
    if (reviewMachineId === 'steamBoiler') reviewGame = placeMachineInstance(reviewGame, 'well', 2, 0)
    if (reviewMachineId === 'well') {
      reviewGame = placeMachineInstance(reviewGame, 'copperPipe', 2, 0)
      reviewGame = placeMachineInstance(reviewGame, 'steamBoiler', 3, 0)
      const reviewPipe = reviewGame.machineInstances.find((candidate) => candidate.machineId === 'copperPipe')
      if (reviewPipe) {
        reviewPipe.pipeSideModes = { west: 'input', east: 'output' }
        reviewPipe.pipeDisabledSides = { north: true, south: true }
      }
    }
    if (reviewMachineId === 'liquidSteamBoiler') reviewGame = placeMachineInstance(reviewGame, 'well', 0, 0)
    if (reviewMachineId === 'steamTurbine') reviewGame = placeMachineInstance(reviewGame, 'steamTank', 0, 0)
    if (isSteamPipeMachine(reviewMachineId)) {
      reviewGame = placeMachineInstance(reviewGame, 'steamTank', 0, 0)
      reviewGame = placeMachineInstance(reviewGame, 'steamMacerator', 2, 0)
    }
    if (isEuCableMachine(reviewMachineId)) {
      reviewGame = placeMachineInstance(reviewGame, 'steamTurbine', 0, 0)
      reviewGame = placeMachineInstance(reviewGame, 'lvMacerator', 2, 0)
    }
    const instance = reviewGame.machineInstances.find((candidate) => candidate.machineId === reviewMachineId)
    if (!instance) return null
    if (reviewMachineId === 'lvAutoMiner') reviewGame.surveyCards.coalSeam = 1
    if (isSteamPipeMachine(reviewMachineId)) {
      instance.pipeSideModes = { west: 'both', east: 'both' }
      instance.pipeDisabledSides = {}
    }
    if (reviewState !== 'idle' && reviewState !== 'missing') {
      const recipe = processRecipes.find((candidate) => candidate.machineId === reviewMachineId)
      if (recipe) {
        instance.process.input = { ...recipe.input }
        instance.process.secondaryInput = recipe.secondaryInput ? { ...recipe.secondaryInput } : null
        for (const [index, input] of (recipe.extraInputs ?? []).entries()) {
          const slotId = assemblerExtraInputSlotIds[index]
          if (slotId) instance.process[slotId] = { ...input }
        }
        instance.process.fuel = recipe.fuelInput ? { ...recipe.fuelInput } : instance.process.fuel
        instance.process.durationMs = recipe.durationMs
        instance.process.progressMs = reviewState === 'active' ? recipe.durationMs / 2 : 0
        instance.process.activeRecipeId = reviewState === 'active' ? recipe.id : null
      }
      if (reviewMachineId === 'furnace' || reviewMachineId === 'steamBoiler') {
        instance.process.fuel = { id: 'coal', amount: 8 }
        instance.process.fuelDurationMs = 8000
        instance.process.fuelRemainingMs = reviewState === 'active' ? 5000 : 0
      }
      if (reviewMachineId === 'steamBoiler') {
        const well = reviewGame.machineInstances.find((candidate) => candidate.machineId === 'well')
        if (well) {
          well.process.fluidCapacityLitres = 128
          well.process.fluids.water = 96
        }
        instance.process.steamCapacityMs = boilerSteamCapacityMs
        instance.process.steamStoredMs = boilerSteamCapacityMs / 2
        instance.process.activeRecipeId = reviewState === 'active' ? 'make_steam' : null
      }
      if (reviewMachineId === 'well') {
        instance.process.fluidCapacityLitres = 128
        instance.process.fluids.water = reviewState === 'active' ? 64 : 112
      }
      if (reviewMachineId === 'steamTank') {
        instance.process.steamCapacityMs = steamTankCapacityMs
        instance.process.steamStoredMs = reviewState === 'active' ? steamTankCapacityMs / 2 : steamTankCapacityMs * 0.85
      }
      if (isSteamPoweredMachine(reviewMachineId) || reviewMachineId === 'steamTurbine') {
        instance.process.steamCapacityMs = instance.process.steamCapacityMs || steamMachineInternalCapacityMs
        instance.process.steamStoredMs = instance.process.steamCapacityMs / 2
      }
      if (isSteamPipeMachine(reviewMachineId)) {
        if (reviewState === 'active') {
          instance.process.steamCapacityMs = steamPipeBufferCapacityMs(reviewMachineId)
          instance.process.steamStoredMs = instance.process.steamCapacityMs / 2
        } else {
          const previewFluid: FluidId = reviewMachineId === 'ironPipe' ? 'creosote' : 'water'
          instance.process.steamStoredMs = 0
          instance.process.fluidCapacityLitres = fluidPipeBufferCapacityLitres(reviewMachineId)
          instance.process.fluids[previewFluid] = instance.process.fluidCapacityLitres * 0.7
        }
        const source = reviewGame.machineInstances.find((candidate) => candidate.machineId === 'steamTank')
        if (source) {
          source.process.steamCapacityMs = steamTankCapacityMs
          source.process.steamStoredMs = steamTankCapacityMs / 2
        }
      }
      if (isEuPoweredMachine(reviewMachineId) || isEuCableMachine(reviewMachineId) || reviewMachineId === 'steamTurbine') {
        instance.process.euCapacity = instance.process.euCapacity || machines[reviewMachineId].euCapacity || 128
        instance.process.euStored = instance.process.euCapacity / 2
      }
      if (reviewMachineId === 'lvChemicalReactor') {
        instance.process.fluidCapacityLitres = 32
        instance.process.fluids.liquidRubber = reviewState === 'active' ? 8 : 24
      }
      if (isEuCableMachine(reviewMachineId)) {
        const source = reviewGame.machineInstances.find((candidate) => candidate.machineId === 'steamTurbine')
        if (source) {
          source.process.euCapacity = steamTurbineEuCapacity
          source.process.euStored = steamTurbineEuCapacity / 2
        }
      }
      if (isEuStorageMachine(reviewMachineId)) {
        instance.process.batterySlots = Array.from({ length: batteryBufferSlots(reviewMachineId) }, (_, index) => index % 2 ? 'lithiumBattery' : 'sodiumBattery')
        instance.process.euCapacity = instance.process.batterySlots.reduce((sum, id) => sum + (id ? batteryEuCapacity(id) : 0), 0)
        instance.process.euStored = instance.process.euCapacity / 2
      }
      if (reviewMachineId === 'standardChest') {
        instance.process.storageSlots[0] = { id: 'ironIngot', amount: 24 }
        instance.process.storageSlots[5] = { id: 'copperWire', amount: 18 }
        instance.process.storageSlots[11] = { id: 'coal', amount: 32 }
      }
      if (reviewMachineId === 'cokeOven') {
        instance.process.fluidCapacityLitres = cokeOvenFluidCapacityLitres
        instance.process.fluids.creosote = reviewState === 'active' ? 48 : 64
      }
      if (reviewMachineId === 'brickedBlastFurnace') {
        instance.process.fuelDurationMs = 12000
        instance.process.fuelRemainingMs = reviewState === 'active' ? 8000 : 0
      }
      if (reviewMachineId === 'arcBlastFurnace') {
        const structure = arcBlastFurnaceStructureForInstance(reviewGame, instance)
        for (const hatch of structure?.energyHatches ?? []) hatch.process.euStored = reviewState === 'active' ? 96 : 64
        if (structure?.inputBus) {
          structure.inputBus.process.input = instance.process.input
          instance.process.input = null
        }
      }
      if (isLiquidSteamBoilerMachine(reviewMachineId)) {
        const well = reviewGame.machineInstances.find((candidate) => candidate.machineId === 'well')
        if (well) {
          well.process.fluidCapacityLitres = 128
          well.process.fluids.water = 96
        }
        instance.process.fluids.creosote = 64
        instance.process.steamCapacityMs = liquidSteamBoilerCapacityMs
        instance.process.steamStoredMs = liquidSteamBoilerCapacityMs / 2
        instance.process.activeRecipeId = reviewState === 'active' ? 'burn_creosote' : null
      }
      if (reviewMachineId === 'steamTurbine') {
        const source = reviewGame.machineInstances.find((candidate) => candidate.machineId === 'steamTank')
        if (source) {
          source.process.steamCapacityMs = steamTankCapacityMs
          source.process.steamStoredMs = steamTankCapacityMs / 2
        }
        instance.process.activeRecipeId = reviewState === 'active' ? 'generate_lv_eu' : null
      }
      if (isAutoMinerMachine(reviewMachineId)) {
        const target = Object.values(gatherTargets).find((candidate) => canAutoMinerTarget(reviewMachineId, candidate.id))
        if (target) reviewGame.autoMinerAssignments[instance.uid] = target.id
        if (target) instance.process.output = { id: target.drops[0].id, amount: reviewState === 'active' ? 28 : 64 }
        instance.process.durationMs = reviewMachineId === 'steamAutoMiner' ? steamAutoMinerActionMs : lvAutoMinerActionMs
        instance.process.progressMs = reviewState === 'active' ? instance.process.durationMs / 2 : 0
        instance.process.activeRecipeId = reviewState === 'active' && target ? `auto_mine_${target.id}` : null
      }
    }
    if (reviewState === 'blocked') {
      const recipe = processRecipes.find((candidate) => candidate.machineId === reviewMachineId)
      instance.process.output = { id: recipe?.output.id ?? instance.process.output?.id ?? 'ironIngot', amount: processStackLimit }
      const structure = reviewMachineId === 'arcBlastFurnace' ? arcBlastFurnaceStructureForInstance(reviewGame, instance) : null
      if (structure?.outputBus) structure.outputBus.process.output = { ...instance.process.output }
    }
    if (reviewState === 'disconnected') {
      instance.process.activeRecipeId = null
      instance.process.progressMs = 0
      instance.process.steamStoredMs = 0
      instance.process.euStored = 0
      instance.pipeDisabledSides = Object.fromEntries(pipeDirections.map((direction) => [direction, true]))
      for (const candidate of reviewGame.machineInstances) {
        if (candidate.uid === instance.uid) continue
        candidate.process.steamStoredMs = 0
        candidate.process.euStored = 0
      }
    }
    return { state: reviewGame, uid: instance.uid }
  }, [reviewMachineId, reviewState])
  const [state, setState] = useState<GameState>(() => reviewSetup?.state ?? loadGame(null))
  const [factoryFloorSnapshot, setFactoryFloorSnapshot] = useState<GameState>(state)
  const [hasLoadedSave, setHasLoadedSave] = useState(Boolean(reviewSetup))
  const [floatTexts, setFloatTexts] = useState<FloatText[]>([])
  const [achievementToasts, setAchievementToasts] = useState<AchievementToast[]>([])
  const [page, setPage] = useState<Page>(reviewSetup ? 'processing' : 'home')
  const [selectedSaveSlotId, setSelectedSaveSlotId] = useState<SaveSlotId>(defaultSaveSlotId)
  const [saveSlotSummaries, setSaveSlotSummaries] = useState<SaveSlotSummary[]>([])
  const [saveNameDraft, setSaveNameDraft] = useState('')
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalledApp, setIsInstalledApp] = useState(() => isStandaloneInstall())
  const [isEnteringGame, setIsEnteringGame] = useState(false)
  const [isNewGameConfirmOpen, setIsNewGameConfirmOpen] = useState(false)
  const [entryLoadingMessage, setEntryLoadingMessage] = useState('Loading save')
  const [isMobileClient, setIsMobileClient] = useState(() => isMobileClientAllowed())
  const [gatherArea, setGatherArea] = useState<GatherAreaId>('forest')
  const [terminalGrid, setTerminalGrid] = useState<CraftSlot[]>(() => Array.from({ length: 9 }, () => null))
  const [terminalSearch, setTerminalSearch] = useState('')
  const [recipeSearch, setRecipeSearch] = useState('')
  const [factoryMachineSearch, setFactoryMachineSearch] = useState('')
  const [terminalMode, setTerminalMode] = useState<TerminalMode>('recipes')
  const [selectedResource, setSelectedResource] = useState<ResourceId | null>(null)
  const [machineTerminalMode, setMachineTerminalMode] = useState<MachineTerminalMode>('items')
  const [selectedFluidContainerKey, setSelectedFluidContainerKey] = useState<string | null>(null)
  const [activeQuestChapterId, setActiveQuestChapterId] = useState<QuestChapterId>('gettingStarted')
  const [selectedQuestId, setSelectedQuestId] = useState<QuestId | null>(null)
  const [showLockedQuests, setShowLockedQuests] = useState(false)
  const [terminalNotice, setTerminalNotice] = useState('')
  const [, setFactoryNotice] = useState('')
  const [offlineNotice, setOfflineNotice] = useState('')
  const [offlinePrompt, setOfflinePrompt] = useState('')
  const [migrationPrompt, setMigrationPrompt] = useState('')
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false)
  const [isMachineRecipePopupOpen, setIsMachineRecipePopupOpen] = useState(false)
  const [selectedMachinePopupRecipeIndex, setSelectedMachinePopupRecipeIndex] = useState(0)
  const [machineRecipeLoadNotice, setMachineRecipeLoadNotice] = useState('')
  const [isFactoryExpandModalOpen, setIsFactoryExpandModalOpen] = useState(false)
  const [isCreativeMode, setIsCreativeMode] = useState(Boolean(reviewSetup))
  const [isEquipmentOpen, setIsEquipmentOpen] = useState(false)
  const [placingMachineId, setPlacingMachineId] = useState<MachineId | null>(null)
  const [selectedMachineUid, setSelectedMachineUid] = useState<string | null>(reviewSetup?.uid ?? null)
  const [isArcStructureOpen, setIsArcStructureOpen] = useState(false)
  const [isMachineAutomationOpen, setIsMachineAutomationOpen] = useState(false)
  const [isAutoMinerTargetOpen, setIsAutoMinerTargetOpen] = useState(false)
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
  const [factoryView, setFactoryView] = useState<FactoryView>({ x: factoryViewportPadding, y: factoryViewportPadding, zoom: factoryDefaultZoom })
  const [factoryFloorViewMode, setFactoryFloorViewMode] = useState<FactoryFloorViewMode>('production')
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
  const factoryPanContentRef = useRef<HTMLDivElement | null>(null)
  const factoryViewPercentRef = useRef<HTMLSpanElement | null>(null)
  const factoryViewRef = useRef(factoryView)
  const pendingFactoryViewRef = useRef<FactoryView | null>(null)
  const factoryViewFrameRef = useRef<number | null>(null)
  const factoryPointersRef = useRef(new Map<number, FactoryPointerPosition>())
  const factoryGestureRef = useRef<FactoryGesture | null>(null)
  const isFactoryPanningRef = useRef(false)
  const factoryCellPressRef = useRef<(x: number, y: number, instance?: MachineInstance) => void>(() => {})
  const suppressFactoryCellClickRef = useRef(false)
  const suppressClickRef = useRef(false)

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
    const displayModeQuery = window.matchMedia('(display-mode: standalone)')
    const updateInstalledState = () => setIsInstalledApp(isStandaloneInstall())
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPromptEvent(event as BeforeInstallPromptEvent)
    }
    const handleAppInstalled = () => {
      setInstallPromptEvent(null)
      setIsInstalledApp(true)
    }

    updateInstalledState()
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    displayModeQuery.addEventListener('change', updateInstalledState)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      displayModeQuery.removeEventListener('change', updateInstalledState)
    }
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
    if (reviewSetup) return
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
  }, [reviewSetup])

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
    if (reviewSetup) return
    const interval = window.setInterval(() => {
      if (page === 'home') return
      const advanceState = (currentState: GameState) => {
        const ticked = tickGame(currentState, 250).state
        return isCreativeMode ? topUpCreativeState(ticked) : ticked
      }
      if (isFactoryPanningRef.current) {
        stateRef.current = advanceState(stateRef.current)
        return
      }
      setState(advanceState)
    }, 250)

    return () => window.clearInterval(interval)
  }, [isCreativeMode, page, reviewSetup])

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
    setIsAutoMinerTargetOpen(false)
  }, [selectedMachineUid])

  useEffect(() => {
    if (selectedPipeConfigUid && !state.machineInstances.some((instance) => instance.uid === selectedPipeConfigUid)) {
      setSelectedPipeConfigUid(null)
    }
  }, [selectedPipeConfigUid, state.machineInstances])

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
  const guideQuests = useMemo(() => (showLockedQuests ? questDefinitions : visibleQuests(state)), [showLockedQuests, state])
  const selectedQuest = useMemo(() => guideQuests.find((quest) => quest.id === selectedQuestId) ?? null, [guideQuests, selectedQuestId])
  const claimableQuestRewardCount = guideQuests.filter((quest) => state.completedQuests.includes(quest.id) && !state.claimedQuests.includes(quest.id)).length
  const terminalMatch = findGridRecipe(terminalGrid, unlockedRecipes)
  const totalMachines = inventoryMachineOrder.reduce((sum, id) => sum + state.machines[id], 0)
  const processRecipeCards = useMemo(
    () =>
      processRecipesInMachineTierOrder(processRecipes, machines).map(
        (recipe) => processRecipeToCatalogRecipe(
          recipe,
          isEuPoweredMachine(recipe.machineId) ? 'lv' : recipe.machineId === 'furnace' ? 'furnace' : 'steam',
        ),
      ),
    [],
  )
  const recipeCatalog = useMemo(() => [...recipes, ...processRecipeCards], [processRecipeCards])
  const unplacedMachineCounts = Object.fromEntries(machineOrder.map((id) => [id, availableUnplacedMachineCount(state, id)])) as Record<MachineId, number>
  const inventoryResources = resourceOrder.filter((id) => terminalAvailableAmount(state, terminalGrid, id) > 0)
  const portableFluidGroups = fluidContainerGroups(state)
  const filteredPortableFluidGroups = portableFluidGroups.filter((group) => {
    const query = terminalSearch.trim().toLowerCase()
    return !query || fluidLabel(group.fluidId).toLowerCase().includes(query) || (group.kind === 'bucket' ? 'bucket' : 'steel cell').includes(query)
  })
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
  const recipeCandidates = useMemo(() => (recipeSearch.trim() ? searchTerminalRecipes(recipeSearch, recipeCatalog) : recipeCatalog), [recipeCatalog, recipeSearch])
  const recipeBrowserMachineIds = useMemo(() => {
    const query = recipeSearch.trim().toLowerCase()
    return machineOrder.filter((machineId) => {
      const machineRecipes = processRecipesForMachine(machineId, processRecipes)
      if (machineRecipes.length < 1) return false
      if (!query) return true
      if (machineId.toLowerCase().includes(query) || machines[machineId].name.toLowerCase().includes(query)) return true
      return machineRecipes.some(
        (recipe) => {
          const itemOutputs = recipe.fluidOnly
            ? []
            : [recipe.output, ...(recipe.secondaryOutput ? [recipe.secondaryOutput] : [])]
          const fluidOutputs = recipe.fluidOutputs ?? (recipe.fluidOutput ? [recipe.fluidOutput] : [])
          return recipe.name.toLowerCase().includes(query) ||
            itemOutputs.some((output) => output.amount > 0 && resourceLabels[output.id].toLowerCase().includes(query)) ||
            Boolean(recipe.machineOutput && machines[recipe.machineOutput.id].name.toLowerCase().includes(query)) ||
            fluidOutputs.some((output) => fluidLabel(output.id).toLowerCase().includes(query))
        },
      )
    })
  }, [recipeSearch])
  const machineRecipeGroups = useMemo(
    () => recipeBrowserMachineIds.map((machineId): RecipeGroup => ({
      key: `machine:${machineId}`,
      output: { kind: 'machine', id: machineId, amount: 1 },
      recipes: processRecipeCards.filter((recipe) => recipe.requiredMachine === machineId),
    })),
    [processRecipeCards, recipeBrowserMachineIds],
  )
  const listedRecipeGroups = useMemo(
    () => terminalMode === 'recipes' ? groupRecipesByOutput(recipeCandidates) : machineRecipeGroups,
    [machineRecipeGroups, recipeCandidates, terminalMode],
  )
  const selectedRecipeGroup = listedRecipeGroups.find((group) => group.key === selectedRecipeGroupKey) ?? listedRecipeGroups[0]
  const clampedSelectedRecipeIndex = selectedRecipeGroup
    ? Math.min(selectedRecipeIndex, Math.max(0, selectedRecipeGroup.recipes.length - 1))
    : 0
  const selectedRecipe = selectedRecipeGroup?.recipes[clampedSelectedRecipeIndex]
  const selectedProcessRecipe = selectedRecipe?.recipeType === 'processing'
    ? processRecipes.find((recipe) => recipe.id === selectedRecipe.id)
    : undefined
  const selectedRecipeMinimumMachineId = selectedProcessRecipe
    ? minimumMachineForProcessRecipe(selectedProcessRecipe, processRecipes, machines)
    : undefined
  const selectedRecipeStationMachineId = terminalMode === 'machines'
    ? selectedRecipeMinimumMachineId ?? selectedRecipe?.requiredMachine
    : selectedRecipe?.requiredMachine
  const maxBatchQuantity = terminalMatch ? craftableQuantity(state, terminalMatch, terminalGrid) : 0
  const selectedMachineSource = state.machineInstances.find((instance) => instance.uid === selectedMachineUid) ?? null
  const selectedArcStructure = selectedMachineSource?.machineId === 'arcBlastFurnace'
    ? arcBlastFurnaceStructureForInstance(state, selectedMachineSource)
    : null
  const selectedMachine = selectedMachineSource && selectedArcStructure
    ? {
        ...selectedMachineSource,
        process: {
          ...selectedMachineSource.process,
          input: selectedArcStructure.inputBus?.process.input ?? null,
          output: selectedArcStructure.outputBus?.process.output ?? null,
          euStored: selectedArcStructure.energyHatches.reduce((sum, hatch) => sum + hatch.process.euStored, 0),
          euCapacity: selectedArcStructure.energyHatches.reduce((sum, hatch) => sum + hatch.process.euCapacity, 0),
        },
      }
    : selectedMachineSource
  const selectedAutoMinerTargets = selectedMachine && isAutoMinerMachine(selectedMachine.machineId)
    ? Object.values(gatherTargets).filter((target) => canAutoMinerTarget(selectedMachine.machineId, target.id))
    : []
  const selectedSteamTankCapacityMs =
    selectedMachine?.machineId === 'steamTank' ? steamTankCapacityMsForInstance(state, selectedMachine) || steamTankCapacityMs : steamTankCapacityMs
  const selectedSteamTankFluidCapacityLitres =
    selectedMachine?.machineId === 'steamTank' ? steamTankFluidCapacityLitresForInstance(state, selectedMachine) || ironTankFluidCapacityLitres : ironTankFluidCapacityLitres
  const selectedPipeConfig = state.machineInstances.find((instance) => instance.uid === selectedPipeConfigUid) ?? null
  const selectedMachineRecipe = findSelectedProcessRecipe(selectedMachine)
  const selectedMachinePopupRecipes = selectedMachine ? processRecipesForMachine(selectedMachine.machineId, processRecipes) : []
  const selectedMachineRecipeCount = selectedMachinePopupRecipes.length
  const clampedMachinePopupRecipeIndex = Math.min(
    selectedMachinePopupRecipeIndex,
    Math.max(0, selectedMachinePopupRecipes.length - 1),
  )
  const selectedMachinePopupRecipe = selectedMachinePopupRecipes[clampedMachinePopupRecipeIndex]
  const selectedMachinePopupOutput = selectedMachinePopupRecipe ? processRecipePrimaryOutput(selectedMachinePopupRecipe) : null
  const selectedMachinePopupLoadStatus = selectedMachine && selectedMachinePopupRecipe
    ? processRecipeInputLoadStatus(state, selectedMachine.uid, selectedMachinePopupRecipe.id)
    : null
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
  const selectedMachineFluidBuffers = selectedMachine ? machineFluidBuffersForInstance(state, selectedMachine) : []
  const selectedFluidContainerGroup = portableFluidGroups.find((group) => group.key === selectedFluidContainerKey)
  const selectedEmptyFluidContainerKind = selectedFluidContainerKey?.startsWith('empty:')
    ? selectedFluidContainerKey.slice('empty:'.length) as FluidContainerKind
    : null
  const selectedContainerKind = selectedEmptyFluidContainerKind ?? selectedFluidContainerGroup?.kind
  const canUseFluidPort = (buffer: MachineFluidBufferView, direction: 'input' | 'output') => {
    if (!selectedMachine) return false
    if (direction === 'output') {
      if (!selectedContainerKind || (buffer.access !== 'output' && buffer.access !== 'both')) return false
      const fluidId = buffer.acceptedFluids.find((id) => (selectedMachine.process.fluids[id] ?? 0) > 0)
      return Boolean(fluidId && (!selectedFluidContainerGroup || (
        selectedFluidContainerGroup.fluidId === fluidId &&
        selectedFluidContainerGroup.amountLitres < fluidContainerCapacities[selectedFluidContainerGroup.kind]
      )))
    }
    if (!selectedFluidContainerGroup || (buffer.access !== 'input' && buffer.access !== 'both')) return false
    return buffer.acceptedFluids.includes(selectedFluidContainerGroup.fluidId) &&
      (selectedMachine.process.fluids[selectedFluidContainerGroup.fluidId] ?? 0) < buffer.capacityLitres
  }

  useEffect(() => {
    setMachineTerminalMode('items')
    setSelectedFluidContainerKey(null)
    setIsMachineRecipePopupOpen(false)
    setSelectedMachinePopupRecipeIndex(0)
    setMachineRecipeLoadNotice('')
  }, [selectedMachineUid])

  useEffect(() => {
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
  }, [clampedSelectedRecipeIndex, listedRecipeGroups, selectedRecipeGroupKey, selectedRecipeIndex])
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
      addRateMetric('Flow', currentEuCableFlowEuPerSecond(state, selectedMachine), ' EU/s', 'supply', `${machines[selectedMachine.machineId].euAmps ?? 1}A route`)
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
      const installedBatteries = batteryBufferInstalledBatteries(selectedMachine)
      const batterySlots = batteryBufferSlots(selectedMachine.machineId)
      addEuMetric('Stored EU', process.euStored, process.euCapacity || batterySlots * lvBatteryBufferEuCapacity)
      addRateMetric('Output', installedBatteries * lvBatteryBufferOutputEuPerSecond, ' EU/s', 'supply', `${installedBatteries}/${batterySlots} cells`)
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
        detail: `${formatAmount(availableConnectedEuAmps(state, selectedMachine))}A route`,
        tone: 'supply',
        fillPercent: availableConnectedEu(state, selectedMachine) > 0 ? 100 : 0,
      })
      addRateMetric('Uses', lvAutoMinerEuUsagePerSecond, ' EU/s', 'usage', 'drill draw')
    } else if (isSteamPoweredMachine(selectedMachine.machineId)) {
      addSteamSupplyMetric(availableConnectedSteam(state, selectedMachine))
      addRateMetric('Uses', selectedMachineSteamUsagePerSecond, 'L/s', 'usage', 'recipe draw')
    } else if (isEuPoweredMachine(selectedMachine.machineId)) {
      addEuMetric('Internal', process.euStored, process.euCapacity || 0)
      if (process.fluidCapacityLitres > 0) addStoredFluidMetrics(process, process.fluidCapacityLitres)
      selectedMachineMetrics.push({
        label: 'Supply',
        value: `${Math.floor(availableConnectedEu(state, selectedMachine))}`,
        detail: `${formatAmount(availableConnectedEuAmps(state, selectedMachine))}A route`,
        tone: 'supply',
        fillPercent: availableConnectedEu(state, selectedMachine) > 0 ? 100 : 0,
      })
      addRateMetric('Uses', selectedMachineEuUsagePerSecond, ' EU/s', 'usage', 'recipe draw')
      if (isEuBlastMachine(selectedMachine.machineId) && selectedMachineRecipe?.requiredEuAmps) {
        selectedMachineMetrics.push({
          label: 'Amps',
          value: `${formatAmount(availableConnectedEuAmps(state, selectedMachine))}/${selectedMachineRecipe.requiredEuAmps}A`,
          detail: 'route needed',
          tone: 'eu',
          fillPercent: metricFill(availableConnectedEuAmps(state, selectedMachine), selectedMachineRecipe.requiredEuAmps),
        })
      }
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
  const selectedMachineHmiConfig = selectedMachine ? machineHmiConfigs[selectedMachine.machineId] ?? null : null
  const selectedMachineCanAutomateItems = Boolean(selectedMachine && isLvItemAutomationMachine(selectedMachine.machineId))
  const selectedMachineCanConfigureRouting = Boolean(
    selectedMachine &&
      (isSteamPipeMachine(selectedMachine.machineId) ||
        isEuCableMachine(selectedMachine.machineId) ||
        isItemHopperMachine(selectedMachine.machineId) ||
        isFluidOutletConfigurableMachine(selectedMachine.machineId)),
  )
  const selectedMachineCanRemove = Boolean(selectedMachineSource && machines[selectedMachineSource.machineId].placeable)
  const selectedMachineIsStructureOnly = Boolean(selectedMachine && machines[selectedMachine.machineId].processKind === 'none')
  const selectedMachineAutomationStatus = selectedMachine && selectedMachineCanAutomateItems ? lvItemAutomationStatus(state, selectedMachine) : null
  const selectedMachineHmiKind = selectedMachineHmiConfig?.kind ?? null
  const selectedMachineIsHmiTerminal = selectedMachineHmiConfig !== null
  const selectedMachineUsesIntegratedStatus = Boolean(selectedMachine && (
    selectedMachine.machineId === 'lvAssembler' ||
    selectedMachine.machineId === 'furnace' ||
    selectedMachine.machineId === 'well' ||
    selectedMachine.machineId === 'steamBoiler' ||
    selectedMachine.machineId === 'steamTank' ||
    isItemAutomationMachine(selectedMachine.machineId) ||
    isSteamPipeMachine(selectedMachine.machineId) ||
    isEuCableMachine(selectedMachine.machineId) ||
    isLiquidSteamBoilerMachine(selectedMachine.machineId) ||
    isEuStorageMachine(selectedMachine.machineId) ||
    isEuProducerMachine(selectedMachine.machineId) ||
    isAutoMinerMachine(selectedMachine.machineId) ||
    selectedMachine.machineId === 'cokeOven' ||
    selectedMachine.machineId === 'brickedBlastFurnace' ||
    selectedMachine.machineId === 'arcBlastFurnace'
  ))
  const selectedMachineStatusLabel = selectedMachine ? machineStatus(state, selectedMachine) : ''
  const assemblerStageLabel = selectedMachineUsesIntegratedStatus && selectedMachineStatusLabel === 'No input' ? 'Ready for input' : selectedMachineStatusLabel
  const selectedMachineProgressPercent =
    selectedMachine && selectedMachine.process.durationMs > 0
      ? Math.min(100, Math.max(0, (selectedMachine.process.progressMs / selectedMachine.process.durationMs) * 100))
      : 0
  const assemblerSupplyMetric = selectedMachineUsesIntegratedStatus
    ? selectedMachineMetrics.find((metric) => metric.label === 'Supply')
    : undefined
  const assemblerDrawMetric = selectedMachineUsesIntegratedStatus
    ? selectedMachineMetrics.find((metric) => metric.label === 'Uses')
    : undefined
  const assemblerFluid = selectedMachineUsesIntegratedStatus ? selectedMachineStoredFluids[0] : undefined
  const assemblerFluidCapacityLitres = selectedMachineUsesIntegratedStatus ? selectedMachine?.process.fluidCapacityLitres || 128 : 0
  const assemblerEuCapacity = selectedMachineUsesIntegratedStatus ? selectedMachine?.process.euCapacity || 0 : 0
  const assemblerEuFillPercent =
    selectedMachineUsesIntegratedStatus && selectedMachine ? metricFill(selectedMachine.process.euStored, assemblerEuCapacity) : 0
  const selectedMachinePanelSrc = selectedMachine ? machineUiPanelSrc(selectedMachine.machineId) : ''
  const selectedMachineStageSrc = selectedMachine ? machineUiStageSrc(selectedMachine.machineId) : ''
  const selectedMachinePanelStyle = selectedMachinePanelSrc || selectedMachineStageSrc
    ? ({
        ...(selectedMachinePanelSrc ? { '--machine-panel-image': `url("${selectedMachinePanelSrc}")` } : {}),
        ...(selectedMachineStageSrc ? { '--assembler-stage-image': `url("${selectedMachineStageSrc}")` } : {}),
      } as CSSProperties)
    : undefined
  const selectedPipeConfigPanelSrc = selectedPipeConfig ? machineUiPanelSrc(selectedPipeConfig.machineId) : ''
  const selectedPipeConfigPanelStyle = selectedPipeConfigPanelSrc
    ? ({
        '--machine-panel-image': `url("${selectedPipeConfigPanelSrc}")`,
      } as CSSProperties)
    : undefined
  const selectedMachineTerminalClassName = selectedMachine
    ? [
        'furnace-modal',
        'machine-terminal',
        `machine-${selectedMachine.machineId}-terminal`,
        selectedMachine.machineId === 'lvAssembler' ? 'lv-assembler-terminal' : '',
        selectedMachineIsHmiTerminal ? 'forge-hammer-terminal' : '',
        selectedMachineHmiKind === 'macerator' ? 'macerator-terminal' : '',
        (isSteamPoweredMachine(selectedMachine.machineId) ||
          isSteamPipeMachine(selectedMachine.machineId) ||
          selectedMachine.machineId === 'steamBoiler' ||
          selectedMachine.machineId === 'steamTank' ||
          selectedMachine.machineId === 'steamAutoMiner' ||
          isLiquidSteamBoilerMachine(selectedMachine.machineId) ||
          machines[selectedMachine.machineId].tier === 'steam')
          ? 'steam-machine-terminal'
          : '',
        (isEuPoweredMachine(selectedMachine.machineId) ||
          isEuCableMachine(selectedMachine.machineId) ||
          isEuProducerMachine(selectedMachine.machineId) ||
          isEuStorageMachine(selectedMachine.machineId) ||
          selectedMachine.machineId === 'lvAutoMiner' ||
          machines[selectedMachine.machineId].tier === 'lv')
          ? 'lv-machine-terminal'
          : '',
        selectedMachine.process.activeRecipeId ||
        selectedMachine.process.fuelRemainingMs > 0 ||
        selectedMachine.process.steamStoredMs > 0 ||
        selectedMachine.process.euStored > 0
          ? 'machine-terminal-active'
          : '',
        reviewState ? `machine-review-${reviewState}` : '',
      ]
        .filter(Boolean)
        .join(' ')
    : 'furnace-modal'
  const unplacedMachines = placeableFactoryMachineOrder.filter((id) => {
    if (unplacedMachineCounts[id] < 1) return false
    const query = factoryMachineSearch.trim().toLowerCase()
    if (!query) return true
    return id.toLowerCase().includes(query) || machines[id].name.toLowerCase().includes(query)
  })
  const selectedFactoryItemLabel = placingMachineId ? machines[placingMachineId].name : 'Select a factory part'
  const factoryGridSize = factoryGridForState(state)
  const factoryFloorStructureKey = `${state.factoryFoundationLevel}|${state.machineInstances
    .map((instance) => [
      instance.uid,
      instance.machineId,
      instance.x,
      instance.y,
      instance.level,
      instance.itemOutputDirection ?? '',
      ...pipeDirections.map((direction) => pipeSideMode(instance, direction)),
    ].join(':'))
    .join('|')}`
  const factoryFloorActivityFrame = Math.floor(state.lastSavedAt / 1000)

  useEffect(() => {
    if (page !== 'processing' || isFactoryPanningRef.current) return
    setFactoryFloorSnapshot(stateRef.current)
  }, [factoryFloorActivityFrame, factoryFloorStructureKey, page])

  const factoryFloorUnlocked = hasFactoryFloor(state)
  const factoryExpansionCost = factoryFoundationCost(state)
  const canExpandFactory = canExpandFactoryFloor(state)
  const nextFactoryLevel = Math.min(state.factoryFoundationLevel + 1, factoryFoundationSizes.length - 1)
  const nextFactoryGridSize = factoryFoundationSizes[nextFactoryLevel]
  const isFactoryMaxed = factoryExpansionCost.length < 1

  const clampFactoryView = (view: FactoryView, grid = factoryGridSize): FactoryView => {
    const viewport = factoryViewportRef.current
    const zoom = Math.max(factoryMinZoom, Math.min(factoryMaxZoom, view.zoom))
    if (!viewport) return { x: factoryViewportPadding, y: factoryViewportPadding, zoom }
    const pixelSize = factoryGridPixelSize(grid)
    const scaledWidth = pixelSize.width * zoom
    const scaledHeight = pixelSize.height * zoom
    const availableWidth = Math.max(0, viewport.clientWidth - factoryViewportPadding * 2)
    const availableHeight = Math.max(0, viewport.clientHeight - factoryViewportPadding * 2)
    const x =
      scaledWidth <= availableWidth
        ? (viewport.clientWidth - scaledWidth) / 2
        : Math.max(viewport.clientWidth - scaledWidth - factoryViewportPadding, Math.min(factoryViewportPadding, view.x))
    const y =
      scaledHeight <= availableHeight
        ? (viewport.clientHeight - scaledHeight) / 2
        : Math.max(viewport.clientHeight - scaledHeight - factoryViewportPadding, Math.min(factoryViewportPadding, view.y))
    return {
      x,
      y,
      zoom,
    }
  }

  const paintFactoryView = (view: FactoryView) => {
    if (factoryPanContentRef.current) {
      factoryPanContentRef.current.style.transform = `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.zoom})`
    }
    if (factoryViewPercentRef.current) factoryViewPercentRef.current.textContent = `${Math.round(view.zoom * 100)}%`
  }

  const queueFactoryViewPaint = (view: FactoryView) => {
    factoryViewRef.current = view
    pendingFactoryViewRef.current = view
    if (factoryViewFrameRef.current !== null) return
    factoryViewFrameRef.current = window.requestAnimationFrame(() => {
      factoryViewFrameRef.current = null
      const pendingView = pendingFactoryViewRef.current
      pendingFactoryViewRef.current = null
      if (pendingView) paintFactoryView(pendingView)
    })
  }

  const commitFactoryView = (view: FactoryView) => {
    queueFactoryViewPaint(view)
    setFactoryView((current) =>
      current.x === view.x && current.y === view.y && current.zoom === view.zoom ? current : view,
    )
  }

  const setFactoryPanActive = (active: boolean) => {
    isFactoryPanningRef.current = active
    factoryViewportRef.current?.classList.toggle('is-panning', active)
  }

  const factoryPointerFromEvent = (event: ReactPointerEvent<HTMLDivElement>): FactoryPointerPosition => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      clientX: event.clientX,
      clientY: event.clientY,
    }
  }

  const factoryPinchMetrics = (pointers: FactoryPointerPosition[]) => {
    const [first, second] = pointers
    const dx = second.x - first.x
    const dy = second.y - first.y
    return {
      distance: Math.max(1, Math.hypot(dx, dy)),
      midpointX: (first.x + second.x) / 2,
      midpointY: (first.y + second.y) / 2,
    }
  }

  const factoryFitView = (grid = factoryGridSize): FactoryView => {
    const viewport = factoryViewportRef.current
    if (!viewport) return { x: factoryViewportPadding, y: factoryViewportPadding, zoom: factoryDefaultZoom }
    const pixelSize = factoryGridPixelSize(grid)
    const availableWidth = Math.max(1, viewport.clientWidth - factoryViewportPadding * 2)
    const availableHeight = Math.max(1, viewport.clientHeight - factoryViewportPadding * 2)
    const fitZoom = Math.min(1, availableWidth / Math.max(1, pixelSize.width), availableHeight / Math.max(1, pixelSize.height))
    return clampFactoryView({ x: factoryViewportPadding, y: factoryViewportPadding, zoom: fitZoom }, grid)
  }

  const zoomFactoryAtPoint = (clientX: number, clientY: number, nextZoom: number) => {
    const viewport = factoryViewportRef.current
    if (!viewport) return
    const rect = viewport.getBoundingClientRect()
    const pointX = clientX - rect.left
    const pointY = clientY - rect.top
    const current = factoryViewRef.current
    const zoom = Math.max(factoryMinZoom, Math.min(factoryMaxZoom, nextZoom))
    const contentX = (pointX - current.x) / current.zoom
    const contentY = (pointY - current.y) / current.zoom
    commitFactoryView(clampFactoryView({ x: pointX - contentX * zoom, y: pointY - contentY * zoom, zoom }))
  }

  useEffect(() => {
    commitFactoryView(clampFactoryView(factoryViewRef.current))
  }, [factoryGridSize.width, factoryGridSize.height])

  useEffect(() => {
    if (page !== 'processing') return
    queueFactoryViewPaint(factoryView)
  }, [factoryView, page])

  useEffect(
    () => () => {
      if (factoryViewFrameRef.current !== null) window.cancelAnimationFrame(factoryViewFrameRef.current)
      factoryViewFrameRef.current = null
      pendingFactoryViewRef.current = null
    },
    [],
  )

  const factoryMachineByCell = useMemo(
    () => new Map(state.machineInstances.map((instance) => [`${instance.x},${instance.y}`, instance])),
    [state.machineInstances],
  )
  const machineAtFactoryCell = (x: number, y: number) => factoryMachineByCell.get(`${x},${y}`)

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
    const arcStructure = arcBlastFurnaceStructureForInstance(state, instance)
    if (arcStructure) return arcStructure.controller
    return controllerForMultiblockPart(instance)
  }

  const fluidOutputFacesForInstance = (instance: MachineInstance) => {
    const controller = controllerForFactoryStructure(instance) ?? instance
    const multiblock = multiblockControllerForInstance(state, controller)
    if (!multiblock || !isFluidOutletConfigurableMachine(multiblock.spec.controller)) return []
    const originX = multiblock.x - (multiblock.spec.controllerOffsetX ?? 0)
    const originY = multiblock.y - (multiblock.spec.controllerOffsetY ?? 0)
    const maxX = originX + multiblock.spec.width - 1
    const maxY = originY + multiblock.spec.height - 1
    return multiblockPositions(state, multiblock.x, multiblock.y, multiblock.spec)
      .map((position) => {
        const cell = machineAtFactoryCell(position.x, position.y)
        if (!cell) return []
        const directions: PipeDirection[] = []
        if (position.y === originY) directions.push('north')
        if (position.x === maxX) directions.push('east')
        if (position.y === maxY) directions.push('south')
        if (position.x === originX) directions.push('west')
        return directions.map((direction) => ({
          cell,
          direction,
          blockColumn: position.x - originX + 2,
          blockRow: position.y - originY + 2,
          sideColumn: direction === 'west' ? 1 : direction === 'east' ? multiblock.spec.width + 2 : position.x - originX + 2,
          sideRow: direction === 'north' ? 1 : direction === 'south' ? multiblock.spec.height + 2 : position.y - originY + 2,
        }))
      })
      .flat()
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

  const handleAssignAutoMiner = (uid: string, targetId: GatherTargetId) => {
    setState((current) => assignAutoMiner(current, uid, targetId))
    setIsAutoMinerTargetOpen(false)
  }

  const handleUnassignAutoMiner = (uid: string) => {
    setState((current) => unassignAutoMiner(current, uid))
    setIsAutoMinerTargetOpen(false)
  }

  const handleInstallAutoMinerSurveyCard = (uid: string, targetId: GatherTargetId) => {
    setState((current) => installSurveyCardInAutoMiner(current, uid, targetId))
  }

  const handleRemoveAutoMinerSurveyCard = (uid: string) => {
    setState((current) => removeSurveyCardFromAutoMiner(current, uid))
  }

  const handleInstallBufferBattery = (uid: string, batteryId: 'sodiumBattery' | 'lithiumBattery') => {
    setState((current) => installLvBatteryInBuffer(current, uid, batteryId))
  }

  const handleRemoveBufferBattery = (uid: string, slotIndex?: number) => {
    setState((current) => removeLvBatteryFromBuffer(current, uid, slotIndex))
  }

  const handleFluidPortPress = (buffer: MachineFluidBufferView, direction: 'input' | 'output') => {
    if (!selectedMachine || !canUseFluidPort(buffer, direction)) return
    if (direction === 'input') {
      if (!selectedFluidContainerGroup) return
      setState((current) => drainPortableFluidContainer(current, selectedMachine.uid, selectedFluidContainerGroup.containerUid, buffer.id))
      return
    }
    const kind = selectedEmptyFluidContainerKind ?? selectedFluidContainerGroup?.kind
    if (!kind) return
    const fluidId = selectedFluidContainerGroup?.fluidId ?? buffer.acceptedFluids.find((id) => (selectedMachine.process.fluids[id] ?? 0) > 0)
    setState((current) => fillPortableFluidContainer(current, selectedMachine.uid, kind, {
      containerUid: selectedFluidContainerGroup?.containerUid,
      fluidId,
      bufferId: buffer.id,
    }))
  }

  const handleNativeFluidControl = (bufferId: string, preferredDirection?: 'input' | 'output') => {
    const buffer = selectedMachineFluidBuffers.find((candidate) => candidate.id === bufferId)
    if (!buffer || machineTerminalMode !== 'fluids') return
    const direction = preferredDirection ?? (canUseFluidPort(buffer, 'input') ? 'input' : 'output')
    handleFluidPortPress(buffer, direction)
  }

  const nativeFluidControlReady = (bufferId: string, preferredDirection?: 'input' | 'output') => {
    const buffer = selectedMachineFluidBuffers.find((candidate) => candidate.id === bufferId)
    if (!buffer || machineTerminalMode !== 'fluids') return false
    return preferredDirection ? canUseFluidPort(buffer, preferredDirection) : canUseFluidPort(buffer, 'input') || canUseFluidPort(buffer, 'output')
  }

  const handleStorageSlotPress = (uid: string, slotIndex: number, slot: ProcessSlot) => {
    if (slot) {
      setState((current) => removeMachineStorageSlot(current, uid, slotIndex))
      return
    }
    if (selectedResource) setState((current) => insertMachineStorageSlot(current, uid, slotIndex, selectedResource))
  }

  const handleCraft = (recipe: Recipe) => {
    addFloatText(recipe.id === 'craft_wooden_axe' ? 'axe crafted' : 'crafted')
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

  const beginFactoryPinchGesture = () => {
    const pointers = [...factoryPointersRef.current.values()]
    if (pointers.length < 2) return
    const { distance, midpointX, midpointY } = factoryPinchMetrics(pointers.slice(0, 2))
    const currentView = factoryViewRef.current
    factoryGestureRef.current = {
      mode: 'pinch',
      startDistance: distance,
      originZoom: currentView.zoom,
      contentX: (midpointX - currentView.x) / currentView.zoom,
      contentY: (midpointY - currentView.y) / currentView.zoom,
      dragged: false,
    }
  }

  const handleFactoryPanPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const pointer = factoryPointerFromEvent(event)
    factoryPointersRef.current.set(event.pointerId, pointer)
    if (factoryPointersRef.current.size >= 2) {
      setFactoryPanActive(true)
      for (const pointerId of factoryPointersRef.current.keys()) {
        if (!event.currentTarget.hasPointerCapture(pointerId)) event.currentTarget.setPointerCapture(pointerId)
      }
      beginFactoryPinchGesture()
      return
    }
    factoryGestureRef.current = {
      mode: 'pan',
      pointerId: event.pointerId,
      startX: pointer.clientX,
      startY: pointer.clientY,
      originX: factoryViewRef.current.x,
      originY: factoryViewRef.current.y,
      dragged: false,
    }
  }

  const handleFactoryPanPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!factoryPointersRef.current.has(event.pointerId)) return
    factoryPointersRef.current.set(event.pointerId, factoryPointerFromEvent(event))
    const gesture = factoryGestureRef.current
    if (!gesture) return
    if (gesture.mode === 'pinch') {
      const pointers = [...factoryPointersRef.current.values()]
      if (pointers.length < 2) return
      const { distance, midpointX, midpointY } = factoryPinchMetrics(pointers.slice(0, 2))
      const nextZoom = Math.max(factoryMinZoom, Math.min(factoryMaxZoom, gesture.originZoom * (distance / gesture.startDistance)))
      if (!gesture.dragged && Math.abs(nextZoom - gesture.originZoom) >= 0.02) gesture.dragged = true
      if (gesture.dragged) {
        suppressFactoryCellClickRef.current = true
        const nextView = clampFactoryView({ x: midpointX - gesture.contentX * nextZoom, y: midpointY - gesture.contentY * nextZoom, zoom: nextZoom })
        queueFactoryViewPaint(nextView)
      }
      return
    }
    if (gesture.pointerId !== event.pointerId) return
    const dx = event.clientX - gesture.startX
    const dy = event.clientY - gesture.startY
    if (!gesture.dragged && Math.hypot(dx, dy) >= factoryPanThreshold) {
      gesture.dragged = true
      setFactoryPanActive(true)
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId)
    }
    if (gesture.dragged) {
      suppressFactoryCellClickRef.current = true
      const nextView = clampFactoryView({ x: gesture.originX + dx, y: gesture.originY + dy, zoom: factoryViewRef.current.zoom })
      queueFactoryViewPaint(nextView)
    }
  }

  const handleFactoryPanPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = factoryGestureRef.current
    const wasDragging = Boolean(gesture?.dragged)
    factoryPointersRef.current.delete(event.pointerId)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (factoryPointersRef.current.size >= 2) {
      beginFactoryPinchGesture()
      return
    }
    if (factoryPointersRef.current.size === 1) {
      const [[pointerId, pointer]] = [...factoryPointersRef.current.entries()]
      factoryGestureRef.current = {
        mode: 'pan',
        pointerId,
        startX: pointer.clientX,
        startY: pointer.clientY,
        originX: factoryViewRef.current.x,
        originY: factoryViewRef.current.y,
        dragged: wasDragging,
      }
      return
    }
    if (wasDragging) window.setTimeout(() => (suppressFactoryCellClickRef.current = false), 0)
    factoryGestureRef.current = null
    setFactoryPanActive(false)
    const latestState = stateRef.current
    setState((current) => current === latestState ? current : latestState)
    setFactoryFloorSnapshot(latestState)
    commitFactoryView(factoryViewRef.current)
  }

  const handleFactoryWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const zoomDelta = event.deltaY > 0 ? -factoryZoomStep : factoryZoomStep
    zoomFactoryAtPoint(event.clientX, event.clientY, factoryViewRef.current.zoom + zoomDelta)
  }

  const handleFactoryFitView = () => {
    const nextView = factoryFitView()
    commitFactoryView(nextView)
  }

  const handleFactoryCellPress = (x: number, y: number, instance?: MachineInstance) => {
    if (suppressFactoryCellClickRef.current) return
    if (instance) {
      const structureController = controllerForFactoryStructure(instance)
      if (structureController && structureController.uid !== instance.uid) {
        if (structureController.machineId === 'reachGate') {
          setSelectedMachineUid(structureController.uid)
          return
        }
        setSelectedMachineUid(structureController.uid)
        return
      }
      if (
        !structureController &&
        (instance.machineId === 'arcBlastFurnacePart' || instance.machineId === 'lvEnergyHatch2A' || instance.machineId === 'lvInputBus' || instance.machineId === 'lvOutputBus' || instance.machineId === 'lvFluidInputHatch' || instance.machineId === 'lvFluidOutputHatch')
      ) {
        setSelectedMachineUid(instance.uid)
        return
      }
      if (machines[instance.machineId].multiblock) {
        if (structureController) {
          if (structureController.machineId === 'reachGate') {
            setSelectedMachineUid(structureController.uid)
            return
          }
          setSelectedMachineUid(structureController.uid)
          return
        }
        setSelectedMachineUid(instance.uid)
        return
      }
      if (instance.machineId === 'reachGateCasing') {
        setSelectedMachineUid(instance.uid)
        return
      }
      if (machines[instance.machineId].processKind === 'none') {
        setSelectedMachineUid(instance.uid)
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

  factoryCellPressRef.current = handleFactoryCellPress

  const handleTogglePipeSide = (uid: string, direction: PipeDirection) => {
    const instance = state.machineInstances.find((candidate) => candidate.uid === uid)
    if (instance && isFluidOutletConfigurableMachine(instance.machineId)) {
      setState((current) => setFluidOutputDirection(current, uid, direction))
      return
    }
    setState((current) => cyclePipeSideMode(current, uid, direction))
  }

  const handleOpenSelectedMachineRouting = () => {
    if (!selectedMachine || !selectedMachineCanConfigureRouting) return
    setPendingProcessInsert(null)
    setIsMachineAutomationOpen(false)
    setSelectedPipeConfigUid(selectedMachine.uid)
    setSelectedMachineUid(null)
  }

  const handleRemoveSelectedMachine = () => {
    if (!selectedMachineSource || !selectedMachineCanRemove) return
    if (storedFluids(selectedMachineSource.process).some((fluid) => fluid.amount > 0) && !window.confirm('This machine still contains fluid. Remove it and discard the stored fluid?')) return
    const uid = selectedMachineSource.uid
    setState((current) => removeMachineInstance(current, uid))
    setPendingProcessInsert(null)
    setIsArcStructureOpen(false)
    setIsMachineAutomationOpen(false)
    setSelectedMachineUid(null)
    setSelectedPipeConfigUid(null)
  }

  const handleProcessSlotPress = (slotId: ProcessSlotId) => {
    if (!selectedMachine) return
    const slot = selectedMachine.process[slotId]
    if ((slotId === 'output' || slotId === 'output2') && !isItemHopperMachine(selectedMachine.machineId)) {
      setState((current) => collectProcessOutput(current, selectedMachine.uid, slotId === 'output2' ? 1 : 0))
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
    const craftedOutput = recipePrimaryOutput(terminalMatch)
    const craftedAmount = recipeDisplayAmount({ ...craftedOutput, amount: craftedOutput.amount * requestedQuantity })
    setTerminalNotice(`${craftedOutput.label} x${craftedAmount} crafted.`)
    addFloatText(`crafted x${craftedAmount}`)
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

    showMissingBatch(recipe, 1)
  }

  const handleSelectRecipeGroup = (groupKey: string, trackNavigation = false) => {
    if (trackNavigation && (selectedRecipeGroupKey !== groupKey || selectedRecipeIndex !== 0)) pushNavigationSnapshot()
    setSelectedRecipeGroupKey(groupKey)
    setSelectedRecipeIndex(0)
  }

  const handleOpenMachineRecipeBrowser = (machineId: MachineId) => {
    pushNavigationSnapshot()
    setTerminalMode('machines')
    setRecipeSearch('')
    setPage('terminal')
    setIsRecipeModalOpen(true)
    setSelectedMachineUid(null)
    setPendingProcessInsert(null)
    setSelectedRecipeGroupKey(`machine:${machineId}`)
    setSelectedRecipeIndex(0)
    setTerminalNotice(`Showing recipes for ${machines[machineId].name}.`)
  }

  const handleOpenRecipeBrowser = () => {
    setTerminalMode('recipes')
    setRecipeSearch('')
    setSelectedRecipeGroupKey(null)
    setSelectedRecipeIndex(0)
    setIsRecipeModalOpen(true)
  }

  const handleOpenMachineRecipePopup = () => {
    if (!selectedMachine || selectedMachinePopupRecipes.length < 1) return
    const activeRecipeIndex = selectedMachine.process.activeRecipeId
      ? selectedMachinePopupRecipes.findIndex((recipe) => recipe.id === selectedMachine.process.activeRecipeId)
      : -1
    setSelectedMachinePopupRecipeIndex(activeRecipeIndex >= 0 ? activeRecipeIndex : 0)
    setMachineRecipeLoadNotice('')
    setPendingProcessInsert(null)
    setIsMachineRecipePopupOpen(true)
  }

  const handleCycleMachinePopupRecipe = (direction: -1 | 1) => {
    if (selectedMachinePopupRecipes.length < 2) return
    setSelectedMachinePopupRecipeIndex((current) => (
      direction < 0
        ? current <= 0 ? selectedMachinePopupRecipes.length - 1 : current - 1
        : (current + 1) % selectedMachinePopupRecipes.length
    ))
    setMachineRecipeLoadNotice('')
  }

  const handleAutoLoadMachineRecipe = () => {
    if (!selectedMachine || !selectedMachinePopupRecipe || !selectedMachinePopupLoadStatus) return
    if (!selectedMachinePopupLoadStatus.canLoad) {
      const missing = selectedMachinePopupLoadStatus.missingResources
        .map((amount) => `${resourceLabels[amount.id]} x${formatAmount(amount.amount)}`)
        .join(', ')
      const blocked = selectedMachinePopupLoadStatus.blockedSlots.join(', ')
      setMachineRecipeLoadNotice(missing ? `Missing ${missing}.` : `Clear the ${blocked} slot${selectedMachinePopupLoadStatus.blockedSlots.length === 1 ? '' : 's'} first.`)
      return
    }
    if (selectedMachinePopupLoadStatus.ready) {
      const fluidInputs = selectedMachinePopupRecipe.fluidInputs ?? (selectedMachinePopupRecipe.fluidInput ? [selectedMachinePopupRecipe.fluidInput] : [])
      setMachineRecipeLoadNotice(selectedMachinePopupRecipe.fluidOnly
        ? fluidInputs.length > 0 ? 'This recipe only requires fluid inputs.' : 'No manual inputs. Keep the machine powered.'
        : 'All required items are already loaded.')
      return
    }

    setState((current) => loadProcessRecipeInputs(current, selectedMachine.uid, selectedMachinePopupRecipe.id))
    const fluidInputs = selectedMachinePopupRecipe.fluidInputs ?? (selectedMachinePopupRecipe.fluidInput ? [selectedMachinePopupRecipe.fluidInput] : [])
    setMachineRecipeLoadNotice(fluidInputs.length > 0
      ? `Items loaded. Add ${fluidInputs.map((amount) => `${formatLitres(amount.amount)}L ${fluidLabels[amount.id]}`).join(' and ')} through the fluid input.`
      : `Loaded items for ${processRecipePrimaryOutput(selectedMachinePopupRecipe).label}.`)
  }

  const handleOpenMachineOutputPage = (machineId: MachineId) => {
    if (processRecipesForMachine(machineId, processRecipes).length < 1) return
    handleOpenMachineRecipeBrowser(machineId)
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
      if (resourceId in machines) {
        handleJumpToMachineRecipe(resourceId as MachineId)
        return
      }
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

  const handleJumpToFluidRecipe = (fluidId: FluidId) => {
    const targetOutput = { kind: 'fluid' as const, id: fluidId, amount: 1 }
    const targetKey = recipeGroupKeyForOutput(targetOutput)
    const targetGroup = groupRecipesByOutput(recipeCatalog).find((group) => group.key === targetKey)
    if (!targetGroup) {
      setTerminalNotice(`No production recipe found for ${fluidLabel(fluidId)}.`)
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
    setTerminalNotice(`Showing recipes for ${fluidLabel(fluidId)}.`)
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
    setIsNewGameConfirmOpen(false)
    setEntryLoadingMessage(`Preparing ${selectedSaveLabel}`)
    setIsEnteringGame(true)
    await waitForEntryLoadingPaint()
    const minimumLoading = waitForEntryLoadingMinimum()
    cancelPendingSave()
    try {
      await clearSavedGame(selectedSaveSlotId)
      setIsCreativeMode(false)
      await refreshSaveSlots()
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

  const handleRequestNewGame = () => {
    if (isEnteringGame) return
    setIsNewGameConfirmOpen(true)
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

  const handleLoadCreativeFactory = async () => {
    if (!import.meta.env.DEV || isEnteringGame) return
    setEntryLoadingMessage('Loading creative factory')
    setIsEnteringGame(true)
    await waitForEntryLoadingPaint()
    const minimumLoading = waitForEntryLoadingMinimum()
    cancelPendingSave()
    try {
      const now = localTimeProvider.now()
      const creativeFactory = createCreativeFactoryState(createInitialState(now), now)
      setIsCreativeMode(true)
      stateRef.current = creativeFactory
      setState(creativeFactory)
      knownCompletedQuestsRef.current = new Set(creativeFactory.completedQuests)
      handleClearGrid()
      setOfflineNotice('Dev creative factory loaded. It will not overwrite the selected save.')
      setOfflinePrompt('')
      setMigrationPrompt('')
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
      setSelectedPipeConfigUid(null)
      setSelectedQuestId(null)
      setSelectedRecipeGroupKey(null)
      setSelectedRecipeIndex(0)
      setNavigationStack([])
      setHighlightedGatherTarget(null)
      commitFactoryView({ x: factoryViewportPadding, y: factoryViewportPadding, zoom: factoryDefaultZoom })
      setPage('processing')
      addFloatText('creative factory')
    } finally {
      await minimumLoading
      setIsEnteringGame(false)
      setEntryLoadingMessage('Loading save')
    }
  }

  const handleContinueFromHome = async () => {
    if (isEnteringGame) return
    setEntryLoadingMessage(`Loading ${selectedSaveLabel}`)
    setIsEnteringGame(true)
    await waitForEntryLoadingPaint()
    const minimumLoading = waitForEntryLoadingMinimum()
    try {
      const savedState = await loadSlotIntoGame(selectedSaveSlotId)
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
  const showSelectedRecipeAvailability = terminalMode !== 'machines'
  const selectedRecipeMissingLine = selectedRecipe && showSelectedRecipeAvailability ? missingLine(state, selectedRecipe) : ''
  const selectedRecipeLockedLine = selectedRecipe && showSelectedRecipeAvailability ? lockedLine(state, selectedRecipe) : ''
  const selectedRecipeOutput = selectedRecipe
    ? terminalMode === 'recipes' && selectedRecipeGroup
      ? recipeGroupDisplayOutput(selectedRecipeGroup)
      : recipePrimaryOutput(selectedRecipe)
    : undefined
  const missingResourceAmount = (id: ResourceId) => showSelectedRecipeAvailability
    ? selectedRecipeMissing?.missingResources.find((amount) => amount.id === id)?.amount ?? 0
    : 0
  const missingCatalystAmount = (id: ResourceId) => showSelectedRecipeAvailability
    ? selectedRecipeMissing?.missingCatalysts.find((amount) => amount.id === id)?.amount ?? 0
    : 0
  const selectedRecipeProcessStats = selectedRecipe?.recipeType === 'processing'
    ? {
        duration: formatDuration(selectedRecipe.durationMs),
        costKind: selectedRecipe.euCost !== undefined ? 'eu' : selectedRecipe.steamCostLitres !== undefined ? 'steam' : null,
        costLabel:
          selectedRecipe.euCost !== undefined
            ? `${formatAmount(selectedRecipe.euCost)} EU`
            : selectedRecipe.steamCostLitres !== undefined
              ? `${formatLitres(selectedRecipe.steamCostLitres)}L steam`
              : '',
      }
    : null
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
    if (isMachineRecipePopupOpen) {
      setIsMachineRecipePopupOpen(false)
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
  const androidApkUrl = String(import.meta.env.VITE_ANDROID_APK_URL ?? '').trim()
  const isNativeClient = Capacitor.isNativePlatform()
  const canPromptInstall = Boolean(installPromptEvent && !isInstalledApp && !isNativeClient)
  const showIosInstallHelp = isIosClient() && !isInstalledApp && !canPromptInstall && !isNativeClient
  const showAndroidApkDownload = Boolean(androidApkUrl && !isNativeClient)
  const showInstallCard = canPromptInstall || showIosInstallHelp || showAndroidApkDownload

  const handleInstallApp = async () => {
    if (!installPromptEvent) return
    try {
      await installPromptEvent.prompt()
      const choice = await installPromptEvent.userChoice
      if (choice.outcome === 'accepted') setInstallPromptEvent(null)
    } catch {
      // Browser install prompts are best-effort; the APK and iOS paths remain available.
    } finally {
      setIsInstalledApp(isStandaloneInstall())
    }
  }

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

      {page === 'home' && isNewGameConfirmOpen && !isEnteringGame && (
        <div className="modal-backdrop compact-backdrop" role="presentation" onClick={() => setIsNewGameConfirmOpen(false)}>
          <section
            className="missing-modal new-game-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm new game"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <p className="eyebrow">{selectedSaveLabel}</p>
                <h2>Start a new game?</h2>
              </div>
              <button type="button" className="icon-button" aria-label="Keep current save" onClick={() => setIsNewGameConfirmOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <p>
              {selectedSaveSlot?.exists
                ? `This permanently deletes the current ${selectedSaveLabel} and replaces it with a new factory.`
                : `This starts a new factory in ${selectedSaveLabel}.`}
            </p>
            <div className="new-game-confirm-actions">
              <button type="button" className="home-action" onClick={() => setIsNewGameConfirmOpen(false)}>
                <X size={16} />
                Keep Save
              </button>
              <button type="button" className="home-action danger" onClick={() => void handleReset()}>
                <Trash2 size={16} />
                {selectedSaveSlot?.exists ? 'Delete Save & Start' : 'Start New Game'}
              </button>
            </div>
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
          {isUpdateAvailable && (
            <section className="home-update-card" aria-label="Factory update available">
              <div>
                <span>Factory update</span>
                <strong>New build ready</strong>
              </div>
              <p>Reload to install the latest Click Foundry build before entering a save.</p>
              <button type="button" className="home-action primary" onClick={reloadLatestDeployment}>
                Update now
              </button>
            </section>
          )}
          {showInstallCard && (
            <section className="home-install-card" aria-label="Install Click Foundry">
              <div>
                <span>Install</span>
                <strong>Free app build</strong>
              </div>
              {showIosInstallHelp ? (
                <p>On iPhone, share this page and choose Add to Home Screen.</p>
              ) : (
                <p>Install the web app for full-screen play, or download the Android build.</p>
              )}
              <div className="home-install-actions">
                {canPromptInstall && (
                  <button type="button" className="home-action primary" onClick={() => void handleInstallApp()}>
                    <Download size={16} />
                    Install Web App
                  </button>
                )}
                {showAndroidApkDownload && (
                  <a className="home-action" href={androidApkUrl} download>
                    <Download size={16} />
                    Android APK
                  </a>
                )}
              </div>
            </section>
          )}
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
            <button type="button" className="home-action primary" disabled={!hasLoadedSave || isEnteringGame || isUpdateAvailable} onClick={handleContinueFromHome}>
              {isUpdateAvailable ? 'Update Required' : isEnteringGame ? 'Loading save...' : `Continue ${selectedSaveLabel}`}
            </button>
            {import.meta.env.DEV && (
              <button type="button" className="home-action" disabled={!hasLoadedSave || isEnteringGame} onClick={handleLoadCreativeFactory}>
                {isEnteringGame ? 'Loading...' : 'Load Creative Factory'}
              </button>
            )}
            <button type="button" className="home-action danger" disabled={!hasLoadedSave || isEnteringGame || isUpdateAvailable} onClick={handleRequestNewGame}>
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
              <button
                type="button"
                className={gatherArea === area.id ? 'active' : ''}
                disabled={area.id === 'shatteredReach' && !isReachGateFormed(state)}
                onClick={() => setGatherArea(area.id)}
                key={area.id}
              >
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
            {filteredResources.length > 0 || filteredMachines.length > 0 || filteredPortableFluidGroups.length > 0 ? (
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
                {filteredPortableFluidGroups.map((group) => (
                  <button
                    type="button"
                    className={selectedFluidContainerKey === group.key ? 'item-slot fluid-container-slot selected' : 'item-slot fluid-container-slot'}
                    aria-label={`${fluidLabel(group.fluidId)} ${group.kind === 'bucket' ? 'Bucket' : 'Steel Cell'}, ${formatLitres(group.amountLitres)} of ${formatLitres(fluidContainerCapacities[group.kind])} litres, ${group.count} stored`}
                    title={`${fluidLabel(group.fluidId)} ${group.kind === 'bucket' ? 'Bucket' : 'Steel Cell'}`}
                    onClick={() => {
                      setSelectedResource(null)
                      setSelectedFluidContainerKey(group.key)
                    }}
                    key={`fluid-${group.key}`}
                  >
                    <PixelIcon id={group.kind === 'bucket' ? 'bucket' : 'emptySteelCell'} />
                    <span className="fluid-container-tint" style={{ '--portable-fluid-color': fluidVisualColor(group.fluidId) } as CSSProperties} />
                    <span className="fluid-container-level">{formatLitres(group.amountLitres)}L</span>
                    <span className="item-count">{formatAmount(group.count)}</span>
                  </button>
                ))}
              </>
            ) : (
              <div className="empty-storage">
                <p>No stored items</p>
                <span>Gather materials, then craft them here.</span>
              </div>
            )}
          </div>

          <div className={selectedResource || selectedFluidContainerGroup ? 'item-tooltip' : 'item-tooltip empty'} role={selectedResource || selectedFluidContainerGroup ? 'status' : undefined}>
            {selectedFluidContainerGroup ? (
              <>
                <strong>{fluidLabel(selectedFluidContainerGroup.fluidId)} {selectedFluidContainerGroup.kind === 'bucket' ? 'Bucket' : 'Steel Cell'}</strong>
                <span>{formatLitres(selectedFluidContainerGroup.amountLitres)}L / {formatLitres(fluidContainerCapacities[selectedFluidContainerGroup.kind])}L | x{formatAmount(selectedFluidContainerGroup.count)}</span>
              </>
            ) : selectedResource ? (
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
              <button type="button" className="recipe-open-button" onClick={handleOpenRecipeBrowser}>
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
                    terminalOutput.kind === 'machine' ? (
                      <span className="output-machine-glyph">
                        <MachineGlyph id={terminalOutput.id} />
                      </span>
                    ) : (
                      <RecipeDisplayIcon output={terminalOutput} />
                    )
                  ) : (
                    <span className="empty-output" />
                  )}
                  {terminalOutput && <span className="item-count output-count">{recipeDisplayAmount(terminalOutput)}</span>}
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
              {inventoryMachineOrder.map((id) => {
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
            <div className="modal-backdrop recipe-backdrop" role="presentation" onClick={() => setIsRecipeModalOpen(false)}>
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
                    <h2>{terminalMode === 'recipes' ? 'Recipes' : 'Machines'}</h2>
                  </div>
                  <button type="button" className="icon-button" aria-label="Close recipes" onClick={() => setIsRecipeModalOpen(false)}>
                    <X size={18} />
                  </button>
                </div>

                <input
                  className="recipe-search"
                  type="search"
                  placeholder={terminalMode === 'machines' ? 'Search machines or recipes' : 'Search recipes'}
                  value={recipeSearch}
                  onChange={(event) => setRecipeSearch(event.target.value)}
                />

                <div className="mode-tabs" aria-label="Recipe browser mode">
                  <button type="button" className={terminalMode === 'recipes' ? 'active' : ''} onClick={() => setTerminalMode('recipes')}>
                    Recipes
                  </button>
                  <button type="button" className={terminalMode === 'machines' ? 'active' : ''} onClick={() => setTerminalMode('machines')}>
                    Machines
                  </button>
                </div>

                <div className="recipe-modal-body">
                  <div className="recipe-icon-grid" aria-label="Recipe results">
                  {listedRecipeGroups.map((group) => {
                    const output = terminalMode === 'machines' && group.output.kind === 'machine'
                      ? { ...group.output, label: machines[group.output.id].name }
                      : recipeGroupDisplayOutput(group)
                    const isMachineResult = terminalMode === 'machines' && output.kind === 'machine'
                    const machineIsOnFloor = isMachineResult && state.machineInstances.some((instance) => instance.machineId === output.id)
                    const locked = !isMachineResult && group.recipes.every((recipe) => lockedLine(state, recipe))
                    const missing = !isMachineResult && !locked && group.recipes.every((recipe) => missingLine(state, recipe))
                    return (
                      <button
                        type="button"
                        className={[
                          'recipe-icon-button',
                          group.key === selectedRecipeGroup?.key ? 'selected' : '',
                          isMachineResult ? machineIsOnFloor ? 'machine-on-floor' : 'machine-off-floor' : locked ? 'locked' : missing ? 'missing' : 'ready',
                        ].join(' ')}
                        aria-label={isMachineResult ? `${output.label}, ${machineIsOnFloor ? 'on factory floor' : 'not on factory floor'}` : output.label}
                        title={isMachineResult ? `${output.label} · ${machineIsOnFloor ? 'On factory floor' : 'Not on factory floor'}` : recipeGroupDisplayOutput(group).label}
                        onClick={() => handleSelectRecipeGroup(group.key, true)}
                        key={group.key}
                      >
                        <RecipeDisplayIcon output={output} />
                        <span className="item-count">{recipeDisplayAmount(output)}</span>
                        {(terminalMode === 'machines' || group.recipes.length > 1) && <span className="recipe-count-badge">{group.recipes.length}</span>}
                      </button>
                    )
                  })}
                  </div>

                  {selectedRecipe && selectedRecipeOutput && selectedRecipeMissing && selectedRecipeGroup && (
                    <aside className="recipe-detail" aria-label={`${recipeDisplayName(selectedRecipe)} details`}>
                      <div className="recipe-detail-head">
                        <div>
                          <p className="eyebrow">
                            {terminalMode === 'machines' && selectedRecipeMinimumMachineId
                              ? `${selectedRecipe.tier} · minimum ${machines[selectedRecipeMinimumMachineId].name}`
                              : selectedRecipe.tier}
                          </p>
                          <h3>{selectedRecipeOutput.label}</h3>
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
                          <span className={selectedRecipeLockedLine || selectedRecipeMissingLine ? 'mini-slot muted' : 'mini-slot'}>
                            <RecipeDisplayIcon output={selectedRecipeOutput} />
                            <span className="item-count">{recipeDisplayAmount(selectedRecipeOutput)}</span>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="load-recipe-button recipe-primary-action"
                        onClick={() => handleRecipeBrowserAction(selectedRecipe)}
                      >
                        {isFactoryFloorLayoutRecipe(selectedRecipe)
                          ? 'Create factory parts'
                          : recipeOpensProcessView(selectedRecipe)
                            ? 'Open process view'
                            : recipeFitsTerminalGrid(selectedRecipe)
                              ? 'Load recipe'
                              : 'Recipe needs a grid or machine'}
                      </button>

                      {isFactoryFloorLayoutRecipe(selectedRecipe) && (
                        <div className="recipe-slot-section factory-layout-section">
                          <span>Factory Floor</span>
                          <FactoryFloorLayoutPreview recipe={selectedRecipe} />
                        </div>
                      )}

                      {!isFactoryFloorLayoutRecipe(selectedRecipe) && recipeFitsTerminalGrid(selectedRecipe) ? (
                        <div className="recipe-crafting-flow" aria-label="Recipe crafting grid">
                          <div className="recipe-crafting-row">
                            <div className="recipe-flow-step pattern">
                              <span>Grid</span>
                              <RecipePatternPreview recipe={selectedRecipe} state={state} onSelectResource={handleJumpToResourceRecipe} />
                            </div>

                            <span className="recipe-flow-arrow" aria-hidden="true">
                              <ChevronRight size={14} />
                            </span>

                            <div className="recipe-flow-step output">
                              <span>Output</span>
                              <div className="recipe-flow-items">
                                {selectedRecipe.outputs.map((amount) => (
                                  <div className="recipe-flow-entry" key={amount.id}>
                                    <ItemSlot amount={amount} state={state} onClick={handleJumpToResourceRecipe} />
                                    <span className="recipe-flow-label">
                                      <span>{resourceLabels[amount.id]}</span>
                                    </span>
                                  </div>
                                ))}
                                {selectedRecipe.machineOutputs?.map((amount) => (
                                  <div className="recipe-flow-entry" key={amount.id}>
                                    <MachineSlot
                                      id={amount.id}
                                      amount={amount.amount}
                                      onClick={processRecipesForMachine(amount.id, processRecipes).length > 0 ? handleOpenMachineOutputPage : undefined}
                                    />
                                    <span className="recipe-flow-label">
                                      <span>{machines[amount.id].name}</span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="recipe-crafting-names">
                            <span>Grid items</span>
                            <div>
                              {selectedRecipe.inputs.map((amount) => {
                                const missing = missingResourceAmount(amount.id)
                                return (
                                  <button
                                    type="button"
                                    className={missing > 0 ? 'recipe-name-chip missing' : 'recipe-name-chip'}
                                    onClick={() => handleJumpToResourceRecipe(amount.id)}
                                    key={amount.id}
                                  >
                                    <span>{resourceLabels[amount.id]}</span>
                                    <strong>x{formatAmount(amount.amount)}</strong>
                                    {missing > 0 && <em>Need x{formatAmount(missing)}</em>}
                                  </button>
                                )
                              })}
                              {selectedRecipe.catalysts?.map((amount) => {
                                const missing = missingCatalystAmount(amount.id)
                                return (
                                  <button
                                    type="button"
                                    className={missing > 0 ? 'recipe-name-chip missing' : 'recipe-name-chip'}
                                    onClick={() => handleJumpToResourceRecipe(amount.id)}
                                    key={`catalyst-${amount.id}`}
                                  >
                                    <span>{resourceLabels[amount.id]}</span>
                                    <strong>x{formatAmount(amount.amount)}</strong>
                                    {missing > 0 && <em>Need x{formatAmount(missing)}</em>}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      ) : selectedRecipe.recipeType === 'processing' ? (
                        <div className="recipe-process-flow" aria-label="Recipe process flow">
                          <div className="recipe-flow-step">
                            <span>Inputs</span>
                            <div className="recipe-flow-items">
                              {selectedRecipe.inputs.map((amount) => {
                                const missing = missingResourceAmount(amount.id)
                                return (
                                  <div className={missing > 0 ? 'recipe-flow-entry missing' : 'recipe-flow-entry'} key={amount.id}>
                                    <ItemSlot amount={amount} disabled={missing > 0} state={state} onClick={handleJumpToResourceRecipe} />
                                    <span className="recipe-flow-label">
                                      <span>{resourceLabels[amount.id]}</span>
                                      <strong>x{formatAmount(amount.amount)}</strong>
                                      {missing > 0 && <em>Need x{formatAmount(missing)}</em>}
                                    </span>
                                  </div>
                                )
                              })}
                              {selectedRecipe.catalysts?.map((amount) => {
                                const missing = missingCatalystAmount(amount.id)
                                return (
                                  <div className={missing > 0 ? 'recipe-flow-entry missing' : 'recipe-flow-entry'} key={`catalyst-${amount.id}`}>
                                    <ItemSlot amount={amount} disabled={missing > 0} state={state} onClick={handleJumpToResourceRecipe} />
                                    <span className="recipe-flow-label">
                                      <span>{resourceLabels[amount.id]}</span>
                                      <strong>x{formatAmount(amount.amount)}</strong>
                                      {missing > 0 && <em>Need x{formatAmount(missing)}</em>}
                                    </span>
                                  </div>
                                )
                              })}
                              {selectedRecipe.fluidInputs?.map((amount) => (
                                <div className="recipe-flow-entry fluid" key={`fluid-${amount.id}`}>
                                  <button
                                    type="button"
                                    className="recipe-fluid-slot"
                                    aria-label={`Show recipes for ${fluidLabel(amount.id)}`}
                                    onClick={() => handleJumpToFluidRecipe(amount.id)}
                                  >
                                    <FluidIcon id={amount.id} />
                                  </button>
                                  <span className="recipe-flow-label">
                                    <span>{fluidLabel(amount.id)}</span>
                                    <strong>{formatLitres(amount.amount)}L</strong>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <span className="recipe-flow-arrow" aria-hidden="true">
                            <ChevronRight size={14} />
                          </span>

                          <div className="recipe-flow-step">
                            <span>Station</span>
                            <div className="recipe-flow-items">
                              {selectedRecipeStationMachineId && (
                                <button
                                  type="button"
                                  className="recipe-station-entry"
                                  aria-label={`Find ${machines[selectedRecipeStationMachineId].name}`}
                                  onClick={() => handleJumpToMachineRecipe(selectedRecipeStationMachineId)}
                                >
                                  <MachineSlot
                                    id={selectedRecipeStationMachineId}
                                    muted={showSelectedRecipeAvailability && state.machines[selectedRecipeStationMachineId] < 1}
                                  />
                                  <span>{machines[selectedRecipeStationMachineId].name}</span>
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
                                    muted={showSelectedRecipeAvailability && state.machines[amount.id] < amount.amount}
                                  />
                                  <span>{machines[amount.id].name}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <span className="recipe-flow-arrow" aria-hidden="true">
                            <ChevronRight size={14} />
                          </span>

                          <div className="recipe-flow-step output">
                            <span>Outputs</span>
                            <div className="recipe-flow-items">
                              {selectedRecipe.outputs.map((amount) => (
                                <div className="recipe-flow-entry" key={amount.id}>
                                  <ItemSlot amount={amount} state={state} onClick={handleJumpToResourceRecipe} />
                                  <span className="recipe-flow-label">
                                    <span>{resourceLabels[amount.id]}</span>
                                  </span>
                                </div>
                              ))}
                              {selectedRecipe.machineOutputs?.map((amount) => (
                                <div className="recipe-flow-entry" key={amount.id}>
                                  <MachineSlot
                                    id={amount.id}
                                    amount={amount.amount}
                                    onClick={processRecipesForMachine(amount.id, processRecipes).length > 0 ? handleOpenMachineOutputPage : undefined}
                                  />
                                  <span className="recipe-flow-label">
                                    <span>{machines[amount.id].name}</span>
                                  </span>
                                </div>
                              ))}
                              {selectedRecipe.fluidOutputs?.map((amount) => (
                                <div className="recipe-flow-entry fluid" key={`fluid-${amount.id}`}>
                                  <button
                                    type="button"
                                    className="recipe-fluid-slot"
                                    aria-label={`Show recipes for ${fluidLabel(amount.id)}`}
                                    onClick={() => handleJumpToFluidRecipe(amount.id)}
                                  >
                                    <FluidIcon id={amount.id} />
                                  </button>
                                  <span className="recipe-flow-label">
                                    <span>{fluidLabel(amount.id)}</span>
                                    <strong>{formatLitres(amount.amount)}L</strong>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

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

                      {selectedRecipe.recipeType !== 'processing' && (selectedRecipe.requiredMachine || selectedRecipe.machineInputs?.length) && (
                        <div className="recipe-slot-section">
                          <div className="recipe-slot-heading">
                            <span>Station</span>
                          </div>
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

                      {selectedRecipe.recipeType !== 'processing' && (isFactoryFloorLayoutRecipe(selectedRecipe) || !recipeFitsTerminalGrid(selectedRecipe)) && (
                        <div className="recipe-slot-section">
                          <span>Outputs</span>
                          <div className="recipe-slot-row">
                            {selectedRecipe.outputs.map((amount) => (
                              <ItemSlot amount={amount} state={state} onClick={handleJumpToResourceRecipe} key={amount.id} />
                            ))}
                            {selectedRecipe.machineOutputs?.map((amount) => (
                              <MachineSlot
                                id={amount.id}
                                amount={amount.amount}
                                onClick={processRecipesForMachine(amount.id, processRecipes).length > 0 ? handleOpenMachineOutputPage : undefined}
                                key={amount.id}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedRecipeProcessStats && (
                        <div className="recipe-process-summary" aria-label="Recipe process stats">
                          <span>Process</span>
                          <div className="recipe-process-stats">
                            <span className="recipe-process-pill time">
                              <Clock size={14} aria-hidden="true" />
                              {selectedRecipeProcessStats.duration}
                            </span>
                            {selectedRecipeProcessStats.costKind && selectedRecipeProcessStats.costLabel && (
                              <span className={`recipe-process-pill ${selectedRecipeProcessStats.costKind}`}>
                                {selectedRecipeProcessStats.costKind === 'eu' ? <Zap size={14} aria-hidden="true" /> : <Droplet size={14} aria-hidden="true" />}
                                {selectedRecipeProcessStats.costLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedRecipeLockedLine && <p className="missing-line recipe-detail-warning">Locked: {selectedRecipeLockedLine}</p>}
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
                <h3>Build {nextFactoryGridSize.width}x{nextFactoryGridSize.height} Floor</h3>
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
              <div className="factory-inventory-panel" aria-label="Factory inventory">
                <div className="processing-storage machine-placement-storage" aria-label="Factory parts">
                  <div className="factory-tray-head">
                    <div
                      className={placingMachineId ? 'factory-selection-name active' : 'factory-selection-name'}
                      aria-label={selectedFactoryItemLabel}
                      aria-live="polite"
                    >
                      <strong>{selectedFactoryItemLabel}</strong>
                    </div>
                    <input
                      className="factory-machine-search"
                      type="search"
                      placeholder="Find"
                      value={factoryMachineSearch}
                      onChange={(event) => setFactoryMachineSearch(event.target.value)}
                      aria-label="Search factory parts"
                    />
                  </div>
                  <div className="machine-placement-slots" id="factory-inventory-view">
                    {unplacedMachines.length > 0 ? (
                      unplacedMachines.map((id) => (
                        <button
                          type="button"
                          className={placingMachineId === id ? 'item-slot machine-inventory-slot selected' : 'item-slot machine-inventory-slot'}
                          aria-label={`${machines[id].name} ${formatAmount(unplacedMachineCounts[id])}`}
                          title={machines[id].name}
                          onClick={() => {
                            setSelectedPipeConfigUid(null)
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
              </div>

              <div className="factory-view-controls">
                <div className="mode-tabs factory-view-tabs" role="tablist" aria-label="Factory floor view">
                  <button
                    type="button"
                    className={factoryFloorViewMode === 'production' ? 'active' : ''}
                    role="tab"
                    aria-selected={factoryFloorViewMode === 'production'}
                    onClick={() => setFactoryFloorViewMode('production')}
                  >
                    <LayoutGrid size={14} />
                    Floor
                  </button>
                  <button
                    type="button"
                    className={factoryFloorViewMode === 'maintenance' ? 'active' : ''}
                    role="tab"
                    aria-selected={factoryFloorViewMode === 'maintenance'}
                    onClick={() => setFactoryFloorViewMode('maintenance')}
                  >
                    <Wrench size={14} />
                    Maintenance
                  </button>
                </div>
                {factoryFloorViewMode === 'maintenance' && (
                  <div className="factory-maintenance-legend" aria-label="Maintenance states">
                    <span className="running">Running</span>
                    <span className="power-loss">Power loss</span>
                    <span className="output-full">Output full</span>
                  </div>
                )}
              </div>

              <div
                className="factory-pan-viewport"
                ref={factoryViewportRef}
                onWheel={handleFactoryWheel}
                onPointerDown={handleFactoryPanPointerDown}
                onPointerMove={handleFactoryPanPointerMove}
                onPointerUp={handleFactoryPanPointerEnd}
                onPointerCancel={handleFactoryPanPointerEnd}
              >
                <button
                  type="button"
                  className="factory-view-fit factory-floor-fit"
                  aria-label="Fit factory floor"
                  title="Fit factory floor"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation()
                    handleFactoryFitView()
                  }}
                >
                  <Maximize2 size={14} />
                  <span className="factory-view-percent" ref={factoryViewPercentRef} />
                </button>
                <div
                  className="factory-pan-content"
                  ref={factoryPanContentRef}
                >
                  <FactoryFloorGrid
                    state={factoryFloorSnapshot}
                    width={factoryGridSize.width}
                    height={factoryGridSize.height}
                    viewMode={factoryFloorViewMode}
                    placingMachineId={placingMachineId}
                    cellPressRef={factoryCellPressRef}
                  />
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
                style={selectedPipeConfigPanelStyle}
                role="dialog"
                aria-modal="true"
                aria-label={`Configure ${machines[selectedPipeConfig.machineId].name}`}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="modal-head">
                  <div>
                    <p className="eyebrow">
                      {isItemHopperMachine(selectedPipeConfig.machineId)
                        ? 'Hopper Routing'
                        : isFluidOutletConfigurableMachine(selectedPipeConfig.machineId)
                          ? 'Fluid Output'
                          : isEuCableMachine(selectedPipeConfig.machineId)
                            ? 'Cable Connections'
                            : 'Pipe Routing'}
                    </p>
                    <h2>{machines[selectedPipeConfig.machineId].name}</h2>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={isItemHopperMachine(selectedPipeConfig.machineId) || isFluidOutletConfigurableMachine(selectedPipeConfig.machineId)
                      ? 'Close output routing'
                      : isEuCableMachine(selectedPipeConfig.machineId)
                        ? 'Close cable connections'
                        : 'Close pipe routing'}
                    onClick={() => setSelectedPipeConfigUid(null)}
                  >
                    <X size={18} />
                  </button>
                </div>
                {isFluidOutletConfigurableMachine(selectedPipeConfig.machineId) ? (
                  (() => {
                    const faces = fluidOutputFacesForInstance(selectedPipeConfig)
                    const cells = Array.from(new Map(faces.map((face) => [face.cell.uid, face])).values())
                    return (
                      <div className="fluid-output-config-grid" aria-label="Fluid output faces">
                        {cells.map((face) => (
                          <span
                            className="fluid-output-block"
                            style={{ gridColumn: face.blockColumn, gridRow: face.blockRow }}
                            key={`block-${face.cell.uid}`}
                          >
                            <MachineGlyph id={face.cell.machineId} active={faces.some((candidate) => candidate.cell.uid === face.cell.uid && pipeSideMode(candidate.cell, candidate.direction) === 'output')} />
                          </span>
                        ))}
                        {faces.map((face) => {
                          const offset = pipeDirectionOffsets[face.direction]
                          const neighbour = machineAtFactoryCell(face.cell.x + offset.dx, face.cell.y + offset.dy)
                          const mode = pipeSideMode(face.cell, face.direction)
                          const connected = Boolean(mode === 'output' && neighbour && machinesCanConnect(face.cell, neighbour))
                          const className = [
                            'pipe-config-cell',
                            'fluid-output-face',
                            'toggle',
                            `face-${face.direction}`,
                            mode === 'blocked' ? 'disabled-side' : '',
                            connected ? 'connected-side' : '',
                            `mode-${mode}`,
                          ].filter(Boolean).join(' ')
                          return (
                            <button
                              type="button"
                              className={className}
                              style={{ gridColumn: face.sideColumn, gridRow: face.sideRow }}
                              aria-label={`${offset.label} output ${pipeSideModeLabels[mode]}. Tap to toggle output.`}
                              onClick={() => handleTogglePipeSide(face.cell.uid, face.direction)}
                              key={`${face.cell.uid}-${face.direction}`}
                            >
                              <PipeFlowArrows direction={face.direction} mode={mode} />
                              <span className="fluid-face-label">{offset.label.slice(0, 1)}</span>
                              <span className="pipe-side-mode">{mode === 'output' ? 'Out' : 'Off'}</span>
                            </button>
                          )
                        })}
                      </div>
                    )
                  })()
                ) : (
                  <div className="pipe-config-grid" aria-label={isItemHopperMachine(selectedPipeConfig.machineId) ? 'Hopper routing directions' : isEuCableMachine(selectedPipeConfig.machineId) ? 'Cable connections' : 'Pipe routing directions'}>
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
                        const isCableConfig = isEuCableMachine(selectedPipeConfig.machineId)
                        const connected = Boolean(
                          direction &&
                            neighbour &&
                            (isHopperConfig
                              ? ((mode === 'input' || mode === 'both') && !isItemAutomationMachine(neighbour.machineId)) ||
                                ((mode === 'output' || mode === 'both') && (isItemStorageMachine(neighbour.machineId) || !isItemAutomationMachine(neighbour.machineId)))
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
                            aria-label={isCableConfig
                              ? `${pipeDirectionOffsets[direction].label} cable connection ${disabled ? 'off' : 'linked'}. Tap to toggle.`
                              : `${pipeDirectionOffsets[direction].label} ${isHopperConfig ? 'hopper route' : 'flow'} ${pipeSideModeLabels[mode ?? 'blocked']}. Tap to cycle mode.`}
                            onClick={() => handleTogglePipeSide(selectedPipeConfig.uid, direction)}
                            key={`${dx},${dy}`}
                          >
                            {content}
                            {isCableConfig ? <Zap size={14} /> : <PipeFlowArrows direction={direction} mode={mode ?? 'blocked'} />}
                            <strong>{pipeDirectionOffsets[direction].label}</strong>
                            <span className="pipe-side-mode">{isCableConfig ? (disabled ? 'Off' : 'Linked') : pipeSideModeLabels[mode ?? 'blocked']}</span>
                          </button>
                        )
                      }),
                    )}
                  </div>
                )}
                <p className="pipe-config-note">
                  {isItemHopperMachine(selectedPipeConfig.machineId)
                    ? 'Set one side to In beside the machine output, and another side to Out beside the destination. Both can pull and push.'
                    : isFluidOutletConfigurableMachine(selectedPipeConfig.machineId)
                      ? 'Tap any outside face to choose where this structure drains fluid.'
                      : isEuCableMachine(selectedPipeConfig.machineId)
                        ? 'Tap a side to connect or disconnect that cable face. Power remains non-directional.'
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
                setIsMachineAutomationOpen(false)
                setIsMachineRecipePopupOpen(false)
                setSelectedMachineUid(null)
              }}
            >
              <section
                className={selectedMachineTerminalClassName}
                style={selectedMachinePanelStyle}
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
                  <div className="machine-head-actions">
                    <button
                      type="button"
                      className="machine-recipes-button"
                      aria-label={`Show ${machines[selectedMachine.machineId].name} recipes`}
                      disabled={selectedMachineRecipeCount < 1}
                      onClick={handleOpenMachineRecipePopup}
                    >
                      <BookOpen size={14} />
                      <span>Recipes</span>
                      <strong>{selectedMachineRecipeCount}</strong>
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Close machine"
                      onClick={() => {
                        setPendingProcessInsert(null)
                        setIsArcStructureOpen(false)
                        setIsMachineAutomationOpen(false)
                        setIsMachineRecipePopupOpen(false)
                        setSelectedMachineUid(null)
                      }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
                {(selectedMachineCanConfigureRouting || selectedMachineCanRemove) && (
                  <div className="machine-terminal-actions" aria-label="Machine actions">
                    {selectedMachineCanConfigureRouting && (
                      <button type="button" onClick={handleOpenSelectedMachineRouting}>
                        <Route size={14} />
                        Routing
                      </button>
                    )}
                    {selectedMachineCanRemove && (
                      <button type="button" className="danger" onClick={handleRemoveSelectedMachine}>
                        <Trash2 size={14} />
                        Remove
                      </button>
                    )}
                  </div>
                )}
                {selectedMachineFluidBuffers.length > 0 && (
                  <div className="machine-terminal-tabs" role="tablist" aria-label="Terminal inventory view">
                    <button type="button" role="tab" aria-selected={machineTerminalMode === 'items'} className={machineTerminalMode === 'items' ? 'active' : ''} onClick={() => setMachineTerminalMode('items')}>Items</button>
                    <button type="button" role="tab" aria-selected={machineTerminalMode === 'fluids'} className={machineTerminalMode === 'fluids' ? 'active' : ''} onClick={() => setMachineTerminalMode('fluids')}><Droplet size={14} />Fluids</button>
                  </div>
                )}
                <div className="machine-terminal-body">
                {machineTerminalMode === 'items' && machineUsesProcessStorage(selectedMachine.machineId) && (
                <>
                  <div className={`processing-storage furnace-storage ${selectedMachineFluidBuffers.length > 0 ? 'fluid-capable-storage' : ''}`} aria-label={`${machines[selectedMachine.machineId].name} storage`}>
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
                {machineTerminalMode === 'fluids' && (
                  <>
                    <div className="processing-storage furnace-storage portable-fluid-storage" aria-label="Portable fluid containers">
                      {(['bucket', 'steelCell'] as FluidContainerKind[]).map((kind) => {
                        const resourceId: ResourceId = kind === 'bucket' ? 'bucket' : 'emptySteelCell'
                        const amount = availableResourceAmount(state, resourceId)
                        if (amount < 1) return null
                        const key = `empty:${kind}`
                        return (
                          <button type="button" className={selectedFluidContainerKey === key ? 'item-slot fluid-container-slot selected' : 'item-slot fluid-container-slot'} aria-label={`Empty ${kind === 'bucket' ? 'Bucket' : 'Steel Cell'} ${fluidContainerCapacities[kind]}L, ${formatAmount(amount)} stored`} onClick={() => setSelectedFluidContainerKey(key)} key={key}>
                            <PixelIcon id={resourceId} />
                            <span className="fluid-container-level">{fluidContainerCapacities[kind]}L</span>
                            <span className="item-count">{formatAmount(amount)}</span>
                          </button>
                        )
                      })}
                      {portableFluidGroups.map((group) => (
                        <button type="button" className={selectedFluidContainerKey === group.key ? 'item-slot fluid-container-slot selected' : 'item-slot fluid-container-slot'} aria-label={`${fluidLabel(group.fluidId)} ${group.kind === 'bucket' ? 'Bucket' : 'Steel Cell'} ${formatLitres(group.amountLitres)}L, ${formatAmount(group.count)} stored`} onClick={() => setSelectedFluidContainerKey(group.key)} key={group.key}>
                          <PixelIcon id={group.kind === 'bucket' ? 'bucket' : 'emptySteelCell'} />
                          <span className="fluid-container-tint" style={{ '--portable-fluid-color': fluidVisualColor(group.fluidId) } as CSSProperties} />
                          <span className="fluid-container-level">{formatLitres(group.amountLitres)}L</span>
                          <span className="item-count">{formatAmount(group.count)}</span>
                        </button>
                      ))}
                      {availableResourceAmount(state, 'bucket') < 1 && availableResourceAmount(state, 'emptySteelCell') < 1 && portableFluidGroups.length < 1 && (
                        <span className="empty-furnace-storage">No portable containers</span>
                      )}
                    </div>
                    <div className={selectedFluidContainerKey ? 'machine-selected-item active' : 'machine-selected-item'} aria-live="polite">
                      <span>Selected</span>
                      <strong>{selectedFluidContainerGroup
                        ? `${fluidLabel(selectedFluidContainerGroup.fluidId)} ${selectedFluidContainerGroup.kind === 'bucket' ? 'Bucket' : 'Steel Cell'} | ${formatLitres(selectedFluidContainerGroup.amountLitres)}L`
                        : selectedEmptyFluidContainerKind
                          ? `Empty ${selectedEmptyFluidContainerKind === 'bucket' ? 'Bucket' : 'Steel Cell'}`
                          : 'Tap a container above'}</strong>
                    </div>
                    <div className="generic-fluid-buffer-grid">
                      {selectedMachineFluidBuffers.map((buffer) => {
                        const storedFluidId = buffer.acceptedFluids.find((id) => (selectedMachine.process.fluids[id] ?? 0) > 0)
                        const preferredDirection = buffer.access === 'output' ? 'output' : 'input'
                        return <button
                          type="button"
                          className={`native-fluid-control ${canUseFluidPort(buffer, preferredDirection) ? 'ready' : ''}`}
                          disabled={!canUseFluidPort(buffer, preferredDirection)}
                          onClick={() => handleFluidPortPress(buffer, preferredDirection)}
                          key={buffer.id}
                        >
                          <FluidTank
                            label={storedFluidId ? fluidLabel(storedFluidId) : buffer.label}
                            storedLitres={storedFluidId ? selectedMachine.process.fluids[storedFluidId] ?? 0 : 0}
                            capacityLitres={buffer.capacityLitres}
                          />
                        </button>
                      })}
                    </div>
                  </>
                )}
                {!selectedMachineIsHmiTerminal && !selectedMachineUsesIntegratedStatus && (
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
                )}
                {selectedMachineCanAutomateItems && (
                  <button
                    type="button"
                    className={isMachineAutomationOpen ? 'machine-automation-toggle active' : 'machine-automation-toggle'}
                    aria-pressed={isMachineAutomationOpen}
                    onClick={() => setIsMachineAutomationOpen((current) => !current)}
                  >
                    <Route size={14} />
                    <span>{isMachineAutomationOpen ? 'Operating HMI' : 'Automation'}</span>
                    <strong>{selectedMachineAutomationStatus?.label}</strong>
                  </button>
                )}
                {isMachineAutomationOpen && selectedMachineCanAutomateItems ? (
                  <div className="lv-item-automation-hmi">
                    <div className="lv-automation-head">
                      <span><small>Item output</small><strong>{selectedMachine.itemOutputDirection ? pipeDirectionOffsets[selectedMachine.itemOutputDirection].label : 'Disabled'}</strong></span>
                      <span className={`lv-automation-state state-${selectedMachineAutomationStatus?.code ?? 'disabled'}`}><small>State</small><strong>{selectedMachineAutomationStatus?.label ?? 'Disabled'}</strong></span>
                    </div>
                    <div className="lv-automation-grid" aria-label="Automatic item output direction">
                      {[-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => {
                        const direction: PipeDirection | null = dx === 0 && dy === -1 ? 'north' : dx === 1 && dy === 0 ? 'east' : dx === 0 && dy === 1 ? 'south' : dx === -1 && dy === 0 ? 'west' : null
                        const isCenter = dx === 0 && dy === 0
                        if (!direction && !isCenter) return <span className="lv-automation-spacer" key={`${dx},${dy}`} />
                        if (isCenter) return <span className="lv-automation-machine" key="center"><MachineGlyph id={selectedMachine.machineId} active={Boolean(selectedMachine.process.activeRecipeId)} /><strong>{machines[selectedMachine.machineId].name}</strong></span>
                        const offset = pipeDirectionOffsets[direction!]
                        const neighbour = state.machineInstances.find((candidate) => candidate.x === selectedMachine.x + offset.dx && candidate.y === selectedMachine.y + offset.dy)
                        const selected = selectedMachine.itemOutputDirection === direction
                        const blockedByOutput = Boolean(neighbour && isLvItemAutomationMachine(neighbour.machineId) && neighbour.itemOutputDirection && neighbour.itemOutputDirection === ({ north: 'south', east: 'west', south: 'north', west: 'east' } as Record<PipeDirection, PipeDirection>)[direction!])
                        return <button
                            type="button"
                            className={['lv-automation-face', direction, selected ? 'selected' : '', blockedByOutput ? 'conflict' : ''].filter(Boolean).join(' ')}
                            aria-label={`${selected ? 'Disable' : 'Set'} automatic item output ${offset.label}`}
                            aria-pressed={selected}
                            onClick={() => setState((current) => setLvItemOutputDirection(current, selectedMachine.uid, direction!))}
                            key={direction}
                          >
                            {neighbour ? <MachineGlyph id={neighbour.machineId} /> : <span className="lv-automation-empty" />}
                            <b>{offset.label}</b>
                            {selected && <i aria-hidden="true" />}
                          </button>
                      }))}
                    </div>
                    <div className="lv-automation-route-readout">
                      <span><small>Destination</small><strong>{selectedMachineAutomationStatus?.target ? machines[selectedMachineAutomationStatus.target.machineId].name : 'None'}</strong></span>
                      <span><small>Rate</small><strong>1 item/s</strong></span>
                    </div>
                  </div>
                ) : isItemAutomationMachine(selectedMachine.machineId) ? (
                  <div className={`furnace-interface ${selectedMachine.machineId}-process-interface item-automation-interface`}>
                    <div className={isItemStorageMachine(selectedMachine.machineId) ? 'indexed-storage-grid chest-storage-grid' : 'furnace-inputs'}>
                      {isItemStorageMachine(selectedMachine.machineId) ? (
                        selectedMachine.process.storageSlots.map((slot, index) => (
                          <ProcessItemSlot slot={slot} label={`Slot ${index + 1}`} onClick={() => handleStorageSlotPress(selectedMachine.uid, index, slot)} key={`storage-${index}`} />
                        ))
                      ) : (
                        <>
                          <ProcessItemSlot slot={selectedMachine.process.input} label="Slot 1" onClick={() => handleProcessSlotPress('input')} />
                          <ProcessItemSlot slot={selectedMachine.process.secondaryInput} label="Slot 2" onClick={() => handleProcessSlotPress('secondaryInput')} />
                          <ProcessItemSlot slot={selectedMachine.process.fuel} label="Slot 3" onClick={() => handleProcessSlotPress('fuel')} />
                          <ProcessItemSlot slot={selectedMachine.process.output} label="Slot 4" onClick={() => handleProcessSlotPress('output')} />
                        </>
                      )}
                    </div>
                    <MachineGlyph id={selectedMachine.machineId} active={Boolean(selectedMachine.process.activeRecipeId || selectedMachine.process.storageSlots.some(Boolean) || selectedMachine.process.input)} />
                    {isItemHopperMachine(selectedMachine.machineId) && (
                      <span className="hopper-direction-line">
                        In: {pipeDirections
                          .filter((direction) => {
                            const mode = pipeSideMode(selectedMachine, direction)
                            return mode === 'input' || mode === 'both'
                          })
                          .map((direction) => pipeDirectionOffsets[direction].label)
                          .join(', ') || 'Closed'}
                        {' / '}
                        Out: {pipeDirections
                          .filter((direction) => {
                            const mode = pipeSideMode(selectedMachine, direction)
                            return mode === 'output' || mode === 'both'
                          })
                          .map((direction) => pipeDirectionOffsets[direction].label)
                          .join(', ') || 'Closed'}
                      </span>
                    )}
                  </div>
                ) : selectedMachine.machineId === 'well' ? (
                  <div className="well-interface water-source-interface utility-hmi">
                    <button type="button" className={`utility-vessel water-vessel native-fluid-control ${nativeFluidControlReady('water', 'output') ? 'ready' : ''}`} disabled={!nativeFluidControlReady('water', 'output')} onClick={() => handleNativeFluidControl('water', 'output')} aria-label={`Water buffer ${formatLitres(selectedMachine.process.fluids.water ?? 0)} of ${formatLitres(selectedMachine.process.fluidCapacityLitres || 128)} litres`}>
                      <span style={{ '--vessel-fill-scale': metricFill(selectedMachine.process.fluids.water ?? 0, selectedMachine.process.fluidCapacityLitres || 128) / 100 } as CSSProperties} />
                      <MachineGlyph id="well" active />
                    </button>
                    <div className="utility-readout-grid well-instrument-stack">
                      <div className="well-buffer-instrument" aria-label={`Water buffer ${formatLitres(selectedMachine.process.fluids.water ?? 0)} of ${formatLitres(selectedMachine.process.fluidCapacityLitres || 128)} litres`}>
                        <div className="well-buffer-gauge"><span style={{ height: `${metricFill(selectedMachine.process.fluids.water ?? 0, selectedMachine.process.fluidCapacityLitres || 128)}%` }} /></div>
                        <span><small>Water buffer</small><strong>{formatLitres(selectedMachine.process.fluids.water ?? 0)}L</strong><em>{formatLitres(selectedMachine.process.fluidCapacityLitres || 128)}L max</em></span>
                      </div>
                      <span><small>Recovery</small><strong>{formatAmount(wellWaterProductionLitresPerSecond)}L/s</strong><em>Ground water</em></span>
                      <span><small>Output</small><strong>{formatAmount(currentWellWaterFlowLitresPerSecond(state, selectedMachine))}L/s</strong><em>{currentWellWaterFlowLitresPerSecond(state, selectedMachine) > 0 ? 'Supplying network' : 'No demand'}</em></span>
                    </div>
                  </div>
                ) : selectedMachine.machineId === 'steamBoiler' ? (
                  <div className="boiler-hmi steam-boiler-hmi">
                    <div className="boiler-system-strip">
                      <span><small>Water feed</small><strong>{boilerHasWater(state, selectedMachine) ? 'Connected' : 'No water'}</strong></span>
                      <span><small>Steam out</small><strong>{formatAmount(boilerSteamProductionLitresPerSecond)}L/s</strong></span>
                      <span><small>Pressure</small><strong>{Math.floor(metricFill(selectedMachine.process.steamStoredMs, boilerSteamCapacityMs))}%</strong></span>
                    </div>
                    <div className="boiler-stage">
                      <div className={selectedMachine.process.fuelRemainingMs > 0 ? 'boiler-firebox active' : 'boiler-firebox'}>
                        <MachineGlyph id="steamBoiler" active={selectedMachine.process.fuelRemainingMs > 0} />
                        <ProcessItemSlot slot={selectedMachine.process.fuel} label="Fuel" onClick={() => handleProcessSlotPress('fuel')} />
                      </div>
                      <div className="boiler-buffer-bank">
                        <button
                          type="button"
                          className={`native-fluid-control ${nativeFluidControlReady('water', 'input') ? 'ready' : ''}`}
                          disabled={!nativeFluidControlReady('water', 'input')}
                          aria-label={`Transfer selected container into water feed, ${formatLitres(selectedMachine.process.fluids.water ?? 0)} of 128 litres`}
                          onClick={() => handleNativeFluidControl('water', 'input')}
                        >
                          <FluidTank label="Water feed" storedLitres={selectedMachine.process.fluids.water ?? 0} capacityLitres={128} />
                        </button>
                        <SteamTank storedMs={selectedMachine.process.steamStoredMs} capacityMs={boilerSteamCapacityMs} />
                      </div>
                    </div>
                    <div className="boiler-load-rail"><span style={{ width: `${selectedMachine.process.fuelDurationMs > 0 ? metricFill(selectedMachine.process.fuelRemainingMs, selectedMachine.process.fuelDurationMs) : 0}%` }} /><strong>Load</strong><em>{selectedMachine.process.activeRecipeId ? 'Making steam' : machineStatus(state, selectedMachine)}</em></div>
                  </div>
                ) : selectedMachine.machineId === 'steamTank' ? (
                  <div className="well-interface tank-terminal-interface utility-hmi iron-tank-hmi">
                    {(() => {
                      const fluid = selectedMachineStoredFluids[0]
                      const isSteam = selectedMachine.process.steamStoredMs > 0 || !fluid
                      const amount = isSteam ? formatSteamLitres(selectedMachine.process.steamStoredMs) : fluid?.amount ?? 0
                      const capacity = isSteam ? formatSteamLitres(selectedSteamTankCapacityMs) : selectedSteamTankFluidCapacityLitres
                      const outputFaces = pipeDirections.filter((direction) => pipeSideMode(selectedMachine, direction) === 'output').map((direction) => pipeDirectionOffsets[direction].label)
                      const fluidOutflow = currentFluidOutputFlows(state, selectedMachine).reduce((sum, flow) => sum + flow.litresPerSecond, 0)
                      return <>
                        <button type="button" className={`utility-vessel iron-tank-vessel native-fluid-control ${isSteam ? 'steam-contents' : 'fluid-contents'} ${nativeFluidControlReady('storage') ? 'ready' : ''}`} disabled={!nativeFluidControlReady('storage')} onClick={() => handleNativeFluidControl('storage')}>
                          <span style={{ '--vessel-fill-scale': metricFill(amount, capacity) / 100 } as CSSProperties} />
                          <MachineGlyph id="steamTank" active={amount > 0} />
                          <strong>{isSteam ? 'Steam' : fluidLabel(fluid!.id)}</strong>
                        </button>
                        <div className="utility-readout-grid">
                          <span><small>Contents</small><strong>{isSteam ? 'Steam' : fluidLabel(fluid!.id)}</strong><em>Single fluid tank</em></span>
                          <span><small>Stored</small><strong>{formatLitres(amount)}L</strong><em>{formatLitres(capacity)}L max</em></span>
                          <span><small>Structure</small><strong>{selectedMachine.level > 1 ? `${selectedMachine.level} blocks` : 'Single tank'}</strong><em>Capacity scales with size</em></span>
                          <span><small>Output</small><strong>{outputFaces.join(', ') || 'Closed'}</strong><em>{formatAmount(fluidOutflow)}L/s live · {machines[selectedMachine.machineId].fluidOutputLitresPerSecond ?? 0}L/s max</em></span>
                        </div>
                      </>
                    })()}
                  </div>
                ) : isSteamPipeMachine(selectedMachine.machineId) ? (
                  (() => {
                    const fluid = selectedMachineStoredFluids[0]
                    const hasSteam = selectedMachine.process.steamStoredMs > 0
                    const contents = hasSteam ? 'Steam' : fluid ? fluidLabel(fluid.id) : 'Empty'
                    const stored = hasSteam ? formatSteamLitres(selectedMachine.process.steamStoredMs) : fluid?.amount ?? 0
                    const capacity = hasSteam
                      ? formatSteamLitres(selectedMachine.process.steamCapacityMs || steamPipeBufferCapacityMs(selectedMachine.machineId))
                      : selectedMachine.process.fluidCapacityLitres || fluidPipeBufferCapacityLitres(selectedMachine.machineId)
                    const fluidFlow = fluid ? currentFluidOutputFlows(state, selectedMachine).find((flow) => flow.fluidId === fluid.id)?.litresPerSecond ?? 0 : 0
                    const flow = hasSteam ? currentSteamPipeFlowLitresPerSecond(state, selectedMachine) : fluidFlow
                    const inputFaces = pipeDirections.filter((direction) => ['input', 'both'].includes(pipeSideMode(selectedMachine, direction))).map((direction) => pipeDirectionOffsets[direction].label)
                    const outputFaces = pipeDirections.filter((direction) => ['output', 'both'].includes(pipeSideMode(selectedMachine, direction))).map((direction) => pipeDirectionOffsets[direction].label)
                    return <div className={`pipe-terminal-interface pipe-hmi ${flow > 0 ? 'is-flowing' : ''} ${hasSteam ? 'contains-steam' : fluid ? 'contains-fluid' : 'is-empty'}`}>
                      <div className="pipe-route-strip">
                        <span><small>In</small><strong>{inputFaces.length === 4 ? 'All faces' : inputFaces.join(', ') || 'Closed'}</strong></span>
                        <span><small>Contents</small><strong>{contents}</strong></span>
                        <span><small>Out</small><strong>{outputFaces.length === 4 ? 'All faces' : outputFaces.join(', ') || 'Closed'}</strong></span>
                      </div>
                      <div className="pipe-sight-stage" style={{ '--pipe-medium': fluidVisualColor(fluid?.id), '--pipe-fill-scale': Math.max(0.08, metricFill(stored, capacity) / 100) } as CSSProperties}>
                        <div className="pipe-live-medium" aria-hidden="true"><span /></div>
                        <div className="pipe-stage-readout"><span>{formatLitres(stored)}L</span><small>{formatLitres(capacity)}L internal</small></div>
                      </div>
                      <div className="pipe-data-strip">
                        <span><small>Flow</small><strong>{formatAmount(flow)}L/s</strong></span>
                        <span><small>Limit</small><strong>{steamPipeTransferLitresPerSecond[selectedMachine.machineId] ?? 0}L/s</strong></span>
                        <span><small>State</small><strong>{flow > 0 ? 'Transferring' : contents === 'Empty' ? 'Empty' : 'Holding'}</strong></span>
                      </div>
                    </div>
                  })()
                ) : isEuCableMachine(selectedMachine.machineId) ? (
                  <div className={`cable-terminal-interface cable-hmi ${currentEuCableFlowEuPerSecond(state, selectedMachine) > 0 ? 'is-flowing' : ''}`}>
                    <div className="cable-route-strip">
                      <span><small>Rating</small><strong>{machines[selectedMachine.machineId].euAmps ?? 1}A LV</strong></span>
                      <span><small>Flow</small><strong>{formatAmount(currentEuCableFlowEuPerSecond(state, selectedMachine))} EU/s</strong></span>
                      <span><small>Loss</small><strong>{tinCableLossEuPerTile} EU/tile</strong></span>
                    </div>
                    <div className="cable-cutaway-stage"><span className="cable-current" aria-hidden="true" /></div>
                    <div className="cable-data-strip">
                      <EnergyTank storedEu={selectedMachine.process.euStored} capacityEu={selectedMachine.process.euCapacity || euCableBufferCapacity(selectedMachine.machineId)} />
                      <span><small>Route</small><strong>{currentEuCableFlowEuPerSecond(state, selectedMachine) > 0 ? 'Energized' : selectedMachine.process.euStored > 0 ? 'Charged' : 'No supply'}</strong></span>
                    </div>
                  </div>
                ) : isLiquidSteamBoilerMachine(selectedMachine.machineId) ? (
                  <div className="boiler-hmi liquid-boiler-interface">
                    <div className="boiler-system-strip">
                      <span><small>Creosote</small><strong>{formatLitres(selectedMachine.process.fluids.creosote ?? 0)}L</strong></span>
                      <span><small>Inputs</small><strong>{formatAmount(liquidSteamBoilerCreosoteUseLitresPerSecond)}L/s fuel</strong><em>{formatAmount(boilerSteamProductionLitresPerSecond)}L/s water</em></span>
                      <span><small>Steam out</small><strong>{formatAmount(liquidSteamBoilerSteamProductionLitresPerSecond)}L/s</strong></span>
                    </div>
                    <div className="dual-boiler-vessels">
                      <button type="button" className={`native-fluid-control ${nativeFluidControlReady('creosote', 'input') ? 'ready' : ''}`} disabled={!nativeFluidControlReady('creosote', 'input')} onClick={() => handleNativeFluidControl('creosote', 'input')}>
                        <FluidTank label={fluidLabel('creosote')} storedLitres={selectedMachine.process.fluids.creosote ?? 0} capacityLitres={liquidSteamBoilerFluidCapacityLitres} />
                      </button>
                      <div className="liquid-boiler-core"><MachineGlyph id="liquidSteamBoiler" active={Boolean(selectedMachine.process.activeRecipeId)} /></div>
                      <SteamTank storedMs={selectedMachine.process.steamStoredMs} capacityMs={liquidSteamBoilerCapacityMs} />
                    </div>
                    <div className="boiler-load-rail"><span style={{ width: `${selectedMachine.process.activeRecipeId ? 100 : 0}%` }} /><strong>Load</strong><em>{machineStatus(state, selectedMachine)}</em></div>
                  </div>
                ) : isEuStorageMachine(selectedMachine.machineId) ? (
                  <div className="well-interface battery-buffer-interface">
                    <EnergyTank
                      storedEu={selectedMachine.process.euStored}
                      capacityEu={Math.max(1, selectedMachine.process.euCapacity)}
                    />
                    <MachineGlyph id={selectedMachine.machineId} active={selectedMachine.process.euStored > 0} />
                    <div className="buffer-cell-controls">
                      {(() => {
                        const installedCount = batteryBufferInstalledBatteries(selectedMachine)
                        const slotCount = batteryBufferSlots(selectedMachine.machineId)
                        return (
                          <>
                      <div className="buffer-cell-grid" aria-label="Installed buffer batteries">
                        {Array.from({ length: slotCount }).map((_, index) => {
                          const batteryId = selectedMachine.process.batterySlots[index]
                          return <button
                            type="button"
                            className={batteryId ? 'mini-slot buffer-cell-slot filled' : 'mini-slot buffer-cell-slot empty'}
                            title={batteryId ? `Remove ${resourceLabels[batteryId]}` : 'Insert selected battery'}
                            onClick={() => batteryId
                              ? handleRemoveBufferBattery(selectedMachine.uid, index)
                              : selectedMachineStorageResource && (selectedMachineStorageResource === 'sodiumBattery' || selectedMachineStorageResource === 'lithiumBattery')
                                ? handleInstallBufferBattery(selectedMachine.uid, selectedMachineStorageResource)
                                : undefined}
                            key={`buffer-cell-${index}`}
                          >
                            {batteryId ? (
                              <>
                                <PixelIcon id={batteryId} />
                                <span className="item-count">1</span>
                              </>
                            ) : (
                              <span className="process-slot-label">Cell</span>
                            )}
                          </button>
                        })}
                      </div>
                      <span>
                        Cells {installedCount}/{slotCount} | {formatAmount(selectedMachine.process.euCapacity)} EU total | Output {Math.min(installedCount, slotCount) * lvBatteryBufferOutputEuPerSecond} EU/s
                      </span>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                ) : isEuProducerMachine(selectedMachine.machineId) ? (
                  <div className="boiler-hmi turbine-interface">
                    <div className="boiler-system-strip">
                      <span><small>Steam draw</small><strong>{formatAmount(steamTurbineSteamUseLitresPerSecond)}L/s</strong></span>
                      <span><small>Generation</small><strong>{formatAmount(steamTurbineSteamUseLitresPerSecond * 2)} EU/s</strong></span>
                      <span><small>Route</small><strong>{machines[selectedMachine.machineId].euAmps ?? 1}A LV</strong></span>
                    </div>
                    <div className="turbine-generator-stage">
                      <MachineGlyph id={selectedMachine.machineId} active={selectedMachine.process.activeRecipeId === 'generate_lv_eu'} />
                      <EnergyTank storedEu={selectedMachine.process.euStored} capacityEu={steamTurbineEuCapacity} />
                    </div>
                    <div className="boiler-load-rail"><span style={{ width: `${metricFill(selectedMachine.process.euStored, steamTurbineEuCapacity)}%` }} /><strong>Load</strong><em>{machineStatus(state, selectedMachine)}</em></div>
                  </div>
                ) : selectedMachine.machineId === 'lvAssembler' ? (
                  <div className="furnace-interface lvAssembler-process-interface">
                    <div className="assembler-stage-lot" aria-label={`Assembler stage ${selectedMachineStatusLabel}`}>
                      <span className="assembler-stage-press" aria-hidden="true" />
                      <span className="assembler-stage-table" aria-hidden="true" />
                      <span className={selectedMachine.process.activeRecipeId ? 'assembler-stage-indicator active' : 'assembler-stage-indicator'} aria-hidden="true" />
                      <span className="assembler-stage-state">{assemblerStageLabel}</span>
                    </div>
                    <div className="assembler-item-grid" aria-label="Assembler item inputs">
                      <ProcessItemSlot slot={selectedMachine.process.input} label="Input 1" onClick={() => handleProcessSlotPress('input')} />
                      <ProcessItemSlot slot={selectedMachine.process.secondaryInput} label="Input 2" onClick={() => handleProcessSlotPress('secondaryInput')} />
                      <ProcessItemSlot slot={selectedMachine.process.extraInput1} label="Input 3" onClick={() => handleProcessSlotPress('extraInput1')} />
                      <ProcessItemSlot slot={selectedMachine.process.extraInput2} label="Input 4" onClick={() => handleProcessSlotPress('extraInput2')} />
                      <ProcessItemSlot slot={selectedMachine.process.extraInput3} label="Input 5" onClick={() => handleProcessSlotPress('extraInput3')} />
                      <ProcessItemSlot slot={selectedMachine.process.extraInput4} label="Input 6" onClick={() => handleProcessSlotPress('extraInput4')} />
                      <button
                        type="button"
                        className={`assembler-fluid-lot native-fluid-control ${nativeFluidControlReady('input', 'input') ? 'ready' : ''}`}
                        disabled={!nativeFluidControlReady('input', 'input')}
                        onClick={() => handleNativeFluidControl('input', 'input')}
                        aria-label="Assembler fluid lot"
                        style={
                          {
                            '--assembler-fluid-fill': `${Math.min(
                              100,
                              ((assemblerFluid?.amount ?? 0) / assemblerFluidCapacityLitres) * 100,
                            )}%`,
                          } as CSSProperties
                        }
                      >
                        <span>Fluid</span>
                        <strong>{formatLitres(assemblerFluid?.amount ?? 0)}L</strong>
                        <small>{assemblerFluid ? fluidLabel(assemblerFluid.id) : `${assemblerFluidCapacityLitres}L`}</small>
                      </button>
                    </div>
                    <div className="assembler-stage-readouts" aria-label="Assembler process readouts">
                      <span>
                        <small>Uses</small>
                        <strong>{assemblerDrawMetric?.value ?? '0 EU/s'}</strong>
                        <em>{selectedMachine.process.activeRecipeId ? 'Active draw' : 'Machine idle'}</em>
                      </span>
                      <span>
                        <small>Time</small>
                        <strong>{selectedMachineProcessTimeLabel || '--'}</strong>
                        <em>{selectedMachine.process.activeRecipeId ? 'Craft remaining' : 'Awaiting recipe'}</em>
                      </span>
                      <span>
                        <small>Power</small>
                        <strong>{assemblerSupplyMetric?.value ?? '0 EU'}</strong>
                        <em>{assemblerSupplyMetric?.detail ?? '0A route'}</em>
                      </span>
                    </div>
                    <div className="assembler-energy-lot" aria-label={`Assembler EU buffer ${Math.floor(selectedMachine.process.euStored)} of ${Math.floor(assemblerEuCapacity)}`}>
                      <div className="assembler-buffer-meter" aria-hidden="true">
                        <span style={{ height: `${assemblerEuFillPercent}%` }} />
                      </div>
                      <div>
                        <span>EU Buffer</span>
                        <strong>{Math.floor(selectedMachine.process.euStored)} EU</strong>
                        <small>Max {Math.floor(assemblerEuCapacity)}</small>
                      </div>
                    </div>
                    <div className="assembler-load-rail" aria-label={`Assembler load ${Math.floor(selectedMachineProgressPercent)} percent`}>
                      <span
                        style={{
                          width: `${selectedMachineProgressPercent}%`,
                        }}
                      />
                      <strong>Load</strong>
                      <em>{Math.floor(selectedMachineProgressPercent)}%</em>
                    </div>
                    <div className="assembler-output-lot" aria-label="Assembler output">
                      {selectedMachineRecipe?.machineOutput && !selectedMachine.process.output ? (
                        <span className="process-slot filled" aria-label={`${machines[selectedMachineRecipe.machineOutput.id].name} will be sent to Factory Parts`}>
                          <MachineGlyph id={selectedMachineRecipe.machineOutput.id} />
                          <span className="process-slot-label">Factory Parts</span>
                        </span>
                      ) : <ProcessItemSlot slot={selectedMachine.process.output} label="Output" onClick={() => handleProcessSlotPress('output')} />}
                    </div>
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
                    {selectedMachine.machineId === 'lvAutoMiner' && (
                      <div className="auto-miner-card-inventory" aria-label="Auto miner Survey Card inventory">
                        <span><small>Miner inventory</small><strong>Survey Card</strong></span>
                        {selectedMachine.surveyCardTarget ? (
                          <button
                            type="button"
                            className="auto-miner-card-slot installed"
                            aria-label={`Remove ${gatherTargets[selectedMachine.surveyCardTarget].name} Survey Card`}
                            onClick={() => handleRemoveAutoMinerSurveyCard(selectedMachine.uid)}
                          >
                            <span><PixelIcon id="surveyKit" /><PixelIcon id={gatherTargets[selectedMachine.surveyCardTarget].drops[0].id} /></span>
                            <strong>{gatherTargets[selectedMachine.surveyCardTarget].name}</strong>
                            <small>Tap to return</small>
                          </button>
                        ) : (
                          <button type="button" className="auto-miner-card-slot" onClick={() => setIsAutoMinerTargetOpen(true)}>
                            <span className="empty-card-slot">Empty</span>
                            <strong>No card installed</strong>
                            <small>Open selector</small>
                          </button>
                        )}
                      </div>
                    )}
                    <span>
                      {state.autoMinerAssignments[selectedMachine.uid]
                        ? `Assigned to ${gatherTargets[state.autoMinerAssignments[selectedMachine.uid]].name} | ${
                            selectedMachine.machineId === 'steamAutoMiner' ? steamAutoMinerActionDamage : lvAutoMinerActionDamage
                          } damage every ${formatDuration(selectedMachine.machineId === 'steamAutoMiner' ? steamAutoMinerActionMs : lvAutoMinerActionMs)}`
                        : 'Choose a deposit from this terminal.'}
                    </span>
                    <div className="auto-miner-readout-grid">
                      <span><small>Target</small><strong>{state.autoMinerAssignments[selectedMachine.uid] ? gatherTargets[state.autoMinerAssignments[selectedMachine.uid]].name : 'Unassigned'}</strong></span>
                      <span><small>Cycle</small><strong>{formatDuration(selectedMachine.machineId === 'steamAutoMiner' ? steamAutoMinerActionMs : lvAutoMinerActionMs)}</strong></span>
                      <span><small>Yield</small><strong>{selectedMachine.machineId === 'steamAutoMiner' ? steamAutoMinerActionDamage : lvAutoMinerActionDamage} damage</strong></span>
                    </div>
                    <div className="auto-miner-output" aria-label={`Auto miner internal inventory ${formatAmount(selectedMachine.process.output?.amount ?? 0)} of ${processStackLimit}`}>
                      <span>Output</span>
                      <ProcessItemSlot slot={selectedMachine.process.output} label="Output" onClick={() => handleProcessSlotPress('output')} />
                      <strong>Internal inventory {formatAmount(selectedMachine.process.output?.amount ?? 0)}/{processStackLimit}</strong>
                    </div>
                    <button type="button" className="load-recipe-button auto-miner-assign" onClick={() => setIsAutoMinerTargetOpen(true)}>
                      {state.autoMinerAssignments[selectedMachine.uid] ? 'Change target' : 'Choose target'}
                    </button>
                    {isAutoMinerTargetOpen && (
                      <div className="auto-miner-target-popover" role="region" aria-label={`${machines[selectedMachine.machineId].name} target selection`}>
                        <div className="auto-miner-target-head">
                          <span><small>Survey console</small><strong>Select deposit</strong></span>
                          <button type="button" className="icon-button" aria-label="Close target selection" onClick={() => setIsAutoMinerTargetOpen(false)}>
                            <X size={16} />
                          </button>
                        </div>
                        <div className="auto-miner-target-list">
                          {selectedAutoMinerTargets.map((target) => {
                            const needsSurveyCard = selectedMachine.machineId === 'lvAutoMiner' && !canAutoMinerTarget('steamAutoMiner', target.id)
                            const hasSurveyCard = (state.surveyCards[target.id] ?? 0) > 0
                            const cardInstalled = selectedMachine.surveyCardTarget === target.id
                            const reachGateOffline = target.area === 'shatteredReach' && !isReachGateFormed(state)
                            const unavailable = reachGateOffline || (needsSurveyCard && !cardInstalled && !hasSurveyCard)
                            const isAssigned = state.autoMinerAssignments[selectedMachine.uid] === target.id
                            const profileLabel = reachGateOffline
                              ? 'Reach Gate offline'
                              : needsSurveyCard
                                ? cardInstalled ? 'Card installed in miner' : hasSurveyCard ? 'Card in inventory' : 'Survey Card required'
                                : selectedMachine.machineId === 'steamAutoMiner' ? 'Steam profile' : 'Basic profile'
                            return (
                              <button
                                type="button"
                                className={isAssigned ? 'auto-miner-target-option selected' : 'auto-miner-target-option'}
                                disabled={unavailable}
                                aria-pressed={isAssigned}
                                onClick={() => {
                                  if (needsSurveyCard && !cardInstalled) {
                                    handleInstallAutoMinerSurveyCard(selectedMachine.uid, target.id)
                                    return
                                  }
                                  handleAssignAutoMiner(selectedMachine.uid, target.id)
                                }}
                                key={target.id}
                              >
                                <span className="auto-miner-target-icon"><PixelIcon id={target.drops[0].id} /></span>
                                <span><strong>{target.name}</strong><small>{target.area === 'shatteredReach' ? 'Shattered Reach' : 'Mine'} | {profileLabel}</small></span>
                                <em>{isAssigned ? 'Selected' : unavailable ? 'Locked' : needsSurveyCard && !cardInstalled ? 'Install' : 'Select'}</em>
                              </button>
                            )
                          })}
                        </div>
                        {state.autoMinerAssignments[selectedMachine.uid] && (
                          <button type="button" className="auto-miner-clear-target" onClick={() => handleUnassignAutoMiner(selectedMachine.uid)}>
                            Clear assignment
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : selectedMachine.machineId === 'cokeOven' || selectedMachine.machineId === 'brickedBlastFurnace' || selectedMachine.machineId === 'arcBlastFurnace' ? (
                  (() => {
                    const process = selectedMachine.process
                    const isCokeOven = selectedMachine.machineId === 'cokeOven'
                    const isBbf = selectedMachine.machineId === 'brickedBlastFurnace'
                    const isArc = selectedMachine.machineId === 'arcBlastFurnace'
                    const progress = process.durationMs > 0 ? metricFill(process.progressMs, process.durationMs) : 0
                    const activeRecipe = processRecipes.find((recipe) => recipe.id === process.activeRecipeId)
                    const fluidProductionRate = activeRecipe?.fluidOutput ? activeRecipe.fluidOutput.amount / (activeRecipe.durationMs / 1000) : 0
                    const fluidOutflow = isCokeOven ? currentFluidOutputFlows(state, selectedMachine).find((flow) => flow.fluidId === 'creosote')?.litresPerSecond ?? 0 : 0
                    if (isArc && isArcStructureOpen && selectedArcStructure) {
                      return <div className="arc-structure-inspector">
                        <div className="arc-structure-toolbar">
                          <span><small>Structure</small><strong>{selectedArcStructure.formed ? 'Formed 3x3' : 'Incomplete'}</strong></span>
                          <button type="button" onClick={() => setIsArcStructureOpen(false)}>Operating HMI</button>
                        </div>
                        <div className="arc-structure-grid" aria-label="Arc Furnace 3x3 structure">
                          {selectedArcStructure.positions.map((position) => {
                            const cell = state.machineInstances.find((candidate) => candidate.x === position.x && candidate.y === position.y)
                            const isControllerCell = position.x === selectedArcStructure.controller.x && position.y === selectedArcStructure.controller.y
                            const outward: PipeDirection[] = []
                            if (position.x < selectedArcStructure.controller.x) outward.push('west')
                            if (position.x > selectedArcStructure.controller.x) outward.push('east')
                            if (position.y < selectedArcStructure.controller.y) outward.push('north')
                            if (position.y > selectedArcStructure.controller.y) outward.push('south')
                            const isPort = Boolean(cell && cell.machineId !== 'arcBlastFurnacePart' && cell.machineId !== 'arcBlastFurnace')
                            return <span className={`arc-structure-cell ${cell ? 'installed' : 'missing'} ${isControllerCell ? 'controller' : ''}`} key={`${position.x},${position.y}`}>
                              {cell ? <MachineGlyph id={cell.machineId} /> : <b>Missing</b>}
                              <strong>{cell ? machines[cell.machineId].name : 'Empty position'}</strong>
                              {cell?.machineId === 'lvEnergyHatch2A' && <small>{Math.floor(cell.process.euStored)} / 128 EU</small>}
                              {(cell?.machineId === 'lvFluidInputHatch' || cell?.machineId === 'lvFluidOutputHatch') && <small>{storedFluids(cell.process)[0]?.amount ?? 0} / 64L</small>}
                              {isPort && <i>{outward.map((direction) => <button
                                type="button"
                                className={pipeSideMode(cell!, direction) === 'blocked' ? '' : 'active'}
                                aria-label={`Use ${pipeDirectionOffsets[direction].label} face for ${machines[cell!.machineId].name}`}
                                onClick={() => setState((current) => setPipeSideMode(current, cell!.uid, direction, 'both'))}
                                key={direction}
                              >{pipeDirectionOffsets[direction].label.slice(0, 1)}</button>)}</i>}
                            </span>
                          })}
                        </div>
                        <div className="arc-structure-faults">
                          {(selectedArcStructure.faults.length > 0 ? selectedArcStructure.faults : ['All required components installed.']).map((fault) => <span key={fault}>{fault}</span>)}
                        </div>
                      </div>
                    }
                    return <div className={`multiblock-hmi ${isArc ? 'arc-multiblock-hmi' : isBbf ? 'bbf-multiblock-hmi' : 'coke-multiblock-hmi'}`}>
                      {isArc && <button type="button" className="arc-structure-open" onClick={() => setIsArcStructureOpen(true)}><LayoutGrid size={15} />Structure</button>}
                      <div className="multiblock-stat-strip">
                        <span><small>State</small><strong>{isArc && !selectedArcStructure?.formed ? 'Incomplete' : machineStatus(state, selectedMachine)}</strong>{isArc && selectedArcStructure && !selectedArcStructure.formed && <em>{selectedArcStructure.faults[0]}</em>}</span>
                        <span><small>Time</small><strong>{selectedMachineProcessTimeLabel || '--'}</strong></span>
                        <span><small>{isArc ? 'Power' : isBbf ? 'Heat' : 'Byproduct'}</small><strong>{isArc ? `${formatAmount(selectedMachineEuUsagePerSecond)} EU/s` : isBbf ? (process.fuelRemainingMs > 0 ? 'Hot' : 'Cold') : `${formatLitres(process.fluids.creosote ?? 0)}L creosote`}</strong>{isCokeOven && <em>{formatAmount(fluidProductionRate)}L/s made · {formatAmount(fluidOutflow)}L/s out</em>}</span>
                      </div>
                      {isArc && (
                        <div className="arc-program-control" aria-label="Arc Furnace recipe program">
                          {[
                            { id: null, number: 0, label: 'Auto' },
                            { id: 'arc_blast_oxygen_steel', number: 1, label: 'Oxygen Steel' },
                            { id: 'arc_blast_nitrogen_aluminium', number: 2, label: 'Nitrogen Aluminium' },
                          ].map((program) => {
                            const selected = process.configuredRecipeId === program.id
                            return <button
                              type="button"
                              className={selected ? 'selected' : ''}
                              aria-pressed={selected}
                              disabled={process.progressMs > 0}
                              onClick={() => setState((current) => setConfiguredProcessRecipe(current, selectedMachine.uid, program.id))}
                              key={program.number}
                            ><b>{program.number}</b><span>{program.label}</span></button>
                          })}
                        </div>
                      )}
                      {isArc && selectedArcStructure && (
                        <div className="arc-hatch-strip" aria-label="Arc Furnace Energy Hatches">
                          {selectedArcStructure.energyHatches.map((hatch, index) => (
                            <span key={hatch.uid}>
                              <small>Hatch {index + 1} | 2A</small>
                              <strong>{Math.floor(hatch.process.euStored)} / 128 EU</strong>
                              <i><b style={{ width: `${metricFill(hatch.process.euStored, 128)}%` }} /></i>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="multiblock-stage">
                        <div className="multiblock-input-bank">
                          <ProcessItemSlot slot={process.input} label="Input" onClick={() => handleProcessSlotPress('input')} />
                          {isBbf && <ProcessItemSlot slot={process.fuel} label="Coke" onClick={() => handleProcessSlotPress('fuel')} />}
                        </div>
                        <div className="multiblock-core-state"><span className={process.activeRecipeId ? 'active' : ''} /></div>
                        <div className="multiblock-output-bank">
                          {isCokeOven && <button type="button" className={`native-fluid-control ${nativeFluidControlReady('creosote', 'output') ? 'ready' : ''}`} disabled={!nativeFluidControlReady('creosote', 'output')} onClick={() => handleNativeFluidControl('creosote', 'output')}><FluidTank label={fluidLabel('creosote')} storedLitres={process.fluids.creosote ?? 0} capacityLitres={process.fluidCapacityLitres || cokeOvenFluidCapacityLitres} /></button>}
                          {isArc && <EnergyTank storedEu={process.euStored} capacityEu={process.euCapacity || 256} />}
                          <ProcessItemSlot slot={process.output} label="Output" onClick={() => handleProcessSlotPress('output')} />
                        </div>
                      </div>
                      <div className="multiblock-load-rail"><span style={{ width: `${progress}%` }} /><strong>Load</strong><em>{Math.floor(progress)}%</em></div>
                    </div>
                  })()
                ) : selectedMachineIsHmiTerminal ? (
                  (() => {
                    const isSteamHmi = isSteamPoweredMachine(selectedMachine.machineId)
                    const process = selectedMachine.process
                    const hmiRunningLabel = selectedMachineHmiConfig?.runningLabel ?? 'Running'
                    const hmiUsesSecondaryInput = Boolean(selectedMachineHmiConfig?.secondaryInput)
                    const hmiSystemLabel = isSteamHmi ? 'Pressure' : 'Power'
                    const isChemicalReactor = selectedMachine.machineId === 'lvChemicalReactor'
                    const chemicalFluidOutput = isChemicalReactor ? storedFluids(process)[0] : undefined
                    const chemicalFluidCapacity = process.fluidCapacityLitres || 32
                    const progressPercent =
                      process.durationMs > 0 ? Math.min(100, Math.max(0, (process.progressMs / process.durationMs) * 100)) : 0
                    const bufferCurrent = isSteamHmi ? formatSteamLitres(process.steamStoredMs) : Math.floor(process.euStored)
                    const bufferCapacity = isSteamHmi
                      ? formatSteamLitres(process.steamCapacityMs || steamMachineInternalCapacityMs)
                      : Math.floor(process.euCapacity || 0)
                    const bufferPercent = isSteamHmi
                      ? metricFill(process.steamStoredMs, process.steamCapacityMs || steamMachineInternalCapacityMs)
                      : metricFill(process.euStored, process.euCapacity || 0)
                    const usageValue = isSteamHmi
                      ? `${formatAmount(selectedMachineSteamUsagePerSecond)}L/s`
                      : `${formatAmount(selectedMachineEuUsagePerSecond)} EU/s`
                    const timeValue = selectedMachineProcessTimeLabel || (selectedMachineRecipe ? formatDuration(selectedMachineRecipe.durationMs) : '--')
                    const statusLabel = machineStatus(state, selectedMachine)
                    const chamberStyle = {
                      '--machine-hmi-chamber-image': `url("${machineUiChamberSrc(selectedMachine.machineId)}")`,
                    } as CSSProperties
                    return (
                      <div
                        className={[
                          'forge-hammer-interface',
                          `${selectedMachineHmiKind ?? 'machine'}-hmi`,
                          isSteamHmi ? 'steam-forge-hmi' : 'lv-forge-hmi',
                          selectedMachine.machineId,
                        ].join(' ')}
                        style={chamberStyle}
                      >
                        <div className="forge-hmi-status">
                          <span>{hmiSystemLabel}</span>
                          <strong>{statusLabel}</strong>
                        </div>
                        <div className="forge-hammer-chamber" aria-label={`${machines[selectedMachine.machineId].name} process chamber`}>
                          <span className="forge-chamber-light" aria-hidden="true" />
                          <span className="forge-hammer-rail left" aria-hidden="true" />
                          <span className="forge-hammer-rail right" aria-hidden="true" />
                          <span className="forge-hammer-ram" aria-hidden="true" />
                          <span className="forge-hammer-ingot" aria-hidden="true" />
                          <span className="forge-hammer-anvil" aria-hidden="true" />
                          <span className="forge-hammer-particles" aria-hidden="true" />
                          <MachineGlyph id={selectedMachine.machineId} active={Boolean(process.activeRecipeId)} />
                        </div>
                        <div className="forge-buffer-panel" aria-label={`${isSteamHmi ? 'Steam' : 'EU'} buffer ${bufferCurrent} of ${bufferCapacity}`}>
                          <span>Buffer</span>
                          <strong>
                            {bufferCurrent}
                            <small>{isSteamHmi ? 'L' : 'EU'}</small>
                          </strong>
                          <div className="forge-buffer-meter">
                            <span style={{ height: `${bufferPercent}%` }} />
                          </div>
                          <em>{bufferCapacity}{isSteamHmi ? 'L max' : 'EU max'}</em>
                        </div>
                        <div className={['forge-io-slot', 'forge-input-slot', hmiUsesSecondaryInput ? 'dual-inputs' : ''].join(' ')}>
                          <span>Input</span>
                          <ProcessItemSlot slot={process.input} label="Input" onClick={() => handleProcessSlotPress('input')} />
                          {hmiUsesSecondaryInput && (
                            <ProcessItemSlot slot={process.secondaryInput} label="Input 2" onClick={() => handleProcessSlotPress('secondaryInput')} />
                          )}
                        </div>
                        <div className="forge-readout-stack">
                          <div className="forge-readout">
                            <span>Uses</span>
                            <strong>{usageValue}</strong>
                          </div>
                          <div className="forge-readout">
                            <span>Time</span>
                            <strong>{timeValue}</strong>
                          </div>
                          <div className="forge-readout">
                            <span>{hmiSystemLabel}</span>
                            <strong>{statusLabel === 'Running' ? 'OK' : statusLabel}</strong>
                          </div>
                        </div>
                        <div className="forge-io-slot forge-output-slot">
                          <span>Output</span>
                          {isChemicalReactor && !process.output ? (
                            chemicalFluidOutput ? (
                              <button
                                type="button"
                                className={`chemical-fluid-output native-fluid-control ${nativeFluidControlReady('reaction') ? 'ready' : ''}`}
                                disabled={!nativeFluidControlReady('reaction')}
                                onClick={() => handleNativeFluidControl('reaction')}
                                aria-label={`${fluidLabel(chemicalFluidOutput.id)} output ${formatLitres(chemicalFluidOutput.amount)} of ${formatLitres(chemicalFluidCapacity)} litres`}
                              >
                                <span
                                  className="chemical-fluid-swatch"
                                  style={{ '--chemical-fluid-color': fluidVisualColor(chemicalFluidOutput.id) } as CSSProperties}
                                  aria-hidden="true"
                                />
                                <strong>{fluidLabel(chemicalFluidOutput.id)}</strong>
                                <em>{formatLitres(chemicalFluidOutput.amount)}L / {formatLitres(chemicalFluidCapacity)}L</em>
                              </button>
                            ) : (
                              <button type="button" className={`chemical-output-empty native-fluid-control ${nativeFluidControlReady('reaction') ? 'ready' : ''}`} disabled={!nativeFluidControlReady('reaction')} onClick={() => handleNativeFluidControl('reaction')} aria-label="Empty item or fluid output">
                                <span aria-hidden="true" />
                                <strong>Item / fluid</strong>
                                <em>{formatLitres(chemicalFluidCapacity)}L buffer</em>
                              </button>
                            )
                          ) : (
                            <div className={machines[selectedMachine.machineId].itemOutputSlots === 2 ? 'machine-dual-output' : ''}>
                              <ProcessItemSlot slot={process.output} label="Output 1" onClick={() => handleProcessSlotPress('output')} />
                              {machines[selectedMachine.machineId].itemOutputSlots === 2 && <ProcessItemSlot slot={process.output2} label="Output 2" onClick={() => handleProcessSlotPress('output2')} />}
                            </div>
                          )}
                        </div>
                        <div className="forge-action-rail" aria-label={`${machines[selectedMachine.machineId].name} progress ${Math.floor(progressPercent)} percent`}>
                          <span style={{ width: `${progressPercent}%` }} />
                          <strong>{process.activeRecipeId ? hmiRunningLabel : 'Load'}</strong>
                          <em>{Math.floor(progressPercent)}%</em>
                        </div>
                      </div>
                    )
                  })()
                ) : selectedMachineIsStructureOnly ? (
                <div className="structure-only-terminal">
                  <MachineGlyph id={selectedMachine.machineId} />
                  <span>
                    <small>Factory structure</small>
                    <strong>{machines[selectedMachine.machineId].name}</strong>
                    <em>{machines[selectedMachine.machineId].multiblock ? 'Part of a larger structure.' : 'No internal processing.'}</em>
                  </span>
                </div>
                ) : selectedMachine.machineId === 'furnace' ? (
                <div className="primitive-furnace-hmi">
                  <div className="primitive-furnace-stat-strip">
                    <span><small>State</small><strong>{machineStatus(state, selectedMachine)}</strong></span>
                    <span><small>Time</small><strong>{selectedMachineProcessTimeLabel || '--'}</strong></span>
                    <span><small>Heat</small><strong>{selectedMachine.process.fuelRemainingMs > 0 ? 'Hot' : 'Cold'}</strong></span>
                  </div>
                  <div className="primitive-furnace-stage">
                    <div className="primitive-furnace-input-bank">
                      <ProcessItemSlot slot={selectedMachine.process.input} label="Input" onClick={() => handleProcessSlotPress('input')} />
                      <ProcessItemSlot slot={selectedMachine.process.fuel} label="Fuel" onClick={() => handleProcessSlotPress('fuel')} />
                    </div>
                    <div className={selectedMachine.process.fuelRemainingMs > 0 ? 'primitive-furnace-fire active' : 'primitive-furnace-fire'} aria-label={selectedMachine.process.fuelRemainingMs > 0 ? 'Firebox hot' : 'Firebox cold'}>
                      <span />
                    </div>
                    <div className="primitive-furnace-output-bank">
                      <ProcessItemSlot slot={selectedMachine.process.output} label="Output" onClick={() => handleProcessSlotPress('output')} />
                    </div>
                  </div>
                  <div className="primitive-furnace-load" aria-label={`Primitive Furnace load ${Math.floor(selectedMachineProgressPercent)} percent`}>
                    <span style={{ width: `${selectedMachineProgressPercent}%` }} />
                    <strong>{selectedMachine.process.activeRecipeId ? 'Smelting' : 'Load'}</strong>
                    <em>{Math.floor(selectedMachineProgressPercent)}%</em>
                  </div>
                </div>
                ) : (
                <div className={`furnace-interface ${selectedMachine.machineId}-process-interface`}>
                  <div className="furnace-inputs">
                    <ProcessItemSlot slot={selectedMachine.process.input} label="Input" onClick={() => handleProcessSlotPress('input')} />
                    {(selectedMachine.machineId === 'steamAlloySmelter' ||
                      selectedMachine.machineId === 'lvAlloySmelter' ||
                      selectedMachine.machineId === 'lvCentrifuge' ||
                      selectedMachine.machineId === 'lvCanner') && (
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
                    {selectedMachineProcessTimeLabel && <strong>{selectedMachineProcessTimeLabel}</strong>}
                  </div>
                  <ProcessItemSlot slot={selectedMachine.process.output} label="Output" onClick={() => handleProcessSlotPress('output')} />
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
                {machineUsesProcessStorage(selectedMachine.machineId) && (machineTerminalMode === 'items' || selectedMachineFluidBuffers.length > 0) && (
                  <p className="furnace-help">
                    {machineTerminalMode === 'fluids'
                      ? 'Tap a container, then a highlighted vessel.'
                      : isItemHopperMachine(selectedMachine.machineId)
                      ? 'Tap storage, then a hopper slot to choose an amount.'
                      : isEuStorageMachine(selectedMachine.machineId)
                        ? 'Select a battery above, then tap an empty cell. Tap an installed battery to remove it.'
                      : selectedMachine.machineId === 'steamBoiler'
                        ? 'Select a fuel above, then tap the fuel slot.'
                      : 'Tap storage, then a valid slot to choose an amount. Tap Output to collect.'}
                  </p>
                )}
                </div>
              </section>
              {isMachineRecipePopupOpen && selectedMachinePopupRecipe && selectedMachinePopupOutput && selectedMachinePopupLoadStatus && (
                <div
                  className="machine-recipe-popup-backdrop"
                  role="presentation"
                  onClick={(event) => {
                    event.stopPropagation()
                    setIsMachineRecipePopupOpen(false)
                  }}
                >
                  <section
                    className="machine-recipe-popup"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${machines[selectedMachine.machineId].name} recipe picker`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="machine-recipe-popup-head">
                      <div>
                        <p className="eyebrow">{machines[selectedMachine.machineId].name}</p>
                        <h2>{selectedMachinePopupOutput.label}</h2>
                      </div>
                      <button type="button" className="icon-button" aria-label="Close recipe picker" onClick={() => setIsMachineRecipePopupOpen(false)}>
                        <X size={18} />
                      </button>
                    </div>

                    <div className="machine-recipe-popup-body">
                    <div className="machine-recipe-popup-cycle" aria-label="Choose machine recipe">
                      <button type="button" aria-label="Previous recipe" disabled={selectedMachinePopupRecipes.length < 2} onClick={() => handleCycleMachinePopupRecipe(-1)}>
                        <ChevronLeft size={18} />
                      </button>
                      <div>
                        <strong>{selectedMachinePopupRecipe.name}</strong>
                        <span>{clampedMachinePopupRecipeIndex + 1} / {selectedMachinePopupRecipes.length}</span>
                      </div>
                      <button type="button" aria-label="Next recipe" disabled={selectedMachinePopupRecipes.length < 2} onClick={() => handleCycleMachinePopupRecipe(1)}>
                        <ChevronRight size={18} />
                      </button>
                    </div>

                    <div className="machine-recipe-popup-flow">
                      <div className="machine-recipe-popup-step">
                        <span>Required inputs</span>
                        {!selectedMachinePopupRecipe.fluidOnly && (
                          <div className="machine-recipe-popup-items">
                            {[
                              selectedMachinePopupRecipe.input,
                              ...(selectedMachinePopupRecipe.secondaryInput ? [selectedMachinePopupRecipe.secondaryInput] : []),
                              ...(selectedMachinePopupRecipe.extraInputs ?? []),
                              ...(selectedMachinePopupRecipe.fuelInput ? [selectedMachinePopupRecipe.fuelInput] : []),
                            ].map((amount, index) => (
                              <ItemSlot
                                amount={amount}
                                disabled={availableResourceAmount(state, amount.id) < amount.amount}
                                state={state}
                                key={`${amount.id}-${index}`}
                              />
                            ))}
                          </div>
                        )}
                        {(selectedMachinePopupRecipe.fluidInputs ?? (selectedMachinePopupRecipe.fluidInput ? [selectedMachinePopupRecipe.fluidInput] : [])).map((amount) => (
                          <div className={`machine-recipe-popup-fluid fluid-${amount.id}`} key={amount.id}>
                            <Droplet size={15} />
                            <strong>{fluidLabels[amount.id]}</strong>
                            <span>{formatLitres(amount.amount)}L</span>
                          </div>
                        ))}
                      </div>
                      <ChevronRight className="machine-recipe-popup-arrow" size={22} aria-hidden="true" />
                      <div className="machine-recipe-popup-step output">
                        <span>Outputs</span>
                        {(!selectedMachinePopupRecipe.fluidOnly ? [
                          selectedMachinePopupRecipe.output,
                          ...(selectedMachinePopupRecipe.secondaryOutput ? [selectedMachinePopupRecipe.secondaryOutput] : []),
                        ] : []).map((amount) => (
                          <div className="machine-recipe-popup-product" key={amount.id}>
                            <div className="mini-slot">
                              <RecipeDisplayIcon output={{ kind: 'resource', id: amount.id, amount: amount.amount, label: resourceLabels[amount.id] }} />
                              <span className="item-count">{formatAmount(amount.amount)}</span>
                            </div>
                            <strong>{resourceLabels[amount.id]}</strong>
                          </div>
                        ))}
                        {selectedMachinePopupRecipe.machineOutput && (
                          <div className="machine-recipe-popup-product">
                            <div className="mini-slot">
                              <RecipeDisplayIcon output={selectedMachinePopupOutput} />
                              <span className="item-count">{recipeDisplayAmount(selectedMachinePopupOutput)}</span>
                            </div>
                            <strong>{selectedMachinePopupOutput.label}</strong>
                          </div>
                        )}
                        {(selectedMachinePopupRecipe.fluidOutputs ?? (selectedMachinePopupRecipe.fluidOutput ? [selectedMachinePopupRecipe.fluidOutput] : [])).map((amount) => (
                          <div className={`machine-recipe-popup-fluid fluid-${amount.id}`} key={amount.id}>
                            <Droplet size={15} />
                            <strong>{fluidLabels[amount.id]}</strong>
                            <span>{formatLitres(amount.amount)}L</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="machine-recipe-popup-metrics">
                      <span><Clock size={13} />{formatDuration(selectedMachinePopupRecipe.durationMs)}</span>
                      {selectedMachinePopupRecipe.steamCostLitres !== undefined && <span>{formatAmount(selectedMachinePopupRecipe.steamCostLitres)}L steam</span>}
                      {selectedMachinePopupRecipe.euCost !== undefined && <span><Zap size={13} />{formatAmount(selectedMachinePopupRecipe.euCost)} EU</span>}
                    </div>

                    <p className={`machine-recipe-popup-status ${selectedMachinePopupLoadStatus.ready ? 'ready' : selectedMachinePopupLoadStatus.canLoad ? 'available' : 'blocked'}`} aria-live="polite">
                      {machineRecipeLoadNotice || (
                        selectedMachinePopupLoadStatus.ready
                          ? selectedMachinePopupRecipe.fluidOnly
                            ? (selectedMachinePopupRecipe.fluidInputs?.length ?? (selectedMachinePopupRecipe.fluidInput ? 1 : 0)) > 0
                              ? 'Add the required fluids through the fluid input.'
                              : 'No manual inputs. Keep the machine powered.'
                            : 'All required items are loaded.'
                          : selectedMachinePopupLoadStatus.missingResources.length > 0
                            ? `Missing ${selectedMachinePopupLoadStatus.missingResources.map((amount) => `${resourceLabels[amount.id]} x${formatAmount(amount.amount)}`).join(', ')}.`
                            : selectedMachinePopupLoadStatus.blockedSlots.length > 0
                              ? `Clear the ${selectedMachinePopupLoadStatus.blockedSlots.join(', ')} slot${selectedMachinePopupLoadStatus.blockedSlots.length === 1 ? '' : 's'} first.`
                              : `${formatAmount(selectedMachinePopupLoadStatus.itemsToLoad)} item${selectedMachinePopupLoadStatus.itemsToLoad === 1 ? '' : 's'} ready to load from inventory.`
                      )}
                    </p>

                    <button
                      type="button"
                      className="machine-recipe-popup-action"
                      disabled={selectedMachinePopupLoadStatus.ready}
                      onClick={handleAutoLoadMachineRecipe}
                    >
                      {selectedMachinePopupLoadStatus.ready
                        ? selectedMachinePopupRecipe.fluidOnly && !selectedMachinePopupRecipe.fluidInput && !selectedMachinePopupRecipe.fluidInputs?.length ? 'No inputs' : 'Inputs ready'
                        : selectedMachinePopupLoadStatus.canLoad
                          ? 'Auto-load items'
                          : 'Check requirements'}
                    </button>
                    </div>
                  </section>
                </div>
              )}
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
            showLockedQuests={showLockedQuests}
            onToggleLockedQuests={() => setShowLockedQuests((current) => !current)}
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
