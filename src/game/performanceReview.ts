export type PerformanceReviewSnapshot = {
  tickDurationsMs: number[]
  reactCommitDurationsMs: number[]
}

declare global {
  interface Window {
    __clickFoundryPerformance?: PerformanceReviewSnapshot
  }
}

function reviewSnapshot() {
  if (typeof window === 'undefined') return null
  window.__clickFoundryPerformance ??= { tickDurationsMs: [], reactCommitDurationsMs: [] }
  return window.__clickFoundryPerformance
}

function recordBoundedSample(samples: number[], durationMs: number) {
  samples.push(durationMs)
  if (samples.length > 240) samples.splice(0, samples.length - 240)
}

export function resetPerformanceReview() {
  if (typeof window !== 'undefined') window.__clickFoundryPerformance = { tickDurationsMs: [], reactCommitDurationsMs: [] }
}

export function recordTickDuration(durationMs: number) {
  const snapshot = reviewSnapshot()
  if (snapshot) recordBoundedSample(snapshot.tickDurationsMs, durationMs)
}

export function recordReactCommitDuration(durationMs: number) {
  const snapshot = reviewSnapshot()
  if (snapshot) recordBoundedSample(snapshot.reactCommitDurationsMs, durationMs)
}
