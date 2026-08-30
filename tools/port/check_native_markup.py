"""Fails when a ported screen still contains markup React Native cannot render.

Two things survive a port and are invisible to TypeScript, because `@types/react` declares every
HTML element whether or not the renderer has one and `lib.dom` declares every browser global:

1. **A lowercase HTML tag.** `<div>` typechecks and then throws at runtime with
   "Invariant Violation: View config getter callback for component `div` must be a function".
2. **A browser global.** `document`, `localStorage`, `alert`, `window.print` - all typed, none
   present.

The first is what this check is really for: it is the failure mode that hides behind a screen
nobody has opened yet, and there are ninety of them.

    python tools/port/check_native_markup.py
"""

from __future__ import annotations

import io
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE = os.path.join(ROOT, 'src')

# `@/ui/html` and `@/ui/dom` are the replacements; their own documentation names what they replace.
EXEMPT_FILES = {
    # The replacements themselves; their documentation names what they replace.
    'src/ui/html.tsx',
    'src/ui/dom.tsx',
    # Builds an HTML document for the platform's print service. That HTML never reaches a
    # renderer in this application - see the note at the top of the file.
    'src/utils/print.ts',
}

# Every HTML element. Matching a fixed list rather than "any lowercase tag" is what keeps a
# TypeScript generic - `useState<number>`, `Promise<void>` - out of the results.
HTML_TAGS = """
a abbr address area article aside audio b base bdi bdo blockquote body br button canvas caption
cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset
figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html i iframe img input ins
kbd label legend li link main map mark menu meta meter nav noscript object ol optgroup option
output p param picture pre progress q rp rt ruby s samp script section select slot small source
span strong style sub summary sup table tbody td template textarea tfoot th thead time title tr
track u ul video wbr
""".split()

# `<title>` and `<map>` are also plausible type names; neither is used as one in this repository.
JSX_TAG = re.compile(r'</?(' + '|'.join(sorted(HTML_TAGS, key=len, reverse=True)) + r')(?=[\s/>])')

BROWSER_GLOBALS = re.compile(
    r'(?<![\w.])(?:document\.(?:getElementById|querySelector|createElement|addEventListener|body|head|documentElement|title|cookie)'
    r'|localStorage\.|sessionStorage\.|window\.(?:print|location|open|alert|innerHeight|innerWidth|addEventListener|removeEventListener)'
    r'|URL\.createObjectURL|navigator\.(?:languages|clipboard|userAgent))'
)

COMMENT = re.compile(r'^\s*(?:\*|//|/\*)')


def relative(path: str) -> str:
    return os.path.relpath(path, ROOT).replace('\\', '/')


def scan() -> list[str]:
    problems: list[str] = []

    for root, _directories, files in os.walk(SOURCE):
        for name in sorted(files):
            if not name.endswith(('.ts', '.tsx')):
                continue

            path = os.path.join(root, name)
            shown = relative(path)
            if shown in EXEMPT_FILES:
                continue

            with io.open(path, encoding='utf-8') as handle:
                lines = handle.readlines()

            for number, line in enumerate(lines, start=1):
                if COMMENT.match(line):
                    continue

                for match in JSX_TAG.finditer(line):
                    problems.append(
                        f'{shown}:{number}: <{match.group(1)}> is not a React Native component'
                    )

                if BROWSER_GLOBALS.search(line):
                    problems.append(f'{shown}:{number}: browser API - {line.strip()[:90]}')

    return problems


if __name__ == '__main__':
    found = scan()

    for problem in found:
        print(problem)

    print(f'{len(found)} problem(s).')
    sys.exit(1 if found else 0)
