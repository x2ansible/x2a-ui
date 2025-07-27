import React, { useState } from 'react';
import {
  ShieldCheckIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  ClockIcon,
  BoltIcon,
  BeakerIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  SparklesIcon,
  SignalIcon,
  CircleStackIcon
} from "@heroicons/react/24/outline";



interface CurrentStep {
  step?: number;
  agent_action?: string;
}

interface ValidationSidebarProps {
  playbook?: string;
  validationConfig: {
    checkSyntax: boolean;
    securityScan: boolean;
    performanceCheck: boolean;
    bestPractices: boolean;
    customRules: string[];
  };
  setValidationConfig: (config: unknown) => void;
  validationResult?: Record<string, unknown> | null;
  loading: boolean;
  selectedProfile: string;
  onProfileChange: (profile: string) => void;
  onLogMessage?: (message: string) => void;
  onValidationComplete?: (result: unknown) => void;
  // Enhanced props
  streamingActive?: boolean;
  currentStep?: CurrentStep;
  totalSteps?: number;
}

const ValidationSidebar: React.FC<ValidationSidebarProps> = ({
  playbook,
  validationConfig,
  setValidationConfig,
  validationResult,
  loading,
  selectedProfile,
  onProfileChange,
  onLogMessage,
  onValidationComplete,
  streamingActive = false,
  currentStep = null,
  totalSteps = 0,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['status', 'profile']));

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const copy = new Set(prev);
      if (copy.has(section)) {
        copy.delete(section);
      } else {
        copy.add(section);
      }
      return copy;
    });
  };

  const profiles = [
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Only critical errors',
      rules: 12,
      color: 'emerald',
      icon: CheckCircleIcon
    },
    {
      id: 'basic',
      name: 'Basic',
      description: 'Essential syntax and structure',
      rules: 28,
      color: 'blue',
      icon: BeakerIcon
    },
    {
      id: 'safety',
      name: 'Safety',
      description: 'Security and safety focused',
      rules: 35,
      color: 'amber',
      icon: ShieldCheckIcon
    },
    {
      id: 'test',
      name: 'Test',
      description: 'Rules suitable for testing',
      rules: 42,
      color: 'violet',
      icon: WrenchScrewdriverIcon
    },
    {
      id: 'production',
      name: 'Production',
      description: 'Comprehensive production rules',
      rules: 67,
      color: 'red',
      icon: SparklesIcon
    }
  ];

  const getProfileColor = (profileId: string, type: 'bg' | 'text' | 'border' = 'bg') => {
    const profile = profiles.find(p => p.id === profileId);
    const colorName = profile?.color || 'blue';
    
    const colorMap = {
      emerald: { bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500' },
      blue: { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500' },
      amber: { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500' },
      violet: { bg: 'bg-violet-500', text: 'text-violet-400', border: 'border-violet-500' },
      red: { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500' },
    };
    
    return colorMap[colorName as keyof typeof colorMap]?.[type] || colorMap.blue[type];
  };

  const renderValidationStatus = () => {
    return (
      <div className="space-y-4">
        {/* Real-time Status Card */}
        <div className={`p-4 rounded-lg border transition-all duration-300 ${
          streamingActive 
            ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30 shadow-lg shadow-green-500/20' 
            : loading
            ? 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/30'
            : validationResult?.passed
            ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/30'
            : validationResult && !validationResult.passed
            ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30'
            : 'bg-slate-700/30 border-slate-600/30'
        }`}>
          <div className="flex items-center space-x-3 mb-3">
            {streamingActive ? (
              <SignalIcon className="w-6 h-6 text-green-400 animate-pulse" />
            ) : loading ? (
              <ClockIcon className="w-6 h-6 text-blue-400 animate-spin" />
            ) : validationResult?.passed ? (
              <CheckCircleIcon className="w-6 h-6 text-emerald-400" />
            ) : validationResult && !validationResult.passed ? (
              <ExclamationTriangleIcon className="w-6 h-6 text-amber-400" />
            ) : (
              <CircleStackIcon className="w-6 h-6 text-slate-400" />
            )}
            
            <div className="flex-1">
              <h3 className="font-semibold text-white">
                {streamingActive ? 'Live Validation' :
                 loading ? 'Validating...' :
                 validationResult?.passed ? 'Validation Passed' :
                 validationResult ? 'Issues Found & Fixed' :
                 'Ready to Validate'}
              </h3>
              <p className="text-xs text-slate-400">
                {streamingActive ? 'Real-time analysis active' :
                 loading ? 'Processing playbook...' :
                 validationResult ? `${validationResult.total_steps || 0} steps completed` :
                 'Click validate to start'}
              </p>
            </div>
          </div>

          {/* Real-time Progress */}
          {(streamingActive || loading) && (
            <div className="space-y-2">
              {currentStep && (
                <div className="flex items-center space-x-2 text-sm">
                  {currentStep.agent_action === 'lint' ? (
                    <BeakerIcon className="w-4 h-4 text-blue-400 animate-pulse" />
                  ) : (
                    <WrenchScrewdriverIcon className="w-4 h-4 text-purple-400 animate-pulse" />
                  )}
                  <span className="text-slate-300">
                    Step {currentStep.step}: {currentStep.agent_action === 'lint' ? 'Analyzing' : 'Fixing'}
                  </span>
                </div>
              )}
              
              {totalSteps > 0 && (
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300 progress-bar"
                    style={{ width: `${Math.min(100, (currentStep?.step || 0) / Math.max(totalSteps, 1) * 100)}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}

          {/* Validation Results Summary */}
                      {validationResult && !loading && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="text-center p-2 bg-slate-800/50 rounded">
                <div className="text-lg font-bold text-purple-400">{(validationResult.summary as any)?.fixes_applied || 0}</div>
                <div className="text-xs text-slate-400">Fixes</div>
              </div>
              <div className="text-center p-2 bg-slate-800/50 rounded">
                <div className="text-lg font-bold text-blue-400">{(validationResult.summary as any)?.lint_iterations || 0}</div>
                <div className="text-xs text-slate-400">Checks</div>
              </div>
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        {validationResult && (
          <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
            <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center">
              <ChartBarIcon className="w-4 h-4 mr-1" />
              Performance
            </h4>
            <div className="space-y-1 text-xs">
              {(validationResult as any).duration_ms && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Duration:</span>
                  <span className="text-white">{(validationResult as any).duration_ms}ms</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Code Size:</span>
                <span className="text-white">{(validationResult as any).debug_info?.playbook_length || 0} chars</span>
              </div>
              {(validationResult as any).total_steps && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Steps:</span>
                  <span className="text-white">{(validationResult as any).total_steps}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderLintProfile = () => {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-white">Lint Profile</h3>
          <div className={`w-3 h-3 rounded-full ${getProfileColor(selectedProfile)}`}></div>
        </div>
        
        <div className="space-y-2">
          {profiles.map((profile) => {
            const Icon = profile.icon;
            const isSelected = selectedProfile === profile.id;
            
            return (
              <button
                key={profile.id}
                onClick={() => onProfileChange(profile.id)}
                disabled={loading || streamingActive}
                className={`w-full p-3 rounded-lg border transition-all duration-200 text-left ${
                  isSelected
                    ? `${getProfileColor(profile.id, 'bg')}/20 ${getProfileColor(profile.id, 'border')}/50 shadow-lg`
                    : 'bg-slate-700/30 border-slate-600/30 hover:bg-slate-700/50'
                } ${(loading || streamingActive) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${isSelected ? getProfileColor(profile.id, 'text') : 'text-slate-400'}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {profile.name}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        isSelected ? `${getProfileColor(profile.id, 'bg')}/30` : 'bg-slate-600/30'
                      }`}>
                        {profile.rules} rules
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{profile.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Profile Info */}
        <div className="p-3 bg-slate-700/20 rounded-lg border border-slate-600/20">
          <div className="flex items-center space-x-2 mb-2">
            <InformationCircleIcon className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-slate-300">Profile Info</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {selectedProfile === 'production' && "Most comprehensive ruleset for production environments. Includes all security, performance, and best practice checks."}
            {selectedProfile === 'test' && "Balanced ruleset suitable for testing environments. Focuses on functionality and reliability."}
            {selectedProfile === 'safety' && "Security-focused rules to ensure safe deployment practices and vulnerability prevention."}
            {selectedProfile === 'basic' && "Essential checks for syntax and basic structure validation."}
            {selectedProfile === 'minimal' && "Only the most critical error detection for rapid development."}
          </p>
        </div>
      </div>
    );
  };

  const renderConfigOptions = () => {
    return (
      <div className="space-y-3">
        <h3 className="font-medium text-white">Validation Options</h3>
        
        <div className="space-y-2">
          {[
            { key: 'checkSyntax', label: 'Syntax Check', icon: BeakerIcon, color: 'blue' },
            { key: 'securityScan', label: 'Security Scan', icon: ShieldCheckIcon, color: 'red' },
            { key: 'performanceCheck', label: 'Performance Check', icon: BoltIcon, color: 'amber' },
            { key: 'bestPractices', label: 'Best Practices', icon: SparklesIcon, color: 'purple' },
          ].map(({ key, label, icon: Icon, color }) => (
            <label
              key={key}
              className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                (loading || streamingActive) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700/30 cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={validationConfig[key as keyof typeof validationConfig] as boolean}
                onChange={(e) => {
                  if (loading || streamingActive) return;
                  setValidationConfig({
                    ...validationConfig,
                    [key]: e.target.checked,
                  });
                }}
                disabled={loading || streamingActive}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                validationConfig[key as keyof typeof validationConfig]
                  ? `bg-${color}-500 border-${color}-500`
                  : 'border-slate-400'
              }`}>
                {validationConfig[key as keyof typeof validationConfig] && (
                  <CheckCircleIcon className="w-3 h-3 text-white" />
                )}
              </div>
              <Icon className={`w-4 h-4 ${
                validationConfig[key as keyof typeof validationConfig] ? `text-${color}-400` : 'text-slate-400'
              }`} />
              <span className="text-sm text-slate-300">{label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-slate-800/50 p-4 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-400 rounded-lg flex items-center justify-center">
          <ShieldCheckIcon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Validation</h2>
          <p className="text-xs text-slate-400">Ansible Lint & Quality</p>
        </div>
      </div>

      {/* Validation Status Section */}
      <div>
        <button
          onClick={() => toggleSection('status')}
          className="flex items-center justify-between w-full text-left mb-3"
        >
          <h3 className="font-medium text-slate-300">Validation Status</h3>
          <Cog6ToothIcon className={`w-4 h-4 text-slate-400 transition-transform ${
            expandedSections.has('status') ? 'rotate-90' : ''
          }`} />
        </button>
        {expandedSections.has('status') && renderValidationStatus()}
      </div>

      {/* Lint Profile Section */}
      <div>
        <button
          onClick={() => toggleSection('profile')}
          className="flex items-center justify-between w-full text-left mb-3"
        >
          <h3 className="font-medium text-slate-300">Lint Profile</h3>
          <Cog6ToothIcon className={`w-4 h-4 text-slate-400 transition-transform ${
            expandedSections.has('profile') ? 'rotate-90' : ''
          }`} />
        </button>
        {expandedSections.has('profile') && renderLintProfile()}
      </div>

      {/* Configuration Section */}
      <div>
        <button
          onClick={() => toggleSection('config')}
          className="flex items-center justify-between w-full text-left mb-3"
        >
          <h3 className="font-medium text-slate-300">Configuration</h3>
          <Cog6ToothIcon className={`w-4 h-4 text-slate-400 transition-transform ${
            expandedSections.has('config') ? 'rotate-90' : ''
          }`} />
        </button>
        {expandedSections.has('config') && renderConfigOptions()}
      </div>
    </div>
  );
};

export default ValidationSidebar;