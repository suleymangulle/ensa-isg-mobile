import * as Crypto from 'expo-crypto'
import { File } from 'expo-file-system'
import { DocumentOwnerType } from '@/api/enums'
import type { PickedFile } from '@/ui'

/**
 * Presentation helpers of the documents module.
 *
 * Formatting itself belongs to the shared `@/utils/format` bundle — `formatFileSize` renders
 * the byte counts on these screens. What lives here is documents-only logic: the owner-type
 * option list, and the local digest the duplicate check is run against.
 */

/** Every `DocumentOwnerType` value, for the owner drop-downs. */
export const OWNER_TYPES: DocumentOwnerType[] = Object.values(DocumentOwnerType).filter(
  (value): value is DocumentOwnerType => typeof value === 'number',
)

/** Extension without the leading dot, or `null` when the name carries none. */
export function extensionOf(fileName: string): string | null {
  const dot = fileName.lastIndexOf('.')
  if (dot <= 0 || dot === fileName.length - 1) return null
  return fileName.slice(dot + 1).toLowerCase()
}

/**
 * SHA-256 digest of a file, as 64 lowercase hex characters - the shape the API stores.
 *
 * The file never leaves the device: there is no upload endpoint, so the digest is computed
 * locally purely so the duplicate check has something to ask about.
 *
 * The web version hands the bytes to WebCrypto. There is none here, so the file is read from the
 * path the document picker returned and hashed with `expo-crypto`. Reading it as base64 first is
 * a real cost on a large file - it is a copy in memory - but it is the only encoding both the
 * filesystem and the digest agree on, and a document a person picked to attach to a record is not
 * a video.
 */
export async function sha256OfFile(file: PickedFile): Promise<string> {
  const contents = await new File(file.uri).base64()

  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, contents, {
    encoding: Crypto.CryptoEncoding.HEX,
  })
}

/**
 * Whether the digest can be computed here.
 *
 * In the browser this asks whether WebCrypto is available, which needs a secure context. On a
 * device the platform module is always there, so the answer is always yes - kept as a function
 * because the screen branches on it and the branch is what produces `document.form.hashUnavailable`.
 */
export function canHashLocally(): boolean {
  return true
}

/** Years offered by the archive period filter: this year and the nine before it. */
export function recentYears(count = 10): number[] {
  const thisYear = new Date().getFullYear()
  return Array.from({ length: count }, (_, index) => thisYear - index)
}

/** 1..12, for the month drop-downs. */
export const MONTHS: number[] = Array.from({ length: 12 }, (_, index) => index + 1)
