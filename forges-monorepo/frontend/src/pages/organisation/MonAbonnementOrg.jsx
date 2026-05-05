import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { organisationApi } from '../../api/espace-organisation.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';
import {
  formatDate,
  formatFcfa,
  getOrganisationOfferLabel,
  getOrganisationOfferList,
  isWelcomeOfferActive,
  previewOrganisationSubscription,
} from '../../utils/organisationBilling';

const STATUS_META = {
  ACTIF: { variant: 'success', label: 'Actif' },
  EN_ATTENTE_PAIEMENT: { variant: 'warning', label: 'Paiement en cours' },
  SUSPENDU: { variant: 'warning', label: 'Suspendu' },
  ANNULE: { variant: 'danger', label: 'Annulé' },
  EXPIRE: { variant: 'danger', label: 'Expiré' },
  RESILIE: { variant: 'danger', label: 'Résilié' },
  ESSAI: { variant: 'info', label: 'Essai gratuit' },
  ABSENT: { variant: 'gray', label: 'Aucun abonnement' },
};

function isNotFound(error) {
  return error?.code === 'NOT_FOUND' || error?.statusCode === 404;
}

function getStatusBadge(statut) {
  const meta = STATUS_META[statut] || { variant: 'gray', label: statut || 'Inconnu' };
  return <Badge variant={meta.variant} size="small">{meta.label}</Badge>;
}

export default function MonAbonnementOrg() {
  const navigate = useNavigate();
  const location = useLocation();
  const shouldHighlightSubscribe = location.pathname.endsWith('/souscrire');
  const [abonnement, setAbonnement] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState('BASIQUE');
  const didInitialLoad = useRef(false);
  const { execute, isLoading, error, reset } = useApi();

  const loadData = useCallback(async () => {
    await execute(() => organisationApi.getAbonnementOrganisation(), {
      showErrorToast: false,
      onSuccess: (data) => {
        setAbonnement(data);
        if (data?.offre) {
          setSelectedOffer(data.offre);
        }
        reset?.();
      },
      onError: (loadError) => {
        if (isNotFound(loadError)) {
          setAbonnement(null);
          reset?.();
          return;
        }
        throw loadError;
      },
    }).catch((loadError) => {
      if (!isNotFound(loadError)) {
        throw loadError;
      }
    });
  }, [execute, reset]);

  useEffect(() => {
    if (didInitialLoad.current) {
      return;
    }

    didInitialLoad.current = true;
    loadData().catch(() => undefined);
  }, [loadData]);

  const offerPreview = useMemo(
    () => previewOrganisationSubscription(selectedOffer),
    [selectedOffer]
  );
  const welcomeOfferActive = useMemo(
    () => isWelcomeOfferActive(abonnement || {}),
    [abonnement]
  );
  const isTrial = abonnement?.is_trial ?? abonnement?.statut === 'ESSAI';
  // Bloquer si ACTIF ou EN_ATTENTE_PAIEMENT
  const canSubscribe = ['ACTIF', 'EN_ATTENTE_PAIEMENT'].includes(abonnement?.statut)
    ? false
    : (!abonnement || (abonnement?.can_subscribe ?? isTrial));

  const handleSubscribe = async () => {
    await execute(() => organisationApi.souscrireOrganisation({ offre: selectedOffer }), {
      showSuccessToast: false,
      onSuccess: (data) => {
        if (data?.payment_url) {
          window.location.href = data.payment_url;
        } else {
          setAbonnement(data?.abonnement ?? data);
          navigate('/organisation/abonnement');
        }
      },
    });
  };

  if (isLoading && !abonnement && !error) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  const offerCards = getOrganisationOfferList();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-secondary">
              Abonnement Organisation
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-text">
              {isTrial ? 'Convertir votre essai' : 'Piloter votre accès plateforme'}
            </h1>
            <p className="mt-2 text-sm text-subtext">
              L&apos;abonnement organisation donne à votre structure un accès annuel à la plateforme FORGES : gestion des inscriptions, des vouchers, du tableau de bord et de l&apos;abonnement B2B. Sans abonnement actif, l&apos;accès est suspendu à la fin de la période d&apos;essai.
            </p>
          </div>
          {getStatusBadge(abonnement?.statut || 'ABSENT')}
        </div>
      </div>

      {isTrial && (
        <Card className="border-l-4 border-secondary">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-text">
                Essai gratuit en cours
              </p>
              <p className="mt-1 text-sm text-subtext">
                {abonnement.jours_restants_essai} jour(s) restant(s) avant suspension automatique si aucun abonnement n&apos;est souscrit.
              </p>
            </div>
            <div className="text-right text-sm text-subtext">
              <div>Fin de l&apos;essai</div>
              <div className="font-semibold text-text">{formatDate(abonnement.date_fin_essai)}</div>
            </div>
          </div>
        </Card>
      )}

      {abonnement?.statut === 'EN_ATTENTE_PAIEMENT' && (
        <Card className="border-l-4 border-warning">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-text">
                Paiement en cours de traitement
              </p>
              <p className="mt-1 text-sm text-subtext">
                Votre souscription est initiée. Elle sera activée dès confirmation du paiement par NGSER.
                Si vous n&apos;avez pas été redirigé, cliquez sur le bouton ci-dessous pour reprendre.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleSubscribe}
              disabled={isLoading}
              loading={isLoading}
            >
              Reprendre le paiement
            </Button>
          </div>
        </Card>
      )}

      {welcomeOfferActive && (
        <Card className="border-l-4 border-warning">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-text">
                Offre bienvenue -{abonnement?.welcome_offer_pct || 20}%
              </p>
              <p className="mt-1 text-sm text-subtext">
                Cette remise est visible pendant la fenêtre de conversion de l&apos;essai.
              </p>
            </div>
            <div className="text-right text-sm text-subtext">
              <div>Valable jusqu&apos;au</div>
              <div className="font-semibold text-text">{formatDate(abonnement?.welcome_offer_expires_at)}</div>
            </div>
          </div>
        </Card>
      )}

      {!abonnement && !shouldHighlightSubscribe && (
        <EmptyState
          title="Aucun abonnement organisation"
          message="Souscrivez une offre annuelle pour conserver l'accès complet à la plateforme."
          action={(
            <Link to="/organisation/abonnement/souscrire">
              <Button variant="primary">Choisir une offre</Button>
            </Link>
          )}
        />
      )}

      {abonnement && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="text-xs uppercase tracking-[0.22em] text-subtext">Offre actuelle</p>
            <p className="mt-2 text-xl font-semibold text-text">
              {isTrial ? 'Essai gratuit' : getOrganisationOfferLabel(abonnement.offre)}
            </p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-[0.22em] text-subtext">Renouvellement</p>
            <p className="mt-2 text-xl font-semibold text-text">
              {formatDate(abonnement.date_renouvellement)}
            </p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-[0.22em] text-subtext">Montant annuel</p>
            <p className="mt-2 text-xl font-semibold text-text">
              {formatFcfa(abonnement.montant_annuel || 0)}
            </p>
          </Card>
        </div>
      )}

      {abonnement?.statut === 'ACTIF' && !shouldHighlightSubscribe && (
        <Card className="border-l-4 border-success">
          <p className="text-sm font-semibold text-text">
            Votre abonnement organisation est déjà actif.
          </p>
          <p className="mt-1 text-sm text-subtext">
            Une nouvelle souscription n&apos;est pas disponible tant que cet abonnement reste actif.
          </p>
        </Card>
      )}

      <Card
        title={canSubscribe ? 'Choisissez votre offre annuelle' : 'Offre en cours'}
        bodyClassName="space-y-6"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {offerCards.map((offer) => {
            const isSelected = selectedOffer === offer.key;
            const displayAmount = welcomeOfferActive
              ? Math.round(offer.annualAmount * (1 - ((abonnement?.welcome_offer_pct || 20) / 100)))
              : offer.annualAmount;

            return (
              <div
                key={offer.key}
                className={`rounded-lg border p-4 ${isSelected ? 'border-primary shadow-sm' : 'border-border'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-text">{offer.label}</p>
                    <p className="mt-1 text-sm text-subtext">{offer.description}</p>
                  </div>
                  {isSelected && <Badge variant="success" size="small">Sélectionnée</Badge>}
                </div>
                <div className="mt-4">
                  <p className="text-sm text-subtext">Tarif annuel</p>
                  <p className="mt-1 text-2xl font-semibold text-text">{formatFcfa(displayAmount)}</p>
                  {welcomeOfferActive && (
                    <p className="mt-1 text-xs text-warning">
                      Tarif catalogue : {formatFcfa(offer.annualAmount)}
                    </p>
                  )}
                </div>
                {offer.features?.length > 0 && (
                  <ul className="mt-4 space-y-1.5">
                    {offer.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-text">
                        <span className="mt-0.5 text-success">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-6">
                  <Button
                    variant={isSelected ? 'primary' : 'outline'}
                    onClick={() => setSelectedOffer(offer.key)}
                    disabled={!canSubscribe && abonnement?.offre === offer.key}
                  >
                    {isSelected ? 'Offre choisie' : 'Choisir'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className={`rounded-lg border p-4 ${shouldHighlightSubscribe ? 'border-warning bg-warning/5' : 'border-border bg-bg'}`}>
          <p className="text-sm font-semibold text-text">Prévisualisation</p>
          <p className="mt-1 text-sm text-subtext">
            Offre {offerPreview.label} a {offerPreview.formattedAmount} par an.
          </p>
          {welcomeOfferActive && (
            <p className="mt-2 text-sm text-warning">
              La remise bienvenue s&apos;affiche sur cette sélection tant que la fenêtre de conversion est active.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {canSubscribe && (
            <Button
              variant="primary"
              onClick={handleSubscribe}
              disabled={isLoading}
              loading={isLoading}
            >
              {isTrial ? 'Activer mon abonnement' : 'Confirmer la souscription'}
            </Button>
          )}
          <Link to="/organisation/b2b">
            <Button variant="outline">Voir le B2B</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
