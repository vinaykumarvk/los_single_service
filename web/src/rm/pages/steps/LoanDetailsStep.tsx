/**
 * Step 1: Loan Details
 * Captures basic loan information and creates application
 */

import { useState } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Loader2 } from 'lucide-react';

interface LoanDetailsStepProps {
  applicationId?: string;
  onNext: (data: {
    productCode: string;
    requestedAmount: number;
    requestedTenureMonths: number;
    channel: string;
  }) => void | Promise<void>;
  loading: boolean;
}

export default function LoanDetailsStep({ onNext, loading }: LoanDetailsStepProps) {
  const [formData, setFormData] = useState({
    productCode: '',
    requestedAmount: '500000',
    requestedTenureMonths: '20', // Years
    channel: 'Mobile',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.productCode) {
      newErrors.productCode = 'Please select a loan type';
    }
    
    const amount = parseFloat(formData.requestedAmount);
    if (!amount || amount < 50000 || amount > 50000000) {
      newErrors.requestedAmount = 'Amount must be between ₹50,000 and ₹5,00,00,000';
    }
    
    const years = parseFloat(formData.requestedTenureMonths);
    if (!years || years < 1 || years > 30) {
      newErrors.requestedTenureMonths = 'Tenure must be between 1-30 years';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    const tenureMonths = Math.round(parseFloat(formData.requestedTenureMonths) * 12);
    
    await onNext({
      productCode: formData.productCode,
      requestedAmount: parseFloat(formData.requestedAmount),
      requestedTenureMonths: tenureMonths,
      channel: formData.channel,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Loan Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Loan Type <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.productCode}
          onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-[44px] ${
            errors.productCode ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
        >
          <option value="">Select Loan Type</option>
          <option value="HOME_LOAN_V1">Home Loan</option>
          <option value="PERSONAL_LOAN_V1">Personal Loan</option>
          <option value="BALANCE_TRANSFER_V1">Balance Transfer</option>
        </select>
        {errors.productCode && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.productCode}</p>
        )}
      </div>

      {/* Loan Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Loan Amount (₹) <span className="text-red-500">*</span>
        </label>
        <Input
          type="text"
          inputMode="numeric"
          value={formData.requestedAmount}
          onChange={(e) => setFormData({ ...formData, requestedAmount: e.target.value })}
          placeholder="500000"
          error={errors.requestedAmount}
        />
      </div>

      {/* Tenure */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tenure (Years) <span className="text-red-500">*</span>
        </label>
        <Input
          type="text"
          inputMode="numeric"
          value={formData.requestedTenureMonths}
          onChange={(e) => setFormData({ ...formData, requestedTenureMonths: e.target.value })}
          placeholder="20"
          error={errors.requestedTenureMonths}
        />
        <p className="mt-1 text-xs text-gray-500">Enter tenure in years (1-30)</p>
      </div>

      {/* Channel */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Channel <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.channel}
          onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-[44px] border-gray-300 dark:border-gray-600"
        >
          <option value="Mobile">Mobile</option>
          <option value="Online">Online</option>
          <option value="Branch">Branch</option>
          <option value="DSA">DSA</option>
        </select>
      </div>

      {/* Next Button */}
      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={() => window.history.back()} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Next'
          )}
        </Button>
      </div>
    </form>
  );
}

