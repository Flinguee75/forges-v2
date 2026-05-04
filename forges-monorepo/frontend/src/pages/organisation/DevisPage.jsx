import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import devisApi from '../../api/devis.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/feedback/EmptyState';
import Spinner from '../../components/feedback/Spinner';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('fr-FR') : '-';
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

const STATUT_LABEL = {
  CREE: 'En attente de paiement',
  PAYE: 'Payé',
  ANNULE: 'Annulé',
};

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
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">Mes devis</p>
        <h2 className="mt-3 text-2xl font-semibold text-primary">Devis en cours</h2>
        <p className="mt-2 text-subtext">
          Vos devis SUR_DEVIS établis par FORGES. Le paiement s'effectue hors plateforme.
        </p>
      </div>

      <Card>
        {isLoading && devisList.length === 0 ? (
          <div className="py-12">
            <Spinner size="large" />
          </div>
        ) : devisList.length === 0 ? (
          <EmptyState
            title="Aucun devis"
            message="Vous n'avez pas encore de devis. Contactez FORGES pour établir un devis SUR_DEVIS."
          />
        ) : (
          <div className="space-y-4">
            {devisList.map((devis) => (
              <div
                key={devis.id}
                className="rounded-lg border border-border p-5"
                data-testid="devis-item"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold text-primary" data-testid="devis-numero">
                      {devis.numero_devis}
                    </p>
                    <p className="mt-1 text-sm text-text">
                      {devis.formation?.intitule || 'Formation'}
                    </p>
                    <p className="mt-1 text-xs text-subtext">Créé le {formatDate(devis.created_at)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={STATUT_VARIANT[devis.statut] || 'gray'} data-testid="devis-statut">
                      {STATUT_LABEL[devis.statut] || devis.statut}
                    </Badge>
                    <p className="text-lg font-semibold text-primary" data-testid="devis-montant">
                      {formatMontant(devis.montant_total_xof)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 border-t border-border pt-4 text-sm md:grid-cols-3">
                  <div>
                    <span className="text-subtext">Places</span>
                    <p className="mt-1 font-medium text-text">{devis.nb_places}</p>
                  </div>
                  <div>
                    <span className="text-subtext">Tarif unitaire</span>
                    <p className="mt-1 font-medium text-text">{formatMontant(devis.tarif_unitaire_xof)}</p>
                  </div>
                  {devis.paid_at && (
                    <div>
                      <span className="text-subtext">Payé le</span>
                      <p className="mt-1 font-medium text-text">{formatDate(devis.paid_at)}</p>
                    </div>
                  )}
                </div>

                {devis.statut === 'CREE' && (
                  <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Paiement à effectuer hors plateforme. Contactez votre interlocuteur FORGES pour confirmer la réception.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
