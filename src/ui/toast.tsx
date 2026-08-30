import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Animated, Pressable, Text as RNText, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSoftColors, type Variant } from './primitives'
import { useTheme } from './theme'

/**
 * The confirmation every write raises.
 *
 * The web client renders the stack into a container that `ToastRegion` then marks as a live
 * region, because the library did not. Here the announcement is a property of the toast itself -
 * `accessibilityLiveRegion` on the element that appears - so there is nothing left for a separate
 * region component to fix. `components/ToastRegion` is kept as a no-op so the entry point still
 * reads the same.
 */

export interface Toast {
  id: number
  message: string
  variant: Variant
}

interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  warning: (message: string) => void
  show: (message: string, variant?: Variant) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const LIFETIME = 3500

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const show = useCallback((message: string, variant: Variant = 'primary') => {
    const id = nextId.current++
    setToasts((current) => [...current, { id, message, variant }])
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), LIFETIME)
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message) => show(message, 'success'),
      error: (message) => show(message, 'danger'),
      info: (message) => show(message, 'info'),
      warning: (message) => show(message, 'warning'),
    }),
    [show],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((c) => c.filter((t) => t.id !== id))} />
    </ToastContext.Provider>
  )
}

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null

  return (
    <SafeAreaView
      edges={['bottom']}
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
    >
      <View pointerEvents="box-none" style={{ padding: 12, gap: 8 }}>
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
        ))}
      </View>
    </SafeAreaView>
  )
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const { fg, bg } = useSoftColors(toast.variant)

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{
        backgroundColor: bg,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme['border-color'],
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      }}
    >
      <RNText style={{ flex: 1, color: fg, fontSize: 14, fontWeight: '500' }}>{toast.message}</RNText>
      <Pressable onPress={onDismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('ui.close')}>
        <RNText style={{ color: fg, fontSize: 18 }}>×</RNText>
      </Pressable>
    </Animated.View>
  )
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast can only be used inside ToastProvider.')
  return context
}
