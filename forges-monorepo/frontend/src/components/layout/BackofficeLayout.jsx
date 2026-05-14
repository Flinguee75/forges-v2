import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Navbar from './Navbar';
import Footer from './Footer';
import Sidebar from './Sidebar';

/**
 * BackofficeLayout - Layout pour le backoffice FORGES
 * Rôles autorisés : ADMIN, SUPERVISEUR, RESPONSABLE, AGENT
 * Routes : /backoffice/*
 * Référence : CLAUDE.md section 17.3
 */
export default function BackofficeLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Navigation organisée par section
  const navigationSections = [
    {
      title: 'Vue d\'ensemble',
      items: [
        { name: 'Dashboard', href: '/backoffice/dashboard', icon: 'chartBar', roles: ['ADMIN', 'SUPERVISEUR'] },
        { name: 'Rapports', href: '/backoffice/rapports', icon: 'informationCircle', roles: ['ADMIN', 'SUPERVISEUR'] },
      ],
    },
    {
      title: 'Catalogue',
      items: [
        { name: 'Formations', href: '/backoffice/formations', icon: 'academicCap', roles: ['ADMIN', 'SUPERVISEUR', 'RESPONSABLE'] },
        { name: 'Sessions', href: '/backoffice/sessions', icon: 'calendar', roles: ['ADMIN', 'SUPERVISEUR'] },
      ],
    },
    {
      title: 'Inscriptions',
      items: [
        { name: 'Dossiers', href: '/backoffice/dossiers', icon: 'clipboardList', roles: ['ADMIN', 'SUPERVISEUR'] },
        { name: 'Paiements', href: '/backoffice/paiements', icon: 'cash', roles: ['ADMIN', 'AGENT'] },
        { name: 'Vouchers', href: '/backoffice/vouchers', icon: 'ticket', roles: ['ADMIN', 'AGENT'] },
        { name: 'Devis', href: '/backoffice/devis', icon: 'document', roles: ['ADMIN', 'AGENT'] },
      ],
    },
    {
      title: 'Utilisateurs',
      items: [
        { name: 'Utilisateurs', href: '/backoffice/apprenants', icon: 'user', roles: ['ADMIN', 'SUPERVISEUR'] },
        { name: 'Organisations', href: '/backoffice/organisations', icon: 'building', roles: ['ADMIN', 'SUPERVISEUR'] },
      ],
    },
    {
      title: 'Abonnements',
      items: [
        { name: 'Tous les abonnements', href: '/backoffice/abonnements', icon: 'folder', roles: ['ADMIN', 'SUPERVISEUR', 'AGENT'] },
        { name: 'Contrat institutionnel', href: '/backoffice/abonnements/contrat-institutionnel', icon: 'document', roles: ['ADMIN'] },
      ],
    },
    {
      title: 'Partenaires',
      items: [
        { name: 'Partenaires', href: '/backoffice/partenaires', icon: 'briefcase', roles: ['ADMIN'] },
        { name: 'Formations partenaires', href: '/backoffice/formations-partenaires', icon: 'documentCheck', roles: ['RESPONSABLE', 'ADMIN'] },
        { name: 'Reversements partenaires', href: '/backoffice/reversements-partenaires', icon: 'cash', roles: ['AGENT', 'SUPERVISEUR', 'ADMIN'] },
      ],
    },
    {
      title: 'Apporteurs',
      items: [
        { name: 'Apporteurs', href: '/backoffice/apporteurs', icon: 'users', roles: ['ADMIN', 'SUPERVISEUR', 'AGENT'] },
        { name: 'Reversements apporteurs', href: '/backoffice/reversements-apporteurs', icon: 'cash', roles: ['SUPERVISEUR', 'AGENT'] },
      ],
    },
    {
      title: 'Bot admin',
      items: [
        { name: 'Enquêtes catalogue', href: '/backoffice/bot/enquetes-catalogue', icon: 'clipboardList', roles: ['ADMIN'] },
        { name: 'Feedbacks formations', href: '/backoffice/bot/feedbacks', icon: 'chartBar', roles: ['ADMIN', 'RESPONSABLE'] },
      ],
    },
    {
      title: 'Administration',
      items: [
        { name: 'Configuration', href: '/backoffice/config', icon: 'cog', roles: ['ADMIN'] },
      ],
    },
  ];

  const canSeeItem = (allowedRoles) => {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    return allowedRoles.includes(user?.role);
  };

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        currentPath={location.pathname}
        sections={navigationSections
          .map((section) => ({
            ...section,
            items: section.items.filter((item) => canSeeItem(item.roles)),
          }))
          .filter((section) => section.items.length > 0)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar
          variant="private"
          title="Espace Backoffice"
          user={user}
          onLogout={handleLogout}
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
}
