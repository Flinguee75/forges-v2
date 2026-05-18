import { PrismaClient } from '@prisma/client';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { hash } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

interface LigneBeneficiaire {
  email: string;
  nom: string;
  prenoms: string;
  pays?: string;
  code_voucher?: string;
}

export interface ResultatImport {
  succes: number;
  erreurs: number;
  doublons: number;
  imported: number;
  linked: number;
  skipped: number;
  rapport: Array<{ ligne: number; email: string; statut: string; message?: string }>;
}

interface ImportOptions {
  b2bQuota?: {
    nbMax: number;
  };
}

function parseSimpleCsv(csvContent: string): LigneBeneficiaire[] {
  const lines = csvContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row as unknown as LigneBeneficiaire;
  });
}

export class ImportCSVService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger,
    private readonly email: EmailService
  ) {}

  // RM-59 : import CSV bénéficiaires
  async importerBeneficiaires(
    csvContent: string,
    organisation_id: string,
    userId: string,
    options: ImportOptions = {}
  ): Promise<ResultatImport> {
    const lignes: LigneBeneficiaire[] = parseSimpleCsv(csvContent);

    const rapport: ResultatImport['rapport'] = [];
    let succes = 0, erreurs = 0, doublons = 0;

    for (let i = 0; i < lignes.length; i++) {
      const ligne = lignes[i];
      const numLigne = i + 2; // +2 car ligne 1 = headers

      try {
        // Validation champs obligatoires
        if (!ligne.email || !ligne.nom || !ligne.prenoms) {
          erreurs++;
          rapport.push({ ligne: numLigne, email: ligne.email || '?', statut: 'ERREUR', message: 'Champs obligatoires manquants (email, nom, prenoms)' });
          continue;
        }

        // Vérification doublon email (RM-28)
        const existant = await this.prisma.apprenant.findUnique({
          where: { email: ligne.email.toLowerCase() }
        });

        if (existant) {
          doublons++;
          rapport.push({ ligne: numLigne, email: ligne.email, statut: 'DOUBLON', message: 'Email déjà utilisé' });
          continue;
        }

        // Création compte apprenant
        const tempPassword = uuidv4().substring(0, 12) + 'A1!';
        const password_hash = await hash(tempPassword, 12);

        await this.runInTransaction(async (tx) => {
          if (options.b2bQuota) {
            const nbActifs = await tx.apprenant.count({
              where: { organisation_id, statut: 'ACTIF' },
            });
            if (nbActifs >= options.b2bQuota.nbMax) {
              throw new Error('B2B_PLAFOND_ATTEINT');
            }
          }

          await tx.apprenant.create({
            data: {
              email: ligne.email.toLowerCase(),
              password_hash,
              nom: ligne.nom,
              prenoms: ligne.prenoms,
              type_apprenant: 'PROFESSIONNEL',
              pays_residence: ligne.pays || 'CI',
              pays_nationalite: ligne.pays || 'CI',
              langue_preferee: 'FR',
              statut: 'ACTIF',
              organisation_id,
              consentement_rgpd: false,
              consentement_timestamp: new Date(),
              consentement_version_cgu: '1.0',
            }
          });
        });

        // Envoi identifiants par email
        await this.email.sendTempPassword(ligne.email, tempPassword, 'FR');

        succes++;
        rapport.push({ ligne: numLigne, email: ligne.email, statut: 'SUCCES' });

      } catch (error: any) {
        erreurs++;
        rapport.push({ ligne: numLigne, email: ligne.email || '?', statut: 'ERREUR', message: error.message });
      }
    }

    await this.audit.info('IMPORT_CSV_BENEFICIAIRES', {
      organisation_id,
      nb_lignes: lignes.length,
      succes,
      erreurs,
      doublons,
      user_id: userId
    });

    return {
      succes,
      erreurs,
      doublons,
      imported: succes,
      linked: 0,
      skipped: erreurs + doublons,
      rapport,
    };
  }

  private async runInTransaction<T>(callback: (tx: PrismaClient) => Promise<T>): Promise<T> {
    const transaction = (this.prisma as any).$transaction;
    if (typeof transaction === 'function') {
      return transaction.call(this.prisma, callback, { isolationLevel: 'Serializable' });
    }
    return callback(this.prisma);
  }
}
