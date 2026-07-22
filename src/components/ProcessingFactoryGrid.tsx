import { memo, useMemo, type CSSProperties } from 'react'
import {
  fluidIds, fluidLabels, gatherTargets, isAutoMinerMachine, isConductorMachine, isEuCableMachine, isEuNetworkMachine,
  isEuPoweredMachine, isEuProducerMachine, isEuStorageMachine, isFluidConductorMachine, isItemAutomationMachine,
  isItemBusMachine, isItemConductorMachine, isItemHopperMachine, isItemStorageMachine, isLiquidSteamBoilerMachine,
  isSteamNetworkMachine, isSteamPipeMachine, isSteamPoweredMachine, isTankStorageMachine, machines, processRecipes,
  resourceLabels,
} from '../game/content'
import {
  arcBlastFurnaceStructureForInstance, availableConnectedEu, availableConnectedEuAmps, availableConnectedEuStorage,
  availableConnectedSteam, batteryBufferInstalledBatteries, boilerHasWater, boilerSteamCapacityMs,
  cokeOvenFluidCapacityLitres, conductorFaceSettings, hasFabricationCable, isAutoMinerPowered,
  isFluidOutletConfigurableMachine, isLvItemAutomationMachine, liquidSteamBoilerCapacityMs, lvItemAutomationStatus,
  machinesCanConnect, machinesCanConnectEu, multiblockControllerForInstance, multiblockPositions, pipeDirections,
  pipeSideMode, pipeSideModeLabels, planningRackStructureForInstance, planningRackStructureForPart, processStackLimit,
  steamPipeTransferLitresPerSecond, steamTankStructureForInstance, steamTurbineEuCapacity,
} from '../game/engine'
import { formatAmount } from '../game/format'
import type { FluidId, GameState, MachineId, MachineInstance, MachineProcessState, PipeDirection, PipeSideMode, ProcessSlot, ResourceAmount, ResourceId } from '../game/types'
import { MachineGlyph, type PipeConnections } from './GameIcons'

type FactoryFloorViewMode = 'production' | 'maintenance'
type FactoryMaintenanceState = 'running' | 'power-loss' | 'output-full' | 'idle'

export type FactoryFloorGridProps = {
  state: GameState
  width: number
  height: number
  viewMode: FactoryFloorViewMode
  placingMachineId: MachineId | null
  cellPressRef: { current: (x: number, y: number, instance?: MachineInstance) => void }
}

const factoryCellSize = 50
const factoryCellGap = 5
const assemblerExtraInputSlotIds = ['extraInput1', 'extraInput2', 'extraInput3', 'extraInput4'] as const
const assemblerInputSlotIds = ['input', 'secondaryInput', ...assemblerExtraInputSlotIds] as const
const mixerExtraInputSlotIds = ['extraInput1', 'extraInput2', 'extraInput3', 'extraInput4'] as const
const mixerInputSlotIds = ['input', 'secondaryInput', ...mixerExtraInputSlotIds] as const
const processOutputSlotIds = ['output', 'output2'] as const
const pipeDirectionOffsets: Record<PipeDirection, { dx: number; dy: number; label: string }> = {
  north: { dx: 0, dy: -1, label: 'North' },
  east: { dx: 1, dy: 0, label: 'East' },
  south: { dx: 0, dy: 1, label: 'South' },
  west: { dx: -1, dy: 0, label: 'West' },
}
const oppositePipeDirection: Record<PipeDirection, PipeDirection> = {
  north: 'south',
  east: 'west',
  south: 'north',
  west: 'east',
}

function fluidLabel(fluidId: FluidId) {
  return fluidLabels[fluidId]
}

function storedFluids(process: MachineProcessState) {
  return fluidIds
    .map((id) => ({ id, amount: process.fluids[id] ?? 0 }))
    .filter((fluid) => fluid.amount > 0)
}

function pipeFlowDirections(direction: PipeDirection, mode: PipeSideMode) {
  if (mode === 'blocked') return [] as PipeDirection[]
  if (mode === 'output') return [direction]
  if (mode === 'input') return [oppositePipeDirection[direction]]
  return [direction, oppositePipeDirection[direction]]
}

function PipeFlowArrows({ direction, mode }: { direction: PipeDirection; mode: PipeSideMode }) {
  const arrows = pipeFlowDirections(direction, mode)
  return (
    <span className={arrows.length > 1 ? 'pipe-flow-arrows dual' : 'pipe-flow-arrows'} aria-hidden="true">
      {arrows.map((arrow, index) => (
        <span className={`pipe-flow-arrow arrow-${arrow}`} key={`${arrow}-${index}`} />
      ))}
    </span>
  )
}

function processSlotCanPay(slot: ProcessSlot, amount: ResourceAmount) {
  return Boolean(slot && slot.id === amount.id && slot.amount >= amount.amount)
}

function findSelectedProcessRecipe(instance: MachineInstance | null) {
  if (!instance) return undefined
  return processRecipes.find((recipe) => {
    if (recipe.machineId !== instance.machineId) return false
    if (instance.process.configuredProgramNumber > 0
      ? recipe.programNumber !== instance.process.configuredProgramNumber
      : recipe.autoSelectable === false) return false
    if (recipe.fluidOnly) return true
    if (instance.machineId === 'lvAssembler' || instance.machineId === 'lvMixer') {
      const inputSlotIds = instance.machineId === 'lvMixer' ? mixerInputSlotIds : assemblerInputSlotIds
      const slots = inputSlotIds.map((slotId) => instance.process[slotId])
      if (!slots.some(Boolean)) return false
      const costs = [recipe.input, ...(recipe.secondaryInput ? [recipe.secondaryInput] : []), ...(recipe.extraInputs ?? [])]
      const requiredByResource = new Map<ResourceId, number>()
      for (const cost of costs) requiredByResource.set(cost.id, (requiredByResource.get(cost.id) ?? 0) + cost.amount)
      if (slots.some((slot) => slot && !requiredByResource.has(slot.id))) return false
      return [...requiredByResource].every(
        ([resourceId, required]) => slots.reduce((total, slot) => total + (slot?.id === resourceId ? slot.amount : 0), 0) >= required,
      )
    }
    const extraInputs = assemblerExtraInputSlotIds.map((slotId) => instance.process[slotId])
    if (recipe.extraInputs?.length) {
      if (!processSlotCanPay(instance.process.input, recipe.input)) return false
      if (recipe.secondaryInput && !processSlotCanPay(instance.process.secondaryInput, recipe.secondaryInput)) return false
      if (!recipe.secondaryInput && instance.process.secondaryInput) return false
      if (!recipe.extraInputs.every((cost, index) => processSlotCanPay(extraInputs[index] ?? null, cost))) return false
      return !extraInputs.slice(recipe.extraInputs.length).some(Boolean)
    }
    if (extraInputs.some(Boolean)) return false
    if (!recipe.secondaryInput) return !instance.process.secondaryInput && processSlotCanPay(instance.process.input, recipe.input)
    if (!instance.process.secondaryInput) return false
    return (
      (processSlotCanPay(instance.process.input, recipe.input) && processSlotCanPay(instance.process.secondaryInput, recipe.secondaryInput)) ||
      (processSlotCanPay(instance.process.input, recipe.secondaryInput) && processSlotCanPay(instance.process.secondaryInput, recipe.input))
    )
  })
}

function machineStatus(state: GameState, instance: MachineInstance) {
  const process = instance.process
  const recipe = findSelectedProcessRecipe(instance)
  const storedItemCount = [
    process.input,
    process.secondaryInput,
    process.extraInput1,
    process.extraInput2,
    process.extraInput3,
    process.extraInput4,
    process.fuel,
    process.output,
    process.output2,
    ...process.storageSlots,
  ].reduce((sum, slot) => sum + (slot?.amount ?? 0), 0)
  if (instance.machineId === 'well') return 'Supplying water'
  if (isItemStorageMachine(instance.machineId)) return storedItemCount > 0 ? `Storing ${formatAmount(storedItemCount)} items` : 'Empty storage'
  if (isItemHopperMachine(instance.machineId)) {
    const inputDirections = pipeDirections.filter((direction) => {
      const mode = pipeSideMode(instance, direction)
      return mode === 'input' || mode === 'both'
    })
    const outputDirections = pipeDirections.filter((direction) => {
      const mode = pipeSideMode(instance, direction)
      return mode === 'output' || mode === 'both'
    })
    if (inputDirections.length < 1 && outputDirections.length < 1) return 'No route set'
    if (outputDirections.length < 1) return storedItemCount > 0 ? `Holding ${formatAmount(storedItemCount)} items; no output side` : 'No output side'
    if (storedItemCount < 1) return 'Empty hopper'
    const outputLabel = outputDirections.map((direction) => pipeDirectionOffsets[direction].label).join(', ')
    return process.activeRecipeId ? `Feeding ${outputLabel}` : `Ready ${outputLabel}`
  }
  if (isTankStorageMachine(instance.machineId)) {
    const storedFluid = storedFluids(process)[0]
    if (storedFluid) return `Holding ${fluidLabel(storedFluid.id).toLowerCase()}`
    return process.steamStoredMs > 0 ? 'Holding steam' : 'Empty tank'
  }
  if (isSteamPipeMachine(instance.machineId)) return `${steamPipeTransferLitresPerSecond[instance.machineId] ?? 0}L/s transfer`
  if (isEuCableMachine(instance.machineId)) {
    const cableAmps = machines[instance.machineId].euAmps ?? 1
    return `${cableAmps}A LV cable`
  }
  if (isEuStorageMachine(instance.machineId)) {
    const installedBatteries = batteryBufferInstalledBatteries(instance)
    if (installedBatteries < 1) return 'Needs battery'
    if (process.euStored >= process.euCapacity) return 'EU buffer full'
    return process.activeRecipeId ? 'Charging EU' : 'Buffer ready'
  }
  if (isLiquidSteamBoilerMachine(instance.machineId)) {
    if (!boilerHasWater(state, instance)) return 'No water'
    if ((process.fluids.creosote ?? 0) < 1) return 'No creosote'
    if (process.steamStoredMs >= liquidSteamBoilerCapacityMs) return 'Steam full'
    return process.activeRecipeId ? 'Burning creosote' : 'Ready'
  }
  if (instance.machineId === 'lvAirCollector') {
    if ((process.fluids.air ?? 0) >= process.fluidCapacityLitres) return 'Air buffer full'
    if (process.euStored + availableConnectedEu(state, instance) < 1) return 'No power'
    return process.activeRecipeId ? 'Collecting air' : 'Ready'
  }
  if (isEuProducerMachine(instance.machineId)) {
    if (process.euStored >= steamTurbineEuCapacity) return 'EU full'
    if (availableConnectedSteam(state, instance) < 1) return 'No steam'
    return process.activeRecipeId ? 'Generating EU' : 'Ready'
  }
  if (isAutoMinerMachine(instance.machineId)) {
    const assignedTarget = state.autoMinerAssignments[instance.uid]
    if (!assignedTarget) return 'No assignment'
    if ((process.output?.amount ?? 0) >= processStackLimit) return 'Output full'
    if (!isAutoMinerPowered(state, instance)) return 'No power'
    return process.activeRecipeId ? `Mining ${gatherTargets[assignedTarget].name}` : 'Ready'
  }
  if (instance.machineId === 'steamBoiler') {
    if (!boilerHasWater(state, instance)) return 'No water'
    if (process.steamStoredMs >= boilerSteamCapacityMs && process.fuelRemainingMs > 0) return 'Steam full - fuel paused'
    if (process.steamStoredMs >= boilerSteamCapacityMs) return 'Steam full'
    if (!process.fuel && process.fuelRemainingMs < 1) return 'No fuel'
    return process.fuelRemainingMs > 0 ? 'Making steam' : 'Ready'
  }
  if (instance.machineId === 'cokeOven') {
    if (!recipe) return 'No input'
    if (process.output && recipe.output && (process.output.id !== recipe.output.id || process.output.amount + recipe.output.amount > processStackLimit)) return 'Output full'
    if (recipe.fluidOutput && (process.fluids[recipe.fluidOutput.id] ?? 0) + recipe.fluidOutput.amount > (process.fluidCapacityLitres || cokeOvenFluidCapacityLitres)) {
      return 'Creosote full'
    }
    return process.activeRecipeId ? 'Coking' : 'Ready'
  }
  if (instance.machineId === 'brickedBlastFurnace') {
    const inputRecipe = process.input
      ? processRecipes.find((candidate) => candidate.machineId === instance.machineId && candidate.input.id === process.input?.id)
      : undefined
    if (!inputRecipe) return 'Needs iron'
    if (process.input && process.input.amount < inputRecipe.input.amount) return `Needs ${inputRecipe.input.amount} ${resourceLabels[inputRecipe.input.id]}`
    const blastRecipe = process.fuel
      ? processRecipes.find(
          (candidate) =>
            candidate.machineId === instance.machineId &&
            candidate.input.id === process.input?.id &&
            candidate.fuelInput?.id === process.fuel?.id,
        )
      : undefined
    if (!blastRecipe) return 'Needs coke'
    if (blastRecipe.fuelInput && (!process.fuel || process.fuel.amount < blastRecipe.fuelInput.amount)) {
      return `Needs ${blastRecipe.fuelInput.amount} ${resourceLabels[blastRecipe.fuelInput.id]}`
    }
    if (process.output && blastRecipe.output && (process.output.id !== blastRecipe.output.id || process.output.amount + blastRecipe.output.amount > processStackLimit)) return 'Output full'
    return process.activeRecipeId ? 'Blasting' : 'Ready'
  }
  if (instance.machineId === 'arcBlastFurnace') {
    const formedStructure = arcBlastFurnaceStructureForInstance(state, instance)
    if (!recipe) return 'No input'
    if (process.output && recipe.output && (process.output.id !== recipe.output.id || process.output.amount + recipe.output.amount > processStackLimit)) return 'Output full'
    const missingFluid = (recipe.fluidInputs ?? (recipe.fluidInput ? [recipe.fluidInput] : [])).find((fluid) => (process.fluids[fluid.id] ?? 0) < fluid.amount)
    if (missingFluid) return `Needs ${fluidLabel(missingFluid.id)}`
    const minimumEuStored = recipe.minimumEuStored ?? 0
    if (minimumEuStored > 0 && process.progressMs === 0 && process.euStored + availableConnectedEuStorage(state, instance) < minimumEuStored) return 'Waiting for buffer'
    if (!formedStructure && recipe.requiredEuAmps && availableConnectedEuAmps(state, instance) < recipe.requiredEuAmps) return `Needs ${recipe.requiredEuAmps}A route`
    if (process.euStored + availableConnectedEu(state, instance) < 1) return 'Underpowered'
    return process.activeRecipeId ? 'Blasting' : 'Ready'
  }
  if (isSteamPoweredMachine(instance.machineId)) {
    if (!recipe) return 'No input'
    if (process.output && recipe.output && (process.output.id !== recipe.output.id || process.output.amount + recipe.output.amount > processStackLimit)) return 'Output full'
    if (process.steamStoredMs + availableConnectedSteam(state, instance) < 1) return 'No steam'
    return process.activeRecipeId ? 'Running' : 'Ready'
  }
  if (isEuPoweredMachine(instance.machineId)) {
    if (!recipe) return 'No input'
    const recipeOutputs = [recipe.output, recipe.secondaryOutput].filter((output): output is ResourceAmount => Boolean(output && output.amount > 0))
    const blockedOutputIndex = recipeOutputs.findIndex((output, index) => {
      const slot = process[processOutputSlotIds[index]]
      return Boolean(slot && (slot.id !== output.id || slot.amount + output.amount > processStackLimit))
    })
    if (blockedOutputIndex >= 0) return `Output ${blockedOutputIndex + 1} full`
    if (recipe.machineOutput && process.machineOutput && (
      process.machineOutput.id !== recipe.machineOutput.id ||
      process.machineOutput.amount + recipe.machineOutput.amount > processStackLimit
    )) return 'Output full'
    const missingFluid = (recipe.fluidInputs ?? (recipe.fluidInput ? [recipe.fluidInput] : [])).find((fluid) => (process.fluids[fluid.id] ?? 0) < fluid.amount)
    if (missingFluid) return `Needs ${fluidLabel(missingFluid.id)}`
    if (process.euStored + availableConnectedEu(state, instance) < 1) return 'No power'
    return process.activeRecipeId ? 'Running' : 'Ready'
  }
  if (!recipe) return 'No input'
  if (process.output && recipe.output && (process.output.id !== recipe.output.id || process.output.amount + recipe.output.amount > processStackLimit)) return 'Output full'
  if (!process.fuel && process.fuelRemainingMs < 1) return 'No fuel'
  return process.activeRecipeId ? 'Smelting' : 'Ready'
}

const FactoryFloorGrid = memo(function FactoryFloorGrid({
  state,
  width,
  height,
  viewMode,
  placingMachineId,
  cellPressRef,
}: FactoryFloorGridProps) {
  const machineByCell = useMemo(
    () => new Map(state.machineInstances.map((instance) => [`${instance.x},${instance.y}`, instance])),
    [state.machineInstances],
  )
  const machineAtCell = (x: number, y: number) => machineByCell.get(`${x},${y}`)
  const planningRackByUid = useMemo(() => {
    const racks = state.machineInstances
      .filter((instance) => instance.machineId === 'planningController')
      .map((controller) => planningRackStructureForInstance(state, controller))
      .filter((rack): rack is NonNullable<typeof rack> => Boolean(rack))
    const byUid = new Map<string, (typeof racks)[number]>()
    for (const rack of racks) {
      byUid.set(rack.controller.uid, rack)
      for (const cell of rack.cells) byUid.set(cell.uid, rack)
    }
    return byUid
  }, [state])

  const pipeConnectionsForInstance = (instance: MachineInstance): PipeConnections | undefined => {
    const isSteamPipe = isSteamPipeMachine(instance.machineId)
    const isEuCable = isEuCableMachine(instance.machineId)
    const isConductor = isConductorMachine(instance.machineId) || hasFabricationCable(instance)
    if (!isSteamPipe && !isEuCable && !isConductor) return undefined
    const isSteamPipeNeighbour = (machineId: MachineId) =>
      isSteamNetworkMachine(machineId) || (machines[machineId].fluidCapacityLitres ?? 0) > 0 || machineId === 'well'
    const connectsTo = (x: number, y: number) => {
      const neighbour = machineAtCell(x, y)
      if (!neighbour) return false
      if (isConductor) {
        const direction = pipeDirections.find((candidate) => {
          const offset = pipeDirectionOffsets[candidate]
          return instance.x + offset.dx === x && instance.y + offset.dy === y
        })
        if (!direction) return false
        if (isConductorMachine(neighbour.machineId) || hasFabricationCable(neighbour)) {
          return (isItemConductorMachine(instance.machineId) && isItemConductorMachine(neighbour.machineId)) ||
            (isFluidConductorMachine(instance.machineId) && isFluidConductorMachine(neighbour.machineId)) ||
            (hasFabricationCable(instance) && hasFabricationCable(neighbour))
        }
        if (hasFabricationCable(instance) && instance.fabricationInterfaces?.[direction]) return true
        if (hasFabricationCable(instance) && (
          neighbour.machineId === 'planningController' ||
          machines[neighbour.machineId].processKind === 'fabricationInterface'
        )) return true
        const itemOpen = isItemConductorMachine(instance.machineId) && conductorFaceSettings(instance, 'item', direction).mode !== 'blocked'
        const fluidOpen = isFluidConductorMachine(instance.machineId) && conductorFaceSettings(instance, 'fluid', direction).mode !== 'blocked'
        return itemOpen || fluidOpen
      }
      return (isEuCable ? machinesCanConnectEu(instance, neighbour) : machinesCanConnect(instance, neighbour)) &&
        (isSteamPipe ? isSteamPipeNeighbour(neighbour.machineId) : isEuNetworkMachine(neighbour.machineId))
    }
    return {
      up: connectsTo(instance.x, instance.y - 1),
      right: connectsTo(instance.x + 1, instance.y),
      down: connectsTo(instance.x, instance.y + 1),
      left: connectsTo(instance.x - 1, instance.y),
    }
  }

  const controllerForMultiblockPart = (instance: MachineInstance) => {
    const controller = multiblockControllerForInstance(state, instance)
    return controller ? machineAtCell(controller.x, controller.y) : null
  }

  const controllerForStructure = (instance: MachineInstance) => {
    const tankStructure = steamTankStructureForInstance(state, instance)
    if (tankStructure) return tankStructure.controller
    const arcStructure = arcBlastFurnaceStructureForInstance(state, instance)
    if (arcStructure) return arcStructure.controller
    const planningRack = planningRackStructureForPart(state, instance)
    if (planningRack) return planningRack.controller
    return controllerForMultiblockPart(instance)
  }

  const fabricationInterfacesForTarget = (target: MachineInstance) =>
    pipeDirections.flatMap((direction) => {
      const offset = pipeDirectionOffsets[direction]
      const cable = machineAtCell(target.x + offset.dx, target.y + offset.dy)
      const attachment = cable?.fabricationInterfaces?.[oppositePipeDirection[direction]]
      if (!cable || !hasFabricationCable(cable) || !attachment) return []
      return [{
        attachment,
        direction,
        patternCount: state.recipeCards.filter((card) => card.installedInUid === attachment.uid).length,
      }]
    })

  const fluidOutputFacesForInstance = (instance: MachineInstance) => {
    const controller = controllerForStructure(instance) ?? instance
    const multiblock = multiblockControllerForInstance(state, controller)
    if (!multiblock || !isFluidOutletConfigurableMachine(multiblock.spec.controller)) return []
    const originX = multiblock.x - (multiblock.spec.controllerOffsetX ?? 0)
    const originY = multiblock.y - (multiblock.spec.controllerOffsetY ?? 0)
    const maxX = originX + multiblock.spec.width - 1
    const maxY = originY + multiblock.spec.height - 1
    return multiblockPositions(state, multiblock.x, multiblock.y, multiblock.spec)
      .flatMap((position) => {
        const cell = machineAtCell(position.x, position.y)
        if (!cell) return []
        const directions: PipeDirection[] = []
        if (position.y === originY) directions.push('north')
        if (position.x === maxX) directions.push('east')
        if (position.y === maxY) directions.push('south')
        if (position.x === originX) directions.push('west')
        return directions.map((direction) => ({ cell, direction }))
      })
  }

  const pipePolarityForInstance = (instance: MachineInstance) => {
    const isSteamPipe = isSteamPipeMachine(instance.machineId)
    const isEuCable = isEuCableMachine(instance.machineId)
    const isEuBuffer = isEuStorageMachine(instance.machineId)
    const isEuRoute = isEuCable || isEuBuffer
    const isConductor = isConductorMachine(instance.machineId) || hasFabricationCable(instance)
    const isHopper = isItemHopperMachine(instance.machineId)
    const fluidFaces = isFluidOutletConfigurableMachine(instance.machineId)
      ? fluidOutputFacesForInstance(instance).filter((face) => face.cell.uid === instance.uid)
      : []
    if (!isSteamPipe && !isEuCable && !isEuBuffer && !isConductor && !isHopper && fluidFaces.length < 1) return null

    if (fluidFaces.length > 0) {
      const sides = fluidFaces.flatMap((face) => {
        const offset = pipeDirectionOffsets[face.direction]
        const mode = pipeSideMode(face.cell, face.direction)
        if (mode !== 'output') return []
        const neighbour = machineAtCell(face.cell.x + offset.dx, face.cell.y + offset.dy)
        return [{
          direction: face.direction,
          mode,
          state: neighbour && machinesCanConnect(face.cell, neighbour) ? 'connected' as const : 'open' as const,
          label: `${offset.label} ${pipeSideModeLabels[mode]}`,
        }]
      })
      return sides.length > 0 ? sides : null
    }

    return pipeDirections.map((direction) => {
      const offset = pipeDirectionOffsets[direction]
      const neighbour = machineAtCell(instance.x + offset.dx, instance.y + offset.dy)
      const conductorModes = isConductor
        ? [
            ...(isItemConductorMachine(instance.machineId) ? [conductorFaceSettings(instance, 'item', direction).mode] : []),
            ...(isFluidConductorMachine(instance.machineId) ? [conductorFaceSettings(instance, 'fluid', direction).mode] : []),
            ...(hasFabricationCable(instance) ? ['both' as PipeSideMode] : []),
          ]
        : []
      const mode = isConductor
        ? conductorModes.includes('both') || (conductorModes.includes('input') && conductorModes.includes('output'))
          ? 'both'
          : conductorModes.find((candidate) => candidate !== 'blocked') ?? 'blocked'
        : pipeSideMode(instance, direction)
      const blocked = mode === 'blocked'
      const isSteamPipeNeighbour = (machineId: MachineId) =>
        isSteamNetworkMachine(machineId) || (machines[machineId].fluidCapacityLitres ?? 0) > 0 || machineId === 'well'
      const connected = Boolean(
        !blocked &&
          neighbour &&
          (isHopper
            ? (((mode === 'input' || mode === 'both') && !isItemHopperMachine(neighbour.machineId) && !isItemBusMachine(neighbour.machineId)) ||
                ((mode === 'output' || mode === 'both') && (isItemStorageMachine(neighbour.machineId) || !isItemAutomationMachine(neighbour.machineId))))
            : isConductor
              ? pipeConnectionsForInstance(instance)?.[direction === 'north' ? 'up' : direction === 'east' ? 'right' : direction === 'south' ? 'down' : 'left']
              : (isEuRoute ? machinesCanConnectEu(instance, neighbour) : machinesCanConnect(instance, neighbour)) &&
              (isEuRoute ? isEuNetworkMachine(neighbour.machineId) : isSteamPipeNeighbour(neighbour.machineId))),
      )
      return {
        direction,
        mode,
        state: blocked ? 'blocked' as const : connected ? 'connected' as const : 'open' as const,
        label: `${offset.label} ${pipeSideModeLabels[mode]}`,
      }
    })
  }

  return (
    <div className={`factory-grid factory-view-${viewMode}`} style={{ gridTemplateColumns: `repeat(${width}, ${factoryCellSize}px)` }} aria-label="Factory grid">
      {Array.from({ length: width * height }, (_, index) => {
        const x = index % width
        const y = Math.floor(index / width)
        const instance = machineAtCell(x, y)
        const planningRack = instance ? planningRackByUid.get(instance.uid) : undefined
        const isPlanningRackController = Boolean(planningRack && instance?.uid === planningRack.controller.uid)
        const isPlanningRackModule = Boolean(planningRack && instance?.uid !== planningRack.controller.uid)
        const isPlanningRackOrigin = Boolean(planningRack && instance?.x === planningRack.originX && instance?.y === planningRack.originY)
        const arcStructure = instance ? arcBlastFurnaceStructureForInstance(state, instance) : null
        const isFormedArc = Boolean(arcStructure?.formed)
        const isFormedArcController = Boolean(isFormedArc && arcStructure && instance?.uid === arcStructure.controller.uid)
        const isFormedArcInspection = false
        const showFormedArc = isFormedArcController && !isFormedArcInspection
        const multiblockController = instance ? controllerForMultiblockPart(instance) : null
        const tankStructure = instance && isTankStorageMachine(instance.machineId) ? steamTankStructureForInstance(state, instance) : null
        const isMultiblockController = Boolean(instance?.machineId && machines[instance.machineId].multiblock)
        const isTankStructureController = Boolean(tankStructure && instance && tankStructure.controller.uid === instance.uid && tankStructure.area > 1)
        const isTankStructureChild = Boolean(tankStructure && instance && tankStructure.controller.uid !== instance.uid)
        const isStructureController = isMultiblockController || isTankStructureController || isPlanningRackController
        const isStructureCell = isStructureController || Boolean(multiblockController) || isTankStructureChild || isPlanningRackModule
        const isConnector = Boolean(instance && (isSteamPipeMachine(instance.machineId) || isEuCableMachine(instance.machineId) || isConductorMachine(instance.machineId) || hasFabricationCable(instance)))
        const attachedFabricationInterfaces = instance ? fabricationInterfacesForTarget(instance) : []
        const pipePolarity = viewMode === 'maintenance' && instance ? pipePolarityForInstance(instance) : null
        const itemAutomationDirection =
          viewMode === 'maintenance' && instance && isLvItemAutomationMachine(instance.machineId)
            ? instance.itemOutputDirection
            : undefined
        const itemAutomationStatus = itemAutomationDirection && instance ? lvItemAutomationStatus(state, instance) : null
        const structureMachineId = planningRack?.controller.machineId ?? tankStructure?.controller.machineId ?? multiblockController?.machineId ?? (isMultiblockController ? instance?.machineId : null)
        const structureStyle =
          tankStructure && isTankStructureController
            ? ({
                '--structure-width': `${tankStructure.width * factoryCellSize + Math.max(0, tankStructure.width - 1) * factoryCellGap}px`,
                '--structure-height': `${tankStructure.height * factoryCellSize + Math.max(0, tankStructure.height - 1) * factoryCellGap}px`,
              } as CSSProperties)
            : planningRack && isPlanningRackOrigin
              ? ({
                  '--structure-width': `${planningRack.width * factoryCellSize + Math.max(0, planningRack.width - 1) * factoryCellGap}px`,
                  '--structure-height': `${planningRack.height * factoryCellSize + Math.max(0, planningRack.height - 1) * factoryCellGap}px`,
                } as CSSProperties)
            : undefined
        const isMachineActive = Boolean(
          instance &&
            !isConnector &&
            (instance.process.fuelRemainingMs > 0 ||
              instance.process.activeRecipeId ||
              (isSteamNetworkMachine(instance.machineId) && instance.process.steamStoredMs > 0) ||
              (isEuNetworkMachine(instance.machineId) && instance.process.euStored > 0) ||
              Object.values(instance.process.fluids).some((amount) => (amount ?? 0) > 0)),
        )
        const statusLabel = viewMode === 'maintenance' && instance && !isConnector ? machineStatus(state, instance) : ''
        const hasPowerFailure = Boolean(
          viewMode === 'maintenance' &&
            instance &&
            !isConnector &&
            ((isSteamPoweredMachine(instance.machineId) && availableConnectedSteam(state, instance) < 1) ||
              (isEuPoweredMachine(instance.machineId) && availableConnectedEu(state, instance) < 1)),
        )
        const maintenanceState: FactoryMaintenanceState =
          viewMode !== 'maintenance' || !instance || isConnector
            ? 'idle'
            : statusLabel === 'Output full' || (instance.process.output?.amount ?? 0) >= processStackLimit
              ? 'output-full'
              : hasPowerFailure ||
                  statusLabel === 'No power' ||
                  statusLabel === 'Underpowered' ||
                  statusLabel === 'No steam' ||
                  statusLabel === 'Waiting for buffer' ||
                  /^Needs \d+A route$/.test(statusLabel)
                ? 'power-loss'
                : instance.process.activeRecipeId || instance.process.fuelRemainingMs > 0 || statusLabel === 'Supplying water'
                  ? 'running'
                  : 'idle'
        const animateMachine = viewMode === 'maintenance' && maintenanceState === 'running'

        return (
          <button
            type="button"
            className={
              instance
                ? [
                    'factory-cell',
                    'occupied',
                    `machine-${instance.machineId}-cell`,
                    isConnector ? 'connector-cell' : '',
                    isMachineActive ? 'active' : '',
                    `maintenance-${maintenanceState}`,
                    isMultiblockController ? 'multiblock-bbf-controller' : '',
                    multiblockController ? 'multiblock-bbf-child' : '',
                    isTankStructureController ? 'tank-structure-controller' : '',
                    isTankStructureChild ? 'tank-structure-child' : '',
                    isPlanningRackController ? 'planning-rack-controller' : '',
                    isPlanningRackModule ? 'planning-rack-module' : '',
                    isPlanningRackOrigin ? 'planning-rack-origin' : '',
                    isFormedArc ? 'formed-arc-cell' : '',
                    isFormedArcController ? 'formed-arc-controller-cell' : '',
                    isFormedArc && !isFormedArcController ? 'formed-arc-child-cell' : '',
                    isFormedArcInspection ? 'formed-arc-inspection-cell' : '',
                  ].filter(Boolean).join(' ')
                : placingMachineId
                  ? 'factory-cell placing'
                  : 'factory-cell'
            }
            style={structureStyle}
            aria-label={
              instance
                ? `${isStructureCell && structureMachineId ? machines[structureMachineId].name : machines[instance.machineId].name} at ${x + 1}, ${y + 1}${statusLabel ? `, ${statusLabel}` : ''}`
                : `Empty factory cell ${x + 1}, ${y + 1}`
            }
            onClick={() => cellPressRef.current(x, y, instance)}
            key={`${x}-${y}`}
          >
            {isPlanningRackOrigin && planningRack ? (
              <span className="formed-planning-rack" aria-hidden="true">
                {planningRack.cells.map((cell) => (
                  <span
                    className={`formed-planning-rack-module module-${cell.machineId}`}
                    style={{
                      left: `${(cell.x - planningRack.originX) * (factoryCellSize + factoryCellGap)}px`,
                      top: `${(cell.y - planningRack.originY) * (factoryCellSize + factoryCellGap)}px`,
                    }}
                    key={cell.uid}
                  >
                    <MachineGlyph id={cell.machineId} />
                  </span>
                ))}
              </span>
            ) : showFormedArc && arcStructure ? (
              <span className={animateMachine ? 'formed-arc-render active' : 'formed-arc-render'} aria-hidden="true">
                <img src={`${import.meta.env.BASE_URL}game-art/formed-arc-blast-furnace.png`} alt="" draggable={false} />
                <span className="formed-arc-core" />
                {arcStructure.perimeter
                  .filter((part) => part.machineId !== 'arcBlastFurnacePart')
                  .map((part) => {
                    const activeDirection = pipeDirections.find((direction) => pipeSideMode(part, direction) !== 'blocked') ?? 'east'
                    return (
                      <span
                        className={`formed-arc-port formed-arc-port-${part.machineId} formed-arc-port-direction-${activeDirection}`}
                        style={{
                          left: `${(part.x - arcStructure.controller.x + 1) * (factoryCellSize + factoryCellGap) + factoryCellSize / 2}px`,
                          top: `${(part.y - arcStructure.controller.y + 1) * (factoryCellSize + factoryCellGap) + factoryCellSize / 2}px`,
                        }}
                        key={part.uid}
                      >
                        <span className="formed-arc-port-mark" />
                      </span>
                    )
                  })}
              </span>
            ) : instance && (!isFormedArc || isFormedArcInspection) && (!isStructureCell || isStructureController || isFormedArcInspection) ? (
              <MachineGlyph id={instance.machineId} active={animateMachine} pipeConnections={pipeConnectionsForInstance(instance)} fabricationLane={hasFabricationCable(instance)} />
            ) : (
              <span />
            )}
            {pipePolarity && (
              <span className="pipe-polarity-overlay" aria-label="Pipe polarity">
                {pipePolarity.map((side) => (
                  <span className={`pipe-polarity-side ${side.direction} ${side.state} mode-${side.mode}`} title={side.label} key={side.direction}>
                    {instance && isEuCableMachine(instance.machineId) ? <span className="cable-connection-mark" /> : <PipeFlowArrows direction={side.direction} mode={side.mode} />}
                    {instance && isItemHopperMachine(instance.machineId) && side.mode !== 'blocked' && (
                      <span className="hopper-route-mark">{side.mode === 'input' ? 'IN' : side.mode === 'output' ? 'OUT' : 'I/O'}</span>
                    )}
                    {instance && (isConductorMachine(instance.machineId) || hasFabricationCable(instance)) && side.mode !== 'blocked' && (
                      <span className="conductor-route-mark">{isItemConductorMachine(instance.machineId) ? 'I' : ''}{isFluidConductorMachine(instance.machineId) ? 'F' : ''}{hasFabricationCable(instance) ? 'N' : ''}</span>
                    )}
                  </span>
                ))}
              </span>
            )}
            {itemAutomationDirection && (
              <span className="machine-automation-direction-overlay" aria-label={`Automatic item output ${pipeDirectionOffsets[itemAutomationDirection].label}`}>
                <span
                  className={`pipe-polarity-side machine-automation-output ${itemAutomationDirection} mode-output`}
                  title={`${pipeDirectionOffsets[itemAutomationDirection].label} automatic item output: ${itemAutomationStatus?.label ?? 'Ready'}`}
                >
                  <PipeFlowArrows direction={itemAutomationDirection} mode="output" />
                </span>
              </span>
            )}
            {attachedFabricationInterfaces.length > 0 && (
              <span className="fabrication-interface-overlay" aria-label={`${attachedFabricationInterfaces.length} attached job interface ${attachedFabricationInterfaces.length === 1 ? 'face' : 'faces'}`}>
                {attachedFabricationInterfaces.map(({ attachment, direction, patternCount }) => (
                  <span
                    className={`fabrication-interface-port ${direction}`}
                    title={`Job Interface Face: ${patternCount} installed ${patternCount === 1 ? 'pattern' : 'patterns'}`}
                    key={attachment.uid}
                  >
                    <span className="fabrication-interface-socket" />
                    <b>{patternCount}</b>
                  </span>
                ))}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
})

export default FactoryFloorGrid
