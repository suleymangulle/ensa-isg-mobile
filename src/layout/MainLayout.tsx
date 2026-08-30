import { useState } from 'react'
import { RefreshControl, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Outlet } from '@/navigation/router'
import { Divider, Text, useTheme } from '@/ui'
import Sidebar from './Sidebar'
import Header from './Header'

/**
 * The application shell: the top bar, the screen under it, the menu behind it.
 *
 * The web shell puts navigation beside the content and keeps two states for it - a collapsed
 * desktop rail and a drawer. A phone only ever has the drawer, so the rail state is gone and the
 * drawer is the whole of it. `Sidebar` still takes both, because the same component has an aside
 * again the moment this runs on a tablet.
 *
 * Two things the web shell got from the browser have to be built here:
 *
 * - **Scrolling.** A browser scrolls the document; React Native scrolls nothing unless it is told
 *   to. Every screen is inside one `ScrollView`, so a long form or a stacked table can be reached.
 * - **Pull to refresh.** The gesture a phone user tries first on a screenful of data. It refetches
 *   the active queries rather than reaching into whichever screen is mounted, which keeps the shell
 *   from having to know anything about the screens.
 */
export default function MainLayout() {
  const { t } = useTranslation()
  const theme = useTheme()
  const queryClient = useQueryClient()

  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isRefreshing, setRefreshing] = useState(false)

  async function refresh() {
    setRefreshing(true)
    try {
      await queryClient.refetchQueries({ type: 'active' })
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme['card-bg'] }}>
      <View style={{ flex: 1, backgroundColor: theme['body-bg'] }}>
        <Header
          isSidebarCollapsed={false}
          onSidebarCollapseToggle={() => setIsMobileOpen(true)}
          onMobileMenuOpen={() => setIsMobileOpen(true)}
        />

        {/* The drawer is a modal: rendered here rather than beside the content because it covers
            the screen when it is open and occupies nothing when it is not. */}
        <Sidebar
          collapsed={false}
          onCollapsedChange={() => undefined}
          mobileOpen={isMobileOpen}
          onMobileOpenChange={setIsMobileOpen}
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={theme.primary} />
          }
        >
          <Outlet />

          <Divider style={{ marginTop: 24, marginBottom: 12 }} />

          <Text size="sm" tone="muted">
            {t('app.footer', { year: new Date().getFullYear() })}
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}
