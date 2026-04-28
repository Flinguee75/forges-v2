import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// ROUTES BACKOFFICE APPRENANTS
// Accessible à: ADMIN, SUPERVISEUR
// ============================================

// GET /api/backoffice/apprenants - Liste des apprenants avec pagination
router.get('/', authenticate, authorize('ADMIN', 'SUPERVISEUR'), async (req, res, next) => {
  try {
    const { page = '1', limit = '20', search = '', statut = '' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { nom: { contains: search as string, mode: 'insensitive' } },
        { prenom: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (statut === 'suspendu') {
      where.suspended = true;
    } else if (statut === 'actif') {
      where.suspended = false;
      where.email_confirme = true;
    } else if (statut === 'non_confirme') {
      where.email_confirme = false;
    }

    const [apprenants, total] = await Promise.all([
      prisma.apprenant.findMany({
        where,
        skip,
        take: limitNum,
        select: {
          id: true,
          email: true,
          nom: true,
          prenom: true,
          telephone: true,
          ville: true,
          pays: true,
          suspended: true,
          email_confirme: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.apprenant.count({ where }),
    ]);

    res.status(200).json({
      statusCode: 200,
      data: apprenants,
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

// GET /api/backoffice/apprenants/:id - Détail d'un apprenant
router.get('/:id', authenticate, authorize('ADMIN', 'SUPERVISEUR'), async (req, res, next) => {
  try {
    const apprenant = await prisma.apprenant.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
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

    if (!apprenant) {
      return res.status(404).json({
        statusCode: 404,
        error: 'NOT_FOUND',
        message: 'Apprenant non trouvé',
      });
    }

    res.status(200).json({
      statusCode: 200,
      data: apprenant,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/backoffice/apprenants/:id/suspension - Suspendre/Activer un apprenant
router.patch('/:id/suspension', authenticate, authorize('ADMIN', 'SUPERVISEUR'), async (req, res, next) => {
  try {
    const { suspended } = req.body;

    const apprenant = await prisma.apprenant.update({
      where: { id: req.params.id },
      data: { suspended },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        suspended: true,
      },
    });

    res.status(200).json({
      statusCode: 200,
      data: apprenant,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/backoffice/apprenants/:id/dossiers - Dossiers de l'apprenant
router.get('/:id/dossiers', authenticate, authorize('ADMIN', 'SUPERVISEUR'), async (req, res, next) => {
  try {
    const dossiers = await prisma.dossier.findMany({
      where: { apprenant_id: req.params.id },
      include: {
        session: {
          include: {
            formation: {
              select: {
                id: true,
                intitule: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    res.status(200).json({
      statusCode: 200,
      data: dossiers,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/backoffice/apprenants/:id/abonnement - Abonnement actif de l'apprenant
router.get('/:id/abonnement', authenticate, authorize('ADMIN', 'SUPERVISEUR'), async (req, res, next) => {
  try {
    const abonnement = await prisma.abonnementRetail.findFirst({
      where: {
        apprenant_id: req.params.id,
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

export default router;
