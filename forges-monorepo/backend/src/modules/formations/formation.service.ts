import { FormationRepository } from './formation.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { CreateFormationDto, AssignerTypeFormationDto, UpdateFormationDto } from './dto/formation.dto';
import { PrismaClient } from '@prisma/client';

export class FormationService {
  private prisma: PrismaClient;

  constructor(
    private readonly formationRepo: FormationRepository,
    private readonly audit: AuditLogger
  ) {
    this.prisma = new PrismaClient();
  }

  // UCS04 — Création formation interne (Admin/Responsable)
  async create(dto: CreateFormationDto, userId: string) {
    // RM-86 : type_formation assigné par FORGES uniquement
    // Si non fourni : null (sera assigné via assignerType)
    const formation = await this.formationRepo.create({
      intitule: dto.intitule,
      description_courte: dto.description_courte,
      description_longue: dto.description_longue,
      duree_jours: dto.duree_jours,
      cout_catalogue: dto.cout_catalogue,
      responsable_id: userId,
      type_formation: dto.type_formation || 'STANDARD', // défaut STANDARD si interne
      mode_formation: dto.mode_formation,
      pilier_abonnement: dto.pilier_abonnement,
      langues_disponibles: dto.langues_disponibles,
      certification_delivree: dto.certification_delivree,
      public_cible: dto.public_cible,
      objectifs_pedagogiques: dto.objectifs_pedagogiques,
      prerequis: dto.prerequis,
      duree_acces_jours: dto.duree_acces_jours,
    });

    // RM-96 : pas de session possible pour formations à la demande
    // (géré côté sessions — vérification au moment de créer une session)

    await this.audit.info('FORMATION_CREEE', {
      formation_id: formation.id,
      mode: dto.mode_formation,
      user_id: userId
    });

    return formation;
  }

  // UCS04 — Modification formation
  async update(id: string, dto: UpdateFormationDto, userId: string) {
    const formation = await this.formationRepo.findById(id);
    if (!formation) throw new Error('FORMATION_NOT_FOUND');

    // RM-13 : archivée = lecture seule
    if (formation.statut === 'ARCHIVEE') throw new Error('FORMATION_ARCHIVEE');

    // RM-12 : tarif non modifiable après 1ère inscription payée
    if (dto.cout_catalogue !== undefined && dto.cout_catalogue !== formation.cout_catalogue) {
      const hasPaiements = await this.formationRepo.hasPaiementsValides(id);
      if (hasPaiements) throw new Error('TARIF_NON_MODIFIABLE_APRES_INSCRIPTION');
    }

    // Recalcul inclus_abonnement si pilier modifié
    const updatedData: any = { ...dto };
    if (dto.pilier_abonnement) {
      updatedData.inclus_abonnement = this.formationRepo.calculerInclus(
        formation.type_formation || undefined,
        dto.pilier_abonnement
      );
    }

    const updated = await this.formationRepo.update(id, updatedData);
    await this.audit.info('FORMATION_MODIFIEE', { formation_id: id, user_id: userId });
    return updated;
  }

  // UCS04 — Archivage (RM-11 : pas de suppression si paiements validés)
  async archiver(id: string, userId: string) {
    const formation = await this.formationRepo.findById(id);
    if (!formation) throw new Error('FORMATION_NOT_FOUND');

    // RM-13 : déjà archivée
    if (formation.statut === 'ARCHIVEE') throw new Error('FORMATION_DEJA_ARCHIVEE');

    // RM-11 : bloquer archivage si paiements validés
    const hasPaiements = await this.formationRepo.hasPaiementsValides(id);
    if (hasPaiements) {
      throw new Error('FORMATION_HAS_PAYMENTS');
    }

    // RM-03 : annuler tous les dossiers EN_ATTENTE_VERIFICATION avant archivage
    const dossiersAnnules = await this.formationRepo.annulerDossiersEnAttente(id);

    const formationArchivee = await this.formationRepo.archiver(id);
    await this.audit.info('FORMATION_ARCHIVEE', {
      formation_id: id,
      user_id: userId,
      dossiers_annules: dossiersAnnules
    });
    return formationArchivee;
  }

  // Publication formation (ADMIN)
  async publish(id: string, userId: string) {
    const formation = await this.formationRepo.findById(id);
    if (!formation) throw new Error('FORMATION_NOT_FOUND');

    if (formation.statut === 'ARCHIVEE') throw new Error('FORMATION_ARCHIVEE');

    const sessionCount = formation._count?.sessions || 0;
    const statut = formation.mode_formation === 'A_LA_DEMANDE' || sessionCount > 0
      ? 'ACTIVE'
      : 'EN_ATTENTE_PLANIFICATION';

    const updated = await this.formationRepo.update(id, { statut });
    await this.audit.info('FORMATION_PUBLIEE', { formation_id: id, user_id: userId, statut });
    return updated;
  }

  // RM-127 : assignation type_formation par Responsable FORGES
  async assignerType(id: string, dto: AssignerTypeFormationDto, userId: string) {
    const formation = await this.formationRepo.findById(id);
    if (!formation) throw new Error('FORMATION_NOT_FOUND');

    const updated = await this.formationRepo.assignerType(id, dto.type_formation, dto.pilier_abonnement);

    // RM-102 : recalcul inclus_abonnement automatique
    await this.audit.info('FORMATION_TYPE_ASSIGNE', {
      formation_id: id,
      type_formation: dto.type_formation,
      pilier_abonnement: dto.pilier_abonnement,
      inclus_abonnement: updated.inclus_abonnement,
      user_id: userId
    });

    return updated;
  }

  // UCS04 — Catalogue public avec pagination
  async getCataloguePublic(filters?: {
    page?: number;
    limit?: number;
    langue?: string;
  }) {
    return this.formationRepo.findCataloguePublic(filters);
  }

  // UCS04 — Détail formation
  async getById(id: string) {
    const formation = await this.formationRepo.findById(id);
    if (!formation) throw new Error('FORMATION_NOT_FOUND');
    return formation;
  }

  // Backoffice — liste avec filtres
  async getAll(filters: any) {
    return this.formationRepo.findAll(filters);
  }

  // RM-92 — Accès formation à la demande (APPRENANT/ORGANISATION abonné actif)
  async accederDemande(formationId: string, userId: string, userRole: string) {
    const formation = await this.formationRepo.findById(formationId);
    if (!formation) throw new Error('FORMATION_NOT_FOUND');

    // RM-96 : vérifier mode À_LA_DEMANDE
    if (formation.mode_formation !== 'A_LA_DEMANDE') {
      throw new Error('NOT_A_LA_DEMANDE');
    }

    // RM-102 : vérifier éligibilité abonnement
    if (!formation.inclus_abonnement) {
      throw new Error('NOT_INCLUDED_IN_SUBSCRIPTION');
    }

    // TODO: Vérifier que l'utilisateur a un abonnement actif
    // const hasActiveSubscription = await this.checkActiveSubscription(userId, userRole);
    // if (!hasActiveSubscription) throw new Error('NO_ACTIVE_SUBSCRIPTION');

    // Vérifier si accès déjà existant et non expiré
    const existingAccess = await this.formationRepo.findAccesDemande(formationId, userId);
    if (existingAccess && existingAccess.statut === 'ACTIF') {
      return { success: true, message: 'Accès déjà actif pour cette formation.', acces: existingAccess };
    }

    // Créer AccesFormationDemande
    const acces = await this.formationRepo.createAccesDemande({
      formation_id: formationId,
      apprenant_id: userId, // peut être organisation_id selon le contexte
      statut: 'ACTIF',
      date_expiration: new Date(Date.now() + (formation.duree_acces_jours || 365) * 24 * 3600 * 1000)
    });

    await this.audit.info('ACCES_FORMATION_DEMANDE_CREE', {
      formation_id: formationId,
      user_id: userId,
      user_role: userRole,
      date_expiration: acces.date_expiration
    });

    return {
      success: true,
      message: 'Accès accordé à la formation à la demande.',
      acces
    };
  }

  // RM-88 : Vérifier abonnement Premium actif pour réduction -15%
  async checkAbonnementPremium(apprenantId: string) {
    return await this.prisma.abonnementRetail.findFirst({
      where: {
        apprenant_id: apprenantId,
        offre: 'PREMIUM',
        statut: 'ACTIF',
      },
    });
  }
}
