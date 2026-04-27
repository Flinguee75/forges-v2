import axios from 'axios';
import { apiClient } from './client';
import { getStoredSession, setStoredSession } from '../utils/authStorage';

const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';

function getCurrentRole() {
  return getStoredSession()?.user?.role;
}

const PROFILE_UPDATE_ROUTES = {
  APPRENANT: '/apprenants/profil',
  ORGANISATION: '/espace-organisation/profil',
  GESTIONNAIRE: '/espace-organisation/profil',
  PARTENAIRE: '/partenaires/profil',
  APPORTEUR: '/apporteurs/profil',
};

function runtimeUnavailable(operation) {
  const error = new Error(
    `${operation} n'est pas exposé par le runtime backend actuel`
  );
  error.code = 'ROUTE_ABSENTE';
  error.statusCode = 501;
  return error;
}

async function postLogout(accessToken, refreshToken) {
  const response = await axios.post(
    `${apiBaseUrl}/auth/logout`,
    refreshToken ? { refreshToken } : {},
    {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return response.data;
}

export const authApi = {
  // Login
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response?.data ?? response;
  },

  // Logout
  logout: async (fallbackRefreshToken) => {
    const {
      accessToken,
      refreshToken: storedRefreshToken,
      user,
    } = getStoredSession();
    const refreshToken = fallbackRefreshToken || storedRefreshToken;

    if (!accessToken) {
      return { message: 'Aucune session active a deconnecter' };
    }

    try {
      return await postLogout(accessToken, refreshToken);
    } catch (error) {
      if (error.response?.status !== 401 || !refreshToken) {
        throw error.response?.data || error;
      }

      const refreshResponse = await axios.post(
        `${apiBaseUrl}/auth/refresh`,
        { refreshToken },
        { withCredentials: true }
      );

      const nextAccessToken = refreshResponse.data.accessToken;
      const nextRefreshToken = refreshResponse.data.refreshToken ?? refreshToken;

      setStoredSession({
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken,
        user,
      });

      return postLogout(nextAccessToken, nextRefreshToken);
    }
  },

  // Refresh token
  refresh: async (refreshToken) => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response?.data ?? response;
  },

  // Register Étudiant
  registerEtudiant: async (data) => {
    const response = await apiClient.post('/comptes/etudiant/register', data);
    return response?.data ?? response;
  },

  // Register Organisation
  registerOrganisation: async (data) => {
    const response = await apiClient.post('/comptes/organisation/register', data);
    return response?.data ?? response;
  },

  // Confirm email
  confirmEmail: async (token) => {
    try {
      const response = await apiClient.get(`/apprenants/confirm/${token}`);
      return response?.data ?? response;
    } catch (error) {
      const shouldFallback =
        error?.statusCode === 404 ||
        error?.code === 'TOKEN_INVALID' ||
        error?.error === 'TOKEN_INVALID';

      if (!shouldFallback) {
        throw error?.response?.data || error;
      }

      try {
        const response = await apiClient.get(`/organisations/confirm/${token}`);
        return response?.data ?? response;
      } catch (orgError) {
        throw orgError?.response?.data || orgError || error;
      }
    }
  },

  // Reset password request
  requestPasswordReset: async (email) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response?.data ?? response;
  },

  // Reset password with token
  resetPassword: async (token, newPassword) => {
    const response = await apiClient.post('/auth/reset-password', {
      token,
      password: newPassword,
    });
    return response?.data ?? response;
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    const response = await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response?.data ?? response;
  },

  // Get current user profile
  getProfile: async () => {
    const response = await apiClient.get('/auth/me');
    return response?.data ?? response;
  },

  // Update current user profile
  updateProfile: async (data) => {
    const role = getCurrentRole();

    const route = PROFILE_UPDATE_ROUTES[role];

    if (route) {
      const response = await apiClient.put(route, data);
      return response;
    }

    throw runtimeUnavailable('La mise à jour du profil courant');
  },
};

export default authApi;
