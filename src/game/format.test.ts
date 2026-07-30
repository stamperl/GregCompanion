import { describe, expect, it } from 'vitest'
import { formatLitres } from './format'

describe('formatLitres', () => {
  it('does not label a positive fractional volume as zero', () => {
    expect(formatLitres(0.2)).toBe('0.2')
    expect(formatLitres(0.01)).toBe('0.01')
  })

  it('keeps whole-litre readouts compact', () => {
    expect(formatLitres(12.8)).toBe('12')
  })
})
