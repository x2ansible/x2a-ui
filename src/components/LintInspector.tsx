import React, { useState, useCallback } from 'react';
import {
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  CodeBracketIcon,
  PlayIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";

interface ValidationIssue {
  severity?: string;
  level?: string;
  message?: string;
  description?: string;
  rule?: string;
  line?: number;
  filename?: string;
}

interface ValidationResult {
  passed: boolean;
  summary?: string;
  issues?: ValidationIssue[];
  raw_output?: unknown;
  error_message?: string;
  debug_info?: {
    status?: string;
    error?: string;
    playbook_length?: number;
    [key: string]: unknown;
  };
  raw_stdout?: string;
  raw_stderr?: string;
}

const LintInspector = () => {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [testPlaybook, setTestPlaybook] = useState(`---
# Ansible Playbook for Nginx Configuration and Service Management
- name: Configure and manage Nginx service
  hosts: all
  become: yes
  vars:
    nginx_worker_processes: 4
    nginx_worker_connections: 1024
  tasks:
  - name: Install Nginx package
    apt:
      name: nginx
      state: present
  - name: Configure Nginx
    template:
      src: templates/nginx.conf.j2
      dest: /etc/nginx/nginx.conf
      mode: '0644'
    notify: restart nginx
  - name: Enable and start Nginx service
    service:
      name: nginx
      state: started
      enabled: yes
  handlers:
  - name: restart nginx
    service:
      name: nginx
      state: restarted
  - name: Test Nginx configuration
    uri:
      url: http://localhost
      status: 200
      return_content: true
    register: nginx_test
    until: nginx_test.status == 200
    retries: 5
    delay: 5`);

  const validatePlaybook = useCallback(async () => {
    if (!testPlaybook.trim()) {
      setError("No playbook content to validate");
      return;
    }

    setIsValidating(true);
    setError(null);
    setProgress(null);
    setValidationResult(null);

    try {
      setProgress("Connecting to validation service...");
      
      const response = await fetch('/api/validate/playbook/stream', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream, application/json',
        },
        body: JSON.stringify({ 
          playbook_content: testPlaybook.trim(), 
          profile: 'production' 
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Validation failed: ${response.status} - ${errorText}`);
      }

      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        setProgress("Processing validation results...");
        const result = await response.json();
        setValidationResult(result);
        setProgress(null);
        return;
      }

      if (contentType?.includes("text/event-stream")) {
        setProgress("Starting validation...");
        
        if (!response.body) {
          throw new Error("No response body received");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (!line.trim()) continue;
              
              try {
                let data;
                
                if (line.startsWith('data: ')) {
                  const dataStr = line.slice(6);
                  if (dataStr === '[DONE]') {
                    console.log("Stream completed");
                    break;
                  }
                  data = JSON.parse(dataStr);
                } else {
                  data = JSON.parse(line);
                }

                if (data.type === "progress" && data.message) {
                  setProgress(data.message);
                } else if (data.type === "result" && data.data) {
                  setValidationResult(data.data);
                  setProgress(null);
                  return;
                } else if (data.type === "final_result" && data.data) {
                  setValidationResult(data.data);
                  setProgress(null);
                  return;
                } else if (data.type === "error") {
                  throw new Error(data.message || "Validation error occurred");
                } else if (data.passed !== undefined) {
                  setValidationResult(data);
                  setProgress(null);
                  return;
                }
              } catch (parseError) {
                console.warn("Failed to parse stream line:", line, parseError);
                continue;
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        if (!validationResult) {
          throw new Error("Stream ended without validation result");
        }
      } else {
        const text = await response.text();
        try {
          const result = JSON.parse(text);
          setValidationResult(result);
        } catch {
          throw new Error(`Unexpected response format: ${text.substring(0, 100)}`);
        }
      }

    } catch (err) {
      console.error("Validation error:", err);
      const errorMessage = err instanceof Error ? err.message : "Validation failed";
      setError(errorMessage);
      
      setValidationResult({
        passed: false,
        summary: "Validation Error",
        issues: [],
        raw_output: errorMessage,
        error_message: errorMessage,
        debug_info: {
          status: "error",
          error: errorMessage
        }
      });
    } finally {
      setIsValidating(false);
      setProgress(null);
    }
  }, [testPlaybook, validationResult]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

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

  const formatRawOutput = (rawOutput: unknown) => {
    if (typeof rawOutput === 'string') {
      return rawOutput;
    }
    if (typeof rawOutput === 'object' && rawOutput) {
      const output = rawOutput as Record<string, unknown>;
      if (output.stdout && output.stderr) {
        return `STDOUT:\n${output.stdout}\n\nSTDERR:\n${output.stderr}`;
      }
      if (output.stdout) return output.stdout as string;
      if (output.stderr) return output.stderr as string;
      return JSON.stringify(rawOutput, null, 2);
    }
    return 'No raw output available';
  };

  const getIssuesByCategory = () => {
    const issues = validationResult?.issues || [];
    return {
      errors: issues.filter(i => (i.severity || i.level || '').toLowerCase() === 'error'),
      warnings: issues.filter(i => (i.severity || i.level || '').toLowerCase() === 'warning'),
      info: issues.filter(i => (i.severity || i.level || '').toLowerCase() === 'info'),
      other: issues.filter(i => !['error', 'warning', 'info'].includes((i.severity || i.level || '').toLowerCase()))
    };
  };

  const renderSummaryTab = () => {
    if (!validationResult) return null;
    
    const { passed, debug_info = {}, issues = [] } = validationResult;
    const categories = getIssuesByCategory();
    
    return (
      <div className="space-y-6">
        <div className={`p-6 rounded-xl border ${
          passed 
            ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30'
            : 'bg-gradient-to-r from-red-500/10 to-pink-500/10 border-red-500/30'
        }`}>
          <div className="flex items-center space-x-4">
            {passed ? (
              <CheckCircleIcon className="w-12 h-12 text-green-400" />
            ) : (
              <XCircleIcon className="w-12 h-12 text-red-400" />
            )}
            <div>
              <h3 className={`text-2xl font-bold ${passed ? 'text-green-300' : 'text-red-300'}`}>
                Validation {passed ? 'Passed' : 'Failed'}
              </h3>
              <p className="text-slate-400">
                Playbook analyzed: {debug_info.playbook_length || testPlaybook.length || 'Unknown'} characters
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-700/50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-slate-300">{issues.length}</div>
            <div className="text-sm text-slate-400">Total Issues</div>
          </div>
          <div className="bg-red-500/10 p-4 rounded-lg text-center border border-red-500/20">
            <div className="text-2xl font-bold text-red-400">{categories.errors.length}</div>
            <div className="text-sm text-slate-400">Errors</div>
          </div>
          <div className="bg-yellow-500/10 p-4 rounded-lg text-center border border-yellow-500/20">
            <div className="text-2xl font-bold text-yellow-400">{categories.warnings.length}</div>
            <div className="text-sm text-slate-400">Warnings</div>
          </div>
          <div className="bg-blue-500/10 p-4 rounded-lg text-center border border-blue-500/20">
            <div className="text-2xl font-bold text-blue-400">{categories.info.length}</div>
            <div className="text-sm text-slate-400">Info</div>
          </div>
        </div>

        {validationResult.error_message && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-red-300 mb-2 flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
              Error Details
            </h4>
            <pre className="text-sm text-red-200 font-mono whitespace-pre-wrap">
              {validationResult.error_message}
            </pre>
          </div>
        )}
      </div>
    );
  };

  const renderIssuesTab = () => {
    if (!validationResult) return null;
    
    const categories = getIssuesByCategory();
    
    if (!validationResult.issues || validationResult.issues.length === 0) {
      return (
        <div className="text-center py-12">
          <CheckCircleIcon className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-green-300 mb-2">No Issues Found!</h3>
          <p className="text-slate-400">Your playbook passed all validation checks.</p>
        </div>
      );
    }

    const renderIssueCategory = (title: string, issues: ValidationIssue[], bgColor: string, textColor: string) => {
      if (issues.length === 0) return null;

      return (
        <div key={title} className="space-y-3">
          <button
            onClick={() => toggleSection(title)}
            className="flex items-center justify-between w-full p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700/70 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${bgColor}`}></div>
              <span className={`font-semibold ${textColor}`}>{title}</span>
              <span className="bg-slate-600/50 text-slate-300 px-2 py-1 rounded text-sm">
                {issues.length}
              </span>
            </div>
            {expandedSections.has(title) ? (
              <ChevronDownIcon className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRightIcon className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedSections.has(title) && (
            <div className="space-y-2 ml-6">
              {issues.map((issue, idx) => (
                <div key={idx} className={`p-4 rounded-lg border ${bgColor.replace('bg-', 'border-').replace('/40', '/30')} bg-slate-800/50`}>
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
      <div className="space-y-6">
        {renderIssueCategory('Errors', categories.errors, 'bg-red-500/40', 'text-red-300')}
        {renderIssueCategory('Warnings', categories.warnings, 'bg-yellow-500/40', 'text-yellow-300')}
        {renderIssueCategory('Info', categories.info, 'bg-blue-500/40', 'text-blue-300')}
        {renderIssueCategory('Other', categories.other, 'bg-slate-500/40', 'text-slate-300')}
      </div>
    );
  };

  const renderRawTab = () => {
    if (!validationResult) return null;
    
    const rawOutput = formatRawOutput(validationResult.raw_output);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Raw Lint Output</h3>
          <button
            onClick={() => copyToClipboard(rawOutput)}
            className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ClipboardDocumentIcon className="w-4 h-4" />
            <span>Copy Output</span>
          </button>
        </div>
        
        <div className="bg-slate-900/70 rounded-lg p-4 border border-slate-600/30">
          <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto max-h-96">
            {rawOutput || 'No raw output available'}
          </pre>
        </div>

        {validationResult.raw_stdout && (
          <div>
            <h4 className="text-md font-semibold text-green-300 mb-2">Standard Output</h4>
            <div className="bg-slate-900/70 rounded-lg p-4 border border-green-500/20">
              <pre className="text-sm text-green-200 font-mono whitespace-pre-wrap overflow-x-auto max-h-48">
                {validationResult.raw_stdout}
              </pre>
            </div>
          </div>
        )}

        {validationResult.raw_stderr && (
          <div>
            <h4 className="text-md font-semibold text-red-300 mb-2">Standard Error</h4>
            <div className="bg-slate-900/70 rounded-lg p-4 border border-red-500/20">
              <pre className="text-sm text-red-200 font-mono whitespace-pre-wrap overflow-x-auto max-h-48">
                {validationResult.raw_stderr}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDebugTab = () => {
    if (!validationResult) return null;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Debug Information</h3>
          <button
            onClick={() => copyToClipboard(JSON.stringify(validationResult, null, 2))}
            className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ClipboardDocumentIcon className="w-4 h-4" />
            <span>Copy All Data</span>
          </button>
        </div>

        <div className="bg-slate-700/30 rounded-lg p-4">
          <h4 className="font-semibold text-white mb-3">Validation Metadata</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {Object.entries(validationResult.debug_info || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-slate-400">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span>
                <span className="text-white">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-md font-semibold text-white mb-2">Complete Validation Result</h4>
          <div className="bg-slate-900/70 rounded-lg p-4 border border-slate-600/30">
            <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto max-h-96">
              {JSON.stringify(validationResult, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'summary', label: 'Summary', icon: CheckCircleIcon },
    { id: 'issues', label: 'Issues', icon: ExclamationTriangleIcon },
    { id: 'raw', label: 'Raw Output', icon: CodeBracketIcon },
    { id: 'debug', label: 'Debug', icon: Cog6ToothIcon }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-600">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-400 rounded-xl flex items-center justify-center">
                <DocumentTextIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Ansible Lint Inspector</h1>
                <p className="text-slate-400">Test and inspect your playbook validation results</p>
              </div>
            </div>
            
            <button
              onClick={validatePlaybook}
              disabled={isValidating || !testPlaybook.trim()}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition-all transform ${
                isValidating
                  ? "bg-purple-500/50 cursor-not-allowed scale-95"
                  : "bg-gradient-to-r from-purple-500 to-pink-500 hover:scale-105"
              }`}
            >
              <div className="flex items-center space-x-2">
                {isValidating ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    <span>Validating...</span>
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-5 h-5" />
                    <span>Validate Playbook</span>
                  </>
                )}
              </div>
            </button>
          </div>

          {/* Progress */}
          {progress && (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <ArrowPathIcon className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="text-blue-300 text-sm">{progress}</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Playbook Editor */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Test Playbook</h3>
            <textarea
              value={testPlaybook}
              onChange={(e) => setTestPlaybook(e.target.value)}
              className="w-full h-64 bg-slate-900/70 border border-slate-600 rounded-lg p-4 text-sm font-mono text-slate-300 resize-none"
              placeholder="Enter your Ansible playbook YAML here..."
            />
          </div>
        </div>

        {/* Results */}
        {validationResult && (
          <div className="bg-slate-800 rounded-lg border border-slate-600 shadow-xl">
            {/* Tabs */}
            <div className="flex border-b border-slate-600">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-700/30'
                        : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/20'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'summary' && renderSummaryTab()}
              {activeTab === 'issues' && renderIssuesTab()}
              {activeTab === 'raw' && renderRawTab()}
              {activeTab === 'debug' && renderDebugTab()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LintInspector;