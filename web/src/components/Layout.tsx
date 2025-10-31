import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, User, Plus, Sparkles } from 'lucide-react';
import UserMenu from './UserMenu';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/applications', label: 'Applications', icon: FileText },
    { path: '/applications/new', label: 'New Application', icon: Plus },
    { path: '/kyc', label: 'KYC', icon: User },
  ];

  return (
    <div className="min-h-screen bg-secondary-50">
      <nav className="bg-white border-b border-secondary-200 shadow-sm sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="flex items-center gap-2 group">
                  <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-secondary-900 tracking-tight">LOS</h1>
                    <p className="text-xs text-secondary-500 -mt-0.5">Loan Origination</p>
                  </div>
                </Link>
              </div>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-1 sm:items-center">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-50 text-primary-700 shadow-sm'
                          : 'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900'
                      }`}
                    >
                      <Icon className={`mr-2 h-4 w-4 ${isActive ? 'text-primary-600' : 'text-secondary-500'}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-secondary-600 bg-secondary-100 hover:bg-secondary-200 rounded-lg transition-colors"
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
                <kbd className="px-1.5 py-0.5 text-xs bg-white border border-secondary-300 rounded">
                  ⌘K
                </kbd>
              </button>
              <UserMenu />
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

