import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full transition-colors';
    
    const variants = {
      default: 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 border border-secondary-200 dark:border-secondary-700',
      primary: 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800',
      success: 'bg-success-100 dark:bg-success-900/40 text-success-700 dark:text-success-400 border border-success-200 dark:border-success-800',
      warning: 'bg-warning-100 dark:bg-warning-900/40 text-warning-700 dark:text-warning-400 border border-warning-200 dark:border-warning-800',
      error: 'bg-error-100 dark:bg-error-900/40 text-error-700 dark:text-error-400 border border-error-200 dark:border-error-800',
      secondary: 'bg-secondary-200 dark:bg-secondary-700 text-secondary-800 dark:text-secondary-200 border border-secondary-300 dark:border-secondary-600',
    };
    
    const sizes = {
      sm: 'text-xs px-2 py-0.5',
      md: 'text-sm px-2.5 py-0.5',
      lg: 'text-base px-3 py-1',
    };

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

export default Badge;
