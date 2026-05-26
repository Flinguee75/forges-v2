import * as cron from 'node-cron';
import type { PrismaClient } from '@prisma/client';
import { AuditLogger } from '../shared/audit/audit.logger';

const DUREE_MOIS_DEFAUT = 1;

/**
 * ReversementAbonnementScheduler (Gap 5 - RM-132)
 *
 * Déclencheur : J+1 fin de mois à 07h00 (cron: 0 7 1 * *)
 *
 * Logique :
 * 1. Récupérer toutes les FormationPartenaire inclus_abonnement=true
 * 2. Compter nb_apprenants_actifs (AccesFormationDemande statut=ACTIF, source_financement=ABONNEMENT)
 *    sur le mois précédent
 * 3. Formule RM-132 : reversement = nb_apprenants_actifs × prix_coutant_valide / duree_mois
 * 4. Créer CommissionPartenaireAbonnement statut=EN_ATTENTE
 * 5. AuditLog chaque calcul
 */
export class ReversementAbonnementScheduler {
  private task: cron.ScheduledTask | null = null;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger,
  ) {}

  start(): void {
    this.task = cron.schedule('0 7 1 * *', async () => {
      console.log('[ReversementAbonnementScheduler] Exécution — Calcul reversements abonnement...');
      await this.calculerReversementsMensuels();
    });
    console.log('[ReversementAbonnementScheduler] Démarré — cron: 0 7 1 * *');
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      console.log('[ReversementAbonnementScheduler] Arrêté');
    }
  }

  /**
   * Calcule les bornes du mois précédent (celui qui vient de se terminer)
   */
  private getBornesMoisPrecedent(now: Date): { debut: Date; fin: Date; reference: string } {
    const annee = now.getFullYear();
    const mois = now.getMonth(); // 0-11, mois courant

    // Mois précédent
    const debut = new Date(annee, mois - 1, 1, 0, 0, 0, 0);
    const fin = new Date(annee, mois, 1, 0, 0, 0, 0);

    const moisRef = String(debut.getMonth() + 1).padStart(2, '0');
    const reference = `${debut.getFullYear()}-${moisRef}`;

    return { debut, fin, reference };
  }

  private async calculerReversementsMensuels(now: Date = new Date()): Promise<void> {
    try {
      const { debut, fin, reference } = this.getBornesMoisPrecedent(now);

      const formationsIncluses = await this.prisma.formationPartenaire.findMany({
        where: {
          inclus_abonnement: true,
          statut_validation: 'VALIDEE',
          prix_coutant_valide: { not: null },
        },
      });

      if (formationsIncluses.length === 0) {
        console.log('[ReversementAbonnementScheduler] Aucune formation incluse dans abonnement');
        return;
      }

      for (const formation of formationsIncluses) {
        try {
          await this.traiterFormation(formation, debut, fin, reference);
        } catch (error) {
          console.error(`[ReversementAbonnementScheduler] Erreur formation ${formation.id}:`, error);
          await this.audit.error('COMMISSION_ABONNEMENT_ERROR', {
            formation_partenaire_id: formation.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      console.error('[ReversementAbonnementScheduler] Erreur globale:', error);
      await this.audit.error('SCHEDULER_REVERSEMENT_ABONNEMENT_FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async traiterFormation(
    formation: { id: string; formation_id: string; partenaire_id: string; prix_coutant_valide: number | null; duree_mois: number | null },
    debut: Date,
    fin: Date,
    reference: string
  ): Promise<void> {
    // Idempotence : skip si déjà calculé pour ce mois
    const existant = await this.prisma.commissionPartenaireAbonnement.findFirst({
      where: {
        formation_id: formation.id,
        mois_reference: reference,
      },
    });

    if (existant) {
      console.log(`[ReversementAbonnementScheduler] Skip ${formation.id} - déjà calculé pour ${reference}`);
      return;
    }

    const nbApprenants = await this.prisma.accesFormationDemande.count({
      where: {
        formation_id: formation.formation_id,
        statut: 'ACTIF',
        source_financement: 'ABONNEMENT',
        date_activation: { lt: fin },
        date_expiration: { gte: debut },
      },
    });

    if (nbApprenants === 0) {
      return;
    }

    const prixCoutant = formation.prix_coutant_valide || 0;
    const dureeMois = formation.duree_mois && formation.duree_mois > 0 ? formation.duree_mois : DUREE_MOIS_DEFAUT;
    const reversementMensuel = Math.floor((nbApprenants * prixCoutant) / dureeMois);

    if (reversementMensuel <= 0) {
      return;
    }

    await this.prisma.commissionPartenaireAbonnement.create({
      data: {
        partenaire_id: formation.partenaire_id,
        formation_id: formation.id,
        nb_apprenants_actifs: nbApprenants,
        montant_reverse: reversementMensuel,
        mois_reference: reference,
        statut: 'EN_ATTENTE',
      },
    });

    await this.audit.info('COMMISSION_ABONNEMENT_CALCULEE', {
      formation_partenaire_id: formation.id,
      partenaire_id: formation.partenaire_id,
      nb_apprenants: nbApprenants,
      montant_reverse: reversementMensuel,
      mois_reference: reference,
    });

    console.log(
      `[ReversementAbonnementScheduler] ${formation.id} - ${nbApprenants} apprenants - ${reversementMensuel} XOF (${reference})`
    );
  }

  /**
   * Exécution manuelle (pour tests)
   */
  async executeNow(now: Date = new Date()): Promise<void> {
    console.log('[ReversementAbonnementScheduler] Exécution manuelle déclenchée');
    await this.calculerReversementsMensuels(now);
  }
}
