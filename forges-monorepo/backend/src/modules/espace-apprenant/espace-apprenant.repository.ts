import { PrismaClient } from '@prisma/client';

export class EspaceApprenantRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findDossiersByApprenant(apprenant_id: string) {
    return this.prisma.dossier.findMany({
      where: { apprenant_id },
      include: {
        formation: { select: { id: true, intitule: true, type_formation: true, mode_formation: true, cout_catalogue: true } },
        session: { select: { id: true, date_debut: true, date_fin: true, statut: true } },
        paiement: { select: { statut: true, montant_final: true, confirmed_at: true } }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async findDossierById(id: string, apprenant_id: string) {
    return this.prisma.dossier.findFirst({
      where: { id, apprenant_id },
      include: {
        formation: { select: { id: true, intitule: true, type_formation: true, mode_formation: true, cout_catalogue: true } },
        session: true,
        paiement: true
      }
    });
  }

  async annulerDossier(id: string) {
    return this.prisma.dossier.update({
      where: { id },
      data: { statut: 'ANNULE' }
    });
  }

  // RM-26 : attestation si dossier PAYE + session CLOTUREE
  async findDossiersAvecAttestationDisponible(apprenant_id: string) {
    return this.prisma.dossier.findMany({
      where: {
        apprenant_id,
        statut: 'PAYE',
        session: { statut: 'CLOTUREE' }
      },
      include: {
        formation: { select: { intitule: true, duree_jours: true } },
        session: { select: { date_debut: true, date_fin: true } },
        apprenant: { select: { nom: true, prenoms: true } }
      }
    });
  }

  // RM-92, RM-103 : accès formations à la demande
  async findAccesFormationsDemande(apprenant_id: string) {
    return this.prisma.accesFormationDemande.findMany({
      where: { apprenant_id },
      include: {
        formation: {
          select: {
            id: true,
            intitule: true,
            description_courte: true,
            duree_jours: true,
            type_formation: true,
            mode_formation: true,
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async findAccesFormationById(acces_id: string, apprenant_id: string) {
    return this.prisma.accesFormationDemande.findFirst({
      where: {
        id: acces_id,
        apprenant_id
      },
      include: {
        formation: true
      }
    });
  }

  async creerAccesFormationDemande(data: {
    apprenant_id: string;
    formation_id: string;
    source_financement: string;
    date_expiration: Date;
  }) {
    return this.prisma.accesFormationDemande.create({
      data: {
        apprenant_id: data.apprenant_id,
        formation_id: data.formation_id,
        source_financement: data.source_financement,
        date_expiration: data.date_expiration,
        statut: 'ACTIF',
        progression: 0,
      }
    });
  }

  async updateProgression(acces_id: string, progression: number) {
    return this.prisma.accesFormationDemande.update({
      where: { id: acces_id },
      data: {
        progression,
        last_access_at: new Date()
      }
    });
  }

  async suspendreAccesByAbonnement(apprenant_id: string) {
    // RM-103/105 : suspension si abonnement inactif
    return this.prisma.accesFormationDemande.updateMany({
      where: {
        apprenant_id,
        source_financement: 'ABONNEMENT',
        statut: 'ACTIF'
      },
      data: { statut: 'SUSPENDU' }
    });
  }

  async reactiverAccesByAbonnement(apprenant_id: string) {
    return this.prisma.accesFormationDemande.updateMany({
      where: {
        apprenant_id,
        source_financement: 'ABONNEMENT',
        statut: 'SUSPENDU'
      },
      data: { statut: 'ACTIF' }
    });
  }
}
