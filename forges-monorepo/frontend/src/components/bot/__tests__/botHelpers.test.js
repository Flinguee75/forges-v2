import { describe, expect, it } from 'vitest';
import {
  getFluxLabel,
  formatFcfa,
  getConversationHistoryEntries,
  getSessionRecommendations,
  isAllowedBotValue,
  normalizeBotSession,
  resolveBotLanguage,
} from '../botHelpers';

describe('botHelpers', () => {
  it('formate les montants en FCFA à partir des centimes', () => {
    expect(formatFcfa(500000)).toBe('5\u202f000 FCFA');
  });

  it('valide uniquement les valeurs présentes dans les options', () => {
    const question = {
      options: [
        { value: 'A', label: 'Option A' },
        { value: 'B', label: 'Option B' },
      ],
    };

    expect(isAllowedBotValue(question, 'A')).toBe(true);
    expect(isAllowedBotValue(question, 'Z')).toBe(false);
  });

  it('reconstruit l’historique avec les libellés de questions connus', () => {
    const entries = getConversationHistoryEntries({
      historique: {
        steps: [
          {
            question_id: 'upgrade_offer',
            value: 'VOIR_OFFRES',
            commentaire: 'Très pertinent',
            answered_at: '2026-04-01T10:00:00.000Z',
          },
        ],
      },
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].questionLabel).toContain('offre plus adaptée');
    expect(entries[0].answerLabel).toBe('Voir les offres');
    expect(entries[0].commentaire).toBe('Très pertinent');
  });

  it('privilégie les recommandations fournies par le backend', () => {
    const session = {
      current_question: {
        recommendations: [{ id: 'f-1', titre: 'Formation A' }],
      },
      historique: {
        result: {
          recommendations: [{ id: 'f-2', titre: 'Formation B' }],
        },
      },
    };

    expect(getSessionRecommendations(session)).toEqual([{ id: 'f-1', titre: 'Formation A' }]);
  });

  it('normalise les sessions en respectant la langue choisie', () => {
    const session = normalizeBotSession({
      flux_actif: 'ORIENTATION',
      statut: 'ACTIVE',
      current_question: {
        id: 'orientation_objectif',
        question: 'Quel est votre objectif principal ?',
        options: {
          MONTER_COMPETENCES: {
            label: 'Monter en compétences',
          },
          OBTENIR_CERTIFICATION: {
            label: 'Préparer une certification',
          },
        },
      },
      historique: {
        steps: [
          {
            question_id: 'orientation_objectif',
            value: 'MONTER_COMPETENCES',
            question: 'Quel est votre objectif principal ?',
            answer_label: 'Monter en compétences',
          },
        ],
      },
    }, 'EN');

    expect(session.current_question.question).toBe('What is your main objective?');
    expect(session.current_question.options).toEqual([
      { value: 'MONTER_COMPETENCES', label: 'Build new skills' },
      { value: 'OBTENIR_CERTIFICATION', label: 'Prepare for a certification' },
    ]);
    expect(session.historique.steps[0].answer_label).toBe('Build new skills');
  });

  it('resout les langues et les flux inconnus de facon tolerante', () => {
    expect(resolveBotLanguage('en-US')).toBe('EN');
    expect(resolveBotLanguage('zz-ZZ')).toBe('FR');
    expect(getFluxLabel('NOUVEAU_FLUX', 'FR')).toBe('Nouveau flux');
  });
});
