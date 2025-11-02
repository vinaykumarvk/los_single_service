/**
 * AuthGuard Component - Updated to support new auth system
 * Maintains backward compatibility with old Keycloak auth
 */

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../shared/hooks/useAuth';
import { config } from '../shared/lib/config';
import Spinner from './ui/Spinner';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, loading, user } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Give auth hook time to check authentication
    if (!loading) {
      setChecking(false);
    }
  }, [loading, isAuthenticated]);

  if (checking || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Optional: Uncomment to require authentication
  // For now, allow unauthenticated access (demo mode)
  // if (!isAuthenticated) {
  //   return <Navigate to="/login" replace />;
  // }

  return <>{children}</>;
}
