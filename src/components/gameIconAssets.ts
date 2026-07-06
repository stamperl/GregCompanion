import { machines, resourceRegistry } from '../game/content'
import type { MachineId, ResourceId } from '../game/types'

const preloadedIconImages = new Map<string, HTMLImageElement>()
const preloadedIconLinks = new Set<string>()
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
  ;(image as HTMLImageElement & { fetchPriority?: 'high' }).fetchPriority = 'high'
  image.src = src
  preloadedIconImages.set(src, image)

  if (image.decode) return image.decode().catch(() => undefined)

  return new Promise<void>((resolve) => {
    image.onload = () => resolve()
    image.onerror = () => resolve()
  })
}

function generatedIconUrls() {
  const resourceUrls = (Object.keys(resourceRegistry) as ResourceId[]).map(resourceIconSrc)
  const machineUrls = (Object.keys(machines) as MachineId[]).map(machineIconSrc)
  return [...resourceUrls, ...machineUrls]
}

export function preloadGeneratedIconLinks() {
  if (typeof document === 'undefined') return

  for (const href of generatedIconUrls()) {
    if (preloadedIconLinks.has(href)) continue

    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = href
    document.head.appendChild(link)
    preloadedIconLinks.add(href)
  }
}

export function preloadGeneratedIconImages() {
  if (iconPreloadPromise) return iconPreloadPromise

  preloadGeneratedIconLinks()
  iconPreloadPromise = Promise.all(generatedIconUrls().map(preloadImage)).then(() => undefined)
  return iconPreloadPromise
}
