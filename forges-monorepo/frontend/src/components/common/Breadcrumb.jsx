import { Link } from 'react-router-dom';

/**
 * Composant Breadcrumb pour navigation et SEO
 * Améliore le contexte et l'UX
 */
export default function Breadcrumb({ items = [] }) {
  if (items.length === 0) return null;

  // Schéma JSON-LD pour breadcrumbs
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: item.url ? `https://forges.com${item.url}` : undefined,
    })),
  };

  // Ajouter le schéma JSON-LD au head
  React.useEffect(() => {
    let script = document.querySelector('script[data-breadcrumb="true"]');
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-breadcrumb', 'true');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(breadcrumbSchema);
  }, []);

  return (
    <nav
      className="flex items-center gap-2 text-xs text-slate-600 md:text-sm"
      aria-label="Fil d'ariane"
    >
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {item.url ? (
            <Link to={item.url} className="hover:text-slate-900">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-900 font-medium">{item.label}</span>
          )}
          {index < items.length - 1 && <span className="text-slate-400">/</span>}
        </div>
      ))}
    </nav>
  );
}
