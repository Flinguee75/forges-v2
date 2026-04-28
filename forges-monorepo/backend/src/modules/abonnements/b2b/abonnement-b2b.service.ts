import { PrismaClient } from '@prisma/client';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';

// Paliers B2B
export const PALIERS_B2B = {
  STARTER:    { nb_max: 20,  prix_annuel: 250000 },
  BUSINESS:   { nb_max: 50,  prix_annuel: 500000 },
  ENTERPRISE: { nb_max: 100, prix_annuel: 900000, premium_inclus: 2 },
  SUR_DEVIS:  { nb_max: 999, prix_annuel: 0 }, // UCS13
};

export class AbonnementB2BService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger,
    private readonly email: EmailService
  ) {}

  // GET Mon abonnement B2B actif
  async getAbonnementActif(organisation_id: string) {
    const abo = await this.prisma.abonnementB2B.findFirst({
      where: {
        organisation_id,
        statut: 'ACTIF'
      }
    });

    if (!abo) {
      return null;
    }

    // RM-61 : Calcul dynamique du nombre d'apprenants actifs B2B
    const nb_actifs = await this.prisma.apprenant.count({
      where: {
        organisation_id,
        statut: 'ACTIF'
      }
    });

    // RM-115 : calcul taux_utilisation (déclencheur bot si > 80%)
    const taux_utilisation = abo.nb_max > 0 ? Math.round((nb_actifs / abo.nb_max) * 100) : 0;

    return {
      id: abo.id,
      palier: abo.palier,
      statut: abo.statut,
      nb_max: abo.nb_max,
      nb_actifs,
      taux_utilisation,
      prix_annuel: abo.prix_annuel,
      premium_inclus_par_an: abo.premium_inclus_par_an,
      premium_consommes: abo.premium_consommes,
      date_debut: abo.date_debut,
      date_fin: abo.date_fin,
      descente_planifiee: abo.descente_planifiee || false,
      palier_descente_cible: abo.palier_descente_cible,
    };
  }

  // UCS03.2 — Souscrire AbonnementB2B
  async souscrire(organisation_id: string, palier: keyof typeof PALIERS_B2B) {
    const normalizedPalier = this.normaliserPalier(palier);
    const config = PALIERS_B2B[normalizedPalier];

    if (!config) {
      throw new Error('PALIER_INVALIDE');
    }

    const existant = await this.prisma.abonnementB2B.findFirst({
      where: { organisation_id, statut: 'ACTIF' },
    });
    if (existant) throw new Error('ABONNEMENT_B2B_DEJA_ACTIF');

    const date_fin = new Date(Date.now() + 365 * 24 * 3600 * 1000);

    const abo = await this.prisma.abonnementB2B.create({
      data: {
        organisation_id,
        palier: normalizedPalier,
        nb_max: config.nb_max,
        nb_actifs: 0,
        prix_annuel: config.prix_annuel,
        premium_inclus_par_an: 'premium_inclus' in config ? (config as any).premium_inclus : 0,
        premium_consommes: 0,
        date_debut: new Date(),
        date_fin,
        statut: 'ACTIF',
      }
    });

    await this.prisma.organisation.update({
      where: { id: organisation_id },
      data: { abonnement_b2b_id: abo.id }
    });

    await this.audit.info('ABONNEMENT_B2B_SOUSCRIT', { organisation_id, palier: normalizedPalier });
    return abo;
  }

  // UCS12.1 — Montée en palier prorata (RM-68)
  async monterPalier(organisation_id: string, nouveauPalier: keyof typeof PALIERS_B2B) {
    const normalizedPalier = this.normaliserPalier(nouveauPalier);
    if (!normalizedPalier) {
      throw new Error('PALIER_INVALIDE');
    }

    const abo = await this.prisma.abonnementB2B.findFirst({
      where: { organisation_id, statut: 'ACTIF' }
    });
    if (!abo) throw new Error('ABONNEMENT_B2B_NOT_FOUND');

    const config = PALIERS_B2B[normalizedPalier];
    const ancienConfig = PALIERS_B2B[abo.palier as keyof typeof PALIERS_B2B];
    if (!ancienConfig) {
      throw new Error('PALIER_INVALIDE');
    }

    if (config.nb_max <= ancienConfig.nb_max) throw new Error('NOUVEAU_PALIER_INFERIEUR');

    // RM-68 : facturation différentiel prorata
    const joursRestants = Math.ceil((abo.date_fin.getTime() - Date.now()) / (24 * 3600 * 1000));
    const montantProrata = Math.floor((config.prix_annuel - ancienConfig.prix_annuel) * joursRestants / 365);

    await this.prisma.abonnementB2B.update({
      where: { id: abo.id },
      data: {
        palier: normalizedPalier,
        nb_max: config.nb_max,
        prix_annuel: config.prix_annuel,
        premium_inclus_par_an: 'premium_inclus' in config ? (config as any).premium_inclus : 0,
      }
    });

    await this.audit.info('ABONNEMENT_B2B_MONTEE_PALIER', { organisation_id, nouveauPalier: normalizedPalier, montant_prorata: montantProrata });
    return { montant_prorata: montantProrata, nouveau_palier: normalizedPalier };
  }

  // Scheduler — alertes expiration J-45 et J-15 (RM-66)
  async envoyerAlertesExpiration() {
    const now = new Date();
    const j45 = new Date(now.getTime() + 45 * 24 * 3600 * 1000);
    const j15 = new Date(now.getTime() + 15 * 24 * 3600 * 1000);

    const [abosJ45, abosJ15] = await Promise.all([
      this.prisma.abonnementB2B.findMany({
        where: { statut: 'ACTIF', date_fin: { gte: j45, lte: new Date(j45.getTime() + 24 * 3600 * 1000) } },
        include: { organisation: true }
      }),
      this.prisma.abonnementB2B.findMany({
        where: { statut: 'ACTIF', date_fin: { gte: j15, lte: new Date(j15.getTime() + 24 * 3600 * 1000) } },
        include: { organisation: true }
      })
    ]);

    for (const abo of [...abosJ45, ...abosJ15]) {
      await this.email.sendAlerteExpirationB2B(abo.organisation.email, abo.date_fin, abo.organisation.langue_preferee);
    }

    return { alertes_j45: abosJ45.length, alertes_j15: abosJ15.length };
  }

  // Scheduler — suspension B2B expiré (RM-67)
  async suspendreB2BExpires() {
    const abosExpires = await this.prisma.abonnementB2B.findMany({
      where: { statut: 'ACTIF', date_fin: { lt: new Date() } },
      include: { organisation: true }
    });

    for (const abo of abosExpires) {
      await this.prisma.abonnementB2B.update({
        where: { id: abo.id },
        data: { statut: 'EXPIRE' }
      });

      // RM-111 : suspension accès formations B2B
      // TODO: Implémenter la suspension des accès formations B2B
      // Model AccesFormationDemande non défini dans le schéma

      // await this.audit.warning('ABONNEMENT_B2B_EXPIRE', { organisation_id: abo.organisation_id });
    }

    return abosExpires.length;
  }

  private normaliserPalier(palier?: string): keyof typeof PALIERS_B2B | undefined {
    if (!palier || typeof palier !== 'string') {
      return undefined;
    }

    const normalized = palier.trim().toUpperCase();
    if (normalized in PALIERS_B2B) {
      return normalized as keyof typeof PALIERS_B2B;
    }

    return undefined;
  }
}
