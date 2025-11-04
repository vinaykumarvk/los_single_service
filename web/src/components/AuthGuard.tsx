/**
 * AuthGuard Component - Updated to support new auth system
 * Maintains backward compatibility with old Keycloak auth
 * 
 * CRITICAL: This component uses the auth-stability module to prevent regressions
 */

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../shared/hooks/useAuth';
import { validateAuth, clearAuthData } from '../shared/lib/auth/auth-stability';
import Spinner from './ui/Spinner';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, loading, user } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    // Double-check authentication using stability module
    const verifyAuth = async () => {
      if (!loading) {
        try {
          // Use stability module for validation
          const valid = await validateAuth();
          setIsValid(valid);
        } catch (error) {
          console.error('[AuthGuard] Auth validation error:', error);
          setIsValid(false);
        } finally {
          setChecking(false);
          setHasChecked(true);
        }
      }
    };

    verifyAuth();
  }, [loading, isAuthenticated]);

  // If still loading or checking, show spinner
  if (checking || loading || !hasChecked || isValid === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Require authentication - be STRICT about this
  // Check both hook state AND validation result
  if (!isAuthenticated || !user || !isValid) {
    // Clear any stale data using stability module
    clearAuthData().catch(console.error);
    
    // Only redirect if we're not already on login page to avoid redirect loops
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      return <Navigate to="/login" replace />;
    }
    return null;
  }

  return <>{children}</>;
}
