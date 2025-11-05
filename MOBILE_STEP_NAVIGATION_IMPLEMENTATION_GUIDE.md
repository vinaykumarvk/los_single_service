# Mobile Step Navigation Implementation Guide

## Overview

This guide explains how to implement and use the mobile-optimized step navigation system for the application creation lifecycle.

## Components Created

### 1. `MobileStepNavigator` Component
**Location**: `web/src/rm/components/MobileStepNavigator.tsx`

A responsive component that provides:
- **Mobile**: Collapsible step selector with progress bar
- **Desktop**: Horizontal step indicator with clickable steps
- Visual progress tracking
- Seamless navigation between completed steps

### 2. `useApplicationSteps` Hook
**Location**: `web/src/rm/hooks/useApplicationSteps.ts`

Provides:
- Step definitions for all application stages
- Route generation helpers
- Current step detection from URL
- Completion status utilities

### 3. `useStepCompletion` Hook
**Location**: `web/src/rm/hooks/useStepCompletion.ts`

Manages:
- Step completion status from API
- Loading states
- Completion tracking
- Refresh functionality

### 4. `ApplicationStepWrapper` Component
**Location**: `web/src/rm/components/ApplicationStepWrapper.tsx`

A wrapper component that automatically adds step navigation to any application step page.

## Implementation Options

### Option 1: Using the Wrapper Component (Recommended)

The easiest way to add step navigation to any application step page:

```tsx
import ApplicationStepWrapper from '../components/ApplicationStepWrapper';

export default function RMPersonalInformation() {
  // ... your existing code ...

  return (
    <ApplicationStepWrapper>
      {/* Your existing form/content */}
      <form>
        {/* ... */}
      </form>
    </ApplicationStepWrapper>
  );
}
```

### Option 2: Manual Integration

For more control, integrate directly:

```tsx
import { useLocation } from 'react-router-dom';
import MobileStepNavigator from '../components/MobileStepNavigator';
import { useApplicationSteps } from '../hooks/useApplicationSteps';
import { useStepCompletion } from '../hooks/useStepCompletion';

export default function RMPersonalInformation() {
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { steps, getCurrentStepId } = useApplicationSteps();
  const { completedStepIds } = useStepCompletion();

  const currentStepId = getCurrentStepId(location.pathname);

  return (
    <div>
      {/* Step Navigator */}
      <MobileStepNavigator
        steps={steps}
        currentStepId={currentStepId || 'personal'}
        completedStepIds={completedStepIds}
        applicationId={id || ''}
      />

      {/* Your form content */}
      <form>
        {/* ... */}
      </form>
    </div>
  );
}
```

## Step Completion Tracking

### Automatic Tracking (via API)

The `useStepCompletion` hook automatically fetches completion status from the API endpoint:
- `GET /api/applications/:id/completeness`

Expected API response format:
```json
{
  "personalInfoComplete": true,
  "employmentComplete": false,
  "loanPropertyComplete": false,
  "documentsComplete": false,
  "bankVerificationComplete": false,
  "cibilComplete": false,
  "reviewComplete": false
}
```

### Manual Tracking

If you need to mark a step as complete manually:

```tsx
const { markStepComplete } = useStepCompletion();

// After successful form submission
await handleSubmit();
markStepComplete('personal');
```

## Integration Steps

### Step 1: Update Application Step Pages

Add the wrapper or navigator to each step page:

1. **PersonalInformation.tsx**
2. **EmploymentDetails.tsx**
3. **LoanPropertyDetails.tsx**
4. **DocumentUpload.tsx**
5. **BankVerification.tsx**
6. **CIBILCheck.tsx**
7. **ApplicationReview.tsx**

### Step 2: Ensure API Endpoint Exists

The completion status requires an API endpoint:
```
GET /api/applications/:id/completeness
```

If this doesn't exist, you can:
- Implement it in the backend
- Use a fallback approach (check form data directly)
- Mock it for development

### Step 3: Update Routes (if needed)

Ensure all step routes are properly configured in `routes.tsx`:
- `/rm/applications/:id/personal`
- `/rm/applications/:id/employment`
- `/rm/applications/:id/loan-property`
- `/rm/applications/:id/documents`
- `/rm/applications/:id/bank`
- `/rm/applications/:id/cibil`
- `/rm/applications/:id/review`

## Customization

### Customizing Step Labels

Edit `useApplicationSteps.ts`:

```tsx
const steps: ApplicationStep[] = [
  {
    id: 'personal',
    label: 'Personal Information',        // Desktop label
    shortLabel: 'Personal Info',          // Mobile label
    route: (id) => `/rm/applications/${id}/personal`,
    description: 'Basic customer details',
  },
  // ...
];
```

### Customizing Styles

The component uses Tailwind CSS classes. You can customize:
- Colors: Modify `bg-blue-600`, `bg-green-500`, etc.
- Sizes: Adjust `w-8 h-8`, `min-h-[56px]`, etc.
- Spacing: Change `gap-3`, `p-4`, etc.

### Adding Icons

Add icons to steps:

```tsx
import { User, Briefcase } from 'lucide-react';

{
  id: 'personal',
  label: 'Personal Information',
  icon: <User className="h-5 w-5" />,
  // ...
}
```

## Mobile UX Features

### Collapsible Step Selector (Mobile)
- Tap header to expand/collapse
- Shows current step and progress
- Quick jump to any completed step
- Visual indicators: ✓ (completed), ● (current), ○ (upcoming)

### Horizontal Step Indicator (Desktop)
- Always visible progress bar
- Clickable completed steps
- Visual progress line
- Percentage completion shown

### Progress Tracking
- Visual progress bar
- Percentage completion
- Step count (e.g., "3 of 7 steps")
- Completion status indicators

## Testing Checklist

- [ ] Step navigator appears on all application step pages
- [ ] Mobile view shows collapsible selector
- [ ] Desktop view shows horizontal indicator
- [ ] Can navigate to completed steps
- [ ] Cannot navigate to future steps
- [ ] Current step is highlighted
- [ ] Completed steps show checkmark
- [ ] Progress bar updates correctly
- [ ] Navigation works smoothly
- [ ] Touch targets are adequate (44px+)
- [ ] Dark mode works correctly
- [ ] Screen reader compatible

## Troubleshooting

### Navigator not appearing
- Check that `applicationId` is available in URL params
- Verify `currentStepId` is correctly detected
- Ensure route matches step definitions

### Completion status not updating
- Verify API endpoint exists and returns correct format
- Check `useStepCompletion` hook is called
- Ensure `markStepComplete` is called after form submission

### Navigation not working
- Verify routes are correctly defined
- Check step IDs match between steps and navigator
- Ensure application ID is valid

## Next Steps

1. **Phase 1**: Integrate wrapper component into all step pages
2. **Phase 2**: Implement or verify API completeness endpoint
3. **Phase 3**: Test on mobile devices
4. **Phase 4**: Add swipe gestures (optional)
5. **Phase 5**: Add haptic feedback (optional)

## Examples

See `PersonalInformation.tsx` for a complete example of integration.

