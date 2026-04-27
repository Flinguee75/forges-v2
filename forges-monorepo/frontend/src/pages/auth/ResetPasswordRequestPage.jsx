import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import { useApi } from '../../hooks/useApi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';

/**
 * ResetPasswordRequestPage - Demande de réinitialisation de mot de passe
 */
export default function ResetPasswordRequestPage() {
  const { execute, isLoading, error } = useApi();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    await execute(() => authApi.requestPasswordReset(email), {
      showErrorToast: false,
      onSuccess: () => setSubmitted(true),
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
          <span className="text-text">Mot de passe oublié</span>
        </nav>

        <Card>
          {submitted ? (
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
                  Vérifiez votre boîte mail
                </h1>
                <p className="text-subtext">
                  Si un compte existe avec cette adresse, un lien de réinitialisation a été envoyé.
                </p>
              </div>

              <Link to="/login">
                <Button variant="primary" fullWidth>
                  Retour à la connexion
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
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                    />
                  </svg>
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-primary">
                    Mot de passe oublié ?
                  </h1>
                  <p className="text-subtext">
                    Saisissez votre adresse email. Si un compte actif existe, un lien de réinitialisation vous sera envoyé.
                  </p>
                </div>
              </div>

              <Input
                type="email"
                label="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="votre@email.com"
                required
              />

              {error ? (
                <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                  {error}
                </div>
              ) : null}

              <Button type="submit" variant="primary" loading={isLoading} fullWidth>
                Envoyer le lien
              </Button>

              <div className="text-center text-sm text-subtext">
                <Link to="/login" className="text-secondary hover:text-primary font-medium">
                  Retour à la connexion
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
