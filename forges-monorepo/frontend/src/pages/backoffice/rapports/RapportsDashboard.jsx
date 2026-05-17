import { useEffect, useState } from 'react';
import { dashboardApi } from '../../../api/dashboard.api';
import EmptyState from '../../../components/feedback/EmptyState';
import Spinner from '../../../components/feedback/Spinner';
import Badge from '../../../components/ui/Badge';
import Card from '../../../components/ui/Card';
import { useApi } from '../../../hooks/useApi';
import { getDossierStatutMeta, PAIEMENT_STATUT_META } from '../../../utils/dossierStatus';

function formatFcfa(amount) {
  return `${Math.round(Number(amount || 0) / 100).toLocaleString('fr-FR')} FCFA`;
}

function getPaiementStatutMeta(statut) {
  return PAIEMENT_STATUT_META[statut] || { variant: 'gray', label: statut || 'Aucun' };
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-subtext">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-primary">{value}</p>
    </div>
  );
}

export default function RapportsDashboard() {
  const { execute, isLoading } = useApi();
  const [stats, setStats] = useState(null);
  const [rapports, setRapports] = useState(null);

  useEffect(() => {
    const load = async () => {
      await execute(
        async () => {
          const [globalStats, reportData] = await Promise.all([
            dashboardApi.getDashboardStats(),
            dashboardApi.getRapportData(),
          ]);
          return { globalStats, reportData };
        },
        {
          showErrorToast: false,
          onSuccess: (data) => {
            setStats(data?.globalStats || null);
            setRapports(data?.reportData || null);
          },
        }
      );
    };

    load();
  }, [execute]);

  if (isLoading && !stats && !rapports) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  const summary = [
    { label: 'Formations', value: stats?.totalFormationsActives ?? stats?.totalFormations ?? 0 },
    { label: 'Sessions', value: stats?.totalSessionsOuvertes ?? stats?.totalSessions ?? 0 },
    { label: 'Dossiers', value: stats?.totalDossiers ?? 0 },
    { label: 'Paiements confirmés', value: formatFcfa(stats?.montantPayeTotal ?? 0) },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
          Dashboard rapports
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-primary">
          Rapports d'activité
        </h1>
        <p className="mt-2 text-sm text-subtext">
          Consultez et exportez les rapports d&apos;activité de la plateforme.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <Metric key={item.label} {...item} />
        ))}
      </div>

      <Card title="Répartition des dossiers">
        {stats?.dossiersByStatut ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(stats.dossiersByStatut).map(([statut, count]) => (
              <div key={statut} className="rounded-lg border border-border p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-subtext">{statut}</p>
                <p className="mt-2 text-xl font-semibold text-text">{count}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Aucune statistique"
            message="Le backend ne renvoie pas encore de ventilation détaillée."
          />
        )}
      </Card>

      <Card title="Rapports récents">
        {Array.isArray(rapports?.rapports) && rapports.rapports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Apprenant</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Formation</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Dossier</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Paiement</th>
                  <th className="pb-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rapports.rapports.map((row) => {
                  const dossierMeta = getDossierStatutMeta(row.statut_dossier);
                  const paiementMeta = getPaiementStatutMeta(row.statut_paiement);
                  return (
                  <tr key={row.dossier_id} className="align-middle hover:bg-bg">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-text">{row.apprenant_nom || '-'}</p>
                      <p className="text-xs text-subtext">{row.apprenant_email || '-'}</p>
                    </td>
                    <td className="py-3 pr-4 text-sm text-text">{row.formation_titre || '-'}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={dossierMeta.variant}>{dossierMeta.label}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={paiementMeta.variant}>{paiementMeta.label}</Badge>
                    </td>
                    <td className="py-3 text-right">
                      {row.montant_paiement > 0 ? (
                        <span className="font-medium text-text">{formatFcfa(row.montant_paiement)}</span>
                      ) : row.montant_attendu > 0 ? (
                        <span className="text-subtext" title="Montant catalogue attendu">{formatFcfa(row.montant_attendu)} <span className="text-xs">(attendu)</span></span>
                      ) : (
                        <span className="text-subtext">-</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Aucun rapport"
            message="Aucun rapport disponible pour la période sélectionnée."
          />
        )}
      </Card>
    </div>
  );
}
