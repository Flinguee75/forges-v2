import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useAuth } from '../../../hooks/useAuth';
import { formationsApi } from '../../../api/formations.api';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Spinner from '../../../components/feedback/Spinner';
import EmptyState from '../../../components/feedback/EmptyState';
import Pagination from '../../../components/ui/Pagination';

function getStatutBadge(statut) {
  const mapping = {
    BROUILLON: { variant: 'gray', label: 'Brouillon' },
    EN_ATTENTE_PLANIFICATION: { variant: 'warning', label: 'En attente planification' },
    EN_ATTENTE_VALIDATION: { variant: 'warning', label: 'En attente validation' },
    ACTIVE: { variant: 'success', label: 'Active' },
    ARCHIVEE: { variant: 'danger', label: 'Archivée' },
    REJETEE: { variant: 'danger', label: 'Rejetée' },
    SUSPENDUE: { variant: 'warning', label: 'Suspendue' },
  };

  const config = mapping[statut] || { variant: 'gray', label: statut };
  return <Badge variant={config.variant} size="small">{config.label}</Badge>;
}

export default function FormationsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { execute, isLoading, error } = useApi();

  const [formations, setFormations] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ statut: '', search: '' });

  const loadFormations = async (page = 1) => {
    await execute(
      () =>
        formationsApi.getAllBackoffice({
          page,
          limit: 10,
          ...filters,
        }),
      {
        onSuccess: (response) => {
          setFormations(response?.data || []);
          setMeta(response?.meta || { page: 1, totalPages: 1, total: 0 });
        },
      }
    );
  };

  useEffect(() => {
    loadFormations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleSearchChange = (event) => {
    setFilters((current) => ({ ...current, search: event.target.value }));
  };

  const handleStatutChange = (event) => {
    setFilters((current) => ({ ...current, statut: event.target.value }));
  };

  if (isLoading && formations.length === 0) {
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
              Gestion des formations
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-primary">
              Catalogue de formations
            </h2>
            <p className="mt-2 text-subtext">
              {user?.role === 'RESPONSABLE'
                ? 'Gérez vos formations assignées.'
                : 'Gérez toutes les formations de la plateforme.'}
            </p>
          </div>
          <Button onClick={() => navigate('/backoffice/formations/new')}>
            Créer une formation
          </Button>
        </div>
      </div>

      <Card>
        <div className="mb-4 grid gap-4 md:grid-cols-[1fr_240px]">
          <Input
            placeholder="Rechercher par intitulé ou description..."
            value={filters.search}
            onChange={handleSearchChange}
          />

          <select
            value={filters.statut}
            onChange={handleStatutChange}
            className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none"
          >
            <option value="">Tous les statuts</option>
            <option value="BROUILLON">Brouillon</option>
            <option value="EN_ATTENTE_PLANIFICATION">En attente planification</option>
            <option value="EN_ATTENTE_VALIDATION">En attente validation</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVEE">Archivée</option>
            <option value="REJETEE">Rejetée</option>
            <option value="SUSPENDUE">Suspendue</option>
          </select>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-primary">
            {meta.total} formation{meta.total > 1 ? 's' : ''}
          </h3>
        </div>

        {error && !formations.length ? (
          <EmptyState
            title="Chargement impossible"
            message={error}
          />
        ) : (
          <div className="grid gap-4">
            {formations.map((formation) => {
              const sessionCount = formation._count?.sessions || 0;

              return (
                <div
                  key={formation.id}
                  className="rounded-2xl border border-border bg-white p-5 transition-colors hover:border-primary/30"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        {getStatutBadge(formation.statut)}
                        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/55">
                          FORGES
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/backoffice/formations/${formation.id}`)}
                        className="mt-3 text-left text-xl font-semibold text-primary hover:text-secondary"
                      >
                        {formation.titre}
                      </button>

                      <p className="mt-2 max-w-3xl text-sm leading-6 text-subtext">
                        {formation.description}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-subtext">
                        <span>{formation.duree} jours</span>
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <span>{(formation.tarif || 0).toLocaleString('fr-FR')} FCFA</span>
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <span>{sessionCount} session{sessionCount > 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => navigate(`/backoffice/formations/${formation.id}`)}
                      >
                        Voir
                      </Button>
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => navigate(`/backoffice/formations/${formation.id}/edit`)}
                      >
                        Modifier
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!error && formations.length === 0 && (
          <div className="py-4">
            <EmptyState
              title="Aucune formation"
              message="Aucune formation ne correspond à vos filtres actuels."
            />
          </div>
        )}

        {meta.totalPages > 1 && (
          <div className="mt-4">
            <Pagination
              currentPage={meta.page}
              totalPages={meta.totalPages}
              onPageChange={loadFormations}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
