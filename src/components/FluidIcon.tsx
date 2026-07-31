import type { CSSProperties } from 'react'
import { fluidColors } from '../game/content'
import type { FluidId } from '../game/types'
import { fluidIconSrc, storedMediumTextureSrc } from './gameIconAssets'

export type StoredMediumId = FluidId | 'steam'

const storedMediumColors: Record<StoredMediumId, string> = {
  ...fluidColors,
  steam: '#d8f3f4',
}

export function FluidIcon({ id, className = '' }: { id: StoredMediumId; className?: string }) {
  return (
    <span
      className={['fluid-icon', className].filter(Boolean).join(' ')}
      style={{ '--fluid-color': storedMediumColors[id] } as CSSProperties}
      aria-hidden="true"
    >
      <img className="fluid-icon-image" src={fluidIconSrc(id)} alt="" draggable="false" />
    </span>
  )
}

export function StoredMediumFill({
  id,
  fillPercent,
  className = '',
  gaseous = false,
}: {
  id: StoredMediumId
  fillPercent: number
  className?: string
  gaseous?: boolean
}) {
  const clampedFill = Math.max(0, Math.min(100, fillPercent))
  if (clampedFill <= 0) return null

  return (
    <span
      className={['stored-medium-fill', gaseous ? 'stored-medium-gas' : 'stored-medium-liquid', className].filter(Boolean).join(' ')}
      style={{
        '--fluid-color': storedMediumColors[id],
        '--fluid-image': `url("${storedMediumTextureSrc(id)}")`,
        height: `${clampedFill}%`,
      } as CSSProperties}
      aria-hidden="true"
    />
  )
}
