import { DashboardRepository } from './dashboard.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';

type DashboardFilters = {
  date_from?: string;
  date_to?: string;
  formation_id?: string;
  session_id?: string;
  dossier_statut?: string;
  paiement_statut?: string;
  methode?: string;
};

export class DashboardService {
  constructor(
    private readonly dashboardRepo: DashboardRepository,
    private readonly audit: AuditLogger
  ) {}

  async getKPI(role: string, userId: string) {
    let data: any;

    switch (role) {
      case 'ADMIN':
        data = await this.dashboardRepo.getStatsAdmin();
        break;
      case 'AGENT':
        data = await this.dashboardRepo.getStatsAgent();
        break;
      case 'RESPONSABLE':
        data = await this.dashboardRepo.getStatsResponsable(userId);
        break;
      case 'SUPERVISEUR':
        data = await this.dashboardRepo.getStatsSuperviseur();
        break;
      case 'PARTENAIRE':
        data = await this.dashboardRepo.getStatsPartenaire(userId);
        break;
      case 'APPORTEUR':
        data = await this.dashboardRepo.getStatsApporteur(userId);
        break;
      case 'ORGANISATION':
      case 'GESTIONNAIRE':
        data = await this.dashboardRepo.getStatsOrganisation(userId);
        break;
      default:
        data = {};
    }

    await this.audit.info('DASHBOARD_CONSULTE', { role, user_id: userId });

    return { role, data, timestamp: new Date().toISOString() };
  }

  async exportRapport(role: string, userId: string, format: 'PDF' | 'EXCEL', periode?: { debut: Date; fin: Date }) {
    const kpi = await this.getKPI(role, userId);

    const rapport = {
      meta: {
        role,
        format,
        periode,
        genere_le: new Date().toISOString(),
        genere_par: userId,
      },
      contenu: kpi.data,
    };

    await this.audit.info('RAPPORT_EXPORTE', { role, format, user_id: userId });

    return rapport;
  }

  async getGlobalStats(role: string, userId: string, filters: DashboardFilters = {}) {
    const stats = await this.dashboardRepo.getGlobalStats(role, userId, filters);
    await this.audit.info('DASHBOARD_STATS_GLOBALES', { role, user_id: userId });
    return stats;
  }

  async getFormationStats(role: string, userId: string, formationId: string, filters: DashboardFilters = {}) {
    const stats = await this.dashboardRepo.getFormationStats(role, userId, formationId, filters);
    await this.audit.info('DASHBOARD_STATS_FORMATION', { role, user_id: userId, formation_id: formationId });
    return stats;
  }

  async getSessionStats(role: string, userId: string, sessionId: string, filters: DashboardFilters = {}) {
    const stats = await this.dashboardRepo.getSessionStats(role, userId, sessionId, filters);
    await this.audit.info('DASHBOARD_STATS_SESSION', { role, user_id: userId, session_id: sessionId });
    return stats;
  }

  async getPaiementsStats(role: string, userId: string, filters: DashboardFilters = {}) {
    const stats = await this.dashboardRepo.getPaiementsStats(role, userId, filters);
    await this.audit.info('DASHBOARD_STATS_PAIEMENTS', { role, user_id: userId });
    return stats;
  }

  async getInscriptionsEvolution(role: string, userId: string, filters: DashboardFilters = {}) {
    const stats = await this.dashboardRepo.getInscriptionsEvolution(role, userId, filters);
    await this.audit.info('DASHBOARD_INSCRIPTIONS_EVOLUTION', { role, user_id: userId });
    return stats;
  }

  async getPaiementsEvolution(role: string, userId: string, filters: DashboardFilters = {}) {
    const stats = await this.dashboardRepo.getPaiementsEvolution(role, userId, filters);
    await this.audit.info('DASHBOARD_PAIEMENTS_EVOLUTION', { role, user_id: userId });
    return stats;
  }

  async getRapportsData(role: string, userId: string, filters: DashboardFilters = {}) {
    const data = await this.dashboardRepo.getRapportsData(role, userId, filters);
    await this.audit.info('DASHBOARD_RAPPORTS_DATA', { role, user_id: userId });
    return data;
  }

  async exportRapportCSV(role: string, userId: string, filters: DashboardFilters = {}) {
    const data = await this.getRapportsData(role, userId, filters);
    const header = ['Étudiant', 'Email', 'Formation', 'Date Session', 'Statut Dossier', 'Statut Paiement', 'Montant (centimes)', 'Source Financement'];
    const rows = data.rapports.map((row) => [
      row.apprenant_nom || '',
      row.apprenant_email || '',
      row.formation_titre || '',
      row.session_date_debut ? new Date(row.session_date_debut).toISOString() : '',
      row.statut_dossier || '',
      row.statut_paiement || '',
      String(row.montant_paiement || 0),
      row.source_financement || '',
    ]);

    const csvEscape = (value: unknown) => {
      const text = String(value ?? '');
      if (text.includes('"') || text.includes(',') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    return [header, ...rows]
      .map((line) => line.map(csvEscape).join(','))
      .join('\n');
  }

  async exportRapportPDF(role: string, userId: string, filters: DashboardFilters = {}) {
    const data = await this.getRapportsData(role, userId, filters);
    return generateMinimalPdf([
      'Rapport FORGES',
      `Genere le ${new Date().toLocaleDateString('fr-FR')}`,
      `Lignes: ${data.rapports.length}`,
      '',
      ...data.rapports.slice(0, 30).map((row) => {
        const amount = Number(row.montant_paiement || 0).toLocaleString('fr-FR');
        return `${row.apprenant_nom || 'N/A'} | ${row.formation_titre || 'N/A'} | ${row.statut_dossier || 'N/A'} | ${amount} FCFA`;
      }),
    ]);
  }
}

function toAscii(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?');
}

function escapePdfText(value: string) {
  return toAscii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function generateMinimalPdf(lines: string[]) {
  const content = [
    'BT',
    '/F1 12 Tf',
    '50 800 Td',
    ...lines.flatMap((line, index) => {
      const text = line.trim() ? `(${escapePdfText(line)}) Tj` : '( ) Tj';
      if (index === 0) {
        return [text, '0 -18 Td'];
      }
      return [text, '0 -14 Td'];
    }),
    'ET',
  ].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = ['0000000000 65535 f \n'];

  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(String(pdf.length).padStart(10, '0') + ' 00000 n \n');
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += offsets.join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}
