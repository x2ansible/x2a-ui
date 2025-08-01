import React from 'react';
import {
  BoltIcon,
  BeakerIcon,
  WrenchScrewdriverIcon,
  InformationCircleIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { ValidationStep } from './ValidationTypes';

interface ValidationStepsProps {
  steps: ValidationStep[];
  streamingActive: boolean;
  currentStep: ValidationStep | null;
  expandedSteps: Set<string>;
  onToggleExpansion: (uniqueKey: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onCopyCode: (code: string) => void;
}

const ValidationSteps: React.FC<ValidationStepsProps> = ({
  steps,
  streamingActive,
  currentStep,
  expandedSteps,
  onToggleExpansion,
  onExpandAll,
  onCollapseAll,
  onCopyCode
}) => {
  if (!steps || steps.length === 0) return null;

  const getStepIcon = (action: string, isActive: boolean = false) => {
    const baseClasses = `w-5 h-5 ${isActive ? 'animate-pulse' : ''}`;
    
    switch (action) {
      case 'lint':
        return <BeakerIcon className={`${baseClasses} text-blue-400`} />;
      case 'llm_fix':
        return <WrenchScrewdriverIcon className={`${baseClasses} text-purple-400`} />;
      default:
        return <InformationCircleIcon className={`${baseClasses} text-slate-400`} />;
    }
  };

  const getStepStatusColor = (action: string, summary: string) => {
    if (action === 'lint') {
      if (summary.includes('No issues found') || summary.includes('No violations')) {
        return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
      } else if (summary.includes('Failed') || summary.includes('violation')) {
        return 'from-red-500/20 to-rose-500/20 border-red-500/30';
      }
      return 'from-blue-500/20 to-indigo-500/20 border-blue-500/30';
    } else if (action === 'llm_fix') {
      return 'from-purple-500/20 to-violet-500/20 border-purple-500/30';
    }
    return 'from-slate-500/20 to-slate-600/20 border-slate-500/30';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-slate-200 flex items-center space-x-2">
          <BoltIcon className="w-5 h-5 text-yellow-400" />
          <span>Validation Steps ({steps.length})</span>
          {streamingActive && (
            <div className="flex items-center space-x-2 ml-4">
              <div className="w-2 h-2 bg-green-400 rounded-full" style={{animation: 'pulse 1s infinite'}}></div>
              <span className="text-sm text-green-400">Live Stream</span>
            </div>
          )}
        </h4>
        <div className="flex items-center space-x-3">
          <button
            onClick={onExpandAll}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={onCollapseAll}
            className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2 validation-scrollbar">
        {steps.map((step, index) => {
          const uniqueKey = `${step.step}-${step.agent_action}-${index}`;
          const isExpanded = expandedSteps.has(uniqueKey);
          const isActive = currentStep?.step === step.step && streamingActive;
          const isLint = step.agent_action === 'lint';
          const isSuccess = isLint && (step.summary.includes('No issues') || step.summary.includes('No violations'));
          const isError = isLint && (step.summary.includes('Failed') || step.summary.includes('violation'));
          
          return (
            <div 
              key={uniqueKey}
              className={`rounded-lg border transition-all duration-500 backdrop-blur-sm ${
                isActive 
                  ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50 shadow-lg shadow-yellow-500/10' 
                  : `bg-gradient-to-r ${getStepStatusColor(step.agent_action, step.summary)}`
              } ${isActive ? 'transform scale-105' : ''}`}
              style={isActive ? {animation: 'pulse 2s infinite'} : {}}
            >
              <button
                onClick={() => onToggleExpansion(uniqueKey)}
                className="w-full p-4 text-left hover:bg-slate-700/20 transition-colors rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full backdrop-blur-sm ${
                      isSuccess ? 'bg-green-500/20' : 
                      isError ? 'bg-red-500/20' : 
                      step.agent_action === 'llm_fix' ? 'bg-purple-500/20' : 'bg-blue-500/20'
                    }`}>
                      {getStepIcon(step.agent_action, isActive)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-200">
                          Step {step.step}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium backdrop-blur-sm ${
                          step.agent_action === 'lint' 
                            ? 'bg-blue-500/20 text-blue-300' 
                            : 'bg-purple-500/20 text-purple-300'
                        }`}>
                          {step.agent_action === 'lint' ? '🔍 Lint Check' : '🔧 Auto Fix'}
                        </span>
                        {isActive && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-300 backdrop-blur-sm" style={{animation: 'pulse 1s infinite'}}>
                            ⚡ Active
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-300 mt-1">
                        {step.message || (typeof step.summary === 'string' ? step.summary.split('\n')[0] : JSON.stringify(step.summary))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {step.timestamp && (
                      <span className="text-xs text-slate-400">
                        {new Date(step.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDownIcon className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronRightIcon className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </button>
              
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3" style={{animation: 'fadeIn 0.3s ease-out'}}>
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-600/30 backdrop-blur-sm">
                    <h5 className="text-sm font-medium text-slate-300 mb-2">Summary</h5>
                    <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono overflow-x-auto">
                      {typeof step.summary === 'string' ? step.summary : JSON.stringify(step.summary, null, 2)}
                    </pre>
                  </div>
                  
                  {step.code && (
                    <div className="bg-slate-900/70 rounded-lg p-3 border border-slate-600/30 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-slate-300">
                          {step.agent_action === 'lint' ? 'Analyzed Code' : 'Fixed Code'}
                        </h5>
                        <button
                          onClick={() => onCopyCode(step.code)}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Copy Code
                        </button>
                      </div>
                      <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono overflow-x-auto max-h-48">
                        {step.code}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ValidationSteps;