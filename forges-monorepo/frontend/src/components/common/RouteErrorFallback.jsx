import { useEffect } from 'react';
import { isRouteErrorResponse, useLocation, useNavigate, useRouteError } from 'react-router-dom';
import AppRecoveryScreen from './AppRecoveryScreen';
import {
  hasAttemptedChunkReload,
  isChunkLoadError,
  markChunkReloadAttempt,
} from '../../utils/chunkReload';

function getRouteErrorCopy(error) {
  if (isChunkLoadError(error)) {
    return {
      title: 'Mise à jour en cours',
      message:
        'La version de cette page n’a pas pu être chargée complètement. Nous allons tenter un rechargement automatique.',
      detail:
        'Si le problème persiste, rechargez la page manuellement pour récupérer les derniers fichiers publiés.',
      showHome: true,
    };
  }

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return {
        title: 'Page introuvable',
        message: 'La page demandée n’existe pas ou a été déplacée.',
        detail: 'Vous pouvez revenir à l’accueil ou reprendre la navigation depuis le menu.',
        showHome: true,
      };
    }

    return {
      title: 'Une erreur est survenue',
      message: error.statusText || 'La page n’a pas pu être affichée correctement.',
      detail: 'Veuillez recharger la page. Si le problème persiste, contactez le support technique.',
      showHome: true,
    };
  }

  return {
    title: 'Une erreur est survenue',
    message:
      error instanceof Error && error.message
        ? error.message
        : 'La page n’a pas pu être chargée correctement.',
    detail: 'Veuillez recharger la page. Si le problème persiste, contactez le support technique.',
    showHome: true,
  };
}

export default function RouteErrorFallback() {
  const error = useRouteError();
  const navigate = useNavigate();
  const location = useLocation();
  const copy = getRouteErrorCopy(error);
  const chunkError = isChunkLoadError(error);

  useEffect(() => {
    if (!chunkError || hasAttemptedChunkReload()) {
      return undefined;
    }

    markChunkReloadAttempt();
    const timer = window.setTimeout(() => {
      window.location.reload();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [chunkError]);

  const handleReload = () => {
    markChunkReloadAttempt();
    window.location.reload();
  };

  const handleHome = () => {
    navigate('/', { replace: true, state: { from: location.pathname } });
  };

  return (
    <AppRecoveryScreen
      title={copy.title}
      message={copy.message}
      detail={copy.detail}
      onReload={handleReload}
      onHome={handleHome}
      showHome={copy.showHome}
      reloadLabel={chunkError ? 'Recharger maintenant' : 'Recharger la page'}
    />
  );
}
