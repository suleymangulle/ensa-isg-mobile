import { useState } from 'react'
import { Link, useParams } from '@/navigation/router'
import { useTranslation } from 'react-i18next'
import { Button, Card } from '@/ui'
import DataTable, { ErrorPanel, PageTitle, Spinner, type Column } from '@/components/DataTable'
import { errorMessage } from '@/api/http'
import { ConfirmDialog } from '@/components/Form'
import { formatDate, formatNumber } from '@/utils/format'
import type { PrintDocument } from '@/utils/print'
import ActivityReportFormModal from './ActivityReportFormModal'
import ActivityReportLineFormModal from './ActivityReportLineFormModal'
import {
  useActivityReportDetail,
  useRemoveActivityReportLine,
  type ActivityReportLineDto,
} from './api'
import {
  PrintButton,
  ReportPrintStyles,
  ReportPeriodBanner,
  RowActions,
  Term,
} from './components'
import { Div, H2, Li, Nav, Ol, Span } from '@/ui'

/**
 * Activity report detail — `/reports/activities/:id`.
 *
 * One request (`GET api/activity-report/{id}/detail`) brings the header, the workplace and every
 * data row, so the line table costs nothing per row. The layout prints: the toolbar and the row
 * actions carry `d-print-none` and `ReportPrintStyles` flattens the cards.
 */
export default function ActivityReportDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const reportId = Number(id)

  const [isEditing, setIsEditing] = useState(false)
  const [isAddingLine, setIsAddingLine] = useState(false)
  const [editingLine, setEditingLine] = useState<ActivityReportLineDto | undefined>()
  const [pendingDelete, setPendingDelete] = useState<ActivityReportLineDto | undefined>()

  const detail = useActivityReportDetail(reportId)
  const removeLine = useRemoveActivityReportLine(reportId)

  if (detail.isLoading) return <Spinner />
  if (detail.error) return <ErrorPanel message={errorMessage(detail.error)} />
  if (!detail.data) return <ErrorPanel message={t('errors.notFound')} />

  const report = detail.data.activityReport
  const companyName = detail.data.company?.displayName ?? t('reports.common.companyFallback', {
    id: report.companyId,
  })

  const printDocument = (): PrintDocument => ({
    title: report.reportName || t('reports.activity.fallbackTitle'),
    subtitle: t(`enums.activityReportType.${report.reportType}`),
    meta: [
      { label: t('reports.activity.fields.company'), value: companyName },
      {
        label: t('reports.common.period'),
        value: t('reports.common.periodRange', {
          from: formatDate(report.reportStart) ?? t('common.none'),
          to: formatDate(report.reportEnd) ?? t('common.none'),
        }),
      },
      { label: t('reports.common.lineCount'), value: formatNumber(detail.data.lines.length) ?? '0' },
    ],
    tables: [
      {
        columns: [
          t('reports.activity.fields.orderNo'),
          t('reports.activity.fields.lineType'),
          t('reports.activity.fields.text'),
          t('reports.activity.fields.value1'),
          t('reports.activity.fields.value2'),
          t('reports.activity.fields.value3'),
        ],
        numericColumns: [0],
        rows: detail.data.lines.map((line) => [
          formatNumber(line.orderNo) ?? '',
          t(`enums.activityReportLineType.${line.lineType}`),
          line.text || '',
          line.value1 || '',
          line.value2 || '',
          line.value3 || '',
        ]),
      },
    ],
  })

  const columns: Column<ActivityReportLineDto>[] = [
    {
      key: 'orderNo',
      header: t('reports.activity.fields.orderNo'),
      width: '80px',
      align: 'end',
      render: (line) => formatNumber(line.orderNo),
    },
    {
      key: 'lineType',
      header: t('reports.activity.fields.lineType'),
      render: (line) => (
        <Span className="fw-semibold">{t(`enums.activityReportLineType.${line.lineType}`)}</Span>
      ),
    },
    {
      key: 'text',
      header: t('reports.activity.fields.text'),
      render: (line) => line.text || t('common.none'),
    },
    {
      key: 'value1',
      header: t('reports.activity.fields.value1'),
      render: (line) => line.value1 || t('common.none'),
    },
    {
      key: 'value2',
      header: t('reports.activity.fields.value2'),
      render: (line) => line.value2 || t('common.none'),
    },
    {
      key: 'value3',
      header: t('reports.activity.fields.value3'),
      render: (line) => line.value3 || t('common.none'),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      align: 'end',
      render: (line) => (
        <RowActions
          editLabel={t('reports.activity.lineActions.edit', {
            name: t(`enums.activityReportLineType.${line.lineType}`),
          })}
          deleteLabel={t('reports.activity.lineActions.delete', {
            name: t(`enums.activityReportLineType.${line.lineType}`),
          })}
          onEdit={() => setEditingLine(line)}
          onDelete={() => setPendingDelete(line)}
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
            <Link to="/reports/activities" className="text-decoration-none">
              {t('reports.activity.title')}
            </Link>
          </Li>
          <Li className="breadcrumb-item active" aria-current="page">
            {report.reportName}
          </Li>
        </Ol>
      </Nav>

      <PageTitle
        title={report.reportName || t('reports.activity.fallbackTitle')}
        description={t(`enums.activityReportType.${report.reportType}`)}
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
        companyLabel={t('reports.activity.fields.company')}
        companyName={companyName}
        periodLabel={t('reports.common.period')}
        periodValue={t('reports.common.periodRange', {
          from: formatDate(report.reportStart) ?? t('common.none'),
          to: formatDate(report.reportEnd) ?? t('common.none'),
        })}
      />

      <Card
        className="mb-4"
        header={
          <H2 className="card-title h6 mb-0 report-print-heading">
            {t('reports.activity.detail.headerTitle')}
          </H2>
        
        }
      >
          <Div className="row mb-0" style={{ fontSize: '0.9375rem' }}>
            <Term label={t('reports.activity.fields.reportName')}>{report.reportName}</Term>
            <Term label={t('reports.activity.fields.company')}>{companyName}</Term>
            <Term label={t('reports.activity.fields.reportType')}>
              {t(`enums.activityReportType.${report.reportType}`)}
            </Term>
            <Term label={t('reports.activity.fields.reportStart')}>
              {formatDate(report.reportStart) ?? t('common.none')}
            </Term>
            <Term label={t('reports.activity.fields.reportEnd')}>
              {formatDate(report.reportEnd) ?? t('common.none')}
            </Term>
            <Term label={t('reports.common.lineCount')}>
              {formatNumber(detail.data.lines.length)}
            </Term>
          </Div>
        
      </Card>

      <Card
        
        header={
        <Div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <H2 className="card-title h6 mb-0 report-print-heading">
            {t('reports.activity.detail.linesTitle')}
          </H2>
          <Button variant="primary" size="sm" className="d-print-none"
            onClick={() => setIsAddingLine(true)}
          >
            {t('reports.activity.detail.addLine')}
          </Button>
        
        </Div>
        }
      >
          <DataTable
            label={t('reports.activity.detail.linesTitle')}
            columns={columns}
            rows={detail.data.lines}
            rowKey={(line) => line.id}
            emptyMessage={t('reports.activity.detail.emptyLines')}
          />
        
      </Card>

      {isEditing && (
        <ActivityReportFormModal report={report} onClose={() => setIsEditing(false)} />
      )}
      {isAddingLine && (
        <ActivityReportLineFormModal
          reportId={reportId}
          onClose={() => setIsAddingLine(false)}
        />
      )}
      {editingLine && (
        <ActivityReportLineFormModal
          reportId={reportId}
          line={editingLine}
          onClose={() => setEditingLine(undefined)}
        />
      )}

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title={t('reports.activity.detail.deleteLineTitle')}
        message={t('reports.activity.detail.deleteLineMessage')}
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
