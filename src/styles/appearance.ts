import { createColorScheme, listColorSchemes, registerColorScheme, type ColorScheme } from '@/ui'

/**
 * The appearance settings, wired to this application.
 *
 * A colour scheme is a complete token family, not a single hue: a partial one is rejected rather
 * than shipping a half-recoloured theme. So the Metronic primary is registered here once, as a
 * scheme, and every component follows it - instead of the primary being declared a second time
 * somewhere else and drifting.
 */
export const APPEARANCE_STORAGE_KEY = 'ensa:appearance'

/** The Metronic blue. Identical to the web client's, on purpose. */
export const ENSA_COLOR_SCHEME_ID = 'ensa'

registerColorScheme(
  createColorScheme({
    id: ENSA_COLOR_SCHEME_ID,
    primary: '#3E97FF',
    primaryActive: '#2884EF',
    primaryLight: '#F1FAFF',
    primaryInverse: '#FFFFFF',
    primaryRgb: '62, 151, 255',
  }),
)

/**
 * Schemes offered in the appearance menu, Ensa's own first.
 *
 * Explicit rather than "every registered scheme" so the menu can only offer ids this application
 * actually has translated labels for.
 */
export const OFFERED_COLOR_SCHEME_IDS = [ENSA_COLOR_SCHEME_ID, 'indigo', 'teal', 'green'] as const

export function offeredColorSchemes(): ColorScheme[] {
  const registered = new Map(listColorSchemes().map((scheme) => [scheme.id, scheme]))
  return OFFERED_COLOR_SCHEME_IDS.map((id) => registered.get(id)).filter(
    (scheme): scheme is ColorScheme => scheme !== undefined,
  )
}
