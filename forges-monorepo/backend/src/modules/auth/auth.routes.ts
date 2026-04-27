import { Router } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRepository } from './auth.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// Instantier les dépendances
const userRepository = new UserRepository(prisma);
const auditLogger = new AuditLogger();
const authService = new AuthService(userRepository, auditLogger);
const authController = new AuthController(authService);

// Routes d'authentification
router.post('/login', (req, res, next) => {
  authController.login(req, res).catch(next);
});

router.post('/logout', authenticate, (req, res, next) => {
  authController.logout(req, res).catch(next);
});

router.post('/refresh', (req, res, next) => {
  authController.refreshToken(req, res).catch(next);
});

router.post('/forgot-password', (req, res, next) => {
  authController.forgotPassword(req, res).catch(next);
});

router.post('/reset-password', (req, res, next) => {
  authController.resetPassword(req, res).catch(next);
});

router.post('/change-password', authenticate, (req, res, next) => {
  authController.changePassword(req, res).catch(next);
});

router.get('/me', authenticate, (req, res, next) => {
  authController.me(req, res).catch(next);
});

// RM-30 : Confirmation email - Correction PLAN_CORRECTION_WAVE4 #7
router.post('/confirm-email', (req, res, next) => {
  authController.confirmEmail(req, res).catch(next);
});

export default router;
