import * as cron from 'node-cron';
import type { PrismaClient } from '@prisma/client';
import { EmailService } from '../shared/email/email.service';
import { AuditLogger } from '../shared/audit/audit.logger';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DELAI_ALERTE_J5 = 5;
const DELAI_ESCALADE_J10 = 10;

/**
 * AlerteValidationScheduler (Gap 4 - RM-134)
 *
 * Déclencheur : Quotidien à 08h00 (cron: 0 8 * * *)
 *
 * Logique :
 * 1. Chercher FormationPartenaire statut_validation=EN_ATTENTE soumises il y a exactement 5 ou 10 jours
 * 2. J+5 : Email Responsable désigné + Admin (sendAlerteValidationJ5)
 * 3. J+10 : Escalade Admin uniquement (sendAlerteValidationJ10)
 * 4. AuditLog chaque envoi
 */
export class AlerteValidationScheduler {
  private task: cron.ScheduledTask | null = null;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly email: EmailService,
    private readonly audit: AuditLogger,
  ) {}

  start(): void {
    this.task = cron.schedule('0 8 * * *', async () => {
      console.log('[AlerteValidationScheduler] Exécution — Vérification formations en attente...');
      await this.verifierFormationsEnAttente();
    });
    console.log('[AlerteValidationScheduler] Démarré — cron: 0 8 * * *');
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      console.log('[AlerteValidationScheduler] Arrêté');
    }
  }

  /**
   * Calcule le nombre de jours entiers écoulés entre une date passée et aujourd'hui
   */
  private getJoursEcoules(dateReference: Date, now: Date): number {
    const diffMs = now.getTime() - dateReference.getTime();
    return Math.floor(diffMs / MS_PER_DAY);
  }

  private async verifierFormationsEnAttente(): Promise<void> {
    try {
      const now = new Date();
      const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || process.env.DEFAULT_RESPONSABLE_EMAIL || 'admin@forges.local';

      const formationsEnAttente = await this.prisma.formationPartenaire.findMany({
        where: { statut_validation: 'EN_ATTENTE' },
        include: {
          partenaire: true,
          formation: true,
        },
      });

      if (formationsEnAttente.length === 0) {
        console.log('[AlerteValidationScheduler] Aucune formation en attente');
        return;
      }

      for (const formation of formationsEnAttente) {
        const joursEcoules = this.getJoursEcoules(formation.date_soumission, now);

        if (joursEcoules !== DELAI_ALERTE_J5 && joursEcoules !== DELAI_ESCALADE_J10) {
          continue;
        }

        try {
          const partenaire = formation.partenaire;
          const formationDetails = formation.formation;
          const dateSoumissionFormatee = formation.date_soumission.toLocaleDateString('fr-FR');

          if (joursEcoules === DELAI_ALERTE_J5) {
            const responsableEmail = await this.getResponsableEmail(formation.responsable_validateur_id);

            await this.email.sendAlerteValidationJ5(
              responsableEmail,
              adminEmail,
              formationDetails.intitule,
              partenaire.raison_sociale,
              dateSoumissionFormatee,
              formation.id,
              'FR'
            );

            await this.audit.warning('VALIDATION_DELAI_DEPASSE_J5', {
              formation_id: formation.id,
              partenaire_id: formation.partenaire_id,
              jours_ecoules: joursEcoules,
            });

            console.log(`[AlerteValidationScheduler] Alerte J+5 envoyée pour formation ${formation.id}`);
          } else {
            await this.email.sendAlerteValidationJ10(
              adminEmail,
              formationDetails.intitule,
              partenaire.raison_sociale,
              dateSoumissionFormatee,
              joursEcoules,
              formation.id,
              'FR'
            );

            await this.audit.warning('VALIDATION_DELAI_DEPASSE_J10', {
              formation_id: formation.id,
              partenaire_id: formation.partenaire_id,
              jours_ecoules: joursEcoules,
            });

            console.log(`[AlerteValidationScheduler] Escalade J+10 envoyée pour formation ${formation.id}`);
          }
        } catch (error) {
          console.error(`[AlerteValidationScheduler] Erreur traitement formation ${formation.id}:`, error);
          await this.audit.error('ALERTE_VALIDATION_ERROR', {
            formation_id: formation.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      console.error('[AlerteValidationScheduler] Erreur globale:', error);
      await this.audit.error('SCHEDULER_ALERTE_VALIDATION_FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Récupère l'email du responsable désigné (Apprenant role=RESPONSABLE)
   * Fallback vers DEFAULT_RESPONSABLE_EMAIL si non défini
   */
  private async getResponsableEmail(responsableId: string | null): Promise<string> {
    const fallback = process.env.DEFAULT_RESPONSABLE_EMAIL || 'responsable@forges.local';

    if (!responsableId) {
      return fallback;
    }

    const responsable = await this.prisma.apprenant.findUnique({
      where: { id: responsableId },
      select: { email: true },
    });

    return responsable?.email || fallback;
  }

  /**
   * Exécution manuelle (pour tests)
   */
  async executeNow(): Promise<void> {
    console.log('[AlerteValidationScheduler] Exécution manuelle déclenchée');
    await this.verifierFormationsEnAttente();
  }
}
