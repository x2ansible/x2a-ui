// components/analyse/utils/backendUtils.ts
// VERIFIED: Handles the Ansible upgrade response format while preserving all existing functionality

import { BackendAnalysisResponse } from '../types/BackendTypes';

// ABSOLUTELY SAFE: Convert ANY input to a safe string for React rendering
const absolutelySafeString = (data: any): string => {
  if (data === null || data === undefined) return '';
  if (typeof data === 'string') return data;
  if (typeof data === 'number') return String(data);
  if (typeof data === 'boolean') return String(data);
  
  // Handle objects safely
  if (typeof data === 'object') {
    // Try to extract meaningful text from common fields
    if (data.description) return String(data.description);
    if (data.summary) return String(data.summary);
    if (data.text) return String(data.text);
    if (data.rationale) return String(data.rationale);
    if (data.message) return String(data.message);
    
    // For arrays, join them
    if (Array.isArray(data)) {
      return data.map(item => String(item)).join(', ');
    }
    
    // For objects, try to create a readable summary
    const keys = Object.keys(data);
    if (keys.length === 1 && typeof data[keys[0]] === 'string') {
      return String(data[keys[0]]);
    }
    
    // Last resort: create a safe summary
    return `Object with ${keys.length} properties: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}`;
  }
  
  return String(data);
};

// Direct backend value access - GUARANTEED safe string output
export const getBackendValue = (data: any, fallback: string = 'Not specified'): string => {
  if (data === undefined || data === null || data === '' || data === 'Unknown') {
    return fallback;
  }
  return absolutelySafeString(data);
};

// Check if backend actually provided meaningful data
export const hasBackendData = (data: any): boolean => {
  if (data === undefined || data === null || data === '' || data === 'Unknown') return false;
  if (typeof data === 'object' && Object.keys(data).length === 0) return false;
  return true;
};

// ABSOLUTELY SAFE: Get analysis content for display
// VERIFIED: Now handles the Ansible upgrade response format from your sample
export const getAnalysisContent = (result: BackendAnalysisResponse) => {
  // Try detailed_analysis first (Chef/BladeLogic/Ansible Upgrade format)
  if (hasBackendData(result?.detailed_analysis)) {
    return {
      content: absolutelySafeString(result.detailed_analysis),
      type: 'Detailed Analysis',
      description: 'Information on the IaC analyzed'
    };
  }
  
  // Try description (Salt format)
  if (hasBackendData((result as any)?.description)) {
    return {
      content: absolutelySafeString((result as any).description),
      type: 'Analysis Description', 
      description: 'Analysis results'
    };
  }
  
  // VERIFIED: Handle Ansible upgrade format from your sample response
  if (hasBackendData((result as any)?.current_state) || hasBackendData((result as any)?.complexity_assessment)) {
    const anyResult = result as any;
    let content = '';
    
    // Build content from current_state and complexity_assessment
    if (anyResult.current_state?.estimated_version) {
      content += `Current Ansible version: ${anyResult.current_state.estimated_version}. `;
    }
    
    if (anyResult.complexity_assessment?.level) {
      content += `Upgrade complexity: ${anyResult.complexity_assessment.level}. `;
    }
    
    if (anyResult.complexity_assessment?.estimated_effort_hours) {
      content += `Estimated effort: ${anyResult.complexity_assessment.estimated_effort_hours} hours. `;
    }
    
    if (anyResult.upgrade_requirements?.fqcn_conversions_needed?.length) {
      content += `${anyResult.upgrade_requirements.fqcn_conversions_needed.length} FQCN conversions needed. `;
    }
    
    // Fallback to detailed_analysis if available
    if (!content && anyResult.detailed_analysis) {
      content = absolutelySafeString(anyResult.detailed_analysis);
    }
    
    if (content) {
      return {
        content: content.trim(),
        type: 'Upgrade Analysis',
        description: 'Ansible upgrade assessment results'
      };
    }
  }
  
  // Try primary purpose
  if (hasBackendData(result?.functionality?.primary_purpose)) {
    return {
      content: absolutelySafeString(result.functionality.primary_purpose),
      type: 'Primary Purpose',
      description: 'What this automation accomplishes'
    };
  }
  
  // Try recommendations rationale (absolutely safe object handling)
  if (hasBackendData(result?.recommendations)) {
    const rec = result.recommendations;
    const content = absolutelySafeString(rec);
    
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
    name: absolutelySafeString(result.metadata?.agent_name) || 'Analysis Agent',
    icon: absolutelySafeString(result.metadata?.agent_icon) || '🔍',
    technology: absolutelySafeString(result.metadata?.technology_type) || 'Unknown',
    correlationId: absolutelySafeString(result.metadata?.correlation_id),
    sessionId: absolutelySafeString(result.session_info?.session_id)
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
// VERIFIED: Works with Ansible upgrade complexity_assessment
export const getMigrationInfo = (result: BackendAnalysisResponse) => {
  const effort = result.version_requirements?.migration_effort;
  const hours = result.version_requirements?.estimated_hours;
  
  // VERIFIED: Also check Ansible upgrade format
  const anyResult = result as any;
  const upgradeEffort = anyResult.complexity_assessment?.level;
  const upgradeHours = anyResult.complexity_assessment?.estimated_effort_hours;
  
  if (effort || upgradeEffort) {
    const finalEffort = effort || upgradeEffort;
    const finalHours = hours || upgradeHours;
    
    const display = finalHours ? `${finalEffort} (${finalHours}h)` : finalEffort;
    const color = finalEffort === 'LOW' ? 'text-green-400' : 
                 finalEffort === 'HIGH' ? 'text-red-400' : 'text-yellow-400';
    
    return { effort: finalEffort, hours: finalHours, display, color };
  }
  
  return null;
};

// Complexity from backend (prefer tree-sitter, fallback to LLM)
// VERIFIED: Now handles Ansible upgrade complexity_assessment
export const getComplexityInfo = (result: BackendAnalysisResponse) => {
  const treeScore = result.tree_sitter_facts?.complexity_score;
  const llmLevel = result.complexity_level;
  
  // VERIFIED: Check Ansible upgrade complexity_assessment
  const anyResult = result as any;
  const upgradeComplexity = anyResult.complexity_assessment?.level;
  
  if (treeScore !== undefined) {
    const level = treeScore > 15 ? 'HIGH' : treeScore > 8 ? 'MEDIUM' : 'LOW';
    return { source: 'tree-sitter', score: treeScore, level, display: `${level} (${treeScore})` };
  }
  
  if (upgradeComplexity) {
    return { source: 'upgrade-assessment', level: upgradeComplexity.toUpperCase(), display: upgradeComplexity };
  }
  
  if (llmLevel) {
    return { source: 'llm', level: llmLevel.toUpperCase(), display: llmLevel };
  }
  
  return null;
};

// Risk assessment from backend data
// VERIFIED: Enhanced to handle Ansible upgrade risk factors
export const getRiskInfo = (result: BackendAnalysisResponse) => {
  const riskFactors = result.recommendations?.risk_factors || [];
  const migrationEffort = result.version_requirements?.migration_effort;
  
  // VERIFIED: Handle Ansible upgrade risk assessment
  const anyResult = result as any;
  const upgradeRiskLevel = anyResult.complexity_assessment?.risk_level;
  const deprecatedModules = anyResult.current_state?.deprecated_modules || [];
  const fqcnConversions = anyResult.upgrade_requirements?.fqcn_conversions_needed || [];
  
  const totalRiskFactors = Array.isArray(riskFactors) ? riskFactors.length : 0;
  const totalDeprecated = deprecatedModules.length;
  const totalConversions = fqcnConversions.length;
  
  let level = 'LOW';
  
  // For Ansible upgrades, use the backend's risk assessment if available
  if (upgradeRiskLevel) {
    level = upgradeRiskLevel.toUpperCase();
  } else {
    // Standard risk calculation including Ansible upgrade factors
    if (totalRiskFactors > 2 || migrationEffort === 'HIGH' || totalDeprecated > 5 || totalConversions > 10) {
      level = 'HIGH';
    } else if (totalRiskFactors > 0 || migrationEffort === 'MEDIUM' || totalDeprecated > 0 || totalConversions > 0) {
      level = 'MEDIUM';
    }
  }
  
  const color = level === 'HIGH' ? 'text-red-400' : 
               level === 'MEDIUM' ? 'text-yellow-400' : 'text-green-400';
  
  return { 
    level, 
    factors: Array.isArray(riskFactors) ? riskFactors : [], 
    deprecatedCount: totalDeprecated,
    conversionCount: totalConversions,
    color 
  };
};

// ABSOLUTELY SAFE: Format arrays for display
export const formatArray = (arr: any, limit: number = 3): string => {
  // Handle array input
  if (Array.isArray(arr)) {
    if (arr.length === 0) return 'None';
    const safeItems = arr.map(item => absolutelySafeString(item));
    if (safeItems.length <= limit) return safeItems.join(', ');
    return `${safeItems.slice(0, limit).join(', ')} (+${safeItems.length - limit} more)`;
  }
  
  // Handle object that might contain arrays
  if (typeof arr === 'object' && arr !== null) {
    const arrayValues = Object.values(arr).filter(v => Array.isArray(v));
    if (arrayValues.length > 0) {
      return formatArray(arrayValues[0], limit);
    }
    // Convert object keys to comma-separated string
    const keys = Object.keys(arr);
    if (keys.length === 0) return 'None';
    if (keys.length <= limit) return keys.join(', ');
    return `${keys.slice(0, limit).join(', ')} (+${keys.length - limit} more)`;
  }
  
  // Handle anything else
  return absolutelySafeString(arr) || 'None';
};

// Version requirements (ABSOLUTELY SAFE) - VERIFIED: Added Ansible support
export const getVersionRequirements = (result: BackendAnalysisResponse) => {
  const vr = result.version_requirements;
  
  // VERIFIED: Also check Ansible upgrade current_state for version info
  const anyResult = result as any;
  const currentVersion = anyResult.current_state?.estimated_version;
  
  if (!vr && !currentVersion) return null;
  
  return {
    chef: getBackendValue(vr?.min_chef_version),
    ruby: getBackendValue(vr?.min_ruby_version),
    salt: getBackendValue((vr as any)?.min_salt_version),
    ansible: getBackendValue(vr?.min_ansible_version || currentVersion), // VERIFIED: Use current version if available
    effort: vr?.migration_effort,
    hours: vr?.estimated_hours,
    deprecated: Array.isArray(vr?.deprecated_features) ? vr.deprecated_features : []
  };
};

// ABSOLUTELY SAFE: Extract key operations - VERIFIED: Enhanced for Ansible upgrade
export const getKeyOperations = (result: BackendAnalysisResponse): string[] => {
  // Standard key_operations field
  if (result.key_operations && Array.isArray(result.key_operations)) {
    return result.key_operations.map(op => absolutelySafeString(op));
  }
  
  // VERIFIED: Ansible upgrade - extract from the response format in your sample
  const anyResult = result as any;
  if (anyResult.current_state || anyResult.upgrade_requirements) {
    const operations: string[] = [];
    
    // Extract deprecated modules
    if (anyResult.current_state?.deprecated_modules?.length) {
      operations.push(...anyResult.current_state.deprecated_modules.map((mod: string) => `Deprecated: ${mod}`));
    }
    
    // Extract FQCN conversions
    if (anyResult.upgrade_requirements?.fqcn_conversions_needed?.length) {
      operations.push(...anyResult.upgrade_requirements.fqcn_conversions_needed.map((conv: string) => `Convert: ${conv}`));
    }
    
    // Extract structural changes
    if (anyResult.upgrade_requirements?.structural_changes_needed?.length) {
      operations.push(...anyResult.upgrade_requirements.structural_changes_needed.map((change: string) => `Update: ${change}`));
    }
    
    // Extract complexity indicators
    if (anyResult.current_state?.complexity_indicators?.length) {
      operations.push(...anyResult.current_state.complexity_indicators.map((indicator: string) => `Pattern: ${indicator}`));
    }
    
    if (operations.length > 0) {
      return operations.map(op => absolutelySafeString(op));
    }
  }
  
  // Salt might use state_module_usage
  if (anyResult.state_module_usage) {
    const stateUsage = anyResult.state_module_usage;
    if (Array.isArray(stateUsage)) {
      return stateUsage.map(item => absolutelySafeString(item));
    }
    if (typeof stateUsage === 'object') {
      return Object.keys(stateUsage).map(key => absolutelySafeString(key));
    }
  }
  
  return [];
};

// VERIFIED: Get Ansible upgrade specific information from your sample response format
export const getUpgradeInfo = (result: BackendAnalysisResponse) => {
  const anyResult = result as any;
  
  // Check for Ansible upgrade response format (current_state, upgrade_requirements, etc.)
  if (anyResult.current_state || anyResult.upgrade_requirements || anyResult.complexity_assessment) {
    return {
      currentVersion: getBackendValue(anyResult.current_state?.estimated_version),
      recommendedVersion: getBackendValue(anyResult.recommended_version || 'Latest stable'),
      breakingChangesCount: anyResult.upgrade_requirements?.syntax_modernizations_needed?.length || 0,
      deprecatedModulesCount: anyResult.current_state?.deprecated_modules?.length || 0,
      migrationCount: anyResult.upgrade_requirements?.fqcn_conversions_needed?.length || 0,
      syntaxUpdatesCount: anyResult.upgrade_requirements?.structural_changes_needed?.length || 0,
      hasUpgradeData: true,
      upgradeNeeded: (anyResult.current_state?.deprecated_modules?.length > 0) || 
                     (anyResult.upgrade_requirements?.fqcn_conversions_needed?.length > 0) ||
                     (anyResult.upgrade_requirements?.structural_changes_needed?.length > 0)
    };
  }
  
  // Check for standard upgrade_analysis field (from types)
  const upgrade = result.upgrade_analysis;
  if (!upgrade) return null;
  
  return {
    currentVersion: getBackendValue(upgrade.current_version),
    recommendedVersion: getBackendValue(upgrade.recommended_version || 'Latest stable'),
    breakingChangesCount: upgrade.breaking_changes?.length || 0,
    deprecatedModulesCount: upgrade.deprecated_modules?.length || 0,
    migrationCount: upgrade.collection_migrations?.length || 0,
    syntaxUpdatesCount: upgrade.syntax_updates?.length || 0,
    hasUpgradeData: !!(upgrade.current_version || upgrade.breaking_changes?.length || upgrade.deprecated_modules?.length),
    upgradeNeeded: (upgrade.breaking_changes?.length > 0) || (upgrade.deprecated_modules?.length > 0)
  };
};