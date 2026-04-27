const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcrypt');

const prisma = new PrismaClient();

// Mot de passe par défaut pour tous les comptes de test
const DEFAULT_PASSWORD = 'Test123!';

async function seedRolesTest() {
  console.log('🌱 Création des comptes de test pour tous les rôles FORGES v4.8...\n');

  try {
    // Hash du mot de passe par défaut
    const password_hash = await hash(DEFAULT_PASSWORD, 12);

    // ============================================
    // 1. APPRENANT (si n'existe pas déjà)
    // ============================================
    let apprenant = await prisma.apprenant.findUnique({
      where: { email: 'apprenant.test@forges.sn' }
    });

    if (!apprenant) {
      apprenant = await prisma.apprenant.create({
        data: {
          email: 'apprenant.test@forges.sn',
          password_hash,
          nom: 'Test',
          prenoms: 'Apprenant',
          type_apprenant: 'APPRENANT',
          niveau_etude: 'LICENCE',
          pays_residence: 'SN',
          pays_nationalite: 'SN',
          langue_preferee: 'FR',
          statut: 'ACTIF',
          consentement_rgpd: true,
          consentement_timestamp: new Date(),
          consentement_version_cgu: '1.0',
        }
      });
      console.log('✅ APPRENANT créé');
      console.log(`   ID: ${apprenant.id}`);
      console.log(`   Email: apprenant.test@forges.sn`);
      console.log(`   Password: ${DEFAULT_PASSWORD}\n`);
    } else {
      console.log('⏭️  APPRENANT existe déjà');
      console.log(`   ID: ${apprenant.id}\n`);
    }

    // ============================================
    // 2. ORGANISATION (si n'existe pas déjà)
    // ============================================
    let organisation = await prisma.organisation.findUnique({
      where: { email: 'organisation.test@forges.sn' }
    });

    if (!organisation) {
      organisation = await prisma.organisation.create({
        data: {
          email: 'organisation.test@forges.sn',
          password_hash,
          raison_sociale: 'Organisation Test FORGES',
          type: 'ENTREPRISE',
          contact_referent: 'Test Contact RH',
          pays: 'SN',
          langue_preferee: 'FR',
          statut: 'ACTIVE',
        }
      });
      console.log('✅ ORGANISATION créée');
      console.log(`   ID: ${organisation.id}`);
      console.log(`   Email: organisation.test@forges.sn`);
      console.log(`   Password: ${DEFAULT_PASSWORD}\n`);
    } else {
      console.log('⏭️  ORGANISATION existe déjà');
      console.log(`   ID: ${organisation.id}\n`);
    }

    // ============================================
    // 3. PARTENAIRE (si n'existe pas déjà)
    // ============================================
    let partenaire = await prisma.partenaire.findUnique({
      where: { email_principal: 'partenaire.test@forges.sn' }
    });

    if (!partenaire) {
      partenaire = await prisma.partenaire.create({
        data: {
          email_principal: 'partenaire.test@forges.sn',
          password_hash,
          raison_sociale: 'Université Test FORGES',
          type: 'UNIVERSITE',
          pays: 'SN',
          commission_forges_pct: 20,
          statut: 'ACTIF',
          mode_inscription: 'INVITATION',
        }
      });
      console.log('✅ PARTENAIRE créé');
      console.log(`   ID: ${partenaire.id}`);
      console.log(`   Email: partenaire.test@forges.sn`);
      console.log(`   Password: ${DEFAULT_PASSWORD}\n`);
    } else {
      console.log('⏭️  PARTENAIRE existe déjà');
      console.log(`   ID: ${partenaire.id}\n`);
    }

    // ============================================
    // 4. APPORTEUR (si n'existe pas déjà)
    // ============================================
    let apporteur = await prisma.apporteur.findUnique({
      where: { email: 'apporteur.test@forges.sn' }
    });

    if (!apporteur) {
      const { v4: uuidv4 } = require('uuid');
      apporteur = await prisma.apporteur.create({
        data: {
          email: 'apporteur.test@forges.sn',
          password_hash,
          nom: 'Test',
          prenoms: 'Apporteur',
          type: 'INDIVIDU',
          code_parrainage: uuidv4(), // Code UUID permanent (RM-142)
          taux_commission: 5, // Taux par défaut 5% (RM-142)
          statut: 'ACTIF',
        }
      });
      console.log('✅ APPORTEUR créé');
      console.log(`   ID: ${apporteur.id}`);
      console.log(`   Code UUID: ${apporteur.code_parrainage}`);
      console.log(`   Email: apporteur.test@forges.sn`);
      console.log(`   Password: ${DEFAULT_PASSWORD}\n`);
    } else {
      console.log('⏭️  APPORTEUR existe déjà');
      console.log(`   ID: ${apporteur.id}`);
      console.log(`   Code: ${apporteur.code_parrainage}\n`);
    }

    // ============================================
    // 5. ADMIN (déjà existant normalement)
    // ============================================
    const admin = await prisma.apprenant.findUnique({
      where: { email: 'admin@forges.sn' }
    });

    if (admin) {
      console.log('✅ ADMIN existant confirmé');
      console.log(`   ID: ${admin.id}`);
      console.log(`   Email: admin@forges.sn\n`);
    } else {
      console.log('⚠️  ADMIN non trouvé - à créer manuellement\n');
    }

    // ============================================
    // RÉSUMÉ FINAL
    // ============================================
    console.log('='.repeat(80));
    console.log('📊 RÉSUMÉ DES COMPTES DE TEST');
    console.log('='.repeat(80));
    console.log('');
    console.log('Mot de passe pour tous les comptes : Test123!');
    console.log('');
    console.log('Comptes créés/vérifiés :');
    console.log(`  1. APPRENANT      : ${apprenant.id}`);
    console.log(`  2. ORGANISATION   : ${organisation.id}`);
    console.log(`  3. PARTENAIRE     : ${partenaire.id}`);
    console.log(`  4. APPORTEUR      : ${apporteur.id} (code: ${apporteur.code_parrainage})`);
    console.log(`  5. ADMIN          : ${admin ? admin.id : 'NON TROUVÉ'}`);
    console.log('');
    console.log('⚠️  RÔLES BACKOFFICE À CRÉER MANUELLEMENT :');
    console.log('  - SUPERVISEUR');
    console.log('  - RESPONSABLE');
    console.log('  - AGENT');
    console.log('  - GESTIONNAIRE');
    console.log('');
    console.log('Ces rôles nécessitent un endpoint admin POST /api/comptes');
    console.log('ou doivent être créés directement dans Apprenant avec le bon rôle.');
    console.log('='.repeat(80));

    await prisma.$disconnect();
    console.log('\n✅ Seed terminé avec succès!');

  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

seedRolesTest();
