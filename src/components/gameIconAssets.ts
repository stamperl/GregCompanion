import { machines, resourceRegistry } from '../game/content'
import type { MachineId, ResourceId } from '../game/types'

const preloadedIconImages = new Map<string, HTMLImageElement>()
let iconPreloadPromise: Promise<void> | null = null

export function resourceIconSrc(id: ResourceId) {
  return `${import.meta.env.BASE_URL}game-icons/resources/${id}.png`
}

export function machineIconSrc(id: MachineId) {
  return `${import.meta.env.BASE_URL}game-icons/machines/${id}.png`
}

function preloadImage(src: string) {
  if (typeof window === 'undefined' || preloadedIconImages.has(src)) return Promise.resolve()

  const image = new Image()
  image.decoding = 'sync'
  image.loading = 'eager'
  image.src = src
  preloadedIconImages.set(src, image)

  if (image.decode) return image.decode().catch(() => undefined)

  return new Promise<void>((resolve) => {
    image.onload = () => resolve()
    image.onerror = () => resolve()
  })
}

export function preloadGeneratedIconImages() {
  if (iconPreloadPromise) return iconPreloadPromise

  const resourceUrls = (Object.keys(resourceRegistry) as ResourceId[]).map(resourceIconSrc)
  const machineUrls = (Object.keys(machines) as MachineId[]).map(machineIconSrc)

  iconPreloadPromise = Promise.all([...resourceUrls, ...machineUrls].map(preloadImage)).then(() => undefined)
  return iconPreloadPromise
}
