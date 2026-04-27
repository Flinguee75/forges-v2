import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import { useApi } from '../../hooks/useApi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';

/**
 * ConfirmEmailPage - Page de confirmation d'email
 * Référence: CLAUDE.md section 17 - Étape F-5
 * Règle métier: RM-30 (lien expire après 24h)
 */
export default function ConfirmEmailPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { execute, isLoading, error } = useApi();

  const [confirmed, setConfirmed] = useState(false);

  const confirmEmail = async () => {
    await execute(() => authApi.confirmEmail(token), {
      onSuccess: () => {
        setConfirmed(true);
        // Rediriger vers login après 3 secondes
        setTimeout(() => {
          navigate('/login', {
            state: {
              message: 'Votre email a été confirmé avec succès. Vous pouvez maintenant vous connecter.',
            },
          });
        }, 3000);
      },
    });
  };

  useEffect(() => {
    if (token) {
      confirmEmail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Card className="max-w-md">
          <div className="text-center py-8">
            <Spinner size="large" />
            <p className="mt-4 text-subtext">
              Confirmation de votre email en cours...
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center py-8 px-4">
      <div className="max-w-md w-full">
        <Card>
          {confirmed ? (
            <div className="text-center py-8">
              {/* Success Icon */}
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 rounded-full bg-success-soft flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-success"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>

              {/* Message */}
              <h1 className="text-2xl font-bold text-primary mb-3">
                Email confirmé !
              </h1>
              <p className="text-subtext mb-6">
                Votre adresse email a été confirmée avec succès. Vous pouvez
                maintenant vous connecter à votre compte FORGES.
              </p>

              {/* CTA */}
              <Link to="/login">
                <Button variant="primary" size="large" fullWidth>
                  Se connecter
                </Button>
              </Link>

              <p className="mt-4 text-sm text-subtext">
                Redirection automatique dans 3 secondes...
              </p>
            </div>
          ) : error ? (
            <EmptyState
              type="error"
              title="Erreur de confirmation"
              message={
                error.includes('expiré') || error.includes('410')
                  ? 'Ce lien de confirmation a expiré (>24h). Veuillez vous réinscrire ou contacter le support.'
                  : error
              }
              action={
                <div className="space-y-3">
                  <Link to="/register">
                    <Button variant="primary">S'inscrire à nouveau</Button>
                  </Link>
                  <Link to="/">
                    <Button variant="outline">Retour à l'accueil</Button>
                  </Link>
                </div>
              }
            />
          ) : (
            <EmptyState
              type="empty"
              title="Token manquant"
              message="Aucun token de confirmation fourni."
              action={
                <Link to="/">
                  <Button variant="primary">Retour à l'accueil</Button>
                </Link>
              }
            />
          )}
        </Card>
      </div>
    </div>
  );
}
