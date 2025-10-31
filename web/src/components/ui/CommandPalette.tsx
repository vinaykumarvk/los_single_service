import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Home, User, Plus, Clock, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action: () => void;
  category?: string;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: Command[] = [
    {
      id: 'home',
      label: 'Go to Dashboard',
      description: 'View dashboard overview',
      icon: Home,
      action: () => navigate('/'),
      category: 'Navigation',
      keywords: ['dashboard', 'home', 'overview'],
    },
    {
      id: 'applications',
      label: 'View Applications',
      description: 'Browse all loan applications',
      icon: FileText,
      action: () => navigate('/applications'),
      category: 'Navigation',
      keywords: ['applications', 'loans', 'list'],
    },
    {
      id: 'new-application',
      label: 'New Application',
      description: 'Create a new loan application',
      icon: Plus,
      action: () => navigate('/applications/new'),
      category: 'Actions',
      keywords: ['new', 'create', 'application', 'loan'],
    },
    {
      id: 'kyc',
      label: 'KYC Management',
      description: 'Manage customer verification',
      icon: User,
      action: () => navigate('/kyc'),
      category: 'Navigation',
      keywords: ['kyc', 'verification', 'customer'],
    },
  ];

  const filteredCommands = search
    ? commands.filter(cmd => {
        const searchLower = search.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(searchLower) ||
          cmd.description?.toLowerCase().includes(searchLower) ||
          cmd.keywords?.some(kw => kw.includes(searchLower))
        );
      })
    : commands;

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    const category = cmd.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filteredCommands[selectedIndex];
        if (cmd) {
          cmd.action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let globalIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[20vh] px-4">
      <div
        className="absolute inset-0 bg-secondary-900/50 dark:bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-white dark:bg-secondary-900 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-secondary-200 dark:border-secondary-800">
          <Search className="h-5 w-5 text-secondary-400 dark:text-secondary-500" />
          <input
            type="text"
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-secondary-900 dark:text-secondary-100 placeholder-secondary-400 dark:placeholder-secondary-500"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-secondary-500 dark:text-secondary-400 bg-secondary-100 dark:bg-secondary-800 rounded">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>

        <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-12 text-center text-secondary-500 dark:text-secondary-400">
              No commands found
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(groupedCommands).map(([category, cmds]) => (
                <Fragment key={category}>
                  <div className="px-4 py-2 text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                    {category}
                  </div>
                  {cmds.map(cmd => {
                    const currentIndex = globalIndex++;
                    const Icon = cmd.icon;
                    
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => {
                          cmd.action();
                          onClose();
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                          currentIndex === selectedIndex
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-900 dark:text-primary-100'
                            : 'hover:bg-secondary-50 dark:hover:bg-secondary-800 text-secondary-900 dark:text-secondary-100'
                        )}
                      >
                        {Icon && (
                          <div className={cn(
                            'p-2 rounded-lg',
                            currentIndex === selectedIndex
                              ? 'bg-primary-100 dark:bg-primary-800/50 text-primary-600 dark:text-primary-400'
                              : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400'
                          )}>
                            <Icon className="h-4 w-4" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{cmd.label}</div>
                          {cmd.description && (
                            <div className="text-sm text-secondary-500 dark:text-secondary-400 truncate">
                              {cmd.description}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-secondary-200 dark:border-secondary-800 bg-secondary-50 dark:bg-secondary-800/50 text-xs text-secondary-500 dark:text-secondary-400 flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-secondary-900 border border-secondary-300 dark:border-secondary-700 rounded">↑</kbd>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-secondary-900 border border-secondary-300 dark:border-secondary-700 rounded">↓</kbd>
            <span className="hidden sm:inline">Navigate</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-secondary-900 border border-secondary-300 dark:border-secondary-700 rounded">↵</kbd>
            <span className="hidden sm:inline">Select</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-secondary-900 border border-secondary-300 dark:border-secondary-700 rounded">Esc</kbd>
            <span className="hidden sm:inline">Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
  };
}
