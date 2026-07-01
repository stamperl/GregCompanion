export function formatAmount(amount: number) {
  if (amount >= 1000) return amount.toLocaleString()
  return Number.isInteger(amount) ? `${amount}` : amount.toFixed(1)
}

export function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`
}

export function formatSteamLitres(ms: number) {
  return Math.max(0, Math.floor(ms / 1000))
}

export function formatLitres(litres: number) {
  return Math.max(0, Math.floor(litres))
}
