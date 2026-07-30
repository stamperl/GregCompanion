import type { CSSProperties } from 'react'
import { fluidColors } from '../game/content'
import type { FluidId } from '../game/types'
import { fluidIconSrc } from './gameIconAssets'

export function FluidIcon({ id, className = '' }: { id: FluidId; className?: string }) {
  return (
    <span
      className={['fluid-icon', className].filter(Boolean).join(' ')}
      style={{ '--fluid-color': fluidColors[id] } as CSSProperties}
      aria-hidden="true"
    >
      <img className="fluid-icon-image" src={fluidIconSrc(id)} alt="" draggable="false" />
    </span>
  )
}
