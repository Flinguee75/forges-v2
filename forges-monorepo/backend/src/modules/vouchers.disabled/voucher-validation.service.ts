import { VoucherRepository } from './voucher.repository';

export class VoucherValidationService {
  constructor(private readonly voucherRepo: VoucherRepository) {}

  // Validation complète d'un voucher avant utilisation (UCS07)
  async validerVoucher(code: string, formation_id: string, apprenant_id: string) {
    const voucher = await this.voucherRepo.findByCode(code);

    if (!voucher) throw new Error('VOUCHER_INVALIDE');

    // RM-37 : voucher lié à une formation spécifique
    if (voucher.formation_id !== formation_id) throw new Error('VOUCHER_FORMATION_INCORRECTE');

    // Vérification statut
    if (voucher.statut !== 'ACTIF') {
      if (voucher.statut === 'EPUISE') throw new Error('VOUCHER_QUOTA_EPUISE');
      if (voucher.statut === 'EXPIRE') throw new Error('VOUCHER_EXPIRE');
      throw new Error('VOUCHER_INVALIDE');
    }

    // RM-40 : vérification expiration
    if (voucher.date_expiration < new Date()) throw new Error('VOUCHER_EXPIRE');

    // RM-40 : vérification quota
    if (voucher.quota_utilise >= voucher.quota_max) throw new Error('VOUCHER_QUOTA_EPUISE');

    // RM-38 : usage unique par bénéficiaire pour voucher Organisation
    if (voucher.type === 'ORGANISATION') {
      // Vérification déjà utilisé par cet apprenant (via dossiers)
      // Cette vérification est faite dans le service d'inscription
    }

    return voucher;
  }

  // Validation code apporteur (RM-143)
  async validateApporteur(code: string) {
    const apporteur = await this.voucherRepo['prisma'].apporteur.findFirst({
      where: { code_apporteur: code, statut: 'ACTIF' }
    });
    if (!apporteur) throw new Error('APPORTEUR_CODE_INVALID');
    return apporteur;
  }

  // Calcul remise voucher promotionnel (RM-42)
  calculerRemise(voucher: { valeur: number; type_valeur: string }, montantCatalogue: number): number {
    if (voucher.type_valeur === 'MONTANT') {
      return Math.min(voucher.valeur, montantCatalogue);
    } else if (voucher.type_valeur === 'POURCENTAGE') {
      return Math.floor(montantCatalogue * voucher.valeur / 100);
    }
    return 0;
  }
}
