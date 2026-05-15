import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useAuth } from '../../../hooks/useAuth';
import { inscriptionsApi } from '../../../api/inscriptions.api';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Table from '../../../components/ui/Table';
import Spinner from '../../../components/feedback/Spinner';
import Pagination from '../../../components/ui/Pagination';
import { getDossierStatutMeta, getPaiementMeta } from '../../../utils/dossierStatus';

/**
 * DossiersList - Liste backoffice des dossiers d'inscription
 * Route: /backoffice/dossiers
 * Accessible à: ADMIN, SUPERVISEUR, RESPONSABLE
 * RM-19: Les dossiers GRIS et EXCEPTION sont mis en évidence visuellement
 * Référence: F-9 Backoffice Dossiers (Todo_front.pdf)
 */
export default function DossiersList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dossiers, setDossiers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    statut: '',
    search: '',
  });

  const { execute, isLoading } = useApi();

  const loadDossiers = async (page = 1) => {
    await execute(
      () =>
        inscriptionsApi.getAllBackoffice({
          page,
          limit: 10,
          ...filters,
        }),
      {
        onSuccess: (data) => {
          setDossiers(data.data || []);
          setMeta(data.meta || { page: 1, totalPages: 1, total: 0 });
        },
      }
    );
  };

  useEffect(() => {
    loadDossiers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleSearchChange = (e) => {
    setFilters({ ...filters, search: e.target.value });
  };

  const handleStatutChange = (e) => {
    setFilters({ ...filters, statut: e.target.value });
  };

  const getStatutBadge = (statut) => {
    const config = getDossierStatutMeta(statut);
    return <Badge variant={config.variant} size="small">{config.label}</Badge>;
  };

  const getPaiementBadge = (paiement, dossierStatut) => {
    const config = getPaiementMeta(paiement, dossierStatut);
    return <Badge variant={config.variant} size="small">{config.label}</Badge>;
  };

  // RM-19: Fonction pour identifier les dossiers prioritaires
  const isPriorityDossier = (statut) => {
    return statut === 'GRIS' || statut === 'EXCEPTION';
  };

  const columns = [
    {
      key: 'apprenant',
      label: 'Apprenant',
      render: (value, dossier) => {
        const apprenant = dossier.apprenant || {};
        const fullName = `${apprenant.nom || ''} ${apprenant.prenoms || ''}`.trim() || 'N/A';
        const isPriority = isPriorityDossier(dossier.statut);

        return (
          <button
            onClick={() => navigate(`/backoffice/dossiers/${dossier.id}`)}
            className={`text-left font-medium hover:underline ${
              isPriority ? 'text-warning font-bold' : 'text-primary'
            }`}
          >
            {fullName}
            {isPriority && <span className="ml-2 text-xs">⚠</span>}
          </button>
        );
      },
    },
    {
      key: 'formation',
      label: 'Formation',
      render: (_, dossier) => dossier.formation?.intitule || '-',
    },
    {
      key: 'statut',
      label: 'Statut',
      render: (value) => getStatutBadge(value),
    },
    {
      key: 'paiement',
      label: 'Paiement',
      render: (_, dossier) => getPaiementBadge(dossier.paiement, dossier.statut),
    },
    {
      key: 'created_at',
      label: 'Date de dépôt',
      render: (value) => new Date(value).toLocaleDateString('fr-FR'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, dossier) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="small"
            onClick={() => navigate(`/backoffice/dossiers/${dossier.id}`)}
          >
            Voir
          </Button>
          {(dossier.statut === 'EN_ATTENTE' ||
            dossier.statut === 'GRIS' ||
            dossier.statut === 'EXCEPTION') &&
           (user?.role === 'ADMIN' || user?.role === 'SUPERVISEUR') && (
            <Button
              variant="primary"
              size="small"
              onClick={() => navigate(`/backoffice/dossiers/${dossier.id}/decision`)}
            >
              Décision
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading && dossiers.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
              Gestion des dossiers
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-primary">
              Liste des dossiers d'inscription
            </h2>
            <p className="mt-2 text-subtext">
              {user?.role === 'RESPONSABLE'
                ? 'Gérez les dossiers de vos formations.'
                : 'Gérez tous les dossiers de la plateforme.'}
            </p>
          </div>
        </div>
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="Rechercher par nom, prénom ou email..."
              value={filters.search}
              onChange={handleSearchChange}
            />
          </div>
          <div className="w-48">
            <select
              value={filters.statut}
              onChange={handleStatutChange}
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none"
            >
              <option value="">Tous les statuts</option>
              <option value="EN_ATTENTE">En attente</option>
              <option value="EN_ATTENTE_VERIFICATION">En vérification</option>
              <option value="GRIS">Gris (priorité)</option>
              <option value="EXCEPTION">Exception (priorité)</option>
              <option value="RETENU">Retenu</option>
              <option value="PAYE_DIRECTEMENT">Paiement à initier</option>
              <option value="PAYE">Payé</option>
              <option value="CONFIRME">Confirmé</option>
              <option value="REJETE">Rejeté</option>
              <option value="REFUSE">Refusé</option>
              <option value="ARCHIVE">Archivé</option>
              <option value="ANNULE">Annulé</option>
            </select>
          </div>
        </div>

        {/* RM-19: Alerte visuelle pour dossiers prioritaires */}
        {dossiers.some(d => isPriorityDossier(d.statut)) && (
          <div className="mb-4 rounded-lg border-l-4 border-warning bg-warning/10 p-4">
            <p className="text-sm font-medium text-warning">
              <span className="mr-2">⚠</span>
              {dossiers.filter(d => isPriorityDossier(d.statut)).length} dossier(s)
              nécessite(nt) une attention prioritaire (GRIS ou EXCEPTION)
            </p>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-primary">
            {meta.total} dossier{meta.total > 1 ? 's' : ''}
          </h3>
        </div>

        <Table columns={columns} data={dossiers} />

        {meta.totalPages > 1 && (
          <div className="mt-4">
            <Pagination
              currentPage={meta.page}
              totalPages={meta.totalPages}
              onPageChange={loadDossiers}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
