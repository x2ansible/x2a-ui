import React, { useState, useCallback } from 'react';
import ValidationSidebar from './ValidationSidebar';
import ValidationPanel from './ValidationPanel';

interface ValidationContainerProps {
  playbook?: string;
  onLogMessage?: (message: string) => void;
}

interface ValidationConfig {
  checkSyntax: boolean;
  securityScan: boolean;
  performanceCheck: boolean;
  bestPractices: boolean;
  customRules: string[];
}

interface CurrentStep {
  step?: number;
  agent_action?: string;
}

interface ValidationResult {
  passed?: boolean;
  steps?: number;
  total_steps?: number;
  summary?: {
    fixes_applied?: number;
    lint_iterations?: number;
    [key: string]: unknown;
  };
  debug_info?: {
    exit_code?: number;
    [key: string]: unknown;
  };
  duration_ms?: number;
  [key: string]: unknown;
}

const ValidationContainer: React.FC<ValidationContainerProps> = ({
  playbook = "",
  onLogMessage
}) => {
  // Validation configuration state
  const [validationConfig, setValidationConfig] = useState<ValidationConfig>({
    checkSyntax: true,
    securityScan: true,
    performanceCheck: false,
    bestPractices: true,
    customRules: []
  });

  // Validation state
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [streamingActive, setStreamingActive] = useState(false);
  const [currentStep] = useState<CurrentStep | null>(null);
  const [totalSteps] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState('basic'); // Changed from 'production' to 'basic'
  const [, setLogs] = useState<string[]>([]);

  // Logging helper
  const logMessage = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, formattedMessage]);
    onLogMessage?.(formattedMessage);
  }, [onLogMessage]);

  // Enhanced validation completion handler
  const handleValidationComplete = useCallback((result: unknown) => {
    // Cast the unknown result to our expected type
    const validationResult = result as ValidationResult | null;
    
    setValidationResult(validationResult);
    setValidationLoading(false);
    setStreamingActive(false);
    
    // Enhanced logging with more details
    if (validationResult) {
      const passed = validationResult.passed || false;
      const steps = validationResult.steps || validationResult.total_steps || 0;
      const fixes = validationResult.summary?.fixes_applied || 0;
      const lintChecks = validationResult.summary?.lint_iterations || 0;
      
      logMessage(`🎯 Validation ${passed ? "PASSED" : "COMPLETED"}: ${steps} steps, ${fixes} fixes applied, ${lintChecks} lint checks`);
      
      if (validationResult.debug_info?.exit_code) {
        logMessage(`🔍 Exit code: ${validationResult.debug_info.exit_code}`);
      }
      
      if (validationResult.duration_ms) {
        logMessage(`⏱️ Duration: ${validationResult.duration_ms}ms`);
      }
    }
  }, [logMessage]);

  return (
    <div className="flex h-full bg-slate-900">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-700 bg-slate-800">
        <ValidationSidebar
          playbook={playbook} // Add missing playbook prop
          validationConfig={validationConfig}
          setValidationConfig={(config: unknown) => {
            setValidationConfig(config as ValidationConfig);
          }}
          validationResult={validationResult}
          loading={validationLoading}
          selectedProfile={selectedProfile}
          onProfileChange={setSelectedProfile}
          onLogMessage={logMessage} // Add missing prop
          onValidationComplete={handleValidationComplete} // Add missing prop
          streamingActive={streamingActive}
          currentStep={currentStep || undefined}
          totalSteps={totalSteps}
        />
      </div>

      {/* Main panel */}
      <div className="flex-1">
        <ValidationPanel
          playbook={playbook}
          validationConfig={validationConfig}
          selectedProfile={selectedProfile} // FIX: Add missing selectedProfile prop
          onLogMessage={logMessage}
          onValidationComplete={handleValidationComplete}
        />
      </div>
    </div>
  );
};

export default ValidationContainer;