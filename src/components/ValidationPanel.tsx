import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  CodeBracketIcon,
  ArrowPathIcon,
  SparklesIcon,
  BoltIcon,
  SignalIcon,
} from "@heroicons/react/24/outline";

// Import the new components
import ValidationSummary from './ValidationSummary';
import ValidationSteps from './ValidationSteps';
import ValidationReports from './ValidationReports';

// Define types inline to avoid import issues
interface ValidationStep {
  step: number;
  agent_action: 'lint' | 'llm_fix';
  summary: string;
  code: string;
  message?: string;
  timestamp?: number;
}

interface StreamingValidationResult {
  passed: boolean;
  final_code: string;
  original_code: string;
  steps: ValidationStep[];
  total_steps: number;
  summary: {
    fixes_applied: number;
    lint_iterations: number;
    final_status: 'passed' | 'failed';
  };
  duration_ms?: number;
  issues: unknown[];
  raw_output: string;
  debug_info: {
    status: string;
    playbook_length: number;
    steps_completed: number;
    [key: string]: unknown;
  };
  error_message?: string;
}

interface ValidationPanelProps {
  playbook?: string;
  validationConfig?: unknown;
  onLogMessage?: (msg: string) => void;
  onValidationComplete?: (result: unknown) => void;
  selectedProfile?: string;
}

const ValidationPanel: React.FC<ValidationPanelProps> = ({
  playbook = "",
  onLogMessage,
  onValidationComplete,
  selectedProfile = 'basic'
}) => {
  // State for streaming validation
  const [result, setResult] = useState<StreamingValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [streamingActive, setStreamingActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<ValidationStep | null>(null);
  const [steps, setSteps] = useState<ValidationStep[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [showRawOutput, setShowRawOutput] = useState(false);
  const [showCodeComparison, setShowCodeComparison] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastValidationTimeRef = useRef<number>(0);
  const isRequestInProgressRef = useRef<boolean>(false);

  const logMessage = useCallback((msg: string) => {
    console.log(`[ValidationPanel] ${msg}`);
    onLogMessage?.(msg);
  }, [onLogMessage]);

  // Initialize
  useEffect(() => {
    logMessage("🛡️ Validation Panel initialized");
  }, [logMessage]);

  // Helper function to transform single-result format to streaming format
  const transformSingleResultToStreamingFormat = useCallback((singleResult: any, originalCode: string): StreamingValidationResult => {
    const duration = startTimeRef.current ? Date.now() - startTimeRef.current : undefined;
    
    console.log('🔍 Raw singleResult:', singleResult);
    
    // Handle different response formats
    let actualResult = singleResult;
    
    // If the result contains a function call structure, extract the real data
    if (singleResult && typeof singleResult === 'object') {
      // Check if it's a function call response
      if (singleResult.type === 'function' && singleResult.parameters?.playbook_code) {
        console.log('⚠️ Received function call format, backend may not have processed correctly');
        // This suggests the backend returned a function call instead of results
        return {
          passed: false,
          final_code: originalCode,
          original_code: originalCode,
          steps: [{
            step: 1,
            agent_action: 'lint' as const,
            summary: 'Backend returned function call format instead of lint results',
            code: originalCode,
            message: 'Please check backend validation endpoint',
            timestamp: Date.now(),
          }],
          total_steps: 1,
          duration_ms: duration,
          summary: {
            fixes_applied: 0,
            lint_iterations: 1,
            final_status: 'failed',
          },
          issues: [],
          raw_output: JSON.stringify(singleResult, null, 2),
          debug_info: {
            status: "failed",
            playbook_length: originalCode.length,
            steps_completed: 1,
            lint_iterations: 1,
            fixes_applied: 0,
            issues_count: 0,
            agent_response: 'Backend returned unexpected function call format',
          },
          error_message: 'Backend validation endpoint returned unexpected format',
        };
      }
      
      // Handle normal response format
      actualResult = singleResult.data || singleResult;
    }
    
    // Extract validation results from the actual result
    const passed = actualResult?.passed === true || actualResult?.validation_passed === true;
    const summary = actualResult?.summary || actualResult?.message || '';
    const issues = actualResult?.issues || [];
    const issuesCount = actualResult?.issues_count || issues.length || 0;
    const agentResponse = actualResult?.agent_response || actualResult?.agent_analysis || '';
    
    console.log('🔍 Parsed result:', { passed, issuesCount, agentResponse: agentResponse?.substring(0, 100) });
    
    // Create steps array
    const steps: ValidationStep[] = [{
      step: 1,
      agent_action: 'lint' as const,
      summary: passed ? 'Validation passed - No issues found' : `Found ${issuesCount} issue(s)`,
      code: originalCode,
      message: passed ? 'Playbook validation completed successfully' : summary,
      timestamp: Date.now(),
    }];
    
    return {
      passed: passed,
      final_code: originalCode,
      original_code: originalCode,
      steps: steps,
      total_steps: steps.length,
      duration_ms: duration,
      summary: {
        fixes_applied: 0,
        lint_iterations: 1,
        final_status: passed ? 'passed' : 'failed',
      },
      issues: issues,
      raw_output: summary || JSON.stringify(actualResult, null, 2),
      debug_info: {
        status: passed ? "passed" : "failed",
        playbook_length: originalCode.length,
        steps_completed: steps.length,
        lint_iterations: 1,
        fixes_applied: 0,
        issues_count: issuesCount,
        agent_response: agentResponse,
      },
      error_message: passed ? undefined : summary,
    };
  }, []);

  // Helper function to transform backend response to enhanced result
  const transformToStreamingResult = useCallback((data: unknown, originalCode: string, streamSteps: ValidationStep[]): StreamingValidationResult => {
    const dataObj = data as Record<string, unknown>;
    const steps = (dataObj.steps as ValidationStep[]) || streamSteps || [];
    const finalCode = (dataObj.final_code as string) || originalCode;
    const duration = startTimeRef.current ? Date.now() - startTimeRef.current : undefined;
    
    const lintSteps = steps.filter((s: ValidationStep) => s.agent_action === 'lint');
    const fixSteps = steps.filter((s: ValidationStep) => s.agent_action === 'llm_fix');
    
    const issuesCount = (dataObj.issues_count as number) || 0;
    const actualRawOutput = dataObj.raw_output as string || dataObj.agent_analysis as string || '';
    
    return {
      passed: (dataObj.passed as boolean) || false,
      final_code: finalCode,
      original_code: originalCode,
      steps: steps,
      total_steps: steps.length,
      duration_ms: duration,
      summary: {
        fixes_applied: fixSteps.length,
        lint_iterations: lintSteps.length,
        final_status: (dataObj.passed as boolean) ? 'passed' : 'failed',
      },
      issues: (dataObj.issues as unknown[]) || [],
      raw_output: actualRawOutput,
      debug_info: {
        status: (dataObj.passed as boolean) ? "passed" : "failed",
        playbook_length: originalCode.length,
        steps_completed: steps.length,
        lint_iterations: lintSteps.length,
        fixes_applied: fixSteps.length,
        issues_count: issuesCount,
        agent_response: dataObj.agent_response as string || '',
      },
      error_message: (dataObj.passed as boolean) ? undefined : "Validation completed with fixes applied",
    };
  }, []);

  // Main validation function
  const handleValidation = useCallback(async () => {
    if (!playbook || !playbook.trim()) {
      setError("No playbook content to validate");
      return;
    }

    // Prevent multiple simultaneous requests
    if (loading || isRequestInProgressRef.current) {
      logMessage(`⚠️ Validation already in progress, ignoring duplicate request`);
      return;
    }

    // Debounce rapid clicking
    const now = Date.now();
    if (now - lastValidationTimeRef.current < 2000) {
      logMessage("⚠️ Validation requested too quickly, ignoring duplicate request");
      return;
    }
    lastValidationTimeRef.current = now;

    // Set loading state immediately
    setLoading(true);
    isRequestInProgressRef.current = true;
    logMessage(`🔒 Starting validation with ${selectedProfile} profile`);
    
    // Reset state
    setResult(null);
    setError(null);
    setProgress(null);
    setStreamingActive(false);
    setCurrentStep(null);
    setSteps([]);
    setExpandedSteps(new Set());
    setShowRawOutput(false);
    setShowCodeComparison(false);

    const startTime = Date.now();
    startTimeRef.current = startTime;

    // Create abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Add timeout
    const timeoutId = setTimeout(() => {
      abortController.abort();
      logMessage("⏱️ Validation timed out");
    }, 600000); // 10 minutes

    try {
      setProgress("Connecting to validation service...");
      
      const cleanedPlaybook = playbook.trim();
      
      // Match the exact structure from working curl (remove profile)
      const requestBody = {
        playbook_content: cleanedPlaybook
      };
      
      const response = await fetch("/api/validate/playbook/stream", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Validation failed: ${response.status} - ${errorText}`);
      }

      const contentType = response.headers.get("content-type");
      
      if (contentType?.includes("application/json")) {
        setProgress("Processing validation results...");
        const data = await response.json();
        const result = transformSingleResultToStreamingFormat(data, cleanedPlaybook);
        setResult(result);
        setProgress(null);
        setLoading(false);
        isRequestInProgressRef.current = false;
        onValidationComplete?.(result);
        return;
      }

      if (!contentType?.includes("text/event-stream")) {
        throw new Error(`Unexpected content type: ${contentType}`);
      }

      if (!response.body) {
        throw new Error("No response body from backend");
      }

      setProgress("Processing streaming response...");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const collectedSteps: ValidationStep[] = [];
      let finalResult = null;
      let streamComplete = false;

      try {
        while (!streamComplete) {
          const { done, value } = await reader.read();
          
          if (done) {
            streamComplete = true;
            break;
          }
          
          if (!value) continue;
          
          buffer += decoder.decode(value, { stream: true });
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            try {
              let data;
              
              if (trimmedLine.startsWith('data: ')) {
                const dataStr = trimmedLine.slice(6);
                if (dataStr === '[DONE]') {
                  streamComplete = true;
                  break;
                }
                data = JSON.parse(dataStr);
              } else {
                data = JSON.parse(trimmedLine);
              }

              // Handle error messages from backend
              if (data.type === "error") {
                logMessage(`❌ Backend error: ${data.error}`);
                throw new Error(`Backend validation error: ${data.error}`);
              }

              // Handle single-result format (like from your curl)
              if (data.type === "result" && data.data) {
                logMessage("📊 Received single validation result");
                finalResult = data.data;
                streamComplete = true;
                break;
              }
              // Handle end signal
              else if (data.type === "end") {
                logMessage("📊 Received end signal");
                streamComplete = true;
                break;
              }
            } catch (parseError) {
              console.warn("Failed to parse line:", trimmedLine, parseError);
              continue;
            }
          }
        }
      } finally {
        try {
          reader.releaseLock();
        } catch (lockError) {
          console.warn("Error releasing reader lock:", lockError);
        }
      }

      // Process final result
      if (finalResult) {
        const result = transformSingleResultToStreamingFormat(finalResult, cleanedPlaybook);
        setResult(result);
        setLoading(false);
        setStreamingActive(false);
        setProgress(null);
        isRequestInProgressRef.current = false;
        onValidationComplete?.(result);
        return;
      }

    } catch (error: unknown) {
      clearTimeout(timeoutId);
      
      if ((error as Error).name === 'AbortError') {
        logMessage("🚫 Validation was cancelled");
        setProgress("Validation cancelled");
        setLoading(false);
        setStreamingActive(false);
        isRequestInProgressRef.current = false;
        return;
      }

      const errorMessage = (error as Error).message || "Validation failed";
      console.error("[ValidationPanel] Validation error:", errorMessage);
      
      if (errorMessage.includes('network error') || errorMessage.includes('ERR_INCOMPLETE_CHUNKED_ENCODING')) {
        setError("Network connection error. Please check your connection and try again.");
      } else if (errorMessage.includes('504 Gateway Time-out')) {
        setError("Backend timeout. The validation service is taking too long to respond. Please try again.");
      } else {
        setError(errorMessage);
      }
      
      setLoading(false);
      setStreamingActive(false);
      setProgress(null);
      isRequestInProgressRef.current = false;
    }
  }, [playbook, selectedProfile, logMessage, onValidationComplete, loading, transformSingleResultToStreamingFormat]);

  const handleCancel = useCallback(() => {
    logMessage("🚫 User requested validation cancellation");
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      logMessage("✅ Abort signal sent to ongoing request");
    }
    
    setLoading(false);
    setStreamingActive(false);
    setProgress("Validation cancelled");
    isRequestInProgressRef.current = false;
    
    if (startTimeRef.current) {
      startTimeRef.current = 0;
    }
    
    logMessage("🚫 Validation cancelled by user");
  }, [logMessage]);

  const handleReset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setResult(null);
    setError(null);
    setProgress(null);
    setLoading(false);
    setStreamingActive(false);
    setCurrentStep(null);
    setSteps([]);
    setExpandedSteps(new Set());
    setShowRawOutput(false);
    setShowCodeComparison(false);
    abortControllerRef.current = null;
    isRequestInProgressRef.current = false;
    
    logMessage("🔄 Validation state reset");
  }, [logMessage]);

  // UI Helper Functions
  const toggleStepExpansion = (uniqueKey: string) => {
    setExpandedSteps(prev => {
      const copy = new Set(prev);
      if (copy.has(uniqueKey)) {
        copy.delete(uniqueKey);
      } else {
        copy.add(uniqueKey);
      }
      return copy;
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      logMessage("📋 Copied to clipboard");
    } catch {
      logMessage("❌ Failed to copy to clipboard");
    }
  };

  const getProfileColor = (profile: string) => {
    switch (profile) {
      case 'minimal': return 'from-emerald-500 to-teal-400';
      case 'basic': return 'from-blue-500 to-indigo-400';
      case 'safety': return 'from-amber-500 to-yellow-400';
      case 'test': return 'from-violet-500 to-purple-400';
      case 'production': return 'from-red-500 to-rose-400';
      default: return 'from-blue-500 to-indigo-400';
    }
  };

  const getProfileDisplayName = (profile: string) => {
    const names = {
      'minimal': 'Minimal',
      'basic': 'Basic', 
      'safety': 'Safety',
      'test': 'Test',
      'production': 'Production'
    };
    return names[profile as keyof typeof names] || 'Basic';
  };

  // Main render
  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900/95 rounded-lg p-6 shadow-2xl backdrop-blur-sm border border-slate-700/50 
                    max-h-screen overflow-y-auto validation-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm">
            <ShieldCheckIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-slate-100 font-bold text-xl">Playbook Validation</h2>
            <div className="text-xs text-slate-400">Real-time Ansible Lint Analysis</div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 rounded-lg border border-slate-600/50 backdrop-blur-sm">
            <Cog6ToothIcon className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-300">Profile:</span>
            <span className="text-sm font-medium text-slate-100">{getProfileDisplayName(selectedProfile)}</span>
          </div>
          <div className={`w-8 h-1 rounded-full bg-gradient-to-r ${getProfileColor(selectedProfile)}`}></div>
        </div>
      </div>

      {/* Validation Controls */}
      <div className="flex gap-3 mb-6">
        <button
          className={`flex-1 py-3 rounded-lg font-semibold text-white transition-all duration-300 transform backdrop-blur-sm ${
            loading
              ? "bg-gradient-to-r from-slate-600/50 to-slate-500/50 cursor-not-allowed scale-95"
              : result?.passed
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:scale-105 shadow-lg shadow-emerald-500/20"
              : result && !result.passed
              ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:scale-105 shadow-lg shadow-amber-500/20"
              : "bg-gradient-to-r from-indigo-500 to-violet-500 hover:scale-105 shadow-lg shadow-indigo-500/20"
          }`}
          onClick={handleValidation}
          disabled={loading || !playbook || !playbook.trim()}
        >
          <div className="flex items-center justify-center space-x-2">
            {loading ? (
              <>
                <ArrowPathIcon className="w-5 h-5" style={{animation: 'spin 1s linear infinite'}} />
                <span>Validating...</span>
              </>
            ) : result ? (
              <>
                <SparklesIcon className="w-4 h-4" />
                <span>Re-validate Playbook</span>
              </>
            ) : (
              <>
                <ShieldCheckIcon className="w-4 h-4" />
                <span>Validate Playbook</span>
              </>
            )}
          </div>
        </button>
        
        {loading && (
          <button
            onClick={handleCancel}
            className="px-4 py-3 rounded-lg font-semibold text-red-300 border border-red-500/30 hover:bg-red-500/10 transition-colors backdrop-blur-sm"
          >
            Cancel
          </button>
        )}
        
        {(result || error) && !loading && (
          <button
            onClick={handleReset}
            className="px-4 py-3 rounded-lg font-semibold text-slate-300 border border-slate-600/50 hover:bg-slate-700/30 transition-colors backdrop-blur-sm"
          >
            Reset
          </button>
        )}
      </div>

      {/* Progress Indicator */}
      {progress && (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl backdrop-blur-sm" style={{animation: 'fadeIn 0.5s ease-out'}}>
          <div className="flex items-center space-x-2">
            <ArrowPathIcon className="w-5 h-5 text-blue-400" style={{animation: 'spin 1s linear infinite'}} />
            <div className="text-blue-300 text-sm">{progress}</div>
            {streamingActive && (
              <div className="flex items-center space-x-2 ml-4">
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-green-400 rounded-full" style={{animation: 'bounce 1.4s ease-in-out infinite'}}></div>
                  <div className="w-1 h-1 bg-green-400 rounded-full" style={{animation: 'bounce 1.4s ease-in-out infinite', animationDelay: '0.1s'}}></div>
                  <div className="w-1 h-1 bg-green-400 rounded-full" style={{animation: 'bounce 1.4s ease-in-out infinite', animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-xs text-green-400">Streaming</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/30 rounded-xl backdrop-blur-sm" style={{animation: 'fadeIn 0.5s ease-out'}}>
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
            <div>
              <div className="text-red-300 font-medium">Validation Failed</div>
              <div className="text-red-400/80 text-sm mt-1">{error}</div>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="mt-3 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Clear Error & Try Again
          </button>
        </div>
      )}

      {/* No Playbook State */}
      {!playbook || !playbook.trim() ? (
        <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-600/30 backdrop-blur-sm">
          <ShieldCheckIcon className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-300 mb-2">No Playbook Available</h3>
          <div className="text-slate-400 mb-4">Generate a playbook first to validate it</div>
          <div className="text-sm text-slate-500">
            Go to the <strong>Convert</strong> step to generate an Ansible playbook
          </div>
        </div>
      ) : (
        <div className="space-y-6 pb-20">
          {/* Validation Summary */}
          {result && (
            <ValidationSummary
              result={result}
              selectedProfile={selectedProfile}
              onCopyResult={() => copyToClipboard(JSON.stringify(result, null, 2))}
            />
          )}

          {/* Validation Steps */}
          <ValidationSteps
            steps={steps}
            streamingActive={streamingActive}
            currentStep={currentStep}
            expandedSteps={expandedSteps}
            onToggleExpansion={toggleStepExpansion}
            onExpandAll={() => setExpandedSteps(new Set(steps.map((s, i) => `${s.step}-${s.agent_action}-${i}`)))}
            onCollapseAll={() => setExpandedSteps(new Set())}
            onCopyCode={copyToClipboard}
          />
          
          {/* Action Buttons */}
          {result && (
            <div className="flex items-center justify-between py-4 border-t border-slate-700/50 mt-6 backdrop-blur-sm">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowCodeComparison(!showCodeComparison)}
                  className="text-sm text-green-400 hover:text-green-300 transition-colors flex items-center space-x-2"
                >
                  <CodeBracketIcon className="w-4 h-4" />
                  <span>{showCodeComparison ? 'Hide' : 'Show'} Code Comparison</span>
                </button>
                
                <button
                  onClick={() => setShowRawOutput(!showRawOutput)}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center space-x-2"
                >
                  <DocumentTextIcon className="w-4 h-4" />
                  <span>{showRawOutput ? 'Hide' : 'Show'} Raw Output</span>
                </button>
                
                <button
                  onClick={() => copyToClipboard(result.final_code)}
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center space-x-2"
                >
                  <ClipboardDocumentIcon className="w-4 h-4" />
                  <span>Copy Fixed Code</span>
                </button>
              </div>
            </div>
          )}
          
          {/* Validation Reports */}
          {result && (
            <ValidationReports
              result={result}
              showCodeComparison={showCodeComparison}
              showRawOutput={showRawOutput}
              onCopyText={copyToClipboard}
            />
          )}
        </div>
      )}
      
      {/* Real-time status overlay */}
      {streamingActive && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-slate-800/90 backdrop-blur-sm border border-green-500/30 rounded-lg p-3 shadow-lg">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full" style={{animation: 'bounce 1s infinite'}}></div>
                <div className="w-2 h-2 bg-green-400 rounded-full" style={{animation: 'bounce 1s infinite', animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-green-400 rounded-full" style={{animation: 'bounce 1s infinite', animationDelay: '0.2s'}}></div>
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

export default ValidationPanel;