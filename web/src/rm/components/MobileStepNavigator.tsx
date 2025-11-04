/**
 * Mobile Step Navigator Component
 * Provides mobile-optimized navigation for multi-step application forms
 * 
 * Features:
 * - Collapsible step selector for mobile
 * - Horizontal step indicator for desktop
 * - Visual progress tracking
 * - Seamless navigation between completed steps
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ApplicationStep {
  id: string;
  label: string;
  shortLabel?: string; // For mobile display
  route: (applicationId: string) => string;
  icon?: React.ReactNode;
  description?: string;
}

interface MobileStepNavigatorProps {
  steps: ApplicationStep[];
  currentStepId: string;
  completedStepIds?: Set<string>;
  applicationId: string;
  className?: string;
  onStepChange?: (stepId: string) => void;
}

export default function MobileStepNavigator({
  steps,
  currentStepId,
  completedStepIds = new Set(),
  applicationId,
  className,
  onStepChange,
}: MobileStepNavigatorProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const currentStepIndex = steps.findIndex(step => step.id === currentStepId);

  // Find the highest completed step index
  const highestCompletedIndex = Math.max(
    ...steps
      .map((step, index) => (completedStepIds.has(step.id) ? index : -1))
      .filter(idx => idx >= 0),
    currentStepIndex
  );

  const canNavigateToStep = (stepIndex: number) => {
    // Can navigate to current step or any completed step
    return stepIndex <= highestCompletedIndex + 1;
  };

  const handleStepClick = (step: ApplicationStep, stepIndex: number) => {
    if (!canNavigateToStep(stepIndex)) {
      return;
    }

    if (stepIndex === currentStepIndex) {
      setIsExpanded(false);
      return;
    }

    if (onStepChange) {
      onStepChange(step.id);
    }

    navigate(step.route(applicationId));
    setIsExpanded(false);
  };

  const currentStep = steps[currentStepIndex];
  const progressPercentage = ((highestCompletedIndex + 1) / steps.length) * 100;

  return (
    <div className={cn('w-full', className)}>
      {/* Mobile: Collapsible Step Selector */}
      <div className="md:hidden">
        {/* Compact Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'w-full flex items-center justify-between p-4 rounded-lg',
            'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
            'hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors',
            'touch-manipulation min-h-[56px]'
          )}
          aria-label="Toggle step navigation"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Step Number Indicator */}
            <div
              className={cn(
                'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                'text-sm font-semibold',
                'bg-blue-600 text-white'
              )}
            >
              {currentStepIndex + 1}
            </div>

            {/* Step Info */}
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Step {currentStepIndex + 1} of {steps.length}
              </div>
              <div className="text-base font-semibold text-gray-900 dark:text-white truncate">
                {currentStep?.shortLabel || currentStep?.label}
              </div>
            </div>
          </div>

          {/* Expand/Collapse Icon */}
          <div className="flex-shrink-0 ml-2">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            )}
          </div>
        </button>

        {/* Progress Bar */}
        <div className="mt-2">
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{Math.round(progressPercentage)}% Complete</span>
            <span>{highestCompletedIndex + 1} of {steps.length} steps</span>
          </div>
        </div>

        {/* Expanded Step List */}
        {isExpanded && (
          <div className="mt-3 space-y-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {steps.map((step, index) => {
              const isCompleted = completedStepIds.has(step.id);
              const isCurrent = index === currentStepIndex;
              const isClickable = canNavigateToStep(index);

              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(step, index)}
                  disabled={!isClickable}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 text-left',
                    'transition-colors touch-manipulation min-h-[56px]',
                    'border-b border-gray-100 dark:border-gray-700 last:border-b-0',
                    isCurrent
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : isClickable
                      ? 'hover:bg-gray-50 dark:hover:bg-gray-750 active:bg-gray-100 dark:active:bg-gray-700'
                      : 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {/* Step Indicator */}
                  <div
                    className={cn(
                      'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                      'text-sm font-semibold transition-all',
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>

                  {/* Step Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {step.shortLabel || step.label}
                    </div>
                    {step.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {step.description}
                      </div>
                    )}
                  </div>

                  {/* Navigation Arrow */}
                  {isClickable && !isCurrent && (
                    <ChevronRight className="flex-shrink-0 h-5 w-5 text-gray-400" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop: Horizontal Step Indicator */}
      <div className="hidden md:block">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          {/* Progress Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Application Progress
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({highestCompletedIndex + 1} of {steps.length} steps)
              </span>
            </div>
            <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {Math.round(progressPercentage)}%
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isCompleted = completedStepIds.has(step.id);
              const isCurrent = index === currentStepIndex;
              const isClickable = canNavigateToStep(index);

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    onClick={() => handleStepClick(step, index)}
                    disabled={!isClickable}
                    className={cn(
                      'flex flex-col items-center gap-2 transition-all',
                      isClickable && 'cursor-pointer hover:opacity-80',
                      !isClickable && 'cursor-not-allowed opacity-50'
                    )}
                    title={step.description || step.label}
                  >
                    {/* Step Circle */}
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        'text-sm font-semibold transition-all',
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-blue-600 text-white ring-2 ring-blue-200 dark:ring-blue-800 ring-offset-2'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>

                    {/* Step Label */}
                    <div className="text-center max-w-[100px]">
                      <div
                        className={cn(
                          'text-xs font-medium transition-colors',
                          isCurrent
                            ? 'text-blue-600 dark:text-blue-400'
                            : isCompleted
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-500 dark:text-gray-400'
                        )}
                      >
                        {step.label}
                      </div>
                    </div>
                  </button>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 mx-2 transition-all',
                        isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

