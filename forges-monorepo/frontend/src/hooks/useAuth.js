import { useContext } from 'react';
import { AuthContext } from '../contexts/auth-context';

/**
 * Hook useAuth - Accès au contexte d'authentification
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export default useAuth;
