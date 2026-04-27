import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import vouchersApi from '../../../api/vouchers.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/feedback/EmptyState';
import Spinner from '../../../components/feedback/Spinner';
import Input from '../../../components/ui/Input';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('fr-FR') : 'N/A';
}

export default function VouchersList() {
  const navigate = useNavigate();
  const { execute, isLoading } = useApi();
  const [vouchers, setVouchers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: '', statut: '' });

  const loadVouchers = async () => {
    await execute(() => vouchersApi.getAll(filters), {
      onSuccess: (data) => {
        setVouchers(data?.data || []);
        setMeta(data?.meta || { page: 1, totalPages: 1, total: 0 });
      },
    });
  };

  useEffect(() => {
    loadVouchers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.statut]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">Gestion des vouchers</p>
            <h2 className="mt-3 text-2xl font-semibold text-primary">Liste des vouchers</h2>
            <p className="mt-2 text-subtext">Le backoffice consomme le runtime réel pour les vouchers organisation et promotionnels.</p>
          </div>
          <Button onClick={() => navigate('/backoffice/vouchers/new')}>Créer un voucher promo</Button>
        </div>
      </div>

      <Card>
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Rechercher par code ou formation"
            value={filters.search}
            onChange={(e) => setFilters((current) => ({ ...current, search: e.target.value }))}
          />
          <select
            value={filters.statut}
            onChange={(e) => setFilters((current) => ({ ...current, statut: e.target.value }))}
            className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text"
          >
            <option value="">Tous les statuts</option>
            <option value="BROUILLON">Brouillon</option>
            <option value="ACTIF">Actif</option>
            <option value="EPUISE">Épuisé</option>
            <option value="EXPIRE">Expiré</option>
            <option value="REFUSE">Refusé</option>
          </select>
        </div>

        {isLoading && vouchers.length === 0 ? (
          <div className="py-12">
            <Spinner size="large" />
          </div>
        ) : vouchers.length === 0 ? (
          <EmptyState
            title="Aucun voucher"
            message="Aucun voucher n'a été trouvé avec les filtres courants."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm font-semibold text-primary">
                  <th className="pb-3">Code</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Formation</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3 text-right">Quota</th>
                  <th className="pb-3">Expiration</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((voucher) => (
                  <tr key={voucher.id} className="border-b border-border hover:bg-gray-50">
                    <td className="py-4 font-mono text-sm text-text">{voucher.code}</td>
                    <td className="py-4 text-sm text-text">{voucher.type}</td>
                    <td className="py-4 text-sm text-text">{voucher.formation?.titre || voucher.formation?.intitule || '-'}</td>
                    <td className="py-4">
                      <Badge variant={voucher.statut === 'ACTIF' ? 'success' : voucher.statut === 'BROUILLON' ? 'warning' : 'gray'}>
                        {voucher.statut}
                      </Badge>
                    </td>
                    <td className="py-4 text-right text-sm text-text">
                      {voucher.quota_utilise || 0} / {voucher.quota_max || 0}
                    </td>
                    <td className="py-4 text-sm text-text">{formatDate(voucher.date_expiration)}</td>
                    <td className="py-4 text-right">
                      <Button size="small" variant="outline" onClick={() => navigate(`/backoffice/vouchers/${voucher.id}`)}>
                        Voir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="text-sm text-subtext">
        {meta.total} voucher{meta.total > 1 ? 's' : ''} trouvé{meta.total > 1 ? 's' : ''}
      </div>
    </div>
  );
}
