/**
 * Hook for managing application step navigation
 * Provides step definitions and completion tracking
 */

import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ApplicationStep } from '../components/MobileStepNavigator';


export function useApplicationSteps() {
  const { id: applicationId } = useParams<{ id: string }>();

  const steps: ApplicationStep[] = useMemo(
    () => [
      {
        id: 'personal',
        label: 'Personal Information',
        shortLabel: 'Personal Info',
        route: (id) => `/rm/applications/${id}/personal`,
        description: 'Basic customer details',
      },
      {
        id: 'employment',
        label: 'Employment Details',
        shortLabel: 'Employment',
        route: (id) => `/rm/applications/${id}/employment`,
        description: 'Employment and income information',
      },
      {
        id: 'loan-property',
        label: 'Loan & Property',
        shortLabel: 'Loan Details',
        route: (id) => `/rm/applications/${id}/loan-property`,
        description: 'Loan and property details',
      },
      {
        id: 'documents',
        label: 'Documents',
        shortLabel: 'Documents',
        route: (id) => `/rm/applications/${id}/documents`,
        description: 'Upload required documents',
      },
      {
        id: 'bank',
        label: 'Bank Verification',
        shortLabel: 'Bank',
        route: (id) => `/rm/applications/${id}/bank`,
        description: 'Bank account verification',
      },
      {
        id: 'cibil',
        label: 'CIBIL Check',
        shortLabel: 'CIBIL',
        route: (id) => `/rm/applications/${id}/cibil`,
        description: 'Credit score verification',
      },
      {
        id: 'review',
        label: 'Review & Submit',
        shortLabel: 'Review',
        route: (id) => `/rm/applications/${id}/review`,
        description: 'Final review before submission',
      },
    ],
    []
  );

  /**
   * Get current step ID from route
   */
  const getCurrentStepId = (pathname: string): string | null => {
    if (!applicationId) return null;

    if (pathname.includes('/personal')) return 'personal';
    if (pathname.includes('/employment')) return 'employment';
    if (pathname.includes('/loan-property')) return 'loan-property';
    if (pathname.includes('/documents')) return 'documents';
    if (pathname.includes('/bank')) return 'bank';
    if (pathname.includes('/cibil')) return 'cibil';
    if (pathname.includes('/review')) return 'review';

    return null;
  };

  /**
   * Convert completion status object to Set of step IDs
   */
  const getCompletedStepIds = (
    completionStatus: Partial<StepCompletionStatus>
  ): Set<string> => {
    const completed = new Set<string>();

    if (completionStatus.personal) completed.add('personal');
    if (completionStatus.employment) completed.add('employment');
    if (completionStatus.loanProperty) completed.add('loan-property');
    if (completionStatus.documents) completed.add('documents');
    if (completionStatus.bank) completed.add('bank');
    if (completionStatus.cibil) completed.add('cibil');
    if (completionStatus.review) completed.add('review');

    return completed;
  };

  return {
    steps,
    applicationId: applicationId || '',
    getCurrentStepId,
    getCompletedStepIds,
  };
}

