import React, { useState } from 'react';
import { useValidatePlaybook } from '../hooks/useValidatePlaybook';

const ValidationDebugComponent: React.FC = () => {
  const [testPlaybook] = useState(`---
# Simple test playbook
- name: Test playbook
  hosts: localhost
  tasks:
    - name: Debug message
      debug:
        msg: "Hello World"`);

  const {
    validationResult,
    validationError,
    isValidating,
    progress,
    validatePlaybook,
    cancelValidation,
    resetValidation
  } = useValidatePlaybook();

  const handleValidate = () => {
    validatePlaybook({ 
      playbook: testPlaybook, 
      lint_profile: 'production' 
    });
  };

  const handleTestBackend = async () => {
    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playbook_content: testPlaybook,
          profile: 'production'
        })
      });
      
      const data = await response.json();
      console.log('Backend response:', data);
    } catch (error) {
      console.error('Backend test failed:', error);
    }
  };

  return (
    <div className="p-6 bg-slate-800 rounded-lg space-y-4">
      <h3 className="text-white font-bold text-lg">Validation Debug Panel</h3>
      
      {/* Test Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={handleValidate}
          disabled={isValidating}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded"
        >
          {isValidating ? 'Validating...' : 'Test Validation'}
        </button>
        
        <button
          onClick={handleTestBackend}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          Test Backend Direct
        </button>
        
        <button
          onClick={cancelValidation}
          disabled={!isValidating}
          className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white px-4 py-2 rounded"
        >
          Cancel
        </button>
        
        <button
          onClick={resetValidation}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
        >
          Reset
        </button>
      </div>

      {/* Status Display */}
      <div className="bg-slate-700 p-4 rounded">
        <h4 className="text-white font-semibold mb-2">Status:</h4>
        <div className="text-sm space-y-1">
          <div className="text-slate-300">
            Validating: <span className={isValidating ? 'text-yellow-400' : 'text-green-400'}>
              {isValidating ? 'Yes' : 'No'}
            </span>
          </div>
          
          {progress && (
            <div className="text-slate-300">
              Progress: <span className="text-blue-400">{progress}</span>
            </div>
          )}
          
          {validationError && (
            <div className="text-slate-300">
              Error: <span className="text-red-400">{validationError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Test Playbook */}
      <div className="bg-slate-700 p-4 rounded">
        <h4 className="text-white font-semibold mb-2">Test Playbook:</h4>
        <pre className="text-slate-300 text-sm whitespace-pre-wrap">
          {testPlaybook}
        </pre>
      </div>

      {/* Validation Result */}
      {validationResult && (
        <div className="bg-slate-700 p-4 rounded">
          <h4 className="text-white font-semibold mb-2">Validation Result:</h4>
          <pre className="text-slate-300 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
            {JSON.stringify(validationResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ValidationDebugComponent;