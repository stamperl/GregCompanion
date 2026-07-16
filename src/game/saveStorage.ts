import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { loadGame, loadGameWithOfflineProgress, saveGame, saveKey } from './engine'
import { localTimeProvider, networkTimeProvider } from './time'
import type { GameState } from './types'

export type SaveSlotId = 'slot-1' | 'slot-2' | 'slot-3'

export type SaveSlotSummary = {
  id: SaveSlotId
  label: string
  updatedAt: string | null
  exists: boolean
}

type SaveSlotMetadata = {
  updatedAt?: string
  name?: string
}

type SaveIndex = Partial<Record<SaveSlotId, SaveSlotMetadata>>

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

function cleanSaveName(name: string) {
  return name.trim().replace(/\s+/g, ' ').slice(0, 28)
}

export async function migrateLegacySaveSlot() {
  const index = await readSaveIndex()
  const legacyRaw = await readStorageKey(saveKey)
  const firstSlotRaw = await readStorageKey(slotSaveKey(defaultSaveSlotId))
  if (!legacyRaw || firstSlotRaw) return index

  await writeStorageKey(slotSaveKey(defaultSaveSlotId), legacyRaw)
  const migratedIndex = { ...index, [defaultSaveSlotId]: { ...index[defaultSaveSlotId], updatedAt: new Date().toISOString() } }
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
        label: index[slot.id]?.name || slot.label,
        updatedAt: index[slot.id]?.updatedAt ?? null,
        exists: Boolean(raw),
      }
    }),
  )
}

export async function readRawSave(slotId: SaveSlotId = defaultSaveSlotId) {
  await migrateLegacySaveSlot()
  return readStorageKey(slotSaveKey(slotId))
}

export async function writeRawSave(raw: string, slotId: SaveSlotId = defaultSaveSlotId, updatedAt = localTimeProvider.now()) {
  await writeStorageKey(slotSaveKey(slotId), raw)
  const index = await readSaveIndex()
  index[slotId] = { ...index[slotId], updatedAt: new Date(updatedAt).toISOString() }
  await writeSaveIndex(index)
}

export async function clearRawSave(slotId: SaveSlotId = defaultSaveSlotId) {
  await removeStorageKey(slotSaveKey(slotId))
  const index = await readSaveIndex()
  if (index[slotId]?.name) {
    index[slotId] = { name: index[slotId]?.name }
  } else {
    delete index[slotId]
  }
  await writeSaveIndex(index)
}

export async function renameSaveSlot(slotId: SaveSlotId, name: string) {
  const index = await readSaveIndex()
  const cleanedName = cleanSaveName(name)
  const current = index[slotId] ?? {}
  if (cleanedName) {
    index[slotId] = { ...current, name: cleanedName }
  } else if (current.updatedAt) {
    index[slotId] = { updatedAt: current.updatedAt }
  } else {
    delete index[slotId]
  }
  await writeSaveIndex(index)
}

export async function loadSavedGame(slotId: SaveSlotId = defaultSaveSlotId, now = Date.now()) {
  return loadGame(await readRawSave(slotId), now)
}

export async function loadSavedGameWithOfflineProgress(slotId: SaveSlotId = defaultSaveSlotId, now = localTimeProvider.now()) {
  return loadGameWithOfflineProgress(await readRawSave(slotId), now)
}

export async function loadSavedGamePreservingSaveTime(slotId: SaveSlotId = defaultSaveSlotId, fallbackNow = localTimeProvider.now()) {
  const raw = await readRawSave(slotId)
  if (!raw) return loadGame(null, fallbackNow)
  try {
    const parsed = JSON.parse(raw) as Partial<GameState>
    const savedAt = typeof parsed.lastSavedAt === 'number' && Number.isFinite(parsed.lastSavedAt) ? parsed.lastSavedAt : fallbackNow
    return loadGame(raw, savedAt)
  } catch {
    return loadGame(raw, fallbackNow)
  }
}

export async function hasSavedGame(slotId: SaveSlotId = defaultSaveSlotId) {
  return (await readRawSave(slotId)) !== null
}

export async function persistGameState(state: GameState, slotId: SaveSlotId = defaultSaveSlotId, now = networkTimeProvider.now() ?? state.lastSavedAt) {
  await writeRawSave(saveGame(state, now, networkTimeProvider.isVerified()), slotId, now)
}

export async function clearSavedGame(slotId: SaveSlotId = defaultSaveSlotId) {
  await clearRawSave(slotId)
}

function looksLikeGameSave(raw: string) {
  try {
    const parsed = JSON.parse(raw) as Partial<GameState>
    return Boolean(parsed && typeof parsed === 'object' && (parsed.resources || parsed.machines || parsed.completedQuests || parsed.machineInstances))
  } catch {
    return false
  }
}

export async function exportSavedGame(slotId: SaveSlotId = defaultSaveSlotId) {
  return readRawSave(slotId)
}

export async function importSavedGame(raw: string, slotId: SaveSlotId = defaultSaveSlotId, now = networkTimeProvider.now() ?? localTimeProvider.now()) {
  if (!looksLikeGameSave(raw)) throw new Error('That file does not look like a Click Foundry save.')
  await writeRawSave(saveGame(loadGame(raw, now), now, networkTimeProvider.isVerified()), slotId, now)
}
