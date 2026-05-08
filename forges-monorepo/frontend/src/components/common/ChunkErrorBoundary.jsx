import { Component } from 'react';

const CHUNK_ERROR_RELOAD_KEY = 'chunk_error_reloaded';

function isChunkError(error) {
  if (!error) return false;
  const msg = error.message || '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Unable to preload CSS')
  );
}

export default class ChunkErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    if (isChunkError(error)) {
      return { hasError: true, chunkError: true };
    }
    return { hasError: true, chunkError: false };
  }

  componentDidCatch(error) {
    if (isChunkError(error)) {
      // Recharge une seule fois pour eviter une boucle infinie
      const alreadyReloaded = sessionStorage.getItem(CHUNK_ERROR_RELOAD_KEY);
      if (!alreadyReloaded) {
        sessionStorage.setItem(CHUNK_ERROR_RELOAD_KEY, '1');
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError && !this.state.chunkError) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-xl font-semibold text-primary">Une erreur est survenue</h1>
            <p className="text-subtext text-sm">Rechargez la page ou contactez le support.</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white"
            >
              Recharger
            </button>
          </div>
        </div>
      );
    }

    // Chunk error : affiche rien pendant le rechargement auto
    if (this.state.hasError && this.state.chunkError) {
      return null;
    }

    return this.props.children;
  }
}
