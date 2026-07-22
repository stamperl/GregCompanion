import { Factory, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import { machines, questChapters, quests as questDefinitions, resourceLabels } from '../game/content'
import {
  questKind,
  questObjectiveProgress,
  questObjectiveProgressRows,
  questProgress,
  questScripReward,
  questStatus,
  visibleQuests,
} from '../game/engine'
import { formatAmount } from '../game/format'
import { routeQuestConnection, type QuestMapRect } from '../game/questMap'
import type { GameState, GatherTargetId, MachineId, Quest, QuestChapterId, QuestId, ResourceId } from '../game/types'
import { MachineGlyph, PixelIcon } from './GameIcons'
import { ItemSlot, MachineSlot } from './InventorySlots'

type QuestMapView = { x: number; y: number; zoom: number }
type QuestMapViews = Partial<Record<QuestChapterId, QuestMapView>>

type GuidePageProps = {
  showBook: boolean
  state: GameState
  activeChapterId: QuestChapterId
  selectedQuestId: QuestId | null
  showLockedQuests: boolean
  onSelectChapter: (chapterId: QuestChapterId) => void
  onSelectQuest: (questId: QuestId) => void
  onCloseQuest: () => void
  onClaimQuest: (questId: QuestId) => void
  onClaimAll: (claimableRewardCount: number) => void
  onToggleLockedQuests: () => void
  onSelectResource: (resourceId: ResourceId) => void
  onSelectMachine: (machineId: MachineId) => void
  onOpenFactory: () => void
}

const questMapViewsStorageKey = 'click-foundry.quest-map-views'
const visibleQuestChapterIds = new Set<QuestChapterId>(['gettingStarted', 'steamAge', 'lvAge', 'multiblocks', 'shatteredReach', 'mvFoundations'])
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
  goldVein: 'goldOre',
  resonantQuartzSeam: 'resonantQuartz',
  voidQuartzOutcrop: 'voidQuartz',
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
  steamCompressorQuest: { x: 1120, y: 115 },
  steamExtractorQuest: { x: 1120, y: 500 },
  steamPressureReserveQuest: { x: 1295, y: 115 },
  steamUtilityBranch: { x: 1470, y: 115 },
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
  steelTankQuest: { x: 2345, y: 350 },
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
  buildConductorsQuest: { x: 5850, y: 510 },
  buildLvCentrifugeQuest: { x: 4230, y: 720 },
  separateStickyResinQuest: { x: 4410, y: 720 },
  centrifugeByproductsQuest: { x: 4410, y: 860 },
  cureLiquidRubberQuest: { x: 4590, y: 860 },
  useGlueQuest: { x: 4770, y: 830 },
  buildAirCollectorQuest: { x: 4410, y: 1000 },
  separateAirQuest: { x: 4590, y: 1000 },
  routeSeparatedGasesQuest: { x: 4770, y: 1000 },
  runGasArcRecipesQuest: { x: 5490, y: 830 },
  buildLvAutoMinerQuest: { x: 2970, y: 50 },
  craftSurveyKitQuest: { x: 3150, y: 50 },
  encodeCoalSurveyCardQuest: { x: 3330, y: 50 },
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

function questBookChapterId(quest: Quest): QuestChapterId {
  if (quest.chapterId === 'mvFoundations') return 'mvFoundations'
  if (quest.chapterId === 'shatteredReach') return 'shatteredReach'
  if (quest.chapterId === 'lvAge') return 'lvAge'
  if (quest.chapterId === 'multiblocks') return 'multiblocks'
  if (quest.chapterId === 'lvFoundations' || quest.chapterId === 'blastPrep') return 'lvAge'
  if (quest.chapterId === 'steamAge' || quest.chapterId === 'cokeAndSteel') return 'steamAge'
  return 'gettingStarted'
}

function defaultQuestMapView(chapterId: QuestChapterId): QuestMapView {
  return { x: 0, y: 0, zoom: chapterId === 'lvAge' ? 0.62 : 0.9 }
}

function loadQuestMapViews(): QuestMapViews {
  try {
    const stored = window.localStorage.getItem(questMapViewsStorageKey)
    if (!stored) return {}
    const parsed = JSON.parse(stored) as Record<string, Partial<QuestMapView>>
    return Object.fromEntries(
      Object.entries(parsed).filter(([, view]) => Number.isFinite(view.x) && Number.isFinite(view.y) && Number.isFinite(view.zoom)),
    ) as QuestMapViews
  } catch {
    return {}
  }
}

function saveQuestMapViews(views: QuestMapViews) {
  try {
    window.localStorage.setItem(questMapViewsStorageKey, JSON.stringify(views))
  } catch {
    // Guide position remains available for this session when storage is unavailable.
  }
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

function QuestObjectiveRow({ progress, state, onSelectResource, onSelectMachine, onOpenFactory }: {
  progress: ReturnType<typeof questObjectiveProgress>
  state: GameState
  onSelectResource: (resourceId: ResourceId) => void
  onSelectMachine: (machineId: MachineId) => void
  onOpenFactory: () => void
}) {
  const { objective } = progress
  const current = Math.min(progress.current, progress.required)
  const actionLabel = progress.complete ? 'Completed' : `${formatAmount(current)}/${formatAmount(progress.required)}`

  if (objective.type === 'resource') {
    return (
      <button type="button" className={progress.complete ? 'quest-objective complete' : 'quest-objective'} onClick={() => onSelectResource(objective.id)}>
        <ItemSlot amount={{ id: objective.id, amount: objective.amount }} disabled={!progress.complete} state={state} />
        <span>{progress.label}</span><strong>{actionLabel}</strong>
      </button>
    )
  }
  if (objective.type === 'machine') {
    return (
      <button type="button" className={progress.complete ? 'quest-objective complete' : 'quest-objective'} onClick={() => onSelectMachine(objective.id)}>
        <MachineSlot id={objective.id} amount={objective.amount} muted={!progress.complete} />
        <span>{progress.label}</span><strong>{actionLabel}</strong>
      </button>
    )
  }
  if (objective.type === 'placedMachine') {
    return (
      <button type="button" className={progress.complete ? 'quest-objective complete factory-link' : 'quest-objective factory-link'} onClick={onOpenFactory}>
        <MachineSlot id={objective.id} amount={objective.amount} muted={!progress.complete} />
        <span>{progress.label}</span><strong>{actionLabel}</strong>
      </button>
    )
  }
  return (
    <div className={progress.complete ? 'quest-objective complete' : 'quest-objective'}>
      <span className="mini-slot"><Factory size={18} /></span>
      <span>{progress.label}</span><strong>{actionLabel}</strong>
    </div>
  )
}

function QuestDetail({ quest, state, onClose, onClaim, onSelectResource, onSelectMachine, onOpenFactory }: {
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
  const progressRows = questObjectiveProgressRows(state, quest)
  const kind = questKind(quest)
  const rewardResources = quest.rewards.resources ?? []
  const rewardMachines = quest.rewards.machines ?? []
  return (
    <div className="modal-backdrop compact-backdrop" role="presentation" onClick={onClose}>
      <section className="missing-modal quest-detail-modal" role="dialog" aria-modal="true" aria-label={quest.title} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div><p className="eyebrow">{quest.chapter}</p><h2>{quest.title}</h2></div>
          <button type="button" className="icon-button" aria-label="Close quest" onClick={onClose}><X size={18} /></button>
        </div>
        <div className={`quest-detail-hero ${status}`}>
          <span className="quest-detail-icon"><QuestIcon quest={quest} muted={status === 'locked'} /></span>
          <div><strong>{kind} | {questStatusText(status)}</strong><p>{quest.description}</p></div>
        </div>
        <div className="progress-track quest-progress"><span style={{ width: `${questProgress(state, quest) * 100}%` }} /></div>
        <div className="quest-objective-list">
          {progressRows.map((progress) => (
            <QuestObjectiveRow
              progress={progress}
              state={state}
              onSelectResource={onSelectResource}
              onSelectMachine={onSelectMachine}
              onOpenFactory={onOpenFactory}
              key={`${progress.objective.type}-${'id' in progress.objective ? progress.objective.id : 'ids' in progress.objective ? progress.objective.ids.join('-') : progress.objective.type === 'factoryFoundation' ? progress.objective.level : `${progress.objective.kind}-${progress.objective.fluidId}-${progress.objective.direction}`}`}
            />
          ))}
        </div>
        <div className="quest-reward-panel" aria-label="Quest rewards">
          <span>Reward</span><strong>{formatAmount(questScripReward(quest))} Foundry Scrip</strong>
          {rewardResources.map((amount) => <span key={`reward-${amount.id}`}>+{formatAmount(amount.amount)} {resourceLabels[amount.id]}</span>)}
          {rewardMachines.map((amount) => <span key={`reward-${amount.id}`}>+{formatAmount(amount.amount)} {machines[amount.id].name}</span>)}
        </div>
        <button type="button" className={claimReady ? 'load-recipe-button quest-claim-button unclaimed' : 'load-recipe-button quest-claim-button'} disabled={!claimReady} onClick={() => onClaim(quest.id)}>
          {claimed ? 'Reward claimed' : status === 'completed' ? 'Claim reward' : 'Reward locked'}
        </button>
      </section>
    </div>
  )
}

function QuestBook({ quests, state, activeChapterId, selectedQuestId, onSelectChapter, onSelectQuest, onClaimAll, claimableRewardCount, showLockedQuests, onToggleLockedQuests, mapViewsRef }: {
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
  mapViewsRef: { current: QuestMapViews }
}) {
  const visibleQuestChapters = questChapters.filter((candidate) => visibleQuestChapterIds.has(candidate.id))
  const chapter = visibleQuestChapters.find((candidate) => candidate.id === activeChapterId) ?? visibleQuestChapters[0]
  const chapterQuests = quests.filter((quest) => chapter.id === 'multiblocks' ? multiblockQuestIds.has(quest.id) : questBookChapterId(quest) === chapter.id)
  const questById = new Map(quests.map((quest) => [quest.id, quest]))
  const [mapView, setMapView] = useState<QuestMapView>(() => mapViewsRef.current[activeChapterId] ?? defaultQuestMapView(activeChapterId))
  const mapViewRef = useRef(mapView)
  const mapViewportRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ pointerId: number; x: number; y: number; startX: number; startY: number } | null>(null)
  const pointerRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const gestureRef = useRef<{ centerX: number; centerY: number; distance: number; startX: number; startY: number; zoom: number } | null>(null)
  const mapMargin = 24
  const questNodeSize = (quest: Quest) => questKind(quest) === 'gate' ? 68 : questKind(quest) === 'optional' ? 50 : 58
  const questPosition = (quest: Quest) => {
    const position = chapter.id === 'multiblocks'
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
  const questRect = (quest: Quest): QuestMapRect => ({ left: questX(quest), top: questY(quest), width: questNodeSize(quest), height: questNodeSize(quest) })
  const questConnectionPath = (parent: Quest, child: Quest) => routeQuestConnection(
    questRect(parent),
    questRect(child),
    chapterQuests.filter((candidate) => candidate.id !== parent.id && candidate.id !== child.id).map(questRect),
    mapWidth,
    mapHeight,
  ).path
  const clampZoom = (zoom: number) => Math.max(0.55, Math.min(1.35, zoom))
  const clampMapView = useCallback((view: QuestMapView, viewport?: { width: number; height: number }) => {
    if (!viewport) return view
    const scaledWidth = mapWidth * view.zoom
    const scaledHeight = mapHeight * view.zoom
    const slack = 42
    const minX = Math.min(slack, viewport.width - scaledWidth - slack)
    const maxX = Math.max(viewport.width - scaledWidth - slack, slack)
    const minY = Math.min(slack, viewport.height - scaledHeight - slack)
    const maxY = Math.max(viewport.height - scaledHeight - slack, slack)
    return { ...view, x: Math.max(minX, Math.min(maxX, view.x)), y: Math.max(minY, Math.min(maxY, view.y)) }
  }, [mapHeight, mapWidth])
  const emptyChapterHint = chapter.id === 'lvAge'
    ? 'LV Age opens after the Steam Age ends: make steel in the bricked blast furnace, then hammer the first steel plate.'
    : chapter.id === 'multiblocks'
      ? 'Multiblock structure work appears here once the casing grind starts.'
      : 'Complete the previous visible quest to reveal the next step.'

  const updateMapView = (update: QuestMapView | ((current: QuestMapView) => QuestMapView)) => {
    const next = typeof update === 'function' ? update(mapViewRef.current) : update
    mapViewRef.current = next
    setMapView(next)
  }
  const persistMapView = () => {
    mapViewsRef.current[activeChapterId] = mapViewRef.current
    saveQuestMapViews(mapViewsRef.current)
  }

  useEffect(() => {
    pointerRef.current.clear()
    gestureRef.current = null
    dragRef.current = null
    const savedView = mapViewsRef.current[activeChapterId]
    if (savedView) {
      mapViewRef.current = savedView
      setMapView(savedView)
      return
    }
    const frame = window.requestAnimationFrame(() => {
      const viewport = mapViewportRef.current?.getBoundingClientRect()
      const defaultView = defaultQuestMapView(activeChapterId)
      const centeredView = viewport
        ? clampMapView({ ...defaultView, x: (viewport.width - mapWidth * defaultView.zoom) / 2, y: (viewport.height - mapHeight * defaultView.zoom) / 2 }, viewport)
        : defaultView
      mapViewRef.current = centeredView
      setMapView(centeredView)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeChapterId, clampMapView, mapHeight, mapViewsRef, mapWidth])

  const pointerDistance = (first: { x: number; y: number }, second: { x: number; y: number }) => Math.hypot(second.x - first.x, second.y - first.y)
  const pointerCenter = (first: { x: number; y: number }, second: { x: number; y: number }) => ({ x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 })
  const startPinchGesture = () => {
    const [first, second] = [...pointerRef.current.values()]
    if (!first || !second) return
    const center = pointerCenter(first, second)
    gestureRef.current = { centerX: center.x, centerY: center.y, distance: Math.max(1, pointerDistance(first, second)), startX: mapView.x, startY: mapView.y, zoom: mapView.zoom }
  }
  const handleMapPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('.quest-node')) return
    pointerRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* Synthetic pointers may not be capturable. */ }
    if (pointerRef.current.size === 1) {
      dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, startX: mapView.x, startY: mapView.y }
      gestureRef.current = null
    } else if (pointerRef.current.size === 2) {
      dragRef.current = null
      startPinchGesture()
    }
  }
  const handleMapPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerRef.current.has(event.pointerId)) pointerRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointerRef.current.size >= 2 && gestureRef.current) {
      const [first, second] = [...pointerRef.current.values()]
      if (!first || !second) return
      const center = pointerCenter(first, second)
      const nextZoom = clampZoom((gestureRef.current.zoom * pointerDistance(first, second)) / gestureRef.current.distance)
      const zoomRatio = nextZoom / gestureRef.current.zoom
      const rect = event.currentTarget.getBoundingClientRect()
      updateMapView(clampMapView({
        x: center.x - rect.left - (gestureRef.current.centerX - rect.left - gestureRef.current.startX) * zoomRatio,
        y: center.y - rect.top - (gestureRef.current.centerY - rect.top - gestureRef.current.startY) * zoomRatio,
        zoom: nextZoom,
      }, rect))
      return
    }
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const rect = event.currentTarget.getBoundingClientRect()
    updateMapView((current) => clampMapView({ ...current, x: drag.startX + event.clientX - drag.x, y: drag.startY + event.clientY - drag.y }, rect))
  }
  const handleMapPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerRef.current.delete(event.pointerId)
    gestureRef.current = null
    if (pointerRef.current.size === 1) {
      const [remainingPointerId] = [...pointerRef.current.keys()]
      const remainingPointer = pointerRef.current.get(remainingPointerId)
      if (remainingPointer) dragRef.current = { pointerId: remainingPointerId, x: remainingPointer.x, y: remainingPointer.y, startX: mapView.x, startY: mapView.y }
    } else if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null
    }
    persistMapView()
  }
  const handleMapWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const pointerX = event.clientX - rect.left
    const pointerY = event.clientY - rect.top
    updateMapView((current) => {
      const nextZoom = clampZoom(current.zoom + (event.deltaY < 0 ? 0.08 : -0.08))
      const zoomRatio = nextZoom / current.zoom
      return clampMapView({ x: pointerX - (pointerX - current.x) * zoomRatio, y: pointerY - (pointerY - current.y) * zoomRatio, zoom: nextZoom }, rect)
    })
    persistMapView()
  }

  return (
    <>
      <div className="quest-chapter-tabs" aria-label="Quest chapters">
        {visibleQuestChapters.map((candidate) => (
          <button type="button" className={candidate.id === chapter.id ? 'active' : ''} onClick={() => onSelectChapter(candidate.id)} key={candidate.id}>{candidate.title}</button>
        ))}
      </div>
      <div className="quest-book-head">
        <div><p className="eyebrow">Quest book</p><h2>{chapter.title}</h2></div>
        <div className="quest-book-summary">
          <p>{chapter.description}</p>
          <div className="quest-book-actions">
            <strong>{formatAmount(state.scrip)} Foundry Scrip</strong>
            <button type="button" className={showLockedQuests ? 'active' : ''} aria-pressed={showLockedQuests} onClick={onToggleLockedQuests}>{showLockedQuests ? 'Hide locked quests' : 'Show locked quests'}</button>
            <button type="button" disabled={claimableRewardCount < 1} onClick={onClaimAll}>{claimableRewardCount > 0 ? `Claim all rewards (${formatAmount(claimableRewardCount)})` : 'No rewards ready'}</button>
          </div>
        </div>
      </div>
      {chapter.id === 'gettingStarted' && state.completedQuests.length === 0 && (
        <div className="quest-first-step" role="note">
          <strong>Start here</strong>
          <span>Gather 1 Log, then craft 4 Planks.</span>
        </div>
      )}
      <div ref={mapViewportRef} className="quest-map-scroll" aria-label={`${chapter.title} quest map`} onPointerCancel={handleMapPointerEnd} onPointerDown={handleMapPointerDown} onPointerMove={handleMapPointerMove} onPointerUp={handleMapPointerEnd} onWheel={handleMapWheel}>
        <div className="quest-map" style={{ '--quest-map-width': `${mapWidth}px`, '--quest-map-height': `${mapHeight}px`, transform: `translate(${mapView.x}px, ${mapView.y}px) scale(${mapView.zoom})` } as CSSProperties}>
          <svg className="quest-lines" viewBox={`0 0 ${mapWidth} ${mapHeight}`} aria-hidden="true">
            {chapterQuests.flatMap((quest) => (quest.prerequisites ?? []).map((parentId) => {
              const parent = questById.get(parentId)
              if (!parent) return null
              const parentInChapter = chapter.id === 'multiblocks' ? multiblockQuestIds.has(parent.id) : questBookChapterId(parent) === chapter.id
              if (!parentInChapter) return null
              const parentStatus = questStatus(state, parent)
              const childStatus = questStatus(state, quest)
              const className = `${parentStatus === 'completed' && childStatus !== 'locked' ? 'complete' : childStatus === 'locked' ? 'locked' : 'open'} ${questKind(quest)}`
              const path = questConnectionPath(parent, quest)
              return <g key={`${parent.id}-${quest.id}`}><path className="quest-line-shadow" d={path} /><path className={className} d={path} /></g>
            }))}
          </svg>
          {!chapterQuests.length && <div className="quest-map-empty">{emptyChapterHint}</div>}
          {chapterQuests.map((quest) => {
            const status = questStatus(state, quest)
            const claimed = state.claimedQuests.includes(quest.id)
            const kind = questKind(quest)
            const claimState = status === 'completed' ? claimed ? 'claimed' : 'claimable' : status === 'ready' ? 'claimable' : 'not-done'
            const accessibleStatus = status === 'completed' ? claimed ? 'done' : 'ready to claim' : questStatusText(status)
            const nodeSize = questNodeSize(quest)
            return (
              <button type="button" aria-label={`${quest.title}. ${accessibleStatus}. ${kind}.`} title={`${quest.title} - ${accessibleStatus}`} className={`quest-node ${status} ${kind} ${claimState}${quest.id === selectedQuestId ? ' selected' : ''}`} style={{ left: questX(quest), minHeight: nodeSize, top: questY(quest), width: nodeSize }} onClick={() => onSelectQuest(quest.id)} key={quest.id}>
                <span className="quest-node-icon"><QuestIcon quest={quest} muted={status === 'locked'} /></span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

export default function GuidePage(props: GuidePageProps) {
  const mapViewsRef = useRef<QuestMapViews>(loadQuestMapViews())
  const guideQuests = useMemo(() => {
    if (props.showLockedQuests) return questDefinitions
    const visibleQuestIds = new Set(visibleQuests(props.state).map((quest) => quest.id))
    const immediateLockedQuestIds = new Set(
      questDefinitions
        .filter((quest) => (quest.prerequisites ?? []).some((prerequisite) => visibleQuestIds.has(prerequisite)))
        .map((quest) => quest.id),
    )
    return questDefinitions.filter((quest) => visibleQuestIds.has(quest.id) || immediateLockedQuestIds.has(quest.id) || questBookChapterId(quest) === 'mvFoundations')
  }, [props.showLockedQuests, props.state])
  const selectedQuest = useMemo(() => guideQuests.find((quest) => quest.id === props.selectedQuestId) ?? null, [guideQuests, props.selectedQuestId])
  const claimableRewardCount = guideQuests.filter((quest) => props.state.completedQuests.includes(quest.id) && !props.state.claimedQuests.includes(quest.id)).length

  return (
    <>
      {props.showBook && (
        <section className="guide-page" aria-label="Quest guide">
          <QuestBook
            quests={guideQuests}
            state={props.state}
            activeChapterId={props.activeChapterId}
            selectedQuestId={props.selectedQuestId}
            onSelectChapter={props.onSelectChapter}
            onSelectQuest={props.onSelectQuest}
            onClaimAll={() => props.onClaimAll(claimableRewardCount)}
            claimableRewardCount={claimableRewardCount}
            showLockedQuests={props.showLockedQuests}
            onToggleLockedQuests={props.onToggleLockedQuests}
            mapViewsRef={mapViewsRef}
          />
        </section>
      )}
      {selectedQuest && (
        <QuestDetail
          quest={selectedQuest}
          state={props.state}
          onClose={props.onCloseQuest}
          onClaim={props.onClaimQuest}
          onSelectResource={props.onSelectResource}
          onSelectMachine={props.onSelectMachine}
          onOpenFactory={props.onOpenFactory}
        />
      )}
    </>
  )
}
