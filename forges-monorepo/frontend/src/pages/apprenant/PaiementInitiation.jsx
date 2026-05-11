import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { paiementsApi } from '../../api/paiements.api';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Spinner from '../../components/feedback/Spinner';

const CANAUX = [
  { value: 'orange', label: 'Orange Money', prefix: '07 / 05' },
  { value: 'mtn', label: 'MTN Money', prefix: '07 / 05' },
  { value: 'wave', label: 'Wave', prefix: '00' },
  { value: 'moov', label: 'Moov Money', prefix: '01' },
];

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

  const [canal, setCanal] = useState('orange');
  const [telephone, setTelephone] = useState('');
  const [step, setStep] = useState('form'); // 'form' | 'redirecting' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setStep('redirecting');

    // Ouvrir le nouvel onglet immediatement (dans le handler sync) pour eviter le blocage popup
    const newTab = window.open('', '_blank', 'noopener,noreferrer');

    try {
      const response = await paiementsApi.initierFineo(dossierId, telephone.trim(), canal);
      const data = response?.data || response;
      newTab.location.href = data.checkout_link;
      setStep('form');
    } catch (fineoErr) {
      const fineoCode = fineoErr?.response?.data?.error || fineoErr?.message || '';
      const isBlocking = ['FORBIDDEN', 'DOSSIER_NOT_FOUND', 'PAIEMENT_DEJA_VALIDE', 'DOSSIER_STATUT_INVALIDE'].includes(fineoCode);

      if (isBlocking) {
        newTab.close();
        setStep('error');
        setErrorMessage(getErrorMessage(fineoErr));
        return;
      }

      // Fallback NGSER
      try {
        const response = await paiementsApi.initierNgser({ dossier_id: dossierId });
        const data = response?.data || response;
        newTab.location.href = data.payment_url;
        setStep('form');
      } catch (ngserErr) {
        newTab.close();
        setStep('error');
        setErrorMessage(getErrorMessage(ngserErr));
      }
    }
  }

  const canalInfo = CANAUX.find((c) => c.value === canal);

  return (
    <div className="mx-auto max-w-xl">
      <Card className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Paiement Mobile Money</h1>
          <p className="mt-2 text-sm text-subtext">
            Renseignez votre operateur et votre numero. Vous serez redirige vers la page de confirmation securisee.
          </p>
        </div>

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-text" htmlFor="canal">
                Operateur
              </label>
              <select
                id="canal"
                data-testid="select-canal"
                value={canal}
                onChange={(e) => setCanal(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-text focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                {CANAUX.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text" htmlFor="telephone">
                Numero Mobile Money
                {canalInfo && (
                  <span className="ml-2 text-xs text-subtext">(commence par {canalInfo.prefix})</span>
                )}
              </label>
              <input
                id="telephone"
                data-testid="input-telephone"
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="Ex : 0701234567"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-text placeholder:text-subtext focus:outline-none focus:ring-2 focus:ring-primary"
                required
                minLength={8}
                maxLength={15}
              />
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button type="submit" variant="primary" data-testid="btn-payer" className="flex-1">
                Continuer vers le paiement
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/apprenant/paiements')}>
                Annuler
              </Button>
            </div>
          </form>
        )}

        {step === 'redirecting' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Spinner size="large" />
            <p className="text-sm text-subtext">Redirection en cours...</p>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-danger bg-danger-soft p-4 text-sm text-danger">
              {errorMessage}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="primary" onClick={() => setStep('form')}>
                Reessayer
              </Button>
              <Button variant="outline" onClick={() => navigate('/apprenant/paiements')}>
                Retour aux paiements
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
