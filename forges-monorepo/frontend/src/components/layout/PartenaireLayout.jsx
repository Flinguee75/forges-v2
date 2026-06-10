import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Navbar from './Navbar';
import Footer from './Footer';
import Icon from '../ui/Icon';
import { PARTNER_LAYOUT_COPY, resolvePartnerLanguage } from '../../pages/partenaire/i18n';

/**
 * PartenaireLayout - Layout pour l'espace partenaire fournisseur
 * Routes : /partenaire/*
 * Référence : CLAUDE.md section 17.3
 */
export default function PartenaireLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const language = resolvePartnerLanguage(user?.langue_preferee);
  const copy = PARTNER_LAYOUT_COPY[language] || PARTNER_LAYOUT_COPY.FR;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigation = [
    { name: copy.dashboard, href: '/partenaire/dashboard', icon: 'chartBar' },
    { name: copy.formations, href: '/partenaire/formations', icon: 'clipboardList' },
    { name: copy.submitFormation, href: '/partenaire/soumettre-formation', icon: 'academicCap' },
    { name: copy.reversements, href: '/partenaire/reversements', icon: 'cash' },
    { name: 'Export CSV', href: '/partenaire/export-csv', icon: 'download' },
    { name: copy.profile, href: '/partenaire/profil', icon: 'user' },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);
  const activeItem = navigation.find((item) => isActive(item.href)) || navigation[0];

  return (
    <div className="min-h-screen bg-bg md:flex">
      <aside
        className={`${
          isSidebarOpen ? 'w-full md:w-64' : 'w-full md:w-20'
        } border-b border-border bg-white transition-all duration-300 md:shrink-0 md:border-b-0 md:border-r md:flex md:flex-col`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {isSidebarOpen ? (
            <Link to="/partenaire" className="text-xl font-bold text-[var(--color-partenaire)]">
              FORGES
            </Link>
          ) : (
            <span className="text-lg font-bold text-[var(--color-partenaire)]">F</span>
          )}

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-[var(--color-partenaire)] opacity-70 transition-opacity hover:opacity-100"
            aria-label={isSidebarOpen ? copy.closeSidebar : copy.openSidebar}
            type="button"
          >
            {isSidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="grid grid-cols-2 items-start gap-1 p-2 md:flex md:flex-1 md:flex-col md:gap-0 md:py-4 md:px-0">
          {navigation.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`relative flex w-full min-h-12 items-center gap-3 overflow-hidden rounded-lg px-4 py-3 transition-colors md:rounded-none ${
                isActive(item.href)
                  ? 'bg-[var(--color-partenaire)]/10 text-[var(--color-partenaire)] shadow-[inset_-4px_0_0_0_var(--color-partenaire)]'
                  : 'text-[var(--color-partenaire)] opacity-80 hover:bg-[var(--color-partenaire)]/5 hover:opacity-100'
              }`}
              aria-current={isActive(item.href) ? 'page' : undefined}
            >
              {item.icon && <Icon name={item.icon} size={20} className="flex-shrink-0" />}
              {isSidebarOpen && <span className="min-w-0 flex-1 truncate font-medium whitespace-nowrap">{item.name}</span>}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Navbar
          variant="private"
          title={activeItem.name}
          user={user}
          onLogout={handleLogout}
          showApiBadge={false}
        />

        <main className="min-w-0 flex-1 p-6">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
}
