import { VoucherRepository } from './voucher.repository';

export class VoucherValidationService {
  constructor(private readonly voucherRepo: VoucherRepository) {}

  async validerVoucher(code: string, formation_id: string, apprenant_id: string) {
    const voucher = await this.voucherRepo.findByCode(code);
    if (!voucher) throw new Error('VOUCHER_INVALIDE');
    if (voucher.formation_id && voucher.formation_id !== formation_id) {
      throw new Error('VOUCHER_FORMATION_INCORRECTE');
    }
    if (voucher.statut !== 'ACTIF') {
      if (voucher.statut === 'EPUISE') throw new Error('VOUCHER_QUOTA_EPUISE');
      if (voucher.statut === 'EXPIRE') throw new Error('VOUCHER_EXPIRE');
      throw new Error('VOUCHER_INVALIDE');
    }
    if (voucher.date_expiration && voucher.date_expiration < new Date()) throw new Error('VOUCHER_EXPIRE');
    if (voucher.quota_max && voucher.quota_utilise >= voucher.quota_max) throw new Error('VOUCHER_QUOTA_EPUISE');
    return voucher;
  }

  async validateApporteur(code: string) {
    const apporteur = await this.voucherRepo.prisma.apporteur.findFirst({
      where: { code_apporteur: code, statut: 'ACTIF' },
    });
    if (!apporteur) throw new Error('APPORTEUR_CODE_INVALID');
    return apporteur;
  }

  calculerRemise(voucher: { valeur: number; type_valeur: string }, montantCatalogue: number): number {
    if (voucher.type_valeur === 'MONTANT') return Math.min(voucher.valeur, montantCatalogue);
    if (voucher.type_valeur === 'POURCENTAGE') return Math.floor((montantCatalogue * voucher.valeur) / 100);
    return 0;
  }
}

