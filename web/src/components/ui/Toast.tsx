import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-md w-full px-4 sm:px-0 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const styles = {
    success: 'bg-success-50 dark:bg-success-900/40 border-success-200 dark:border-success-800 text-success-900 dark:text-success-100',
    error: 'bg-error-50 dark:bg-error-900/40 border-error-200 dark:border-error-800 text-error-900 dark:text-error-100',
    warning: 'bg-warning-50 dark:bg-warning-900/40 border-warning-200 dark:border-warning-800 text-warning-900 dark:text-warning-100',
    info: 'bg-primary-50 dark:bg-primary-900/40 border-primary-200 dark:border-primary-800 text-primary-900 dark:text-primary-100',
  };

  const iconStyles = {
    success: 'text-success-600 dark:text-success-400',
    error: 'text-error-600 dark:text-error-400',
    warning: 'text-warning-600 dark:text-warning-400',
    info: 'text-primary-600 dark:text-primary-400',
  };

  const Icon = icons[toast.type];

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm animate-slide-in-right',
        styles[toast.type]
      )}
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', iconStyles[toast.type])} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{toast.message}</p>
        {toast.description && (
          <p className="text-sm opacity-90 mt-1">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function toast(options: Omit<Toast, 'id'>) {
  const event = new CustomEvent('toast', { detail: options });
  window.dispatchEvent(event);
}

toast.success = (message: string, description?: string) =>
  toast({ type: 'success', message, description });

toast.error = (message: string, description?: string) =>
  toast({ type: 'error', message, description });

toast.warning = (message: string, description?: string) =>
  toast({ type: 'warning', message, description });

toast.info = (message: string, description?: string) =>
  toast({ type: 'info', message, description });
