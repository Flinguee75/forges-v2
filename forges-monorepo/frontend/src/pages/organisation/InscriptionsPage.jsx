import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { organisationApi } from '../../api/espace-organisation.api';
import { formationsApi } from '../../api/formations.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Spinner from '../../components/feedback/Spinner';
import Pagination from '../../components/ui/Pagination';

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
    const mapping = {
      EN_ATTENTE: { variant: 'gray', label: 'En attente' },
      EN_ATTENTE_VERIFICATION: { variant: 'warning', label: 'En attente de vérification' },
      RETENU: { variant: 'success', label: 'Retenu' },
      PAYE_DIRECTEMENT: { variant: 'success', label: 'Payé directement' },
      PAYE: { variant: 'success', label: 'Payé' },
      CONFIRME: { variant: 'success', label: 'Confirmé' },
      REJETE: { variant: 'danger', label: 'Rejeté' },
      REFUSE: { variant: 'danger', label: 'Refusé' },
      GRIS: { variant: 'warning', label: 'Liste grise' },
      EXCEPTION: { variant: 'warning', label: 'Exception' },
      ARCHIVE: { variant: 'gray', label: 'Archivé' },
      ANNULE: { variant: 'danger', label: 'Annulé' },
    };
    const config = mapping[statut] || { variant: 'gray', label: statut };
    return <Badge variant={config.variant} size="small">{config.label}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatMontant = (montant) => {
    if (!montant) return '0 FCFA';
    return `${Math.round(Number(montant || 0) / 100).toLocaleString('fr-FR')} FCFA`;
  };

  const columns = [
    {
      key: 'etudiant',
      label: 'Employé',
      render: (_, dossier) => {
        const etudiant = dossier.etudiant || {};
        return `${etudiant.prenom || ''} ${etudiant.nom || ''}`.trim() || 'N/A';
      },
    },
    {
      key: 'formation',
      label: 'Formation',
      render: (_, dossier) => dossier.session?.formation?.titre || 'N/A',
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
        const tarif = dossier.session?.formation?.tarif || 0;
        const remise = dossier.montant_remise || 0;
        return formatMontant(tarif - remise);
      },
    },
    {
      key: 'statut',
      label: 'Statut',
      render: (value) => getStatutBadge(value),
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
                <option value="PAYE_DIRECTEMENT">Payé</option>
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
