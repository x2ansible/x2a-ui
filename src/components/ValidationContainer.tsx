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
  
  // Validation result state (managed by the panel via hook)
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validationLoading, setValidationLoading] = useState(false);

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

  // Handle validation completion from panel
  const handleValidationComplete = useCallback((result: unknown) => {
    setValidationResult(result);
    setValidationLoading(false);
    
    // Log validation summary
    if (result) {
      const status = result.passed ? "PASSED" : "FAILED";
      const issueCount = result.issues?.length || 0;
      const errorCount = result.debug_info?.error_count || 0;
      const warningCount = result.debug_info?.warning_count || 0;
      
      logMessage(`📊 Validation ${status}: ${issueCount} issues (${errorCount} errors, ${warningCount} warnings)`);
      
      if (result.debug_info?.exit_code) {
        logMessage(`🔍 Exit code: ${result.debug_info.exit_code}`);
      }
    }
  }, [logMessage]);

  // Log when validation starts
  const handleValidationStart = useCallback(() => {
    setValidationLoading(true);
    logMessage(`🚀 Starting validation with ${selectedProfile} profile`);
  }, [selectedProfile, logMessage]);

  // Initialize component
  useEffect(() => {
    if (playbook && playbook.trim()) {
      logMessage("🛡️ Validation Container initialized");
      logMessage(`📝 Playbook ready for validation (${playbook.length} characters)`);
    }
  }, [playbook, logMessage]);

  // Log profile changes
  useEffect(() => {
    logMessage(`⚙️ Using validation profile: ${selectedProfile}`);
  }, [selectedProfile, logMessage]);

  return (
    <div className="flex h-full bg-slate-900">
      {/* Sidebar - Connected to profile selection */}
      <div className="w-80 flex-shrink-0">
        <ValidationSidebar
          validationConfig={validationConfig}
          setValidationConfig={setValidationConfig}
          validationResult={validationResult}
          loading={validationLoading}
          selectedProfile={selectedProfile}
          onProfileChange={handleProfileChange}
        />
      </div>
      
      {/* Main Panel - Uses selected profile */}
      <div className="flex-1 p-6 overflow-y-auto">
        <ValidationPanel
          playbook={playbook}
          validationConfig={validationConfig}
          onLogMessage={logMessage}
          onValidationComplete={handleValidationComplete}
          selectedProfile={selectedProfile}
        />
      </div>
    </div>
  );
};

export default ValidationContainer;