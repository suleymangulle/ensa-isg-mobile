import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { API_BASE_URL } from '@/config'
import { officeAccessor } from '@/auth/officeStore'
import { tokenStore } from '@/auth/tokenStore'
import i18n, { apiCulture } from '@/i18n'

/** Field-level validation failure inside the error envelope. */
export interface ValidationError {
  member: string
  message: string
}

/** Error envelope produced by `EnsaExceptionFilter`. */
export interface EnsaErrorBody {
  error: {
    code?: string
    message: string
    details?: string
    validationErrors?: ValidationError[]
  }
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // A phone loses its network mid-request far more often than a desktop browser does, and axios
  // has no timeout by default: without this a request on a dead connection hangs until the socket
  // gives up, which on Android is minutes.
  timeout: 30_000,
})

/**
 * Routes that must never carry an office context.
 *
 * `/account/offices` is the answer a client needs in order to know which offices it may ask for. If
 * a stale selection were attached to that request the server would refuse it, and the refusal could
 * only be recovered from by the request that was refused. The server marks the same endpoint
 * `[IgnoreOfficeContext]`, so the two ends agree rather than one of them merely being careful.
 *
 * The token endpoints are not listed because they never reach this client: `tokenStore` posts to
 * `connect/token` through its own axios instance.
 */
const OFFICE_FREE_ROUTES = ['/account/offices']

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`

  // The API localises its error messages from this header
  // (`AcceptLanguageHeaderRequestCultureProvider`, see EnsaHttpApiHostModule).
  config.headers['Accept-Language'] = apiCulture()

  // The office the user is working in. Absent means "no office context", which the API answers
  // exactly as it did before offices existed - so a request made before the context has resolved is
  // scoped by tenant rather than by a guess. The value is validated server-side on every request;
  // this header is a statement of intent, never a grant.
  const office = officeAccessor.get()
  const path = config.url ?? ''

  if (office && token && !OFFICE_FREE_ROUTES.some((route) => path.startsWith(route))) {
    config.headers['X-Ensa-OfficeId'] = office
  }

  return config
})

/**
 * What to do when the session cannot be recovered.
 *
 * The web client answered a failed refresh with `window.location.href = '/login'`, which is a
 * whole-application reload. There is no such thing here, and reaching for the router from module
 * scope would close an import cycle, so the session owner registers a handler instead:
 * `AuthProvider` clears the user, and the route tree redirects because there is no user.
 */
type SessionExpiredHandler = () => void

let onSessionExpired: SessionExpiredHandler = () => undefined

export function setSessionExpiredHandler(handler: SessionExpiredHandler): void {
  onSessionExpired = handler
}

/** Shared in-flight refresh so parallel 401s trigger a single token request. */
let refreshing: Promise<string | null> | null = null

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<EnsaErrorBody>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean }

    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true
      refreshing ??= tokenStore.refresh().finally(() => {
        refreshing = null
      })
      const newToken = await refreshing
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`
        return http(original)
      }
      tokenStore.clear()
      onSessionExpired()
    }
    return Promise.reject(error)
  },
)

/**
 * Turns any thrown request error into a message that can be shown to the user.
 * Server-side messages are already localised via `Accept-Language`; everything
 * else falls back to a local translation.
 */
export function errorMessage(error: unknown): string {
  const err = error as AxiosError<EnsaErrorBody>
  const body = err.response?.data?.error

  if (body) {
    if (body.validationErrors?.length) {
      return body.validationErrors.map((item) => item.message).join(' ')
    }
    if (body.message) return body.message
  }

  const status = err.response?.status
  // Modules whose app services have not landed yet answer 404 with no envelope.
  if (status === 404) return i18n.t('errors.moduleUnavailable')
  if (status === 403) return i18n.t('errors.forbidden')
  // A 401 here has already been through the refresh attempt in the interceptor, so the session is
  // genuinely gone. `setSessionExpiredHandler` is taking the user back to sign-in; this is what
  // the screen says in the meantime.
  if (status === 401) return i18n.t('errors.sessionExpired')
  if (!err.response) return i18n.t('errors.network')
  return i18n.t('errors.unexpected')
}

/** Paged server response: `{ items, totalCount }`. */
export interface PagedResult<T> {
  items: T[]
  totalCount: number
}

/** Unpaged server response: `{ items }`. */
export interface ListResult<T> {
  items: T[]
}

/** Query parameters accepted by `PagedAndSortedFilterDto`. */
export interface PagedRequest {
  skipCount?: number
  maxResultCount?: number
  sorting?: string
  filter?: string
}
