import Constants from 'expo-constants'
import { Platform } from 'react-native'

/**
 * Where the API lives.
 *
 * The web client never had to answer this: it was served from the same origin as the API and
 * asked for `/api/...`, with Vite proxying the call in development. A phone has no origin and no
 * proxy, so the host has to be stated — and it is not the same host for every target:
 *
 * - the Android emulator reaches the development machine at `10.0.2.2`, never at `localhost`,
 *   which on Android means the phone itself;
 * - the iOS simulator shares the machine's loopback, so `localhost` is correct there;
 * - a real device on the same network needs the machine's LAN address, which Expo already knows
 *   and reports in `expo-constants` — so it is read from there rather than typed in by hand.
 *
 * `EXPO_PUBLIC_API_URL` overrides all of it, which is how a build is pointed at a real server.
 */

const DEFAULT_PORT = 7001

/** The LAN address Expo's development server is reachable at, when there is one. */
function hostFromExpo(): string | null {
  const uri = Constants.expoConfig?.hostUri
  if (!uri) return null
  return uri.split(':')[0] || null
}

function developmentBaseUrl(): string {
  if (Platform.OS === 'android') {
    // An emulator's alias for the host machine. A real device gets the LAN address below, which
    // Expo reports because it is the address the bundle itself was downloaded from.
    const host = hostFromExpo()
    const isEmulatorAlias = !host || host === 'localhost' || host === '127.0.0.1'
    return `https://${isEmulatorAlias ? '10.0.2.2' : host}:${DEFAULT_PORT}`
  }

  const host = hostFromExpo() ?? 'localhost'
  return `https://${host}:${DEFAULT_PORT}`
}

/** Root of the API host, with no trailing slash and no `/api` suffix. */
export const API_ORIGIN: string = (
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ??
  developmentBaseUrl()
).replace(/\/+$/, '')

/** Base URL of the REST API — the web client's `/api`, made absolute. */
export const API_BASE_URL = `${API_ORIGIN}/api`

/** Base URL of the OpenIddict token endpoint — the web client's `/`, made absolute. */
export const AUTH_BASE_URL = `${API_ORIGIN}/`
