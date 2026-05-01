import { PaiementRepository } from './paiement.repository';
import { CommissionRepository } from './commission.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { VoucherRepository } from '../vouchers/voucher.repository';
import { PrismaClient } from '@prisma/client';
import { InitierPaiementDto, InitierPaiementNgserDto } from './dto/paiement.dto';
import { PaiementNgserService } from './paiement-ngser.service';
import { IpnNgserService } from './ipn-ngser.service';
import { CommissionService } from './commission.service';

const MAX_TENTATIVES = 3;      // RM-08
const DELAI_PAIEMENT_H = 72;  // RM-07
const TIMEOUT_API_S = 30;      // RM-09

export class PaiementService {
  private ipnNgserService: IpnNgserService;
  private commissionService: CommissionService;

  constructor(
    private readonly paiementRepo: PaiementRepository,
    private readonly commissionRepo: CommissionRepository,
    private readonly voucherRepo: VoucherRepository,
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger,
    private readonly email: EmailService,
    private readonly paiementNgserService = new PaiementNgserService(prisma, voucherRepo, audit)
  ) {
    this.commissionService = new CommissionService(prisma, audit);
    this.ipnNgserService = new IpnNgserService(prisma, audit, this.commissionService);
  }

  async initierPaiementNgser(dto: InitierPaiementNgserDto, apprenantId: string) {
    return this.paiementNgserService.initierPaiement(dto, apprenantId);
  }

  async initierPaiement(dto: InitierPaiementDto, apprenantId: string) {
    const dossier = await this.prisma.dossier.findUnique({
      where: { id: dto.dossier_id },
      include: { formation: true, session: true }
    });

    if (!dossier) throw new Error('DOSSIER_NOT_FOUND');
    if (dossier.apprenant_id !== apprenantId) throw new Error('FORBIDDEN');

    // RM-06 : vérifier paiement existant AVANT de vérifier le statut dossier
    const paiementExistant = await this.paiementRepo.findByDossierId(dto.dossier_id);

    if (paiementExistant) {
      // RM-06 : bloquer si paiement déjà validé
      if (paiementExistant.statut === 'CONFIRME') {
        throw new Error('PAIEMENT_DEJA_VALIDE');
      }

      // RM-08 : max 3 tentatives (vérifier AVANT expiration)
      if (paiementExistant.tentatives >= MAX_TENTATIVES) throw new Error('TOO_MANY_ATTEMPTS');

      // RM-07 : vérifier expiration (seulement si expires_at existe)
      if (paiementExistant.expires_at && paiementExistant.expires_at < new Date()) {
        throw new Error('PAYMENT_EXPIRED');
      }

      await this.paiementRepo.incrementerTentatives(paiementExistant.id);

      // Appel agrégateur externe
      const paymentUrl = await this.appelAgregateur(dto, paiementExistant.montant_final);
      return { paiement_id: paiementExistant.id, payment_url: paymentUrl };
    }

    // Vérifier statut dossier UNIQUEMENT si pas de paiement existant
    if (!['RETENU', 'PAYE_DIRECTEMENT'].includes(dossier.statut)) {
      throw new Error('DOSSIER_STATUT_INVALIDE');
    }

    // Calcul montant avec réductions éventuelles
    const montantFinal = await this.calculerMontantFinal(dossier, apprenantId);
    const reduction = dossier.formation.cout_catalogue - montantFinal;

    // Création paiement
    const expires_at = new Date(Date.now() + DELAI_PAIEMENT_H * 3600 * 1000); // RM-07
    const paiement = await this.paiementRepo.create({
      dossier_id: dto.dossier_id,
      montant_catalogue: dossier.formation.cout_catalogue,
      montant_final: montantFinal,
      reduction_appliquee: reduction,
      methode: dto.methode,
      expires_at,
    });

    await this.audit.info('PAIEMENT_INITIE', {
      paiement_id: paiement.id,
      dossier_id: dto.dossier_id,
      montant: montantFinal,
      apprenant_id: apprenantId
    });

    const paymentUrl = await this.appelAgregateur(dto, montantFinal);
    return { paiement_id: paiement.id, payment_url: paymentUrl };
  }

  // RM-88 : réduction -15% si abonné actif + formation Premium
  async calculerMontantFinal(dossier: any, apprenantId: string): Promise<number> {
    const montant = dossier.formation.cout_catalogue;

    // Appliquer remise voucher promotionnel si présent (RM-42)
    if (dossier.voucher_code) {
      const voucher = await this.voucherRepo.findByCode(dossier.voucher_code);
      if (voucher && voucher.type === 'PROMOTIONNEL') {
        if (voucher.type_valeur === 'MONTANT') {
          return Math.max(0, montant - voucher.valeur);
        } else if (voucher.type_valeur === 'POURCENTAGE') {
          return Math.floor(montant * (1 - voucher.valeur / 100));
        }
      }
    }

    // RM-88 : réduction -15% abonné actif sur Premium
    if (dossier.formation.type_formation === 'PREMIUM') {
      const abonnement = await this.prisma.abonnementRetail.findFirst({
        where: { apprenant_id: apprenantId, statut: 'ACTIF' }
      });
      if (abonnement) {
        return Math.floor(montant * 0.85); // -15%
      }
    }

    return montant;
  }

  // RM-09 : appel agrégateur avec timeout 30s
  private async appelAgregateur(dto: InitierPaiementDto, montant: number): Promise<string> {
    // Intégration MTN/Orange Money — URL de paiement retournée par l'agrégateur
    // En production : appel API avec timeout 30s
    return `https://pay.aggregateur.ci/checkout?ref=${dto.dossier_id}&amount=${montant}&method=${dto.methode}`;
  }

  // Webhook — confirmation paiement (RM-09)
  async confirmerPaiement(webhookData: {
    transaction_id: string;
    dossier_id: string;
    statut: 'SUCCESS' | 'FAILED';
    montant: number;
  }) {
    // Idempotence : vérifier si déjà traité
    const existant = await this.paiementRepo.findByTransactionId(webhookData.transaction_id);
    if (existant) return { message: 'ALREADY_PROCESSED' };

    const paiement = await this.paiementRepo.findByDossierId(webhookData.dossier_id);
    if (!paiement) throw new Error('PAIEMENT_NOT_FOUND');

    if (webhookData.statut === 'SUCCESS') {
      // Confirmer le paiement
      await this.paiementRepo.confirmer(paiement.id, webhookData.transaction_id);

      // Passer le dossier en PAYE
      await this.prisma.dossier.update({
        where: { id: webhookData.dossier_id },
        data: { statut: 'PAYE' }
      });

      // Calcul commissions
      await this.calculerCommissions(paiement, webhookData.dossier_id);

      // Utiliser le voucher si présent (incrémenter quota)
      const dossier = await this.prisma.dossier.findUnique({ where: { id: webhookData.dossier_id } });
      if (dossier?.voucher_code) {
        const voucher = await this.voucherRepo.findByCode(dossier.voucher_code);
        if (voucher) await this.voucherRepo.utiliser(voucher.id);
      }

      await this.audit.info('PAIEMENT_CONFIRME', {
        paiement_id: paiement.id,
        transaction_id: webhookData.transaction_id,
        montant: webhookData.montant
      });

      // RM-100 : notification email apprenant
      const dossierComplet = await this.prisma.dossier.findUnique({
        where: { id: webhookData.dossier_id },
        include: { apprenant: true, formation: true }
      });
      if (dossierComplet) {
        try {
          await this.email.sendPaiementConfirme(
            dossierComplet.apprenant.email,
            dossierComplet.formation.intitule,
            dossierComplet.apprenant.langue_preferee
          );
        } catch (error: any) {
          await this.audit.warning('PAIEMENT_CONFIRME_EMAIL_FAILED', {
            paiement_id: paiement.id,
            dossier_id: webhookData.dossier_id,
            error: error?.message || 'UNKNOWN_ERROR'
          });
        }
      }

    } else {
      await this.paiementRepo.echouer(paiement.id);
      await this.audit.warning('PAIEMENT_ECHOUE', { paiement_id: paiement.id });
    }

    return { statut: webhookData.statut };
  }

  // Calcul commissions partenaire et apporteur
  async calculerCommissions(paiement: any, dossier_id: string) {
    const dossier = await this.prisma.dossier.findUnique({
      where: { id: dossier_id },
      include: {
        formation: { include: { partenaire: true } },
        apprenant: true
      }
    });

    if (!dossier) return;

    // RM-129 : commission partenaire
    if (dossier.formation.partenaire_id && dossier.formation.partenaire) {
      const commissionPct = dossier.formation.partenaire.commission_forges_pct;
      const montantReverse = Math.floor(paiement.montant_final * (1 - commissionPct / 100));

      await this.commissionRepo.creerCommissionPartenaire({
        paiement_id: paiement.id,
        partenaire_id: dossier.formation.partenaire_id,
        formation_id: dossier.formation_id,
        montant_catalogue: paiement.montant_catalogue,
        commission_forges_pct: commissionPct,
        montant_reverse: montantReverse, // RM-130 : JAMAIS exposé au Partenaire
        statut: 'EN_ATTENTE'
      });

      await this.audit.info('COMMISSION_PARTENAIRE_CALCULEE', {
        partenaire_id: dossier.formation.partenaire_id,
        montant_reverse: montantReverse
      });
    }

    // RM-145 : commission apporteur
    if (dossier.code_apporteur) {
      const apporteur = await this.prisma.apporteur.findFirst({
        where: { code_apporteur: dossier.code_apporteur }
      });

      if (apporteur) {
        const montantCommission = Math.floor(
          paiement.montant_final * apporteur.taux_commission_pct / 100
        );

        await this.commissionRepo.creerCommissionApporteur({
          paiement_id: paiement.id,
          apporteur_id: apporteur.id,
          dossier_id,
          montant_base: paiement.montant_final,
          taux_commission_pct: apporteur.taux_commission_pct,
          montant_commission: montantCommission,
          statut: 'EN_ATTENTE'
        });

        await this.audit.info('COMMISSION_APPORTEUR_GENEREE', {
          apporteur_id: apporteur.id,
          montant_commission: montantCommission
        });
      }
    }
  }

  // Scheduler — annulation dossiers expirés (RM-07)
  async annulerPaiementsExpires() {
    const paiementsExpires = await this.paiementRepo.findPaiementsExpires();

    for (const paiement of paiementsExpires) {
      await this.paiementRepo.echouer(paiement.id);
      await this.prisma.dossier.update({
        where: { id: paiement.dossier_id },
        data: { statut: 'ANNULE' }
      });

      // Libérer la place
      if (paiement.dossier.session_id) {
        await this.prisma.session.update({
          where: { id: paiement.dossier.session_id },
          data: { places_restantes: { increment: 1 } }
        });
      }

      // Réactiver voucher si présent (RM-45)
      if (paiement.dossier.voucher_code) {
        const voucher = await this.voucherRepo.findByCode(paiement.dossier.voucher_code);
        if (voucher) await this.voucherRepo.reactiverApresRejet(voucher.id);
      }

      await this.audit.warning('DOSSIER_ANNULE_EXPIRATION', {
        dossier_id: paiement.dossier_id,
        paiement_id: paiement.id
      });

      // Notifier apprenant
      const dossierComplet = await this.prisma.dossier.findUnique({
        where: { id: paiement.dossier_id },
        include: { apprenant: true }
      });
      if (dossierComplet) {
        await this.email.sendDossierAnnuleExpiration(
          dossierComplet.apprenant.email,
          dossierComplet.apprenant.langue_preferee
        );
      }
    }

    return paiementsExpires.length;
  }

  // RM-139 : reversement partenaire (seuil 50 000 XOF)
  async effectuerReversementsPartenaires(agentId: string) {
    const eligibles = await this.commissionRepo.getPartenairesEligiblesReversement();
    let total = 0;

    for (const item of eligibles) {
      await this.commissionRepo.effectuerReversementPartenaire(item.partenaire_id, agentId);
      await this.audit.info('REVERSEMENT_PARTENAIRE_EFFECTUE', {
        partenaire_id: item.partenaire_id,
        montant: item._sum.montant_reverse,
        agent_id: agentId
      });
      total += item._sum.montant_reverse || 0;
    }

    return { nb_reversements: eligibles.length, montant_total: total };
  }

  async getPaiements(filters: any) {
    return this.prisma.paiement.findMany({
      where: filters,
      include: { dossier: { include: { apprenant: true, formation: true } } },
      orderBy: { created_at: 'desc' }
    });
  }

  // GET /api/paiements — Liste paiements apprenant (Sprint 1 Semaine 2)
  async getPaiementsByApprenant(apprenantId: string) {
    return this.paiementRepo.findByApprenant(apprenantId);
  }

  // Traiter IPN NGSER (RM-158/160)
  async traiterIpnNgser(payload: any) {
    return this.ipnNgserService.traiterIpn(payload);
  }
}
