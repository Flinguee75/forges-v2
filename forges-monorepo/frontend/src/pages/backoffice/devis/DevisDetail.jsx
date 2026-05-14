import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../hooks/useToast';
import devisApi from '../../../api/devis.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Spinner from '../../../components/feedback/Spinner';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('fr-FR', { dateStyle: 'long' }) : '-';
}

function formatMontant(value) {
  if (value === undefined || value === null) return '-';
  return Number(value).toLocaleString('fr-FR') + ' XOF';
}

function formatQuotaPercentage(voucher) {
  if (!voucher) return '-';
  const valeur = Number(voucher.valeur ?? 0);
  return voucher.type_valeur === 'POURCENTAGE' ? `${valeur}%` : formatMontant(valeur);
}

function formatQuotaLimits(voucher) {
  const quotaMax = Number(voucher?.quota_max ?? 0);
  const quotaUtilise = Number(voucher?.quota_utilise ?? 0);
  return `${quotaUtilise} / ${quotaMax || 0}`;
}

const STATUT_CONFIG = {
  CREE:   { variant: 'warning', label: 'En attente de paiement' },
  PAYE:   { variant: 'success', label: 'Payé' },
  ANNULE: { variant: 'gray',    label: 'Annulé' },
};

const VOUCHER_STATUT_CONFIG = {
  EN_ATTENTE: { variant: 'warning', label: 'En attente' },
  ACTIF:      { variant: 'success', label: 'Actif' },
  UTILISE:    { variant: 'gray',    label: 'Utilisé' },
  EXPIRE:     { variant: 'danger',  label: 'Expiré' },
};

export default function DevisDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { execute, isLoading } = useApi();
  const { showToast } = useToast();

  const [devis, setDevis] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [notesAdmin, setNotesAdmin] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGeneratingVouchers, setIsGeneratingVouchers] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const loadVouchers = async () => {
    const data = await devisApi.listerVouchers(id);
    setVouchers(data);
  };

  const handleEnvoyerEmail = async () => {
    setIsSendingEmail(true);
    try {
      const result = await devisApi.envoyerEmail(id);
      showToast(`Email envoyé à ${result?.to || 'l\'organisation'}.`, 'success');
    } catch {
      showToast('Erreur lors de l\'envoi de l\'email.', 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleTelechargerDocx = async () => {
    setIsDownloading(true);
    try {
      await devisApi.telechargerDocx(id);
    } catch {
      showToast('Erreur lors du telechargement du document.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };


  const handleGenererVouchers = async () => {
    setIsGeneratingVouchers(true);
    try {
      const result = await devisApi.genererVouchers(id);
      showToast(`${result.nb_generes} voucher(s) genere(s) avec succes.`, 'success');
      await loadVouchers();
    } catch (err) {
      const msg = err?.response?.data?.error;
      if (msg === 'VOUCHERS_DEJA_GENERES') showToast('Les vouchers ont deja ete generes pour ce devis.', 'warning');
      else if (msg === 'DEVIS_DEJA_PAYE') showToast('Le devis est deja paye, les vouchers sont actifs.', 'info');
      else showToast('Erreur lors de la generation des vouchers.', 'error');
    } finally {
      setIsGeneratingVouchers(false);
    }
  };

  useEffect(() => {
    execute(() => devisApi.getById(id), {
      onSuccess: setDevis,
      showErrorToast: false,
    });
    loadVouchers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handlePayer = async () => {
    await execute(() => devisApi.payer(id, notesAdmin || undefined), {
      onSuccess: async (data) => {
        setDevis(data);
        setConfirmAction(null);
        showToast('Devis marqué comme payé.', 'success');
        // Recharger les vouchers : ils sont maintenant ACTIF
        await loadVouchers();
      },
    });
  };

  const handleAnnuler = async () => {
    await execute(() => devisApi.annuler(id, notesAdmin || undefined), {
      onSuccess: (data) => {
        setDevis(data);
        setConfirmAction(null);
        showToast('Devis annulé.', 'success');
      },
    });
  };

  if (isLoading && !devis) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (!devis) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center">
        <p className="text-subtext">Devis introuvable.</p>
        <Button className="mt-4" onClick={() => navigate('/backoffice/devis')}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  const peutEtrePaye = devis.statut === 'CREE';
  const peutEtreAnnule = devis.statut === 'CREE';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">Détail devis</p>
        <h2 className="mt-3 font-mono text-2xl font-semibold text-primary" data-testid="devis-numero">
          {devis.numero_devis}
        </h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Badge variant={STATUT_CONFIG[devis.statut]?.variant || 'gray'} data-testid="devis-statut">
            {STATUT_CONFIG[devis.statut]?.label || devis.statut}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-subtext">Informations</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-subtext">
                {devis.organisation_id ? 'Organisation' : 'Apprenant individuel'}
              </dt>
              <dd className="mt-1 text-sm text-text">
                {devis.organisation_id
                  ? (devis.organisation?.raison_sociale || devis.organisation_id)
                  : (
                    <span className="space-y-0.5">
                      <span className="block font-medium">{devis.destinataire_nom}</span>
                      <span className="block text-subtext">{devis.destinataire_email}</span>
                      {devis.destinataire_organisation && (
                        <span className="block text-subtext">{devis.destinataire_organisation}</span>
                      )}
                    </span>
                  )
                }
              </dd>
            </div>
            <div>
              <dt className="text-xs text-subtext">Formation</dt>
              <dd className="mt-1 text-sm text-text">
                {devis.formation?.intitule || devis.formation_id}
              </dd>
            </div>
            {devis.session && (
              <div>
                <dt className="text-xs text-subtext">Session</dt>
                <dd className="mt-1 text-sm text-text">
                  {devis.session.date_debut
                    ? `${formatDate(devis.session.date_debut)} — ${formatDate(devis.session.date_fin)}`
                    : devis.session.lieu || 'Session liée'}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-subtext">Créé le</dt>
              <dd className="mt-1 text-sm text-text">{formatDate(devis.created_at)}</dd>
            </div>
            {devis.paid_at && (
              <div>
                <dt className="text-xs text-subtext">Payé le</dt>
                <dd className="mt-1 text-sm text-text">{formatDate(devis.paid_at)}</dd>
              </div>
            )}
            {devis.cancelled_at && (
              <div>
                <dt className="text-xs text-subtext">Annulé le</dt>
                <dd className="mt-1 text-sm text-text">{formatDate(devis.cancelled_at)}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-subtext">Montants</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-subtext">Nombre de places</dt>
              <dd className="mt-1 text-sm text-text">{devis.nb_places}</dd>
            </div>
            <div>
              <dt className="text-xs text-subtext">Tarif unitaire</dt>
              <dd className="mt-1 text-sm text-text">{formatMontant(devis.tarif_unitaire_xof)}</dd>
            </div>
            <div className="border-t border-border pt-3">
              <dt className="text-xs text-subtext">Montant total</dt>
              <dd className="mt-1 text-xl font-semibold text-primary" data-testid="devis-montant">
                {formatMontant(devis.montant_total_xof)}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      {devis.notes_admin && (
        <Card>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-subtext">Notes admin</h3>
          <p className="text-sm text-text">{devis.notes_admin}</p>
        </Card>
      )}

      {/* Section vouchers — RM-152/153 */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-subtext">
            Vouchers ({vouchers.length} / {devis.nb_places})
          </h3>
          {devis.statut === 'CREE' && vouchers.length === 0 && (
            <button
              data-testid="btn-generer-vouchers"
              disabled={isGeneratingVouchers}
              onClick={handleGenererVouchers}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {isGeneratingVouchers ? 'Generation...' : 'Generer les vouchers'}
            </button>
          )}
        </div>
        {vouchers.length === 0 ? (
          <p className="text-sm text-subtext" data-testid="vouchers-empty">
            {devis.statut === 'PAYE'
              ? 'Aucun voucher lie a ce devis.'
              : 'Cliquer sur "Generer les vouchers" pour creer les places nominatives.'}
          </p>
        ) : (
          <div className="space-y-2" data-testid="vouchers-list">
            {vouchers.map((v, i) => (
              <div
                key={v.id}
                className="space-y-2 rounded-lg border border-border px-4 py-3"
                data-testid={`voucher-item-${i}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-subtext">{v.code}</span>
                  <Badge
                    variant={VOUCHER_STATUT_CONFIG[v.statut]?.variant || 'gray'}
                    data-testid={`voucher-statut-${i}`}
                  >
                    {VOUCHER_STATUT_CONFIG[v.statut]?.label || v.statut}
                  </Badge>
                </div>
                <dl className="grid gap-2 text-xs text-subtext sm:grid-cols-3">
                  <div>
                    <dt className="uppercase tracking-[0.18em]">Organisation</dt>
                    <dd className="mt-1 text-text">
                      {v.organisation?.raison_sociale || v.devis?.organisation_id || devis.organisation?.raison_sociale || devis.organisation_id}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.18em]">Réduction</dt>
                    <dd className="mt-1 text-text">{formatQuotaPercentage(v)}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.18em]">Quota</dt>
                    <dd className="mt-1 text-text">{formatQuotaLimits(v)}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        )}
      </Card>

      {(peutEtrePaye || peutEtreAnnule) && (
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-primary">Actions</h3>

          {confirmAction === null ? (
            <div className="flex flex-wrap gap-3">
              {peutEtrePaye && (
                <Button
                  data-testid="btn-payer"
                  onClick={() => setConfirmAction('payer')}
                >
                  Marquer comme payé
                </Button>
              )}
              {peutEtreAnnule && (
                <Button
                  data-testid="btn-annuler"
                  variant="outline"
                  onClick={() => setConfirmAction('annuler')}
                >
                  Annuler le devis
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-text">
                {confirmAction === 'payer'
                  ? 'Confirmer la réception du paiement hors plateforme ?'
                  : 'Confirmer l\'annulation de ce devis ?'}
              </p>
              <Input
                label="Notes admin (optionnel)"
                placeholder="Référence virement, motif..."
                value={notesAdmin}
                onChange={(e) => setNotesAdmin(e.target.value)}
                data-testid="input-notes"
              />
              <div className="flex gap-3">
                <Button
                  loading={isLoading}
                  onClick={confirmAction === 'payer' ? handlePayer : handleAnnuler}
                  data-testid="btn-confirm-action"
                >
                  Confirmer
                </Button>
                <Button variant="outline" onClick={() => setConfirmAction(null)}>
                  Retour
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Button
            loading={isSendingEmail}
            onClick={handleEnvoyerEmail}
            data-testid="btn-envoyer-email"
          >
            Envoyer le devis par email
          </Button>
          <Button
            variant="outline"
            loading={isDownloading}
            onClick={handleTelechargerDocx}
            data-testid="btn-telecharger-docx"
          >
            Telecharger Word (.docx)
          </Button>
        </div>
        <Button variant="outline" onClick={() => navigate('/backoffice/devis')}>
          Retour a la liste
        </Button>
      </div>
    </div>
  );
}
