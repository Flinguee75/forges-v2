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
      } catch (errFineo) {
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
        } catch (error) {
          if (!isMounted) return;
          setState({
            status: 'error',
            message: error?.message || error?.error || "Impossible d'initialiser le paiement.",
            paymentUrl: '',
            reference: '',
          });
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
