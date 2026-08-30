import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Modal as RNModal,
  Pressable,
  ScrollView,
  Text as RNText,
  View,
  useWindowDimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { withText } from './html'
import { useTheme } from './theme'

/**
 * Dialogs and the two things that hang off a trigger.
 *
 * A browser positions a menu and a popover against their trigger and lets them float. React
 * Native has no such layer that can escape a parent's bounds reliably, so both are anchored the
 * way the platform actually does it: the sheet comes up from the bottom, wide enough to read and
 * close enough to the thumb to use. The props are unchanged - `placement` is accepted and
 * ignored, because there is only one honest placement on a phone.
 */

// ---------------------------------------------------------------
// Modal
// ---------------------------------------------------------------

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  footer?: ReactNode
  children?: ReactNode
  className?: string
  /** `sm` / `lg` / `xl` in the web component; here it only decides how tall the sheet may grow. */
  size?: 'sm' | 'lg' | 'xl'
}

export function Modal({ open, onClose, title, footer, children, size }: ModalProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const { height } = useWindowDimensions()

  const maxHeight = size === 'sm' ? height * 0.5 : height * 0.9

  return (
    <RNModal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel={t('ui.close')} />

        <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme['card-bg'] }}>
          <View
            style={{
              maxHeight,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              backgroundColor: theme['card-bg'],
            }}
            accessibilityViewIsModal
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: theme['border-color'],
              }}
            >
              <RNText
                numberOfLines={2}
                style={{ flex: 1, color: theme['gray-900'], fontSize: 17, fontWeight: '600' }}
                accessibilityRole="header"
              >
                {title}
              </RNText>
              <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('ui.close')}>
                <RNText style={{ color: theme['gray-500'], fontSize: 22 }}>×</RNText>
              </Pressable>
            </View>

            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ padding: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              {withText(children, { color: theme['gray-700'] })}
            </ScrollView>

            {footer ? (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  gap: 8,
                  padding: 16,
                  borderTopWidth: 1,
                  borderTopColor: theme['border-color'],
                }}
              >
                {footer}
              </View>
            ) : null}
          </View>
        </SafeAreaView>
      </View>
    </RNModal>
  )
}

// ---------------------------------------------------------------
// Menu
// ---------------------------------------------------------------

export interface MenuItem {
  key: string
  label: ReactNode
  onSelect?: () => void
  danger?: boolean
  disabled?: boolean
}

export function Menu({
  items,
  children,
  title,
}: {
  items: MenuItem[]
  children: ReactNode
  placement?: 'start' | 'end'
  title?: string
}) {
  const theme = useTheme()
  const [isOpen, setOpen] = useState(false)

  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button">
        {children}
      </Pressable>

      <RNModal visible={isOpen} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}
          onPress={() => setOpen(false)}
        >
          <SafeAreaView edges={['bottom']}>
            <View
              style={{
                margin: 12,
                borderRadius: 14,
                backgroundColor: theme['card-bg'],
                overflow: 'hidden',
              }}
            >
              {title ? (
                <RNText
                  style={{
                    padding: 14,
                    color: theme['gray-500'],
                    fontSize: 13,
                    borderBottomWidth: 1,
                    borderBottomColor: theme['border-color'],
                  }}
                >
                  {title}
                </RNText>
              ) : null}

              {items.map((item) => (
                <Pressable
                  key={item.key}
                  disabled={item.disabled}
                  onPress={() => {
                    setOpen(false)
                    item.onSelect?.()
                  }}
                  style={{
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: theme['border-color'],
                    opacity: item.disabled ? 0.5 : 1,
                  }}
                  accessibilityRole="menuitem"
                >
                  <RNText
                    style={{
                      color: item.danger ? theme.danger : theme['gray-800'],
                      fontSize: 16,
                      fontWeight: '500',
                    }}
                  >
                    {item.label}
                  </RNText>
                </Pressable>
              ))}
            </View>
          </SafeAreaView>
        </Pressable>
      </RNModal>
    </>
  )
}

// ---------------------------------------------------------------
// Popover
// ---------------------------------------------------------------

export function Popover({
  children,
  content,
  title,
}: {
  children: ReactNode
  content: ReactNode
  title?: ReactNode
  placement?: 'top' | 'bottom' | 'start' | 'end'
}) {
  const theme = useTheme()
  const [isOpen, setOpen] = useState(false)

  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button">
        {children}
      </Pressable>

      <RNModal visible={isOpen} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} />

          <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme['card-bg'] }}>
            <View
              style={{
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                backgroundColor: theme['card-bg'],
                maxHeight: '80%',
              }}
            >
              {title ? (
                <View
                  style={{
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: theme['border-color'],
                  }}
                >
                  <RNText style={{ color: theme['gray-900'], fontSize: 16, fontWeight: '600' }}>
                    {title}
                  </RNText>
                </View>
              ) : null}

              <ScrollView contentContainerStyle={{ padding: 16 }}>{content}</ScrollView>
            </View>
          </SafeAreaView>
        </View>
      </RNModal>
    </>
  )
}
