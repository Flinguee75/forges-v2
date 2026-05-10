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
});
