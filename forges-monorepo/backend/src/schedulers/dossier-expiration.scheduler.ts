import * as cron from 'node-cron';
import type { PrismaClient } from '@prisma/client';
import { prisma } from '../shared/prisma/prisma.client';
import { EmailService } from '../shared/email/email.service';
import { AuditLogger } from '../shared/audit/audit.logger';
import { getDelaiPaiementH } from '../config/env.config';

/**
 * DossierExpirationScheduler (Gap 1.1 - RM-07)
 *
 * Déclencheur : Toutes les heures (cron: 0 * * * *)
 *
 * Logique :
 * 1. Interroger Dossier WHERE statut=RETENU AND expires_at < NOW()
 * 2. Transition RETENU → ANNULE
 * 3. AuditLog('DOSSIER_ANNULE_EXPIRATION', { dossier_id, motif: 'Délai de paiement expiré' })
 * 4. Déclencher EmailService.sendDossierAnnule(apprenant.email, formation, langue_preferee)
 * 5. Libérer places session (decrementPlacesOccupees)
 */
export class DossierExpirationScheduler {
  private prisma: PrismaClient;
  private email: EmailService;
  private audit: AuditLogger;
  private task: cron.ScheduledTask | null = null;

  constructor() {
    this.prisma = prisma;
    this.email = new EmailService();
    this.audit = new AuditLogger();
  }

  /**
   * Démarre le scheduler (toutes les heures)
   */
  start(): void {
    // Cron: 0 * * * * = toutes les heures à la minute 0
    this.task = cron.schedule('0 * * * *', async () => {
      console.log('[DossierExpirationScheduler] Exécution — Vérification dossiers expirés...');
      await this.verifierDossiersExpires();
    });

    console.log('[DossierExpirationScheduler] Démarré — cron: 0 * * * *');
  }

  /**
   * Arrête le scheduler
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      console.log('[DossierExpirationScheduler] Arrêté');
    }
  }

  /**
   * Logique principale : annuler les dossiers RETENU expirés
   */
  private async verifierDossiersExpires(): Promise<void> {
    try {
      const now = new Date();

      // Interroger les dossiers RETENU expirés
      const dossiersExpires = await this.prisma.dossier.findMany({
        where: {
          statut: 'RETENU',
          expires_at: {
            lt: now, // expires_at < NOW()
          },
        },
        include: {
          apprenant: true,
          session: {
            include: {
              formation: true,
            },
          },
        },
      });

      if (dossiersExpires.length === 0) {
        console.log('[DossierExpirationScheduler] Aucun dossier expiré trouvé');
        return;
      }

      console.log(`[DossierExpirationScheduler] ${dossiersExpires.length} dossier(s) expiré(s) trouvé(s)`);

      // Traiter chaque dossier expiré
      for (const dossier of dossiersExpires) {
        try {
          // 1. Transition RETENU → ANNULE
          await this.prisma.dossier.update({
            where: { id: dossier.id },
            data: {
              statut: 'ANNULE',
              updated_at: now,
            },
          });

          // 2. AuditLog
          await this.audit.info('DOSSIER_ANNULE_EXPIRATION', {
            dossier_id: dossier.id,
            apprenant_id: dossier.apprenant_id,
            session_id: dossier.session_id,
            motif: `Délai de paiement expiré - Aucun paiement reçu (${getDelaiPaiementH()}h)`,
            expires_at: dossier.expires_at,
            date_annulation: now,
          });

          // 3. Libérer la place dans la session
          await this.prisma.session.update({
            where: { id: dossier.session_id },
            data: {
              nb_inscrits: {
                decrement: 1,
              },
              places_restantes: {
                increment: 1,
              },
            },
          });

          // 4. Envoyer email d'annulation (Gap 3 - RM-07)
          const { apprenant, session } = dossier;
          const { formation } = session;

          // Récupérer langue préférée (RM-100)
          const langue = (apprenant.langue_preferee as 'FR' | 'EN' | 'ES' | 'PT') || 'FR';

          await this.email.sendDossierAnnule(
            apprenant.email,
            `${apprenant.prenoms} ${apprenant.nom}`,
            formation.intitule,
            session.date_debut.toLocaleDateString('fr-FR'),
            session.date_fin.toLocaleDateString('fr-FR'),
            `Délai de paiement expiré (${getDelaiPaiementH()} heures)`, // motif
            langue
          );

          console.log(`[DossierExpirationScheduler] Dossier ${dossier.id} annulé — Email envoyé à ${apprenant.email}`);
        } catch (error) {
          console.error(`[DossierExpirationScheduler] Erreur traitement dossier ${dossier.id}:`, error);
          await this.audit.error('DOSSIER_EXPIRATION_ERROR', {
            dossier_id: dossier.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      console.log(`[DossierExpirationScheduler] Traitement terminé — ${dossiersExpires.length} dossier(s) annulé(s)`);
    } catch (error) {
      console.error('[DossierExpirationScheduler] Erreur globale:', error);
      await this.audit.error('SCHEDULER_DOSSIER_EXPIRATION_FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Exécution manuelle (pour tests)
   */
  async executeNow(): Promise<void> {
    console.log('[DossierExpirationScheduler] Exécution manuelle déclenchée');
    await this.verifierDossiersExpires();
  }
}
