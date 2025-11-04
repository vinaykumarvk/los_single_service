/**
 * Simplified Application Wizard
 * Multi-step form with auto-save on Next button
 * Status remains 'Draft' until final Submit
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import { useToast as useToastHook } from '../../components/ui/Toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { rmAPI } from '../lib/api';

// Import step components
import LoanDetailsStep from './steps/LoanDetailsStep';
import PersonalDetailsStep from './steps/PersonalDetailsStep';
import EmploymentDetailsStep from './steps/EmploymentDetailsStep';
import PropertyDetailsStep from './steps/PropertyDetailsStep';

type Step = 'loan' | 'personal' | 'employment' | 'property' | 'submit';

interface ApplicationData {
  applicationId?: string;
  productCode?: string;
  status?: string;
}

export default function ApplicationWizard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToastHook();
  
  // If no ID, start at loan step (new application)
  // If ID exists, start at personal step (resuming draft)
  const [currentStep, setCurrentStep] = useState<Step>(id ? 'personal' : 'loan');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applicationData, setApplicationData] = useState<ApplicationData>(id ? { applicationId: id } : {});
  const [fetching, setFetching] = useState(!!id);

  // Load existing application if editing
  useEffect(() => {
    if (id) {
      loadApplication();
    } else {
      // New application - start fresh
      setFetching(false);
    }
  }, [id]);

  const loadApplication = async () => {
    if (!id) return;
    
    try {
      setFetching(true);
      const response = await rmAPI.applications.get(id);
      if (response.data) {
        const app = response.data;
        setApplicationData({
          applicationId: id,
          productCode: app.product_code,
          status: app.status,
        });
        
        // Determine which step to show based on data completeness
        // For now, start from loan details and let user navigate
        setCurrentStep('loan');
      }
    } catch (err: any) {
      console.error('Failed to load application:', err);
      addToast({
        type: 'error',
        message: 'Failed to load application. Please try again.',
      });
    } finally {
      setFetching(false);
    }
  };

  // Create new application (Step 1: Loan Details)
  const handleCreateApplication = async (loanData: {
    productCode: string;
    requestedAmount: number;
    requestedTenureMonths: number;
    channel: string;
  }) => {
    if (!user?.id) {
      addToast({ type: 'error', message: 'User not authenticated' });
      return;
    }

    try {
      setSaving(true);
      
      // Generate applicant ID
      const applicantId = crypto.randomUUID();

      // Create application
      const response = await rmAPI.applications.create({
        productCode: loanData.productCode,
        requestedAmount: loanData.requestedAmount,
        requestedTenureMonths: loanData.requestedTenureMonths,
        channel: loanData.channel,
        applicantId,
      });

      const applicationId = response.data?.applicationId;
      if (applicationId) {
        setApplicationData({
          applicationId,
          productCode: loanData.productCode,
          status: 'Draft',
        });
        addToast({ type: 'success', message: 'Loan details saved!' });
        // Update URL without navigation to avoid reload
        window.history.replaceState({}, '', `/rm/applications/${applicationId}/wizard`);
        setCurrentStep('personal');
      } else {
        throw new Error('Application ID not received');
      }
    } catch (err: any) {
      console.error('Error creating application:', err);
      addToast({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Failed to save loan details',
      });
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // Handle Next button - auto-save and navigate
  const handleNext = async (stepData: any, nextStep: Step) => {
    if (!applicationData.applicationId) {
      addToast({ type: 'error', message: 'Application not found' });
      return;
    }

    try {
      setSaving(true);

      // Save step data based on current step
      if (currentStep === 'personal') {
        await rmAPI.applicants.update(applicationData.applicationId, {
          firstName: stepData.firstName,
          lastName: stepData.lastName,
          dateOfBirth: stepData.dateOfBirth,
          gender: stepData.gender,
          maritalStatus: stepData.maritalStatus,
          mobile: stepData.mobile,
          email: stepData.email,
          addressLine1: stepData.addressLine1,
          addressLine2: stepData.addressLine2,
          pincode: stepData.pincode,
          city: stepData.city,
          state: stepData.state,
          pan: stepData.pan,
        });
        addToast({ type: 'success', message: 'Personal details saved!' });
      } else if (currentStep === 'employment') {
        await rmAPI.applicants.update(applicationData.applicationId, {
          employmentType: stepData.employmentType,
          employerName: stepData.employerName,
          businessName: stepData.businessName,
          monthlyIncome: parseFloat(stepData.monthlyIncome),
          yearsInJob: stepData.yearsInJob ? parseFloat(stepData.yearsInJob) : undefined,
          otherIncomeSources: stepData.otherIncomeSources ? parseFloat(stepData.otherIncomeSources) : undefined,
        });
        addToast({ type: 'success', message: 'Employment details saved!' });
      } else if (currentStep === 'property') {
        // Property details are saved in PropertyDetailsStep component
        addToast({ type: 'success', message: 'Property details saved!' });
      }

      // Navigate to next step
      setCurrentStep(nextStep);
    } catch (err: any) {
      console.error('Error saving step:', err);
      addToast({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Failed to save. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle Submit - change status to Submitted
  const handleSubmit = async () => {
    if (!applicationData.applicationId) {
      addToast({ type: 'error', message: 'Application not found' });
      return;
    }

    if (applicationData.status !== 'Draft') {
      addToast({ type: 'error', message: 'Only draft applications can be submitted' });
      return;
    }

    try {
      setLoading(true);
      const response = await rmAPI.applications.submit(applicationData.applicationId);
      
      if (response.data?.status === 'Submitted') {
        addToast({
          type: 'success',
          message: 'Application submitted successfully!',
        });
        
        // Navigate to dashboard or application status
        navigate('/rm?refresh=true');
      } else {
        throw new Error('Submission failed');
      }
    } catch (err: any) {
      console.error('Error submitting application:', err);
      addToast({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Failed to submit application',
      });
    } finally {
      setLoading(false);
    }
  };

  // Determine if property step should be shown
  const showPropertyStep = applicationData.productCode === 'HOME_LOAN_V1';

  // Determine next step
  const getNextStep = (): Step | null => {
    switch (currentStep) {
      case 'loan':
        return 'personal';
      case 'personal':
        return 'employment';
      case 'employment':
        return showPropertyStep ? 'property' : 'submit';
      case 'property':
        return 'submit';
      default:
        return null;
    }
  };

  // Determine previous step
  const getPreviousStep = (): Step | null => {
    switch (currentStep) {
      case 'personal':
        return 'loan';
      case 'employment':
        return 'personal';
      case 'property':
        return 'employment';
      case 'submit':
        return showPropertyStep ? 'property' : 'employment';
      default:
        return null;
    }
  };

  if (authLoading || fetching) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user?.id) {
    navigate('/login', { replace: true });
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Progress Indicator - Only show if we have an applicationId or are past loan step */}
      {(applicationData.applicationId || currentStep !== 'loan') && (
        <div className="flex items-center justify-between mb-6">
          {['loan', 'personal', 'employment', ...(showPropertyStep ? ['property'] : []), 'submit'].map((step, index, array) => {
            const stepLabels: Record<string, string> = {
              loan: 'Loan Details',
              personal: 'Personal',
              employment: 'Employment',
              property: 'Property',
              submit: 'Submit',
            };
            const isActive = currentStep === step;
            const isCompleted = array.indexOf(currentStep) > index;
            
            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      isActive
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : isCompleted
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'bg-white border-gray-300 text-gray-500'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <span className={`mt-2 text-xs text-center ${isActive ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
                    {stepLabels[step]}
                  </span>
                </div>
                {index < array.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {currentStep === 'loan' && 'Step 1: Loan Details'}
            {currentStep === 'personal' && 'Step 2: Personal Information'}
            {currentStep === 'employment' && 'Step 3: Employment Details'}
            {currentStep === 'property' && 'Step 4: Property Details'}
            {currentStep === 'submit' && 'Final Review & Submit'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentStep === 'loan' && (
            <LoanDetailsStep
              applicationId={applicationData.applicationId}
              onNext={handleCreateApplication}
              loading={saving}
            />
          )}
          
          {currentStep === 'personal' && applicationData.applicationId && (
            <PersonalDetailsStep
              applicationId={applicationData.applicationId}
              onNext={(data) => handleNext(data, getNextStep()!)}
              onPrevious={() => setCurrentStep(getPreviousStep()!)}
              loading={saving}
              productCode={applicationData.productCode}
            />
          )}
          
          {currentStep === 'employment' && applicationData.applicationId && (
            <EmploymentDetailsStep
              applicationId={applicationData.applicationId}
              onNext={(data) => handleNext(data, getNextStep()!)}
              onPrevious={() => setCurrentStep(getPreviousStep()!)}
              loading={saving}
              showPropertyStep={showPropertyStep}
            />
          )}
          
          {currentStep === 'property' && applicationData.applicationId && showPropertyStep && (
            <PropertyDetailsStep
              applicationId={applicationData.applicationId}
              onNext={(data) => handleNext(data, getNextStep()!)}
              onPrevious={() => setCurrentStep(getPreviousStep()!)}
              loading={saving}
            />
          )}
          
          {currentStep === 'submit' && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Review all the information above. Once submitted, the application will be sent for verification.
                </p>
              </div>
              
              <div className="flex gap-4 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(getPreviousStep()!)}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || applicationData.status !== 'Draft'}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

