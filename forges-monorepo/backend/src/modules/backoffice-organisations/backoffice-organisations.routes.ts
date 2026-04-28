import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

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
        { nom_organisation: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { responsable_nom: { contains: search as string, mode: 'insensitive' } },
        { responsable_prenom: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type_organisation = type;
    }

    const [organisations, total] = await Promise.all([
      prisma.organisation.findMany({
        where,
        skip,
        take: limitNum,
        select: {
          id: true,
          email: true,
          nom_organisation: true,
          type_organisation: true,
          responsable_nom: true,
          responsable_prenom: true,
          responsable_fonction: true,
          telephone: true,
          ville: true,
          pays: true,
          suspended: true,
          email_confirme: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.organisation.count({ where }),
    ]);

    res.status(200).json({
      statusCode: 200,
      data: organisations,
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

// GET /api/backoffice/organisations/:id - Détail d'une organisation
router.get('/:id', authenticate, authorize('ADMIN', 'SUPERVISEUR'), async (req, res, next) => {
  try {
    const organisation = await prisma.organisation.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        nom_organisation: true,
        type_organisation: true,
        raison_sociale: true,
        numero_legal: true,
        responsable_nom: true,
        responsable_prenom: true,
        responsable_fonction: true,
        telephone: true,
        adresse: true,
        ville: true,
        pays: true,
        langue: true,
        suspended: true,
        email_confirme: true,
        created_at: true,
        updated_at: true,
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
      data: organisation,
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
      data: { suspended },
      select: {
        id: true,
        email: true,
        nom_organisation: true,
        suspended: true,
      },
    });

    res.status(200).json({
      statusCode: 200,
      data: organisation,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/backoffice/organisations/:id/membres - Membres de l'organisation
router.get('/:id/membres', authenticate, authorize('ADMIN', 'SUPERVISEUR'), async (req, res, next) => {
  try {
    const membres = await prisma.beneficiaireOrganisation.findMany({
      where: { organisation_id: req.params.id },
      orderBy: { created_at: 'desc' },
    });

    res.status(200).json({
      statusCode: 200,
      data: membres,
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
      orderBy: { created_at: 'desc' },
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
      include: {
        formation: {
          select: {
            id: true,
            intitule: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    res.status(200).json({
      statusCode: 200,
      data: vouchers,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
