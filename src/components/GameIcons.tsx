import { isEuCableMachine, isSteamPipeMachine } from '../game/content'
import type { MachineId, ResourceId } from '../game/types'
import { machineIconSrc, resourceIconSrc } from './gameIconAssets'
import { hasIconSprite } from './iconSprites'

export type PipeConnections = {
  up: boolean
  right: boolean
  down: boolean
  left: boolean
}

export function PixelIcon({ id }: { id: ResourceId }) {
  if (hasIconSprite(id)) {
    return (
      <span className="pixel-icon sprite-icon" aria-hidden="true">
        <svg viewBox="0 0 12 12" shapeRendering="crispEdges" focusable="false">
          <use href={`#sprite-${id}`} />
        </svg>
      </span>
    )
  }
  return (
    <span className={`pixel-icon item-sprite-icon pixel-${id}`} aria-hidden="true">
      <img src={resourceIconSrc(id)} alt="" draggable={false} decoding="sync" loading="eager" />
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

export function MachineGlyph({ id, active = false, pipeConnections }: { id: MachineId; active?: boolean; pipeConnections?: PipeConnections }) {
  const isConnector = isSteamPipeMachine(id) || isEuCableMachine(id)
  const className = [
    'machine-glyph',
    isConnector && pipeConnections ? 'machine-connector-glyph' : 'machine-sprite-glyph',
    `machine-${id}`,
    active ? 'active' : '',
    isConnector ? pipeConnectionClass(pipeConnections) : '',
  ].filter(Boolean).join(' ')
  if (isConnector && pipeConnections) {
    const path = pipePath(pipeConnections)
    const capPoints = [...pipeCapPoints(pipeConnections), ...loosePipeCapPoints(pipeConnections)]
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
      <img src={machineIconSrc(id)} alt="" draggable={false} decoding="sync" loading="eager" />
      <span />
    </span>
  )
}
