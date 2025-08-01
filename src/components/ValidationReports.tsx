import React from 'react';
import {
  DocumentTextIcon,
  CodeBracketIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { StreamingValidationResult } from './ValidationTypes';

interface ValidationReportsProps {
  result: StreamingValidationResult;
  showCodeComparison: boolean;
  showRawOutput: boolean;
  onCopyText: (text: string) => void;
}

const ValidationReports: React.FC<ValidationReportsProps> = ({
  result,
  showCodeComparison,
  showRawOutput,
  onCopyText
}) => {
  // Clean ANSI codes but preserve structure
  const cleanAnsiCodes = (text: string): string => {
    return text
      .replace(/\u001b\[[0-9;]*m/g, '') // Remove color codes
      .replace(/\]8;;[^\\]*\\([^]]*)\]8;;\\/g, '$1') // Clean hyperlinks but keep text
      .replace(/\]8;;[^\\]*\\/g, '') // Remove incomplete hyperlink starts
      .replace(/\]8;;\\/g, '') // Remove hyperlink ends
      .replace(/\[2m/g, '') // Remove specific formatting
      .replace(/\[0m/g, '')
      .replace(/\[1m/g, '')
      .replace(/\[31m/g, '')
      .replace(/\[33m/g, '')
      .replace(/\[34m/g, '')
      .replace(/\[35m/g, '');
  };

  // Parse the complete lint output into structured sections
  const parseLintOutput = (issues: unknown[], rawOutput: string) => {
    const cleanRaw = cleanAnsiCodes(rawOutput || '');
    const issuesList = Array.isArray(issues) ? issues.map(i => cleanAnsiCodes(String(i))) : [];
    
    const sections = {
      warnings: [] as string[],
      summary: [] as string[],
      violations: [] as Array<{rule: string, message: string, file: string, line?: string}>,
      metadata: [] as string[]
    };
    
    const seenViolations = new Set<string>(); // Prevent duplicates
    
    // Process each line/item
    [...issuesList].forEach(item => {
      const line = item.trim();
      if (!line) return;
      
      // Categorize different types of output
      if (line.includes('WARNING')) {
        sections.warnings.push(line);
      } else if (line.includes('Rule Violation Summary') || line.includes('Failed:')) {
        sections.summary.push(line);
      } else if (line.includes('profile:') && line.includes('tags:')) {
        sections.summary.push(line);
      } else if (line.includes('load-failure') || line.includes('yaml[new-line-at-end-of-file]') || 
                 line.includes('fqcn[action-core]') || line.includes('name[missing]') || 
                 line.includes('no-free-form')) {
        // Parse specific rule violations
        let rule = 'unknown';
        let message = line;
        
        if (line.includes('load-failure')) {
          rule = 'load-failure';
          message = 'Failed to load or parse file - check YAML syntax';
        } else if (line.includes('yaml[new-line-at-end-of-file]')) {
          rule = 'yaml[new-line-at-end-of-file]';
          message = 'Missing newline at end of file';
        } else if (line.includes('fqcn[action-core]')) {
          rule = 'fqcn[action-core]';
          message = 'Use fully qualified collection name for builtin modules';
        } else if (line.includes('name[missing]')) {
          rule = 'name[missing]';
          message = 'All tasks should have descriptive names';
        } else if (line.includes('no-free-form')) {
          rule = 'no-free-form';
          message = 'Avoid free-form syntax, use structured parameters';
        }
        
        const fileMatch = line.match(/([^/]*\.yml):(\d+)/);
        const violationKey = `${rule}-${fileMatch?.[2] || 'unknown'}`;
        
        if (!seenViolations.has(violationKey)) {
          sections.violations.push({
            rule,
            message,
            file: fileMatch?.[1] || 'playbook',
            line: fileMatch?.[2]
          });
          seenViolations.add(violationKey);
        }
      } else if (line.includes('.yml:') && !line.includes('/private/') && !line.includes('/tmp/')) {
        // Other rule violations
        const ruleMatch = line.match(/^([a-z-]+(?:\[[^\]]+\])?)/);
        const fileMatch = line.match(/([^/]*\.yml):(\d+)/);
        
        if (ruleMatch && fileMatch) {
          const violationKey = `${ruleMatch[1]}-${fileMatch[2]}`;
          if (!seenViolations.has(violationKey)) {
            sections.violations.push({
              rule: ruleMatch[1],
              message: line,
              file: fileMatch[1],
              line: fileMatch[2]
            });
            seenViolations.add(violationKey);
          }
        }
      } else if (line.length > 5 && !line.includes('/private/') && !line.includes('/tmp/')) {
        sections.metadata.push(line);
      }
    });
    
    return sections;
  };

  const renderCodeComparison = () => {
    if (!showCodeComparison) return null;
    
    const { original_code, final_code } = result;
    
    return (
      <div className="bg-slate-800/40 rounded-lg border border-slate-600/30 p-4 backdrop-blur-sm" style={{animation: 'fadeIn 0.5s ease-out'}}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-slate-200 flex items-center space-x-2">
            <CodeBracketIcon className="w-4 h-4 text-slate-400" />
            <span>Before & After Comparison</span>
          </h4>
          <button
            onClick={() => onCopyText(`ORIGINAL:\n${original_code}\n\nFIXED:\n${final_code}`)}
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
    // Get the agent_response and parse the complete output
    const agentResponse = result.debug_info?.agent_response as string || '';
    const backendIssues = result.issues || [];
    const rawOutput = typeof result.raw_output === 'string' ? result.raw_output : '';
    
    // Handle case where agent_response contains JSON function call
    let displayAgentResponse = agentResponse;
    if (agentResponse && agentResponse.includes('"type": "function"')) {
      try {
        const parsed = JSON.parse(agentResponse);
        if (parsed.type === 'function' && parsed.name === 'run_ansible_lint') {
          displayAgentResponse = 'Backend returned function call format. The validation endpoint may need configuration.';
        }
      } catch {
        // If parsing fails, keep original
      }
    }
    
    const sections = parseLintOutput(backendIssues, rawOutput);
    
    return (
      <div className="bg-slate-800/40 rounded-lg border border-slate-600/30 p-4 backdrop-blur-sm" style={{animation: 'fadeIn 0.5s ease-out'}}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-slate-200 flex items-center space-x-2">
            <DocumentTextIcon className="w-4 h-4 text-slate-400" />
            <span>Complete Lint Report</span>
          </h4>
          <button
            onClick={() => onCopyText(displayAgentResponse || rawOutput || 'No output available')}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Copy Full Report
          </button>
        </div>
        
        {/* Agent Analysis Summary */}
        {displayAgentResponse && (
          <div className="mb-4">
            <h5 className="text-sm font-medium text-slate-300 mb-2 flex items-center space-x-2">
              <InformationCircleIcon className="w-4 h-4 text-blue-400" />
              <span>AI Analysis</span>
            </h5>
            <div className={`rounded-lg p-4 border backdrop-blur-sm ${
              displayAgentResponse.includes('function call format') 
                ? 'bg-amber-900/20 border-amber-500/30' 
                : 'bg-blue-900/20 border-blue-500/30'
            }`}>
              <div className={`text-sm whitespace-pre-wrap leading-relaxed ${
                displayAgentResponse.includes('function call format') 
                  ? 'text-amber-100' 
                  : 'text-blue-100'
              }`}>
                {cleanAnsiCodes(displayAgentResponse)}
              </div>
            </div>
          </div>
        )}

        {/* Show a helpful message if no violations found but this seems wrong */}
        {sections.violations.length === 0 && backendIssues.length === 0 && (
          <div className="mb-4">
            <h5 className="text-sm font-medium text-slate-300 mb-2 flex items-center space-x-2">
              <InformationCircleIcon className="w-4 h-4 text-amber-400" />
              <span>Validation Status</span>
            </h5>
            <div className="bg-amber-900/20 rounded-lg p-4 border border-amber-500/30 backdrop-blur-sm">
              <div className="text-sm text-amber-100">
                No lint violations detected. This could mean:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>The playbook is valid and follows best practices</li>
                  <li>The backend validation service needs configuration</li>
                  <li>The lint rules may not be detecting issues with this playbook</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Violations Section */}
        {sections.violations.length > 0 && (
          <div className="mb-4">
            <h5 className="text-sm font-medium text-slate-300 mb-3 flex items-center space-x-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
              <span>Rule Violations ({sections.violations.length})</span>
            </h5>
            <div className="space-y-2">
              {sections.violations.map((violation, index) => (
                <div key={index} className="bg-red-900/20 rounded-lg p-3 border border-red-500/30 backdrop-blur-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        <span className="text-sm font-mono text-red-300 bg-red-500/20 px-2 py-1 rounded">
                          {violation.rule}
                        </span>
                        {violation.line && (
                          <span className="text-xs text-slate-400">
                            Line {violation.line}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-red-100 font-mono bg-slate-900/50 p-2 rounded mt-2">
                        {violation.message}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Section */}
        {sections.summary.length > 0 && (
          <div className="mb-4">
            <h5 className="text-sm font-medium text-slate-300 mb-2 flex items-center space-x-2">
              <DocumentTextIcon className="w-4 h-4 text-amber-400" />
              <span>Lint Summary</span>
            </h5>
            <div className="bg-amber-900/20 rounded-lg p-3 border border-amber-500/30 backdrop-blur-sm">
              {sections.summary.map((item, index) => (
                <div key={index} className="text-sm text-amber-100 font-mono mb-1">
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings Section */}
        {sections.warnings.length > 0 && (
          <div className="mb-4">
            <h5 className="text-sm font-medium text-slate-300 mb-2 flex items-center space-x-2">
              <InformationCircleIcon className="w-4 h-4 text-yellow-400" />
              <span>System Warnings ({sections.warnings.length})</span>
            </h5>
            <div className="bg-yellow-900/20 rounded-lg p-3 border border-yellow-500/30 backdrop-blur-sm">
              {sections.warnings.map((warning, index) => (
                <div key={index} className="text-xs text-yellow-200 mb-1">
                  {warning}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Metadata */}
        {sections.metadata.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-slate-300 mb-2 flex items-center space-x-2">
              <DocumentTextIcon className="w-4 h-4 text-slate-500" />
              <span>Additional Details</span>
            </h5>
            <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30 backdrop-blur-sm">
              {sections.metadata.map((item, index) => (
                <div key={index} className="text-xs text-slate-400 font-mono mb-1">
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className="mt-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-red-400">{sections.violations.length}</div>
              <div className="text-xs text-slate-400">Violations</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-400">{sections.warnings.length}</div>
              <div className="text-xs text-slate-400">Warnings</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-400">{sections.summary.length}</div>
              <div className="text-xs text-slate-400">Summary Items</div>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-400">{Array.isArray(result.issues) ? result.issues.length : 0}</div>
              <div className="text-xs text-slate-400">Total Items</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRawOutput = () => {
    if (!showRawOutput) return null;
    
    return (
      <div className="bg-slate-800/40 rounded-lg border border-slate-600/30 p-4 backdrop-blur-sm" style={{animation: 'fadeIn 0.5s ease-out'}}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-slate-200 flex items-center space-x-2">
            <DocumentTextIcon className="w-4 h-4 text-slate-400" />
            <span>Raw Debug Output</span>
          </h4>
          <button
            onClick={() => onCopyText(typeof result.raw_output === 'string' 
              ? result.raw_output 
              : typeof result.raw_output === 'object' && result.raw_output 
                ? JSON.stringify(result.raw_output, null, 2)
                : 'No raw output available')}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Copy Output
          </button>
        </div>
        
        <div className="bg-slate-900/70 rounded-lg p-4 border border-slate-600/30 backdrop-blur-sm">
          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto max-h-64 validation-scrollbar">
            {typeof result.raw_output === 'string' 
              ? cleanAnsiCodes(result.raw_output)
              : typeof result.raw_output === 'object' && result.raw_output 
                ? JSON.stringify(result.raw_output, null, 2)
                : 'No raw output available'}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderCodeComparison()}
      {renderLintReport()}
      {renderRawOutput()}
    </>
  );
};

export default ValidationReports;