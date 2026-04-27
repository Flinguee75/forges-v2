import { PrismaClient } from '@prisma/client';

/**
 * RM-28 : Vérification unicité email tous rôles confondus
 *
 * Vérifie qu'un email n'est pas déjà utilisé dans :
 * - Apprenant
 * - Organisation
 * - Partenaire
 * - Apporteur
 *
 * @param prisma Instance PrismaClient
 * @param email Email à vérifier (sera normalisé en lowercase)
 * @returns true si l'email est disponible, false s'il existe déjà
 */
export async function isEmailAvailable(prisma: PrismaClient, email: string): Promise<boolean> {
  const emailNormalise = email.trim().toLowerCase();

  // Vérifier en parallèle dans toutes les tables
  const [apprenant, organisation, partenaire, apporteur] = await Promise.all([
    prisma.apprenant.findUnique({ where: { email: emailNormalise } }),
    prisma.organisation.findUnique({ where: { email: emailNormalise } }),
    prisma.partenaire.findUnique({ where: { email_principal: emailNormalise } }),
    prisma.apporteur.findUnique({ where: { email: emailNormalise } }),
  ]);

  // Email disponible si aucun résultat trouvé
  return !apprenant && !organisation && !partenaire && !apporteur;
}
