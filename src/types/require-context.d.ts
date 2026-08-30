/**
 * `require.context`, as Metro implements it.
 *
 * Enabled by `transformer.unstable_allowRequireContext` in `metro.config.js`; TypeScript has no
 * idea it exists, so the shape it returns is declared here. Used by the module registry and by
 * the translation bundles, which is the whole reason a module can register itself by existing.
 */
declare namespace NodeJS {
  interface Require {
    context(
      directory: string,
      useSubdirectories?: boolean,
      regExp?: RegExp,
      mode?: 'sync' | 'eager' | 'lazy' | 'lazy-once',
    ): RequireContext
  }
}

interface RequireContext {
  (id: string): unknown
  keys(): string[]
  resolve(id: string): string
  id: string
}

declare const require: NodeJS.Require & ((id: string) => unknown)
