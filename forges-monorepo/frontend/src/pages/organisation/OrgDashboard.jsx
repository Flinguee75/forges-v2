import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { organisationApi } from '../../api/espace-organisation.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/feedback/Spinner';
import Icon from '../../components/ui/Icon';
import Button from '../../components/ui/Button';
import ProgressBar from '../../components/ui/ProgressBar';
import BotWidget from '../../components/bot/BotWidget';
import {
  getB2BProgressMessage,
  getB2BProgressVariant,
  getTrialDaysRemaining,
  isWelcomeOfferActive,
} from '../../utils/organisationBilling';

const createDefaultDashboard = () => ({
  organisation: null,
  stats: {
    effectifs_inscrits: 0,
    budget_engage: 0,
    vouchers_actifs: 0,
    total_employes: 0,
  },
  recent_inscriptions: [],
  recent_paiements: [],
});

function normalizeDashboardData(data) {
  const defaultDashboard = createDefaultDashboard();

  if (!data || typeof data !== 'object') {
    return defaultDashboard;
  }

  // Le normaliseur API retourne déjà les bonnes clés (effectifs_inscrits, budget_engage, etc.)
  // On merge simplement avec les valeurs par défaut
  return {
    organisation: data.organisation || null,
    stats: data.stats && typeof data.stats === 'object'
      ? {
          ...defaultDashboard.stats,
          ...data.stats,
        }
      : defaultDashboard.stats,
    recent_inscriptions: Array.isArray(data.recent_inscriptions)
      ? data.recent_inscriptions
      : [],
    recent_paiements: Array.isArray(data.recent_paiements)
      ? data.recent_paiements
      : [],
    subscription_summary: data.subscription_summary || null,
  };
}

function getStatusBadgeMeta(statut) {
  const mapping = {
    ESSAI: { variant: 'info', label: 'Essai gratuit' },
    ACTIF: { variant: 'success', label: 'Actif' },
    SUSPENDU: { variant: 'warning', label: 'Suspendu' },
    EXPIRE: { variant: 'danger', label: 'Expiré' },
    RESILIE: { variant: 'danger', label: 'Résilié' },
  };

  return mapping[statut] || { variant: 'gray', label: statut || 'Inconnu' };
}

/**
 * OrgDashboard - Tableau de bord organisation avec métriques
 * Route: /organisation/dashboard
 * Référence: MOD-10 Espace Organisation (CLAUDE.md)
 * Métriques: effectifs inscrits, budget engagé, vouchers actifs
 */
export default function OrgDashboard() {
  const [dashboard, setDashboard] = useState(createDefaultDashboard);

  const { execute, isLoading } = useApi();

  const loadDashboard = async () => {
    await execute(
      () => organisationApi.getDashboard(),
      {
        onSuccess: (data) => {
          setDashboard(normalizeDashboardData(data));
        },
      }
    );
  };

  useEffect(() => {
    loadDashboard().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatMontant = (centimes) => {
    if (!centimes) return '0 FCFA';
    return `${Math.round(centimes / 100).toLocaleString('fr-FR')} FCFA`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getStatutBadge = (statut) => {
    const mapping = {
      EN_ATTENTE: { variant: 'gray', label: 'En attente' },
      RETENU: { variant: 'success', label: 'Retenu' },
      CONFIRME: { variant: 'success', label: 'Confirmé' },
      REFUSE: { variant: 'danger', label: 'Refusé' },
      GRIS: { variant: 'warning', label: 'Liste grise' },
      EXCEPTION: { variant: 'warning', label: 'Exception' },
    };
    const config = mapping[statut] || { variant: 'gray', label: statut };
    return <Badge variant={config.variant} size="small">{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  const { stats, recent_inscriptions, recent_paiements, subscription_summary, organisation } = dashboard;
  const orgSubscription = subscription_summary?.organisation || subscription_summary?.abonnement_organisation || subscription_summary || {};
  const b2bSubscription = subscription_summary?.b2b || subscription_summary?.abonnement_b2b || null;
  const orgStatusMeta = getStatusBadgeMeta(orgSubscription?.statut);
  const trialDaysRemaining = getTrialDaysRemaining(orgSubscription?.date_fin_essai);
  const welcomeOfferActive = isWelcomeOfferActive(orgSubscription);
  const b2bActive = Number(b2bSubscription?.nb_actifs ?? 0);
  const b2bMax = Number(b2bSubscription?.nb_max ?? 0);
  const b2bRatio = b2bMax > 0 ? b2bActive / b2bMax : 0;
  const b2bProgressVariant = getB2BProgressVariant(b2bRatio);
  const showOrgBanner = orgSubscription?.statut === 'ESSAI' || orgSubscription?.statut === 'SUSPENDU' || orgSubscription?.statut === 'EXPIRE';

  return (
    <>
      <div className="mx-auto max-w-6xl">
      {showOrgBanner && (
        <div className="mb-6 space-y-4">
          {orgSubscription?.statut === 'ESSAI' && (
            <Card className="border-l-4 border-info bg-secondary-soft/30">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-secondary">
                    Essai gratuit
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-text">
                    {trialDaysRemaining ?? '-'} jour{trialDaysRemaining === 1 ? '' : 's'} restants
                  </h2>
                  <p className="mt-2 text-sm text-subtext">
                    Souscrivez avant la fin de l&apos;essai pour conserver l&apos;accès à toutes les sections B2B.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <Badge variant={orgStatusMeta.variant} size="small">{orgStatusMeta.label}</Badge>
                  <Link to="/organisation/abonnement/souscrire">
                    <Button variant="primary" size="small">Souscrire maintenant</Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}

          {welcomeOfferActive && (
            <Card className="border-l-4 border-warning">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-warning">
                    Offre bienvenue
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-text">
                    -20% sur la conversion pendant la fenêtre J+25
                  </h2>
                  <p className="mt-2 text-sm text-subtext">
                    {orgSubscription?.welcome_offer_expires_at
                      ? `Expire le ${formatDate(orgSubscription.welcome_offer_expires_at)}`
                      : 'Offre temporaire disponible.'}
                  </p>
                </div>
                <Badge variant="warning" size="small">J+25</Badge>
              </div>
            </Card>
          )}
        </div>
      )}

      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
            Vue d&apos;ensemble
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-primary">
            Pilotage de votre organisation
          </h2>
          <p className="mt-2 text-subtext">
            {(organisation?.nom || organisation?.raison_sociale || 'Votre organisation')} : suivez en temps réel vos effectifs, budget et vouchers.
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-primary">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-subtext">Employés inscrits</div>
              <div className="mt-2 text-3xl font-bold text-primary">
                {stats.effectifs_inscrits}
              </div>
            </div>
            <Icon name="users" size={40} className="text-primary opacity-20" />
          </div>
        </Card>

        <Card className="border-l-4 border-warning">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-subtext">Budget engagé</div>
              <div className="mt-2 text-3xl font-bold text-warning">
                {formatMontant(stats.budget_engage)}
              </div>
            </div>
            <Icon name="cash" size={40} className="text-warning opacity-20" />
          </div>
        </Card>

        <Card className="border-l-4 border-success">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-subtext">Vouchers actifs</div>
              <div className="mt-2 text-3xl font-bold text-success">
                {stats.vouchers_actifs}
              </div>
            </div>
            <Icon name="ticket" size={40} className="text-success opacity-20" />
          </div>
        </Card>

        <Card className="border-l-4 border-info">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-subtext">Total employés</div>
              <div className="mt-2 text-3xl font-bold text-info">
                {stats.total_employes}
              </div>
            </div>
            <Icon name="user" size={40} className="text-info opacity-20" />
          </div>
        </Card>
      </div>

      {b2bSubscription?.exists && (
        <Card className="mb-6 border-l-4 border-primary">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
                B2B
              </p>
              <h3 className="mt-2 text-xl font-semibold text-text">
                {b2bSubscription.palier || 'Aucun palier'}
              </h3>
              <p className="mt-2 text-sm text-subtext">
                {b2bActive} / {b2bMax || '-'} apprenants actifs
              </p>
            </div>
            <Badge variant={getB2BProgressVariant(b2bRatio)} size="small">
              {getB2BProgressMessage(b2bRatio)}
            </Badge>
          </div>
          <div className="mt-4">
            <ProgressBar
              current={b2bActive}
              max={Math.max(b2bMax, b2bActive || 1)}
              variant={b2bProgressVariant}
            />
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-primary">Dernières inscriptions</h3>
            <Link to="/organisation/inscriptions" className="text-sm text-secondary hover:underline">
              Voir tout
            </Link>
          </div>

          {recent_inscriptions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-subtext">Aucune inscription récente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recent_inscriptions.map((inscription) => (
                <div
                  key={inscription.id}
                  className="rounded-lg border border-border p-3 hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-text">
                        {inscription.etudiant?.prenom || inscription.apprenant?.prenoms} {inscription.etudiant?.nom || inscription.apprenant?.nom}
                      </div>
                      <div className="mt-1 text-xs text-subtext">
                        {inscription.session?.formation?.titre || inscription.formation?.titre || inscription.formation?.intitule || 'N/A'}
                      </div>
                    </div>
                    {getStatutBadge(inscription.statut)}
                  </div>
                  <div className="mt-2 text-xs text-subtext">
                    Session du {formatDate(inscription.session?.date_debut)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-primary">Derniers paiements</h3>
            <Link to="/organisation/paiements" className="text-sm text-secondary hover:underline">
              Voir tout
            </Link>
          </div>

          {recent_paiements.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-subtext">Aucun paiement récent</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recent_paiements.map((paiement) => (
                <div
                  key={paiement.id}
                  className="rounded-lg border border-border p-3 hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-text">
                        {formatMontant(paiement.montant)}
                      </div>
                      <div className="mt-1 text-xs text-subtext">
                        {paiement.dossier?.etudiant?.prenom} {paiement.dossier?.etudiant?.nom}
                      </div>
                    </div>
                    <Badge variant="success" size="small">
                      {paiement.methode_paiement === 'VOUCHER_ORG' ? 'Voucher' : paiement.methode_paiement}
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-subtext">
                    {formatDate(paiement.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Link to="/organisation/abonnement" className="block">
          <Card className="h-full hover:border-primary transition-colors cursor-pointer">
            <div className="flex items-start gap-3">
              <Icon name="creditCard" size={28} className="text-primary flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-primary">Abonnement</h3>
                <p className="mt-1 text-sm text-subtext">
                  Consultez votre statut et souscrivez une offre.
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/organisation/b2b" className="block">
          <Card className="h-full hover:border-primary transition-colors cursor-pointer">
            <div className="flex items-start gap-3">
              <Icon name="folder" size={28} className="text-primary flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-primary">B2B</h3>
                <p className="mt-1 text-sm text-subtext">
                  Suivez le palier et les suggestions de montée.
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/organisation/vouchers" className="block">
          <Card className="h-full hover:border-primary transition-colors cursor-pointer">
            <div className="flex items-start gap-3">
              <Icon name="ticket" size={28} className="text-primary flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-primary">Vouchers</h3>
                <p className="mt-1 text-sm text-subtext">
                  Consultez vos vouchers et leur utilisation
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/organisation/inscriptions" className="block">
          <Card className="h-full hover:border-primary transition-colors cursor-pointer">
            <div className="flex items-start gap-3">
              <Icon name="clipboardList" size={28} className="text-primary flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-primary">Inscriptions</h3>
                <p className="mt-1 text-sm text-subtext">
                  Suivez les inscriptions de vos employés
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
      </div>
      <BotWidget />
    </>
  );
}
