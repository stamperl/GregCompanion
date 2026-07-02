import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { loadGame, saveGame, saveKey } from './engine'
import type { GameState } from './types'

export type SaveSlotId = 'slot-1' | 'slot-2' | 'slot-3'

export type SaveSlotSummary = {
  id: SaveSlotId
  label: string
  updatedAt: string | null
  exists: boolean
}

type SaveIndex = Partial<Record<SaveSlotId, { updatedAt: string }>>

export const defaultSaveSlotId: SaveSlotId = 'slot-1'
export const saveSlots: Array<{ id: SaveSlotId; label: string }> = [
  { id: 'slot-1', label: 'Save 1' },
  { id: 'slot-2', label: 'Save 2' },
  { id: 'slot-3', label: 'Save 3' },
]

const saveIndexKey = `${saveKey}:index`

function slotSaveKey(slotId: SaveSlotId) {
  return `${saveKey}:${slotId}`
}

function hasBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function shouldUseNativeStorage() {
  return Capacitor.isNativePlatform()
}

async function readStorageKey(key: string) {
  if (shouldUseNativeStorage()) {
    const result = await Preferences.get({ key })
    return result.value
  }

  if (!hasBrowserStorage()) return null
  return window.localStorage.getItem(key)
}

async function writeStorageKey(key: string, value: string) {
  if (shouldUseNativeStorage()) {
    await Preferences.set({ key, value })
    return
  }

  if (hasBrowserStorage()) window.localStorage.setItem(key, value)
}

async function removeStorageKey(key: string) {
  if (shouldUseNativeStorage()) {
    await Preferences.remove({ key })
    return
  }

  if (hasBrowserStorage()) window.localStorage.removeItem(key)
}

function parseSaveIndex(raw: string | null): SaveIndex {
  if (!raw) return {}
  try {
    return JSON.parse(raw) as SaveIndex
  } catch {
    return {}
  }
}

async function readSaveIndex() {
  return parseSaveIndex(await readStorageKey(saveIndexKey))
}

async function writeSaveIndex(index: SaveIndex) {
  await writeStorageKey(saveIndexKey, JSON.stringify(index))
}

export async function migrateLegacySaveSlot() {
  const index = await readSaveIndex()
  const legacyRaw = await readStorageKey(saveKey)
  const firstSlotRaw = await readStorageKey(slotSaveKey(defaultSaveSlotId))
  if (!legacyRaw || firstSlotRaw) return index

  await writeStorageKey(slotSaveKey(defaultSaveSlotId), legacyRaw)
  const migratedIndex = { ...index, [defaultSaveSlotId]: { updatedAt: new Date().toISOString() } }
  await writeSaveIndex(migratedIndex)
  await removeStorageKey(saveKey)
  return migratedIndex
}

export async function listSaveSlots() {
  const index = await migrateLegacySaveSlot()
  return Promise.all(
    saveSlots.map<Promise<SaveSlotSummary>>(async (slot) => {
      const raw = await readStorageKey(slotSaveKey(slot.id))
      return {
        id: slot.id,
        label: slot.label,
        updatedAt: index[slot.id]?.updatedAt ?? null,
        exists: Boolean(index[slot.id] || raw),
      }
    }),
  )
}

export async function readRawSave(slotId: SaveSlotId = defaultSaveSlotId) {
  await migrateLegacySaveSlot()
  return readStorageKey(slotSaveKey(slotId))
}

export async function writeRawSave(raw: string, slotId: SaveSlotId = defaultSaveSlotId) {
  await writeStorageKey(slotSaveKey(slotId), raw)
  const index = await readSaveIndex()
  index[slotId] = { updatedAt: new Date().toISOString() }
  await writeSaveIndex(index)
}

export async function clearRawSave(slotId: SaveSlotId = defaultSaveSlotId) {
  await removeStorageKey(slotSaveKey(slotId))
  const index = await readSaveIndex()
  delete index[slotId]
  await writeSaveIndex(index)
}

export async function loadSavedGame(slotId: SaveSlotId = defaultSaveSlotId, now = Date.now()) {
  return loadGame(await readRawSave(slotId), now)
}

export async function hasSavedGame(slotId: SaveSlotId = defaultSaveSlotId) {
  return (await readRawSave(slotId)) !== null
}

export async function persistGameState(state: GameState, slotId: SaveSlotId = defaultSaveSlotId) {
  await writeRawSave(saveGame(state), slotId)
}

export async function clearSavedGame(slotId: SaveSlotId = defaultSaveSlotId) {
  await clearRawSave(slotId)
}
