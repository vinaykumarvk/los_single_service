/**
 * Swipeable Item Component
 * Enables swipe actions on mobile devices (e.g., swipe to delete, swipe to edit)
 */

import { ReactNode, useRef, useState, useEffect } from 'react';
import { Trash2, Edit, MoreVertical, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SwipeAction {
  label: string;
  icon?: ReactNode;
  color?: 'danger' | 'primary' | 'success' | 'warning';
  action: () => void;
}

interface SwipeableItemProps {
  children: ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // Distance in pixels to trigger action
  disabled?: boolean;
  className?: string;
}

export default function SwipeableItem({
  children,
  leftActions = [],
  rightActions = [],
  onSwipeLeft,
  onSwipeRight,
  threshold = 80,
  disabled = false,
  className,
}: SwipeableItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [showActions, setShowActions] = useState<'left' | 'right' | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled) return;

    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      setStartX(e.touches[0].clientX);
      setIsDragging(true);
      setCurrentX(e.touches[0].clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      
      const deltaX = e.touches[0].clientX - startX;
      setCurrentX(e.touches[0].clientX);
      
      // Determine swipe direction and limit
      if (deltaX > 0 && leftActions.length > 0) {
        // Swiping right (showing left actions)
        setTranslateX(Math.min(deltaX, leftActions.length * 80));
        setShowActions('left');
      } else if (deltaX < 0 && rightActions.length > 0) {
        // Swiping left (showing right actions)
        setTranslateX(Math.max(deltaX, -rightActions.length * 80));
        setShowActions('right');
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging) return;
      
      const deltaX = currentX - startX;
      
      // Snap to position based on threshold
      if (Math.abs(deltaX) >= threshold) {
        if (deltaX > 0 && leftActions.length > 0) {
          setTranslateX(leftActions.length * 80);
          setShowActions('left');
          onSwipeRight?.();
        } else if (deltaX < 0 && rightActions.length > 0) {
          setTranslateX(-rightActions.length * 80);
          setShowActions('right');
          onSwipeLeft?.();
        }
      } else {
        // Snap back
        setTranslateX(0);
        setShowActions(null);
      }
      
      setIsDragging(false);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isDragging, startX, currentX, threshold, leftActions.length, rightActions.length, disabled, onSwipeLeft, onSwipeRight]);

  const closeActions = () => {
    setTranslateX(0);
    setShowActions(null);
  };

  const getActionColor = (color?: string) => {
    switch (color) {
      case 'danger':
        return 'bg-red-500 hover:bg-red-600';
      case 'success':
        return 'bg-green-500 hover:bg-green-600';
      case 'warning':
        return 'bg-yellow-500 hover:bg-yellow-600';
      default:
        return 'bg-blue-500 hover:bg-blue-600';
    }
  };

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Left Actions */}
      {leftActions.length > 0 && (
        <div className="absolute left-0 top-0 bottom-0 flex items-center bg-gray-100 dark:bg-gray-800">
          {leftActions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.action();
                closeActions();
              }}
              className={cn(
                'flex items-center justify-center h-full px-4 text-white transition-colors touch-manipulation min-w-[80px]',
                getActionColor(action.color)
              )}
              aria-label={action.label}
            >
              {action.icon || <Edit className="h-5 w-5" />}
            </button>
          ))}
        </div>
      )}

      {/* Right Actions */}
      {rightActions.length > 0 && (
        <div className="absolute right-0 top-0 bottom-0 flex items-center bg-gray-100 dark:bg-gray-800">
          {rightActions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.action();
                closeActions();
              }}
              className={cn(
                'flex items-center justify-center h-full px-4 text-white transition-colors touch-manipulation min-w-[80px]',
                getActionColor(action.color)
              )}
              aria-label={action.label}
            >
              {action.icon || <Trash2 className="h-5 w-5" />}
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div
        ref={itemRef}
        className={cn(
          'relative bg-white dark:bg-gray-800 transition-transform duration-200 ease-out',
          isDragging && 'transition-none',
          className
        )}
        style={{
          transform: `translateX(${translateX}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

