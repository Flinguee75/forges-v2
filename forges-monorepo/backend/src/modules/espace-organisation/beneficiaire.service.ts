import { EspaceOrganisationRepository } from './espace-organisation.repository';
import { ImportCSVService } from './import-csv.service';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { CommissionService } from '../paiements/commission.service';
import { PaiementReglementService } from '../paiements/paiement-reglement.service';
import { PaiementInitialisationService } from '../paiements/paiement-initialisation.service';

export class BeneficiaireService {
  private readonly reglementService: PaiementReglementService;
  private readonly paiementInit: PaiementInitialisationService;

  constructor(
    private readonly orgRepo: EspaceOrganisationRepository,
    private readonly importCSV: ImportCSVService,
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger,
    private readonly email: EmailService
  ) {
    this.reglementService = new PaiementReglementService(
      prisma,
      audit,
      new CommissionService(prisma, audit)
    );
    this.paiementInit = new PaiementInitialisationService(prisma);
  }

  // UCS12 — Liste bénéficiaires (RM-44)
  async getBeneficiaires(organisation_id: string, filters?: any) {
    return this.orgRepo.findBeneficiaires(organisation_id, filters ?? {});
  }

  // UCS12 — Import CSV bénéficiaires (RM-59)
  async importerBeneficiairesCSV(csvContent: string, organisation_id: string, userId: string) {
    // RM-61 : vérification plafond B2B avant import (guard rapide, non transactionnel)
    // Limitation connue : ce check n'est pas dans une transaction sérialisable.
    // Des requêtes simultanées peuvent passer le check et dépasser le plafond le temps
    // que ImportCSVService traite chaque ligne. Le check ligne par ligne dans
    // ImportCSVService constitue le garde-fou effectif pour l'import en lot.
    const org = await this.orgRepo.findOrganisationById(organisation_id);
    const quota = await this.getB2BQuota(organisation_id, org);
    if (quota && !quota.canAddMember) {
      throw new Error('B2B_PLAFOND_ATTEINT');
    }

    return this.importCSV.importerBeneficiaires(
      csvContent,
      organisation_id,
      userId,
      quota ? { b2bQuota: { nbMax: quota.nbMax } } : undefined
    );
  }

  // UCS12.1 — Dashboard B2B
  async getDashboardB2B(organisation_id: string) {
    const org = await this.orgRepo.findOrganisationById(organisation_id);
    if (!org?.abonnement_b2b) throw new Error('ABONNEMENT_B2B_INACTIF');

    const nbActifs = await this.orgRepo.countActifsB2B(organisation_id);
    const b2b = org.abonnement_b2b;

    return {
      palier: b2b.palier,
      nb_max: b2b.nb_max,
      nb_actifs: nbActifs,
      places_restantes: b2b.nb_max - nbActifs,
      taux_utilisation: Math.round(nbActifs / b2b.nb_max * 100),
      // RM-69 : alerte si plafond proche
      alerte_plafond: nbActifs >= b2b.nb_max * 0.9,
      date_renouvellement: b2b.date_renouvellement,
    };
  }

  // UCS12.1 — Désactivation apprenant B2B (RM-62 : certifications conservées)
  async desactiverBeneficiaire(apprenant_id: string, organisation_id: string, userId: string) {
    const apprenant = await this.prisma.apprenant.findFirst({
      where: { id: apprenant_id, organisation_id }
    });

    if (!apprenant) throw new Error('APPRENANT_NOT_FOUND');

    // RM-62 : désactivation seulement — pas de suppression — certifications conservées
    await this.prisma.$transaction(async (tx) => {
      await tx.apprenant.update({
        where: { id: apprenant_id },
        data: { statut: 'INACTIF' }
      });
    });

    await this.audit.info('BENEFICIAIRE_DESACTIVE', {
      apprenant_id,
      organisation_id,
      user_id: userId,
      note: 'Certifications conservées (RM-62)'
    });

    return { message: 'Bénéficiaire désactivé. Ses certifications sont conservées (RM-62).' };
  }

  // UCS12 — Créer un membre individuel
  async createMembre(organisation_id: string, data: any) {
    // Phase 1 : lectures seules, avant la transaction
    const existing = await this.prisma.apprenant.findUnique({
      where: { email: data.email }
    });
    if (existing) throw new Error('EMAIL_DEJA_UTILISE');

    const org = await this.orgRepo.findOrganisationById(organisation_id);

    // Hash CPU-bound effectué hors transaction pour ne pas bloquer les slots DB
    const tempPassword = uuidv4().substring(0, 12) + 'A1!';
    const password_hash = await hash(tempPassword, 12);

    // Phase 2 : transaction sérialisable — re-compter dans la transaction pour éviter la race
    let apprenant: any;
    await this.prisma.$transaction(async (tx) => {
      const quota = await this.getB2BQuotaInTransaction(tx, organisation_id, org);
      if (quota && !quota.canAddMember) {
        throw new Error('B2B_PLAFOND_ATTEINT');
      }

      apprenant = await tx.apprenant.create({
        data: {
          email: data.email,
          password_hash,
          nom: data.nom,
          prenoms: data.prenom,
          secteur_activite: data.secteur_activite,
          niveau_etude: data.niveau_etude,
          organisation_id,
          statut: 'ACTIF',
          type_apprenant: 'PROFESSIONNEL',
          pays_residence: 'SN',
          pays_nationalite: 'SN',
          langue_preferee: 'FR',
          consentement_rgpd: false,
          consentement_timestamp: new Date(),
          consentement_version_cgu: '1.0',
        }
      });
    }, { isolationLevel: 'Serializable' });

    // Phase 3 : effets de bord hors transaction
    await this.audit.info('MEMBRE_CREE', {
      apprenant_id: apprenant.id,
      organisation_id,
    });

    // Fire-and-forget : l'échec d'envoi d'email ne doit pas faire échouer la création
    this.email.sendTempPassword(data.email, tempPassword, 'FR').catch(() => undefined);

    return { message: 'Membre créé avec succès', apprenant };
  }

  // UCS12 — Inscrire un bénéficiaire à une formation (org initie l'inscription)
  async inscrireBeneficiaire(organisation_id: string, data: {
    beneficiaire_id: string;
    session_id: string;
    source_financement: 'B2B' | 'VOUCHER';
    voucher_organisation_id?: string;
  }): Promise<{ dossier_id: string; statut: string }> {
    // 1. Vérifier que le bénéficiaire appartient à l'org
    const beneficiaire = await this.prisma.apprenant.findFirst({
      where: { id: data.beneficiaire_id, organisation_id }
    });
    if (!beneficiaire) throw new Error('APPRENANT_NON_BENEFICIAIRE');

    // 2. Vérifier unicité — pas déjà inscrit à cette session
    const existing = await this.prisma.dossier.findFirst({
      where: { apprenant_id: data.beneficiaire_id, session_id: data.session_id }
    });
    if (existing) throw new Error('INSCRIPTION_DEJA_EXISTANTE');

    // 3. Récupérer session + formation
    const session = await (this.prisma as any).session.findUnique({
      where: { id: data.session_id },
      include: { formation: { include: { partenaire: true } } },
    });
    if (!session) throw new Error('SESSION_NOT_FOUND');
    if (typeof session.places_restantes === 'number' && session.places_restantes <= 0) {
      throw new Error('SESSION_COMPLETE');
    }

    // RM-15 : unicité apprenant/formation cross-sessions
    const inscriptionFormation = await this.prisma.dossier.findFirst({
      where: {
        apprenant_id: data.beneficiaire_id,
        formation_id: session.formation_id,
        statut: { notIn: ['ANNULE', 'REJETE'] },
      },
    });
    if (inscriptionFormation) throw new Error('INSCRIPTION_DEJA_EXISTANTE');

    const extraData: Record<string, any> = {};
    let voucherOrg: any = null;

    if (data.source_financement === 'B2B') {
      // 4a. Vérifier l'abonnement B2B, sans consommer une place supplémentaire.
      const org = await this.orgRepo.findOrganisationById(organisation_id);
      if (!org?.abonnement_b2b) throw new Error('ABONNEMENT_B2B_INACTIF');
    } else {
      // 4b. Valider le VoucherOrganisation
      voucherOrg = await (this.prisma as any).voucherOrganisation.findFirst({
        where: { id: data.voucher_organisation_id, organisation_id, statut: 'ACTIF' }
      });
      if (!voucherOrg) throw new Error('VOUCHER_INVALIDE');
      if (voucherOrg.formation_id && voucherOrg.formation_id !== session.formation_id) {
        throw new Error('VOUCHER_WRONG_FORMATION');
      }
      extraData.voucher_organisation_id = data.voucher_organisation_id;
    }

    const montant = session?.formation?.cout_catalogue ?? 0;

    // 5. Créer le dossier — org couvre toujours le coût → statut PAYE
    const dossier = await this.prisma.dossier.create({
      data: {
        apprenant_id: data.beneficiaire_id,
        session_id: data.session_id,
        formation_id: session.formation_id,
        source_financement: data.source_financement,
        statut: 'PAYE',
        organisation_inscriptrice_id: organisation_id,
        ...extraData,
      } as any,
    });

    // 6. Créer le paiement interne puis le confirmer
    await this.creerPaiementOrganisationConfirme(
      dossier,
      session,
      montant,
      data.source_financement === 'B2B' ? 'B2B_ORG' : 'VOUCHER_ORG'
    );

    // 7. Incrémenter quota du voucher organisation si utilisé
    if (voucherOrg) {
      const updatedVoucher = await (this.prisma as any).voucherOrganisation.update({
        where: { id: voucherOrg.id },
        data: { quota_utilise: { increment: 1 } },
      });
      if (updatedVoucher.quota_max && updatedVoucher.quota_utilise >= updatedVoucher.quota_max) {
        await (this.prisma as any).voucherOrganisation.update({
          where: { id: voucherOrg.id },
          data: { statut: 'EPUISE' },
        });
      }
    }

    // 8. Notification email au bénéficiaire
    await (this.email as any).sendEmail({
      to: beneficiaire.email,
      subject: 'Votre organisation vous a inscrit a une formation',
      html: '<p>Votre organisation vous a inscrit a une formation. Consultez votre espace apprenant.</p>',
    });

    // 9. Audit
    await this.audit.info('BENEFICIAIRE_INSCRIT_PAR_ORGANISATION', {
      organisation_id,
      beneficiaire_id: data.beneficiaire_id,
      session_id: data.session_id,
      source_financement: data.source_financement,
      dossier_id: dossier.id,
    });

    return { dossier_id: dossier.id, statut: 'PAYE' };
  }

  private async getB2BQuota(organisation_id: string, org?: any) {
    if (!org?.abonnement_b2b) return null;

    const nbActifs = await this.orgRepo.countActifsB2B(organisation_id);
    return this.buildB2BQuota(org.abonnement_b2b.nb_max, nbActifs);
  }

  private async getB2BQuotaInTransaction(tx: any, organisation_id: string, org?: any) {
    if (!org?.abonnement_b2b) return null;

    const nbActifs = await tx.apprenant.count({
      where: { organisation_id, statut: 'ACTIF' }
    });
    return this.buildB2BQuota(org.abonnement_b2b.nb_max, nbActifs);
  }

  private buildB2BQuota(nbMax: number, nbActifs: number) {
    const placesRestantes = Math.max(nbMax - nbActifs, 0);

    return {
      nbMax,
      nbActifs,
      placesRestantes,
      canAddMember: placesRestantes > 0,
      canImportMembers: placesRestantes > 0,
      canEnrollBeneficiary: true,
    };
  }

  private async creerPaiementOrganisationConfirme(
    dossier: any,
    session: any,
    montant: number,
    methode: 'B2B_ORG' | 'VOUCHER_ORG'
  ) {
    const paiement = await this.paiementInit.creerOuRecuperer({
      dossier_id: dossier.id,
      montant_catalogue: montant,
      montant_final: montant,
      reduction_appliquee: 0,
      methode,
      statut: 'EN_ATTENTE',
    });

    if (paiement.statut === 'CONFIRME') return paiement;

    await this.reglementService.confirmerProvider({
      paiement: {
        ...paiement,
        dossier: {
          ...dossier,
          formation: session.formation,
          session,
        },
      },
      transactionId: `ORG-${methode}-${dossier.id}`,
      providerStatus: 'SUCCESS',
      payload: { source: methode },
    });

    return paiement;
  }
}
