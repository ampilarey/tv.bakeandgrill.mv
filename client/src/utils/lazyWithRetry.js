import { lazy } from 'react';

const RELOAD_KEY = 'chunk_reload_once';

function isChunkLoadError(error) {
  const message = error?.message || '';
  return (
    error?.name === 'ChunkLoadError' ||
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module')
  );
}

/** Retry lazy route chunks once; reload the page if assets changed after a deploy. */
export function lazyWithRetry(factory) {
  return lazy(() =>
    factory().catch((error) => {
      if (isChunkLoadError(error) && !sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, '1');
        window.location.reload();
        return new Promise(() => {});
      }
      sessionStorage.removeItem(RELOAD_KEY);
      throw error;
    }),
  );
}

export function clearChunkReloadFlag() {
  sessionStorage.removeItem(RELOAD_KEY);
}
