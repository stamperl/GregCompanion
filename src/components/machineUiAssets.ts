import { deploymentInfo } from '../game/deployment'
import type { MachineId } from '../game/types'

const preloadedMachineUiImages = new Map<string, HTMLImageElement>()
const preloadedMachineUiLinks = new Set<string>()
let machineUiPreloadPromise: Promise<void> | null = null
const machineUiAssetVersion = encodeURIComponent(`${deploymentInfo.channel}-${deploymentInfo.revision}-${deploymentInfo.version}`)

const machineUiChamberFiles: Partial<Record<MachineId, string>> = {
  steamForgeHammer: 'steam-forge-hammer-chamber.webp',
  steamMacerator: 'steam-macerator-chamber.webp',
  steamCompressor: 'steam-compressor-chamber.webp',
  steamExtractor: 'steam-extractor-chamber.webp',
  steamAlloySmelter: 'steam-alloy-smelter-chamber.webp',
  steamFurnace: 'steam-furnace-chamber.webp',
  lvForgeHammer: 'lv-forge-hammer-chamber.webp',
  lvMacerator: 'lv-macerator-chamber.webp',
  lvCompressor: 'lv-compressor-chamber.webp',
  lvExtractor: 'lv-extractor-chamber.webp',
  lvAlloySmelter: 'lv-alloy-smelter-chamber.webp',
  lvFurnace: 'lv-furnace-chamber.webp',
  lvWiremill: 'lv-wiremill-chamber.webp',
  lvBender: 'lv-bender-chamber.webp',
  lvLathe: 'lv-lathe-chamber.webp',
  lvElectrolyzer: 'lv-electrolyzer-chamber.webp',
  lvCentrifuge: 'lv-centrifuge-chamber.webp',
  lvCanner: 'lv-canner-chamber.webp',
}

const machineUiPanelFiles: Partial<Record<MachineId, string>> = {
  furnace: 'primitive-furnace-panel.webp',
  well: 'steam-utility-panel.webp',
  steamBoiler: 'steam-utility-panel.webp',
  steamTank: 'steam-utility-panel.webp',
  standardChest: 'item-logistics-panel.webp',
  hopper: 'item-logistics-panel.webp',
  copperPipe: 'steam-routing-panel.webp',
  bronzePipe: 'steam-routing-panel.webp',
  ironPipe: 'steam-routing-panel.webp',
  steamAutoMiner: 'auto-miner-panel.webp',
  steamTurbine: 'lv-power-panel.webp',
  tinCable: 'lv-power-panel.webp',
  tinCable2A: 'lv-power-panel.webp',
  tinCable4A: 'lv-power-panel.webp',
  tinCable8A: 'lv-power-panel.webp',
  lvBatteryBuffer: 'lv-power-panel.webp',
  lvBatteryBuffer2A: 'lv-power-panel.webp',
  lvBatteryBuffer4A: 'lv-power-panel.webp',
  lvBatteryBuffer8A: 'lv-power-panel.webp',
  liquidSteamBoiler: 'liquid-boiler-panel.webp',
  lvAssembler: 'lv-assembler-panel.webp',
  lvAutoMiner: 'auto-miner-panel.webp',
  cokeOvenPart: 'coke-oven-panel.webp',
  cokeOven: 'coke-oven-panel.webp',
  brickedBlastFurnacePart: 'bricked-blast-furnace-panel.webp',
  brickedBlastFurnace: 'bricked-blast-furnace-panel.webp',
  arcBlastFurnacePart: 'arc-blast-furnace-panel.webp',
  arcBlastFurnace: 'arc-blast-furnace-panel.webp',
}

const machineUiStageFiles: Partial<Record<MachineId, string>> = {
  lvAssembler: 'lv-assembler-stage.png',
}

export function machineUiChamberSrc(id: MachineId) {
  const fileName = machineUiChamberFiles[id]
  return fileName ? `${import.meta.env.BASE_URL}game-ui/${fileName}?v=${machineUiAssetVersion}` : ''
}

export function machineUiPanelSrc(id: MachineId) {
  const fileName = machineUiPanelFiles[id] ?? machineUiChamberFiles[id]
  return fileName ? `${import.meta.env.BASE_URL}game-ui/${fileName}?v=${machineUiAssetVersion}` : ''
}

export function machineUiStageSrc(id: MachineId) {
  const fileName = machineUiStageFiles[id]
  return fileName ? `${import.meta.env.BASE_URL}game-ui/${fileName}?v=${machineUiAssetVersion}` : ''
}

function machineUiChamberUrls() {
  return (Object.keys(machineUiChamberFiles) as MachineId[]).map(machineUiChamberSrc).filter(Boolean)
}

function machineUiPanelUrls() {
  return (Object.keys(machineUiPanelFiles) as MachineId[]).map(machineUiPanelSrc).filter(Boolean)
}

function machineUiStageUrls() {
  return (Object.keys(machineUiStageFiles) as MachineId[]).map(machineUiStageSrc).filter(Boolean)
}

function machineUiUrls() {
  return [...new Set([...machineUiChamberUrls(), ...machineUiPanelUrls(), ...machineUiStageUrls()])]
}

function preloadImage(src: string) {
  if (typeof window === 'undefined' || preloadedMachineUiImages.has(src)) return Promise.resolve()

  const image = new Image()
  image.decoding = 'async'
  image.loading = 'eager'
  ;(image as HTMLImageElement & { fetchPriority?: 'high' }).fetchPriority = 'high'
  image.src = src
  preloadedMachineUiImages.set(src, image)

  if (image.decode) return image.decode().catch(() => undefined)

  return new Promise<void>((resolve) => {
    image.onload = () => resolve()
    image.onerror = () => resolve()
  })
}

export function preloadMachineUiAssetLinks() {
  if (typeof document === 'undefined') return

  for (const href of machineUiUrls()) {
    if (preloadedMachineUiLinks.has(href)) continue

    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = href
    document.head.appendChild(link)
    preloadedMachineUiLinks.add(href)
  }
}

export function preloadMachineUiImages() {
  if (machineUiPreloadPromise) return machineUiPreloadPromise

  preloadMachineUiAssetLinks()
  machineUiPreloadPromise = Promise.all(machineUiUrls().map(preloadImage)).then(() => undefined)
  return machineUiPreloadPromise
}
