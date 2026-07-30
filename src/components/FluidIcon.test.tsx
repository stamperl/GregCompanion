import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FluidIcon, StoredMediumFill } from './FluidIcon'

describe('fluid artwork', () => {
  it('uses the generated texture for portable fluid badges', () => {
    const markup = renderToStaticMarkup(<FluidIcon id="water" />)

    expect(markup).toContain('/game-icons/fluids/water.png')
  })

  it('does not render an empty vessel fill', () => {
    expect(renderToStaticMarkup(<StoredMediumFill id="water" fillPercent={0} />)).toBe('')
  })

  it('renders the dedicated steam texture at the requested level', () => {
    const markup = renderToStaticMarkup(<StoredMediumFill id="steam" fillPercent={42} gaseous />)

    expect(markup).toContain('/game-icons/fluids/steam.png')
    expect(markup).toContain('height:42%')
    expect(markup).toContain('stored-medium-gas')
  })
})
