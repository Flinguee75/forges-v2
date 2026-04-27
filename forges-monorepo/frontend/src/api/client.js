import axios from 'axios';
import {
  clearStoredSession,
  getAccessToken,
  getRefreshToken,
  getStoredSession,
  setStoredSession,
} from '../utils/authStorage';

// Instance Axios centralisée
const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise = null;

function redirectToLogin() {
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    const { refreshToken, user } = getStoredSession();

    if (!refreshToken) {
      throw new Error('Missing refresh token');
    }

    refreshPromise = axios
      .post(
        `${apiBaseUrl}/auth/refresh`,
        { refreshToken },
        { withCredentials: true }
      )
      .then((response) => {
        const nextAccessToken = response.data.accessToken;
        const nextRefreshToken = response.data.refreshToken ?? refreshToken;

        setStoredSession({
          accessToken: nextAccessToken,
          refreshToken: nextRefreshToken,
          user,
        });

        return nextAccessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

// Intercepteur REQUEST : ajouter le token JWT à chaque requête
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur RESPONSE : gérer les erreurs globalement
apiClient.interceptors.response.use(
  (response) => {
    // Retourner directement les data pour simplifier l'usage
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Gérer les erreurs 401 : token expiré
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Tenter un refresh token si disponible
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const accessToken = await refreshAccessToken();

          // Réessayer la requête originale avec le nouveau token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Si le refresh échoue, déconnecter l'utilisateur
          clearStoredSession();
          redirectToLogin();
          return Promise.reject(refreshError);
        }
      } else {
        // Pas de refresh token, rediriger vers login
        clearStoredSession();
        redirectToLogin();
      }
    }

    // Retourner l'erreur formatée ou l'erreur brute
    return Promise.reject(error.response?.data || error);
  }
);

export { apiClient };
