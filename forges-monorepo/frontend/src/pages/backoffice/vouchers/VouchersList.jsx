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
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statutBadge(statut) {
  const map = {
    ACTIF: 'success',
    EN_ATTENTE: 'warning',
    BROUILLON: 'warning',
    EPUISE: 'gray',
    EXPIRE: 'gray',
    REFUSE: 'danger',
  };
  const labels = {
    EN_ATTENTE: 'En attente',
    EPUISE: 'Epuise',
    EXPIRE: 'Expire',
    REFUSE: 'Refuse',
  };
  return <Badge variant={map[statut] || 'gray'}>{labels[statut] || statut}</Badge>;
}

export default function VouchersList() {
  const navigate = useNavigate();
  const { execute, isLoading } = useApi();
  const [vouchers, setVouchers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: '', statut: '' });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editVoucher, setEditVoucher] = useState(null);
  const [editForm, setEditForm] = useState({ quota_max: '', date_expiration: '', statut: '' });

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

  const openEdit = (voucher) => {
    setEditVoucher(voucher);
    setEditForm({
      quota_max: voucher.quota_max ?? '',
      date_expiration: voucher.date_expiration
        ? new Date(voucher.date_expiration).toISOString().slice(0, 10)
        : '',
      statut: voucher.statut || '',
    });
  };

  const handleUpdate = async () => {
    const payload = {};
    if (editForm.quota_max !== '') payload.quota_max = Number(editForm.quota_max);
    if (editForm.date_expiration) payload.date_expiration = editForm.date_expiration;
    if (editForm.statut) payload.statut = editForm.statut;

    await execute(() => vouchersApi.update(editVoucher.id, payload), {
      onSuccess: () => {
        setEditVoucher(null);
        loadVouchers();
      },
      successMessage: 'Voucher mis a jour',
      showErrorToast: true,
    });
  };

  const handleDelete = async (id) => {
    await execute(() => vouchersApi.delete(id), {
      onSuccess: () => {
        setConfirmDelete(null);
        loadVouchers();
      },
      successMessage: 'Voucher supprime',
      showErrorToast: true,
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">Gestion des vouchers</p>
            <h2 className="mt-3 text-2xl font-semibold text-primary">Liste des vouchers</h2>
            <p className="mt-2 text-subtext">{meta.total} voucher{meta.total > 1 ? 's' : ''}</p>
          </div>
          <Button onClick={() => navigate('/backoffice/vouchers/new')}>Creer un voucher promo</Button>
        </div>
      </div>

      <Card>
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Rechercher par code ou formation"
            value={filters.search}
            onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))}
          />
          <select
            value={filters.statut}
            onChange={(e) => setFilters((c) => ({ ...c, statut: e.target.value }))}
            className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text"
          >
            <option value="">Tous les statuts</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="BROUILLON">Brouillon</option>
            <option value="ACTIF">Actif</option>
            <option value="EPUISE">Epuise</option>
            <option value="EXPIRE">Expire</option>
            <option value="REFUSE">Refuse</option>
          </select>
        </div>

        {isLoading && vouchers.length === 0 ? (
          <div className="py-12 flex justify-center"><Spinner size="large" /></div>
        ) : vouchers.length === 0 ? (
          <EmptyState title="Aucun voucher" message="Aucun voucher ne correspond aux filtres." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm font-semibold text-primary">
                  <th className="pb-3">Code</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Formation</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3 text-center">Quota</th>
                  <th className="pb-3">Expiration</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((voucher) => {
                  const isExpired = voucher.date_expiration && new Date(voucher.date_expiration) < new Date();
                  return (
                    <tr key={voucher.id} className="border-b border-border hover:bg-gray-50">
                      <td className="py-4 font-mono text-sm text-text">{voucher.code}</td>
                      <td className="py-4 text-sm text-text">{voucher.type}</td>
                      <td className="py-4 text-sm text-text">
                        {voucher.formation?.titre || voucher.formation?.intitule || '-'}
                      </td>
                      <td className="py-4">{statutBadge(voucher.statut)}</td>
                      <td className="py-4 text-center">
                        <span className="text-sm font-medium">{voucher.quota_utilise ?? 0}</span>
                        <span className="text-subtext text-sm"> / {voucher.quota_max ?? '∞'}</span>
                      </td>
                      <td className="py-4 text-sm">
                        <span className={isExpired ? 'text-danger font-medium' : 'text-text'}>
                          {formatDate(voucher.date_expiration)}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="small" variant="outline" onClick={() => navigate(`/backoffice/vouchers/${voucher.id}`)}>
                            Voir
                          </Button>
                          <Button size="small" variant="outline" onClick={() => openEdit(voucher)}>
                            Modifier
                          </Button>
                          <Button size="small" variant="danger" onClick={() => setConfirmDelete(voucher)}>
                            Supprimer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modale modification */}
      {editVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-primary">Modifier le voucher</h2>
            <p className="mt-1 font-mono text-sm text-subtext">{editVoucher.code}</p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Quota maximum</label>
                <Input
                  type="number"
                  value={editForm.quota_max}
                  onChange={(e) => setEditForm((f) => ({ ...f, quota_max: e.target.value }))}
                  placeholder="Laisser vide = illimite"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Date d'expiration</label>
                <input
                  type="date"
                  value={editForm.date_expiration}
                  onChange={(e) => setEditForm((f) => ({ ...f, date_expiration: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Statut</label>
                <select
                  value={editForm.statut}
                  onChange={(e) => setEditForm((f) => ({ ...f, statut: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="EN_ATTENTE">En attente</option>
                  <option value="ACTIF">Actif</option>
                  <option value="EPUISE">Epuise</option>
                  <option value="EXPIRE">Expire</option>
                  <option value="REFUSE">Refuse</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Button onClick={handleUpdate} loading={isLoading}>Enregistrer</Button>
              <Button variant="outline" onClick={() => setEditVoucher(null)}>Annuler</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modale confirmation suppression */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-primary">Confirmer la suppression</h2>
            <p className="mt-2 text-sm text-subtext">
              Supprimer definitivement le voucher <strong className="font-mono">{confirmDelete.code}</strong> ?
              Cette action est irreversible.
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="danger" onClick={() => handleDelete(confirmDelete.id)} loading={isLoading}>
                Supprimer
              </Button>
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>Annuler</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
