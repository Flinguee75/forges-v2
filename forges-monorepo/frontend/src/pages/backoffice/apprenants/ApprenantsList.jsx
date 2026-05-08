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

export default function ApprenantsList() {
  const navigate = useNavigate();
  const [apprenants, setApprenants] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: '', statut: '' });
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { execute, isLoading } = useApi();

  const loadApprenants = async (page = 1) => {
    await execute(
      () => apprenantsApi.getAll({ page, limit: 20, ...filters }),
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

  const handleSuspendToggle = async (id, currentlySuspended) => {
    await execute(
      () => apprenantsApi.toggleSuspension(id, !currentlySuspended),
      {
        onSuccess: () => loadApprenants(meta.page),
        successMessage: currentlySuspended ? 'Utilisateur active' : 'Utilisateur suspendu',
      }
    );
  };

  const handleDelete = async (id) => {
    await execute(
      () => apprenantsApi.delete(id),
      {
        onSuccess: () => {
          setConfirmDelete(null);
          loadApprenants(meta.page);
        },
        successMessage: 'Apprenant supprime',
        showErrorToast: true,
      }
    );
  };

  const getStatutBadge = (apprenant) => {
    if (apprenant.suspended) return <Badge variant="danger" size="small">Suspendu</Badge>;
    if (apprenant.email_confirme === false) return <Badge variant="warning" size="small">Email non confirme</Badge>;
    return <Badge variant="success" size="small">Actif</Badge>;
  };

  const shortId = (id) => id ? id.slice(0, 8) + '...' : 'N/A';

  const columns = [
    {
      key: 'nom',
      label: 'Nom complet',
      render: (value, apprenant) => {
        const fullName = `${apprenant.nom || ''} ${apprenant.prenoms || ''}`.trim() || 'N/A';
        return (
          <div>
            <p className="font-medium text-primary">{fullName}</p>
            <p className="text-xs text-subtext">{apprenant.email}</p>
            <p className="text-xs text-subtext font-mono" title={apprenant.id}>
              ID: {shortId(apprenant.id)}
            </p>
          </div>
        );
      },
    },
    {
      key: 'telephone',
      label: 'Telephone',
      render: (value) => value || <span className="text-subtext text-xs">Non renseigne</span>,
    },
    {
      key: 'organisation',
      label: 'Organisation',
      render: (value, apprenant) => {
        if (apprenant.organisation) {
          return (
            <div>
              <p className="text-sm">{apprenant.organisation.raison_sociale}</p>
              <p className="text-xs text-subtext font-mono" title={apprenant.organisation.id}>
                ID: {shortId(apprenant.organisation.id)}
              </p>
            </div>
          );
        }
        return <span className="text-subtext text-xs">Independant</span>;
      },
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
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="small"
            onClick={() => navigate(`/backoffice/apprenants/${apprenant.id}`)}
          >
            Details
          </Button>
          <Button
            variant={apprenant.suspended ? 'success' : 'warning'}
            size="small"
            onClick={() => handleSuspendToggle(apprenant.id, apprenant.suspended)}
          >
            {apprenant.suspended ? 'Activer' : 'Suspendre'}
          </Button>
          <Button
            variant="danger"
            size="small"
            onClick={() => setConfirmDelete(apprenant)}
          >
            Supprimer
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
          Creer un utilisateur
        </Button>
      </div>

      <Card>
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <Input
              placeholder="Rechercher par nom, prenom ou email..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <select
            className="rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            value={filters.statut}
            onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
          >
            <option value="">Tous les statuts</option>
            <option value="actif">Actif</option>
            <option value="suspendu">Suspendu</option>
            <option value="non_confirme">Email non confirme</option>
          </select>
        </div>

        {isLoading && apprenants.length === 0 ? (
          <div className="flex justify-center py-12">
            <Spinner size="large" />
          </div>
        ) : apprenants.length === 0 ? (
          <EmptyState
            title="Aucun utilisateur trouve"
            message="Aucun utilisateur ne correspond aux criteres de recherche."
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

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-primary">Confirmer la suppression</h2>
            <p className="mt-2 text-sm text-subtext">
              Supprimer definitivement{' '}
              <strong>{confirmDelete.nom} {confirmDelete.prenoms}</strong> ({confirmDelete.email}) ?
              Cette action est irreversible.
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                variant="danger"
                onClick={() => handleDelete(confirmDelete.id)}
                loading={isLoading}
              >
                Supprimer
              </Button>
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
