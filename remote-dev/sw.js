const CACHE_VERSION = 'click-foundry-v1'
const APP_CACHE = `${CACHE_VERSION}-app`
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`
const scopeUrl = new URL(self.registration.scope)
const basePath = scopeUrl.pathname
const APP_SHELL_URLS = [
  './',
  './manifest.webmanifest',
  './favicon.svg',
  './apple-touch-icon.png',
  './pwa-icon-192.png',
  './pwa-icon-512.png',
]
const EXCLUDED_PATH_PARTS = [
  '/icon-reviews/',
  '/recipe-review/',
  '/downloads/',
]
const CACHE_FIRST_PATH_PARTS = [
  '/assets/',
]
const NETWORK_FIRST_PATH_PARTS = [
  '/game-icons/',
  '/game-ui/',
]

function isSameOrigin(url) {
  return url.origin === self.location.origin
}

function isExcludedPath(pathname) {
  return EXCLUDED_PATH_PARTS.some((part) => pathname.includes(part))
}

function isCacheableRuntimeAsset(pathname, pathParts) {
  if (!pathname.startsWith(basePath)) return false
  if (isExcludedPath(pathname)) return false
  return pathParts.some((part) => pathname.includes(part))
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(RUNTIME_CACHE)
    await cache.put(request, response.clone())
  }
  return response
}

async function networkFirstAppShell(request) {
  const cache = await caches.open(APP_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) await cache.put(request, response.clone())
    return response
  } catch (error) {
    const cached = await cache.match('./')
    if (cached) return cached
    throw error
  }
}

async function networkFirstRuntime(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) await cache.put(request, response.clone())
    return response
  } catch (error) {
    const cached = await cache.match(request)
    if (cached) return cached
    throw error
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => !key.startsWith(CACHE_VERSION))
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (!isSameOrigin(url) || isExcludedPath(url.pathname)) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstAppShell(request))
    return
  }

  if (isCacheableRuntimeAsset(url.pathname, CACHE_FIRST_PATH_PARTS)) {
    event.respondWith(cacheFirst(request))
    return
  }

  if (isCacheableRuntimeAsset(url.pathname, NETWORK_FIRST_PATH_PARTS)) {
    event.respondWith(networkFirstRuntime(request))
  }
})
