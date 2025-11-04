/**
 * RM Routes
 * Routes specific to Relationship Managers
 */

import { Routes, Route } from 'react-router-dom';
import { RMayout } from './components/RMLayout';

// Import RM Pages
import RMDashboard from './pages/Dashboard';
import RMApplicationsList from './pages/ApplicationsList';
import NewApplication from './pages/NewApplication';
import NewApplicationSimple from './pages/NewApplicationSimple';
import NewApplicationFixed from './pages/NewApplicationFixed';
import RMPersonalInformation from './pages/PersonalInformation';
import RMEmploymentDetails from './pages/EmploymentDetails';
import RMLoanPropertyDetails from './pages/LoanPropertyDetails';
import RMDocumentUpload from './pages/DocumentUpload';
import RMBankVerification from './pages/BankVerification';
import RMCIBILCheck from './pages/CIBILCheck';
import RMApplicationReview from './pages/ApplicationReview';
import ApplicationWizard from './pages/ApplicationWizard';

// Placeholder pages (to be implemented)
const RMApplicationStatus = () => <div>RM Application Status (Coming Soon)</div>;

export function RMRoutes() {
  // Simplified routing - using relative paths (parent route is /rm/*)
  // When path is /rm/applications/new, child route "applications/new" matches
  return (
    <RMayout>
      <Routes>
        {/* Dashboard - root of /rm */}
        <Route path="" element={<RMDashboard />} />
        
        {/* New Application - must come before /applications/:id routes */}
        <Route path="applications/new" element={<NewApplicationFixed />} />
        
        {/* Application Wizard - simplified multi-step flow */}
        <Route path="applications/:id/wizard" element={<ApplicationWizard />} />
        
        {/* Legacy Application detail routes (for backward compatibility) */}
        <Route path="applications/:id/personal" element={<RMPersonalInformation />} />
        <Route path="applications/:id/employment" element={<RMEmploymentDetails />} />
        <Route path="applications/:id/loan-property" element={<RMLoanPropertyDetails />} />
        <Route path="applications/:id/documents" element={<RMDocumentUpload />} />
        <Route path="applications/:id/bank" element={<RMBankVerification />} />
        <Route path="applications/:id/cibil" element={<RMCIBILCheck />} />
        <Route path="applications/:id/review" element={<RMApplicationReview />} />
        <Route path="applications/:id/status" element={<RMApplicationStatus />} />
        
        {/* Applications list - comes after all specific routes */}
        <Route path="applications" element={<RMApplicationsList />} />
      </Routes>
    </RMayout>
  );
}

