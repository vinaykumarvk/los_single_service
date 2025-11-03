/**
 * Bottom Navigation Bar - Mobile-First Design
 * Provides primary navigation for mobile devices
 * Only visible on mobile screens (< 768px)
 */

import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Plus, User, Settings, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface BottomNavProps {
  items?: NavItem[];
  basePath?: string;
}

export default function BottomNav({ items, basePath = '' }: BottomNavProps) {
  const location = useLocation();
  
  const defaultItems: NavItem[] = [
    { path: `${basePath}/`, label: 'Dashboard', icon: Home },
    { path: `${basePath}/applications`, label: 'Applications', icon: FileText },
    { path: `${basePath}/applications/new`, label: 'New', icon: Plus },
    { path: `${basePath}/profile`, label: 'Profile', icon: User },
  ];

  const navItems = items || defaultItems;

  const isActive = (path: string) => {
    const normalizedPath = path.replace(/\/$/, '') || '/';
    const normalizedCurrentPath = location.pathname.replace(/\/$/, '') || '/';
    return normalizedCurrentPath === normalizedPath || 
      (normalizedPath !== '/' && normalizedCurrentPath.startsWith(normalizedPath));
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full',
                'transition-all duration-200 touch-manipulation',
                'active:bg-gray-100 dark:active:bg-gray-800',
                active 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 dark:text-gray-400'
              )}
              aria-label={item.label}
            >
              <div className="relative">
                <Icon className={cn(
                  'h-6 w-6 transition-transform duration-200',
                  active && 'scale-110'
                )} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center h-4 w-4 bg-red-500 text-white text-xs font-bold rounded-full">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-xs mt-1 font-medium transition-all duration-200',
                active ? 'scale-105' : 'scale-100'
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

