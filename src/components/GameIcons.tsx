import { isEuCableMachine, isSteamPipeMachine } from '../game/content'
import type { MachineId, ResourceId } from '../game/types'
import { hasIconSprite } from './iconSprites'

export type PipeConnections = {
  up: boolean
  right: boolean
  down: boolean
  left: boolean
}

function resourceIconSrc(id: ResourceId) {
  return `${import.meta.env.BASE_URL}game-icons/resources/${id}.png`
}

function machineIconSrc(id: MachineId) {
  return `${import.meta.env.BASE_URL}game-icons/machines/${id}.png`
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
      <img src={resourceIconSrc(id)} alt="" draggable={false} />
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
  if (count < 1) return 'M0 20 L40 20'
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
    return (
      <span className={className} aria-hidden="true">
        <svg className="pipe-svg" viewBox="0 0 40 40" focusable="false">
          <path className="pipe-outline" d={path} />
          <path className="pipe-body" d={path} />
          <path className="pipe-highlight" d={path} />
        </svg>
      </span>
    )
  }
  return (
    <span className={className} aria-hidden="true">
      <img src={machineIconSrc(id)} alt="" draggable={false} />
      <span />
    </span>
  )
}
