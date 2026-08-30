import { useWindowDimensions, type TextStyle, type ViewStyle } from 'react-native'
import { currentTokens, useTheme } from './theme'

/**
 * The web client's two styling languages, translated once.
 *
 * Every screen in `react/ensa-web` styles itself with Bootstrap utility classes and the occasional
 * inline `style={{ … }}` written in CSS. Porting them by hand would have meant rewriting thirty
 * thousand lines of presentation and, worse, deciding thirty thousand times what the equivalent
 * was. So the two languages are implemented instead:
 *
 * - `resolveClassName` reads the Bootstrap utilities the application actually uses - the display,
 *   flex, spacing, grid, text and border families - and returns React Native styles.
 * - `normalizeStyle` reads a CSS declaration object: `rem` and `px` strings become numbers,
 *   `var(--kt-…)` is resolved against the active palette, shorthands are expanded, and the
 *   properties React Native has no answer for are dropped rather than crashing the render.
 *
 * The result is that a ported screen keeps its original `className` and `style` props, and reads
 * as the same screen. What this file cannot do it does not pretend to: a dropped property is
 * dropped silently, because the alternative - throwing - would take a whole screen down over a
 * `box-shadow`.
 */

// ---------------------------------------------------------------
// CSS values
// ---------------------------------------------------------------

const ROOT_FONT_SIZE = 15 // Metronic's `$font-size-base`, in points.

/** Resolves a `var(--kt-name)` reference, with its fallback, against the active palette. */
function resolveVar(value: string): string {
  return value.replace(/var\(\s*--kt-([a-z0-9-]+)\s*(?:,\s*([^)]+))?\)/gi, (_match, name, fallback) => {
    const token = currentTokens()[name as string]
    return token ?? (typeof fallback === 'string' ? fallback.trim() : 'transparent')
  })
}

/** A CSS length as a React Native number, or a percentage string, or `undefined`. */
export function length(value: unknown): number | `${number}%` | undefined {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return undefined

  const text = resolveVar(value).trim()
  if (text === '' || text === 'auto' || text === 'none') return undefined
  if (/^-?\d+(\.\d+)?%$/.test(text)) return text as `${number}%`

  const rem = /^(-?\d+(?:\.\d+)?)rem$/.exec(text)
  if (rem) return Number(rem[1]) * ROOT_FONT_SIZE

  const em = /^(-?\d+(?:\.\d+)?)em$/.exec(text)
  if (em) return Number(em[1]) * ROOT_FONT_SIZE

  const px = /^(-?\d+(?:\.\d+)?)(px|pt)?$/.exec(text)
  if (px) return Number(px[1])

  return undefined
}

/** A CSS colour, with custom properties resolved. */
export function color(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const text = resolveVar(value).trim()
  return text === '' || text === 'transparent' ? (text === 'transparent' ? 'transparent' : undefined) : text
}

/** One of the `--kt-*` tokens, by name. */
export function token(name: string): string {
  return currentTokens()[name] ?? 'transparent'
}

/** Properties React Native has no equivalent for. Listed so the omission is deliberate. */
const DROPPED = new Set([
  'boxShadow', 'cursor', 'transition', 'whiteSpace', 'textOverflow', 'wordBreak',
  'overflowWrap', 'float', 'clear', 'listStyle', 'listStyleType', 'boxSizing',
  'appearance', 'outline', 'filter', 'backdropFilter', 'willChange', 'content',
  'gridTemplateColumns', 'gridTemplateRows', 'gridColumn', 'gridRow', 'objectFit',
  'WebkitLineClamp', 'WebkitBoxOrient', 'inset', 'verticalAlign', 'tableLayout',
  'borderCollapse', 'borderSpacing', 'pageBreakInside', 'breakInside', 'printColorAdjust',
])

const LENGTHS = new Set([
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  'top', 'right', 'bottom', 'left', 'flexBasis',
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'paddingVertical', 'paddingHorizontal',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'marginVertical', 'marginHorizontal',
  'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius',
  'borderBottomLeftRadius', 'borderBottomRightRadius',
  'borderWidth', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'fontSize', 'letterSpacing', 'gap', 'rowGap', 'columnGap',
])

const COLORS = new Set([
  'color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor',
  'borderBottomColor', 'borderLeftColor', 'textDecorationColor', 'shadowColor',
])

/** `display` values React Native understands. Everything else is a web-only layout mode. */
const DISPLAYS = new Set(['none', 'flex'])

/** Expands `padding: '4px 8px'` and friends into the sided properties. */
function expandBox(prefix: 'padding' | 'margin', raw: string): Record<string, unknown> {
  const parts = raw.trim().split(/\s+/).map(length)
  const [a, b, c, d] = parts

  if (parts.length === 1) return { [prefix]: a }
  if (parts.length === 2) return { [`${prefix}Vertical`]: a, [`${prefix}Horizontal`]: b }
  if (parts.length === 3) {
    return { [`${prefix}Top`]: a, [`${prefix}Horizontal`]: b, [`${prefix}Bottom`]: c }
  }
  return {
    [`${prefix}Top`]: a,
    [`${prefix}Right`]: b,
    [`${prefix}Bottom`]: c,
    [`${prefix}Left`]: d,
  }
}

/** Expands the `border: 1px solid #eee` shorthand. */
function expandBorder(raw: string): Record<string, unknown> {
  const text = resolveVar(raw).trim()
  if (text === 'none' || text === '0') return { borderWidth: 0 }

  const width = /(-?\d+(?:\.\d+)?)(px|rem)?/.exec(text)
  const style = /(solid|dashed|dotted)/.exec(text)
  const colorMatch = /(#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))/i.exec(text)

  return {
    borderWidth: width ? length(width[0]) : 1,
    borderStyle: style ? style[1] : 'solid',
    borderColor: colorMatch ? colorMatch[1] : undefined,
  }
}

/**
 * A CSS declaration object as a React Native style.
 *
 * Accepts the loose shape the ported screens pass - string lengths, custom properties, shorthands -
 * and returns only properties React Native accepts.
 */
export function normalizeStyle(input: unknown): ViewStyle & TextStyle {
  if (!input || typeof input !== 'object') return {}
  if (Array.isArray(input)) {
    return input.reduce<ViewStyle & TextStyle>(
      (merged, item) => Object.assign(merged, normalizeStyle(item)),
      {},
    )
  }

  const out: Record<string, unknown> = {}

  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    if (raw === undefined || raw === null || DROPPED.has(key)) continue

    if (key === 'padding' || key === 'margin') {
      if (typeof raw === 'string' && /\s/.test(raw.trim())) {
        Object.assign(out, expandBox(key, raw))
        continue
      }
    }

    if (key === 'border') {
      Object.assign(out, expandBorder(String(raw)))
      continue
    }

    if (key === 'borderTop' || key === 'borderBottom' || key === 'borderLeft' || key === 'borderRight') {
      const side = key.slice(6) as 'Top' | 'Bottom' | 'Left' | 'Right'
      const expanded = expandBorder(String(raw))
      out[`border${side}Width`] = expanded.borderWidth
      if (expanded.borderColor) out[`border${side}Color`] = expanded.borderColor
      continue
    }

    if (key === 'display') {
      if (DISPLAYS.has(String(raw))) out.display = raw
      continue
    }

    if (key === 'textDecoration') {
      out.textDecorationLine = String(raw).includes('underline') ? 'underline' : 'none'
      continue
    }

    if (key === 'fontWeight') {
      out.fontWeight = String(raw)
      continue
    }

    if (key === 'lineHeight') {
      // A unitless line height is a multiplier in CSS and a point value in React Native.
      const value = typeof raw === 'number' ? raw : Number(raw)
      const own = length((input as Record<string, unknown>).fontSize)
      const basis = typeof own === 'number' ? own : ROOT_FONT_SIZE
      out.lineHeight = Number.isFinite(value) && value <= 4 ? value * basis : length(raw)
      continue
    }

    if (LENGTHS.has(key)) {
      const value = length(raw)
      if (value !== undefined) out[key] = value
      continue
    }

    if (COLORS.has(key)) {
      const value = color(raw)
      if (value !== undefined) out[key] = value
      continue
    }

    out[key] = raw
  }

  return out as ViewStyle & TextStyle
}

// ---------------------------------------------------------------
// Bootstrap utilities
// ---------------------------------------------------------------

/** Bootstrap's spacing scale, in points. */
const SPACE = [0, 4, 8, 16, 24, 48]

/** Bootstrap's breakpoints. A phone is below `sm`, which is why `col-md-6` becomes full width. */
const BREAKPOINTS: Record<string, number> = { sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1400 }

const SIDES: Record<string, string[]> = {
  t: ['Top'],
  b: ['Bottom'],
  s: ['Left'],
  e: ['Right'],
  x: ['Left', 'Right'],
  y: ['Top', 'Bottom'],
  '': [''],
}

const ALIGN: Record<string, ViewStyle['alignItems']> = {
  start: 'flex-start',
  end: 'flex-end',
  center: 'center',
  baseline: 'baseline',
  stretch: 'stretch',
}

const JUSTIFY: Record<string, ViewStyle['justifyContent']> = {
  start: 'flex-start',
  end: 'flex-end',
  center: 'center',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
}

/** What a class list means beyond a style - the parts a component has to act on itself. */
export interface ClassMeta {
  /** `visually-hidden`: present for assistive technology, absent on screen. */
  visuallyHidden: boolean
  /** `text-truncate`: one line, ellipsised. */
  truncate: boolean
  /** Set by `text-center` / `text-end` / `text-start`. */
  textAlign?: TextStyle['textAlign']
}

export interface ResolvedClassName {
  view: ViewStyle
  text: TextStyle
  meta: ClassMeta
}

const EMPTY: ResolvedClassName = { view: {}, text: {}, meta: { visuallyHidden: false, truncate: false } }

/**
 * Bootstrap utility classes as React Native styles, at a given viewport width.
 *
 * Responsive infixes are honoured rather than ignored, which is what makes `d-none d-lg-block`
 * and `col-md-6` behave on a phone the way they behaved in a narrow browser window: the desktop
 * chrome disappears and the grid columns stack.
 */
export function resolveClassName(className: string | undefined, width: number): ResolvedClassName {
  if (!className) return EMPTY

  const view: Record<string, unknown> = {}
  const text: Record<string, unknown> = {}
  const meta: ClassMeta = { visuallyHidden: false, truncate: false }

  // Bootstrap's `.row > * { width: 100% }` is what a column falls back to below its breakpoint:
  // `col-md-6` is half a row on a tablet and a full-width block on a phone. Skipping the class
  // outright loses that, and the element then flows inline beside its neighbours - which is how a
  // detail screen's label/value pairs ended up as one run-on paragraph.
  let sawColumn = false
  let widthApplied = false

  for (const raw of className.split(/\s+/)) {
    if (!raw) continue

    // Strip a responsive infix, and skip the class entirely when the viewport is narrower than
    // the breakpoint it is gated on.
    const infix = /^([a-z-]+?)-(sm|md|lg|xl|xxl)-(.+)$/.exec(raw)
    let name = raw

    if (infix) {
      const [, head, breakpoint, tail] = infix
      if (head === 'col') sawColumn = true
      if (width < BREAKPOINTS[breakpoint]) continue
      name = `${head}-${tail}`
    } else {
      // `d-lg-none` style classes are caught above; the bare `d-none` falls through here.
      const bareInfix = /^(col|d|flex|order|text|justify-content|align-items|m[tbsexy]?|p[tbsexy]?|g[xy]?)-(sm|md|lg|xl|xxl)$/.exec(raw)
      if (bareInfix) {
        if (bareInfix[1] === 'col') sawColumn = true
        continue
      }
    }

    if (/^col(-|$)/.test(name)) sawColumn = true

    if (apply(name, view, text, meta, width)) {
      if (/^col(-|$)/.test(name)) widthApplied = true
      continue
    }
  }

  if (sawColumn && !widthApplied) {
    view.flexBasis = '100%'
    view.flexGrow = 0
    view.flexShrink = 1
    view.minWidth = 0
  }

  if (meta.textAlign) text.textAlign = meta.textAlign

  return { view: view as ViewStyle, text: text as TextStyle, meta }
}

/** Applies one utility class. Returns true when it was understood. */
function apply(
  name: string,
  view: Record<string, unknown>,
  text: Record<string, unknown>,
  meta: ClassMeta,
  width: number,
): boolean {
  // --- display -------------------------------------------------
  if (name === 'd-none') {
    view.display = 'none'
    return true
  }
  if (name === 'd-flex' || name === 'd-inline-flex') {
    view.flexDirection = view.flexDirection ?? 'row'
    return true
  }
  if (name === 'd-block' || name === 'd-inline-block' || name === 'd-inline' || name === 'd-grid') {
    return true
  }
  if (name === 'd-print-none') return true

  // --- flex ----------------------------------------------------
  if (name === 'flex-column') {
    view.flexDirection = 'column'
    return true
  }
  if (name === 'flex-row') {
    view.flexDirection = 'row'
    return true
  }
  if (name === 'flex-column-reverse') {
    view.flexDirection = 'column-reverse'
    return true
  }
  if (name === 'flex-wrap') {
    view.flexWrap = 'wrap'
    return true
  }
  if (name === 'flex-nowrap') {
    view.flexWrap = 'nowrap'
    return true
  }
  if (name === 'flex-grow-1') {
    view.flexGrow = 1
    return true
  }
  if (name === 'flex-grow-0') {
    view.flexGrow = 0
    return true
  }
  if (name === 'flex-shrink-0') {
    view.flexShrink = 0
    return true
  }
  if (name === 'flex-fill') {
    view.flex = 1
    return true
  }

  const align = /^align-items-(\w+)$/.exec(name)
  if (align && ALIGN[align[1]]) {
    view.alignItems = ALIGN[align[1]]
    return true
  }

  const alignSelf = /^align-self-(\w+)$/.exec(name)
  if (alignSelf && ALIGN[alignSelf[1]]) {
    view.alignSelf = ALIGN[alignSelf[1]]
    return true
  }

  const justify = /^justify-content-(\w+)$/.exec(name)
  if (justify && JUSTIFY[justify[1]]) {
    view.justifyContent = JUSTIFY[justify[1]]
    return true
  }

  // --- grid ----------------------------------------------------
  if (name === 'row') {
    view.flexDirection = 'row'
    view.flexWrap = 'wrap'
    // Bootstrap's default gutter is horizontal only - `--bs-gutter-x: 1.5rem`, `--bs-gutter-y: 0`.
    // A vertical gutter here would space out every stacked column on a phone, which is where a
    // definition list stops reading as a list of pairs. `g-3` and friends set both when a screen
    // actually wants one.
    view.columnGap = view.columnGap ?? 24
    view.rowGap = view.rowGap ?? 0
    return true
  }

  const col = /^col(?:-(\d{1,2}))?$/.exec(name)
  if (col) {
    // `col` with no number shares the row; `col-N` takes N twelfths.
    view.flexBasis = col[1] ? `${(Number(col[1]) / 12) * 100}%` : 0
    view.flexGrow = col[1] ? 0 : 1
    view.flexShrink = 1
    view.minWidth = 0
    return true
  }

  const colAuto = /^col-auto$/.exec(name)
  if (colAuto) {
    view.flexBasis = 'auto'
    view.flexGrow = 0
    return true
  }

  const gutter = /^g([xy])?-([0-5])$/.exec(name)
  if (gutter) {
    const value = SPACE[Number(gutter[2])]
    if (gutter[1] === 'x') view.columnGap = value
    else if (gutter[1] === 'y') view.rowGap = value
    else {
      view.rowGap = value
      view.columnGap = value
    }
    return true
  }

  const gap = /^gap-([0-5])$/.exec(name)
  if (gap) {
    view.gap = SPACE[Number(gap[1])]
    return true
  }

  // --- spacing -------------------------------------------------
  const space = /^([mp])([tbsexy])?-(auto|[0-5])$/.exec(name)
  if (space) {
    const property = space[1] === 'm' ? 'margin' : 'padding'
    const value = space[3] === 'auto' ? 'auto' : SPACE[Number(space[3])]

    for (const side of SIDES[space[2] ?? '']) {
      view[`${property}${side}`] = value
    }
    return true
  }

  // --- sizing --------------------------------------------------
  if (name === 'w-100') {
    view.width = '100%'
    return true
  }
  if (name === 'w-auto') return true
  if (name === 'h-100') {
    // Not `height: '100%'`. In Bootstrap this class sits on a column inside a `row` and means
    // "match your siblings"; the percentage resolves against a parent whose own height came from
    // its content. React Native has no such resolution - a percentage height inside an auto-height
    // parent takes the whole screen - so the intent is expressed directly instead. Getting this
    // wrong is visible immediately: every dashboard tile becomes a screenful.
    view.alignSelf = 'stretch'
    return true
  }
  if (name === 'min-vh-100' || name === 'vh-100') {
    view.flex = 1
    return true
  }
  if (name === 'min-w-0') {
    view.minWidth = 0
    return true
  }

  // --- component chrome the utilities have to stand in for ------
  if (name === 'alert') {
    // `.alert` is a component class, and the screens that use it directly - a notice above a list,
    // a warning inside a dialog - supply only its colours through an inline style. Without its box
    // the text sits flush against whatever follows it, which is how a notice ended up overlapping
    // the card beneath it.
    view.paddingVertical = view.paddingVertical ?? 12
    view.paddingHorizontal = view.paddingHorizontal ?? 14
    view.borderRadius = view.borderRadius ?? 10
    view.marginBottom = view.marginBottom ?? 16
    return true
  }
  if (name === 'card' || name === 'card-body' || name === 'card-footer') {
    // Drawn by `Card` itself; the class on a nested element is decoration the port does not need.
    return true
  }
  if (name === 'btn-group' || name === 'input-group' || name === 'breadcrumb') {
    // These are Bootstrap component classes rather than utilities, and each one's whole visual
    // contribution on a phone is that its children sit in a row. Without this the language
    // switcher's two buttons stack on top of each other, which is exactly what happened.
    view.flexDirection = 'row'
    view.alignItems = 'center'
    view.gap = view.gap ?? 4
    return true
  }
  if (name === 'btn-group-vertical') {
    view.flexDirection = 'column'
    return true
  }
  if (name === 'btn-group-sm' || name === 'btn-group-lg' || name === 'input-group-sm') {
    // Sizing lives on the controls themselves; the group only decides the direction.
    return true
  }

  // --- position ------------------------------------------------
  if (name === 'position-relative') {
    view.position = 'relative'
    return true
  }
  if (name === 'position-absolute') {
    view.position = 'absolute'
    return true
  }
  if (name === 'sticky-top' || name === 'position-sticky' || name === 'position-fixed') {
    // No sticky positioning in React Native; the shell pins its header structurally instead.
    return true
  }

  // --- borders and surfaces ------------------------------------
  if (name === 'border-0') {
    view.borderWidth = 0
    return true
  }
  if (name === 'border' || name === 'border-top' || name === 'border-bottom') {
    const side = name === 'border' ? '' : name === 'border-top' ? 'Top' : 'Bottom'
    view[`border${side}Width`] = 1
    view[`border${side}Color`] = token('border-color')
    return true
  }
  if (name === 'rounded') {
    view.borderRadius = 10
    return true
  }
  if (name === 'rounded-circle') {
    view.borderRadius = 999
    return true
  }
  if (name === 'shadow-sm' || name === 'shadow') {
    view.elevation = name === 'shadow' ? 4 : 2
    view.shadowColor = '#000'
    view.shadowOpacity = 0.08
    view.shadowRadius = name === 'shadow' ? 8 : 4
    view.shadowOffset = { width: 0, height: 2 }
    return true
  }
  if (name === 'bg-transparent') {
    view.backgroundColor = 'transparent'
    return true
  }
  if (name === 'bg-light') {
    view.backgroundColor = token('gray-100')
    return true
  }
  if (name === 'bg-body' || name === 'bg-white') {
    view.backgroundColor = token('card-bg')
    return true
  }

  // --- typography ----------------------------------------------
  const textAlign = /^text-(start|center|end)$/.exec(name)
  if (textAlign) {
    meta.textAlign = textAlign[1] === 'start' ? 'left' : textAlign[1] === 'end' ? 'right' : 'center'
    return true
  }
  if (name === 'text-decoration-none') {
    text.textDecorationLine = 'none'
    return true
  }
  if (name === 'text-uppercase') {
    text.textTransform = 'uppercase'
    return true
  }
  if (name === 'text-lowercase') {
    text.textTransform = 'lowercase'
    return true
  }
  if (name === 'text-nowrap' || name === 'text-truncate') {
    meta.truncate = true
    return true
  }
  if (name === 'text-muted') {
    text.color = token('gray-500')
    return true
  }
  if (name === 'text-body') {
    text.color = token('gray-700')
    return true
  }

  const textColor = /^text-(primary|success|danger|warning|info|dark|secondary)$/.exec(name)
  if (textColor) {
    text.color = token(textColor[1])
    return true
  }

  const weight = /^fw-(light|normal|medium|semibold|bold|bolder)$/.exec(name)
  if (weight) {
    text.fontWeight = ({
      light: '300', normal: '400', medium: '500',
      semibold: '600', bold: '700', bolder: '800',
    } as const)[weight[1] as 'light']
    return true
  }

  const heading = /^h([1-6])$/.exec(name)
  if (heading) {
    text.fontSize = [26, 22, 19, 17, 15, 14][Number(heading[1]) - 1]
    text.fontWeight = '600'
    return true
  }

  const fontSize = /^fs-([1-6])$/.exec(name)
  if (fontSize) {
    text.fontSize = [26, 22, 19, 17, 15, 14][Number(fontSize[1]) - 1]
    return true
  }

  if (name === 'small') {
    text.fontSize = 13
    return true
  }
  if (name === 'lh-sm') {
    text.lineHeight = 18
    return true
  }
  if (name === 'font-monospace') {
    text.fontFamily = undefined
    return true
  }

  // --- accessibility -------------------------------------------
  if (name === 'visually-hidden' || name === 'visually-hidden-focusable') {
    meta.visuallyHidden = true
    return true
  }

  // Bootstrap component classes (`card`, `btn`, `table`, `breadcrumb`, …) are the library's job,
  // not a utility's: the ported components draw that chrome themselves, so the class is a no-op
  // rather than an unknown.
  return false
}

/**
 * The hook form: resolves a class list against the live viewport width.
 *
 * `width` matters because the responsive infixes are real here - rotate a tablet and `col-md-6`
 * genuinely changes what it means.
 */
export function useClassName(className: string | undefined): ResolvedClassName {
  const { width } = useWindowDimensions()

  // Subscribing to the palette is what makes `var(--kt-…)` reactive.
  //
  // A screen is reached through a route element that only changes when the location does, so a
  // theme change does not re-render it - React sees the same element and bails out. Components
  // that read the palette through a context hook still update, because a context change re-renders
  // every consumer whatever its parent did; components that read it through an inline
  // `var(--kt-primary-light)` do not, because `normalizeStyle` reads a module-level snapshot and
  // nothing told them to render again. That is why the dashboard's tinted icons and its separator
  // rules stayed light on a dark page while the cards behind them went dark.
  //
  // The value is deliberately unused: what matters is the subscription, and by the time a
  // consumer re-renders the provider has already published the new palette.
  useTheme()

  return resolveClassName(className, width)
}

/** Merges a class list and an inline style into the pair a `View`/`Text` needs. */
export function useStyles(
  className: string | undefined,
  style: unknown,
): { view: ViewStyle; text: TextStyle; meta: ClassMeta } {
  const resolved = useClassName(className)
  const inline = normalizeStyle(style)

  // A declaration that belongs to text is routed to the text half, so `style={{ color: … }}` on a
  // wrapper still colours the words inside it, exactly as it does through the cascade.
  const textKeys = new Set([
    'color', 'fontSize', 'fontWeight', 'fontStyle', 'fontFamily', 'lineHeight',
    'letterSpacing', 'textAlign', 'textTransform', 'textDecorationLine',
  ])

  const viewStyle: Record<string, unknown> = { ...resolved.view }
  const textStyle: Record<string, unknown> = { ...resolved.text }

  for (const [key, value] of Object.entries(inline)) {
    if (textKeys.has(key)) textStyle[key] = value
    else viewStyle[key] = value
  }

  return { view: viewStyle as ViewStyle, text: textStyle as TextStyle, meta: resolved.meta }
}
