import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import apporteursApi from '../../api/apporteurs.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';

const REVERSEMENT_THRESHOLD_XOF = 5000;

function formatMontant(centimes) {
  const montantXOF = Math.round(Number(centimes || 0) / 100);
  return `${montantXOF.toLocaleString('fr-FR')} FCFA`;
}

function getWorkflowConfig(statut) {
  const mapping = {
    EN_ATTENTE_VERIFICATION: { label: 'En attente', variant: 'gray' },
    ACTIF: { label: 'Actif', variant: 'success' },
    SUSPENDU: { label: 'Suspendu', variant: 'warning' },
    RESILIE: { label: 'Résilié', variant: 'danger' },
  };

  return mapping[statut] || { label: statut || 'Inconnu', variant: 'gray' };
}

export default function ApporteurDashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { execute, isLoading, error } = useApi();
  const [dashboard, setDashboard] = useState(null);
  const [copiedField, setCopiedField] = useState('');

  const loadDashboard = useCallback(async () => {
    await execute(
      () => apporteursApi.getDashboard(),
      {
        onSuccess: (data) => {
          setDashboard(data);
        },
      }
    );
  }, [execute]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const referralUrl = useMemo(() => {
    if (!dashboard?.referral_url && !dashboard?.code_apporteur) {
      return '';
    }

    return dashboard.referral_url || `${window.location.origin}/register?ref=${dashboard.code_apporteur}`;
  }, [dashboard]);

  const handleCopy = async (value, field) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      showToast('Copié dans le presse-papiers.', 'success');
      window.setTimeout(() => setCopiedField(''), 2000);
    } catch {
      showToast('Impossible de copier cette valeur.', 'error');
    }
  };

  if (isLoading && !dashboard) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <EmptyState
        type={error ? 'error' : 'empty'}
        title="Tableau de bord indisponible"
        message={error || 'Impossible de charger les informations de l’apporteur.'}
      />
    );
  }

  const workflowConfig = getWorkflowConfig(dashboard.workflow_status || dashboard.statut);
  const cumulEnCours = dashboard.cumul_en_cours || 0;
  const isEligible = cumulEnCours >= REVERSEMENT_THRESHOLD_XOF;

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-apporteur)]/70">
              Espace apporteur
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-text">Tableau de bord</h1>
            <p className="mt-2 text-sm text-subtext">
              Suivez vos commissions, votre code permanent et votre seuil de reversement.
            </p>
          </div>
          <Badge variant={workflowConfig.variant} size="small">
            {workflowConfig.label}
          </Badge>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
        <Card title="Code permanent">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-subtext">
                Code UUID
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  value={dashboard.code_apporteur || ''}
                  readOnly
                  className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text"
                />
                <Button
                  size="small"
                  variant={copiedField === 'code' ? 'success' : 'outline'}
                  onClick={() => handleCopy(dashboard.code_apporteur, 'code')}
                >
                  {copiedField === 'code' ? 'Copié' : 'Copier'}
                </Button>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-subtext">
                Lien de parrainage
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  value={referralUrl}
                  readOnly
                  className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text"
                />
                <Button
                  size="small"
                  variant={copiedField === 'link' ? 'success' : 'outline'}
                  onClick={() => handleCopy(referralUrl, 'link')}
                >
                  {copiedField === 'link' ? 'Copié' : 'Copier'}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-subtext">
                  Taux de commission
                </p>
                <p className="mt-1 text-xl font-semibold text-text">
                  {dashboard.taux_commission_pct || 0}%
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-subtext">
                  Langue préférée
                </p>
                <p className="mt-1 text-xl font-semibold text-text">
                  {dashboard.langue_preferee || 'FR'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="QR code">
          {referralUrl ? (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-lg border border-border bg-white p-4">
                <QRCodeSVG
                  value={referralUrl}
                  size={180}
                  level="H"
                  fgColor="#6C3483"
                />
              </div>
              <p className="text-center text-sm text-subtext">
                Scannez ce QR code pour ouvrir directement votre lien de parrainage.
              </p>
            </div>
          ) : (
            <EmptyState
              title="QR code indisponible"
              message="Le lien de parrainage n’est pas encore disponible."
            />
          )}
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Transactions du mois">
          <p className="text-2xl font-semibold text-text">
            {dashboard.stats_mois_courant?.nb_transactions_mois || 0}
          </p>
        </Card>
        <Card title="CA généré">
          <p className="text-2xl font-semibold text-text">
            {formatMontant(dashboard.stats_mois_courant?.montant_base_mois)}
          </p>
        </Card>
        <Card title="Commission du mois">
          <p className="text-2xl font-semibold text-text">
            {formatMontant(dashboard.stats_mois_courant?.montant_commission_mois)}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Cumul en cours">
          <p className="text-3xl font-semibold text-warning">
            {formatMontant(cumulEnCours)}
          </p>
          <div className="mt-4 rounded-lg border border-warning/20 bg-warning/10 p-4 text-sm text-warning">
            {isEligible
              ? 'Le seuil minimum est atteint. Votre reversement peut être traité.'
              : `Report au mois suivant - cumul : ${cumulEnCours} XOF / seuil : ${REVERSEMENT_THRESHOLD_XOF} XOF`}
          </div>
        </Card>

        <Card title="Cumul total perçu">
          <p className="text-3xl font-semibold text-success">
            {formatMontant(dashboard.cumul_total_percu)}
          </p>
          <p className="mt-2 text-sm text-subtext">
            Montant total déjà reversé depuis l’activation du compte.
          </p>
        </Card>
      </div>

      <Card title="Actions rapides">
        <div className="flex flex-wrap gap-3">
          <Button size="small" variant="outline" onClick={() => navigate('/apporteur/commissions')}>
            Voir mes commissions
          </Button>
          <Button size="small" variant="outline" onClick={() => navigate('/apporteur/reversements')}>
            Voir mes reversements
          </Button>
          <Button size="small" variant="outline" onClick={() => navigate('/apporteur/profil')}>
            Gérer mon profil
          </Button>
        </div>
      </Card>
    </div>
  );
}
