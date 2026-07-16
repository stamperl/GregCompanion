export type TimeProvider = {
  now: () => number
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Pick<Response, 'ok' | 'text'>>

export type NetworkTimeProvider = {
  now: () => number | null
  deviceClockMismatch: () => boolean
  isVerified: () => boolean
  seed: (epochMs: number, verified: boolean) => void
  sync: () => Promise<number | null>
}

export const networkTimeEndpoint = 'https://www.cloudflare.com/cdn-cgi/trace'
export const deviceClockToleranceMs = 2 * 60 * 1000
const networkTimeTimeoutMs = 5000
const earliestAcceptedNetworkTimeMs = Date.UTC(2024, 0, 1)
const latestAcceptedNetworkTimeMs = Date.UTC(2100, 0, 1)

function defaultMonotonicNow() {
  return typeof performance !== 'undefined' ? performance.now() : 0
}

function parseCloudflareTimestamp(body: string) {
  const timestampLine = body.split(/\r?\n/).find((line) => line.startsWith('ts='))
  if (!timestampLine) return null
  const timestampMs = Number(timestampLine.slice(3)) * 1000
  if (!Number.isFinite(timestampMs) || timestampMs < earliestAcceptedNetworkTimeMs || timestampMs > latestAcceptedNetworkTimeMs) return null
  return timestampMs
}

export function createNetworkTimeProvider(
  fetchImpl: FetchLike = (input, init) => fetch(input, init),
  monotonicNow: () => number = defaultMonotonicNow,
  localNow: () => number = () => Date.now(),
): NetworkTimeProvider {
  let verifiedEpochMs: number | null = null
  let verifiedMonotonicMs = 0
  let verifiedSource = false
  let deviceClockOffsetMs: number | null = null

  return {
    now() {
      if (verifiedEpochMs === null) return null
      return verifiedEpochMs + Math.max(0, monotonicNow() - verifiedMonotonicMs)
    },
    deviceClockMismatch() {
      return deviceClockOffsetMs !== null && Math.abs(deviceClockOffsetMs) > deviceClockToleranceMs
    },
    isVerified() {
      return verifiedSource
    },
    seed(epochMs, verified) {
      if (verifiedEpochMs !== null || !Number.isFinite(epochMs)) return
      verifiedEpochMs = epochMs
      verifiedMonotonicMs = monotonicNow()
      verifiedSource = verified
    },
    async sync() {
      const requestStartedAt = monotonicNow()
      const controller = new AbortController()
      const timeout = globalThis.setTimeout(() => controller.abort(), networkTimeTimeoutMs)
      try {
        const response = await fetchImpl(`${networkTimeEndpoint}?nonce=${Math.floor(requestStartedAt)}`, {
          cache: 'no-store',
          headers: { Accept: 'text/plain' },
          signal: controller.signal,
        })
        if (!response.ok) return null
        const timestampMs = parseCloudflareTimestamp(await response.text())
        if (timestampMs === null) return null

        const responseReceivedAt = monotonicNow()
        verifiedEpochMs = timestampMs + Math.max(0, responseReceivedAt - requestStartedAt) / 2
        verifiedMonotonicMs = responseReceivedAt
        verifiedSource = true
        deviceClockOffsetMs = localNow() - verifiedEpochMs
        return verifiedEpochMs
      } catch {
        return null
      } finally {
        globalThis.clearTimeout(timeout)
      }
    },
  }
}

export const networkTimeProvider = createNetworkTimeProvider()

export const localTimeProvider: TimeProvider = {
  now: () => Date.now(),
}
