export const CHUNK_RELOAD_KEY = 'forges_chunk_reload_attempted';

export function isChunkLoadError(error) {
  if (!error) return false;

  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('Unable to preload CSS') ||
    message.includes('ChunkLoadError') ||
    message.includes('Loading chunk') ||
    message.includes('Loading CSS chunk')
  );
}

export function hasAttemptedChunkReload() {
  return sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1';
}

export function markChunkReloadAttempt() {
  sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
}

export function clearChunkReloadAttempt() {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
}
