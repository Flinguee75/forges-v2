import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../Navbar';

describe('Navbar', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('affiche le voyant backend en vert quand le health check repond 200', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    render(
      <BrowserRouter>
        <Navbar
          variant="private"
          title="Espace Organisation"
          user={{ role: 'ORGANISATION', email: 'org@test.com', raison_sociale: 'Org Test' }}
        />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Org Test')).toBeInTheDocument();
      expect(document.querySelector('span.text-success')).toBeTruthy();
    });
  });

  it('utilise /health et pas /api/health pour le backend', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    render(
      <BrowserRouter>
        <Navbar
          variant="private"
          title="Espace Organisation"
          user={{ role: 'ORGANISATION', email: 'org@test.com', raison_sociale: 'Org Test' }}
        />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    const [calledUrl] = globalThis.fetch.mock.calls[0];
    expect(calledUrl).toContain('/health');
    expect(calledUrl).not.toContain('/api/health');
  });

  it('masque le statut systeme sur les espaces organisation et apprenant', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    render(
      <BrowserRouter>
        <Navbar
          variant="private"
          title="Espace Organisation"
          user={{ role: 'ORGANISATION', email: 'org@test.com', raison_sociale: 'Org Test' }}
          showApiBadge={false}
          showSystemStatus={false}
        />
      </BrowserRouter>
    );

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(screen.getByText('Org Test')).toBeInTheDocument();
    expect(screen.queryByText('API en ligne')).not.toBeInTheDocument();
    expect(screen.queryByText("Aujourd'hui")).not.toBeInTheDocument();
  });

  it('masque seulement le badge API quand showApiBadge=false', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    render(
      <BrowserRouter>
        <Navbar
          variant="private"
          title="Espace Organisation"
          user={{ role: 'ORGANISATION', email: 'org@test.com', raison_sociale: 'Org Test' }}
          showApiBadge={false}
          showSystemStatus
        />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    expect(screen.getByText('Org Test')).toBeInTheDocument();
    expect(screen.queryByText('API en ligne')).not.toBeInTheDocument();
    expect(document.querySelector('span.text-success, span.text-warning, span.text-danger')).toBeTruthy();
  });

  it('affiche des CTA publics plus visibles sur fond clair', () => {
    render(
      <BrowserRouter>
        <Navbar variant="public" />
      </BrowserRouter>
    );

    const loginLink = screen.getByRole('link', { name: /connexion/i });
    const registerLink = screen.getByRole('link', { name: /inscription/i });
    const logoLink = screen.getByRole('link', { name: /accueil forges/i });

    expect(loginLink.className).toContain('border-primary/25');
    expect(loginLink.className).toContain('cursor-pointer');
    expect(loginLink.className).toContain('text-primary');
    expect(registerLink.className).toContain('bg-primary');
    expect(registerLink.className).toContain('cursor-pointer');
    expect(registerLink.className).toContain('hover:bg-[#0F2F43]');
    expect(logoLink.className).toContain('hover:scale-[1.03]');
  });
});
