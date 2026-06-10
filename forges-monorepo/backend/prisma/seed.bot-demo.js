const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const IDS = {
  apprenant: 'app-demo-bot-feedback',
  formation: 'formation-demo-bot-feedback',
  session: 'session-demo-bot-feedback',
  dossier: 'dossier-demo-bot-feedback',
};

async function main() {
  const passwordHash = await bcrypt.hash('Test@FORGES2026!', 12);
  const now = new Date();
  const days = (offset) => new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);

  await prisma.feedbackFormation.deleteMany({
    where: {
      apprenant_id: IDS.apprenant,
      formation_id: IDS.formation,
    },
  });
  await prisma.conversationBot.deleteMany({
    where: { utilisateur_id: IDS.apprenant },
  });

  await prisma.apprenant.upsert({
    where: { id: IDS.apprenant },
    update: {
      email: 'bot-feedback-demo@forges.ci',
      password_hash: passwordHash,
      statut: 'ACTIF',
      langue_preferee: 'FR',
    },
    create: {
      id: IDS.apprenant,
      email: 'bot-feedback-demo@forges.ci',
      password_hash: passwordHash,
      nom: 'Demo',
      prenoms: 'Feedback Bot',
      role: 'APPRENANT',
      type_apprenant: 'APPRENANT',
      niveau_etude: 'Licence / Bac+3',
      pays_residence: 'CI',
      pays_nationalite: 'CI',
      langue_preferee: 'FR',
      statut: 'ACTIF',
      consentement_rgpd: true,
      consentement_timestamp: now,
      consentement_version_cgu: '1.0',
    },
  });

  await prisma.formation.upsert({
    where: { id: IDS.formation },
    update: {
      statut: 'ACTIVE',
      mode_formation: 'AVEC_SESSION',
    },
    create: {
      id: IDS.formation,
      intitule: 'Pilotage de projet certifiant',
      description_courte: 'Formation de démonstration pour le feedback Bot Conseiller.',
      description_longue: 'Scénario idempotent réservé à la validation de l’environnement demo.',
      duree_jours: 3,
      cout_catalogue: 12500000,
      responsable_id: 'responsable-demo-bot',
      type_formation: 'STANDARD',
      mode_formation: 'AVEC_SESSION',
      statut: 'ACTIVE',
      objectifs_pedagogiques: ['Évaluer une formation terminée'],
      certification_delivree: true,
      public_cible: 'Apprenants',
      langues_disponibles: ['FR', 'EN', 'ES', 'PT'],
    },
  });

  await prisma.session.upsert({
    where: { id: IDS.session },
    update: {
      statut: 'CLOTUREE',
      date_fin: days(-2),
    },
    create: {
      id: IDS.session,
      formation_id: IDS.formation,
      date_ouverture: days(-14),
      date_cloture: days(-8),
      date_debut: days(-5),
      date_fin: days(-2),
      capacite: 20,
      nb_inscrits: 1,
      places_restantes: 19,
      statut: 'CLOTUREE',
    },
  });

  await prisma.dossier.upsert({
    where: { id: IDS.dossier },
    update: {
      statut: 'PAYE',
      session_id: IDS.session,
    },
    create: {
      id: IDS.dossier,
      apprenant_id: IDS.apprenant,
      formation_id: IDS.formation,
      session_id: IDS.session,
      statut: 'PAYE',
      source_financement: 'RETAIL',
    },
  });

  console.log('Bot demo fixture ready: bot-feedback-demo@forges.ci');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
