/**
 * Password Strength Indicator Component
 * Shows password strength visually for better UX
 */

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
  showStrength?: boolean;
}

export default function PasswordStrength({ password, showStrength = true }: PasswordStrengthProps) {
  const [strength, setStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const [checks, setChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  useEffect(() => {
    if (!password || !showStrength) {
      setStrength(null);
      return;
    }

    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    setChecks(checks);

    const score = Object.values(checks).filter(Boolean).length;
    if (score <= 2) {
      setStrength('weak');
    } else if (score <= 4) {
      setStrength('medium');
    } else {
      setStrength('strong');
    }
  }, [password, showStrength]);

  if (!showStrength || !password) {
    return null;
  }

  const strengthConfig = {
    weak: {
      label: 'Weak',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-500',
      width: '33%',
    },
    medium: {
      label: 'Medium',
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-500',
      width: '66%',
    },
    strong: {
      label: 'Strong',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500',
      width: '100%',
    },
  };

  const config = strength ? strengthConfig[strength] : null;

  return (
    <div className="mt-2 space-y-2">
      {/* Strength Bar */}
      {config && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className={`font-medium ${config.color}`}>Password Strength: {config.label}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full ${config.bgColor} transition-all duration-300 ease-out`}
              style={{ width: config.width }}
            />
          </div>
        </div>
      )}

      {/* Password Requirements */}
      <div className="space-y-1 text-xs">
        {Object.entries(checks).map(([key, passed]) => {
          const labels: Record<string, string> = {
            length: 'At least 8 characters',
            uppercase: 'One uppercase letter',
            lowercase: 'One lowercase letter',
            number: 'One number',
            special: 'One special character',
          };

          return (
            <div key={key} className="flex items-center">
              {passed ? (
                <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400 mr-1.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-3 w-3 text-gray-400 mr-1.5 flex-shrink-0" />
              )}
              <span className={passed ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}>
                {labels[key]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

