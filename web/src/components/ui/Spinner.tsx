import { cn } from '../../lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-[3px]',
    xl: 'h-16 w-16 border-4',
  };

  return (
    <div
      className={cn(
        'inline-block animate-spin rounded-full border-primary-600 border-t-transparent',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function SpinnerOverlay({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/20 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl p-8 flex flex-col items-center gap-4">
        <Spinner size="lg" />
        {message && (
          <p className="text-secondary-700 font-medium">{message}</p>
        )}
      </div>
    </div>
  );
}
