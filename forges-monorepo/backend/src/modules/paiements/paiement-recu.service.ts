import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
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
  return Math.round(centimes / 100)
    .toLocaleString('fr-FR')
    .replace(/\u202f/g, ' ')
    .replace(/\u00a0/g, ' ');
}

function genNumeroRecu(paiementId: string, confirmedAt: Date | null): string {
  const year = (confirmedAt || new Date()).getFullYear();
  const short = paiementId.replace(/-/g, '').substring(0, 8).toUpperCase();
  return `FORGES-RECU-${year}-${short}`;
}

const LOGO_PATH = path.join(__dirname, '../../../templates/logo_forges.png');

function genererPdfRecu(data: RecuData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const DARK_BLUE = '#1B4F72';
    const GREEN = '#148F77';
    const GRAY = '#566573';
    const LIGHT = '#F4F6F7';
    const BLACK = '#1C2833';
    const WHITE = '#FFFFFF';
    const BLUE_LIGHT = '#B0C4D8';

    const M = 50; // marge gauche/droite
    const W = doc.page.width;
    const CONTENT_W = W - M * 2;
    const COL_LABEL = 160; // largeur colonne label dans les tables

    const numeroRecu = genNumeroRecu(data.paiementId, data.confirmedAt);
    const nomComplet = [data.apprenantPrenom, data.apprenantNom].filter(Boolean).join(' ');
    const datePaiement = formatDate(data.confirmedAt || new Date());
    const providerLabel = data.provider === 'FINEO' ? 'Fineo' : data.provider;
    const commandeLabel = data.provider === 'FINEO' ? 'Commande Fineo' : 'Référence commande';
    const transactionLabel = data.provider === 'FINEO' ? 'Transaction Fineo' : 'Référence transaction';

    // ─── EN-TETE ───────────────────────────────────────────────
    const headerH = 85;
    doc.rect(0, 0, W, headerH).fill(DARK_BLUE);

    // Logo FORGES
    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, M, 15, { height: 45 });
    } else {
      doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(22)
        .text('FORGES', M, 22, { lineBreak: false });
      doc.fillColor(BLUE_LIGHT).font('Helvetica').fontSize(9)
        .text('Plateforme de formations certifiantes', M, 50);
    }

    // Titre recu (droite)
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(15)
      .text('RECU DE PAIEMENT', M, 20, { align: 'right', width: CONTENT_W });
    doc.fillColor(BLUE_LIGHT).font('Helvetica').fontSize(9)
      .text(numeroRecu, M, 44, { align: 'right', width: CONTENT_W });
    doc.text(`Emis le ${datePaiement}`, M, 57, { align: 'right', width: CONTENT_W });

    let y = headerH + 20;

    // ─── EMETTEUR / DESTINATAIRE ──────────────────────────────
    const halfW = (CONTENT_W - 10) / 2;

    // En-tetes bleus
    doc.rect(M, y, halfW, 22).fill(DARK_BLUE);
    doc.rect(M + halfW + 10, y, halfW, 22).fill(DARK_BLUE);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(10)
      .text('EMETTEUR', M, y + 6, { width: halfW, align: 'center' });
    doc.text('DESTINATAIRE', M + halfW + 10, y + 6, { width: halfW, align: 'center' });

    // Ligne verte sous les en-tetes
    doc.rect(M, y + 22, halfW, 2).fill(GREEN);
    doc.rect(M + halfW + 10, y + 22, halfW, 2).fill(GREEN);

    y += 30;

    const emetteurLines = [
      { text: 'FORGES AGREGATEUR', bold: true },
      { text: 'contact@forges-group.com', bold: false },
      { text: "08 BP 384 Abidjan 08, Cote d'Ivoire", bold: false },
      { text: 'edu.forges.group', bold: false },
    ];
    const destLines = [
      { text: nomComplet, bold: true },
      { text: data.apprenantEmail, bold: false },
      { text: data.organisationNom || '', bold: false },
      { text: '', bold: false },
    ];

    emetteurLines.forEach((line, i) => {
      if (line.bold) {
        doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(10);
      } else {
        doc.fillColor(GRAY).font('Helvetica').fontSize(9);
      }
      doc.text(line.text, M, y, { width: halfW, lineBreak: false });

      const dLine = destLines[i];
      if (dLine.bold) {
        doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(10);
      } else {
        doc.fillColor(GRAY).font('Helvetica').fontSize(9);
      }
      doc.text(dLine.text || '', M + halfW + 10, y, { width: halfW, lineBreak: false });
      y += 16;
    });

    y += 20;

    // ─── SECTION HELPER ──────────────────────────────────────
    const drawSectionTitle = (title: string) => {
      doc.fillColor(DARK_BLUE).font('Helvetica-Bold').fontSize(11).text(title, M, y);
      y += 16;
      doc.rect(M, y, CONTENT_W, 2).fill(GREEN);
      y += 8;
    };

    const drawTable = (rows: [string, string][]) => {
      const rowH = 24;
      rows.forEach(([label, value], i) => {
        const bg = i % 2 === 0 ? LIGHT : WHITE;
        doc.rect(M, y, CONTENT_W, rowH).fill(bg);
        doc.rect(M, y, CONTENT_W, rowH).stroke('#EAECEE');

        doc.fillColor(GRAY).font('Helvetica').fontSize(10)
          .text(label, M + 8, y + 7, { width: COL_LABEL, lineBreak: false });
        doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(10)
          .text(value, M + COL_LABEL + 8, y + 7, { width: CONTENT_W - COL_LABEL - 16, lineBreak: false });
        y += rowH;
      });
    };

    // ─── FORMATION ───────────────────────────────────────────
    drawSectionTitle('FORMATION');

    const formationRows: [string, string][] = [
      ['Formation', data.formationIntitule],
    ];
    if (data.sessionDateDebut && data.sessionDateFin) {
      formationRows.push(['Session', `${formatDate(data.sessionDateDebut)} — ${formatDate(data.sessionDateFin)}`]);
    }
    if (data.sessionLieu) formationRows.push(['Lieu', data.sessionLieu]);
    if (data.formationTypeFormation) formationRows.push(['Type', data.formationTypeFormation]);

    drawTable(formationRows);
    y += 20;

    // ─── PAIEMENT ────────────────────────────────────────────
    drawSectionTitle('PAIEMENT');

    const paiementRows: [string, string][] = [
      ['Statut', 'CONFIRME'],
      ['Reference recu', numeroRecu],
      [transactionLabel, data.transactionId || '-'],
      [commandeLabel, data.orderNgser || '-'],
      ['Moyen de paiement', data.wallet || providerLabel],
      ['Date de confirmation', datePaiement],
    ];
    drawTable(paiementRows);
    y += 16;

    // ─── TOTAL ───────────────────────────────────────────────
    const totalH = 40;
    doc.rect(M, y, CONTENT_W, totalH).fill(GREEN);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(13)
      .text('TOTAL PAYE', M + 12, y + 12, { width: COL_LABEL + 40, lineBreak: false });
    doc.text(`${formatMontant(data.montantFinal)} XOF`, M, y + 12, { align: 'right', width: CONTENT_W - 12 });

    y += totalH + 20;

    // ─── MENTION LEGALE ──────────────────────────────────────
    doc.fillColor(GRAY).font('Helvetica').fontSize(8)
      .text(
        "Ce recu confirme votre inscription et le paiement associe. " +
        "FORGES est l'unique interlocuteur financier pour cette inscription. " +
        "Conservez ce document.",
        M, y, { align: 'center', width: CONTENT_W }
      );

    // ─── PIED DE PAGE ─────────────────────────────────────────
    const footerY = doc.page.height - 50;
    doc.rect(M, footerY, CONTENT_W, 1).fill('#EAECEE');
    doc.fillColor(GRAY).font('Helvetica').fontSize(8)
      .text(
        'FORGES AGREGATEUR  |  contact@forges-group.com  |  edu.forges.group',
        M, footerY + 8, { align: 'center', width: CONTENT_W }
      );
    doc.text(
      `Document genere le ${formatDate(new Date())}`,
      M, footerY + 22, { align: 'center', width: CONTENT_W }
    );

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
          voucher_organisation: true,
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

      // Récupérer l'organisation via voucher si applicable
      let organisationNom: string | null = null;
      if (dossier.voucher_organisation?.organisation_id) {
        const org = await (this.prisma as any).organisation.findUnique({
          where: { id: dossier.voucher_organisation.organisation_id },
          select: { nom: true },
        }) as any;
        organisationNom = org?.nom ?? null;
      }

      const data: RecuData = {
        paiementId: paiement.id,
        dossierId: dossier.id,
        transactionId: paiement.transaction_id,
        orderNgser: paiement.order_ngser,
        montantFinal: paiement.montant_final ?? paiement.montant_initie,
        wallet: paiement.wallet_ngser ?? null,
        confirmedAt: paiement.confirmed_at ?? paiement.created_at ?? null,
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

      const frontendUrl = process.env.FRONTEND_URL || 'https://edu.forges.group';
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

      const destinataire = process.env.EMAIL_TEST_OVERRIDE || dossier.apprenant.email;

      await (this.emailService as any).sendEmailFromTemplateWithAttachment(
        destinataire,
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
        email: destinataire,
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
