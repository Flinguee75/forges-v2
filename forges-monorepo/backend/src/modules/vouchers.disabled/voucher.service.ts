import { v4 as uuidv4 } from 'uuid';
import { VoucherRepository } from './voucher.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { CreateVoucherPromoDto, CommanderVouchersOrgDto } from './dto/voucher.dto';

export class VoucherService {
  constructor(
    private readonly voucherRepo: VoucherRepository,
    private readonly audit: AuditLogger,
    private readonly email: EmailService
  ) {}

  // Flux A — Génération automatique après paiement Organisation (RM-41)
  async genererVouchersOrganisation(
    dto: CommanderVouchersOrgDto,
    organisation_id: string,
    email_org: string,
    langue: string
  ) {
    const codes = [];

    for (let i = 0; i < dto.nb_places; i++) {
      codes.push({
        code: uuidv4(), // RM-37 : UUID unique
        type: 'ORGANISATION',
        formation_id: dto.formation_id,
        organisation_id,
        valeur: dto.montant_unitaire, // couverture 100%
        type_valeur: 'MONTANT',
        quota_max: 1, // RM-38 : usage unique
        date_expiration: dto.date_expiration,
        cree_par: organisation_id,
        statut: 'ACTIF', // RM-41 : actif immédiatement après paiement
      });
    }

    await this.voucherRepo.createBulk(codes);

    await this.audit.info('VOUCHERS_ORGANISATION_GENERES', {
      organisation_id,
      formation_id: dto.formation_id,
      nb_vouchers: codes.length
    });

    // RM-100 : envoi codes par email dans la langue préférée
    await this.email.sendVouchersOrganisation(
      email_org,
      codes.map(c => c.code),
      dto.formation_id,
      langue
    );

    return { nb_generes: codes.length, codes: codes.map(c => c.code) };
  }

  // Flux B — Création voucher promotionnel par Agent Comptable (RM-39)
  async creerVoucherPromo(dto: CreateVoucherPromoDto, agentId: string) {
    // RM-40 : quota_max >= 1 et date_expiration obligatoires
    const voucher = await this.voucherRepo.createPromo({
      code: uuidv4(),
      formation_id: dto.formation_id,
      valeur: dto.valeur,
      type_valeur: dto.type_valeur,
      quota_max: dto.quota_max,
      date_expiration: new Date(dto.date_expiration),
      cree_par: agentId,
    });

    await this.audit.info('VOUCHER_PROMO_CREE', {
      voucher_id: voucher.id,
      statut: 'BROUILLON',
      agent_id: agentId
    });

    return voucher;
  }

  // Flux B — Validation par Superviseur (RM-39)
  async validerVoucherPromo(id: string, superviseurId: string) {
    const voucher = await this.voucherRepo.findById(id);
    if (!voucher) throw new Error('VOUCHER_NOT_FOUND');
    if (voucher.type !== 'PROMOTIONNEL') throw new Error('VOUCHER_TYPE_INCORRECT');
    if (voucher.statut !== 'BROUILLON') throw new Error('VOUCHER_DEJA_TRAITE');

    const updated = await this.voucherRepo.valider(id, superviseurId);
    await this.audit.info('VOUCHER_PROMO_VALIDE', { voucher_id: id, superviseur_id: superviseurId });

    return updated;
  }

  // Flux B — Refus par Superviseur
  async refuserVoucherPromo(id: string, motif: string, superviseurId: string) {
    const voucher = await this.voucherRepo.findById(id);
    if (!voucher) throw new Error('VOUCHER_NOT_FOUND');
    if (voucher.statut !== 'BROUILLON') throw new Error('VOUCHER_DEJA_TRAITE');

    const updated = await this.voucherRepo.refuser(id, motif, superviseurId);
    await this.audit.info('VOUCHER_PROMO_REFUSE', {
      voucher_id: id,
      motif,
      superviseur_id: superviseurId
    });

    // Notification Agent Comptable
    await this.email.sendVoucherRefuse(voucher.cree_par, motif, 'FR');

    return updated;
  }

  // RM-45 : réactivation voucher si dossier rejeté
  async reactiverApresRejet(voucher_code: string) {
    const voucher = await this.voucherRepo.findByCode(voucher_code);
    if (!voucher) return;
    await this.voucherRepo.reactiverApresRejet(voucher.id);
    await this.audit.info('VOUCHER_REACTIVE_APRES_REJET', { voucher_id: voucher.id });
  }

  // Scheduler — expiration automatique (RM-40)
  async expirerVouchersExpires() {
    const result = await this.voucherRepo.expirerVouchersExpires();
    await this.audit.info('VOUCHERS_EXPIRES', { count: result.count });
    return result.count;
  }

  async getByOrganisation(organisation_id: string) {
    return this.voucherRepo.findByOrganisation(organisation_id);
  }

  async getPromoEnAttente() {
    return this.voucherRepo.findPromoEnAttente();
  }

  async checkCode(code: string) {
    const voucher = await this.voucherRepo.findByCode(code);
    if (!voucher) throw new Error('VOUCHER_INVALIDE');
    return {
      valide: voucher.statut === 'ACTIF' && voucher.date_expiration > new Date() && voucher.quota_utilise < voucher.quota_max,
      statut: voucher.statut,
      type: voucher.type,
      type_valeur: voucher.type_valeur,
      valeur: voucher.valeur,
    };
  }
}
