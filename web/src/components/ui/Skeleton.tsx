import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export default function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  lines = 1,
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-secondary-200 via-secondary-100 to-secondary-200 bg-[length:200%_100%]';

  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  };

  if (lines > 1) {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(baseClasses, variantClasses[variant])}
            style={{
              ...style,
              width: i === lines - 1 ? '80%' : style.width || '100%',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={style}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-secondary-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="text" width={120} />
        <Skeleton variant="circular" width={40} height={40} />
      </div>
      <Skeleton variant="text" width={80} height={32} className="mb-2" />
      <Skeleton variant="text" width={150} />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border border-secondary-200 overflow-hidden">
      <div className="p-4 border-b border-secondary-200">
        <Skeleton variant="text" width={200} height={24} />
      </div>
      <div className="divide-y divide-secondary-200">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" />
            </div>
            <Skeleton variant="rectangular" width={100} height={32} />
          </div>
        ))}
      </div>
    </div>
  );
}
