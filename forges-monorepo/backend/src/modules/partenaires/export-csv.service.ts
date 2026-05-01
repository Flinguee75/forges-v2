import crypto from 'crypto';
import type { PrismaClient } from '@prisma/client';

/**
 * ExportCsvService (RM-161)
 *
 * Service d'export CSV pour les partenaires.
 * IMPORTANT: Aucune donnée personnelle (PII) ne doit être exposée dans le CSV.
 * Les identifiants apprenants sont anonymisés via HMAC-SHA256.
 */
export class ExportCsvService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Génère un export CSV anonymisé des commissions d'un partenaire pour un mois donné
   *
   * @param partenaireId - ID du partenaire
   * @param mois - Mois au format "YYYY-MM" (ex: "2025-04")
   * @returns CSV string
   */
  async genererCsvPartenaire(partenaireId: string, mois: string): Promise<string> {
    // Parse le mois
    const [annee, moisNum] = mois.split('-').map(Number);
    const dateDebut = new Date(annee, moisNum - 1, 1);
    const dateFin = new Date(annee, moisNum, 1);

    // Récupérer les commissions du partenaire pour le mois
    const commissions = await this.prisma.commissionPartenaire.findMany({
      where: {
        partenaire_id: partenaireId,
        created_at: {
          gte: dateDebut,
          lt: dateFin,
        },
      },
      include: {
        formation: true,
        paiement: {
          include: {
            dossier: {
              include: { apprenant: true },
            },
          },
        },
      },
    });

    // Générer le header CSV (colonnes v4.9 exactes)
    let csv =
      'identifiant_anonymise,formation_intitule,activation_confirmee_le,statut_acces,certification_obtenue,url_verification_certificat,langue_formation\n';

    // Générer les lignes de données
    for (const commission of commissions) {
      // RM-161: Anonymiser l'ID apprenant via HMAC-SHA256
      const apprenantHash = this.anonymiserApprenantId(
        (commission.paiement as any).dossier.apprenant.id
      );

      // Récupérer les informations non-PII
      const formationIntitule = this.escapeCSV((commission.formation as any).intitule);
      const activationConfirmeeLe = (commission as any).accesFormation?.activated_at?.toISOString() || '';
      const statutAcces = (commission as any).accesFormation?.statut || '';
      const certificationObtenue = (commission as any).certification?.obtenue ? 'true' : 'false';
      const urlVerificationCertificat = (commission as any).certification?.url_verification || '';
      const langueFormation = (commission.formation as any).langue || 'FR';

      // Construire la ligne CSV
      const ligne = [
        apprenantHash,
        formationIntitule,
        activationConfirmeeLe,
        statutAcces,
        certificationObtenue,
        urlVerificationCertificat,
        langueFormation,
      ].join(',');

      csv += ligne + '\n';
    }

    return csv;
  }

  /**
   * Anonymise un ID apprenant via HMAC-SHA256 hexadécimal
   *
   * RM-161: L'anonymisation doit être:
   * - Stable (même ID → même hash)
   * - Irréversible (hash → ID impossible sans la clé)
   * - Hexadécimale (64 caractères)
   *
   * @param apprenantId - ID apprenant à anonymiser
   * @returns Hash HMAC-SHA256 hexadécimal (64 caractères)
   */
  anonymiserApprenantId(apprenantId: string): string {
    const sel = process.env.HMAC_ANONYMISATION_SEL || 'dev-secret-anonymisation';

    return crypto.createHmac('sha256', sel).update(apprenantId).digest('hex');
  }

  /**
   * Échappe les virgules dans une valeur CSV
   * Remplace les virgules par des espaces pour éviter les problèmes de parsing CSV
   *
   * @param value - Valeur à échapper
   * @returns Valeur échappée
   */
  private escapeCSV(value: string): string {
    return value.replace(/,/g, ' ');
  }
}
