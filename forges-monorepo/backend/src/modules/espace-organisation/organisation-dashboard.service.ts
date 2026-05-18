import { EspaceOrganisationRepository } from './espace-organisation.repository';
import { RapportService } from './rapport.service';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { PrismaClient } from '@prisma/client';

export class OrganisationDashboardService {
  constructor(
    private readonly orgRepo: EspaceOrganisationRepository,
    private readonly rapport: RapportService,
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger
  ) {}

  // UCS12 — Dashboard organisation
  async getDashboard(organisation_id: string) {
    const [org, stats, recentInscriptions, recentPaiements] = await Promise.all([
      this.orgRepo.findOrganisationById(organisation_id),
      this.orgRepo.getStatsOrganisation(organisation_id),
      this.orgRepo.findRecentInscriptions(organisation_id),
      this.orgRepo.findRecentPaiements(organisation_id),
    ]);

    if (!org) throw new Error('ORGANISATION_NOT_FOUND');

    // RM-83 : vérification essai expiré
    const essaiExpire = org.date_fin_essai && org.date_fin_essai < new Date() && !org.abonnement_org_id;
    const joursRestantsEssai = org.date_fin_essai
      ? Math.max(0, Math.ceil((org.date_fin_essai.getTime() - Date.now()) / (24 * 3600 * 1000)))
      : null;

    return {
      organisation: {
        raison_sociale: org.raison_sociale,
        nom: org.raison_sociale,
        statut: org.statut,
        essai_actif: !!org.date_fin_essai && !essaiExpire,
        jours_restants_essai: joursRestantsEssai,
        essai_expire: essaiExpire,
        abonnement_org: org.abonnement_org,
        abonnement_b2b: org.abonnement_b2b,
      },
      stats,
      recent_inscriptions: recentInscriptions.map((dossier: any) => ({
        ...dossier,
        etudiant: dossier.apprenant
          ? {
              ...dossier.apprenant,
              prenom: dossier.apprenant.prenom || dossier.apprenant.prenoms || '',
            }
          : null,
        session: dossier.session
          ? {
              ...dossier.session,
              formation: dossier.formation
                ? {
                    ...dossier.formation,
                    titre: dossier.formation.titre || dossier.formation.intitule || '',
                  }
                : dossier.session.formation,
            }
          : null,
      })),
      recent_paiements: recentPaiements.map((paiement: any) => ({
        ...paiement,
        montant: paiement.montant_final ?? paiement.montant_catalogue ?? 0,
        methode_paiement: paiement.methode_paiement || paiement.methode || null,
        dossier: paiement.dossier
          ? {
              ...paiement.dossier,
              etudiant: paiement.dossier.apprenant
                ? {
                    ...paiement.dossier.apprenant,
                    prenom: paiement.dossier.apprenant.prenom || paiement.dossier.apprenant.prenoms || '',
                  }
                : null,
              session: paiement.dossier.session
                ? {
                    ...paiement.dossier.session,
                    formation: paiement.dossier.formation
                      ? {
                          ...paiement.dossier.formation,
                          titre: paiement.dossier.formation.titre || paiement.dossier.formation.intitule || '',
                        }
                      : paiement.dossier.session.formation,
                  }
                : null,
            }
          : null,
      })),
      subscription_summary: {
        organisation: org.abonnement_org || null,
        b2b: org.abonnement_b2b
          ? {
              ...org.abonnement_b2b,
              exists: true,
            }
          : null,
      },
    };
  }

  // UCS12 — Suivi des inscriptions (tous dossiers de l'organisation, pas seulement B2B)
  async getSuiviInscriptions(organisation_id: string, filters: any) {
    const { page = 1, limit = 20, statut, formation_id } = filters || {};
    const parsedPage = parseInt(String(page), 10) || 1;
    const parsedLimit = parseInt(String(limit), 10) || 20;
    const skip = (parsedPage - 1) * parsedLimit;

    const where: any = {
      apprenant: { organisation_id },
    };
    if (statut) where.statut = statut;
    if (formation_id) where.formation_id = formation_id;

    const [dossiers, total] = await Promise.all([
      this.prisma.dossier.findMany({
        where,
        include: {
          apprenant: { select: { id: true, nom: true, prenoms: true, email: true } },
          formation: { select: { id: true, intitule: true, type_formation: true } },
          session: { select: { date_debut: true, date_fin: true, statut: true } },
          paiement: { select: { statut: true, confirmed_at: true } },
        },
        skip,
        take: parsedLimit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.dossier.count({ where }),
    ]);

    return { dossiers, total, page: parsedPage, limit: parsedLimit };
  }

  // UCS12 — Historique paiements
  async getMesPaiements(organisation_id: string, filters: any) {
    const { page = 1, limit = 20, date_debut, date_fin } = filters;
    const parsedPage = parseInt(String(page), 10) || 1;
    const parsedLimit = parseInt(String(limit), 10) || 20;
    const skip = (parsedPage - 1) * parsedLimit;

    const where: any = {
      dossier: {
        apprenant: { organisation_id }
      }
    };

    if (date_debut) {
      where.confirmed_at = { gte: new Date(date_debut) };
    }
    if (date_fin) {
      where.confirmed_at = { ...where.confirmed_at, lte: new Date(date_fin) };
    }

    const [paiements, total] = await Promise.all([
      this.prisma.paiement.findMany({
        where,
        include: {
          dossier: {
            include: {
              apprenant: { select: { nom: true, prenoms: true, email: true } },
              formation: { select: { intitule: true } }
            }
          }
        },
        skip,
        take: parsedLimit,
        orderBy: { confirmed_at: 'desc' }
      }),
      this.prisma.paiement.count({ where })
    ]);

    return { paiements, total, page: parsedPage, limit: parsedLimit };
  }

  // UCS12 — Mon profil
  async getMonProfil(organisation_id: string) {
    const org = await this.orgRepo.findOrganisationById(organisation_id);
    if (!org) throw new Error('ORGANISATION_NOT_FOUND');

    return {
      id: org.id,
      raison_sociale: org.raison_sociale,
      email: org.email,
      contact_referent: org.contact_referent,
      type: org.type,
      sous_types: org.sous_types,
      identifiant_legal: org.identifiant_legal,
      pays: org.pays,
      langue_preferee: org.langue_preferee,
      statut: org.statut,
    };
  }

  // UCS12 — Mise à jour profil
  async updateMonProfil(organisation_id: string, data: any) {
    const patch = this.buildOrganisationProfilePatch(data);

    let updated;
    try {
      updated = await this.prisma.organisation.update({
        where: { id: organisation_id },
        data: patch
      });
    } catch (error: any) {
      if (error.code === 'P2002' && Array.isArray(error.meta?.target) && error.meta.target.includes('email')) {
        throw new Error('EMAIL_ALREADY_EXISTS');
      }
      throw error;
    }

    await this.audit.info('PROFIL_ORGANISATION_MIS_A_JOUR', {
      organisation_id,
    });

    return {
      message: 'Profil mis à jour avec succès',
      organisation: {
        id: updated.id,
        raison_sociale: updated.raison_sociale,
        email: updated.email,
        contact_referent: updated.contact_referent,
        type: updated.type,
        sous_types: updated.sous_types,
        identifiant_legal: updated.identifiant_legal,
        pays: updated.pays,
        langue_preferee: updated.langue_preferee,
        statut: updated.statut,
      }
    };
  }

  private buildOrganisationProfilePatch(data: any) {
    const allowedFields = ['raison_sociale', 'email', 'contact_referent', 'pays', 'langue_preferee'];
    return Object.fromEntries(
      allowedFields
        .filter((field) => data[field] !== undefined)
        .map((field) => [field, data[field]])
    );
  }

  // UCS12 — Rapport bailleur PDF
  async getRapportBailleur(organisation_id: string, filters?: any) {
    return this.rapport.genererRapportBailleur(organisation_id, filters);
  }

  // UCS12 — Mes vouchers
  async getMesVouchers(organisation_id: string, filters?: any) {
    return this.orgRepo.findVouchers(organisation_id, filters);
  }

  // UCS12 — Commander des vouchers
  async commanderVouchers(organisation_id: string, data: any) {
    const formation = await this.prisma.formation.findUnique({
      where: { id: data.formation_id }
    });

    if (!formation) throw new Error('FORMATION_NOT_FOUND');

    // Créer les vouchers
    // Note: TypeVoucherApporteur n'a que APPORT et PROMOTIONNEL
    // Les vouchers organisation utilisent PROMOTIONNEL et sont distingués par organisation_id
    const vouchers = [];
    for (let i = 0; i < data.quantite; i++) {
      const voucher = await this.prisma.voucherOrganisation.create({
        data: {
          organisation_id,
          formation_id: data.formation_id,
          code: `ORG-${Date.now()}-${i}`,
          statut: 'ACTIF',
          type: 'ORGANISATION',
          valeur: formation.cout_catalogue || 0,
          type_valeur: 'MONTANT',
          quota_max: 1,
          quota_utilise: 0,
          date_expiration: new Date(Date.now() + 365 * 24 * 3600 * 1000), // 1 an
        }
      });
      vouchers.push(voucher);
    }

    await this.audit.info('VOUCHERS_COMMANDES', {
      organisation_id,
      formation_id: data.formation_id,
      quantite: data.quantite,
    });

    return { message: `${data.quantite} vouchers créés avec succès`, vouchers };
  }
}
