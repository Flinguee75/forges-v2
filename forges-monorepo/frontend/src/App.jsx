import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ChunkErrorBoundary from './components/common/ChunkErrorBoundary';
import router from './router';

function App() {
  return (
    <ChunkErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </ChunkErrorBoundary>
  );
}

export default App;
