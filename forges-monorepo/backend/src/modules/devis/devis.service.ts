import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { DevisRepository } from './devis.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { CreerDevisDto } from './dto/devis.dto';
import { genererDocxDevis } from './devis-docx.service';
import { genererPdfDevis } from './devis-pdf.service';

const LOGO_PATH = path.join(__dirname, '../../../../frontend/src/assets/logo_forges.png');
const SESSION_DEVIS_AUTORISEES = ['PLANIFIEE', 'A_VENIR', 'INSCRIPTIONS_OUVERTES', 'OUVERTE', 'EN_COURS'];

function getLogoBase64(): string {
  try {
    if (!fs.existsSync(LOGO_PATH)) return '';
    return `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString('base64')}`;
  } catch {
    return '';
  }
}

export class DevisService {
  constructor(
    private readonly devisRepository: DevisRepository,
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger,
    private readonly emailService: EmailService
  ) {}

  private buildDraftOrganisation(
    recipientLabel: string,
    organisationLabel: string,
    identifiantLegal?: string | null
  ) {
    // Le template devise attend une "organisation", mais pour ce script on
    // injecte le nom de l'apprenant dans le champ email_organisation.
    return {
      raison_sociale: organisationLabel,
      email: recipientLabel,
      adresse: null,
      pays: null,
      identifiant_legal: identifiantLegal || null,
      contact_referent: recipientLabel,
    };
  }

  private buildDraftDevis(options: {
    numeroDevis: string;
    createdAt?: Date;
    nbPlaces: number;
    tarifUnitaireXof: number;
    montantTotalXof: number;
    organisationLabel: string;
    recipientLabel: string;
    formationLabel: string;
    identifiantLegal?: string | null;
    session?: { date_debut?: Date | string | null; date_fin?: Date | string | null } | null;
    notesAdmin?: string | null;
  }) {
    const createdAt = options.createdAt || new Date();
    const organisation = this.buildDraftOrganisation(
      options.recipientLabel,
      options.organisationLabel,
      options.identifiantLegal
    );
    const formation = { intitule: options.formationLabel };
    const session = options.session || null;

    return {
      devis: {
        id: options.numeroDevis,
        numero_devis: options.numeroDevis,
        created_at: createdAt,
        nb_places: options.nbPlaces,
        tarif_unitaire_xof: options.tarifUnitaireXof,
        montant_total_xof: options.montantTotalXof,
        organisation,
        formation,
        session,
        notes_admin: options.notesAdmin || null,
      },
      organisation,
      formation,
      session,
    };
  }

  async creerDevis(dto: CreerDevisDto, adminId: string) {
    const [organisation, formation] = await Promise.all([
      this.prisma.organisation.findUnique({ where: { id: dto.organisation_id } }),
      this.prisma.formation.findUnique({ where: { id: dto.formation_id } }),
    ]);

    if (!organisation) throw new Error('ORGANISATION_NOT_FOUND');
    if (!formation) throw new Error('FORMATION_NOT_FOUND');

    const session = await this.prisma.session.findUnique({ where: { id: dto.session_id } });
    if (!session || session.formation_id !== dto.formation_id) {
      throw new Error('SESSION_INVALIDE');
    }
    if (!SESSION_DEVIS_AUTORISEES.includes(session.statut)) {
      throw new Error('SESSION_NON_ELIGIBLE_DEVIS');
    }

    const annee = new Date().getFullYear();
    const count = await this.devisRepository.countParAnnee(annee);
    const sequence = String(count + 1).padStart(3, '0');
    const numero_devis = `FORGES-DEVIS-${annee}-${sequence}`;

    // RM-150: montant calculé par le backend, jamais par le client
    const montant_total_xof = dto.nb_places * dto.tarif_unitaire_xof;

    const devis = await this.devisRepository.create({
      numero_devis,
      organisation_id: dto.organisation_id,
      formation_id: dto.formation_id,
      session_id: dto.session_id,
      nb_places: dto.nb_places,
      tarif_unitaire_xof: dto.tarif_unitaire_xof,
      montant_total_xof,
      notes_admin: dto.notes_admin,
      created_by: adminId,
    });

    await this.audit.info('DEVIS_CREE', {
      devis_id: devis.id,
      numero_devis,
      organisation_id: dto.organisation_id,
      montant_total_xof,
      created_by: adminId,
    });

    return devis;
  }

  async listerDevis(filters: { organisation_id?: string; statut?: string } = {}) {
    return this.devisRepository.findAll(filters);
  }

  async getDevis(id: string) {
    const devis = await this.devisRepository.findById(id);
    if (!devis) throw new Error('DEVIS_NOT_FOUND');
    return devis;
  }

  async telechargerDocxDevis(id: string): Promise<{ buffer: Buffer; filename: string }> {
    const devis = await this.devisRepository.findById(id);
    if (!devis) throw new Error('DEVIS_NOT_FOUND');
    const buffer = genererDocxDevis(devis as any);
    return { buffer, filename: `${devis.numero_devis}.docx` };
  }

  async telechargerPdfDevis(id: string): Promise<{ buffer: Buffer; filename: string }> {
    const devis = await this.devisRepository.findById(id);
    if (!devis) throw new Error('DEVIS_NOT_FOUND');

    const [organisation, formation] = await Promise.all([
      this.prisma.organisation.findUnique({ where: { id: devis.organisation_id } }),
      this.prisma.formation.findUnique({ where: { id: devis.formation_id } }),
    ]);

    if (!organisation) throw new Error('ORGANISATION_NOT_FOUND');
    if (!formation) throw new Error('FORMATION_NOT_FOUND');

    const session = await this.prisma.session.findUnique({ where: { id: devis.session_id } });

    const buffer = await genererPdfDevis({
      devis: devis as any,
      organisation,
      formation,
      session,
    });

    return { buffer, filename: `${devis.numero_devis}.pdf` };
  }


  async payerDevis(id: string, agentId: string, notes_admin?: string) {
    const devis = await this.devisRepository.findById(id);
    if (!devis) throw new Error('DEVIS_NOT_FOUND');
    if (devis.statut !== 'CREE') throw new Error('DEVIS_STATUT_INVALIDE');

    const [organisation, formation] = await Promise.all([
      this.prisma.organisation.findUnique({ where: { id: devis.organisation_id } }),
      this.prisma.formation.findUnique({ where: { id: devis.formation_id } }),
    ]);

    if (!organisation) throw new Error('ORGANISATION_NOT_FOUND');
    if (!formation) throw new Error('FORMATION_NOT_FOUND');

    const updated = await this.devisRepository.payer(id, notes_admin);

    await this.audit.info('DEVIS_PAYE', {
      devis_id: id,
      numero_devis: devis.numero_devis,
      organisation_id: devis.organisation_id,
      montant_total_xof: devis.montant_total_xof,
      agent_id: agentId,
    });

    // RM-153 : activer les vouchers EN_ATTENTE liés à ce devis
    const vouchers = await this.prisma.voucherOrganisation.findMany({
      where: { devis_id: id, statut: 'EN_ATTENTE' },
      select: { id: true, code: true },
    });

    if (vouchers.length > 0) {
      const voucherIds = vouchers.map(v => v.id);
      const voucherCodes = vouchers.map((v) => v.code);

      await this.prisma.voucherOrganisation.updateMany({
        where: { id: { in: voucherIds } },
        data: { statut: 'ACTIF' },
      });

      await this.audit.info('DEVIS_VOUCHERS_ACTIVES', {
        devis_id: id,
        nb_vouchers_actives: voucherIds.length,
        agent_id: agentId,
      });

      this.emailService.sendVouchersOrganisation(
        organisation.email,
        voucherCodes,
        formation.intitule,
        organisation.raison_sociale
      ).catch((error) => {
        console.error('[DevisService] Email vouchers organisation non bloquant:', (error as Error).message);
      });

      // RM-154 : dossiers ayant utilisé un de ces vouchers → PAYE automatiquement
      const dossiers = await this.prisma.dossier.findMany({
        where: { voucher_organisation_id: { in: voucherIds } },
        select: { id: true, source_financement: true, formation: { select: { cout_catalogue: true } } },
      });

      for (const dossier of dossiers) {
        await this.prisma.dossier.update({
          where: { id: dossier.id },
          data: { statut: 'PAYE' },
        });

        // Créer le Paiement CONFIRME pour que les KPIs comptabilisent ce CA
        const montant = dossier.formation?.cout_catalogue ?? 0;
        const existingPaiement = await this.prisma.paiement.findUnique({
          where: { dossier_id: dossier.id },
        });
        if (!existingPaiement) {
          await this.prisma.paiement.create({
            data: {
              dossier_id: dossier.id,
              montant_catalogue: montant,
              montant_final: montant,
              methode: 'VIREMENT',
              statut: 'CONFIRME',
              provider: 'VIREMENT',
              confirmed_at: new Date(),
            },
          });
        } else if (existingPaiement.statut !== 'CONFIRME') {
          await this.prisma.paiement.update({
            where: { dossier_id: dossier.id },
            data: { statut: 'CONFIRME', montant_final: montant },
          });
        }

        await this.audit.info('DOSSIER_PAYE_VIA_DEVIS', {
          dossier_id: dossier.id,
          devis_id: id,
          agent_id: agentId,
        });
      }
    }

    return { ...updated, vouchers_actives: vouchers.length };
  }

  // RM-152 : générer N vouchers EN_ATTENTE depuis un devis
  async genererVouchersDevis(devisId: string, adminId: string) {
    const devis = await this.devisRepository.findById(devisId);
    if (!devis) throw new Error('DEVIS_NOT_FOUND');
    if (devis.statut === 'ANNULE') throw new Error('DEVIS_ANNULE');
    if (devis.statut === 'PAYE') throw new Error('DEVIS_DEJA_PAYE');

    // Idempotence : vérifier si déjà générés
    const existants = await this.prisma.voucherOrganisation.count({
      where: { devis_id: devisId },
    });
    if (existants > 0) throw new Error('VOUCHERS_DEJA_GENERES');

    const vouchers = [];
    for (let i = 0; i < devis.nb_places; i++) {
      const voucher = await this.prisma.voucherOrganisation.create({
        data: {
          code: randomUUID(),
          organisation_id: devis.organisation_id,
          formation_id: devis.formation_id,
          devis_id: devisId,
          type: 'ORGANISATION',
          valeur: 100,
          type_valeur: 'POURCENTAGE',
          quota_max: 1,
          quota_utilise: 0,
          date_expiration: devis.session?.date_fin ?? null,
          statut: 'EN_ATTENTE',
        },
      });
      vouchers.push(voucher);
    }

    await this.audit.info('DEVIS_VOUCHERS_GENERES', {
      devis_id: devisId,
      nb_generes: vouchers.length,
      admin_id: adminId,
    });

    return { nb_generes: vouchers.length, vouchers };
  }

  // RM-152 : lister les vouchers d'un devis
  async listerVouchersDevis(devisId: string) {
    const devis = await this.devisRepository.findById(devisId);
    if (!devis) throw new Error('DEVIS_NOT_FOUND');

    const vouchers = await this.prisma.voucherOrganisation.findMany({
      where: { devis_id: devisId },
      orderBy: { created_at: 'asc' },
    });

    const organisation = await this.prisma.organisation.findUnique({
      where: { id: devis.organisation_id },
      select: { id: true, raison_sociale: true, email: true },
    });

    const formation = await this.prisma.formation.findUnique({
      where: { id: devis.formation_id },
      select: { id: true, intitule: true },
    });

    return vouchers.map((voucher) => ({
      ...voucher,
      organisation: organisation && voucher.organisation_id === organisation.id ? organisation : null,
      formation: formation && voucher.formation_id === formation.id ? formation : null,
      devis: {
        id: devis.id,
        numero_devis: devis.numero_devis,
        organisation_id: devis.organisation_id,
        formation_id: devis.formation_id,
        nb_places: devis.nb_places,
      },
    }));
  }

  async annulerDevis(id: string, adminId: string, notes_admin?: string) {
    const devis = await this.devisRepository.findById(id);
    if (!devis) throw new Error('DEVIS_NOT_FOUND');

    // RM-151: annulation uniquement si statut CREE
    if (devis.statut !== 'CREE') throw new Error('DEVIS_ANNULATION_IMPOSSIBLE');

    const updated = await this.devisRepository.annuler(id, notes_admin);

    await this.audit.info('DEVIS_ANNULE', {
      devis_id: id,
      numero_devis: devis.numero_devis,
      organisation_id: devis.organisation_id,
      admin_id: adminId,
    });

    return updated;
  }

  async listerDevisOrganisation(organisationId: string) {
    return this.devisRepository.findAll({ organisation_id: organisationId });
  }

  async envoyerEmailDevis(
    id: string,
    adminId: string,
    draftOptions?: {
      recipientEmail: string;
      recipientLabel: string;
      organisationLabel: string;
      formationLabel: string;
      numeroDevis: string;
      nbPlaces: number;
      tarifUnitaireXof: number;
      montantTotalXof: number;
      createdAt?: Date;
      session?: { date_debut?: Date | string | null; date_fin?: Date | string | null } | null;
      notesAdmin?: string | null;
      attachmentFilename?: string;
    }
  ) {
    if (draftOptions) {
      // Mode "draft" utilisé par le script apprenants + devis:
      // aucun enregistrement Devis en base, mais on réutilise le même service
      // d'envoi, le même PDF et le même template officiel.
      const draft = this.buildDraftDevis(draftOptions);
      const pdfBuffer = await genererPdfDevis(draft as any);
      const emailSubject = `Votre facture ${draftOptions.numeroDevis} — FORGES AGRÉGATEUR`;
      const emailHtml = this.buildEmailHtml(draft.devis as any);

      await this.emailService.sendEmailWithAttachment({
        to: draftOptions.recipientEmail,
        subject: emailSubject,
        html: emailHtml,
        attachment: {
          filename: draftOptions.attachmentFilename || `${draftOptions.numeroDevis.replace('DEVIS', 'FACTURE')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      });

      return { sent: true, to: draftOptions.recipientEmail, draft: true };
    }

    const devis = await this.devisRepository.findById(id);
    if (!devis) throw new Error('DEVIS_NOT_FOUND');

    const [organisation, formation] = await Promise.all([
      this.prisma.organisation.findUnique({ where: { id: devis.organisation_id } }),
      this.prisma.formation.findUnique({ where: { id: devis.formation_id } }),
    ]);

    if (!organisation) throw new Error('ORGANISATION_NOT_FOUND');
    if (!formation) throw new Error('FORMATION_NOT_FOUND');

    const session = await this.prisma.session.findUnique({ where: { id: devis.session_id } });
    if (!session) throw new Error('SESSION_NOT_FOUND');

    const langue = organisation.langue_preferee || 'FR';
    const pdfBuffer = await genererPdfDevis({
      devis: devis as any,
      organisation,
      formation,
      session,
    });

    const emailSubject = langue === 'EN'
      ? `Your invoice ${devis.numero_devis} from FORGES`
      : `Votre facture ${devis.numero_devis} — FORGES AGRÉGATEUR`;
    const emailHtml = this.buildEmailHtml({ ...devis, organisation, formation, session });

    await this.emailService.sendEmailWithAttachment({
      to: organisation.email,
      subject: emailSubject,
      html: emailHtml,
      attachment: {
        filename: `${devis.numero_devis.replace('DEVIS', 'FACTURE')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    });

    await this.audit.info('DEVIS_EMAIL_RENVOYE', {
      devis_id: id,
      numero_devis: devis.numero_devis,
      to: organisation.email,
      admin_id: adminId,
    });

    return { sent: true, to: organisation.email };
  }

  private formatMontant(montant: number): string {
    return montant.toLocaleString('fr-FR') + ' XOF';
  }

  private buildEmailHtml(devis: any): string {
    const org = devis.organisation;
    const formation = devis.formation;
    const session = devis.session;
    const montant = devis.montant_total_xof.toLocaleString('fr-FR');
    const tarif = devis.tarif_unitaire_xof.toLocaleString('fr-FR');
    const BLEU = '#0d1b6e';
    const OR = '#FFE500';
    const logoBase64 = getLogoBase64();
    const sessionLabel = session?.date_debut
      ? `${new Date(session.date_debut).toLocaleDateString('fr-FR')} au ${new Date(session.date_fin || session.date_debut).toLocaleDateString('fr-FR')}`
      : 'Session non renseignée';

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(4,26,159,0.12);">

        <tr>
          <td style="background:${BLEU};padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="72" valign="middle">
                  ${logoBase64 ? `<img src="${logoBase64}" alt="FORGES" width="60" height="60" style="display:block;border-radius:8px;" />` : ''}
                </td>
                <td valign="middle" style="padding-left:16px;">
                  <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">FORGES AGRÉGATEUR</div>
                  <div style="color:${OR};font-size:13px;margin-top:4px;font-weight:600;">Plateforme de formations certifiantes</div>
                </td>
                <td align="right" valign="middle">
                  <div style="background:${OR};color:${BLEU};padding:8px 16px;border-radius:6px;font-weight:700;font-size:12px;text-align:center;letter-spacing:0.5px;">
                    FACTURE<br>
                    <span style="font-size:10px;font-weight:400;">${devis.numero_devis}</span>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr><td style="background:${OR};height:4px;"></td></tr>

        <tr>
          <td style="background:#ffffff;padding:36px 32px;">
            <p style="margin:0 0 8px;font-size:15px;color:#333;">
              Bonjour <strong>${org.contact_referent || org.raison_sociale}</strong>,
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
              Veuillez trouver ci-jointe la facture <strong style="color:${BLEU};">${devis.numero_devis}</strong>
              etablie pour <strong>${org.raison_sociale}</strong> concernant la formation
              <strong>${formation.intitule}</strong>.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;font-size:14px;">
              <tr style="background:${BLEU};">
                <td style="padding:12px 16px;color:#ffffff;font-weight:700;">Formation</td>
                <td style="padding:12px 16px;color:${OR};font-weight:700;text-align:right;">${formation.intitule}</td>
              </tr>
              <tr style="background:#f8f9fb;">
                <td style="padding:11px 16px;color:#666;">Nombre de places</td>
                <td style="padding:11px 16px;font-weight:600;text-align:right;color:#333;">${devis.nb_places}</td>
              </tr>
              <tr>
                <td style="padding:11px 16px;color:#666;border-top:1px solid #e2e8f0;">Session</td>
                <td style="padding:11px 16px;font-weight:600;text-align:right;color:#333;border-top:1px solid #e2e8f0;">${sessionLabel}</td>
              </tr>
              <tr>
                <td style="padding:11px 16px;color:#666;border-top:1px solid #e2e8f0;">Tarif unitaire</td>
                <td style="padding:11px 16px;font-weight:600;text-align:right;color:#333;border-top:1px solid #e2e8f0;">${tarif} FCFA</td>
              </tr>
              <tr style="background:${BLEU};">
                <td style="padding:14px 16px;color:#ffffff;font-weight:700;font-size:15px;">MONTANT TOTAL</td>
                <td style="padding:14px 16px;color:${OR};font-weight:700;font-size:18px;text-align:right;">${montant} FCFA</td>
              </tr>
            </table>

            ${devis.notes_admin ? `
            <p style="margin:20px 0 0;font-size:13px;color:#888;font-style:italic;border-left:3px solid ${OR};padding-left:12px;">${devis.notes_admin}</p>
            ` : ''}

	          <p style="margin:28px 0 0;font-size:14px;color:#555;line-height:1.6;">
	              Merci de bien vouloir regler dans les plus brefs delais.
	            </p>
          </td>
        </tr>

        <tr>
          <td style="background:${BLEU};padding:20px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#a0b0e0;font-size:12px;">
                  <strong style="color:#ffffff;">FORGES AGRÉGATEUR</strong><br>
                  contact@forges-group.com &nbsp;|&nbsp; +225 05 04 08 43 84<br>
                  <a href="https://edu.forges-group.com" style="color:#a0b0e0;text-decoration:none;">edu.forges-group.com</a>
                </td>
                <td align="right">
                  <div style="width:8px;height:8px;background:${OR};border-radius:50%;display:inline-block;"></div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `;
  }

}
