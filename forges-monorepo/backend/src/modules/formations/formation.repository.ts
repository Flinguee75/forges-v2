import { PrismaClient } from '@prisma/client';

export class FormationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string) {
    return this.prisma.formation.findUnique({
      where: { id },
      include: {
        sessions: true,
        partenaire: true,
        _count: {
          select: { sessions: true },
        },
      }
    });
  }

  async findAll(filters: {
    statut?: string;
    type_formation?: string;
    mode_formation?: string;
    langue?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20, search, ...where } = filters;
    const skip = (page - 1) * limit;
    const searchClause = search
      ? {
          OR: [
            { intitule: { contains: search, mode: 'insensitive' as const } },
            { description_courte: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const whereClause = {
      ...where,
      ...searchClause,
    };

    const [formations, total] = await Promise.all([
      this.prisma.formation.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          _count: {
            select: { sessions: true },
          },
        },
      }),
      this.prisma.formation.count({ where: whereClause })
    ]);
    return { formations, total, page, limit };
  }

  // RM-20 : catalogue public avec pagination
  async findCataloguePublic(filters?: {
    page?: number;
    limit?: number;
    langue?: string;
  }) {
    const { page = 1, limit = 20, langue } = filters || {};
    const skip = (page - 1) * limit;

    const where = {
      statut: 'ACTIVE',
      // RM-21 : formations En attente planification exclues du catalogue
      ...(langue && { langues_disponibles: { has: langue } })
    };

    const [formations, total] = await Promise.all([
      this.prisma.formation.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          intitule: true,
          description_courte: true,
          duree_jours: true,
          cout_catalogue: true,
          type_formation: true,
          mode_formation: true,
          lieu: true,
          inclus_abonnement: true,
          pilier_abonnement: true,
          langues_disponibles: true,
          certification_delivree: true,
          public_cible: true,
          partenaire: {
            select: { raison_sociale: true }
          },
          _count: {
            select: { sessions: true },
          },
          sessions: {
            where: { statut: 'INSCRIPTIONS_OUVERTES' },
            select: {
              id: true,
              date_debut: true,
              date_fin: true,
              places_restantes: true,
              lieu: true,
            }
          }
        },
        orderBy: { created_at: 'desc' }
      }),
      this.prisma.formation.count({ where })
    ]);

    return {
      formations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async create(data: {
    intitule: string;
    description_courte: string;
    description_longue?: string;
    duree_jours: number;
    cout_catalogue: number;
    responsable_id: string;
    type_formation: string;
    mode_formation: string;
    lieu?: string;
    pilier_abonnement?: string;
    langues_disponibles: string[];
    certification_delivree?: boolean;
    public_cible?: string;
    objectifs_pedagogiques?: string[];
    prerequis?: string;
    duree_acces_jours?: number;
    url_externe_chiffree?: string;
  }) {
    // RM-102 : calcul automatique inclus_abonnement
    const inclus_abonnement = this.calculerInclus(data.type_formation, data.pilier_abonnement);

    // RM-22/23 : statut initial selon mode_formation
    const statut = data.mode_formation === 'A_LA_DEMANDE' ? 'ACTIVE' : 'EN_ATTENTE_PLANIFICATION';

    return this.prisma.formation.create({
      data: { ...data, inclus_abonnement, statut }
    });
  }

  async update(id: string, data: Partial<{
    intitule: string;
    description_courte: string;
    description_longue: string;
    duree_jours: number;
    cout_catalogue: number;
    statut: string;
    mode_formation: string;
    lieu: string;
    pilier_abonnement: string;
    langues_disponibles: string[];
    certification_delivree: boolean;
    public_cible: string;
    objectifs_pedagogiques: string[];
    prerequis: string;
    url_externe_chiffree?: string;
  }>) {
    return this.prisma.formation.update({ where: { id }, data });
  }

  async archiver(id: string) {
    // RM-11 : archivage si paiements validés (pas de suppression)
    return this.prisma.formation.update({
      where: { id },
      data: { statut: 'ARCHIVEE' }
    });
  }

  async assignerType(id: string, type_formation: string, pilier_abonnement: string) {
    // RM-127 : assignation type_formation par FORGES uniquement
    const inclus_abonnement = this.calculerInclus(type_formation, pilier_abonnement);
    return this.prisma.formation.update({
      where: { id },
      data: { type_formation, pilier_abonnement, inclus_abonnement }
    });
  }

  async hasPaiementsValides(id: string): Promise<boolean> {
    const count = await this.prisma.paiement.count({
      where: { dossier: { formation_id: id }, statut: 'CONFIRME' }
    });
    return count > 0;
  }

  // RM-03 : annuler tous les dossiers EN_ATTENTE_VERIFICATION avant archivage
  async annulerDossiersEnAttente(formationId: string): Promise<number> {
    const result = await this.prisma.dossier.updateMany({
      where: {
        formation_id: formationId,
        statut: 'EN_ATTENTE_VERIFICATION'
      },
      data: { statut: 'ANNULE' }
    });
    return result.count;
  }

  // RM-102 : inclus_abonnement = true SI ET SEULEMENT SI
  // type_formation=STANDARD ET pilier_abonnement ∈ {RETAIL, TOUS}
  calculerInclus(type_formation?: string, pilier_abonnement?: string): boolean {
    return (
      type_formation === 'STANDARD' &&
      ['RETAIL', 'TOUS'].includes(pilier_abonnement || '')
    );
  }

  // RM-92 : Accès formation à la demande — recherche accès existant
  async findAccesDemande(formationId: string, userId: string) {
    return this.prisma.accesFormationDemande.findFirst({
      where: {
        formation_id: formationId,
        apprenant_id: userId
      },
      orderBy: { date_activation: 'desc' }
    });
  }

  // RM-92 : Créer AccesFormationDemande
  async createAccesDemande(data: {
    formation_id: string;
    apprenant_id: string;
    statut: string;
    date_expiration: Date;
  }) {
    return this.prisma.accesFormationDemande.create({
      data: {
        ...data,
        source_financement: 'ABONNEMENT' // RM-92 : accès via abonnement
      }
    });
  }
}
