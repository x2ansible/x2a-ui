// TypeScript type definitions for backend analysis responses

export interface BackendAnalysisResponse {
  // Core analysis data
  detailed_analysis?: string;
  description?: string | object;
  analysis_summary?: string;
  
  // Agent and session metadata
  metadata?: {
    agent_name?: string;
    agent_icon?: string;
    technology_type?: string;
    correlation_id?: string;
    analysis_duration_ms?: number;
    files_analyzed?: string[];
    total_code_size?: number;
    analyzed_at?: string;
  };
  
  session_info?: {
    session_id?: string;
    correlation_id?: string;
    analysis_time_seconds?: number;
  };
  
  // Timing information
  duration_ms?: number;
  
  // Functionality assessment
  functionality?: {
    primary_purpose?: string;
    key_features?: string[];
    services?: string[];
    packages?: string[];
    files_managed?: string[];
    reusability?: string;
    customization_points?: string[];
  };
  
  // Operations and capabilities
  key_operations?: string[];
  
  // Complexity assessment
  complexity_level?: string;
  tree_sitter_facts?: {
    complexity_score?: number;
    syntax_success_rate?: number;
    total_resources?: number;
    verified_cookbook_name?: string;
    verified_version?: string;
    has_metadata?: boolean;
  };
  
  // Version and upgrade requirements
  version_requirements?: {
    min_chef_version?: string;
    min_ruby_version?: string;
    min_salt_version?: string;
    min_ansible_version?: string;
    min_puppet_version?: string;
    migration_effort?: string;
    estimated_hours?: number;
    deprecated_features?: string[];
  };
  
  // Upgrade analysis
  upgrade_analysis?: {
    current_version?: string;
    recommended_version?: string;
    breaking_changes?: string[];
    deprecated_modules?: string[];
    collection_migrations?: string[];
    syntax_updates?: string[];
  };
  
  // Recommendations and risk
  recommendations?: {
    rationale?: string;
    upgrade_priority?: string;
    priority?: string;
    risk_factors?: string[];
    migration_priority?: string;
    consolidation_action?: string;
  };
  
  // Ansible upgrade specific fields (from your sample response)
  current_state?: {
    estimated_version?: string;
    deprecated_modules?: string[];
    complexity_indicators?: string[];
  };
  
  upgrade_requirements?: {
    fqcn_conversions_needed?: string[];
    structural_changes_needed?: string[];
    syntax_modernizations_needed?: string[];
  };
  
  complexity_assessment?: {
    level?: string;
    risk_level?: string;
    estimated_effort_hours?: number;
  };
  
  recommended_version?: string;
  
  // Salt specific fields
  state_module_usage?: string[] | object;
  
  // Puppet specific fields
  object_type?: string;
  object_name?: string;
  puppet_resources?: {
    total_resources?: number;
    resource_types?: Record<string, number>;
    dependencies?: string[];
    complexity_indicators?: string[];
  };
  
  // Dependency information
  dependencies?: {
    is_wrapper?: boolean;
    circular_risk?: 'high' | 'medium' | 'low';
    direct_deps?: string[];
    runtime_deps?: string[];
    wrapped_cookbooks?: string[];
  };
  
  // Generic extension for any additional fields
  [key: string]: unknown;
}

// Props for classification panel components
export interface ClassificationPanelProps {
  result: BackendAnalysisResponse | null | undefined;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}

// Tab identifier type
export type TabId = 'overview' | 'technical' | 'assessment';

// Export additional types for component usage
export interface AnalysisTabProps {
  result: BackendAnalysisResponse;
}

export interface AgentInfo {
  name: string;
  icon: string;
  technology: string;
  correlationId?: string;
  sessionId?: string;
}

export interface TimingInfo {
  display: string;
  ms: number;
}

export interface MigrationInfo {
  effort: string;
  hours?: number;
  display: string;
  color: string;
}

export interface ComplexityInfo {
  source: string;
  score?: number;
  level: string;
  display: string;
}

export interface RiskInfo {
  level: string;
  factors: string[];
  deprecatedCount?: number;
  conversionCount?: number;
  color: string;
}

export interface VersionRequirements {
  chef?: string;
  ruby?: string;
  salt?: string;
  ansible?: string;
  effort?: string;
  hours?: number;
  deprecated: string[];
}

export interface UpgradeInfo {
  currentVersion: string;
  recommendedVersion: string;
  breakingChangesCount: number;
  deprecatedModulesCount: number;
  migrationCount: number;
  syntaxUpdatesCount: number;
  hasUpgradeData: boolean;
  upgradeNeeded: boolean;
}