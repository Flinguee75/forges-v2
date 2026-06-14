import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import responsableApi from '../../../api/responsable.api';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/feedback/Spinner';
import Icon from '../../../components/ui/Icon';

const MODE_LABELS = {
  PRESENTIEL: 'Présentiel',
  EN_LIGNE: 'En ligne',
  A_LA_DEMANDE: 'À la demande',
  AVEC_SESSION: 'Avec session',
};

const STATUT_BADGE = {
  BROUILLON:            { variant: 'gray',    label: 'Brouillon' },
  EN_ATTENTE_VALIDATION:{ variant: 'warning', label: 'En attente validation' },
  ACTIVE:               { variant: 'success', label: 'Validée' },
  REJETEE:              { variant: 'danger',  label: 'Rejetée' },
  SUSPENDUE:            { variant: 'warning', label: 'Suspendue' },
};

function formatFcfa(centimes) {
  if (!centimes && centimes !== 0) return '—';
  return `${Math.round(centimes / 100).toLocaleString('fr-FR')} FCFA`;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function calcDelai(dateRef) {
  if (!dateRef) return { jours: 0, depasseDelai: false };
  const jours = Math.floor((Date.now() - new Date(dateRef).getTime()) / (1000 * 60 * 60 * 24));
  return { jours, depasseDelai: jours > 5 };
}

function MetaChip({ label, value }) {
  if (!value) return null;
  return (
    <div className="rounded-lg border border-border bg-bg px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-subtext">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-text">{value}</p>
    </div>
  );
}

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
  const [rejetExpanded, setRejetExpanded] = useState(false);
  const [motifRejet, setMotifRejet] = useState('');
  const [motifSuspension, setMotifSuspension] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    execute(() => responsableApi.getValidationDetail(id), {
      onSuccess: (result) => {
        const fp = result?.data || result;
        setFormation(fp);
        const f = fp?.formation || {};
        if (fp.type_formation_assigne || f.type_formation) {
          setTypeFormation(fp.type_formation_assigne || f.type_formation);
        }
        if (fp.pilier_abonnement_assigne || f.pilier_abonnement) {
          setPilierAbonnement(fp.pilier_abonnement_assigne || f.pilier_abonnement);
        }
        if (fp.prix_coutant_valide) {
          setPrixCoutant(Math.round(fp.prix_coutant_valide / 100));
        } else if (fp.prix_coutant_soumis) {
          setPrixCoutant(Math.round(fp.prix_coutant_soumis / 100));
        }
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (isLoading && !formation) {
    return <div className="flex justify-center py-12"><Spinner size="large" /></div>;
  }

  if (!formation) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <p className="text-subtext">Formation non trouvée.</p>
        <Button onClick={() => navigate('/backoffice/formations-partenaires')} className="mt-4">
          Retour à la liste
        </Button>
      </div>
    );
  }

  const f = formation.formation || {};
  const statut = f.statut || formation.statut_validation || '';
  const delai = calcDelai(formation.date_soumission || formation.created_at);
  const isEnAttente = statut === 'EN_ATTENTE_VALIDATION';
  const isActive = statut === 'ACTIVE';
  const canEdit = isEnAttente;
  const statutConfig = STATUT_BADGE[statut] || { variant: 'gray', label: statut };

  const handleValider = () => {
    if (!typeFormation || !pilierAbonnement) {
      showToast('Veuillez remplir tous les champs requis', 'error');
      return;
    }
    setConfirmAction({
      title: 'Confirmer la validation ?',
      message: `La formation sera publiée avec le type "${typeFormation}". Le partenaire sera notifié.`,
      action: async () => {
        await execute(
          () => responsableApi.validerFormation(id, {
            type_formation: typeFormation,
            pilier_abonnement: pilierAbonnement,
            prix_coutant_valide: prixCoutant * 100,
          }),
          { onSuccess: () => { showToast('Formation validée', 'success'); navigate('/backoffice/formations-partenaires'); } }
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
      message: 'Le partenaire sera notifié du rejet avec le motif fourni.',
      action: async () => {
        await execute(
          () => responsableApi.rejeterFormation(id, { motif: motifRejet }),
          { onSuccess: () => { showToast('Formation rejetée', 'success'); navigate('/backoffice/formations-partenaires'); } }
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
          { onSuccess: () => { showToast('Formation suspendue', 'success'); navigate('/backoffice/formations-partenaires'); } }
        );
      },
      variant: 'warning',
    });
    setIsConfirmModalOpen(true);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* ── Header full-width ── */}
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-white p-6 shadow-sm">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-subtext">
            Validation formation partenaire
          </p>
          <h2 className="mt-2 text-2xl font-bold text-primary truncate">
            {f.intitule || '—'}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Badge variant={statutConfig.variant}>{statutConfig.label}</Badge>
            {delai.depasseDelai && (
              <Badge variant="danger">J+{delai.jours} dépassé</Badge>
            )}
            {formation.partenaire?.raison_sociale && (
              <span className="text-sm text-subtext">
                {formation.partenaire.raison_sociale}
              </span>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate('/backoffice/formations-partenaires')}>
          Retour
        </Button>
      </div>

      {/* ── 2 colonnes ── */}
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">

        {/* ── Colonne gauche — infos partenaire ── */}
        <div className="space-y-5">

          {/* Bannière délai J+X (RM-134) */}
          {delai.depasseDelai && (
            <div className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger/8 px-5 py-4">
              <Icon name="clock" size={18} className="shrink-0 text-danger" />
              <p className="text-sm font-semibold text-danger">
                J+{delai.jours} — Délai de traitement dépassé
              </p>
            </div>
          )}

          {/* Bloc meta chips */}
          <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-subtext">
              Informations soumises
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MetaChip label="Mode" value={MODE_LABELS[f.mode_formation] || f.mode_formation} />
              <MetaChip label="Durée" value={f.duree_jours ? `${f.duree_jours} jour${f.duree_jours > 1 ? 's' : ''}` : null} />
              <MetaChip label="Langues" value={(f.langues_disponibles || []).join(', ') || null} />
              <MetaChip label="Certification" value={f.certification_delivree ? 'Oui' : 'Non'} />
              <MetaChip label="Public cible" value={f.public_cible} />
              <MetaChip label="Prix proposé" value={formation.prix_coutant_soumis ? formatFcfa(formation.prix_coutant_soumis) : null} />
            </div>
          </div>

          {/* Bloc contenu texte */}
          <div className="rounded-xl border border-border bg-white p-5 shadow-sm space-y-5">
            {(f.description_courte || f.description_longue) && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-subtext mb-2">Description</p>
                <p className="text-sm leading-6 text-text whitespace-pre-line">
                  {f.description_courte || f.description_longue}
                </p>
              </div>
            )}

            {(f.objectifs_pedagogiques || []).length > 0 && (
              <div className="border-t border-border pt-4">
                <p className="text-xs font-bold uppercase tracking-widest text-subtext mb-3">
                  Objectifs pédagogiques
                </p>
                <ul className="space-y-2">
                  {f.objectifs_pedagogiques.map((obj, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {obj}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {f.prerequis && (
              <div className="border-t border-border pt-4">
                <p className="text-xs font-bold uppercase tracking-widest text-subtext mb-2">Prérequis</p>
                <p className="text-sm leading-6 text-text whitespace-pre-line">{f.prerequis}</p>
              </div>
            )}

            <div className="border-t border-border pt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-subtext mb-2">Soumission</p>
              <p className="text-sm text-text">{formatDate(formation.date_soumission)}</p>
            </div>
          </div>
        </div>

        {/* ── Panel droit sticky bg-primary ── */}
        <div className="lg:sticky lg:top-6">
          <div className="rounded-xl bg-primary p-6 shadow-xl shadow-primary/20 space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/50">
                Classification FORGES — RM-127
              </p>
              <p className="mt-1 text-sm text-white/70">
                Ces champs sont assignés exclusivement lors de la validation.
              </p>
            </div>

            {/* Type de formation */}
            <div>
              <label htmlFor="type_formation" className="block text-sm font-semibold text-white mb-1.5">
                Type de formation <span className="text-danger">*</span>
              </label>
              <select
                id="type_formation"
                value={typeFormation}
                onChange={(e) => setTypeFormation(e.target.value)}
                disabled={!canEdit}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-50"
              >
                <option value="STANDARD">STANDARD — Inclus abonnements</option>
                <option value="PREMIUM">PREMIUM — Vérification responsable</option>
                <option value="SUR_DEVIS">SUR_DEVIS — Tarification personnalisée</option>
              </select>
            </div>

            {/* Pilier abonnement */}
            <div>
              <label htmlFor="pilier_abonnement" className="block text-sm font-semibold text-white mb-1.5">
                Pilier abonnement <span className="text-danger">*</span>
              </label>
              <select
                id="pilier_abonnement"
                value={pilierAbonnement}
                onChange={(e) => setPilierAbonnement(e.target.value)}
                disabled={!canEdit}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-50"
              >
                <option value="RETAIL">RETAIL — Individuels</option>
                <option value="B2B">B2B — Organisations</option>
                <option value="INSTITUTIONNEL">INSTITUTIONNEL — Contrats institutionnels</option>
                <option value="TOUS">TOUS — Tous les abonnés</option>
              </select>
            </div>

            {/* Prix coûtant */}
            <div>
              <label htmlFor="prix_coutant" className="block text-sm font-semibold text-white mb-1.5">
                Prix coûtant (FCFA) <span className="text-danger">*</span>
              </label>
              <input
                id="prix_coutant"
                type="number"
                value={prixCoutant}
                onChange={(e) => setPrixCoutant(parseInt(e.target.value) || 0)}
                disabled={!canEdit}
                min="0"
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-white/50">
                Montant net reçu par le partenaire. Prix catalogue calculé automatiquement.
              </p>
            </div>

            {/* Actions EN_ATTENTE_VALIDATION */}
            {isEnAttente && (
              <div className="space-y-3 border-t border-white/15 pt-5">
                <Button
                  variant="light"
                  fullWidth
                  onClick={handleValider}
                  disabled={isLoading}
                  className="w-full"
                >
                  Valider et publier
                </Button>

                {/* Expand rejet conditionnel */}
                {!rejetExpanded ? (
                  <button
                    type="button"
                    onClick={() => setRejetExpanded(true)}
                    className="w-full rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:border-danger/60 hover:text-danger focus:outline-none"
                  >
                    Rejeter
                  </button>
                ) : (
                  <div className="space-y-3 rounded-lg border border-danger/40 bg-danger/10 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/70">
                      Motif de rejet
                    </p>
                    <textarea
                      value={motifRejet}
                      onChange={(e) => setMotifRejet(e.target.value)}
                      placeholder="Saisissez le motif de rejet..."
                      rows={3}
                      className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setRejetExpanded(false); setMotifRejet(''); }}
                        className="flex-1 rounded-lg border border-white/20 px-3 py-2 text-sm text-white/60 hover:text-white"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleRejeter}
                        disabled={isLoading}
                        className="flex-1 rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white hover:bg-danger/80 disabled:opacity-50"
                      >
                        Confirmer le rejet
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions ACTIVE — suspension */}
            {isActive && (
              <div className="space-y-3 border-t border-white/15 pt-5">
                <div>
                  <label htmlFor="motif_suspension" className="block text-sm font-semibold text-white mb-1.5">
                    Motif de suspension (optionnel)
                  </label>
                  <textarea
                    id="motif_suspension"
                    value={motifSuspension}
                    onChange={(e) => setMotifSuspension(e.target.value)}
                    placeholder="Saisissez le motif de suspension..."
                    rows={2}
                    className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40"
                  />
                </div>
                <Button
                  variant="warning"
                  fullWidth
                  onClick={handleSuspendre}
                  disabled={isLoading}
                >
                  Suspendre la formation
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmation */}
      <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title={confirmAction?.title || ''}>
        <p className="mb-6 text-subtext">{confirmAction?.message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>Annuler</Button>
          <Button
            variant={confirmAction?.variant || 'primary'}
            onClick={() => { confirmAction?.action(); setIsConfirmModalOpen(false); }}
          >
            Confirmer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
