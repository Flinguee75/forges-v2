import * as cron from 'node-cron';
import type { PrismaClient } from '@prisma/client';
import { prisma } from '../shared/prisma/prisma.client';
import { AuditLogger } from '../shared/audit/audit.logger';

/**
 * CommissionAgregateurScheduler (Gap 2 - RM-146)
 *
 * Déclencheur : J+1 fin de mois à 06h00 (cron: 0 6 1 * *)
 *
 * Logique RM-146 (Agrégation mensuelle commissions apporteur):
 * 1. Récupérer toutes les CommissionApporteur statut=EN_ATTENTE du mois écoulé
 * 2. Grouper par apporteur_id
 * 3. Transition EN_ATTENTE → VALIDEE pour toutes les commissions du mois écoulé
 * 4. Calculer le cumul par apporteur
 * 5. Si cumul >= SEUIL_REVERSEMENT_APPORTEUR_XOF :
 *    - Créer un reversement (effectuerReversements déjà implémenté)
 *    - Statut VALIDEE → REVERSEE
 *    - AuditLog COMMISSIONS_REVERSEES_APPORTEUR
 * 6. Si cumul < seuil :
 *    - Report au mois suivant (commissions restent en VALIDEE)
 *    - AuditLog COMMISSIONS_AGREGEES_RAPPORT_REPORTE
 *
 * Note : Ce scheduler déclenche l'agrégation. L'Agent Comptable peut ensuite déclencher
 * manuellement effectuerReversements() si besoin.
 */
export class CommissionAgregateurScheduler {
  private prisma: PrismaClient;
  private audit: AuditLogger;
  private task: cron.ScheduledTask | null = null;

  constructor() {
    this.prisma = prisma;
    this.audit = new AuditLogger();
  }

  /**
   * Démarre le scheduler (J+1 fin de mois à 06h00)
   */
  start(): void {
    // Cron: 0 6 1 * * = Le 1er de chaque mois à 06h00
    this.task = cron.schedule('0 6 1 * *', async () => {
      console.log('[CommissionAgregateurScheduler] Exécution — Agrégation mensuelle commissions apporteurs...');
      await this.agregerCommissionsMoisEcoule(new Date());
    });

    console.log('[CommissionAgregateurScheduler] Démarré — cron: 0 6 1 * * (1er du mois à 06h00)');
  }

  /**
   * Arrête le scheduler
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      console.log('[CommissionAgregateurScheduler] Arrêté');
    }
  }

  /**
   * Logique principale : agréger les commissions du mois écoulé
   */
  private async agregerCommissionsMoisEcoule(now: Date = new Date()): Promise<void> {
    try {

      // Calculer le premier et dernier jour du mois écoulé
      const premierJourMoisEcoule = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const dernierJourMoisEcoule = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      const moisFacturation = `${premierJourMoisEcoule.getFullYear()}-${String(premierJourMoisEcoule.getMonth() + 1).padStart(2, '0')}`;

      console.log(`[CommissionAgregateurScheduler] Période : ${moisFacturation} (${premierJourMoisEcoule.toISOString()} - ${dernierJourMoisEcoule.toISOString()})`);

      // 1. Récupérer toutes les CommissionApporteur statut=EN_ATTENTE du mois écoulé
      const commissionsEnAttente = await this.prisma.commissionApporteur.findMany({
        where: {
          statut: 'EN_ATTENTE',
          date_generation: {
            gte: premierJourMoisEcoule,
            lte: dernierJourMoisEcoule,
          },
        },
        include: {
          apporteur: true,
        },
      });

      if (commissionsEnAttente.length === 0) {
        console.log('[CommissionAgregateurScheduler] Aucune commission EN_ATTENTE trouvée pour le mois écoulé');
        await this.audit.info('COMMISSIONS_AGREGATION_VIDE', {
          mois_facturation: moisFacturation,
          nb_commissions: 0,
        });
        return;
      }

      console.log(`[CommissionAgregateurScheduler] ${commissionsEnAttente.length} commission(s) EN_ATTENTE trouvée(s)`);

      // 2. Grouper par apporteur_id
      const commissionsParApporteur = new Map<string, typeof commissionsEnAttente>();

      commissionsEnAttente.forEach((commission) => {
        if (!commissionsParApporteur.has(commission.apporteur_id)) {
          commissionsParApporteur.set(commission.apporteur_id, []);
        }
        commissionsParApporteur.get(commission.apporteur_id)!.push(commission);
      });

      console.log(`[CommissionAgregateurScheduler] ${commissionsParApporteur.size} apporteur(s) concerné(s)`);

      // 3. Transition EN_ATTENTE → VALIDEE pour toutes les commissions
      await this.prisma.commissionApporteur.updateMany({
        where: {
          statut: 'EN_ATTENTE',
          date_generation: {
            gte: premierJourMoisEcoule,
            lte: dernierJourMoisEcoule,
          },
        },
        data: {
          statut: 'VALIDEE',
          mois_facturation: moisFacturation,
        },
      });

      console.log('[CommissionAgregateurScheduler] Toutes les commissions passées en statut VALIDEE');

      // 4. Pour chaque apporteur, calculer le cumul et décider du reversement
      const seuilReversement = parseInt(process.env.SEUIL_REVERSEMENT_APPORTEUR_XOF || '5000', 10); // 5000 XOF par défaut

      for (const [apporteurId, commissions] of commissionsParApporteur.entries()) {
        try {
          // Calculer le cumul des commissions VALIDEES (pas uniquement ce mois-ci)
          const cumulTotal = await this.prisma.commissionApporteur.aggregate({
            where: {
              apporteur_id: apporteurId,
              statut: 'VALIDEE',
            },
            _sum: {
              montant_commission_xof: true,
            },
          });

          const montantCumulXof = cumulTotal._sum.montant_commission_xof || 0;
          const nbCommissions = commissions.length;
          const apporteur = commissions[0].apporteur;

          console.log(`[CommissionAgregateurScheduler] Apporteur ${apporteurId} : ${nbCommissions} commission(s), cumul = ${montantCumulXof} XOF`);

          // 5. Si cumul >= seuil : reversement automatique
          if (montantCumulXof >= seuilReversement) {
            console.log(`[CommissionAgregateurScheduler] Apporteur ${apporteurId} : cumul >= seuil (${seuilReversement} XOF) → Reversement déclenché`);

            // Marquer les commissions comme REVERSEE
            await this.prisma.commissionApporteur.updateMany({
              where: {
                apporteur_id: apporteurId,
                statut: 'VALIDEE',
              },
              data: {
                statut: 'REVERSEE',
                reverse_le: now,
                reverse_par: 'SYSTEM_AUTO', // Automatique
              },
            });

            // AuditLog reversement
            await this.audit.info('COMMISSIONS_REVERSEES_APPORTEUR', {
              apporteur_id: apporteurId,
              apporteur_email: apporteur.email,
              nb_commissions: nbCommissions,
              montant_reverse_xof: montantCumulXof,
              mois_facturation: moisFacturation,
              methode: 'automatique',
            });

            console.log(`[CommissionAgregateurScheduler] Apporteur ${apporteurId} : ${nbCommissions} commission(s) reversées (${montantCumulXof} XOF)`);
          } else {
            // 6. Si cumul < seuil : report au mois suivant
            console.log(`[CommissionAgregateurScheduler] Apporteur ${apporteurId} : cumul < seuil (${seuilReversement} XOF) → Report au mois suivant`);

            await this.audit.info('COMMISSIONS_AGREGEES_RAPPORT_REPORTE', {
              apporteur_id: apporteurId,
              apporteur_email: apporteur.email,
              nb_commissions: nbCommissions,
              montant_cumul_xof: montantCumulXof,
              seuil_minimum_xof: seuilReversement,
              mois_facturation: moisFacturation,
            });
          }
        } catch (error) {
          console.error(`[CommissionAgregateurScheduler] Erreur traitement apporteur ${apporteurId}:`, error);
          await this.audit.error('COMMISSION_AGREGATION_ERROR', {
            apporteur_id: apporteurId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      console.log(`[CommissionAgregateurScheduler] Agrégation terminée — ${commissionsEnAttente.length} commission(s) traitée(s)`);
    } catch (error) {
      console.error('[CommissionAgregateurScheduler] Erreur globale:', error);
      await this.audit.error('SCHEDULER_COMMISSION_AGREGATEUR_FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Exécution manuelle (pour tests)
   */
  async executeNow(now: Date = new Date()): Promise<void> {
    console.log('[CommissionAgregateurScheduler] Exécution manuelle déclenchée');
    await this.agregerCommissionsMoisEcoule(now);
  }
}
