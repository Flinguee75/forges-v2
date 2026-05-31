import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';

/**
 * Tests pour le composant Button
 * Référence: CLAUDE.md section 17.4 (conventions) + F-11 Todo_front.pdf
 *
 * Couverture:
 * - Toutes les variantes (primary, secondary, success, warning, danger, outline, white)
 * - Toutes les tailles (small, medium, large)
 * - États: default, hover, disabled, loading
 * - Interactions: onClick
 */
describe('Button', () => {
  // Test de rendu de base
  it('devrait rendre le bouton avec le texte fourni', () => {
    render(<Button>Cliquer ici</Button>);
    expect(screen.getByText('Cliquer ici')).toBeInTheDocument();
  });

  // Tests des variantes
  describe('Variantes', () => {
    it('devrait appliquer la variante primary par défaut', () => {
      render(<Button>Primary</Button>);
      const button = screen.getByText('Primary');
      expect(button).toHaveClass('bg-action-primary');
    });

    it('devrait appliquer la variante secondary', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByText('Secondary');
      expect(button).toHaveClass('bg-action-secondary');
    });

    it('devrait appliquer la variante success', () => {
      render(<Button variant="success">Success</Button>);
      const button = screen.getByText('Success');
      expect(button).toHaveClass('bg-action-success');
    });

    it('devrait appliquer la variante warning', () => {
      render(<Button variant="warning">Warning</Button>);
      const button = screen.getByText('Warning');
      expect(button).toHaveClass('bg-action-warning');
    });

    it('devrait appliquer la variante danger', () => {
      render(<Button variant="danger">Danger</Button>);
      const button = screen.getByText('Danger');
      expect(button).toHaveClass('bg-action-danger');
    });

    it('devrait appliquer la variante outline', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByText('Outline');
      expect(button).toHaveClass('border-action');
    });

    it('devrait appliquer la variante white', () => {
      render(<Button variant="white">White</Button>);
      const button = screen.getByText('White');
      expect(button).toHaveClass('bg-white');
    });
  });

  // Tests des tailles
  describe('Tailles', () => {
    it('devrait appliquer la taille medium par défaut', () => {
      render(<Button>Medium</Button>);
      const button = screen.getByText('Medium');
      expect(button).toHaveClass('px-4', 'py-2', 'text-sm');
    });

    it('devrait appliquer la taille small', () => {
      render(<Button size="small">Small</Button>);
      const button = screen.getByText('Small');
      expect(button).toHaveClass('px-3', 'py-1.5', 'text-xs');
    });

    it('devrait appliquer la taille large', () => {
      render(<Button size="large">Large</Button>);
      const button = screen.getByText('Large');
      expect(button).toHaveClass('px-6', 'py-3', 'text-base');
    });
  });

  // Tests des états
  describe('États', () => {
    it('devrait être de type button par défaut', () => {
      render(<Button>Button</Button>);
      const button = screen.getByText('Button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('devrait accepter le type submit', () => {
      render(<Button type="submit">Submit</Button>);
      const button = screen.getByText('Submit');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('devrait être désactivable', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByText('Disabled');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });

    it('devrait afficher un spinner en état loading', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByText('Loading');
      expect(button).toBeDisabled();
      // Le spinner est une balise SVG avec animation spin
      const spinner = button.querySelector('svg.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('devrait désactiver le bouton quand loading est true', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByText('Loading');
      expect(button).toBeDisabled();
    });
  });

  // Tests des interactions
  describe('Interactions', () => {
    it('devrait appeler onClick quand cliqué', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Click me</Button>);
      const button = screen.getByText('Click me');

      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('ne devrait pas appeler onClick si disabled', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick} disabled>Disabled</Button>);
      const button = screen.getByText('Disabled');

      await user.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('ne devrait pas appeler onClick si loading', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick} loading>Loading</Button>);
      const button = screen.getByText('Loading');

      await user.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  // Tests des classes personnalisées
  describe('Classes personnalisées', () => {
    it('devrait accepter des classes CSS additionnelles', () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByText('Custom');
      expect(button).toHaveClass('custom-class');
      // Doit aussi conserver les classes de base
      expect(button).toHaveClass('bg-action-primary');
    });

    it('devrait prendre toute la largeur quand fullWidth est true', () => {
      render(<Button fullWidth>Full width</Button>);
      const button = screen.getByText('Full width');
      expect(button).toHaveClass('w-full');
    });
  });

  // Tests des props HTML natives
  describe('Props HTML natives', () => {
    it('devrait passer les props HTML natives', () => {
      render(<Button data-testid="test-button" aria-label="Test">Button</Button>);
      const button = screen.getByTestId('test-button');
      expect(button).toHaveAttribute('aria-label', 'Test');
    });
  });
});
