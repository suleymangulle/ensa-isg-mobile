/**
 * The component library, by the names the ported screens already import.
 *
 * `react/ensa-web` builds every screen out of `rich-react-component`. That package is a web
 * library - it renders DOM and ships a stylesheet - so it cannot come along. What comes along
 * instead is its surface: the same component names, taking the same props, drawn with React
 * Native primitives. A ported screen changes one import line and keeps its markup.
 *
 * The rule this file follows is that a prop is never quietly repurposed. Where a prop has no
 * meaning on a phone - `placement` on a menu that can only come up from the bottom, `collapsed`
 * on a sidebar that is always a drawer - it is accepted and ignored, and the component that
 * ignores it says why. Where a prop has a different meaning, the component does not take it.
 */

export * from './theme'
export * from './style'
export * from './html'
export * from './primitives'
export * from './Button'
export * from './inputs'
export * from './dom'
export * from './DataGrid'
export * from './overlays'
export * from './shell'
export * from './toast'
export * from './AppearanceMenu'
