import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';
import logoForges from '../../assets/logo_forges.png';
import logoForgesWebp from '../../assets/logo_forges.webp';

const PRIVATE_COPY = {
  FR: { defaultUser: 'Utilisateur', today: "Aujourd'hui", logout: 'Déconnexion', locale: 'fr-FR',
    roles: { ADMIN: 'Administrateur', SUPERVISEUR: 'Superviseur', RESPONSABLE: 'Responsable', AGENT: 'Agent', APPRENANT: 'Apprenant', ETUDIANT: 'Apprenant', ORGANISATION: 'Organisation', PARTENAIRE: 'Partenaire', APPORTEUR: 'Apporteur', GESTIONNAIRE: 'Gestionnaire' } },
  EN: { defaultUser: 'User', today: 'Today', logout: 'Log out', locale: 'en-US',
    roles: { ADMIN: 'Administrator', SUPERVISEUR: 'Supervisor', RESPONSABLE: 'Manager', AGENT: 'Agent', APPRENANT: 'Learner', ETUDIANT: 'Learner', ORGANISATION: 'Organisation', PARTENAIRE: 'Partner', APPORTEUR: 'Referrer', GESTIONNAIRE: 'Manager' } },
  ES: { defaultUser: 'Usuario', today: 'Hoy', logout: 'Salir', locale: 'es-ES',
    roles: { ADMIN: 'Administrador', SUPERVISEUR: 'Supervisor', RESPONSABLE: 'Responsable', AGENT: 'Agente', APPRENANT: 'Aprendiz', ETUDIANT: 'Aprendiz', ORGANISATION: 'Organizacion', PARTENAIRE: 'Socio', APPORTEUR: 'Referente', GESTIONNAIRE: 'Gestor' } },
  PT: { defaultUser: 'Utilizador', today: 'Hoje', logout: 'Sair', locale: 'pt-PT',
    roles: { ADMIN: 'Administrador', SUPERVISEUR: 'Supervisor', RESPONSABLE: 'Responsavel', AGENT: 'Agente', APPRENANT: 'Aprendente', ETUDIANT: 'Aprendente', ORGANISATION: 'Organizacao', PARTENAIRE: 'Parceiro', APPORTEUR: 'Angariador', GESTIONNAIRE: 'Gestor' } },
};

function getDisplayName(user, fallback) {
  if (!user) return fallback;
  if (user.raison_sociale) return user.raison_sociale;
  if (user.prenoms && user.nom) return `${user.prenoms} ${user.nom}`;
  if (user.prenom && user.nom) return `${user.prenom} ${user.nom}`;
  return user.email || user.role || fallback;
}

function getInitials(user) {
  if (user?.raison_sociale) return user.raison_sociale.slice(0, 2).toUpperCase();
  if (user?.prenoms && user?.nom) return `${user.prenoms[0]}${user.nom[0]}`.toUpperCase();
  if (user?.prenom && user?.nom) return `${user.prenom[0]}${user.nom[0]}`.toUpperCase();
  if (user?.email) return user.email.slice(0, 2).toUpperCase();
  return 'U';
}

function getHealthUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  return `${apiUrl.replace(/\/api\/?$/, '')}/health`;
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
  const copy = PRIVATE_COPY[user?.langue_preferee] || PRIVATE_COPY.FR;
  const displayName = getDisplayName(user, copy.defaultUser);
  const initials = getInitials(user);
  const roleLabel = copy.roles[user?.role] || user?.role || copy.defaultUser;
  const [now, setNow] = useState(() => new Date());
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [isCheckingBackend, setIsCheckingBackend] = useState(true);

  useEffect(() => {
    if (isPublic || !showSystemStatus) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isPublic, showSystemStatus]);

  useEffect(() => {
    if (isPublic || !showSystemStatus) return;
    let active = true;
    const check = async () => {
      setIsCheckingBackend(true);
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      try {
        const res = await fetch(getHealthUrl(), { signal: ctrl.signal });
        if (active) setIsBackendOnline(res.ok);
      } catch {
        if (active) setIsBackendOnline(false);
      } finally {
        clearTimeout(t);
        if (active) setIsCheckingBackend(false);
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => { active = false; clearInterval(interval); };
  }, [isPublic, showSystemStatus]);

  const statusDot = isCheckingBackend ? 'text-warning' : isBackendOnline ? 'text-success' : 'text-danger';
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const dateStr = new Date().toLocaleDateString(copy.locale, { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <header className="border-b border-border bg-white">
      <div className="flex min-h-14 items-center justify-between gap-4 px-4 sm:px-6">

        {/* Gauche */}
        <div className="flex min-w-0 items-center gap-3">
          {isPublic ? (
            <>
              <Link to="/" aria-label="Accueil FORGES">
                <picture>
                  <source srcSet={logoForgesWebp} type="image/webp" />
                  <img src={logoForges} alt="FORGES" className="h-12 w-12 rounded-full object-cover" />
                </picture>
              </Link>
              <nav className="hidden items-center gap-6 md:flex">
                <Link to="/" className="text-sm font-medium text-text hover:text-primary transition-colors">Accueil</Link>
              </nav>
            </>
          ) : (
            <>
              {onMenuToggle && (
                <button type="button" onClick={onMenuToggle}
                  className="shrink-0 rounded-md p-1.5 text-subtext hover:bg-border/50 hover:text-text transition-colors md:hidden"
                  aria-label="Menu">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              <picture>
                <source srcSet={logoForgesWebp} type="image/webp" />
                <img src={logoForges} alt="FORGES" className="h-7 w-auto shrink-0" />
              </picture>
              {title && (
                <div className="min-w-0 border-l border-border pl-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-subtext">{roleLabel}</p>
                  <h1 className="truncate text-sm font-semibold text-text">{title}</h1>
                </div>
              )}
              {showApiBadge && <StatusBadge />}
            </>
          )}
        </div>

        {/* Droite */}
        {isPublic ? (
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-lg border border-border px-3.5 py-1.5 text-sm font-medium text-text hover:border-primary hover:text-primary transition-colors">
              Connexion
            </Link>
            <Link to="/register" className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
              Inscription
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2">

            {/* Date + horloge */}
            {showSystemStatus && (
              <div className="hidden items-center gap-1.5 rounded-lg border border-border bg-[var(--color-bg)] px-3 py-1.5 lg:flex">
                <span className={`text-[10px] ${statusDot}`}>●</span>
                <span className="font-mono text-xs text-text">{timeStr}</span>
                <span className="text-border">·</span>
                <span className="text-xs text-subtext capitalize">{dateStr}</span>
              </div>
            )}

            {/* Séparateur */}
            <div className="mx-1 hidden h-5 w-px bg-border lg:block" />

            {/* Avatar + nom */}
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {initials}
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-xs font-semibold text-text leading-tight truncate max-w-[120px]">{displayName}</p>
                <p className="text-[10px] text-subtext">{roleLabel}</p>
              </div>
            </div>

            {/* Déconnexion */}
            <Button variant="outline" size="small" type="button" onClick={onLogout} className="ml-1">
              {copy.logout}
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
    langue_preferee: PropTypes.string,
  }),
  onLogout: PropTypes.func,
  onMenuToggle: PropTypes.func,
  showApiBadge: PropTypes.bool,
  showSystemStatus: PropTypes.bool,
};
