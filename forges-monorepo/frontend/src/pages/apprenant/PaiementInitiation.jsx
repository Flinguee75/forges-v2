import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { paiementsApi } from '../../api/paiements.api';
import { usePaymentExpirationHours } from '../../hooks/usePaymentExpirationHours';
import { formatPaymentExpirationShort } from '../../utils/paymentDeadline';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Spinner from '../../components/feedback/Spinner';

function buildErrorMessages(hours) {
  return {
    FORBIDDEN: "Vous n'etes pas autorise a payer ce dossier.",
    DOSSIER_NOT_FOUND: 'Dossier introuvable.',
    DOSSIER_STATUT_INVALIDE: "Ce dossier ne peut pas etre paye dans son etat actuel.",
    PAIEMENT_DEJA_VALIDE: 'Ce dossier a deja ete paye.',
    PAYMENT_EXPIRED: `Le delai de paiement de ${formatPaymentExpirationShort(hours)} est depasse.`,
    TOO_MANY_ATTEMPTS: 'Trop de tentatives. Contactez le support.',
    MONTANT_FINEO_MINIMUM: 'Le montant restant est inferieur au minimum de paiement mobile. Contactez le support.',
  };
}

function getErrorMessage(err, hours) {
  const code = err?.response?.data?.error || err?.message || '';
  const messages = buildErrorMessages(hours);
  return messages[code] || "Impossible d'initialiser le paiement. Veuillez reessayer.";
}

export default function PaiementInitiation() {
  const { dossierId } = useParams();
  const navigate = useNavigate();
  const paymentExpirationHours = usePaymentExpirationHours();
  const [status, setStatus] = useState('loading');
  const [errorCode, setErrorCode] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const errorMessage = errorCode ? getErrorMessage({ response: { data: { error: errorCode } } }, paymentExpirationHours) : '';

  useEffect(() => {
    let isMounted = true;

    async function initier() {
      try {
        const response = await paiementsApi.initierFineo(dossierId);
        const data = response?.data || response;
        if (!isMounted) return;
        if (data.action === 'AUTO_CONFIRME_ZERO' || !data.checkout_link) {
          navigate(`/apprenant/paiements/callback?paiement_id=${data.paiement_id}`);
          return;
        }
        setPaymentUrl(data.checkout_link);
        window.location.assign(data.checkout_link);
      } catch (fineoErr) {
        const fineoCode = fineoErr?.response?.data?.error || fineoErr?.message || '';
        const isBlocking = ['FORBIDDEN', 'DOSSIER_NOT_FOUND', 'PAIEMENT_DEJA_VALIDE', 'DOSSIER_STATUT_INVALIDE', 'MONTANT_FINEO_MINIMUM'].includes(fineoCode);

        if (isBlocking) {
          if (!isMounted) return;
          setStatus('error');
          setErrorCode(fineoErr?.response?.data?.error || fineoErr?.message || '');
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
          setErrorCode(ngserErr?.response?.data?.error || ngserErr?.message || '');
        }
      }
    }

    initier();
    return () => { isMounted = false; };
  }, [dossierId, navigate]);

  return (
    <div className="mx-auto max-w-xl">
      <Card className="space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Paiement securise</h1>
          <p className="mt-2 text-sm text-subtext">
            Vous allez etre redirige vers la page de paiement securisee.
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
