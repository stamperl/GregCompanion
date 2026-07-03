export type TimeProvider = {
  now: () => number
}

export const localTimeProvider: TimeProvider = {
  now: () => Date.now(),
}
