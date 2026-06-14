import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import responsableApi from '../../../api/responsable.api';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/feedback/Spinner';

/**
 * ValidationFormation - Page CRITIQUE de validation d'une formation partenaire
 * Route: /backoffice/formations-partenaires/:id/valider
 * Accessible à: RESPONSABLE (désigné), ADMIN
 *
 * ⚠️ RÈGLES CRITIQUES ⚠️
 * RM-127: C'est ICI et SEULEMENT ICI que type_formation et pilier_abonnement sont assignés
 * RM-128: Seul le RESPONSABLE désigné pour ce partenaire peut valider
 * RM-137: Calcul automatique du prix catalogue côté backend
 * RM-134: Badge rouge "J+5 dépassé" si > 5 jours depuis soumission
 *
 * Référence: F-14 Backoffice Partenaires (ForgesTODO v2.md)
 */
export default function ValidationFormation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { execute, isLoading } = useApi();
  const { showToast } = useToast();

  const [formation, setFormation] = useState(null);
  const [typeFormation, setTypeFormation] = useState('STANDARD');
  const [pilierAbonnement, setPilierAbonnement] = useState('TOUS');
  const [prixCoutant, setPrixCoutant] = useState(0);
  const [motifRejet, setMotifRejet] = useState('');
  const [motifSuspension, setMotifSuspension] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    loadFormation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadFormation = async () => {
    await execute(
      () => responsableApi.getValidationDetail(id),
      {
        onSuccess: (result) => {
          // Unwrap { statusCode, data: fp }
          const fp = result?.data || result;
          setFormation(fp);
          const f = fp?.formation || {};
          // Pré-remplir classification si déjà validée
          if (fp.type_formation_assigne || f.type_formation) {
            setTypeFormation(fp.type_formation_assigne || f.type_formation);
          }
          if (fp.pilier_abonnement_assigne || f.pilier_abonnement) {
            setPilierAbonnement(fp.pilier_abonnement_assigne || f.pilier_abonnement);
          }
          // prix_coutant_soumis est en centimes → afficher en FCFA
          if (fp.prix_coutant_valide) {
            setPrixCoutant(Math.round(fp.prix_coutant_valide / 100));
          } else if (fp.prix_coutant_soumis) {
            setPrixCoutant(Math.round(fp.prix_coutant_soumis / 100));
          }
        },
      }
    );
  };

  // RM-134: Calcul du délai depuis soumission
  const calculateDelai = () => {
    const dateRef = formation?.date_soumission || formation?.created_at;
    if (!dateRef) return { jours: 0, depasseDelai: false };
    const created = new Date(dateRef);
    const now = new Date();
    const diffTime = now - created;
    const jours = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return { jours, depasseDelai: jours > 5 };
  };

  const delai = formation ? calculateDelai() : { jours: 0, depasseDelai: false };

  const getStatutBadge = (statut) => {
    const mapping = {
      BROUILLON: { variant: 'gray', label: 'Brouillon' },
      EN_ATTENTE_VALIDATION: { variant: 'warning', label: 'En attente validation' },
      ACTIVE: { variant: 'success', label: 'Validée' },
      REJETEE: { variant: 'danger', label: 'Rejetée' },
      SUSPENDUE: { variant: 'warning', label: 'Suspendue' },
    };

    const config = mapping[statut] || { variant: 'gray', label: statut };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleValider = () => {
    // Validation des champs requis
    if (!typeFormation || !pilierAbonnement || !prixCoutant) {
      showToast('Veuillez remplir tous les champs requis', 'error');
      return;
    }

    setConfirmAction({
      title: 'Confirmer la validation ?',
      message: `Cette action assignera le type de formation "${typeFormation}" et publiera la formation dans le catalogue. Le partenaire sera notifié.`,
      action: async () => {
        const validationData = {
          type_formation: typeFormation,
          pilier_abonnement: pilierAbonnement,
          prix_coutant_valide: prixCoutant * 100, // FCFA → centimes pour le backend
        };

        await execute(
          () => responsableApi.validerFormation(id, validationData),
          {
            onSuccess: () => {
              showToast('Formation validée avec succès', 'success');
              navigate('/backoffice/formations-partenaires');
            },
          }
        );
      },
      variant: 'success',
    });
    setIsConfirmModalOpen(true);
  };

  const handleRejeter = () => {
    if (!motifRejet.trim()) {
      showToast('Veuillez saisir un motif de rejet', 'error');
      return;
    }

    setConfirmAction({
      title: 'Confirmer le rejet ?',
      message: 'Le partenaire sera notifié du rejet avec le motif fourni. Cette action est définitive.',
      action: async () => {
        await execute(
          () => responsableApi.rejeterFormation(id, { motif: motifRejet }),
          {
            onSuccess: () => {
              showToast('Formation rejetée avec succès', 'success');
              navigate('/backoffice/formations-partenaires');
            },
          }
        );
      },
      variant: 'danger',
    });
    setIsConfirmModalOpen(true);
  };

  const handleSuspendre = () => {
    setConfirmAction({
      title: 'Confirmer la suspension ?',
      message: 'La formation sera retirée du catalogue. Le partenaire sera notifié.',
      action: async () => {
        await execute(
          () => responsableApi.suspendreFormation(id, { motif_suspension: motifSuspension || 'Suspension administrative' }),
          {
            onSuccess: () => {
              showToast('Formation suspendue avec succès', 'success');
              navigate('/backoffice/formations-partenaires');
            },
          }
        );
      },
      variant: 'warning',
    });
    setIsConfirmModalOpen(true);
  };

  if (isLoading && !formation) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (!formation) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <p className="text-subtext">Formation non trouvée.</p>
        <Button
          onClick={() => navigate('/backoffice/formations-partenaires')}
          className="mt-4"
        >
          Retour à la liste
        </Button>
      </div>
    );
  }

  // Alias pour accès lisible
  const f = formation.formation || {};
  const statutFormation = f.statut || formation.statut_validation || '';

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
              Validation formation partenaire
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-primary">
              {f.intitule || '—'}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {getStatutBadge(statutFormation)}
              {delai.depasseDelai && (
                <Badge variant="danger">J+{delai.jours} dépassé</Badge>
              )}
              <span className="text-sm text-subtext">
                Partenaire : {formation.partenaire?.raison_sociale || '—'}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/backoffice/formations-partenaires')}
          >
            Retour
          </Button>
        </div>
      </div>

      {/* RM-128: Vérification autorisation RESPONSABLE */}
      {user?.role === 'RESPONSABLE' && statutFormation === 'EN_ATTENTE_VALIDATION' && (
        <div className="mb-6 rounded-lg border border-warning bg-warning/10 p-4">
          <p className="text-sm text-warning">
            <strong>Note:</strong> Vous devez être le responsable désigné pour ce partenaire pour pouvoir valider cette formation.
          </p>
        </div>
      )}

      {/* Informations de la formation */}
      <Card className="mb-6">
        <h3 className="mb-4 text-lg font-semibold text-primary">Informations soumises par le partenaire</h3>
        <div className="space-y-5">
          {/* Ligne 1 : métadonnées rapides */}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Mode</p>
              <p className="mt-1 text-sm text-text">{f.mode_formation || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Durée</p>
              <p className="mt-1 text-sm text-text">{f.duree_jours ? `${f.duree_jours} jour(s)` : '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Langues</p>
              <p className="mt-1 text-sm text-text">{(f.langues_disponibles || []).join(', ') || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Public cible</p>
              <p className="mt-1 text-sm text-text">{f.public_cible || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Certification</p>
              <p className="mt-1 text-sm text-text">{f.certification_delivree ? 'Oui' : 'Non'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Prix proposé</p>
              <p className="mt-1 text-sm font-semibold text-text">
                {formation.prix_coutant_soumis
                  ? `${Math.round(formation.prix_coutant_soumis / 100).toLocaleString('fr-FR')} FCFA`
                  : '—'}
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Description</p>
            <p className="mt-1 text-sm text-text whitespace-pre-line">{f.description_courte || f.description_longue || '—'}</p>
          </div>

          {/* Objectifs */}
          {(f.objectifs_pedagogiques || []).length > 0 && (
            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext mb-2">Objectifs pédagogiques</p>
              <ul className="space-y-1">
                {f.objectifs_pedagogiques.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Prérequis */}
          {f.prerequis && (
            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Prérequis</p>
              <p className="mt-1 text-sm text-text whitespace-pre-line">{f.prerequis}</p>
            </div>
          )}

          {/* Soumission / délai */}
          <div className="border-t border-border pt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Date de soumission</p>
              <p className="mt-1 text-sm text-text">{formatDate(formation.date_soumission)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Délai de traitement</p>
              <p className={`mt-1 text-sm font-medium ${delai.depasseDelai ? 'text-danger' : 'text-text'}`}>
                J+{delai.jours} {delai.depasseDelai ? '— dépassé' : ''}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* RM-127: SECTION CRITIQUE - Assignment type_formation et pilier_abonnement */}
      <Card className="mb-6 border-2 border-primary">
        <div className="mb-4 rounded-lg bg-primary/10 p-3">
          <p className="text-sm font-semibold text-primary">
            Ces champs sont assignés exclusivement lors de la validation. Toute modification ultérieure nécessite une nouvelle validation.
          </p>
        </div>

        <h3 className="mb-4 text-lg font-semibold text-primary">Classification de la formation</h3>

        <div className="space-y-6">
          {/* Type de formation */}
          <div>
            <label className="mb-2 block text-sm font-medium text-text">
              Type de formation <span className="text-danger">*</span>
            </label>
            <select
              value={typeFormation}
              onChange={(e) => setTypeFormation(e.target.value)}
              disabled={statutFormation !== 'EN_ATTENTE_VALIDATION'}
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none disabled:bg-gray-100"
            >
              <option value="STANDARD">STANDARD - Formation incluse dans les abonnements</option>
              <option value="PREMIUM">PREMIUM - Formation avec vérification responsable</option>
              <option value="SUR_DEVIS">Sur devis - Tarification personnalisée</option>
            </select>
            <p className="mt-1 text-xs text-subtext">
              Ce champ détermine le parcours d'inscription et l'éligibilité aux abonnements.
            </p>
          </div>

          {/* Pilier abonnement */}
          <div>
            <label className="mb-2 block text-sm font-medium text-text">
              Pilier abonnement <span className="text-danger">*</span>
            </label>
            <select
              value={pilierAbonnement}
              onChange={(e) => setPilierAbonnement(e.target.value)}
              disabled={statutFormation !== 'EN_ATTENTE_VALIDATION'}
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none disabled:bg-gray-100"
            >
              <option value="RETAIL">RETAIL - Apprenants individuels</option>
              <option value="B2B">B2B - Organisations</option>
              <option value="INSTITUTIONNEL">INSTITUTIONNEL - Contrats institutionnels</option>
              <option value="TOUS">TOUS - Tous les types d'abonnés</option>
            </select>
            <p className="mt-1 text-xs text-subtext">
              Définit qui peut accéder à cette formation via abonnement.
            </p>
          </div>
        </div>
      </Card>

      {/* RM-137: Prix catalogue calculé par le backend */}
      <Card className="mb-6">
        <h3 className="mb-4 text-lg font-semibold text-primary">Tarification</h3>

        <div className="space-y-6">
          {/* Prix coûtant */}
          <div>
            <label className="mb-2 block text-sm font-medium text-text">
              Prix coûtant (proposé par le partenaire) <span className="text-danger">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={prixCoutant}
                onChange={(e) => setPrixCoutant(parseInt(e.target.value) || 0)}
                disabled={statutFormation !== 'EN_ATTENTE_VALIDATION'}
                className="flex-1 rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none disabled:bg-gray-100"
                min="0"
                step="1"
              />
              <span className="text-sm font-medium text-subtext">FCFA</span>
            </div>
            <p className="mt-1 text-xs text-subtext">
              Montant net que le partenaire recevra (prix de revient).
            </p>
          </div>

          <div className="rounded-lg border-2 border-success bg-success/10 p-4">
            <h4 className="mb-3 font-semibold text-success">Prix catalogue calculé automatiquement</h4>
            <p className="text-sm text-text">
              Le prix catalogue est calculé par FORGES côté backend à partir du prix coûtant et de la configuration globale.
            </p>
            <p className="mt-2 text-xs text-subtext">
              Le partenaire reçoit le montant net indiqué ci-dessus. La commission FORGES est déduite en interne et n'est pas visible dans cette interface.
            </p>
          </div>
        </div>
      </Card>

      {/* Actions de validation */}
      {statutFormation === 'EN_ATTENTE_VALIDATION' && (
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-primary">Décision de validation</h3>

          {/* Zone de rejet */}
          <div className="mb-6 rounded-lg border border-border bg-gray-50 p-4">
            <label className="mb-2 block text-sm font-medium text-text">
              Motif de rejet (si applicable)
            </label>
            <textarea
              value={motifRejet}
              onChange={(e) => setMotifRejet(e.target.value)}
              placeholder="Saisissez le motif si vous rejetez la formation..."
              className="w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-text focus:border-primary focus:outline-none"
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-border pt-6">
            <Button
              variant="outline"
              onClick={() => navigate('/backoffice/formations-partenaires')}
            >
              Retour
            </Button>
            <div className="flex gap-3">
              <Button
                variant="danger"
                onClick={handleRejeter}
                disabled={isLoading}
              >
                Rejeter
              </Button>
              <Button
                variant="success"
                onClick={handleValider}
                disabled={isLoading}
              >
                Valider et publier
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Actions pour formations déjà validées */}
      {statutFormation === 'ACTIVE' && (
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-primary">Actions</h3>

          {/* Zone de suspension */}
          <div className="mb-6 rounded-lg border border-border bg-gray-50 p-4">
            <label className="mb-2 block text-sm font-medium text-text">
              Motif de suspension (optionnel)
            </label>
            <textarea
              value={motifSuspension}
              onChange={(e) => setMotifSuspension(e.target.value)}
              placeholder="Saisissez le motif de suspension..."
              className="w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-text focus:border-primary focus:outline-none"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between border-t border-border pt-6">
            <Button
              variant="outline"
              onClick={() => navigate('/backoffice/formations-partenaires')}
            >
              Retour
            </Button>
            <Button
              variant="warning"
              onClick={handleSuspendre}
              disabled={isLoading}
            >
              Suspendre la formation
            </Button>
          </div>
        </Card>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title={confirmAction?.title || ''}
      >
        <p className="mb-6 text-subtext">{confirmAction?.message}</p>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setIsConfirmModalOpen(false)}
          >
            Annuler
          </Button>
          <Button
            variant={confirmAction?.variant || 'primary'}
            onClick={() => {
              confirmAction?.action();
              setIsConfirmModalOpen(false);
            }}
          >
            Confirmer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
