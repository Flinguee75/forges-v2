import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import apprenantApi from '../../api/espace-apprenant.api';
import { formationsApi } from '../../api/formations.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/feedback/Spinner';
import {
  formatDate,
  formatFcfa,
  previewRetailSubscription,
  getRetailMonthlyPrice,
} from '../../utils/retailBilling';

// RM-102 : inclus_abonnement = STANDARD + pilier RETAIL/TOUS
// Essentiel = formations incluses ; Premium = inclus + PREMIUM

const TIERS = [
  {
    key: null,
    label: 'Catalogue libre',
    price: 0,
    priceLabel: 'Gratuit',
    highlight: false,
    badge: null,
    tagline: 'Formations gratuites accessibles, payez les autres a la carte',
    description: null,
    perks: null,
    cta: null,
  },
  {
    key: 'ESSENTIEL',
    label: 'Essentiel',
    price: null,
    priceLabel: null,
    highlight: false,
    badge: null,
    tagline: 'Formations incluses, aucun frais par session',
    description: 'Payez une mensualité fixe et accédez librement aux formations standard du catalogue.',
    perks: [
      { text: 'Catalogue complet visible', included: true },
      { text: 'Inscription session par session', included: true },
      { text: 'Formations incluses comprises', included: true },
      { text: 'Formations Premium exclusives', included: false },
      { text: 'Réduction -15% sur les sessions', included: true },
    ],
    cta: 'Choisir Essentiel',
  },
  {
    key: 'PREMIUM',
    label: 'Premium',
    price: null,
    priceLabel: null,
    highlight: true,
    badge: 'Recommandé',
    tagline: 'Tout Essentiel + formations exclusives',
    description: 'Le niveau supérieur pour accéder aux formations Premium et progresser plus vite.',
    perks: [
      { text: 'Catalogue complet visible', included: true },
      { text: 'Inscription session par session', included: true },
      { text: 'Formations incluses comprises', included: true },
      { text: 'Formations Premium exclusives', included: true },
      { text: 'Réduction -15% sur les sessions', included: true },
    ],
    cta: 'Choisir Premium',
  },
];

function CheckIcon({ ok }) {
  if (ok) {
    return (
      <svg className="h-4 w-4 flex-shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4 flex-shrink-0 text-border" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function isNotFound(error) {
  return error?.code === 'NOT_FOUND' || error?.statusCode === 404;
}

function normalizeCollection(payload) {
  return Array.isArray(payload) ? payload : payload?.data || [];
}

export default function SouscrireAbonnement() {
  const navigate = useNavigate();
  const [selectedOffer, setSelectedOffer] = useState('ESSENTIEL');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [currentAbonnement, setCurrentAbonnement] = useState(null);
  const [formationsIncluses, setFormationsIncluses] = useState([]);
  const [formationsPremium, setFormationsPremium] = useState([]);
  const [formationsGratuites, setFormationsGratuites] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const didLoad = useRef(false);
  const { execute, isLoading, error, reset } = useApi();

  const loadData = useCallback(async () => {
    await execute(async () => {
      const catalogueResult = await formationsApi.getCatalogue({ limit: 100 });
      const catalogue = normalizeCollection(catalogueResult);

      const incluses = normalizeCollection(catalogue).filter((f) => f.inclus_abonnement);
      const premium = normalizeCollection(catalogue).filter((f) => f.type_formation === 'PREMIUM');
      const gratuites = normalizeCollection(catalogue).filter((f) =>
        ['B2B', 'INSTITUTIONNEL', 'TOUS'].includes(f.pilier_abonnement)
      );

      try {
        const current = await apprenantApi.getMonAbonnementRetail();
        return { current, incluses, premium, gratuites };
      } catch (err) {
        if (!isNotFound(err)) throw err;
        return { current: null, incluses, premium, gratuites };
      }
    }, {
      showErrorToast: false,
      onSuccess: ({ current, incluses, premium, gratuites }) => {
        setCurrentAbonnement(current);
        setFormationsIncluses(incluses);
        setFormationsPremium(premium);
        setFormationsGratuites(gratuites);
        setHasLoaded(true);
        reset();
      },
    });
  }, [execute, reset]);

  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    loadData();
  }, [loadData]);

  const referenceDate = useMemo(() => new Date(), []);
  const selectedPrice = getRetailMonthlyPrice(selectedOffer);
  const preview = previewRetailSubscription(selectedOffer, referenceDate);
  const isAlreadySubscribed = Boolean(currentAbonnement);

  const freeTierPerks = useMemo(() => {
    const incCount = formationsIncluses.length;
    const premCount = formationsPremium.length;
    const gratCount = formationsGratuites.length;
    return [
      { text: 'Catalogue complet visible', included: true },
      { text: 'Inscription a la demande — paiement par session', included: true },
      gratCount > 0
        ? { text: `${gratCount} formation${gratCount > 1 ? 's' : ''} gratuites via organisation`, included: true }
        : { text: 'Formations gratuites via organisation', included: true },
      incCount > 0
        ? { text: `${incCount} formation${incCount > 1 ? 's' : ''} incluses — abonnement requis`, included: false }
        : { text: 'Formations incluses — abonnement requis', included: false },
      premCount > 0
        ? { text: `${premCount} formation${premCount > 1 ? 's' : ''} Premium — abonnement requis`, included: false }
        : { text: 'Formations Premium — abonnement requis', included: false },
      { text: 'Réduction -15% sur les sessions', included: false },
    ];
  }, [formationsIncluses, formationsPremium, formationsGratuites]);

  const handleSubscribe = async () => {
    await execute(
      () => apprenantApi.souscrireAbonnementRetail({ offre: selectedOffer }),
      {
        showErrorToast: true,
        onSuccess: (result) => {
          const paymentUrl = result?.payment_url;
          if (paymentUrl) {
            window.location.assign(paymentUrl);
          } else {
            // Abonnement actif sans paiement (cas legacy ou mock sans URL)
            navigate('/apprenant/abonnement');
          }
        },
      }
    );
  };

  if (!hasLoaded && isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">

      {/* Hero */}
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary/60">
          Abonnement Retail
        </p>
        <h1 className="mt-3 text-4xl font-bold text-text">
          Choisissez votre accès
        </h1>
        <p className="mt-3 mx-auto max-w-xl text-base text-subtext">
          Sans abonnement, vous payez chaque session à l'unité.
          Avec un abonnement, les formations incluses sont comprises dans votre mensualité.
        </p>
      </div>

      {/* Abonnement déjà actif */}
      {isAlreadySubscribed && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-text">Vous avez déjà un abonnement actif</p>
            <p className="mt-1 text-sm text-subtext">
              Offre {currentAbonnement.offre} — gérez-le depuis votre espace abonnement.
            </p>
          </div>
          <Link to="/apprenant/abonnement">
            <Button variant="outline">Gérer mon abonnement</Button>
          </Link>
        </div>
      )}

      {/* Tableau comparatif des 3 tiers */}
      <div className="grid gap-4 md:grid-cols-3">
        {TIERS.map((tier) => {
          const isPayant = tier.key !== null;
          const isSelected = selectedOffer === tier.key;
          const price = isPayant ? getRetailMonthlyPrice(tier.key) : 0;

          return (
            <div
              key={tier.key ?? 'gratuit'}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                tier.highlight
                  ? 'border-primary shadow-lg shadow-primary/10'
                  : isSelected && isPayant
                    ? 'border-primary/60 shadow-md'
                    : 'border-border'
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow">
                    {tier.badge}
                  </span>
                </div>
              )}

              {/* En-tête */}
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-subtext">
                  {tier.label}
                </p>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-3xl font-bold text-text">
                    {isPayant ? formatFcfa(price) : 'Gratuit'}
                  </span>
                  {isPayant && (
                    <span className="mb-1 text-sm text-subtext">/mois</span>
                  )}
                </div>
                <p className="mt-2 text-sm font-medium text-text">{tier.tagline}</p>
                {tier.key === null ? (
                  <p className="mt-1 text-sm text-subtext">
                    {formationsIncluses.length + formationsPremium.length > 0
                      ? `${formationsIncluses.length + formationsPremium.length} formations payantes restent inaccessibles sans abonnement.`
                      : "Inscrivez-vous aux sessions en payant a l'unite."}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-subtext">{tier.description}</p>
                )}
              </div>

              {/* Avantages */}
              <ul className="mb-6 flex-1 space-y-2.5">
                {(tier.key === null ? freeTierPerks : tier.perks).map((perk) => (
                  <li key={perk.text} className="flex items-center gap-2.5 text-sm">
                    <CheckIcon ok={perk.included} />
                    <span className={perk.included ? 'text-text' : 'text-subtext/60 line-through'}>
                      {perk.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {tier.cta ? (
                <Button
                  variant={tier.highlight ? 'primary' : isSelected ? 'success' : 'outline'}
                  className="w-full"
                  onClick={() => setSelectedOffer(tier.key)}
                  disabled={isAlreadySubscribed}
                >
                  {isSelected ? 'Sélectionné' : tier.cta}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/apprenant/catalogue')}
                >
                  Parcourir le catalogue
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Formations gratuites via organisation */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 flex flex-wrap items-start gap-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-blue-900">Votre employeur ou institution finance peut-être votre formation</p>
          <p className="mt-1 text-sm text-blue-700">
            Certaines formations du catalogue sont prises en charge directement par des organisations partenaires FORGES.
            Si votre entreprise ou institution est inscrite, ces formations sont gratuites pour vous — sans abonnement personnel.
          </p>
          <Link to="/apprenant/catalogue" className="mt-3 inline-block text-sm font-medium text-blue-700 underline underline-offset-2">
            Voir les formations couvertes par les organisations
          </Link>
        </div>
      </div>

      {/* Ce que comprend votre abonnement */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* Formations incluses */}
        <div className="rounded-xl border border-border p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-text">
              Formations incluses
              <span className="ml-2 text-sm font-normal text-subtext">(Essentiel + Premium)</span>
            </h2>
            <Badge variant="success" size="small">{formationsIncluses.length} formations</Badge>
          </div>
          <p className="mb-4 text-sm text-subtext">
            Ces formations sont comprises dans votre mensualité — aucun paiement supplémentaire à la session.
          </p>
          {formationsIncluses.length === 0 ? (
            <p className="text-sm text-subtext italic">Aucune formation incluse disponible actuellement.</p>
          ) : (
            <ul className="space-y-2">
              {formationsIncluses.slice(0, 5).map((f) => (
                <li key={f.id} className="flex items-center gap-2 text-sm">
                  <CheckIcon ok />
                  <span className="text-text">{f.titre || f.intitule}</span>
                </li>
              ))}
              {formationsIncluses.length > 5 && (
                <li className="text-sm text-primary">
                  + {formationsIncluses.length - 5} autres formations incluses
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Formations Premium */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-text">
              Formations Premium
              <span className="ml-2 text-sm font-normal text-subtext">(Premium uniquement)</span>
            </h2>
            <Badge variant="info" size="small">{formationsPremium.length} formations</Badge>
          </div>
          <p className="mb-4 text-sm text-subtext">
            Formations exclusives accessibles uniquement avec l'offre Premium.
          </p>
          {formationsPremium.length === 0 ? (
            <p className="text-sm text-subtext italic">Aucune formation Premium disponible actuellement.</p>
          ) : (
            <ul className="space-y-2">
              {formationsPremium.slice(0, 5).map((f) => (
                <li key={f.id} className="flex items-center gap-2 text-sm">
                  <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  <span className="text-text">{f.titre || f.intitule}</span>
                </li>
              ))}
              {formationsPremium.length > 5 && (
                <li className="text-sm text-primary">
                  + {formationsPremium.length - 5} autres formations Premium
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Confirmation souscription */}
      {!isAlreadySubscribed && (
        <div className="rounded-xl border border-border bg-white p-6 space-y-5">
          <h2 className="text-lg font-semibold text-text">
            Confirmer votre souscription
            <span className={`ml-3 rounded-full px-3 py-0.5 text-sm font-medium ${
              selectedOffer === 'PREMIUM'
                ? 'bg-primary/10 text-primary'
                : 'bg-slate-100 text-slate-600'
            }`}>
              {selectedOffer}
            </span>
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-bg p-4">
              <p className="text-xs uppercase tracking-wide text-subtext">Mensualité</p>
              <p className="mt-1.5 text-2xl font-bold text-text">{formatFcfa(selectedPrice)}</p>
            </div>
            <div className="rounded-lg bg-bg p-4">
              <p className="text-xs uppercase tracking-wide text-subtext">Premier prélèvement</p>
              <p className="mt-1.5 text-2xl font-bold text-success">{formatFcfa(preview.montant_premier_mois)}</p>
              <p className="mt-0.5 text-xs text-subtext">Prorata du mois en cours</p>
            </div>
            <div className="rounded-lg bg-bg p-4">
              <p className="text-xs uppercase tracking-wide text-subtext">Renouvellement le</p>
              <p className="mt-1.5 text-xl font-bold text-text">{formatDate(preview.renewalDate)}</p>
            </div>
          </div>

          {error && !isNotFound(error) && (
            <div className="rounded-lg border border-danger bg-danger/5 p-3 text-sm text-danger">
              {error?.message || 'Impossible de finaliser la souscription.'}
            </div>
          )}

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:border-primary transition-colors">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              checked={consentAccepted}
              onChange={(e) => setConsentAccepted(e.target.checked)}
              data-testid="consent-checkbox"
            />
            <span className="text-sm text-text">
              J'accepte le renouvellement automatique mensuel et les{' '}
              <span className="text-primary">conditions générales d'utilisation</span>.
            </span>
          </label>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              onClick={handleSubscribe}
              disabled={!consentAccepted || isLoading}
              loading={isLoading}
              data-testid="btn-souscrire"
            >
              Souscrire à l'offre {selectedOffer === 'PREMIUM' ? 'Premium' : 'Essentiel'}
            </Button>
            <Link to="/apprenant/catalogue">
              <Button variant="outline">Continuer sans abonnement</Button>
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
