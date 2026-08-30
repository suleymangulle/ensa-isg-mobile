import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, Text as RNText, View, type ViewStyle } from 'react-native'
import { submitForm, useFormSubmit } from './html'
import { useStyles } from './style'
import { useTheme } from './theme'
import { useVariantColors, type Variant } from './primitives'

export interface ButtonProps {
  children?: ReactNode
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
  /** Replaces the label with a spinner and refuses presses. */
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
  className?: string
  style?: unknown
  title?: string
  'aria-label'?: string
  'aria-pressed'?: boolean
  'aria-expanded'?: boolean
  /**
   * Kept from the web component and deliberately unused.
   *
   * `type="submit"` and `form=` bound a dialog's footer button to the form in its body through
   * HTML. There is no form element here and no implicit submission, so `Modal` calls its
   * `onSubmit` itself; the props stay on the signature only so a ported screen does not have to
   * be edited to drop them.
   */
  type?: 'button' | 'submit' | 'reset'
  form?: string
  /** Renders the button as a full-width block, as `w-100` did. */
  block?: boolean
}

const HEIGHTS = { sm: 32, md: 40, lg: 48 }
const FONT_SIZES = { sm: 13, md: 15, lg: 16 }
const PADDING = { sm: 10, md: 14, lg: 18 }

/**
 * The library's button.
 *
 * `variant="light"` is the neutral action used all over the application - a table row's edit and
 * delete, the header's menu toggles - so it is drawn as a bordered surface rather than as a flat
 * white block, which on a dark theme would be invisible.
 */
export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  loading,
  disabled,
  onClick,
  className,
  style,
  block,
  type,
  form,
  ...rest
}: ButtonProps) {
  const theme = useTheme()
  const colors = useVariantColors(variant)
  const { view, text } = useStyles(className, style)

  // HTML form submission, reimplemented: a `type="submit"` button with no handler of its own
  // submits the form it names, or the one it is inside. See `FormTag`.
  const enclosingForm = useFormSubmit()

  const press =
    onClick ??
    (type === 'submit'
      ? form
        ? () => submitForm(form)
        : (enclosingForm ?? undefined)
      : undefined)

  const isDisabled = Boolean(disabled || loading)
  const isNeutral = variant === 'light' || variant === 'secondary'

  const base: ViewStyle = {
    height: HEIGHTS[size],
    paddingHorizontal: PADDING[size],
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: isNeutral ? theme['gray-100'] : colors.bg,
    borderWidth: 1,
    borderColor: isNeutral ? theme['border-color'] : colors.border,
    opacity: isDisabled ? 0.55 : 1,
    // `inline-block`, as `.btn` is: a button is as wide as its label, not as wide as whatever
    // contains it. Without this a button alone in a column fills the width and centres its label,
    // which reads as a heading rather than as a control.
    alignSelf: block ? 'stretch' : 'flex-start',
    ...(block ? { width: '100%' } : null),
  }

  const labelColor = (text.color as string | undefined) ?? (isNeutral ? theme['gray-800'] : colors.fg)

  return (
    <Pressable
      onPress={isDisabled ? undefined : press}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={rest['aria-label'] ?? rest.title}
      accessibilityState={{ disabled: isDisabled, expanded: rest['aria-expanded'], selected: rest['aria-pressed'] }}
      style={({ pressed }) => [base, view, pressed ? { opacity: 0.75 } : null]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={labelColor} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <RNText
            numberOfLines={1}
            style={{ color: labelColor, fontSize: FONT_SIZES[size], fontWeight: '600', ...text }}
          >
            {children}
          </RNText>
        </View>
      )}
    </Pressable>
  )
}
