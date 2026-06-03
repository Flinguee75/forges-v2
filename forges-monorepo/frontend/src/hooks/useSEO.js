import { useEffect } from 'react';

/**
 * Hook pour gérer les meta tags dynamiques (SEO)
 * @param {Object} seoData - Données SEO
 * @param {string} seoData.title - Titre de la page
 * @param {string} seoData.description - Description de la page
 * @param {string} seoData.keywords - Mots-clés
 * @param {string} seoData.canonical - URL canonique
 * @param {string} seoData.ogImage - Image Open Graph
 * @param {Object} seoData.schema - Schéma JSON-LD (optionnel)
 */
export function useSEO({
  title = 'FORGES',
  description = 'Plateforme de formations certifiantes',
  keywords = '',
  canonical = '',
  ogImage = '/logo_forges.png',
  schema = null,
}) {
  useEffect(() => {
    // Titre
    document.title = title;

    // Meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    }

    // Meta keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords && keywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.name = 'keywords';
      document.head.appendChild(metaKeywords);
    }
    if (metaKeywords && keywords) {
      metaKeywords.setAttribute('content', keywords);
    }

    // Canonical
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink && canonical) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    if (canonicalLink && canonical) {
      canonicalLink.href = canonical;
    }

    // Open Graph
    const updateOGTag = (property, content) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    updateOGTag('og:title', title);
    updateOGTag('og:description', description);
    updateOGTag('og:image', ogImage);

    // JSON-LD Schema
    if (schema) {
      let scriptTag = document.querySelector('script[type="application/ld+json"]');
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(schema);
    }

    return () => {
      // Nettoyage optionnel
    };
  }, [title, description, keywords, canonical, ogImage, schema]);
}

/**
 * Schéma JSON-LD pour une formation
 */
export function getFormationSchema(formation) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: formation.titre || formation.intitule,
    description: formation.description_courte || formation.description,
    image: '/logo_forges.png',
    provider: {
      '@type': 'Organization',
      name: 'FORGES',
      sameAs: 'https://edu.forges-group.com',
    },
    duration: `P${formation.duree_jours || formation.duree}D`,
    price: {
      '@type': 'PriceSpecification',
      priceCurrency: 'XOF',
      price: (formation.cout_catalogue || formation.tarif) / 100,
    },
    offers: {
      '@type': 'Offer',
      url: `https://edu.forges-group.com/formations/${formation.id}`,
      priceCurrency: 'XOF',
      price: (formation.cout_catalogue || formation.tarif) / 100,
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: 'FORGES',
      },
    },
    aggregateRating:
      formation.note && formation.note_count
        ? {
            '@type': 'AggregateRating',
            ratingValue: formation.note,
            reviewCount: formation.note_count,
          }
        : undefined,
  };
}

/**
 * Schéma JSON-LD pour catalogue/collection de formations
 */
export function getCatalogSchema(formations = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Catalogue FORGES',
    description: 'Formations certifiantes en cybersécurité, IA, data science et transformation digitale',
    url: 'https://edu.forges-group.com/catalogue',
    image: '/logo_forges.png',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: formations.map((formation, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `https://edu.forges-group.com/formations/${formation.id}`,
        name: formation.titre || formation.intitule,
        description: formation.description_courte || formation.description,
      })),
    },
  };
}

/**
 * Schéma JSON-LD pour Organisation
 */
export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'FORGES',
    url: 'https://edu.forges-group.com',
    logo: 'https://edu.forges-group.com/logo_forges.png',
    description: 'Plateforme de formations certifiantes professionnelles',
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      email: 'contact@forges-group.com',
    },
  };
}
