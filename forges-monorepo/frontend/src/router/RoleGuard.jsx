import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../hooks/useAuth';
import { getStoredSession } from '../utils/authStorage';

/**
 * RoleGuard - Protège les routes selon le rôle de l'utilisateur
 * Redirige vers /unauthorized si le rôle n'est pas autorisé
 * Redirige vers /login si non authentifié
 */
export default function RoleGuard({ allowedRoles, children }) {
  const { user } = useAuth();
  const effectiveUser = user || getStoredSession().user;

  // Si pas d'utilisateur connecté, rediriger vers login
  if (!effectiveUser) {
    return <Navigate to="/login" replace />;
  }

  // Si le rôle de l'utilisateur n'est pas dans la liste des rôles autorisés
  if (!allowedRoles.includes(effectiveUser.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Utilisateur autorisé : afficher le contenu
  return children;
}

RoleGuard.propTypes = {
  allowedRoles: PropTypes.arrayOf(PropTypes.string).isRequired,
  children: PropTypes.node.isRequired,
};
