// `URL` and `URLSearchParams` are only partly implemented in Hermes; the router and the query
// helpers use both. Imported first so nothing can read the unpatched globals.
import 'react-native-url-polyfill/auto'

import { registerRootComponent } from 'expo'

import Root from './src/Root'

registerRootComponent(Root)
