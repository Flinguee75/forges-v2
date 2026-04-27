import { PrismaClient } from '@prisma/client';
import { AuditLogger } from '../../shared/audit/audit.logger';

export class RapportService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger
  ) {}

  // Génération rapport bailleur PDF (< 10s)
  async genererRapportBailleur(organisation_id: string, filters?: {
    debut?: Date;
    fin?: Date;
    formation_id?: string;
  }): Promise<object> {
    const [organisation, dossiers, stats] = await Promise.all([
      this.prisma.organisation.findUnique({
        where: { id: organisation_id },
        include: { abonnement_b2b: true }
      }),
      this.prisma.dossier.findMany({
        where: {
          apprenant: { organisation_id },
          ...(filters?.formation_id && { formation_id: filters.formation_id }),
          ...(filters?.debut || filters?.fin ? {
            created_at: {
              gte: filters?.debut,
              lte: filters?.fin
            }
          } : {})
        },
        include: {
          apprenant: { select: { nom: true, prenoms: true, email: true } },
          formation: { select: { intitule: true, type_formation: true, duree_jours: true } },
          session: { select: { date_debut: true, date_fin: true, statut: true } },
          paiement: { select: { statut: true, montant_final: true, confirmed_at: true } }
        }
      }),
      // Stats agrégées
      this.prisma.dossier.groupBy({
        by: ['statut'],
        where: { apprenant: { organisation_id } },
        _count: true
      })
    ]);

    const nbPaies = stats.find(s => s.statut === 'PAYE')?._count || 0;
    const nbEnCours = stats.find(s => s.statut === 'RETENU')?._count || 0;
    const nbAttente = stats.find(s => s.statut === 'EN_ATTENTE_VERIFICATION')?._count || 0;

    const rapport = {
      date_generation: new Date().toISOString(),
      organisation: {
        raison_sociale: organisation?.raison_sociale,
        contact_referent: organisation?.contact_referent,
        pays: organisation?.pays,
      },
      periode: { debut: filters?.debut, fin: filters?.fin },
      statistiques: {
        total_beneficiaires: dossiers.length,
        paies: nbPaies,
        en_cours: nbEnCours,
        en_attente: nbAttente,
        taux_completion: dossiers.length > 0 ? Math.round(nbPaies / dossiers.length * 100) : 0,
      },
      beneficiaires: dossiers.map(d => ({
        nom: `${d.apprenant.prenoms} ${d.apprenant.nom}`,
        email: d.apprenant.email,
        formation: d.formation.intitule,
        statut: d.statut,
        date_inscription: d.created_at,
        date_completion: d.paiement?.confirmed_at,
      }))
    };

    await this.audit.info('RAPPORT_PDF_GENERE', {
      organisation_id,
      nb_beneficiaires: dossiers.length
    });

    return rapport;
  }
}
