import { BotController } from '../bot.controller';
import { createMockReq, createMockRes, createNext } from '../../../__tests__/helpers/http';

describe('Bot feedback public contract', () => {
  it('returns a canonical active session when feedback starts', async () => {
    const service = {
      demarrerSessionApprenant: jest.fn().mockResolvedValue({
        session_id: 'bot-01',
        flux: 'FEEDBACK',
        langue: 'FR',
        question: {
          id: 1,
          texte: 'Quelle note globale donnez-vous ?',
          options: [1, 2, 3, 4, 5],
          obligatoire: true,
        },
      }),
    };
    const controller = new BotController(service as any, {} as any);
    const req = createMockReq({
      user: { userId: 'app-01', role: 'APPRENANT', langue: 'FR' },
    });
    const res = createMockRes();

    await controller.demarrerSession(req, res, createNext());

    expect(res.json).toHaveBeenCalledWith({
      statusCode: 201,
      data: expect.objectContaining({
        id: 'bot-01',
        flux_actif: 'FEEDBACK',
        statut: 'ACTIVE',
        current_question: expect.objectContaining({
          id: 'feedback_note_globale',
          options: expect.arrayContaining([{ value: '5', label: '5' }]),
        }),
      }),
    });
  });

  it('accepts the canonical answer payload used by the widget', async () => {
    const service = {
      repondre: jest.fn().mockResolvedValue({
        id: 'bot-01',
        flux_actif: 'FEEDBACK',
        statut: 'ACTIVE',
      }),
    };
    const controller = new BotController(service as any, {} as any);
    const req = createMockReq({
      params: { id: 'bot-01' },
      body: {
        question_id: 'feedback_note_globale',
        valeur: '5',
        commentaire: null,
      },
    });
    const res = createMockRes();

    await controller.repondre(req, res, createNext());

    expect(service.repondre).toHaveBeenCalledWith(
      'bot-01',
      'feedback_note_globale',
      '5',
      null,
      'user-01',
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
