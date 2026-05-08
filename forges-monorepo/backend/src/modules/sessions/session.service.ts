import { SessionRepository } from './session.repository';
import { FormationRepository } from '../formations/formation.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { CreateSessionDto, PlanificationAnnuelleDto } from './dto/session.dto';

export class SessionService {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly formationRepo: FormationRepository,
    private readonly audit: AuditLogger,
    private readonly email: EmailService
  ) {}

  async create(dto: CreateSessionDto, userId: string) {
    const formation = await this.formationRepo.findById(dto.formation_id);
    if (!formation) throw new Error('FORMATION_NOT_FOUND');

    // RM-96 : pas de session pour formations à la demande
    if (formation.mode_formation === 'A_LA_DEMANDE') {
      throw new Error('SESSION_IMPOSSIBLE_FORMATION_DEMANDE');
    }

    // RM-04 : validation délai traitement obligatoire (≥3 jours avant ouverture inscriptions)
    const DELAI_TRAITEMENT_MINIMUM = 3; // jours
    const dateOuverture = new Date(dto.date_ouverture);
    const maintenant = new Date();
    const joursAvantOuverture = Math.floor(
      (dateOuverture.getTime() - maintenant.getTime()) / (24 * 3600 * 1000)
    );

    if (joursAvantOuverture < DELAI_TRAITEMENT_MINIMUM) {
      throw new Error('DELAI_TRAITEMENT_INSUFFISANT');
    }

    const dateDebut = new Date(dto.date_debut);
    const dateFin = new Date(dto.date_fin);

    // RM-17 : vérification non-chevauchement
    const chevauchements = await this.sessionRepo.findChevauchements(
      dto.formation_id, dateDebut, dateFin
    );
    if (chevauchements.length > 0) {
      throw new Error(`SESSION_OVERLAP:${chevauchements.map(s => s.id).join(',')}`);
    }

    const session = await this.sessionRepo.create({
      formation_id: dto.formation_id,
      date_ouverture: new Date(dto.date_ouverture),
      date_cloture: new Date(dto.date_cloture),
      date_debut: dateDebut,
      date_fin: dateFin,
      capacite: dto.capacite,
    });

    await this.audit.info('SESSION_CREEE', { session_id: session.id, formation_id: dto.formation_id, user_id: userId });
    return session;
  }

  async update(id: string, dto: Partial<CreateSessionDto>, userId: string) {
    const session = await this.sessionRepo.findById(id);
    if (!session) throw new Error('SESSION_NOT_FOUND');

    // RM-24 : notification si inscrits
    const hasInscrits = await this.sessionRepo.hasInscrits(id);

    // Validation chronologie si dates modifiées
    const nouvDates = {
      date_ouverture: dto.date_ouverture ? new Date(dto.date_ouverture) : session.date_ouverture,
      date_cloture: dto.date_cloture ? new Date(dto.date_cloture) : session.date_cloture,
      date_debut: dto.date_debut ? new Date(dto.date_debut) : session.date_debut,
      date_fin: dto.date_fin ? new Date(dto.date_fin) : session.date_fin,
    };

    // RM-16 : vérification chronologie
    if (!(nouvDates.date_ouverture < nouvDates.date_cloture &&
          nouvDates.date_cloture < nouvDates.date_debut &&
          nouvDates.date_debut < nouvDates.date_fin)) {
      throw new Error('CHRONOLOGY_ERROR');
    }

    // RM-17 : non-chevauchement
    if (dto.date_debut || dto.date_fin) {
      const chevauchements = await this.sessionRepo.findChevauchements(
        session.formation_id, nouvDates.date_debut, nouvDates.date_fin, id
      );
      if (chevauchements.length > 0) {
        throw new Error(`SESSION_OVERLAP:${chevauchements.map(s => s.id).join(',')}`);
      }
    }

    const updated = await this.sessionRepo.update(id, {
      date_ouverture: nouvDates.date_ouverture,
      date_cloture: nouvDates.date_cloture,
      date_debut: nouvDates.date_debut,
      date_fin: nouvDates.date_fin,
      capacite: dto.capacite,
    });

    await this.audit.info('SESSION_MODIFIEE', { session_id: id, user_id: userId, has_inscrits: hasInscrits });

    // RM-24 : signal pour notification manuelle (pas automatique)
    return { session: updated, notification_requise: hasInscrits };
  }

  // RM-25 : planification annuelle en masse
  async planifierAnnuelle(dto: PlanificationAnnuelleDto, userId: string) {
    const formation = await this.formationRepo.findById(dto.formation_id);
    if (!formation) throw new Error('FORMATION_NOT_FOUND');
    if (formation.mode_formation === 'A_LA_DEMANDE') throw new Error('SESSION_IMPOSSIBLE_FORMATION_DEMANDE');

    const sessions = [];
    let dateOuverture = new Date(dto.premiere_date_ouverture);

    for (let i = 0; i < dto.nb_sessions; i++) {
      const dateCloture = new Date(dateOuverture.getTime() + dto.duree_inscription_jours * 24 * 3600 * 1000);
      const dateDebut = new Date(dateCloture.getTime() + 24 * 3600 * 1000);
      const dateFin = new Date(dateDebut.getTime() + dto.duree_session_jours * 24 * 3600 * 1000);

      // Vérification chevauchement pour chaque session
      const chevauchements = await this.sessionRepo.findChevauchements(dto.formation_id, dateDebut, dateFin);
      if (chevauchements.length === 0) {
        const session = await this.sessionRepo.create({
          formation_id: dto.formation_id,
          date_ouverture: dateOuverture,
          date_cloture: dateCloture,
          date_debut: dateDebut,
          date_fin: dateFin,
          capacite: dto.capacite,
        });
        sessions.push(session);
      }

      // Avancer à la prochaine date
      dateOuverture = new Date(dateOuverture.getTime() + dto.frequence_semaines * 7 * 24 * 3600 * 1000);
    }

    await this.audit.info('PLANIFICATION_ANNUELLE', {
      formation_id: dto.formation_id,
      nb_sessions_creees: sessions.length,
      user_id: userId
    });

    return { sessions_creees: sessions.length, sessions };
  }

  // RM-25 : création en masse de sessions (format libre)
  async createBulk(sessionsData: any[], userId: string) {
    const sessionsCreated = [];
    for (const data of sessionsData) {
      // Vérifier que la formation existe
      const formation = await this.formationRepo.findById(data.formation_id);
      if (!formation) throw new Error('FORMATION_NOT_FOUND');
      if (formation.mode_formation === 'A_LA_DEMANDE') throw new Error('SESSION_IMPOSSIBLE_FORMATION_DEMANDE');

      // Vérifier chronologie (RM-16)
      if (data.date_ouverture >= data.date_cloture || data.date_cloture >= data.date_debut || data.date_debut >= data.date_fin) {
        throw new Error('CHRONOLOGY_ERROR');
      }

      // Vérifier chevauchement (RM-17)
      const chevauchements = await this.sessionRepo.findChevauchements(data.formation_id, data.date_debut, data.date_fin);
      if (chevauchements.length > 0) continue; // Skip si chevauchement

      const session = await this.sessionRepo.create(data);
      sessionsCreated.push(session);
    }

    await this.audit.info('SESSIONS_BULK_CREATED', {
      nb_sessions: sessionsCreated.length,
      user_id: userId
    });

    return { sessions: sessionsCreated, created: sessionsCreated.length };
  }

  async closeManually(id: string, userId: string) {
    const session = await this.sessionRepo.findById(id);
    if (!session) throw new Error('SESSION_NOT_FOUND');
    if (session.statut !== 'OUVERTE') throw new Error('INVALID_STATUT');

    await this.sessionRepo.archivePendingDossiers(id);
    const updated = await this.sessionRepo.updateStatut(id, 'CLOTUREE');
    await this.audit.info('SESSION_CLOTUREE', { session_id: id, user_id: userId });
    return updated;
  }

  async cancel(id: string, userId: string) {
    const session = await this.sessionRepo.findById(id);
    if (!session) throw new Error('SESSION_NOT_FOUND');
    if (!['PLANIFIEE', 'OUVERTE'].includes(session.statut)) throw new Error('INVALID_STATUT');

    await this.sessionRepo.archivePendingDossiers(id);
    const updated = await this.sessionRepo.updateStatut(id, 'ANNULEE');
    await this.audit.info('SESSION_ANNULEE', { session_id: id, user_id: userId });
    return updated;
  }

  // RM-20 : scheduler — transitions automatiques
  async transitionnerStatuts() {
    const now = new Date();
    const sessions = await this.sessionRepo.findSessionsATransitionner();
    let transitions = 0;

    for (const session of sessions) {
      let nouveauStatut: string | null = null;

      if (session.statut === 'PLANIFIEE' && now >= session.date_ouverture) {
        nouveauStatut = 'A_VENIR';
      } else if (session.statut === 'A_VENIR' && now >= session.date_cloture) {
        nouveauStatut = 'INSCRIPTIONS_OUVERTES';
      } else if (session.statut === 'INSCRIPTIONS_OUVERTES' && now >= session.date_debut) {
        nouveauStatut = 'EN_COURS';
      } else if (session.statut === 'EN_COURS' && now >= session.date_fin) {
        nouveauStatut = 'CLOTUREE';
      }

      if (nouveauStatut) {
        await this.sessionRepo.updateStatut(session.id, nouveauStatut);
        await this.audit.info('SESSION_TRANSITION', {
          session_id: session.id,
          ancien_statut: session.statut,
          nouveau_statut: nouveauStatut
        });
        transitions++;
      }
    }

    return transitions;
  }

  // RM-21 : scheduler — archivage sessions clôturées depuis > 90j
  async archiverSessionsAnciennnes() {
    const sessions = await this.sessionRepo.findSessionsAArchiver();
    for (const session of sessions) {
      await this.sessionRepo.updateStatut(session.id, 'ARCHIVEE');
      await this.audit.info('SESSION_ARCHIVEE', { session_id: session.id });
    }
    return sessions.length;
  }

  async getAll() {
    return this.sessionRepo.findAll();
  }

  async getById(id: string) {
    const session = await this.sessionRepo.findById(id);
    if (!session) throw new Error('SESSION_NOT_FOUND');
    return session;
  }

  async getDossiers(id: string) {
    const session = await this.sessionRepo.findById(id);
    if (!session) throw new Error('SESSION_NOT_FOUND');
    return this.sessionRepo.findDossiersBySession(id);
  }

  async getByFormation(formation_id: string) {
    return this.sessionRepo.findByFormation(formation_id);
  }

  async getDisponibles(formation_id: string) {
    return this.sessionRepo.findDisponibles(formation_id);
  }

  async list(filters: {
    formation_id?: string;
    statut?: string;
    superviseur_id?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    return this.sessionRepo.findAllBackoffice(filters);
  }
}
