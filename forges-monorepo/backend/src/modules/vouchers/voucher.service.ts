import { PrismaClient } from '@prisma/client';
import { VoucherRepository } from './voucher.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';
import {
  CreateVoucherDto,
  CreateVoucherPromotionnelDto,
  ListVouchersQueryDto,
} from './dto/create-voucher.dto';
import { v4 as uuidv4 } from 'uuid';

type Role = 'ADMIN' | 'AGENT' | 'SUPERVISEUR' | 'ORGANISATION';

export class VoucherService {
  constructor(
    private readonly voucherRepo: VoucherRepository,
    private readonly audit: AuditLogger,
    private readonly prisma: PrismaClient
  ) {}

  private serializeVoucher(voucher: any) {
    return {
      ...voucher,
      quota_restant: Math.max(0, Number(voucher.quota_max || 0) - Number(voucher.quota_utilise || 0)),
      formation: voucher.formation ? {
        id: voucher.formation.id,
        intitule: voucher.formation.intitule,
        statut: voucher.formation.statut,
      } : null,
      organisation: voucher.organisation ? {
        id: voucher.organisation.id,
        raison_sociale: voucher.organisation.raison_sociale,
        statut: voucher.organisation.statut,
      } : null,
      apporteur: voucher.apporteur ? {
        id: voucher.apporteur.id,
        nom: voucher.apporteur.nom,
        email: voucher.apporteur.email,
        code_apporteur: voucher.apporteur.code_apporteur,
        statut: voucher.apporteur.statut,
      } : null,
    };
  }

  private assertCanSeeVoucher(voucher: any, role: Role, userId: string) {
    if (role === 'ORGANISATION' && voucher.organisation_id !== userId) {
      throw new Error('FORBIDDEN');
    }
  }

  async createVoucher(dto: CreateVoucherDto, organisationId: string) {
    const organisation = await this.prisma.organisation.findUnique({ where: { id: dto.organisation_id } });
    if (!organisation) {
      throw new Error('ORGANISATION_NOT_FOUND');
    }

    if (organisation.statut !== 'ACTIF' && organisation.statut !== 'ACTIVE') {
      throw new Error('ORGANISATION_NOT_ACTIVE');
    }

    const formation = await this.prisma.formation.findUnique({ where: { id: dto.formation_id } });
    if (!formation) {
      throw new Error('FORMATION_NOT_FOUND');
    }

    const voucher = await this.voucherRepo.create({
      organisation_id: organisationId,
      formation_id: dto.formation_id,
      code: uuidv4(),
      type: 'ORGANISATION',
      valeur: dto.valeur,
      type_valeur: dto.type_valeur,
      quota_max: dto.quota_max,
      quota_utilise: 0,
      date_expiration: dto.date_expiration,
      statut: 'ACTIF',
      cree_par: organisationId,
    });

    await this.audit.info('VOUCHER_ORGANISATION_CREE', {
      voucher_id: voucher.id,
      organisation_id: organisationId,
      formation_id: dto.formation_id,
    });

    return this.serializeVoucher(voucher);
  }

  async createVoucherPromotionnel(dto: CreateVoucherPromotionnelDto, creatorId: string) {
    const formation = await this.prisma.formation.findUnique({ where: { id: dto.formation_id } });
    if (!formation) {
      throw new Error('FORMATION_NOT_FOUND');
    }

    if (formation.statut === 'ARCHIVEE') {
      throw new Error('FORMATION_ARCHIVEE');
    }

    const voucher = await this.voucherRepo.create({
      organisation_id: null,
      formation_id: dto.formation_id,
      code: uuidv4(),
      type: 'PROMOTIONNEL',
      valeur: dto.valeur,
      type_valeur: dto.type_valeur,
      quota_max: dto.quota_max,
      quota_utilise: 0,
      date_expiration: dto.date_expiration,
      statut: 'BROUILLON',
      cree_par: creatorId,
    });

    await this.audit.info('VOUCHER_PROMOTIONNEL_CREE', {
      voucher_id: voucher.id,
      creator_id: creatorId,
      formation_id: dto.formation_id,
    });

    return this.serializeVoucher(voucher);
  }

  async list(filters: ListVouchersQueryDto, role: Role, userId: string) {
    const result = await this.voucherRepo.findAll(
      {
        type: filters.type,
        statut: filters.statut,
        formation_id: filters.formation_id,
        organisation_id: role === 'ORGANISATION' ? userId : filters.organisation_id,
        search: filters.search,
      },
      { page: filters.page, limit: filters.limit }
    );

    const data = (result.data || []).filter((voucher: any) => {
      if (role === 'ORGANISATION') {
        return voucher.organisation_id === userId;
      }
      return true;
    }).map((voucher: any) => this.serializeVoucher(voucher));

    return { data, meta: result.meta };
  }

  async getById(id: string, role: Role, userId: string) {
    const voucher = await this.voucherRepo.findById(id);
    if (!voucher) {
      throw new Error('VOUCHER_NOT_FOUND');
    }

    this.assertCanSeeVoucher(voucher, role, userId);
    return this.serializeVoucher(voucher);
  }

  async getByCode(code: string, role: Role, userId: string) {
    const voucher = await this.voucherRepo.findByCode(code);
    if (!voucher) {
      throw new Error('VOUCHER_NOT_FOUND');
    }

    this.assertCanSeeVoucher(voucher, role, userId);
    return this.serializeVoucher(voucher);
  }

  async validateVoucherPromotionnel(voucherId: string, superviseurId: string) {
    const voucher = await this.voucherRepo.findById(voucherId);
    if (!voucher) {
      throw new Error('VOUCHER_NOT_FOUND');
    }
    if (voucher.type !== 'PROMOTIONNEL') {
      throw new Error('VOUCHER_NOT_PROMOTIONNEL');
    }
    if (voucher.statut !== 'BROUILLON') {
      throw new Error('VOUCHER_NOT_BROUILLON');
    }

    const updated = await this.voucherRepo.update(voucherId, {
      statut: 'ACTIF',
      valide_par: superviseurId,
      valide_le: new Date(),
    });

    await this.audit.info('VOUCHER_PROMOTIONNEL_VALIDE', {
      voucher_id: voucherId,
      superviseur_id: superviseurId,
    });

    return this.serializeVoucher(updated);
  }

  async rejectVoucherPromotionnel(voucherId: string, superviseurId: string, motif?: string) {
    const voucher = await this.voucherRepo.findById(voucherId);
    if (!voucher) {
      throw new Error('VOUCHER_NOT_FOUND');
    }
    if (voucher.type !== 'PROMOTIONNEL') {
      throw new Error('VOUCHER_NOT_PROMOTIONNEL');
    }
    if (voucher.statut !== 'BROUILLON') {
      throw new Error('VOUCHER_NOT_BROUILLON');
    }

    const updated = await this.voucherRepo.update(voucherId, {
      statut: 'REFUSE',
      valide_par: superviseurId,
      valide_le: new Date(),
      motif_refus: motif || null,
    });

    await this.audit.info('VOUCHER_PROMOTIONNEL_REFUSE', {
      voucher_id: voucherId,
      superviseur_id: superviseurId,
      motif: motif || null,
    });

    return this.serializeVoucher(updated);
  }

  async validateVoucher(code: string, formation_id: string, apprenant_id?: string) {
    const voucher = await this.prisma.voucherApporteur.findUnique({
      where: { code },
      include: { formation: true },
    });

    if (!voucher) {
      throw new Error('VOUCHER_NOT_FOUND');
    }

    if (voucher.formation_id !== formation_id) {
      throw new Error('VOUCHER_WRONG_FORMATION');
    }

    if (voucher.statut !== 'ACTIF') {
      throw new Error('VOUCHER_INACTIVE');
    }

    if (voucher.quota_utilise >= voucher.quota_max) {
      throw new Error('VOUCHER_QUOTA_EXCEEDED');
    }

    if (voucher.date_expiration && voucher.date_expiration < new Date()) {
      throw new Error('VOUCHER_EXPIRED');
    }

    if (apprenant_id) {
      const alreadyUsed = await this.prisma.paiement.findFirst({
        where: {
          dossier: {
            apprenant_id,
            voucher_code: code,
          },
        },
      });

      if (alreadyUsed) {
        throw new Error('VOUCHER_ALREADY_USED');
      }
    }

    const montantCatalogue = Number(voucher.formation?.cout_catalogue || 0);
    let montant_reduit = 0;

    if (voucher.organisation_id) {
      montant_reduit = 0;
    } else if (voucher.type_valeur === 'MONTANT') {
      montant_reduit = Math.max(0, montantCatalogue - Number(voucher.valeur || 0));
    } else if (voucher.type_valeur === 'POURCENTAGE') {
      montant_reduit = Math.floor(montantCatalogue * (1 - Number(voucher.valeur || 0) / 100));
    }

    return {
      valid: true,
      voucher_id: voucher.id,
      type: voucher.type,
      montant_reduit,
      quota_restant: Math.max(0, Number(voucher.quota_max || 0) - Number(voucher.quota_utilise || 0)),
    };
  }

  async checkApporteurCode(code: string, context: Record<string, unknown> = {}) {
    const byApporteurCode = await this.prisma.apporteur.findUnique({
      where: { code_apporteur: code },
      include: { voucher: true },
    });

    if (byApporteurCode && byApporteurCode.statut === 'ACTIF') {
      return {
        valid: true,
        code: byApporteurCode.code_apporteur,
        apporteur_id: byApporteurCode.id,
        code_apporteur_id: byApporteurCode.voucher?.id ?? null,
        taux_commission_pct: byApporteurCode.taux_commission_pct,
        nom: byApporteurCode.nom,
      };
    }

    const byVoucherCode = await this.prisma.voucherApporteur.findUnique({
      where: { code },
      include: {
        apporteur: true,
      },
    });

    if (!byVoucherCode?.apporteur || byVoucherCode.apporteur.statut !== 'ACTIF') {
      throw new Error('APPORTEUR_CODE_INVALID');
    }

    const transactionId = (context.transaction_id as string) || (context.transactionId as string) || null;
    const dossierId = (context.dossier_id as string) || (context.dossierId as string) || null;

    if (transactionId || dossierId) {
      const payment = transactionId
        ? await this.prisma.paiement.findFirst({
            where: { transaction_id: transactionId },
            select: { code_apporteur_id: true, dossier: { select: { voucher_code: true } } },
          })
        : null;

      const dossier = dossierId
        ? await this.prisma.dossier.findUnique({
            where: { id: dossierId },
            select: { voucher_code: true, paiement: { select: { code_apporteur_id: true } } },
          })
        : null;

      const hasOtherVoucher = Boolean(payment?.dossier?.voucher_code || dossier?.voucher_code);
      const hasApporteur = Boolean(payment?.code_apporteur_id || dossier?.paiement?.code_apporteur_id);
      if (hasOtherVoucher && !hasApporteur) {
        throw new Error('VOUCHER_CUMUL_INTERDIT');
      }
    }

    return {
      valid: true,
      code: byVoucherCode.code,
      apporteur_id: byVoucherCode.apporteur.id,
      code_apporteur_id: byVoucherCode.id,
      taux_commission_pct: byVoucherCode.apporteur.taux_commission_pct,
      nom: byVoucherCode.apporteur.nom,
    };
  }
}
