import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';

const router = Router();
const controller = new AnalyticsController();

// POST /api/analytics/track — auth optionnelle, fire-and-forget frontend
router.post('/track', (req, res, next) => controller.track(req, res, next));

export default router;
