const { getDefaultConfig } = require('expo/metro-config')

/**
 * `require.context` is what lets a module register itself by being dropped into
 * `src/pages/<module>/`, exactly as `import.meta.glob` does in the web client.
 * Metro supports it, but only when it is switched on.
 */
const config = getDefaultConfig(__dirname)
config.transformer.unstable_allowRequireContext = true

module.exports = config
