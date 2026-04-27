import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { organisationApi } from '../../api/espace-organisation.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Spinner from '../../components/feedback/Spinner';
import Pagination from '../../components/ui/Pagination';
import ProgressBar from '../../components/ui/ProgressBar';

/**
 * VouchersPage - Liste des vouchers de l'organisation
 * Route: /organisation/vouchers
 * Référence: MOD-10 Espace Organisation (CLAUDE.md)
 */
export default function VouchersPage() {
  const [vouchers, setVouchers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    statut: '',
    page: 1,
  });

  const { execute, isLoading } = useApi();

  const loadVouchers = async (page = 1) => {
    await execute(
      () => organisationApi.getVouchers({ ...filters, page, limit: 10 }),
      {
        onSuccess: (data) => {
          setVouchers(data.data || []);
          setMeta(data.meta || { page: 1, totalPages: 1, total: 0 });
        },
      }
    );
  };

  useEffect(() => {
    loadVouchers(filters.page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const getStatutBadge = (statut) => {
    const mapping = {
      ACTIF: { variant: 'success', label: 'Actif' },
      EPUISE: { variant: 'gray', label: 'Épuisé' },
      EXPIRE: { variant: 'danger', label: 'Expiré' },
      BROUILLON: { variant: 'gray', label: 'Brouillon' },
      REFUSE: { variant: 'danger', label: 'Refusé' },
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
      key: 'code',
      label: 'Code',
    },
    {
      key: 'formation',
      label: 'Formation',
      render: (_, voucher) => voucher.formation?.titre || 'N/A',
    },
    {
      key: 'valeur',
      label: 'Montant',
      render: (value, voucher) => {
        if (voucher.type_valeur === 'MONTANT') {
          return formatMontant(value);
        }
        return `${value}%`;
      },
    },
    {
      key: 'quota',
      label: 'Quota utilisé',
      render: (_, voucher) => {
        const utilise = voucher.quota_utilise || 0;
        const max = voucher.quota_max || 0;
        const percentage = max > 0 ? (utilise / max) * 100 : 0;

        let variant = 'success';
        if (percentage >= 100) variant = 'danger';
        else if (percentage >= 75) variant = 'warning';

        return (
          <div className="min-w-[150px]">
            <ProgressBar
              current={utilise}
              max={max}
              variant={variant}
              showLabel={true}
            />
          </div>
        );
      },
    },
    {
      key: 'date_expiration',
      label: 'Expiration',
      render: (value) => formatDate(value),
    },
    {
      key: 'statut',
      label: 'Statut',
      render: (value) => getStatutBadge(value),
    },
  ];

  if (isLoading && vouchers.length === 0) {
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
            Mes vouchers
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-primary">
            Vouchers organisation
          </h2>
          <p className="mt-2 text-subtext">
            Consultez l'état de vos vouchers achetés et leur utilisation.
          </p>
        </div>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="font-semibold text-primary">
            {meta.total} voucher{meta.total > 1 ? 's' : ''}
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
              <option value="ACTIF">Actif</option>
              <option value="EPUISE">Épuisé</option>
              <option value="EXPIRE">Expiré</option>
            </select>
          </div>
        </div>

        <Table columns={columns} data={vouchers} />

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
