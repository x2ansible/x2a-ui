import React, { useState, useCallback, useEffect } from 'react';
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

  // Profile selection state - this connects the sidebar and panel
  const [selectedProfile, setSelectedProfile] = useState<string>('production');
  
  // Validation result state (managed by the enhanced panel)
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validationLoading, setValidationLoading] = useState(false);

  // Enhanced state for real-time updates
  const [currentStep, setCurrentStep] = useState<any>(null);
  const [streamingActive, setStreamingActive] = useState(false);
  const [totalSteps, setTotalSteps] = useState(0);

  // Logging utility
  const logMessage = useCallback(
    (message: string) => {
      if (onLogMessage) {
        onLogMessage(message);
      }
      if (process.env.NODE_ENV !== "production") {
        console.log("[ValidationContainer]", message);
      }
    },
    [onLogMessage]
  );

  // Handle profile change from sidebar
  const handleProfileChange = useCallback((profile: string) => {
    setSelectedProfile(profile);
    logMessage(`🔧 Switched to ${profile} profile`);
  }, [logMessage]);

  // Enhanced validation completion handler
  const handleValidationComplete = useCallback((result: unknown) => {
    setValidationResult(result);
    setValidationLoading(false);
    setStreamingActive(false);
    
    // Enhanced logging with more details
    if (result) {
      const passed = result.passed || false;
      const steps = result.steps || result.total_steps || 0;
      const fixes = result.summary?.fixes_applied || 0;
      const lintChecks = result.summary?.lint_iterations || 0;
      
      logMessage(`🎯 Validation ${passed ? "PASSED" : "COMPLETED"}: ${steps} steps, ${fixes} fixes applied, ${lintChecks} lint checks`);
      
      if (result.debug_info?.exit_code) {
        logMessage(`🔍 Exit code: ${result.debug_info.exit_code}`);
      }
      
      if (result.duration_ms) {
        logMessage(`⏱️ Duration: ${result.duration_ms}ms`);
      }
    }
  }, [logMessage]);

  // Handle validation start
  const handleValidationStart = useCallback(() => {
    setValidationLoading(true);
    setStreamingActive(true);
    setCurrentStep(null);
    setTotalSteps(0);
    logMessage(`🚀 Starting enhanced validation with ${selectedProfile} profile`);
  }, [selectedProfile, logMessage]);

  // Handle real-time step updates
  const handleStepUpdate = useCallback((step: any) => {
    setCurrentStep(step);
    setTotalSteps(prev => Math.max(prev, step.step || 0));
    
    const action = step.agent_action === 'lint' ? '🔍 Linting' : '🔧 Fixing';
    logMessage(`${action} Step ${step.step}: ${step.message || 'Processing...'}`);
  }, [logMessage]);

  // Handle streaming status changes
  const handleStreamingStatusChange = useCallback((isActive: boolean) => {
    setStreamingActive(isActive);
    if (isActive) {
      logMessage('📡 Live streaming activated');
    } else {
      logMessage('📡 Streaming completed');
    }
  }, [logMessage]);

  // Initialize component
  useEffect(() => {
    if (playbook && playbook.trim()) {
      logMessage("🛡️ Enhanced Validation Container initialized");
      logMessage(`📝 Playbook ready for validation (${playbook.length} characters)`);
    }
  }, [playbook, logMessage]);

  // Log profile changes
  useEffect(() => {
    logMessage(`⚙️ Using validation profile: ${selectedProfile}`);
  }, [selectedProfile, logMessage]);

  // Enhanced sidebar props
  const sidebarProps = {
    validationConfig,
    setValidationConfig,
    validationResult,
    loading: validationLoading,
    selectedProfile,
    onProfileChange: handleProfileChange,
    // Enhanced real-time data
    streamingActive,
    currentStep,
    totalSteps,
  };

  // Enhanced panel props  
  const panelProps = {
    playbook,
    validationConfig,
    onLogMessage: logMessage,
    onValidationComplete: handleValidationComplete,
    selectedProfile,
    // Enhanced callbacks
    onValidationStart: handleValidationStart,
    onStepUpdate: handleStepUpdate,
    onStreamingStatusChange: handleStreamingStatusChange,
  };

  return (
    <div className="flex h-full bg-slate-900">
      {/* Enhanced Sidebar with real-time status */}
      <div className="w-80 flex-shrink-0 border-r border-slate-700/50">
        <ValidationSidebar {...sidebarProps} />
      </div>
      
      {/* Enhanced Main Panel with streaming capabilities */}
      <div className="flex-1 p-6 overflow-y-auto">
        <ValidationPanel {...panelProps} />
      </div>
      
      {/* Optional: Real-time status overlay */}
      {streamingActive && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-slate-800/90 backdrop-blur-sm border border-green-500/30 rounded-lg p-3 shadow-lg">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
              <div className="text-sm text-green-300 font-medium">
                Live Validation
              </div>
            </div>
            {currentStep && (
              <div className="text-xs text-slate-400 mt-1">
                Step {currentStep.step}: {currentStep.agent_action === 'lint' ? 'Analyzing' : 'Fixing'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationContainer;