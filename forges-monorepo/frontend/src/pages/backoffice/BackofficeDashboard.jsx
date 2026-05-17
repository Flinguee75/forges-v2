import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api/dashboard.api';
import { trackClick } from '../../utils/analytics';
import RuntimeUnavailable from '../../components/feedback/RuntimeUnavailable';
import Spinner from '../../components/feedback/Spinner';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import { getDossierStatutMeta } from '../../utils/dossierStatus';

function formatFcfa(amount) {
  return `${Math.round(Number(amount || 0) / 100).toLocaleString('fr-FR')} FCFA`;
}

function StatCard({ label, value, sublabel, variant = 'gray' }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-subtext">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-primary">{value}</p>
          {sublabel ? <p className="mt-1 text-xs text-subtext">{sublabel}</p> : null}
        </div>
        <Badge variant={variant} size="small">
          KPI
        </Badge>
      </div>
    </Card>
  );
}

function formatDossierStatut(statut) {
  return getDossierStatutMeta(statut).label;
}

function getQuickLinks(role) {
  const links = [];

  if (role === 'ADMIN' || role === 'SUPERVISEUR') {
    links.push(
      { to: '/backoffice/apprenants', label: 'Utilisateurs', description: 'Créer, consulter et relier des comptes' },
      { to: '/backoffice/organisations', label: 'Organisations', description: 'Créer, modifier ou supprimer des comptes' },
      { to: '/backoffice/formations', label: 'Formations', description: 'Catalogue et validation des offres' },
      { to: '/backoffice/sessions', label: 'Sessions', description: 'Consulter les sessions et leurs dates' },
      { to: '/backoffice/rapports', label: 'Rapports', description: 'Télécharger les exports disponibles' },
    );
  }

  if (role === 'ADMIN') {
    links.push(
      { to: '/backoffice/config', label: 'Configuration', description: 'Réglages globaux de la plateforme' },
      { to: '/backoffice/abonnements', label: 'Abonnements', description: 'Suivi Retail, Organisation et B2B' },
    );
  }

  if (role === 'ADMIN' || role === 'SUPERVISEUR' || role === 'AGENT') {
    links.push(
      { to: '/backoffice/vouchers', label: 'Vouchers', description: 'Créer et suivre les vouchers' },
      { to: '/backoffice/apporteurs', label: 'Apporteurs', description: 'Codes, commissions et reversements' },
    );
  }

  return links;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function BackofficeDashboard() {
  const { user } = useAuth();
  const { execute, isLoading } = useApi();
  const [snapshot, setSnapshot] = useState(null);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    const load = async () => {
      await execute(
        () => dashboardApi.getBackofficeDashboard(user?.role),
        {
          showErrorToast: false,
          onSuccess: (data) => setSnapshot(data),
        }
      );
    };

    if (user?.role) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const handleExport = async (format) => {
    trackClick(`btn-export-${format}`, { role: user?.role });
    try {
      if (format === 'csv') {
        setIsExportingCsv(true);
        const blob = await dashboardApi.exportRapportCSV();
        triggerDownload(blob, `rapport_forges_${new Date().toISOString().split('T')[0]}.csv`);
      } else {
        setIsExportingPdf(true);
        const blob = await dashboardApi.exportRapportPDF();
        triggerDownload(blob, `rapport_forges_${new Date().toISOString().split('T')[0]}.pdf`);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExportingCsv(false);
      setIsExportingPdf(false);
    }
  };

  if (!['ADMIN', 'SUPERVISEUR'].includes(user?.role)) {
    return (
      <RuntimeUnavailable
        title="Dashboard backoffice indisponible"
        message="Le tableau de bord consolidé est accessible aux rôles ADMIN et SUPERVISEUR. Les autres vues métier sont accessibles dans leurs espaces dédiés."
      />
    );
  }

  if (isLoading && !snapshot) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  const data = snapshot?.data || {};
  const role = snapshot?.role || user?.role;

  const cards = role === 'ADMIN'
    ? [
        { label: 'Apprenants actifs', value: data.nb_apprenants_actifs || 0 },
        { label: 'Organisations actives', value: data.nb_organisations_actives || 0 },
        { label: 'Formations actives', value: data.nb_formations_actives || 0 },
        { label: 'Sessions en cours', value: data.nb_sessions_en_cours || 0 },
        { label: 'Dossiers totaux', value: data.nb_dossiers_total || 0 },
        { label: 'CA total', value: formatFcfa(data.ca_total_xof || 0) },
        { label: 'Abonnements Retail actifs', value: data.nb_abonnements_retail_actifs || 0 },
        { label: 'Abonnements B2B actifs', value: data.nb_abonnements_b2b_actifs || 0 },
      ]
    : [
        { label: 'Sessions ouvertes', value: data.sessions_ouvertes || 0 },
        { label: 'Vouchers promo à valider', value: data.vouchers_promo_a_valider || 0 },
        { label: 'Inscriptions ce mois', value: data.inscriptions_ce_mois || 0 },
        { label: 'Apporteurs actifs', value: data.apporteurs_actifs || 0 },
      ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
              Dashboard backoffice
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-primary">
              Vue {role === 'ADMIN' ? 'administrateur' : 'superviseur'}
            </h1>
            <p className="mt-2 text-sm text-subtext">
              Raccourcis vers les modules utiles et les indicateurs principaux du backoffice.
            </p>
            <p className="mt-1 text-xs text-subtext">
              Dernière mise à jour : {snapshot?.timestamp ? new Date(snapshot.timestamp).toLocaleString('fr-FR') : 'N/A'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="small"
              loading={isExportingCsv}
              onClick={() => handleExport('csv')}
            >
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="small"
              loading={isExportingPdf}
              onClick={() => handleExport('pdf')}
            >
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {role === 'ADMIN' && data.dossiers_par_statut ? (
        <Card title="Dossiers par statut">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(data.dossiers_par_statut).map(([statut, count]) => (
              <div key={statut} className="rounded-lg border border-border p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-subtext">{formatDossierStatut(statut)}</p>
                <p className="mt-2 text-xl font-semibold text-text">{count}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {role === 'SUPERVISEUR' && Array.isArray(data.top_apporteurs_mois) ? (
        <Card title="Top apporteurs du mois">
          <div className="space-y-3">
            {data.top_apporteurs_mois.map((item, index) => (
              <div key={item.apporteur_id || index} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <span className="text-sm text-text">Apporteur {index + 1}</span>
                <span className="text-sm font-semibold text-primary">
                  {formatFcfa(item._sum?.montant_commission || 0)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card title="Accès rapides">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {getQuickLinks(role).map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => trackClick(`nav-backoffice-${link.label.toLowerCase().replace(/\s+/g, '-')}`, { role })}
              className="rounded-lg border border-border bg-white p-4 transition-colors hover:border-primary/30 hover:bg-bg"
            >
              <p className="font-semibold text-primary">{link.label}</p>
              <p className="mt-1 text-sm text-subtext">{link.description}</p>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
