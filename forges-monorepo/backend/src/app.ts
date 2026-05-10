import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

// =====================================================
// SCHEDULERS (Gap 1, Gap 2 - RM-07, RM-20, RM-21, RM-146)
// =====================================================

import { DossierExpirationScheduler } from './schedulers/dossier-expiration.scheduler';
import { SessionTransitionScheduler } from './schedulers/session-transition.scheduler';
import { CommissionAgregateurScheduler } from './schedulers/commission-agregateur.scheduler';
import { AlerteValidationScheduler } from './schedulers/alerte-validation.scheduler';
import { ReversementAbonnementScheduler } from './schedulers/reversement-abonnement.scheduler';
import { AlerteB2BScheduler } from './schedulers/alerte-b2b.scheduler';
import { ReconciliationNgserScheduler } from './schedulers/reconciliation-ngser.scheduler';

// Initialiser les schedulers
const dossierExpirationScheduler = new DossierExpirationScheduler();
const sessionTransitionScheduler = new SessionTransitionScheduler();
const commissionAgregateurScheduler = new CommissionAgregateurScheduler();
const alerteValidationScheduler = new AlerteValidationScheduler();
const reversementAbonnementScheduler = new ReversementAbonnementScheduler();
const alerteB2BScheduler = new AlerteB2BScheduler();
const reconciliationNgserScheduler = new ReconciliationNgserScheduler();

// Démarrer les schedulers uniquement en production/development (pas en test)
if (process.env.NODE_ENV !== 'test') {
  dossierExpirationScheduler.start();
  sessionTransitionScheduler.start();
  commissionAgregateurScheduler.start();
  alerteValidationScheduler.start();
  reversementAbonnementScheduler.start();
  alerteB2BScheduler.start();
  reconciliationNgserScheduler.start();
  console.log('[Schedulers] ✅ Réconciliation NGSER démarrée');
  console.log('[Schedulers] ✅ Tous les schedulers démarrés');
}

// Exporter les schedulers pour tests/monitoring
export const schedulers = {
  dossierExpiration: dossierExpirationScheduler,
  sessionTransition: sessionTransitionScheduler,
  commissionAgregateur: commissionAgregateurScheduler,
  alerteValidation: alerteValidationScheduler,
  reversementAbonnement: reversementAbonnementScheduler,
  alerteB2B: alerteB2BScheduler,
  reconciliationNgser: reconciliationNgserScheduler,
};

// =====================================================
// MIDDLEWARES DE SÉCURITÉ
// =====================================================

// Helmet - Headers de sécurité HTTP
app.use(helmet());

// CORS - Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || [process.env.FRONTEND_URL || 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

app.use(cors(corsOptions));

// Rate Limiting - Correction PLAN_CORRECTION_WAVE4 #10 : max 1000 au lieu de 100
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes par défaut
  max: parseInt(process.env.RATE_LIMIT_MAX || '1000'),
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// =====================================================
// MIDDLEWARES EXPRESS
// =====================================================

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// RM-101 : i18n Middleware pour supporter Accept-Language (FR, EN, ES, PT)
import { i18nMiddleware } from './middlewares/i18n.middleware';
app.use(i18nMiddleware);

// Request ID — corrélation de toutes les lignes de log d'une même requête
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
});

// Log structuré JSON pour tous les 4xx/5xx — capturé par Promtail/Loki/Grafana
app.use((req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    if (res.statusCode >= 400) {
      const entry = {
        level: res.statusCode >= 500 ? 'ERROR' : 'WARN',
        action: 'HTTP_ERROR',
        metadata: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          error: body?.error ?? body?.message ?? null,
          request_id: res.locals.requestId,
          user_id: (req as any).user?.userId ?? null,
        },
        timestamp: new Date().toISOString(),
      };
      process.stdout.write(JSON.stringify(entry) + '\n');
    }
    return originalJson(body);
  };
  next();
});

// =====================================================
// ROUTES
// =====================================================

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Root
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'FORGES API',
    version: '1.0.0',
    documentation: '/api/docs'
  });
});

// Routes des modules
import authRoutes from './modules/auth/auth.routes';
import comptesRoutes from './modules/comptes/comptes.routes';
import organisationsRoutes from './modules/comptes/organisations.routes';
import formationsRoutes from './modules/formations/formation.routes';
import abonnementsRoutes from './modules/abonnements/abonnement.routes';
import abonnementBackofficeRoutes from './modules/abonnements/abonnement-backoffice.routes';
import espaceApprenantRoutes from './modules/espace-apprenant/espace-apprenant.routes';
import attestationRoutes from './modules/espace-apprenant/attestation.routes';
import espaceOrganisationRoutes from './modules/espace-organisation/espace-organisation.routes';
import botRoutes from './modules/bot-conseiller/bot.routes';
import partenaireRoutes from './modules/partenaires/partenaire.routes';
import apporteurRoutes from './modules/apporteurs/apporteur.routes';
import adminRoutes from './modules/comptes/admin/admin.routes';
import inscriptionRoutes from './modules/inscriptions/inscription.routes';
import responsableRoutes from './modules/responsable/responsable.routes';
import superviseurRoutes from './modules/superviseur/superviseur.routes';
import agentRoutes from './modules/agent/agent.routes';
import sessionBackofficeRoutes from './modules/sessions/session.routes';
import paiementRoutes from './modules/paiements/paiement.routes'; // ✅ SPRINT 1 SEMAINE 2
import voucherRoutes from './modules/vouchers/voucher.routes'; // ✅ SPRINT 1 SEMAINE 2
import devisRoutes from './modules/devis/devis.routes'; // RM-149 à RM-151
import proxyAccesRoutes from './modules/acces/proxy-acces.routes'; // RM-152 à RM-154
import abonnementAliasRoutes from './modules/abonnements/abonnement-alias.routes';
import backofficeRoutes from './modules/dashboard/backoffice.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import backofficeApprenantsRoutes from './modules/backoffice-apprenants/backoffice-apprenants.routes';
import backofficeOrganisationsRoutes from './modules/backoffice-organisations/backoffice-organisations.routes';

app.use('/api/auth', authRoutes);
app.use('/api/comptes', comptesRoutes);
// ✅ SPRINT 1: Aliases pour routes apprenants et organisations
app.use('/api/apprenants', comptesRoutes);
app.use('/api/organisations', organisationsRoutes);
app.use('/api/formations', formationsRoutes);
app.use('/api/catalogue', formationsRoutes); // RM-101 : alias public pour catalogue i18n
app.use('/api/abonnements', abonnementsRoutes);
app.use('/api', abonnementAliasRoutes);
app.use('/api/espace-apprenant', espaceApprenantRoutes);
app.use('/api/attestations', attestationRoutes);
app.use('/api/espace-organisation', espaceOrganisationRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/partenaires', partenaireRoutes);
app.use('/api/apporteurs', apporteurRoutes); // ✅ CORRIGÉ: singular → plural
app.use('/api', devisRoutes); // RM-149 à RM-151: devis SUR_DEVIS — monté avant /api/admin pour éviter le authorize('ADMIN') global
app.use('/api/formations-demande', proxyAccesRoutes); // RM-152 à RM-154: proxy AES formations à la demande
app.use('/api/admin', adminRoutes); // ✅ NOUVEAU: création admin utilisateurs / partenaires / apporteurs
app.use('/api/admin', backofficeRoutes); // Alias pour config
app.use('/api/admin', responsableRoutes); // Alias pour formations attente
app.use('/api/organisation', espaceOrganisationRoutes); // Alias pour Postman
app.use('/api/apprenant', espaceApprenantRoutes); // Alias pour Postman
app.use('/api', inscriptionRoutes); // ✅ NOUVEAU: endpoints inscriptions/dossiers/sessions
app.use('/api', paiementRoutes); // ✅ SPRINT 1 SEMAINE 2: POST/GET paiements, webhook, backoffice paiements
app.use('/', paiementRoutes); // ✅ v4.9: IPN NGSER canonical /webhooks/paiement
app.use('/api/vouchers', voucherRoutes); // ✅ SPRINT 1 SEMAINE 2: POST/GET vouchers, validate
app.use('/api/responsable', responsableRoutes); // ✅ NOUVEAU: endpoints validation formations (UCS18)
app.use('/api/backoffice', responsableRoutes);
app.use('/api/superviseur', superviseurRoutes); // ✅ NOUVEAU: endpoints TDB mensuel (RM-148)
app.use('/api/backoffice', superviseurRoutes);
app.use('/api/agent', agentRoutes); // ✅ NOUVEAU: endpoints reversements (RM-138, RM-147)
app.use('/api/backoffice', agentRoutes);
app.use('/api/backoffice/sessions', sessionBackofficeRoutes);
app.use('/api/backoffice/abonnements', abonnementBackofficeRoutes);
app.use('/api/backoffice/apprenants', backofficeApprenantsRoutes);
app.use('/api/backoffice/organisations', backofficeOrganisationsRoutes);
app.use('/api/backoffice', backofficeRoutes);
app.use('/api/dashboard', dashboardRoutes);

if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
  app.post('/api/test/schedulers/dossier-expiration', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await schedulers.dossierExpiration.executeNow();
      res.status(200).json({ statusCode: 200, data: { executed: true } });
    } catch (error) {
      next(error);
    }
  });
}

// =====================================================
// GESTION D'ERREURS
// =====================================================

// 404 - Route non trouvée
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.path,
    method: req.method
  });
});

// Gestionnaire d'erreurs global
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const entry = {
    level: 'ERROR',
    action: 'UNHANDLED_ERROR',
    metadata: {
      method: req.method,
      path: req.path,
      error: err.message,
      request_id: res.locals.requestId ?? null,
      user_id: (req as any).user?.userId ?? null,
    },
    timestamp: new Date().toISOString(),
  };
  process.stdout.write(JSON.stringify(entry) + '\n');

  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Une erreur est survenue'
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Promises rejetées sans .catch() et exceptions non catchées
process.on('unhandledRejection', (reason: unknown) => {
  process.stdout.write(JSON.stringify({
    level: 'ERROR',
    action: 'UNHANDLED_REJECTION',
    metadata: { error: reason instanceof Error ? reason.message : String(reason) },
    timestamp: new Date().toISOString(),
  }) + '\n');
});

process.on('uncaughtException', (err: Error) => {
  process.stdout.write(JSON.stringify({
    level: 'ERROR',
    action: 'UNCAUGHT_EXCEPTION',
    metadata: { error: err.message },
    timestamp: new Date().toISOString(),
  }) + '\n');
  process.exit(1);
});

// =====================================================
// DÉMARRAGE DU SERVEUR
// =====================================================

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║            🚀 FORGES Backend API                     ║
║                                                       ║
║   Environnement : ${(process.env.NODE_ENV || 'development').padEnd(36)}║
║   Port          : ${PORT.toString().padEnd(36)}║
║   Frontend URL  : ${(process.env.FRONTEND_URL || 'N/A').padEnd(36)}║
║                                                       ║
║   Health Check  : http://localhost:${PORT}/health${' '.repeat(13)}║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
    `);
  });
}

// Exporter pour les tests
export default app;
