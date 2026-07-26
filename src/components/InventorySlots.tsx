import { fluidLabels, machines, resourceLabels } from '../game/content'
import { durabilityRemaining, maxDurability } from '../game/engine'
import { formatAmount, formatLitres } from '../game/format'
import type { FluidId, GameState, MachineId, ProcessSlot, ResourceAmount, ResourceId } from '../game/types'
import { FluidIcon } from './FluidIcon'
import { MachineGlyph, PixelIcon } from './GameIcons'

export function DurabilityBar({ state, id }: { state: GameState; id: ResourceId }) {
  const max = maxDurability(id)
  if (max < 1 || state.resources[id] < 1) return null
  const remaining = durabilityRemaining(state, id)
  return (
    <span className="durability-bar" title={`${formatAmount(remaining)}/${formatAmount(max)} uses`}>
      <span style={{ width: `${Math.max(0, Math.min(100, (remaining / max) * 100))}%` }} />
    </span>
  )
}

export function ItemSlot({
  amount,
  className = '',
  disabled = false,
  onClick,
  state,
}: {
  amount: ResourceAmount
  className?: string
  disabled?: boolean
  onClick?: (id: ResourceId) => void
  state?: GameState
}) {
  const content = (
    <>
      <PixelIcon id={amount.id} />
      <span className="item-count">{formatAmount(amount.amount)}</span>
      {state && <DurabilityBar state={state} id={amount.id} />}
    </>
  )
  if (onClick) {
    return (
      <button
        type="button"
        className={disabled ? `mini-slot recipe-jump-slot muted ${className}` : `mini-slot recipe-jump-slot ${className}`}
        aria-label={`Find ${resourceLabels[amount.id]}`}
        title={`Find ${resourceLabels[amount.id]}`}
        onClick={() => onClick(amount.id)}
      >
        {content}
      </button>
    )
  }

  return (
    <span className={disabled ? `mini-slot muted ${className}` : `mini-slot ${className}`} title={resourceLabels[amount.id]}>
      {content}
    </span>
  )
}

export function MachineSlot({
  id,
  amount = 1,
  muted = false,
  onClick,
}: {
  id: MachineId
  amount?: number
  muted?: boolean
  onClick?: (id: MachineId) => void
}) {
  const content = (
    <>
      <MachineGlyph id={id} />
      <span className="item-count">{formatAmount(amount)}</span>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        className={muted ? 'mini-slot machine-slot recipe-jump-slot muted' : 'mini-slot machine-slot recipe-jump-slot'}
        aria-label={`Find ${machines[id].name}`}
        title={`Find ${machines[id].name}`}
        onClick={() => onClick(id)}
      >
        {content}
      </button>
    )
  }

  return (
    <span className={muted ? 'mini-slot machine-slot muted' : 'mini-slot machine-slot'} title={machines[id].name}>
      {content}
    </span>
  )
}

export function ProcessItemSlot({
  slot,
  label,
  onClick,
}: {
  slot: ProcessSlot
  label: string
  onClick: () => void
}) {
  const slotRole = label.toLowerCase().includes('output') || label.toLowerCase().startsWith('out')
    ? 'output'
    : label.toLowerCase().includes('fuel') || label.toLowerCase().includes('coke')
      ? 'fuel'
      : 'input'
  return (
    <button
      type="button"
      className={['process-slot', `process-slot-${slotRole}`, slot ? 'filled' : ''].filter(Boolean).join(' ')}
      aria-label={slot ? `${label} ${resourceLabels[slot.id]}` : label}
      title={label}
      onClick={onClick}
    >
      {slot ? (
        <>
          <PixelIcon id={slot.id} />
          <span className="item-count">{formatAmount(slot.amount)}</span>
        </>
      ) : (
        <span className="process-slot-role" aria-hidden="true" />
      )}
    </button>
  )
}

export function ProcessFluidSlot({
  fluidId,
  amount,
  label,
  emptyLabel = label,
  onClick,
  ready = false,
}: {
  fluidId?: FluidId
  amount?: number
  label: string
  emptyLabel?: string
  onClick: () => void
  ready?: boolean
}) {
  const storedLitres = fluidId ? amount ?? 0 : 0
  const slotRole = label.toLowerCase().includes('output') || label.toLowerCase().startsWith('out')
    ? 'output'
    : 'input'
  return (
    <button
      type="button"
      className={['process-slot', `process-slot-${slotRole}`, 'fluid-process-slot', 'native-fluid-control', fluidId ? 'filled' : '', ready ? 'ready' : ''].filter(Boolean).join(' ')}
      aria-label={fluidId ? `${label} ${fluidLabels[fluidId]} ${formatLitres(storedLitres)} litres` : label}
      onClick={onClick}
    >
      {fluidId ? (
        <>
          <FluidIcon id={fluidId} />
          <span className="item-count">{formatLitres(storedLitres)}L</span>
        </>
      ) : emptyLabel ? (
        <span className="process-slot-role" aria-hidden="true" />
      ) : null}
    </button>
  )
}
