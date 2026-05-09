import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { organisationsApi } from '../../../api/organisations.api';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Table from '../../../components/ui/Table';
import Spinner from '../../../components/feedback/Spinner';
import Pagination from '../../../components/ui/Pagination';
import EmptyState from '../../../components/feedback/EmptyState';

/**
 * OrganisationsList - Liste backoffice des organisations
 * Route: /backoffice/organisations
 * Accessible à: ADMIN, SUPERVISEUR
 * Référence: CLAUDE.md - Backoffice
 */
export default function OrganisationsList() {
  const navigate = useNavigate();
  const [organisations, setOrganisations] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    type: '',
  });

  const { execute, isLoading } = useApi();

  const loadOrganisations = async (page = 1) => {
    await execute(
      () =>
        organisationsApi.getAll({
          page,
          limit: 20,
          ...filters,
        }),
      {
        onSuccess: (data) => {
          setOrganisations(data.data || []);
          setMeta(data.meta || { page: 1, totalPages: 1, total: 0 });
        },
        showErrorToast: true,
      }
    );
  };

  useEffect(() => {
    loadOrganisations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleSearchChange = (e) => {
    setFilters({ ...filters, search: e.target.value });
  };

  const handleTypeChange = (e) => {
    setFilters({ ...filters, type: e.target.value });
  };

  const handleSuspendToggle = async (id, currentlySuspended) => {
    await execute(
      () => organisationsApi.toggleSuspension(id, !currentlySuspended),
      {
        onSuccess: () => {
          loadOrganisations(meta.page);
        },
        successMessage: currentlySuspended ? 'Organisation activée' : 'Organisation suspendue',
      }
    );
  };

  const handleDeleteOrganisation = async (org) => {
    const confirmed = window.confirm(
      `Supprimer l'organisation "${org.nom_organisation || org.raison_sociale || 'N/A'}" ? Cette action supprimera aussi les devis, vouchers, abonnements et configurations liés.`
    );
    if (!confirmed) return;

    await execute(
      () => organisationsApi.delete(org.id),
      {
        onSuccess: () => {
          loadOrganisations(meta.page);
        },
        successMessage: "Organisation supprimée",
      }
    );
  };

  const getStatutBadge = (org) => {
    if (org.suspended) {
      return <Badge variant="danger" size="small">Suspendue</Badge>;
    }
    if (org.email_confirme === false) {
      return <Badge variant="warning" size="small">Email non confirmé</Badge>;
    }
    return <Badge variant="success" size="small">Active</Badge>;
  };

  const getTypeBadge = (type) => {
    const mapping = {
      ENTREPRISE: { variant: 'primary', label: 'Entreprise' },
      INSTITUTION: { variant: 'info', label: 'Institution' },
      ONG: { variant: 'success', label: 'ONG' },
      ASSOCIATION: { variant: 'gray', label: 'Association' },
    };
    const config = mapping[type] || { variant: 'gray', label: type };
    return <Badge variant={config.variant} size="small">{config.label}</Badge>;
  };

  const columns = [
    {
      key: 'nom',
      label: 'Organisation',
      render: (value, org) => (
        <div>
          <p className="font-medium text-primary">{org.nom_organisation || 'N/A'}</p>
          <p className="text-xs text-subtext">{org.email}</p>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (value) => getTypeBadge(value),
    },
    {
      key: 'responsable',
      label: 'Responsable',
      render: (value, org) => {
        const fullName = `${org.responsable_nom || ''} ${org.responsable_prenom || ''}`.trim() || 'N/A';
        return (
          <div>
            <p className="text-sm text-text">{fullName}</p>
            <p className="text-xs text-subtext">{org.responsable_fonction || ''}</p>
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
      key: 'statut',
      label: 'Statut',
      render: (value, org) => getStatutBadge(org),
    },
    {
      key: 'created_at',
      label: 'Créée le',
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
      render: (value, org) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="small"
            onClick={() => navigate(`/backoffice/organisations/${org.id}`)}
          >
            Détails
          </Button>
          <Button
            variant={org.suspended ? 'success' : 'danger'}
            size="small"
            onClick={() => handleSuspendToggle(org.id, org.suspended)}
          >
            {org.suspended ? 'Activer' : 'Suspendre'}
          </Button>
          <Button
            variant="danger"
            size="small"
            onClick={() => handleDeleteOrganisation(org)}
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
          <h1 className="text-2xl font-semibold text-primary">Organisations</h1>
          <p className="mt-1 text-sm text-subtext">
            Gestion des comptes organisations ({meta.total} au total)
          </p>
        </div>
        <Button onClick={() => navigate('/backoffice/organisations/new')}>
          Créer une organisation
        </Button>
      </div>

      <Card>
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <Input
              placeholder="Rechercher par nom, email ou responsable..."
              value={filters.search}
              onChange={handleSearchChange}
            />
          </div>
          <select
            className="rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            value={filters.type}
            onChange={handleTypeChange}
          >
            <option value="">Tous les types</option>
            <option value="ENTREPRISE">Entreprise</option>
            <option value="INSTITUTION">Institution</option>
            <option value="ONG">ONG</option>
            <option value="ASSOCIATION">Association</option>
          </select>
        </div>

        {isLoading && organisations.length === 0 ? (
          <div className="flex justify-center py-12">
            <Spinner size="large" />
          </div>
        ) : organisations.length === 0 ? (
          <EmptyState
            title="Aucune organisation trouvée"
            message="Aucune organisation ne correspond aux critères de recherche."
          />
        ) : (
          <>
            <Table columns={columns} data={organisations} />
            {meta.totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={meta.page}
                  totalPages={meta.totalPages}
                  onPageChange={loadOrganisations}
                />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
