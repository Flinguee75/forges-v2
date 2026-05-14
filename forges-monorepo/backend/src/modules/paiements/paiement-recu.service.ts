import PDFDocument from 'pdfkit';
import type { PrismaClient } from '@prisma/client';
import { EmailService } from '../../shared/email/email.service';
import { AuditLogger } from '../../shared/audit/audit.logger';

interface RecuData {
  paiementId: string;
  dossierId: string;
  transactionId: string | null;
  orderNgser: string | null;
  montantFinal: number;
  wallet: string | null;
  confirmedAt: Date | null;
  provider: string;

  apprenantNom: string;
  apprenantPrenom: string | null;
  apprenantEmail: string;

  formationIntitule: string;
  formationTypeFormation: string | null;

  sessionDateDebut: Date | null;
  sessionDateFin: Date | null;
  sessionLieu: string | null;

  organisationNom: string | null;
  sourceFinancement: string | null;
}

function formatDate(d: Date | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatMontant(centimes: number): string {
  return Math.round(centimes / 100).toLocaleString('fr-FR');
}

function genNumeroRecu(paiementId: string, confirmedAt: Date | null): string {
  const year = (confirmedAt || new Date()).getFullYear();
  const short = paiementId.replace(/-/g, '').substring(0, 8).toUpperCase();
  return `FORGES-RECU-${year}-${short}`;
}

function genererPdfRecu(data: RecuData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const BLUE = '#1B4F72';
    const GREEN = '#148F77';
    const GRAY = '#566573';
    const LIGHT = '#F4F6F7';
    const BLACK = '#1C2833';

    const numeroRecu = genNumeroRecu(data.paiementId, data.confirmedAt);
    const nomComplet = [data.apprenantPrenom, data.apprenantNom].filter(Boolean).join(' ');

    // En-tete
    doc.rect(0, 0, doc.page.width, 90).fill(BLUE);
    doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
      .text('FORGES', 50, 28);
    doc.fontSize(10).font('Helvetica')
      .text('Plateforme de formations certifiantes', 50, 54);
    doc.fontSize(14).font('Helvetica-Bold')
      .text('RECU DE PAIEMENT', 0, 35, { align: 'right', width: doc.page.width - 50 });

    doc.moveDown(4);

    // Numero et date
    doc.fillColor(GRAY).fontSize(10).font('Helvetica')
      .text(`Reference : ${numeroRecu}`, { align: 'right' });
    doc.text(`Date : ${formatDate(data.confirmedAt || new Date())}`, { align: 'right' });

    doc.moveDown(1.5);

    // Bloc apprenant
    doc.fillColor(BLUE).fontSize(12).font('Helvetica-Bold').text('APPRENANT');
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor(GREEN).lineWidth(1.5).stroke();
    doc.moveDown(0.4);

    doc.fillColor(BLACK).fontSize(11).font('Helvetica-Bold').text(nomComplet);
    doc.font('Helvetica').fillColor(GRAY).fontSize(10).text(data.apprenantEmail);
    if (data.organisationNom && (data.sourceFinancement === 'B2B' || data.sourceFinancement === 'VOUCHER')) {
      doc.text(`Organisation : ${data.organisationNom}`);
    }

    doc.moveDown(1.5);

    // Bloc formation
    doc.fillColor(BLUE).fontSize(12).font('Helvetica-Bold').text('FORMATION');
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor(GREEN).lineWidth(1.5).stroke();
    doc.moveDown(0.4);

    doc.fillColor(BLACK).fontSize(11).font('Helvetica-Bold').text(data.formationIntitule);
    if (data.formationTypeFormation) {
      doc.font('Helvetica').fillColor(GRAY).fontSize(10).text(`Type : ${data.formationTypeFormation}`);
    }
    if (data.sessionDateDebut && data.sessionDateFin) {
      doc.text(`Session : ${formatDate(data.sessionDateDebut)} — ${formatDate(data.sessionDateFin)}`);
    }
    if (data.sessionLieu) {
      doc.text(`Lieu : ${data.sessionLieu}`);
    }

    doc.moveDown(1.5);

    // Bloc paiement
    doc.fillColor(BLUE).fontSize(12).font('Helvetica-Bold').text('PAIEMENT');
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor(GREEN).lineWidth(1.5).stroke();
    doc.moveDown(0.4);

    const rows: [string, string][] = [
      ['Statut', 'CONFIRME'],
      ['Montant', `${formatMontant(data.montantFinal)} XOF`],
      ['Reference transaction', data.transactionId || data.orderNgser || '-'],
      ['Ordre FORGES', data.orderNgser || '-'],
      ['Moyen de paiement', data.wallet || data.provider],
      ['Date de confirmation', formatDate(data.confirmedAt)],
    ];

    const colLabel = 50;
    const colValue = 250;
    const rowH = 22;
    let y = doc.y;

    rows.forEach(([label, value], i) => {
      if (i % 2 === 0) {
        doc.rect(colLabel, y, doc.page.width - 100, rowH).fill(LIGHT);
      }
      doc.fillColor(GRAY).fontSize(10).font('Helvetica')
        .text(label, colLabel + 6, y + 6, { width: 180 });
      doc.fillColor(BLACK).font('Helvetica-Bold')
        .text(value, colValue, y + 6, { width: doc.page.width - colValue - 50 });
      y += rowH;
    });

    // Montant total encadre
    doc.moveDown(1);
    y = doc.y;
    doc.rect(colLabel, y, doc.page.width - 100, 36).fill(GREEN);
    doc.fillColor('white').fontSize(13).font('Helvetica-Bold')
      .text('TOTAL PAYE', colLabel + 10, y + 10, { width: 180 });
    doc.text(`${formatMontant(data.montantFinal)} XOF`, colValue, y + 10, { width: doc.page.width - colValue - 50 });

    doc.moveDown(3);

    // Mention legale
    doc.fillColor(GRAY).fontSize(9).font('Helvetica')
      .text(
        'Ce recu confirme votre inscription et le paiement associe. FORGES est l\'unique interlocuteur financier pour cette inscription. Conservez ce document.',
        { align: 'center' }
      );

    // Pied de page
    const footerY = doc.page.height - 60;
    doc.moveTo(50, footerY).lineTo(doc.page.width - 50, footerY).strokeColor(LIGHT).lineWidth(1).stroke();
    doc.fillColor(GRAY).fontSize(9)
      .text('FORGES - contact@forges.ci | www.forges.ci', 50, footerY + 10, { align: 'center' });
    doc.text(`Document genere le ${formatDate(new Date())}`, 50, footerY + 24, { align: 'center' });

    doc.end();
  });
}

export class PaiementRecuService {
  private emailService: EmailService;
  private audit: AuditLogger;

  constructor(private prisma: PrismaClient, audit: AuditLogger) {
    this.emailService = new EmailService();
    this.audit = audit;
  }

  async genererEtEnvoyerRecu(dossierId: string): Promise<void> {
    try {
      // Requêtes typées séparées pour éviter les problèmes d'inférence Prisma
      const dossier = await (this.prisma as any).dossier.findUnique({
        where: { id: dossierId },
        include: {
          apprenant: true,
          formation: true,
          session: true,
          voucher_organisation: { include: { organisation: true } },
          paiement: true,
        },
      }) as any;

      if (!dossier) {
        await this.audit.error('RECU_DOSSIER_NOT_FOUND', { dossier_id: dossierId });
        return;
      }

      const paiement = dossier.paiement;
      if (!paiement || paiement.statut !== 'CONFIRME') {
        await this.audit.error('RECU_PAIEMENT_NOT_FOUND', { dossier_id: dossierId });
        return;
      }

      const organisationNom: string | null = dossier.voucher_organisation?.organisation?.nom ?? null;

      const data: RecuData = {
        paiementId: paiement.id,
        dossierId: dossier.id,
        transactionId: paiement.transaction_id,
        orderNgser: paiement.order_ngser,
        montantFinal: paiement.montant_final ?? paiement.montant_initie,
        wallet: paiement.wallet_ngser ?? null,
        confirmedAt: paiement.confirmed_at ?? null,
        provider: paiement.provider,

        apprenantNom: dossier.apprenant.nom,
        apprenantPrenom: dossier.apprenant.prenoms ?? null,
        apprenantEmail: dossier.apprenant.email,

        formationIntitule: dossier.formation.intitule,
        formationTypeFormation: dossier.formation.type_formation ?? null,

        sessionDateDebut: dossier.session?.date_debut ?? null,
        sessionDateFin: dossier.session?.date_fin ?? null,
        sessionLieu: dossier.session?.lieu ?? null,

        organisationNom,
        sourceFinancement: dossier.source_financement ?? null,
      };

      const pdfBuffer = await genererPdfRecu(data);
      const numeroRecu = genNumeroRecu(data.paiementId, data.confirmedAt);

      const nomComplet = [data.apprenantPrenom, data.apprenantNom].filter(Boolean).join(' ');
      const montantFormate = formatMontant(data.montantFinal);

      const sessionInfo = data.sessionDateDebut && data.sessionDateFin
        ? `${formatDate(data.sessionDateDebut)} — ${formatDate(data.sessionDateFin)}`
        : null;

      const frontendUrl = process.env.FRONTEND_URL || 'https://edu.forges-group.com';
      const supportEmail = process.env.EMAIL_SUPPORT || process.env.EMAIL_FROM || 'contact@forges.ci';

      const variables: Record<string, string> = {
        nom_apprenant: nomComplet,
        formation_intitule: data.formationIntitule,
        organisation_nom: data.organisationNom || '',
        montant_paye: montantFormate,
        numero_recu: numeroRecu,
        transaction_id: data.transactionId || data.orderNgser || '-',
        date_paiement: formatDate(data.confirmedAt),
        wallet: data.wallet || data.provider,
        session_debut: formatDate(data.sessionDateDebut),
        session_fin: formatDate(data.sessionDateFin),
        session_lieu: data.sessionLieu || '',
        lien_dossier: `${frontendUrl}/apprenant/dossiers/${dossierId}`,
        site_url: frontendUrl,
        support_email: supportEmail,
      };

      // Interpolation conditionnelle des blocs {{#if_xxx}}...{{/if_xxx}}
      const conditionals: Record<string, boolean> = {
        organisation: !!(data.organisationNom && (data.sourceFinancement === 'B2B' || data.sourceFinancement === 'VOUCHER')),
        wallet: !!data.wallet,
        session: !!(data.sessionDateDebut && data.sessionDateFin),
        lieu: !!data.sessionLieu,
      };

      await (this.emailService as any).sendEmailFromTemplateWithAttachment(
        dossier.apprenant.email,
        'paiement-confirme',
        'FR',
        variables,
        conditionals,
        {
          filename: `recu-paiement-${numeroRecu}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        }
      );

      await this.audit.info('RECU_PAIEMENT_ENVOYE', {
        dossier_id: dossierId,
        paiement_id: paiement.id,
        email: dossier.apprenant.email,
        numero_recu: numeroRecu,
      });
    } catch (err: any) {
      // Non-bloquant : ne pas faire crasher le flow paiement
      console.error('[PaiementRecuService] Erreur generation recu:', err?.message);
      await this.audit.error('RECU_PAIEMENT_ERREUR', {
        dossier_id: dossierId,
        error: err?.message,
      });
    }
  }
}
