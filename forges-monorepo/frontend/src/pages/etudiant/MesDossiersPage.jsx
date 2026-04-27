import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { etudiantApi } from '../../api/espace-etudiant.api';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';

/**
 * MesDossiersPage - Liste des dossiers d'inscription de l'apprenant
 * Route: /apprenant/dossiers
 * Référence: MOD-09 Espace Apprenant
 */
export default function MesDossiersPage() {
  const [dossiers, setDossiers] = useState([]);
  const [filters, setFilters] = useState({
    statut: '',
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
  });

  const { execute, isLoading } = useApi();

  const loadDossiers = async () => {
    try {
      await execute(() => etudiantApi.getMesDossiers(filters), {
        onSuccess: (data) => {
          setDossiers(Array.isArray(data) ? data : data?.data || data?.dossiers || []);
          setPagination({
            total: data?.meta?.total || 0,
            totalPages: data?.meta?.totalPages || 0,
            currentPage: data?.meta?.page || 1,
          });
        },
      });
    } catch {
      setDossiers([]);
    }
  };

  useEffect(() => {
    loadDossiers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const getStatutBadge = (statut) => {
    const mapping = {
      EN_ATTENTE: { variant: 'gray', label: 'En attente' },
      EN_ATTENTE_VERIFICATION: { variant: 'gray', label: 'En attente de verification' },
      RETENU: { variant: 'success', label: 'Retenu' },
      PAYE_DIRECTEMENT: { variant: 'success', label: 'Paiement direct' },
      PAYE: { variant: 'success', label: 'Paye' },
      CONFIRME: { variant: 'success', label: 'Confirme' },
      REJETE: { variant: 'danger', label: 'Rejete' },
      REFUSE: { variant: 'danger', label: 'Refusé' },
      GRIS: { variant: 'warning', label: 'Liste grise' },
      EXCEPTION: { variant: 'warning', label: 'Exception' },
      ARCHIVE: { variant: 'gray', label: 'Archivé' },
      ANNULE: { variant: 'danger', label: 'Annulé' },
    };

    const config = mapping[statut] || { variant: 'gray', label: statut };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getFormation = (dossier) => dossier?.formation || dossier?.session?.formation;
  const getFormationTitre = (dossier) => {
    const formation = getFormation(dossier);
    return formation?.titre || formation?.intitule || 'N/A';
  };
  const getFormationTarif = (dossier) => {
    const formation = getFormation(dossier);
    return formation?.tarif || formation?.cout_catalogue || 0;
  };

  const columns = [
    {
      key: 'formation',
      label: 'Formation',
      render: (_, dossier) => (
        <Link to={`/apprenant/dossiers/${dossier.id}`} className="block hover:bg-bg p-1 -m-1 rounded">
          <div className="font-medium text-primary hover:underline">
            {getFormationTitre(dossier)}
          </div>
          <div className="text-xs text-subtext">
            Session du {formatDate(dossier.session?.date_debut)}
          </div>
        </Link>
      ),
    },
    {
      key: 'statut',
      label: 'Statut',
      render: (_, dossier) => getStatutBadge(dossier.statut),
    },
    {
      key: 'date_soumission',
      label: 'Date de soumission',
      render: (_, dossier) => formatDate(dossier.created_at),
    },
    {
      key: 'montant',
      label: 'Montant',
      render: (_, dossier) => {
        const montant = getFormationTarif(dossier);
        const remise = dossier.montant_remise || 0;
        const final = montant - remise;
        return (
          <div>
            <div className="font-medium">
              {(final / 100).toLocaleString('fr-FR')} FCFA
            </div>
            {remise > 0 && (
              <div className="text-xs text-success">
                Remise: -{(remise / 100).toLocaleString('fr-FR')} FCFA
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, dossier) => (
        <div className="flex flex-col gap-1">
          <Link
            to={`/apprenant/dossiers/${dossier.id}`}
            className="text-sm text-primary hover:underline"
          >
            Voir détails
          </Link>
          {(dossier.statut === 'PAYE' || dossier.statut === 'CONFIRME') && (
            <Link
              to={`/apprenant/attestations?dossier=${dossier.id}`}
              className="text-sm text-success hover:underline"
            >
              Attestation
            </Link>
          )}
          {(dossier.statut === 'RETENU' || dossier.statut === 'PAYE_DIRECTEMENT') && (
            <Link
              to="/apprenant/paiements"
              className="text-sm text-warning hover:underline"
            >
              Payer
            </Link>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-primary">Mes Dossiers d'Inscription</h1>
        <p className="mt-2 text-subtext">
          Suivez l'état de vos inscriptions et effectuez les actions nécessaires
        </p>
      </div>

      <div className="mb-6 rounded-lg bg-white p-4 shadow">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-2 block text-sm font-medium text-text">
              Filtrer par statut
            </label>
            <select
              value={filters.statut}
              onChange={(e) =>
                setFilters({ ...filters, statut: e.target.value, page: 1 })
              }
              className="w-full rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none"
            >
              <option value="">Tous les statuts</option>
              <option value="EN_ATTENTE">En attente</option>
              <option value="EN_ATTENTE_VERIFICATION">En attente de verification</option>
              <option value="RETENU">Retenu</option>
              <option value="PAYE_DIRECTEMENT">Paiement direct</option>
              <option value="PAYE">Paye</option>
              <option value="CONFIRME">Confirme</option>
              <option value="REJETE">Rejete</option>
              <option value="REFUSE">Refusé</option>
              <option value="GRIS">Liste grise</option>
              <option value="EXCEPTION">Exception</option>
              <option value="ANNULE">Annulé</option>
              <option value="ARCHIVE">Archivé</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="large" />
        </div>
      ) : dossiers.length === 0 ? (
        <EmptyState
          title="Aucun dossier trouvé"
          message="Vous n'avez pas encore de dossier d'inscription. Consultez le catalogue pour vous inscrire à une formation."
          action={
            <Link to="/apprenant/catalogue" className="text-primary hover:underline">
              Voir le catalogue
            </Link>
          }
        />
      ) : (
        <>
          <Table columns={columns} data={dossiers} />
          {pagination.totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={(page) => setFilters({ ...filters, page })}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
