// src/types/api.ts - Complete file with dynamic language support

export interface ClassificationResponse { 
  classification: string; 
  summary?: string;
  detailed_analysis?: string;
  resources?: string[];
  key_operations?: string[];
  dependencies?: string;
  configuration_details?: string;
  complexity_level?: string;
  convertible?: boolean;
  conversion_notes?: string;
  duration_ms?: number;
  manual_estimate_ms?: number;
  speedup?: number;
  error?: string;
  
  // Dynamic language detection fields
  cookbook_name?: string;
  version_requirements?: {
    min_chef_version?: string;
    min_ruby_version?: string;
    migration_effort?: string;
    estimated_hours?: number;
    deprecated_features?: string[];
  };
  functionality?: {
    primary_purpose?: string;
    services?: string[];
    packages?: string[];
    files_managed?: string[];
    reusability?: string;
    customization_points?: string[];
  };
  recommendations?: {
    consolidation_action?: string;
    rationale?: string;
    migration_priority?: string;
    risk_factors?: string[];
  };
  metadata?: {
    analyzed_at?: string;
    agent_version?: string;
    correlation_id?: string;
  };
  confidence_source?: string;
  session_info?: {
    cookbook_name?: string;
    method_used?: string;
    session_id?: string;
  };
  tree_sitter_facts?: {
    complexity_score?: number;
    syntax_success_rate?: number;
    total_resources?: number;
    verified_cookbook_name?: string;
    verified_version?: string;
    has_metadata?: boolean;
  };
  analysis_method?: string;
}

export interface ClassificationResult {
  classification: string;
  summary?: string;
  detailed_analysis?: string;
  resources?: string[];
  key_operations?: string[];
  dependencies?: string;
  configuration_details?: string;
  complexity_level?: string;
  convertible: boolean;
  conversion_notes?: string;
  duration_ms?: number;
  manual_estimate_ms?: number;
  speedup?: number;
  error?: string;
  
  // Dynamic language detection fields
  cookbook_name?: string;
  version_requirements?: {
    min_chef_version?: string;
    min_ruby_version?: string;
    migration_effort?: string;
    estimated_hours?: number;
    deprecated_features?: string[];
  };
  functionality?: {
    primary_purpose?: string;
    services?: string[];
    packages?: string[];
    files_managed?: string[];
    reusability?: string;
    customization_points?: string[];
  };
  recommendations?: {
    consolidation_action?: string;
    rationale?: string;
    migration_priority?: string;
    risk_factors?: string[];
  };
  metadata?: {
    analyzed_at?: string;
    agent_version?: string;
    correlation_id?: string;
  };
  confidence_source?: string;
  session_info?: {
    cookbook_name?: string;
    method_used?: string;
    session_id?: string;
  };
  tree_sitter_facts?: {
    complexity_score?: number;
    syntax_success_rate?: number;
    total_resources?: number;
    verified_cookbook_name?: string;
    verified_version?: string;
    has_metadata?: boolean;
  };
  analysis_method?: string;
}

export interface FileUploadResponse {
  saved_files: string[];
  error?: string;
}

export interface FileListResponse {
  folders?: string[];
  files?: string[];
  error?: string;
}

export interface CloneResponse {
  cloned?: string;
  error?: string;
}

export interface TreeItem {
  type: "file" | "folder";
  name: string;
}

export interface TreeResponse {
  items: TreeItem[];
  error?: string;
}