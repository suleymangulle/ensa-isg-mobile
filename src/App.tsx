import { useMemo, type ReactElement } from 'react'
import { Navigate, Route, Routes, type RouteObject } from '@/navigation/router'
import { useAuth } from './auth/AuthContext'
import { useOffice } from './auth/OfficeContext'
import { Spinner } from './components/DataTable'
import MainLayout from './layout/MainLayout'
import { moduleRoutes } from './modules/registry'
import { Div } from '@/ui'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import NotFoundPage from './pages/NotFoundPage'

/**
 * Redirects to the login screen until the session has been restored, and holds the screens back
 * until the office context has been resolved with it.
 *
 * The office wait is not cosmetic. Every API call carries the office context header, and a screen
 * that mounted before the context resolved would fetch its first page with no office at all and
 * then have to be told to throw it away. Waiting for both is one spinner instead of a flash of the
 * wrong data.
 */
function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user, isReady } = useAuth()
  const { isReady: isOfficeReady } = useOffice()

  if (!isReady || (user && !isOfficeReady)) {
    return (
      <Div className="d-flex vh-100 align-items-center justify-content-center">
        <Spinner />
      </Div>
    )
  }
  return user ? children : <Navigate to="/login" replace />
}

/** Renders a route tree contributed by a module, children included. */
function renderRoute(route: RouteObject, key: string) {
  return (
    <Route key={key} path={route.path} element={route.element}>
      {route.children?.map((child, index) => renderRoute(child, `${key}/${index}`))}
    </Route>
  )
}

export default function App() {
  // Modules register themselves; see src/modules/registry.ts.
  const routes = useMemo(() => moduleRoutes(), [])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        {routes.map((route, index) => renderRoute(route, route.path ?? String(index)))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
