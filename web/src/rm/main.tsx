/**
 * RM Frontend Entry Point
 * This can be built independently for RM-only deployment
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { RMRoutes } from './routes';
import Login from '../shared/pages/Login';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ToastProvider } from '../components/ui/Toast';
import '../index.css';

// Handle auth callback for Keycloak/OAuth
function CallbackHandler() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  
  React.useEffect(() => {
    if (code) {
      // Handle OAuth callback
      import('../shared/lib/auth/providers').then(({ authProvider }) => {
        authProvider.handleCallback().then(() => {
          window.location.href = '/rm';
        });
      });
    }
  }, [code]);

  return <div>Processing login...</div>;
}

function App() {
  return (
    <Routes>
      <Route path="/callback" element={<CallbackHandler />} />
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={<RMRoutes />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

