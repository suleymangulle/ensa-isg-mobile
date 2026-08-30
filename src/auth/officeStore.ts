import { storage } from '@/utils/storage'

/**
 * The selected office: where it is remembered, and how the HTTP client reads it.
 *
 * Unchanged from the web client but for where the value is kept. The reasoning there applies here
 * too, and one part of it applies more: the store is namespaced by tenant and user because a
 * device is shared as readily as a browser is, and a single global key would hand the second
 * person to sign in the first person's office - one they may not even have, in which case the
 * server would refuse every request until they found the switcher.
 *
 * The **accessor** exists because `src/api/http.ts` is a plain axios instance created at module
 * scope; it cannot call a React hook, and importing the provider from it would close the import
 * cycle `http -> OfficeContext -> office api -> http`. So the provider pushes the resolved value
 * down here and the interceptor reads it, which keeps the dependency pointing one way.
 */

/** The office scope of a request: one office, every office the user may use, or none at all. */
export type OfficeScopeValue = number | 'all' | null

/** Storage key prefix; the user and tenant are appended. */
const STORAGE_PREFIX = 'ensa.office_id'

/** The neutral value the API accepts for "every office I may use" (`EnsaHttpHeaders.AllOfficesValue`). */
export const ALL_OFFICES = 'all'

function storageKey(tenantId: number | undefined, userId: number): string {
  return `${STORAGE_PREFIX}.${tenantId ?? 'host'}.${userId}`
}

export const officeStore = {
  /** The remembered selection for one identity, or `null` when there is none or it is unreadable. */
  read(tenantId: number | undefined, userId: number): OfficeScopeValue {
    const raw = storage.get(storageKey(tenantId, userId))
    if (!raw) return null
    if (raw === ALL_OFFICES) return ALL_OFFICES

    const parsed = Number(raw)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
  },

  write(tenantId: number | undefined, userId: number, value: OfficeScopeValue): void {
    const key = storageKey(tenantId, userId)
    if (value === null) {
      storage.remove(key)
      return
    }
    storage.set(key, String(value))
  },

  clear(tenantId: number | undefined, userId: number): void {
    storage.remove(storageKey(tenantId, userId))
  },

  /**
   * Forgets every remembered office, for every identity on this device.
   *
   * Used on sign-out: the next person to sign in here must start from the server's answer, not
   * from whatever the last one was looking at.
   */
  clearAll(): void {
    for (const key of storage.keys()) {
      if (key.startsWith(STORAGE_PREFIX)) storage.remove(key)
    }
  },
}

/**
 * The value the request interceptor puts in `X-Ensa-OfficeId`.
 *
 * `null` means "send no header", which the API reads as "no office context" and answers exactly as
 * it did before offices existed. It is deliberately the initial value: until the permitted offices
 * have been fetched there is nothing trustworthy to send, and sending a guess would be refused.
 */
let currentScope: OfficeScopeValue = null

export const officeAccessor = {
  /** The header value for the next request, or `null` for none. */
  get(): string | null {
    return currentScope === null ? null : String(currentScope)
  },

  set(value: OfficeScopeValue): void {
    currentScope = value
  },

  reset(): void {
    currentScope = null
  },
}
