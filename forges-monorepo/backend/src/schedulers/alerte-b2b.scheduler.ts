import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { EmailService } from '../shared/email/email.service';
import { AuditLogger } from '../shared/audit/audit.logger';

const DELAI_ALERTE_J45 = 45;
const DELAI_ALERTE_J15 = 15;

/**
 * AlerteB2BScheduler (Gap 6 - RM-66)
 *
 * Déclencheur : Quotidien à 09h00 (cron: 0 9 * * *)
 *
 * Logique :
 * 1. J-45 : Première alerte aux organisations dont AbonnementB2B expire dans exactement 45 jours
 * 2. J-15 : Rappel urgent aux organisations dont AbonnementB2B expire dans exactement 15 jours
 * 3. Seuls les abonnements statut=ACTIF sont notifiés
 * 4. AuditLog : ALERTE_EXPIRATION_B2B_J45 / ALERTE_EXPIRATION_B2B_J15
 */
export class AlerteB2BScheduler {
  private prisma: PrismaClient;
  private email: EmailService;
  private audit: AuditLogger;
  private task: cron.ScheduledTask | null = null;

  constructor() {
    this.prisma = new PrismaClient();
    this.email = new EmailService();
    this.audit = new AuditLogger();
  }

  start(): void {
    this.task = cron.schedule('0 9 * * *', async () => {
      console.log('[AlerteB2BScheduler] Exécution — Vérification expirations B2B...');
      await this.verifierAlertesExpiration();
    });
    console.log('[AlerteB2BScheduler] Démarré — cron: 0 9 * * *');
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      console.log('[AlerteB2BScheduler] Arrêté');
    }
  }

  /**
   * Calcule la fenêtre [début, fin) du jour cible (aujourd'hui + nbJours)
   */
  private getFenetreJour(now: Date, nbJours: number): { debut: Date; fin: Date } {
    const debut = new Date(now);
    debut.setHours(0, 0, 0, 0);
    debut.setDate(debut.getDate() + nbJours);

    const fin = new Date(debut);
    fin.setDate(fin.getDate() + 1);

    return { debut, fin };
  }

  private async verifierAlertesExpiration(now: Date = new Date()): Promise<void> {
    try {
      await this.envoyerAlertes(now, DELAI_ALERTE_J45, 'ALERTE_EXPIRATION_B2B_J45');
      await this.envoyerAlertes(now, DELAI_ALERTE_J15, 'ALERTE_EXPIRATION_B2B_J15');
    } catch (error) {
      console.error('[AlerteB2BScheduler] Erreur globale:', error);
      await this.audit.error('SCHEDULER_ALERTE_B2B_FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async envoyerAlertes(now: Date, nbJours: number, auditAction: string): Promise<void> {
    const { debut, fin } = this.getFenetreJour(now, nbJours);

    const abonnements = await this.prisma.abonnementB2B.findMany({
      where: {
        statut: 'ACTIF',
        date_fin: { gte: debut, lt: fin },
      },
      include: { organisation: true },
    });

    if (abonnements.length === 0) {
      return;
    }

    for (const abo of abonnements) {
      try {
        const organisation = abo.organisation;
        const langue = organisation.langue_preferee || 'FR';

        await this.email.sendAlerteExpirationB2B(
          organisation.email,
          abo.date_fin,
          langue
        );

        await this.audit.info(auditAction, {
          abonnement_id: abo.id,
          organisation_id: organisation.id,
          date_fin: abo.date_fin,
          jours_restants: nbJours,
        });

        console.log(
          `[AlerteB2BScheduler] ${auditAction} envoyée pour abonnement ${abo.id} (${organisation.raison_sociale})`
        );
      } catch (error) {
        console.error(`[AlerteB2BScheduler] Erreur traitement abonnement ${abo.id}:`, error);
        await this.audit.error('ALERTE_B2B_ERROR', {
          abonnement_id: abo.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Exécution manuelle (pour tests)
   */
  async executeNow(now: Date = new Date()): Promise<void> {
    console.log('[AlerteB2BScheduler] Exécution manuelle déclenchée');
    await this.verifierAlertesExpiration(now);
  }
}
