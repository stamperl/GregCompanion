import type { CSSProperties } from 'react'
import { fluidColors } from '../game/content'
import type { FluidId } from '../game/types'

export function FluidIcon({ id, className = '' }: { id: FluidId; className?: string }) {
  return (
    <span
      className={['fluid-icon', `fluid-${id}`, className].filter(Boolean).join(' ')}
      style={{ '--fluid-color': fluidColors[id] } as CSSProperties}
      aria-hidden="true"
    />
  )
}
