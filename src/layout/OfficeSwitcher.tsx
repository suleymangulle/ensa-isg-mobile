import { useState } from 'react'
import { Modal as RNModal, Pressable, ScrollView, Text as RNText, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Spinner, useTheme } from '@/ui'
import { useOffice } from '@/auth/OfficeContext'
import { ALL_OFFICES, type OfficeScopeValue } from '@/auth/officeStore'

/**
 * The office (Şube) switcher in the navigation drawer's footer.
 *
 * Same behaviour as the web control, on a different mechanism. There it is a button with
 * `aria-haspopup="listbox"` and a panel positioned against it, closed by an outside click or
 * Escape, with focus returned to the trigger afterwards. None of that has a counterpart here:
 * there is no pointer to click outside with, no Escape key, and no focus to return. The list opens
 * as a sheet, which is closed by the system back gesture or by the backdrop.
 *
 * What does carry over unchanged is the part that is about the product rather than the platform:
 *
 * - The control is hidden when there is nothing to switch between - one office and no "all
 *   offices" scope - exactly as the legacy shell hid it (`Model.OfisList.Count > 1`).
 * - Unless the list could not be read at all. Then there is no telling whether there was anything
 *   to switch between, and quietly removing the control would leave the user no way to ask again -
 *   so it stays, and the sheet carries the failure and a retry.
 * - Choosing an office is not a save. Nothing is written; the choice travels as a request header,
 *   and the server validates it on every request.
 */

interface TriggerProps {
  /** Where the panel opens in the web control. There is one placement here: up from the bottom. */
  placement?: 'top' | 'bottom' | 'right'
  /**
   * Called once an office has actually been chosen. The shell uses it to close the drawer, which
   * is what the drawer already does when a menu entry is followed.
   */
  onSelected?: () => void
}

/** The office name to show, or the "all offices" label, or a placeholder while it resolves. */
function useCurrentLabel(): string {
  const { t } = useTranslation()
  const { scope, activeOffice, isLoading } = useOffice()

  if (isLoading) return t('office.switcher.loading')
  if (scope === 'all') return t('office.switcher.allOffices')
  return activeOffice?.name ?? t('office.switcher.none')
}

/** The drawer footer's control: an icon, the office name, a caret. */
export default function OfficeSwitcher({ onSelected }: TriggerProps = {}) {
  const { t } = useTranslation()
  const theme = useTheme()
  const { canSwitch, isSwitching, isLoading, error } = useOffice()
  const [isOpen, setOpen] = useState(false)
  const label = useCurrentLabel()

  if (!canSwitch && error == null) return null

  return (
    <View>
      <Pressable
        onPress={() => !isLoading && !isSwitching && setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('office.switcher.triggerLabel', { office: label })}
        accessibilityState={{ expanded: isOpen, disabled: isLoading || isSwitching }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingVertical: 12,
          paddingHorizontal: 12,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: theme['border-color'],
          backgroundColor: theme['gray-100'],
          opacity: isLoading || isSwitching ? 0.6 : 1,
        }}
      >
        <RNText style={{ fontSize: 15 }}>▤</RNText>

        <View style={{ flex: 1, minWidth: 0 }}>
          <RNText style={{ color: theme['gray-500'], fontSize: 11 }}>
            {t('office.switcher.label')}
          </RNText>
          <RNText numberOfLines={1} style={{ color: theme['gray-900'], fontSize: 14, fontWeight: '600' }}>
            {label}
          </RNText>
        </View>

        <RNText style={{ color: theme['gray-500'], fontSize: 11 }}>▾</RNText>
      </Pressable>

      <OfficeSheet
        isOpen={isOpen}
        onClose={() => setOpen(false)}
        onSelected={() => {
          setOpen(false)
          onSelected?.()
        }}
      />
    </View>
  )
}

/**
 * The collapsed rail's control.
 *
 * There is no rail on a phone, so nothing renders it today. It is kept because `Sidebar` still
 * passes `collapsedFooter`, and because the rail comes back the moment this shell has room for an
 * aside - on a tablet, in landscape.
 */
export function OfficeSwitcherCompact() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { canSwitch, isSwitching, isLoading, error } = useOffice()
  const [isOpen, setOpen] = useState(false)
  const label = useCurrentLabel()

  if (!canSwitch && error == null) return null

  return (
    <View>
      <Pressable
        onPress={() => !isLoading && !isSwitching && setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('office.switcher.triggerLabel', { office: label })}
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme['gray-100'],
        }}
      >
        <RNText style={{ fontSize: 16 }}>▤</RNText>
      </Pressable>

      <OfficeSheet isOpen={isOpen} onClose={() => setOpen(false)} onSelected={() => setOpen(false)} />
    </View>
  )
}

/** The list both shapes open. */
function OfficeSheet({
  isOpen,
  onClose,
  onSelected,
}: {
  isOpen: boolean
  onClose: () => void
  onSelected: () => void
}) {
  const { t } = useTranslation()
  const theme = useTheme()
  const { offices, scope, allOfficesAllowed, isLoading, error, isSwitching, selectOffice, retry } =
    useOffice()

  const rows: { value: OfficeScopeValue; label: string; headquarters: boolean }[] = [
    ...(allOfficesAllowed
      ? [{ value: ALL_OFFICES as OfficeScopeValue, label: t('office.switcher.allOffices'), headquarters: false }]
      : []),
    ...offices.map((office) => ({
      value: office.id as OfficeScopeValue,
      label: office.name,
      headquarters: office.isHeadquarterOffice,
    })),
  ]

  async function choose(value: OfficeScopeValue) {
    await selectOffice(value)
    onSelected()
  }

  return (
    <RNModal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel={t('common.cancel')} />

        <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme['card-bg'] }}>
          <View
            style={{
              maxHeight: 420,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              backgroundColor: theme['card-bg'],
            }}
          >
            <View
              style={{
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: theme['border-color'],
              }}
            >
              <RNText
                style={{ color: theme['gray-900'], fontSize: 16, fontWeight: '600' }}
                accessibilityRole="header"
              >
                {t('office.switcher.label')}
              </RNText>
            </View>

            {isLoading ? (
              <View style={{ padding: 24 }}>
                <Spinner label={t('office.switcher.loading')} />
              </View>
            ) : error ? (
              <View style={{ padding: 20, gap: 12, alignItems: 'flex-start' }}>
                <RNText style={{ color: theme.danger, fontSize: 14 }}>
                  {t('errors.unexpected')}
                </RNText>
                <Button variant="light" size="sm" onClick={retry}>
                  {t('office.switcher.retry')}
                </Button>
              </View>
            ) : rows.length === 0 ? (
              <RNText style={{ color: theme['gray-500'], padding: 20 }}>
                {t('office.switcher.empty')}
              </RNText>
            ) : (
              <ScrollView>
                {rows.map((row) => {
                  const isActive = row.value === scope

                  return (
                    <Pressable
                      key={String(row.value)}
                      disabled={isSwitching}
                      onPress={() => void choose(row.value)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isActive, disabled: isSwitching }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        backgroundColor: isActive ? theme['primary-light'] : 'transparent',
                      }}
                    >
                      <RNText
                        numberOfLines={1}
                        style={{
                          flex: 1,
                          color: isActive ? theme.primary : theme['gray-800'],
                          fontWeight: isActive ? '600' : '400',
                          fontSize: 15,
                        }}
                      >
                        {row.label}
                      </RNText>

                      {row.headquarters ? (
                        <Badge variant="light">{t('office.switcher.headquarters')}</Badge>
                      ) : null}

                      {isActive ? (
                        <RNText style={{ color: theme.primary, fontSize: 16 }}>✓</RNText>
                      ) : null}
                    </Pressable>
                  )
                })}
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </View>
    </RNModal>
  )
}
