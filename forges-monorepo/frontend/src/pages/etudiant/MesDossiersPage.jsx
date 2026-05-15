import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { etudiantApi } from '../../api/espace-etudiant.api';
import { trackClick } from '../../utils/analytics';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';
import { getDossierStatutMeta } from '../../utils/dossierStatus';

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
    const config = getDossierStatutMeta(statut);
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const isPaiementConfirme = (dossier) =>
    dossier?.paiement?.statut === 'CONFIRME' || dossier?.statut === 'PAYE';

  const canPay = (dossier) =>
    ['RETENU', 'PAYE_DIRECTEMENT'].includes(dossier?.statut) && !isPaiementConfirme(dossier);

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
        const final = dossier.paiement?.montant_final ?? getFormationTarif(dossier);
        const remise = dossier.paiement?.reduction_appliquee || 0;
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
            onClick={() => trackClick('link-dossier-detail', { dossierId: dossier.id, statut: dossier.statut })}
            className="text-sm text-primary hover:underline"
          >
            Voir détails
          </Link>
          {isPaiementConfirme(dossier) && (
            <Link
              to={`/apprenant/attestations?dossier=${dossier.id}`}
              onClick={() => trackClick('link-attestation-pdf', { dossierId: dossier.id })}
              className="text-sm text-success hover:underline"
            >
              Attestation
            </Link>
          )}
          {canPay(dossier) && (
            <Link
              to="/apprenant/paiements"
              onClick={() => trackClick('btn-payer', { dossierId: dossier.id, statut: dossier.statut })}
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
              onChange={(e) => {
                trackClick('filter-statut', { statut: e.target.value });
                setFilters({ ...filters, statut: e.target.value, page: 1 });
              }}
              className="w-full rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none"
            >
              <option value="">Tous les statuts</option>
              <option value="EN_ATTENTE">En attente</option>
              <option value="EN_ATTENTE_VERIFICATION">En attente de verification</option>
              <option value="RETENU">Retenu</option>
              <option value="PAYE_DIRECTEMENT">Paiement à initier</option>
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
