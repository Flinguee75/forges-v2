import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Badge from './Badge';

/**
 * Tests pour le composant Badge
 * Référence: CLAUDE.md section 17.2 (charte graphique badges) + F-11 Todo_front.pdf
 *
 * Couverture:
 * - Toutes les variantes (success=vert, warning=orange, danger=rouge, info=bleu, gray=gris)
 * - Toutes les tailles (small, medium, large)
 * - Classes personnalisées
 */
describe('Badge', () => {
  // Test de rendu de base
  it('devrait rendre le badge avec le texte fourni', () => {
    render(<Badge>Badge texte</Badge>);
    expect(screen.getByText('Badge texte')).toBeInTheDocument();
  });

  // Tests des variantes selon la charte FORGES (section 17.2 CLAUDE.md)
  describe('Variantes (Charte FORGES)', () => {
    it('devrait appliquer la variante info (bleu) par défaut', () => {
      render(<Badge>Info</Badge>);
      const badge = screen.getByText('Info');
      expect(badge).toHaveClass('bg-secondary-soft', 'text-secondary');
    });

    it('devrait appliquer la variante success (vert #148F77)', () => {
      render(<Badge variant="success">VALIDE</Badge>);
      const badge = screen.getByText('VALIDE');
      expect(badge).toHaveClass('bg-success-soft', 'text-success');
    });

    it('devrait appliquer la variante warning (orange #D35400)', () => {
      render(<Badge variant="warning">EN_ATTENTE</Badge>);
      const badge = screen.getByText('EN_ATTENTE');
      expect(badge).toHaveClass('bg-warning-soft', 'text-warning');
    });

    it('devrait appliquer la variante danger (rouge #C0392B)', () => {
      render(<Badge variant="danger">REFUSE</Badge>);
      const badge = screen.getByText('REFUSE');
      expect(badge).toHaveClass('bg-danger-soft', 'text-danger');
    });

    it('devrait appliquer la variante gray pour statuts neutres', () => {
      render(<Badge variant="gray">BROUILLON</Badge>);
      const badge = screen.getByText('BROUILLON');
      expect(badge).toHaveClass('bg-gray-200', 'text-gray-700');
    });
  });

  // Tests des tailles
  describe('Tailles', () => {
    it('devrait appliquer la taille medium par défaut', () => {
      render(<Badge>Medium</Badge>);
      const badge = screen.getByText('Medium');
      expect(badge).toHaveClass('px-2.5', 'py-1', 'text-sm');
    });

    it('devrait appliquer la taille small', () => {
      render(<Badge size="small">Small</Badge>);
      const badge = screen.getByText('Small');
      expect(badge).toHaveClass('px-2', 'py-0.5', 'text-xs');
    });

    it('devrait appliquer la taille large', () => {
      render(<Badge size="large">Large</Badge>);
      const badge = screen.getByText('Large');
      expect(badge).toHaveClass('px-3', 'py-1.5', 'text-base');
    });
  });

  // Tests des classes de base
  describe('Styles de base', () => {
    it('devrait avoir les classes de base (inline-flex, rounded-full)', () => {
      render(<Badge>Base</Badge>);
      const badge = screen.getByText('Base');
      expect(badge).toHaveClass('inline-flex', 'items-center', 'font-medium', 'rounded-full');
    });

    it('devrait être un span', () => {
      render(<Badge>Span</Badge>);
      const badge = screen.getByText('Span');
      expect(badge.tagName).toBe('SPAN');
    });
  });

  // Tests des classes personnalisées
  describe('Classes personnalisées', () => {
    it('devrait accepter des classes CSS additionnelles', () => {
      render(<Badge className="custom-badge">Custom</Badge>);
      const badge = screen.getByText('Custom');
      expect(badge).toHaveClass('custom-badge');
      // Doit aussi conserver les classes de base
      expect(badge).toHaveClass('bg-secondary-soft');
    });
  });

  // Tests cas d'usage métier FORGES
  describe('Cas d\'usage métier FORGES', () => {
    it('devrait afficher un statut de dossier RETENU en vert', () => {
      render(<Badge variant="success">RETENU</Badge>);
      const badge = screen.getByText('RETENU');
      expect(badge).toHaveClass('bg-success-soft', 'text-success');
    });

    it('devrait afficher un statut de dossier GRIS en orange', () => {
      render(<Badge variant="warning">GRIS</Badge>);
      const badge = screen.getByText('GRIS');
      expect(badge).toHaveClass('bg-warning-soft', 'text-warning');
    });

    it('devrait afficher un statut de dossier REFUSE en rouge', () => {
      render(<Badge variant="danger">REFUSE</Badge>);
      const badge = screen.getByText('REFUSE');
      expect(badge).toHaveClass('bg-danger-soft', 'text-danger');
    });

    it('devrait afficher un statut EN_ATTENTE_VERIFICATION en gris', () => {
      render(<Badge variant="gray">EN_ATTENTE_VERIFICATION</Badge>);
      const badge = screen.getByText('EN_ATTENTE_VERIFICATION');
      expect(badge).toHaveClass('bg-gray-200', 'text-gray-700');
    });

    it('devrait afficher un paiement CONFIRME en vert', () => {
      render(<Badge variant="success">CONFIRME</Badge>);
      const badge = screen.getByText('CONFIRME');
      expect(badge).toHaveClass('bg-success-soft', 'text-success');
    });

    it('devrait afficher un paiement ECHOUE en rouge', () => {
      render(<Badge variant="danger">ECHOUE</Badge>);
      const badge = screen.getByText('ECHOUE');
      expect(badge).toHaveClass('bg-danger-soft', 'text-danger');
    });
  });

  // Tests de contenu varié
  describe('Contenu varié', () => {
    it('devrait accepter du texte simple', () => {
      render(<Badge>Simple text</Badge>);
      expect(screen.getByText('Simple text')).toBeInTheDocument();
    });

    it('devrait accepter des nombres', () => {
      render(<Badge>42</Badge>);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('devrait accepter des éléments React', () => {
      render(
        <Badge>
          <span>Element</span>
        </Badge>
      );
      expect(screen.getByText('Element')).toBeInTheDocument();
    });
  });
});
