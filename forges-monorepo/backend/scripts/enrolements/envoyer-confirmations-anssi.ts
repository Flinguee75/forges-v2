/**
 * Script one-shot : envoie les emails de confirmation aux 3 apprenants ANSSI CI
 * Usage: EMAIL_TEST_OVERRIDE=you@example.com node -r ts-node/register/transpile-only scripts/enrolements/envoyer-confirmations-anssi.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { EmailService } from '../../src/shared/email/email.service';

const DESTINATAIRE_OVERRIDE = process.env.EMAIL_TEST_OVERRIDE || null;
const GROUPE_CONFIG_PATH = path.resolve(__dirname, 'groupes/anssi.json');

const prisma = new PrismaClient();
const emailService = new EmailService();

async function main() {
  const config = JSON.parse(fs.readFileSync(GROUPE_CONFIG_PATH, 'utf-8'));

  const org = await prisma.organisation.findFirst({
    where: { email: config.organisation.email },
  });

  if (!org) {
    console.error('Organisation ANSSI CI introuvable en base. Lancez import-groupe.ts d abord.');
    process.exit(1);
  }

  const apprenants = await prisma.apprenant.findMany({
    where: { organisation_id: org.id },
  });

  if (apprenants.length === 0) {
    console.error('Aucun apprenant trouve pour ANSSI CI.');
    process.exit(1);
  }

  console.log(`Organisation : ${org.raison_sociale}`);
  console.log(`Apprenants   : ${apprenants.length}`);
  if (DESTINATAIRE_OVERRIDE) console.log(`Override email -> ${DESTINATAIRE_OVERRIDE}\n`);

  for (const apprenant of apprenants) {
    const appConfig = config.apprenants.find((a: any) => a.email === apprenant.email);
    const destinataire = DESTINATAIRE_OVERRIDE || apprenant.email;

    await emailService.sendEnrolementConfirmationApprenant({
      to: destinataire,
      prenoms: apprenant.prenoms,
      nom: apprenant.nom,
      fonction: appConfig?.fonction,
      organisation: org.raison_sociale,
      formation: 'Masterclass GWU/CCDL',
    });

    console.log(`Email envoye : ${apprenant.prenoms} ${apprenant.nom} -> ${destinataire}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('Erreur:', err.message);
    prisma.$disconnect();
    process.exit(1);
  });
