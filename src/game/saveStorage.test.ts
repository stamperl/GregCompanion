import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearRawSave, listSaveSlots, renameSaveSlot, writeRawSave } from './saveStorage'

function installLocalStorage() {
  const storage = new Map<string, string>()
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => {
        storage.delete(key)
      },
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
    },
  })
}

describe('save storage', () => {
  beforeEach(() => {
    installLocalStorage()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps custom save names separate from slot contents', async () => {
    await renameSaveSlot('slot-2', '  Bronze   Works  ')

    let slots = await listSaveSlots()
    expect(slots.find((slot) => slot.id === 'slot-2')).toMatchObject({
      exists: false,
      label: 'Bronze Works',
    })

    await writeRawSave('raw-save-data', 'slot-2')
    slots = await listSaveSlots()
    expect(slots.find((slot) => slot.id === 'slot-2')).toMatchObject({
      exists: true,
      label: 'Bronze Works',
    })

    await clearRawSave('slot-2')
    slots = await listSaveSlots()
    expect(slots.find((slot) => slot.id === 'slot-2')).toMatchObject({
      exists: false,
      label: 'Bronze Works',
    })
  })
})
