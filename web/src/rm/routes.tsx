/**
 * RM Routes
 * Routes specific to Relationship Managers
 */

import React from 'react';
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
  const [checkingAuth, setCheckingAuth] = React.useState(true);
  const [fallbackUser, setFallbackUser] = React.useState<any>(null);
  
  // Check authentication with fallback to localStorage
  React.useEffect(() => {
    const checkAuth = async () => {
      // If user is already loaded, we're good
      if (user) {
        console.log('[RMRoutes] User available from hook:', user);
        setFallbackUser(null); // Clear fallback since we have real user
        setCheckingAuth(false);
        return;
      }
      
      // If still loading, wait a bit more
      if (loading) {
        console.log('[RMRoutes] Still loading, waiting...');
        return;
      }
      
      // If no user from hook, check localStorage directly as fallback
      // This handles the race condition where token is stored but hook hasn't updated yet
      const token = localStorage.getItem('los_token');
      const userStr = localStorage.getItem('los_token_user');
      
      console.log('[RMRoutes] Checking localStorage:', { hasToken: !!token, hasUserStr: !!userStr });
      
      if (token && userStr) {
        // Token exists, try to parse user directly and use it as fallback
        try {
          const parsedUser = JSON.parse(userStr);
          console.log('[RMRoutes] Found user in localStorage, using as fallback:', parsedUser);
          setFallbackUser(parsedUser);
          setCheckingAuth(false);
        } catch (e) {
          console.error('[RMRoutes] Failed to parse user from localStorage:', e);
          setCheckingAuth(false);
        }
      } else if (!token) {
        // No token, definitely not authenticated
        console.log('[RMRoutes] No token found, not authenticated');
        setCheckingAuth(false);
      } else {
        // Token exists but no user string - wait a bit more for it to be stored
        console.log('[RMRoutes] Token exists but no user string yet, waiting...');
        // Give it a small delay to allow login to complete
        setTimeout(() => {
          const retryUserStr = localStorage.getItem('los_token_user');
          if (retryUserStr) {
            try {
              const parsedUser = JSON.parse(retryUserStr);
              console.log('[RMRoutes] Found user on retry:', parsedUser);
              setFallbackUser(parsedUser);
            } catch (e) {
              console.error('[RMRoutes] Failed to parse user on retry:', e);
            }
          }
          setCheckingAuth(false);
        }, 100);
      }
    };
    
    checkAuth();
  }, [user, loading]);
  
  // Show loading state while checking auth
  if (loading || checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Show login if not authenticated (check both hook state and localStorage)
  const hasToken = localStorage.getItem('los_token');
  if (!user && !fallbackUser && !hasToken) {
    return <Login />;
  }
  
  // Use fallback user if hook user is not available yet
  const effectiveUser = user || fallbackUser;
  
  // If we have a token but no user (neither from hook nor fallback), show loading
  if (!effectiveUser && hasToken && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Authenticating...</p>
          <p className="mt-2 text-sm text-gray-500">This may take a moment</p>
        </div>
      </div>
    );
  }
  
  // If we have a token but no user after loading completes, wait a bit more
  // This handles the case where login just completed and user is being stored
  if (!effectiveUser && hasToken && !loading && !checkingAuth) {
    // Check one more time if user was just stored
    const lastCheckUserStr = localStorage.getItem('los_token_user');
    if (lastCheckUserStr) {
      try {
        const lastCheckUser = JSON.parse(lastCheckUserStr);
        console.log('[RMRoutes] Found user on final check, using it:', lastCheckUser);
        // Force a re-render by setting fallback user
        if (!fallbackUser) {
          setFallbackUser(lastCheckUser);
          return (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading user data...</p>
              </div>
            </div>
          );
        }
      } catch (e) {
        console.error('[RMRoutes] Failed to parse user on final check:', e);
      }
    }
    
    // If still no user after all checks, something is wrong
    console.warn('[RMRoutes] Token exists but no user available after all checks, redirecting to login');
    console.warn('[RMRoutes] Debug info:', {
      hasToken: !!hasToken,
      hasUser: !!user,
      hasFallbackUser: !!fallbackUser,
      loading,
      checkingAuth,
      token: hasToken ? 'exists' : 'missing',
      userStr: localStorage.getItem('los_token_user') ? 'exists' : 'missing'
    });
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

