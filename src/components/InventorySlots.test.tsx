import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ProcessFluidSlot } from './InventorySlots'

describe('machine fluid slots', () => {
  it('renders a recipe-compatible fluid as empty when none is stored', () => {
    const markup = renderToStaticMarkup(
      <ProcessFluidSlot fluidId="water" amount={0} label="Fluid input" onClick={vi.fn()} />,
    )

    expect(markup).not.toContain('fluid-icon-image')
    expect(markup).not.toContain('0L')
    expect(markup).not.toContain(' filled')
  })

  it('renders the fluid texture and amount when fluid is stored', () => {
    const markup = renderToStaticMarkup(
      <ProcessFluidSlot fluidId="water" amount={8} label="Fluid input" onClick={vi.fn()} />,
    )

    expect(markup).toContain('fluid-icon-image')
    expect(markup).toContain('8L')
    expect(markup).toContain('filled')
  })
})
