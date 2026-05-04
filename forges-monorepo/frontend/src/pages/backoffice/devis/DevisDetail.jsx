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

const STATUT_VARIANT = {
  CREE: 'warning',
  PAYE: 'success',
  ANNULE: 'gray',
};

export default function DevisDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { execute, isLoading } = useApi();
  const { showToast } = useToast();

  const [devis, setDevis] = useState(null);
  const [notesAdmin, setNotesAdmin] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    execute(() => devisApi.getById(id), {
      onSuccess: setDevis,
      showErrorToast: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handlePayer = async () => {
    await execute(() => devisApi.payer(id, notesAdmin || undefined), {
      onSuccess: (data) => {
        setDevis(data);
        setConfirmAction(null);
        showToast('Devis marqué comme payé.', 'success');
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
          <Badge variant={STATUT_VARIANT[devis.statut] || 'gray'} data-testid="devis-statut">
            {devis.statut}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-subtext">Informations</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-subtext">Organisation</dt>
              <dd className="mt-1 text-sm text-text">
                {devis.organisation?.raison_sociale || devis.organisation_id}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-subtext">Formation</dt>
              <dd className="mt-1 text-sm text-text">
                {devis.formation?.intitule || devis.formation_id}
              </dd>
            </div>
            {devis.session_id && (
              <div>
                <dt className="text-xs text-subtext">Session</dt>
                <dd className="mt-1 font-mono text-sm text-text">{devis.session_id}</dd>
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

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => navigate('/backoffice/devis')}>
          Retour à la liste
        </Button>
      </div>
    </div>
  );
}
