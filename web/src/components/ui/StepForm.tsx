import { ReactNode, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from './Button';

export interface Step {
  id: string;
  label: string;
  description?: string;
  component: ReactNode;
  validate?: () => boolean | Promise<boolean>;
}

interface StepFormProps {
  steps: Step[];
  onComplete: () => void;
  onCancel?: () => void;
  className?: string;
}

export default function StepForm({
  steps,
  onComplete,
  onCancel,
  className,
}: StepFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isValidating, setIsValidating] = useState(false);

  const handleNext = async () => {
    const step = steps[currentStep];
    
    if (step.validate) {
      setIsValidating(true);
      try {
        const isValid = await step.validate();
        if (!isValid) {
          setIsValidating(false);
          return;
        }
      } catch (error) {
        setIsValidating(false);
        return;
      }
      setIsValidating(false);
    }

    setCompletedSteps(prev => new Set([...prev, currentStep]));

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (index: number) => {
    if (index < currentStep || completedSteps.has(index)) {
      setCurrentStep(index);
    }
  };

  return (
    <div className={cn('space-y-8', className)}>
      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(index);
          const isCurrent = index === currentStep;
          const isClickable = index < currentStep || isCompleted;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <button
                onClick={() => isClickable && handleStepClick(index)}
                disabled={!isClickable}
                className={cn(
                  'flex flex-col items-center gap-2 transition-all',
                  isClickable && 'cursor-pointer'
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all',
                      isCompleted
                        ? 'bg-success-500 text-white'
                        : isCurrent
                        ? 'bg-primary-600 text-white'
                        : 'bg-secondary-200 text-secondary-600'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 transition-all',
                        isCompleted ? 'bg-success-500' : 'bg-secondary-200'
                      )}
                    />
                  )}
                </div>
                <div className="text-center">
                  <div
                    className={cn(
                      'text-sm font-medium transition-colors',
                      isCurrent
                        ? 'text-primary-700'
                        : isCompleted
                        ? 'text-success-700'
                        : 'text-secondary-500'
                    )}
                  >
                    {step.label}
                  </div>
                  {step.description && (
                    <div className="text-xs text-secondary-500 mt-0.5 hidden sm:block">
                      {step.description}
                    </div>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Current Step Content */}
      <div className="animate-fade-in">
        {steps[currentStep].component}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-secondary-200">
        <div>
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isValidating}
            >
              Back
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          {onCancel && (
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={isValidating}
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={isValidating}
          >
            {isValidating
              ? 'Validating...'
              : currentStep === steps.length - 1
              ? 'Complete'
              : 'Next'}
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="pt-4">
        <div className="flex items-center justify-between text-sm text-secondary-600 mb-2">
          <span>
            Step {currentStep + 1} of {steps.length}
          </span>
          <span>{Math.round(((currentStep + 1) / steps.length) * 100)}% Complete</span>
        </div>
        <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
