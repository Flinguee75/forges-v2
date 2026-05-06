import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import devisApi from '../../api/devis.api';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/feedback/EmptyState';
import Spinner from '../../components/feedback/Spinner';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatMontant(value) {
  if (value === undefined || value === null) return '-';
  return Number(value).toLocaleString('fr-FR') + ' XOF';
}

const STATUT_CONFIG = {
  CREE:   { variant: 'warning', label: 'En attente de paiement', border: 'border-l-warning' },
  PAYE:   { variant: 'success', label: 'Payé',                   border: 'border-l-success' },
  ANNULE: { variant: 'gray',    label: 'Annulé',                  border: 'border-l-border'  },
};

function StatutBadge({ statut }) {
  const config = STATUT_CONFIG[statut] || { variant: 'gray', label: statut };
  return <Badge variant={config.variant} size="small">{config.label}</Badge>;
}

function DevisCard({ devis }) {
  const config = STATUT_CONFIG[devis.statut] || STATUT_CONFIG.ANNULE;

  return (
    <div
      className={`rounded-lg border border-border border-l-4 ${config.border} bg-white`}
      data-testid="devis-item"
    >
      {/* Ligne principale */}
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-sm font-semibold text-primary" data-testid="devis-numero">
              {devis.numero_devis}
            </p>
            <StatutBadge statut={devis.statut} />
          </div>
          <p className="mt-2 text-base font-medium text-text leading-snug">
            {devis.formation?.intitule || 'Formation'}
          </p>
          <p className="mt-1 text-xs text-subtext">Émis le {formatDate(devis.created_at)}</p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xs text-subtext">Montant total</p>
          <p className="mt-1 text-2xl font-semibold text-primary" data-testid="devis-montant">
            {formatMontant(devis.montant_total_xof)}
          </p>
        </div>
      </div>

      {/* Détails */}
      <div className="border-t border-border px-5 py-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-subtext">Places commandées</p>
            <p className="mt-1 text-sm font-semibold text-text">{devis.nb_places}</p>
          </div>
          <div>
            <p className="text-xs text-subtext">Tarif unitaire</p>
            <p className="mt-1 text-sm font-semibold text-text">{formatMontant(devis.tarif_unitaire_xof)}</p>
          </div>
          {devis.session?.date_debut && (
            <div>
              <p className="text-xs text-subtext">Session</p>
              <p className="mt-1 text-sm font-semibold text-text">{formatDate(devis.session.date_debut)}</p>
            </div>
          )}
          {devis.paid_at && (
            <div>
              <p className="text-xs text-subtext">Payé le</p>
              <p className="mt-1 text-sm font-semibold text-success">{formatDate(devis.paid_at)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Instruction paiement si en attente */}
      {devis.statut === 'CREE' && (
        <div className="border-t border-border bg-warning/5 px-5 py-4">
          <p className="text-sm font-semibold text-warning">Paiement en attente</p>
          <p className="mt-1 text-sm text-text">
            Effectuez un virement bancaire en indiquant la référence{' '}
            <span className="font-mono font-semibold">{devis.numero_devis}</span>{' '}
            dans le libellé. Votre contact FORGES confirmera la réception.
          </p>
        </div>
      )}
    </div>
  );
}

export default function DevisPage() {
  const { execute, isLoading } = useApi();
  const [devisList, setDevisList] = useState([]);

  useEffect(() => {
    execute(() => devisApi.getMesDevis(), {
      onSuccess: (data) => setDevisList(Array.isArray(data) ? data : []),
      showErrorToast: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-secondary">
          Mes devis
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-text">Devis FORGES</h1>
        <p className="mt-2 text-sm text-subtext">
          Vos devis établis par l&apos;équipe FORGES. Le paiement s&apos;effectue par virement bancaire
          sur présentation de ce devis.
        </p>
      </div>

      {isLoading && devisList.length === 0 ? (
        <div className="flex justify-center py-12">
          <Spinner size="large" />
        </div>
      ) : devisList.length === 0 ? (
        <EmptyState
          title="Aucun devis"
          message="Vous n'avez pas encore de devis. Contactez l'équipe FORGES pour obtenir un devis personnalisé."
        />
      ) : (
        <div className="space-y-4">
          {devisList.map((devis) => (
            <DevisCard key={devis.id} devis={devis} />
          ))}
        </div>
      )}
    </div>
  );
}
