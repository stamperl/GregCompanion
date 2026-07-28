import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { fluidLabels, machines, resourceLabels } from '../game/content'
import { durabilityRemaining, maxDurability } from '../game/engine'
import { formatAmount, formatLitres } from '../game/format'
import type { FluidId, GameState, MachineId, ProcessSlot, ResourceAmount, ResourceId } from '../game/types'
import { FluidIcon } from './FluidIcon'
import { MachineGlyph, PixelIcon } from './GameIcons'

type SlotInspectionPosition = {
  left: number
  top: number
  arrowLeft: number
  placement: 'above' | 'below'
}

function useSlotInspection(contentId: string | undefined, onClick: () => void) {
  const holdRef = useRef<{ pointerId: number; startX: number; startY: number; timer: number } | null>(null)
  const activePointerRef = useRef<number | null>(null)
  const suppressClickRef = useRef<number | null>(null)
  const clearSuppressionTimerRef = useRef<number | null>(null)
  const hideTimerRef = useRef<number | null>(null)
  const [position, setPosition] = useState<SlotInspectionPosition | null>(null)

  const clearHold = () => {
    if (holdRef.current) window.clearTimeout(holdRef.current.timer)
    holdRef.current = null
  }

  const clearHideTimer = () => {
    if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current)
    hideTimerRef.current = null
  }

  const clearSuppressionTimer = () => {
    if (clearSuppressionTimerRef.current !== null) window.clearTimeout(clearSuppressionTimerRef.current)
    clearSuppressionTimerRef.current = null
  }

  useEffect(() => {
    if (!contentId) setPosition(null)
  }, [contentId])

  useEffect(() => () => {
    clearHold()
    clearHideTimer()
    clearSuppressionTimer()
  }, [])

  useEffect(() => {
    const dismiss = () => {
      clearHold()
      clearHideTimer()
      clearSuppressionTimer()
      activePointerRef.current = null
      suppressClickRef.current = null
      setPosition(null)
    }
    window.addEventListener('blur', dismiss)
    return () => window.removeEventListener('blur', dismiss)
  }, [])

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!contentId || (event.pointerType === 'mouse' && event.button !== 0)) return
    clearHold()
    clearHideTimer()
    clearSuppressionTimer()
    setPosition(null)
    suppressClickRef.current = null
    activePointerRef.current = event.pointerId
    const bounds = event.currentTarget.getBoundingClientRect()
    const hold = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      timer: 0,
    }
    hold.timer = window.setTimeout(() => {
      if (holdRef.current !== hold) return
      const tooltipHalfWidth = Math.min(112, Math.max(1, window.innerWidth / 2 - 8))
      const placement: SlotInspectionPosition['placement'] = bounds.top >= 82 ? 'above' : 'below'
      const anchorX = bounds.left + bounds.width / 2
      const tooltipCenter = Math.max(tooltipHalfWidth + 8, Math.min(window.innerWidth - tooltipHalfWidth - 8, anchorX))
      suppressClickRef.current = hold.pointerId
      holdRef.current = null
      setPosition({
        left: tooltipCenter,
        top: placement === 'above' ? bounds.top - 8 : bounds.bottom + 8,
        arrowLeft: Math.max(12, Math.min(tooltipHalfWidth * 2 - 12, tooltipHalfWidth + anchorX - tooltipCenter)),
        placement,
      })
    }, 500)
    holdRef.current = hold
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const hold = holdRef.current
    if (!hold || hold.pointerId !== event.pointerId) return
    if (Math.hypot(event.clientX - hold.startX, event.clientY - hold.startY) >= 8) {
      suppressClickRef.current = event.pointerId
      clearHold()
    }
  }

  const onPointerEnd = (event: ReactPointerEvent<HTMLButtonElement>, cancelled = false) => {
    clearHold()
    activePointerRef.current = null
    if (suppressClickRef.current !== event.pointerId) return
    if (cancelled) {
      suppressClickRef.current = null
      setPosition(null)
      return
    }
    hideTimerRef.current = window.setTimeout(() => {
      setPosition(null)
      hideTimerRef.current = null
    }, 1600)
    clearSuppressionTimerRef.current = window.setTimeout(() => {
      if (suppressClickRef.current === event.pointerId) suppressClickRef.current = null
      clearSuppressionTimerRef.current = null
    }, 1000)
  }

  const onSlotClick = () => {
    if (suppressClickRef.current !== null) {
      clearSuppressionTimer()
      suppressClickRef.current = null
      return
    }
    setPosition(null)
    onClick()
  }

  const onPointerInterrupted = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (activePointerRef.current !== event.pointerId) return
    clearHold()
    clearHideTimer()
    activePointerRef.current = null
    suppressClickRef.current ??= event.pointerId
    setPosition(null)
  }

  return {
    position,
    eventHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => onPointerEnd(event),
      onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => onPointerEnd(event, true),
      onPointerLeave: onPointerInterrupted,
      onLostPointerCapture: onPointerInterrupted,
      onContextMenu: (event: ReactPointerEvent<HTMLButtonElement>) => event.preventDefault(),
      onClick: onSlotClick,
    },
  }
}

function SlotInspectionTooltip({
  position,
  icon,
  label,
  name,
  value,
  id,
}: {
  position: SlotInspectionPosition | null
  icon: ReactNode
  label: string
  name: string
  value: string
  id: string
}) {
  if (!position) return null
  return createPortal(
    <span
      className={`process-slot-inspection-tooltip process-slot-inspection-${position.placement}`}
      id={id}
      style={{
        left: position.left,
        top: position.top,
        '--process-slot-tooltip-arrow-left': `${position.arrowLeft}px`,
      } as CSSProperties}
      role="tooltip"
    >
      <span className="process-slot-inspection-icon">{icon}</span>
      <span>
        <small>{label}</small>
        <strong>{name}</strong>
      </span>
      <em>{value}</em>
    </span>,
    document.body,
  )
}

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
  const inspection = useSlotInspection(slot?.id, onClick)
  const inspectionId = useId()
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
      aria-describedby={inspection.position ? inspectionId : undefined}
      title={label}
      {...inspection.eventHandlers}
    >
      {slot ? (
        <>
          <PixelIcon id={slot.id} />
          <span className="item-count">{formatAmount(slot.amount)}</span>
        </>
      ) : (
        <span className="process-slot-role" aria-hidden="true" />
      )}
      {slot && (
        <SlotInspectionTooltip
          position={inspection.position}
          icon={<PixelIcon id={slot.id} />}
          label={label}
          name={resourceLabels[slot.id]}
          value={`x${formatAmount(slot.amount)}`}
          id={inspectionId}
        />
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
  const inspection = useSlotInspection(fluidId, onClick)
  const inspectionId = useId()
  const slotRole = label.toLowerCase().includes('output') || label.toLowerCase().startsWith('out')
    ? 'output'
    : 'input'
  return (
    <button
      type="button"
      className={['process-slot', `process-slot-${slotRole}`, 'fluid-process-slot', 'native-fluid-control', fluidId ? 'filled' : '', ready ? 'ready' : ''].filter(Boolean).join(' ')}
      aria-label={fluidId ? `${label} ${fluidLabels[fluidId]} ${formatLitres(storedLitres)} litres` : label}
      aria-describedby={inspection.position ? inspectionId : undefined}
      {...inspection.eventHandlers}
    >
      {fluidId ? (
        <>
          <FluidIcon id={fluidId} />
          <span className="item-count">{formatLitres(storedLitres)}L</span>
        </>
      ) : emptyLabel ? (
        <span className="process-slot-role" aria-hidden="true" />
      ) : null}
      {fluidId && (
        <SlotInspectionTooltip
          position={inspection.position}
          icon={<FluidIcon id={fluidId} />}
          label={label}
          name={fluidLabels[fluidId]}
          value={`${formatLitres(storedLitres)}L`}
          id={inspectionId}
        />
      )}
    </button>
  )
}
