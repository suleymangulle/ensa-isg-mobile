import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppearanceProvider, ToastProvider, useAppearance } from '@/ui'
import { BrowserRouter } from '@/navigation/router'
import { hydrateStorage } from '@/utils/storage'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { OfficeProvider } from './auth/OfficeContext'
import ToastRegion from './components/ToastRegion'
import { APPEARANCE_STORAGE_KEY, ENSA_COLOR_SCHEME_ID } from './styles/appearance'

/**
 * The entry point, in the order the web client's `main.tsx` builds it.
 *
 * One step comes before all of it and has no counterpart there: storage is hydrated. `localStorage`
 * answers synchronously and this platform's does not, while three things read it from code that
 * cannot wait - the request interceptor's token, the office accessor it reads next, and i18next's
 * initial language. Rather than make all three asynchronous, the read happens once, here, and the
 * tree is mounted after it. The wait is a few milliseconds off a local file, and it replaces the
 * splash screen the platform is showing anyway.
 *
 * `i18n` is imported for its side effect, after hydration, so the remembered language is in
 * memory by the time it initialises - which is why the import is inside the effect rather than at
 * the top of the file.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // The web client turns off refetch-on-focus. A phone's equivalent - coming back from the
      // background - is worth honouring, because the data on screen may be hours old by then.
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

export default function Root() {
  const [isHydrated, setHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false

    void hydrateStorage().then(() => {
      // Must be loaded before any component renders so translations are ready on first paint,
      // and after hydration so it starts in the language that was chosen last.
      require('./i18n')
      if (!cancelled) setHydrated(true)
    })

    return () => {
      cancelled = true
    }
  }, [])

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F8FA' }}>
        <ActivityIndicator size="large" color="#3E97FF" />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <AppearanceProvider
        defaultMode="system"
        defaultSidebarPresentation="grouped"
        defaultSidebarTone="auto"
        defaultColorSchemeId={ENSA_COLOR_SCHEME_ID}
        storageKey={APPEARANCE_STORAGE_KEY}
      >
        <ThemedStatusBar />
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              {/* Inside AuthProvider because it needs a session to ask which offices are the
                  caller's, and inside QueryClientProvider because switching office is, on this
                  client too, a cache operation. */}
              <OfficeProvider>
                <ToastProvider>
                  <ToastRegion />
                  <App />
                </ToastProvider>
              </OfficeProvider>
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </AppearanceProvider>
    </SafeAreaProvider>
  )
}

/** The status bar follows the theme, which is the one piece of chrome outside the React tree. */
function ThemedStatusBar() {
  const { resolvedTheme } = useAppearance()
  return <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
}
