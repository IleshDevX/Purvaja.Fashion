import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './providers.js';
import { router } from './router.js';
import { ErrorBoundary } from '../components/common/ErrorBoundary.js';
import { AuthBootstrap } from '../features/auth/components/AuthBootstrap.js';

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AuthBootstrap>
          <RouterProvider router={router} />
        </AuthBootstrap>
      </AppProviders>
    </ErrorBoundary>
  );
}

export default App;
