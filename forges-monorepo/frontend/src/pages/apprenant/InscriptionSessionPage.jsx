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
  const [abonnementActif, setAbonnementActif] = useState(null);
  const [loadingAbonnement, setLoadingAbonnement] = useState(true);

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

  useEffect(() => {
    apprenantApi.getMonAbonnementRetail()
      .then((data) => setAbonnementActif(data?.statut === 'ACTIF' ? data : null))
      .catch(() => setAbonnementActif(null))
      .finally(() => setLoadingAbonnement(false));
  }, []);

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
      onSuccess: (data) => {
        const dossier = data?.data || data;
        navigate('/apprenant/dossiers', {
          state: {
            dossierCree: {
              dossierId: dossier?.id,
              formationTitre: formation?.intitule || formation?.titre,
              montant: dossier?.montant_total,
              delaiPaiement: '72 heures'
            }
          },
        });
      },
      onError: (err) => {
        const code = err?.message || '';
        if (code.includes('ABONNEMENT_REQUIS')) {
          setFormError('Vous devez avoir un abonnement actif pour utiliser cette option.');
        } else if (code.includes('FORMATION_LIMIT_REACHED')) {
          setFormError('Vous avez atteint la limite de 3 formations simultanées avec votre abonnement.');
        } else if (code.includes('ALREADY_ENROLLED')) {
          setFormError('Vous êtes déjà inscrit à cette formation.');
        } else {
          setFormError(code || 'Une erreur est survenue lors de l\'inscription.');
        }
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
            {Math.round(Number(formation.tarif || 0) / 100).toLocaleString('fr-FR')} FCFA
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
                <div className="font-medium text-text">Paiement apprenant</div>
                <div className="text-sm text-subtext">Créer le dossier puis payer les frais d'inscription</div>
              </div>
            </label>

            <label className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${abonnementActif ? 'cursor-pointer hover:border-secondary' : 'cursor-not-allowed opacity-50'}`}>
              <input
                type="radio"
                name="source_financement"
                value="ABONNEMENT"
                checked={sourceFinancement === 'ABONNEMENT'}
                onChange={(e) => setSourceFinancement(e.target.value)}
                disabled={!abonnementActif || loadingAbonnement}
              />
              <div>
                <div className="font-medium text-text">Mon abonnement</div>
                {abonnementActif
                  ? <div className="text-sm text-subtext">Abonnement {abonnementActif.offre} actif</div>
                  : <div className="text-sm text-danger">Aucun abonnement actif — <button type="button" className="underline" onClick={() => navigate('/apprenant/abonnement/souscrire')}>Souscrire</button></div>
                }
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

        {/* Avertissement engagement paiement (RM-140, RM-07) */}
        {(sourceFinancement === 'RETAIL' || sourceFinancement === 'DIRECT') && (
          <div className="rounded-lg border border-warning bg-warning/10 p-4 text-sm text-warning" data-testid="engagement-paiement-warning">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-semibold">Engagement de paiement</p>
                <p className="mt-1">
                  En validant cette inscription, vous vous engagez à effectuer le paiement dans les <strong>72 heures</strong>.
                  Passé ce délai, votre dossier sera automatiquement annulé (RM-07).
                </p>
              </div>
            </div>
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
