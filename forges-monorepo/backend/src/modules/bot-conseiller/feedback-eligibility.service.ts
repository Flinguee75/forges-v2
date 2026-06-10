import { BotRepository } from './bot.repository';

export interface FeedbackTarget {
  actorType: 'APPRENANT' | 'ORGANISATION';
  actorId: string;
  formationId: string;
  sessionId: string | null;
  formationIntitule: string;
  modeFormation: string;
}

export class FeedbackEligibilityService {
  constructor(private readonly repository: BotRepository) {}

  async findForApprenant(apprenantId: string, now = new Date()): Promise<FeedbackTarget | null> {
    const sessionTarget = await this.repository.findRecentSessionFeedbackTarget(apprenantId, now);
    if (sessionTarget) {
      return this.mapTarget('APPRENANT', apprenantId, sessionTarget);
    }

    const accessTarget = await this.repository.findExpiredOnDemandFeedbackTarget(apprenantId, now);
    return accessTarget
      ? this.mapTarget('APPRENANT', apprenantId, { ...accessTarget, session_id: null })
      : null;
  }

  async findForOrganisation(organisationId: string, now = new Date()): Promise<FeedbackTarget | null> {
    const target = await this.repository.findRecentOrganisationFeedbackTarget(organisationId, now);
    return target ? this.mapTarget('ORGANISATION', organisationId, target) : null;
  }

  private mapTarget(
    actorType: 'APPRENANT' | 'ORGANISATION',
    actorId: string,
    target: any,
  ): FeedbackTarget {
    return {
      actorType,
      actorId,
      formationId: target.formation_id,
      sessionId: target.session_id ?? null,
      formationIntitule: target.formation.intitule,
      modeFormation: target.formation.mode_formation,
    };
  }
}
