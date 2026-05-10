import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Navbar from './Navbar';
import Footer from './Footer';
import Icon from '../ui/Icon';

/**
 * OrgLayout - Layout pour l'espace organisation
 * Routes : /organisation/*
 * Référence : CLAUDE.md section 17.3
 */
export default function OrgLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Tableau de bord', href: '/organisation/dashboard', icon: 'chartBar' },
    { name: 'Abonnement', href: '/organisation/abonnement', icon: 'creditCard' },
    { name: 'Abonnement B2B', href: '/organisation/b2b', icon: 'folder' },
    { name: 'Employés', href: '/organisation/employes', icon: 'users' },
    { name: 'Vouchers', href: '/organisation/vouchers', icon: 'ticket' },
    { name: 'Devis', href: '/organisation/devis', icon: 'document' },
    { name: 'Inscriptions', href: '/organisation/inscriptions', icon: 'clipboardList' },
    { name: 'Paiements', href: '/organisation/paiements', icon: 'cash' },
    { name: 'Profil Organisation', href: '/organisation/profil', icon: 'building' },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-bg md:flex">
      <aside
        className={`${
          isSidebarOpen ? 'w-full md:w-64' : 'w-full md:w-20'
        } border-b border-border bg-white transition-all duration-300 md:border-b-0 md:border-r md:flex md:flex-col`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {isSidebarOpen && (
            <Link to="/organisation" className="text-xl font-bold text-primary">
              FORGES
            </Link>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-primary/70 hover:text-primary transition-colors"
            aria-label={isSidebarOpen ? 'Réduire la sidebar' : 'Ouvrir la sidebar'}
          >
            {isSidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="grid grid-cols-2 items-start gap-1 p-2 md:flex md:flex-1 md:flex-col md:gap-0 md:py-4 md:px-0">
          {navigation.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`flex w-full min-h-12 items-center gap-3 overflow-hidden rounded-lg border-r-4 border-transparent px-4 py-3 transition-colors md:rounded-none ${
                isActive(item.href)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'text-primary/80 hover:bg-primary/5 hover:text-primary'
              }`}
            >
              {item.icon && <Icon name={item.icon} size={20} className="flex-shrink-0" />}
              {isSidebarOpen && <span className="min-w-0 flex-1 truncate font-medium whitespace-nowrap">{item.name}</span>}
            </Link>
          ))}
        </nav>

      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <Navbar
          variant="private"
          title="Espace Organisation"
          user={user}
          onLogout={handleLogout}
          showSystemStatus={false}
        />

        <main className="flex-1 p-6">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
}
