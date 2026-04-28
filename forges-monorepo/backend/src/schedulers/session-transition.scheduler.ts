import * as cron from 'node-cron';
import type { PrismaClient } from '@prisma/client';
import { prisma } from '../shared/prisma/prisma.client';
import { AuditLogger } from '../shared/audit/audit.logger';

/**
 * SessionTransitionScheduler (Gap 1.2 - RM-20, RM-21)
 *
 * Déclencheur : Quotidien à 00h00 (cron: 0 0 * * *)
 *
 * Logique RM-20 (Transitions automatiques):
 * - PLANIFIEE → OUVERTE (si date_ouverture <= NOW())
 * - OUVERTE → EN_COURS (si date_debut <= NOW())
 * - EN_COURS → CLOTUREE (si date_fin <= NOW())
 *
 * Logique RM-21 (Archivage automatique):
 * - CLOTUREE → ARCHIVEE (si date_fin < NOW() - 90 jours)
 *
 * Note : Les transitions sont idempotentes - on vérifie toujours l'état actuel avant transition
 */
export class SessionTransitionScheduler {
  private prisma: PrismaClient;
  private audit: AuditLogger;
  private task: cron.ScheduledTask | null = null;

  constructor() {
    this.prisma = prisma;
    this.audit = new AuditLogger();
  }

  /**
   * Démarre le scheduler (quotidien à minuit)
   */
  start(): void {
    // Cron: 0 0 * * * = tous les jours à 00h00
    this.task = cron.schedule('0 0 * * *', async () => {
      console.log('[SessionTransitionScheduler] Exécution — Vérification transitions sessions...');
      await this.verifierTransitions();
    });

    console.log('[SessionTransitionScheduler] Démarré — cron: 0 0 * * *');
  }

  /**
   * Arrête le scheduler
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      console.log('[SessionTransitionScheduler] Arrêté');
    }
  }

  /**
   * Logique principale : effectuer toutes les transitions de sessions
   */
  private async verifierTransitions(): Promise<void> {
    try {
      const now = new Date();

      // RM-20: Transitions automatiques
      await this.transitionPlanifieeVersOuverte(now);
      await this.transitionOuverteVersEnCours(now);
      await this.transitionEnCoursVersCloturee(now);

      // RM-21: Archivage +90 jours
      await this.archiverSessionsClotureesAnciennes(now);

      console.log('[SessionTransitionScheduler] Vérification terminée');
    } catch (error) {
      console.error('[SessionTransitionScheduler] Erreur globale:', error);
      await this.audit.error('SCHEDULER_SESSION_TRANSITION_FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * PLANIFIEE → OUVERTE (si date_ouverture <= NOW())
   */
  private async transitionPlanifieeVersOuverte(now: Date): Promise<void> {
    try {
      const sessions = await this.prisma.session.findMany({
        where: {
          statut: 'PLANIFIEE',
          date_ouverture: {
            lte: now,
          },
        },
      });

      if (sessions.length === 0) {
        console.log('[SessionTransitionScheduler] PLANIFIEE → OUVERTE : Aucune session à transitionner');
        return;
      }

      console.log(`[SessionTransitionScheduler] PLANIFIEE → OUVERTE : ${sessions.length} session(s) trouvée(s)`);

      for (const session of sessions) {
        try {
          await this.prisma.session.update({
            where: { id: session.id },
            data: {
              statut: 'OUVERTE',
            },
          });

          await this.audit.info('SESSION_TRANSITION_AUTO', {
            session_id: session.id,
            formation_id: session.formation_id,
            transition: 'PLANIFIEE → OUVERTE',
            date_ouverture: session.date_ouverture,
            date_transition: now,
          });

          console.log(`[SessionTransitionScheduler] Session ${session.id} : PLANIFIEE → OUVERTE`);
        } catch (error) {
          console.error(`[SessionTransitionScheduler] Erreur transition session ${session.id}:`, error);
          await this.audit.error('SESSION_TRANSITION_ERROR', {
            session_id: session.id,
            transition: 'PLANIFIEE → OUVERTE',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      console.error('[SessionTransitionScheduler] Erreur PLANIFIEE → OUVERTE:', error);
    }
  }

  /**
   * OUVERTE → EN_COURS (si date_debut <= NOW())
   */
  private async transitionOuverteVersEnCours(now: Date): Promise<void> {
    try {
      const sessions = await this.prisma.session.findMany({
        where: {
          statut: 'OUVERTE',
          date_debut: {
            lte: now,
          },
        },
      });

      if (sessions.length === 0) {
        console.log('[SessionTransitionScheduler] OUVERTE → EN_COURS : Aucune session à transitionner');
        return;
      }

      console.log(`[SessionTransitionScheduler] OUVERTE → EN_COURS : ${sessions.length} session(s) trouvée(s)`);

      for (const session of sessions) {
        try {
          await this.prisma.session.update({
            where: { id: session.id },
            data: {
              statut: 'EN_COURS',
            },
          });

          await this.audit.info('SESSION_TRANSITION_AUTO', {
            session_id: session.id,
            formation_id: session.formation_id,
            transition: 'OUVERTE → EN_COURS',
            date_debut: session.date_debut,
            date_transition: now,
          });

          console.log(`[SessionTransitionScheduler] Session ${session.id} : OUVERTE → EN_COURS`);
        } catch (error) {
          console.error(`[SessionTransitionScheduler] Erreur transition session ${session.id}:`, error);
          await this.audit.error('SESSION_TRANSITION_ERROR', {
            session_id: session.id,
            transition: 'OUVERTE → EN_COURS',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      console.error('[SessionTransitionScheduler] Erreur OUVERTE → EN_COURS:', error);
    }
  }

  /**
   * EN_COURS → CLOTUREE (si date_fin <= NOW())
   */
  private async transitionEnCoursVersCloturee(now: Date): Promise<void> {
    try {
      const sessions = await this.prisma.session.findMany({
        where: {
          statut: 'EN_COURS',
          date_fin: {
            lte: now,
          },
        },
      });

      if (sessions.length === 0) {
        console.log('[SessionTransitionScheduler] EN_COURS → CLOTUREE : Aucune session à transitionner');
        return;
      }

      console.log(`[SessionTransitionScheduler] EN_COURS → CLOTUREE : ${sessions.length} session(s) trouvée(s)`);

      for (const session of sessions) {
        try {
          await this.prisma.session.update({
            where: { id: session.id },
            data: {
              statut: 'CLOTUREE',
            },
          });

          await this.audit.info('SESSION_TRANSITION_AUTO', {
            session_id: session.id,
            formation_id: session.formation_id,
            transition: 'EN_COURS → CLOTUREE',
            date_fin: session.date_fin,
            date_transition: now,
          });

          console.log(`[SessionTransitionScheduler] Session ${session.id} : EN_COURS → CLOTUREE`);
        } catch (error) {
          console.error(`[SessionTransitionScheduler] Erreur transition session ${session.id}:`, error);
          await this.audit.error('SESSION_TRANSITION_ERROR', {
            session_id: session.id,
            transition: 'EN_COURS → CLOTUREE',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      console.error('[SessionTransitionScheduler] Erreur EN_COURS → CLOTUREE:', error);
    }
  }

  /**
   * CLOTUREE → ARCHIVEE (si date_fin < NOW() - 90 jours) - RM-21
   */
  private async archiverSessionsClotureesAnciennes(now: Date): Promise<void> {
    try {
      // Calculer la date il y a 90 jours
      const dateArchivage = new Date(now);
      dateArchivage.setDate(dateArchivage.getDate() - 90);

      const sessions = await this.prisma.session.findMany({
        where: {
          statut: 'CLOTUREE',
          date_fin: {
            lt: dateArchivage, // date_fin < NOW() - 90 jours
          },
        },
      });

      if (sessions.length === 0) {
        console.log('[SessionTransitionScheduler] CLOTUREE → ARCHIVEE : Aucune session à archiver');
        return;
      }

      console.log(`[SessionTransitionScheduler] CLOTUREE → ARCHIVEE : ${sessions.length} session(s) trouvée(s) (>90j)`);

      for (const session of sessions) {
        try {
          await this.prisma.session.update({
            where: { id: session.id },
            data: {
              statut: 'ARCHIVEE',
            },
          });

          await this.audit.info('SESSION_ARCHIVAGE_AUTO', {
            session_id: session.id,
            formation_id: session.formation_id,
            date_fin: session.date_fin,
            date_archivage: now,
            jours_ecoules: Math.floor((now.getTime() - session.date_fin.getTime()) / (1000 * 3600 * 24)),
          });

          console.log(`[SessionTransitionScheduler] Session ${session.id} : CLOTUREE → ARCHIVEE (${Math.floor((now.getTime() - session.date_fin.getTime()) / (1000 * 3600 * 24))} jours)`);
        } catch (error) {
          console.error(`[SessionTransitionScheduler] Erreur archivage session ${session.id}:`, error);
          await this.audit.error('SESSION_ARCHIVAGE_ERROR', {
            session_id: session.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      console.error('[SessionTransitionScheduler] Erreur CLOTUREE → ARCHIVEE:', error);
    }
  }

  /**
   * Exécution manuelle (pour tests)
   */
  async executeNow(): Promise<void> {
    console.log('[SessionTransitionScheduler] Exécution manuelle déclenchée');
    await this.verifierTransitions();
  }
}
