import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../../../hooks/useAuth';
import { inscriptionsApi } from '../../../api/inscriptions.api';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/feedback/Spinner';

/**
 * DossierDecision - Page de décision sur un dossier (RETENIR ou REFUSER)
 * Route: /backoffice/dossiers/:id/decision
 * Accessible à: ADMIN, SUPERVISEUR
 * RM-05: Impossible de refuser un dossier déjà RETENU (bouton masqué)
 * Référence: F-9 Backoffice Dossiers (Todo_front.pdf)
 */
export default function DossierDecision() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dossier, setDossier] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [motifRefus, setMotifRefus] = useState('');

  const { execute, isLoading } = useApi();
  const { showToast } = useToast();

  useEffect(() => {
    loadDossier();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadDossier = async () => {
    try {
      const response = await execute(() => inscriptionsApi.getByIdBackoffice(id), {
        showErrorToast: false,
        onSuccess: (data) => {
          setDossier(data?.data || data);
        },
      });
      setLoadError('');
      return response;
    } catch (error) {
      setLoadError(error?.message || error?.error || 'Impossible de charger le dossier');
      setDossier(null);
      return null;
    }
  };

  const handleRetenir = () => {
    setConfirmAction({
      title: 'Confirmer la décision RETENU ?',
      message:
        'L\'étudiant sera notifié et aura 72h pour effectuer le paiement. Cette décision est irréversible.',
      action: async () => {
        await execute(() => inscriptionsApi.retenir(id), {
          onSuccess: () => {
            showToast('Dossier retenu avec succès', 'success');
            navigate('/backoffice/dossiers');
          },
        });
      },
      variant: 'success',
    });
    setIsConfirmModalOpen(true);
  };

  const handleRefuser = () => {
    if (!motifRefus.trim()) {
      showToast('Veuillez saisir un motif de refus', 'error');
      return;
    }

    setConfirmAction({
      title: 'Confirmer la décision REFUSÉ ?',
      message:
        'L\'étudiant sera notifié et ne pourra plus s\'inscrire à cette session. Cette action est définitive.',
      action: async () => {
        await execute(() => inscriptionsApi.refuser(id, { motif_refus: motifRefus }), {
          onSuccess: () => {
            showToast('Dossier refusé avec succès', 'success');
            navigate('/backoffice/dossiers');
          },
        });
      },
      variant: 'danger',
    });
    setIsConfirmModalOpen(true);
  };

  const handleTraiterException = (decision) => {
    if (decision === 'REFUSE' && !motifRefus.trim()) {
      showToast('Veuillez saisir un motif de refus', 'error');
      return;
    }

    setConfirmAction({
      title: `Confirmer la décision ${decision} pour ce dossier EXCEPTION ?`,
      message:
        decision === 'RETENU'
          ? 'L\'étudiant sera retenu malgré le dépassement de capacité. Cette décision est irréversible.'
          : 'L\'étudiant sera refusé et notifié du motif.',
      action: async () => {
        const payload =
          decision === 'REFUSE'
            ? { decision, motif_refus: motifRefus }
            : { decision };

        await execute(() => inscriptionsApi.traiterException(id, payload), {
          onSuccess: () => {
            showToast(
              `Dossier exception traité avec succès (${decision})`,
              'success'
            );
            navigate('/backoffice/dossiers');
          },
        });
      },
      variant: decision === 'RETENU' ? 'success' : 'danger',
    });
    setIsConfirmModalOpen(true);
  };

  const getStatutBadge = (statut) => {
    const mapping = {
      EN_ATTENTE: { variant: 'gray', label: 'En attente' },
      EN_ATTENTE_VERIFICATION: { variant: 'warning', label: 'En vérification' },
      RETENU: { variant: 'info', label: 'Retenu' },
      PAYE_DIRECTEMENT: { variant: 'warning', label: 'Paiement à effectuer' },
      PAYE: { variant: 'success', label: 'Payé' },
      CONFIRME: { variant: 'success', label: 'Confirmé' },
      REJETE: { variant: 'danger', label: 'Rejeté' },
      REFUSE: { variant: 'danger', label: 'Refusé' },
      GRIS: { variant: 'warning', label: 'Gris' },
      EXCEPTION: { variant: 'danger', label: 'Exception' },
      ARCHIVE: { variant: 'gray', label: 'Archivé' },
      ANNULE: { variant: 'danger', label: 'Annulé' },
    };

    const config = mapping[statut] || { variant: 'gray', label: statut };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // RM-05: Un dossier RETENU ne peut plus être refusé
  const canRetenir =
    dossier?.statut === 'EN_ATTENTE' ||
    dossier?.statut === 'GRIS' ||
    dossier?.statut === 'EXCEPTION';

  const canRefuser =
    (dossier?.statut === 'EN_ATTENTE' || dossier?.statut === 'GRIS') &&
    dossier?.statut !== 'RETENU'; // RM-05: RETENU ne peut être refusé

  const isException = dossier?.statut === 'EXCEPTION';

  const canTakeDecision =
    user?.role === 'ADMIN' || user?.role === 'SUPERVISEUR';

  const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('fr-FR');
  };

  const formatMontant = (value) => {
    if (value === null || value === undefined) return '-';
    return `${Number(value).toLocaleString('fr-FR')} FCFA`;
  };

  const getPaiementLabel = (paiementValue) => {
    const mapping = {
      CONFIRME: { variant: 'success', label: 'Paiement confirmé' },
      EN_ATTENTE: { variant: 'warning', label: 'Paiement en attente' },
      PENDING: { variant: 'warning', label: 'Paiement en cours' },
      ECHOUE: { variant: 'danger', label: 'Paiement échoué' },
      EXPIRE: { variant: 'danger', label: 'Paiement expiré' },
    };

    const config = mapping[paiementValue?.statut] || { variant: 'gray', label: 'Aucun paiement' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading && !dossier) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (!dossier) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card>
          <div className="py-10 text-center">
            <h2 className="text-xl font-semibold text-primary">
              Dossier indisponible
            </h2>
            <p className="mt-2 text-sm text-subtext">
              {loadError || 'Le dossier n’a pas pu être chargé.'}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={loadDossier}>
                Réessayer
              </Button>
              <Button variant="primary" onClick={() => navigate('/backoffice/dossiers')}>
                Retour à la liste
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const etudiant = dossier.apprenant || dossier.etudiant || {};
  const session = dossier.session || {};
  const formation = dossier.formation || session.formation || {};
  const organisation = etudiant.organisation || dossier.organisation || {};
  const paiement = dossier.paiement || {};
  const voucher = dossier.voucher_organisation || {};

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
                Décision sur dossier
              </p>
              {getStatutBadge(dossier.statut)}
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-primary">
              Dossier de {etudiant.nom} {etudiant.prenom || etudiant.prenoms}
            </h2>
            <p className="mt-1 text-sm text-subtext">
              Formation: {formation.titre || formation.intitule}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/backoffice/dossiers')}
            >
              Retour à la liste
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <Card title="Informations du dossier">
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-medium uppercase text-subtext">
                Apprenant
              </dt>
              <dd className="mt-1 text-sm text-text">
                {etudiant.nom} {etudiant.prenom || etudiant.prenoms}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-subtext">
                Email
              </dt>
              <dd className="mt-1 text-sm text-text">{etudiant.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-subtext">
                Formation
              </dt>
              <dd className="mt-1 text-sm text-text">{formation.titre || formation.intitule}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-subtext">
                Session
              </dt>
              <dd className="mt-1 text-sm text-text">
                Du {formatDate(session.date_debut)} au {formatDate(session.date_fin)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-subtext">
                Source de financement
              </dt>
              <dd className="mt-1 text-sm text-text">{dossier.source_financement || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-subtext">
                Fenêtre
              </dt>
              <dd className="mt-1 text-sm text-text">{dossier.type_fenetre || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-subtext">
                Date de dépôt
              </dt>
              <dd className="mt-1 text-sm text-text">
                {formatDate(dossier.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-subtext">
                Statut
              </dt>
              <dd className="mt-1 text-sm text-text">
                {getStatutBadge(dossier.statut)}
              </dd>
            </div>
          </dl>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Apprenant">
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Nom</dt>
                <dd className="mt-1 text-sm text-text">
                  {etudiant.nom || '-'} {etudiant.prenoms || etudiant.prenom || ''}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Email</dt>
                <dd className="mt-1 text-sm text-text">{etudiant.email || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Type</dt>
                <dd className="mt-1 text-sm text-text">{etudiant.type_apprenant || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Pays</dt>
                <dd className="mt-1 text-sm text-text">
                  {etudiant.pays_residence || '-'} / {etudiant.pays_nationalite || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Secteur</dt>
                <dd className="mt-1 text-sm text-text">{etudiant.secteur_activite || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Niveau</dt>
                <dd className="mt-1 text-sm text-text">{etudiant.niveau_etude || '-'}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Organisation">
            <dl className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <dt className="text-xs font-medium uppercase text-subtext">Raison sociale</dt>
                <dd className="mt-1 text-sm text-text">
                  {organisation.raison_sociale || 'Aucune organisation rattachée'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Email</dt>
                <dd className="mt-1 text-sm text-text">{organisation.email || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Type</dt>
                <dd className="mt-1 text-sm text-text">{organisation.type || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Contact</dt>
                <dd className="mt-1 text-sm text-text">{organisation.contact_referent || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Pays</dt>
                <dd className="mt-1 text-sm text-text">{organisation.pays || '-'}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Session">
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Statut</dt>
                <dd className="mt-1 text-sm text-text">{session.statut || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Lieu</dt>
                <dd className="mt-1 text-sm text-text">{session.lieu || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Capacité</dt>
                <dd className="mt-1 text-sm text-text">{session.capacite ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Inscrits</dt>
                <dd className="mt-1 text-sm text-text">{session.nb_inscrits ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Places restantes</dt>
                <dd className="mt-1 text-sm text-text">{session.places_restantes ?? '-'}</dd>
              </div>
            </dl>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Paiement">
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Statut</dt>
                <dd className="mt-1 text-sm text-text">{getPaiementLabel(paiement)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Canal</dt>
                <dd className="mt-1 text-sm text-text">{paiement.provider || paiement.methode || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Montant catalogue</dt>
                <dd className="mt-1 text-sm text-text">{formatMontant(paiement.montant_catalogue)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Montant final</dt>
                <dd className="mt-1 text-sm text-text">{formatMontant(paiement.montant_final)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Réduction</dt>
                <dd className="mt-1 text-sm text-text">{formatMontant(paiement.reduction_appliquee)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Confirmé le</dt>
                <dd className="mt-1 text-sm text-text">{formatDate(paiement.confirmed_at)}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Voucher / apporteur">
            <dl className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <dt className="text-xs font-medium uppercase text-subtext">Voucher organisation</dt>
                <dd className="mt-1 text-sm text-text">
                  {voucher.code ? `${voucher.code} (${voucher.statut || '-'})` : 'Aucun'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Type</dt>
                <dd className="mt-1 text-sm text-text">{voucher.type_valeur || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Valeur</dt>
                <dd className="mt-1 text-sm text-text">
                  {voucher.valeur === null || voucher.valeur === undefined
                    ? '-'
                    : `${voucher.valeur}${voucher.type_valeur === 'POURCENTAGE' ? '%' : ' FCFA'}`}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Quota</dt>
                <dd className="mt-1 text-sm text-text">
                  {voucher.code ? `${voucher.quota_utilise || 0} / ${voucher.quota_max || 0}` : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-subtext">Expiration</dt>
                <dd className="mt-1 text-sm text-text">{formatDate(voucher.date_expiration)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs font-medium uppercase text-subtext">Code apporteur</dt>
                <dd className="mt-1 text-sm text-text">{dossier.code_apporteur || '-'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs font-medium uppercase text-subtext">Motif de refus</dt>
                <dd className="mt-1 text-sm text-text">{dossier.motif_refus || '-'}</dd>
              </div>
            </dl>
          </Card>
        </div>

        {canTakeDecision && (
          <Card title="Prendre une décision">
            {/* Message RM-05 si le dossier est déjà RETENU */}
            {dossier.statut === 'RETENU' && (
              <div className="mb-4 rounded-lg border-l-4 border-warning bg-warning/10 p-4">
                <p className="text-sm font-medium text-warning">
                  <span className="mr-2">⚠</span>
                  Ce dossier a déjà été retenu et ne peut plus être refusé.
                  L'étudiant dispose de 72h pour effectuer son paiement.
                </p>
              </div>
            )}

            {/* Message pour dossiers EXCEPTION */}
            {isException && (
              <div className="mb-4 rounded-lg border-l-4 border-danger bg-danger/10 p-4">
                <p className="text-sm font-medium text-danger">
                  <span className="mr-2">⚠</span>
                  Ce dossier est en EXCEPTION (capacité dépassée de plus de 10%). Une
                  décision manuelle est requise.
                </p>
              </div>
            )}

            {/* Champ motif de refus */}
            {(canRefuser || isException) && (
              <div className="mb-6">
                <label className="mb-1 block text-sm font-medium text-text">
                  Motif de refus (optionnel pour RETENIR, obligatoire pour REFUSER)
                </label>
                <textarea
                  value={motifRefus}
                  onChange={(e) => setMotifRefus(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:border-primary focus:outline-none"
                  placeholder="Saisissez le motif du refus si vous choisissez de refuser ce dossier..."
                />
              </div>
            )}

            {/* Boutons de décision */}
            <div className="flex gap-3">
              {canRetenir && !isException && (
                <Button variant="success" onClick={handleRetenir}>
                  Retenir le candidat
                </Button>
              )}

              {canRefuser && !isException && (
                <Button variant="danger" onClick={handleRefuser}>
                  Refuser le candidat
                </Button>
              )}

              {isException && (
                <>
                  <Button
                    variant="success"
                    onClick={() => handleTraiterException('RETENU')}
                  >
                    Accepter malgré l'exception
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleTraiterException('REFUSE')}
                  >
                    Refuser définitivement
                  </Button>
                </>
              )}

              {!canRetenir && !canRefuser && !isException && (
                <p className="text-sm text-subtext">
                  Aucune action disponible pour ce statut.
                </p>
              )}
            </div>

            {canRefuser && (
              <p className="mt-3 text-xs text-subtext">
                Note: Une fois un dossier retenu, il ne pourra plus être refusé.
              </p>
            )}
          </Card>
        )}

        {!canTakeDecision && (
          <Card>
            <p className="text-sm text-subtext">
              Vous n'avez pas les permissions nécessaires pour prendre une décision
              sur ce dossier.
            </p>
          </Card>
        )}
      </div>

      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title={confirmAction?.title || 'Confirmer l\'action'}
      >
        <div className="space-y-4">
          <p className="text-sm text-text">{confirmAction?.message}</p>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant={confirmAction?.variant || 'danger'}
              onClick={confirmAction?.action}
              loading={isLoading}
            >
              Confirmer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
