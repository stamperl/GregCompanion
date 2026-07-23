import { describe, expect, it, vi } from 'vitest'
import { createNetworkTimeProvider, deviceClockToleranceMs, networkTimeEndpoint } from './time'

describe('network time provider', () => {
  it('synchronizes once and advances from a monotonic clock', async () => {
    let monotonicMs = 100
    const fetchImpl = vi.fn(async () => {
      monotonicMs = 140
      return { ok: true, text: async () => 'colo=MAN\nts=1784214000.000\n' }
    })
    const provider = createNetworkTimeProvider(fetchImpl, () => monotonicMs)

    await expect(provider.sync()).resolves.toBe(1_784_214_000_020)
    expect(provider.isVerified()).toBe(true)
    expect(fetchImpl).toHaveBeenCalledWith(
      `${networkTimeEndpoint}?nonce=100`,
      expect.objectContaining({ cache: 'no-store', signal: expect.any(AbortSignal) }),
    )

    monotonicMs += 5000
    expect(provider.now()).toBe(1_784_214_005_020)
  })

  it('does not create trusted time from a failed or malformed response', async () => {
    const failed = createNetworkTimeProvider(async () => ({ ok: false, text: async () => '' }), () => 0)
    const malformed = createNetworkTimeProvider(async () => ({ ok: true, text: async () => 'colo=MAN' }), () => 0)

    await expect(failed.sync()).resolves.toBeNull()
    await expect(malformed.sync()).resolves.toBeNull()
    expect(failed.now()).toBeNull()
    expect(malformed.now()).toBeNull()
    expect(failed.isVerified()).toBe(false)
  })

  it('keeps the last verified clock when a later refresh fails', async () => {
    let monotonicMs = 10
    let succeeds = true
    const provider = createNetworkTimeProvider(
      async () => succeeds
        ? { ok: true, text: async () => 'ts=1784214000.000' }
        : { ok: false, text: async () => '' },
      () => monotonicMs,
    )

    await provider.sync()
    succeeds = false
    monotonicMs = 1010

    await expect(provider.sync()).resolves.toBeNull()
    expect(provider.now()).toBe(1_784_214_001_000)
    expect(provider.isVerified()).toBe(true)
  })

  it('can advance an unverified saved timestamp without consulting the device clock', () => {
    let monotonicMs = 100
    const provider = createNetworkTimeProvider(async () => ({ ok: false, text: async () => '' }), () => monotonicMs)

    provider.seed(5000, false)
    monotonicMs = 2100

    expect(provider.now()).toBe(7000)
    expect(provider.isVerified()).toBe(false)
  })

  it('ignores changes to the device clock after synchronization', async () => {
    let monotonicMs = 0
    const provider = createNetworkTimeProvider(
      async () => ({ ok: true, text: async () => 'ts=1784214000.000' }),
      () => monotonicMs,
    )
    await provider.sync()
    const dateNow = vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2099, 0, 1))

    monotonicMs = 2500

    expect(provider.now()).toBe(1_784_214_002_500)
    dateNow.mockRestore()
  })

  it('detects a device clock that does not line up with network time', async () => {
    const serverTimeMs = 1_784_214_000_000
    const provider = createNetworkTimeProvider(
      async () => ({ ok: true, text: async () => `ts=${serverTimeMs / 1000}` }),
      () => 0,
      () => serverTimeMs + deviceClockToleranceMs + 1,
    )

    await provider.sync()

    expect(provider.deviceClockMismatch()).toBe(true)
  })
})
