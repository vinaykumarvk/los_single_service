import { ReactNode } from 'react';
import { FileText, Search, AlertCircle, CheckCircle } from 'lucide-react';
import Button from './Button';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon?: 'file' | 'search' | 'alert' | 'check' | ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function EmptyState({
  icon = 'file',
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const iconComponents: Record<string, typeof FileText> = {
    file: FileText,
    search: Search,
    alert: AlertCircle,
    check: CheckCircle,
  };

  const IconComponent = typeof icon === 'string' ? iconComponents[icon as string] : null;

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center', className)}>
      <div className="rounded-full bg-secondary-100 dark:bg-secondary-800 p-5 sm:p-6 mb-6">
        {IconComponent ? (
          <IconComponent className="h-10 w-10 sm:h-12 sm:w-12 text-secondary-400 dark:text-secondary-500" />
        ) : (
          icon
        )}
      </div>
      <h3 className="text-lg sm:text-xl font-semibold text-secondary-900 dark:text-secondary-100 mb-2">{title}</h3>
      {description && (
        <p className="text-sm sm:text-base text-secondary-600 dark:text-secondary-400 max-w-md mb-6 sm:mb-8">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          {action && (
            <Button onClick={action.onClick} className="w-full sm:w-auto">
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick} className="w-full sm:w-auto">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
