"""Ports a screen from the web client into this application.

The React Native client is a port, not a rewrite: the same modules, the same data layer, the same
translation keys, the same screens. Most of what separates the two clients is mechanical - a
component library imported from a different path, a router imported from a different path, and
HTML element names that have to become React Native components - so it is done by a script rather
than by hand, once per file, reproducibly.

    python tools/port/port_from_web.py                # every portable file
    python tools/port/port_from_web.py pages/finance  # one module

What the script does NOT do is decide anything. A file it has touched still has to be read: a raw
`<input>`, a `<table>` laid out with column widths, a `document.` reference or a `window.` one are
all left exactly as they were, because the answer to each is a judgement about the screen rather
than a substitution. The files listed in `HAND_WRITTEN` are never touched at all - they are the
ones where the two clients genuinely differ.
"""

from __future__ import annotations

import io
import os
import re
import shutil
import sys

WEB = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..',
                                   'EnsaFromLegacyEnsa', 'react', 'ensa-web', 'src'))
NATIVE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

# Files whose two versions have nothing mechanical in common: browser storage against the keychain,
# a same-origin URL against a configured host, `import.meta.glob` against `require.context`.
HAND_WRITTEN = {
    'api/http.ts',
    'api/download.ts',
    'auth/tokenStore.ts',
    'auth/officeStore.ts',
    'i18n/index.ts',
    'modules/registry.ts',
    'components/DataTable.tsx',
    'components/Form.tsx',
    'components/ToastRegion.tsx',
    'layout/MainLayout.tsx',
    'layout/OfficeSwitcher.tsx',
    # A panel positioned against its trigger, closed by an outside click and returning focus to it.
    # Every one of those is a browser affordance; the native switcher opens a sheet instead.
    'layout/OfficeSwitcherPanel.tsx',
    'pages/LoginPage.tsx',
    'pages/documents/helpers.ts',
    'pages/documents/DocumentFormModal.tsx',
    # The screens that print. See `@/utils/print` for why the browser's print dialog has no
    # counterpart here and what replaces it.
    'pages/finance/InvoicePrintPage.tsx',
    'pages/reports/components.tsx',
    'pages/reports/ActivityReportDetailPage.tsx',
    'pages/reports/YearEndReviewDetailPage.tsx',
    'pages/reports/OhsReportPage.tsx',
    'App.tsx',
    'main.tsx',
}

SKIPPED_DIRECTORIES = {'styles'}

# `rich-react-component` is a web component library; `@/ui` is its surface, drawn natively.
IMPORT_REWRITES = [
    (re.compile(r"from 'rich-react-component'"), "from '@/ui'"),
    (re.compile(r"from 'react-router-dom'"), "from '@/navigation/router'"),
]

# One entry per HTML element the screens still use. The capitalised name is a real component in
# `@/ui/html`; JSX would otherwise read the lowercase tag as a native host component.
TAGS = {
    'div': 'Div', 'span': 'Span', 'p': 'P', 'strong': 'Strong', 'em': 'Span', 'b': 'Strong',
    'i': 'Span', 'small': 'Small', 'code': 'Code', 'pre': 'Code',
    'h1': 'H1', 'h2': 'H2', 'h3': 'H3', 'h4': 'H4', 'h5': 'H5', 'h6': 'H6',
    'ul': 'Ul', 'ol': 'Ol', 'li': 'Li', 'dl': 'Div', 'dt': 'Strong', 'dd': 'Span',
    'hr': 'Hr', 'br': 'Br',
    'section': 'Section', 'header': 'HeaderTag', 'footer': 'FooterTag', 'nav': 'Nav',
    'main': 'Main', 'article': 'Article', 'aside': 'Aside', 'figure': 'Div', 'figcaption': 'Span',
    'label': 'Label', 'form': 'FormTag', 'a': 'A',
    'fieldset': 'Fieldset', 'legend': 'Legend', 'datalist': 'Datalist', 'style': 'StyleBlock',
    'optgroup': 'Div',
    # The raw controls a few screens still use, with the DOM's own interface; see `@/ui/dom`.
    'input': 'NativeInput', 'select': 'NativeSelect', 'option': 'Option',
    'textarea': 'NativeTextArea', 'button': 'NativeButton',
    'table': 'Table', 'thead': 'THead', 'tbody': 'TBody', 'tfoot': 'TBody',
    'tr': 'Tr', 'th': 'Th', 'td': 'Td', 'caption': 'Span', 'colgroup': 'Div', 'col': 'Div',
}

TAG_PATTERN = re.compile(r'<(/?)(' + '|'.join(sorted(TAGS, key=len, reverse=True)) + r')(?=[\s/>])')

STYLESHEET_IMPORT = re.compile(r"^import '[^']+\.(?:s?css)'\n", re.MULTILINE)


def relative_paths() -> list[str]:
    """Every file under the web client's `src`, as forward-slashed relative paths."""
    out: list[str] = []
    for root, _directories, files in os.walk(WEB):
        for name in files:
            path = os.path.relpath(os.path.join(root, name), WEB).replace('\\', '/')
            out.append(path)
    return sorted(out)


def rewrite(source: str, is_jsx: bool) -> str:
    for pattern, replacement in IMPORT_REWRITES:
        source = pattern.sub(replacement, source)

    source = STYLESHEET_IMPORT.sub('', source)

    if not is_jsx:
        return source

    used: set[str] = set()

    def replace(match: re.Match[str]) -> str:
        component = TAGS[match.group(2)]
        used.add(component)
        return f'<{match.group(1)}{component}'

    source = TAG_PATTERN.sub(replace, source)

    if used:
        names = ', '.join(sorted(used))
        source = add_import(source, f"import {{ {names} }} from '@/ui'\n")

    return source


def add_import(source: str, statement: str) -> str:
    """Puts an import after the last existing one, so the block stays together."""
    matches = list(re.finditer(r"^import [\s\S]*?from '[^']+'\n", source, re.MULTILINE))
    if not matches:
        return statement + source

    end = matches[-1].end()
    return source[:end] + statement + source[end:]


def port(selection: str | None) -> None:
    copied = 0
    skipped: list[str] = []

    for path in relative_paths():
        if path in HAND_WRITTEN:
            skipped.append(path)
            continue
        if path.split('/')[0] in SKIPPED_DIRECTORIES:
            skipped.append(path)
            continue
        if selection and not path.startswith(selection):
            continue

        target = os.path.join(NATIVE, path.replace('/', os.sep))
        os.makedirs(os.path.dirname(target), exist_ok=True)

        if path.endswith(('.ts', '.tsx')):
            with io.open(os.path.join(WEB, path), encoding='utf-8') as handle:
                source = handle.read()
            with io.open(target, 'w', encoding='utf-8', newline='\n') as handle:
                handle.write(rewrite(source, path.endswith('.tsx')))
        else:
            shutil.copyfile(os.path.join(WEB, path), target)

        copied += 1

    print(f'{copied} file(s) ported.')
    if skipped:
        print('Hand-written, left alone: ' + ', '.join(skipped))


if __name__ == '__main__':
    if not os.path.isdir(WEB):
        raise SystemExit(f'The web client was not found at {WEB}.')
    port(sys.argv[1] if len(sys.argv) > 1 else None)
