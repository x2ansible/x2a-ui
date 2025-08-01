// ValidationTypes.ts - Shared types for validation components

export interface ValidationStep {
    step: number;
    agent_action: 'lint' | 'llm_fix';
    summary: string;
    code: string;
    message?: string;
    timestamp?: number;
  }
  
  export interface LintIssue {
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
  
  export interface LintRecommendation {
    issue: string;
    recommendation: string;
  }
  
  export interface LintSummary {
    passed: boolean;
    violations: number;
    warnings: number;
    total_issues: number;
  }
  
  export interface SingleLintResult {
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
  
  export interface StreamingValidationResult {
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
  
  export interface ValidationPanelProps {
    playbook?: string;
    validationConfig?: unknown;
    onLogMessage?: (msg: string) => void;
    onValidationComplete?: (result: unknown) => void;
    selectedProfile?: string;
  }