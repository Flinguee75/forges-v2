import { Router } from 'express';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { prisma } from '../../shared/prisma/prisma.client';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { EmailService } from '../../shared/email/email.service';

const emailService = new EmailService();

const router = Router();

// ============================================
// ROUTES BACKOFFICE ORGANISATIONS
// Accessible à: ADMIN, SUPERVISEUR
// ============================================

// GET /api/backoffice/organisations - Liste des organisations avec pagination
router.get('/', authenticate, authorize('ADMIN', 'SUPERVISEUR'), async (req, res, next) => {
  try {
    const { page = '1', limit = '20', search = '', type = '' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { raison_sociale: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { contact_referent: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    const [organisations, total] = await Promise.all([
      prisma.organisation.findMany({
        where,
        skip,
        take: limitNum,
        select: {
          id: true,
          email: true,
          raison_sociale: true,
          type: true,
          contact_referent: true,
          pays: true,
          statut: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.organisation.count({ where }),
    ]);

    const data = organisations.map((organisation) => ({
      ...organisation,
      nom_organisation: organisation.raison_sociale,
      type_organisation: organisation.type,
      responsable_nom: organisation.contact_referent,
      responsable_prenom: '',
      responsable_fonction: '',
      suspended: organisation.statut === 'SUSPENDU',
      email_confirme: organisation.statut !== 'EN_ATTENTE',
    }));

    res.status(200).json({
      statusCode: 200,
      data,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/backoffice/organisations - Créer une organisation (backoffice)
router.post('/', authenticate, authorize('ADMIN', 'SUPERVISEUR'), async (req, res, next) => {
  try {
    const {
      raison_sociale,
      email,
      type,
      contact_referent,
      pays = 'CI',
      langue_preferee = 'FR',
      identifiant_legal,
    } = req.body;

    if (!raison_sociale || !email || !type || !contact_referent) {
      return res.status(400).json({
        statusCode: 400,
        error: 'CHAMPS_REQUIS',
        message: 'raison_sociale, email, type et contact_referent sont obligatoires',
      });
    }

    const existing = await prisma.organisation.findFirst({ where: { email } });
    if (existing) {
      return res.status(409).json({
        statusCode: 409,
        error: 'EMAIL_DEJA_UTILISE',
        message: 'Une organisation avec cet email existe déjà',
      });
    }

    const tempPassword = randomBytes(6).toString('hex').toUpperCase() + '!' + randomBytes(3).toString('hex');
    const password_hash = await bcrypt.hash(tempPassword, 12);

    const organisation = await prisma.organisation.create({
      data: {
        raison_sociale,
        email,
        type,
        sous_types: [],
        contact_referent,
        pays,
        langue_preferee,
        identifiant_legal: identifiant_legal || null,
        password_hash,
        statut: 'ACTIVE',
      },
    });

    await emailService.sendTempPassword(email, tempPassword, langue_preferee, 'ORGANISATION').catch((err) => {
      console.error('[backoffice-organisations] sendTempPassword failed:', err);
    });

    res.status(201).json({
      statusCode: 201,
      data: {
        ...organisation,
        nom_organisation: organisation.raison_sociale,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/backoffice/organisations/:id - Détail d'une organisation
router.get('/:id', authenticate, authorize('ADMIN', 'SUPERVISEUR'), async (req, res, next) => {
  try {
    const organisation = await prisma.organisation.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        raison_sociale: true,
        type: true,
        sous_types: true,
        identifiant_legal: true,
        contact_referent: true,
        pays: true,
        langue_preferee: true,
        statut: true,
        created_at: true,
      },
    });

    if (!organisation) {
      return res.status(404).json({
        statusCode: 404,
        error: 'NOT_FOUND',
        message: 'Organisation non trouvée',
      });
    }

    res.status(200).json({
      statusCode: 200,
      data: {
        ...organisation,
        nom_organisation: organisation.raison_sociale,
        type_organisation: organisation.type,
        numero_legal: organisation.identifiant_legal,
        responsable_nom: organisation.contact_referent,
        responsable_prenom: '',
        responsable_fonction: '',
        langue: organisation.langue_preferee,
        suspended: organisation.statut === 'SUSPENDU',
        email_confirme: organisation.statut !== 'EN_ATTENTE',
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/backoffice/organisations/:id/suspension - Suspendre/Activer une organisation
router.patch('/:id/suspension', authenticate, authorize('ADMIN', 'SUPERVISEUR'), async (req, res, next) => {
  try {
    const { suspended } = req.body;

    const organisation = await prisma.organisation.update({
      where: { id: req.params.id },
      data: { statut: suspended ? 'SUSPENDU' : 'ACTIVE' },
      select: {
        id: true,
        email: true,
        raison_sociale: true,
        statut: true,
      },
    });

    res.status(200).json({
      statusCode: 200,
      data: {
        ...organisation,
        nom_organisation: organisation.raison_sociale,
        suspended: organisation.statut === 'SUSPENDU',
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/backoffice/organisations/:id - Supprimer une organisation (ADMIN uniquement)
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const organisation = await prisma.organisation.findUnique({
      where: { id: req.params.id },
      select: { id: true, raison_sociale: true, email: true },
    });

    if (!organisation) {
      return res.status(404).json({
        statusCode: 404,
        error: 'NOT_FOUND',
        message: 'Organisation non trouvée',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.apprenant.updateMany({
        where: { organisation_id: req.params.id },
        data: { organisation_id: null },
      });

      await tx.feedbackFormation.deleteMany({
        where: { organisation_id: req.params.id },
      });

      await tx.conversationBot.deleteMany({
        where: { organisation_id: req.params.id },
      });

      await tx.voucherOrganisation.deleteMany({
        where: { organisation_id: req.params.id },
      });

      await tx.devis.deleteMany({
        where: { organisation_id: req.params.id },
      });

      await tx.organisationConfig.deleteMany({
        where: { organisation_id: req.params.id },
      });

      await tx.abonnementB2B.deleteMany({
        where: { organisation_id: req.params.id },
      });

      await tx.abonnementOrganisation.deleteMany({
        where: { organisation_id: req.params.id },
      });

      await tx.organisation.delete({
        where: { id: req.params.id },
      });
    });

    res.status(200).json({
      statusCode: 200,
      data: {
        id: organisation.id,
        raison_sociale: organisation.raison_sociale,
        email: organisation.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/backoffice/organisations/:id/membres - Membres de l'organisation
router.get('/:id/membres', authenticate, authorize('ADMIN', 'SUPERVISEUR'), async (req, res, next) => {
  try {
    const membres = await prisma.apprenant.findMany({
      where: { organisation_id: req.params.id },
      select: {
        id: true,
        email: true,
        nom: true,
        prenoms: true,
        type_apprenant: true,
        statut: true,
        pays_residence: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    res.status(200).json({
      statusCode: 200,
      data: membres.map((membre) => ({
        ...membre,
        prenom: membre.prenoms,
        pays: membre.pays_residence,
        suspended: membre.statut === 'SUSPENDU',
      })),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/backoffice/organisations/:id/abonnement - Abonnement actif de l'organisation
router.get('/:id/abonnement', authenticate, authorize('ADMIN', 'SUPERVISEUR'), async (req, res, next) => {
  try {
    const abonnement = await prisma.abonnementB2B.findFirst({
      where: {
        organisation_id: req.params.id,
        statut: 'ACTIF',
      },
      orderBy: { date_debut: 'desc' },
    });

    if (!abonnement) {
      return res.status(404).json({
        statusCode: 404,
        error: 'NOT_FOUND',
        message: 'Aucun abonnement actif',
      });
    }

    res.status(200).json({
      statusCode: 200,
      data: abonnement,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/backoffice/organisations/:id/vouchers - Vouchers de l'organisation
router.get('/:id/vouchers', authenticate, authorize('ADMIN', 'SUPERVISEUR'), async (req, res, next) => {
  try {
    const vouchers = await prisma.voucherOrganisation.findMany({
      where: { organisation_id: req.params.id },
      orderBy: { created_at: 'desc' },
    });

    const formationIds = vouchers
      .map((voucher) => voucher.formation_id)
      .filter((formationId): formationId is string => Boolean(formationId));

    const formations = formationIds.length
      ? await prisma.formation.findMany({
          where: { id: { in: formationIds } },
          select: { id: true, intitule: true },
        })
      : [];
    const formationsById = new Map(formations.map((formation) => [formation.id, formation]));

    res.status(200).json({
      statusCode: 200,
      data: vouchers.map((voucher) => ({
        ...voucher,
        formation: voucher.formation_id ? formationsById.get(voucher.formation_id) ?? null : null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
