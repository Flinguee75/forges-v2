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
    await execute(() => inscriptionsApi.getByIdBackoffice(id), {
      onSuccess: (data) => {
        setDossier(data);
      },
    });
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

  if (isLoading && !dossier) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (!dossier) {
    return null;
  }

  const etudiant = dossier.apprenant || dossier.etudiant || {};
  const session = dossier.session || {};
  const formation = dossier.formation || session.formation || {};

  return (
    <div className="mx-auto max-w-5xl">
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
                Du {new Date(session.date_debut).toLocaleDateString('fr-FR')} au{' '}
                {new Date(session.date_fin).toLocaleDateString('fr-FR')}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-subtext">
                Date de dépôt
              </dt>
              <dd className="mt-1 text-sm text-text">
                {new Date(dossier.created_at).toLocaleDateString('fr-FR')}
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
