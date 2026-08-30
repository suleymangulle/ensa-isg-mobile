import axios from 'axios'
import { AUTH_BASE_URL } from '@/config'
import { storage } from '@/utils/storage'

const ACCESS_KEY = 'ensa.access_token'
const REFRESH_KEY = 'ensa.refresh_token'

/** OpenIddict `connect/token` response. */
export interface TokenResponse {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in: number
}

/**
 * The client this application is registered as in OpenIddict.
 *
 * The web client registers as `ensa-spa`; this is a second public client for the same server, so
 * the two can be told apart in the audit log and revoked independently. A public client either
 * way - a secret shipped inside an installable application is readable by anyone who unpacks it,
 * which is no better than one shipped in a script.
 */
const CLIENT_ID = 'ensa-mobile'

/** The OpenIddict token endpoint expects `application/x-www-form-urlencoded`. */
const tokenClient = axios.create({
  baseURL: AUTH_BASE_URL,
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
})

/**
 * `URLSearchParams` produces the body the endpoint expects in a browser. React Native's polyfill
 * serialises the same way, but axios does not recognise it as a form body and would send it as
 * JSON - so the encoding is done here and the string is posted.
 */
function form(values: Record<string, string>): string {
  return Object.entries(values)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
}

export const tokenStore = {
  getAccessToken: () => storage.get(ACCESS_KEY),
  getRefreshToken: () => storage.get(REFRESH_KEY),

  save(response: TokenResponse) {
    storage.set(ACCESS_KEY, response.access_token)
    if (response.refresh_token) storage.set(REFRESH_KEY, response.refresh_token)
  },

  clear() {
    storage.remove(ACCESS_KEY)
    storage.remove(REFRESH_KEY)
  },

  /** Signs in with the `password` grant. */
  async signIn(userName: string, password: string): Promise<TokenResponse> {
    const { data } = await tokenClient.post<TokenResponse>(
      'connect/token',
      form({
        grant_type: 'password',
        client_id: CLIENT_ID,
        username: userName,
        password,
        scope: 'openid profile email roles offline_access ensa',
      }),
    )
    tokenStore.save(data)
    return data
  },

  /** Runs the `refresh_token` grant. Returns null when it fails. */
  async refresh(): Promise<string | null> {
    const refreshToken = tokenStore.getRefreshToken()
    if (!refreshToken) return null

    try {
      const { data } = await tokenClient.post<TokenResponse>(
        'connect/token',
        form({
          grant_type: 'refresh_token',
          client_id: CLIENT_ID,
          refresh_token: refreshToken,
        }),
      )
      tokenStore.save(data)
      return data.access_token
    } catch {
      tokenStore.clear()
      return null
    }
  },
}

/**
 * Decodes the JWT payload - the signature is verified server side.
 *
 * `atob` does not exist in Hermes, and the web version's `decodeURIComponent(escape(json))` dance
 * relied on it producing a binary string. Base64 is decoded by hand here and the bytes are read as
 * UTF-8, which is what a Turkish name in a `given_name` claim needs.
 */
export function decodeToken(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    return JSON.parse(utf8FromBase64(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function utf8FromBase64(input: string): string {
  const text = input.replace(/=+$/, '')
  const bytes: number[] = []

  let buffer = 0
  let bits = 0

  for (const character of text) {
    const value = BASE64_ALPHABET.indexOf(character)
    if (value < 0) continue

    buffer = (buffer << 6) | value
    bits += 6

    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >> bits) & 0xff)
    }
  }

  // Hermes ships a TextDecoder; where it is missing the ASCII reading is still correct for the
  // claims this application reads by name.
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8').decode(Uint8Array.from(bytes))
  }
  return String.fromCharCode(...bytes)
}
