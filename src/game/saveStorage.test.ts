import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialState } from './content'
import { saveGame } from './engine'
import { clearRawSave, exportSavedGame, importSavedGame, listSaveSlots, loadSavedGameWithOfflineProgress, renameSaveSlot, writeRawSave } from './saveStorage'

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

  it('exports and imports save slots as normalized game saves', async () => {
    const state = createInitialState(1000)
    state.resources.log = 3
    await writeRawSave(saveGame(state, 1000), 'slot-1')

    const exported = await exportSavedGame('slot-1')
    expect(exported).toContain('"log":3')

    await importSavedGame(exported!, 'slot-2', 5000)
    const imported = await exportSavedGame('slot-2')
    expect(imported).toContain('"log":3')
    expect(JSON.parse(imported!).lastSavedAt).toBe(5000)
  })

  it('rejects files that do not look like Click Foundry saves', async () => {
    await expect(importSavedGame(JSON.stringify({ hello: 'nope' }), 'slot-1', 1000)).rejects.toThrow('Click Foundry save')
  })

  it('loads saves through the offline progress path', async () => {
    const state = createInitialState(1000)
    state.resources.log = 1
    await writeRawSave(saveGame(state, 1000), 'slot-1')

    const loaded = await loadSavedGameWithOfflineProgress('slot-1', 61_000)

    expect(loaded.offline.applied).toBe(true)
    expect(loaded.offline.questCompletions).toEqual(['punchTree'])
    expect(loaded.state.completedQuests).toContain('punchTree')
  })
})
