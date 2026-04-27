import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { authApi } from '../../api/auth.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const TEST_ACCOUNTS = [
  {
    role: 'ADMIN',
    label: 'Admin Principal',
    email: 'admin@forges.ci',
    password: 'Test@FORGES2026!',
  },
  {
    role: 'RESPONSABLE',
    label: 'Responsable',
    email: 'responsable@forges.ci',
    password: 'Test@FORGES2026!',
  },
  {
    role: 'APPRENANT',
    label: 'Apprenant',
    email: 'apprenant@forges.ci',
    password: 'Test@FORGES2026!',
  },
  {
    role: 'ORGANISATION',
    label: 'Organisation',
    email: 'org@forges.ci',
    password: 'Test@FORGES2026!',
  },
];

const PLATFORM_HIGHLIGHTS = [
  {
    title: 'Sessions centralisees',
    description: 'Retrouvez vos inscriptions, convocations et suivis au meme endroit.',
  },
  {
    title: 'Acces par profil',
    description: 'Chaque role dispose d\'un espace sobre, direct et adapte a ses taches.',
  },
  {
    title: 'Suivi continu',
    description: 'Consultez rapidement l\'etat des dossiers, paiements et validations.',
  },
];

/**
 * LoginPage - Page de connexion
 * TODO F-5: Améliorer le design et ajouter validation complète
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const { execute, isLoading, error } = useApi();
  const navigate = useNavigate();
  const isDevelopment = import.meta.env.DEV;

  const redirectAfterLogin = (role) => {
    switch (role) {
      case 'APPRENANT':
      case 'ETUDIANT':
        navigate('/apprenant/dashboard');
        break;
      case 'ORGANISATION':
        navigate('/organisation/dashboard');
        break;
      case 'PARTENAIRE':
        navigate('/partenaire/dashboard');
        break;
      case 'APPORTEUR':
        navigate('/apporteur/dashboard');
        break;
      case 'ADMIN':
      case 'SUPERVISEUR':
        navigate('/backoffice/dashboard');
        break;
      case 'AGENT':
        navigate('/backoffice/paiements');
        break;
      case 'RESPONSABLE':
        navigate('/backoffice/formations');
        break;
      default:
        navigate('/');
    }
  };

  const submitLogin = async (credentials) => {
    await execute(
      () => authApi.login(credentials),
      {
        onSuccess: (data) => {
          const session = data?.data ?? data;
          login(session.accessToken, session.refreshToken, session.user);
          redirectAfterLogin(session?.user?.role);
        },
        showSuccessToast: true,
        successMessage: 'Connexion réussie',
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitLogin({ email, password });
  };

  const handleQuickLogin = async (account) => {
    setEmail(account.email);
    setPassword(account.password);
    await submitLogin({
      email: account.email,
      password: account.password,
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,73,118,0.08),_transparent_32%),linear-gradient(180deg,_#f7f9fc_0%,_#eef2f6_100%)] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)] lg:grid-cols-2">
          <div className="flex border-b border-border/80 px-8 py-10 lg:min-h-[760px] lg:border-b-0 lg:border-r lg:px-12 lg:py-12">
            <div className="m-auto flex w-full max-w-md flex-col gap-8">
              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.42em] text-primary/65">
                  FORGES
                </p>
                <h1 className="text-4xl font-semibold tracking-tight text-primary sm:text-5xl">
                  Connexion
                </h1>
                <p className="max-w-md text-base leading-8 text-subtext sm:text-lg">
                  Connectez-vous a votre espace de formation pour retrouver vos
                  sessions, vos dossiers et le suivi de vos operations.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {PLATFORM_HIGHLIGHTS.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-primary/10 bg-primary/[0.035] px-5 py-4"
                  >
                    <p className="text-sm font-semibold text-primary">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-subtext">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex px-8 py-10 lg:min-h-[760px] lg:px-12 lg:py-12">
            <div className="m-auto w-full max-w-xl space-y-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-5">
                  <Input
                    type="email"
                    label="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="votre@email.com"
                    className="min-h-[56px] rounded-xl px-5"
                  />

                  <Input
                    type="password"
                    label="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="min-h-[56px] rounded-xl px-5"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-danger/20 bg-red-50 px-4 py-3 text-sm text-danger">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  loading={isLoading}
                  className="min-h-[58px] w-full justify-center rounded-xl text-base font-semibold"
                >
                  Se connecter
                </Button>
              </form>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <Link
                  to="/register"
                  className="flex min-h-[54px] items-center justify-center rounded-xl border border-border bg-white px-4 text-center font-medium text-primary transition-colors hover:border-primary/30 hover:bg-primary/[0.03]"
                >
                  Creer un compte
                </Link>
                <Link
                  to="/reset-password"
                  className="flex min-h-[54px] items-center justify-center rounded-xl border border-border bg-white px-4 text-center font-medium text-primary transition-colors hover:border-primary/30 hover:bg-primary/[0.03]"
                >
                  Mot de passe oublie
                </Link>
              </div>

              {isDevelopment ? (
                <div className="rounded-[28px] border border-border bg-slate-50/80 p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.34em] text-primary/60">
                        Tests locaux
                      </p>
                      <h2 className="text-2xl font-semibold tracking-tight text-primary">
                        Connexion rapide
                      </h2>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                      F4
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {TEST_ACCOUNTS.map((account) => (
                      <button
                        key={account.email}
                        type="button"
                        onClick={() => handleQuickLogin(account)}
                        disabled={isLoading}
                        className="flex min-h-[112px] flex-col justify-between rounded-2xl border border-border bg-white px-5 py-4 text-left transition-all duration-200 hover:border-primary/35 hover:bg-primary/[0.03] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm font-semibold tracking-[0.02em] text-primary">
                            {account.label || account.role}
                          </span>
                          <span className="text-xs font-medium text-subtext">
                            1 clic
                          </span>
                        </div>
                        <p className="text-sm leading-6 text-text">
                          {account.email}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
