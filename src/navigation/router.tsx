import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { BackHandler, Pressable, Text as RNText, View } from 'react-native'
import { useInheritedTextStyle } from '@/ui/html'
import { useStyles } from '@/ui/style'
import { useTheme } from '@/ui/theme'

/**
 * `react-router-dom`, as much of it as this application uses, over a navigation stack.
 *
 * Every screen in `react/ensa-web` navigates through the router: `<Link to>`, `useNavigate`,
 * `useParams`, `useSearchParams`, and a module registry whose whole contract is an array of
 * `RouteObject`. Replacing that with a different navigation library would have meant rewriting
 * all of it and rewriting the registry's contract with it - so the router's surface is
 * implemented instead, on top of a stack that behaves the way a phone expects:
 *
 * - the hardware back button pops, and only leaves the application when the stack is empty;
 * - `replace` replaces the top entry rather than pushing, which is what sign-in and sign-out need;
 * - a URL is still a URL - `/companies/12?tab=employees` parses into a path, params and a query -
 *   because that is what the screens read.
 *
 * What is deliberately absent: relative links, loaders, actions, and lazy routes. None of them
 * appear in the application being ported.
 */

// ---------------------------------------------------------------
// Location
// ---------------------------------------------------------------

export interface Location {
  pathname: string
  search: string
  key: string
}

export interface RouteObject {
  path?: string
  index?: boolean
  element?: ReactNode
  children?: RouteObject[]
}

export type NavigateOptions = { replace?: boolean }
export type To = string | number

interface RouterContextValue {
  location: Location
  navigate: (to: To, options?: NavigateOptions) => void
  canGoBack: boolean
}

const RouterContext = createContext<RouterContextValue | null>(null)

function parse(to: string): { pathname: string; search: string } {
  const [pathname, search = ''] = to.split('?')
  return { pathname: pathname || '/', search: search ? `?${search}` : '' }
}

let nextKey = 1

/** The web client's `BrowserRouter`, over an in-memory stack. */
export function BrowserRouter({
  children,
  initialPath = '/',
}: {
  children: ReactNode
  initialPath?: string
}) {
  const [stack, setStack] = useState<Location[]>(() => [
    { ...parse(initialPath), key: String(nextKey++) },
  ])

  const navigate = useCallback((to: To, options: NavigateOptions = {}) => {
    if (typeof to === 'number') {
      // `navigate(-1)` and friends: pop that many entries, never past the root.
      setStack((current) => current.slice(0, Math.max(1, current.length + to)))
      return
    }

    const entry: Location = { ...parse(to), key: String(nextKey++) }
    setStack((current) =>
      options.replace ? [...current.slice(0, -1), entry] : [...current, entry],
    )
  }, [])

  const location = stack[stack.length - 1]
  const canGoBack = stack.length > 1

  /**
   * The hardware back button is the same gesture as the browser's back button, and the same stack
   * answers it. Returning false when there is nothing left to pop lets the platform close the
   * application, which is what a user expects at the first screen.
   *
   * The depth is read from a ref rather than from the render that registered the listener. Two
   * back presses inside one frame both saw the pre-pop length otherwise, and the second one
   * emptied a stack the first had already reduced to the root - leaving no location at all, and
   * every screen reading `pathname` off `undefined`. Guarding inside the updater as well means
   * the invariant holds even if the ref is somehow stale: there is always a route.
   */
  const depth = useRef(stack.length)
  depth.current = stack.length

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (depth.current <= 1) return false
      setStack((current) => (current.length <= 1 ? current : current.slice(0, -1)))
      return true
    })
    return () => subscription.remove()
  }, [])

  const value = useMemo<RouterContextValue>(
    () => ({ location, navigate, canGoBack }),
    [canGoBack, location, navigate],
  )

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

function useRouter(): RouterContextValue {
  const context = useContext(RouterContext)
  if (!context) throw new Error('Router hooks can only be used inside BrowserRouter.')
  return context
}

export function useLocation(): Location {
  return useRouter().location
}

export function useNavigate(): (to: To, options?: NavigateOptions) => void {
  return useRouter().navigate
}

/** True when there is somewhere to go back to; used by the screens that draw their own back arrow. */
export function useCanGoBack(): boolean {
  return useRouter().canGoBack
}

// ---------------------------------------------------------------
// Matching
// ---------------------------------------------------------------

const ParamsContext = createContext<Record<string, string>>({})

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T {
  return useContext(ParamsContext) as T
}

interface FlatRoute {
  /** Full pattern, leading slash included. */
  pattern: string
  /** The element chain from the outermost route inwards. */
  elements: ReactNode[]
}

function joinPath(base: string, path: string | undefined): string {
  if (!path) return base || '/'
  if (path.startsWith('/')) return path
  const joined = `${base.replace(/\/+$/, '')}/${path}`
  return joined.startsWith('/') ? joined : `/${joined}`
}

/** Turns a route tree into one entry per leaf, carrying the elements that wrap it. */
function flatten(routes: RouteObject[], base = '', chain: ReactNode[] = []): FlatRoute[] {
  const out: FlatRoute[] = []

  for (const route of routes) {
    const pattern = route.index ? base || '/' : joinPath(base, route.path)
    const elements = route.element === undefined ? chain : [...chain, route.element]

    if (route.children?.length) {
      out.push(...flatten(route.children, pattern, elements))
      // A parent with an element of its own is also reachable on its own path when it has no
      // index child; the match below simply never wins in that case, which is correct.
      if (!route.children.some((child) => child.index)) {
        out.push({ pattern, elements })
      }
    } else {
      out.push({ pattern, elements })
    }
  }

  return out
}

interface Match {
  route: FlatRoute
  params: Record<string, string>
  score: number
}

function matchRoute(route: FlatRoute, pathname: string): Match | null {
  const pattern = route.pattern.split('/').filter(Boolean)
  const actual = pathname.split('/').filter(Boolean)

  const params: Record<string, string> = {}
  let score = 0

  for (let index = 0; index < pattern.length; index += 1) {
    const segment = pattern[index]

    if (segment === '*') {
      // A wildcard swallows the rest and is always the last resort.
      return { route, params, score: -1000 }
    }

    if (index >= actual.length) return null

    if (segment.startsWith(':')) {
      params[segment.slice(1)] = decodeURIComponent(actual[index])
      score += 1
      continue
    }

    if (segment !== actual[index]) return null
    score += 2
  }

  if (actual.length !== pattern.length) return null
  return { route, params, score }
}

// ---------------------------------------------------------------
// Routes / Route / Outlet
// ---------------------------------------------------------------

const OutletContext = createContext<ReactNode>(null)

export function Outlet() {
  return <>{useContext(OutletContext)}</>
}

export interface RouteProps {
  path?: string
  index?: boolean
  element?: ReactNode
  children?: ReactNode
}

/** Declarative only: `Routes` reads these props and renders the match itself. */
export function Route(_props: RouteProps): ReactElement | null {
  return null
}

/** Reads a `<Route>` element tree into the plain objects `flatten` works on. */
function toRouteObjects(children: ReactNode): RouteObject[] {
  const out: RouteObject[] = []

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    const props = child.props as RouteProps

    out.push({
      path: props.path,
      index: props.index,
      element: props.element,
      children: props.children ? toRouteObjects(props.children) : undefined,
    })
  })

  return out
}

export function Routes({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()

  const flat = useMemo(() => flatten(toRouteObjects(children)), [children])

  const match = useMemo(() => {
    let best: Match | null = null

    for (const route of flat) {
      const candidate = matchRoute(route, pathname)
      if (candidate && (!best || candidate.score > best.score)) best = candidate
    }
    return best
  }, [flat, pathname])

  if (!match) return null

  // The element chain is nested from the inside out, so each parent renders its child through
  // `Outlet` exactly as the web router does.
  const tree = match.route.elements.reduceRight<ReactNode>(
    (child, element) => <OutletContext.Provider value={child}>{element}</OutletContext.Provider>,
    null,
  )

  return <ParamsContext.Provider value={match.params}>{tree}</ParamsContext.Provider>
}

// ---------------------------------------------------------------
// Navigate / Link
// ---------------------------------------------------------------

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const navigate = useNavigate()
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true
    navigate(to, { replace })
  }, [navigate, replace, to])

  return null
}

export interface LinkProps {
  to: string
  children?: ReactNode
  className?: string
  style?: unknown
  replace?: boolean
  'aria-label'?: string
  'aria-current'?: string | boolean
  onClick?: () => void
  /** Kept so the sidebar can spread the library's anchor props onto it without a cast. */
  [key: string]: unknown
}

/**
 * `<Link to>`.
 *
 * Rendered as text when its content is text - which is most of them, since a link in this
 * application is usually a record's name inside a table cell - and as a pressable box otherwise,
 * so a link wrapping a menu row still fills its row.
 */
export function Link({ to, children, className, style, replace, onClick, ...rest }: LinkProps) {
  const navigate = useNavigate()
  const theme = useTheme()
  const inherited = useInheritedTextStyle()
  const { view, text } = useStyles(className, style)

  const go = () => {
    onClick?.()
    navigate(to, { replace })
  }

  const isText = Children.toArray(children).every(
    (child) => typeof child === 'string' || typeof child === 'number',
  )

  if (isText) {
    return (
      <RNText
        onPress={go}
        accessibilityRole="link"
        accessibilityLabel={rest['aria-label'] as string | undefined}
        // Inherited first: a link's colour is its own, the way `a { color: … }` beats the
        // cascade. With the two the other way round a link inside a card took the card's body
        // colour and stopped looking like a link at all.
        style={[inherited, { color: theme.primary }, view as object, text]}
      >
        {children}
      </RNText>
    )
  }

  return (
    <Pressable onPress={go} accessibilityRole="link" accessibilityLabel={rest['aria-label'] as string | undefined}>
      <View style={view}>{children}</View>
    </Pressable>
  )
}

// ---------------------------------------------------------------
// Search parameters
// ---------------------------------------------------------------

/**
 * `useSearchParams`.
 *
 * The setter writes a new entry in place rather than pushing one, which is what the web client
 * gets for free from `replace: true` and what a filter change should do: changing a tab is not a
 * screen the back gesture should have to walk back through.
 */
export function useSearchParams(): [URLSearchParams, (next: URLSearchParams | Record<string, string>) => void] {
  const { location, navigate } = useRouter()

  const params = useMemo(() => new URLSearchParams(location.search), [location.search])

  const setParams = useCallback(
    (next: URLSearchParams | Record<string, string>) => {
      const search = next instanceof URLSearchParams ? next : new URLSearchParams(next)
      const query = search.toString()
      navigate(query ? `${location.pathname}?${query}` : location.pathname, { replace: true })
    },
    [location.pathname, navigate],
  )

  return [params, setParams]
}
