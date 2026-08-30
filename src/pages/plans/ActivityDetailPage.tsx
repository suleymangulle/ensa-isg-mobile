import { useState } from 'react'
import { Link, useParams } from '@/navigation/router'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card } from '@/ui'
import { ErrorPanel, PageTitle, Spinner } from '@/components/DataTable'
import { errorMessage } from '@/api/http'
import { useActivityDetail, type ActivityNavigationDto } from './api'
import ActivityFormModal from './ActivityFormModal'
import { Div, H2, H3, Li, Nav, Ol, P, Span, Strong, Ul } from '@/ui'

/**
 * One activity of the catalogue, shown in its place in the tree: the parent it hangs under and
 * the children that hang under it, each a link so the hierarchy can be walked.
 */
export default function ActivityDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const activityId = Number(id)

  const { data, isLoading, error } = useActivityDetail(activityId)
  const [isEditOpen, setEditOpen] = useState(false)
  const [isChildOpen, setChildOpen] = useState(false)

  if (isLoading) return <Spinner />
  if (error) return <ErrorPanel message={errorMessage(error)} />
  if (!data) return <ErrorPanel message={t('errors.notFound')} />

  const activity = data.activity

  return (
    <>
      <Nav aria-label={t('nav.breadcrumb')} className="mb-3">
        <Ol className="breadcrumb mb-0" style={{ fontSize: '0.875rem' }}>
          <Li className="breadcrumb-item">
            <Link to="/activities" className="text-decoration-none">
              {t('activity.list.title')}
            </Link>
          </Li>
          {data.parentActivity && (
            <Li className="breadcrumb-item">
              <Link to={`/activities/${data.parentActivity.id}`} className="text-decoration-none">
                {data.parentActivity.displayName}
              </Link>
            </Li>
          )}
          <Li className="breadcrumb-item active" aria-current="page">
            {activity.activityName}
          </Li>
        </Ol>
      </Nav>

      <PageTitle
        title={activity.activityName}
        description={
          activity.activityCode
            ? t('activity.detail.code', { value: activity.activityCode })
            : undefined
        }
        action={
          <Div className="d-flex gap-2">
            <Button variant="light" onClick={() => setChildOpen(true)}>
              {t('activity.detail.addChild')}
            </Button>
            <Button variant="light" 
              onClick={() => setEditOpen(true)}
            >
              {t('common.edit')}
            </Button>
          </Div>
        }
      />

      <Div className="row g-4">
        <Div className="col-lg-7">
          <GeneralCard detail={data} />
        </Div>

        <Div className="col-lg-5">
          <Card
            className="h-100"
            header={
              <H2 className="h6 fw-semibold mb-0" style={{ color: 'var(--kt-gray-900)' }}>
                {t('activity.detail.hierarchy')}
              </H2>
            
            }
          >
              <H3
                className="text-uppercase fw-semibold mb-2"
                style={{ color: 'var(--kt-gray-500)', fontSize: '0.6875rem', letterSpacing: '0.08em' }}
              >
                {t('activity.fields.parentActivity')}
              </H3>
              {data.parentActivity ? (
                <Link
                  to={`/activities/${data.parentActivity.id}`}
                  className="d-inline-block mb-4 text-decoration-none fw-semibold"
                >
                  {data.parentActivity.displayName}
                </Link>
              ) : (
                <P className="mb-4">
                  <Badge variant="primary">{t('activity.root')}</Badge>
                </P>
              )}

              <H3
                className="text-uppercase fw-semibold mb-2"
                style={{ color: 'var(--kt-gray-500)', fontSize: '0.6875rem', letterSpacing: '0.08em' }}
              >
                {t('activity.detail.children')}
              </H3>
              {data.childActivities.length ? (
                <Ul className="list-unstyled mb-0 d-flex flex-column gap-2">
                  {data.childActivities.map((child) => (
                    <Li key={child.id}>
                      <Link to={`/activities/${child.id}`} className="text-decoration-none">
                        {child.displayName}
                      </Link>
                    </Li>
                  ))}
                </Ul>
              ) : (
                <P className="mb-0" style={{ color: 'var(--kt-gray-500)' }}>
                  {t('activity.detail.noChildren')}
                </P>
              )}
            
          </Card>
        </Div>
      </Div>

      {isEditOpen && (
        <ActivityFormModal activity={activity} onClose={() => setEditOpen(false)} />
      )}

      {isChildOpen && (
        <ActivityFormModal parentActivityId={activity.id} onClose={() => setChildOpen(false)} />
      )}
    </>
  )
}

/** Header facts of the catalogue entry. */
function GeneralCard({ detail }: { detail: ActivityNavigationDto }) {
  const { t } = useTranslation()
  const activity = detail.activity
  const none = t('common.none')

  return (
    <Card
      className="h-100"
      header={
        <H2 className="h6 fw-semibold mb-0" style={{ color: 'var(--kt-gray-900)' }}>
          {t('activity.detail.general')}
        </H2>
      
      }
    >
        <Div className="row mb-0" style={{ fontSize: '0.9375rem' }}>
          <Term label={t('activity.fields.activityType')}>
            {t(`enums.activityType.${activity.activityType}`)}
          </Term>
          <Term label={t('activity.fields.activityGroup')}>
            {detail.activityGroup?.displayName ?? none}
          </Term>
          <Term label={t('activity.fields.period')}>{detail.period?.displayName ?? none}</Term>
          <Term label={t('activity.fields.defaultActivity')}>
            {activity.defaultActivity ? t('common.yes') : t('common.no')}
          </Term>
          <Term label={t('activity.fields.defaultCount')}>{activity.defaultCount}</Term>
          <Term label={t('activity.fields.defaultStartMonthOffset')}>
            {activity.defaultStartMonthOffset}
          </Term>
          <Term label={t('activity.fields.defaultElementCondition')}>
            {activity.defaultElementCondition}
          </Term>
          <Term label={t('activity.fields.orderNo')}>{activity.orderNo ?? none}</Term>
          <Term label={t('activity.fields.scope')}>
            <Badge variant={activity.tenantId == null ? 'info' : 'primary'}>
              {activity.tenantId == null ? t('activity.scope.shared') : t('activity.scope.private')}
            </Badge>
          </Term>
          <Term label={t('activity.fields.status')}>
            <Badge variant={activity.isActive ? 'success' : 'danger'}>
              {activity.isActive ? t('common.active') : t('common.passive')}
            </Badge>
          </Term>
        </Div>
      
    </Card>
  )
}

/** One `<Strong>`/`<Span>` pair of a definition list. */
function Term({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <Strong className="col-sm-5" style={{ color: 'var(--kt-gray-500)', fontWeight: 500 }}>
        {label}
      </Strong>
      <Span className="col-sm-7">{children}</Span>
    </>
  )
}
