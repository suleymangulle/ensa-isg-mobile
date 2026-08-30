import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal as RNModal, Pressable, ScrollView, Text as RNText, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from './theme'

/**
 * The application shell: the bar at the top and the navigation behind it.
 *
 * The web `Sidebar` has three presentations - an aside, a collapsed rail and a drawer - and the
 * shell picks between them by viewport width. A phone only ever has the third, so the rail props
 * (`collapsed`, `collapsedFooter`) are accepted and ignored rather than removed: `layout/Sidebar`
 * still passes them, and the day this runs on a tablet is the day they matter again.
 */

// ---------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------

export function Navbar({
  brand,
  end,
  className,
}: {
  brand?: ReactNode
  end?: ReactNode
  variant?: 'light' | 'dark'
  className?: string
  gap?: number
  align?: string
}) {
  const theme = useTheme()

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        minHeight: 56,
        backgroundColor: theme['card-bg'],
        borderBottomWidth: 1,
        borderBottomColor: theme['border-color'],
      }}
      accessibilityRole="header"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>{brand}</View>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>{end}</View>
    </View>
  )
}

// ---------------------------------------------------------------
// PageHeader
// ---------------------------------------------------------------

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  const theme = useTheme()

  return (
    <View style={{ marginBottom: 16, gap: 10 }}>
      <View style={{ gap: 4 }}>
        <RNText
          style={{ color: theme['gray-900'], fontSize: 22, fontWeight: '700' }}
          accessibilityRole="header"
        >
          {title}
        </RNText>
        {description ? (
          <RNText style={{ color: theme['gray-500'], fontSize: 14 }}>{description}</RNText>
        ) : null}
      </View>

      {actions ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{actions}</View>
      ) : null}
    </View>
  )
}

// ---------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------

export type SidebarItem =
  | {
      type: 'group'
      key: string
      label: ReactNode
      icon?: ReactNode
      collapsible?: boolean
      children: SidebarItem[]
    }
  | {
      type: 'link'
      key: string
      href: string
      label: ReactNode
      icon?: ReactNode
      disabled?: boolean
    }

export interface RenderLinkArgs {
  item: SidebarItem
  href: string
  children: ReactNode
}

export interface SidebarProps {
  items: SidebarItem[]
  activeKey?: string
  defaultExpandedKeys?: string[]
  expandActivePath?: boolean
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
  mobileLabel?: string
  closeMobileOnSelect?: boolean
  navLabel?: string
  header?: ReactNode
  footer?: ReactNode
  collapsedFooter?: ReactNode
  className?: string
  renderLink?: (args: RenderLinkArgs) => ReactNode
}

export function Sidebar({
  items,
  activeKey,
  defaultExpandedKeys = [],
  mobileOpen = false,
  onMobileOpenChange,
  navLabel,
  header,
  footer,
  renderLink,
  closeMobileOnSelect = true,
}: SidebarProps) {
  const { t } = useTranslation()
  const theme = useTheme()

  const [expanded, setExpanded] = useState<string[]>(defaultExpandedKeys)

  // The group holding the active entry is always open, whatever the user last collapsed - the
  // same rule the web component's `expandActivePath` applies.
  const openKeys = useMemo(() => {
    const owner = items.find(
      (item) => item.type === 'group' && item.children.some((child) => child.key === activeKey),
    )
    return owner && !expanded.includes(owner.key) ? [...expanded, owner.key] : expanded
  }, [activeKey, expanded, items])

  function close() {
    if (closeMobileOnSelect) onMobileOpenChange?.(false)
  }

  function renderEntry(item: SidebarItem, depth: number): ReactNode {
    if (item.type === 'group') {
      const isOpen = openKeys.includes(item.key)

      return (
        <View key={item.key}>
          <Pressable
            onPress={() =>
              setExpanded((current) =>
                current.includes(item.key)
                  ? current.filter((key) => key !== item.key)
                  : [...current, item.key],
              )
            }
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingVertical: 12,
              paddingHorizontal: 16,
            }}
            accessibilityRole="button"
            accessibilityState={{ expanded: isOpen }}
          >
            {item.icon ? <RNText style={{ fontSize: 15 }}>{item.icon}</RNText> : null}
            <RNText
              style={{
                flex: 1,
                color: theme['gray-500'],
                fontSize: 12,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 0.4,
              }}
            >
              {item.label}
            </RNText>
            <RNText style={{ color: theme['gray-500'], fontSize: 11 }}>{isOpen ? '▾' : '▸'}</RNText>
          </Pressable>

          {isOpen ? item.children.map((child) => renderEntry(child, depth + 1)) : null}
        </View>
      )
    }

    const isActive = item.key === activeKey

    const body = (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 13,
          paddingLeft: 16 + depth * 12,
          paddingRight: 16,
          backgroundColor: isActive ? theme['primary-light'] : 'transparent',
          borderRadius: 8,
          opacity: item.disabled ? 0.5 : 1,
        }}
      >
        {item.icon ? (
          <RNText style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{item.icon}</RNText>
        ) : null}
        <RNText
          numberOfLines={1}
          style={{
            flex: 1,
            color: isActive ? theme.primary : theme['gray-800'],
            fontSize: 15,
            fontWeight: isActive ? '600' : '400',
          }}
        >
          {item.label}
        </RNText>
      </View>
    )

    return (
      <View key={item.key} onTouchEnd={close}>
        {renderLink ? renderLink({ item, href: item.href, children: body }) : body}
      </View>
    )
  }

  const panel = (
    <View style={{ flex: 1, backgroundColor: theme['card-bg'] }}>
      {header ? (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: theme['border-color'],
          }}
        >
          {header}
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 8 }}>
        {items.map((item) => renderEntry(item, 0))}
      </ScrollView>

      {footer ? (
        <View
          style={{
            paddingHorizontal: 12,
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

  return (
    <RNModal
      visible={mobileOpen}
      transparent
      animationType="slide"
      onRequestClose={() => onMobileOpenChange?.(false)}
    >
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <SafeAreaView edges={['top', 'bottom']} style={{ width: '82%', maxWidth: 330 }}>
          <View style={{ flex: 1 }} accessibilityLabel={navLabel}>
            {panel}
          </View>
        </SafeAreaView>

        <Pressable
          style={{ flex: 1 }}
          onPress={() => onMobileOpenChange?.(false)}
          accessibilityLabel={t('ui.close')}
        />
      </View>
    </RNModal>
  )
}
