import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { paiementsApi } from '../../api/paiements.api';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Spinner from '../../components/feedback/Spinner';

export default function PaiementInitiation() {
  const { dossierId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({
    status: 'loading',
    message: 'Initialisation du paiement securise...',
    paymentUrl: '',
    reference: '',
  });

  useEffect(() => {
    let isMounted = true;

    async function initierPaiement() {
      const errorMessages = {
        FORBIDDEN: "Vous n'êtes pas autorisé à payer ce dossier.",
        DOSSIER_NOT_FOUND: "Dossier introuvable.",
        DOSSIER_STATUT_INVALIDE: "Ce dossier ne peut pas être payé dans son état actuel.",
        PAIEMENT_DEJA_VALIDE: "Ce dossier a déjà été payé.",
        PAYMENT_EXPIRED: "Le délai de paiement de 72h est dépassé.",
        TOO_MANY_ATTEMPTS: "Trop de tentatives. Contactez le support.",
      };

      const getErrorMessage = (err) => {
        const code = err?.response?.data?.error || err?.message || '';
        return errorMessages[code] || "Impossible d'initialiser le paiement. Veuillez réessayer.";
      };

      try {
        // FineoPay top 1
        const response = await paiementsApi.initierFineo(dossierId);
        const data = response?.data || response;

        if (!isMounted) return;

        setState({
          status: 'ready',
          message: 'Redirection vers la page de paiement securisee...',
          paymentUrl: data.checkout_link,
          reference: data.sync_ref,
        });

        window.location.assign(data.checkout_link);
      } catch (fineoErr) {
        // Erreurs bloquantes — pas besoin d'essayer NGSER
        const fineoCode = fineoErr?.response?.data?.error || fineoErr?.message || '';
        const isBlockingError = ['FORBIDDEN', 'DOSSIER_NOT_FOUND', 'PAIEMENT_DEJA_VALIDE', 'DOSSIER_STATUT_INVALIDE'].includes(fineoCode);

        if (isBlockingError) {
          if (!isMounted) return;
          setState({ status: 'error', message: getErrorMessage(fineoErr), paymentUrl: '', reference: '' });
          return;
        }

        // Fallback NGSER top 2
        try {
          const response = await paiementsApi.initierNgser({ dossier_id: dossierId });
          const data = response?.data || response;

          if (!isMounted) return;

          setState({
            status: 'ready',
            message: 'Redirection vers la page de paiement securisee...',
            paymentUrl: data.payment_url,
            reference: data.order_ngser,
          });

          window.location.assign(data.payment_url);
        } catch (ngserErr) {
          if (!isMounted) return;
          setState({ status: 'error', message: getErrorMessage(ngserErr), paymentUrl: '', reference: '' });
        }
      }
    }

    initierPaiement();

    return () => { isMounted = false; };
  }, [dossierId]);

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="space-y-5 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Paiement sécurisé</h1>
          <p className="mt-2 text-sm text-subtext">
            FORGES calcule le montant cote serveur. Vous allez etre redirige vers la page de paiement securisee.
          </p>
        </div>

        {state.status === 'loading' && (
          <div className="flex justify-center py-8">
            <Spinner size="large" />
          </div>
        )}

        <p className={state.status === 'error' ? 'text-danger' : 'text-text'}>
          {state.message}
        </p>

        {state.reference && (
          <p className="text-sm text-subtext">Reference : {state.reference}</p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {state.paymentUrl && (
            <Button variant="primary" onClick={() => window.location.assign(state.paymentUrl)}>
              Continuer vers le paiement
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate('/apprenant/paiements')}>
            Retour aux paiements
          </Button>
        </div>
      </Card>
    </div>
  );
}
