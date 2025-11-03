/**
 * RM Layout Component - Enhanced Mobile-First Design
 * Layout specific to Relationship Managers
 */

import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import { Menu, X, LogOut, User, Home, FileText, Plus } from 'lucide-react';
import Button from '../../components/ui/Button';
import ThemeToggle from '../../components/ThemeToggle';
import BottomNav from '../../components/ui/BottomNav';

interface RMayoutProps {
  children: ReactNode;
}

export function RMayout({ children }: RMayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine base path based on persona mode
  const isPersonaMode = !location.pathname.startsWith('/rm');
  const basePath = isPersonaMode ? '' : '/rm';
  
  const navItems = [
    { path: `${basePath}/`, label: 'Dashboard', icon: '📊' },
    { path: `${basePath}/applications`, label: 'Applications', icon: '📋' },
    { path: `${basePath}/applications/new`, label: 'New Application', icon: '➕' },
  ];

  const isActive = (path: string) => {
    const normalizedPath = path.replace(/\/$/, '') || '/';
    const normalizedCurrentPath = location.pathname.replace(/\/$/, '') || '/';
    return normalizedCurrentPath === normalizedPath || 
      (normalizedPath !== '/' && normalizedCurrentPath.startsWith(normalizedPath));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Logo/Brand */}
              <div className="flex-shrink-0 flex items-center">
                <Link 
                  to={`${basePath}/`} 
                  className="flex items-center gap-2 group"
                >
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                    <span className="text-white font-bold text-lg">RM</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">
                    RM Portal
                  </span>
                </Link>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      touch-manipulation min-h-[44px]
                      ${
                        isActive(item.path)
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                      }
                    `}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* User Menu & Mobile Menu Button */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Theme Toggle */}
              <ThemeToggle />
              
              {/* User Info - Desktop */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                  <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {user?.username || 'RM'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logout()}
                  className="touch-manipulation min-h-[44px]"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="hidden lg:inline">Logout</span>
                </Button>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden inline-flex items-center justify-center p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation min-h-[44px] min-w-[44px]"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    block px-3 py-3 rounded-lg text-base font-medium transition-colors
                    touch-manipulation min-h-[44px] flex items-center
                    ${
                      isActive(item.path)
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
              
              {/* Mobile User Info */}
              <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="px-3 py-2 mb-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{user?.username || 'RM'}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center px-3 py-3 rounded-lg text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors touch-manipulation min-h-[44px]"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-20 md:pb-6 sm:pb-8">
        {children}
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <BottomNav 
        basePath={basePath}
        items={[
          { path: `${basePath}/`, label: 'Dashboard', icon: Home },
          { path: `${basePath}/applications`, label: 'Applications', icon: FileText },
          { path: `${basePath}/applications/new`, label: 'New', icon: Plus },
          { path: `${basePath}/profile`, label: 'Profile', icon: User },
        ]}
      />
    </div>
  );
}
