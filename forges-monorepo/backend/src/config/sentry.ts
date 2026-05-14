/**
 * FORGES - Sentry Configuration
 * Monitoring et crash reporting pour tous les environnements
 * Supporte: dev, test, demo, production
 * Date: 4 mai 2026
 */

import * as Sentry from "@sentry/node";
import { NodeSDKOptions } from "@sentry/node";

/**
 * Configuration Sentry par environnement
 */
const sentryConfig: Record<string, NodeSDKOptions> = {
  development: {
    dsn: process.env.SENTRY_DSN_DEV,
    environment: "development",
    release: `forges-backend-dev-${process.env.PACKAGE_VERSION || "1.0.0"}`,
    tracesSampleRate: 1.0, // 100% en dev pour plus de visibilité
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
    beforeSend(event) {
      // Filtrer les erreurs non-critiques en dev
      if (event.level === "info" || event.level === "debug") {
        return null;
      }
      return event;
    },
  },

  test: {
    dsn: process.env.SENTRY_DSN_TEST,
    environment: "test",
    release: `forges-backend-test-${process.env.PACKAGE_VERSION || "1.0.0"}`,
    tracesSampleRate: 0.5,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
  },

  demo: {
    dsn: process.env.SENTRY_DSN_DEMO,
    environment: "demo",
    release: `forges-backend-demo-${process.env.PACKAGE_VERSION || "1.0.0"}`,
    tracesSampleRate: 0.3,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
  },

  production: {
    dsn: process.env.SENTRY_DSN_PROD,
    environment: "production",
    release: `forges-backend-${process.env.PACKAGE_VERSION || "1.0.0"}`,
    tracesSampleRate: 0.1, // 10% en prod pour réduire le bruit
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
  },
};

/**
 * Initialiser Sentry
 * À appeler au démarrage de l'application
 */
export function initSentry(): void {
  const environment = process.env.NODE_ENV || "development";
  const config = sentryConfig[environment] || sentryConfig.development;

  // Monitoring désactivé pour dev et demo.
  if (environment === "development" || environment === "demo") {
    console.warn(`⚠️  Sentry disabled for ${environment} environment`);
    return;
  }

  // Ignorer l'initialisation si DSN n'est pas défini
  if (!config.dsn) {
    console.warn(`⚠️  Sentry DSN not configured for ${environment}`);
    return;
  }

  Sentry.init(config);
  console.log(`✅ Sentry initialized for ${environment} environment`);
}

/**
 * Middleware Express pour capturer les erreurs
 */
export function sentryErrorHandler() {
  return Sentry.Handlers.errorHandler();
}

/**
 * Middleware Express pour tracer les requêtes
 */
export function sentryRequestHandler() {
  return Sentry.Handlers.requestHandler();
}

/**
 * Capturer une exception manuelle avec contexte
 */
export function captureException(
  error: Error,
  context?: Record<string, any>
): void {
  if (context) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Capturer un message manuel
 */
export function captureMessage(message: string, level: "info" | "warning" | "error" = "info"): void {
  Sentry.captureMessage(message, level);
}

/**
 * Capturer des événements critiques (webhooks, paiements, etc.)
 */
export function captureEvent(
  eventName: string,
  data?: Record<string, any>,
  level: "info" | "warning" | "error" = "info"
): void {
  Sentry.captureMessage(eventName, level);

  if (data) {
    Sentry.setContext("event_data", data);
  }
}

/**
 * Définir des informations utilisateur pour les erreurs
 */
export function setUserContext(userId: string, userData?: Record<string, any>): void {
  Sentry.setUser({
    id: userId,
    ...userData,
  });
}

/**
 * Définir des tags pour filtrer les erreurs
 */
export function setTags(tags: Record<string, string>): void {
  Sentry.setTags(tags);
}

export default Sentry;
