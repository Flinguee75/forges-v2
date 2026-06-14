import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import Button from '../ui/Button';
import logoForges from '../../assets/logo_forges.png';
import logoForgesWebp from '../../assets/logo_forges.webp';

const ROLE_LABELS = {
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
};

const LOGOUT_LABELS = { FR: 'Déconnexion', EN: 'Log out', ES: 'Salir', PT: 'Sair' };

function getInitials(user) {
  if (user?.raison_sociale) return user.raison_sociale.slice(0, 2).toUpperCase();
  if (user?.prenoms && user?.nom) return `${user.prenoms[0]}${user.nom[0]}`.toUpperCase();
  if (user?.prenom && user?.nom) return `${user.prenom[0]}${user.nom[0]}`.toUpperCase();
  if (user?.email) return user.email.slice(0, 2).toUpperCase();
  return 'U';
}

function getDisplayName(user) {
  if (user?.raison_sociale) return user.raison_sociale;
  if (user?.prenoms && user?.nom) return `${user.prenoms} ${user.nom}`;
  if (user?.prenom && user?.nom) return `${user.prenom} ${user.nom}`;
  return user?.email || '';
}

export default function Navbar({
  variant = 'public',
  title,
  user,
  onLogout,
  onMenuToggle,
}) {
  const isPublic = variant === 'public';
  const initials = getInitials(user);
  const displayName = getDisplayName(user);
  const roleLabel = ROLE_LABELS[user?.role] || user?.role || '';
  const logoutLabel = LOGOUT_LABELS[user?.langue_preferee] || LOGOUT_LABELS.FR;

  return (
    <header className="border-b border-border bg-white shadow-sm">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6">

        {/* Gauche */}
        <div className="flex items-center gap-3 min-w-0">
          {!isPublic && onMenuToggle && (
            <button
              type="button"
              onClick={onMenuToggle}
              className="shrink-0 rounded-md p-1.5 text-primary/70 transition-colors hover:bg-primary/10 hover:text-primary md:hidden"
              aria-label="Menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          <Link to={isPublic ? '/' : '#'} className="shrink-0" aria-label="FORGES">
            <picture>
              <source srcSet={logoForgesWebp} type="image/webp" />
              <img src={logoForges} alt="FORGES" className={isPublic ? 'h-12 w-12 rounded-full' : 'h-8 w-auto'} />
            </picture>
          </Link>

          {!isPublic && title && (
            <div className="min-w-0 border-l border-border pl-3">
              <p className="truncate text-xs font-semibold uppercase tracking-widest text-primary/50">{roleLabel}</p>
              <h1 className="truncate text-base font-semibold text-text">{title}</h1>
            </div>
          )}

          {isPublic && (
            <nav className="hidden items-center gap-6 md:flex">
              <Link to="/" className="text-sm font-medium text-text hover:text-primary transition-colors">Accueil</Link>
            </nav>
          )}
        </div>

        {/* Droite */}
        {isPublic ? (
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:border-primary hover:text-primary transition-colors">
              Connexion
            </Link>
            <Link to="/register" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
              Inscription
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {/* Avatar + nom */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {initials}
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-text leading-tight truncate max-w-[140px]">{displayName}</p>
                <p className="text-xs text-subtext">{roleLabel}</p>
              </div>
            </div>

            {/* Séparateur */}
            <div className="h-6 w-px bg-border" />

            {/* Logout */}
            <Button variant="outline" size="small" type="button" onClick={onLogout}>
              {logoutLabel}
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
