import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formationsApi } from '../../api/formations.api';
import apprenantApi from '../../api/espace-apprenant.api';
import { useApi } from '../../hooks/useApi';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';

/**
 * InscriptionSessionPage - Page d'inscription à une session avec voucher
 * Permet à un apprenant de s'inscrire à une session en utilisant un code voucher
 */
export default function InscriptionSessionPage() {
  const { formationId } = useParams();
  const navigate = useNavigate();

  const [formation, setFormation] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [apporteurCode, setApporteurCode] = useState('');
  const [sourceFinancement, setSourceFinancement] = useState('RETAIL');
  const [formError, setFormError] = useState('');

  const { execute: executeFormation, isLoading: loadingFormation } = useApi();
  const { execute: executeSessions, isLoading: loadingSessions } = useApi();
  const { execute: executeInscription, isLoading: isSubmitting } = useApi();

  useEffect(() => {
    const loadData = async () => {
      await executeFormation(() => formationsApi.getFormationDetail(formationId), {
        onSuccess: (data) => setFormation(data?.data || data),
      });

      await executeSessions(() => formationsApi.getSessionsOuvertes(formationId), {
        onSuccess: (data) => {
          const sessionsList = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
          setSessions(sessionsList);
          if (sessionsList.length === 1) {
            setSelectedSessionId(sessionsList[0].id);
          }
        },
      });
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formationId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setFormError('');
    if (!selectedSessionId) {
      setFormError('Veuillez sélectionner une session.');
      return;
    }

    const payload = {
      source_financement: sourceFinancement,
    };

    if (sourceFinancement === 'VOUCHER' && voucherCode) {
      payload.voucher_code = voucherCode;
    }

    if (sourceFinancement === 'RETAIL' && apporteurCode.trim()) {
      payload.code_apporteur = apporteurCode.trim();
    }

    await executeInscription(() => apprenantApi.inscrireSession(selectedSessionId, payload), {
      onSuccess: () => {
        navigate('/apprenant/dossiers', {
          state: { message: 'Inscription réussie ! Votre dossier a été créé.' },
        });
      },
      onError: (err) => {
        setFormError(err?.message || 'Une erreur est survenue lors de l\'inscription.');
      },
    });
  };

  if (loadingFormation || loadingSessions) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="large" />
      </div>
    );
  }

  if (!formation || sessions.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          type="empty"
          title="Aucune session disponible"
          message="Il n'y a pas de session ouverte pour cette formation."
          action={
            <Button onClick={() => navigate('/apprenant/catalogue')}>
              Retour au catalogue
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/apprenant/catalogue')}
          className="mb-3 text-sm text-primary hover:underline"
        >
          &larr; Retour au catalogue
        </button>
        <h1 className="text-3xl font-bold text-text mb-2">
          Inscription à une session
        </h1>
        <p className="text-subtext">
          {formation.titre || formation.intitule}
        </p>
        {formation.tarif && (
          <p className="mt-1 text-sm font-semibold text-primary">
            {Math.round(Number(formation.tarif) / 100).toLocaleString('fr-FR')} FCFA
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sélection de la session */}
        <Card title="Choisissez une session">
          <div className="space-y-3">
            {sessions.map((session) => (
              <label
                key={session.id}
                className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedSessionId === session.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-secondary'
                }`}
              >
                <input
                  type="radio"
                  name="session"
                  value={session.id}
                  checked={selectedSessionId === session.id}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="mr-3"
                  data-testid={`session-option-${session.id}`}
                />
                <div className="inline-block">
                  <div className="font-semibold text-text">
                    Session du {formatDate(session.date_debut)}
                  </div>
                  <div className="text-sm text-subtext mt-1">
                    Inscriptions: {formatDate(session.date_ouverture)} - {formatDate(session.date_cloture)}
                  </div>
                  <div className="text-sm text-subtext">
                    Formation: {formatDate(session.date_debut)} - {formatDate(session.date_fin)}
                  </div>
                  {session.lieu && (
                    <div className="text-sm text-subtext">
                      Lieu: {session.lieu}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </Card>

        {/* Mode de financement */}
        <Card title="Mode de financement">
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:border-secondary transition-colors">
              <input
                type="radio"
                name="source_financement"
                value="VOUCHER"
                checked={sourceFinancement === 'VOUCHER'}
                onChange={(e) => setSourceFinancement(e.target.value)}
                data-testid="funding-voucher"
              />
              <div>
                <div className="font-medium text-text">Code Voucher</div>
                <div className="text-sm text-subtext">Utiliser un code voucher fourni par votre organisation</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:border-secondary transition-colors">
              <input
                type="radio"
                name="source_financement"
                value="RETAIL"
                checked={sourceFinancement === 'RETAIL'}
                onChange={(e) => setSourceFinancement(e.target.value)}
              />
              <div>
                <div className="font-medium text-text">Paiement direct</div>
                <div className="text-sm text-subtext">Payer directement les frais d'inscription</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:border-secondary transition-colors">
              <input
                type="radio"
                name="source_financement"
                value="ABONNEMENT"
                checked={sourceFinancement === 'ABONNEMENT'}
                onChange={(e) => setSourceFinancement(e.target.value)}
              />
              <div>
                <div className="font-medium text-text">Mon abonnement</div>
                <div className="text-sm text-subtext">Utiliser mon abonnement actif</div>
              </div>
            </label>
          </div>

          {sourceFinancement === 'VOUCHER' && (
            <div className="mt-4">
              <Input
                label="Code Voucher"
                placeholder="Entrez votre code voucher"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                required
                helperText="Le code voucher vous est fourni par votre organisation (ex: PEJEDEC)"
                data-testid="voucher-code-input"
              />
            </div>
          )}

          {sourceFinancement === 'RETAIL' && (
            <div className="mt-4">
              <Input
                label="Code apporteur"
                placeholder="Entrez un code apporteur si vous en avez un"
                value={apporteurCode}
                onChange={(e) => setApporteurCode(e.target.value)}
                helperText="Optionnel. Le code apporteur ne peut pas être cumulé avec un voucher."
                data-testid="apporteur-code-input"
              />
            </div>
          )}
        </Card>

        {formError && (
          <div className="rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger" data-testid="inscription-error">
            {formError}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/apprenant/catalogue')}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !selectedSessionId || (sourceFinancement === 'VOUCHER' && !voucherCode)}
            data-testid="submit-inscription"
          >
            {isSubmitting ? 'Inscription en cours...' : 'Valider l\'inscription'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
