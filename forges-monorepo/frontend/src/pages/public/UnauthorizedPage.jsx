import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';

/**
 * UnauthorizedPage - Affichée quand l'utilisateur tente d'accéder à une ressource interdite
 */
export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="text-center">
        <div className="text-6xl font-bold text-danger mb-4">403</div>
        <h1 className="text-2xl font-semibold text-text mb-2">
          Accès refusé
        </h1>
        <p className="text-subtext mb-6">
          Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
        </p>
        <Link to="/">
          <Button variant="primary">
            Retour à l&apos;accueil
          </Button>
        </Link>
      </div>
    </div>
  );
}
