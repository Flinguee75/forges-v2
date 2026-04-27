import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import router from './router';

/**
 * App - Point d'entrée de l'application FORGES
 * Configure les providers globaux et le routing
 */
function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
