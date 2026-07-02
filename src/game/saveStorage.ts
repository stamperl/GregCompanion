import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { loadGame, saveGame, saveKey } from './engine'
import type { GameState } from './types'

function hasBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function shouldUseNativeStorage() {
  return Capacitor.isNativePlatform()
}

export async function readRawSave() {
  if (shouldUseNativeStorage()) {
    const result = await Preferences.get({ key: saveKey })
    return result.value
  }

  if (!hasBrowserStorage()) return null
  return window.localStorage.getItem(saveKey)
}

export async function writeRawSave(raw: string) {
  if (shouldUseNativeStorage()) {
    await Preferences.set({ key: saveKey, value: raw })
    return
  }

  if (hasBrowserStorage()) window.localStorage.setItem(saveKey, raw)
}

export async function clearRawSave() {
  if (shouldUseNativeStorage()) {
    await Preferences.remove({ key: saveKey })
    return
  }

  if (hasBrowserStorage()) window.localStorage.removeItem(saveKey)
}

export async function loadSavedGame(now = Date.now()) {
  return loadGame(await readRawSave(), now)
}

export async function persistGameState(state: GameState) {
  await writeRawSave(saveGame(state))
}

export async function clearSavedGame() {
  await clearRawSave()
}
