import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BotWidget from '../BotWidget';

const startSession = vi.fn();
const submitResponse = vi.fn();
const loadActiveSession = vi.fn();
const abandonSession = vi.fn();
const resetSession = vi.fn();

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      langue_preferee: 'FR',
    },
  }),
}));

vi.mock('../../../hooks/useBot', () => ({
  useBot: () => ({
    session: null,
    isLoading: false,
    error: null,
    loadActiveSession,
    startSession,
    submitResponse,
    abandonSession,
    resetSession,
  }),
}));

describe('BotWidget', () => {
  it('ouvre le panneau flottant et déclenche le démarrage de session', async () => {
    const user = userEvent.setup();
    loadActiveSession.mockResolvedValue(null);

    render(<BotWidget />);

    expect(screen.getByRole('button', { name: 'Ouvrir le conseiller' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ouvrir le conseiller' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Conseiller')).toBeInTheDocument();

    await waitFor(() => {
      expect(loadActiveSession).toHaveBeenCalled();
      expect(startSession).toHaveBeenCalledTimes(1);
    });
  });
});
