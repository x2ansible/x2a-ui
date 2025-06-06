/**
 * Fixed ValidationPanel Component
 * 
 * Fixes:
 * 1. Clear messaging - distinguishes process success from validation results
 * 2. Friendlier colors - less intimidating, more helpful
 * 3. Better auto-validation logic to prevent misleading messages
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlayIcon,
  DocumentTextIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

// --- Utility: Clean playbook before validation ---
function cleanPlaybook(yamlText: string): string {
  if (!yamlText) return '';
  const lines = yamlText.trim().split('\n').filter(Boolean);
  let idx = 0;
  while (idx < lines.length && (lines[idx].trim() === '---' || lines[idx].trim() === "''---")) {
    idx++;
  }
  return `---\n${lines.slice(idx).join('\n')}`;
}

// --- Interfaces - Compatible with your existing code ---
interface ValidationIssue {
  rule?: string;
  category?: string;
  specific_rule?: string;
  description?: string;
  message?: string;
  severity?: string;
  level?: string;
  file?: string;
  filename?: string;
  line?: number;
  column?: number;
  tag?: string[];
  [key: string]: any;
}

interface ValidationRecommendation {
  issue?: string;
  rule?: string;
  count?: number;
  recommendation?: string;
  action?: string;
  example?: string;
  line?: number;
}

interface ValidationResult {
  success?: boolean;
  validation_passed?: boolean;
  passed?: boolean; // Support both formats
  exit_code?: number;
  message?: string;
  summary?: any;
  issues?: ValidationIssue[];
  recommendations?: ValidationRecommendation[];
  agent_analysis?: string;
  raw_output?: string | { stdout?: string; stderr?: string };
  playbook_length?: number;
  lint_profile?: string;
  debug_info?: {
    status?: string;
    playbook_length?: number;
    num_issues?: number;
    error_count?: number;
    warning_count?: number;
    info_count?: number;
    [key: string]: any;
  };
  timestamp?: string;
  processing_time?: number;
  error_message?: string;
}

interface ValidationConfig {
  checkSyntax: boolean;
  securityScan: boolean;
  performanceCheck: boolean;
  bestPractices: boolean;
  customRules: string[];
}

interface ValidationPanelProps {
  playbook?: string;
  validationConfig?: ValidationConfig;
  onLogMessage?: (message: string) => void;
  onValidationComplete?: (result: ValidationResult) => void;
  selectedProfile?: string;
}

const ValidationPanel: React.FC<ValidationPanelProps> = ({
  playbook = "",
  validationConfig = {
    checkSyntax: true,
    securityScan: true,
    performanceCheck: false,
    bestPractices: true,
    customRules: []
  },
  onLogMessage,
  onValidationComplete,
  selectedProfile = 'production'
}) => {
  // State management
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [validationStep, setValidationStep] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [showRawOutput, setShowRawOutput] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());
  const [hasValidated, setHasValidated] = useState(false);
  const [lastPlaybookHash, setLastPlaybookHash] = useState<string>('');
  const hasLoggedInit = useRef(false);

  // Constants
  const MAX_RETRIES = 2;
  const VALIDATION_TIMEOUT = 60000;

  // Helper to create a simple hash of playbook content
  const createPlaybookHash = (content: string): string => {
    return btoa(content.slice(0, 100) + content.length.toString()).slice(0, 10);
  };

  // Improved logging utility with clearer messages
  const logMessage = useCallback(
    (message: string) => {
      if (onLogMessage) onLogMessage(message);
      if (process.env.NODE_ENV !== "production") console.log("[ValidationPanel]", message);
    },
    [onLogMessage]
  );

  useEffect(() => {
    if (!hasLoggedInit.current && playbook && playbook.trim()) {
      logMessage("🛡️ Validation Panel initialized");
      hasLoggedInit.current = true;
    }
  }, [logMessage, playbook]);

  // Copy to clipboard functionality
  const copyToClipboard = async (text: string, fieldName: string = 'content') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      logMessage(`📋 Copied ${fieldName} to clipboard`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      logMessage(` Failed to copy ${fieldName}: ${err}`);
    }
  };

  // Progress simulation
  const simulateProgress = useCallback(() => {
    setProgress(0);
    const steps = [
      { step: 'Preparing playbook...', progress: 10 },
      { step: 'Sending to validation service...', progress: 30 },
      { step: 'Running ansible-lint analysis...', progress: 60 },
      { step: 'Processing results...', progress: 80 },
      { step: 'Finalizing validation...', progress: 95 }
    ];

    steps.forEach((stepInfo, index) => {
      setTimeout(() => {
        if (loading) {
          setValidationStep(stepInfo.step);
          setProgress(stepInfo.progress);
        }
      }, index * 1000);
    });
  }, [loading]);

  // UI Helper Functions
  const toggleIssueExpansion = (index: number) => {
    setExpandedIssues((prev) => {
      const copy = new Set(prev);
      copy.has(index) ? copy.delete(index) : copy.add(index);
      return copy;
    });
  };

  // 🎨 FIXED: Friendlier severity icons and colors
  const getSeverityIcon = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'fatal':
      case 'error':
      case 'high':
        return <ExclamationTriangleIcon className="w-4 h-4 text-orange-400" />; // Changed from red to orange
      case 'warning':
      case 'medium':
        return <InformationCircleIcon className="w-4 h-4 text-blue-400" />; // Changed from yellow to blue
      case 'info':
      case 'low':
        return <InformationCircleIcon className="w-4 h-4 text-emerald-400" />; // Changed to emerald
      default:
        return <InformationCircleIcon className="w-4 h-4 text-slate-400" />;
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'fatal':
        return 'from-orange-500/10 to-red-500/10 border-orange-500/30'; // Softer than pure red
      case 'error':
      case 'high':
        return 'from-orange-500/10 to-amber-500/10 border-orange-500/30'; // Orange instead of red
      case 'warning':
      case 'medium':
        return 'from-blue-500/10 to-cyan-500/10 border-blue-500/30'; // Blue instead of yellow
      case 'info':
      case 'low':
        return 'from-emerald-500/10 to-green-500/10 border-emerald-500/30'; // Emerald for info
      default:
        return 'from-slate-500/10 to-slate-600/10 border-slate-500/30';
    }
  };

  const getProfileColor = (profile: string) => {
    switch (profile) {
      case 'minimal': return 'from-blue-500 to-cyan-400';
      case 'basic': return 'from-green-500 to-emerald-400';
      case 'safety': return 'from-orange-500 to-amber-400'; // Changed from red
      case 'test': return 'from-purple-500 to-pink-400';
      case 'production': return 'from-indigo-500 to-purple-400'; // Changed from red
      default: return 'from-blue-500 to-cyan-400';
    }
  };

  const getProfileDisplayName = (profile: string) => {
    switch (profile) {
      case 'minimal': return 'Minimal';
      case 'basic': return 'Basic';
      case 'safety': return 'Safety';
      case 'test': return 'Test';
      case 'production': return 'Production';
      default: return 'Production';
    }
  };

  // Main validation function with FIXED messaging
  const validatePlaybook = useCallback(async (retryAttempt = 0): Promise<void> => {
    if (!playbook?.trim()) {
      setError('No playbook content available for validation');
      logMessage(' Validation failed: No playbook content');
      return;
    }

    setLoading(true);
    setError(null);
    setValidationResult(null);
    setRetryCount(retryAttempt);
    setHasValidated(true);
    
    const startTime = Date.now();
    
    // 🔧 FIXED: Clear messaging about what's happening
    logMessage(`🛡️ Starting playbook validation with ${selectedProfile} profile...`);
    logMessage(`📊 Analyzing ${playbook.length} characters of playbook content`);

    simulateProgress();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, VALIDATION_TIMEOUT);

      const requestBody = {
        playbook: cleanPlaybook(playbook),
        lint_profile: selectedProfile
      };

      logMessage(`🚀 Sending playbook to ansible-lint service...`);

      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // 🔧 FIXED: Better response status logging
      if (response.ok) {
        logMessage(`📥 Received validation response from service`);
      } else {
        logMessage(` Service returned error: ${response.status} ${response.statusText}`);
      }

      let data: ValidationResult;
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          throw new Error("Backend did not return JSON");
        }
      } catch (parseError) {
        throw new Error("Validation API did not return valid JSON. Try again.");
      }

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        if (data) {
          if (typeof data.summary === "string") {
            errorMessage = data.summary;
          } else if (data.error_message) {
            errorMessage = data.error_message;
          } else if ((data as any).detail) {
            if (typeof (data as any).detail === 'string') {
              errorMessage = (data as any).detail;
            } else if ((data as any).detail.message) {
              errorMessage = (data as any).detail.message;
            }
          }
        }
        
        throw new Error(errorMessage);
      }

      // Normalize the result format (handle both API formats)
      const normalizedResult: ValidationResult = {
        success: data.success ?? true,
        validation_passed: data.validation_passed ?? data.passed ?? false,
        passed: data.validation_passed ?? data.passed ?? false,
        exit_code: data.exit_code ?? 0,
        message: data.message ?? (data.validation_passed || data.passed ? 'Validation passed' : 'Validation failed'),
        summary: data.summary,
        issues: data.issues ?? [],
        recommendations: data.recommendations ?? [],
        agent_analysis: data.agent_analysis ?? '',
        raw_output: data.raw_output ?? '',
        playbook_length: data.playbook_length ?? playbook.length,
        lint_profile: data.lint_profile ?? selectedProfile,
        debug_info: data.debug_info ?? {},
        timestamp: data.timestamp,
        processing_time: data.processing_time ?? (Date.now() - startTime) / 1000
      };

      setProgress(100);
      setValidationStep('Validation complete!');
      setValidationResult(normalizedResult);
      
      if (onValidationComplete) {
        onValidationComplete(normalizedResult);
      }

      // 🔧 FIXED: Clear result messaging that distinguishes process vs outcome
      const processingTime = normalizedResult.processing_time ? `${normalizedResult.processing_time.toFixed(2)}s` : 'unknown';
      const issueCount = normalizedResult.issues?.length || 0;
      
      // Always log that the validation process completed
      logMessage(` Validation process completed in ${processingTime}`);
      
      // Then log the actual validation outcome
      if (normalizedResult.validation_passed || normalizedResult.passed) {
        logMessage(`🎉 Playbook validation PASSED - No issues found!`);
      } else {
        if (issueCount > 0) {
          logMessage(`📋 Playbook validation completed - Found ${issueCount} improvement suggestions`);
          
          // Count by severity for more helpful messaging
          const errors = normalizedResult.issues?.filter(i => 
            ['error', 'fatal', 'high'].includes((i.severity || i.level || '').toLowerCase())
          ).length || 0;
          const warnings = normalizedResult.issues?.filter(i => 
            ['warning', 'medium'].includes((i.severity || i.level || '').toLowerCase())
          ).length || 0;
          
          if (errors > 0) {
            logMessage(`🔧 Found ${errors} issue${errors > 1 ? 's' : ''} that need attention`);
          }
          if (warnings > 0) {
            logMessage(`💡 Found ${warnings} suggestion${warnings > 1 ? 's' : ''} for improvement`);
          }
        } else {
          logMessage(`📋 Playbook validation completed with some findings`);
        }
      }

      if (normalizedResult.agent_analysis) {
        logMessage(`🤖 Analysis: ${normalizedResult.agent_analysis.substring(0, 100)}...`);
      }

    } catch (err) {
      setProgress(0);
      setValidationStep('');
      
      let errorMessage = 'Unknown validation error';
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = `Validation timed out after ${VALIDATION_TIMEOUT / 1000} seconds`;
        } else {
          errorMessage = err.message;
        }
      }

      logMessage(` Validation process failed: ${errorMessage}`);

      // Retry logic
      if (retryAttempt < MAX_RETRIES && !errorMessage.includes('timeout')) {
        logMessage(`🔄 Retrying validation (${retryAttempt + 1}/${MAX_RETRIES})...`);
        setTimeout(() => {
          validatePlaybook(retryAttempt + 1);
        }, 2000 * (retryAttempt + 1));
        return;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [playbook, selectedProfile, onValidationComplete, logMessage, simulateProgress]);

  // 🔧 FIXED: Improved auto-validation logic to prevent confusion
  useEffect(() => {
    if (!playbook?.trim()) {
      return;
    }

    const newHash = createPlaybookHash(playbook);
    
    // Only auto-validate if the playbook content actually changed significantly
    if (newHash !== lastPlaybookHash && !loading) {
      setLastPlaybookHash(newHash);
      
      const timer = setTimeout(() => {
        // Double-check that we're not already validating and content is still the same
        if (!loading && createPlaybookHash(playbook) === newHash) {
          logMessage("🔄 Playbook content changed - starting automatic validation...");
          validatePlaybook();
        }
      }, 1500); // Slightly longer delay

      return () => clearTimeout(timer);
    }
  }, [playbook, lastPlaybookHash, loading, validatePlaybook, logMessage]);

  // --- Render Functions ---

  // 🎨 FIXED: More encouraging validation summary with friendlier colors
  const renderValidationSummary = () => {
    if (!validationResult) return null;
    
    const passed = validationResult.validation_passed ?? validationResult.passed ?? false;
    const issues = validationResult.issues || [];
    const summary = typeof validationResult.summary === 'object' ? validationResult.summary : null;
    const debugInfo = validationResult.debug_info || {};
    
    const errorCount = summary?.violations || debugInfo.error_count || 
      issues.filter(i => ['error', 'fatal', 'high'].includes((i.severity || i.level || '').toLowerCase())).length;
    const warningCount = summary?.warnings || debugInfo.warning_count || 
      issues.filter(i => ['warning', 'medium'].includes((i.severity || i.level || '').toLowerCase())).length;
    const infoCount = debugInfo.info_count || 
      issues.filter(i => ['info', 'low'].includes((i.severity || i.level || '').toLowerCase())).length;

    return (
      <div className={`rounded-xl border p-6 ${
        passed 
          ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30' 
          : 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/30' // Changed from red to blue
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {passed ? (
              <CheckCircleIcon className="w-8 h-8 text-green-400" />
            ) : (
              <InformationCircleIcon className="w-8 h-8 text-blue-400" /> // Changed from XCircle to Info
            )}
            <div>
              <h3 className={`font-bold text-xl ${
                passed ? 'text-green-300' : 'text-blue-300' // Changed from red to blue
              }`}>
                {passed ? 'Validation Passed! 🎉' : `Found ${issues.length} Improvement${issues.length !== 1 ? 's' : ''}`}
              </h3>
              <div className="text-sm text-slate-400">
                Profile: <span className="font-medium">{getProfileDisplayName(selectedProfile)}</span> • 
                Analyzed: <span className="font-medium">{validationResult.playbook_length || 0}</span> characters
                {validationResult.processing_time && (
                  <> • <ClockIcon className="w-3 h-3 inline mx-1" />{validationResult.processing_time.toFixed(2)}s</>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => copyToClipboard(JSON.stringify(validationResult, null, 2), 'validation result')}
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700/50"
            title="Copy full validation result"
          >
            <DocumentDuplicateIcon className="w-5 h-5" />
          </button>
        </div>

        {/* 🎨 FIXED: Friendlier stats grid with better colors */}
        {issues && issues.length > 0 && (
          <>
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div className="text-center p-3 rounded-lg bg-slate-800/50">
                <div className="text-slate-300 text-2xl font-bold">{issues.length}</div>
                <div className="text-xs text-slate-400">Total Items</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-orange-500/10"> {/* Changed from red */}
                <div className="text-orange-400 text-2xl font-bold">{errorCount}</div>
                <div className="text-xs text-slate-400">Need Attention</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-blue-500/10"> {/* Changed from yellow */}
                <div className="text-blue-400 text-2xl font-bold">{warningCount}</div>
                <div className="text-xs text-slate-400">Suggestions</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-emerald-500/10">
                <div className="text-emerald-400 text-2xl font-bold">{infoCount}</div>
                <div className="text-xs text-slate-400">Info</div>
              </div>
            </div>
            
            {/* Rules Summary */}
            <div className="mt-4 p-4 bg-slate-800/30 rounded-lg">
              <h4 className="text-sm font-semibold text-slate-300 mb-2">Most Common Areas</h4>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(issues.map(i => i.rule).filter(Boolean))).slice(0, 5).map((rule, idx) => {
                  const count = issues.filter(i => i.rule === rule).length;
                  return (
                    <span key={idx} className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded flex items-center space-x-1">
                      <span>{rule}</span>
                      <span className="bg-slate-600/50 text-slate-400 px-1 rounded">{count}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // 🎨 FIXED: Friendlier issue display with encouraging language
  const renderIssues = () => {
    if (!validationResult?.issues || validationResult.issues.length === 0) return null;

    // Group issues by file
    const groupedIssues = validationResult.issues.reduce((acc, issue, idx) => {
      const key = issue.filename || issue.file || 'Playbook';
      if (!acc[key]) acc[key] = [];
      acc[key].push({ ...issue, originalIndex: idx });
      return acc;
    }, {} as Record<string, any[]>);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-white flex items-center space-x-2">
            <InformationCircleIcon className="w-5 h-5 text-blue-400" />
            <span>Improvement Opportunities ({validationResult.issues.length})</span>
          </h4>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => copyToClipboard(validationResult.issues!.map(i =>
                `${(i.severity || i.level || 'INFO').toUpperCase()}: ${i.message || i.description} ${(i.filename || i.file) ? `(${i.filename || i.file}:${i.line})` : ''}`
              ).join('\n'), 'all improvements')}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Copy All Items
            </button>
            <button
              onClick={() => setExpandedIssues(new Set(validationResult.issues!.map((_, idx) => idx)))}
              className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              Expand All
            </button>
          </div>
        </div>

        <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4">
          {Object.entries(groupedIssues).map(([filename, fileIssues]) => (
            <div key={filename} className="bg-slate-800/30 rounded-lg border border-slate-600/30">
              <div className="p-3 border-b border-slate-600/30 bg-slate-700/30">
                <h5 className="font-medium text-slate-200 flex items-center space-x-2">
                  <DocumentTextIcon className="w-4 h-4 text-slate-400" />
                  <span>{filename}</span>
                  <span className="text-xs bg-slate-600/50 text-slate-400 px-2 py-1 rounded">
                    {fileIssues.length} item{fileIssues.length !== 1 ? 's' : ''}
                  </span>
                </h5>
              </div>
              
              <div className="p-3 space-y-3">
                {fileIssues.map((issue) => {
                  const isExpanded = expandedIssues.has(issue.originalIndex);
                  const severity = issue.severity || issue.level || 'info';
                  return (
                    <div
                      key={issue.originalIndex}
                      className={`rounded-lg border p-4 bg-gradient-to-r ${getSeverityColor(severity)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {getSeverityIcon(severity)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`text-xs font-medium px-2 py-1 rounded ${
                                ['error', 'fatal', 'high'].includes(severity.toLowerCase()) ? 'bg-orange-500/20 text-orange-300' :
                                ['warning', 'medium'].includes(severity.toLowerCase()) ? 'bg-blue-500/20 text-blue-300' :
                                'bg-emerald-500/20 text-emerald-300'
                              }`}>
                                {severity === 'fatal' || severity === 'error' ? 'NEEDS ATTENTION' : 
                                 severity === 'warning' ? 'SUGGESTION' : 'INFO'}
                              </span>
                              {issue.rule && (
                                <span className="text-xs text-slate-400 font-mono bg-slate-700/50 px-2 py-1 rounded">
                                  {issue.rule}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-slate-200 mb-3 leading-relaxed">
                              {issue.message || issue.description || 'No description available'}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                              {issue.line && (
                                <span className="flex items-center space-x-1">
                                  <span>📍</span>
                                  <span>Line {issue.line}</span>
                                </span>
                              )}
                              {issue.column && (
                                <span>Column {issue.column}</span>
                              )}
                            </div>
                            {Array.isArray(issue.tag) && issue.tag.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {issue.tag.map((tag: string, tagIndex: number) => (
                                  <span
                                    key={tagIndex}
                                    className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleIssueExpansion(issue.originalIndex)}
                          className="text-slate-400 hover:text-white transition-colors ml-3 p-1"
                        >
                          {isExpanded ? (
                            <ChevronDownIcon className="w-4 h-4" />
                          ) : (
                            <ChevronRightIcon className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-600/30">
                          <div className="bg-slate-800/50 rounded p-3">
                            <h6 className="text-xs font-medium text-slate-400 mb-2">Technical Details</h6>
                            <div className="text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono">
                              {JSON.stringify(issue, null, 2)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Raw Output section (keep existing but with friendlier title)
  const renderRawOutput = () => {
    if (!validationResult || !showRawOutput) return null;
    const rawOutput = validationResult.raw_output;

    return (
      <div className="bg-slate-800/50 rounded-lg border border-slate-600/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-white flex items-center space-x-2">
            <DocumentTextIcon className="w-4 h-4 text-slate-400" />
            <span>Technical Details (Ansible-Lint Output)</span>
          </h4>
          <button
            onClick={() => copyToClipboard(
              typeof rawOutput === "string"
                ? rawOutput
                : JSON.stringify(rawOutput, null, 2),
              'technical details'
            )}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Copy Technical Details
          </button>
        </div>
        <div className="space-y-4">
          {(!rawOutput || (typeof rawOutput === "string" && rawOutput.trim() === "")) ? (
            <div className="text-xs text-yellow-300 bg-slate-900/70 rounded p-3 border border-yellow-500/30">
              No technical details available from the validation service.
            </div>
          ) : (
            <>
              {typeof rawOutput === "object" && (
                <>
                  {rawOutput.stdout && (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                        <h5 className="text-sm font-medium text-emerald-300">Ansible-Lint Analysis</h5>
                      </div>
                      <div className="text-xs text-slate-300 overflow-auto max-h-48 bg-slate-900/50 p-3 rounded border border-slate-600/30 whitespace-pre-wrap font-mono">
                        {rawOutput.stdout || "[empty]"}
                      </div>
                    </div>
                  )}
                  {rawOutput.stderr && (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <h5 className="text-sm font-medium text-blue-300">Validation Summary</h5>
                      </div>
                      <div className="text-xs text-slate-300 overflow-auto max-h-48 bg-slate-900/50 p-3 rounded border border-slate-600/30 whitespace-pre-wrap font-mono">
                        {rawOutput.stderr || "[empty]"}
                      </div>
                    </div>
                  )}
                  {!rawOutput.stdout && !rawOutput.stderr && (
                    <div className="text-xs text-yellow-300 bg-slate-900/70 rounded p-3 border border-yellow-500/30">
                      No stdout or stderr in technical details.
                    </div>
                  )}
                </>
              )}
              {typeof rawOutput === "string" && rawOutput.trim() && (
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <h5 className="text-sm font-medium text-blue-300">Technical Information</h5>
                  </div>
                  <div className="text-xs text-slate-300 overflow-auto max-h-64 bg-slate-900/50 p-3 rounded border border-slate-600/30 whitespace-pre-wrap font-mono">
                    {rawOutput}
                  </div>
                </div>
              )}
            </>
          )}
          {/* Always show JSON for debugging */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <h5 className="text-sm font-medium text-purple-300">JSON Data</h5>
            </div>
            <div className="text-xs text-slate-300 overflow-auto max-h-48 bg-slate-900/50 p-3 rounded border border-slate-600/30 whitespace-pre-wrap font-mono">
              {JSON.stringify(rawOutput, null, 2)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Top-level error display (keep existing but with better messaging)
  const renderTopLevelError = () => {
    if (!validationResult || (validationResult.validation_passed || validationResult.passed)) {
      return null;
    }

    // Helper logic for surfacing any error
    let topLevelError = "";
    if (typeof validationResult.raw_output === "string" && validationResult.raw_output.trim()) {
      topLevelError = validationResult.raw_output;
    }
    if (validationResult.raw_output && typeof validationResult.raw_output === "object") {
      if (validationResult.raw_output.stderr && validationResult.raw_output.stderr.trim())
        topLevelError = validationResult.raw_output.stderr;
      else if (validationResult.raw_output.stdout && validationResult.raw_output.stdout.trim())
        topLevelError = validationResult.raw_output.stdout;
    }
    if (validationResult.error_message) topLevelError = validationResult.error_message;
    if (typeof validationResult.summary === "string" && validationResult.summary.toLowerCase().startsWith("error"))
      topLevelError = validationResult.summary;
    
    if (!topLevelError) return null;

    return (
      <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-orange-900/80 to-amber-800/60 border border-orange-600 flex items-center space-x-3">
        <ExclamationTriangleIcon className="w-6 h-6 text-orange-300 flex-shrink-0" />
        <div>
          <div className="font-bold text-orange-200 mb-1">Validation Notice</div>
          <div className="text-orange-300 text-sm whitespace-pre-line">
            {topLevelError.length > 800
              ? topLevelError.slice(0, 800) + "..."
              : topLevelError}
          </div>
        </div>
      </div>
    );
  };

  // --- Main Render ---
  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900 rounded-lg p-6 shadow">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 bg-gradient-to-br ${getProfileColor(selectedProfile)} rounded-xl flex items-center justify-center shadow-lg`}>
            <ShieldCheckIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-xl">Playbook Validation</h2>
            <div className="text-xs text-slate-400">Ansible Quality Analysis</div>
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

      {/* Validation Button */}
      <button
        className={`w-full py-3 rounded-lg font-semibold text-white mb-6 transition-all duration-300 transform ${
          loading
            ? "bg-gradient-to-r from-blue-500/50 to-indigo-500/50 cursor-not-allowed scale-95"
            : hasValidated
            ? validationResult?.passed || validationResult?.validation_passed
              ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:scale-105"
              : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:scale-105"
            : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:scale-105"
        }`}
        onClick={() => validatePlaybook()}
        disabled={loading || !playbook || !playbook.trim()}
      >
        <div className="flex items-center justify-center space-x-2">
          {loading ? (
            <>
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              <span>Analyzing Playbook...</span>
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

      {/* Progress Bar */}
      {loading && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-slate-400 mb-1">
            <span>{validationStep}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ease-out bg-gradient-to-r ${getProfileColor(selectedProfile)}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error State (with friendlier colors) */}
      {error && (
        <div className="mb-6 p-4 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-xl">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-orange-400" />
            <div>
              <div className="text-orange-300 font-medium">Analysis Issue</div>
              <div className="text-orange-400/80 text-sm mt-1">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!playbook || !playbook.trim() ? (
        <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-600/30">
          <ShieldCheckIcon className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-300 mb-2">No Playbook Available</h3>
          <div className="text-slate-400 mb-4">Generate a playbook first to analyze it</div>
          <div className="text-sm text-slate-500">
            Go to the <strong>Convert</strong> step to generate an Ansible playbook
          </div>
        </div>
      ) : validationResult && (
        <div className="space-y-6">
          {renderTopLevelError()}
          {renderValidationSummary()}
          {renderIssues()}
          
          {/* Agent Analysis */}
          {validationResult.agent_analysis && (
            <div className="bg-slate-800/30 rounded-lg border border-slate-600/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-white">Expert Analysis</h4>
                <button
                  onClick={() => copyToClipboard(validationResult.agent_analysis!, 'expert analysis')}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <DocumentDuplicateIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-slate-900/50 rounded p-3 max-h-40 overflow-y-auto">
                <pre className="text-sm text-slate-300 whitespace-pre-wrap">
                  {validationResult.agent_analysis}
                </pre>
              </div>
            </div>
          )}
          
          {/* Recommendations */}
          {validationResult.recommendations && validationResult.recommendations.length > 0 && (
            <div className="bg-slate-800/30 rounded-lg border border-slate-600/30 p-4">
              <h4 className="font-semibold text-white mb-3">
                Improvement Suggestions ({validationResult.recommendations.length})
              </h4>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {validationResult.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3"
                  >
                    <div className="flex items-start space-x-3">
                      <InformationCircleIcon className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        {rec.rule && (
                          <span className="text-xs font-mono bg-emerald-800/50 text-emerald-300 px-2 py-1 rounded mb-2 inline-block">
                            {rec.rule}
                          </span>
                        )}
                        <p className="text-sm font-medium text-emerald-300 mb-1">
                          {rec.recommendation}
                        </p>
                        {rec.action && (
                          <p className="text-sm text-emerald-400 mb-2">
                            Action: {rec.action}
                          </p>
                        )}
                        {rec.example && (
                          <pre className="text-xs bg-emerald-900/50 p-2 rounded overflow-x-auto">
                            {rec.example}
                          </pre>
                        )}
                      </div>
                      <button
                        onClick={() => copyToClipboard(
                          `${rec.recommendation} ${rec.action ? `\nAction: ${rec.action}` : ''} ${rec.example ? `\nExample: ${rec.example}` : ''}`,
                          'suggestion'
                        )}
                        className="text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        <DocumentDuplicateIcon className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw Output Toggle */}
          {validationResult.raw_output && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowRawOutput(!showRawOutput)}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center space-x-2"
              >
                <DocumentTextIcon className="w-4 h-4" />
                <span>{showRawOutput ? 'Hide' : 'Show'} Technical Details</span>
                {showRawOutput ? (
                  <ChevronDownIcon className="w-4 h-4" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4" />
                )}
              </button>
            </div>
          )}
          
          {renderRawOutput()}
        </div>
      )}

      {/* Toast for copy feedback */}
      {copiedField && (
        <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="w-4 h-4" />
            <span>Copied {copiedField}!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationPanel;