import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  Switch as RNSwitch,
  Text as RNText,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useStyles } from './style'
import { useTheme } from './theme'
import { Badge } from './primitives'
import { formatDate } from '@/utils/format'
import { formatLocale } from '@/i18n'

/**
 * Form controls.
 *
 * The web components are wrappers around `<input>`, `<select>` and `<textarea>` that add the
 * field chrome; here the chrome is the same and the control underneath is native. Three of them
 * are not a thin wrapper at all and could not be:
 *
 * - **`Select`** has no native equivalent that behaves like a `<select>` on both platforms, and
 *   several of this application's pickers are hundreds of rows long (companies, employees). So it
 *   opens a sheet with a search box rather than a wheel.
 * - **`Input type="date"`** becomes the platform's date picker. The value stays the ISO string
 *   the API exchanges, so nothing above this file changes.
 * - **`MultiSelect`** shows its selection as removable chips, because a phone has no room for a
 *   multi-row list box.
 */

// ---------------------------------------------------------------
// Field chrome
// ---------------------------------------------------------------

export interface FormFieldProps {
  id?: string
  label?: ReactNode
  required?: boolean
  error?: string
  helpText?: ReactNode
  className?: string
  style?: unknown
  children: ReactNode
}

export function FormField({ label, required, error, helpText, className, style, children }: FormFieldProps) {
  const theme = useTheme()
  const { view } = useStyles(className, style)

  return (
    <View style={[{ marginBottom: 14 }, view]}>
      {label ? (
        <RNText style={{ color: theme['gray-700'], fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
          {label}
          {required ? <RNText style={{ color: theme.danger }}> *</RNText> : null}
        </RNText>
      ) : null}

      {children}

      {error ? (
        <RNText style={{ color: theme.danger, fontSize: 12, marginTop: 4 }}>{error}</RNText>
      ) : helpText ? (
        <RNText style={{ color: theme['gray-500'], fontSize: 12, marginTop: 4 }}>{helpText}</RNText>
      ) : null}
    </View>
  )
}

/** The bordered surface every control sits on. */
export function useControlStyle(options: { error?: string; disabled?: boolean; height?: number } = {}): ViewStyle {
  const theme = useTheme()

  return {
    minHeight: options.height ?? 44,
    borderWidth: 1,
    borderColor: options.error ? theme.danger : theme['border-color'],
    borderRadius: 8,
    backgroundColor: options.disabled ? theme['gray-100'] : theme['input-bg'],
    paddingHorizontal: 12,
    justifyContent: 'center',
  }
}

function useControlTextStyle(): TextStyle {
  const theme = useTheme()
  return { color: theme['gray-800'], fontSize: 15, paddingVertical: Platform.OS === 'ios' ? 12 : 8 }
}

// ---------------------------------------------------------------
// Input
// ---------------------------------------------------------------

export type InputType =
  | 'text' | 'search' | 'password' | 'email' | 'tel' | 'url' | 'number' | 'date' | 'time' | 'datetime-local'

export interface InputProps {
  id?: string
  label?: ReactNode
  value?: string | number | null
  onChange?: (value: string) => void
  type?: InputType
  placeholder?: string
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  maxLength?: number
  error?: string
  helpText?: ReactNode
  className?: string
  style?: unknown
  endAdornment?: ReactNode
  /** Web escape hatch; only `aria-label` is meaningful here. */
  inputProps?: Record<string, unknown>
  onClick?: () => void
  variant?: string
}

const KEYBOARDS: Partial<Record<InputType, 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'url' | 'decimal-pad'>> = {
  email: 'email-address',
  tel: 'phone-pad',
  url: 'url',
  number: 'decimal-pad',
}

export function Input(props: InputProps) {
  if (props.type === 'date' || props.type === 'datetime-local' || props.type === 'time') {
    return <DateInput {...props} />
  }
  return <TextControl {...props} />
}

function TextControl({
  label, value, onChange, type = 'text', placeholder, required, disabled, readOnly,
  maxLength, error, helpText, className, style, endAdornment, inputProps,
}: InputProps) {
  const theme = useTheme()
  const control = useControlStyle({ error, disabled })
  const textStyle = useControlTextStyle()

  return (
    <FormField label={label} required={required} error={error} helpText={helpText} className={className} style={style}>
      <View style={[control, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
        <TextInput
          style={[textStyle, { flex: 1 }]}
          value={value === null || value === undefined ? '' : String(value)}
          onChangeText={(next) => onChange?.(next)}
          placeholder={placeholder}
          placeholderTextColor={theme['gray-500']}
          editable={!disabled && !readOnly && Boolean(onChange)}
          maxLength={maxLength}
          secureTextEntry={type === 'password'}
          keyboardType={KEYBOARDS[type] ?? 'default'}
          autoCapitalize={type === 'email' || type === 'url' ? 'none' : 'sentences'}
          autoCorrect={type !== 'email' && type !== 'url'}
          accessibilityLabel={(inputProps?.['aria-label'] as string) ?? undefined}
          returnKeyType={type === 'search' ? 'search' : 'done'}
        />
        {endAdornment}
      </View>
    </FormField>
  )
}

/** `YYYY-MM-DD`, which is what the API exchanges and what every caller stores. */
function toIsoDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function DateInput({
  label, value, onChange, required, disabled, error, helpText, className, style, placeholder, type,
}: InputProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const control = useControlStyle({ error, disabled })
  const [isOpen, setOpen] = useState(false)

  const asDate = useMemo(() => {
    if (!value) return new Date()
    const parsed = new Date(String(value))
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed
  }, [value])

  const shown = value ? (formatDate(String(value)) ?? '') : ''

  return (
    <FormField label={label} required={required} error={error} helpText={helpText} className={className} style={style}>
      <Pressable
        style={[control, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
        onPress={() => !disabled && setOpen(true)}
        accessibilityRole="button"
      >
        <RNText style={{ color: shown ? theme['gray-800'] : theme['gray-500'], fontSize: 15 }}>
          {shown || placeholder || t('ui.datePlaceholder')}
        </RNText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {value ? (
            <Pressable onPress={() => onChange?.('')} accessibilityRole="button" hitSlop={8}>
              <RNText style={{ color: theme['gray-500'], fontSize: 16 }}>×</RNText>
            </Pressable>
          ) : null}
          <RNText style={{ color: theme['gray-500'], fontSize: 15 }}>▤</RNText>
        </View>
      </Pressable>

      {isOpen ? (
        <DateTimePicker
          value={asDate}
          mode={type === 'time' ? 'time' : 'date'}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(_event, selected) => {
            setOpen(Platform.OS === 'ios' ? false : false)
            if (selected) onChange?.(type === 'datetime-local' ? selected.toISOString() : toIsoDate(selected))
          }}
        />
      ) : null}
    </FormField>
  )
}

// ---------------------------------------------------------------
// TextArea
// ---------------------------------------------------------------

export interface TextAreaProps extends Omit<InputProps, 'type' | 'endAdornment'> {
  rows?: number
}

export function TextArea({
  label, value, onChange, rows = 3, placeholder, required, disabled,
  maxLength, error, helpText, className, style, inputProps,
}: TextAreaProps) {
  const theme = useTheme()
  const control = useControlStyle({ error, disabled, height: 20 * rows + 24 })

  return (
    <FormField label={label} required={required} error={error} helpText={helpText} className={className} style={style}>
      <View style={[control, { paddingVertical: 8 }]}>
        <TextInput
          style={{ color: theme['gray-800'], fontSize: 15, minHeight: 20 * rows, textAlignVertical: 'top' }}
          value={value === null || value === undefined ? '' : String(value)}
          onChangeText={(next) => onChange?.(next)}
          placeholder={placeholder}
          placeholderTextColor={theme['gray-500']}
          editable={!disabled && Boolean(onChange)}
          maxLength={maxLength}
          multiline
          numberOfLines={rows}
          accessibilityLabel={(inputProps?.['aria-label'] as string) ?? undefined}
        />
      </View>
    </FormField>
  )
}

// ---------------------------------------------------------------
// NumberInput
// ---------------------------------------------------------------

export interface NumberInputProps {
  id?: string
  label?: ReactNode
  value?: number | null
  onChange?: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  helpText?: ReactNode
  className?: string
  style?: unknown
}

export function NumberInput({
  label, value, onChange, min, max, step, placeholder, required, disabled,
  error, helpText, className, style,
}: NumberInputProps) {
  const theme = useTheme()
  const control = useControlStyle({ error, disabled })

  // The typed text is held separately from the number, so a half-written value ("-", "1.")
  // survives the keystroke that produced it instead of being parsed away.
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? (value === null || value === undefined ? '' : String(value))

  const commit = (text: string) => {
    setDraft(text)
    const normalised = text.replace(',', '.')
    if (normalised === '' || normalised === '-') {
      onChange?.(null)
      return
    }
    const parsed = Number(normalised)
    if (Number.isFinite(parsed)) onChange?.(clamp(parsed, min, max))
  }

  return (
    <FormField label={label} required={required} error={error} helpText={helpText} className={className} style={style}>
      <View style={[control, { flexDirection: 'row', alignItems: 'center' }]}>
        <TextInput
          style={{ flex: 1, color: theme['gray-800'], fontSize: 15, paddingVertical: Platform.OS === 'ios' ? 12 : 8 }}
          value={shown}
          onChangeText={commit}
          onBlur={() => setDraft(null)}
          placeholder={placeholder}
          placeholderTextColor={theme['gray-500']}
          editable={!disabled}
          keyboardType={step && step < 1 ? 'decimal-pad' : 'numeric'}
        />
      </View>
    </FormField>
  )
}

function clamp(value: number, min?: number, max?: number): number {
  if (min !== undefined && value < min) return min
  if (max !== undefined && value > max) return max
  return value
}

// ---------------------------------------------------------------
// Select
// ---------------------------------------------------------------

export interface SelectOption<T = string | number> {
  value: T
  label: string
  disabled?: boolean
}

export interface SelectProps<T = string | number> {
  id?: string
  label?: ReactNode
  options: SelectOption<T>[]
  value?: T | null
  onChange?: (value: T | null) => void
  placeholder?: string
  /** Drawn as a skeleton while the options are still being fetched. */
  loading?: boolean
  required?: boolean
  disabled?: boolean
  error?: string
  helpText?: ReactNode
  className?: string
  style?: unknown
  /** Shows the search box. Defaults to on above ten options, which is where scanning stops working. */
  searchable?: boolean
}

export function Select<T extends string | number = string | number>({
  label, options, value, onChange, placeholder, required, disabled, loading,
  error, helpText, className, style, searchable,
}: SelectProps<T>) {
  const theme = useTheme()
  const control = useControlStyle({ error, disabled })
  const [isOpen, setOpen] = useState(false)

  const selected = options.find((option) => option.value === value) ?? null

  return (
    <FormField label={label} required={required} error={error} helpText={helpText} className={className} style={style}>
      <Pressable
        style={[control, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }]}
        onPress={() => !disabled && !loading && setOpen(true)}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading }}
      >
        <RNText
          numberOfLines={1}
          style={{ flex: 1, color: selected ? theme['gray-800'] : theme['gray-500'], fontSize: 15 }}
        >
          {loading ? '…' : (selected?.label ?? placeholder ?? '')}
        </RNText>
        <RNText style={{ color: theme['gray-500'], fontSize: 12 }}>▼</RNText>
      </Pressable>

      <OptionSheet
        title={typeof label === 'string' ? label : (placeholder ?? '')}
        isOpen={isOpen}
        onClose={() => setOpen(false)}
        options={options}
        searchable={searchable ?? options.length > 10}
        selected={value === null || value === undefined ? [] : [value]}
        onPick={(picked) => {
          onChange?.(picked === value ? null : picked)
          setOpen(false)
        }}
        clearable={!required}
        onClear={() => {
          onChange?.(null)
          setOpen(false)
        }}
      />
    </FormField>
  )
}

// ---------------------------------------------------------------
// MultiSelect
// ---------------------------------------------------------------

export interface MultiSelectProps<T = string | number> {
  id?: string
  label?: ReactNode
  options: SelectOption<T>[]
  /** Named `values` rather than `value`, as the web component named it. */
  values: T[]
  onChange: (values: T[]) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  helpText?: ReactNode
  className?: string
  style?: unknown
}

export function MultiSelect<T extends string | number = string | number>({
  label, options, values, onChange, placeholder, required, disabled,
  error, helpText, className, style,
}: MultiSelectProps<T>) {
  const theme = useTheme()
  const control = useControlStyle({ error, disabled, height: 44 })
  const [isOpen, setOpen] = useState(false)

  const chosen = options.filter((option) => values.includes(option.value))

  return (
    <FormField label={label} required={required} error={error} helpText={helpText} className={className} style={style}>
      <Pressable
        style={[control, { paddingVertical: 8 }]}
        onPress={() => !disabled && setOpen(true)}
        accessibilityRole="button"
      >
        {chosen.length === 0 ? (
          <RNText style={{ color: theme['gray-500'], fontSize: 15 }}>{placeholder ?? ''}</RNText>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {chosen.map((option) => (
              <Badge key={String(option.value)} variant="light">
                {option.label}
              </Badge>
            ))}
          </View>
        )}
      </Pressable>

      <OptionSheet
        title={typeof label === 'string' ? label : (placeholder ?? '')}
        isOpen={isOpen}
        onClose={() => setOpen(false)}
        options={options}
        searchable={options.length > 10}
        selected={values}
        multiple
        onPick={(picked) =>
          onChange(values.includes(picked) ? values.filter((item) => item !== picked) : [...values, picked])
        }
        clearable={values.length > 0}
        onClear={() => onChange([])}
      />
    </FormField>
  )
}

// ---------------------------------------------------------------
// The sheet both pickers open
// ---------------------------------------------------------------

interface OptionSheetProps<T> {
  title: string
  isOpen: boolean
  onClose: () => void
  options: SelectOption<T>[]
  selected: T[]
  onPick: (value: T) => void
  searchable?: boolean
  multiple?: boolean
  clearable?: boolean
  onClear?: () => void
}

function OptionSheet<T extends string | number>({
  title, isOpen, onClose, options, selected, onPick, searchable, multiple, clearable, onClear,
}: OptionSheetProps<T>) {
  const { t } = useTranslation()
  const theme = useTheme()
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    if (!query.trim()) return options
    const needle = query.toLocaleLowerCase(formatLocale())
    return options.filter((option) => option.label.toLocaleLowerCase(formatLocale()).includes(needle))
  }, [options, query])

  return (
    <RNModal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={onClose} />

      <View
        style={{
          maxHeight: '75%',
          backgroundColor: theme['card-bg'],
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          paddingBottom: 24,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme['border-color'],
          }}
        >
          <RNText numberOfLines={1} style={{ flex: 1, color: theme['gray-900'], fontSize: 16, fontWeight: '600' }}>
            {title}
          </RNText>
          {clearable && onClear ? (
            <Pressable onPress={onClear} hitSlop={8}>
              <RNText style={{ color: theme.danger, fontSize: 14 }}>{t('ui.clear')}</RNText>
            </Pressable>
          ) : null}
        </View>

        {searchable ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: theme['border-color'],
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: Platform.OS === 'ios' ? 10 : 6,
                color: theme['gray-800'],
                backgroundColor: theme['input-bg'],
              }}
              value={query}
              onChangeText={setQuery}
              placeholder={t('ui.search')}
              placeholderTextColor={theme['gray-500']}
              autoFocus
            />
          </View>
        ) : null}

        <ScrollView keyboardShouldPersistTaps="handled" style={{ paddingHorizontal: 8, paddingTop: 8 }}>
          {visible.map((option) => {
            const isPicked = selected.includes(option.value)
            return (
              <Pressable
                key={String(option.value)}
                disabled={option.disabled}
                onPress={() => {
                  onPick(option.value)
                  if (!multiple) setQuery('')
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 12,
                  paddingVertical: 14,
                  borderRadius: 8,
                  backgroundColor: isPicked ? theme['primary-light'] : 'transparent',
                  opacity: option.disabled ? 0.5 : 1,
                }}
                accessibilityRole={multiple ? 'checkbox' : 'radio'}
                accessibilityState={{ checked: isPicked }}
              >
                <RNText style={{ flex: 1, color: theme['gray-800'], fontSize: 15 }}>{option.label}</RNText>
                {isPicked ? <RNText style={{ color: theme.primary, fontSize: 16 }}>✓</RNText> : null}
              </Pressable>
            )
          })}

          {visible.length === 0 ? (
            <RNText style={{ color: theme['gray-500'], padding: 16, textAlign: 'center' }}>
              {t('ui.noResults')}
            </RNText>
          ) : null}
        </ScrollView>

        {multiple ? (
          <Pressable
            onPress={onClose}
            style={{
              margin: 16,
              backgroundColor: theme.primary,
              borderRadius: 8,
              paddingVertical: 12,
              alignItems: 'center',
            }}
          >
            <RNText style={{ color: '#FFFFFF', fontWeight: '600' }}>{t('ui.done')}</RNText>
          </Pressable>
        ) : null}
      </View>
    </RNModal>
  )
}

// ---------------------------------------------------------------
// CheckBox and Switch
// ---------------------------------------------------------------

export interface CheckBoxProps {
  id?: string
  label?: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  helpText?: ReactNode
  className?: string
  style?: unknown
}

export function CheckBox({ label, checked, onChange, disabled, helpText, className, style }: CheckBoxProps) {
  const theme = useTheme()
  const { view } = useStyles(className, style)

  return (
    <View style={[{ marginBottom: 12 }, view]}>
      <Pressable
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, opacity: disabled ? 0.5 : 1 }}
        onPress={() => !disabled && onChange(!checked)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: checked ? theme.primary : theme['gray-400'],
            backgroundColor: checked ? theme.primary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {checked ? <RNText style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>✓</RNText> : null}
        </View>
        {label ? (
          <RNText style={{ flex: 1, color: theme['gray-800'], fontSize: 15 }}>{label}</RNText>
        ) : null}
      </Pressable>

      {helpText ? (
        <RNText style={{ color: theme['gray-500'], fontSize: 12, marginTop: 4, marginLeft: 32 }}>
          {helpText}
        </RNText>
      ) : null}
    </View>
  )
}

export interface SwitchProps {
  id?: string
  label?: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  style?: unknown
}

export function Switch({ label, checked, onChange, disabled, className, style }: SwitchProps) {
  const theme = useTheme()
  const { view } = useStyles(className, style)

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, view]}>
      <RNSwitch
        value={checked}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: theme.primary, false: theme['gray-300'] }}
        thumbColor="#FFFFFF"
      />
      {label ? <RNText style={{ color: theme['gray-800'], fontSize: 15 }}>{label}</RNText> : null}
    </View>
  )
}
