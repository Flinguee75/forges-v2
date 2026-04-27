import { PrismaClient } from '@prisma/client';

export class FormationPartenaireRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string) {
    return this.prisma.formationPartenaire.findUnique({
      where: { id },
      include: { formation: true, partenaire: true }
    });
  }

  async findByFormation(formation_id: string) {
    return this.prisma.formationPartenaire.findUnique({ where: { formation_id } });
  }

  async findEnAttente(responsable_id: string) {
    return this.prisma.formationPartenaire.findMany({
      where: {
        statut_validation: 'EN_ATTENTE',
        responsable_validateur_id: responsable_id
      },
      include: {
        formation: true,
        partenaire: { select: { raison_sociale: true, email_principal: true } }
      },
      orderBy: { date_soumission: 'asc' } // RM-134 : FIFO
    });
  }

  async create(data: {
    formation_id: string;
    partenaire_id: string;
    responsable_validateur_id?: string;
    prix_coutant_soumis: number;
  }) {
    return this.prisma.formationPartenaire.create({
      data: {
        ...data,
        statut_validation: 'EN_ATTENTE',
        version: 1,
        date_soumission: new Date(),
      }
    });
  }

  async valider(id: string, data: {
    responsable_id: string;
    prix_coutant_valide: number;
    type_formation: string;
    pilier_abonnement: string;
  }) {
    return this.prisma.formationPartenaire.update({
      where: { id },
      data: {
        statut_validation: 'VALIDE',
        responsable_validateur_id: data.responsable_id,
        prix_coutant_valide: data.prix_coutant_valide,
        date_validation: new Date(),
      }
    });
  }

  async rejeter(id: string, motif: string, corrections: string | undefined, responsable_id: string) {
    return this.prisma.formationPartenaire.update({
      where: { id },
      data: {
        statut_validation: 'REJETE',
        commentaire_responsable: motif,
        corrections_suggeres: corrections,
        responsable_validateur_id: responsable_id,
        date_validation: new Date(),
      }
    });
  }

  async incrementerVersion(formation_id: string) {
    const fp = await this.findByFormation(formation_id);
    if (!fp) return;
    return this.prisma.formationPartenaire.update({
      where: { formation_id },
      data: {
        statut_validation: 'EN_ATTENTE',
        version: fp.version + 1,
        date_soumission: new Date(),
        commentaire_responsable: null,
      }
    });
  }

  // RM-134 : formations en attente > 5j
  async findEnRetard() {
    const limite5j = new Date(Date.now() - 5 * 24 * 3600 * 1000);
    return this.prisma.formationPartenaire.findMany({
      where: {
        statut_validation: 'EN_ATTENTE',
        date_soumission: { lt: limite5j }
      },
      include: { partenaire: true, formation: true }
    });
  }
}
