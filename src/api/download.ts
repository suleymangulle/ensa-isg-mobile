import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { Platform } from 'react-native'
import { API_BASE_URL } from '@/config'
import { officeAccessor } from '@/auth/officeStore'
import { tokenStore } from '@/auth/tokenStore'
import { apiCulture } from '@/i18n'

/**
 * Downloads a protected file and hands it to the platform.
 *
 * The web client fetched the bytes through axios - so the bearer token was attached and refreshed
 * for it - and then handed the browser an object URL to save. Neither half of that exists here:
 * there is no object URL, and there is no "downloads" the user can be sent to. So the file is
 * written into the application's cache directory and passed to the system share sheet, which is
 * where a phone actually decides what to do with a document - open it, save it to Files, send it
 * on.
 *
 * The token still has to travel, and for the same reason as before: every content route requires
 * it, and putting it in the query string instead would write it into server logs. `downloadFileAsync`
 * takes request headers, so it is sent as a header exactly as the interceptor would have.
 */
export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  const file = await fetchToCache(path, fallbackName)

  if (!(await Sharing.isAvailableAsync())) {
    // The share sheet is unavailable on web and on a simulator without one. The file is on disk
    // either way; saying where is more use than failing silently.
    throw new Error(file.uri)
  }

  await Sharing.shareAsync(file.uri, {
    dialogTitle: fallbackName,
    // iOS uses the UTI when it has one and falls back to the extension; Android needs the MIME
    // type to decide which applications can open the file at all.
    mimeType: mimeTypeFor(fallbackName),
    UTI: Platform.OS === 'ios' ? undefined : undefined,
  })
}

/** Fetches into the cache directory and returns the written file. */
async function fetchToCache(path: string, fallbackName: string): Promise<File> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`

  // A name that is safe on every filesystem; the server's own name arrives in
  // `Content-Disposition`, which `downloadFileAsync` already applies when it can.
  const safeName = fallbackName.replace(/[\\/:*?"<>|]/g, '_')
  const destination = new File(Paths.cache, safeName)

  if (destination.exists) destination.delete()

  try {
    return await File.downloadFileAsync(url, destination, {
      headers: requestHeaders(),
      idempotent: true,
    })
  } catch (error) {
    // One retry behind a refreshed token, mirroring the response interceptor. Anything else -
    // a 403, a missing document, no network - is the caller's to report.
    if (!isUnauthorised(error)) throw error

    const refreshed = await tokenStore.refresh()
    if (!refreshed) throw error

    return await File.downloadFileAsync(url, destination, {
      headers: requestHeaders(),
      idempotent: true,
    })
  }
}

function requestHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Accept-Language': apiCulture() }

  const token = tokenStore.getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const office = officeAccessor.get()
  if (office && token) headers['X-Ensa-OfficeId'] = office

  return headers
}

function isUnauthorised(error: unknown): boolean {
  return error instanceof Error && /\b401\b/.test(error.message)
}

/** Enough of a MIME table for the document types this application stores. */
const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  csv: 'text/csv',
  txt: 'text/plain',
  xml: 'application/xml',
  json: 'application/json',
  zip: 'application/zip',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
}

export function mimeTypeFor(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? ''
  return MIME_TYPES[extension] ?? 'application/octet-stream'
}

/**
 * The same fetch, without the share sheet.
 *
 * Used by the report screens, which show the document rather than hand it on: they need a local
 * `file://` URI to point a viewer at.
 */
export async function cacheProtectedFile(path: string, fallbackName: string): Promise<string> {
  return (await fetchToCache(path, fallbackName)).uri
}
