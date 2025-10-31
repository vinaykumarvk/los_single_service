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

function AppContent() {
  const commandPalette = useCommandPalette();

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
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/applications" element={<Applications />} />
                  <Route path="/applications/new" element={<ApplicationNew />} />
                  <Route path="/applications/:id" element={<ApplicationDetail />} />
                  <Route path="/applications/:applicationId/documents" element={<DocumentUpload />} />
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
