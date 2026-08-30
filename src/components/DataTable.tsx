import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  DataGrid,
  PageHeader,
  Skeleton,
  Spinner as RichSpinner,
  type DataGridAlign,
  type DataGridColumn,
} from '@/ui'
import { formatDate, formatDateTime, formatMoney, formatNumber } from '@/utils/format'
import { Button, Div, Nav, Span } from '@/ui'

/**
 * List-screen primitives.
 *
 * `@/ui` owns the markup - `DataGrid`, `PageHeader`, `Spinner`, `Alert` - and this module owns
 * what it deliberately does not: the Turkish and English copy. The library ships no words in any
 * language, so the states that carry words are rendered here and only the wordless ones are
 * handed to it.
 *
 * The exported names and their props are unchanged, so every module page keeps working.
 */

/**
 * Presentation of a plain field value.
 *
 * Deliberately this application's own set rather than the grid's `format`
 * prop: the library's built-in formatters hard-code US dollars and the English
 * words "Yes"/"No", and read the browser's locale rather than the language the
 * user actually selected. The declarative column path is worth having — it is
 * the aligned, wrapped cell without a callback — so it is kept and pointed at
 * `@/utils/format`, which already formats in the active language and in TRY.
 */
export type ColumnFormat = 'text' | 'date' | 'dateTime' | 'money' | 'number' | 'boolean'

interface ColumnBase {
  /** Stable identifier used as the React key — never shown to the user. */
  key: string
  /** Already translated column header. */
  header: string
  width?: string
  align?: DataGridAlign
}

/**
 * A column either reads a field or renders itself — never both.
 *
 * Expressed as a union so the compiler rejects the ambiguous middle case
 * instead of the grid silently preferring one over the other.
 */
export type Column<T> =
  | (ColumnBase & {
      render: (row: T) => ReactNode
      field?: never
      format?: never
    })
  | (ColumnBase & {
      /** Row property this column shows, checked against the row type. */
      field: keyof T & string
      /** Defaults to `text`. */
      format?: ColumnFormat
      render?: never
    })

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string | number
  isLoading?: boolean
  error?: string | null
  /** Overrides the default `table.empty` text. */
  emptyMessage?: string
  /** Accessible name of the table. */
  label: string
  /** Placeholder rows drawn while loading. Defaults to five. */
  skeletonRows?: number
}

/** One placeholder row. The grid needs a row object; nothing is read off it but the key. */
interface PlaceholderRow {
  key: number
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  error,
  emptyMessage,
  label,
  skeletonRows = 5,
}: DataTableProps<T>) {
  const { t } = useTranslation()

  // Loading and failure are rendered here rather than through the grid's own `loading` / `error`
  // props: those render an English "Loading…" and a bare red row.
  //
  // Loading draws the real grid with placeholder cells rather than a spinner in an empty box, so
  // the column headers are readable while the rows arrive and the page does not jump once they do.
  if (isLoading) {
    const placeholders: PlaceholderRow[] = Array.from(
      { length: skeletonRows }, (_, index) => ({ key: index }))

    const placeholderColumns: DataGridColumn<PlaceholderRow>[] = columns.map((column) => ({
      key: column.key,
      header: column.header,
      align: column.align,
      width: column.width,
      render: (row) => <Skeleton width={row.key % 3 === 2 ? '55%' : '80%'} height="1rem" />,
    }))

    return (
      <Div role="group" aria-label={label}>
        <Span className="visually-hidden" role="status">
          {t('common.loading')}
        </Span>
        <DataGrid
          columns={placeholderColumns}
          rows={placeholders}
          rowKey={(row) => row.key}
          emptyText=""
        />
      </Div>
    )
  }

  if (error) return <ErrorPanel message={error} flush />

  const gridColumns: DataGridColumn<T>[] = columns.map((column) =>
    column.render
      ? {
          key: column.key,
          header: column.header,
          align: column.align,
          width: column.width,
          render: column.render,
        }
      : {
          key: column.key,
          field: column.field,
          header: column.header,
          // Figures line up on the right unless the caller says otherwise;
          // everything else keeps the grid's own default.
          align: column.align ?? (isNumeric(column.format) ? 'end' : undefined),
          width: column.width,
          formatter: (value) => present(value, column.format, t),
        },
  )

  return (
    <Div role="group" aria-label={label}>
      <DataGrid
        columns={gridColumns}
        rows={rows ?? []}
        rowKey={rowKey}
        emptyText={emptyMessage ?? t('table.empty')}
      />
    </Div>
  )
}

/** Right-aligned formats — the ones that read as a quantity rather than a word. */
function isNumeric(format: ColumnFormat | undefined) {
  return format === 'money' || format === 'number'
}

/**
 * A field value as text, in the active language.
 *
 * Missing is rendered as the shared em-dash placeholder rather than an empty
 * cell, so a blank column reads as "no value" instead of as a layout fault.
 */
function present(
  value: unknown,
  format: ColumnFormat | undefined,
  t: (key: string) => string,
): ReactNode {
  if (value === null || value === undefined || value === '') return t('common.none')

  switch (format) {
    case 'date':
      return formatDate(String(value)) ?? t('common.none')
    case 'dateTime':
      return formatDateTime(String(value)) ?? t('common.none')
    case 'money':
      return formatMoney(Number(value)) ?? t('common.none')
    case 'number':
      return formatNumber(Number(value)) ?? t('common.none')
    case 'boolean':
      return value ? t('common.yes') : t('common.no')
    default:
      return String(value)
  }
}

/** Centred loading indicator with a translated screen-reader label. */
export function Spinner() {
  const { t } = useTranslation()
  return (
    <Div className="text-center py-5">
      <RichSpinner label={t('common.loading')} />
    </Div>
  )
}

interface PaginationProps {
  total: number
  page: number
  pageSize: number
  onPageChange: (nextPage: number) => void
}

/**
 * The pager under a list.
 *
 * Drawn here rather than taken from the component library for the reason it always was: the
 * library's "Previous" and "Next" are English literals with no prop to change them, and a
 * Turkish-first product cannot ship an English pager.
 *
 * What is different on a phone is the disabled state. The web version puts Bootstrap's
 * `.page-item.disabled` on the list item, which stops the click through CSS; there is no CSS here,
 * so a control that must not act has to actually refuse - otherwise the first page's "previous"
 * would ask the server for page zero.
 */
export function Pagination({ total, page, pageSize, onPageChange }: PaginationProps) {
  const { t } = useTranslation()

  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  if (pageCount <= 1) return null

  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <Div className="pt-3" style={{ gap: 10 }}>
      <Span style={{ color: 'var(--kt-gray-500)', fontSize: '0.875rem' }}>
        {t('pagination.summary', { total, first, last })}
      </Span>

      <Nav aria-label={t('pagination.label')} className="d-flex align-items-center gap-2">
        <Button
          variant="light"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {t('pagination.previous')}
        </Button>

        <Span className="flex-grow-1 text-center" style={{ color: 'var(--kt-gray-600)', fontSize: '0.875rem' }}>
          {t('pagination.position', { page, pageCount })}
        </Span>

        <Button
          variant="light"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          {t('pagination.next')}
        </Button>
      </Nav>
    </Div>
  )
}

export function PageTitle({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return <PageHeader title={title} description={description} actions={action} />
}

/** Inline error panel used by pages that render outside a DataTable. */
export function ErrorPanel({ message, flush }: { message: string; flush?: boolean }) {
  return (
    <Alert variant="danger" className={flush ? 'm-0' : undefined}>
      {message}
    </Alert>
  )
}
