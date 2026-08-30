import { useQuery } from '@tanstack/react-query'
import { Link } from '@/navigation/router'
import { useTranslation } from 'react-i18next'
import { Badge, Card, Skeleton, Statistic } from '@/ui'
import { useAuth } from '@/auth/AuthContext'
import { PageTitle } from '@/components/DataTable'
import { http, errorMessage, type ListResult, type PagedResult } from '@/api/http'
import { formatNumber } from '@/utils/format'
import { Div, Li, Span, Strong, Ul } from '@/ui'

/**
 * Operational home page.
 *
 * The cards are not decoration: each one is a statutory obligation that has a deadline, and the
 * three "attention" counters are the ones that turn into findings during an inspection. Every
 * figure is read from the API — nothing is computed in the browser — and each links to the screen
 * where the work is actually done.
 *
 * The tiles are `rich-react-component`'s `Card` + `Statistic`, so the loading placeholder, the
 * label/value hierarchy and the card chrome are the library's rather than three more variations
 * of them written here.
 */

/** Counts a paged endpoint without transferring its rows. */
function useTotalCount(resource: string) {
  return useQuery({
    queryKey: [resource, 'count'],
    queryFn: async () => {
      const { data } = await http.get<PagedResult<unknown>>(`/${resource}`, {
        params: { skipCount: 0, maxResultCount: 1 },
      })
      return data.totalCount
    },
  })
}

/** Counts an unpaged `{ items: [] }` endpoint. */
function useItemCount(path: string, key: string) {
  return useQuery({
    queryKey: [key, 'attention'],
    queryFn: async () => {
      const { data } = await http.get<ListResult<unknown>>(`/${path}`)
      return data.items.length
    },
  })
}

interface Metric {
  key: string
  labelKey: string
  value: number | undefined
  isLoading: boolean
  error: unknown
  tone: 'primary' | 'success' | 'warning' | 'danger'
  icon: string
  to: string
}

function MetricCard({ metric }: { metric: Metric }) {
  const { t } = useTranslation()

  return (
    <Div className="col-12 col-sm-6 col-xl-3">
      <Link to={metric.to} className="text-decoration-none d-block h-100">
        <Card className="h-100">
          <Div className="d-flex align-items-center gap-3">
            <Span
              className="d-inline-flex align-items-center justify-content-center flex-shrink-0"
              style={{
                width: 52,
                height: 52,
                borderRadius: 12,
                fontSize: 22,
                backgroundColor: `var(--kt-${metric.tone}-light)`,
                color: `var(--kt-${metric.tone})`,
              }}
              aria-hidden="true"
            >
              {metric.icon}
            </Span>
            <Statistic
              className="min-w-0"
              label={t(metric.labelKey)}
              value={metric.error ? t('common.none') : (formatNumber(metric.value) ?? t('common.none'))}
              loading={metric.isLoading}
            />
          </Div>
        </Card>
      </Link>
    </Div>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const companies = useTotalCount('company')
  const employees = useTotalCount('company-employee')
  const visits = useTotalCount('visit')
  const tickets = useTotalCount('support-ticket')

  const overdueInspections = useItemCount('equipment/overdue-inspections', 'equipment')
  const overdueActions = useItemCount('corrective-action/overdue', 'corrective-action')
  const expiringAssessments = useItemCount(
    'risk-assessment-report/expiring',
    'risk-assessment-report',
  )

  const metrics: Metric[] = [
    {
      key: 'companies',
      labelKey: 'dashboard.cards.activeCompanies',
      value: companies.data,
      isLoading: companies.isLoading,
      error: companies.error,
      tone: 'primary',
      icon: '▦',
      to: '/companies',
    },
    {
      key: 'employees',
      labelKey: 'dashboard.cards.totalEmployees',
      value: employees.data,
      isLoading: employees.isLoading,
      error: employees.error,
      tone: 'success',
      icon: '☰',
      to: '/employees',
    },
    {
      key: 'visits',
      labelKey: 'dashboard.cards.visits',
      value: visits.data,
      isLoading: visits.isLoading,
      error: visits.error,
      tone: 'primary',
      icon: '◷',
      to: '/visits',
    },
    {
      key: 'tickets',
      labelKey: 'dashboard.cards.supportTickets',
      value: tickets.data,
      isLoading: tickets.isLoading,
      error: tickets.error,
      tone: 'warning',
      icon: '✉',
      to: '/support-tickets',
    },
  ]

  const attention = [
    {
      key: 'overdueInspections',
      labelKey: 'dashboard.attention.overdueInspections',
      descriptionKey: 'dashboard.attention.overdueInspectionsHint',
      query: overdueInspections,
      to: '/equipment',
    },
    {
      key: 'overdueActions',
      labelKey: 'dashboard.attention.overdueActions',
      descriptionKey: 'dashboard.attention.overdueActionsHint',
      query: overdueActions,
      to: '/corrective-actions',
    },
    {
      key: 'expiringAssessments',
      labelKey: 'dashboard.attention.expiringAssessments',
      descriptionKey: 'dashboard.attention.expiringAssessmentsHint',
      query: expiringAssessments,
      to: '/risk-assessments',
    },
  ]

  return (
    <>
      <PageTitle
        title={t('dashboard.welcome', { name: user?.fullName ?? '' })}
        description={t('dashboard.description')}
      />

      <Div className="row g-4 mb-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.key} metric={metric} />
        ))}
      </Div>

      <Div className="row g-4">
        <Div className="col-12 col-xl-7">
          <Card title={t('dashboard.attention.title')} className="h-100">
            <Ul className="list-unstyled mb-0">
              {attention.map((item) => {
                const count = item.query.data ?? 0
                const failed = Boolean(item.query.error)

                return (
                  <Li
                    key={item.key}
                    className="d-flex align-items-start gap-3 py-3"
                    style={{ borderTop: '1px solid var(--kt-gray-200)' }}
                  >
                    {item.query.isLoading ? (
                      <Span
                        className="flex-shrink-0"
                        role="status"
                        aria-label={t('common.loading')}
                      >
                        <Skeleton width="44px" height="32px" />
                      </Span>
                    ) : (
                      <Span
                        className="d-inline-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                        style={{
                          minWidth: 44,
                          height: 32,
                          borderRadius: 8,
                          padding: '0 8px',
                          backgroundColor:
                            count > 0 ? 'var(--kt-danger-light)' : 'var(--kt-success-light)',
                          color: count > 0 ? 'var(--kt-danger)' : 'var(--kt-success)',
                        }}
                      >
                        {failed ? t('common.none') : (formatNumber(count) ?? '0')}
                      </Span>
                    )}

                    <Div className="min-w-0">
                      <Link to={item.to} className="fw-semibold text-decoration-none">
                        {t(item.labelKey)}
                      </Link>
                      <Div style={{ color: 'var(--kt-gray-500)', fontSize: '0.875rem' }}>
                        {failed ? errorMessage(item.query.error) : t(item.descriptionKey)}
                      </Div>
                    </Div>
                  </Li>
                )
              })}
            </Ul>
          </Card>
        </Div>

        <Div className="col-12 col-xl-5">
          <Card title={t('dashboard.session.title')} className="h-100">
            <Div className="row mb-0" style={{ fontSize: '0.9375rem' }}>
              <Strong className="col-5" style={{ color: 'var(--kt-gray-500)', fontWeight: 500 }}>
                {t('dashboard.session.userName')}
              </Strong>
              <Span className="col-7 fw-semibold">{user?.userName}</Span>

              <Strong className="col-5" style={{ color: 'var(--kt-gray-500)', fontWeight: 500 }}>
                {t('dashboard.session.tenant')}
              </Strong>
              <Span className="col-7 fw-semibold">{user?.tenantId ?? t('common.host')}</Span>

              <Strong className="col-5" style={{ color: 'var(--kt-gray-500)', fontWeight: 500 }}>
                {t('dashboard.session.roles')}
              </Strong>
              <Span className="col-7 d-flex flex-wrap gap-1">
                {user?.roles.length
                  ? user.roles.map((role) => (
                      <Badge key={role} variant="primary" pill>
                        {role}
                      </Badge>
                    ))
                  : t('common.none')}
              </Span>

              <Strong className="col-5" style={{ color: 'var(--kt-gray-500)', fontWeight: 500 }}>
                {t('dashboard.session.permissionCount')}
              </Strong>
              <Span className="col-7 fw-semibold">{user?.permissions.length ?? 0}</Span>
            </Div>
          </Card>
        </Div>
      </Div>
    </>
  )
}
