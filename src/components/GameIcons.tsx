import { isConductorMachine, isEuCableMachine, isFluidConductorMachine, isItemConductorMachine, isSteamPipeMachine } from '../game/content'
import type { MachineId, ResourceId } from '../game/types'
import { machineIconSrc, resourceIconSrc } from './gameIconAssets'
import { useState } from 'react'

export type PipeConnections = {
  up: boolean
  right: boolean
  down: boolean
  left: boolean
}

export function PixelIcon({ id }: { id: ResourceId }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className={failed ? `pixel-icon pixel-${id}` : 'pixel-icon item-sprite-icon'} aria-hidden="true">
      {!failed && <img src={resourceIconSrc(id)} alt="" draggable={false} decoding="sync" loading="eager" onError={() => setFailed(true)} />}
      <span />
    </span>
  )
}

export function GatherTapArt({ iconId }: { iconId: ResourceId }) {
  return (
    <span className="gather-tap-fallback" aria-hidden="true">
      <PixelIcon id={iconId} />
    </span>
  )
}

function pipeConnectionClass(connections?: PipeConnections) {
  if (!connections) return ''
  return [
    connections.up ? 'pipe-up' : '',
    connections.right ? 'pipe-right' : '',
    connections.down ? 'pipe-down' : '',
    connections.left ? 'pipe-left' : '',
  ].filter(Boolean).join(' ')
}

function pipePath(connections?: PipeConnections) {
  const pipeConnections = connections ?? { up: false, right: true, down: false, left: true }
  const { up, right, down, left } = pipeConnections
  const count = [up, right, down, left].filter(Boolean).length
  if (count < 1) return 'M12 20 L28 20'
  if (left && right && !up && !down) return 'M0 20 L40 20'
  if (up && down && !left && !right) return 'M20 0 L20 40'
  if (up && right && count === 2) return 'M20 0 L20 20 L40 20'
  if (right && down && count === 2) return 'M40 20 L20 20 L20 40'
  if (down && left && count === 2) return 'M20 40 L20 20 L0 20'
  if (left && up && count === 2) return 'M0 20 L20 20 L20 0'

  return [
    up ? 'M20 20 L20 0' : '',
    right ? 'M20 20 L40 20' : '',
    down ? 'M20 20 L20 40' : '',
    left ? 'M20 20 L0 20' : '',
  ].filter(Boolean).join(' ')
}

function pipeCapPoints(connections?: PipeConnections) {
  const pipeConnections = connections ?? { up: false, right: true, down: false, left: true }
  return [
    pipeConnections.up ? { x: 16, y: 0, width: 8, height: 6 } : null,
    pipeConnections.right ? { x: 34, y: 16, width: 6, height: 8 } : null,
    pipeConnections.down ? { x: 16, y: 34, width: 8, height: 6 } : null,
    pipeConnections.left ? { x: 0, y: 16, width: 6, height: 8 } : null,
  ].filter((point): point is { x: number; y: number; width: number; height: number } => Boolean(point))
}

function loosePipeCapPoints(connections?: PipeConnections) {
  const pipeConnections = connections ?? { up: false, right: true, down: false, left: true }
  const count = [pipeConnections.up, pipeConnections.right, pipeConnections.down, pipeConnections.left].filter(Boolean).length
  if (count > 0) return []
  return [
    { x: 10, y: 16, width: 5, height: 8 },
    { x: 25, y: 16, width: 5, height: 8 },
  ]
}

export function MachineGlyph({ id, active = false, pipeConnections, fabricationLane = false }: { id: MachineId; active?: boolean; pipeConnections?: PipeConnections; fabricationLane?: boolean }) {
  const [failed, setFailed] = useState(false)
  const hasFabricationLane = id === 'fabricationCable' || fabricationLane
  const isConductor = isConductorMachine(id) || hasFabricationLane
  const isConnector = isSteamPipeMachine(id) || isEuCableMachine(id) || isConductor
  const className = [
    'machine-glyph',
    isConnector && (pipeConnections || isConductor) ? 'machine-connector-glyph' : failed ? '' : 'machine-sprite-glyph',
    `machine-${id}`,
    hasFabricationLane ? 'has-fabrication-lane' : '',
    active && !isConnector ? 'active' : '',
    isConnector ? pipeConnectionClass(pipeConnections) : '',
  ].filter(Boolean).join(' ')
  if ((isConnector && pipeConnections) || isConductor) {
    const path = pipePath(pipeConnections)
    const capPoints = [...pipeCapPoints(pipeConnections), ...loosePipeCapPoints(pipeConnections)]
    if (isConductor) {
      return (
        <span className={className} aria-hidden="true">
          <svg className="pipe-svg conductor-svg" viewBox="0 0 40 40" shapeRendering="crispEdges" focusable="false">
            <path className="conductor-drop-shadow" d={path} />
            <path className="conductor-shell-outline" d={path} />
            <path className="conductor-shell" d={path} />
            <path className="conductor-trench" d={path} />
            {isItemConductorMachine(id) && <path className="conductor-lane conductor-item-lane" d={path} />}
            {isFluidConductorMachine(id) && <path className="conductor-lane conductor-fluid-lane" d={path} />}
            {hasFabricationLane && <path className="conductor-lane conductor-fabrication-lane" d={path} />}
            <rect className="conductor-hub-shadow" x="12" y="13" width="17" height="17" />
            <rect className="conductor-hub-frame" x="12" y="12" width="16" height="16" />
            <rect className="conductor-hub-face" x="15" y="15" width="10" height="10" />
            {isItemConductorMachine(id) && <rect className="conductor-hub-indicator conductor-item-indicator" x="16" y="18" width="8" height="2" />}
            {isFluidConductorMachine(id) && <rect className="conductor-hub-indicator conductor-fluid-indicator" x="16" y="21" width="8" height="2" />}
            {hasFabricationLane && <rect className="conductor-hub-indicator conductor-fabrication-indicator" x="16" y="15" width="8" height="2" />}
            <rect className="conductor-rivet" x="13" y="13" width="2" height="2" />
            <rect className="conductor-rivet" x="25" y="13" width="2" height="2" />
            <rect className="conductor-rivet" x="13" y="25" width="2" height="2" />
            <rect className="conductor-rivet" x="25" y="25" width="2" height="2" />
            {capPoints.map((point) => (
              <g key={`${point.x}-${point.y}`}>
                <rect className="conductor-cap-frame" x={point.x} y={point.y} width={point.width} height={point.height} />
                <rect className="conductor-cap-face" x={point.x + 1} y={point.y + 1} width={point.width - 2} height={point.height - 2} />
              </g>
            ))}
          </svg>
        </span>
      )
    }
    return (
      <span className={className} aria-hidden="true">
        <svg className="pipe-svg" viewBox="0 0 40 40" shapeRendering="crispEdges" focusable="false">
          <path className="pipe-shadow" d={path} />
          <path className="pipe-outline" d={path} />
          <path className="pipe-body" d={path} />
          <path className="pipe-core" d={path} />
          <path className="pipe-highlight" d={path} />
          <rect className="pipe-coupling" x="15" y="15" width="10" height="10" />
          {capPoints.map((point) => (
            <rect className="pipe-cap" x={point.x} y={point.y} width={point.width} height={point.height} key={`${point.x}-${point.y}`} />
          ))}
        </svg>
      </span>
    )
  }
  return (
    <span className={className} aria-hidden="true">
      {!failed && <img src={machineIconSrc(id)} alt="" draggable={false} decoding="sync" loading="eager" onError={() => setFailed(true)} />}
      <span />
    </span>
  )
}
