/**
 * RM Layout Component
 * Layout specific to Relationship Managers
 */

import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';

interface RMayoutProps {
  children: ReactNode;
}

export function RMayout({ children }: RMayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();

  // Determine base path based on persona mode
  const isPersonaMode = !location.pathname.startsWith('/rm');
  const basePath = isPersonaMode ? '' : '/rm';
  
  const navItems = [
    { path: `${basePath}/`, label: 'Dashboard', icon: '📊' },
    { path: `${basePath}/applications`, label: 'Applications', icon: '📋' },
    { path: `${basePath}/applications/new`, label: 'New Application', icon: '➕' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-blue-600">RM Portal</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navItems.map((item) => {
                  const normalizedItemPath = item.path.replace(/\/$/, '') || '/';
                  const normalizedCurrentPath = location.pathname.replace(/\/$/, '') || '/';
                  const isActive = normalizedCurrentPath === normalizedItemPath || 
                    (normalizedItemPath !== '/' && normalizedCurrentPath.startsWith(normalizedItemPath));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`${
                        isActive
                          ? 'border-blue-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                    >
                      <span className="mr-2">{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">{user?.username}</span>
              <button
                onClick={() => logout()}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

