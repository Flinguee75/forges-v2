import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { organisationApi } from '../../api/espace-organisation.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ProgressBar from '../../components/ui/ProgressBar';
import Table from '../../components/ui/Table';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';
import { buildB2BImportPayload } from '../../utils/csvValidation';
import {
  formatDate,
  formatFcfa,
  getB2BPalierLabel,
  getB2BPalierList,
  getB2BProgressVariant,
  previewB2BUpgrade,
} from '../../utils/organisationBilling';

function isNotFound(error) {
  return error?.code === 'NOT_FOUND' || error?.statusCode === 404;
}

function statusMeta(statut) {
  const mapping = {
    ACTIF: { variant: 'success', label: 'Actif' },
    EN_ATTENTE_PAIEMENT: { variant: 'warning', label: 'Paiement en cours' },
    ESSAI: { variant: 'info', label: 'Essai' },
    SUSPENDU: { variant: 'warning', label: 'Suspendu' },
    ANNULE: { variant: 'danger', label: 'Annulé' },
    EXPIRE: { variant: 'danger', label: 'Expiré' },
    ABSENT: { variant: 'gray', label: 'Aucun abonnement' },
    INACTIF: { variant: 'gray', label: 'Inactif' },
  };
  return mapping[statut] || { variant: 'gray', label: statut || 'Inconnu' };
}

export default function AbonnementB2B() {
  const [activeTab, setActiveTab] = useState('abonnement');
  const [organisationSubscription, setOrganisationSubscription] = useState(null);
  const [b2b, setB2B] = useState(null);
  const [selectedPalier, setSelectedPalier] = useState('STARTER');
  const [membres, setMembres] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ email: '', nom: '', prenom: '' });
  const [csvFeedback, setCsvFeedback] = useState(null);
  const didInitialLoad = useRef(false);
  const { execute, isLoading, error, reset } = useApi();
  const { showToast } = useToast();

  const loadData = useCallback(async (page = 1) => {
    await execute(async () => {
      const [organisation, subscription, membresResult] = await Promise.all([
        organisationApi.getAbonnementOrganisation().catch((loadError) => {
          if (isNotFound(loadError)) {
            return null;
          }
          throw loadError;
        }),
        organisationApi.getAbonnementB2B().catch((loadError) => {
          if (isNotFound(loadError)) {
            return null;
          }
          throw loadError;
        }),
        organisationApi.getMembres({ page, limit: 20 }),
      ]);

      return { organisation, subscription, membresResult };
    }, {
      showErrorToast: false,
      onSuccess: ({ organisation, subscription, membresResult }) => {
        setOrganisationSubscription(organisation);
        setB2B(subscription);
        setMembres(membresResult?.data || []);
        setMeta(membresResult?.meta || { page: 1, totalPages: 1, total: 0 });
        if (subscription?.palier) {
          setSelectedPalier(subscription.palier);
        }
        reset?.();
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

  const organisationAccess = !organisationSubscription
    ? false
    : organisationSubscription.is_trial || organisationSubscription.statut === 'ACTIF';

  const hasB2B = Boolean(b2b?.exists || b2b?.id);
  const ratio = Number(b2b?.ratio_utilisation ?? 0);
  const progressVariant = b2b?.progress_variant || getB2BProgressVariant(ratio);
  const palierOptions = getB2BPalierList();

  const upgradePreview = useMemo(() => {
    if (!b2b?.palier) {
      return null;
    }
    return previewB2BUpgrade(b2b.palier, selectedPalier);
  }, [b2b, selectedPalier]);

  const handleSubmit = async (palier) => {
    if (!organisationAccess) {
      return;
    }

    const isExisting = Boolean(b2b?.exists ?? b2b?.id);
    const action = isExisting
      ? () => organisationApi.changerPalierB2B({ palier })
      : () => organisationApi.souscrireB2B({ palier });

    await execute(action, {
      showSuccessToast: false,
      onSuccess: async (data) => {
        if (data?.payment_url) {
          window.location.href = data.payment_url;
        } else {
          await loadData(meta.page);
        }
      },
    });
  };

  const handleAddMember = async (event) => {
    event.preventDefault();

    await execute(() => organisationApi.createMembre(formData), {
      showSuccessToast: true,
      successMessage: 'Apprenant B2B ajouté',
      onSuccess: async () => {
        setIsModalOpen(false);
        setFormData({ email: '', nom: '', prenom: '' });
        await loadData(meta.page);
      },
    });
  };

  const handleDelete = async (membreId) => {
    await execute(() => organisationApi.deleteMembre(membreId), {
      showSuccessToast: true,
      successMessage: 'Apprenant B2B retiré',
      onSuccess: async () => {
        await loadData(meta.page);
      },
    });
  };

  const handleCsvUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const content = await file.text();
    const payload = buildB2BImportPayload(content, { maxRows: 100 });
    setCsvFeedback(payload);

    if (!payload.isValid) {
      showToast('Le fichier CSV contient des erreurs de validation', 'error');
      return;
    }

    await execute(() => organisationApi.importB2BMembres({ rows: payload.rows }), {
      showSuccessToast: true,
      successMessage: 'Import CSV termine',
      onSuccess: async (result) => {
        setCsvFeedback({
          ...payload,
          serverResult: result,
        });
        await loadData(meta.page);
      },
    });
  };

  const columns = [
    { key: 'email', label: 'Email' },
    { key: 'nom', label: 'Nom' },
    { key: 'prenom', label: 'Prénom' },
    { key: 'statut', label: 'Statut' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, membre) => (
        <Button
          variant="danger"
          size="small"
          onClick={() => handleDelete(membre.id)}
        >
          Retirer
        </Button>
      ),
    },
  ];

  if (isLoading && !b2b && !error) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (!organisationAccess) {
    return (
      <EmptyState
        title="Abonnement organisation requis"
        message="Activez ou réservez votre abonnement organisation avant de souscrire un palier B2B."
        action={(
          <Link to="/organisation/abonnement">
            <Button variant="primary">Aller à l&apos;abonnement organisation</Button>
          </Link>
        )}
      />
    );
  }

  const currentStatus = statusMeta(b2b?.statut || 'ABSENT');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-secondary">
              Abonnement B2B
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-text">
              Gestion des bénéficiaires de votre organisation
            </h1>
            <p className="mt-2 text-sm text-subtext">
              Cette page sert à souscrire ou faire évoluer un palier B2B, puis à suivre les membres actifs rattachés à votre quota.
            </p>
          </div>
          <Badge variant={currentStatus.variant} size="small">{currentStatus.label}</Badge>
        </div>
      </div>

      <Card>
        <p className="text-sm text-subtext">
          En pratique, le B2B vous permet de gérer les apprenants de votre organisation sur un quota annuel:
          souscription du palier, ajout de membres, import CSV et contrôle de consommation.
        </p>
      </Card>

      {/* Tabs */}
      <div className="border-b border-border bg-white rounded-t-lg">
        <div className="flex gap-1 p-2">
          <button
            onClick={() => setActiveTab('abonnement')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'abonnement'
                ? 'bg-primary text-white'
                : 'text-primary hover:bg-primary/10'
            }`}
          >
            Abonnement & Paliers
          </button>
          <button
            onClick={() => setActiveTab('apprenants')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'apprenants'
                ? 'bg-primary text-white'
                : 'text-primary hover:bg-primary/10'
            }`}
          >
            Apprenants B2B
          </button>
        </div>
      </div>

      {/* Tab: Abonnement */}
      {activeTab === 'abonnement' && (
        <div className="space-y-6">
          {b2b?.statut === 'EN_ATTENTE_PAIEMENT' && (
            <Card className="border-l-4 border-warning">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-text">Paiement B2B en cours de traitement</p>
                  <p className="mt-1 text-sm text-subtext">
                    Votre palier B2B sera activé dès confirmation du paiement par NGSER.
                    Si vous n&apos;avez pas été redirigé, cliquez sur le bouton ci-dessous pour reprendre.
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={() => handleSubmit(b2b.palier)}
                  disabled={isLoading}
                  loading={isLoading}
                >
                  Reprendre le paiement
                </Button>
              </div>
            </Card>
          )}

          {b2b?.message && b2b?.statut !== 'EN_ATTENTE_PAIEMENT' && (
            <Card className={`border-l-4 ${progressVariant === 'danger' ? 'border-danger' : progressVariant === 'warning' ? 'border-warning' : 'border-success'}`}>
              <p className="text-sm font-semibold text-text">{b2b.message}</p>
              {b2b?.downgrade_message && (
                <p className="mt-1 text-sm text-subtext">{b2b.downgrade_message}</p>
              )}
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <p className="text-xs uppercase tracking-[0.22em] text-subtext">Palier actuel</p>
              <p className="mt-2 text-xl font-semibold text-text">{getB2BPalierLabel(b2b?.palier)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-[0.22em] text-subtext">Actifs / capacité</p>
              <p className="mt-2 text-xl font-semibold text-text">
                {b2b?.nb_actifs || 0} / {b2b?.nb_max || 0}
              </p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-[0.22em] text-subtext">Renouvellement</p>
              <p className="mt-2 text-xl font-semibold text-text">{formatDate(b2b?.date_renouvellement)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-[0.22em] text-subtext">Montant annuel</p>
              <p className="mt-2 text-xl font-semibold text-text">{formatFcfa(b2b?.montant_annuel || 0)}</p>
            </Card>
          </div>

          <Card title="Consommation du palier" bodyClassName="space-y-4">
            <ProgressBar
              current={Number(b2b?.nb_actifs || 0)}
              max={Number(b2b?.nb_max || 0)}
              variant={progressVariant}
            />
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setActiveTab('apprenants')}>
                Gérer les apprenants
              </Button>
              {b2b?.upgrade_recommande && (
                <Badge variant="warning" size="small">Montée en palier recommandée</Badge>
              )}
              {b2b?.downgrade_planifie && (
                <Badge variant="info" size="small">Effectif au renouvellement</Badge>
              )}
            </div>
          </Card>

          <Card title="Choisir un palier B2B" bodyClassName="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              {palierOptions.map((palier) => {
                const isSelected = selectedPalier === palier.key;
                const isCurrent = b2b?.palier === palier.key;
                const isDowngradeBlocked = b2b?.nb_actifs && palier.nbMax > 0 && b2b.nb_actifs > palier.nbMax;
                const isSurDevis = palier.key === 'SUR_DEVIS';

                return (
                  <div
                    key={palier.key}
                    className={`rounded-lg border p-4 ${isSelected ? 'border-primary shadow-sm' : 'border-border'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-text">{palier.label}</p>
                        <p className="mt-1 text-xs font-semibold text-subtext uppercase tracking-wide">
                          {palier.range} apprenant{palier.nbMax !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {isCurrent && <Badge variant="success" size="small">Actuel</Badge>}
                    </div>
                    {palier.description && (
                      <p className="mt-2 text-sm text-subtext">{palier.description}</p>
                    )}
                    <div className="mt-4">
                      <p className="text-sm text-subtext">Tarif annuel</p>
                      <p className="mt-1 text-2xl font-semibold text-text">
                        {palier.annualAmount > 0 ? formatFcfa(palier.annualAmount) : 'Sur devis'}
                      </p>
                    </div>
                    {isDowngradeBlocked && (
                      <p className="mt-3 text-xs text-danger">
                        Descente impossible : {b2b.nb_actifs} actifs pour une capacité cible de {palier.nbMax}.
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant={isSelected ? 'primary' : 'outline'}
                        onClick={() => setSelectedPalier(palier.key)}
                        disabled={isSurDevis}
                      >
                        {isSelected ? 'Sélectionné' : 'Choisir'}
                      </Button>
                      {isSurDevis && (
                        <Badge variant="warning" size="small">Contact FORGES</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {upgradePreview && selectedPalier !== b2b?.palier && (
              <div className="rounded-lg border border-border bg-bg p-4">
                <p className="text-sm font-semibold text-text">Prévisualisation du changement de palier</p>
                <p className="mt-1 text-sm text-subtext">
                  Différentiel annuel estimé : {upgradePreview.formattedDifferentialAmount}.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                onClick={() => handleSubmit(selectedPalier)}
                disabled={!selectedPalier || selectedPalier === 'SUR_DEVIS' || (selectedPalier === b2b?.palier)}
                loading={isLoading}
              >
                {b2b?.exists || b2b?.id ? 'Appliquer le changement' : 'Souscrire ce palier'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Apprenants */}
      {activeTab === 'apprenants' && (
        <div className="space-y-6">
          {!hasB2B ? (
            <EmptyState
              title="Aucun abonnement B2B"
              message="Souscrivez un palier B2B avant de gérer vos apprenants."
              action={
                <Button variant="primary" onClick={() => setActiveTab('abonnement')}>
                  Souscrire un palier B2B
                </Button>
              }
            />
          ) : (
            <>
              <div className="flex justify-end">
                <Button onClick={() => setIsModalOpen(true)}>Ajouter un apprenant</Button>
              </div>

              <Card title="Consommation actuelle" bodyClassName="space-y-4">
                <ProgressBar
                  current={Number(b2b?.nb_actifs || 0)}
                  max={Number(b2b?.nb_max || 0)}
                  variant={progressVariant}
                />
                <div className="text-sm text-subtext">
                  {b2b?.message || 'Consommation B2B suivie sur cette page.'}
                </div>
              </Card>

              <Card title="Import CSV B2B" bodyClassName="space-y-4">
                <p className="text-sm text-subtext">
                  Format attendu: `email,nom,prenom`. Maximum 100 lignes, email obligatoire.
                </p>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvUpload}
                  className="block w-full text-sm text-subtext file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
                />
                {csvFeedback?.errors?.length > 0 && (
                  <div className="rounded-lg border border-danger bg-danger/5 p-4">
                    <p className="text-sm font-semibold text-danger">Erreurs détectées</p>
                    <ul className="mt-2 space-y-1 text-sm text-danger">
                      {csvFeedback.errors.map((item) => (
                        <li key={`${item.row}-${item.field || item.code}`}>
                          Ligne {item.row || '-'}: {item.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {csvFeedback?.warnings?.length > 0 && (
                  <div className="rounded-lg border border-warning bg-warning/5 p-4">
                    <p className="text-sm font-semibold text-warning">Lignes ignorées</p>
                    <ul className="mt-2 space-y-1 text-sm text-warning">
                      {csvFeedback.warnings.map((item) => (
                        <li key={`${item.row}-${item.field || 'warning'}`}>
                          Ligne {item.row}: {item.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {csvFeedback?.serverResult && (
                  <div className="rounded-lg border border-success bg-success/5 p-4 text-sm text-text">
                    Import : {csvFeedback.serverResult.imported} créé(s), {csvFeedback.serverResult.linked} rattaché(s), {csvFeedback.serverResult.skipped} ignoré(s).
                  </div>
                )}
              </Card>

              <Card title="Liste des apprenants B2B">
                <Table columns={columns} data={membres} emptyMessage="Aucun apprenant rattaché à ce palier." />
              </Card>
            </>
          )}
        </div>
      )}

      {/* Modal ajout apprenant */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Ajouter un apprenant B2B"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
            required
          />
          <Input
            label="Nom"
            value={formData.nom}
            onChange={(event) => setFormData((current) => ({ ...current, nom: event.target.value }))}
            required
          />
          <Input
            label="Prénom"
            value={formData.prenom}
            onChange={(event) => setFormData((current) => ({ ...current, prenom: event.target.value }))}
            required
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={isLoading}>Ajouter</Button>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
