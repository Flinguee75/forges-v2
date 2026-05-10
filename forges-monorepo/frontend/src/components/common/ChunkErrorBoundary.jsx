import { Component } from 'react';
import AppRecoveryScreen from './AppRecoveryScreen';
import {
  hasAttemptedChunkReload,
  isChunkLoadError,
  markChunkReloadAttempt,
} from '../../utils/chunkReload';

export default class ChunkErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    if (isChunkLoadError(error)) {
      return { hasError: true, chunkError: true };
    }
    return { hasError: true, chunkError: false };
  }

  componentDidCatch(error) {
    if (isChunkLoadError(error) && !hasAttemptedChunkReload()) {
      markChunkReloadAttempt();
      this.reloadTimer = window.setTimeout(() => {
        window.location.reload();
      }, 300);
    }
  }

  componentWillUnmount() {
    if (this.reloadTimer) {
      window.clearTimeout(this.reloadTimer);
    }
  }

  renderChunkFallback() {
    return (
      <AppRecoveryScreen
        title="Mise à jour en cours"
        message="La version de l'application n'a pas pu être chargée complètement."
        detail="Nous allons tenter un rechargement automatique. Si le problème persiste, rechargez la page manuellement."
        onReload={() => {
          markChunkReloadAttempt();
          window.location.reload();
        }}
        reloadLabel="Recharger maintenant"
      />
    );
  }

  renderGenericFallback() {
    return (
      <AppRecoveryScreen
        title="Une erreur est survenue"
        message="L'application n'a pas pu afficher cette page."
        detail="Rechargez la page pour reprendre la navigation. Si l'erreur persiste, contactez le support technique."
        onReload={() => window.location.reload()}
      />
    );
  }

  render() {
    if (this.state.hasError && this.state.chunkError) {
      return this.renderChunkFallback();
    }

    if (this.state.hasError) {
      return this.renderGenericFallback();
    }

    return this.props.children;
  }
}
