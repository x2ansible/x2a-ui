import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlayIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  EyeIcon,
  EyeSlashIcon,
  CodeBracketIcon,
  InformationCircleIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";

// --- Types ---
interface ValidationPanelProps {
  playbook?: string;
  validationConfig?: unknown;
  onLogMessage?: (msg: string) => void;
  onValidationComplete?: (result: ValidationResult) => void;
  selectedProfile?: string;
}

interface ValidationIssue {
  severity?: string;
  message?: string;
  rule?: string;
  filename?: string;
  line?: number;
  column?: number;
  level?: string;
  tag?: string[];
  description?: string;
  [key: string]: unknown;
}

interface ValidationResult {
  passed: boolean;
  summary: unknown;
  issues: ValidationIssue[];
  raw_output: string | { stdout?: string; stderr?: string };
  raw_stdout?: string;
  raw_stderr?: string;
  debug_info: {
    status?: string;
    playbook_length?: number;
    num_issues?: number;
    error_count?: number;
    warning_count?: number;
    info_count?: number;
    exit_code?: number;
    profile_used?: string;
    [key: string]: unknown;
  };
  error_message?: string;
}

// --- Utilities ---
function cleanPlaybook(yamlText: string): string {
  if (!yamlText) return '';
  const lines = yamlText.trim().split('\n').filter(Boolean);
  let idx = 0;
  while (idx < lines.length && (lines[idx].trim() === '---' || lines[idx].trim() === "''---")) {
    idx++;
  }
  return `---\n${lines.slice(idx).join('\n')}`;
}

const isValidationResult = (data: unknown): boolean => {
  return data && (
    data.passed !== undefined ||
    data.summary !== undefined ||
    data.issues !== undefined ||
    (data.tool === "lint_ansible_playbook" && data.output)
  );
};

const transformBackendResponse = (data: unknown, playbookLength: number = 0): ValidationResult => {
  // Handle backend tool execution format
  if (data.tool === "lint_ansible_playbook" && data.output) {
    const output = data.output;
    const summary = output.summary || {};
    
    return {
      passed: summary.passed || false,
      summary: summary,
      issues: output.issues || [],
      raw_output: output.raw_output || "",
      debug_info: {
        status: summary.passed ? "passed" : "failed",
        playbook_length: playbookLength,
        exit_code: summary.exit_code,
        profile_used: summary.profile_used,
        issue_count: summary.issue_count || 0,
        error_count: summary.error_count || 0,
        warning_count: summary.warning_count || 0,
        ...summary
      },
      error_message: summary.passed ? undefined : extractErrorFromOutput(output.raw_output)
    };
  }
  
  // Handle direct validation result format
  if (data.passed !== undefined || data.summary !== undefined) {
    return {
      passed: data.passed || false,
      summary: data.summary || {},
      issues: data.issues || [],
      raw_output: data.raw_output || "",
      raw_stdout: data.raw_stdout,
      raw_stderr: data.raw_stderr,
      debug_info: {
        status: data.passed ? "passed" : "failed",
        playbook_length: playbookLength,
        ...data.debug_info
      },
      error_message: data.error_message
    };
  }
  
  // Fallback for unknown format
  return {
    passed: false,
    summary: "Unknown response format",
    issues: [],
    raw_output: JSON.stringify(data, null, 2),
    debug_info: {
      status: "error",
      playbook_length: playbookLength,
      error_count: 1
    },
    error_message: "Received unexpected response format from validation service"
  };
};

const extractErrorFromOutput = (rawOutput: unknown): string => {
  if (typeof rawOutput === 'string') {
    return rawOutput.trim();
  }
  
  if (typeof rawOutput === 'object' && rawOutput) {
    if (rawOutput.stderr && rawOutput.stderr.trim()) {
      return rawOutput.stderr.trim();
    }
    if (rawOutput.stdout && rawOutput.stdout.trim()) {
      return rawOutput.stdout.trim();
    }
  }
  
  return "Validation failed - check raw output for details";
};

const ValidationPanel: React.FC<ValidationPanelProps> = ({
  playbook = "",
  validationConfig,
  onLogMessage,
  onValidationComplete,
  selectedProfile = 'production'
}) => {
  // --- Local State ---
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());
  const [showRawOutput, setShowRawOutput] = useState(false);
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState<'summary' | 'issues' | 'raw' | 'debug'>('summary');
  const [expandedReportSections, setExpandedReportSections] = useState<Set<string>>(new Set());
  const hasLoggedInit = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- Logging ---
  const logMessage = useCallback(
    (message: string) => {
      if (onLogMessage) onLogMessage(message);
      if (process.env.NODE_ENV !== "production") console.log("[ValidationPanel]", message);
    },
    [onLogMessage]
  );

  // --- Effects ---
  useEffect(() => {
    if (!hasLoggedInit.current && playbook && playbook.trim()) {
      logMessage("🛡️ Validation Panel initialized");
      hasLoggedInit.current = true;
    }
  }, [logMessage, playbook]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Sync validation result with parent callback
  useEffect(() => {
    if (result && onValidationComplete) {
      onValidationComplete(result);
      logMessage(` Validation completed: ${result.passed ? 'PASSED' : 'FAILED'}`);
    }
  }, [result, onValidationComplete, logMessage]);

  // --- Event Handlers ---
  const resetValidation = () => {
    setResult(null);
    setError(null);
    setProgress(null);
    setLoading(false);
    setHasValidated(false);
    setExpandedIssues(new Set());
    setShowRawOutput(false);
    setShowDetailedReport(false);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleValidation = useCallback(async () => {
    if (!playbook || !playbook.trim()) {
      setError("No playbook content to validate");
      logMessage(" Error: No playbook content");
      return;
    }

    // Reset state
    resetValidation();
    setLoading(true);
    setHasValidated(true);

    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Add timeout to prevent infinite hanging
    const timeoutId = setTimeout(() => {
      abortController.abort();
      setError("Validation timed out after 2 minutes");
      setLoading(false);
      setProgress(null);
      logMessage("⏱️ Validation timed out");
    }, 120000); // 2 minutes timeout

    try {
      logMessage(`🚀 Starting validation with ${selectedProfile} profile...`);
      setProgress("Initializing validation...");
      
      const cleanedPlaybook = cleanPlaybook(playbook);
      
      const response = await fetch("/api/validate/playbook/stream", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "text/event-stream, application/json",
        },
        body: JSON.stringify({
          playbook_content: cleanedPlaybook,
          profile: selectedProfile,
        }),
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Validation failed: ${response.status} - ${errorText}`);
      }

      const contentType = response.headers.get("content-type");
      
      if (contentType?.includes("application/json")) {
        // Handle direct JSON response (non-streaming)
        setProgress("Processing validation results...");
        const data = await response.json();
        logMessage("📊 Received direct JSON response");
        
        const transformedResult = transformBackendResponse(data, cleanedPlaybook.length);
        setResult(transformedResult);
        setLoading(false);
        setProgress(null);
        
        return;
      }

      if (!contentType?.includes("text/event-stream")) {
        throw new Error(`Unexpected content type: ${contentType}`);
      }

      // Handle streaming response with improved error handling
      if (!response.body) {
        throw new Error("No response body from backend");
      }

      setProgress("Processing streaming response...");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult = null;
      let streamComplete = false;
      
      // Add stream timeout
      const streamTimeoutId = setTimeout(() => {
        reader.cancel();
        throw new Error("Stream processing timed out");
      }, 90000); // 90 seconds for stream processing

      try {
        let iterationCount = 0;
        const MAX_ITERATIONS = 1000; // Prevent infinite loops
        
        while (!streamComplete && iterationCount < MAX_ITERATIONS) {
          iterationCount++;
          
          const { done, value } = await reader.read();
          
          if (done) {
            logMessage("📊 Stream reading completed naturally");
            streamComplete = true;
            break;
          }
          
          if (!value) {
            logMessage("⚠️ Received empty value from stream");
            continue;
          }
          
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          let shouldBreak = false;
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            try {
              let data;
              
              // Handle SSE format
              if (trimmedLine.startsWith('data: ')) {
                const dataStr = trimmedLine.slice(6);
                if (dataStr === '[DONE]') {
                  logMessage("📊 Received [DONE] signal");
                  streamComplete = true;
                  shouldBreak = true;
                  break;
                }
                data = JSON.parse(dataStr);
              } else {
                // Try parsing as direct JSON
                data = JSON.parse(trimmedLine);
              }

              // Handle different message types
              if (data.type === "progress" && data.message) {
                setProgress(data.message);
                logMessage(`⚡ Progress: ${data.message}`);
              } 
              else if (data.type === "final_result" && data.data) {
                logMessage("📊 Received final_result event");
                finalResult = data.data;
                streamComplete = true;
                shouldBreak = true;
                break;
              } 
              else if (data.type === "error") {
                throw new Error(data.message || "Validation error occurred");
              }
              // Handle backend tool execution format
              else if (data.tool === "lint_ansible_playbook" && data.output) {
                logMessage("📊 Received tool execution result");
                finalResult = data;
                streamComplete = true;
                shouldBreak = true;
                break;
              }
              // Handle direct validation result format
              else if (isValidationResult(data)) {
                logMessage("📊 Received direct validation result");
                finalResult = data;
                streamComplete = true;
                shouldBreak = true;
                break;
              }
            } catch (parseError) {
              console.warn("Failed to parse line:", trimmedLine, parseError);
              continue;
            }
          }
          
          // Break outer loop if needed
          if (shouldBreak) {
            break;
          }
          
          // Additional safety check
          if (finalResult) {
            streamComplete = true;
            break;
          }
        }
        
        clearTimeout(streamTimeoutId);
        
        if (iterationCount >= MAX_ITERATIONS) {
          throw new Error("Stream processing exceeded maximum iterations");
        }
        
      } catch (streamError) {
        clearTimeout(streamTimeoutId);
        throw streamError;
      } finally {
        try {
          reader.releaseLock();
        } catch (lockError) {
          console.warn("Error releasing reader lock:", lockError);
        }
      }

      // Process final result
      if (finalResult) {
        logMessage(" Validation completed successfully");
        const transformedResult = transformBackendResponse(finalResult, cleanedPlaybook.length);
        setResult(transformedResult);
        setLoading(false);
        setProgress(null);
      } else {
        // If we reach here without a result, treat it as an error
        throw new Error("Stream ended without providing validation result");
      }
      
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      
      if (err.name === 'AbortError') {
        logMessage("🚫 Validation cancelled");
        return;
      }
      
      const errorMessage = err.message || "Validation failed";
      logMessage(` Validation error: ${errorMessage}`);
      setError(errorMessage);
      setLoading(false);
      setProgress(null);
      setHasValidated(false);
    }
  }, [playbook, selectedProfile, logMessage]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      setProgress(null);
      logMessage("🚫 Validation cancelled by user");
    }
  }, [logMessage]);

  const handleReset = useCallback(() => {
    resetValidation();
    logMessage("🔄 Validation state reset");
  }, [logMessage]);

  // --- UI Helper Functions ---
  const toggleIssueExpansion = (index: number) => {
    setExpandedIssues((prev) => {
      const copy = new Set(prev);
      copy.has(index) ? copy.delete(index) : copy.add(index);
      return copy;
    });
  };

  const toggleReportSection = (section: string) => {
    setExpandedReportSections((prev) => {
      const copy = new Set(prev);
      copy.has(section) ? copy.delete(section) : copy.add(section);
      return copy;
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      logMessage("📋 Copied to clipboard");
    } catch {
      logMessage(" Failed to copy to clipboard");
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'error': case 'high':
        return <XCircleIcon className="w-4 h-4 text-red-400" />;
      case 'warning': case 'medium':
        return <ExclamationTriangleIcon className="w-4 h-4 text-amber-400" />;
      case 'info': case 'low':
        return <InformationCircleIcon className="w-4 h-4 text-blue-400" />;
      default:
        return <ExclamationTriangleIcon className="w-4 h-4 text-slate-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'error': case 'high':
        return 'from-red-500/10 to-red-600/10 border-red-500/30';
      case 'warning': case 'medium':
        return 'from-amber-500/10 to-amber-600/10 border-amber-500/30';
      case 'info': case 'low':
        return 'from-blue-500/10 to-blue-600/10 border-blue-500/30';
      default:
        return 'from-slate-500/10 to-slate-600/10 border-slate-500/30';
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
    return names[profile as keyof typeof names] || 'Production';
  };

  // --- Helper: Extract error message ---
  const extractLintErrorMessage = (result: unknown) => {
    if (!result) return "";
    
    if (result.error_message?.trim()) return result.error_message.trim();
    
    if (typeof result.raw_output === "string" && result.raw_output.trim()) {
      return result.raw_output.trim();
    }
    
    if (typeof result.raw_output === "object" && result.raw_output) {
      if (result.raw_output.stderr?.trim()) return result.raw_output.stderr.trim();
      if (result.raw_output.stdout?.trim()) return result.raw_output.stdout.trim();
    }
    
    if (result.raw_stderr?.trim()) return result.raw_stderr.trim();
    
    if (typeof result.summary === "string" && result.summary.toLowerCase().includes("error")) {
      return result.summary.trim();
    }
    
    return "";
  };

  // Helper to get issues by category
  const getIssuesByCategory = () => {
    const issues = result?.issues || [];
    return {
      errors: issues.filter((i: unknown) => (i.severity || i.level || '').toLowerCase() === 'error'),
      warnings: issues.filter((i: unknown) => (i.severity || i.level || '').toLowerCase() === 'warning'),
      info: issues.filter((i: unknown) => (i.severity || i.level || '').toLowerCase() === 'info'),
      other: issues.filter((i: unknown) => !['error', 'warning', 'info'].includes((i.severity || i.level || '').toLowerCase()))
    };
  };

  // Helper to format raw output
  const formatRawOutput = (rawOutput: unknown) => {
    if (typeof rawOutput === 'string') return rawOutput;
    if (typeof rawOutput === 'object' && rawOutput) {
      if (rawOutput.stdout && rawOutput.stderr) {
        return `STDOUT:\n${rawOutput.stdout}\n\nSTDERR:\n${rawOutput.stderr}`;
      }
      if (rawOutput.stdout) return rawOutput.stdout;
      if (rawOutput.stderr) return rawOutput.stderr;
      return JSON.stringify(rawOutput, null, 2);
    }
    return 'No raw output available';
  };

  // --- Render Functions ---
  const renderValidationSummary = () => {
    if (!result) return null;
    
    const { passed, issues = [], debug_info = {} } = result;
    const errorMessage = extractLintErrorMessage(result);
    
    // If there are no issues but a lint error exists, show 1 error visually
    const showVirtualError = !passed && (!issues || issues.length === 0) && errorMessage;
    
    const errorCount = showVirtualError
      ? 1
      : debug_info?.error_count ||
        (issues && issues.filter((i: unknown) =>
          (i.severity || i.level || "").toLowerCase() === "error"
        ).length) ||
        0;
        
    const warningCount = debug_info?.warning_count ||
      (issues && issues.filter((i: unknown) =>
        (i.severity || i.level || "").toLowerCase() === "warning"
      ).length) ||
      0;
      
    const infoCount = debug_info?.info_count ||
      (issues && issues.filter((i: unknown) =>
        (i.severity || i.level || "").toLowerCase() === "info"
      ).length) ||
      0;

    return (
      <div
        className={`rounded-xl border p-6 ${
          passed
            ? "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/30"
            : "bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/30"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {passed ? (
              <CheckCircleIcon className="w-8 h-8 text-emerald-400" />
            ) : (
              <XCircleIcon className="w-8 h-8 text-red-400" />
            )}
            <div>
              <h3 className={`font-bold text-xl ${passed ? "text-emerald-300" : "text-red-300"}`}>
                {passed ? "Validation Passed" : "Validation Failed"}
              </h3>
              <div className="text-sm text-slate-400">
                Profile: <span className="font-medium">{getProfileDisplayName(selectedProfile)}</span> • Analyzed:{" "}
                <span className="font-medium">{debug_info?.playbook_length || playbook?.length || 0}</span> characters
                {debug_info?.exit_code && (
                  <span> • Exit Code: <span className="font-mono">{debug_info.exit_code}</span></span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700/50"
            title="Copy full validation result"
          >
            <ClipboardDocumentIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="text-center p-3 rounded-lg bg-slate-700/30 border border-slate-600/30">
            <div className="text-slate-300 text-2xl font-bold">
              {showVirtualError ? 1 : (issues?.length || 0)}
            </div>
            <div className="text-xs text-slate-400">Total Issues</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="text-red-400 text-2xl font-bold">{errorCount}</div>
            <div className="text-xs text-slate-400">Errors</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="text-amber-400 text-2xl font-bold">{warningCount}</div>
            <div className="text-xs text-slate-400">Warnings</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="text-blue-400 text-2xl font-bold">{infoCount}</div>
            <div className="text-xs text-slate-400">Info</div>
          </div>
        </div>
        
        {/* Show virtual error (main error) in a prominent box */}
        {showVirtualError && (
          <div className="mt-4 p-4 rounded-lg bg-slate-900 border border-red-500/50">
            <h4 className="text-red-300 font-semibold mb-2 flex items-center">
              <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
              Validation Error
            </h4>
            <pre className="text-red-200 text-sm font-mono whitespace-pre-wrap overflow-x-auto">
              {errorMessage}
            </pre>
          </div>
        )}
      </div>
    );
  };

  const renderIssues = () => {
    if (!result || !result.issues || !Array.isArray(result.issues) || result.issues.length === 0) {
      return null;
    }

    const issues = result.issues;
    const categories = getIssuesByCategory();

    const renderIssuesByCategory = (title: string, categoryIssues: unknown[], bgColor: string, textColor: string) => {
      if (categoryIssues.length === 0) return null;

      return (
        <div key={title} className="space-y-3">
          <button
            onClick={() => toggleReportSection(title)}
            className="flex items-center justify-between w-full p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors border border-slate-600/30"
          >
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${bgColor}`}></div>
              <span className={`font-semibold ${textColor}`}>{title}</span>
              <span className="bg-slate-600/50 text-slate-300 px-2 py-1 rounded text-sm">
                {categoryIssues.length}
              </span>
            </div>
            {expandedReportSections.has(title) ? (
              <ChevronDownIcon className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRightIcon className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedReportSections.has(title) && (
            <div className="space-y-2 ml-6">
              {categoryIssues.map((issue, idx) => (
                <div key={idx} className={`p-4 rounded-lg border ${bgColor.replace('bg-', 'border-').replace('/40', '/30')} bg-slate-800/30`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {issue.rule && (
                          <span className="text-xs bg-slate-600/50 text-slate-300 px-2 py-1 rounded font-mono">
                            {issue.rule}
                          </span>
                        )}
                        {issue.line && (
                          <span className="text-xs text-slate-400">
                            Line {issue.line}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-200 mb-2">
                        {issue.message || issue.description || 'No description available'}
                      </p>
                      {issue.filename && (
                        <p className="text-xs text-slate-400">
                          File: {issue.filename}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(issue, null, 2))}
                      className="text-slate-400 hover:text-slate-300 p-1"
                      title="Copy issue details"
                    >
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-white flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-400" />
            <span>Issues Found ({issues.length})</span>
          </h4>
          <div className="flex items-center space-x-3">
            <button
              onClick={() =>
                copyToClipboard(
                  issues
                    .map(
                      (i: unknown) =>
                        `${(i.severity || i.level || 'INFO').toUpperCase()}: ${i.message || i.description || 'No description'} ${
                          i.filename ? `(${i.filename}:${i.line})` : ""
                        }`
                    )
                    .join("\n")
                )
              }
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Copy All Issues
            </button>
            <button
              onClick={() =>
                setExpandedReportSections(new Set(['Errors', 'Warnings', 'Info', 'Other']))
              }
              className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              Expand All
            </button>
          </div>
        </div>
        
        <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4">
          {renderIssuesByCategory('Errors', categories.errors, 'bg-red-500/20', 'text-red-300')}
          {renderIssuesByCategory('Warnings', categories.warnings, 'bg-amber-500/20', 'text-amber-300')}
          {renderIssuesByCategory('Info', categories.info, 'bg-blue-500/20', 'text-blue-300')}
          {renderIssuesByCategory('Other', categories.other, 'bg-slate-500/20', 'text-slate-300')}
        </div>
      </div>
    );
  };

  const renderRawOutput = () => {
    if (!result || !showRawOutput) return null;
    const rawOutput = formatRawOutput(result.raw_output);
    
    return (
      <div className="bg-slate-800/40 rounded-lg border border-slate-600/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-white flex items-center space-x-2">
            <DocumentTextIcon className="w-4 h-4 text-slate-400" />
            <span>Raw Output (Debug)</span>
          </h4>
          <button
            onClick={() => copyToClipboard(rawOutput)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Copy Output
          </button>
        </div>
        
        <div className="space-y-4">
          {(!rawOutput || (typeof rawOutput === "string" && rawOutput.trim() === "")) ? (
            <div className="text-xs text-red-300 bg-slate-900/70 rounded p-3 border border-red-500/30">
              No raw output available
            </div>
          ) : (
            <>
              {typeof result.raw_output === "object" && result.raw_output && (
                <>
                  {result.raw_output.stdout && (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                        <h5 className="text-sm font-medium text-emerald-300">Standard Output</h5>
                      </div>
                      <div className="text-xs text-slate-300 overflow-auto max-h-48 bg-slate-900/50 p-3 rounded border border-slate-600/30 whitespace-pre-wrap font-mono">
                        {result.raw_output.stdout}
                      </div>
                    </div>
                  )}
                  {result.raw_output.stderr && (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                        <h5 className="text-sm font-medium text-amber-300">Standard Error</h5>
                      </div>
                      <div className="text-xs text-slate-300 overflow-auto max-h-48 bg-slate-900/50 p-3 rounded border border-slate-600/30 whitespace-pre-wrap font-mono">
                        {result.raw_output.stderr}
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {typeof rawOutput === "string" && rawOutput.trim() && (
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <h5 className="text-sm font-medium text-blue-300">Raw Output</h5>
                  </div>
                  <div className="text-xs text-slate-300 overflow-auto max-h-64 bg-slate-900/50 p-3 rounded border border-slate-600/30 whitespace-pre-wrap font-mono">
                    {rawOutput}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // --- Main Render ---
  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900 rounded-lg p-6 shadow">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg">
            <ShieldCheckIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-xl">Playbook Validation</h2>
            <div className="text-xs text-slate-400">Ansible Lint Analysis</div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 rounded-lg border border-slate-600/50">
            <Cog6ToothIcon className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-300">Profile:</span>
            <span className="text-sm font-medium text-white">{getProfileDisplayName(selectedProfile)}</span>
          </div>
          <div className={`w-8 h-1 rounded-full bg-gradient-to-r ${getProfileColor(selectedProfile)}`}></div>
        </div>
      </div>

      {/* Validation Controls */}
      <div className="flex gap-3 mb-6">
        <button
          className={`flex-1 py-3 rounded-lg font-semibold text-white transition-all duration-300 transform ${
            loading
              ? "bg-gradient-to-r from-slate-600/50 to-slate-500/50 cursor-not-allowed scale-95"
              : hasValidated
              ? result?.passed
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:scale-105"
                : "bg-gradient-to-r from-red-500 to-rose-500 hover:scale-105"
              : "bg-gradient-to-r from-indigo-500 to-violet-500 hover:scale-105"
          }`}
          onClick={handleValidation}
          disabled={loading || !playbook || !playbook.trim()}
        >
          <div className="flex items-center justify-center space-x-2">
            {loading ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                <span>Validating Playbook...</span>
              </>
            ) : hasValidated ? (
              <>
                <PlayIcon className="w-4 h-4" />
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
            className="px-4 py-3 rounded-lg font-semibold text-red-300 border border-red-500/30 hover:bg-red-500/10 transition-colors"
          >
            Cancel
          </button>
        )}
        
        {(result || error) && !loading && (
          <button
            onClick={handleReset}
            className="px-4 py-3 rounded-lg font-semibold text-slate-300 border border-slate-600/50 hover:bg-slate-700/50 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Progress Indicator */}
      {progress && (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <div className="flex items-center space-x-2">
            <ArrowPathIcon className="w-5 h-5 text-blue-400 animate-spin" />
            <div className="text-blue-300 text-sm">{progress}</div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/30 rounded-xl">
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
        <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-600/30">
          <ShieldCheckIcon className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-300 mb-2">No Playbook Available</h3>
          <div className="text-slate-400 mb-4">Generate a playbook first to validate it</div>
          <div className="text-sm text-slate-500">
            Go to the <strong>Convert</strong> step to generate an Ansible playbook
          </div>
        </div>
      ) : result && (
        <div className="space-y-6">
          {renderValidationSummary()}
          {renderIssues()}
          
          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {result.raw_output && (
                <button
                  onClick={() => setShowRawOutput(!showRawOutput)}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center space-x-2"
                >
                  <CodeBracketIcon className="w-4 h-4" />
                  <span>{showRawOutput ? 'Hide' : 'Show'} Raw Output</span>
                  {showRawOutput ? (
                    <ChevronDownIcon className="w-4 h-4" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4" />
                  )}
                </button>
              )}
              
              <button
                onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
                className="text-sm text-violet-400 hover:text-violet-300 transition-colors flex items-center space-x-2"
              >
                <ClipboardDocumentIcon className="w-4 h-4" />
                <span>Copy Full Report</span>
              </button>
            </div>
          </div>
          
          {renderRawOutput()}
        </div>
      )}
    </div>
  );
};

export default ValidationPanel;