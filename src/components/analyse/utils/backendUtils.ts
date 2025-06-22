// components/analyse/utils/backendUtils.ts
// Clean utilities for accessing backend data without transformation

import { BackendAnalysisResponse } from '../types/BackendTypes';

// Direct backend value access - no fallback generation
export const getBackendValue = (data: any, fallback: string = 'Not specified'): string => {
  if (data === undefined || data === null || data === '' || data === 'Unknown') {
    return fallback;
  }
  return String(data);
};

// Check if backend actually provided meaningful data
export const hasBackendData = (data: any): boolean => {
  return data !== undefined && data !== null && data !== '' && data !== 'Unknown';
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

// Format arrays for display
export const formatArray = (arr: string[] | undefined, limit: number = 3): string => {
  if (!arr || arr.length === 0) return 'None';
  
  if (arr.length <= limit) {
    return arr.join(', ');
  }
  
  return `${arr.slice(0, limit).join(', ')} (+${arr.length - limit} more)`;
};

// Version requirements
export const getVersionRequirements = (result: BackendAnalysisResponse) => {
  const vr = result.version_requirements;
  if (!vr) return null;
  
  return {
    chef: getBackendValue(vr.min_chef_version),
    ruby: getBackendValue(vr.min_ruby_version),
    effort: vr.migration_effort,
    hours: vr.estimated_hours,
    deprecated: vr.deprecated_features || []
  };
};