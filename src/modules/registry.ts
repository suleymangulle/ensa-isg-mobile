import type { RouteObject } from '@/navigation/router'

/**
 * A sidebar entry contributed by a module.
 *
 * `labelKey` is a translation key, never literal text - the UI ships in Turkish and English.
 */
export interface NavEntry {
  /** Route path, without a leading slash, matching one of the module's routes. */
  path: string
  labelKey: string
  /** Single glyph shown when the sidebar is collapsed. */
  icon: string
  /** Group heading the entry belongs to; see `NAV_GROUPS` for the display order. */
  group: NavGroup
  /** Sort key inside the group. Lower comes first. */
  order: number

  /**
   * Permission required to see the entry, from `PERMISSIONS` in `@/api/permissions`.
   *
   * Omit it for a screen everyone with a session may open. Hiding a link is a **courtesy, not a
   * control**: every endpoint enforces its own permission and answers 403 whatever the menu
   * shows. What this prevents is the other failure - a user shown thirty entries, twenty-eight
   * of which answer "forbidden" the moment they are tapped.
   */
  permission?: string
}

/** What a module file has to export. */
export interface ModuleDefinition {
  routes: RouteObject[]
  nav: NavEntry[]
}

/**
 * Sidebar groups, in the order they are rendered. Adding a module never means editing this
 * list - a module only picks the group it belongs to.
 */
export const NAV_GROUPS = ['overview', 'workplace', 'ohs', 'finance', 'records', 'admin'] as const

export type NavGroup = (typeof NAV_GROUPS)[number]

/**
 * One glyph per group, in the same family as the entries' own icons.
 */
export const NAV_GROUP_ICONS: Record<NavGroup, string> = {
  overview: '⊞',
  workplace: '🏭',
  ohs: '⛑',
  finance: '₺',
  records: '🗃',
  admin: '⚙',
}

/**
 * Every `src/pages/<module>/module.tsx` is collected at build time.
 *
 * Modules register themselves instead of being listed here on purpose: `App.tsx`, `Sidebar.tsx`
 * and this file would otherwise be edited by everyone who adds a screen, which is exactly the
 * kind of shared-file contention that produces conflicts and forgotten wiring. Drop a module
 * folder in and it appears in the router and the menu.
 *
 * `require.context` is Metro's answer to Vite's `import.meta.glob`, and is enabled in
 * `metro.config.js`. The pattern is deliberately one level deep: a `module.tsx` nested any
 * further is a component, not a module.
 */
const modules = require.context('../pages', true, /^\.\/[^/]+\/module\.tsx$/)

function definitions(): ModuleDefinition[] {
  return modules
    .keys()
    // Sort by path so the route and menu order is stable across builds.
    .sort((left, right) => left.localeCompare(right))
    .map((path) => {
      const loaded = modules(path) as { default?: ModuleDefinition } & ModuleDefinition
      return loaded.default ?? loaded
    })
}

/** Every route contributed by the modules, ready to be rendered inside the main layout. */
export function moduleRoutes(): RouteObject[] {
  return definitions().flatMap((definition) => definition.routes ?? [])
}

/**
 * Sidebar entries, grouped and ordered.
 *
 * `hasPermission` filters out what the caller cannot use; groups left empty are dropped, so a
 * user never sees a heading with nothing under it. Pass a predicate that always returns `true`
 * to get the unfiltered menu.
 */
export function moduleNavigation(
  hasPermission: (permission: string) => boolean,
): { group: NavGroup; entries: NavEntry[] }[] {
  const entries = definitions()
    .flatMap((definition) => definition.nav ?? [])
    .filter((entry) => !entry.permission || hasPermission(entry.permission))

  return NAV_GROUPS.map((group) => ({
    group,
    entries: entries
      .filter((entry) => entry.group === group)
      .sort((left, right) => left.order - right.order || left.path.localeCompare(right.path)),
  })).filter((section) => section.entries.length > 0)
}
