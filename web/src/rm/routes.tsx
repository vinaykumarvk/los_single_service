/**
 * RM Routes
 * Routes specific to Relationship Managers
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { RMayout } from './components/RMLayout';
import { useAuth } from '../shared/hooks/useAuth';
import Login from '../pages/Login';

// Import RM Pages
import RMDashboard from './pages/Dashboard';
import RMApplicationsList from './pages/ApplicationsList';
import NewApplication from './pages/NewApplication';
import RMPersonalInformation from './pages/PersonalInformation';
import RMEmploymentDetails from './pages/EmploymentDetails';
import RMLoanPropertyDetails from './pages/LoanPropertyDetails';
import RMDocumentUpload from './pages/DocumentUpload';
import RMBankVerification from './pages/BankVerification';
import RMCIBILCheck from './pages/CIBILCheck';
import RMApplicationReview from './pages/ApplicationReview';
import ApplicationStatus from './pages/ApplicationStatus';
import ApplicationDetail from './pages/ApplicationDetail';

export function RMRoutes() {
  const { user, loading } = useAuth();
  
  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Show login if not authenticated
  if (!user) {
    return <Login />;
  }
  // User is authenticated - show RM routes
  return (
    <RMayout>
      <Routes>
        {/* Login route */}
        <Route path="login" element={<Login />} />
        
        {/* Dashboard - root of /rm */}
        <Route path="" element={<RMDashboard />} />
        
        {/* New Application - must come before /applications/:id routes */}
        <Route path="applications/new" element={<NewApplication />} />
        
        {/* Application detail/view page - must come before other /applications/:id routes */}
        <Route path="applications/:id" element={<ApplicationDetail />} />
        
        {/* Legacy Application detail routes (for backward compatibility) */}
        <Route path="applications/:id/personal" element={<RMPersonalInformation />} />
        <Route path="applications/:id/employment" element={<RMEmploymentDetails />} />
        <Route path="applications/:id/loan-property" element={<RMLoanPropertyDetails />} />
        <Route path="applications/:id/documents" element={<RMDocumentUpload />} />
        <Route path="applications/:id/bank" element={<RMBankVerification />} />
        <Route path="applications/:id/cibil" element={<RMCIBILCheck />} />
        <Route path="applications/:id/review" element={<RMApplicationReview />} />
        <Route path="applications/:id/status" element={<ApplicationStatus />} />
        
        {/* Applications list - comes after all specific routes */}
        <Route path="applications" element={<RMApplicationsList />} />
      </Routes>
    </RMayout>
  );
}

