import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { Platform } from 'react-native'

/**
 * Printing a report, on a device.
 *
 * The web client prints the screen: an `@media print` block hides the chrome and the browser's own
 * dialog produces the sheet. Neither half exists here - there is no stylesheet and no print
 * dialog - so the report is described rather than styled, and the description is rendered to a
 * document the platform's print service takes.
 *
 * The description is deliberately a small model (`PrintDocument`) rather than the screen's own
 * markup. A screen renders React Native components; there is no way to turn those back into
 * something printable, and trying would mean maintaining two renderings of every report that
 * silently drift apart. So each report says what it *contains* - a title, a few labelled values, a
 * table or two - and this file decides how that looks on paper, once, for all of them.
 *
 * The HTML here never reaches a WebView. `expo-print` hands it to the operating system's own
 * printing pipeline, which rasterises it and shows the system print sheet.
 */

export interface PrintTable {
  caption?: string
  columns: string[]
  /** Already formatted; this file does no formatting of its own. */
  rows: string[][]
  /** Column indexes to right-align, for the figures. */
  numericColumns?: number[]
}

export interface PrintDocument {
  title: string
  subtitle?: string
  /** The labelled values that head the sheet: company, period, status. */
  meta?: { label: string; value: string }[]
  tables?: PrintTable[]
  /** Free text under the tables, e.g. a report's notes. */
  notes?: { label: string; value: string }[]
  /** The line printed at the foot of every page. */
  footer?: string
}

function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderTable(table: PrintTable): string {
  const numeric = new Set(table.numericColumns ?? [])

  const head = table.columns
    .map((column, index) => `<th class="${numeric.has(index) ? 'end' : ''}">${escape(column)}</th>`)
    .join('')

  const body = table.rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell, index) => `<td class="${numeric.has(index) ? 'end' : ''}">${escape(cell)}</td>`)
          .join('')}</tr>`,
    )
    .join('')

  return `
    ${table.caption ? `<h2>${escape(table.caption)}</h2>` : ''}
    <table>
      <thead><tr>${head}</tr></thead>
      <tbody>${body || `<tr><td colspan="${table.columns.length}">&mdash;</td></tr>`}</tbody>
    </table>`
}

/** The report as one printable page. */
export function renderPrintDocument(report: PrintDocument): string {
  const meta = (report.meta ?? [])
    .map((item) => `<div class="meta"><span>${escape(item.label)}</span><strong>${escape(item.value)}</strong></div>`)
    .join('')

  const notes = (report.notes ?? [])
    .filter((note) => note.value.trim().length > 0)
    .map((note) => `<h2>${escape(note.label)}</h2><p>${escape(note.value).replace(/\n/g, '<br>')}</p>`)
    .join('')

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>${escape(report.title)}</title>
<style>
  @page { margin: 16mm; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #181C32; font-size: 11pt; }
  h1 { font-size: 17pt; margin: 0 0 2mm; }
  h2 { font-size: 12pt; margin: 8mm 0 2mm; }
  .subtitle { color: #7E8299; margin: 0 0 6mm; }
  .meta-grid { display: flex; flex-wrap: wrap; gap: 4mm 10mm; margin-bottom: 6mm; }
  .meta span { display: block; color: #7E8299; font-size: 9pt; }
  .meta strong { font-size: 11pt; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4mm; }
  th, td { border-bottom: 1px solid #E4E6EF; padding: 2mm 2mm; text-align: left; vertical-align: top; }
  th { font-size: 9pt; text-transform: uppercase; color: #7E8299; }
  td.end, th.end { text-align: right; }
  tr { page-break-inside: avoid; }
  p { margin: 0 0 3mm; white-space: pre-wrap; }
  footer { margin-top: 8mm; color: #A1A5B7; font-size: 9pt; }
</style>
</head>
<body>
  <h1>${escape(report.title)}</h1>
  ${report.subtitle ? `<p class="subtitle">${escape(report.subtitle)}</p>` : ''}
  ${meta ? `<div class="meta-grid">${meta}</div>` : ''}
  ${(report.tables ?? []).map(renderTable).join('')}
  ${notes}
  ${report.footer ? `<footer>${escape(report.footer)}</footer>` : ''}
</body>
</html>`
}

/**
 * Hands a report to the platform.
 *
 * Android's print service and iOS's both take an HTML document directly, which is the whole of
 * `printAsync`. Where there is no print service - a simulator, a device with printing disabled -
 * the document is written to a PDF and offered through the share sheet instead, so the report can
 * still be sent on rather than the button doing nothing.
 */
export async function printReport(report: PrintDocument): Promise<void> {
  const html = renderPrintDocument(report)

  try {
    await Print.printAsync({ html })
  } catch {
    const { uri } = await Print.printToFileAsync({ html })

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: report.title,
        UTI: Platform.OS === 'ios' ? 'com.adobe.pdf' : undefined,
      })
    }
  }
}
