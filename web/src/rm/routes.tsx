/**
 * RM Routes
 * Routes specific to Relationship Managers
 */

import { Routes, Route } from 'react-router-dom';
import { RMayout } from './components/RMLayout';

// Import RM Pages
import RMDashboard from './pages/Dashboard';
import RMApplicationsList from './pages/ApplicationsList';
import RMPersonalInformation from './pages/PersonalInformation';
import RMEmploymentDetails from './pages/EmploymentDetails';
import RMLoanPropertyDetails from './pages/LoanPropertyDetails';
import RMDocumentUpload from './pages/DocumentUpload';
import RMBankVerification from './pages/BankVerification';
import RMCIBILCheck from './pages/CIBILCheck';
import RMApplicationReview from './pages/ApplicationReview';

// Placeholder pages (to be implemented)
const RMApplicationStatus = () => <div>RM Application Status (Coming Soon)</div>;

export function RMRoutes() {
  // Note: AuthGuard is now handled at the App.tsx level
  // This component assumes authentication has already been checked
  return (
    <RMayout>
      <Routes>
        <Route path="/rm" element={<RMDashboard />} />
        <Route path="/" element={<RMDashboard />} />
        <Route path="/applications" element={<RMApplicationsList />} />
        <Route path="/applications/new" element={<RMApplicationsList />} />
        <Route path="/applications/:id/personal" element={<RMPersonalInformation />} />
        <Route path="/applications/:id/employment" element={<RMEmploymentDetails />} />
        <Route path="/applications/:id/loan-property" element={<RMLoanPropertyDetails />} />
        <Route path="/applications/:id/documents" element={<RMDocumentUpload />} />
        <Route path="/applications/:id/bank" element={<RMBankVerification />} />
        <Route path="/applications/:id/cibil" element={<RMCIBILCheck />} />
        <Route path="/applications/:id/review" element={<RMApplicationReview />} />
        <Route path="/applications/:id/status" element={<RMApplicationStatus />} />
      </Routes>
    </RMayout>
  );
}

