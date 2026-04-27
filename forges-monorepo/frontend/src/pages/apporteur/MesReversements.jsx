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

function getStatutBadge(statut) {
  const mapping = {
    EN_ATTENTE: { label: 'En attente', variant: 'gray' },
    VALIDEE: { label: 'Validé', variant: 'info' },
    REVERSEE: { label: 'Reversé', variant: 'success' },
    BLOQUEE: { label: 'Bloqué', variant: 'danger' },
  };

  return mapping[statut] || { label: statut || 'Inconnu', variant: 'gray' };
}

export default function MesReversements() {
  const { execute, isLoading, error } = useApi();
  const [reversements, setReversements] = useState([]);

  const loadReversements = useCallback(async () => {
    await execute(
      () => apporteursApi.getMesReversements(),
      {
        onSuccess: (data) => {
          setReversements(data.data || []);
        },
      }
    );
  }, [execute]);

  useEffect(() => {
    loadReversements();
  }, [loadReversements]);

  const totalReverse = useMemo(() => {
    return reversements
      .filter((item) => item.statut === 'REVERSEE')
      .reduce((sum, item) => sum + (item.montant_commission || 0), 0);
  }, [reversements]);

  const totalEnAttente = useMemo(() => {
    return reversements
      .filter((item) => item.statut !== 'REVERSEE')
      .reduce((sum, item) => sum + (item.montant_commission || 0), 0);
  }, [reversements]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-apporteur)]/70">
          Espace apporteur
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-text">Mes reversements</h1>
        <p className="mt-2 text-sm text-subtext">
          Synthèse mensuelle des reversements et reports appliqués à vos commissions.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Total reversé">
          <p className="text-3xl font-semibold text-success">{formatMontant(totalReverse)}</p>
        </Card>
        <Card title="Total en attente">
          <p className="text-3xl font-semibold text-warning">{formatMontant(totalEnAttente)}</p>
        </Card>
      </div>

      <Card title="Règle métier">
        <p className="text-sm text-subtext">
          Les commissions sont agrégées mensuellement. Si le cumul reste sous le seuil minimum,
          le montant est reporté au mois suivant.
        </p>
      </Card>

      {isLoading && reversements.length === 0 ? (
        <div className="flex justify-center py-12">
          <Spinner size="large" />
        </div>
      ) : reversements.length === 0 ? (
        <EmptyState
          title="Aucun reversement"
          message="Aucun reversement n’est encore disponible pour votre compte."
        />
      ) : (
        <Card title="Historique mensuel">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm font-semibold text-text">
                  <th className="pb-3">Mois</th>
                  <th className="pb-3 text-right">Transactions</th>
                  <th className="pb-3 text-right">Montant base</th>
                  <th className="pb-3 text-right">Montant commission</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3">Message</th>
                </tr>
              </thead>
              <tbody>
                {reversements.map((reversement) => {
                  const statut = getStatutBadge(reversement.statut);

                  return (
                    <tr key={reversement.mois} className="border-b border-border">
                      <td className="py-4 text-sm text-text">{reversement.mois}</td>
                      <td className="py-4 text-right text-sm text-text">
                        {reversement.nb_transactions || 0}
                      </td>
                      <td className="py-4 text-right text-sm text-text">
                        {formatMontant(reversement.montant_base)}
                      </td>
                      <td className="py-4 text-right text-sm font-medium text-text">
                        {formatMontant(reversement.montant_commission)}
                      </td>
                      <td className="py-4">
                        <Badge variant={statut.variant} size="small">
                          {statut.label}
                        </Badge>
                      </td>
                      <td className="py-4 text-sm text-subtext">
                        {reversement.message || 'Aucun message'}
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
