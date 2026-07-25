import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import devManifest from './dev-manifest.json'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const baseUrl = import.meta.env.BASE_URL
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${baseUrl}sw.js`, { scope: baseUrl })
  })
}

if (import.meta.env.DEV) {
  const clearOldPwaState = async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.unregister()))
    }
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames
        .filter((name) => name.startsWith('click-foundry-'))
        .map((name) => caches.delete(name)))
    }
  }

  let freshnessCheckRunning = false
  const checkDevelopmentRevision = async () => {
    if (freshnessCheckRunning || document.visibilityState === 'hidden') return
    freshnessCheckRunning = true
    try {
      await clearOldPwaState()
      const response = await fetch(`/src/dev-manifest.json?fresh=${Date.now()}`, { cache: 'no-store' })
      if (!response.ok) return
      const latest = await response.json() as { revision?: string | number }
      if (latest.revision && latest.revision !== devManifest.revision) {
        const url = new URL(window.location.href)
        url.searchParams.set('devRevision', String(latest.revision))
        window.location.replace(url)
      }
    } finally {
      freshnessCheckRunning = false
    }
  }

  window.addEventListener('focus', () => void checkDevelopmentRevision())
  window.addEventListener('pageshow', () => void checkDevelopmentRevision())
  document.addEventListener('visibilitychange', () => void checkDevelopmentRevision())
  window.setInterval(() => void checkDevelopmentRevision(), 5_000)
  void checkDevelopmentRevision()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
