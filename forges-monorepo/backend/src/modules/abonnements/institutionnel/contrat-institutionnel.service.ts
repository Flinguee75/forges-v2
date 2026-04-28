import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';

const SALT_ROUNDS = 12;
const PASSWORD_TEMPORAIRE = 'Temp@FORGES2026!';

type CreateContratInstitutionnelDto = {
  numero_contrat?: string;
  institution_nom: string;
  programme_id: string;
  bailleur?: string;
  date_debut: Date;
  date_fin: Date;
  montant_saas_annuel: number;
  fee_par_certifie: number;
  seuil_facturation_fees?: number;
  gestionnaires_ids: string[];
};

type CertificationInstitutionnelleDto = {
  contrat_id: string;
  apprenant_id: string;
  formation_id: string;
  session_id?: string;
};

type EnrolementCsvResult = {
  succes: number;
  erreurs: number;
  rapport: Array<{ ligne: number; email: string; statut: string; message?: string }>;
};

function parseSimpleCsv(csvContent: string) {
  const lines = csvContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((value) => value.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
}

function generateNumeroContrat() {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INST-${year}-${suffix}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export class ContratInstitutionnelService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger,
    private readonly email: EmailService,
  ) {}

  async creerContrat(dto: CreateContratInstitutionnelDto, adminId: string) {
    const existingProgramme = await this.prisma.contratInstitutionnel.findUnique({
      where: { programme_id: dto.programme_id },
    });

    if (existingProgramme) {
      throw new Error('CONTRAT_PROGRAMME_DEJA_EXISTANT');
    }

    const contrat = await this.prisma.contratInstitutionnel.create({
      data: {
        numero_contrat: dto.numero_contrat || generateNumeroContrat(),
        institution_nom: dto.institution_nom,
        programme_id: dto.programme_id,
        bailleur: dto.bailleur,
        date_debut: dto.date_debut,
        date_fin: dto.date_fin,
        montant_saas_annuel: dto.montant_saas_annuel,
        fee_par_certifie: dto.fee_par_certifie,
        seuil_facturation_fees: dto.seuil_facturation_fees || 25000,
        statut: 'BROUILLON',
        gestionnaires_ids: dto.gestionnaires_ids,
        avenants: [],
      },
    });

    await this.audit.info('CONTRAT_INSTITUTIONNEL_CREE', {
      contrat_id: contrat.id,
      programme_id: dto.programme_id,
      admin_id: adminId,
    });

    return contrat;
  }

  async activerContrat(contratId: string, adminId: string) {
    const contrat = await this.prisma.contratInstitutionnel.findUnique({ where: { id: contratId } });
    if (!contrat) throw new Error('CONTRAT_NOT_FOUND');

    const avenants = Array.isArray(contrat.avenants) ? contrat.avenants : [];
    const facturation = {
      type: 'FACTURATION_SAAS_ANNUELLE',
      montant: contrat.montant_saas_annuel,
      statut: 'A_FACTURER',
      date: new Date().toISOString(),
    };

    const updated = await this.prisma.contratInstitutionnel.update({
      where: { id: contratId },
      data: {
        statut: 'ACTIF',
        avenants: [...avenants, facturation],
      },
    });

    await this.audit.info('CONTRAT_INSTITUTIONNEL_ACTIVE', {
      contrat_id: contratId,
      montant_saas_annuel: contrat.montant_saas_annuel,
      admin_id: adminId,
    });

    return { contrat: updated, facturation_saas: facturation };
  }

  async modifierParGestionnaire(contratId: string, gestionnaireId: string, data: Record<string, unknown>) {
    const contrat = await this.prisma.contratInstitutionnel.findUnique({ where: { id: contratId } });
    if (!contrat) throw new Error('CONTRAT_NOT_FOUND');
    if (!contrat.gestionnaires_ids.includes(gestionnaireId)) throw new Error('GESTIONNAIRE_NON_AUTORISE');

    const restrictedKeys = [
      'montant_saas_annuel',
      'fee_par_certifie',
      'seuil_facturation_fees',
      'date_debut',
      'date_fin',
      'statut',
      'gestionnaires_ids',
    ];

    if (restrictedKeys.some((key) => Object.prototype.hasOwnProperty.call(data, key))) {
      throw new Error('CONTRAT_MODIFICATION_FORBIDDEN');
    }

    return contrat;
  }

  async comptabiliserCertification(dto: CertificationInstitutionnelleDto) {
    const contrat = await this.prisma.contratInstitutionnel.findUnique({
      where: { id: dto.contrat_id },
    });
    if (!contrat || contrat.statut !== 'ACTIF') throw new Error('CONTRAT_INACTIF');

    const dossier = await this.prisma.dossier.create({
      data: {
        apprenant_id: dto.apprenant_id,
        formation_id: dto.formation_id,
        session_id: dto.session_id,
        statut: 'PAYE',
        source_financement: 'INSTITUTIONNEL',
        voucher_code: contrat.numero_contrat,
      },
    });

    const updated = await this.prisma.contratInstitutionnel.update({
      where: { id: contrat.id },
      data: {
        cumul_fees_reportes: { increment: contrat.fee_par_certifie },
      },
    });

    await this.audit.info('CERTIFICATION_INSTITUTIONNELLE_TRACEE', {
      contrat_id: contrat.id,
      dossier_id: dossier.id,
      numero_contrat: contrat.numero_contrat,
    });

    return {
      dossier,
      cumul_fees_reportes: updated.cumul_fees_reportes,
      facturation_mensuelle_requise: updated.cumul_fees_reportes > updated.seuil_facturation_fees,
    };
  }

  async trouverAlertesExpiration(referenceDate = new Date()) {
    const day = 24 * 3600 * 1000;
    const j60 = startOfDay(new Date(referenceDate.getTime() + 60 * day));
    const j30 = startOfDay(new Date(referenceDate.getTime() + 30 * day));

    const [alertesJ60, alertesJ30] = await Promise.all([
      this.prisma.contratInstitutionnel.findMany({
        where: {
          statut: 'ACTIF',
          date_fin: { gte: j60, lt: new Date(j60.getTime() + day) },
        },
      }),
      this.prisma.contratInstitutionnel.findMany({
        where: {
          statut: 'ACTIF',
          date_fin: { gte: j30, lt: new Date(j30.getTime() + day) },
        },
      }),
    ]);

    return { alertes_j60: alertesJ60, alertes_j30: alertesJ30 };
  }

  async suspendreContratsExpires(referenceDate = new Date()) {
    const contrats = await this.prisma.contratInstitutionnel.findMany({
      where: {
        statut: 'ACTIF',
        date_fin: { lt: referenceDate },
      },
    });

    for (const contrat of contrats) {
      await this.prisma.contratInstitutionnel.update({
        where: { id: contrat.id },
        data: { statut: 'EXPIRE' },
      });

      if (contrat.gestionnaires_ids.length > 0) {
        await this.prisma.apprenant.updateMany({
          where: { id: { in: contrat.gestionnaires_ids }, role: 'GESTIONNAIRE' },
          data: { statut: 'SUSPENDU' },
        });
      }

      await this.audit.warning('CONTRAT_INSTITUTIONNEL_EXPIRE', {
        contrat_id: contrat.id,
        numero_contrat: contrat.numero_contrat,
      });
    }

    return contrats.length;
  }

  // RM-58 : renouvellement par nouveau contrat lie a l'historique precedent
  async renouvelerContrat(contratId: string, dto: Partial<CreateContratInstitutionnelDto>, adminId: string) {
    const precedent = await this.prisma.contratInstitutionnel.findUnique({ where: { id: contratId } });
    if (!precedent) throw new Error('CONTRAT_NOT_FOUND');

    const avenants: any[] = [];
    const nouveau = await this.prisma.contratInstitutionnel.create({
      data: {
        numero_contrat: dto.numero_contrat || generateNumeroContrat(),
        institution_nom: dto.institution_nom || precedent.institution_nom,
        programme_id: dto.programme_id || `${precedent.programme_id}-REN-${Date.now()}`,
        bailleur: dto.bailleur || precedent.bailleur,
        date_debut: dto.date_debut || new Date(precedent.date_fin.getTime() + 24 * 3600 * 1000),
        date_fin: dto.date_fin || new Date(precedent.date_fin.getTime() + 366 * 24 * 3600 * 1000),
        montant_saas_annuel: dto.montant_saas_annuel || precedent.montant_saas_annuel,
        fee_par_certifie: dto.fee_par_certifie || precedent.fee_par_certifie,
        seuil_facturation_fees: dto.seuil_facturation_fees || precedent.seuil_facturation_fees,
        statut: 'BROUILLON',
        gestionnaires_ids: dto.gestionnaires_ids || precedent.gestionnaires_ids,
        avenants: [
          ...avenants,
          {
            type: 'RENOUVELLEMENT_DEPUIS',
            contrat_precedent_id: precedent.id,
            numero_precedent: precedent.numero_contrat,
            date: new Date().toISOString(),
          },
        ],
      },
    });

    await this.audit.info('CONTRAT_INSTITUTIONNEL_RENOUVELE', {
      contrat_precedent_id: precedent.id,
      nouveau_contrat_id: nouveau.id,
      admin_id: adminId,
    });

    return nouveau;
  }

  async enrollerMasse(contratId: string, csvContent: string, gestionnaireId: string): Promise<EnrolementCsvResult> {
    const contrat = await this.prisma.contratInstitutionnel.findUnique({ where: { id: contratId } });
    if (!contrat || contrat.statut !== 'ACTIF') throw new Error('CONTRAT_INACTIF');
    if (!contrat.gestionnaires_ids.includes(gestionnaireId)) throw new Error('GESTIONNAIRE_NON_AUTORISE');

    const rows = parseSimpleCsv(csvContent);
    const passwordHash = await hash(PASSWORD_TEMPORAIRE, SALT_ROUNDS);
    const rapport: EnrolementCsvResult['rapport'] = [];
    let succes = 0;
    let erreurs = 0;

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const ligne = index + 2;
      const email = row.email?.toLowerCase();

      try {
        if (!email || !row.nom || !row.prenoms || !row.formation_id) {
          throw new Error('CHAMPS_OBLIGATOIRES_MANQUANTS');
        }

        const exists = await this.prisma.apprenant.findUnique({ where: { email } });
        if (exists) throw new Error('EMAIL_DEJA_UTILISE');

        const apprenant = await this.prisma.apprenant.create({
          data: {
            email,
            password_hash: passwordHash,
            nom: row.nom,
            prenoms: row.prenoms,
            type_apprenant: 'PROFESSIONNEL',
            secteur_activite: `INSTITUTIONNEL:${contrat.numero_contrat}`,
            pays_residence: row.pays || 'CI',
            pays_nationalite: row.pays || 'CI',
            langue_preferee: 'FR',
            statut: 'ACTIF',
            consentement_rgpd: false,
            consentement_timestamp: new Date(),
            consentement_version_cgu: '1.0',
          },
        });

        await this.prisma.dossier.create({
          data: {
            apprenant_id: apprenant.id,
            formation_id: row.formation_id,
            statut: 'PAYE',
            source_financement: 'INSTITUTIONNEL',
            voucher_code: contrat.numero_contrat,
          },
        });

        succes++;
        rapport.push({ ligne, email, statut: 'SUCCES' });
      } catch (error: any) {
        erreurs++;
        rapport.push({ ligne, email: email || '?', statut: 'ERREUR', message: error.message });
      }
    }

    await this.audit.info('ENROLEMENT_INSTITUTIONNEL_CSV', {
      contrat_id: contrat.id,
      gestionnaire_id: gestionnaireId,
      succes,
      erreurs,
    });

    return { succes, erreurs, rapport };
  }
}
