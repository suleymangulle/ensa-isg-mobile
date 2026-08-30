import { useMemo, useState, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text as RNText,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { Div, Span, useInheritedTextStyle, withText } from './html'
import { normalizeStyle, useStyles } from './style'
import { useTheme } from './theme'
import { formatLocale } from '@/i18n'

/**
 * The library's presentational primitives, drawn natively.
 *
 * Each keeps the props the web components take, because the ported screens pass them: `variant`
 * on a badge, `tone` and `size` on a text, `header`/`footer` slots on a card. What changes is
 * only what draws them.
 */

export type Variant =
  | 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark'
  // The quiet action that reads as a link rather than as a button.
  | 'link'

export type BadgeVariant = Variant

/** Foreground and background for a variant, in the active theme. */
export function useVariantColors(variant: Variant): { fg: string; bg: string; border: string } {
  const theme = useTheme()

  switch (variant) {
    case 'link':
      return { fg: theme.primary, bg: 'transparent', border: 'transparent' }
    case 'light':
      return { fg: theme['gray-800'], bg: theme['gray-100'], border: theme['border-color'] }
    case 'secondary':
      return { fg: theme['gray-800'], bg: theme.secondary, border: theme.secondary }
    case 'dark':
      return { fg: theme['card-bg'], bg: theme['gray-900'], border: theme['gray-900'] }
    default: {
      const solid = theme[variant] ?? theme.primary
      return { fg: '#FFFFFF', bg: solid, border: solid }
    }
  }
}

/** The pale surface a badge and an alert sit on. */
export function useSoftColors(variant: Variant): { fg: string; bg: string } {
  const theme = useTheme()

  if (variant === 'link') return { fg: theme.primary, bg: theme['primary-light'] }
  if (variant === 'light' || variant === 'secondary') {
    return { fg: theme['gray-700'], bg: theme['gray-100'] }
  }
  if (variant === 'dark') return { fg: theme['gray-900'], bg: theme['gray-200'] }

  return {
    fg: theme[`${variant}-active`] ?? theme[variant] ?? theme.primary,
    bg: theme[`${variant}-light`] ?? theme['gray-100'],
  }
}

// ---------------------------------------------------------------
// Text
// ---------------------------------------------------------------

export interface TextProps {
  children?: ReactNode
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  weight?: 'normal' | 'medium' | 'semibold' | 'bold'
  tone?: 'default' | 'muted' | 'secondary' | 'danger' | 'success' | 'warning' | 'primary'
  className?: string
  style?: unknown
  numberOfLines?: number
}

const TEXT_SIZES = { xs: 12, sm: 13, md: 15, lg: 17, xl: 20 }
const TEXT_WEIGHTS = { normal: '400', medium: '500', semibold: '600', bold: '700' } as const

export function Text({ children, size, weight, tone, className, style, numberOfLines }: TextProps) {
  const theme = useTheme()

  const toneColor =
    tone === 'muted' ? theme['gray-500']
    : tone === 'secondary' ? theme['gray-600']
    : tone === 'danger' ? theme.danger
    : tone === 'success' ? theme.success
    : tone === 'warning' ? theme['warning-active']
    : tone === 'primary' ? theme.primary
    : undefined

  return (
    <Span
      className={className}
      numberOfLines={numberOfLines}
      style={{
        ...(size ? { fontSize: TEXT_SIZES[size] } : null),
        ...(weight ? { fontWeight: TEXT_WEIGHTS[weight] } : null),
        ...(toneColor ? { color: toneColor } : null),
        ...(style as object),
      }}
    >
      {children}
    </Span>
  )
}

// ---------------------------------------------------------------
// Layout
// ---------------------------------------------------------------

export interface FlexProps {
  children?: ReactNode
  direction?: 'row' | 'column'
  /** Bootstrap's spacing step, as the web component takes it. */
  gap?: 0 | 1 | 2 | 3 | 4 | 5
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  wrap?: boolean
  grow?: boolean
  className?: string
  style?: unknown
  'aria-label'?: string
}

const GAPS = [0, 4, 8, 16, 24, 48]

const FLEX_ALIGN = {
  start: 'flex-start', center: 'center', end: 'flex-end',
  stretch: 'stretch', baseline: 'baseline',
} as const

const FLEX_JUSTIFY = {
  start: 'flex-start', center: 'center', end: 'flex-end',
  between: 'space-between', around: 'space-around', evenly: 'space-evenly',
} as const

export function Flex({
  children, direction = 'row', gap = 0, align, justify, wrap, grow, className, style, ...rest
}: FlexProps) {
  return (
    <Div
      className={className}
      aria-label={rest['aria-label']}
      style={{
        flexDirection: direction,
        gap: GAPS[gap],
        ...(align ? { alignItems: FLEX_ALIGN[align] } : null),
        ...(justify ? { justifyContent: FLEX_JUSTIFY[justify] } : null),
        ...(wrap ? { flexWrap: 'wrap' } : null),
        ...(grow ? { flexGrow: 1, flexShrink: 1, minHeight: 0 } : null),
        ...(style as object),
      }}
    >
      {children}
    </Div>
  )
}

export interface ContainerProps {
  children?: ReactNode
  fluid?: boolean
  className?: string
  style?: unknown
}

/** A phone is always narrower than the widest container, so `fluid` makes no difference here. */
export function Container({ children, className, style }: ContainerProps) {
  return (
    <Div className={className} style={{ paddingHorizontal: 16, ...(style as object) }}>
      {children}
    </Div>
  )
}

export function Divider({ className, style }: { className?: string; style?: unknown }) {
  const theme = useTheme()
  const { view } = useStyles(className, style)
  return <View style={[{ height: 1, backgroundColor: theme['border-color'] }, view]} />
}

// ---------------------------------------------------------------
// Card
// ---------------------------------------------------------------

export interface CardProps {
  children?: ReactNode
  /** Rendered as the card's heading; mutually usable with `header`. */
  title?: ReactNode
  header?: ReactNode
  footer?: ReactNode
  className?: string
  style?: unknown
  /** Removes the body padding, for a card whose body is a table. */
  flush?: boolean
}

export function Card({ children, title, header, footer, className, style, flush }: CardProps) {
  const theme = useTheme()
  const { view } = useStyles(className, style)

  return (
    <View
      style={[
        {
          backgroundColor: theme['card-bg'],
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme['border-color'],
          overflow: 'hidden',
          marginBottom: 16,
        },
        view,
      ]}
    >
      {(title || header) && (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme['border-color'],
          }}
        >
          {title ? (
            <RNText style={{ fontSize: 17, fontWeight: '600', color: theme['gray-900'] }}>
              {title}
            </RNText>
          ) : null}
          {header}
        </View>
      )}

      <View style={flush ? undefined : { padding: 16 }}>
        {withText(children, { color: theme['gray-700'] })}
      </View>

      {footer ? (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: theme['border-color'],
          }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  )
}

// ---------------------------------------------------------------
// Badge, Tag, Alert
// ---------------------------------------------------------------

export interface BadgeProps {
  children?: ReactNode
  variant?: BadgeVariant
  /** Fully rounded ends, as Bootstrap's `rounded-pill` gave it. */
  pill?: boolean
  /** Turns the badge into a removable chip. */
  onRemove?: () => void
  className?: string
  style?: unknown
}

export function Badge({ children, variant = 'primary', pill, onRemove, className, style }: BadgeProps) {
  const { fg, bg } = useSoftColors(variant)
  const { view } = useStyles(className, style)

  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          backgroundColor: bg,
          borderRadius: pill ? 999 : 6,
          paddingHorizontal: pill ? 10 : 8,
          paddingVertical: 3,
        },
        view,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <RNText style={{ color: fg, fontSize: 12, fontWeight: '600' }}>{children}</RNText>
        {onRemove ? (
          <Pressable onPress={onRemove} hitSlop={8} accessibilityRole="button">
            <RNText style={{ color: fg, fontSize: 14 }}>x</RNText>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

export const Tag = Badge

export interface AlertProps {
  children?: ReactNode
  variant?: Variant
  className?: string
  style?: unknown
  onClose?: () => void
}

export function Alert({ children, variant = 'primary', className, style }: AlertProps) {
  const { fg, bg } = useSoftColors(variant)
  const { view } = useStyles(className, style)

  return (
    <View
      style={[
        { backgroundColor: bg, borderRadius: 10, padding: 12, marginBottom: 12 },
        view,
      ]}
    >
      {withText(children, { color: fg, fontSize: 14 })}
    </View>
  )
}

// ---------------------------------------------------------------
// Loading states
// ---------------------------------------------------------------

export function Spinner({
  label,
  size = 'small',
  className,
}: {
  label?: string
  size?: 'small' | 'large' | 'sm' | 'lg'
  className?: string
}) {
  const theme = useTheme()
  const { view } = useStyles(className, undefined)

  return (
    <View style={[{ alignItems: 'center', gap: 8 }, view]} accessibilityRole="progressbar">
      <ActivityIndicator size={size === 'sm' ? 'small' : size === 'lg' ? 'large' : size} color={theme.primary} />
      {label ? <RNText style={{ color: theme['gray-500'], fontSize: 13 }}>{label}</RNText> : null}
    </View>
  )
}

export interface SkeletonProps {
  width?: string | number
  height?: string | number
  className?: string
  style?: unknown
}

export function Skeleton({ width = '100%', height = 14, className, style }: SkeletonProps) {
  const theme = useTheme()
  const { view } = useStyles(className, style)

  return (
    <View
      style={[
        {
          backgroundColor: theme['gray-200'],
          borderRadius: 4,
          ...normalizeStyle({ width, height }),
        },
        view,
      ]}
    />
  )
}

// ---------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------

const AVATAR_SIZES = { sm: 30, md: 38, lg: 48 }

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const theme = useTheme()
  const { view } = useStyles(className, undefined)
  const diameter = AVATAR_SIZES[size]

  const label = useMemo(
    () =>
      name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toLocaleUpperCase(formatLocale()) ?? '')
        .join(''),
    [name],
  )

  return (
    <View
      style={[
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          backgroundColor: theme['primary-light'],
          alignItems: 'center',
          justifyContent: 'center',
        },
        view,
      ]}
      accessibilityLabel={name}
    >
      <RNText style={{ color: theme.primary, fontWeight: '700', fontSize: diameter * 0.38 }}>
        {label}
      </RNText>
    </View>
  )
}

// ---------------------------------------------------------------
// ProgressBar, Statistic
// ---------------------------------------------------------------

export function ProgressBar({
  value,
  variant = 'primary',
  className,
}: {
  value: number
  variant?: Variant
  className?: string
}) {
  const theme = useTheme()
  const { bg } = useVariantColors(variant)
  const { view } = useStyles(className, undefined)
  const percent = Math.max(0, Math.min(100, value))

  return (
    <View
      style={[{ height: 6, borderRadius: 3, backgroundColor: theme['gray-200'], overflow: 'hidden' }, view]}
      accessibilityRole="progressbar"
      accessibilityValue={{ now: percent, min: 0, max: 100 }}
    >
      <View style={{ width: `${percent}%`, height: '100%', backgroundColor: bg }} />
    </View>
  )
}

export function Statistic({
  label,
  value,
  loading,
  className,
  hint,
}: {
  label: string
  value: ReactNode
  loading?: boolean
  className?: string
  hint?: string
}) {
  const theme = useTheme()
  const { view } = useStyles(className, undefined)

  return (
    <View style={view}>
      <RNText style={{ color: theme['gray-500'], fontSize: 13 }} numberOfLines={2}>
        {label}
      </RNText>
      {loading ? (
        <Skeleton width={64} height={22} style={{ marginTop: 6 }} />
      ) : (
        <RNText style={{ color: theme['gray-900'], fontSize: 22, fontWeight: '700' }}>
          {value}
        </RNText>
      )}
      {hint ? (
        <RNText style={{ color: theme['gray-500'], fontSize: 12 }}>{hint}</RNText>
      ) : null}
    </View>
  )
}

// ---------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------

/**
 * A hover affordance, on a device that has no hover.
 *
 * The web component explains an icon or a truncated name when the pointer rests on it. There is
 * no pointer here, so the same text is put behind a long press - the platform's own convention
 * for "tell me more about this" - and is also attached as the accessibility label, which is the
 * half a screen reader was always going to use anyway.
 */
export function Tooltip({
  children,
  content,
  className,
  wrapperClassName,
}: {
  children: ReactNode
  content: ReactNode
  placement?: 'top' | 'bottom' | 'start' | 'end'
  className?: string
  wrapperClassName?: string
}) {
  const theme = useTheme()
  const [isOpen, setOpen] = useState(false)
  const { view } = useStyles(wrapperClassName ?? className, undefined)

  return (
    <View style={view}>
      <Pressable
        onLongPress={() => setOpen(true)}
        onPressOut={() => setOpen(false)}
        accessibilityLabel={typeof content === 'string' ? content : undefined}
      >
        {children}
      </Pressable>

      {isOpen ? (
        <View
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            marginBottom: 4,
            backgroundColor: theme['gray-900'],
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 4,
            maxWidth: 240,
            zIndex: 20,
          }}
        >
          {withText(content, { color: theme['card-bg'], fontSize: 12 })}
        </View>
      ) : null}
    </View>
  )
}

// ---------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------

export interface TabItem {
  key: string
  label: ReactNode
  disabled?: boolean
  /** A count or a state shown beside the label. */
  badge?: ReactNode
  /**
   * The panel the tab owns.
   *
   * Accepted for the screens that declare their tabs as one array of key, label and body. `Tabs`
   * renders only the strip - the caller still decides where the active panel goes, exactly as in
   * the web component.
   */
  content?: ReactNode
}

export function Tabs({
  items,
  activeKey,
  onChange,
  variant = 'default',
  className,
}: {
  items: TabItem[]
  activeKey: string
  onChange: (key: string) => void
  variant?: 'default' | 'underline' | 'pills'
  className?: string
}) {
  const theme = useTheme()
  const { view } = useStyles(className, undefined)

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={view}
      contentContainerStyle={{ flexDirection: 'row', gap: 4, paddingVertical: 2 }}
    >
      {items.map((item) => {
        const isActive = item.key === activeKey

        const pillStyle: ViewStyle = {
          backgroundColor: isActive ? theme.primary : 'transparent',
          borderRadius: 8,
        }
        const underlineStyle: ViewStyle = {
          borderBottomWidth: 2,
          borderBottomColor: isActive ? theme.primary : 'transparent',
        }

        const labelStyle: TextStyle = {
          color: isActive
            ? variant === 'pills' ? '#FFFFFF' : theme.primary
            : theme['gray-600'],
          fontWeight: isActive ? '600' : '500',
          fontSize: 14,
        }

        return (
          <Pressable
            key={item.key}
            disabled={item.disabled}
            onPress={() => onChange(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive, disabled: item.disabled }}
            style={[
              { paddingHorizontal: 12, paddingVertical: 10, opacity: item.disabled ? 0.5 : 1 },
              variant === 'pills' ? pillStyle : underlineStyle,
            ]}
          >
            <RNText style={labelStyle}>{item.label}</RNText>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

/** The text style a container passes down. Re-exported so screens can read it directly. */
export { useInheritedTextStyle }
