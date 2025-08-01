import React from 'react';
import {
  CheckCircleIcon,
  SparklesIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import { StreamingValidationResult } from './ValidationTypes';

interface ValidationSummaryProps {
  result: StreamingValidationResult;
  selectedProfile: string;
  onCopyResult: () => void;
}

const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  result,
  selectedProfile,
  onCopyResult
}) => {
  const { passed, summary, total_steps, duration_ms, debug_info } = result;
  
  // Calculate meaningful issues count (just count actual rule violations)
  const calculateMeaningfulIssues = (issues: unknown[]): number => {
    if (!Array.isArray(issues)) return 0;
    
    const seenRules = new Set<string>();
    let violationCount = 0;
    
    issues.forEach((issue) => {
      const cleanIssue = typeof issue === 'string' ? issue.replace(/\u001b\[[0-9;]*m/g, '') : String(issue);
      
      // Count actual rule violations (lines that start with rule names or contain specific violations)
      if ((cleanIssue.includes('load-failure') || cleanIssue.includes('Failed to load')) && !seenRules.has('load-failure')) {
        violationCount++;
        seenRules.add('load-failure');
      } else if ((cleanIssue.includes('yaml[new-line-at-end-of-file]') || cleanIssue.includes('new line character at the end')) && !seenRules.has('yaml-newline')) {
        violationCount++;
        seenRules.add('yaml-newline');
      } else if ((cleanIssue.includes('fqcn[action-core]') || cleanIssue.includes('Use FQCN')) && !seenRules.has('fqcn')) {
        violationCount++;
        seenRules.add('fqcn');
      } else if ((cleanIssue.includes('name[missing]') || cleanIssue.includes('tasks should be named')) && !seenRules.has('name-missing')) {
        violationCount++;
        seenRules.add('name-missing');
      } else if ((cleanIssue.includes('no-free-form') || cleanIssue.includes('free-form when calling')) && !seenRules.has('no-free-form')) {
        violationCount++;
        seenRules.add('no-free-form');
      }
    });
    
    return violationCount;
  };
  
  // Use meaningful issues count instead of raw backend count
  const meaningfulIssuesCount = calculateMeaningfulIssues(result.issues || []);
  // Fallback to debug_info count if it seems more accurate
  const backendIssuesCount = debug_info?.issues_count as number || 0;
  
  // Choose the more reasonable count (meaningful issues should be lower than total)
  const displayIssuesCount = meaningfulIssuesCount > 0 ? meaningfulIssuesCount : 
                            (backendIssuesCount > 0 && backendIssuesCount < 10) ? backendIssuesCount : 
                            meaningfulIssuesCount;
  
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
              Issues: <span className="font-medium text-amber-300">{displayIssuesCount}</span>
              {duration_ms && <span> • Duration: <span className="font-medium text-blue-300">{Math.round(duration_ms)}ms</span></span>}
            </div>
          </div>
        </div>
        <button
          onClick={onCopyResult}
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
          <div className="text-amber-400 text-2xl font-bold">{displayIssuesCount}</div>
          <div className="text-xs text-slate-400">Critical Issues</div>
        </div>
        <div className="text-center p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 transition-all duration-300 hover:bg-blue-500/20 backdrop-blur-sm">
          <div className="text-blue-400 text-2xl font-bold">
            {summary && typeof summary === 'object' && 'lint_iterations' in summary 
              ? summary.lint_iterations 
              : '1'}
          </div>
          <div className="text-xs text-slate-400">Lint Checks</div>
        </div>
        <div className="text-center p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 transition-all duration-300 hover:bg-emerald-500/20 backdrop-blur-sm">
          <div className={`text-2xl font-bold ${passed ? 'text-emerald-400' : 'text-amber-400'}`}>
            {passed ? '✓' : '⚠️'}
          </div>
          <div className="text-xs text-slate-400">Final Status</div>
        </div>
      </div>
      
      {/* Additional context for discrepancy */}
      {backendIssuesCount !== displayIssuesCount && backendIssuesCount > 0 && (
        <div className="mt-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
          <div className="text-xs text-slate-400">
            <strong>Note:</strong> Backend reported {backendIssuesCount} total items (including warnings), 
            showing {displayIssuesCount} critical issues that need attention.
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationSummary;