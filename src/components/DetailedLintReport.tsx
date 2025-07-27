import React, { useState } from 'react';
import {
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BugAntIcon,
  Cog6ToothIcon,
  CodeBracketIcon
} from "@heroicons/react/24/outline";

interface LintReportProps {
  validationResult: unknown;
  onClose?: () => void;
}

const DetailedLintReport: React.FC<LintReportProps> = ({ validationResult, onClose }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'issues' | 'raw' | 'debug'>('summary');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  if (!validationResult) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-600">
        <div className="text-center py-8">
          <BugAntIcon className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No Validation Results</h3>
          <p className="text-slate-400">Run a validation to see the detailed report</p>
        </div>
      </div>
    );
  }

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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
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
    const issues = ((validationResult as Record<string, unknown>).issues as Record<string, unknown>[]) || [];
    const categories = {
      errors: issues.filter((i: Record<string, unknown>) => ((i.severity as string) || (i.level as string) || '').toLowerCase() === 'error'),
      warnings: issues.filter((i: Record<string, unknown>) => ((i.severity as string) || (i.level as string) || '').toLowerCase() === 'warning'),
      info: issues.filter((i: Record<string, unknown>) => ((i.severity as string) || (i.level as string) || '').toLowerCase() === 'info'),
      other: issues.filter((i: Record<string, unknown>) => !['error', 'warning', 'info'].includes(((i.severity as string) || (i.level as string) || '').toLowerCase()))
    };
    return categories;
  };

  const renderSummaryTab = () => {
    const result = validationResult as Record<string, unknown>;
    const passed = result.passed as boolean;
    const debug_info = (result.debug_info as Record<string, unknown>) || {};
    const issues = (result.issues as unknown[]) || [];
    const categories = getIssuesByCategory();
    
    return (
      <div className="space-y-6">
        {/* Overall Status */}
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
                Playbook analyzed: {(debug_info.playbook_length as number) || 'Unknown'} characters
              </p>
            </div>
          </div>
        </div>

        {/* Issue Statistics */}
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

        {/* Summary Information */}
        <div className="bg-slate-700/30 rounded-lg p-4">
          <h4 className="font-semibold text-white mb-3">Validation Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Profile:</span>
              <span className="text-white ml-2">{(debug_info.profile as string) || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-slate-400">Status:</span>
              <span className={`ml-2 ${passed ? 'text-green-400' : 'text-red-400'}`}>
                {(debug_info.status as string) || (passed ? 'Passed' : 'Failed')}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Rules Applied:</span>
              <span className="text-white ml-2">{(debug_info.rules_count as string) || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-slate-400">Execution Time:</span>
              <span className="text-white ml-2">{(debug_info.execution_time as string) || 'Unknown'}</span>
            </div>
          </div>
        </div>

        {/* Error Message (if any) */}
        {(validationResult as any).error_message && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-red-300 mb-2 flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
              Error Details
            </h4>
            <pre className="text-sm text-red-200 font-mono whitespace-pre-wrap">
              {(validationResult as any).error_message}
            </pre>
          </div>
        )}
      </div>
    );
  };

  const renderIssuesTab = () => {
    const categories = getIssuesByCategory();
    
    if (!(validationResult as any).issues || (validationResult as any).issues.length === 0) {
      return (
        <div className="text-center py-12">
          <CheckCircleIcon className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-green-300 mb-2">No Issues Found!</h3>
          <p className="text-slate-400">Your playbook passed all validation checks.</p>
        </div>
      );
    }

    const renderIssueCategory = (title: string, issues: unknown[], severity: string, bgColor: string, textColor: string) => {
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
              {issues.map((issue: any, idx: number) => (
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
        {renderIssueCategory('Errors', categories.errors, 'error', 'bg-red-500/40', 'text-red-300')}
        {renderIssueCategory('Warnings', categories.warnings, 'warning', 'bg-yellow-500/40', 'text-yellow-300')}
        {renderIssueCategory('Info', categories.info, 'info', 'bg-blue-500/40', 'text-blue-300')}
        {renderIssueCategory('Other', categories.other, 'other', 'bg-slate-500/40', 'text-slate-300')}
      </div>
    );
  };

  const renderRawTab = () => {
    const rawOutput = formatRawOutput((validationResult as any).raw_output);
    
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

        {/* Additional raw data sections */}
        {(validationResult as any).raw_stdout && (
          <div>
            <h4 className="text-md font-semibold text-green-300 mb-2">Standard Output</h4>
            <div className="bg-slate-900/70 rounded-lg p-4 border border-green-500/20">
              <pre className="text-sm text-green-200 font-mono whitespace-pre-wrap overflow-x-auto max-h-48">
                {(validationResult as any).raw_stdout}
              </pre>
            </div>
          </div>
        )}

        {(validationResult as any).raw_stderr && (
          <div>
            <h4 className="text-md font-semibold text-red-300 mb-2">Standard Error</h4>
            <div className="bg-slate-900/70 rounded-lg p-4 border border-red-500/20">
              <pre className="text-sm text-red-200 font-mono whitespace-pre-wrap overflow-x-auto max-h-48">
                {(validationResult as any).raw_stderr}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDebugTab = () => {
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

        {/* Debug Info */}
        <div className="bg-slate-700/30 rounded-lg p-4">
          <h4 className="font-semibold text-white mb-3">Validation Metadata</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {Object.entries((validationResult as any).debug_info || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-slate-400">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span>
                <span className="text-white">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Full JSON */}
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
    <div className="bg-slate-800 rounded-lg border border-slate-600 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-600">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-400 rounded-xl flex items-center justify-center">
            <DocumentTextIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Detailed Lint Report</h2>
            <p className="text-sm text-slate-400">Complete validation analysis</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700/50"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-600">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
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
  );
};

export default DetailedLintReport;