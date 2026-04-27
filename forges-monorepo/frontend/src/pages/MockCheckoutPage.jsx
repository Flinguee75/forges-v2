import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

/**
 * MockCheckoutPage - Page de simulation de paiement (développement uniquement)
 * Route: /mock-checkout/:transactionId
 * Simule une plateforme de paiement externe
 */
export default function MockCheckoutPage() {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Auto-confirm après 2 secondes (simulation)
    const timer = setTimeout(() => {
      simulatePayment();
    }, 2000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const simulatePayment = async () => {
    setProcessing(true);

    // Simuler le délai de traitement
    await new Promise(resolve => setTimeout(resolve, 1500));

    // En production, le webhook serait appelé par le vrai agrégateur
    // Ici, on simule juste le succès
    setSuccess(true);
    setProcessing(false);

    // Rediriger après 2 secondes
    setTimeout(() => {
      window.close();
      // Si la fenêtre ne se ferme pas (popup bloquée), rediriger
      navigate('/apprenant/paiements');
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <Card className="max-w-md w-full">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-primary mb-4">
            Simulation de Paiement
          </h1>

          <div className="mb-6 p-4 bg-warning-soft border border-warning rounded-lg">
            <p className="text-sm text-warning">
              <strong>Mode développement</strong><br />
              Ceci est une simulation de plateforme de paiement
            </p>
          </div>

          <div className="mb-6 text-left">
            <div className="text-sm text-subtext mb-2">Transaction ID:</div>
            <div className="font-mono text-xs bg-bg p-2 rounded break-all">
              {transactionId}
            </div>
          </div>

          {processing && (
            <div className="mb-6">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
              <p className="mt-4 text-subtext">Traitement du paiement...</p>
            </div>
          )}

          {success && (
            <div className="mb-6">
              <div className="text-6xl mb-4">✓</div>
              <p className="text-success font-semibold text-lg">Paiement réussi!</p>
              <p className="text-sm text-subtext mt-2">
                Cette fenêtre va se fermer automatiquement...
              </p>
            </div>
          )}

          {!processing && !success && (
            <Button
              variant="primary"
              onClick={simulatePayment}
              className="w-full"
            >
              Simuler le paiement
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
