/**
 * Script de test des templates emails HTML
 * Usage: node scripts/test-emails.js
 *
 * Ce script génère des aperçus HTML des 5 templates dans /tmp/email-previews/
 * pour validation visuelle dans un navigateur.
 */

const fs = require('fs');
const path = require('path');

// Charger les traductions
function loadTranslations(langue) {
  const translationPath = path.join(__dirname, '../src/locales', langue.toLowerCase(), 'emails.json');
  if (!fs.existsSync(translationPath)) {
    console.warn(`⚠️  Traduction ${langue} introuvable, fallback FR`);
    return loadTranslations('fr');
  }
  return JSON.parse(fs.readFileSync(translationPath, 'utf-8'));
}

// Interpoler un template
function renderTemplate(templateName, langue, variables) {
  const templatePath = path.join(__dirname, '../src/templates', `${templateName}.html`);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`❌ Template ${templateName} introuvable`);
  }

  let html = fs.readFileSync(templatePath, 'utf-8');
  const translations = loadTranslations(langue);
  const emailTranslations = translations[templateName] || {};
  const commonTranslations = translations.common || {};

  // Variables traduites
  const allVariables = {
    lang: langue.toLowerCase(),
    // Common
    t_platform_name: commonTranslations.platform_name || 'FORGES',
    t_platform_tagline: commonTranslations.platform_tagline || '',
    t_greeting: commonTranslations.greeting || 'Bonjour',
    t_regards: commonTranslations.regards || 'Cordialement',
    t_team_signature: commonTranslations.team_signature || "L'équipe FORGES",
    t_footer_copyright: commonTranslations.footer_copyright || '© 2026 FORGES',
    t_footer_visit_site: commonTranslations.footer_visit_site || 'Visiter notre site',
    t_footer_support: commonTranslations.footer_support || 'Support',
    t_contact_us: commonTranslations.contact_us || '',
    // Template-specific
    t_title: emailTranslations.title || '',
    t_intro: emailTranslations.intro || '',
    t_formation_label: emailTranslations.formation_label || 'Formation :',
    t_session_label: emailTranslations.session_label || 'Session :',
    t_session_dates: emailTranslations.session_dates || '',
    t_important_title: emailTranslations.important_title || '',
    t_payment_deadline: emailTranslations.payment_deadline || '',
    t_deadline_label: emailTranslations.deadline_label || '',
    t_deadline_warning: emailTranslations.deadline_warning || '',
    t_cta_button: emailTranslations.cta_button || '',
    t_message: emailTranslations.message || '',
    t_reason_label: emailTranslations.reason_label || '',
    t_encouragement: emailTranslations.encouragement || '',
    t_warning_title: emailTranslations.warning_title || '',
    t_warning_message: emailTranslations.warning_message || '',
    t_consequence: emailTranslations.consequence || '',
    t_amount_label: emailTranslations.amount_label || '',
    t_period_label: emailTranslations.period_label || '',
    t_commissions_label: emailTranslations.commissions_label || '',
    t_info: emailTranslations.info || '',
    // User variables
    ...variables,
  };

  // Interpolation
  Object.keys(allVariables).forEach((key) => {
    const value = allVariables[key] || '';
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, value);
  });

  return html;
}

// Créer le répertoire de sortie
const outputDir = '/tmp/email-previews';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🧪 Test des templates HTML emails FORGES v4.8\n');

// Test 1 : dossier-retenu (4 langues)
console.log('📧 Test 1/5: dossier-retenu');
['fr', 'en', 'es', 'pt'].forEach(lang => {
  const html = renderTemplate('dossier-retenu', lang, {
    nom_apprenant: 'Mamadou Diallo',
    formation_intitule: 'Certification AWS Solutions Architect',
    date_debut: '15 mai 2026',
    date_fin: '30 juin 2026',
    delai_expiration: '20 avril 2026 à 14h30',
    lien_paiement: 'https://forges.local/apprenant/paiements/abc123',
    site_url: 'https://forges.local',
    support_email: 'support@forges.local',
  });
  const outputPath = path.join(outputDir, `dossier-retenu-${lang}.html`);
  fs.writeFileSync(outputPath, html);
  console.log(`   ✅ ${lang.toUpperCase()}: ${outputPath}`);
});

// Test 2 : dossier-rejete (4 langues)
console.log('\n📧 Test 2/5: dossier-rejete');
['fr', 'en', 'es', 'pt'].forEach(lang => {
  const html = renderTemplate('dossier-rejete', lang, {
    nom_apprenant: 'Aminata Touré',
    formation_intitule: 'Master Data Science',
    motif_refus: 'Profil ne correspondant pas aux prérequis académiques (niveau licence requis)',
    catalogue_url: 'https://forges.local/catalogue',
    site_url: 'https://forges.local',
    support_email: 'support@forges.local',
  });
  const outputPath = path.join(outputDir, `dossier-rejete-${lang}.html`);
  fs.writeFileSync(outputPath, html);
  console.log(`   ✅ ${lang.toUpperCase()}: ${outputPath}`);
});

// Test 3 : relance-paiement (4 langues)
console.log('\n📧 Test 3/5: relance-paiement');
['fr', 'en', 'es', 'pt'].forEach(lang => {
  const html = renderTemplate('relance-paiement', lang, {
    nom_apprenant: 'Fatou Ndiaye',
    formation_intitule: 'Formation DevOps Engineer',
    date_debut: '10 juin 2026',
    date_fin: '25 juillet 2026',
    delai_expiration: '22 avril 2026 à 10h00',
    heures_restantes: '24',
    lien_paiement: 'https://forges.local/apprenant/paiements/xyz789',
    site_url: 'https://forges.local',
    support_email: 'support@forges.local',
  });
  const outputPath = path.join(outputDir, `relance-paiement-${lang}.html`);
  fs.writeFileSync(outputPath, html);
  console.log(`   ✅ ${lang.toUpperCase()}: ${outputPath}`);
});

// Test 4 : reversement-partenaire (4 langues)
console.log('\n📧 Test 4/5: reversement-partenaire');
['fr', 'en', 'es', 'pt'].forEach(lang => {
  const html = renderTemplate('reversement-partenaire', lang, {
    raison_sociale: 'Université Cheikh Anta Diop',
    montant_reverse: '1.250.000',
    montant: '1.250.000',
    nb_commissions: '47',
    periode: 'Mars 2026',
    dashboard_url: 'https://forges.local/partenaire/reversements',
    site_url: 'https://forges.local',
    support_email: 'support@forges.local',
  });
  const outputPath = path.join(outputDir, `reversement-partenaire-${lang}.html`);
  fs.writeFileSync(outputPath, html);
  console.log(`   ✅ ${lang.toUpperCase()}: ${outputPath}`);
});

// Test 5 : reversement-apporteur (4 langues)
console.log('\n📧 Test 5/5: reversement-apporteur');
['fr', 'en', 'es', 'pt'].forEach(lang => {
  const html = renderTemplate('reversement-apporteur', lang, {
    nom_apporteur: 'Ibrahima Sarr',
    montant_commission: '75.500',
    montant: '75.500',
    nb_commissions: '12',
    periode: 'Mars 2026',
    dashboard_url: 'https://forges.local/apporteur/commissions',
    site_url: 'https://forges.local',
    support_email: 'support@forges.local',
  });
  const outputPath = path.join(outputDir, `reversement-apporteur-${lang}.html`);
  fs.writeFileSync(outputPath, html);
  console.log(`   ✅ ${lang.toUpperCase()}: ${outputPath}`);
});

console.log('\n✅ TOUS LES TEMPLATES GÉNÉRÉS\n');
console.log(`📂 Répertoire: ${outputDir}`);
console.log(`📊 Total: 20 fichiers HTML (5 templates × 4 langues)`);
console.log(`\n💡 Ouvrir dans un navigateur pour validation visuelle:`);
console.log(`   open ${outputDir}/dossier-retenu-fr.html`);
console.log('\n🎯 Checklist validation:');
console.log('   □ Charte graphique FORGES respectée (couleurs, typo)');
console.log('   □ Responsive (max-width 600px)');
console.log('   □ Toutes les variables interpolées correctement');
console.log('   □ Fallback FR fonctionne si traduction manquante');
console.log('   □ Boutons CTA visibles et cliquables');
console.log('   □ Footer complet (copyright + liens)');
