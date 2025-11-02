/**
 * Main App Component
 * Supports persona-based routing for RM, Admin, and Operations
 * Can also run in 'all' mode for full application
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import '../index.css';

// Import persona-specific routes
import { RMRoutes } from '../rm/routes';
import { config } from '../shared/lib/config';

function AppContent() {
  const commandPalette = useCommandPalette();
  // Get persona from config - default to 'all' if not set
  const persona = (typeof window !== 'undefined' && window.__LOS_CONFIG__?.persona?.persona) 
    || import.meta.env.VITE_PERSONA 
    || 'all';

  // If persona is 'rm', show only RM routes
  if (persona === 'rm') {
    return (
      <BrowserRouter>
        <CommandPalette isOpen={commandPalette.isOpen} onClose={commandPalette.close} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/callback" element={<Callback />} />
          <Route path="/*" element={<RMRoutes />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // If persona is 'admin' or 'operations', show respective routes (when implemented)
  if (persona === 'admin') {
    return (
      <BrowserRouter>
        <CommandPalette isOpen={commandPalette.isOpen} onClose={commandPalette.close} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/callback" element={<Callback />} />
          {/* TODO: Add AdminRoutes when implemented */}
          <Route path="/*" element={<div>Admin routes (coming soon)</div>} />
        </Routes>
      </BrowserRouter>
    );
  }

  if (persona === 'operations') {
    return (
      <BrowserRouter>
        <CommandPalette isOpen={commandPalette.isOpen} onClose={commandPalette.close} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/callback" element={<Callback />} />
          {/* TODO: Add OperationsRoutes when implemented */}
          <Route path="/*" element={<div>Operations routes (coming soon)</div>} />
        </Routes>
      </BrowserRouter>
    );
  }

  // Default: 'all' persona - show all routes with persona prefixes
  return (
    <BrowserRouter>
      <CommandPalette isOpen={commandPalette.isOpen} onClose={commandPalette.close} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/callback" element={<Callback />} />
        <Route
          path="/*"
          element={
            <AuthGuard>
              <Layout>
                <Routes>
                  {/* Existing routes */}
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
                  
                  {/* RM routes (when persona is 'all') */}
                  <Route path="/rm/*" element={<RMRoutes />} />
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
