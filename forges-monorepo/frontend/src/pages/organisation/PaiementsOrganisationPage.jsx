import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { organisationApi } from '../../api/espace-organisation.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Spinner from '../../components/feedback/Spinner';
import Pagination from '../../components/ui/Pagination';

/**
 * PaiementsOrganisationPage - Historique des paiements de l'organisation
 * Route: /organisation/paiements
 * Référence: MOD-10 Espace Organisation (CLAUDE.md)
 */
export default function PaiementsOrganisationPage() {
  const [paiements, setPaiements] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    statut: '',
    page: 1,
  });

  const { execute, isLoading } = useApi();

  const loadPaiements = async (page = 1) => {
    await execute(
      () => organisationApi.getPaiements({ ...filters, page, limit: 10 }),
      {
        onSuccess: (data) => {
          setPaiements(data.data || []);
          setMeta(data.meta || { page: 1, totalPages: 1, total: 0 });
        },
      }
    );
  };

  useEffect(() => {
    loadPaiements(filters.page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const getStatutBadge = (statut) => {
    const mapping = {
      EN_ATTENTE: { variant: 'gray', label: 'En attente' },
      CONFIRME: { variant: 'success', label: 'Confirmé' },
      ECHOUE: { variant: 'danger', label: 'Échoué' },
      EXPIRE: { variant: 'danger', label: 'Expiré' },
      REMBOURSE: { variant: 'warning', label: 'Remboursé' },
    };
    const config = mapping[statut] || { variant: 'gray', label: statut };
    return <Badge variant={config.variant} size="small">{config.label}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatMontant = (centimes) => {
    if (!centimes) return '0 FCFA';
    return `${Math.round(centimes / 100).toLocaleString('fr-FR')} FCFA`;
  };

  const columns = [
    {
      key: 'reference',
      label: 'Référence',
    },
    {
      key: 'type',
      label: 'Type',
      render: (_, paiement) => {
        if (paiement.methode_paiement === 'VOUCHER_ORG') {
          return 'Voucher Organisation';
        }
        return paiement.methode_paiement || 'N/A';
      },
    },
    {
      key: 'montant',
      label: 'Montant',
      render: (value) => formatMontant(value),
    },
    {
      key: 'dossier',
      label: 'Employé',
      render: (_, paiement) => {
        const etudiant = paiement.dossier?.etudiant || {};
        return `${etudiant.prenom || ''} ${etudiant.nom || ''}`.trim() || 'N/A';
      },
    },
    {
      key: 'formation',
      label: 'Formation',
      render: (_, paiement) => {
        return paiement.dossier?.session?.formation?.titre || 'N/A';
      },
    },
    {
      key: 'statut',
      label: 'Statut',
      render: (value) => getStatutBadge(value),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (value) => formatDate(value),
    },
  ];

  if (isLoading && paiements.length === 0) {
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
            Paiements
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-primary">
            Historique des paiements
          </h2>
          <p className="mt-2 text-subtext">
            Consultez l'historique de tous vos paiements et vouchers utilisés.
          </p>
        </div>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="font-semibold text-primary">
            {meta.total} paiement{meta.total > 1 ? 's' : ''}
          </h3>

          <div className="flex items-center gap-3">
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
              <option value="CONFIRME">Confirmé</option>
              <option value="ECHOUE">Échoué</option>
              <option value="EXPIRE">Expiré</option>
            </select>
          </div>
        </div>

        <Table columns={columns} data={paiements} />

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
