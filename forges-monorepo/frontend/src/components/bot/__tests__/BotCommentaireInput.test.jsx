import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BotCommentaireInput from '../BotCommentaireInput';

describe('BotCommentaireInput', () => {
  it('B3 — affiche le compteur sous la forme "utilisé / max" (0/500 à vide)', () => {
    render(
      <BotCommentaireInput
        value=""
        onChange={vi.fn()}
        maxLength={500}
      />
    );

    expect(screen.getByText('0 / 500')).toBeInTheDocument();
  });

  it('met à jour le compteur quand l utilisateur tape', async () => {
    const user = userEvent.setup();
    let current = '';
    const onChange = vi.fn((v) => { current = v; });

    const { rerender } = render(
      <BotCommentaireInput value={current} onChange={onChange} maxLength={500} />
    );

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Bonjour');

    rerender(<BotCommentaireInput value="Bonjour" onChange={onChange} maxLength={500} />);

    expect(screen.getByText('7 / 500')).toBeInTheDocument();
  });
});
