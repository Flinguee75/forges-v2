import { Request, Response, NextFunction } from 'express';

/**
 * RM-101 : Middleware i18n pour supporter les 4 langues (FR, EN, ES, PT)
 * Lit le header Accept-Language et stocke la langue dans req.language
 * Fallback à FR si langue non supportée
 */

const LANGUES_SUPPORTEES = ['fr', 'en', 'es', 'pt'];
const LANGUE_PAR_DEFAUT = 'fr';

export const i18nMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const acceptLanguage = req.headers['accept-language'];

  let langue = LANGUE_PAR_DEFAUT;

  if (acceptLanguage) {
    // Extraire la première langue du header (format: "fr-FR,fr;q=0.9,en;q=0.8")
    const languePreferee = acceptLanguage.split(',')[0].split('-')[0].toLowerCase();

    if (LANGUES_SUPPORTEES.includes(languePreferee)) {
      langue = languePreferee;
    }
  }

  // Stocker la langue dans la requête pour usage ultérieur
  (req as any).language = langue;

  next();
};
