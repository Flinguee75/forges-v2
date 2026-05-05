import PDFDocument from 'pdfkit';

const COULEUR_PRIMAIRE = '#1A3C5E';
const COULEUR_SECONDAIRE = '#4A90D9';
const COULEUR_TEXTE = '#2D2D2D';
const COULEUR_SUBTEXT = '#666666';
const COULEUR_BORDURE = '#E0E0E0';
const COULEUR_FOND_HEADER = '#F4F8FC';

function formatMontant(montant: number): string {
  return montant.toLocaleString('fr-FR') + ' XOF';
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export async function genererPdfDevis(params: {
  devis: any;
  organisation: any;
  formation: any;
  session?: any;
}): Promise<Buffer> {
  const { devis, organisation, formation, session } = params;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 100; // marges 50 de chaque côté

    // ─── EN-TÊTE ──────────────────────────────────────────────────────
    doc
      .rect(50, 40, pageWidth, 80)
      .fill(COULEUR_FOND_HEADER);

    doc
      .fillColor(COULEUR_PRIMAIRE)
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('FORGES AGRÉGATEUR', 60, 55);

    doc
      .fillColor(COULEUR_SUBTEXT)
      .fontSize(9)
      .font('Helvetica')
      .text('Plateforme de formations certifiantes', 60, 80)
      .text('contact@forges-group.com', 60, 93);

    doc
      .fillColor(COULEUR_PRIMAIRE)
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('DEVIS', 430, 55, { align: 'right' });

    doc
      .fillColor(COULEUR_TEXTE)
      .fontSize(9)
      .font('Helvetica')
      .text(devis.numero_devis, 430, 80, { align: 'right' })
      .text(`Émis le ${formatDate(devis.created_at || new Date())}`, 430, 93, { align: 'right' });

    // ─── BLOC ORGANISATION ────────────────────────────────────────────
    doc.moveDown(4);
    const yOrg = 145;

    doc
      .fillColor(COULEUR_SECONDAIRE)
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('DESTINATAIRE', 50, yOrg);

    doc
      .fillColor(COULEUR_TEXTE)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(organisation.raison_sociale, 50, yOrg + 14);

    doc
      .fillColor(COULEUR_SUBTEXT)
      .fontSize(9)
      .font('Helvetica')
      .text(organisation.email, 50, yOrg + 28)
      .text(organisation.pays || '', 50, yOrg + 40);

    if (organisation.identifiant_legal) {
      doc.text(`ID légal : ${organisation.identifiant_legal}`, 50, yOrg + 52);
    }

    // ─── LIGNE SÉPARATRICE ────────────────────────────────────────────
    const ySep = 215;
    doc
      .moveTo(50, ySep)
      .lineTo(50 + pageWidth, ySep)
      .strokeColor(COULEUR_BORDURE)
      .lineWidth(1)
      .stroke();

    // ─── TABLEAU FORMATION / SESSION ──────────────────────────────────
    const yTable = ySep + 20;

    doc
      .fillColor(COULEUR_PRIMAIRE)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('Détails de la commande', 50, yTable);

    // En-tête tableau
    const yTHead = yTable + 20;
    doc
      .rect(50, yTHead, pageWidth, 22)
      .fill(COULEUR_PRIMAIRE);

    const cols = [50, 260, 360, 430, 495];
    const headers = ['Formation', 'Session', 'Qté', 'P.U.', 'Total'];
    headers.forEach((h, i) => {
      doc
        .fillColor('#FFFFFF')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(h, cols[i] + 5, yTHead + 7, { width: cols[i + 1] ? cols[i + 1] - cols[i] - 5 : 100 });
    });

    // Ligne de données
    const yTRow = yTHead + 22;
    doc
      .rect(50, yTRow, pageWidth, 30)
      .fill(COULEUR_FOND_HEADER);

    const sessionInfo = session
      ? `${formatDate(session.date_debut)} — ${formatDate(session.date_fin)}`
      : 'À planifier';

    doc
      .fillColor(COULEUR_TEXTE)
      .fontSize(9)
      .font('Helvetica')
      .text(formation.intitule, cols[0] + 5, yTRow + 6, { width: 200, ellipsis: true })
      .text(sessionInfo, cols[1] + 5, yTRow + 6, { width: 90, ellipsis: true })
      .text(String(devis.nb_places), cols[2] + 5, yTRow + 11)
      .text(formatMontant(devis.tarif_unitaire_xof), cols[3] + 5, yTRow + 6, { width: 60, ellipsis: true })
      .text(formatMontant(devis.montant_total_xof), cols[4] + 5, yTRow + 11);

    // Ligne totale
    const yTotal = yTRow + 30;
    doc
      .rect(50, yTotal, pageWidth, 1)
      .fill(COULEUR_BORDURE);

    doc
      .rect(380, yTotal + 10, pageWidth - 330, 30)
      .fill(COULEUR_PRIMAIRE);

    doc
      .fillColor('#FFFFFF')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('MONTANT TOTAL', 390, yTotal + 18)
      .text(formatMontant(devis.montant_total_xof), 490, yTotal + 18, { align: 'right', width: 95 });

    // ─── INSTRUCTIONS DE PAIEMENT ─────────────────────────────────────
    const yPay = yTotal + 60;

    doc
      .rect(50, yPay, pageWidth, 130)
      .strokeColor(COULEUR_BORDURE)
      .lineWidth(1)
      .stroke();

    doc
      .fillColor(COULEUR_PRIMAIRE)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Instructions de paiement', 60, yPay + 10);

    doc
      .fillColor(COULEUR_TEXTE)
      .fontSize(9)
      .font('Helvetica')
      .text('Le paiement s\'effectue par virement bancaire aux coordonnées suivantes :', 60, yPay + 26);

    const ribData = [
      ['Banque', process.env.FORGES_BANK_NOM || 'Banque FORGES CI'],
      ['Titulaire du compte', 'GIE FORGES AGRÉGATEUR'],
      ['IBAN / RIB', process.env.FORGES_BANK_IBAN || 'À renseigner dans FORGES_BANK_IBAN'],
      ['Code BIC/SWIFT', process.env.FORGES_BANK_BIC || 'À renseigner dans FORGES_BANK_BIC'],
      ['Référence obligatoire', devis.numero_devis],
    ];

    ribData.forEach(([label, value], i) => {
      const y = yPay + 42 + i * 16;
      doc
        .fillColor(COULEUR_SUBTEXT)
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(`${label} :`, 65, y, { width: 130 });
      doc
        .fillColor(COULEUR_TEXTE)
        .font('Helvetica')
        .fontSize(8)
        .text(value, 200, y, { width: 330 });
    });

    // ─── CONDITIONS ───────────────────────────────────────────────────
    const yCond = yPay + 145;

    doc
      .rect(50, yCond, pageWidth, 60)
      .fill(COULEUR_FOND_HEADER);

    doc
      .fillColor(COULEUR_PRIMAIRE)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Conditions', 60, yCond + 10);

    doc
      .fillColor(COULEUR_TEXTE)
      .fontSize(8)
      .font('Helvetica')
      .text(
        `• Ce devis est valable 30 jours à compter de sa date d'émission.\n` +
        `• Merci d'indiquer obligatoirement la référence ${devis.numero_devis} dans le libellé de votre virement.\n` +
        `• Après réception du paiement, votre contact FORGES procédera à la confirmation des inscriptions.`,
        60,
        yCond + 22,
        { width: pageWidth - 20 }
      );

    // ─── PIED DE PAGE ─────────────────────────────────────────────────
    const yFooter = doc.page.height - 60;
    doc
      .moveTo(50, yFooter)
      .lineTo(50 + pageWidth, yFooter)
      .strokeColor(COULEUR_BORDURE)
      .lineWidth(1)
      .stroke();

    const supportEmail = process.env.EMAIL_FROM || 'contact@forges-group.com';
    doc
      .fillColor(COULEUR_SUBTEXT)
      .fontSize(8)
      .font('Helvetica')
      .text(
        `Pour toute question : ${supportEmail} — FORGES AGRÉGATEUR, GIE enregistré en Côte d'Ivoire`,
        50,
        yFooter + 10,
        { align: 'center', width: pageWidth }
      );

    doc.end();
  });
}
