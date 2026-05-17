import { getAccessToken } from './authStorage';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Envoie un evenement de clic vers le backend pour affichage Grafana.
 * Fire-and-forget : ne bloque pas le UI, silencieux en cas d'erreur.
 *
 * @param {string} element  Identifiant de l'element clique (ex: "btn-inscription", "nav-catalogue")
 * @param {Object} metadata Donnees supplementaires optionnelles (ex: { formationId: "..." })
 */
export function trackClick(element, metadata = {}) {
  const token = getAccessToken();

  fetch(`${API_BASE}/analytics/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      element,
      page: window.location.pathname,
      metadata,
    }),
    keepalive: true,
  }).catch(() => {});
}
