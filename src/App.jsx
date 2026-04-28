import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Loads from './pages/Loads';
import Expenses from './pages/Expenses';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import { Toaster } from './components/ui/toaster';
import { AuthProvider } from './contexts/authContext';
import AuthGuard from './components/AuthGuard';
import ErrorBoundary from './components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
            <AuthGuard>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/loads" element={<Loads />} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Layout>
            </AuthGuard>
          </ErrorBoundary>
        </AuthProvider>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
