import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { organisationApi } from '../../api/espace-organisation.api';
import { formationsApi } from '../../api/formations.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Spinner from '../../components/feedback/Spinner';
import Pagination from '../../components/ui/Pagination';
import { getDossierStatutMeta } from '../../utils/dossierStatus';

/**
 * InscriptionsPage - Liste des inscriptions des employés
 * Route: /organisation/inscriptions
 * Référence: MOD-10 Espace Organisation (CLAUDE.md)
 * Filtres: statut, formation_id
 */
export default function InscriptionsPage() {
  const [inscriptions, setInscriptions] = useState([]);
  const [formations, setFormations] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    statut: '',
    formation_id: '',
    page: 1,
  });

  const { execute, isLoading } = useApi();

  const loadFormations = async () => {
    await execute(
      () => formationsApi.getAll({ limit: 100, statut: 'PUBLIEE' }),
      {
        onSuccess: (data) => {
          setFormations(data.data || []);
        },
      }
    );
  };

  const loadInscriptions = async (page = 1) => {
    await execute(
      () => organisationApi.getInscriptions({ ...filters, page, limit: 10 }),
      {
        onSuccess: (data) => {
          setInscriptions(data.data || []);
          setMeta(data.meta || { page: 1, totalPages: 1, total: 0 });
        },
      }
    );
  };

  useEffect(() => {
    loadFormations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadInscriptions(filters.page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const getStatutBadge = (statut) => {
    const config = getDossierStatutMeta(statut);
    return <Badge variant={config.variant} size="small">{config.label}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatMontant = (montant) => {
    if (!montant) return '0 FCFA';
    return `${Math.round(Number(montant) / 100).toLocaleString('fr-FR')} FCFA`;
  };

  const columns = [
    {
      key: 'etudiant',
      label: 'Employe',
      render: (_, dossier) => {
        const etudiant = dossier.etudiant || {};
        return `${etudiant.prenom || ''} ${etudiant.nom || ''}`.trim() || 'N/A';
      },
    },
    {
      key: 'formation',
      label: 'Formation',
      render: (_, dossier) => dossier.formation?.intitule || dossier.session?.formation?.titre || 'N/A',
    },
    {
      key: 'session',
      label: 'Session',
      render: (_, dossier) => formatDate(dossier.session?.date_debut),
    },
    {
      key: 'montant',
      label: 'Montant',
      render: (_, dossier) => {
        const montant_final = dossier.paiement?.montant_final;
        const montant = (montant_final != null && montant_final > 0)
          ? montant_final
          : dossier.session?.formation?.tarif ?? dossier.formation?.cout_catalogue ?? 0;
        return formatMontant(montant);
      },
    },
    {
      key: 'statut',
      label: 'Statut',
      render: (_, dossier) => (
        <div className="flex flex-col gap-1">
          {getStatutBadge(dossier.statut)}
          {dossier.organisation_inscriptrice_id && (
            <Badge variant="info" size="small" data-testid="badge-inscrit-par-org">
              Inscrit par l'org
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      label: 'Date inscription',
      render: (value) => formatDate(value),
    },
  ];

  if (isLoading && inscriptions.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
            Inscriptions
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-primary">
            Inscriptions de vos employés
          </h2>
          <p className="mt-2 text-subtext">
            Suivez l'état des inscriptions de vos employés aux formations.
          </p>
        </div>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h3 className="font-semibold text-primary">
            {meta.total} inscription{meta.total > 1 ? 's' : ''}
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-subtext">Formation:</label>
              <select
                value={filters.formation_id}
                onChange={(e) =>
                  setFilters({ ...filters, formation_id: e.target.value, page: 1 })
                }
                className="rounded-md border border-border px-3 py-2 text-sm"
              >
                <option value="">Toutes</option>
                {formations.map((formation) => (
                  <option key={formation.id} value={formation.id}>
                    {formation.titre}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-subtext">Statut:</label>
              <select
                value={filters.statut}
                onChange={(e) =>
                  setFilters({ ...filters, statut: e.target.value, page: 1 })
                }
                className="rounded-md border border-border px-3 py-2 text-sm"
              >
                <option value="">Tous</option>
                <option value="EN_ATTENTE">En attente</option>
                <option value="EN_ATTENTE_VERIFICATION">En vérification</option>
              <option value="PAYE_DIRECTEMENT">Paiement requis</option>
                <option value="PAYE">Payé (confirmé)</option>
                <option value="CONFIRME">Confirmé</option>
                <option value="REJETE">Rejeté</option>
                <option value="ANNULE">Annulé</option>
              </select>
            </div>
          </div>
        </div>

        <Table columns={columns} data={inscriptions} />

        {meta.totalPages > 1 && (
          <div className="mt-4">
            <Pagination
              currentPage={meta.page}
              totalPages={meta.totalPages}
              onPageChange={(page) => setFilters({ ...filters, page })}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
