/**
 * Générateur de sitemap XML pour FORGES
 * Exécution : node scripts/generate-sitemap.js
 */

import fs from 'fs';
import path from 'path';

const DOMAIN = 'https://forges.com';
const OUTPUT_PATH = path.join(process.cwd(), 'public', 'sitemap.xml');

// Pages statiques
const staticPages = [
  { url: '/', changefreq: 'weekly', priority: 1.0 },
  { url: '/formations', changefreq: 'daily', priority: 0.9 },
  { url: '/about', changefreq: 'monthly', priority: 0.7 },
  { url: '/contact', changefreq: 'monthly', priority: 0.7 },
  { url: '/terms', changefreq: 'yearly', priority: 0.5 },
  { url: '/privacy', changefreq: 'yearly', priority: 0.5 },
];

/**
 * Génère une URL sitemap
 */
function generateUrlEntry(url, changefreq = 'weekly', priority = 0.8, lastmod = new Date().toISOString()) {
  return `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

/**
 * Génère le sitemap XML
 */
function generateSitemap() {
  const urlEntries = staticPages
    .map((page) =>
      generateUrlEntry(
        `${DOMAIN}${page.url}`,
        page.changefreq,
        page.priority
      )
    )
    .join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

  // Créer le répertoire s'il n'existe pas
  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Écrire le fichier
  fs.writeFileSync(OUTPUT_PATH, sitemap, 'utf-8');
  console.log(`✅ Sitemap généré: ${OUTPUT_PATH}`);
}

generateSitemap();
