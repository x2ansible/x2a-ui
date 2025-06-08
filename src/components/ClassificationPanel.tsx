import React, { useState } from 'react';
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
  
  // New fields from backend response
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
}

type Tab = 'overview' | 'functionality' | 'requirements' | 'recommendations' | 'conversion';

// ============================
// ENHANCED HELPER FUNCTIONS
// ============================

const getDisplayValue = (value: any, fallback: string = 'Not specified'): string => {
  if (value === null || value === undefined || value === '' || 
      value === 'Unknown' || value === 'Not assessed' || value === 'Not specified') {
    return fallback;
  }
  return String(value);
};

const getDisplayToolLanguage = (classification: string): string => {
  if (!classification || classification === 'Unknown') {
    return 'Chef';
  }
  
  if (classification.toLowerCase().includes('uploaded_cookbook') || 
      classification.toLowerCase().includes('cookbook_')) {
    return 'Chef';
  }
  
  if (classification.includes('+')) {
    return classification;
  }
  
  return classification
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
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
        details: 'Basic cookbook structure'
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

const getPrimaryPurposeDisplay = (result: ClassificationResult): string => {
  const purpose = result.functionality?.primary_purpose ||
                 result.summary ||
                 result.detailed_analysis?.split('\n')[0] ||
                 '';
  
  if (!purpose || purpose === 'No summary available') {
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
      return 'Chef cookbook for system configuration and management';
    }
  }
  
  return purpose;
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

// ============================
// MAIN COMPONENT
// ============================

const ClassificationPanel: React.FC<{ 
  classificationResult?: ClassificationResult;
  selectedFile?: string;
  selectedGitFile?: string;
  code?: string;
  loading?: boolean;
  step?: number;
}> = ({ classificationResult }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showComplexityDesc, setShowComplexityDesc] = useState(false);

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
      {/* Header with enhanced info */}
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

        {/* Enhanced Quick Stats */}
        <div className="p-4 bg-gray-800/50 border-b border-gray-700">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Tool/Language */}
            <div className="text-center bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className="text-lg font-bold text-blue-400 capitalize truncate">
                Chef
              </div>
              <div className="text-xs text-gray-500 mt-1">Tool/Language</div>
              {result.cookbook_name && result.cookbook_name !== result.classification && (
                <div className="text-xs text-gray-400 mt-0.5 truncate">
                  {result.cookbook_name.replace(/_/g, ' ')}
                </div>
              )}
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
                    {/* Enhanced Popover */}
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
            {/* Enhanced Summary Section */}
            <div>
              <h3 className="text-base font-semibold text-gray-200 mb-3 flex items-center gap-2">
                <FileCode size={16} />
                Executive Summary
              </h3>
              <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 p-4 rounded-lg border border-blue-500/30">
                <p className="text-gray-300 text-sm leading-relaxed">
                  {getPrimaryPurposeDisplay(result)}
                </p>
                {result.summary && result.summary !== getPrimaryPurposeDisplay(result) && (
                  <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                    {result.summary}
                  </p>
                )}
              </div>
            </div>

            {/* Migration Assessment Grid */}
            <div>
              <h3 className="text-base font-semibold text-gray-200 mb-3 flex items-center gap-2">
                <TrendingUp size={16} />
                Migration Assessment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Migration Effort */}
                <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/50">
                  {(() => {
                    const migrationInfo = getMigrationEffortDisplay(result);
                    return (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400">Migration Effort</span>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${getMigrationEffortColor(migrationInfo.level)}`}>
                            {migrationInfo.level}
                          </div>
                        </div>
                        <div className="text-lg font-bold text-gray-200">
                          {migrationInfo.text}
                        </div>
                        {result.version_requirements?.estimated_hours && (
                          <div className="text-sm text-gray-400 mt-1">
                            Estimated: {formatHoursDisplay(result.version_requirements.estimated_hours)}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Conversion Readiness */}
                <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/50">
                  {(() => {
                    const convertibleInfo = getConvertibleDisplay(result);
                    return (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400">Conversion Ready</span>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${convertibleInfo.color}`}>
                            {convertibleInfo.text.toUpperCase()}
                          </div>
                        </div>
                        <div className="text-lg font-bold text-gray-200">
                          {convertibleInfo.status === true ? 'Ready' : 
                           convertibleInfo.status === false ? 'Needs Work' : 'Under Review'}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          {convertibleInfo.confidence}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Detailed Analysis */}
            {result.detailed_analysis && (
              <div>
                <h3 className="text-base font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <Settings size={16} />
                  Technical Analysis
                </h3>
                <div className="bg-gray-900/50 rounded-lg border border-gray-700/70 p-4">
                  <div className="prose prose-invert max-w-none text-sm">
                    <ReactMarkdown>
                      {result.detailed_analysis}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {/* Key Operations */}
            {result.key_operations?.length > 0 && (
              <div>
                <h3 className="text-base font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <Wrench size={16} />
                  Key Operations ({result.key_operations.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.key_operations.map((operation, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-green-900/20 rounded-lg border border-green-500/30">
                      <div className="text-green-400 font-bold text-xs flex-shrink-0 mt-1 bg-green-900/30 px-1.5 py-0.5 rounded">
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <div className="text-gray-300 text-sm flex-1">
                        {operation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resource Summary */}
            {(result.functionality?.services?.length > 0 || 
              result.functionality?.packages?.length > 0 || 
              result.resources?.length > 0) && (
              <div>
                <h3 className="text-base font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <Package size={16} />
                  Resource Overview
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Services */}
                  {result.functionality?.services?.length > 0 && (
                    <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-500/30">
                      <div className="text-blue-300 font-medium text-sm mb-2">
                        Services ({result.functionality.services.length})
                      </div>
                      <div className="space-y-1">
                        {result.functionality.services.slice(0, 3).map((service, i) => (
                          <div key={i} className="text-gray-300 text-xs flex items-center gap-2">
                            <Server size={10} />
                            {service}
                          </div>
                        ))}
                        {result.functionality.services.length > 3 && (
                          <div className="text-gray-400 text-xs">
                            +{result.functionality.services.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Packages */}
                  {result.functionality?.packages?.length > 0 && (
                    <div className="bg-green-900/20 p-3 rounded-lg border border-green-500/30">
                      <div className="text-green-300 font-medium text-sm mb-2">
                        Packages ({result.functionality.packages.length})
                      </div>
                      <div className="space-y-1">
                        {result.functionality.packages.slice(0, 3).map((pkg, i) => (
                          <div key={i} className="text-gray-300 text-xs flex items-center gap-2">
                            <Package size={10} />
                            {pkg}
                          </div>
                        ))}
                        {result.functionality.packages.length > 3 && (
                          <div className="text-gray-400 text-xs">
                            +{result.functionality.packages.length - 3} more packages
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Files Managed */}
                  {result.functionality?.files_managed?.length > 0 && (
                    <div className="bg-yellow-900/20 p-3 rounded-lg border border-yellow-500/30">
                      <div className="text-yellow-300 font-medium text-sm mb-2">
                        Files ({result.functionality.files_managed.length})
                      </div>
                      <div className="space-y-1">
                        {result.functionality.files_managed.slice(0, 3).map((file, i) => (
                          <div key={i} className="text-gray-300 text-xs flex items-center gap-2">
                            <FileCode size={10} />
                            <code className="font-mono truncate">{file}</code>
                          </div>
                        ))}
                        {result.functionality.files_managed.length > 3 && (
                          <div className="text-gray-400 text-xs">
                            +{result.functionality.files_managed.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Performance Metrics */}
            {(result.duration_ms || result.speedup) && (
              <div>
                <h3 className="text-base font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <Zap size={16} />
                  Performance Analysis
                </h3>
                <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 p-4 rounded-lg border border-purple-500/30">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-400">
                        {formatTimeDisplay(result.duration_ms)}
                      </div>
                      <div className="text-xs text-gray-400">AI Analysis</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-400">
                        {formatTimeDisplay(result.manual_estimate_ms)}
                      </div>
                      <div className="text-xs text-gray-400">Manual Est.</div>
                    </div>
                    {result.speedup && result.speedup > 1 && (
                      <div>
                        <div className={`text-2xl font-bold ${getSpeedupDisplay(result).color}`}>
                          {result.speedup.toFixed(1)}x
                        </div>
                        <div className="text-xs text-gray-400">Speedup</div>
                      </div>
                    )}
                    <div>
                      <div className="text-2xl font-bold text-green-400">
                        {result.version_requirements?.estimated_hours ? 
                         Math.round(((result.version_requirements.estimated_hours * 60 * 60 * 1000) / (result.duration_ms || 1))) + '%' : 
                         'N/A'}
                      </div>
                      <div className="text-xs text-gray-400">Efficiency</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata Section */}
            {result.metadata && (
              <div>
                <h3 className="text-base font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <Info size={16} />
                  Analysis Metadata
                </h3>
                <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Analyzed:</span>
                        <span className="text-gray-300">
                          {result.metadata.analyzed_at ? 
                           new Date(result.metadata.analyzed_at).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Agent Version:</span>
                        <span className="text-gray-300">{result.metadata.agent_version || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Correlation ID:</span>
                        <span className="text-gray-300 font-mono text-xs">
                          {result.metadata.correlation_id?.substring(0, 8) || 'N/A'}...
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Method:</span>
                        <span className="text-gray-300">
                          {result.session_info?.method_used || 'Standard'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Confidence:</span>
                        <span className="text-gray-300">{result.confidence_source || 'High'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Session:</span>
                        <span className="text-gray-300 font-mono text-xs">
                          {result.session_info?.session_id?.substring(0, 8) || 'N/A'}...
                        </span>
                      </div>
                    </div>
                  </div>
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
            {/* Version Requirements */}
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

            {/* Dependencies */}
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
                <p className="text-sm text-gray-500 mt-1">This cookbook appears to be low-risk for migration</p>
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
                      <div className="text-sm text-gray-500">Transform Chef cookbook to Ansible playbook</div>
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