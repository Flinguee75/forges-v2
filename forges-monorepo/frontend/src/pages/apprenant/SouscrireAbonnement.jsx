import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import apprenantApi from '../../api/espace-apprenant.api';
import { formationsApi } from '../../api/formations.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';
import {
  formatDate,
  formatFcfa,
  previewRetailSubscription,
  getRetailMonthlyPrice,
} from '../../utils/retailBilling';

const OFFER_DETAILS = {
  ESSENTIEL: {
    title: 'Essentiel',
    badgeClassName: 'bg-slate-100 text-slate-700',
    description: 'L’offre d’entrée pour démarrer sans complexité.',
    benefits: [
      'Accès au catalogue des formations standard éligibles',
      'Premier prélèvement calculé au prorata',
      'Renouvellement mensuel automatique',
    ],
  },
  PREMIUM: {
    title: 'Premium',
    badgeClassName: 'bg-violet-100 text-violet-800',
    description: 'L’offre avancée pour aller plus vite et plus loin.',
    benefits: [
      'Tous les avantages Essentiel',
      'Accès prioritaire aux nouveautés',
      'Tarif mensuel supérieur avec accompagnement renforcé',
    ],
  },
};

function isNotFound(error) {
  return error?.code === 'NOT_FOUND' || error?.statusCode === 404;
}

function normalizeCollection(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload?.data || [];
}

function getFormationLabel(formation) {
  return formation?.titre || formation?.intitule || 'Formation';
}

function getFormationDescription(formation) {
  return formation?.description || formation?.description_courte || '';
}

function getFormationCode(formation) {
  return formation?.code_formation || formation?.code || formation?.id || '-';
}

function getFormationPrice(formation) {
  return formation?.cout_catalogue || formation?.tarif || 0;
}

function getFormationDuration(formation) {
  return formation?.duree_jours || formation?.duree || null;
}

export default function SouscrireAbonnement() {
  const navigate = useNavigate();
  const [selectedOffer, setSelectedOffer] = useState('ESSENTIEL');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [currentAbonnement, setCurrentAbonnement] = useState(null);
  const [formationsIncluses, setFormationsIncluses] = useState([]);
  const [hasLoadedCurrent, setHasLoadedCurrent] = useState(false);
  const didInitialLoad = useRef(false);
  const { execute, isLoading, error, reset } = useApi();

  const loadData = useCallback(async () => {
    await execute(async () => {
      try {
        const current = await apprenantApi.getMonAbonnementRetail();
        const result = await apprenantApi.getFormationsInclusesParAbonnement(current.id);

        return {
          currentAbonnement: current,
          formationsIncluses: normalizeCollection(result),
          hasLoadedCurrent: true,
        };
      } catch (loadError) {
        if (!isNotFound(loadError)) {
          throw loadError;
        }

        const catalogue = await formationsApi.getCatalogue({ limit: 100 });
        return {
          currentAbonnement: null,
          formationsIncluses: normalizeCollection(catalogue).filter((formation) => formation.inclus_abonnement),
          hasLoadedCurrent: true,
        };
      }
    }, {
      showErrorToast: false,
      onSuccess: (result) => {
        setCurrentAbonnement(result.currentAbonnement);
        setFormationsIncluses(result.formationsIncluses || []);
        setHasLoadedCurrent(Boolean(result.hasLoadedCurrent));
        reset();
      },
    });
  }, [execute, reset]);

  useEffect(() => {
    if (didInitialLoad.current) {
      return;
    }

    didInitialLoad.current = true;
    loadData();
  }, [loadData]);

  const referenceDate = useMemo(() => new Date(), []);
  const selectedPrice = getRetailMonthlyPrice(selectedOffer);
  const preview = previewRetailSubscription(selectedOffer, referenceDate);
  const canSubscribe = !currentAbonnement && consentAccepted;
  const isAlreadySubscribed = Boolean(currentAbonnement);
  const includedCount = formationsIncluses.length;

  const handleSubscribe = async () => {
    await execute(
      () => apprenantApi.souscrireAbonnementRetail({ offre: selectedOffer }),
      {
        showSuccessToast: true,
        successMessage: 'Abonnement souscrit avec succès',
        onSuccess: () => {
          navigate('/apprenant/abonnement');
        },
      }
    );
  };

  if (isLoading && !hasLoadedCurrent && !error) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm border border-border">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-secondary">
          Souscription Retail
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-text">
          Choisissez votre abonnement
        </h1>
        <p className="mt-2 text-sm text-subtext">
          Comparez Essentiel et Premium, puis validez avec le premier prélèvement au prorata.
        </p>
      </div>

      {error && !isNotFound(error) && (
        <Card className="border-l-4 border-danger">
          <p className="text-sm text-danger">
            {error?.message || 'Impossible de charger les données de souscription.'}
          </p>
        </Card>
      )}

      {isAlreadySubscribed && (
        <Card className="border-l-4 border-success">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-secondary">
                Abonnement déjà actif
              </p>
              <h2 className="mt-2 text-xl font-semibold text-text">
                Vous disposez déjà d’un abonnement Retail
              </h2>
              <p className="mt-2 text-sm text-subtext">
                Gérez votre offre actuelle depuis la page Mon abonnement.
              </p>
            </div>
            <Link to="/apprenant/abonnement">
              <Button variant="outline">Aller à Mon abonnement</Button>
            </Link>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {Object.entries(OFFER_DETAILS).map(([offerKey, offer]) => {
          const isSelected = selectedOffer === offerKey;
          const amount = getRetailMonthlyPrice(offerKey);

          return (
            <Card
              key={offerKey}
              className={`border ${isSelected ? 'border-primary shadow-md' : 'border-border'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${offer.badgeClassName}`}>
                    {offer.title}
                  </div>
                  <p className="mt-3 text-lg font-semibold text-text">{offer.description}</p>
                </div>
                {isSelected && <Badge variant="success" size="small">Sélectionné</Badge>}
              </div>

              <div className="mt-5">
                <p className="text-sm text-subtext">Mensualité</p>
                <p className="mt-1 text-3xl font-semibold text-text">{formatFcfa(amount)}</p>
              </div>

              <ul className="mt-5 space-y-2 text-sm text-subtext">
                {offer.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-secondary" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex items-center justify-between gap-3">
                <Button
                  variant={isSelected ? 'success' : 'outline'}
                  onClick={() => setSelectedOffer(offerKey)}
                >
                  {isSelected ? 'Choisi' : 'Choisir'}
                </Button>
                <span className="text-sm font-medium text-subtext">
                  {includedCount} formation(s) incluse(s)
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      <Card title="Formations incluses au catalogue Retail">
        {formationsIncluses.length === 0 ? (
          <EmptyState
            title="Aucune formation incluse"
            message="Les formations incluses s’afficheront ici dès qu’elles seront disponibles dans le catalogue."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {formationsIncluses.map((formation) => (
              <div key={formation.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text">{getFormationLabel(formation)}</p>
                    <p className="mt-1 text-sm text-subtext line-clamp-2">
                      {getFormationDescription(formation)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="success" size="small">Inclus</Badge>
                    {formation.type_formation === 'PREMIUM' && (
                      <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800">
                        Premium
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-4 text-xs text-subtext">
                  Code: {getFormationCode(formation)} • {getFormationDuration(formation) ? `${getFormationDuration(formation)} j` : '-'} • {formatFcfa(getFormationPrice(formation))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Prévisualisation de la souscription" bodyClassName="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-subtext">Offre choisie</p>
            <p className="mt-2 text-xl font-semibold text-text">{selectedOffer}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-subtext">Mensualité</p>
            <p className="mt-2 text-xl font-semibold text-text">{formatFcfa(selectedPrice)}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-subtext">Renouvellement estimé</p>
            <p className="mt-2 text-xl font-semibold text-text">
              {formatDate(preview.renewalDate)}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-success bg-success/5 p-4">
          <p className="text-sm font-semibold text-text">Premier prélèvement au prorata</p>
          <p className="mt-1 text-2xl font-semibold text-success">
            {formatFcfa(preview.montant_premier_mois)}
          </p>
          <p className="mt-1 text-sm text-subtext">
            Calculé à partir du nombre de jours restants sur le mois en cours.
          </p>
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-border bg-bg p-4">
          <input
            type="checkbox"
            aria-label="Accepter le renouvellement automatique"
            className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
            checked={consentAccepted}
            onChange={(e) => setConsentAccepted(e.target.checked)}
          />
          <span className="text-sm text-text">
            J’accepte la souscription et le renouvellement automatique conformément à la règle RM-75.
          </span>
        </label>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            onClick={handleSubscribe}
            disabled={!canSubscribe || isLoading}
            loading={isLoading}
          >
            Confirmer la souscription
          </Button>
          <Link to="/apprenant/abonnement">
            <Button variant="outline">Retour à Mon abonnement</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
