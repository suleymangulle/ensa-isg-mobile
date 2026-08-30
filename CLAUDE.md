# Ensa Mobile — Project Instructions

## How to work here (STANDING RULE)

**Do not ask me questions.** When something is ambiguous, do not stop and ask; make the most
defensible call yourself, state the assumption in one line, and keep going. No approval requests,
no "shall I continue?", no menus of options. The decision is yours.

- Do not use the `AskUserQuestion` tool.
- No plan mode, no waiting for confirmation — implement directly.
- At the end of the work, summarise what you did and which assumptions you made — as information,
  not as a question.

**Language:** all code, identifiers, comments, XML docs and repository documentation are **English**.
Chat replies to me are **Turkish**.

## This repository is a port

The upstream is `D:\EnsaFromLegacyEnsa\react\ensa-web` (GitHub:
`suleymangulle/ensa-isg-from-legacy`). Every module, route, permission, translation key and DTO
here comes from there. **Do not invent a screen, a route or an endpoint that the web client does
not have** — if a feature is missing on mobile, it is missing upstream too, and that is where it
gets added first.

Read `README.md` before writing code. It explains the porting model; the rest of this file is the
rules that follow from it.

## Rules

- **Never a WebView.** Not for a screen, not for a form, not for a table. The only exception the
  owner allowed is *viewing a report*, and even that is currently served by the platform's print
  service (`src/utils/print.ts`) rather than by a WebView.
- **`src/ui` is the component library.** It mirrors `rich-react-component`'s surface. Build screens
  from it, not from raw `View`/`Text`, so a re-port keeps working. If a screen needs a component
  the library does not have, add it to `src/ui` with the props the web component would have had.
- **A prop with no meaning here is accepted and ignored, never repurposed**, and the component that
  ignores it says why in a comment. Silently changing what a prop means is how the two clients
  drift apart.
- **No hard-coded user-facing text.** Turkish and English both. Keys that exist upstream live in
  `src/i18n/locales/` (copied, never edited here); keys only this client needs live in
  `src/i18n/mobile/`.
- **Money is presented, never computed.** Every total comes from the API, exactly as upstream.
- **Do not edit a ported file's logic to work around the renderer.** Fix `src/ui` instead, or add
  the file to `HAND_WRITTEN` in `tools/port/port_from_web.py` with a comment saying why.

## Commands

```
npm install
npm start                                  # Expo; a = Android, i = iOS
npm run lint                               # tsc --noEmit
npm run check                              # markup and browser APIs React Native cannot render
npm run bundle                             # a full Metro build, the real smoke test
python tools/port/port_from_web.py [path]  # re-port from the web client
```

`npm run lint` does not catch a `<div>`: `@types/react` declares every HTML element whether or not
the renderer has one. `npm run check` is what catches it. **Run both.**

## Verifying a change

TypeScript passing is not evidence a screen renders. In order of strength:

1. `npm run lint && npm run check` — nothing obviously broken.
2. `npm run bundle` — every import resolves and `require.context` still finds the modules.
3. Open the screen on a device or emulator. This is the only real one.

Say which of these you actually did. Do not report a screen as working on the strength of a
typecheck.
