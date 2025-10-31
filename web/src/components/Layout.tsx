import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, User, Plus, Sparkles, Menu, X } from 'lucide-react';
import { useState } from 'react';
import UserMenu from './UserMenu';
import ThemeToggle from './ThemeToggle';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/applications', label: 'Applications', icon: FileText },
    { path: '/applications/new', label: 'New Application', icon: Plus },
    { path: '/kyc', label: 'KYC', icon: User },
  ];

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-950 transition-colors duration-200">
      <nav className="bg-white dark:bg-secondary-900 border-b border-secondary-200 dark:border-secondary-800 shadow-sm sticky top-0 z-50 backdrop-blur-sm bg-white/95 dark:bg-secondary-900/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="flex items-center gap-2 group">
                  <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-secondary-900 dark:text-secondary-100 tracking-tight">LOS</h1>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400 -mt-0.5">Loan Origination</p>
                  </div>
                </Link>
              </div>
              
              {/* Desktop Navigation */}
              <div className="hidden md:ml-8 md:flex md:space-x-1 md:items-center">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 shadow-sm'
                          : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 hover:text-secondary-900 dark:hover:text-secondary-200'
                      }`}
                    >
                      <Icon className={`mr-2 h-4 w-4 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-secondary-500 dark:text-secondary-400'}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Search Button - hidden on mobile */}
              <button
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-sm text-secondary-600 dark:text-secondary-400 bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 rounded-lg transition-colors"
                onClick={() => {
                  const event = new KeyboardEvent('keydown', {
                    key: 'k',
                    metaKey: true,
                    bubbles: true,
                  });
                  window.dispatchEvent(event);
                }}
              >
                <span>Search</span>
                <kbd className="px-1.5 py-0.5 text-xs bg-white dark:bg-secondary-900 border border-secondary-300 dark:border-secondary-600 rounded">
                  ⌘K
                </kbd>
              </button>
              
              <ThemeToggle />
              
              <div className="hidden sm:block">
                <UserMenu />
              </div>
              
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <X className="block h-6 w-6" />
                ) : (
                  <Menu className="block h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-secondary-200 dark:border-secondary-800 bg-white dark:bg-secondary-900">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-3 rounded-lg text-base font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                        : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 hover:text-secondary-900 dark:hover:text-secondary-200'
                    }`}
                  >
                    <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-secondary-500 dark:text-secondary-400'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
            
            <div className="pt-4 pb-3 border-t border-secondary-200 dark:border-secondary-800 px-4 sm:hidden">
              <UserMenu />
            </div>
          </div>
        )}
      </nav>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {children}
      </main>
    </div>
  );
}
