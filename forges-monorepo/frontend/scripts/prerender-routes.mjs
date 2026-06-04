// Fetch active formation IDs from the backend API at build time.
// Used by vite.config.js to know which /formations/:id routes to prerender.

import axios from 'axios';

const STATIC_ROUTES = ['/', '/catalogue'];

export async function getPrerenderRoutes() {
  const apiBase = process.env.PRERENDER_API_URL
    || process.env.VITE_API_URL?.replace('/api', '')
    || 'http://localhost:3006';

  try {
    const res = await axios.get(`${apiBase}/api/formations`, {
      params: { limit: 500, page: 1 },
      timeout: 10000,
    });
    const formations = res.data?.data ?? [];
    const formationRoutes = formations.map((f) => `/formations/${f.id}`);
    console.log(`[prerender] ${formationRoutes.length} formation routes collected`);
    return [...STATIC_ROUTES, ...formationRoutes];
  } catch (err) {
    console.warn(`[prerender] Could not fetch formations (${err.message}). Using static routes only.`);
    return STATIC_ROUTES;
  }
}
