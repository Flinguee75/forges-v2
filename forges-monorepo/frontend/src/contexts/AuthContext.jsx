import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { AuthContext } from './auth-context';
import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
  updateStoredUser,
} from '../utils/authStorage';
import { authApi } from '../api/auth.api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Restaurer la session au chargement
  useEffect(() => {
    const restoreSession = () => {
      try {
        const { accessToken, user: storedUser } = getStoredSession();

        if (accessToken && storedUser) {
          setUser(storedUser);
          setIsAuthenticated(true);
        } else {
          clearStoredSession();
        }
      } catch {
        clearStoredSession();
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = useCallback((accessToken, refreshToken, userData) => {
    // Stocker les tokens dans sessionStorage (CLAUDE.md 17.4: jamais localStorage)
    setStoredSession({ accessToken, refreshToken, user: userData });

    setUser(userData);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearStoredSession();
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  const updateUser = useCallback((updatedUserData) => {
    const newUserData = { ...user, ...updatedUserData };
    updateStoredUser(newUserData);
    setUser(newUserData);
  }, [user]);

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
