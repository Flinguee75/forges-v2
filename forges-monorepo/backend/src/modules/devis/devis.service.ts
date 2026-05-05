import { PrismaClient } from '@prisma/client';
import { DevisRepository } from './devis.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { CreerDevisDto } from './dto/devis.dto';
import { genererPdfDevis } from './devis-pdf.service';

export class DevisService {
  constructor(
    private readonly devisRepository: DevisRepository,
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger,
    private readonly emailService: EmailService
  ) {}

  async creerDevis(dto: CreerDevisDto, adminId: string) {
    const [organisation, formation] = await Promise.all([
      this.prisma.organisation.findUnique({ where: { id: dto.organisation_id } }),
      this.prisma.formation.findUnique({ where: { id: dto.formation_id } }),
    ]);

    if (!organisation) throw new Error('ORGANISATION_NOT_FOUND');
    if (!formation) throw new Error('FORMATION_NOT_FOUND');

    if (dto.session_id) {
      const session = await this.prisma.session.findUnique({ where: { id: dto.session_id } });
      if (!session || session.formation_id !== dto.formation_id) {
        throw new Error('SESSION_INVALIDE');
      }
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

    const langue = organisation.langue_preferee || 'FR';

    const session = dto.session_id
      ? await this.prisma.session.findUnique({ where: { id: dto.session_id } })
      : undefined;

    let pdfBuffer: Buffer | undefined;
    try {
      pdfBuffer = await genererPdfDevis({ devis, organisation, formation, session });
    } catch (pdfError: any) {
      await this.audit.warning('DEVIS_PDF_ECHEC', {
        devis_id: devis.id,
        numero_devis,
        error: pdfError?.message || 'UNKNOWN',
      });
    }

    await this.emailService.sendEmail({
      to: organisation.email,
      subject: langue === 'EN'
        ? `Your quote ${numero_devis} from FORGES`
        : `Votre devis ${numero_devis} — FORGES AGGREGATEUR`,
      html: this.buildEmailDevis(devis, organisation, formation, session, langue),
    }).catch(async (emailError: any) => {
      await this.audit.warning('DEVIS_EMAIL_ECHEC', {
        devis_id: devis.id,
        numero_devis,
        to: organisation.email,
        error: emailError?.message || 'UNKNOWN',
      });
    });

    if (pdfBuffer) {
      await this.emailService.sendEmailWithAttachment({
        to: organisation.email,
        subject: langue === 'EN'
          ? `Your quote ${numero_devis} from FORGES`
          : `Votre devis ${numero_devis} — FORGES AGGREGATEUR`,
        html: this.buildEmailDevis(devis, organisation, formation, session, langue),
        attachment: { filename: `${numero_devis}.pdf`, content: pdfBuffer, contentType: 'application/pdf' },
      }).catch(async (emailError: any) => {
        await this.audit.warning('DEVIS_PDF_EMAIL_ECHEC', {
          devis_id: devis.id,
          numero_devis,
          to: organisation.email,
          error: emailError?.message || 'UNKNOWN',
        });
      });
    }

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

  async payerDevis(id: string, agentId: string, notes_admin?: string) {
    const devis = await this.devisRepository.findById(id);
    if (!devis) throw new Error('DEVIS_NOT_FOUND');
    if (devis.statut !== 'CREE') throw new Error('DEVIS_STATUT_INVALIDE');

    const updated = await this.devisRepository.payer(id, notes_admin);

    await this.audit.info('DEVIS_PAYE', {
      devis_id: id,
      numero_devis: devis.numero_devis,
      organisation_id: devis.organisation_id,
      montant_total_xof: devis.montant_total_xof,
      agent_id: agentId,
    });

    return updated;
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

  private formatMontant(montant: number): string {
    return montant.toLocaleString('fr-FR') + ' XOF';
  }

  private buildEmailDevis(devis: any, organisation: any, formation: any, session: any, langue: string): string {
    const sessionInfo = session
      ? `${new Date(session.date_debut).toLocaleDateString('fr-FR')} — ${new Date(session.date_fin).toLocaleDateString('fr-FR')}`
      : 'À planifier';

    const styles = `
      <style>
        .devis-container { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1C2833; }
        .devis-header { background: #F4F6F7; padding: 20px; border-radius: 8px 8px 0 0; }
        .devis-header h2 { margin: 0; color: #1B4F72; font-size: 18px; }
        .devis-header p { margin: 5px 0 0; color: #566573; font-size: 12px; }
        .devis-content { padding: 20px; }
        .destinataire { margin-bottom: 20px; }
        .destinataire-label { color: #2E86C1; font-size: 11px; font-weight: bold; text-transform: uppercase; }
        .destinataire-nom { font-size: 16px; font-weight: bold; margin: 4px 0; }
        .destinataire-email { color: #566573; font-size: 13px; }
        .section-title { color: #1B4F72; font-size: 14px; font-weight: bold; margin: 20px 0 12px; border-bottom: 1px solid #D5D8DC; padding-bottom: 8px; }
        .devis-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .devis-table th { background: #1B4F72; color: white; padding: 10px 8px; text-align: left; font-weight: 600; }
        .devis-table td { padding: 12px 8px; border-bottom: 1px solid #D5D8DC; }
        .devis-table tr:nth-child(even) { background: #F4F6F7; }
        .devis-table .text-right { text-align: right; }
        .devis-table .text-center { text-align: center; }
        .total-row { background: #1B4F72 !important; color: white; font-weight: bold; }
        .total-row td { padding: 14px 8px; }
        .instructions { background: #F4F6F7; padding: 16px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #1B4F72; }
        .instructions-title { color: #1B4F72; font-weight: bold; font-size: 13px; margin-bottom: 10px; }
        .instructions-text { font-size: 12px; line-height: 1.6; color: #566573; }
        .rib-table { width: 100%; font-size: 12px; margin-top: 10px; }
        .rib-table td { padding: 4px 0; }
        .rib-label { color: #566573; font-weight: 600; width: 140px; }
        .conditions { margin-top: 20px; padding: 12px; background: #F4F6F7; border-radius: 8px; font-size: 11px; color: #566573; line-height: 1.5; }
        .conditions strong { color: #1B4F72; }
        .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #D5D8DC; font-size: 11px; color: #566573; text-align: center; }
      </style>
    `;

    if (langue === 'EN') {
      return `
        ${styles}
        <div class="devis-container">
          <div class="devis-header">
            <h2>FORGES AGGREGATEUR — QUOTE</h2>
            <p>${devis.numero_devis} — Issued on ${new Date(devis.created_at || Date.now()).toLocaleDateString('en-GB')}</p>
          </div>
          <div class="devis-content">
            <div class="destinataire">
              <div class="destinataire-label">Recipient</div>
              <div class="destinataire-nom">${organisation.raison_sociale}</div>
              <div class="destinataire-email">${organisation.email}</div>
              ${organisation.identifiant_legal ? `<div style="color:#566573;font-size:12px;">Legal ID: ${organisation.identifiant_legal}</div>` : ''}
            </div>
            <div class="section-title">Order Details</div>
            <table class="devis-table">
              <thead>
                <tr>
                  <th>Training</th>
                  <th>Session</th>
                  <th class="text-center">Qty</th>
                  <th class="text-right">Unit Price</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${formation.intitule}</td>
                  <td>${sessionInfo}</td>
                  <td class="text-center">${devis.nb_places}</td>
                  <td class="text-right">${this.formatMontant(devis.tarif_unitaire_xof)}</td>
                  <td class="text-right">${this.formatMontant(devis.montant_total_xof)}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="4">TOTAL AMOUNT</td>
                  <td class="text-right">${this.formatMontant(devis.montant_total_xof)}</td>
                </tr>
              </tbody>
            </table>
            <div class="instructions">
              <div class="instructions-title">Payment Instructions</div>
              <div class="instructions-text">Payment must be made by bank transfer to the following account:</div>
              <table class="rib-table">
                <tr><td class="rib-label">Bank:</td><td>${process.env.FORGES_BANK_NOM || 'Banque FORGES CI'}</td></tr>
                <tr><td class="rib-label">Account holder:</td><td>GIE FORGES AGGREGATEUR</td></tr>
                <tr><td class="rib-label">IBAN / RIB:</td><td>${process.env.FORGES_BANK_IBAN || 'To be configured in FORGES_BANK_IBAN'}</td></tr>
                <tr><td class="rib-label">BIC/SIFT code:</td><td>${process.env.FORGES_BANK_BIC || 'To be configured in FORGES_BANK_BIC'}</td></tr>
                <tr><td class="rib-label">Mandatory reference:</td><td><strong>${devis.numero_devis}</strong></td></tr>
              </table>
            </div>
            <div class="conditions">
              <strong>Terms:</strong> This quote is valid for 30 days from the date of issue. Please include the reference <strong>${devis.numero_devis}</strong> in your transfer label. Upon receipt of payment, your FORGES contact will proceed with enrollment confirmation.
            </div>
            <div class="footer">
              FORGES AGGREGATEUR — Contact: ${process.env.EMAIL_FROM || 'contact@forges-group.com'}
            </div>
          </div>
        </div>
      `;
    }

    return `
      ${styles}
      <div class="devis-container">
        <div class="devis-header">
          <h2>FORGES AGGREGATEUR — DEVIS</h2>
          <p>${devis.numero_devis} — Émis le ${new Date(devis.created_at || Date.now()).toLocaleDateString('fr-FR')}</p>
        </div>
        <div class="devis-content">
          <div class="destinataire">
            <div class="destinataire-label">Destinataire</div>
            <div class="destinataire-nom">${organisation.raison_sociale}</div>
            <div class="destinataire-email">${organisation.email}</div>
            ${organisation.pays ? `<div style="color:#566573;font-size:12px;">${organisation.pays}</div>` : ''}
            ${organisation.identifiant_legal ? `<div style="color:#566573;font-size:12px;">ID légal : ${organisation.identifiant_legal}</div>` : ''}
          </div>
          <div class="section-title">Détails de la commande</div>
          <table class="devis-table">
            <thead>
              <tr>
                <th>Formation</th>
                <th>Session</th>
                <th class="text-center">Qté</th>
                <th class="text-right">P.U.</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${formation.intitule}</td>
                <td>${sessionInfo}</td>
                <td class="text-center">${devis.nb_places}</td>
                <td class="text-right">${this.formatMontant(devis.tarif_unitaire_xof)}</td>
                <td class="text-right">${this.formatMontant(devis.montant_total_xof)}</td>
              </tr>
              <tr class="total-row">
                <td colspan="4">MONTANT TOTAL</td>
                <td class="text-right">${this.formatMontant(devis.montant_total_xof)}</td>
              </tr>
            </tbody>
          </table>
          <div class="instructions">
            <div class="instructions-title">Instructions de paiement</div>
            <div class="instructions-text">Le paiement s'effectue par virement bancaire aux coordonnées suivantes :</div>
            <table class="rib-table">
              <tr><td class="rib-label">Banque :</td><td>${process.env.FORGES_BANK_NOM || 'Banque FORGES CI'}</td></tr>
              <tr><td class="rib-label">Titulaire du compte :</td><td>GIE FORGES AGGREGATEUR</td></tr>
              <tr><td class="rib-label">IBAN / RIB :</td><td>${process.env.FORGES_BANK_IBAN || 'À renseigner dans FORGES_BANK_IBAN'}</td></tr>
              <tr><td class="rib-label">Code BIC/SWIFT :</td><td>${process.env.FORGES_BANK_BIC || 'À renseigner dans FORGES_BANK_BIC'}</td></tr>
              <tr><td class="rib-label">Référence obligatoire :</td><td><strong>${devis.numero_devis}</strong></td></tr>
            </table>
          </div>
          <div class="conditions">
            <strong>Conditions :</strong> Ce devis est valable 30 jours à compter de sa date d'émission. Merci d'indiquer obligatoirement la référence <strong>${devis.numero_devis}</strong> dans le libellé de votre virement. Après réception du paiement, votre contact FORGES procédera à la confirmation des inscriptions.
          </div>
          <div class="footer">
            FORGES AGGREGATEUR — Contact : ${process.env.EMAIL_FROM || 'contact@forges-group.com'}
          </div>
        </div>
      </div>
    `;
  }
}
