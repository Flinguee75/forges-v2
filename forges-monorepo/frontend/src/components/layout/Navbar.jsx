import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';
import logoForges from '../../assets/logo_forges.png';
import logoForgesWebp from '../../assets/logo_forges.webp';

const PRIVATE_COPY = {
  FR: {
    defaultUser: 'Utilisateur',
    today: "Aujourd'hui",
    logout: 'Deconnexion',
    roles: {
      ADMIN: 'Administrateur',
      SUPERVISEUR: 'Superviseur',
      RESPONSABLE: 'Responsable',
      AGENT: 'Agent',
      APPRENANT: 'Apprenant',
      ETUDIANT: 'Apprenant',
      ORGANISATION: 'Organisation',
      PARTENAIRE: 'Partenaire',
      APPORTEUR: 'Apporteur',
      GESTIONNAIRE: 'Gestionnaire',
    },
    locale: 'fr-FR',
  },
  EN: {
    defaultUser: 'User',
    today: 'Today',
    logout: 'Log out',
    roles: {
      ADMIN: 'Administrator',
      SUPERVISEUR: 'Supervisor',
      RESPONSABLE: 'Manager',
      AGENT: 'Agent',
      APPRENANT: 'Learner',
      ETUDIANT: 'Learner',
      ORGANISATION: 'Organisation',
      PARTENAIRE: 'Partner',
      APPORTEUR: 'Referrer',
      GESTIONNAIRE: 'Manager',
    },
    locale: 'en-US',
  },
  ES: {
    defaultUser: 'Usuario',
    today: 'Hoy',
    logout: 'Cerrar sesion',
    roles: {
      ADMIN: 'Administrador',
      SUPERVISEUR: 'Supervisor',
      RESPONSABLE: 'Responsable',
      AGENT: 'Agente',
      APPRENANT: 'Aprendiz',
      ETUDIANT: 'Aprendiz',
      ORGANISATION: 'Organizacion',
      PARTENAIRE: 'Socio',
      APPORTEUR: 'Referente',
      GESTIONNAIRE: 'Gestor',
    },
    locale: 'es-ES',
  },
  PT: {
    defaultUser: 'Utilizador',
    today: 'Hoje',
    logout: 'Terminar sessao',
    roles: {
      ADMIN: 'Administrador',
      SUPERVISEUR: 'Supervisor',
      RESPONSABLE: 'Responsavel',
      AGENT: 'Agente',
      APPRENANT: 'Aprendente',
      ETUDIANT: 'Aprendente',
      ORGANISATION: 'Organizacao',
      PARTENAIRE: 'Parceiro',
      APPORTEUR: 'Angariador',
      GESTIONNAIRE: 'Gestor',
    },
    locale: 'pt-PT',
  },
};

function getPrivateCopy(language) {
  return PRIVATE_COPY[language] || PRIVATE_COPY.FR;
}

function getDisplayName(user, fallbackLabel) {
  if (!user) return fallbackLabel;
  if (user.raison_sociale) return user.raison_sociale;
  if (user.prenoms && user.nom) return `${user.prenoms} ${user.nom}`;
  if (user.prenom && user.nom) return `${user.prenom} ${user.nom}`;
  return user.email || user.role || fallbackLabel;
}

function getRoleBadgeClass(role) {
  switch (role) {
    case 'ADMIN':
      return 'bg-danger text-white';
    case 'SUPERVISEUR':
      return 'bg-warning text-white';
    case 'RESPONSABLE':
      return 'bg-secondary text-white';
    case 'AGENT':
      return 'bg-success text-white';
    case 'APPRENANT':
    case 'ETUDIANT':
      return 'bg-primary text-white';
    case 'ORGANISATION':
      return 'bg-primary text-white';
    default:
      return 'bg-border text-text';
  }
}

function getRoleLabel(role, roles, fallbackLabel) {
  return roles[role] || role || fallbackLabel;
}

function formatTimeParts(date) {
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function getHealthUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  const baseUrl = apiUrl.replace(/\/api\/?$/, '');
  return `${baseUrl || ''}/health`;
}

function getBackendStatusLabel(isOnline, isChecking) {
  if (isChecking) {
    return { tone: 'warning', symbol: '⟳' };
  }

  return isOnline
    ? { tone: 'success', symbol: '●' }
    : { tone: 'danger', symbol: '●' };
}

export default function Navbar({
  variant = 'public',
  title,
  user,
  onLogout,
  onMenuToggle,
  showApiBadge = true,
  showSystemStatus = true,
}) {
  const isPublic = variant === 'public';
  const privateCopy = getPrivateCopy(user?.langue_preferee);
  const displayName = getDisplayName(user, privateCopy.defaultUser);
  const roleLabel = getRoleLabel(user?.role, privateCopy.roles, privateCopy.defaultUser);
  const [now, setNow] = useState(() => new Date());
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [isCheckingBackend, setIsCheckingBackend] = useState(true);

  useEffect(() => {
    if (isPublic || !showSystemStatus) return undefined;

    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isPublic, showSystemStatus]);

  useEffect(() => {
    if (isPublic || !showSystemStatus) return undefined;

    let active = true;

    const checkBackend = async () => {
      setIsCheckingBackend(true);
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(getHealthUrl(), {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Health check failed with status ${response.status}`);
        }

        if (active) setIsBackendOnline(true);
      } catch {
        if (active) setIsBackendOnline(false);
      } finally {
        window.clearTimeout(timeout);
        if (active) setIsCheckingBackend(false);
      }
    };

    checkBackend();
    const interval = window.setInterval(checkBackend, 10000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isPublic, showSystemStatus]);

  const backendStatus = getBackendStatusLabel(isBackendOnline, isCheckingBackend);

  return (
    <header className="border-b border-border bg-white shadow-sm">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          {isPublic ? (
            <>
              <Link
                to="/"
                className="flex items-center rounded-full transition-transform duration-200 hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label="Accueil FORGES"
              >
                <picture>
                  <source srcSet={logoForgesWebp} type="image/webp" />
                  <img src={logoForges} alt="FORGES" className="h-14 w-14 rounded-full object-cover" />
                </picture>
              </Link>
              <nav className="hidden items-center gap-6 md:flex">
              <Link
                to="/"
                className="rounded-md font-medium text-text transition-colors duration-200 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Accueil
              </Link>
              </nav>
            </>
          ) : (
            <div className="flex items-center gap-3 min-w-0">
              {onMenuToggle && (
                <button
                  type="button"
                  onClick={onMenuToggle}
                  className="shrink-0 rounded-md p-1.5 text-primary/70 transition-colors hover:bg-primary/10 hover:text-primary md:hidden"
                  aria-label="Ouvrir le menu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              <picture>
                <source srcSet={logoForgesWebp} type="image/webp" />
                <img src={logoForges} alt="FORGES" className="h-8 w-auto shrink-0" />
              </picture>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold uppercase tracking-[0.24em] text-primary/55">
                  {roleLabel}
                </p>
                <h1 className="truncate text-lg font-semibold text-text sm:text-xl">
                  {title}
                </h1>
                {showApiBadge && (
                  <div className="mt-2">
                    <StatusBadge />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {isPublic ? (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-primary/25 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:bg-[#EAF2F8] hover:text-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Connexion
            </Link>
            <Link
              to="/register"
              className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-transparent bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0F2F43] hover:text-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Inscription
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="truncate text-sm font-semibold text-text">
                {displayName}
              </p>
            </div>

            {user?.role ? (
              <span className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex ${getRoleBadgeClass(user.role)}`}>
                {roleLabel}
              </span>
            ) : null}

            {showSystemStatus && (
              <>
                <div className="hidden text-right lg:block">
                  <p className="text-xs uppercase tracking-[0.24em] text-primary/55">
                    {privateCopy.today}
                  </p>
                  <p className="text-sm text-subtext">
                    {new Date().toLocaleDateString(privateCopy.locale, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-border bg-bg px-3 py-1 text-xs font-medium text-subtext">
                  <span className={backendStatus.tone === 'success' ? 'text-success' : backendStatus.tone === 'warning' ? 'text-warning' : 'text-danger'} aria-hidden="true">
                    {backendStatus.symbol}
                  </span>
                  <span className="font-mono text-text">{formatTimeParts(now)}</span>
                </div>
              </>
            )}

            <Button variant="outline" type="button" onClick={onLogout} className="shrink-0">
              {privateCopy.logout}
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

Navbar.propTypes = {
  variant: PropTypes.oneOf(['public', 'private']),
  title: PropTypes.string,
  user: PropTypes.shape({
    email: PropTypes.string,
    role: PropTypes.string,
    prenom: PropTypes.string,
    nom: PropTypes.string,
    prenoms: PropTypes.string,
    raison_sociale: PropTypes.string,
  }),
  onLogout: PropTypes.func,
  onMenuToggle: PropTypes.func,
  showApiBadge: PropTypes.bool,
  showSystemStatus: PropTypes.bool,
};
