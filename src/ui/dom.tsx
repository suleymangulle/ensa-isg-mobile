import { Children, isValidElement, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, Pressable, ScrollView, Text as RNText, TextInput, View } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Div } from './html'
import { useStyles } from './style'
import { useTheme } from './theme'
import { CheckBox, useControlStyle } from './inputs'
import { formatDate } from '@/utils/format'

/**
 * The raw form controls, with the DOM's own interface.
 *
 * A handful of screens reach past the component library for a plain `<input>`, `<select>` or
 * `<textarea>`: a compact toolbar filter that must not carry a full field's chrome, a control
 * inside a table cell, the sign-in fields. They are written against the DOM - `value` and
 * `onChange(event)` reading `event.target.value` - and there are enough of them, in enough
 * screens, that changing every call site would have meant rewriting the screens rather than
 * porting them.
 *
 * So the DOM's interface is what these components take. `onChange` is handed an object with a
 * `target` carrying `value`, `checked` and `files`, which is exactly the part of the event those
 * handlers read. Nothing else about a DOM event is provided, because nothing else is used.
 *
 * `type="file"` is the one place where the interface is kept but the mechanism cannot be: a phone
 * has no file input, so the control opens the system document picker and reports the chosen file
 * in the same `event.target.files` shape.
 */

/** The subset of `HTMLInputElement` the ported handlers read. */
export interface DomChangeEvent<T = string> {
  target: { value: T; checked: boolean; files?: PickedFile[] }
  currentTarget: { value: T }
  preventDefault: () => void
  stopPropagation: () => void
}

/** What the document picker returns, shaped like the `File` the web handlers expect. */
export interface PickedFile {
  name: string
  type: string
  size: number
  /** `file://` location on the device. The web `File` has no equivalent; nothing else needs one. */
  uri: string
}

function domEvent<T>(value: T, checked = false, files?: PickedFile[]): DomChangeEvent<T> {
  return {
    target: { value, checked, files },
    currentTarget: { value },
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  }
}

export interface NativeInputProps {
  id?: string
  name?: string
  type?: string
  value?: string | number
  checked?: boolean
  defaultValue?: string
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  maxLength?: number
  min?: string | number
  max?: string | number
  step?: string | number
  className?: string
  style?: unknown
  autoComplete?: string
  autoFocus?: boolean
  title?: string
  'aria-label'?: string
  onChange?: (event: DomChangeEvent) => void
  onBlur?: () => void
  onClick?: () => void
  accept?: string
  multiple?: boolean
}

const KEYBOARDS: Record<string, 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'url' | 'decimal-pad'> = {
  email: 'email-address',
  tel: 'phone-pad',
  number: 'decimal-pad',
  url: 'url',
}

export function NativeInput(props: NativeInputProps) {
  const { type = 'text' } = props

  if (type === 'checkbox' || type === 'radio') return <CheckboxControl {...props} />
  if (type === 'file') return <FileControl {...props} />
  if (type === 'date' || type === 'time' || type === 'datetime-local') return <DateControl {...props} />
  if (type === 'color') return <ColorControl {...props} />

  return <TextControl {...props} />
}

function TextControl({
  type = 'text', value, placeholder, disabled, readOnly, maxLength, className, style,
  onChange, onBlur, autoFocus, ...rest
}: NativeInputProps) {
  const theme = useTheme()
  const control = useControlStyle({ disabled })
  const { view } = useStyles(className, style)

  return (
    <View style={[control, view]}>
      <TextInput
        style={{ color: theme['gray-800'], fontSize: 15, paddingVertical: Platform.OS === 'ios' ? 12 : 8 }}
        value={value === undefined || value === null ? '' : String(value)}
        onChangeText={(next) => onChange?.(domEvent(next))}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={theme['gray-500']}
        editable={!disabled && !readOnly}
        maxLength={maxLength}
        secureTextEntry={type === 'password'}
        keyboardType={KEYBOARDS[type] ?? 'default'}
        autoCapitalize={type === 'email' || type === 'password' ? 'none' : 'sentences'}
        autoCorrect={type !== 'email' && type !== 'password'}
        autoFocus={autoFocus}
        accessibilityLabel={rest['aria-label'] ?? rest.title}
      />
    </View>
  )
}

function CheckboxControl({ checked, disabled, onChange, className, style, ...rest }: NativeInputProps) {
  return (
    <CheckBox
      checked={Boolean(checked)}
      disabled={disabled}
      className={className}
      style={style}
      label={rest['aria-label']}
      onChange={(next) => onChange?.(domEvent(next ? 'on' : '', next))}
    />
  )
}

/** `yyyy-MM-dd`, the value an `<input type="date">` carries and the API exchanges. */
function toIsoDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function DateControl({ value, disabled, onChange, className, style, type, placeholder, ...rest }: NativeInputProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const control = useControlStyle({ disabled })
  const { view } = useStyles(className, style)
  const [isOpen, setOpen] = useState(false)

  const text = value ? String(value) : ''
  const asDate = useMemo(() => {
    const parsed = text ? new Date(text) : new Date()
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed
  }, [text])

  return (
    <>
      <Pressable
        style={[control, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, view]}
        onPress={() => !disabled && setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={rest['aria-label'] ?? rest.title}
      >
        <RNText style={{ color: text ? theme['gray-800'] : theme['gray-500'], fontSize: 15 }}>
          {text ? (formatDate(text) ?? '') : (placeholder ?? t('ui.datePlaceholder'))}
        </RNText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {text ? (
            <Pressable onPress={() => onChange?.(domEvent(''))} hitSlop={8} accessibilityRole="button">
              <RNText style={{ color: theme['gray-500'], fontSize: 16 }}>x</RNText>
            </Pressable>
          ) : null}
          <RNText style={{ color: theme['gray-500'] }}>▤</RNText>
        </View>
      </Pressable>

      {isOpen ? (
        <DateTimePicker
          value={asDate}
          mode={type === 'time' ? 'time' : 'date'}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onValueChange={(_event, selected) => {
            setOpen(false)
            onChange?.(domEvent(type === 'datetime-local' ? selected.toISOString() : toIsoDate(selected)))
          }}
          onDismiss={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}

/**
 * `<input type="color">`.
 *
 * The browser opens the operating system's colour picker. There is no such thing to open here and
 * no colour picker worth a native dependency for one optional field, so the value is typed as the
 * hex it already is, with the colour itself shown beside it.
 */
function ColorControl({ value, disabled, onChange, className, style, ...rest }: NativeInputProps) {
  const theme = useTheme()
  const control = useControlStyle({ disabled })
  const { view } = useStyles(className, style)
  const text = value ? String(value) : ''

  return (
    <View style={[control, { flexDirection: 'row', alignItems: 'center', gap: 10 }, view]}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          backgroundColor: /^#[0-9a-f]{3,8}$/i.test(text) ? text : theme['gray-300'],
          borderWidth: 1,
          borderColor: theme['border-color'],
        }}
      />
      <TextInput
        style={{ flex: 1, color: theme['gray-800'], fontSize: 15 }}
        value={text}
        onChangeText={(next) => onChange?.(domEvent(next))}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="#3E97FF"
        placeholderTextColor={theme['gray-500']}
        editable={!disabled}
        accessibilityLabel={rest['aria-label'] ?? rest.title}
      />
    </View>
  )
}

/** `<input type="file">`: the system document picker, reported in the same event shape. */
function FileControl({ disabled, onChange, className, style, accept, multiple, ...rest }: NativeInputProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const control = useControlStyle({ disabled })
  const { view } = useStyles(className, style)
  const [chosen, setChosen] = useState<PickedFile[]>([])

  async function pick() {
    const result = await DocumentPicker.getDocumentAsync({
      type: accept ? accept.split(',').map((item) => item.trim()) : '*/*',
      multiple: Boolean(multiple),
      copyToCacheDirectory: true,
    })
    if (result.canceled) return

    const files: PickedFile[] = result.assets.map((asset) => ({
      name: asset.name,
      type: asset.mimeType ?? 'application/octet-stream',
      size: asset.size ?? 0,
      uri: asset.uri,
    }))

    setChosen(files)
    onChange?.(domEvent(files[0]?.name ?? '', false, files))
  }

  return (
    <Pressable
      style={[control, { flexDirection: 'row', alignItems: 'center', gap: 10 }, view]}
      onPress={() => !disabled && void pick()}
      accessibilityRole="button"
      accessibilityLabel={rest['aria-label'] ?? rest.title}
    >
      <RNText style={{ color: theme.primary, fontSize: 15, fontWeight: '600' }}>📎</RNText>
      <RNText numberOfLines={1} style={{ flex: 1, color: chosen.length ? theme['gray-800'] : theme['gray-500'], fontSize: 15 }}>
        {chosen.map((file) => file.name).join(', ') || t('ui.chooseFile')}
      </RNText>
    </Pressable>
  )
}

// ---------------------------------------------------------------
// select / option
// ---------------------------------------------------------------

export interface OptionProps {
  value?: string | number
  children?: ReactNode
  disabled?: boolean
}

/** Declarative only: `NativeSelect` reads these props off its children. */
export function Option(_props: OptionProps): null {
  return null
}

export interface NativeSelectProps {
  id?: string
  name?: string
  value?: string | number
  disabled?: boolean
  required?: boolean
  /**
   * `<select size="6">` is a listbox that is always open, not a drop-down. Two screens use one -
   * the lookup administration's category list, a penalty survey's line picker - and collapsing it
   * would hide the choices the screen is built around, so it stays open here too.
   */
  size?: number
  className?: string
  style?: unknown
  title?: string
  'aria-label'?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  onChange?: (event: DomChangeEvent) => void
  onBlur?: () => void
  children?: ReactNode
}

/** `<select>` with `<option>` children, opened as the same sheet the library's `Select` uses. */
export function NativeSelect({ value, disabled, size, className, style, onChange, children, ...rest }: NativeSelectProps) {
  const theme = useTheme()
  const control = useControlStyle({ disabled })
  const { view } = useStyles(className, style)
  const [isOpen, setOpen] = useState(false)

  const isListbox = (size ?? 1) > 1

  const options = useMemo(() => {
    const out: { value: string; label: string; disabled?: boolean }[] = []

    Children.forEach(children, (child) => {
      if (!isValidElement(child)) return
      const props = child.props as OptionProps
      out.push({
        value: props.value === undefined ? '' : String(props.value),
        label: Children.toArray(props.children).join(''),
        disabled: props.disabled,
      })
    })
    return out
  }, [children])

  const current = String(value ?? '')
  const selected = options.find((option) => option.value === current)

  if (isListbox) {
    return (
      <Div
        className={className}
        style={{
          borderWidth: 1,
          borderColor: theme['border-color'],
          borderRadius: 8,
          backgroundColor: theme['input-bg'],
          maxHeight: 40 * (size ?? 6),
          overflow: 'hidden',
          ...(style as object),
        }}
      >
        <ScrollView nestedScrollEnabled>
          {options.map((option) => (
            <Pressable
              key={option.value}
              disabled={option.disabled || disabled}
              onPress={() => onChange?.(domEvent(option.value))}
              accessibilityRole="radio"
              accessibilityState={{ selected: option.value === current }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 11,
                backgroundColor: option.value === current ? theme['primary-light'] : 'transparent',
              }}
            >
              <RNText
                numberOfLines={1}
                style={{
                  color: option.value === current ? theme.primary : theme['gray-800'],
                  fontWeight: option.value === current ? '600' : '400',
                  fontSize: 15,
                }}
              >
                {option.label}
              </RNText>
            </Pressable>
          ))}
        </ScrollView>
      </Div>
    )
  }

  return (
    <>
      <Pressable
        style={[control, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, view]}
        onPress={() => !disabled && setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={rest['aria-label'] ?? rest.title}
      >
        {/* `flexShrink`, not `flex: 1`. A basis of zero inside a row that sizes itself to its
            content collapses the label to nothing, which is how a 190px picker rendered as an
            empty box with a caret in it. */}
        <RNText numberOfLines={1} style={{ flexShrink: 1, minWidth: 0, color: theme['gray-800'], fontSize: 15 }}>
          {selected?.label ?? ''}
        </RNText>
        <RNText style={{ color: theme['gray-500'], fontSize: 12 }}>▼</RNText>
      </Pressable>

      {isOpen ? (
        <Div
          style={{
            marginTop: 4,
            borderWidth: 1,
            borderColor: theme['border-color'],
            borderRadius: 8,
            backgroundColor: theme['card-bg'],
            overflow: 'hidden',
          }}
        >
          {options.map((option) => (
            <Pressable
              key={option.value}
              disabled={option.disabled}
              onPress={() => {
                setOpen(false)
                onChange?.(domEvent(option.value))
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 12,
                backgroundColor: option.value === current ? theme['primary-light'] : 'transparent',
              }}
            >
              <RNText style={{ color: theme['gray-800'], fontSize: 15 }}>{option.label}</RNText>
            </Pressable>
          ))}
        </Div>
      ) : null}
    </>
  )
}

// ---------------------------------------------------------------
// textarea
// ---------------------------------------------------------------

export interface NativeTextAreaProps extends Omit<NativeInputProps, 'type'> {
  rows?: number
}

export function NativeTextArea({
  value, rows = 3, placeholder, disabled, maxLength, className, style, onChange, ...rest
}: NativeTextAreaProps) {
  const theme = useTheme()
  const control = useControlStyle({ disabled, height: 20 * rows + 24 })
  const { view } = useStyles(className, style)

  return (
    <View style={[control, { paddingVertical: 8 }, view]}>
      <TextInput
        style={{ color: theme['gray-800'], fontSize: 15, minHeight: 20 * rows, textAlignVertical: 'top' }}
        value={value === undefined || value === null ? '' : String(value)}
        onChangeText={(next) => onChange?.(domEvent(next))}
        placeholder={placeholder}
        placeholderTextColor={theme['gray-500']}
        editable={!disabled}
        maxLength={maxLength}
        multiline
        accessibilityLabel={rest['aria-label'] ?? rest.title}
      />
    </View>
  )
}

// ---------------------------------------------------------------
// button
// ---------------------------------------------------------------

export interface NativeButtonProps {
  children?: ReactNode
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  className?: string
  style?: unknown
  title?: string
  id?: string
  'aria-label'?: string
  'aria-expanded'?: boolean
  'aria-haspopup'?: string | boolean
  'aria-controls'?: string
  onClick?: () => void
  onKeyDown?: () => void
}

/**
 * A bare `<button>`.
 *
 * Not the library's `Button`: the screens that reach for this one want the element without the
 * chrome - a pager control, a chevron, a row that happens to be pressable - and give it their own
 * classes. So it renders exactly what it is handed, with the press behaviour and the accessibility
 * role a button owes.
 */
export function NativeButton({ children, disabled, className, style, onClick, ...rest }: NativeButtonProps) {
  const { view, text } = useStyles(className, style)

  return (
    <Pressable
      onPress={disabled ? undefined : onClick}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={rest['aria-label'] ?? rest.title}
      accessibilityState={{ disabled, expanded: rest['aria-expanded'] }}
      style={({ pressed }) => [{ opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }, view]}
    >
      {typeof children === 'string' || typeof children === 'number' ? (
        <RNText style={text}>{children}</RNText>
      ) : (
        children
      )}
    </Pressable>
  )
}
