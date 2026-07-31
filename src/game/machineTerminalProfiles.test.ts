import { describe, expect, it } from 'vitest'
import { machineRegistry } from './content'
import { machineTerminalProfile } from './machineTerminalProfiles'
import type { MachineId } from './types'

describe('machine terminal profiles', () => {
  it('covers every registered machine with a tier and terminal family', () => {
    for (const machineId of Object.keys(machineRegistry) as MachineId[]) {
      const profile = machineTerminalProfile(machineId)
      expect(profile.family, machineId).toBeTruthy()
      expect(profile.tier, machineId).toBe(machineRegistry[machineId].tier)
    }
  })
})
