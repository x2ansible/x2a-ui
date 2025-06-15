import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

import {
  Clock,
  Zap,
  CheckCircle,
  XCircle,
  Settings,
  FileCode,
  GitBranch,
  AlertTriangle,
  Info,
  Package,
  Server,
  Wrench,
  Shield,
  TrendingUp,
  Database
} from 'lucide-react';

export interface ClassificationResult {
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

type Tab = 'overview' | 'functionality' | 'requirements' | 'recommendations' | 'conversion';

export interface ClassificationPanelProps {
  classificationResult?: ClassificationResult;
  analyzedFiles?: string[];
  selectedFile?: string;
  selectedGitFile?: string;
  code?: string;
  loading?: boolean;
  step?: number;
}

// === HELPERS (ALL) ===
const getDisplayValue = (value: unknown, fallback: string = 'Not specified'): string => {
  if (value === null || value === undefined || value === '' ||
    value === 'Unknown' || value === 'Not assessed' || value === 'Not specified') {
    return fallback;
  }
  return String(value);
};

// UPDATED: Simplified tool/language detection - just show "Chef"
const getDisplayToolLanguage = (result: ClassificationResult): string => {
  if (!result) return 'Infrastructure Code';
  
  // Check if we have Chef-specific indicators
  if (result.tree_sitter_facts?.verified_cookbook_name ||
      result.cookbook_name ||
      result.version_requirements?.min_chef_version || 
      result.analysis_method === 'tree_sitter_llm' ||
      result.confidence_source === 'chef_semantic_analysis') {
    return 'Chef';
  }
  
  // For non-Chef tools (future support)
  const classification = result.classification;
  if (classification) {
    if (classification.toLowerCase().includes('terraform')) return 'Terraform';
    if (classification.toLowerCase().includes('ansible')) return 'Ansible';
    if (classification.toLowerCase().includes('puppet')) return 'Puppet';
    if (classification.toLowerCase().includes('docker')) return 'Docker';
    if (classification.toLowerCase().includes('kubernetes') || classification.toLowerCase().includes('k8s')) return 'Kubernetes';
    if (classification.toLowerCase().includes('helm')) return 'Helm';
    
    // Handle compound classifications
    if (classification.includes('+')) {
      return classification;
    }
    
    // Capitalize and return the classification as-is
    return classification
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  // Generic fallback
  return 'Infrastructure Code';
};

// Simplified - no cookbook display name needed
const getCookbookDisplayName = (result: ClassificationResult): string => {
  return ''; // Return empty string - no subtitle needed
};

// Get tool-specific color
const getToolColor = (result: ClassificationResult): string => {
  const tool = getDisplayToolLanguage(result).toLowerCase();
  
  switch (true) {
    case tool.includes('chef'):
      return 'text-orange-400';
    case tool.includes('terraform'):
      return 'text-purple-400';
    case tool.includes('ansible'):
      return 'text-red-400';
    case tool.includes('puppet'):
      return 'text-blue-400';
    case tool.includes('docker'):
      return 'text-cyan-400';
    case tool.includes('kubernetes'):
      return 'text-indigo-400';
    case tool.includes('helm'):
      return 'text-pink-400';
    default:
      return 'text-blue-400'; // Default color
  }
};

const getMigrationEffortDisplay = (result: ClassificationResult): { text: string, level: string } => {
  const effort = result.version_requirements?.migration_effort;
  const hours = result.version_requirements?.estimated_hours;
  if (!effort || effort === 'Unknown' || effort === 'Not assessed') {
    const services = result.functionality?.services?.length || 0;
    const packages = result.functionality?.packages?.length || 0;
    const files = result.functionality?.files_managed?.length || 0;
    const totalItems = services + packages + files;
    if (totalItems > 10) {
      return { text: 'High (inferred)', level: 'HIGH' };
    } else if (totalItems > 5) {
      return { text: 'Medium (inferred)', level: 'MEDIUM' };
    } else {
      return { text: 'Low (inferred)', level: 'LOW' };
    }
  }
  let display = effort;
  if (hours && hours > 0) {
    display += ` (${hours}h)`;
  }
  return { text: display, level: effort.toUpperCase() };
};

const getComplexityDisplay = (result: ClassificationResult): { text: string, level: string, details: string } => {
  const complexity = result.complexity_level;
  if (!complexity || complexity === 'Unknown') {
    const services = result.functionality?.services?.length || 0;
    const packages = result.functionality?.packages?.length || 0;
    const files = result.functionality?.files_managed?.length || 0;
    const deps = result.dependencies ?
      (typeof result.dependencies === 'string' ?
        result.dependencies.split(',').length : 0) : 0;
    const totalItems = services + packages + files + Math.min(deps, 5);
    if (totalItems > 15) {
      return {
        text: 'High',
        level: 'HIGH',
        details: `${services} services, ${packages} packages, ${files} files`
      };
    } else if (totalItems > 8) {
      return {
        text: 'Medium',
        level: 'MEDIUM',
        details: `${services} services, ${packages} packages, ${files} files`
      };
    } else if (totalItems > 3) {
      return {
        text: 'Low',
        level: 'LOW',
        details: `${services} services, ${packages} packages, ${files} files`
      };
    } else {
      return {
        text: 'Simple',
        level: 'SIMPLE',
        details: 'Basic infrastructure structure'
      };
    }
  }
  const complexityParts = complexity.split(' - ');
  const level = complexityParts[0];
  const details = complexityParts.slice(1).join(' - ') || result.detailed_analysis?.substring(0, 50) + '...' || '';
  return { text: level, level: level.toUpperCase(), details };
};

const getConvertibleDisplay = (result: ClassificationResult): {
  status: boolean | null,
  text: string,
  color: string,
  confidence: string
} => {
  const convertible = result.convertible;
  if (convertible === true) {
    return {
      status: true,
      text: 'Yes',
      color: 'bg-green-900/30 text-green-400 border-green-500/30',
      confidence: 'High confidence'
    };
  } else if (convertible === false) {
    return {
      status: false,
      text: 'No',
      color: 'bg-red-900/30 text-red-400 border-red-500/30',
      confidence: 'Analysis indicates challenges'
    };
  } else {
    const hasServices = result.functionality?.services?.length > 0;
    const hasPackages = result.functionality?.packages?.length > 0;
    const hasLowMigrationEffort = result.version_requirements?.migration_effort === 'LOW';
    const hasHighRisk = result.recommendations?.risk_factors?.length > 3;
    if (hasHighRisk) {
      return {
        status: false,
        text: 'Risky',
        color: 'bg-orange-900/30 text-orange-400 border-orange-500/30',
        confidence: 'High risk factors detected'
      };
    } else if (hasServices || hasPackages || hasLowMigrationEffort) {
      return {
        status: true,
        text: 'Likely',
        color: 'bg-blue-900/30 text-blue-400 border-blue-500/30',
        confidence: 'Good conversion indicators'
      };
    } else {
      return {
        status: null,
        text: 'Review',
        color: 'bg-gray-800/50 text-gray-400 border-gray-600/30',
        confidence: 'Requires manual assessment'
      };
    }
  }
};

// UPDATED: Use actual primary purpose from backend
const getPrimaryPurposeDisplay = (result: ClassificationResult): string => {
  // Use the actual primary_purpose from backend
  const purpose = result.functionality?.primary_purpose;
  if (purpose && purpose !== 'No summary available') {
    return purpose;
  }
  
  // Fallback to summary or detailed_analysis
  const summary = result.summary || result.detailed_analysis?.split('\n')[0];
  if (summary && summary !== 'No summary available') {
    return summary;
  }
  
  // Smart fallback based on services/packages
  const services = result.functionality?.services || [];
  const packages = result.functionality?.packages || [];
  
  if (services.length > 0) {
    const serviceList = services.slice(0, 2).join(' and ');
    const moreServices = services.length > 2 ? ` and ${services.length - 2} more` : '';
    return `Manages ${serviceList}${moreServices} service${services.length === 1 ? '' : 's'}`;
  } else if (packages.length > 0) {
    const packageList = packages.slice(0, 2).join(' and ');
    const morePackages = packages.length > 2 ? ` and ${packages.length - 2} more` : '';
    return `Installs and configures ${packageList}${morePackages}`;
  } else {
    // Use detected tool name
    const toolName = getDisplayToolLanguage(result);
    return `${toolName} configuration for system management`;
  }
};

const getSpeedupDisplay = (result: ClassificationResult): {
  speedup: number,
  display: string,
  color: string
} => {
  const speedup = result.speedup;
  if (!speedup || speedup <= 1) {
    return {
      speedup: 1,
      display: 'N/A',
      color: 'text-gray-400'
    };
  }
  let color = 'text-green-400';
  if (speedup > 100) color = 'text-purple-400';
  else if (speedup > 50) color = 'text-blue-400';
  else if (speedup > 10) color = 'text-green-400';
  else color = 'text-yellow-400';
  return {
    speedup,
    display: `${speedup.toFixed(1)}x faster`,
    color
  };
};

const formatTimeDisplay = (ms?: number): string => {
  if (!ms || ms <= 0) return 'N/A';
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
};

const formatHoursDisplay = (hours?: number): string => {
  if (!hours || hours <= 0) return 'N/A';
  if (hours < 1) return `${(hours * 60).toFixed(0)}min`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
};

const getRiskLevelDisplay = (result: ClassificationResult): {
  level: string,
  color: string,
  factors: string[]
} => {
  const riskFactors = result.recommendations?.risk_factors || [];
  const migrationEffort = result.version_requirements?.migration_effort?.toUpperCase();
  const hasDeprecated = result.version_requirements?.deprecated_features?.length > 0;
  let riskScore = 0;
  const factors = [...riskFactors];
  if (migrationEffort === 'HIGH') {
    riskScore += 3;
    factors.push('High migration complexity');
  } else if (migrationEffort === 'MEDIUM') {
    riskScore += 1;
  }
  if (hasDeprecated) {
    riskScore += 2;
    factors.push('Uses deprecated features');
  }
  if (riskScore >= 4) {
    return { level: 'HIGH', color: 'text-red-400', factors };
  } else if (riskScore >= 2) {
    return { level: 'MEDIUM', color: 'text-yellow-400', factors };
  } else if (riskScore >= 1) {
    return { level: 'LOW', color: 'text-blue-400', factors };
  } else {
    return { level: 'MINIMAL', color: 'text-green-400', factors: ['No significant risks identified'] };
  }
};

const getComplexityColor = (level: string) => {
  switch (level.toLowerCase()) {
    case 'simple':
    case 'low': return 'text-green-400 bg-green-900/30 border-green-500/30';
    case 'moderate':
    case 'medium': return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30';
    case 'complex':
    case 'high': return 'text-red-400 bg-red-900/30 border-red-500/30';
    default: return 'text-gray-400 bg-gray-800/50 border-gray-600/30';
  }
};

const getComplexityIcon = (level: string) => {
  switch (level.toLowerCase()) {
    case 'simple':
    case 'low': return '🟢';
    case 'moderate':
    case 'medium': return '🟡';
    case 'complex':
    case 'high': return '🔴';
    default: return '⚪';
  }
};

const getMigrationEffortColor = (effort?: string) => {
  switch ((effort || '').toLowerCase()) {
    case 'low': return 'text-green-400 bg-green-900/30 border-green-500/30';
    case 'medium': return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30';
    case 'high': return 'text-red-400 bg-red-900/30 border-red-500/30';
    default: return 'text-gray-400 bg-gray-800/50 border-gray-600/30';
  }
};

const getPriorityColor = (priority?: string) => {
  switch ((priority || '').toLowerCase()) {
    case 'low': return 'text-blue-400 bg-blue-900/30 border-blue-500/30';
    case 'medium': return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30';
    case 'high': return 'text-red-400 bg-red-900/30 border-red-500/30';
    case 'critical': return 'text-purple-400 bg-purple-900/30 border-purple-500/30';
    default: return 'text-gray-400 bg-gray-800/50 border-gray-600/30';
  }
};

const ClassificationPanel: React.FC<ClassificationPanelProps> = ({
  classificationResult,
  analyzedFiles,
  selectedFile,
  selectedGitFile,
  code,
  loading,
  step
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showComplexityDesc, setShowComplexityDesc] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize component state
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Ensure we have valid classification result
  if (!isInitialized) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-center text-gray-400">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg text-gray-300">Initializing analysis panel...</p>
        </div>
      </div>
    );
  }

  if (!classificationResult) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-center text-gray-400">
          <FileCode size={48} className="mx-auto mb-4 text-gray-600" />
          <p className="text-lg text-gray-300">Analysis has not been performed yet.</p>
          <p className="text-sm mt-2 text-gray-500">Upload and analyze a file to see the results here.</p>
        </div>
      </div>
    );
  }

  const result = classificationResult;

  const TabButton: React.FC<{
    id: Tab;
    label: string;
    icon: React.ComponentType<any>;
    active: boolean;
    onClick: (id: Tab) => void;
  }> = ({ id, label, icon: Icon, active, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all text-sm ${
        active
          ? 'bg-blue-900/50 text-blue-300 shadow-sm border border-blue-500/30'
          : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="flex-shrink-0">
        <div className="border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                <FileCode className="text-blue-400" size={20} />
                Analysis Results
              </h2>
              <p className="text-gray-400 mt-1 text-sm">
                Infrastructure-as-Code Analysis
                {result.metadata?.correlation_id && (
                  <span className="ml-2 text-xs text-gray-500">
                    ID: {result.metadata.correlation_id.substring(0, 8)}...
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {(() => {
                const speedupInfo = getSpeedupDisplay(result);
                return speedupInfo.speedup > 1 && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Analysis Speed</div>
                    <div className={`text-lg font-bold ${speedupInfo.color}`}>
                      {speedupInfo.display}
                    </div>
                  </div>
                );
              })()}
              <div className="w-10 h-10 bg-blue-900/30 rounded-full flex items-center justify-center border border-blue-500/30">
                <Zap className="text-blue-400" size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="p-4 bg-gray-800/50 border-b border-gray-700">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Tool/Language - simplified to just show "Chef" */}
            <div className="text-center bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className={`text-lg font-bold capitalize truncate ${getToolColor(result)}`}>
                {getDisplayToolLanguage(result)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Tool/Language</div>
            </div>
            {/* Convertible Status */}
            <div className="text-center bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              {(() => {
                const convertibleInfo = getConvertibleDisplay(result);
                return (
                  <>
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${convertibleInfo.color}`}>
                      {convertibleInfo.status === true ? <CheckCircle size={12} /> :
                        convertibleInfo.status === false ? <XCircle size={12} /> :
                          <AlertTriangle size={12} />}
                      {convertibleInfo.text}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Convertible</div>
                    {convertibleInfo.confidence && (
                      <div className="text-xs text-gray-400 mt-0.5 truncate">
                        {convertibleInfo.confidence}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            {/* Complexity */}
            <div className="text-center bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 relative">
              {(() => {
                const complexityInfo = getComplexityDisplay(result);
                return (
                  <>
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${getComplexityColor(complexityInfo.level)}`}>
                      <span className="text-xs">{getComplexityIcon(complexityInfo.level)}</span>
                      <span className="truncate">{complexityInfo.text}</span>
                      {complexityInfo.details && (
                        <button
                          className="ml-1 text-gray-400 hover:text-blue-300"
                          onClick={e => { e.stopPropagation(); setShowComplexityDesc(v => !v); }}
                          title="Show complexity details"
                          aria-label="Show complexity details"
                          tabIndex={0}
                          type="button"
                        >
                          <Info size={14} />
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Complexity</div>
                    {showComplexityDesc && complexityInfo.details && (
                      <div
                        className="absolute left-1/2 top-full z-50 mt-2 w-80 -translate-x-1/2 bg-gray-900 text-gray-100 border border-gray-700 rounded-xl shadow-xl px-4 py-3 text-xs text-left"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-blue-300">Complexity Analysis</span>
                          <button
                            className="ml-2 px-1 text-gray-400 hover:text-blue-300"
                            onClick={() => setShowComplexityDesc(false)}
                          >
                            ×
                          </button>
                        </div>
                        <div className="space-y-2">
                          <div className="text-gray-300">{complexityInfo.details}</div>
                          {result.detailed_analysis && (
                            <div className="text-gray-400 border-t border-gray-700 pt-2">
                              {result.detailed_analysis.substring(0, 150)}...
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            {/* Migration Effort */}
            <div className="text-center bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              {(() => {
                const migrationInfo = getMigrationEffortDisplay(result);
                return (
                  <>
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${getMigrationEffortColor(migrationInfo.level)}`}>
                      <TrendingUp size={12} />
                      <span className="truncate">{migrationInfo.text}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Migration Effort</div>
                    {result.version_requirements?.estimated_hours && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {formatHoursDisplay(result.version_requirements.estimated_hours)} estimated
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            {/* Analysis Performance */}
            <div className="text-center bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              {(() => {
                const speedupInfo = getSpeedupDisplay(result);
                return (
                  <>
                    <div className="text-sm font-bold text-gray-300 flex items-center justify-center gap-1">
                      <Clock size={12} />
                      <span>{formatTimeDisplay(result.duration_ms)}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Analysis Time</div>
                    {speedupInfo.speedup > 1 && (
                      <div className={`text-xs mt-0.5 ${speedupInfo.color}`}>
                        {speedupInfo.display}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Additional Summary Row */}
          <div className="mt-4 pt-3 border-t border-gray-700/50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              {/* Primary Purpose */}
              <div className="bg-blue-900/20 rounded-lg p-2 border-l-4 border-blue-500">
                <div className="text-xs text-blue-300 font-medium mb-1">Primary Purpose</div>
                <div className="text-gray-300 text-xs leading-relaxed">
                  {getPrimaryPurposeDisplay(result)}
                </div>
              </div>
              {/* Feature Summary */}
              <div className="bg-green-900/20 rounded-lg p-2 border-l-4 border-green-500">
                <div className="text-xs text-green-300 font-medium mb-1">Components</div>
                <div className="text-gray-300 text-xs space-y-0.5">
                  {result.functionality?.services?.length > 0 && (
                    <div>🔧 {result.functionality.services.length} service(s)</div>
                  )}
                  {result.functionality?.packages?.length > 0 && (
                    <div>📦 {result.functionality.packages.length} package(s)</div>
                  )}
                  {result.functionality?.files_managed?.length > 0 && (
                    <div>📁 {result.functionality.files_managed.length} file(s)</div>
                  )}
                  {(!result.functionality?.services?.length &&
                    !result.functionality?.packages?.length &&
                    !result.functionality?.files_managed?.length) && (
                    <div className="text-gray-400">Standard configuration</div>
                  )}
                </div>
              </div>
              {/* Risk Assessment */}
              <div className="bg-yellow-900/20 rounded-lg p-2 border-l-4 border-yellow-500">
                <div className="text-xs text-yellow-300 font-medium mb-1">Risk Level</div>
                {(() => {
                  const riskInfo = getRiskLevelDisplay(result);
                  return (
                    <div className="text-xs space-y-0.5">
                      <div className={`font-medium ${riskInfo.color}`}>
                        {riskInfo.level} RISK
                      </div>
                      {riskInfo.factors.length > 0 && (
                        <div className="text-gray-400">
                          {riskInfo.factors[0]}
                          {riskInfo.factors.length > 1 && (
                            <span> (+{riskInfo.factors.length - 1} more)</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3">
          <div className="flex gap-1 overflow-x-auto">
            <TabButton id="overview"        label="Overview"        icon={FileCode}     active={activeTab === 'overview'}        onClick={setActiveTab} />
            <TabButton id="functionality"   label="Functionality"   icon={Settings}     active={activeTab === 'functionality'}   onClick={setActiveTab} />
            <TabButton id="requirements"    label="Requirements"    icon={Database}     active={activeTab === 'requirements'}    onClick={setActiveTab} />
            <TabButton id="recommendations" label="Recommendations" icon={GitBranch}    active={activeTab === 'recommendations'} onClick={setActiveTab} />
            <TabButton id="conversion"      label="Conversion"      icon={AlertTriangle} active={activeTab === 'conversion'}      onClick={setActiveTab} />
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto rh-scrollbar px-4 py-4">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Executive Summary */}
            <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg p-4 border border-blue-500/30">
              <h3 className="text-lg font-semibold text-blue-300 mb-3 flex items-center gap-2">
                <FileCode size={18} />
                Executive Summary
              </h3>
              <div className="space-y-3">
                <div className="text-gray-300 leading-relaxed">
                  {result.summary || getPrimaryPurposeDisplay(result)}
                </div>
                {result.detailed_analysis && (
                  <div className="bg-gray-800/50 rounded-lg p-3 border-l-4 border-blue-500">
                    <h4 className="text-sm font-medium text-blue-300 mb-2">Detailed Analysis</h4>
                    <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                      {result.detailed_analysis}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Conversion Feasibility */}
              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                <h4 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <GitBranch size={16} />
                  Conversion Feasibility
                </h4>
                {(() => {
                  const convertibleInfo = getConvertibleDisplay(result);
                  return (
                    <div className="space-y-2">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${convertibleInfo.color}`}>
                        {convertibleInfo.status === true ? <CheckCircle size={16} /> :
                          convertibleInfo.status === false ? <XCircle size={16} /> :
                            <AlertTriangle size={16} />}
                        {convertibleInfo.text}
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        {convertibleInfo.confidence}
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Resource Requirements */}
              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                <h4 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <Clock size={16} />
                  Resource Requirements
                </h4>
                <div className="space-y-2">
                  {(() => {
                    const migrationInfo = getMigrationEffortDisplay(result);
                    return (
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getMigrationEffortColor(migrationInfo.level)}`}>
                        <TrendingUp size={14} />
                        {migrationInfo.text}
                      </div>
                    );
                  })()}
                  {result.version_requirements?.estimated_hours && (
                    <p className="text-xs text-gray-400">
                      Estimated effort: {formatHoursDisplay(result.version_requirements.estimated_hours)}
                    </p>
                  )}
                </div>
              </div>

              {/* Risk Assessment */}
              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                <h4 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <Shield size={16} />
                  Risk Assessment
                </h4>
                {(() => {
                  const riskInfo = getRiskLevelDisplay(result);
                  return (
                    <div className="space-y-2">
                      <div className={`text-sm font-medium ${riskInfo.color}`}>
                        {riskInfo.level} RISK
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        {riskInfo.factors[0] || 'No significant risks identified'}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Key Operations */}
            {result.key_operations && result.key_operations.length > 0 && (
              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                <h4 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <Wrench size={16} />
                  Key Operations
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {result.key_operations.map((operation, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-blue-900/20 rounded-lg border border-blue-500/30">
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      <span className="text-gray-300 text-sm">{operation}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resources */}
            {result.resources && result.resources.length > 0 && (
              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                <h4 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <Package size={16} />
                  Managed Resources
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.resources.map((resource, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-green-900/30 text-green-300 rounded-md text-xs border border-green-500/30">
                      <Package size={12} />
                      {resource}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Configuration Details */}
            {result.configuration_details && (
              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                <h4 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <Settings size={16} />
                  Configuration Details
                </h4>
                <div className="text-sm text-gray-300 bg-gray-900/50 p-3 rounded-lg whitespace-pre-line font-mono">
                  {result.configuration_details}
                </div>
              </div>
            )}
          </div>
        )}

        {/* FUNCTIONALITY TAB */}
        {activeTab === 'functionality' && (
          <div className="space-y-4">
            {result.functionality?.primary_purpose && (
              <div>
                <h3 className="text-base font-semibold text-gray-200 mb-2 flex items-center gap-2">
                  <Server size={16} />
                  Primary Purpose
                </h3>
                <p className="text-gray-300 bg-blue-900/20 p-3 rounded-lg border-l-4 border-blue-500 text-sm">
                  {result.functionality.primary_purpose}
                </p>
              </div>
            )}
            
            {/* Services */}
            {result.functionality?.services?.length ? (
              <div>
                <h3 className="text-base font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <Server size={16} />
                  Services ({result.functionality.services.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {result.functionality.services.map((service, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-blue-900/20 rounded-lg border border-blue-500/30">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-300 text-sm">{service}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            
            {/* Packages */}
            {result.functionality?.packages?.length ? (
              <div>
                <h3 className="text-base font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <Package size={16} />
                  Packages ({result.functionality.packages.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {result.functionality.packages.map((pkg, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-green-900/20 rounded-lg border border-green-500/30">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-300 text-sm">{pkg}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            
            {/* Files Managed */}
            {result.functionality?.files_managed?.length ? (
              <div>
                <h3 className="text-base font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <FileCode size={16} />
                  Files Managed ({result.functionality.files_managed.length})
                </h3>
                <div className="space-y-1">
                  {result.functionality.files_managed.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-yellow-900/20 rounded-lg border-l-4 border-yellow-500/50">
                      <FileCode size={14} className="text-yellow-400 flex-shrink-0" />
                      <code className="text-gray-300 text-sm font-mono">{file}</code>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            
            {/* Reusability & Customization */}
            {(result.functionality?.reusability || result.functionality?.customization_points?.length) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.functionality.reusability && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-200 mb-2">Reusability</h4>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                      result.functionality.reusability === 'HIGH' ? 'bg-green-900/30 text-green-400 border-green-500/30' :
                      result.functionality.reusability === 'MEDIUM' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30' :
                      'bg-red-900/30 text-red-400 border-red-500/30'
                    }`}>
                      {result.functionality.reusability}
                    </div>
                  </div>
                )}
                {result.functionality?.customization_points?.length ? (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-200 mb-2">Customization Points</h4>
                    <div className="space-y-1">
                      {result.functionality.customization_points.map((point, i) => (
                        <div key={i} className="text-xs text-gray-400 bg-gray-800/30 px-2 py-1 rounded">
                          • {point}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* REQUIREMENTS TAB */}
        {activeTab === 'requirements' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-200 mb-3 flex items-center gap-2">
                <Database size={16} />
                Version Requirements
              </h3>
              <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Chef Version</div>
                    <div className="text-gray-300 font-mono bg-gray-900/50 px-2 py-1 rounded">
                      {result.version_requirements?.min_chef_version || 'Not specified'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Ruby Version</div>
                    <div className="text-gray-300 font-mono bg-gray-900/50 px-2 py-1 rounded">
                      {result.version_requirements?.min_ruby_version || 'Not specified'}
                    </div>
                  </div>
                </div>
                {result.version_requirements?.estimated_hours && (
                  <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <div className="text-sm text-gray-500 mb-2">Estimated Migration Time</div>
                    <div className="flex items-center gap-4">
                      <div className="text-lg font-bold text-orange-400">
                        {formatHoursDisplay(result.version_requirements.estimated_hours)}
                      </div>
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${getMigrationEffortColor(result.version_requirements.migration_effort)}`}>
                        <TrendingUp size={12} />
                        {result.version_requirements.migration_effort} Effort
                      </div>
                    </div>
                  </div>
                )}
                {result.version_requirements?.deprecated_features?.length ? (
                  <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <div className="text-sm text-gray-500 mb-2">Deprecated Features</div>
                    <div className="space-y-1">
                      {result.version_requirements.deprecated_features.map((feature, i) => (
                        <div key={i} className="text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded border-l-2 border-red-500">
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            
            {result.dependencies && (
              <div>
                <h3 className="text-base font-semibold text-gray-200 mb-2">Dependencies</h3>
                <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3">
                  <p className="text-amber-300 text-sm whitespace-pre-line">{result.dependencies}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RECOMMENDATIONS TAB */}
        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            {result.recommendations?.consolidation_action && (
              <div>
                <h3 className="text-base font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <GitBranch size={16} />
                  Recommended Action
                </h3>
                <div className={`p-3 rounded-lg border-l-4 ${
                  result.recommendations.consolidation_action === 'REUSE' ? 'bg-green-900/20 border-green-500' :
                  result.recommendations.consolidation_action === 'EXTEND' ? 'bg-blue-900/20 border-blue-500' :
                  result.recommendations.consolidation_action === 'REPLACE' ? 'bg-orange-900/20 border-orange-500' :
                  'bg-gray-800/20 border-gray-500'
                }`}>
                  <div className="text-lg font-semibold mb-2">
                    {result.recommendations.consolidation_action}
                  </div>
                  {result.recommendations.rationale && (
                    <p className="text-sm text-gray-300">{result.recommendations.rationale}</p>
                  )}
                </div>
              </div>
            )}
            
            {result.recommendations?.migration_priority && (
              <div>
                <h3 className="text-base font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <TrendingUp size={16} />
                  Migration Priority
                </h3>
                <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${getPriorityColor(result.recommendations.migration_priority)}`}>
                  <Shield size={16} />
                  <span className="font-semibold">{result.recommendations.migration_priority} Priority</span>
                </div>
              </div>
            )}
            
            {result.recommendations?.risk_factors?.length ? (
              <div>
                <h3 className="text-base font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Risk Factors ({result.recommendations.risk_factors.length})
                </h3>
                <div className="space-y-2">
                  {result.recommendations.risk_factors.map((risk, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 bg-red-900/20 rounded-lg border border-red-500/30">
                      <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300 text-sm">{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield size={48} className="mx-auto mb-3 text-green-600" />
                <p className="text-green-400 font-semibold">No Risk Factors Identified</p>
                <p className="text-sm text-gray-500 mt-1">This configuration appears to be low-risk for migration</p>
              </div>
            )}
          </div>
        )}

        {/* CONVERSION TAB */}
        {activeTab === 'conversion' && (
          <div className="space-y-4">
            {(() => {
              const convertibleInfo = getConvertibleDisplay(result);
              return (
                <div className={`p-4 rounded-lg border-l-4 ${convertibleInfo.color}`}>
                  <div className="flex items-center gap-2 mb-3">
                    {convertibleInfo.status === true ? (
                      <CheckCircle className="text-green-400" size={20} />
                    ) : convertibleInfo.status === false ? (
                      <XCircle className="text-red-400" size={20} />
                    ) : (
                      <AlertTriangle className="text-yellow-400" size={20} />
                    )}
                    <h3 className={`font-semibold text-lg ${
                      convertibleInfo.status === true ? 'text-green-300' : 
                      convertibleInfo.status === false ? 'text-red-300' : 'text-yellow-300'
                    }`}>
                      {convertibleInfo.status === true ? 'Conversion Possible' : 
                       convertibleInfo.status === false ? 'Conversion Not Recommended' : 'Conversion Under Review'}
                    </h3>
                  </div>
                  <p className={`text-sm leading-relaxed ${
                    convertibleInfo.status === true ? 'text-green-200' : 
                    convertibleInfo.status === false ? 'text-red-200' : 'text-yellow-200'
                  }`}>
                    {result.conversion_notes || 'No conversion notes available.'}
                  </p>
                </div>
              );
            })()}
            
            {/* Performance Comparison */}
            {(result.duration_ms != null || result.manual_estimate_ms != null || result.speedup != null) && (
              <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/50">
                <h4 className="font-semibold text-gray-200 mb-4 text-lg flex items-center gap-2">
                  <Zap size={18} />
                  Performance Comparison
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
                    <div className="text-2xl font-bold text-blue-400 mb-1">
                      {formatTimeDisplay(result.duration_ms)}
                    </div>
                    <div className="text-sm text-gray-400">AI Analysis Time</div>
                    <div className="text-xs text-blue-300 mt-1">Automated</div>
                  </div>
                  <div className="text-center p-4 bg-orange-900/20 rounded-lg border border-orange-500/30">
                    <div className="text-2xl font-bold text-orange-400 mb-1">
                      {formatTimeDisplay(result.manual_estimate_ms)}
                    </div>
                    <div className="text-sm text-gray-400">Manual Review Est.</div>
                    <div className="text-xs text-orange-300 mt-1">Human Expert</div>
                  </div>
                  <div className="text-center p-4 bg-green-900/20 rounded-lg border border-green-500/30">
                    <div className="text-2xl font-bold text-green-400 mb-1">
                      {result.speedup ? `${result.speedup.toFixed(1)}x` : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-400">Speed Improvement</div>
                    <div className="text-xs text-green-300 mt-1">Efficiency Gain</div>
                  </div>
                </div>
                
                {/* Progress Bar Visualization */}
                {result.speedup && result.speedup > 1 && (
                  <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <div className="text-sm text-gray-400 mb-2">Efficiency Visualization</div>
                    <div className="relative">
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(100, (result.speedup / 10) * 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 text-center">
                        AI analysis is {result.speedup.toFixed(1)}x faster than manual review
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Conversion Steps */}
            {getConvertibleDisplay(result).status === true && (
              <div className="bg-blue-900/10 p-4 rounded-lg border border-blue-500/20">
                <h4 className="font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <GitBranch size={16} />
                  Next Steps for Conversion
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                    <div>
                      <div className="font-medium text-gray-300">Context Analysis</div>
                      <div className="text-sm text-gray-500">Gather additional context and dependencies</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                    <div>
                      <div className="font-medium text-gray-300">Code Conversion</div>
                      <div className="text-sm text-gray-500">Transform infrastructure code to Ansible playbook</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                    <div>
                      <div className="font-medium text-gray-300">Validation & Testing</div>
                      <div className="text-sm text-gray-500">Verify syntax and run security checks</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</div>
                    <div>
                      <div className="font-medium text-gray-300">Deployment</div>
                      <div className="text-sm text-gray-500">Deploy to target environment</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassificationPanel;