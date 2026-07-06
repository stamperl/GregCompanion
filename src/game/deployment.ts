import releaseManifest from '../release-manifest.json'

const deployedAt = import.meta.env.VITE_DEPLOYED_AT || new Date().toISOString()
const commitSha = import.meta.env.VITE_DEPLOY_VERSION || 'local'
const releaseChannel = import.meta.env.VITE_RELEASE_CHANNEL || (import.meta.env.PROD ? 'release' : 'home-dev')
const releaseRevision = import.meta.env.VITE_RELEASE_REVISION || releaseManifest.revision
const releaseTitle = import.meta.env.VITE_RELEASE_TITLE || releaseManifest.title
const releaseNotes = import.meta.env.VITE_RELEASE_NOTES
  ? String(import.meta.env.VITE_RELEASE_NOTES).split('|').map((note) => note.trim()).filter(Boolean)
  : releaseManifest.notes

export const deploymentInfo = {
  channel: releaseChannel,
  deployedAt,
  notes: releaseNotes,
  revision: releaseRevision,
  title: releaseTitle,
  version: commitSha === 'local' ? 'local' : commitSha.slice(0, 7),
}

function currentBundleUrl() {
  if (typeof document === 'undefined') return ''
  return document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]')?.src ?? ''
}

function liveBundleUrl(html: string) {
  const match = html.match(/<script[^>]+type="module"[^>]+src="([^"]*\/assets\/index-[^"]+\.js)"/)
  if (!match || typeof window === 'undefined') return ''
  return new URL(match[1], window.location.origin).href
}

export async function hasNewerDeployment() {
  if (!import.meta.env.PROD || typeof window === 'undefined') return false

  const currentUrl = currentBundleUrl()
  if (!currentUrl) return false

  const response = await fetch(`${import.meta.env.BASE_URL}?update=${Date.now()}`, {
    cache: 'no-store',
  })
  if (!response.ok) return false

  const nextUrl = liveBundleUrl(await response.text())
  return Boolean(nextUrl && nextUrl !== currentUrl)
}

export function reloadLatestDeployment() {
  if (typeof window === 'undefined') return
  window.location.replace(`${import.meta.env.BASE_URL}?reload=${Date.now()}`)
}
