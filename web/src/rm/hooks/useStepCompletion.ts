/**
 * Hook to fetch and track step completion status
 * Integrates with API to determine which steps are completed
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { rmAPI } from '../lib/api';

export interface StepCompletionStatus {
  personal: boolean;
  employment: boolean;
  loanProperty: boolean;
  documents: boolean;
  bank: boolean;
  cibil: boolean;
  review: boolean;
}

/**
 * Convert completion status object to Set of step IDs
 */
function getCompletedStepIds(
  completionStatus: Partial<StepCompletionStatus>
): Set<string> {
  const completed = new Set<string>();

  if (completionStatus.personal) completed.add('personal');
  if (completionStatus.employment) completed.add('employment');
  if (completionStatus.loanProperty) completed.add('loan-property');
  if (completionStatus.documents) completed.add('documents');
  if (completionStatus.bank) completed.add('bank');
  if (completionStatus.cibil) completed.add('cibil');
  if (completionStatus.review) completed.add('review');

  return completed;
}

export function useStepCompletion() {
  const { id: applicationId } = useParams<{ id: string }>();
  const [completionStatus, setCompletionStatus] = useState<Partial<StepCompletionStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!applicationId) {
      setLoading(false);
      return;
    }

    loadCompletionStatus();
  }, [applicationId]);

  const loadCompletionStatus = async () => {
    if (!applicationId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch application completeness from API
      const response = await rmAPI.applications.getCompleteness(applicationId);
      
      if (response.data) {
        const completeness = response.data;
        setCompletionStatus({
          personal: completeness.personalInfoComplete || false,
          employment: completeness.employmentComplete || false,
          loanProperty: completeness.loanPropertyComplete || false,
          documents: completeness.documentsComplete || false,
          bank: completeness.bankVerificationComplete || false,
          cibil: completeness.cibilComplete || false,
          review: completeness.reviewComplete || false,
        });
      }
    } catch (err: any) {
      console.error('Failed to load step completion status:', err);
      setError(err);
      // Fallback: mark all as incomplete
      setCompletionStatus({});
    } finally {
      setLoading(false);
    }
  };

  const markStepComplete = (step: keyof StepCompletionStatus) => {
    setCompletionStatus((prev) => ({
      ...prev,
      [step]: true,
    }));
  };

  const completedStepIds = getCompletedStepIds(completionStatus);

  return {
    completionStatus,
    completedStepIds,
    loading,
    error,
    markStepComplete,
    refresh: loadCompletionStatus,
  };
}

