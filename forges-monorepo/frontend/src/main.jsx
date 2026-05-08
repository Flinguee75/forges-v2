import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'

const CHUNK_RELOAD_KEY = 'chunk_reload_attempted';

window.addEventListener('vite:preloadError', () => {
  if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
    window.location.reload();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
