import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import {
  Pressable,
  Text as RNText,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { useStyles } from './style'

/**
 * The handful of HTML elements the ported screens still use, as React Native components.
 *
 * A screen written for the browser lays itself out with `<div>`, labels a value with `<span>`,
 * and titles a section with `<h6>`. React Native has `View` and `Text` and no cascade, so three
 * things have to be supplied here for those screens to keep working unchanged:
 *
 * 1. **String children.** `<View>` throws on a bare string. Every component in this file wraps
 *    loose text in a `Text` before handing it over, which is what the browser did implicitly.
 * 2. **Inherited typography.** `color`, `fontSize` and `fontWeight` set on a container reach the
 *    words inside it through a context, because React Native only inherits inside a `Text` tree.
 * 3. **`className`.** Resolved by `./style`, so the Bootstrap utilities the screens were written
 *    with still mean what they meant.
 *
 * The element names are capitalised (`Div`, `Span`, `H6`) because JSX reads a lowercase tag as a
 * host component. That is the only change a ported screen needs to make.
 */

/** The typography a container passes down, standing in for the CSS cascade. */
const Inherited = createContext<TextStyle>({})

export function useInheritedTextStyle(): TextStyle {
  return useContext(Inherited)
}

export interface BoxProps {
  children?: ReactNode
  className?: string
  style?: unknown
  /** Kept from the web components; a pressable box is rendered when it is set. */
  onClick?: () => void
  /** Only `FormTag` acts on this; see its own note. */
  onSubmit?: (event: { preventDefault: () => void; stopPropagation: () => void }) => void
  id?: string
  title?: string
  role?: string
  'aria-label'?: string
  /** Written as the string `"true"` in JSX, which is what the ported markup carries. */
  'aria-hidden'?: boolean | string
  'aria-live'?: string
  testID?: string
  /**
   * The web attributes a ported element still carries - `htmlFor`, `colSpan`, `noValidate`,
   * `data-*`. They have no effect here and are accepted rather than stripped, so porting a screen
   * stays a matter of capitalising its tags instead of also auditing every attribute on them.
   */
  [key: string]: unknown
}

/** Wraps loose text children so a `View` never receives a bare string. */
export function withText(children: ReactNode, style: StyleProp<TextStyle>): ReactNode {
  return Children.map(children, (child) => {
    if (child === null || child === undefined || child === false || child === true) return child
    if (typeof child === 'string' || typeof child === 'number') {
      return <RNText style={style}>{child}</RNText>
    }
    return child
  })
}

/**
 * Publishes a text style to everything inside it, elements included.
 *
 * `withText` only reaches loose strings: it wraps them in a `Text` and styles that. Anything the
 * caller passed as an element - a `Span` holding a record's name, a `Text` inside a card - is
 * handed through untouched, and a bare `Span` with no colour of its own falls back to React
 * Native's default, which is black. That is invisible on a dark page, and it is what made every
 * list row's title unreadable in dark mode while the plain string cells beside it were fine.
 *
 * So the style is put on the context as well, which is the same mechanism `Div` uses and the same
 * thing the CSS cascade was doing in the web client.
 */
export function InheritText({
  style,
  children,
}: {
  style: TextStyle
  children: ReactNode
}) {
  const inherited = useInheritedTextStyle()
  const merged = useMemo<TextStyle>(() => ({ ...inherited, ...style }), [inherited, style])

  return <Inherited.Provider value={merged}>{withText(children, merged)}</Inherited.Provider>
}

/** True when every child is plain text - the case that can be rendered as one `Text` node. */
export function isTextOnly(children: ReactNode): boolean {
  const items = Children.toArray(children)
  if (items.length === 0) return false
  return items.every((child) => typeof child === 'string' || typeof child === 'number')
}

/** `visually-hidden`: off screen but still announced. */
const OFFSCREEN: ViewStyle = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 }

export function Div({
  children,
  className,
  style,
  onClick,
  role,
  testID,
  ...rest
}: BoxProps) {
  const { view, text, meta } = useStyles(className, style)
  const inherited = useInheritedTextStyle()

  const merged = useMemo<TextStyle>(() => ({ ...inherited, ...text }), [inherited, text])

  const content = (
    <Inherited.Provider value={merged}>{withText(children, merged)}</Inherited.Provider>
  )

  const boxStyle: StyleProp<ViewStyle> = meta.visuallyHidden ? [view, OFFSCREEN] : view

  if (onClick) {
    return (
      <Pressable
        style={boxStyle}
        onPress={onClick}
        accessibilityRole="button"
        accessibilityLabel={rest['aria-label']}
        testID={testID}
      >
        {content}
      </Pressable>
    )
  }

  return (
    <View
      style={boxStyle}
      accessibilityLabel={rest['aria-label']}
      accessibilityRole={role === 'status' ? 'text' : undefined}
      accessibilityElementsHidden={Boolean(rest['aria-hidden'])}
      importantForAccessibility={rest['aria-hidden'] ? 'no-hide-descendants' : undefined}
      testID={testID}
    >
      {content}
    </View>
  )
}

export interface InlineProps extends BoxProps {
  /** Passed straight through; the ported screens use it for truncation. */
  numberOfLines?: number
}

/** `<span>`: text that inherits from whatever contains it. */
export function Span({ children, className, style, onClick, numberOfLines, ...rest }: InlineProps) {
  const { view, text, meta } = useStyles(className, style)
  const inherited = useInheritedTextStyle()

  const merged: StyleProp<TextStyle> = [inherited, view as TextStyle, text, meta.visuallyHidden ? OFFSCREEN : null]

  return (
    <RNText
      style={merged}
      numberOfLines={numberOfLines ?? (meta.truncate ? 1 : undefined)}
      onPress={onClick}
      accessibilityLabel={rest['aria-label']}
    >
      {children}
    </RNText>
  )
}

/** `<p>`: a block of text with the browser's bottom margin. */
export function P({ children, className, style, ...rest }: InlineProps) {
  return (
    <Span className={className} style={{ marginBottom: 8, ...(style as object) }} {...rest}>
      {children}
    </Span>
  )
}

/** `<strong>` */
export function Strong({ children, className, style, ...rest }: InlineProps) {
  return (
    <Span className={className} style={{ fontWeight: '700', ...(style as object) }} {...rest}>
      {children}
    </Span>
  )
}

/** `<small>` */
export function Small({ children, className, style, ...rest }: InlineProps) {
  return (
    <Span className={className} style={{ fontSize: 13, ...(style as object) }} {...rest}>
      {children}
    </Span>
  )
}

/** `<code>` */
export function Code({ children, className, style, ...rest }: InlineProps) {
  return (
    <Span className={className} style={{ fontSize: 13, ...(style as object) }} {...rest}>
      {children}
    </Span>
  )
}

const HEADING_SIZES = [26, 22, 19, 17, 15, 14]

function heading(level: number) {
  return function Heading({ children, className, style, ...rest }: InlineProps) {
    return (
      <Span
        className={className}
        style={{
          fontSize: HEADING_SIZES[level - 1],
          fontWeight: '600',
          marginBottom: 8,
          ...(style as object),
        }}
        {...rest}
      >
        {children}
      </Span>
    )
  }
}

export const H1 = heading(1)
export const H2 = heading(2)
export const H3 = heading(3)
export const H4 = heading(4)
export const H5 = heading(5)
export const H6 = heading(6)

/** `<ul>` / `<ol>`: a plain column; the screens that use them always list them unstyled. */
export function Ul({ children, className, style, ...rest }: BoxProps) {
  return (
    <Div className={className} style={style} {...rest}>
      {children}
    </Div>
  )
}

export const Ol = Ul

/** `<li>` */
export function Li({ children, className, style, ...rest }: BoxProps) {
  const items = Children.toArray(children)
  const inline = items.length > 0 && items.every((child) => !isValidElement(child))

  return inline ? (
    <Span className={className} style={style} {...(rest as InlineProps)}>
      {children}
    </Span>
  ) : (
    <Div className={className} style={style} {...rest}>
      {children}
    </Div>
  )
}

/** `<hr>` */
export function Hr({ className, style }: BoxProps) {
  const { view } = useStyles(className, style)
  return <View style={[{ height: 1, backgroundColor: 'rgba(128,128,128,0.25)', marginVertical: 8 }, view]} />
}

/** `<br>` */
export function Br() {
  return <RNText>{'\n'}</RNText>
}

// ---------------------------------------------------------------
// Tables
//
// The handful of screens that lay out a fixed grid by hand - the permission matrix, an invoice's
// lines, a work plan's months - use a real `<table>` rather than the `DataGrid`. They are ported
// as flex rows and cells, which is the same box model the browser gave them for these layouts:
// every one of them sets its own column widths.
// ---------------------------------------------------------------

export function Table({ children, className, style, ...rest }: BoxProps) {
  return (
    <Div className={className} style={style} {...rest}>
      {children}
    </Div>
  )
}

export const THead = Table
export const TBody = Table

export function Tr({ children, className, style, ...rest }: BoxProps) {
  return (
    <Div className={className} style={{ flexDirection: 'row', alignItems: 'stretch', ...(style as object) }} {...rest}>
      {children}
    </Div>
  )
}

export function Td({ children, className, style, ...rest }: BoxProps) {
  return (
    <Div
      className={className}
      style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, paddingVertical: 8, paddingHorizontal: 6, ...(style as object) }}
      {...rest}
    >
      {children}
    </Div>
  )
}

export function Th({ children, className, style, ...rest }: BoxProps) {
  return (
    <Td className={className} style={{ ...(style as object) }} {...rest}>
      {typeof children === 'string' ? <Span style={{ fontWeight: '600', fontSize: 12 }}>{children}</Span> : children}
    </Td>
  )
}

/** `<section>`, `<header>`, `<footer>`, `<nav>`, `<main>`, `<article>`, `<aside>` - all boxes. */
export const Section = Div
export const HeaderTag = Div
export const FooterTag = Div
export const Nav = Div
export const Main = Div
export const Article = Div
export const Aside = Div
export const Label = Span

/**
 * `<form>`.
 *
 * There is no implicit submission on a phone - no Enter key on a form, no default action - but
 * every ported screen still declares `onSubmit` on its form and puts a `type="submit"` button
 * inside it or, for a dialog, in a footer bound to it by `form={id}`. Rather than rewrite all of
 * that, the two halves of HTML form submission are reimplemented: a form publishes its handler,
 * and a submit button finds it - by the nearest enclosing form, or by the id it names.
 *
 * The handler is called with an event carrying `preventDefault` and `stopPropagation`, so the
 * ported bodies run unchanged. Neither does anything; there is no default here to prevent.
 */

export interface SubmitEvent {
  preventDefault: () => void
  stopPropagation: () => void
}

type SubmitHandler = () => void

const FormSubmitContext = createContext<SubmitHandler | null>(null)

/** Forms that named themselves with an `id`, so a button outside one can still submit it. */
const formsById = new Map<string, SubmitHandler>()

/** Runs a form's handler by id. Used by a submit button that names a form it is not inside. */
export function submitForm(id: string): void {
  formsById.get(id)?.()
}

/** The enclosing form's handler, if there is one. */
export function useFormSubmit(): SubmitHandler | null {
  return useContext(FormSubmitContext)
}

export function FormTag({ children, id, onSubmit, className, style, ...rest }: BoxProps) {
  const handler = useCallback(() => {
    const submit = onSubmit as ((event: SubmitEvent) => void) | undefined
    submit?.({ preventDefault: () => undefined, stopPropagation: () => undefined })
  }, [onSubmit])

  useEffect(() => {
    if (!id) return
    formsById.set(id, handler)
    return () => {
      formsById.delete(id)
    }
  }, [handler, id])

  return (
    <FormSubmitContext.Provider value={handler}>
      <Div className={className} style={style} {...rest}>
        {children}
      </Div>
    </FormSubmitContext.Provider>
  )
}

/**
 * `<fieldset>`: a labelled group of controls.
 *
 * The browser draws a border and notches the legend into it. React Native draws neither, so the
 * group is a card-like box with its legend above it - which is what the border was communicating.
 */
export function Fieldset({ children, className, style, ...rest }: BoxProps) {
  return (
    <Div
      className={className}
      style={{ borderRadius: 10, borderWidth: 1, borderColor: 'rgba(128,128,128,0.25)', padding: 12, marginBottom: 12, ...(style as object) }}
      {...rest}
    >
      {children}
    </Div>
  )
}

/** `<legend>`: the group's name. */
export function Legend({ children, className, style, ...rest }: InlineProps) {
  return (
    <Span className={className} style={{ fontWeight: '600', fontSize: 13, marginBottom: 8, ...(style as object) }} {...rest}>
      {children}
    </Span>
  )
}

/**
 * `<datalist>`: nothing.
 *
 * A datalist offers completions for a text input and is otherwise invisible - the field works
 * exactly as well without one, which is why this renders nothing rather than something. The
 * suggestions themselves are still in the markup above it; the day a native autocomplete is worth
 * building, this is where it attaches.
 */
export function Datalist(_props: BoxProps) {
  return null
}

/**
 * `<style>`: nothing.
 *
 * Two screens carry an `@media print` block so the browser's print dialog produces a clean sheet.
 * There is no stylesheet here and no browser print dialog; those screens hand their content to the
 * platform's own print service instead (see `@/utils/print`).
 */
export function StyleBlock(_props: BoxProps) {
  return null
}

/** `<a href>`: a link out of the application, opened by the platform. */
export function A({ children, href, className, style, ...rest }: InlineProps & { href?: string }) {
  return (
    <Span
      className={className}
      style={style}
      onClick={href ? () => void openExternal(href) : (rest.onClick as (() => void) | undefined)}
      {...rest}
    >
      {children}
    </Span>
  )
}

async function openExternal(href: string): Promise<void> {
  const { Linking } = await import('react-native')
  await Linking.openURL(href).catch(() => undefined)
}
