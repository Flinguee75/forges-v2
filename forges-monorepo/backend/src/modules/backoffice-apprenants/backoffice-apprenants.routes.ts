import { Router } from 'express';
import { hash } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../../shared/prisma/prisma.client';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { isEmailAvailable } from '../../shared/helpers/email-uniqueness';

const router = Router();
const auditLogger = new AuditLogger();
const emailService = new EmailService();

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
        { prenoms: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (statut === 'suspendu') {
      where.statut = 'SUSPENDU';
    } else if (statut === 'actif') {
      where.statut = 'ACTIF';
    } else if (statut === 'non_confirme') {
      where.statut = 'INACTIF';
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
          prenoms: true,
          telephone: true,
          pays_residence: true,
          pays_nationalite: true,
          statut: true,
          organisation_id: true,
          created_at: true,
          organisation: {
            select: { id: true, raison_sociale: true },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.apprenant.count({ where }),
    ]);

    const data = apprenants.map((apprenant) => ({
      ...apprenant,
      prenom: apprenant.prenoms,
      pays: apprenant.pays_residence,
      suspended: apprenant.statut === 'SUSPENDU',
      email_confirme: apprenant.statut !== 'INACTIF',
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

// GET /api/backoffice/apprenants/:id - Détail d'un apprenant
router.get('/:id', authenticate, authorize('ADMIN', 'SUPERVISEUR'), async (req, res, next) => {
  try {
    const apprenant = await prisma.apprenant.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        nom: true,
        prenoms: true,
        type_apprenant: true,
        secteur_activite: true,
        niveau_etude: true,
        pays_residence: true,
        pays_nationalite: true,
        langue_preferee: true,
        statut: true,
        organisation_id: true,
        created_at: true,
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
      data: {
        ...apprenant,
        prenom: apprenant.prenoms,
        pays: apprenant.pays_residence,
        langue: apprenant.langue_preferee,
        suspended: apprenant.statut === 'SUSPENDU',
        email_confirme: apprenant.statut !== 'INACTIF',
      },
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
      data: { statut: suspended ? 'SUSPENDU' : 'ACTIF' },
      select: {
        id: true,
        email: true,
        nom: true,
        prenoms: true,
        statut: true,
      },
    });

    res.status(200).json({
      statusCode: 200,
      data: {
        ...apprenant,
        prenom: apprenant.prenoms,
        suspended: apprenant.statut === 'SUSPENDU',
      },
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/backoffice/apprenants — Créer un apprenant par l'Admin (scénario B2B)
// Compte activé directement, sans confirmation email, mot de passe temporaire auto-généré
// ─────────────────────────────────────────────────────────────────────────────

const CreerApprenantAdminSchema = z.object({
  email: z.string().email(),
  nom: z.string().min(1),
  prenoms: z.string().min(1),
  type_apprenant: z.enum(['PROFESSIONNEL', 'APPRENANT']).default('PROFESSIONNEL'),
  secteur_activite: z.string().optional(),
  niveau_etude: z.string().optional(),
  pays_residence: z.string().length(2).default('CI'),
  pays_nationalite: z.string().length(2).default('CI'),
  langue_preferee: z.enum(['FR', 'EN', 'ES', 'PT']).default('FR'),
  organisation_id: z.string().uuid().optional(),
  mot_de_passe_temp: z.string().min(8).optional(),
  telephone: z.string().optional(),
});

router.post('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const dto = CreerApprenantAdminSchema.parse(req.body);
    const emailNormalise = dto.email.trim().toLowerCase();

    const dispo = await isEmailAvailable(prisma, emailNormalise);
    if (!dispo) {
      return res.status(409).json({ statusCode: 409, error: 'EMAIL_ALREADY_EXISTS', message: 'Cet email est déjà utilisé' });
    }

    if (dto.organisation_id) {
      const org = await prisma.organisation.findUnique({ where: { id: dto.organisation_id } });
      if (!org) {
        return res.status(404).json({ statusCode: 404, error: 'ORGANISATION_NOT_FOUND', message: 'Organisation introuvable' });
      }
    }

    // Mot de passe temporaire auto-généré si non fourni
    const motDePasseTemp = dto.mot_de_passe_temp || `FORGES-${uuidv4().slice(0, 8).toUpperCase()}!`;
    const password_hash = await hash(motDePasseTemp, 12);

    const apprenant = await prisma.apprenant.create({
      data: {
        email: emailNormalise,
        password_hash,
        nom: dto.nom,
        prenoms: dto.prenoms,
        type_apprenant: dto.type_apprenant,
        secteur_activite: dto.secteur_activite ?? null,
        niveau_etude: dto.niveau_etude ?? null,
        pays_residence: dto.pays_residence,
        pays_nationalite: dto.pays_nationalite,
        langue_preferee: dto.langue_preferee,
        organisation_id: dto.organisation_id ?? null,
        telephone: dto.telephone ?? null,
        statut: 'ACTIF',
        consentement_rgpd: true,
        consentement_timestamp: new Date(),
        consentement_version_cgu: '1.0',
      },
      select: {
        id: true, email: true, nom: true, prenoms: true,
        type_apprenant: true, pays_residence: true, organisation_id: true, statut: true, created_at: true,
      },
    });

    await auditLogger.info('APPRENANT_CREE_ADMIN', {
      apprenant_id: apprenant.id,
      organisation_id: dto.organisation_id,
      admin_id: (req as any).user.userId,
    });

    // Envoyer les credentials par email (non bloquant)
    emailService.sendTempPassword(emailNormalise, motDePasseTemp, dto.langue_preferee, 'APPRENANT').catch((err) => {
      console.error('[backoffice-apprenants] sendTempPassword failed:', err);
    });

    return res.status(201).json({
      statusCode: 201,
      data: { ...apprenant, mot_de_passe_temp: motDePasseTemp },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
    }
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/backoffice/apprenants/:id/lier-organisation — Rattacher un apprenant à une org
// ─────────────────────────────────────────────────────────────────────────────

router.patch('/:id/lier-organisation', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { organisation_id } = req.body;

    if (!organisation_id) {
      return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', message: 'organisation_id requis' });
    }

    const apprenant = await prisma.apprenant.findUnique({ where: { id: req.params.id } });
    if (!apprenant) {
      return res.status(404).json({ statusCode: 404, error: 'APPRENANT_NOT_FOUND', message: 'Apprenant introuvable' });
    }

    const org = await prisma.organisation.findUnique({ where: { id: organisation_id } });
    if (!org) {
      return res.status(404).json({ statusCode: 404, error: 'ORGANISATION_NOT_FOUND', message: 'Organisation introuvable' });
    }

    const updated = await prisma.apprenant.update({
      where: { id: req.params.id },
      data: { organisation_id },
      select: { id: true, email: true, nom: true, prenoms: true, organisation_id: true, statut: true },
    });

    await auditLogger.info('APPRENANT_ORGANISATION_LIEE', {
      apprenant_id: req.params.id,
      organisation_id,
      admin_id: (req as any).user.userId,
    });

    return res.status(200).json({ statusCode: 200, data: updated });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/backoffice/apprenants/:id — Supprimer un apprenant (ADMIN uniquement)
// ─────────────────────────────────────────────────────────────────────────────

router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const apprenant = await prisma.apprenant.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true, nom: true },
    });

    if (!apprenant) {
      return res.status(404).json({ statusCode: 404, error: 'NOT_FOUND', message: 'Apprenant non trouvé' });
    }

    await prisma.apprenant.delete({ where: { id: req.params.id } });

    await auditLogger.info('APPRENANT_SUPPRIME', {
      apprenant_id: req.params.id,
      email: apprenant.email,
      admin_id: (req as any).user.userId,
    });

    return res.status(200).json({ statusCode: 200, message: 'Apprenant supprimé' });
  } catch (error) {
    next(error);
  }
});

export default router;
