import { useMemo, useState } from 'react'
import { Link, useParams } from '@/navigation/router'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, type BadgeVariant } from '@/ui'
import DataTable, { ErrorPanel, PageTitle, Spinner, type Column } from '@/components/DataTable'
import { errorMessage } from '@/api/http'
import { ConfirmDialog } from '@/components/Form'
import { formatDate, formatNumber } from '@/utils/format'
import YearEndReviewFormModal from './YearEndReviewFormModal'
import YearEndReviewLineFormModal, { type ParentOption } from './YearEndReviewLineFormModal'
import {
  useRemoveYearEndReviewLine,
  useYearEndReviewDetail,
  type YearEndReviewLineDto,
  type YearEndReviewLineNavigationDto,
} from './api'
import {
  DistributionRow,
  EmptyHint,
  PrintButton,
  ReportPeriodBanner,
  ReportPrintStyles,
  RowActions,
  Term,
  percentOf,
} from './components'
import type { PrintDocument } from '@/utils/print'
import { Div, H2, Li, Nav, Ol, P, Span } from '@/ui'

/** A work item paired with its depth, so the tree can be rendered as an indented table. */
interface FlatLine {
  line: YearEndReviewLineDto
  depth: number
}

/** Depth-first walk of the work item tree; the API already returns each level in order. */
function flatten(nodes: YearEndReviewLineNavigationDto[], depth = 0): FlatLine[] {
  return nodes.flatMap((node) => [
    { line: node.line, depth },
    ...flatten(node.childActivities, depth + 1),
  ])
}

/**
 * Year-end review report detail — `/reports/year-end/:id`.
 *
 * This is a statutory document, so the workplace and the reporting date lead the page and the
 * printout. One request (`GET api/year-end-review-report/{id}/detail`) returns the header, the
 * workplace and the whole work item tree, which is flattened here for display — no request is
 * made per node.
 */
export default function YearEndReviewDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const reportId = Number(id)

  const [isEditing, setIsEditing] = useState(false)
  const [addingUnder, setAddingUnder] = useState<{ parentId?: number } | undefined>()
  const [editingLine, setEditingLine] = useState<YearEndReviewLineDto | undefined>()
  const [pendingDelete, setPendingDelete] = useState<YearEndReviewLineDto | undefined>()

  const detail = useYearEndReviewDetail(reportId)
  const removeLine = useRemoveYearEndReviewLine(reportId)

  const flatLines = useMemo(() => flatten(detail.data?.activities ?? []), [detail.data])

  const parentOptions: ParentOption[] = useMemo(
    () =>
      flatLines.map((item) => ({
        id: item.line.id,
        label: item.line.work || `#${item.line.id}`,
        depth: item.depth,
      })),
    [flatLines],
  )

  if (detail.isLoading) return <Spinner />
  if (detail.error) return <ErrorPanel message={errorMessage(detail.error)} />
  if (!detail.data) return <ErrorPanel message={t('errors.notFound')} />

  const report = detail.data.yearEndReviewReport
  const companyName =
    detail.data.company?.displayName ??
    t('reports.common.companyFallback', { id: report.companyId })

  const workforce: { key: string; value: number; variant: BadgeVariant }[] = [
    { key: 'maleWorker', value: report.maleWorker ?? 0, variant: 'primary' },
    { key: 'femaleWorker', value: report.femaleWorker ?? 0, variant: 'info' },
    { key: 'youngWorker', value: report.youngWorker ?? 0, variant: 'warning' },
    { key: 'childWorker', value: report.childWorker ?? 0, variant: 'danger' },
  ]
  const headcount = (report.maleWorker ?? 0) + (report.femaleWorker ?? 0)

  const printDocument = (): PrintDocument => ({
    title: report.reportTitle || t('reports.yearEnd.fallbackTitle'),
    subtitle: t('reports.yearEnd.detail.description'),
    meta: [
      { label: t('reports.yearEnd.fields.company'), value: companyName },
      {
        label: t('reports.yearEnd.fields.reportDate'),
        value: formatDate(report.reportDate) ?? t('common.none'),
      },
      {
        label: t('reports.yearEnd.fields.status'),
        value: report.isActive ? t('common.active') : t('common.passive'),
      },
      ...workforce.map((item) => ({
        label: t(`reports.yearEnd.fields.${item.key}`),
        value: String(item.value),
      })),
    ],
    tables: [
      {
        columns: [
          t('reports.yearEnd.fields.work'),
          t('reports.yearEnd.fields.date'),
          t('reports.yearEnd.fields.personAndTitle'),
          t('reports.yearEnd.fields.repeatCount'),
          t('reports.yearEnd.fields.usedMethod'),
          t('reports.yearEnd.fields.resultAndComment'),
        ],
        // The tree prints as it is shown: indented by depth, so a child still reads as a child.
        rows: flatLines.map((item) => [
          `${'    '.repeat(item.depth)}${item.line.work || ''}`,
          formatDate(item.line.date) ?? '',
          item.line.personAndTitle || '',
          item.line.repeatCount || '',
          item.line.usedMethod || '',
          item.line.resultAndComment || '',
        ]),
      },
    ],
  })

  const columns: Column<FlatLine>[] = [
    {
      key: 'work',
      header: t('reports.yearEnd.fields.work'),
      render: (item) => (
        <Span style={{ paddingInlineStart: item.depth * 20 }}>
          {item.depth > 0 && (
            <Span aria-hidden="true" style={{ color: 'var(--kt-gray-400)' }}>
              ↳{' '}
            </Span>
          )}
          <Span className={item.depth === 0 ? 'fw-semibold' : undefined}>
            {item.line.work || t('common.none')}
          </Span>
        </Span>
      ),
    },
    {
      key: 'date',
      header: t('reports.yearEnd.fields.date'),
      render: (item) => formatDate(item.line.date) ?? t('common.none'),
    },
    {
      key: 'personVeTitle',
      header: t('reports.yearEnd.fields.personVeTitle'),
      render: (item) => item.line.personAndTitle || t('common.none'),
    },
    {
      key: 'repeatCount',
      header: t('reports.yearEnd.fields.repeatCount'),
      align: 'end',
      render: (item) => item.line.repeatCount || t('common.none'),
    },
    {
      key: 'usedMethod',
      header: t('reports.yearEnd.fields.usedMethod'),
      render: (item) => item.line.usedMethod || t('common.none'),
    },
    {
      key: 'resultVeComment',
      header: t('reports.yearEnd.fields.resultVeComment'),
      render: (item) => item.line.resultAndComment || t('common.none'),
    },
    {
      key: 'status',
      header: t('reports.yearEnd.fields.status'),
      align: 'center',
      render: (item) => (
        <Badge variant={item.line.isActive ? 'success' : 'danger'}>
          {item.line.isActive ? t('common.active') : t('common.passive')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      align: 'end',
      render: (item) => (
        <RowActions
          editLabel={t('reports.yearEnd.lineActions.edit', {
            name: item.line.work || `#${item.line.id}`,
          })}
          deleteLabel={t('reports.yearEnd.lineActions.delete', {
            name: item.line.work || `#${item.line.id}`,
          })}
          onEdit={() => setEditingLine(item.line)}
          onDelete={() => setPendingDelete(item.line)}
          extra={
            <Button variant="light" size="sm"
              aria-label={t('reports.yearEnd.lineActions.addChild', {
                name: item.line.work || `#${item.line.id}`,
              })}
              title={t('reports.yearEnd.detail.addChild')}
              onClick={() => setAddingUnder({ parentId: item.line.id })}
            >
              <Span aria-hidden="true">＋</Span>
            </Button>
          }
        />
      ),
    },
  ]

  return (
    <Div className="report-print">
      <ReportPrintStyles />

      <Nav aria-label={t('nav.breadcrumb')} className="mb-3 d-print-none">
        <Ol className="breadcrumb mb-0" style={{ fontSize: '0.875rem' }}>
          <Li className="breadcrumb-item">
            <Link to="/reports/year-end" className="text-decoration-none">
              {t('reports.yearEnd.title')}
            </Link>
          </Li>
          <Li className="breadcrumb-item active" aria-current="page">
            {report.reportTitle}
          </Li>
        </Ol>
      </Nav>

      <PageTitle
        title={report.reportTitle || t('reports.yearEnd.fallbackTitle')}
        description={t('reports.yearEnd.detail.description')}
        action={
          <Div className="d-flex gap-2">
            <PrintButton document={printDocument} />
            <Button variant="light" className="d-print-none"
              onClick={() => setIsEditing(true)}
            >
              {t('common.edit')}
            </Button>
          </Div>
        }
      />

      <ReportPeriodBanner
        companyLabel={t('reports.yearEnd.fields.company')}
        companyName={companyName}
        periodLabel={t('reports.yearEnd.fields.reportDate')}
        periodValue={formatDate(report.reportDate) ?? t('common.none')}
        extraLabel={t('reports.yearEnd.fields.status')}
        extraValue={report.isActive ? t('common.active') : t('common.passive')}
      />

      <Div className="row g-4 mb-4">
        <Div className="col-12 col-xl-7">
          <Card
            className="h-100"
            header={
              <H2 className="card-title h6 mb-0 report-print-heading">
                {t('reports.yearEnd.detail.headerTitle')}
              </H2>
            
            }
          >
              <Div className="row mb-0" style={{ fontSize: '0.9375rem' }}>
                <Term label={t('reports.yearEnd.fields.reportTitle')}>{report.reportTitle}</Term>
                <Term label={t('reports.yearEnd.fields.company')}>{companyName}</Term>
                <Term label={t('reports.yearEnd.fields.reportDate')}>
                  {formatDate(report.reportDate) ?? t('common.none')}
                </Term>
                <Term label={t('reports.yearEnd.fields.specialistFullName')}>
                  {report.specialistFullName || t('common.none')}
                </Term>
                <Term label={t('reports.yearEnd.fields.physicianFullName')}>
                  {report.physicianFullName || t('common.none')}
                </Term>
                <Term label={t('reports.yearEnd.fields.deputyFullName')}>
                  {report.deputyFullName || t('common.none')}
                </Term>
                <Term label={t('reports.common.lineCount')}>{formatNumber(flatLines.length)}</Term>
              </Div>
            
          </Card>
        </Div>

        <Div className="col-12 col-xl-5">
          <Card
            className="h-100"
            header={
              <H2 className="card-title h6 mb-0 report-print-heading">
                {t('reports.yearEnd.detail.workforceTitle')}
              </H2>
            
            }
          >
              {headcount === 0 ? (
                <EmptyHint message={t('reports.yearEnd.detail.emptyWorkforce')} />
              ) : (
                <>
                  <P className="mb-3" style={{ color: 'var(--kt-gray-600)' }}>
                    {t('reports.yearEnd.detail.headcount', { value: formatNumber(headcount) })}
                  </P>
                  {workforce.map((item) => (
                    <DistributionRow
                      key={item.key}
                      label={t(`reports.yearEnd.fields.${item.key}`)}
                      value={item.value}
                      total={headcount}
                      variant={item.variant}
                      shareLabel={t('reports.common.percent', {
                        value: percentOf(item.value, headcount),
                      })}
                    />
                  ))}
                </>
              )}
            
          </Card>
        </Div>
      </Div>

      <Card
        
        header={
        <Div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <H2 className="card-title h6 mb-0 report-print-heading">
            {t('reports.yearEnd.detail.activitiesTitle')}
          </H2>
          <Button variant="primary" size="sm" className="d-print-none"
            onClick={() => setAddingUnder({ parentId: undefined })}
          >
            {t('reports.yearEnd.detail.addLine')}
          </Button>
        
        </Div>
        }
      >
          <DataTable
            label={t('reports.yearEnd.detail.activitiesTitle')}
            columns={columns}
            rows={flatLines}
            rowKey={(item) => item.line.id}
            emptyMessage={t('reports.yearEnd.detail.emptyActivities')}
          />
        
      </Card>

      {isEditing && (
        <YearEndReviewFormModal report={report} onClose={() => setIsEditing(false)} />
      )}
      {addingUnder && (
        <YearEndReviewLineFormModal
          reportId={reportId}
          defaultParentId={addingUnder.parentId}
          parents={parentOptions}
          onClose={() => setAddingUnder(undefined)}
        />
      )}
      {editingLine && (
        <YearEndReviewLineFormModal
          reportId={reportId}
          line={editingLine}
          parents={parentOptions}
          onClose={() => setEditingLine(undefined)}
        />
      )}

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title={t('reports.yearEnd.detail.deleteLineTitle')}
        message={t('reports.yearEnd.detail.deleteLineMessage')}
        isBusy={removeLine.isPending}
        error={removeLine.error ? errorMessage(removeLine.error) : null}
        onCancel={() => setPendingDelete(undefined)}
        onConfirm={() =>
          pendingDelete &&
          removeLine.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(undefined) })
        }
      />
    </Div>
  )
}
