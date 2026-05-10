import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CHUNK_RELOAD_KEY } from '../../../utils/chunkReload';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');

  return {
    ...actual,
    useRouteError: () => new Error('Failed to fetch dynamically imported module: https://edu.forges-group.com/assets/foo.js'),
    useLocation: () => ({ pathname: '/backoffice/dossiers' }),
    useNavigate: () => navigateMock,
  };
});

import RouteErrorFallback from '../RouteErrorFallback';

describe('RouteErrorFallback', () => {
  let setTimeoutSpy;

  beforeEach(() => {
    vi.useFakeTimers();
    navigateMock.mockReset();
    sessionStorage.clear();
    setTimeoutSpy = vi.spyOn(window, 'setTimeout');
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    setTimeoutSpy.mockRestore();
  });

  it('affiche un message clair et recharge automatiquement pour un chunk manquant', () => {
    render(<RouteErrorFallback />);

    expect(screen.getByText(/mise à jour en cours/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /recharger maintenant/i })).toBeInTheDocument();
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 300);
    expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBe('1');
  });
});
