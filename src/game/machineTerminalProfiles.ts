import { machineRegistry } from './content'
import type { MachineId, MachineProcessKind, Tier } from './types'

export type MachineTerminalFamily =
  | 'processor'
  | 'producer'
  | 'storage'
  | 'transport'
  | 'port'
  | 'automation'
  | 'multiblock'
  | 'structure'

export type MachineTerminalProfile = {
  family: MachineTerminalFamily
  tier: Tier
}

const processFamily: Record<MachineProcessKind, MachineTerminalFamily> = {
  none: 'structure',
  furnace: 'processor',
  waterSource: 'producer',
  steamBoiler: 'producer',
  steamStorage: 'storage',
  itemStorage: 'storage',
  itemHopper: 'storage',
  steamPipe: 'transport',
  steamProcess: 'processor',
  steamToEu: 'producer',
  euStorage: 'storage',
  euCable: 'transport',
  euProcess: 'processor',
  euBlastProcess: 'multiblock',
  liquidSteamBoiler: 'producer',
  cokeOven: 'multiblock',
  blastFurnace: 'multiblock',
  euHatch: 'port',
  itemBus: 'port',
  fluidHatch: 'port',
  itemConductor: 'transport',
  fluidConductor: 'transport',
  conductorBundle: 'transport',
  fabricationCable: 'transport',
  fabricationInterface: 'port',
  fabricationController: 'automation',
  fabricationModule: 'automation',
  poweredWaterSource: 'producer',
  poweredFarm: 'processor',
  combustionGenerator: 'producer',
  euTransformer: 'transport',
}

export function machineTerminalProfile(machineId: MachineId): MachineTerminalProfile {
  const machine = machineRegistry[machineId]
  return {
    family: machine.multiblock ? 'multiblock' : processFamily[machine.processKind],
    tier: machine.tier,
  }
}
