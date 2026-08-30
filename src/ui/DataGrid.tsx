import { Fragment, type ReactNode } from 'react'
import { ScrollView, Text as RNText, View, useWindowDimensions } from 'react-native'
import { withText } from './html'
import { useTheme } from './theme'

/**
 * The list primitive.
 *
 * The web `DataGrid` draws a `<table>`: one header row, one row per record, columns sized by the
 * page. A phone is three hundred and ninety points wide and this application's tables are eight
 * columns across, so the same markup would be a horizontal scroll through a wall of clipped text.
 *
 * So the grid has two presentations of the same column model, and picks by width:
 *
 * - **Narrow** - one card per record, each column rendered as a label and its value. Nothing is
 *   dropped: every column the page declared is still shown, in the order it declared them, which
 *   is what keeps this a port rather than a redesign.
 * - **Wide** (a tablet, or a phone in landscape) - the real table, scrolling sideways when the
 *   columns need more room than there is.
 *
 * `render`, `field`, `formatter`, `align` and `width` keep their meanings, so the column arrays
 * the pages already declare are passed through untouched.
 */

export type DataGridAlign = 'start' | 'center' | 'end'

export interface DataGridColumn<T> {
  key: string
  header: ReactNode
  field?: keyof T & string
  render?: (row: T) => ReactNode
  formatter?: (value: unknown, row: T) => ReactNode
  align?: DataGridAlign
  width?: string
}

export interface DataGridProps<T> {
  columns: DataGridColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  emptyText?: ReactNode
  /** Forces the table presentation, for a screen that has already made room for it. */
  layout?: 'auto' | 'table' | 'stacked'
}

const TEXT_ALIGN = { start: 'left', center: 'center', end: 'right' } as const

/** The width the table presentation needs before it is worth showing. */
const TABLE_BREAKPOINT = 760

function cellContent<T>(column: DataGridColumn<T>, row: T): ReactNode {
  if (column.render) return column.render(row)

  const value = column.field ? (row as Record<string, unknown>)[column.field] : undefined
  if (column.formatter) return column.formatter(value, row)

  return value === null || value === undefined ? '' : String(value)
}

export function DataGrid<T>({ columns, rows, rowKey, emptyText, layout = 'auto' }: DataGridProps<T>) {
  const theme = useTheme()
  const { width } = useWindowDimensions()

  const asTable = layout === 'table' || (layout === 'auto' && width >= TABLE_BREAKPOINT)

  if (rows.length === 0) {
    return emptyText ? (
      <View style={{ paddingVertical: 32, alignItems: 'center' }}>
        {withText(emptyText, { color: theme['gray-500'], fontSize: 14 })}
      </View>
    ) : null
  }

  return asTable ? (
    <TableLayout columns={columns} rows={rows} rowKey={rowKey} />
  ) : (
    <StackedLayout columns={columns} rows={rows} rowKey={rowKey} />
  )
}

/** One card per record: every column as a label and its value. */
function StackedLayout<T>({ columns, rows, rowKey }: Omit<DataGridProps<T>, 'emptyText' | 'layout'>) {
  const theme = useTheme()

  return (
    <View style={{ gap: 10 }}>
      {rows.map((row) => (
        <View
          key={rowKey(row)}
          style={{
            borderWidth: 1,
            borderColor: theme['border-color'],
            borderRadius: 10,
            padding: 12,
            gap: 8,
            backgroundColor: theme['card-bg'],
          }}
        >
          {columns.map((column, index) => {
            const content = cellContent(column, row)
            // The first column is the record's own name in every table in this application, so it
            // is given the card's heading rather than a label of its own.
            const isTitle = index === 0

            return (
              <View
                key={column.key}
                style={
                  isTitle
                    ? undefined
                    : { flexDirection: 'row', alignItems: 'flex-start', gap: 12, justifyContent: 'space-between' }
                }
              >
                {isTitle ? null : (
                  <RNText style={{ color: theme['gray-500'], fontSize: 12, flexShrink: 0, maxWidth: '45%' }}>
                    {column.header}
                  </RNText>
                )}
                <View style={{ flexShrink: 1, alignItems: isTitle ? 'flex-start' : 'flex-end' }}>
                  {withText(content, {
                    color: isTitle ? theme['gray-900'] : theme['gray-800'],
                    fontSize: isTitle ? 16 : 14,
                    fontWeight: isTitle ? '600' : '400',
                    textAlign: isTitle ? 'left' : 'right',
                  })}
                </View>
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}

/** The real table, scrolling sideways when it has to. */
function TableLayout<T>({ columns, rows, rowKey }: Omit<DataGridProps<T>, 'emptyText' | 'layout'>) {
  const theme = useTheme()

  const columnStyle = (column: DataGridColumn<T>) => ({
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 110,
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems:
      column.align === 'end' ? ('flex-end' as const)
      : column.align === 'center' ? ('center' as const)
      : ('flex-start' as const),
  })

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ minWidth: '100%' }}>
        <View
          style={{
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: theme['border-color'],
            backgroundColor: theme['gray-100'],
          }}
        >
          {columns.map((column) => (
            <View key={column.key} style={columnStyle(column)}>
              <RNText
                style={{
                  color: theme['gray-600'],
                  fontSize: 12,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  textAlign: TEXT_ALIGN[column.align ?? 'start'],
                }}
              >
                {column.header}
              </RNText>
            </View>
          ))}
        </View>

        {rows.map((row) => (
          <View
            key={rowKey(row)}
            style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme['border-color'] }}
          >
            {columns.map((column) => (
              <View key={column.key} style={columnStyle(column)}>
                {withText(cellContent(column, row), {
                  color: theme['gray-800'],
                  fontSize: 14,
                  textAlign: TEXT_ALIGN[column.align ?? 'start'],
                })}
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

export { Fragment }
