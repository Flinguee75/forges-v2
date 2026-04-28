import rateLimit from 'express-rate-limit';

/**
 * RM-32 : Limite de 5 tentatives d'inscription par IP par heure
 * Blocage de 30 minutes après dépassement
 * Correction PLAN_CORRECTION_WAVE4 #11 : Ajout keyGenerator + handler
 */
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: parseInt(
    process.env.REGISTRATION_RATE_LIMIT_MAX ||
      (process.env.NODE_ENV === 'test' ? '1000' : process.env.NODE_ENV === 'development' ? '100' : '5'),
    10
  ),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Compter toutes les tentatives
  skipFailedRequests: false, // Compter aussi les échecs
  keyGenerator: (req) => req.ip || req.socket?.remoteAddress || 'unknown',
  handler: (req, res) => {
    res.status(429).json({
      statusCode: 429,
      error: 'RATE_LIMIT',
      message: 'Trop de tentatives d\'inscription depuis cette adresse IP. Veuillez réessayer dans 30 minutes.',
    });
  },
});

/**
 * Rate limiter général pour les endpoints sensibles
 * Correction PLAN_CORRECTION_WAVE4 #11 : Ajout keyGenerator + handler
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.socket?.remoteAddress || 'unknown',
  handler: (req, res) => {
    res.status(429).json({
      statusCode: 429,
      error: 'RATE_LIMIT',
      message: 'Trop de requêtes depuis cette adresse IP. Veuillez réessayer plus tard.',
    });
  },
});
