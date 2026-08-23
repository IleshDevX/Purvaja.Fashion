import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './providers.js';
import { router } from './router.js';
import { ErrorBoundary } from '../components/common/ErrorBoundary.js';

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </ErrorBoundary>
  );
}

export default App;
