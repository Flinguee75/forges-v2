import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Navbar from './Navbar';
import Footer from './Footer';
import Icon from '../ui/Icon';

/**
 * ApporteurLayout - Layout pour l'espace Apporteur d'Affaires
 * Couleur signature : #6C3483 (violet) — RM-141 à RM-148
 * Routes : /apporteur/*
 * Référence : CLAUDE.md v2.0 section F-13
 */
export default function ApporteurLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Tableau de bord', href: '/apporteur/dashboard', icon: 'chartBar' },
    { name: 'Mes commissions', href: '/apporteur/commissions', icon: 'cash' },
    { name: 'Reversements', href: '/apporteur/reversements', icon: 'creditCard' },
    { name: 'Mon profil', href: '/apporteur/profil', icon: 'user' },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <div className="min-h-screen bg-bg md:flex">
      <aside
        className={`${
          isSidebarOpen ? 'w-full md:w-64' : 'w-full md:w-20'
        } border-b border-border bg-white transition-all duration-300 md:shrink-0 md:border-b-0 md:border-r md:flex md:flex-col`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {isSidebarOpen ? (
            <Link to="/apporteur" className="text-xl font-bold text-[var(--color-apporteur)]">
              FORGES
            </Link>
          ) : (
            <span className="text-lg font-bold text-[var(--color-apporteur)]">F</span>
          )}

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-[var(--color-apporteur)] opacity-70 transition-opacity hover:opacity-100"
            aria-label={isSidebarOpen ? 'Réduire la sidebar' : 'Ouvrir la sidebar'}
            type="button"
          >
            {isSidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="grid grid-cols-2 items-stretch gap-1 p-2 md:flex-1 md:grid-cols-1 md:py-4 md:px-0">
          {navigation.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`flex w-full min-h-12 items-center gap-3 overflow-hidden rounded-lg border-r-4 border-transparent px-4 py-3 transition-colors md:rounded-none ${
                isActive(item.href)
                  ? 'border-[var(--color-apporteur)] bg-[var(--color-apporteur)]/10 text-[var(--color-apporteur)]'
                  : 'text-[var(--color-apporteur)] opacity-80 hover:bg-[var(--color-apporteur)]/5 hover:opacity-100'
              }`}
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
          title="Espace Apporteur"
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
