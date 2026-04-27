import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/feedback/Spinner';
import { getStoredSession } from '../utils/authStorage';

/**
 * PrivateRoute - Protège les routes nécessitant une authentification
 * Redirige vers /login si l'utilisateur n'est pas authentifié
 */
export default function PrivateRoute({ children }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const storedSession = getStoredSession();
  const effectiveUser = user || storedSession.user;
  const hasStoredSession = Boolean(storedSession.accessToken && effectiveUser);

  // Afficher un spinner pendant la vérification de la session
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="large" />
      </div>
    );
  }

  // Rediriger vers login si non authentifié
  if ((!isAuthenticated && !hasStoredSession) || !effectiveUser) {
    return <Navigate to="/login" replace />;
  }

  // Utilisateur authentifié : afficher le contenu
  return children;
}

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
};
