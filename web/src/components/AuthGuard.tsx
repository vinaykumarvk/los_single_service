import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getUser, login } from '../lib/auth';
import { User } from 'oidc-client-ts';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUser()
      .then((u) => {
        setUser(u);
        if (!u) {
          // Auto-redirect to login if not authenticated (optional - remove if you want manual login)
          // login();
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Uncomment to require authentication
  // if (!user) {
  //   return <Navigate to="/login" replace />;
  // }

  return <>{children}</>;
}

