import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { apprenantsApi } from '../../../api/apprenants.api';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Table from '../../../components/ui/Table';
import Spinner from '../../../components/feedback/Spinner';
import Pagination from '../../../components/ui/Pagination';
import EmptyState from '../../../components/feedback/EmptyState';

/**
 * ApprenantsList - Liste backoffice des utilisateurs
 * Route: /backoffice/apprenants
 * Accessible à: ADMIN, SUPERVISEUR
 * Référence: CLAUDE.md - Backoffice
 */
export default function ApprenantsList() {
  const navigate = useNavigate();
  const [apprenants, setApprenants] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    statut: '',
  });

  const { execute, isLoading } = useApi();

  const loadApprenants = async (page = 1) => {
    await execute(
      () =>
        apprenantsApi.getAll({
          page,
          limit: 20,
          ...filters,
        }),
      {
        onSuccess: (data) => {
          setApprenants(data.data || []);
          setMeta(data.meta || { page: 1, totalPages: 1, total: 0 });
        },
        showErrorToast: true,
      }
    );
  };

  useEffect(() => {
    loadApprenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleSearchChange = (e) => {
    setFilters({ ...filters, search: e.target.value });
  };

  const handleStatutChange = (e) => {
    setFilters({ ...filters, statut: e.target.value });
  };

  const handleSuspendToggle = async (id, currentlySuspended) => {
    await execute(
      () => apprenantsApi.toggleSuspension(id, !currentlySuspended),
      {
        onSuccess: () => {
          loadApprenants(meta.page);
        },
        successMessage: currentlySuspended ? 'Utilisateur activé' : 'Utilisateur suspendu',
      }
    );
  };

  const getStatutBadge = (apprenant) => {
    if (apprenant.suspended) {
      return <Badge variant="danger" size="small">Suspendu</Badge>;
    }
    if (apprenant.email_confirme === false) {
      return <Badge variant="warning" size="small">Email non confirmé</Badge>;
    }
    return <Badge variant="success" size="small">Actif</Badge>;
  };

  const columns = [
    {
      key: 'nom',
      label: 'Nom complet',
      render: (value, apprenant) => {
        const fullName = `${apprenant.nom || ''} ${apprenant.prenom || ''}`.trim() || 'N/A';
        return (
          <div>
            <p className="font-medium text-primary">{fullName}</p>
            <p className="text-xs text-subtext">{apprenant.email}</p>
          </div>
        );
      },
    },
    {
      key: 'telephone',
      label: 'Téléphone',
      render: (value) => value || 'N/A',
    },
    {
      key: 'ville',
      label: 'Ville',
      render: (value) => value || 'N/A',
    },
    {
      key: 'statut',
      label: 'Statut',
      render: (value, apprenant) => getStatutBadge(apprenant),
    },
    {
      key: 'created_at',
      label: 'Inscrit le',
      render: (value) => {
        if (!value) return 'N/A';
        return new Date(value).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value, apprenant) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="small"
            onClick={() => navigate(`/backoffice/apprenants/${apprenant.id}`)}
          >
            Détails
          </Button>
          <Button
            variant={apprenant.suspended ? 'success' : 'danger'}
            size="small"
            onClick={() => handleSuspendToggle(apprenant.id, apprenant.suspended)}
          >
            {apprenant.suspended ? 'Activer' : 'Suspendre'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Utilisateurs</h1>
          <p className="mt-1 text-sm text-subtext">
            Gestion des comptes utilisateurs ({meta.total} au total)
          </p>
        </div>
        <Button onClick={() => navigate('/backoffice/apprenants/new')}>
          Créer un utilisateur
        </Button>
      </div>

      <Card>
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <Input
              placeholder="Rechercher par nom, prénom ou email..."
              value={filters.search}
              onChange={handleSearchChange}
            />
          </div>
          <select
            className="rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            value={filters.statut}
            onChange={handleStatutChange}
          >
            <option value="">Tous les statuts</option>
            <option value="actif">Actif</option>
            <option value="suspendu">Suspendu</option>
            <option value="non_confirme">Email non confirmé</option>
          </select>
        </div>

        {isLoading && apprenants.length === 0 ? (
          <div className="flex justify-center py-12">
            <Spinner size="large" />
          </div>
        ) : apprenants.length === 0 ? (
          <EmptyState
            title="Aucun utilisateur trouvé"
            message="Aucun utilisateur ne correspond aux critères de recherche."
          />
        ) : (
          <>
            <Table columns={columns} data={apprenants} />
            {meta.totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={meta.page}
                  totalPages={meta.totalPages}
                  onPageChange={loadApprenants}
                />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
