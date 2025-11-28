/**
 * Main App Component
 * Supports persona-based routing for RM, Admin, and Operations
 * Can also run in 'all' mode for full application
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '../components/ui/Toast';
import { ThemeProvider } from '../contexts/ThemeContext';
import CommandPalette, { useCommandPalette } from '../components/ui/CommandPalette';
import '../index.css';

// Import RM routes
import { RMRoutes } from '../rm/routes';
import OpsWorkspace from '../operations/pages/OpsWorkspace';
import AdminWorkspace from '../admin/pages/AdminWorkspace';

function AppContent() {
  const commandPalette = useCommandPalette();

  return (
    <BrowserRouter>
      <CommandPalette isOpen={commandPalette.isOpen} onClose={commandPalette.close} />
      <Routes>
        <Route path="/" element={<RMRoutes />} />
        <Route path="/rm/*" element={<RMRoutes />} />
        <Route path="/ops" element={<OpsWorkspace />} />
        <Route path="/admin" element={<AdminWorkspace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
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
