import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import apporteursApi from '../../../api/apporteurs.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Spinner from '../../../components/feedback/Spinner';

export default function ApporteurDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { execute, isLoading } = useApi();
  const [apporteur, setApporteur] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [commissions, setCommissions] = useState([]);

  useEffect(() => {
    execute(() => apporteursApi.getApporteurById(id), {
      onSuccess: setApporteur,
      showErrorToast: false,
    });
    execute(() => apporteursApi.getApporteurDashboard(id), {
      onSuccess: setDashboard,
      showErrorToast: false,
    });
    execute(() => apporteursApi.getApporteurCommissions(id), {
      onSuccess: (data) => setCommissions(data?.data || []),
      showErrorToast: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (isLoading && !apporteur) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (!apporteur) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center">
        <p className="text-subtext">Apporteur introuvable.</p>
        <Button className="mt-4" onClick={() => navigate('/backoffice/apporteurs')}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">Détail apporteur</p>
        <h2 className="mt-3 text-2xl font-semibold text-primary">{apporteur.nom}</h2>
        <div className="mt-3 flex gap-3">
          <Badge variant={apporteur.statut === 'ACTIF' ? 'success' : 'warning'}>{apporteur.statut}</Badge>
          <Badge variant="info">{apporteur.type}</Badge>
        </div>
      </div>

      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          <div><p className="text-xs uppercase tracking-[0.2em] text-subtext">Email</p><p className="mt-2">{apporteur.email}</p></div>
          <div><p className="text-xs uppercase tracking-[0.2em] text-subtext">Code</p><p className="mt-2 font-mono">{apporteur.code_apporteur}</p></div>
          <div><p className="text-xs uppercase tracking-[0.2em] text-subtext">Taux</p><p className="mt-2">{apporteur.taux_commission_pct}%</p></div>
          <div><p className="text-xs uppercase tracking-[0.2em] text-subtext">Commissions</p><p className="mt-2">{apporteur.commissions_count || 0}</p></div>
        </div>
      </Card>

      {dashboard && (
        <Card title="Dashboard">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-subtext">Transactions mois</p>
              <p className="mt-1 text-xl font-semibold text-primary">{dashboard.stats_mois?.nb_transactions || 0}</p>
            </div>
            <div>
              <p className="text-sm text-subtext">Commission mois</p>
              <p className="mt-1 text-xl font-semibold text-primary">{Number(dashboard.stats_mois?.commission_xof || 0).toLocaleString('fr-FR')} FCFA</p>
            </div>
            <div>
              <p className="text-sm text-subtext">Cumul dû</p>
              <p className="mt-1 text-xl font-semibold text-primary">{Number(dashboard.cumul_du_xof || 0).toLocaleString('fr-FR')} FCFA</p>
            </div>
          </div>
        </Card>
      )}

      <Card title="Commissions récentes">
        {commissions.length === 0 ? (
          <p className="text-subtext">Aucune commission récente.</p>
        ) : (
          <div className="space-y-3">
            {commissions.map((commission) => (
              <div key={commission.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="font-medium text-text">{commission.mois_reference || commission.statut}</p>
                  <p className="text-sm text-subtext">{commission.statut}</p>
                </div>
                <p className="font-semibold text-text">{Number(commission.commission_xof || commission.montant_commission || 0).toLocaleString('fr-FR')} FCFA</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => navigate('/backoffice/apporteurs')}>
          Retour à la liste
        </Button>
      </div>
    </div>
  );
}
