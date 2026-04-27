import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import { useApi } from '../../hooks/useApi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/feedback/EmptyState';
import Input from '../../components/ui/Input';

/**
 * ResetPasswordConfirmPage - Confirmation de réinitialisation de mot de passe
 */
export default function ResetPasswordConfirmPage() {
  const { token } = useParams();
  const { execute, isLoading, error } = useApi();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [completed, setCompleted] = useState(false);
  const [localError, setLocalError] = useState('');

  if (!token) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center py-8 px-4">
        <div className="w-full max-w-md">
          <Card>
            <EmptyState
              type="error"
              title="Lien invalide"
              message="Le lien de réinitialisation est invalide ou manquant."
              action={(
                <Link to="/reset-password">
                  <Button variant="primary">
                    Demander un nouveau lien
                  </Button>
                </Link>
              )}
            />
          </Card>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError('Les mots de passe ne correspondent pas.');
      return;
    }

    await execute(() => authApi.resetPassword(token, password), {
      showErrorToast: false,
      onSuccess: () => setCompleted(true),
    });
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-md">
        <nav className="mb-6 text-center text-sm">
          <Link to="/" className="text-secondary hover:text-primary">
            Accueil
          </Link>
          <span className="mx-2 text-subtext">/</span>
          <Link to="/login" className="text-secondary hover:text-primary">
            Connexion
          </Link>
          <span className="mx-2 text-subtext">/</span>
          <span className="text-text">Nouveau mot de passe</span>
        </nav>

        <Card>
          {completed ? (
            <div className="space-y-5 py-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft">
                <svg
                  className="h-8 w-8 text-success"
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

              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-primary">
                  Mot de passe réinitialisé
                </h1>
                <p className="text-subtext">
                  Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter.
                </p>
              </div>

              <Link to="/login">
                <Button variant="primary" fullWidth>
                  Aller à la connexion
                </Button>
              </Link>
            </div>
          ) : (
            <form className="space-y-6 py-8" onSubmit={handleSubmit}>
              <div className="space-y-3 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary-soft">
                  <svg
                    className="h-8 w-8 text-secondary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a4 4 0 00-4-4h-1V7a4 4 0 10-8 0v4H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                    />
                  </svg>
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-primary">
                    Définir un nouveau mot de passe
                  </h1>
                  <p className="text-subtext">
                    Choisissez un nouveau mot de passe pour finaliser la réinitialisation.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  type="password"
                  label="Nouveau mot de passe"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <Input
                  type="password"
                  label="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>

              {(localError || error) ? (
                <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                  {localError || error}
                </div>
              ) : null}

              <Button type="submit" variant="primary" loading={isLoading} fullWidth>
                Réinitialiser le mot de passe
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
