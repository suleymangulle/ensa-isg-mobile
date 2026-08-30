import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

/**
 * The web client's `localStorage`, as much of it as a phone can honestly provide.
 *
 * Three things in this application read storage from code that cannot wait for a promise: the
 * axios request interceptor (`getAccessToken`), the office accessor it reads next, and i18next's
 * language lookup. React Native has no synchronous key/value store, so the shape is kept and the
 * asynchrony is moved to the one place that can absorb it — a hydration pass that runs once,
 * before the first render, after which reads come out of memory and writes are persisted behind
 * the caller's back.
 *
 * Tokens go to the keychain rather than to AsyncStorage. `localStorage` was the only option in a
 * browser; on a device it is not, and a bearer token sitting in a world-readable file on a rooted
 * phone is a difference worth taking. Everything else — the language, the remembered office, the
 * appearance — is a preference, and lives in AsyncStorage.
 */

/** Keys held in the platform keychain. Everything else goes to AsyncStorage. */
const SECURE_KEYS = new Set(['ensa.access_token', 'ensa.refresh_token'])

/** Keys this application owns. Only these are hydrated, and only these are ever cleared. */
const OWNED_PREFIXES = ['ensa.', 'ensa:']

/** SecureStore is unavailable on web; there the keychain degrades to AsyncStorage. */
const canUseKeychain = Platform.OS !== 'web'

const cache = new Map<string, string>()

function isSecure(key: string): boolean {
  return canUseKeychain && SECURE_KEYS.has(key)
}

async function persist(key: string, value: string): Promise<void> {
  try {
    if (isSecure(key)) await SecureStore.setItemAsync(key, value)
    else await AsyncStorage.setItem(key, value)
  } catch {
    /* storage full or unavailable — the value simply does not survive a restart */
  }
}

async function forget(key: string): Promise<void> {
  try {
    if (isSecure(key)) await SecureStore.deleteItemAsync(key)
    else await AsyncStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export const storage = {
  /** The stored value, or `null`. Synchronous: served from the hydrated cache. */
  get(key: string): string | null {
    return cache.get(key) ?? null
  },

  set(key: string, value: string): void {
    cache.set(key, value)
    void persist(key, value)
  },

  remove(key: string): void {
    cache.delete(key)
    void forget(key)
  },

  /** Every key currently held, for the callers that sweep a prefix. */
  keys(): string[] {
    return [...cache.keys()]
  },
}

/**
 * Loads what was stored into the cache. Called once, before the first render.
 *
 * A failure here is not fatal and is deliberately not reported: an unreadable store means the
 * user signs in again, which is the same outcome a browser with storage disabled produced.
 */
export async function hydrateStorage(): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) =>
      OWNED_PREFIXES.some((prefix) => key.startsWith(prefix)),
    )

    for (const [key, value] of await AsyncStorage.multiGet(keys)) {
      if (value !== null) cache.set(key, value)
    }
  } catch {
    /* ignore */
  }

  if (!canUseKeychain) return

  for (const key of SECURE_KEYS) {
    try {
      const value = await SecureStore.getItemAsync(key)
      if (value !== null) cache.set(key, value)
    } catch {
      /* ignore */
    }
  }
}
