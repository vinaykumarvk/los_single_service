/**
 * Simplified New Application Component for Testing
 * This is a minimal version to test if routing works
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';

export default function NewApplicationSimple() {
  console.log('[NewApplicationSimple] ✅ Component rendered!');
  
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [testState, setTestState] = useState('Component loaded');

  console.log('[NewApplicationSimple] State:', {
    authLoading,
    hasUser: !!user,
    userId: user?.id,
    testState
  });

  if (authLoading) {
    return (
      <div className="p-6">
        <h1>Loading...</h1>
      </div>
    );
  }

  if (!user?.id) {
    return (
      <div className="p-6">
        <h1>Not authenticated</h1>
        <button onClick={() => navigate('/login')}>Go to Login</button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create New Application (Simplified)</h1>
      <p className="mb-4">If you can see this, routing works!</p>
      <p className="mb-4">User: {user.username} ({user.id})</p>
      <button 
        onClick={() => setTestState('Button clicked!')}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Test Button - {testState}
      </button>
      <button 
        onClick={() => navigate('/rm')}
        className="ml-4 px-4 py-2 bg-gray-600 text-white rounded"
      >
        Back to Dashboard
      </button>
    </div>
  );
}

