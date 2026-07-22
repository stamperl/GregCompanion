import { describe, expect, it } from 'vitest'
import codeNativeMachineIconIds from './codeNativeMachineIcons.json'
import { generatedIconUrls } from './gameIconAssets'

describe('generated icon preloading', () => {
  it('does not request PNG files for code-rendered connector machines', () => {
    const urls = generatedIconUrls()

    for (const machineId of codeNativeMachineIconIds) {
      expect(urls.some((url) => url.includes(`/machines/${machineId}.png`))).toBe(false)
    }
    expect(urls.some((url) => url.includes('/machines/lvAssembler.png'))).toBe(true)
    expect(urls.some((url) => url.includes('/resources/ironIngot.png'))).toBe(true)
  })
})
