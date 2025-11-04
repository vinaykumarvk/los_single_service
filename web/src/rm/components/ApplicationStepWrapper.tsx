/**
 * Application Step Wrapper Component
 * Wraps application step pages with mobile step navigation
 * 
 * Usage:
 * <ApplicationStepWrapper>
 *   <YourStepComponent />
 * </ApplicationStepWrapper>
 */

import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import MobileStepNavigator from './MobileStepNavigator';
import { useApplicationSteps } from '../hooks/useApplicationSteps';
import { useStepCompletion } from '../hooks/useStepCompletion';

interface ApplicationStepWrapperProps {
  children: ReactNode;
  className?: string;
}

export default function ApplicationStepWrapper({
  children,
  className,
}: ApplicationStepWrapperProps) {
  const location = useLocation();
  const { steps, applicationId, getCurrentStepId } = useApplicationSteps();
  const { completedStepIds, loading: completionLoading } = useStepCompletion();

  const currentStepId = getCurrentStepId(location.pathname);

  if (!currentStepId || !applicationId) {
    // Not an application step page, render children without wrapper
    return <>{children}</>;
  }

  return (
    <div className={className}>
      {/* Step Navigator */}
      <div className="mb-6">
        <MobileStepNavigator
          steps={steps}
          currentStepId={currentStepId}
          completedStepIds={completedStepIds}
          applicationId={applicationId}
        />
      </div>

      {/* Step Content */}
      <div>{children}</div>
    </div>
  );
}

