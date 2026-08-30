import { useState } from 'react'
import { Link, useParams } from '@/navigation/router'
import { useTranslation } from 'react-i18next'
import { Button, useToast } from '@/ui'
import { ErrorPanel, Spinner } from '@/components/DataTable'
import { errorMessage } from '@/api/http'
import { formatDate } from '@/utils/format'
import { useInvoiceDetail } from './api'
import { formatMoney, formatQuantity } from '@/utils/format'
import { printReport, type PrintDocument } from '@/utils/print'
import { Article, Div, H1, H2, HeaderTag, P, Section, Span, Strong, TBody, THead, Table, Td, Th, Tr } from '@/ui'

/**
 * Print-friendly view of a single invoice — the replacement for the legacy `FaturaPrint.aspx`.
 *
 * The page is a normal route inside the application shell. The web version prints itself: a
 * scoped `@media print` block hides everything but the invoice and the browser's dialog produces
 * the sheet. There is no stylesheet and no browser dialog here, so the sheet is described instead
 * (`@/utils/print`) and handed to the platform's own print service - which is also what makes it
 * shareable as a PDF, on a device that may well have no printer attached.
 *
 * Every amount is rendered from the DTO. The per-VAT-rate breakdown the legacy sheet printed is
 * deliberately absent: grouping and summing the lines in the browser would produce figures the
 * server never blessed, and no endpoint returns that breakdown. The net total, the VAT total,
 * the grand total and the grand total in words all come from `IInvoiceManager`.
 */
export default function InvoicePrintPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const invoiceId = Number(id)

  const toast = useToast()
  const [isPrinting, setPrinting] = useState(false)

  const { data, isLoading, error } = useInvoiceDetail(invoiceId)

  if (isLoading) return <Spinner />
  if (error) return <ErrorPanel message={errorMessage(error)} />
  if (!data) return <ErrorPanel message={t('errors.notFound')} />

  const invoice = data.invoice
  const none = t('common.none')
  const currency = t('finance.common.currency')

  const printDocument = (): PrintDocument => ({
    title: t('finance.invoice.print.title'),
    subtitle: t(`enums.invoiceType.${invoice.invoiceType}`),
    meta: [
      { label: t('finance.invoice.fields.invoiceNo'), value: invoice.invoiceNo || none },
      {
        label: t('finance.invoice.fields.invoiceDate'),
        value: formatDate(invoice.invoiceDate) ?? none,
      },
      { label: t('finance.invoice.fields.office'), value: data.office?.displayName ?? none },
      {
        label: t('finance.invoice.print.billedTo'),
        value: invoice.accountCurrentName || data.company?.displayName || none,
      },
    ],
    tables: [
      {
        columns: [
          t('finance.invoice.line.fields.orderNo'),
          t('finance.invoice.line.fields.description'),
          t('finance.invoice.line.fields.count'),
          t('finance.invoice.line.fields.unitPriceWithCurrency'),
          t('finance.invoice.line.fields.vatRate'),
          t('finance.invoice.line.fields.totalAmountWithCurrency'),
        ],
        numericColumns: [0, 2, 3, 4, 5],
        rows: data.lines.map((row) => [
          String(row.line.orderNo),
          [row.line.lineDescription, row.serviceItem?.displayName].filter(Boolean).join(' - '),
          `${formatQuantity(row.line.count) ?? none} ${row.line.unit ?? ''}`.trim(),
          formatMoney(row.line.unitPrice) ?? none,
          `%${row.line.vatRate}`,
          formatMoney(row.line.totalAmount) ?? none,
        ]),
      },
      {
        // Every figure comes from the DTO. Summing the lines here would produce a total the
        // server never blessed - the same rule the on-screen sheet follows.
        columns: ['', currency],
        numericColumns: [1],
        rows: [
          [t('finance.invoice.fields.total'), formatMoney(invoice.total) ?? none],
          [t('finance.invoice.fields.vatTotal'), formatMoney(invoice.vatTotal) ?? none],
          [t('finance.invoice.fields.generalTotal'), formatMoney(invoice.generalTotal) ?? none],
        ],
      },
    ],
    notes: [
      {
        label: t('finance.invoice.fields.invoiceDescription'),
        value: invoice.invoiceDescription ?? '',
      },
      {
        label: t('finance.invoice.fields.inWords'),
        value: invoice.inWords || t('finance.invoice.detail.inWordsPending'),
      },
    ],
  })

  async function print() {
    setPrinting(true)
    try {
      await printReport(printDocument())
    } catch {
      toast.info(t('reports.common.printUnavailable'))
    } finally {
      setPrinting(false)
    }
  }

  return (
    <>
      <Div className="d-flex flex-wrap gap-2 mb-4">
        <Link to={`/invoices/${invoiceId}`} className="btn btn-light">
          {t('common.back')}
        </Link>
        <Button variant="primary" loading={isPrinting} onClick={() => void print()}>
          {t('finance.invoice.print.action')}
        </Button>
      </Div>

      <Article id="invoice-print" className="card" aria-label={t('finance.invoice.print.title')}>
        <Div className="card-body">
          <HeaderTag className="d-flex flex-wrap justify-content-between gap-4 pb-4 mb-4"
            style={{ borderBottom: '2px solid var(--kt-gray-300)' }}
          >
            <Div>
              <H1 className="h4 fw-bold mb-1" style={{ color: 'var(--kt-gray-900)' }}>
                {t('finance.invoice.print.title')}
              </H1>
              <Div style={{ color: 'var(--kt-gray-600)' }}>
                {t(`enums.invoiceType.${invoice.invoiceType}`)}
              </Div>
            </Div>
            <Div className="mb-0" style={{ minWidth: 240 }}>
              <PrintTerm label={t('finance.invoice.fields.invoiceNo')}>
                {invoice.invoiceNo || none}
              </PrintTerm>
              <PrintTerm label={t('finance.invoice.fields.invoiceDate')}>
                {formatDate(invoice.invoiceDate) ?? none}
              </PrintTerm>
              <PrintTerm label={t('finance.invoice.fields.office')}>
                {data.office?.displayName ?? none}
              </PrintTerm>
            </Div>
          </HeaderTag>

          <Section className="mb-4">
            <H2 className="h6 fw-semibold mb-2" style={{ color: 'var(--kt-gray-600)' }}>
              {t('finance.invoice.print.billedTo')}
            </H2>
            <P className="mb-0 fw-semibold" style={{ color: 'var(--kt-gray-900)', fontSize: '1.0625rem' }}>
              {invoice.accountCurrentName || data.company?.displayName || none}
            </P>
            {data.company && (
              <P className="mb-0" style={{ color: 'var(--kt-gray-600)' }}>
                {data.company.displayName}
              </P>
            )}
          </Section>

          <Div className="table-responsive">
            <Table
              className="table align-middle"
              aria-label={t('finance.invoice.detail.linesSection')}
            >
              <THead>
                <Tr>
                  <Th scope="col" style={{ width: '48px' }}>
                    {t('finance.invoice.line.fields.orderNo')}
                  </Th>
                  <Th scope="col">{t('finance.invoice.line.fields.description')}</Th>
                  <Th scope="col" className="text-end">
                    {t('finance.invoice.line.fields.count')}
                  </Th>
                  <Th scope="col" className="text-end">
                    {t('finance.invoice.line.fields.unitPriceWithCurrency')}
                  </Th>
                  <Th scope="col" className="text-end">
                    {t('finance.invoice.line.fields.vatRate')}
                  </Th>
                  <Th scope="col" className="text-end">
                    {t('finance.invoice.line.fields.totalAmountWithCurrency')}
                  </Th>
                </Tr>
              </THead>
              <TBody>
                {data.lines.length === 0 && (
                  <Tr>
                    <Td colSpan={6} className="text-center py-4" style={{ color: 'var(--kt-gray-500)' }}>
                      {t('finance.invoice.line.empty')}
                    </Td>
                  </Tr>
                )}
                {data.lines.map((row) => (
                  <Tr key={row.line.id}>
                    <Td>{row.line.orderNo}</Td>
                    <Td>
                      {row.line.lineDescription}
                      {row.serviceItem && (
                        <Span className="d-block" style={{ color: 'var(--kt-gray-500)', fontSize: '0.8125rem' }}>
                          {row.serviceItem.displayName}
                        </Span>
                      )}
                    </Td>
                    <Td className="text-end" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatQuantity(row.line.count) ?? none} {row.line.unit}
                    </Td>
                    <Td className="text-end" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(row.line.unitPrice) ?? none}
                    </Td>
                    <Td className="text-end">%{row.line.vatRate}</Td>
                    <Td className="text-end fw-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(row.line.totalAmount) ?? none}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Div>

          <Div className="d-flex flex-wrap justify-content-between gap-4 mt-4">
            <Div style={{ flex: '1 1 260px' }}>
              {invoice.invoiceDescription && (
                <>
                  <H2 className="h6 fw-semibold mb-1" style={{ color: 'var(--kt-gray-600)' }}>
                    {t('finance.invoice.fields.invoiceDescription')}
                  </H2>
                  <P style={{ color: 'var(--kt-gray-800)' }}>{invoice.invoiceDescription}</P>
                </>
              )}
              <H2 className="h6 fw-semibold mb-1" style={{ color: 'var(--kt-gray-600)' }}>
                {t('finance.invoice.fields.inWords')}
              </H2>
              <P className="fw-semibold mb-0" style={{ color: 'var(--kt-gray-900)' }}>
                {invoice.inWords || t('finance.invoice.detail.inWordsPending')}
              </P>
            </Div>

            <Table
              className="table table-sm mb-0"
              style={{ flex: '0 0 320px', width: 320 }}
              aria-label={t('finance.invoice.detail.totalsSection')}
            >
              <TBody>
                <Tr>
                  <Th scope="row" className="fw-normal" style={{ color: 'var(--kt-gray-600)' }}>
                    {t('finance.invoice.fields.total')} ({currency})
                  </Th>
                  <Td className="text-end" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(invoice.total) ?? none}
                  </Td>
                </Tr>
                <Tr>
                  <Th scope="row" className="fw-normal" style={{ color: 'var(--kt-gray-600)' }}>
                    {t('finance.invoice.fields.vatTotal')} ({currency})
                  </Th>
                  <Td className="text-end" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(invoice.vatTotal) ?? none}
                  </Td>
                </Tr>
                <Tr>
                  <Th scope="row" className="fw-bold" style={{ color: 'var(--kt-gray-900)' }}>
                    {t('finance.invoice.fields.generalTotal')} ({currency})
                  </Th>
                  <Td
                    className="text-end fw-bold"
                    style={{ color: 'var(--kt-gray-900)', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatMoney(invoice.generalTotal) ?? none}
                  </Td>
                </Tr>
              </TBody>
            </Table>
          </Div>
        </Div>
      </Article>
    </>
  )
}

function PrintTerm({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Div className="d-flex justify-content-between gap-3">
      <Strong className="fw-normal" style={{ color: 'var(--kt-gray-600)' }}>
        {label}
      </Strong>
      <Span className="mb-1 fw-semibold" style={{ color: 'var(--kt-gray-900)' }}>
        {children}
      </Span>
    </Div>
  )
}

