import { randomBytes } from 'crypto';
import { AbonnementRetailRepository, TARIFS_RETAIL } from './abonnement-retail.repository';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';
import { PrismaClient } from '@prisma/client';

const NGSER_MOCK_BASE_URL = 'https://mock-ngser.forges.ci/pay';

export class AbonnementRetailService {
  constructor(
    private readonly aboRepo: AbonnementRetailRepository,
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger,
    private readonly email: EmailService
  ) {}

  // GET Mon abonnement retail actif
  async getAbonnementActif(apprenant_id: string) {
    const abo = await this.aboRepo.findActifByApprenant(apprenant_id);

    if (!abo) {
      return null;
    }

    return {
      id: abo.id,
      offre: abo.offre,
      statut: abo.statut,
      montant_mensuel: abo.montant_mensuel,
      date_debut: abo.date_debut,
      date_fin: abo.date_fin,
      renouvellement_auto: abo.renouvellement_auto,
      nb_formations_actives: abo.nb_formations_actives,
      downgrade_planifie: abo.downgrade_planifie,
      date_grace: abo.date_grace,
      date_suspension: abo.date_suspension,
    };
  }

  // Liste des formations incluses pour l'abonnement retail actif
  async getFormationsIncluses(apprenant_id: string) {
    const abo = await this.aboRepo.findActifByApprenant(apprenant_id);
    if (!abo) {
      return [];
    }

    return this.aboRepo.findFormationsIncluses();
  }

  // UCS11.1 — Souscrire abonnement Retail avec initiation paiement NGSER
  async souscrire(apprenant_id: string, offre: 'ESSENTIEL' | 'PREMIUM', langue: string) {
    // RM-70 : unicité abonnement Retail
    const existant = await this.aboRepo.findByApprenant(apprenant_id);
    if (existant) {
      // Idempotence : si en attente paiement, recréer une session NGSER
      if (existant.statut === 'EN_ATTENTE_PAIEMENT') {
        const session = await this.creerSessionNgser(existant.id, existant.montant_premier_mois ?? 0);
        return {
          abonnement: existant,
          montant_premier_mois: existant.montant_premier_mois ?? 0,
          payment_url: session.payment_url,
          order_ngser: existant.order_ngser,
        };
      }
      throw new Error('ABONNEMENT_DEJA_ACTIF');
    }

    const montant = TARIFS_RETAIL[offre];
    const maintenant = new Date();
    const date_fin = new Date(maintenant.getTime() + 30 * 24 * 3600 * 1000);

    // RM-106 : premier mois au prorata
    const joursRestantsMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0).getDate() - maintenant.getDate() + 1;
    const joursMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0).getDate();
    const montantProrata = Math.floor(montant * joursRestantsMois / joursMois);

    // Générer order_ngser avant création pour stocker sur l'abonnement
    const orderNgser = this.generateOrderNgser();

    const abonnement = await this.aboRepo.create({
      apprenant_id,
      offre,
      montant_mensuel: montant,
      date_debut: maintenant,
      date_fin,
      montant_premier_mois: montantProrata,
      // RM-75 : consentement auto obligatoire
      consentement_auto: true,
      consentement_timestamp: maintenant,
      order_ngser: orderNgser,
    });

    const session = await this.creerSessionNgser(abonnement.id, montantProrata);

    await this.audit.info('ABONNEMENT_RETAIL_SOUSCRIT_EN_ATTENTE', {
      apprenant_id,
      offre,
      montant_prorata: montantProrata,
      order_ngser: orderNgser,
    });

    return {
      abonnement,
      montant_premier_mois: montantProrata,
      payment_url: session.payment_url,
      order_ngser: orderNgser,
    };
  }

  private generateOrderNgser(date = new Date()): string {
    const year = date.getUTCFullYear();
    const start = Date.UTC(year, 0, 0);
    const dayOfYear = Math.floor((date.getTime() - start) / 86400000)
      .toString()
      .padStart(3, '0');
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    return `ABO-${year}-${dayOfYear}-${suffix}`;
  }

  private async creerSessionNgser(abonnement_id: string, montantXof: number): Promise<{ payment_url: string }> {
    const isMock = process.env.NGSER_MOCK_MODE !== 'false';
    // On récupère l'order_ngser depuis l'abonnement
    const abo = await this.prisma.abonnementRetail.findUnique({ where: { id: abonnement_id } });
    const order = abo?.order_ngser ?? this.generateOrderNgser();

    if (isMock) {
      return { payment_url: `${NGSER_MOCK_BASE_URL}?order=${order}` };
    }

    const { NgserClient } = await import('../../paiements/ngser.client');
    const ngserClient = new NgserClient(this.audit);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const notificationUrl = process.env.NGSER_NOTIFICATION_URL || 'http://localhost:3000/webhooks/paiement';
    const returnUrl = `${frontendUrl}/apprenant/abonnement/callback`;

    const session = await ngserClient.createSession({
      order,
      amount: montantXof, // déjà en XOF
      currency: 'XOF',
      notification_url: notificationUrl,
      return_url: returnUrl,
    });

    return { payment_url: session.payment_url };
  }

  // UCS11.1 — Upgrade Essentiel → Premium (RM-79)
  async upgrader(apprenant_id: string, langue: string) {
    const abo = await this.aboRepo.findActifByApprenant(apprenant_id);
    if (!abo) throw new Error('ABONNEMENT_NOT_FOUND');
    if (abo.offre === 'PREMIUM') throw new Error('DEJA_PREMIUM');

    // RM-79 : calcul différentiel prorata
    const maintenant = new Date();
    const joursRestants = Math.ceil((abo.date_fin.getTime() - maintenant.getTime()) / (24 * 3600 * 1000));
    const joursMois = 30;
    const montantProrata = Math.floor((TARIFS_RETAIL.PREMIUM - TARIFS_RETAIL.ESSENTIEL) * joursRestants / joursMois);

    // RM-79 : effectif immédiatement
    await this.aboRepo.upgrade(abo.id, montantProrata);

    await this.audit.info('ABONNEMENT_RETAIL_UPGRADE', { apprenant_id, montant_prorata: montantProrata });
    try {
      await this.email.sendUpgradeConfirmation(apprenant_id, montantProrata, langue);
    } catch (error: any) {
      await this.audit.warning('ABONNEMENT_RETAIL_UPGRADE_EMAIL_FAILED', {
        apprenant_id,
        montant_prorata: montantProrata,
        error: error?.message || 'UNKNOWN_ERROR',
      });
    }

    return { montant_prorata: montantProrata, effectif: 'immediat' };
  }

  // UCS11.1 — Downgrade Premium → Essentiel (RM-104)
  async planifierDowngrade(apprenant_id: string) {
    const abo = await this.aboRepo.findActifByApprenant(apprenant_id);
    if (!abo) throw new Error('ABONNEMENT_NOT_FOUND');
    if (abo.offre === 'ESSENTIEL') throw new Error('DEJA_ESSENTIEL');

    // RM-104 : planifié fin de période, pas immédiat
    await this.aboRepo.planifierDowngrade(abo.id);
    await this.audit.info('ABONNEMENT_RETAIL_DOWNGRADE_PLANIFIE', { apprenant_id, effectif: abo.date_fin });

    return {
      message: `Votre abonnement repassera à Essentiel à la fin de la période (${abo.date_fin.toLocaleDateString()}).`,
      effectif: abo.date_fin
    };
  }

  // UCS11.1 — Suspension volontaire (RM-76)
  async suspendre(apprenant_id: string, langue: string) {
    const abo = await this.aboRepo.findActifByApprenant(apprenant_id);
    if (!abo) throw new Error('ABONNEMENT_NOT_FOUND');

    // RM-76 : max 1 suspension par trimestre
    if (abo.suspension_count >= 1) {
      const derniereTrimestre = new Date(Date.now() - 90 * 24 * 3600 * 1000);
      if (abo.date_suspension && abo.date_suspension > derniereTrimestre) {
        throw new Error('SUSPENSION_LIMIT_ATTEINT');
      }
    }

    await this.aboRepo.suspendre(abo.id);

    // RM-105 : suspension AccesFormationDemande source=ABONNEMENT
    const { EspaceApprenantRepository } = await import('../../espace-apprenant/espace-apprenant.repository');
    const espaceRepo = new EspaceApprenantRepository(this.prisma);
    await espaceRepo.suspendreAccesByAbonnement(apprenant_id);

    await this.audit.info('ABONNEMENT_RETAIL_SUSPENDU', { apprenant_id });
    return { message: 'Abonnement suspendu. Vos accès formations sont suspendus (RM-105).' };
  }

  // RM-78 : réactivation après suspension
  async reactiver(apprenant_id: string) {
    const abo = await this.aboRepo.findByApprenant(apprenant_id);
    if (!abo || abo.statut !== 'SUSPENDU') throw new Error('ABONNEMENT_NON_SUSPENDU');

    await this.aboRepo.reactiver(abo.id);

    // RM-103 : réactivation automatique accès formations
    const { EspaceApprenantRepository } = await import('../../espace-apprenant/espace-apprenant.repository');
    const espaceRepo = new EspaceApprenantRepository(this.prisma);
    await espaceRepo.reactiverAccesByAbonnement(apprenant_id);

    await this.audit.info('ABONNEMENT_RETAIL_REACTIF', { apprenant_id });
    return { message: 'Abonnement réactivé. Vos accès formations sont rétablis.' };
  }

  // UCS11.1 — Résiliation (RM-77)
  async resilier(apprenant_id: string) {
    const abo = await this.aboRepo.findActifByApprenant(apprenant_id);
    if (!abo) throw new Error('ABONNEMENT_NOT_FOUND');

    // RM-77 : accès maintenu jusqu'à fin période, pas de remboursement
    await this.aboRepo.resilier(abo.id);
    await this.audit.info('ABONNEMENT_RETAIL_RESILIATION_DEMANDEE', { apprenant_id, effectif: abo.date_fin });

    return {
      message: `Résiliation prise en compte. Accès maintenu jusqu'au ${abo.date_fin.toLocaleDateString()} (RM-77).`,
      date_fin: abo.date_fin
    };
  }

  // UCS09.1 Scheduler — renouvellements automatiques
  async traiterRenouvellements() {
    const abos = await this.aboRepo.findARenouveler();
    let renouveles = 0, echecs = 0;

    for (const abo of abos) {
      try {
        // Simulation paiement (en prod : appel agrégateur)
        const succes = true; // Remplacer par appel API réel

        if (succes) {
          const nouvelleDateFin = new Date(abo.date_fin.getTime() + 30 * 24 * 3600 * 1000);
          await this.aboRepo.renouveler(abo.id, nouvelleDateFin);

          // Effectuer downgrade si planifié (RM-104)
          if (abo.downgrade_planifie) {
            await this.aboRepo.effectuerDowngrade(abo.id);
          }

          await this.audit.info('ABONNEMENT_RENOUVELE', { apprenant_id: abo.apprenant_id });
          renouveles++;
        } else {
          // RM-73 : grâce 48h avant suspension
          await this.aboRepo.suspendreGrace(abo.id);
          await this.email.sendEchecPrelevement(abo.apprenant.email, abo.apprenant.langue_preferee);
          echecs++;
        }
      } catch (error) { echecs++; }
    }

    return { renouveles, echecs };
  }

  // Scheduler — grâces expirées → suspension (RM-73)
  async traiterGracesExpires() {
    const abos = await this.aboRepo.findGracesExpirees();
    const { EspaceApprenantRepository } = await import('../../espace-apprenant/espace-apprenant.repository');
    const espaceRepo = new EspaceApprenantRepository(this.prisma);

    for (const abo of abos) {
      await this.aboRepo.suspendre(abo.id);
      await espaceRepo.suspendreAccesByAbonnement(abo.apprenant_id);
      await this.audit.warning('ABONNEMENT_SUSPENDU_GRACE_EXPIREE', { apprenant_id: abo.apprenant_id });
    }
    return abos.length;
  }

  // Scheduler — downgrade planifiés (RM-104)
  async traiterDowngradesPlanifies() {
    const abos = await this.aboRepo.findDowngradesPlanifies();
    for (const abo of abos) {
      await this.aboRepo.effectuerDowngrade(abo.id);
      await this.audit.info('ABONNEMENT_DOWNGRADE_EFFECTUE', { apprenant_id: abo.apprenant_id });
    }
    return abos.length;
  }
}
