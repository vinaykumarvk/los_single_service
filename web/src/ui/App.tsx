/**
 * Main App Component
 * Supports persona-based routing for RM, Admin, and Operations
 * Can also run in 'all' mode for full application
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Dashboard from '../pages/Dashboard';
import Applications from '../pages/Applications';
import ApplicationNew from '../pages/ApplicationNew';
import ApplicationDetail from '../pages/ApplicationDetail';
import KycUpsert from '../pages/KycUpsert';
import DocumentUpload from '../pages/DocumentUpload';
import Underwriting from '../pages/Underwriting';
import SanctionOffer from '../pages/SanctionOffer';
import Payments from '../pages/Payments';
import Disbursement from '../pages/Disbursement';
import Login from '../pages/Login';
import Callback from '../pages/Callback';
import AuthGuard from '../components/AuthGuard';
import { ToastProvider } from '../components/ui/Toast';
import { ThemeProvider } from '../contexts/ThemeContext';
import CommandPalette, { useCommandPalette } from '../components/ui/CommandPalette';
import { useAuth } from '../shared/hooks/useAuth';
import '../index.css';

// Import RM routes
import { RMRoutes } from '../rm/routes';

// Component to handle root route authentication check
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const commandPalette = useCommandPalette();

  return (
    <BrowserRouter>
      <CommandPalette isOpen={commandPalette.isOpen} onClose={commandPalette.close} />
      <Routes>
        {/* Public routes - no auth required */}
        <Route path="/login" element={<Login />} />
        <Route path="/callback" element={<Callback />} />
        
        {/* RM routes - require auth */}
        <Route path="/rm" element={<AuthGuard><RMRoutes /></AuthGuard>} />
        <Route path="/rm/*" element={<AuthGuard><RMRoutes /></AuthGuard>} />
        
        {/* Default route - always redirect to login if not authenticated */}
        <Route 
          path="/" 
          element={
            <RequireAuth>
              <RMRoutes />
            </RequireAuth>
          } 
        />
        
        {/* All other routes - require auth with Layout */}
        <Route
          path="/*"
          element={
            <AuthGuard>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/applications" element={<Applications />} />
                  <Route path="/applications/new" element={<ApplicationNew />} />
                  <Route path="/applications/:id" element={<ApplicationDetail />} />
                  <Route path="/applications/:id/documents" element={<DocumentUpload />} />
                  <Route path="/applications/:id/underwriting" element={<Underwriting />} />
                  <Route path="/applications/:id/sanction" element={<SanctionOffer />} />
                  <Route path="/applications/:id/payments" element={<Payments />} />
                  <Route path="/applications/:id/disbursement" element={<Disbursement />} />
                  <Route path="/kyc" element={<KycUpsert />} />
                </Routes>
              </Layout>
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  );
}
