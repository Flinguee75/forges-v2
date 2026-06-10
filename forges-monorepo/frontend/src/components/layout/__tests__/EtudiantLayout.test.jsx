import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EtudiantLayout from '../EtudiantLayout';

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'app-1', email: 'app@test.com', role: 'APPRENANT' },
    logout: vi.fn(),
  }),
}));
vi.mock('../../bot/BotWidget', () => ({
  default: () => <div data-testid="bot-widget" />,
}));

describe('EtudiantLayout', () => {
  it('mounts the bot widget in the learner workspace', () => {
    render(
      <BrowserRouter>
        <EtudiantLayout />
      </BrowserRouter>,
    );

    expect(screen.getByTestId('bot-widget')).toBeInTheDocument();
  });
});
