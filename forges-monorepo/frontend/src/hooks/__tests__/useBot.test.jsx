import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../contexts/ToastContext';
import { useBot } from '../useBot';
import { botApi } from '../../api/bot.api';

vi.mock('../../api/bot.api', () => ({
  botApi: {
    startSession: vi.fn(),
    getActiveSession: vi.fn(),
    submitResponse: vi.fn(),
    abandonSession: vi.fn(),
  },
}));

const session = {
  id: 'bot-01',
  flux_actif: 'FEEDBACK',
  statut: 'ACTIVE',
  langue: 'FR',
  current_question: {
    id: 'feedback_note_globale',
    question: 'Quelle note globale donnez-vous ?',
    options: [
      { value: '1', label: '1' },
      { value: '5', label: '5' },
    ],
    required: true,
    allow_commentaire: false,
  },
  historique: { steps: [], metadata: {} },
};

describe('useBot canonical contract', () => {
  const wrapper = ({ children }) => <ToastProvider>{children}</ToastProvider>;

  it('unwraps the backend envelope and submits the current question id', async () => {
    botApi.startSession.mockResolvedValue({ statusCode: 201, data: session });
    botApi.submitResponse.mockResolvedValue({
      statusCode: 200,
      data: { ...session, statut: 'TERMINEE', current_question: null },
    });
    const { result } = renderHook(() => useBot(), { wrapper });

    await act(async () => {
      await result.current.startSession();
    });
    expect(result.current.currentQuestion.id).toBe('feedback_note_globale');

    await act(async () => {
      await result.current.submitResponse('5');
    });

    expect(botApi.submitResponse).toHaveBeenCalledWith('bot-01', {
      question_id: 'feedback_note_globale',
      valeur: '5',
      commentaire: null,
    });
  });
});
