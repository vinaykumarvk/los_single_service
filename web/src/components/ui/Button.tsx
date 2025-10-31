import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'error';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-secondary-900 disabled:opacity-50 disabled:pointer-events-none active:scale-95';
    const variants = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 hover:shadow-md focus-visible:ring-primary-500',
      secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 dark:bg-secondary-700 dark:hover:bg-secondary-600 hover:shadow-md focus-visible:ring-secondary-500',
      outline: 'border-2 border-secondary-300 dark:border-secondary-700 bg-transparent text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-800 hover:border-secondary-400 dark:hover:border-secondary-600 focus-visible:ring-secondary-500',
      ghost: 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 hover:text-secondary-900 dark:hover:text-secondary-100 focus-visible:ring-secondary-500',
      success: 'bg-success-600 text-white hover:bg-success-700 dark:bg-success-500 dark:hover:bg-success-600 hover:shadow-md focus-visible:ring-success-500',
      error: 'bg-error-600 text-white hover:bg-error-700 dark:bg-error-500 dark:hover:bg-error-600 hover:shadow-md focus-visible:ring-error-500',
    };
    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };
    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export default Button;
