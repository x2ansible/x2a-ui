import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  CodeBracketIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  SparklesIcon,
  BoltIcon,
  WrenchScrewdriverIcon,
  BeakerIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from "@heroicons/react/24/outline";

interface ValidationPanelProps {
  playbook?: string;
  validationConfig?: unknown;
  onLogMessage?: (msg: string) => void;
  onValidationComplete?: (result: unknown) => void;
  selectedProfile?: string;
}

// Enhanced types for streaming validation
interface ValidationStep {
  step: number;
  agent_action: 'lint' | 'llm_fix';
  summary: string;
  code: string;
  message?: string;
  timestamp?: number;
}

// New types for single-result format
interface LintIssue {
  // Legacy format (detailed rule-based issues)
  rule?: string;
  description?: string;
  filename?: string;
  line?: number;
  severity?: 'error' | 'warning';
  raw?: {
    ruleId: string;
    level: string;
    message: { text: string };
    locations: Array<{
      physicalLocation: {
        artifactLocation: { uri: string; uriBaseId: string };
        region: { startLine: number; startColumn?: number };
      };
    }>;
  };
  // New format (general issues)
  type?: string;
  message?: string;
}

interface LintRecommendation {
  issue: string;
  recommendation: string;
}

interface LintSummary {
  passed: boolean;
  violations: number;
  warnings: number;
  total_issues: number;
}

interface SingleLintResult {
  validation_passed: boolean;
  exit_code: number;
  message: string;
  summary: LintSummary;
  issues: LintIssue[];
  recommendations: LintRecommendation[];
  agent_analysis: string;
  raw_output?: {
    cmd?: string;
    stdout?: string;
    stderr?: string;
  };
  playbook_length: number;
  profile: string;
  debug_info: Record<string, unknown>;
  session_info: Record<string, unknown>;
  elapsed_time: number;
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
  // Legacy compatibility
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

const ValidationPanel: React.FC<ValidationPanelProps> = ({
  playbook = "",
  // validationConfig, // Removed as it's assigned but never used
  onLogMessage,
  onValidationComplete,
  selectedProfile = 'basic'
}) => {
  // Debug logging for props
  console.log("[ValidationPanel] Props received:", { selectedProfile, playbookLength: playbook?.length });
  console.log("[ValidationPanel] selectedProfile value:", selectedProfile);
  console.log("[ValidationPanel] selectedProfile type:", typeof selectedProfile);
  // Enhanced state for streaming validation
  const [result, setResult] = useState<StreamingValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setHasValidated] = useState(false); // Removed hasValidated as it's assigned but never used
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [streamingActive, setStreamingActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<ValidationStep | null>(null);
  const [steps, setSteps] = useState<ValidationStep[]>([]);
  
  // UI state
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [showRawOutput, setShowRawOutput] = useState(false);
  const [showCodeComparison, setShowCodeComparison] = useState(false);
  
  const hasLoggedInit = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);

  // Logging
  const logMessage = useCallback(
    (message: string) => {
      if (onLogMessage) onLogMessage(message);
      if (process.env.NODE_ENV !== "production") console.log("[ValidationPanel]", message);
    },
    [onLogMessage]
  );

  // Effects
  useEffect(() => {
    if (!hasLoggedInit.current && playbook && playbook.trim()) {
      logMessage("🛡️ Enhanced Validation Panel initialized");
      hasLoggedInit.current = true;
    }
  }, [logMessage, playbook]);

  useEffect(() => {
    if (result && onValidationComplete) {
      onValidationComplete(result);
      logMessage(` Validation completed: ${result.passed ? 'PASSED' : 'COMPLETED'} with ${result.summary.fixes_applied} fixes`);
    }
  }, [result, onValidationComplete, logMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Enhanced validation function with streaming support
  const handleValidation = useCallback(async () => {
    if (!playbook || !playbook.trim()) {
      setError("No playbook content to validate");
      logMessage("❌ Error: No playbook content");
      return;
    }

    // Reset state
    setResult(null);
    setError(null);
    setProgress(null);
    setLoading(true);
    setHasValidated(true);
    setStreamingActive(true);
    setCurrentStep(null);
    setSteps([]);
    startTimeRef.current = Date.now();

    // Create abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Add timeout - increased for complex validations
    const timeoutId = setTimeout(() => {
      abortController.abort();
      setError("Validation timed out after 10 minutes");
      setLoading(false);
      setStreamingActive(false);
      setProgress(null);
      logMessage("⏱️ Validation timed out");
    }, 600000); // 10 minutes for complex LLM-driven validations

    try {
      logMessage(`🚀 Starting enhanced validation with ${selectedProfile} profile...`);
      logMessage(`🔍 Debug: selectedProfile prop = "${selectedProfile}"`);
      console.log("[ValidationPanel] Starting validation with profile:", selectedProfile);
      console.log("[ValidationPanel] selectedProfile type:", typeof selectedProfile);
      console.log("[ValidationPanel] selectedProfile === 'basic':", selectedProfile === 'basic');
      setProgress("Connecting to validation service...");
      
      const cleanedPlaybook = playbook.trim();
      
      const requestBody = {
        playbook_content: cleanedPlaybook,
        profile: selectedProfile,
      };
      
      logMessage(`🔍 Debug: Request body = ${JSON.stringify(requestBody, null, 2)}`);
      console.log("[ValidationPanel] Request body being sent:", requestBody);
      console.log("[ValidationPanel] selectedProfile in request:", selectedProfile);
      
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
        logMessage("📊 Received direct JSON response");
        
        const enhancedResult = transformToStreamingResult(data, cleanedPlaybook, []);
        setResult(enhancedResult);
        setLoading(false);
        setStreamingActive(false);
        setProgress(null);
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
            logMessage("📊 Stream reading completed");
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
                  logMessage("📊 Received [DONE] signal");
                  streamComplete = true;
                  break;
                }
                data = JSON.parse(dataStr);
              } else {
                data = JSON.parse(trimmedLine);
              }

              // Handle progress messages (legacy format)
              if (data.type === "progress") {
                const step: ValidationStep = {
                  step: data.step || collectedSteps.length + 1,
                  agent_action: data.agent_action || 'lint',
                  summary: data.summary || data.message || '',
                  code: data.code || '',
                  message: data.message,
                  timestamp: Date.now(),
                };

                collectedSteps.push(step);
                setSteps(prev => [...prev, step]);
                setCurrentStep(step);
                
                const action = step.agent_action === 'lint' ? '🔍 Analyzing' : '🔧 Fixing';
                setProgress(`${action} Step ${step.step}...`);
                logMessage(`${action} Step ${step.step}: ${step.message || 'Processing'}`);
              } 
              // Handle new single-result format
              else if (data.type === "result" && data.data) {
                logMessage("📊 Received single validation result");
                const singleResult = data.data as SingleLintResult;
                finalResult = transformSingleResultToStreamingFormat(singleResult, cleanedPlaybook);
                // Don't break here - wait for the "end" signal
                logMessage("📊 Waiting for end signal...");
              }
              // Handle end signal
              else if (data.type === "end") {
                logMessage("📊 Received end signal");
                streamComplete = true;
                break;
              }
              else if (data.type === "final_result" && data.data) {
                logMessage("📊 Received final result");
                finalResult = data.data;
                streamComplete = true;
                break;
              } 
              else if (data.type === "error") {
                throw new Error(data.message || "Validation error occurred");
              }
              // Handle tool execution format
              else if (data.tool === "lint_ansible_playbook" && data.output) {
                logMessage("📊 Received tool execution result");
                finalResult = data;
                streamComplete = true;
                break;
              }
              // Handle direct result format
              else if (data.passed !== undefined || data.final_code !== undefined) {
                logMessage("📊 Received direct validation result");
                finalResult = data;
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
        const enhancedResult = transformToStreamingResult(finalResult, cleanedPlaybook, collectedSteps);
        setResult(enhancedResult);
        setLoading(false);
        setStreamingActive(false);
        setProgress(null);
        logMessage(" Validation completed successfully");
      } else if (collectedSteps.length > 0) {
        // Create result from collected steps
        const lastStep = collectedSteps[collectedSteps.length - 1];
        const mockResult = {
          passed: lastStep.summary.includes('No issues'),
          final_code: lastStep.code || cleanedPlaybook,
          steps: collectedSteps,
        };
        
        const enhancedResult = transformToStreamingResult(mockResult, cleanedPlaybook, collectedSteps);
        setResult(enhancedResult);
        setLoading(false);
        setStreamingActive(false);
        setProgress(null);
      } else {
        throw new Error("Stream ended without providing validation result");
      }
      
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      
      if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
        logMessage("🚫 Validation cancelled");
        return;
      }
      
      const errorMessage = err instanceof Error ? err.message : "Validation failed";
      logMessage(`❌ Validation error: ${errorMessage}`);
      setError(errorMessage);
      setLoading(false);
      setStreamingActive(false);
      setProgress(null);
      setHasValidated(false);
    }
  }, [playbook, selectedProfile, logMessage]);

  // Helper function to transform single-result format to streaming format
  const transformSingleResultToStreamingFormat = (singleResult: SingleLintResult, originalCode: string): StreamingValidationResult => {
    const duration = startTimeRef.current ? Date.now() - startTimeRef.current : undefined;
    
    // Convert each lint issue to a step for UI consistency
    const steps: ValidationStep[] = singleResult.issues.map((issue, index) => {
      // Handle both legacy and new issue formats
      let summary: string;
      let message: string;
      
      if (issue.rule && issue.description) {
        // Legacy format: rule-based issues
        summary = `${issue.rule}: ${issue.description}`;
        message = issue.line ? `Line ${issue.line}: ${issue.description}` : issue.description;
      } else if (issue.type && issue.message) {
        // New format: general issues
        summary = `${issue.type}: ${issue.message}`;
        message = issue.message;
      } else {
        // Fallback
        summary = issue.message || 'Validation issue detected';
        message = issue.message || 'Issue found during validation';
      }
      
      return {
        step: index + 1,
        agent_action: 'lint' as const,
        summary,
        code: originalCode,
        message,
        timestamp: Date.now(),
      };
    });
    
    // Add a summary step if there are issues or if validation failed
    if (singleResult.issues.length > 0 || !singleResult.validation_passed) {
      steps.push({
        step: steps.length + 1,
        agent_action: 'lint' as const,
        summary: singleResult.issues.length > 0 
          ? `Found ${singleResult.summary.total_issues} issues (${singleResult.summary.violations} violations, ${singleResult.summary.warnings} warnings)`
          : singleResult.message || 'Validation completed with issues',
        code: originalCode,
        message: singleResult.message,
        timestamp: Date.now(),
      });
    } else if (singleResult.validation_passed) {
      // Add a success step if validation passed with no issues
      steps.push({
        step: steps.length + 1,
        agent_action: 'lint' as const,
        summary: 'Validation passed - No issues found',
        code: originalCode,
        message: 'Playbook validation completed successfully',
        timestamp: Date.now(),
      });
    }
    
    // Safely handle raw_output which might be undefined or missing properties
    const rawOutput = singleResult.raw_output || {};
    const stdout = rawOutput.stdout || '';
    const stderr = rawOutput.stderr || '';
    const rawOutputText = stdout + (stderr ? '\n' + stderr : '');
    
    // Store the actual backend response for parsing lint details
    const actualRawOutput = singleResult.agent_analysis || rawOutputText || singleResult.message || '';
    
    return {
      passed: singleResult.validation_passed,
      final_code: originalCode, // No auto-fixing in new format
      original_code: originalCode,
      steps: steps,
      total_steps: steps.length,
      duration_ms: duration,
      summary: {
        fixes_applied: 0, // No auto-fixing in new format
        lint_iterations: 1,
        final_status: singleResult.validation_passed ? 'passed' : 'failed',
      },
      // Legacy compatibility
      issues: singleResult.issues,
      raw_output: actualRawOutput, // Store actual backend response for parsing
      debug_info: {
        status: singleResult.validation_passed ? "passed" : "failed",
        playbook_length: originalCode.length,
        steps_completed: steps.length,
        lint_iterations: 1,
        fixes_applied: 0,
        exit_code: singleResult.exit_code,
        profile: singleResult.profile,
      },
      error_message: singleResult.validation_passed ? undefined : singleResult.message,
    };
  };

  // Helper function to transform backend response to enhanced result
  const transformToStreamingResult = (data: unknown, originalCode: string, streamSteps: ValidationStep[]): StreamingValidationResult => {
    const dataObj = data as Record<string, unknown>;
    const steps = (dataObj.steps as ValidationStep[]) || streamSteps || [];
    const finalCode = (dataObj.final_code as string) || originalCode;
    const duration = startTimeRef.current ? Date.now() - startTimeRef.current : undefined;
    
    const lintSteps = steps.filter((s: ValidationStep) => s.agent_action === 'lint');
    const fixSteps = steps.filter((s: ValidationStep) => s.agent_action === 'llm_fix');
    
    // Store the actual backend response for parsing lint details
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
      // Legacy compatibility
      issues: steps.filter((s: ValidationStep) => s.agent_action === 'lint' && s.summary.includes('Failed')),
      raw_output: actualRawOutput, // Store actual backend response instead of UI summaries
      debug_info: {
        status: (dataObj.passed as boolean) ? "passed" : "failed",
        playbook_length: originalCode.length,
        steps_completed: steps.length,
        lint_iterations: lintSteps.length,
        fixes_applied: fixSteps.length,
      },
      error_message: (dataObj.passed as boolean) ? undefined : "Validation completed with fixes applied",
    };
  };

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      setStreamingActive(false);
      setProgress(null);
      logMessage("🚫 Validation cancelled by user");
    }
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
    setHasValidated(false);
    setCurrentStep(null);
    setSteps([]);
    setExpandedSteps(new Set());
    setShowRawOutput(false);
    setShowCodeComparison(false);
    abortControllerRef.current = null;
    
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
      logMessage(" Copied to clipboard");
    } catch {
      logMessage("❌ Failed to copy to clipboard");
    }
  };

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
    return names[profile as keyof typeof names] || 'Production';
  };

  // Render functions
  const renderValidationSummary = () => {
    if (!result) return null;
    
    const { passed, summary, total_steps, duration_ms } = result;
    
    return (
      <div
        className={`rounded-xl border p-6 transition-all duration-500 backdrop-blur-sm ${
          passed
            ? "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/30 shadow-lg shadow-emerald-500/10"
            : "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 shadow-lg shadow-amber-500/10"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl transition-all duration-300 backdrop-blur-sm ${passed ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
              {passed ? (
                <CheckCircleIcon className="w-8 h-8 text-emerald-400" style={{animation: 'bounce 1s ease-in-out'}} />
              ) : (
                <SparklesIcon className="w-8 h-8 text-amber-400" style={{animation: 'pulse 2s infinite'}} />
              )}
            </div>
            <div>
              <h3 className={`font-bold text-xl transition-colors duration-300 ${passed ? "text-emerald-300" : "text-amber-300"}`}>
                {passed ? "✨ Validation Passed!" : "🔍 Issues Found"}
              </h3>
              <div className="text-sm text-slate-400">
                Profile: <span className="font-medium text-slate-200">{getProfileDisplayName(selectedProfile)}</span> • 
                Steps: <span className="font-medium text-slate-200">{total_steps}</span> • 
                Issues: <span className="font-medium text-amber-300">{summary.lint_iterations}</span>
                {duration_ms && <span> • Duration: <span className="font-medium text-blue-300">{duration_ms}ms</span></span>}
              </div>
            </div>
          </div>
          <button
            onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
            className="text-slate-400 hover:text-slate-200 transition-colors p-2 rounded-lg hover:bg-slate-700/30 backdrop-blur-sm"
            title="Copy full validation result"
          >
            <ClipboardDocumentIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-lg bg-slate-800/30 border border-slate-600/20 transition-all duration-300 hover:bg-slate-700/30 backdrop-blur-sm">
            <div className="text-slate-200 text-2xl font-bold">{total_steps}</div>
            <div className="text-xs text-slate-400">Total Steps</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 transition-all duration-300 hover:bg-amber-500/20 backdrop-blur-sm">
            <div className="text-amber-400 text-2xl font-bold">{total_steps - (passed ? 1 : 0)}</div>
            <div className="text-xs text-slate-400">Issues Found</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 transition-all duration-300 hover:bg-blue-500/20 backdrop-blur-sm">
            <div className="text-blue-400 text-2xl font-bold">{summary.lint_iterations}</div>
            <div className="text-xs text-slate-400">Lint Checks</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 transition-all duration-300 hover:bg-emerald-500/20 backdrop-blur-sm">
            <div className={`text-2xl font-bold ${passed ? 'text-emerald-400' : 'text-amber-400'}`}>
              {passed ? '✓' : '🔍'}
            </div>
            <div className="text-xs text-slate-400">Final Status</div>
          </div>
        </div>
      </div>
    );
  };

  const renderStreamingSteps = () => {
    if (!steps || steps.length === 0) return null;

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
              onClick={() => setExpandedSteps(new Set(steps.map((s, i) => `${s.step}-${s.agent_action}-${i}`)))}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={() => setExpandedSteps(new Set())}
              className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
        
        {/* OLED-friendly scrollbar styling */}
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 validation-scrollbar">
          {steps.map((step, index) => {
            // Create unique key using both index and step data to avoid duplicates
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
                  onClick={() => toggleStepExpansion(uniqueKey)}
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
                          {step.message || step.summary.split('\n')[0]}
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
                        {step.summary}
                      </pre>
                    </div>
                    
                    {step.code && (
                      <div className="bg-slate-900/70 rounded-lg p-3 border border-slate-600/30 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-medium text-slate-300">
                            {step.agent_action === 'lint' ? 'Analyzed Code' : 'Fixed Code'}
                          </h5>
                          <button
                            onClick={() => copyToClipboard(step.code)}
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

  const renderCodeComparison = () => {
    if (!result || !showCodeComparison) return null;
    
    const { original_code, final_code } = result;
    
    return (
      <div className="bg-slate-800/40 rounded-lg border border-slate-600/30 p-4 backdrop-blur-sm" style={{animation: 'fadeIn 0.5s ease-out'}}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-slate-200 flex items-center space-x-2">
            <CodeBracketIcon className="w-4 h-4 text-slate-400" />
            <span>Before & After Comparison</span>
          </h4>
          <button
            onClick={() => copyToClipboard(`ORIGINAL:\n${original_code}\n\nFIXED:\n${final_code}`)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Copy Both
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <h5 className="text-sm font-medium text-red-300">Original Code</h5>
            </div>
            <div className="bg-slate-900/70 rounded-lg p-3 border border-red-500/30 backdrop-blur-sm">
              <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono overflow-x-auto max-h-64 validation-scrollbar">
                {original_code}
              </pre>
            </div>
          </div>
          
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <h5 className="text-sm font-medium text-green-300">Fixed Code</h5>
            </div>
            <div className="bg-slate-900/70 rounded-lg p-3 border border-green-500/30 backdrop-blur-sm">
              <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono overflow-x-auto max-h-64 validation-scrollbar">
                {final_code}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLintReport = () => {
    if (!result || !showRawOutput) return null;
    
    // Extract lint issues from the result
    const lintIssues = result.issues || [];
    
    // Parse raw output to extract detailed lint information
    const parseRawOutput = (rawOutput: string) => {
      const detailedIssues: Array<{
        rule: string;
        description: string;
        line?: number;
        severity: 'error' | 'warning';
      }> = [];
      
      // Look for specific lint rule patterns in the raw output
      const lines = rawOutput.split('\n');
      for (const line of lines) {
        // Match patterns like: yaml[truthy]: Truthy value should be one of [false, true]
        const ruleMatch = line.match(/([a-zA-Z_]+\[[^\]]+\]):\s*(.+)/);
        if (ruleMatch) {
          detailedIssues.push({
            rule: ruleMatch[1],
            description: ruleMatch[2].trim(),
            severity: 'error'
          });
        }
        
        // Match patterns like: /path/to/file.yml:4: [yaml[truthy]] Truthy value should be one of [false, true]
        const fileLineMatch = line.match(/([^:]+):(\d+):\s*\[([^\]]+)\]\s*(.+)/);
        if (fileLineMatch) {
          detailedIssues.push({
            rule: fileLineMatch[3],
            description: fileLineMatch[4].trim(),
            line: parseInt(fileLineMatch[2]),
            severity: 'error'
          });
        }
        
        // Match patterns like: yaml[new-line-at-end-of-file]: No new line character at the end of file
        const simpleRuleMatch = line.match(/([a-zA-Z_]+\[[^\]]+\]):\s*(.+)/);
        if (simpleRuleMatch && !detailedIssues.some(issue => issue.rule === simpleRuleMatch[1])) {
          detailedIssues.push({
            rule: simpleRuleMatch[1],
            description: simpleRuleMatch[2].trim(),
            severity: 'error'
          });
        }
      }
      
      return detailedIssues;
    };
    
    const detailedIssues = parseRawOutput(result.raw_output);
    const hasDetailedIssues = detailedIssues.length > 0;
    
    return (
      <div className="bg-slate-800/40 rounded-lg border border-slate-600/30 p-4 backdrop-blur-sm" style={{animation: 'fadeIn 0.5s ease-out'}}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-slate-200 flex items-center space-x-2">
            <DocumentTextIcon className="w-4 h-4 text-slate-400" />
            <span>Detailed Lint Report</span>
          </h4>
          <button
            onClick={() => copyToClipboard(result.raw_output)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Copy Full Output
          </button>
        </div>
        
        {hasDetailedIssues ? (
          <div className="space-y-3">
            {detailedIssues.map((issue, index) => (
              <div key={index} className="bg-slate-900/70 rounded-lg p-3 border border-red-500/30 backdrop-blur-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      <span className="text-sm font-medium text-red-300">
                        {issue.rule}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        issue.severity === 'error' 
                          ? 'bg-red-500/20 text-red-300' 
                          : 'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {issue.severity}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 mb-1">
                      {issue.description}
                    </p>
                    {issue.line && (
                      <p className="text-xs text-slate-400">
                        Line {issue.line}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : lintIssues.length > 0 ? (
          <div className="space-y-3">
            {lintIssues.map((issue: unknown, index: number) => {
              const lintIssue = issue as LintIssue;
              return (
                <div key={index} className="bg-slate-900/70 rounded-lg p-3 border border-red-500/30 backdrop-blur-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        <span className="text-sm font-medium text-red-300">
                          {lintIssue.rule || lintIssue.type || 'Lint Issue'}
                        </span>
                        {lintIssue.severity && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            lintIssue.severity === 'error' 
                              ? 'bg-red-500/20 text-red-300' 
                              : 'bg-yellow-500/20 text-yellow-300'
                          }`}>
                            {lintIssue.severity}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-300 mb-1">
                        {lintIssue.description || lintIssue.message}
                      </p>
                      {lintIssue.line && (
                        <p className="text-xs text-slate-400">
                          Line {lintIssue.line}
                          {lintIssue.filename && ` in ${lintIssue.filename}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-slate-900/70 rounded-lg p-4 border border-slate-600/30 backdrop-blur-sm">
            <p className="text-sm text-slate-400 text-center">No detailed lint issues available</p>
          </div>
        )}
        
        {/* Show raw output as well for debugging */}
        <div className="mt-4">
          <h5 className="text-sm font-medium text-slate-300 mb-2">Raw Output</h5>
          <div className="bg-slate-900/70 rounded-lg p-3 border border-slate-600/30 backdrop-blur-sm">
            <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto max-h-32 validation-scrollbar">
              {result.raw_output || 'No raw output available'}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  const renderRawOutput = () => {
    if (!result || !showRawOutput) return null;
    
    return (
      <div className="bg-slate-800/40 rounded-lg border border-slate-600/30 p-4 backdrop-blur-sm" style={{animation: 'fadeIn 0.5s ease-out'}}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-slate-200 flex items-center space-x-2">
            <DocumentTextIcon className="w-4 h-4 text-slate-400" />
            <span>Raw Debug Output</span>
          </h4>
          <button
            onClick={() => copyToClipboard(result.raw_output)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Copy Output
          </button>
        </div>
        
        <div className="bg-slate-900/70 rounded-lg p-4 border border-slate-600/30 backdrop-blur-sm">
          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto max-h-64 validation-scrollbar">
            {result.raw_output || 'No raw output available'}
          </pre>
        </div>
      </div>
    );
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
            <h2 className="text-slate-100 font-bold text-xl">Enhanced Playbook Validation</h2>
            <div className="text-xs text-slate-400">Real-time Ansible Lint Analysis & Auto-Fix</div>
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
                <span>Validating & Fixing...</span>
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
          {renderValidationSummary()}
          {renderStreamingSteps()}
          
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
          
          {renderCodeComparison()}
          {renderLintReport()}
          {renderRawOutput()}
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