/**
 * Floating Label Input Component
 * Modern input with floating label for better mobile UX
 */

import { InputHTMLAttributes, useState, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface FloatingLabelInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  showStrength?: boolean;
}

const FloatingLabelInput = forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ label, icon, error, className, value, onFocus, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = value && value.toString().length > 0;

    return (
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none z-10">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          {...props}
          value={value}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          className={cn(
            'block w-full h-12 sm:h-11',
            icon ? 'pl-10 sm:pl-11' : 'pl-3 sm:pl-4',
            'pr-3 sm:pr-4',
            'text-base sm:text-sm',
            'border rounded-lg',
            'bg-white dark:bg-gray-700',
            'text-gray-900 dark:text-white',
            'placeholder-transparent',
            'transition-all duration-200',
            'touch-manipulation',
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className
          )}
          placeholder={label}
        />
        <label
          className={cn(
            'absolute left-3 sm:left-4 transition-all duration-200 pointer-events-none',
            icon && 'left-10 sm:left-11',
            isFocused || hasValue
              ? 'top-1 text-xs text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 px-1'
              : 'top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400',
            error && isFocused && 'text-red-600 dark:text-red-400'
          )}
        >
          {label}
        </label>
      </div>
    );
  }
);

FloatingLabelInput.displayName = 'FloatingLabelInput';

export default FloatingLabelInput;

