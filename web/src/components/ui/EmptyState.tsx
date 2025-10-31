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
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <div className="rounded-full bg-secondary-100 p-6 mb-6">
        {IconComponent ? (
          <IconComponent className="h-12 w-12 text-secondary-400" />
        ) : (
          icon
        )}
      </div>
      <h3 className="text-xl font-semibold text-secondary-900 mb-2">{title}</h3>
      {description && (
        <p className="text-secondary-600 max-w-md mb-8">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="flex gap-3">
          {action && (
            <Button onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
