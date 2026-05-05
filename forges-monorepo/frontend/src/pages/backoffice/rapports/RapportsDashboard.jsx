import { useEffect, useState } from 'react';
import { dashboardApi } from '../../../api/dashboard.api';
import EmptyState from '../../../components/feedback/EmptyState';
import Spinner from '../../../components/feedback/Spinner';
import Card from '../../../components/ui/Card';
import { useApi } from '../../../hooks/useApi';

function formatFcfa(amount) {
  return `${Number(amount || 0).toLocaleString('fr-FR')} FCFA`;
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
                <tr className="text-left text-subtext">
                  <th className="py-3 pr-4 font-medium">Apprenant</th>
                  <th className="py-3 pr-4 font-medium">Formation</th>
                  <th className="py-3 pr-4 font-medium">Dossier</th>
                  <th className="py-3 pr-4 font-medium">Paiement</th>
                  <th className="py-3 pr-4 font-medium">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rapports.rapports.map((row) => (
                  <tr key={row.dossier_id} className="align-top">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-text">{row.apprenant_nom || 'N/A'}</p>
                      <p className="text-xs text-subtext">{row.apprenant_email || 'N/A'}</p>
                    </td>
                    <td className="py-3 pr-4 text-text">{row.formation_titre || 'N/A'}</td>
                    <td className="py-3 pr-4 text-text">{row.statut_dossier}</td>
                    <td className="py-3 pr-4 text-text">{row.statut_paiement}</td>
                    <td className="py-3 pr-4 text-text">{formatFcfa(row.montant_paiement)}</td>
                  </tr>
                ))}
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
