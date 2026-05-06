import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const TEMPLATE_PATH = path.join(__dirname, '../../../../templates/devis-template.docx');

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'A planifier';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMontant(n: number | null | undefined): string {
  if (n == null) return '0';
  return n.toLocaleString('fr-FR');
}

export function genererDocxDevis(devis: {
  numero_devis: string;
  created_at: Date;
  nb_places: number;
  tarif_unitaire_xof: number;
  montant_total_xof: number;
  organisation: { raison_sociale: string; email: string; adresse?: string | null; pays?: string | null; id_legal?: string | null } | null;
  formation: { intitule: string } | null;
  session: { date_debut?: Date | null; date_fin?: Date | null } | null;
}): Buffer {
  const content = fs.readFileSync(TEMPLATE_PATH, 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

  const annee = new Date(devis.created_at).getFullYear();
  const numero = devis.numero_devis.split('-').pop() ?? '001';

  const sessionLabel = devis.session?.date_debut
    ? `${formatDate(devis.session.date_debut)} - ${formatDate(devis.session.date_fin)}`
    : 'A planifier';

  const totalLigne = devis.nb_places * devis.tarif_unitaire_xof;

  doc.render({
    ref_facture: devis.numero_devis,
    ref_devis: devis.numero_devis,
    date_emission: formatDate(devis.created_at),
    nom_organisation: devis.organisation?.raison_sociale ?? '',
    email_organisation: devis.organisation?.email ?? '',
    adresse_organisation: devis.organisation?.adresse ?? '',
    pays_organisation: devis.organisation?.pays ?? "Cote d'Ivoire",
    id_legal: (devis.organisation as any)?.id_legal ?? 'A completer',
    intitule: devis.formation?.intitule ?? '',
    session: sessionLabel,
    // Ligne 1 : la formation du devis
    quantite: String(devis.nb_places),
    tarif_unitaire: formatMontant(devis.tarif_unitaire_xof),
    total_ligne: formatMontant(totalLigne),
    // Lignes 2 et 3 : vides (le devis n'a qu'une formation)
    quantite2: '',
    tarif_unitaire2: '',
    total_ligne2: '',
    quantite3: '',
    tarif_unitaire3: '',
    total_ligne3: '',
    // Total general
    total_regler: formatMontant(devis.montant_total_xof),
  });

  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer;
}
