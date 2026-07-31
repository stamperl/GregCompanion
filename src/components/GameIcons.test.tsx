import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { MachineId } from '../game/types'
import { MachineGlyph } from './GameIcons'

describe('factory-floor EU cable glyphs', () => {
  it.each([
    ['tinCable', 1],
    ['tinCable2A', 2],
    ['tinCable4A', 4],
    ['tinCable8A', 8],
    ['aluminiumCable', 1],
    ['aluminiumCable2A', 2],
    ['aluminiumCable4A', 4],
    ['aluminiumCable8A', 8],
  ] as const)('marks %s with its amperage', (machineId, amperage) => {
    const markup = renderToStaticMarkup(
      <MachineGlyph
        id={machineId as MachineId}
        pipeConnections={{ up: false, right: true, down: false, left: true }}
      />,
    )

    expect(markup).toContain('class="eu-cable-amp-mark"')
    expect(markup).toContain(`machine-${machineId}`)
    expect(markup).toContain(`>${amperage}</text>`)
    expect(markup.match(/class="eu-cable-amp-pip"/g)).toHaveLength(Math.log2(amperage) + 1)
  })

  it('keeps the amperage marker on an isolated cable tile', () => {
    const markup = renderToStaticMarkup(
      <MachineGlyph
        id="aluminiumCable8A"
        pipeConnections={{ up: false, right: false, down: false, left: false }}
      />,
    )

    expect(markup).toContain('class="eu-cable-amp-mark"')
    expect(markup).toContain('>8</text>')
  })
})
