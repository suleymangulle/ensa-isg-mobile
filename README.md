# Ensa Mobile

The Ensa occupational health and safety system, as a React Native application.

This is a **port** of `react/ensa-web` in the [Ensa repository](https://github.com/suleymangulle/ensa-isg-from-legacy),
not a second product. Same modules, same API, same permission model, same translation keys, same
screens. What changes is the renderer.

```
npm install
npm start           # then press a for Android, i for iOS
npm run lint        # TypeScript
npm run check       # markup and browser APIs React Native cannot render
```

The API host has to be reachable from the device. See **Pointing it at the API** below.

## What a port means here

The web client is roughly 45,000 lines across 200 files. About a third of that — the data layer,
the enums, the permission catalogue, the translation bundles, every module's `api.ts` — is
framework-agnostic and is copied unchanged. The rest is screens, and screens are where a browser
and a phone actually differ.

Rather than rewrite thirty thousand lines of presentation, the two languages those screens are
written in were implemented:

| The web client writes | This client provides |
| --- | --- |
| `rich-react-component` (`Button`, `Card`, `DataGrid`, `Modal`, …) | `src/ui` — the same component names and props, drawn with React Native |
| `react-router-dom` (`Routes`, `Link`, `useParams`, …) | `src/navigation/router.tsx` — the same surface over a navigation stack |
| Bootstrap utility classes (`d-flex`, `col-md-6`, `mb-3`) | `src/ui/style.ts` — resolved to React Native styles, breakpoints included |
| Inline CSS (`var(--kt-gray-500)`, `'0.875rem'`) | `src/ui/style.ts` — custom properties resolved, units converted |
| `<div>`, `<span>`, `<table>`, `<input>` | `src/ui/html.tsx`, `src/ui/dom.tsx` — real components with the DOM's own props |

So a ported screen keeps its markup, its `className`, its inline styles and its handlers. The only
mechanical change is that its tags are capitalised, which `tools/port/port_from_web.py` does.

### Re-porting

The web client is the upstream. When a screen changes there:

```
python tools/port/port_from_web.py                 # everything
python tools/port/port_from_web.py pages/finance   # one module
npm run lint && npm run check
```

Files listed in that script's `HAND_WRITTEN` set are never overwritten — those are the ones where
the two clients genuinely differ (storage, the API host, `import.meta.glob`, the navigation shell,
printing). Everything else is regenerated.

## What is deliberately different

Each of these is a place where the web behaviour has no meaning on a phone, and the file that
implements it says so at the top.

- **Storage.** `localStorage` is synchronous and this platform has nothing that is. Storage is
  hydrated once before the first render (`src/utils/storage.ts`), after which the token store, the
  office accessor and i18next read it synchronously as before. Tokens go to the platform keychain
  rather than to a file, which is an improvement the browser could not offer.
- **The API host.** The web client is served from the same origin as the API. A phone has no
  origin, so the host is resolved in `src/config.ts` — the Android emulator's `10.0.2.2`, the iOS
  simulator's loopback, or the LAN address Expo already knows. `EXPO_PUBLIC_API_URL` overrides it.
- **Tables.** Below 760 points wide, `DataGrid` renders one card per record with every column as a
  labelled value; above it, the real table, scrolling sideways. No column is dropped either way.
- **Menus, popovers and dialogs** come up from the bottom. There is one honest placement on a
  phone, so `placement` is accepted and ignored.
- **Printing.** The web client prints the screen behind an `@media print` block. There is no
  stylesheet and no browser dialog here, so a report describes what it *contains*
  (`src/utils/print.ts`) and the platform's own print service renders it — which also makes every
  report shareable as a PDF. **No WebView is involved**, in this or anywhere else.
- **Downloads** are written to the cache directory and handed to the system share sheet, because a
  phone has no "downloads folder" to send the user to.
- **The office switcher** opens a sheet rather than a panel positioned against its trigger. What it
  does is unchanged: the server decides which offices exist, a stored selection the server does not
  list is dropped, and switching clears the office-dependent cache before it moves the scope.
- **Pull to refresh** refetches the active queries. It is the gesture a phone user tries first and
  the web client had no equivalent.

## Pointing it at the API

| Target | Host it needs | How it is resolved |
| --- | --- | --- |
| Android emulator | `https://10.0.2.2:7001` | automatic |
| iOS simulator | `https://localhost:7001` | automatic |
| A real device | the development machine's LAN address | taken from Expo's `hostUri` |
| A build | wherever the API is deployed | `EXPO_PUBLIC_API_URL` |

The development API uses a self-signed certificate. Android rejects one by default, so either
trust it on the device or run the API behind a certificate the device accepts.

The application registers with OpenIddict as the public client `ensa-mobile`, separate from the
web client's `ensa-spa` so the two can be audited and revoked independently. That client id has to
exist on the server.

## Layout

```
src/
  api/          the data layer, copied from the web client (http, endpoints, enums, permissions)
  auth/         session, permissions and the office scope
  components/   DataTable and Form — the primitives every module screen is built from
  i18n/         the web client's bundles, plus `mobile/` for words only this client says
  layout/       the shell: header, drawer, office switcher
  modules/      the registry a module registers itself with by existing
  navigation/   react-router-dom's surface, over a stack
  pages/        one folder per module — the screens
  ui/           the component library, drawn natively
  utils/        formatting, storage, printing
tools/port/     the porting script and the check that guards it
```

Adding a screen is unchanged from the web client: drop a folder under `src/pages/` with a
`module.tsx` exporting `routes` and `nav`, and it appears in the router and the menu.
