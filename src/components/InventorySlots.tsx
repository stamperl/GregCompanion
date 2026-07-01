import { machines, resourceLabels } from '../game/content'
import { durabilityRemaining, maxDurability } from '../game/engine'
import { formatAmount } from '../game/format'
import type { GameState, MachineId, ProcessSlot, ResourceAmount, ResourceId } from '../game/types'
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

export function MachineSlot({ id, amount = 1, muted = false }: { id: MachineId; amount?: number; muted?: boolean }) {
  return (
    <span className={muted ? 'mini-slot machine-slot muted' : 'mini-slot machine-slot'} title={machines[id].name}>
      <MachineGlyph id={id} />
      <span className="item-count">{formatAmount(amount)}</span>
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
  return (
    <button type="button" className={slot ? 'process-slot filled' : 'process-slot'} aria-label={slot ? `${label} ${resourceLabels[slot.id]}` : label} onClick={onClick}>
      {slot ? (
        <>
          <PixelIcon id={slot.id} />
          <span className="item-count">{formatAmount(slot.amount)}</span>
        </>
      ) : (
        <span className="process-slot-label">{label}</span>
      )}
    </button>
  )
}
