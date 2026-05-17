# Guide SEO - FORGES Platform

## ✅ Implémentations actuelles

### 1. **Meta Tags Globaux** ✅
- ✅ Title tag optimisé
- ✅ Meta description avec keywords primaires
- ✅ Meta keywords ciblés
- ✅ Open Graph tags (Facebook, LinkedIn)
- ✅ Twitter Card tags
- ✅ Viewport et charset
- ✅ Canonical URLs
- ✅ Author tag

### 2. **Fichiers Robots & Sitemap** ✅
- ✅ `robots.txt` au `/public` (structure de crawl optimisée)
- ✅ Générateur de `sitemap.xml` (pages statiques)
- ✅ Règles spécifiques pour Googlebot

### 3. **Structured Data (JSON-LD)** ✅
- ✅ Hook `useSEO()` pour meta tags dynamiques
- ✅ Schéma Course pour pages de formation
- ✅ Schéma CollectionPage pour catalogue
- ✅ Schéma Organization
- ✅ Schéma BreadcrumbList

### 4. **Composants SEO** ✅
- ✅ Breadcrumb component avec schéma JSON-LD
- ✅ Hook de gestion des meta tags

---

## 🎯 À faire immédiatement

### Phase 1 : Pages Critiques (1-2 semaines)

#### 1. **FormationDetailPage.jsx** - Importer et utiliser `useSEO`
```jsx
import { useSEO, getFormationSchema } from '../../hooks/useSEO';

export default function FormationDetailPage() {
  // ... code existant
  
  useSEO({
    title: `${formation.intitule} | FORGES`,
    description: formation.description_courte || formation.description,
    keywords: `${formation.intitule}, formation, certification`,
    canonical: `https://forges.com/formations/${formation.id}`,
    ogImage: formation.image_url || '/logo_forges.png',
    schema: getFormationSchema(formation),
  });

  return (
    <>
      <Breadcrumb 
        items={[
          { label: 'Accueil', url: '/' },
          { label: 'Formations', url: '/formations' },
          { label: formation.intitule },
        ]}
      />
      {/* ... contenu */}
    </>
  );
}
```

#### 2. **CatalogPage.jsx** - Ajouter pagination SEO
```jsx
import { useSEO, getCatalogSchema } from '../../hooks/useSEO';

export default function CatalogPage() {
  const page = new URLSearchParams(window.location.search).get('page') || 1;
  
  useSEO({
    title: `Catalogue de Formations | FORGES - Page ${page}`,
    description: 'Découvrez nos formations en cybersécurité, IA, data science et transformation digitale',
    keywords: 'formations, cybersécurité, IA, data science, bootcamp, certification',
    canonical: `https://forges.com/formations?page=${page}`,
    schema: getCatalogSchema(formations),
  });

  return (
    <>
      <Breadcrumb items={[{ label: 'Accueil', url: '/' }, { label: 'Formations' }]} />
      {/* ... contenu */}
    </>
  );
}
```

---

## 📊 Optimisations supplémentaires

### Contenu & Keywords
- [ ] Rechercher keywords : "formations cybersécurité Afrique", "bootcamp IA XOF"
- [ ] Ajouter FAQ schema sur pages de formation
- [ ] Créer blog avec articles SEO

### Technique
- [ ] Lazy loading des images (improves Core Web Vitals)
- [ ] Compression d'images WebP
- [ ] Minification CSS/JS
- [ ] Cache headers optimisés

### Backlinks & Autorité
- [ ] Soumettre sitemap à Google Search Console
- [ ] Soumettre sitemap à Bing Webmaster Tools
- [ ] Créer profils locaux (Google My Business)
- [ ] Ajouter structured data LocalBusiness

### Contenu
- [ ] Créer landing pages par domaine (cyber, IA, etc.)
- [ ] Blog de contenu éducatif
- [ ] Études de cas & témoignages
- [ ] Webinaires & ressources gratuites

---

## 🔧 Commandes utiles

```bash
# Générer le sitemap
cd frontend && node scripts/generate-sitemap.js

# Vérifier avec Google PageSpeed Insights
# https://pagespeed.web.dev/

# Valider structured data
# https://validator.schema.org/
```

---

## 📌 Résumé des fichiers créés

| Fichier | Rôle |
|---------|------|
| `frontend/index.html` | Meta tags globaux + OG |
| `frontend/src/hooks/useSEO.js` | Hook pour SEO dynamique |
| `frontend/public/robots.txt` | Crawl directives |
| `frontend/scripts/generate-sitemap.js` | Générateur sitemap |
| `frontend/src/components/common/Breadcrumb.jsx` | Navigation + schéma |

---

## ✅ Checklist d'implémentation

- [x] Meta tags de base
- [x] Open Graph & Twitter Cards
- [x] Robots.txt et Sitemap
- [x] JSON-LD Schemas
- [x] Hook useSEO
- [x] Breadcrumb component
- [ ] Intégrer useSEO sur FormationDetailPage
- [ ] Intégrer useSEO sur CatalogPage
- [ ] Soumettre sitemap à Google
- [ ] Analyser avec GSC
- [ ] Optimiser Core Web Vitals
- [ ] Créer contenu SEO (blog)

---

## 💡 Quick Wins

1. **H1 optimization** : Chaque page doit avoir UN seul H1
2. **Alt text** : Tous les images doivent avoir des descriptions
3. **URLs sémantiques** : `/formations/[id]` ✅ (déjà bon)
4. **Mobile first** : Tester sur mobile avec PageSpeed
5. **Page speed** : Viser > 90 score Lighthouse

---

## 📞 Support SEO

- Google Search Console : https://search.google.com/search-console
- Bing Webmaster Tools : https://www.bing.com/webmasters
- Screaming Frog : https://www.screamingfrog.co.uk/seo-spider/
- SEMrush : https://www.semrush.com/
