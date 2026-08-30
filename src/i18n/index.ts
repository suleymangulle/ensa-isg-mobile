import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getLocales } from 'expo-localization'
import { storage } from '@/utils/storage'
import tr from './locales/tr.json'
import en from './locales/en.json'
import mobileTr from './mobile/tr.json'
import mobileEn from './mobile/en.json'

/**
 * Module translations.
 *
 * Every `src/pages/<module>/locales/<lang>.json` is merged onto the core bundle at build time.
 * Modules keep their own files instead of appending to one shared bundle, because a single
 * 200-key JSON edited by everyone is the classic merge-conflict hotspot - and a lost key there
 * surfaces as raw `some.key` text in the UI rather than as a build error.
 *
 * The web client collects them with `import.meta.glob`, which is Vite's. Metro's equivalent is
 * `require.context`, switched on in `metro.config.js`. Same contract: drop a module folder in and
 * its translations are there.
 */
const moduleBundles = require.context('../pages', true, /locales\/(tr|en)\.json$/)

/**
 * The copy that exists only on this client.
 *
 * A phone needs words the web client never had to say - the label on a picker's search box, the
 * name of the button that closes a sheet - and those words cannot be added to `locales/`, because
 * `locales/` is copied from the web client by `tools/port/port_from_web.py` and would lose them on
 * the next port. So they live beside it and are merged on top, section by section, exactly as a
 * module's own bundle is.
 */
const MOBILE_BUNDLES: Record<SupportedLanguage, Record<string, unknown>> = {
  tr: mobileTr,
  en: mobileEn,
}

/** Merges module bundles onto a copy of the core bundle. Later keys never overwrite core ones. */
function withModuleBundles(
  language: SupportedLanguage,
  core: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...core }

  for (const [section, values] of Object.entries(MOBILE_BUNDLES[language])) {
    const existing = merged[section]
    merged[section] =
      isPlainObject(existing) && isPlainObject(values) ? { ...existing, ...values } : values
  }

  for (const path of moduleBundles.keys()) {
    if (!path.endsWith(`/${language}.json`)) continue

    const bundle = moduleBundles(path) as Record<string, unknown>

    for (const [section, values] of Object.entries(bundle)) {
      const existing = merged[section]
      merged[section] =
        isPlainObject(existing) && isPlainObject(values)
          ? { ...existing, ...values }
          : (merged[section] ?? values)
    }
  }

  return merged
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export const SUPPORTED_LANGUAGES = ['tr', 'en'] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

/** Storage key the active language is remembered under. */
export const LANGUAGE_STORAGE_KEY = 'ensa.lang'

/**
 * Language code -> .NET culture name.
 *
 * The API declares its supported cultures as `tr-TR` / `en-US`
 * (see `EnsaHttpApiHostModule.SupportedCultures`). ASP.NET Core falls back from a
 * specific culture to its parent, but not the other way round, so the full culture
 * name is sent rather than the bare two-letter code.
 */
const API_CULTURES: Record<SupportedLanguage, string> = {
  tr: 'tr-TR',
  en: 'en-US',
}

/** Language code -> BCP 47 tag used by `Intl` for date and number formatting. */
const FORMAT_LOCALES: Record<SupportedLanguage, string> = {
  tr: 'tr-TR',
  en: 'en-GB',
}

function isSupported(code: string | null | undefined): code is SupportedLanguage {
  return !!code && (SUPPORTED_LANGUAGES as readonly string[]).includes(code)
}

/**
 * The language to start in: what was chosen last, then what the device is set to, then Turkish.
 *
 * The web client delegates this to `i18next-browser-languagedetector`, which reads
 * `localStorage` and `navigator.languages`. Neither exists here, and the detector's storage is
 * asynchronous on this platform anyway - so the same order is applied directly, against the
 * hydrated store and the device's own locale list.
 */
function initialLanguage(): SupportedLanguage {
  const remembered = storage.get(LANGUAGE_STORAGE_KEY)
  if (isSupported(remembered)) return remembered

  for (const locale of getLocales()) {
    const code = locale.languageCode?.toLowerCase()
    if (isSupported(code)) return code
  }
  return 'tr'
}

void i18n.use(initReactI18next).init({
  resources: {
    tr: { translation: withModuleBundles('tr', tr) },
    en: { translation: withModuleBundles('en', en) },
  },
  lng: initialLanguage(),
  supportedLngs: [...SUPPORTED_LANGUAGES],
  fallbackLng: 'tr',
  nonExplicitSupportedLngs: true,
  load: 'languageOnly',
  interpolation: { escapeValue: false },
  // React Native has no `Intl.PluralRules` fallback worth relying on for a language this
  // application does not ship, and every key here exists in both bundles.
  returnNull: false,
})

// The choice outlives the session, which is what the browser detector's `caches: ['localStorage']`
// was doing.
i18n.on('languageChanged', (language) => {
  const code = language.split('-')[0]
  if (isSupported(code)) storage.set(LANGUAGE_STORAGE_KEY, code)
})

/** Active language, narrowed to one of the supported codes. */
export function currentLanguage(): SupportedLanguage {
  const code = (i18n.resolvedLanguage ?? i18n.language ?? 'tr').split('-')[0]
  return isSupported(code) ? code : 'tr'
}

/** Culture name for the `Accept-Language` request header. */
export function apiCulture(): string {
  return API_CULTURES[currentLanguage()]
}

/** Locale tag for `Intl.DateTimeFormat` / `Intl.NumberFormat`. */
export function formatLocale(): string {
  return FORMAT_LOCALES[currentLanguage()]
}

export default i18n
