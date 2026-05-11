import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { paiementsApi } from '../../api/paiements.api';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Spinner from '../../components/feedback/Spinner';

const ERROR_MESSAGES = {
  FORBIDDEN: "Vous n'etes pas autorise a payer ce dossier.",
  DOSSIER_NOT_FOUND: 'Dossier introuvable.',
  DOSSIER_STATUT_INVALIDE: "Ce dossier ne peut pas etre paye dans son etat actuel.",
  PAIEMENT_DEJA_VALIDE: 'Ce dossier a deja ete paye.',
  PAYMENT_EXPIRED: 'Le delai de paiement de 72h est depasse.',
  TOO_MANY_ATTEMPTS: 'Trop de tentatives. Contactez le support.',
};

function getErrorMessage(err) {
  const code = err?.response?.data?.error || err?.message || '';
  return ERROR_MESSAGES[code] || "Impossible d'initialiser le paiement. Veuillez reessayer.";
}

export default function PaiementInitiation() {
  const { dossierId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function initier() {
      try {
        const response = await paiementsApi.initierFineo(dossierId);
        const data = response?.data || response;
        if (!isMounted) return;
        setPaymentUrl(data.checkout_link);
        window.location.assign(data.checkout_link);
      } catch (fineoErr) {
        const fineoCode = fineoErr?.response?.data?.error || fineoErr?.message || '';
        const isBlocking = ['FORBIDDEN', 'DOSSIER_NOT_FOUND', 'PAIEMENT_DEJA_VALIDE', 'DOSSIER_STATUT_INVALIDE'].includes(fineoCode);

        if (isBlocking) {
          if (!isMounted) return;
          setStatus('error');
          setErrorMessage(getErrorMessage(fineoErr));
          return;
        }

        // Fallback NGSER
        try {
          const response = await paiementsApi.initierNgser({ dossier_id: dossierId });
          const data = response?.data || response;
          if (!isMounted) return;
          setPaymentUrl(data.payment_url);
          window.location.assign(data.payment_url);
        } catch (ngserErr) {
          if (!isMounted) return;
          setStatus('error');
          setErrorMessage(getErrorMessage(ngserErr));
        }
      }
    }

    initier();
    return () => { isMounted = false; };
  }, [dossierId]);

  return (
    <div className="mx-auto max-w-xl">
      <Card className="space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Paiement securise</h1>
          <p className="mt-2 text-sm text-subtext">
            Vous allez etre redirige vers la page de paiement securisee (carte bancaire ou Mobile Money).
          </p>
        </div>

        {status === 'loading' && (
          <div className="flex justify-center py-8">
            <Spinner size="large" />
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-lg border border-danger bg-danger-soft p-4 text-sm text-danger">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {paymentUrl && (
            <Button variant="primary" onClick={() => window.location.assign(paymentUrl)}>
              Continuer vers le paiement
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate('/apprenant/paiements')}>
            Retour
          </Button>
        </div>
      </Card>
    </div>
  );
}
