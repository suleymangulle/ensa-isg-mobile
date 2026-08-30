import { useState } from 'react'
import { Link, useNavigate, useParams } from '@/navigation/router'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card } from '@/ui'
import { ErrorPanel, PageTitle, Spinner } from '@/components/DataTable'
import { ConfirmDialog } from '@/components/Form'
import { IncidentPersonRole, IncidentType } from '@/api/enums'
import { errorMessage } from '@/api/http'
import { useDelete } from '@/api/mutations'
import { formatDate } from '@/utils/format'
import IncidentFormModal from './IncidentFormModal'
import IncidentPersonModal from './IncidentPersonModal'
import {
  OBSERVATION_ENDPOINTS,
  useIncidentDetail,
  useRemoveIncidentPerson,
  type IncidentDto,
  type IncidentNavigationDto,
  type IncidentPersonDto,
} from './api'
import { AlertPanel, EmptyHint, INCIDENT_TYPE_BADGE, Term } from './components'
import { Div, H2, H3, Li, Nav, Ol, Span, Strong, Ul } from '@/ui'

/** The three person collections of the navigation DTO, in the order they are rendered. */
const PERSON_SECTIONS: {
  role: IncidentPersonRole
  select: (detail: IncidentNavigationDto) => IncidentPersonDto[]
}[] = [
  { role: IncidentPersonRole.Affected, select: (detail) => detail.affectedPersons },
  { role: IncidentPersonRole.Witness, select: (detail) => detail.witnessPersons },
  { role: IncidentPersonRole.Responder, select: (detail) => detail.responderPersons },
]

export default function IncidentDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const incidentId = Number(id)

  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [addingRole, setAddingRole] = useState<IncidentPersonRole | null>(null)
  const [removingPerson, setRemovingPerson] = useState<IncidentPersonDto | null>(null)

  const { data, isLoading, error } = useIncidentDetail(incidentId)

  const removeIncident = useDelete(OBSERVATION_ENDPOINTS.incident, {
    onSuccess: () => navigate('/incidents'),
  })
  const removePerson = useRemoveIncidentPerson(incidentId, () => setRemovingPerson(null))

  if (isLoading) return <Spinner />
  if (error) return <ErrorPanel message={errorMessage(error)} />
  if (!data) return <ErrorPanel message={t('errors.notFound')} />

  const incident = data.incident
  const none = t('common.none')

  return (
    <>
      <Nav aria-label={t('nav.breadcrumb')} className="mb-3">
        <Ol className="breadcrumb mb-0" style={{ fontSize: '0.875rem' }}>
          <Li className="breadcrumb-item">
            <Link to="/incidents" className="text-decoration-none">
              {t('incident.list.title')}
            </Link>
          </Li>
          <Li className="breadcrumb-item active" aria-current="page">
            {formatDate(incident.incidentDate) ?? t('incident.detail.fallbackTitle')}
          </Li>
        </Ol>
      </Nav>

      <PageTitle
        title={t('incident.detail.title', {
          type: t(`enums.incidentType.${incident.incidentType}`),
          date: formatDate(incident.incidentDate) ?? '',
        })}
        description={data.company?.displayName ?? undefined}
        action={
          <Div className="d-flex gap-2">
            <Button variant="light" 
              onClick={() => setIsEditing(true)}
            >
              {t('common.edit')}
            </Button>
            <Button variant="light" 
              onClick={() => setIsDeleting(true)}
            >
              {t('common.delete')}
            </Button>
          </Div>
        }
      />

      <SsiNotificationPanel incident={incident} />

      <Card
        className="mb-4"
      >
          <H2 className="h6 fw-semibold mb-3" style={{ color: 'var(--kt-gray-900)' }}>
            {t('incident.detail.general')}
          </H2>
          <Div className="row mb-0" style={{ fontSize: '0.9375rem' }}>
            <Term label={t('incident.fields.incidentType')}>
              <Badge variant={INCIDENT_TYPE_BADGE[incident.incidentType]}>
                {t(`enums.incidentType.${incident.incidentType}`)}
              </Badge>
            </Term>
            <Term label={t('incident.fields.accidentType')}>
              {t(`enums.accidentType.${incident.accidentType}`)}
            </Term>
            <Term label={t('incident.fields.company')}>
              {data.company?.displayName ?? none}
            </Term>
            <Term label={t('incident.fields.department')}>
              {data.department?.displayName ?? none}
            </Term>
            <Term label={t('incident.fields.incidentDate')}>
              {formatDate(incident.incidentDate) ?? none}
            </Term>
            <Term label={t('incident.fields.lostWorkDays')}>
              {incident.lostWorkDays ?? none}
            </Term>
            <Term label={t('incident.fields.isPerDate')}>
              {formatDate(incident.returnToWorkDate) ?? none}
            </Term>
            <Term label={t('incident.fields.unitSupervisor')}>
              {data.unitSupervisor?.displayName ?? incident.supervisorFullName ?? none}
            </Term>
            <Term label={t('incident.fields.description')}>{incident.description ?? none}</Term>
            <Term label={t('incident.fields.expression')}>{incident.expression ?? none}</Term>
          </Div>
        
      </Card>

      <Card>
          <H2 className="h6 fw-semibold mb-3" style={{ color: 'var(--kt-gray-900)' }}>
            {t('incident.persons.title')}
          </H2>

          <Div className="row g-4">
            {PERSON_SECTIONS.map(({ role, select }) => (
              <PersonSection
                key={role}
                role={role}
                people={select(data)}
                onAdd={() => setAddingRole(role)}
                onRemove={setRemovingPerson}
              />
            ))}
          </Div>
        
      </Card>

      {isEditing && (
        <IncidentFormModal incident={incident} onClose={() => setIsEditing(false)} />
      )}

      {addingRole !== null && (
        <IncidentPersonModal
          incidentId={incidentId}
          companyId={incident.companyId}
          role={addingRole}
          onClose={() => setAddingRole(null)}
        />
      )}

      <ConfirmDialog
        isOpen={isDeleting}
        title={t('incident.list.deleteTitle')}
        message={t('incident.list.deleteMessage', {
          date: formatDate(incident.incidentDate) ?? '',
          company: data.company?.displayName ?? '',
        })}
        isBusy={removeIncident.isPending}
        error={removeIncident.error ? errorMessage(removeIncident.error) : null}
        onCancel={() => setIsDeleting(false)}
        onConfirm={() => removeIncident.mutate(incidentId)}
      />

      <ConfirmDialog
        isOpen={removingPerson !== null}
        title={t('incident.persons.removeTitle')}
        message={t('incident.persons.removeMessage', {
          name: `${removingPerson?.name ?? ''} ${removingPerson?.lastName ?? ''}`.trim(),
        })}
        isBusy={removePerson.isPending}
        error={removePerson.error ? errorMessage(removePerson.error) : null}
        onCancel={() => setRemovingPerson(null)}
        onConfirm={() => removingPerson && removePerson.mutate(removingPerson.id)}
      />
    </>
  )
}

/**
 * The statutory notification window, stated in plain words.
 *
 * Act 5510 art. 13 gives the employer three working days; the remaining count and the deadline
 * are calculated by `IIncidentManager` and arrive on the DTO, so this panel only renders them.
 */
function SsiNotificationPanel({ incident }: { incident: IncidentDto }) {
  const { t } = useTranslation()

  const required =
    incident.incidentType === IncidentType.WorkAccident ||
    incident.incidentType === IncidentType.OccupationalDisease

  if (!required) return null

  if (incident.ssiNotificationDate) {
    return (
      <Div className="mb-4">
        <AlertPanel tone="info">
          <Div>
            <Strong className="d-block">{t('incident.ssi.detailNotifiedTitle')}</Strong>
            <Span>
              {t('incident.ssi.notified', {
                date: formatDate(incident.ssiNotificationDate) ?? '',
              })}
            </Span>
          </Div>
        </AlertPanel>
      </Div>
    )
  }

  const remaining = incident.remainingSsiNotificationWorkDays

  return (
    <Div className="mb-4">
      <AlertPanel tone={incident.ssiNotificationOverdue ? 'danger' : 'warning'}>
        <Div>
          <Strong className="d-block">
            {incident.ssiNotificationOverdue
              ? t('incident.ssi.detailOverdueTitle')
              : t('incident.ssi.detailPendingTitle')}
          </Strong>
          <Span>
            {t('incident.ssi.deadline', {
              date: formatDate(incident.latestSsiNotificationDate) ?? t('common.none'),
            })}
            {remaining != null && !incident.ssiNotificationOverdue
              ? ` · ${t('incident.ssi.remaining', { days: remaining })}`
              : ''}
          </Span>
        </Div>
      </AlertPanel>
    </Div>
  )
}

function PersonSection({
  role,
  people,
  onAdd,
  onRemove,
}: {
  role: IncidentPersonRole
  people: IncidentPersonDto[]
  onAdd: () => void
  onRemove: (person: IncidentPersonDto) => void
}) {
  const { t } = useTranslation()

  return (
    <Div className="col-md-4">
      <Div className="d-flex align-items-center justify-content-between mb-2">
        <H3 className="h6 mb-0" style={{ color: 'var(--kt-gray-700)' }}>
          {t(`enums.incidentPersonRole.${role}`)}
        </H3>
        <Button variant="light" size="sm" 
          onClick={onAdd}
          aria-label={t(`incident.persons.add.${role}`)}
        >
          <Span aria-hidden="true">＋</Span>
        </Button>
      </Div>

      {people.length === 0 ? (
        <EmptyHint message={t('incident.persons.empty')} />
      ) : (
        <Ul className="list-unstyled mb-0 d-flex flex-column gap-2">
          {people.map((person) => (
            <Li
              key={person.id}
              className="d-flex align-items-center justify-content-between gap-2 px-3 py-2 rounded"
              style={{ backgroundColor: 'var(--kt-gray-100)' }}
            >
              <Span style={{ color: 'var(--kt-gray-800)' }}>
                {`${person.name} ${person.lastName}`.trim()}
              </Span>
              <Button variant="light" size="sm" 
                aria-label={t('incident.persons.removeAction', {
                  name: `${person.name} ${person.lastName}`.trim(),
                })}
                onClick={() => onRemove(person)}
              >
                <Span aria-hidden="true">✕</Span>
              </Button>
            </Li>
          ))}
        </Ul>
      )}
    </Div>
  )
}
