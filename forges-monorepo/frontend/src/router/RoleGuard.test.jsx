import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RoleGuard from './RoleGuard';
import * as useAuthModule from '../hooks/useAuth';

/**
 * Tests pour le composant RoleGuard
 * Référence: CLAUDE.md section 17.7 (RoleGuard) + F-11 Todo_front.pdf
 *
 * Couverture:
 * - Redirection vers /login si non authentifié
 * - Redirection vers /unauthorized si rôle insuffisant
 * - Affichage du contenu si rôle autorisé
 * - Gestion des multiples rôles autorisés
 */

// Helper pour wrapper le composant avec BrowserRouter
const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('RoleGuard', () => {
  beforeEach(() => {
    // Réinitialiser les mocks avant chaque test
    vi.clearAllMocks();
  });

  // Test: utilisateur non authentifié
  describe('Utilisateur non authentifié', () => {
    it('devrait rediriger vers /login si user est null', () => {
      // Mock useAuth pour retourner user = null
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: null,
        isAuthenticated: false,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['ADMIN']}>
          <div>Contenu protégé</div>
        </RoleGuard>
      );

      // Le contenu ne doit pas être affiché
      expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument();
    });

    it('devrait rediriger vers /login si user est undefined', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: undefined,
        isAuthenticated: false,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['ADMIN']}>
          <div>Contenu protégé</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument();
    });
  });

  // Test: rôle insuffisant
  describe('Rôle insuffisant', () => {
    it('devrait rediriger vers /unauthorized si le rôle n\'est pas autorisé', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '1', email: 'user@forges.com', role: 'APPRENANT' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR']}>
          <div>Contenu admin</div>
        </RoleGuard>
      );

      // L'utilisateur APPRENANT ne doit pas voir le contenu ADMIN
      expect(screen.queryByText('Contenu admin')).not.toBeInTheDocument();
    });

    it('devrait rediriger un RESPONSABLE vers /unauthorized pour une route ADMIN', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '2', email: 'resp@forges.com', role: 'RESPONSABLE' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['ADMIN']}>
          <div>Admin only</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Admin only')).not.toBeInTheDocument();
    });

    it('devrait rediriger un AGENT vers /unauthorized pour une route RESPONSABLE', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '3', email: 'agent@forges.com', role: 'AGENT' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['RESPONSABLE']}>
          <div>Formations</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Formations')).not.toBeInTheDocument();
    });
  });

  // Test: rôle autorisé
  describe('Rôle autorisé', () => {
    it('devrait afficher le contenu si le rôle est autorisé (ADMIN)', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '1', email: 'admin@forges.com', role: 'ADMIN' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['ADMIN']}>
          <div>Dashboard Admin</div>
        </RoleGuard>
      );

      expect(screen.getByText('Dashboard Admin')).toBeInTheDocument();
    });

    it('devrait afficher le contenu si le rôle est dans la liste (APPRENANT)', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '2', email: 'etudiant@forges.com', role: 'APPRENANT' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['APPRENANT', 'ETUDIANT']}>
          <div>Mes dossiers</div>
        </RoleGuard>
      );

      expect(screen.getByText('Mes dossiers')).toBeInTheDocument();
    });

    it('devrait afficher le contenu si le rôle est dans la liste (ORGANISATION)', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '3', email: 'org@forges.com', role: 'ORGANISATION' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['ORGANISATION']}>
          <div>Gestion employés</div>
        </RoleGuard>
      );

      expect(screen.getByText('Gestion employés')).toBeInTheDocument();
    });
  });

  // Test: multiples rôles autorisés
  describe('Multiples rôles autorisés', () => {
    it('devrait autoriser ADMIN dans une liste [ADMIN, SUPERVISEUR]', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '1', email: 'admin@forges.com', role: 'ADMIN' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR']}>
          <div>Dashboard backoffice</div>
        </RoleGuard>
      );

      expect(screen.getByText('Dashboard backoffice')).toBeInTheDocument();
    });

    it('devrait autoriser SUPERVISEUR dans une liste [ADMIN, SUPERVISEUR]', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '2', email: 'super@forges.com', role: 'SUPERVISEUR' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR']}>
          <div>Dashboard backoffice</div>
        </RoleGuard>
      );

      expect(screen.getByText('Dashboard backoffice')).toBeInTheDocument();
    });

    it('devrait autoriser RESPONSABLE dans une liste [ADMIN, SUPERVISEUR, RESPONSABLE]', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '3', email: 'resp@forges.com', role: 'RESPONSABLE' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR', 'RESPONSABLE']}>
          <div>Formations</div>
        </RoleGuard>
      );

      expect(screen.getByText('Formations')).toBeInTheDocument();
    });

    it('devrait refuser APPRENANT dans une liste [ADMIN, SUPERVISEUR, RESPONSABLE, AGENT]', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '4', email: 'etudiant@forges.com', role: 'APPRENANT' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR', 'RESPONSABLE', 'AGENT']}>
          <div>Backoffice</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Backoffice')).not.toBeInTheDocument();
    });
  });

  // Test: cas d'usage métier FORGES
  describe('Cas d\'usage métier FORGES', () => {
    it('AGENT devrait accéder à /backoffice/paiements', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '5', email: 'agent@forges.com', role: 'AGENT' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['ADMIN', 'AGENT']}>
          <div>Paiements</div>
        </RoleGuard>
      );

      expect(screen.getByText('Paiements')).toBeInTheDocument();
    });

    it('SUPERVISEUR devrait accéder à /backoffice/reversements-apporteurs', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '6', email: 'super@forges.com', role: 'SUPERVISEUR' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['SUPERVISEUR', 'AGENT']}>
          <div>Reversements apporteurs</div>
        </RoleGuard>
      );

      expect(screen.getByText('Reversements apporteurs')).toBeInTheDocument();
    });

    it('AGENT devrait accéder à /backoffice/reversements-apporteurs', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '7', email: 'agent@forges.com', role: 'AGENT' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['SUPERVISEUR', 'AGENT']}>
          <div>Reversements apporteurs</div>
        </RoleGuard>
      );

      expect(screen.getByText('Reversements apporteurs')).toBeInTheDocument();
    });

    it('ADMIN ne devrait pas accéder à /backoffice/reversements-apporteurs', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '8', email: 'admin@forges.com', role: 'ADMIN' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['SUPERVISEUR', 'AGENT']}>
          <div>Reversements apporteurs</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Reversements apporteurs')).not.toBeInTheDocument();
    });

    it('RESPONSABLE devrait accéder à /backoffice/formations', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '6', email: 'resp@forges.com', role: 'RESPONSABLE' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR', 'RESPONSABLE']}>
          <div>Formations</div>
        </RoleGuard>
      );

      expect(screen.getByText('Formations')).toBeInTheDocument();
    });

    it('RESPONSABLE ne devrait PAS accéder à /backoffice/paiements', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '7', email: 'resp@forges.com', role: 'RESPONSABLE' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['ADMIN', 'AGENT']}>
          <div>Paiements</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Paiements')).not.toBeInTheDocument();
    });

    it('APPRENANT devrait accéder à /apprenant/abonnement', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '9', email: 'apprenant@forges.com', role: 'APPRENANT' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['APPRENANT']}>
          <div>Mon abonnement</div>
        </RoleGuard>
      );

      expect(screen.getByText('Mon abonnement')).toBeInTheDocument();
    });

    it('APPRENANT devrait accéder à /apprenant/formations-a-la-demande', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '10', email: 'apprenant2@forges.com', role: 'APPRENANT' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['APPRENANT']}>
          <div>Formations à la demande</div>
        </RoleGuard>
      );

      expect(screen.getByText('Formations à la demande')).toBeInTheDocument();
    });
  });

  // Test: contenu complexe
  describe('Contenu complexe', () => {
    it('devrait afficher des composants React complexes', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '1', email: 'admin@forges.com', role: 'ADMIN' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['ADMIN']}>
          <div>
            <h1>Dashboard</h1>
            <p>Statistiques</p>
            <button>Action</button>
          </div>
        </RoleGuard>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Statistiques')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });
  });

  // Test: Nouveaux rôles v4.8 (PARTENAIRE, APPORTEUR, GESTIONNAIRE)
  describe('Nouveaux rôles v4.8', () => {
    it('PARTENAIRE devrait accéder à /partenaire/dashboard', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '11', email: 'partenaire@forges.com', role: 'PARTENAIRE' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['PARTENAIRE']}>
          <div>Espace Partenaire</div>
        </RoleGuard>
      );

      expect(screen.getByText('Espace Partenaire')).toBeInTheDocument();
    });

    it('PARTENAIRE devrait accéder à /partenaire/formations', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '12', email: 'partenaire2@forges.com', role: 'PARTENAIRE' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['PARTENAIRE']}>
          <div>Mes formations</div>
        </RoleGuard>
      );

      expect(screen.getByText('Mes formations')).toBeInTheDocument();
    });

    it('PARTENAIRE ne devrait PAS accéder au backoffice', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '13', email: 'partenaire3@forges.com', role: 'PARTENAIRE' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR', 'RESPONSABLE', 'AGENT']}>
          <div>Backoffice</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Backoffice')).not.toBeInTheDocument();
    });

    it('APPORTEUR devrait accéder à /apporteur/dashboard', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '14', email: 'apporteur@forges.com', role: 'APPORTEUR' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['APPORTEUR']}>
          <div>Espace Apporteur</div>
        </RoleGuard>
      );

      expect(screen.getByText('Espace Apporteur')).toBeInTheDocument();
    });

    it('APPORTEUR devrait accéder à /apporteur/commissions', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '15', email: 'apporteur2@forges.com', role: 'APPORTEUR' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['APPORTEUR']}>
          <div>Mes commissions</div>
        </RoleGuard>
      );

      expect(screen.getByText('Mes commissions')).toBeInTheDocument();
    });

    it('APPORTEUR ne devrait PAS accéder au backoffice', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '16', email: 'apporteur3@forges.com', role: 'APPORTEUR' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR', 'RESPONSABLE', 'AGENT']}>
          <div>Backoffice</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Backoffice')).not.toBeInTheDocument();
    });

    it('GESTIONNAIRE devrait accéder à /backoffice (accès restreint)', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '17', email: 'gestionnaire@forges.com', role: 'GESTIONNAIRE' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR', 'RESPONSABLE', 'AGENT', 'GESTIONNAIRE']}>
          <div>Backoffice restreint</div>
        </RoleGuard>
      );

      expect(screen.getByText('Backoffice restreint')).toBeInTheDocument();
    });

    it('GESTIONNAIRE ne devrait accéder qu au backoffice institutionnel', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '18', email: 'gestionnaire2@forges.com', role: 'GESTIONNAIRE' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['GESTIONNAIRE']}>
          <div>Gestion apprenants institutionnels</div>
        </RoleGuard>
      );

      expect(screen.getByText('Gestion apprenants institutionnels')).toBeInTheDocument();
    });

    it('GESTIONNAIRE ne devrait PAS accéder aux pages apprenant', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: '19', email: 'gestionnaire3@forges.com', role: 'GESTIONNAIRE' },
        isAuthenticated: true,
      });

      renderWithRouter(
        <RoleGuard allowedRoles={['APPRENANT']}>
          <div>Mes dossiers</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Mes dossiers')).not.toBeInTheDocument();
    });

    it('vérifie les 9 rôles v4.8 : ADMIN, SUPERVISEUR, RESPONSABLE, AGENT, APPRENANT, ORGANISATION, GESTIONNAIRE, PARTENAIRE, APPORTEUR', () => {
      const roles = [
        { role: 'ADMIN', page: 'Admin page' },
        { role: 'SUPERVISEUR', page: 'Superviseur page' },
        { role: 'RESPONSABLE', page: 'Responsable page' },
        { role: 'AGENT', page: 'Agent page' },
        { role: 'APPRENANT', page: 'Apprenant page' },
        { role: 'ORGANISATION', page: 'Organisation page' },
        { role: 'GESTIONNAIRE', page: 'Gestionnaire page' },
        { role: 'PARTENAIRE', page: 'Partenaire page' },
        { role: 'APPORTEUR', page: 'Apporteur page' },
      ];

      roles.forEach(({ role, page }) => {
        vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
          user: { id: 'test', email: `${role.toLowerCase()}@forges.com`, role },
          isAuthenticated: true,
        });

        const { unmount } = renderWithRouter(
          <RoleGuard allowedRoles={[role]}>
            <div>{page}</div>
          </RoleGuard>
        );

        expect(screen.getByText(page)).toBeInTheDocument();
        unmount();
      });
    });
  });
});
