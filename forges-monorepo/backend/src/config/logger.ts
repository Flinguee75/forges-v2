/**
 * FORGES - Better Stack / Logtail Logger Configuration
 * Centralisation des logs pour tous les environnements
 * Date: 4 mai 2026
 */

interface LoggerConfig {
  sourceToken: string;
  environment: string;
  minLevel: "debug" | "info" | "warn" | "error";
}

/**
 * Configuration Better Stack par environnement
 */
const loggerConfig: Record<string, LoggerConfig> = {
  development: {
    sourceToken: process.env.LOGTAIL_TOKEN_DEV || "",
    environment: "dev",
    minLevel: "debug",
  },
  test: {
    sourceToken: process.env.LOGTAIL_TOKEN_TEST || "",
    environment: "test",
    minLevel: "info",
  },
  demo: {
    sourceToken: process.env.LOGTAIL_TOKEN_DEMO || "",
    environment: "demo",
    minLevel: "info",
  },
  production: {
    sourceToken: process.env.LOGTAIL_TOKEN_PROD || "",
    environment: "prod",
    minLevel: "warn",
  },
};

/**
 * Classe Logger personnalisée
 */
export class BetterStackLogger {
  private sourceToken: string;
  private environment: string;
  private minLevel: string;
  private endpoint = "https://in.logtail.com";

  constructor(environment: string = "development") {
    const config = loggerConfig[environment] || loggerConfig.development;
    this.sourceToken = config.sourceToken;
    this.environment = config.environment;
    this.minLevel = config.minLevel;

    if (!this.sourceToken) {
      console.warn(
        `⚠️  Better Stack/Logtail token not configured for ${environment}`
      );
    }
  }

  /**
   * Envoyer un log à Better Stack
   */
  private async sendLog(level: string, message: string, data?: Record<string, any>): Promise<void> {
    if (!this.sourceToken) {
      return;
    }

    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    if (levels[level as keyof typeof levels] < levels[this.minLevel as keyof typeof levels]) {
      return;
    }

    try {
      const payload = {
        dt: new Date().toISOString(),
        level,
        message,
        environment: this.environment,
        ...data,
      };

      // En développement et demo, logger localement au lieu d'envoyer
      if (this.environment === "dev" || this.environment === "demo") {
        console.log(JSON.stringify(payload, null, 2));
        return;
      }

      // Envoyer à Better Stack
      await fetch(`${this.endpoint}/v1/logs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.sourceToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Failed to send log to Better Stack:", error);
    }
  }

  info(message: string, data?: Record<string, any>): void {
    console.log(`[INFO] ${message}`, data || "");
    this.sendLog("info", message, data);
  }

  error(message: string, error?: Error | Record<string, any>): void {
    const errorData =
      error instanceof Error
        ? {
            error_message: error.message,
            error_stack: error.stack,
          }
        : error;

    console.error(`[ERROR] ${message}`, errorData || "");
    this.sendLog("error", message, errorData);
  }

  warn(message: string, data?: Record<string, any>): void {
    console.warn(`[WARN] ${message}`, data || "");
    this.sendLog("warn", message, data);
  }

  debug(message: string, data?: Record<string, any>): void {
    console.log(`[DEBUG] ${message}`, data || "");
    this.sendLog("debug", message, data);
  }

  /**
   * Logger les événements critiques (paiements, webhooks, etc.)
   */
  criticalEvent(eventName: string, data: Record<string, any>): void {
    const payload = {
      event: eventName,
      timestamp: new Date().toISOString(),
      environment: this.environment,
      ...data,
    };

    console.log(`[CRITICAL EVENT] ${JSON.stringify(payload, null, 2)}`);
    this.sendLog("error", `CRITICAL: ${eventName}`, data);
  }

  /**
   * Logger les webhooks
   */
  webhook(event: string, status: number, body?: any, error?: any): void {
    const data = {
      event,
      status,
      timestamp: new Date().toISOString(),
      body,
      error: error?.message || null,
    };

    console.log(`[WEBHOOK] ${JSON.stringify(data, null, 2)}`);

    if (status >= 400) {
      this.sendLog("error", `WEBHOOK_FAILED: ${event}`, data);
    } else {
      this.sendLog("info", `WEBHOOK_SUCCESS: ${event}`, data);
    }
  }

  /**
   * Logger les erreurs de base de données
   */
  databaseError(operation: string, error: Error, context?: Record<string, any>): void {
    const data = {
      operation,
      error_message: error.message,
      error_stack: error.stack,
      context,
    };

    console.error(`[DB ERROR] ${JSON.stringify(data, null, 2)}`);
    this.sendLog("error", `DB_ERROR: ${operation}`, data);
  }
}

/**
 * Logger singleton pour l'application
 */
let logger: BetterStackLogger | null = null;

export function getLogger(environment?: string): BetterStackLogger {
  if (!logger) {
    logger = new BetterStackLogger(environment || process.env.NODE_ENV || "development");
  }
  return logger;
}

export default BetterStackLogger;
