import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'
import { clearChunkReloadAttempt, hasAttemptedChunkReload, markChunkReloadAttempt } from './utils/chunkReload';

window.addEventListener('vite:preloadError', () => {
  if (!hasAttemptedChunkReload()) {
    markChunkReloadAttempt();
    window.location.reload();
  }
});

window.addEventListener('load', () => {
  clearChunkReloadAttempt();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
