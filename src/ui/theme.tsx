import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useColorScheme } from 'react-native'
import { storage } from '@/utils/storage'

/**
 * The design tokens the web client publishes as CSS custom properties, expressed as values.
 *
 * `styles/ensa.scss` declares `--kt-*` on `:root` and redefines a subset under
 * `[data-bs-theme='dark']`; the screens read them through `var(--kt-gray-500)` in inline styles.
 * There is no cascade here to read them from, so the same two palettes live in this file and the
 * inline `var(...)` references are resolved against the active one at render time (see
 * `normalizeStyle` in `./style`). The values are copied from the stylesheet unchanged - when one
 * changes there, it changes here.
 */

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'
export type SidebarPresentation = 'compact' | 'grouped'
export type SidebarTone = 'light' | 'dark' | 'auto'

/** A complete primary family. Partial schemes are rejected, as in the web library. */
export interface ColorScheme {
  id: string
  primary: string
  primaryActive: string
  primaryLight: string
  primaryInverse: string
  primaryRgb: string
}

export type ThemeTokens = Record<string, string>

const LIGHT: Record<string, string> = {
  'primary-light': '#F1FAFF',
  success: '#50CD89',
  'success-active': '#47BE7D',
  'success-light': '#E8FFF3',
  info: '#7239EA',
  'info-active': '#5014D0',
  'info-light': '#F8F5FF',
  warning: '#FFC700',
  'warning-active': '#F1BC00',
  'warning-light': '#FFF8DD',
  danger: '#F1416C',
  'danger-active': '#D9214E',
  'danger-light': '#FFF5F8',
  dark: '#181C32',
  secondary: '#E4E6EF',
  light: '#F9F9F9',
  'gray-100': '#F9F9F9',
  'gray-200': '#F1F1F2',
  'gray-300': '#F4F4F4',
  'gray-400': '#B5B5C3',
  'gray-500': '#A1A5B7',
  'gray-600': '#7E8299',
  'gray-700': '#5E6278',
  'gray-800': '#3F4254',
  'gray-900': '#181C32',
  'body-bg': '#F5F8FA',
  'card-bg': '#FFFFFF',
  'input-bg': '#FFFFFF',
  'border-color': '#F1F1F2',
  'hover-surface': '#F9F9F9',
}

const DARK: Record<string, string> = {
  ...LIGHT,
  'primary-light': '#1C2637',
  'success-light': '#1C3238',
  'info-light': '#2F264F',
  'warning-light': '#392F28',
  'danger-light': '#3A2434',
  'gray-100': '#1B1B29',
  'gray-200': '#2B2B40',
  'gray-300': '#323248',
  'gray-400': '#474761',
  'gray-500': '#565674',
  'gray-600': '#6D6D80',
  'gray-700': '#92929F',
  'gray-800': '#CDCDDE',
  'gray-900': '#FFFFFF',
  'body-bg': '#151521',
  'card-bg': '#1E1E2D',
  'input-bg': '#1B1B29',
  'border-color': '#2B2B40',
  dark: '#FFFFFF',
  secondary: '#2B2B40',
  light: '#2B2B40',
  'hover-surface': '#2A2A3C',
}

/** Fixed measurements the shell reads by name, as the stylesheet publishes them. */
const METRICS: Record<string, string> = {
  'header-height': '64',
  'sidebar-width': '265',
  'sidebar-width-collapsed': '76',
}

// ---------------------------------------------------------------
// Colour scheme registry
// ---------------------------------------------------------------

const schemes = new Map<string, ColorScheme>()

const SCHEME_KEYS = [
  'id',
  'primary',
  'primaryActive',
  'primaryLight',
  'primaryInverse',
  'primaryRgb',
] as const

export function createColorScheme(scheme: ColorScheme): ColorScheme {
  const missing = SCHEME_KEYS.filter((key) => !scheme[key])
  if (missing.length > 0) {
    throw new Error(`Colour scheme "${scheme.id}" is missing: ${missing.join(', ')}.`)
  }
  return { ...scheme }
}

export function registerColorScheme(scheme: ColorScheme): void {
  schemes.set(scheme.id, scheme)
}

export function listColorSchemes(): ColorScheme[] {
  return [...schemes.values()]
}

/**
 * The web library's pre-paint script. It has no meaning outside a browser - there is no document
 * to write an attribute onto and no flash of the wrong theme to prevent, because the stored mode
 * is already in memory before the first render (`hydrateStorage`). Kept so the entry point reads
 * the same in both clients.
 */
export function createAppearanceInitScript(): string {
  return ''
}

// The library's own schemes, so the appearance menu has something to offer beside the
// application's own.
registerColorScheme(
  createColorScheme({
    id: 'indigo',
    primary: '#4B49E4',
    primaryActive: '#3A38D6',
    primaryLight: '#F0F0FE',
    primaryInverse: '#FFFFFF',
    primaryRgb: '75, 73, 228',
  }),
)
registerColorScheme(
  createColorScheme({
    id: 'teal',
    primary: '#0BB783',
    primaryActive: '#04AA77',
    primaryLight: '#E8FFF6',
    primaryInverse: '#FFFFFF',
    primaryRgb: '11, 183, 131',
  }),
)
registerColorScheme(
  createColorScheme({
    id: 'green',
    primary: '#50CD89',
    primaryActive: '#47BE7D',
    primaryLight: '#E8FFF3',
    primaryInverse: '#FFFFFF',
    primaryRgb: '80, 205, 137',
  }),
)

// ---------------------------------------------------------------
// Appearance context
// ---------------------------------------------------------------

interface AppearanceState {
  mode: ThemeMode
  sidebarPresentation: SidebarPresentation
  sidebarTone: SidebarTone
  colorSchemeId: string
}

export interface AppearanceContextValue extends AppearanceState {
  resolvedTheme: ResolvedTheme
  setMode: (mode: ThemeMode) => void
  setSidebarPresentation: (presentation: SidebarPresentation) => void
  setSidebarTone: (tone: SidebarTone) => void
  setColorSchemeId: (id: string) => void
  /** Every `--kt-*` token, resolved for the active theme and colour scheme. */
  tokens: ThemeTokens
  colorScheme: ColorScheme
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

export interface AppearanceProviderProps {
  children: ReactNode
  defaultMode?: ThemeMode
  defaultSidebarPresentation?: SidebarPresentation
  defaultSidebarTone?: SidebarTone
  defaultColorSchemeId?: string
  storageKey?: string
}

function readStored(key: string): Partial<AppearanceState> {
  const raw = storage.get(key)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Partial<AppearanceState>
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

export function AppearanceProvider({
  children,
  defaultMode = 'system',
  defaultSidebarPresentation = 'grouped',
  defaultSidebarTone = 'auto',
  defaultColorSchemeId = 'indigo',
  storageKey = 'rrc:appearance',
}: AppearanceProviderProps) {
  const stored = useMemo(() => readStored(storageKey), [storageKey])

  const [state, setState] = useState<AppearanceState>({
    mode: stored.mode ?? defaultMode,
    sidebarPresentation: stored.sidebarPresentation ?? defaultSidebarPresentation,
    sidebarTone: stored.sidebarTone ?? defaultSidebarTone,
    colorSchemeId: stored.colorSchemeId ?? defaultColorSchemeId,
  })

  useEffect(() => {
    storage.set(storageKey, JSON.stringify(state))
  }, [state, storageKey])

  const systemTheme = useColorScheme()
  const resolvedTheme: ResolvedTheme =
    state.mode === 'system' ? (systemTheme === 'dark' ? 'dark' : 'light') : state.mode

  const colorScheme = schemes.get(state.colorSchemeId) ?? listColorSchemes()[0]

  const tokens = useMemo<ThemeTokens>(() => {
    const palette = resolvedTheme === 'dark' ? DARK : LIGHT
    return {
      ...palette,
      ...METRICS,
      primary: colorScheme.primary,
      'primary-active': colorScheme.primaryActive,
      'primary-light': colorScheme.primaryLight,
      'primary-inverse': colorScheme.primaryInverse,
      'primary-rgb': colorScheme.primaryRgb,
    }
  }, [colorScheme, resolvedTheme])

  // Published synchronously, during render rather than in an effect: `normalizeStyle` reads it
  // while the very first child renders, which is before any effect has run.
  publishTokens(tokens)

  const set = useCallback(
    <K extends keyof AppearanceState>(key: K) =>
      (value: AppearanceState[K]) =>
        setState((current) => ({ ...current, [key]: value })),
    [],
  )

  const value = useMemo<AppearanceContextValue>(
    () => ({
      ...state,
      resolvedTheme,
      tokens,
      colorScheme,
      setMode: set('mode'),
      setSidebarPresentation: set('sidebarPresentation'),
      setSidebarTone: set('sidebarTone'),
      setColorSchemeId: set('colorSchemeId'),
    }),
    [colorScheme, resolvedTheme, set, state, tokens],
  )

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext)
  if (!context) throw new Error('useAppearance can only be used inside AppearanceProvider.')
  return context
}

/** Just the palette, for the many callers that want nothing else. */
export function useTheme(): ThemeTokens {
  return useAppearance().tokens
}

/**
 * The palette outside React.
 *
 * `normalizeStyle` resolves `var(--kt-…)` while a component renders, and it is called from
 * places that are not components (a column formatter, a style helper). The provider pushes the
 * active palette here on every change so those callers read the same values the tree does.
 */
let activeTokens: ThemeTokens = { ...LIGHT, ...METRICS, primary: '#3E97FF' }

export function publishTokens(tokens: ThemeTokens): void {
  activeTokens = tokens
}

export function currentTokens(): ThemeTokens {
  return activeTokens
}
