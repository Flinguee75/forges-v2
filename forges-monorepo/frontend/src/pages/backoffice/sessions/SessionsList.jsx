import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { sessionsApi } from '../../../api/sessions.api';
import { formationsApi } from '../../../api/formations.api';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Table from '../../../components/ui/Table';
import Spinner from '../../../components/feedback/Spinner';
import Pagination from '../../../components/ui/Pagination';
import EmptyState from '../../../components/feedback/EmptyState';

function getStatutBadge(statut) {
  const mapping = {
    BROUILLON: { variant: 'gray', label: 'Brouillon' },
    PLANIFIEE: { variant: 'info', label: 'Planifiée' },
    OUVERTE: { variant: 'success', label: 'Ouverte' },
    CLOTUREE: { variant: 'warning', label: 'Clôturée' },
    EN_COURS: { variant: 'info', label: 'En cours' },
    TERMINEE: { variant: 'gray', label: 'Terminée' },
    ARCHIVEE: { variant: 'gray', label: 'Archivée' },
    ANNULEE: { variant: 'danger', label: 'Annulée' },
    A_VENIR: { variant: 'info', label: 'À venir' },
    INSCRIPTIONS_OUVERTES: { variant: 'success', label: 'Inscriptions ouvertes' },
  };

  const config = mapping[statut] || { variant: 'gray', label: statut };
  return <Badge variant={config.variant} size="small">{config.label}</Badge>;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getCapacityStats(capacity, registeredCount) {
  const capacityValue = Number(capacity || 0);
  const registeredValue = Number(registeredCount || 0);
  const remaining = Math.max(0, capacityValue - registeredValue);
  const occupancy = capacityValue > 0 ? Math.round((registeredValue / capacityValue) * 100) : 0;

  return { capacityValue, registeredValue, remaining, occupancy };
}

export default function SessionsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const formationIdParam = searchParams.get('formationId') || '';
  const { execute, isLoading, error } = useApi();

  const [sessions, setSessions] = useState([]);
  const [formations, setFormations] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    formation_id: formationIdParam,
    statut: '',
    search: '',
  });

  const loadFormations = async () => {
    await execute(() => formationsApi.getAllBackoffice({ limit: 100 }), {
      onSuccess: (response) => {
        setFormations(response?.data || []);
      },
    });
  };

  const loadSessions = async (page = 1) => {
    await execute(
      () =>
        sessionsApi.getBackofficeList({
          page,
          limit: 10,
          ...filters,
        }),
      {
        onSuccess: (response) => {
          setSessions(response?.data || []);
          setMeta(response?.meta || { page: 1, totalPages: 1, total: 0 });
        },
      }
    );
  };

  useEffect(() => {
    loadFormations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const columns = [
    {
      key: 'formation',
      label: 'Formation',
      render: (_, session) => (
        <div>
          <div className="font-medium text-primary">{session.formation?.titre || session.formation?.intitule || 'N/A'}</div>
          <button
            type="button"
            onClick={() => navigate(`/backoffice/sessions/${session.id}`)}
            className="mt-1 text-xs text-subtext hover:text-primary"
          >
            {session.id}
          </button>
        </div>
      ),
    },
    {
      key: 'dates',
      label: 'Dates',
      render: (_, session) => (
        <div className="space-y-1 text-sm">
          <div>
            <span className="font-medium text-primary">
              {formatDate(session.date_debut)} — {formatDate(session.date_fin)}
            </span>
          </div>
          <div className="text-xs text-subtext">
            Inscriptions : {formatDate(session.date_ouverture)} au {formatDate(session.date_cloture)}
          </div>
        </div>
      ),
    },
    {
      key: 'capacite',
      label: 'Capacité',
      render: (value, session) => {
        const { registeredValue: count, remaining: restantes, occupancy } = getCapacityStats(
          value,
          session._count?.dossiers || 0
        );

        return (
          <div>
            <div className="text-sm">
              {count} / {value} inscrits
            </div>
            <div className="text-xs text-subtext">
              {restantes} place{restantes === 1 ? '' : 's'} restante{restantes === 1 ? '' : 's'} — {occupancy}% rempli
            </div>
          </div>
        );
      },
    },
    {
      key: 'statut',
      label: 'Statut',
      render: (value) => getStatutBadge(value),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, session) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="small"
            onClick={() => navigate(`/backoffice/sessions/${session.id}`)}
          >
            Voir
          </Button>
          <Button
            variant="outline"
            size="small"
            onClick={() => navigate(`/backoffice/sessions/${session.id}/edit`)}
          >
            Modifier
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading && sessions.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
              Gestion des sessions
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-primary">
              Sessions de formation
            </h2>
            <p className="mt-2 text-subtext">
              Planification et suivi des sessions backoffice.
            </p>
          </div>
          <Button onClick={() => navigate('/backoffice/sessions/new')}>
            Créer une session
          </Button>
        </div>
      </div>

      <Card>
        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <select
            value={filters.formation_id}
            onChange={(event) => setFilters((current) => ({ ...current, formation_id: event.target.value }))}
            className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none"
          >
            <option value="">Toutes les formations</option>
            {formations.map((formation) => (
              <option key={formation.id} value={formation.id}>
                {formation.titre}
              </option>
            ))}
          </select>

          <select
            value={filters.statut}
            onChange={(event) => setFilters((current) => ({ ...current, statut: event.target.value }))}
            className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none"
          >
            <option value="">Tous les statuts</option>
            <option value="BROUILLON">Brouillon</option>
            <option value="PLANIFIEE">Planifiée</option>
            <option value="OUVERTE">Ouverte</option>
            <option value="A_VENIR">À venir</option>
            <option value="INSCRIPTIONS_OUVERTES">Inscriptions ouvertes</option>
            <option value="EN_COURS">En cours</option>
            <option value="CLOTUREE">Clôturée</option>
            <option value="TERMINEE">Terminée</option>
            <option value="ANNULEE">Annulée</option>
          </select>

          <Input
            placeholder="Rechercher..."
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          />
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-primary">
            {meta.total} session{meta.total > 1 ? 's' : ''}
          </h3>
        </div>

        {error && !sessions.length ? (
          <EmptyState title="Chargement impossible" message={error} />
        ) : sessions.length > 0 ? (
          <Table columns={columns} data={sessions} />
        ) : (
          <div className="py-4">
            <EmptyState
              title="Aucune session"
              message="Aucune session ne correspond à vos filtres actuels."
            />
          </div>
        )}

        {meta.totalPages > 1 && (
          <div className="mt-4">
            <Pagination
              currentPage={meta.page}
              totalPages={meta.totalPages}
              onPageChange={loadSessions}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
