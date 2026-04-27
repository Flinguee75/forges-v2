import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import apporteursApi from '../../api/apporteurs.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/feedback/EmptyState';
import Spinner from '../../components/feedback/Spinner';

function formatMontant(centimes) {
  const montantXOF = Math.round(Number(centimes || 0) / 100);
  return `${montantXOF.toLocaleString('fr-FR')} FCFA`;
}

function formatDate(dateString) {
  if (!dateString) {
    return 'N/A';
  }

  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getStatutBadge(statut) {
  const mapping = {
    EN_ATTENTE: { label: 'En attente', variant: 'gray' },
    VALIDEE: { label: 'Validée', variant: 'info' },
    REVERSEE: { label: 'Reversée', variant: 'success' },
    BLOQUEE: { label: 'Bloquée', variant: 'danger' },
  };

  return mapping[statut] || { label: statut || 'Inconnu', variant: 'gray' };
}

export default function MesCommissions() {
  const { execute, isLoading, error } = useApi();
  const [commissions, setCommissions] = useState([]);
  const [filters, setFilters] = useState({
    mois: '',
    statut: '',
  });

  const loadCommissions = useCallback(async () => {
    await execute(
      () => apporteursApi.getMesCommissions(filters),
      {
        onSuccess: (data) => {
          setCommissions(data.data || []);
        },
      }
    );
  }, [execute, filters]);

  useEffect(() => {
    loadCommissions();
  }, [loadCommissions]);

  const totalCommission = useMemo(() => {
    return commissions.reduce((sum, item) => sum + (item.montant_commission || 0), 0);
  }, [commissions]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-apporteur)]/70">
          Espace apporteur
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-text">Mes commissions</h1>
        <p className="mt-2 text-sm text-subtext">
          Historique détaillé des commissions générées par vos parrainages.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <Card title="Filtres">
        <div className="grid gap-4 md:grid-cols-[220px,220px,1fr]">
          <div>
            <label htmlFor="commissions-mois" className="mb-1.5 block text-sm font-medium text-text">
              Mois
            </label>
            <input
              id="commissions-mois"
              type="month"
              value={filters.mois}
              onChange={(event) => setFilters((current) => ({ ...current, mois: event.target.value }))}
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="commissions-statut" className="mb-1.5 block text-sm font-medium text-text">
              Statut
            </label>
            <select
              id="commissions-statut"
              value={filters.statut}
              onChange={(event) => setFilters((current) => ({ ...current, statut: event.target.value }))}
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Tous les statuts</option>
              <option value="EN_ATTENTE">En attente</option>
              <option value="VALIDEE">Validée</option>
              <option value="REVERSEE">Reversée</option>
              <option value="BLOQUEE">Bloquée</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setFilters({ mois: '', statut: '' })}
              className="rounded-lg border border-border bg-white px-4 py-2 text-sm text-text hover:bg-gray-50"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Nombre de commissions">
          <p className="text-2xl font-semibold text-text">{commissions.length}</p>
        </Card>
        <Card title="Montant cumulé affiché">
          <p className="text-2xl font-semibold text-text">{formatMontant(totalCommission)}</p>
        </Card>
      </div>

      {isLoading && commissions.length === 0 ? (
        <div className="flex justify-center py-12">
          <Spinner size="large" />
        </div>
      ) : commissions.length === 0 ? (
        <EmptyState
          title="Aucune commission"
          message="Aucune commission ne correspond aux filtres sélectionnés."
        />
      ) : (
        <Card title="Historique des commissions">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm font-semibold text-text">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Transaction</th>
                  <th className="pb-3">Mois référence</th>
                  <th className="pb-3 text-right">Montant base</th>
                  <th className="pb-3 text-right">Commission</th>
                  <th className="pb-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((commission) => {
                  const statut = getStatutBadge(commission.statut);

                  return (
                    <tr key={commission.id} className="border-b border-border">
                      <td className="py-4 text-sm text-text">{formatDate(commission.created_at)}</td>
                      <td className="py-4 text-sm text-subtext">
                        <div>{commission.paiement?.transaction_id || commission.paiement_id || 'N/A'}</div>
                        <div className="text-xs">
                          Confirmé le {formatDate(commission.paiement?.confirmed_at)}
                        </div>
                      </td>
                      <td className="py-4 text-sm text-subtext">
                        {commission.mois_reference || 'N/A'}
                      </td>
                      <td className="py-4 text-right text-sm text-text">
                        {formatMontant(commission.montant_base)}
                      </td>
                      <td className="py-4 text-right text-sm font-medium text-text">
                        {formatMontant(commission.montant_commission)}
                      </td>
                      <td className="py-4">
                        <Badge variant={statut.variant} size="small">
                          {statut.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
