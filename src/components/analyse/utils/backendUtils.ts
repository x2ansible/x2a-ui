// components/analyse/utils/backendUtils.ts
// Clean utilities for accessing backend data without transformation
// EXTENDED: Safe object handling for Salt compatibility

import { BackendAnalysisResponse } from '../types/BackendTypes';

// SAFE: Extract string from potentially nested object (for Salt compatibility)
const safeStringExtract = (data: any): string => {
  if (typeof data === 'string') return data;
  if (typeof data === 'object' && data !== null) {
    // Try common text fields
    if (data.description) return String(data.description);
    if (data.summary) return String(data.summary);
    if (data.text) return String(data.text);
    if (data.rationale) return String(data.rationale);
    // If object has single string value, use it
    const values = Object.values(data).filter(v => typeof v === 'string');
    if (values.length === 1) return values[0] as string;
    // Last resort: serialize safely
    return JSON.stringify(data, null, 2);
  }
  return String(data || '');
};

// Direct backend value access - no fallback generation
export const getBackendValue = (data: any, fallback: string = 'Not specified'): string => {
  if (data === undefined || data === null || data === '' || data === 'Unknown') {
    return fallback;
  }
  // SAFE: Handle objects that might contain strings
  return safeStringExtract(data);
};

// Check if backend actually provided meaningful data
export const hasBackendData = (data: any): boolean => {
  if (data === undefined || data === null || data === '' || data === 'Unknown') return false;
  if (typeof data === 'object' && Object.keys(data).length === 0) return false;
  return true;
};

// SAFE: Get analysis content for display (handles both string and object fields)
export const getAnalysisContent = (result: BackendAnalysisResponse) => {
  // Try detailed_analysis first (Chef/BladeLogic format)
  if (hasBackendData(result?.detailed_analysis)) {
    return {
      content: safeStringExtract(result.detailed_analysis),
      type: 'Detailed Analysis',
      description: 'Information on the IaC analyzed'
    };
  }
  
  // Try description (Salt format)
  if (hasBackendData(result?.description)) {
    return {
      content: safeStringExtract(result.description),
      type: 'Analysis Description', 
      description: 'Salt state analysis results'
    };
  }
  
  // Try primary purpose
  if (hasBackendData(result?.functionality?.primary_purpose)) {
    return {
      content: safeStringExtract(result.functionality.primary_purpose),
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
      return {
        content,
        type: 'Analysis Rationale',
        description: 'Reasoning behind recommendations'
      };
    }
  }
  
  return null;
};

// Agent information from backend
export const getAgentInfo = (result: BackendAnalysisResponse) => {
  return {
    name: result.metadata?.agent_name || 'Analysis Agent',
    icon: result.metadata?.agent_icon || '🔍',
    technology: result.metadata?.technology_type || 'Unknown',
    correlationId: result.metadata?.correlation_id,
    sessionId: result.session_info?.session_id
  };
};

// Analysis timing from backend
export const getAnalysisTiming = (result: BackendAnalysisResponse) => {
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

// Complexity from backend (prefer tree-sitter, fallback to LLM)
export const getComplexityInfo = (result: BackendAnalysisResponse) => {
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
export const formatArray = (arr: string[] | any | undefined, limit: number = 3): string => {
  // Handle array input
  if (Array.isArray(arr)) {
    if (arr.length === 0) return 'None';
    if (arr.length <= limit) return arr.join(', ');
    return `${arr.slice(0, limit).join(', ')} (+${arr.length - limit} more)`;
  }
  
  // Handle object that might contain arrays
  if (typeof arr === 'object' && arr !== null) {
    const arrayValues = Object.values(arr).filter(v => Array.isArray(v));
    if (arrayValues.length > 0) {
      return formatArray(arrayValues[0] as string[], limit);
    }
    // Convert object keys to comma-separated string
    const keys = Object.keys(arr);
    if (keys.length === 0) return 'None';
    if (keys.length <= limit) return keys.join(', ');
    return `${keys.slice(0, limit).join(', ')} (+${keys.length - limit} more)`;
  }
  
  // Handle string input
  if (typeof arr === 'string') return arr;
  
  return 'None';
};

// Version requirements (SAFE: supports both Chef and Salt versions)
export const getVersionRequirements = (result: BackendAnalysisResponse) => {
  const vr = result.version_requirements;
  if (!vr) return null;
  
  return {
    chef: getBackendValue(vr.min_chef_version),
    ruby: getBackendValue(vr.min_ruby_version),
    salt: getBackendValue((vr as any).min_salt_version), // Salt support
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
  if ((result as any).state_module_usage) {
    const stateUsage = (result as any).state_module_usage;
    if (Array.isArray(stateUsage)) return stateUsage;
    if (typeof stateUsage === 'object') return Object.keys(stateUsage);
  }
  
  return [];
};

// SAFE: Extract upgrade info (for Ansible upgrade analysis and similar workflows)
export function getUpgradeInfo(result: any) {
  // Defensive: Only return info if present and well-formed, otherwise return default shape
  if (
    result &&
    result.upgrade &&
    typeof result.upgrade === 'object'
  ) {
    return {
      hasUpgradeData: true,
      breakingChangesCount: result.upgrade.breakingChangesCount ?? 0,
      currentVersion: result.upgrade.currentVersion ?? 'Not specified',
      recommendedVersion: result.upgrade.recommendedVersion ?? 'Not specified',
      ...result.upgrade,
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
// --- SMART: Non-hardcoded status extraction for any workflow/tech type ---
export function getAnalysisStatus(result: any) {
  // Prefer explicit upgrade info if present
  if (result && result.upgrade && typeof result.upgrade === 'object') {
    if ('breakingChangesCount' in result.upgrade) {
      return result.upgrade.breakingChangesCount > 0 ? 'Upgrade Needed' : 'Up to Date';
    }
    if ('upgradeRequired' in result.upgrade) {
      return result.upgrade.upgradeRequired ? 'Upgrade Needed' : 'Up to Date';
    }
  }
  // Try recommendations
  const priority = result?.recommendations?.upgrade_priority || result?.recommendations?.priority;
  if (priority) {
    if (String(priority).toUpperCase() === 'HIGH') return 'Upgrade Needed';
    if (String(priority).toUpperCase() === 'LOW') return 'Up to Date';
    if (String(priority).toUpperCase() === 'MEDIUM') return 'Possible Upgrade';
  }
  // Complexity clues
  if (result?.complexity_assessment?.estimated_effort_hours === 0) return 'Up to Date';
  if (result?.complexity_assessment?.level && String(result.complexity_assessment.level).toUpperCase() === 'LOW') return 'Up to Date';
  // Fallback
  return 'Unknown';
}
