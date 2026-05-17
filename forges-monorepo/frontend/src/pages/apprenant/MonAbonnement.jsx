import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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
  formatXof,
  isFutureDate,
  previewRetailUpgrade,
} from '../../utils/retailBilling';

const STATUS_META = {
  ACTIF: { variant: 'success', label: 'Actif' },
  SUSPENDU: { variant: 'warning', label: 'Suspendu' },
  EXPIRE: { variant: 'danger', label: 'Expiré' },
  RESILIE: { variant: 'danger', label: 'Résilié' },
  ESSAI: { variant: 'info', label: 'Essai' },
};

function isNotFound(error) {
  return error?.code === 'NOT_FOUND' || error?.statusCode === 404;
}

function getStatusBadge(statut) {
  const meta = STATUS_META[statut] || { variant: 'gray', label: statut || 'Inconnu' };
  return <Badge variant={meta.variant} size="small">{meta.label}</Badge>;
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

export default function MonAbonnement() {
  const [abonnement, setAbonnement] = useState(null);
  const [formationsIncluses, setFormationsIncluses] = useState([]);
  const [isEmpty, setIsEmpty] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [motif, setMotif] = useState('');
  const didInitialLoad = useRef(false);
  const { execute, isLoading, error, reset } = useApi();

  const canSuspend = useMemo(() => {
    if (!abonnement) {
      return false;
    }

    return !isFutureDate(abonnement.suspendu_jusqu);
  }, [abonnement]);

  const renewalDate = abonnement?.date_renouvellement || abonnement?.date_fin || null;

  const loadData = useCallback(async () => {
    await execute(async () => {
      try {
        const current = await apprenantApi.getMonAbonnementRetail();
        if (!current?.id) {
          const catalogue = await formationsApi.getCatalogue({ limit: 100 });
          return {
            abonnement: null,
            formationsIncluses: normalizeCollection(catalogue).filter((formation) => formation.inclus_abonnement),
            isEmpty: true,
          };
        }

        const formations = await apprenantApi.getFormationsInclusesParAbonnement(current.id);

        return {
          abonnement: current,
          formationsIncluses: normalizeCollection(formations),
          isEmpty: false,
        };
      } catch (loadError) {
        if (!isNotFound(loadError)) {
          throw loadError;
        }

        const catalogue = await formationsApi.getCatalogue({ limit: 100 });
        return {
          abonnement: null,
          formationsIncluses: normalizeCollection(catalogue).filter((formation) => formation.inclus_abonnement),
          isEmpty: true,
        };
      }
    }, {
      showErrorToast: false,
      onSuccess: (result) => {
        setAbonnement(result.abonnement);
        setFormationsIncluses(result.formationsIncluses || []);
        setIsEmpty(Boolean(result.isEmpty));
        setPendingAction(null);
        setMotif('');
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

  const upgradePreview = abonnement?.offre === 'ESSENTIEL'
    ? previewRetailUpgrade(abonnement.offre, 'PREMIUM', new Date(), renewalDate)
    : null;
  const offerLabel = abonnement?.offre === 'PREMIUM' ? 'Premium' : 'Essentiel';

  const showSuspensionBanner = abonnement && isFutureDate(abonnement.suspendu_jusqu);

  const openAction = (type) => {
    if (!abonnement) {
      return;
    }

    if (type === 'upgrade') {
      setPendingAction({
        type,
        title: 'Confirmer la montée vers Premium',
        description: 'Le différentiel prorata est calculé avant confirmation.',
      });
      return;
    }

    if (type === 'downgrade') {
      setPendingAction({
        type,
        title: 'Confirmer la descente vers Essentiel',
        description: 'Effectif à la fin de la période (RM-104)',
      });
      return;
    }

    setPendingAction({
      type: 'suspend',
      title: "Confirmer la suspension de l'abonnement",
      description: "La suspension bloque l'accès Retail jusqu'à la prochaine fenêtre autorisée.",
    });
  };

  const confirmAction = async () => {
    if (!pendingAction) {
      return;
    }

    const actionConfig = {
      upgrade: {
        call: () => apprenantApi.upgradeAbonnementRetail({ offre: 'PREMIUM' }),
        successMessage: 'Abonnement mis à niveau vers Premium',
      },
      downgrade: {
        call: () => apprenantApi.downgradeAbonnementRetail({ offre: 'ESSENTIEL' }),
        successMessage: 'Descente planifiée à la fin de la période',
      },
      suspend: {
        call: () => apprenantApi.suspendreAbonnementRetail(motif ? { motif } : {}),
        successMessage: 'Abonnement suspendu',
      },
    }[pendingAction.type];

    if (!actionConfig) {
      return;
    }

    await execute(() => actionConfig.call(), {
      showSuccessToast: true,
      successMessage: actionConfig.successMessage,
      onSuccess: async () => {
        setPendingAction(null);
        setMotif('');
        await loadData();
      },
    });
  };

  if (isLoading && !abonnement && !isEmpty && !error) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (!abonnement && !isEmpty && !error) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="mx-auto max-w-3xl space-y-8">

        {/* Hero no-subscription */}
        <div className="rounded-2xl bg-gradient-to-r from-primary to-secondary p-8 text-white text-center shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
            Abonnement Retail
          </p>
          <h1 className="mt-3 text-3xl font-bold">
            Passez à la vitesse supérieure
          </h1>
          <p className="mt-3 mx-auto max-w-lg text-sm text-white/85">
            Sans abonnement, vous payez chaque session à l'unité.
            Avec un abonnement, les formations incluses sont comprises dans votre mensualité — aucun frais supplémentaire.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/apprenant/abonnement/souscrire">
              <Button variant="primary" className="bg-white text-primary hover:bg-white/90">
                Voir les offres
              </Button>
            </Link>
            <Link to="/apprenant/catalogue">
              <Button variant="outline" className="border-white/50 text-white hover:bg-white/10">
                Continuer sans abonnement
              </Button>
            </Link>
          </div>
        </div>

        {/* Comparaison des offres */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">Essentiel</span>
              <span className="text-xl font-bold text-text">15 000 FCFA<span className="text-sm font-normal text-subtext">/mois</span></span>
            </div>
            <ul className="space-y-1.5 text-sm text-subtext">
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />Toutes les formations Standard du catalogue incluses</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />Accès illimité pendant la durée de l'abonnement</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />Jusqu'à 3 formations simultanées</li>
            </ul>
            {formationsIncluses.length > 0
              ? <p className="mt-3 text-sm font-medium text-success">{formationsIncluses.length} formation{formationsIncluses.length > 1 ? 's' : ''} incluse{formationsIncluses.length > 1 ? 's' : ''} disponible{formationsIncluses.length > 1 ? 's' : ''}</p>
              : <p className="mt-3 text-xs font-medium text-warning">Formations Standard bientôt disponibles</p>
            }
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">Premium</span>
              <span className="text-xl font-bold text-text">25 000 FCFA<span className="text-sm font-normal text-subtext">/mois</span></span>
            </div>
            <ul className="space-y-1.5 text-sm text-subtext">
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />Tout ce qu'inclut l'offre Essentiel</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />Formations Premium exclusives incluses</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />Réduction -15% sur toutes les sessions</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />Accès prioritaire aux nouvelles formations</li>
            </ul>
            <p className="mt-3 text-xs font-medium text-warning">Formations Premium bientôt disponibles</p>
          </div>
        </div>

        {formationsIncluses.length > 0 && (
          <Card title="Aperçu des formations incluses">
            <p className="mb-4 text-sm text-subtext">
              Ces formations sont comprises dans votre mensualité dès la souscription Essentiel ou Premium.
            </p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {formationsIncluses.slice(0, 6).map((formation) => (
                <div key={formation.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-text">{getFormationLabel(formation)}</p>
                      <p className="mt-1 text-sm text-subtext line-clamp-2">{getFormationDescription(formation)}</p>
                    </div>
                    <Badge variant="success" size="small">Inclus</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm border border-border">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-secondary">
              Mon abonnement Retail
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-text">
              {offerLabel}
            </h1>
            <p className="mt-2 text-sm text-subtext">
              Gérez votre offre actuelle et vos accès Retail.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(abonnement.statut)}
            <Badge variant="info" size="small">{offerLabel}</Badge>
          </div>
        </div>
      </div>

      {showSuspensionBanner && (
        <Card className="border-l-4 border-warning">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-text">Suspension en cours</h2>
              <p className="mt-1 text-sm text-subtext">
                Suspension réutilisable à partir du {formatDate(abonnement.suspendu_jusqu)}.
              </p>
            </div>
            <Badge variant="warning" size="small">Suspendu</Badge>
          </div>
        </Card>
      )}

      {error && !isNotFound(error) && (
        <Card className="border-l-4 border-danger">
          <p className="text-sm text-danger">
            {error?.message || 'Une erreur est survenue lors du chargement de votre abonnement.'}
          </p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-secondary">
          <div className="text-sm text-subtext">Offre actuelle</div>
          <div className="mt-2 text-2xl font-semibold text-text">{offerLabel}</div>
        </Card>
        <Card className="border-l-4 border-success">
          <div className="text-sm text-subtext">Montant mensuel</div>
          <div className="mt-2 text-2xl font-semibold text-text">
            {formatXof(abonnement.montant_mensuel)}
          </div>
        </Card>
        <Card className="border-l-4 border-warning">
          <div className="text-sm text-subtext">Date de renouvellement</div>
          <div className="mt-2 text-2xl font-semibold text-text">
            {formatDate(renewalDate)}
          </div>
        </Card>
      </div>

      {abonnement.offre === 'ESSENTIEL' && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-text">Passez à Premium</p>
            <p className="mt-1 text-sm text-subtext">
              Débloquez les formations Premium exclusives et la réduction -15% sur toutes les sessions.
            </p>
          </div>
          <Button variant="primary" onClick={() => openAction('upgrade')}>
            Passer à Premium — 25 000 FCFA/mois
          </Button>
        </div>
      )}

      <Card title="Actions abonnement" bodyClassName="space-y-4">
        <div className="flex flex-wrap gap-3">
          {abonnement.offre === 'ESSENTIEL' && (
            <Button variant="success" onClick={() => openAction('upgrade')}>
              Upgrade vers Premium
            </Button>
          )}

          {abonnement.offre === 'PREMIUM' && (
            <Button variant="outline" onClick={() => openAction('downgrade')}>
              Passer à Essentiel
            </Button>
          )}

          {canSuspend && (
            <Button variant="warning" onClick={() => openAction('suspend')}>
              Suspendre
            </Button>
          )}

          <Link to="/apprenant/abonnement/souscrire">
            <Button variant="outline">Comparer les offres</Button>
          </Link>
        </div>

        {pendingAction && (
          <div className="rounded-lg border border-border bg-bg p-4">
            <h3 className="font-semibold text-text">{pendingAction.title}</h3>
            <p className="mt-1 text-sm text-subtext">{pendingAction.description}</p>

            {pendingAction.type === 'upgrade' && upgradePreview && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-white p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-subtext">Différentiel prorata estimé</div>
                  <div className="mt-2 text-2xl font-semibold text-text">
                    {formatFcfa(upgradePreview.montant_diff_prorata)}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-white p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-subtext">Renouvellement conservé</div>
                  <div className="mt-2 text-2xl font-semibold text-text">
                    {formatDate(upgradePreview.renewalDate)}
                  </div>
                </div>
              </div>
            )}

            {pendingAction.type === 'downgrade' && (
              <div className="mt-4 rounded-lg border border-border bg-white p-4">
                <p className="text-sm font-medium text-text">
                  Effectif à la fin de la période (RM-104)
                </p>
              </div>
            )}

            {pendingAction.type === 'suspend' && (
              <label className="mt-4 block text-sm font-medium text-text">
                Motif de suspension
                <textarea
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-border px-4 py-3 focus:border-primary focus:outline-none"
                  placeholder="Optionnel"
                />
              </label>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                variant={pendingAction.type === 'suspend' ? 'warning' : 'primary'}
                onClick={confirmAction}
                loading={isLoading}
              >
                Confirmer
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setPendingAction(null);
                  setMotif('');
                  reset();
                }}
              >
                Annuler
              </Button>
            </div>
          </div>
        )}
      </Card>

      {formationsIncluses.length > 0 && (
        <Card title="Formations incluses">
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
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-subtext">
                  <span>Code: {getFormationCode(formation)}</span>
                  <span>•</span>
                  <span>{getFormationDuration(formation) ? `${getFormationDuration(formation)} j` : '-'}</span>
                  <span>•</span>
                  <span>{formatFcfa(getFormationPrice(formation))}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
