// types/BackendTypes.ts
// Direct mapping to your actual backend response structure

export interface BackendAnalysisResponse {
  success?: boolean;
  error?: string;
  
  // Core analysis results
  detailed_analysis?: string;
  complexity_level?: string;
  convertible?: boolean;
  conversion_notes?: string;
  
  // Version and migration info
  version_requirements?: {
    min_chef_version?: string;
    min_ruby_version?: string;
    migration_effort?: string;
    estimated_hours?: number;
    deprecated_features?: string[];
  };
  
  // Functionality details
  functionality?: {
    primary_purpose?: string;
    services?: string[];
    packages?: string[];
    files_managed?: string[];
    reusability?: string;
    customization_points?: string[];
  };
  
  // Recommendations and actions
  recommendations?: {
    consolidation_action?: string;
    rationale?: string;
    migration_priority?: string;
    risk_factors?: string[];
  };
  
  // Technical metadata
  metadata?: {
    analyzed_at?: string;
    agent_version?: string;
    correlation_id?: string;
    technology_type?: string;
    agent_name?: string;
    agent_icon?: string;
    analysis_duration_ms?: number;
    files_analyzed?: string[];
    total_code_size?: number;
  };
  
  // Session and confidence data
  confidence_source?: string;
  session_info?: {
    cookbook_name?: string;
    method_used?: string;
    session_id?: string;
  };
  
  // Tree-sitter verified facts
  tree_sitter_facts?: {
    complexity_score?: number;
    syntax_success_rate?: number;
    total_resources?: number;
    verified_cookbook_name?: string;
    verified_version?: string;
    has_metadata?: boolean;
    is_wrapper?: boolean;
    package_count?: number;
    service_count?: number;
    file_count?: number;
    template_count?: number;
    recipe_deps?: number;
  };
  
  // Analysis method and timing
  analysis_method?: string;
  duration_ms?: number;
  
  // Additional fields from your logs
  cookbook_name?: string;
  key_operations?: string[];
  dependencies?: string | object;
  configuration_details?: string;
}

// Component props
export interface ClassificationPanelProps {
  result?: BackendAnalysisResponse;
  loading?: boolean;
  error?: string;
}

export type TabId = 'overview' | 'technical' | 'assessment';