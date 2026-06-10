import { BotService } from '../bot.service';

function createHarness(actorType: 'APPRENANT' | 'ORGANISATION', mode = 'AVEC_SESSION') {
  let session: any = {
    id: 'bot-01',
    utilisateur_id: actorType === 'APPRENANT' ? 'app-01' : 'org-01',
    type_utilisateur: actorType,
    flux_actif: 'FEEDBACK',
    statut: 'EN_COURS',
    langue: 'FR',
    historique: [],
    contexte: {
      formation_id: 'formation-01',
      session_id: mode === 'AVEC_SESSION' ? 'session-01' : null,
      mode_formation: mode,
    },
  };
  let feedback: any = null;
  const repo: any = {
    findSession: jest.fn(async () => session),
    updateSession: jest.fn(async (_id, data) => {
      session = { ...session, ...data };
      return session;
    }),
    cloturerSession: jest.fn(async (_id, statut) => {
      session = { ...session, statut };
      return session;
    }),
    enregistrerFeedback: jest.fn(async (data) => {
      feedback = data;
      return data;
    }),
  };
  const engine: any = {};
  const audit: any = { info: jest.fn() };
  return {
    service: new BotService(repo, engine, audit),
    feedback: () => feedback,
  };
}

describe('RM-121/RM-122 feedback flow', () => {
  it('persists a learner feedback with formation and session context', async () => {
    const harness = createHarness('APPRENANT');

    await harness.service.repondre('bot-01', 'feedback_note_globale', '5');
    await harness.service.repondre('bot-01', 'feedback_note_contenu', 'PASSER');
    await harness.service.repondre('bot-01', 'feedback_note_formateur', '4');
    await harness.service.repondre(
      'bot-01',
      'feedback_commentaire',
      'ENVOYER',
      'Très utile',
    );
    const result = await harness.service.repondre(
      'bot-01',
      'feedback_recommande',
      'OUI',
    );

    expect(harness.feedback()).toEqual(expect.objectContaining({
      apprenant_id: 'app-01',
      organisation_id: null,
      formation_id: 'formation-01',
      session_id: 'session-01',
      note_globale: 5,
      note_contenu: null,
      note_formateur: 4,
      commentaire_libre: 'Très utile',
      recommande: true,
      canal: 'BOT',
    }));
    expect(result).toEqual(expect.objectContaining({ statut: 'TERMINEE' }));
  });

  it('persists an organisation feedback under organisation_id', async () => {
    const harness = createHarness('ORGANISATION');

    await harness.service.repondre('bot-01', 'feedback_note_globale', '4');
    await harness.service.repondre('bot-01', 'feedback_note_contenu', '3');
    await harness.service.repondre('bot-01', 'feedback_note_formateur', 'PASSER');
    await harness.service.repondre('bot-01', 'feedback_commentaire', 'PASSER');
    await harness.service.repondre('bot-01', 'feedback_recommande', 'NON');

    expect(harness.feedback()).toEqual(expect.objectContaining({
      apprenant_id: null,
      organisation_id: 'org-01',
      formation_id: 'formation-01',
      recommande: false,
    }));
  });

  it('skips the trainer question for an on-demand formation', async () => {
    const harness = createHarness('APPRENANT', 'A_LA_DEMANDE');

    await harness.service.repondre('bot-01', 'feedback_note_globale', '5');
    const result = await harness.service.repondre(
      'bot-01',
      'feedback_note_contenu',
      '5',
    );

    expect((result as any).current_question.id).toBe('feedback_commentaire');
  });

  it('rejects a comment longer than 500 characters', async () => {
    const harness = createHarness('APPRENANT');
    await harness.service.repondre('bot-01', 'feedback_note_globale', '5');
    await harness.service.repondre('bot-01', 'feedback_note_contenu', '5');
    await harness.service.repondre('bot-01', 'feedback_note_formateur', '5');

    await expect(harness.service.repondre(
      'bot-01',
      'feedback_commentaire',
      'ENVOYER',
      'x'.repeat(501),
    )).rejects.toThrow('COMMENTAIRE_TROP_LONG');
  });
});
