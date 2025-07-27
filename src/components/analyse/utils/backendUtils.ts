// components/analyse/utils/backendUtils.ts
// Clean utilities for accessing backend data without transformation
// EXTENDED: Safe object handling for Salt compatibility

import { BackendAnalysisResponse } from '../types/BackendTypes';

// SAFE: Extract string from potentially nested object (for Salt compatibility)
const safeStringExtract = (data: unknown): string => {
  if (typeof data === 'string') return data;
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    // Try common text fields
    if (obj.description) return String(obj.description);
    if (obj.summary) return String(obj.summary);
    if (obj.text) return String(obj.text);
    if (obj.rationale) return String(obj.rationale);
    // If object has single string value, use it
    const values = Object.values(obj).filter(v => typeof v === 'string');
    if (values.length === 1) return values[0] as string;
    // Last resort: serialize safely
    return JSON.stringify(data, null, 2);
  }
  return String(data || '');
};

// Direct backend value access - no fallback generation
export const getBackendValue = (data: unknown, fallback: string = 'Not specified'): string => {
  if (data === undefined || data === null || data === '' || data === 'Unknown') {
    return fallback;
  }
  // SAFE: Handle objects that might contain strings
  return safeStringExtract(data);
};

// Check if backend actually provided meaningful data
export const hasBackendData = (data: unknown): boolean => {
  if (data === undefined || data === null || data === '') return false;
  // Make case-insensitive check for unknown values
  if (typeof data === 'string' && data.toLowerCase() === 'unknown') return false;
  if (typeof data === 'object' && Object.keys(data as Record<string, unknown>).length === 0) return false;
  return true;
};

// SAFE: Get analysis content for display - UPDATED to handle Puppet with debugging
export const getAnalysisContent = (result: BackendAnalysisResponse) => {
  console.log('🔍 getAnalysisContent called with result:', result);
  console.log('🔍 result.detailed_analysis:', result?.detailed_analysis);
  console.log('🔍 typeof result.detailed_analysis:', typeof result?.detailed_analysis);
  console.log('🔍 hasBackendData(result?.detailed_analysis):', hasBackendData(result?.detailed_analysis));
  
  // Try detailed_analysis first (Chef/BladeLogic/Puppet format)
  if (hasBackendData(result?.detailed_analysis)) {
    const content = safeStringExtract(result.detailed_analysis);
    console.log(' Found detailed_analysis, extracted content:', content);
    return {
      content: content,
      type: 'Detailed Analysis',
      description: 'Information on the IaC analyzed'
    };
  }
  
  // Try description (Salt format)
  if (hasBackendData(result?.description)) {
    console.log(' Found description:', result.description);
    return {
      content: safeStringExtract(result.description),
      type: 'Analysis Description', 
      description: 'Salt state analysis results'
    };
  }
  
  // Try primary purpose
  if (hasBackendData(result?.functionality?.primary_purpose)) {
    console.log(' Found primary_purpose:', result.functionality!.primary_purpose);
    return {
      content: safeStringExtract(result.functionality!.primary_purpose),
      type: 'Primary Purpose',
      description: 'What this automation accomplishes'
    };
  }
  
  // Try recommendations rationale (safe object handling)
  if (hasBackendData(result?.recommendations)) {
    const rec = result.recommendations;
    let content = '';
    
    if (typeof rec === 'string') {
      content = rec;
    } else if (typeof rec === 'object' && rec.rationale) {
      content = safeStringExtract(rec.rationale);
    } else if (typeof rec === 'object') {
      content = safeStringExtract(rec);
    }
    
    if (content) {
      console.log(' Found recommendations content:', content);
      return {
        content,
        type: 'Analysis Rationale',
        description: 'Reasoning behind recommendations'
      };
    }
  }
  
  // NEW: Try Puppet-specific analysis content
  if (result?.object_type && result?.puppet_resources) {
    const puppetInfo = result.puppet_resources;
    const content = `Puppet ${result.object_type} analysis: ${puppetInfo.total_resources || 0} resources detected. ${puppetInfo.complexity_indicators?.length ? `Complexity indicators: ${puppetInfo.complexity_indicators.join(', ')}.` : ''}`;
    console.log(' Found Puppet-specific content:', content);
    return {
      content,
      type: 'Puppet Analysis',
      description: 'Puppet manifest analysis results'
    };
  }
  
  console.log('❌ No analysis content found');
  return null;
};

// Agent information from backend - UPDATED to handle Puppet with nested session_info
export const getAgentInfo = (result: BackendAnalysisResponse) => {
  // Check for Puppet-specific data structure first (nested session_info)
  if (result?.object_type || result?.object_name) {
    return {
      name: 'Puppet Analysis Agent',
      icon: '🎭',
      technology: 'puppet',
      correlationId: result.session_info?.correlation_id,
      sessionId: result.session_info?.session_id
    };
  }
  
  // Check for metadata-based agent info (existing Chef/BladeLogic/Salt format)
  if (result?.metadata?.agent_name) {
    return {
      name: result.metadata.agent_name,
      icon: result.metadata.agent_icon || '',
      technology: result.metadata.technology_type || 'unknown',
      correlationId: result.metadata.correlation_id,
      sessionId: undefined // metadata doesn't have session_id
    };
  }
  
  // Check for top-level session_info (existing format)
  if (result?.session_info?.session_id) {
    return {
      name: 'Analysis Agent',
      icon: '🤖',
      technology: 'unknown',
      correlationId: result.session_info.correlation_id,
      sessionId: result.session_info.session_id
    };
  }
  
  // Fallback for any other format
  return {
    name: 'Analysis Agent',
    icon: '🤖',
    technology: 'unknown',
    correlationId: result?.metadata?.correlation_id || result?.session_info?.correlation_id,
    sessionId: result?.session_info?.session_id
  };
};

// Analysis timing from backend
export const getAnalysisTiming = (result: BackendAnalysisResponse) => {
  // Check for Puppet's nested session_info first
  if (result?.session_info?.analysis_time_seconds) {
    const durationMs = result.session_info.analysis_time_seconds * 1000;
    if (durationMs < 1000) return { display: `${Math.round(durationMs)}ms`, ms: durationMs };
    if (durationMs < 60000) return { display: `${(durationMs / 1000).toFixed(1)}s`, ms: durationMs };
    return { display: `${(durationMs / 60000).toFixed(1)}m`, ms: durationMs };
  }
  
  // Existing logic for other technologies
  const durationMs = result.duration_ms || result.metadata?.analysis_duration_ms;
  
  if (!durationMs) return { display: 'Not tracked', ms: 0 };
  
  if (durationMs < 1000) return { display: `${durationMs}ms`, ms: durationMs };
  if (durationMs < 60000) return { display: `${(durationMs / 1000).toFixed(1)}s`, ms: durationMs };
  return { display: `${(durationMs / 60000).toFixed(1)}m`, ms: durationMs };
};

// Migration effort from backend
export const getMigrationInfo = (result: BackendAnalysisResponse) => {
  const effort = result.version_requirements?.migration_effort;
  const hours = result.version_requirements?.estimated_hours;
  
  if (!effort) return null;
  
  const display = hours ? `${effort} (${hours}h)` : effort;
  const color = effort === 'LOW' ? 'text-green-400' : 
               effort === 'HIGH' ? 'text-red-400' : 'text-yellow-400';
  
  return { effort, hours, display, color };
};

// Complexity from backend - UPDATED to handle Puppet with proper colors
export const getComplexityInfo = (result: BackendAnalysisResponse) => {
  // Check for Puppet-specific complexity
  if (result?.complexity_level) {
    const level = result.complexity_level.toUpperCase();
    let color = 'text-gray-400'; // default
    
    // Add proper color mapping for Puppet complexity
    if (level === 'LOW') {
      color = 'text-green-400';
    } else if (level === 'MEDIUM') {
      color = 'text-yellow-400';
    } else if (level === 'HIGH') {
      color = 'text-red-400';
    }
    
    return { 
      source: 'puppet', 
      level: level, 
      display: level,
      color: color
    };
  }
  
  const treeScore = result.tree_sitter_facts?.complexity_score;
  const llmLevel = result.complexity_level;
  
  if (treeScore !== undefined) {
    const level = treeScore > 15 ? 'HIGH' : treeScore > 8 ? 'MEDIUM' : 'LOW';
    return { source: 'tree-sitter', score: treeScore, level, display: `${level} (${treeScore})` };
  }
  
  if (llmLevel) {
    return { source: 'llm', level: llmLevel.toUpperCase(), display: llmLevel };
  }
  
  return null;
};

// Risk assessment from backend data
export const getRiskInfo = (result: BackendAnalysisResponse) => {
  const riskFactors = result.recommendations?.risk_factors || [];
  const migrationEffort = result.version_requirements?.migration_effort;
  
  let level = 'LOW';
  if (riskFactors.length > 2 || migrationEffort === 'HIGH') {
    level = 'HIGH';
  } else if (riskFactors.length > 0 || migrationEffort === 'MEDIUM') {
    level = 'MEDIUM';
  }
  
  const color = level === 'HIGH' ? 'text-red-400' : 
               level === 'MEDIUM' ? 'text-yellow-400' : 'text-green-400';
  
  return { level, factors: riskFactors, color };
};

// SAFE: Format arrays for display (handles objects that might contain arrays)
export const formatArray = (arr: string[] | unknown | undefined, limit: number = 3): string => {
  // Handle array input
  if (Array.isArray(arr)) {
    if (arr.length === 0) return 'None';
    if (arr.length <= limit) return arr.join(', ');
    return `${arr.slice(0, limit).join(', ')} (+${arr.length - limit} more)`;
  }
  
  // Handle object that might contain arrays
  if (typeof arr === 'object' && arr !== null) {
    const obj = arr as Record<string, unknown>;
    const arrayValues = Object.values(obj).filter(v => Array.isArray(v));
    if (arrayValues.length > 0) {
      return formatArray(arrayValues[0] as string[], limit);
    }
    // Convert object keys to comma-separated string
    const keys = Object.keys(obj);
    if (keys.length === 0) return 'None';
    if (keys.length <= limit) return keys.join(', ');
    return `${keys.slice(0, limit).join(', ')} (+${keys.length - limit} more)`;
  }
  
  // Handle string input
  if (typeof arr === 'string') return arr;
  
  return 'None';
};

// Version requirements (SAFE: supports both Chef and Salt versions)
export const getVersionRequirements = (result: BackendAnalysisResponse): {
  chef: string;
  ruby: string;
  salt: string;
  ansible: string;
  puppet: string;
  effort?: string;
  hours?: number;
  deprecated: string[];
} | null => {
  const vr = result.version_requirements;
  if (!vr) return null;
  
  return {
    chef: getBackendValue(vr.min_chef_version),
    ruby: getBackendValue(vr.min_ruby_version),
    salt: getBackendValue((vr as Record<string, unknown>).min_salt_version), // Salt support
    ansible: getBackendValue(vr.min_ansible_version), // Add missing ansible support
    puppet: getBackendValue(vr.min_puppet_version), // Add Puppet support
    effort: vr.migration_effort,
    hours: vr.estimated_hours,
    deprecated: vr.deprecated_features || []
  };
};

// SAFE: Extract key operations (handles both array and object formats)
export const getKeyOperations = (result: BackendAnalysisResponse): string[] => {
  // Standard key_operations field
  if (result.key_operations && Array.isArray(result.key_operations)) {
    return result.key_operations;
  }
  
  // Salt might use state_module_usage
  if ((result as Record<string, unknown>).state_module_usage) {
    const stateUsage = (result as Record<string, unknown>).state_module_usage;
    if (Array.isArray(stateUsage)) return stateUsage as string[];
    if (typeof stateUsage === 'object') return Object.keys(stateUsage as Record<string, unknown>) as string[];
  }
  
  return [];
};

// SAFE: Extract upgrade info (for Ansible upgrade analysis and similar workflows)
export function getUpgradeInfo(result: BackendAnalysisResponse) {
  // Defensive: Only return info if present and well-formed, otherwise return default shape
  if (
    result &&
    (result as Record<string, unknown>).upgrade &&
    typeof (result as Record<string, unknown>).upgrade === 'object'
  ) {
    const upgrade = (result as Record<string, unknown>).upgrade as Record<string, unknown>;
    return {
      hasUpgradeData: true,
      breakingChangesCount: upgrade.breakingChangesCount ?? 0,
      currentVersion: upgrade.currentVersion ?? 'Not specified',
      recommendedVersion: upgrade.recommendedVersion ?? 'Not specified',
      ...upgrade,
    };
  }
  // No upgrade info found, return a default
  return {
    hasUpgradeData: false,
    breakingChangesCount: 0,
    currentVersion: 'Not specified',
    recommendedVersion: 'Not specified',
  };
}

// Analysis status - UPDATED to handle Puppet with better status
export function getAnalysisStatus(result: BackendAnalysisResponse) {
  // Puppet-specific status based on complexity and object type
  if (result?.object_type && result?.complexity_level) {
    const complexity = result.complexity_level.toUpperCase();
    
    if (complexity === 'LOW') {
      return 'Ready for Conversion';
    } else if (complexity === 'MEDIUM') {
      return 'Review Recommended';
    } else if (complexity === 'HIGH') {
      return 'Complex - Manual Review';
    }
  }
  
  // Prefer explicit upgrade info if present
  if (result && (result as Record<string, unknown>).upgrade && typeof (result as Record<string, unknown>).upgrade === 'object') {
    const upgrade = (result as Record<string, unknown>).upgrade as Record<string, unknown>;
    if ('breakingChangesCount' in upgrade) {
      return (upgrade.breakingChangesCount as number) > 0 ? 'Upgrade Needed' : 'Up to Date';
    }
    if ('upgradeRequired' in upgrade) {
      return upgrade.upgradeRequired ? 'Upgrade Needed' : 'Up to Date';
    }
  }
  
  // Try recommendations
  const priority = result?.recommendations?.upgrade_priority || result?.recommendations?.priority;
  if (priority) {
    if (String(priority).toUpperCase() === 'HIGH') return 'Upgrade Needed';
    if (String(priority).toUpperCase() === 'LOW') return 'Up to Date';
    if (String(priority).toUpperCase() === 'MEDIUM') return 'Possible Upgrade';
  }
  
  // NEW: Only add Chef logic if we detect Chef analysis
  if (result?.version_requirements?.migration_effort && 
      (result?.metadata?.technology_type === 'chef' || result?.functionality)) {
    const effort = String(result.version_requirements.migration_effort).toUpperCase();
    if (effort === 'LOW') return 'Up to Date';
    if (effort === 'MEDIUM') return 'Possible Upgrade';
    if (effort === 'HIGH') return 'Upgrade Needed';
  }
  
  // Complexity clues
  if (result?.complexity_assessment?.estimated_effort_hours === 0) return 'Up to Date';
  if (result?.complexity_assessment?.level && String(result.complexity_assessment.level).toUpperCase() === 'LOW') return 'Up to Date';
  
  // Fallback
  return 'Analysis Complete';
}
