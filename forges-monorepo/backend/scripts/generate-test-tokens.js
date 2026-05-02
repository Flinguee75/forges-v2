const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const prisma = new PrismaClient();
const FORMATION_PARTENAIRE_FIXTURE_ID = 'FP-DEV-01';
const CONVERSATION_FIXTURE_ID = 'CONV-DEV-01';

async function generateTokens() {
  const roles = [
    'APPRENANT',
    'ORGANISATION',
    'PARTENAIRE',
    'APPORTEUR',
    'RESPONSABLE',
    'SUPERVISEUR',
    'AGENT',
    'ADMIN',
    'GESTIONNAIRE'
  ];

  console.log('=== FORGES v4.8 - JWT Test Tokens ===\n');
  const generated = {};

  for (const role of roles) {
    try {
      // Trouver un utilisateur existant pour ce rôle
      let user;

      if (role === 'APPRENANT') {
        user = await prisma.apprenant.findUnique({ where: { email: 'apprenant1@forges-test.ci' } })
          || await prisma.apprenant.findUnique({ where: { email: 'apprenant@forges-dev.ci' } })
          || await prisma.apprenant.findFirst({ where: { role: 'APPRENANT' } })
          || await prisma.apprenant.findFirst();
      } else if (role === 'ORGANISATION') {
        user = await prisma.organisation.findUnique({ where: { email: 'org@forges-test.ci' } })
          || await prisma.organisation.findUnique({ where: { email: 'org@forges-dev.ci' } })
          || await prisma.organisation.findFirst();
      } else if (role === 'PARTENAIRE') {
        user = await prisma.partenaire.findUnique({ where: { email_principal: 'partenaire@forges-test.ci' } })
          || await prisma.partenaire.findUnique({ where: { email_principal: 'partenaire@forges-dev.ci' } })
          || await prisma.partenaire.findFirst();
      } else if (role === 'APPORTEUR') {
        user = await prisma.apporteur.findUnique({ where: { email: 'apporteur@forges-test.ci' } })
          || await prisma.apporteur.findUnique({ where: { email: 'apporteur@forges-dev.ci' } })
          || await prisma.apporteur.findFirst();
      } else if (role === 'RESPONSABLE') {
        user = await prisma.apprenant.findUnique({ where: { email: 'responsable@forges-test.ci' } }) 
          || await prisma.apprenant.findUnique({ where: { email: 'responsable@forges-dev.ci' } }) || {
          id: 'usr-resp-0001-0000-0000-0000000000002',
          role: role
        };
      } else if (role === 'ADMIN') {
        user = await prisma.apprenant.findUnique({ where: { email: 'admin@forges-test.ci' } })
          || await prisma.apprenant.findUnique({ where: { email: 'admin@forges-dev.ci' } }) || {
          id: 'usr-admin-0001-0000-0000-0000000000001',
          role: role
        };
      } else {
        // Pour les rôles backoffice : générer un token avec un ID fictif
        // (ces rôles seront implémentés dans v5.0)
        user = {
          id: `test-${role.toLowerCase()}-${Date.now()}`,
          role: role
        };
      }

      if (!user) {
        console.log(`⚠️  ${role}: Aucun utilisateur trouvé`);
        continue;
      }

      const tokenPayload = { sub: user.id, role, ...(user.langue_preferee && { langue: user.langue_preferee }) };
      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });

      console.log(`${role}: Bearer ${token}\n`);
      generated[`token_${role.toLowerCase()}`] = token;

      if (role === 'APPRENANT' || role === 'ORGANISATION') {
        const refreshToken = jwt.sign({ sub: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
        generated[`refresh_token_${role.toLowerCase()}`] = refreshToken;
      }

      if (role === 'APPRENANT') {
        generated.login_email_apprenant = user.email;
        generated.login_password = 'Test@FORGES2026!';
      }
    } catch (error) {
      console.error(`❌ ${role}: Erreur - ${error.message}`);
    }
  }

  const apprenantDev = await prisma.apprenant.findUnique({ where: { email: 'apprenant1@forges-test.ci' } })
    || await prisma.apprenant.findUnique({ where: { email: 'apprenant@forges-dev.ci' } });
  const dossierAttestation = await prisma.dossier.findFirst({
    where: { 
      apprenant_id: apprenantDev?.id, 
      statut: 'PAYE'
    },
    select: { id: true }
  });
  const dossiersPremium = await prisma.dossier.findMany({
    where: {
      statut: 'EN_ATTENTE_VERIFICATION',
      source_financement: 'RETAIL'
    },
    orderBy: { created_at: 'asc' },
    select: { id: true }
  });
  const dossierGenerique = await prisma.dossier.findFirst({
    where: { apprenant_id: apprenantDev?.id },
    select: { id: true }
  });
  const formation = await prisma.formation.findFirst({ where: { id: 'frm-std-00001-0000-0000-000000000001' }, select: { id: true } })
    || await prisma.formation.findFirst({ select: { id: true } });
  const session = await prisma.session.findFirst({
    where: { id: 'ses-open-00001-0000-0000-000000000001' },
    select: { id: true }
  }) || await prisma.session.findFirst({
    where: { statut: 'INSCRIPTIONS_OUVERTES' },
    select: { id: true }
  });
  const formationPartenaire = await prisma.formationPartenaire.findFirst({
    where: { statut_validation: 'EN_ATTENTE_VALIDATION' },
    orderBy: { date_soumission: 'desc' },
    select: { id: true }
  });
  const formationPartenaireReject = await prisma.formationPartenaire.findFirst({
    where: { statut_validation: 'EN_ATTENTE_VALIDATION', id: { not: formationPartenaire?.id || 'fpa-part-00001-0000-0000-000000000001' } },
    orderBy: { date_soumission: 'asc' },
    select: { id: true }
  });
  const partenaire = await prisma.partenaire.findUnique({
    where: { email_principal: 'partenaire@forges-test.ci' },
    select: { id: true, email_principal: true }
  }) || await prisma.partenaire.findUnique({
    where: { email_principal: 'partenaire@forges-dev.ci' },
    select: { id: true, email_principal: true }
  }) || await prisma.partenaire.findFirst({ select: { id: true, email_principal: true } });
  const apporteur = await prisma.apporteur.findUnique({
    where: { email: 'apporteur@forges-test.ci' },
    select: { id: true, code_apporteur: true }
  }) || await prisma.apporteur.findUnique({
    where: { email: 'apporteur@forges-dev.ci' },
    select: { id: true, code_apporteur: true }
  }) || await prisma.apporteur.findFirst({ select: { id: true, code_apporteur: true } });
  const conversationBot = await prisma.conversationBot.findFirst({
    where: { utilisateur_id: apprenantDev?.id, type_utilisateur: 'APPRENANT' },
    orderBy: { date_debut: 'desc' },
    select: { id: true }
  });

  generated.formation_id_test = formation?.id || 'F-DEV-STD-01';
  generated.session_id_test = session?.id || 'S-DEV-OPEN-01';
  generated.dossier_id_test = dossierGenerique?.id || 'D-DEV-ATTENTE-01';
  generated.dossier_id_attestation = dossierAttestation?.id || generated.dossier_id_test;
  generated.dossier_premium_id = dossiersPremium[0]?.id || 'D-DEV-ATTENTE-01';
  generated.dossier_premium_rejeter_id = dossiersPremium[1]?.id || 'D-DEV-ATTENTE-02';
  generated.formation_partenaire_id_test = formationPartenaire?.id || FORMATION_PARTENAIRE_FIXTURE_ID;
  generated.formation_partenaire_id_validate = formationPartenaire?.id || FORMATION_PARTENAIRE_FIXTURE_ID;
  generated.formation_partenaire_id_reject = formationPartenaireReject?.id || 'FP-DEV-02';
  generated.partenaire_id_test = partenaire?.id || 'partenaire-test-id';
  generated.apporteur_id_test = apporteur?.id || 'apporteur-test-id';
  generated.apporteur_code = apporteur?.code_apporteur || '550e8400-e29b-41d4-a716-446655440001';
  generated.confirmation_token_test = 'token-test-invalide';
  generated.conversation_id_test = conversationBot?.id || CONVERSATION_FIXTURE_ID;

  const environmentPath = require('path').join(__dirname, '../tests/forges-v4.8-complete.postman_environment.json');
  if (require('fs').existsSync(environmentPath)) {
    const environment = JSON.parse(require('fs').readFileSync(environmentPath, 'utf-8'));
    const keys = new Set(environment.values.map((entry) => entry.key));
    for (const [key, value] of Object.entries(generated)) {
      if (keys.has(key)) {
        environment.values = environment.values.map((entry) => entry.key === key ? { ...entry, value } : entry);
      } else {
        environment.values.push({ key, value, type: 'default', enabled: true });
      }
    }
    require('fs').writeFileSync(environmentPath, JSON.stringify(environment, null, 2));
    console.log(`✅ Environnement Postman mis à jour: ${environmentPath}`);
  }

  await prisma.$disconnect();
}

generateTokens().catch(console.error);
