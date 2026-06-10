import { FeedbackEligibilityService } from '../feedback-eligibility.service';

describe('FeedbackEligibilityService', () => {
  const now = new Date('2026-06-10T12:00:00.000Z');

  it('prioritizes a recent closed session for a learner', async () => {
    const repository: any = {
      findRecentSessionFeedbackTarget: jest.fn().mockResolvedValue({
        formation_id: 'formation-01',
        session_id: 'session-01',
        formation: {
          intitule: 'Gestion de projet',
          mode_formation: 'AVEC_SESSION',
        },
      }),
      findExpiredOnDemandFeedbackTarget: jest.fn(),
    };
    const service = new FeedbackEligibilityService(repository);

    await expect(service.findForApprenant('app-01', now)).resolves.toEqual({
      actorType: 'APPRENANT',
      actorId: 'app-01',
      formationId: 'formation-01',
      sessionId: 'session-01',
      formationIntitule: 'Gestion de projet',
      modeFormation: 'AVEC_SESSION',
    });
    expect(repository.findExpiredOnDemandFeedbackTarget).not.toHaveBeenCalled();
  });

  it('uses an expired on-demand access when no recent session exists', async () => {
    const repository: any = {
      findRecentSessionFeedbackTarget: jest.fn().mockResolvedValue(null),
      findExpiredOnDemandFeedbackTarget: jest.fn().mockResolvedValue({
        formation_id: 'formation-02',
        formation: {
          intitule: 'Excel avancé',
          mode_formation: 'A_LA_DEMANDE',
        },
      }),
    };
    const service = new FeedbackEligibilityService(repository);

    await expect(service.findForApprenant('app-01', now)).resolves.toEqual(
      expect.objectContaining({
        formationId: 'formation-02',
        sessionId: null,
        modeFormation: 'A_LA_DEMANDE',
      }),
    );
  });

  it('triggers feedback on the last day of an EN_COURS session (date_fin = today)', async () => {
    const repository: any = {
      findRecentSessionFeedbackTarget: jest.fn().mockResolvedValue({
        formation_id: 'formation-last-day',
        session_id: 'session-last-day',
        formation: {
          intitule: 'Management',
          mode_formation: 'AVEC_SESSION',
        },
      }),
      findExpiredOnDemandFeedbackTarget: jest.fn(),
    };
    const service = new FeedbackEligibilityService(repository);

    await expect(service.findForApprenant('app-02', now)).resolves.toEqual(
      expect.objectContaining({
        formationId: 'formation-last-day',
        sessionId: 'session-last-day',
      }),
    );
    // Repository is called with today's date; the OR condition for EN_COURS is handled inside repository
    expect(repository.findRecentSessionFeedbackTarget).toHaveBeenCalledWith('app-02', now);
  });

  it('selects organisation-sponsored dossiers for organisation feedback', async () => {
    const repository: any = {
      findRecentOrganisationFeedbackTarget: jest.fn().mockResolvedValue({
        formation_id: 'formation-03',
        session_id: 'session-03',
        formation: {
          intitule: 'Leadership',
          mode_formation: 'AVEC_SESSION',
        },
      }),
    };
    const service = new FeedbackEligibilityService(repository);

    await expect(service.findForOrganisation('org-01', now)).resolves.toEqual(
      expect.objectContaining({
        actorType: 'ORGANISATION',
        actorId: 'org-01',
        formationId: 'formation-03',
      }),
    );
  });
});
