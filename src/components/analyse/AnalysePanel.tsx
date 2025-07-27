"use client";

import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  FileCode, 
  TrendingUp,
  RefreshCw
} from 'lucide-react';

import { BackendAnalysisResponse, ClassificationPanelProps, TabId } from './types/BackendTypes';
import { 
  getAgentInfo, 
  getAnalysisTiming, 
  getMigrationInfo, 
  getComplexityInfo, 
  getUpgradeInfo,
  getAnalysisStatus
} from './utils/backendUtils';

import { AnalysisOverviewTab } from './tabs/AnalysisOverviewTab';
import { TechnicalDetailsTab } from './tabs/TechnicalDetailsTab';
import { AssessmentTab } from './tabs/AssessmentTab';
import { EnhancedAnalysisLoading } from '../EnhancedAnalysisLoading';

// SAFE: Sanitize result object to prevent React rendering errors
const sanitizeResult = (result: BackendAnalysisResponse): BackendAnalysisResponse => {
  const sanitizeValue = (value: unknown): unknown => {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) return value.map(sanitizeValue);
    
    if (typeof value === 'object') {
      // Convert problematic objects to safe strings
      const keys = Object.keys(value as Record<string, unknown>);
      if (keys.includes('description') && keys.includes('configuration_complexity')) {
        // This is a Salt response object - convert to string
        return (value as Record<string, unknown>).description || JSON.stringify(value, null, 2);
      }
      
      // Recursively sanitize regular objects
      const sanitized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        sanitized[key] = sanitizeValue(val);
      }
      return sanitized;
    }
    
    return String(value);
  };

  return sanitizeValue(result) as BackendAnalysisResponse;
};

// Quick Alternative: Add technologyType prop without modifying interface
const AnalysisPanel: React.FC<ClassificationPanelProps & { technologyType?: string }> = ({
  result,
  loading,
  error,
  technologyType // Added this prop directly
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Get technology type for enhanced loading
  const getTechnologyType = () => {
    // Use passed prop first
    if (technologyType) {
      return technologyType;
    }
    
    // Fallback to detection from result
    if (result?.metadata?.technology_type) {
      return result.metadata.technology_type;
    }
    
    // Fallback detection from result structure
    const anyResult = result as Record<string, unknown>;
    if (anyResult?.managed_services || anyResult?.object_type) return 'salt';
    if (anyResult?.current_state || anyResult?.upgrade_requirements) return 'ansible-upgrade';
    if (result?.object_type || result?.object_name || result?.puppet_resources) return 'puppet';
    if (result?.functionality || result?.tree_sitter_facts) return 'chef';
    
    return 'chef'; // default
  };

  // Handle loading state with enhanced animation
  if (loading) {
    return (
      <EnhancedAnalysisLoading 
        technologyType={getTechnologyType()}
      />
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center text-red-400 max-w-md mx-auto px-6">
          <div className="relative mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/50">
              <XCircle size={32} className="text-red-400" />
            </div>
            <div className="absolute inset-0 rounded-full border border-red-500/30 animate-ping"></div>
          </div>
          <h2 className="text-xl font-bold text-red-300 mb-3">Analysis Error</h2>
          <p className="text-sm text-gray-400 leading-relaxed">{error}</p>
          <div className="mt-6 p-3 bg-red-900/20 rounded-lg border border-red-500/30">
            <p className="text-xs text-red-300">
              Please try again or check your input files
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Handle no result
  if (!result) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center text-gray-400 max-w-md mx-auto px-6">
          <div className="relative mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700/30 border-2 border-gray-600/50">
              <FileCode size={32} className="text-gray-500" />
            </div>
            <div className="absolute inset-0 rounded-full border border-gray-600/30 animate-pulse"></div>
          </div>
          <h2 className="text-xl font-bold text-gray-300 mb-3">Ready for Analysis</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            Upload and analyze files to see detailed results
          </p>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className="text-blue-400 font-bold">🍳</div>
              <div className="text-gray-500 mt-1">Chef</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className="text-green-400 font-bold">🟢</div>
              <div className="text-gray-500 mt-1">Salt</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className="text-red-400 font-bold">🅰️</div>
              <div className="text-gray-500 mt-1">Ansible</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle backend failure
  if (result.success === false) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center text-red-400 max-w-md mx-auto px-6">
          <div className="relative mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/50">
              <XCircle size={32} className="text-red-400" />
            </div>
            <div className="absolute inset-0 rounded-full border border-red-500/30 animate-ping"></div>
          </div>
          <h2 className="text-xl font-bold text-red-300 mb-3">Analysis Failed</h2>
          <p className="text-sm text-gray-400 leading-relaxed mb-4">
            {typeof result.error === 'string' ? result.error : 'Backend analysis was not successful'}
          </p>
          <div className="bg-red-900/20 rounded-lg p-4 border border-red-500/30">
            <p className="text-xs text-red-300 text-left">
              <strong>Possible causes:</strong><br/>
              • Invalid file format<br/>
              • Network connectivity issues<br/>
              • Server processing error
            </p>
          </div>
        </div>
      </div>
    );
  }

  // SAFE: Sanitize the result before using it
  const safeResult = sanitizeResult(result);

  // Get data for display
  const agentInfo = getAgentInfo(safeResult);
  const timing = getAnalysisTiming(safeResult);
  const migrationInfo = getMigrationInfo(safeResult);
  const complexityInfo = getComplexityInfo(safeResult);
  const upgradeInfo = getUpgradeInfo(safeResult);

  // Non-hardcoded status extraction
  const statusText = getAnalysisStatus(safeResult);

  // Tab configuration
  const tabs = [
    { id: 'overview' as TabId, label: 'Overview', icon: FileCode },
    { id: 'technical' as TabId, label: 'Technical', icon: AlertTriangle },
    { id: 'assessment' as TabId, label: 'Assessment', icon: TrendingUp }
  ];

  return (
    <div className="w-full h-full flex flex-col bg-black text-white">
      
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-700 p-4 bg-gray-900/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
              <div className="p-1.5 bg-blue-500/20 rounded border border-blue-400/30">
                <FileCode className="text-blue-400" size={18} />
              </div>
              Analysis Results
              {agentInfo.icon && <span className="text-lg">{agentInfo.icon}</span>}
            </h2>
            <p className="text-gray-400 mt-1 text-sm">
              {agentInfo.name}
              {agentInfo.correlationId && (
                <span className="ml-2 text-xs text-gray-500 font-mono">
                  ID: {agentInfo.correlationId.substring(0, 8)}...
                </span>
              )}
            </p>
          </div>
          
          {timing.ms > 0 && (
            <div className="text-right">
              <div className="text-xs text-gray-500">Analysis Time</div>
              <div className="text-lg font-bold text-blue-400">{timing.display}</div>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="flex-shrink-0 p-4 bg-gray-800/30 border-b border-gray-700">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Agent/Technology */}
          <div className="text-center bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <div className="text-lg font-bold text-orange-400 flex items-center justify-center gap-1">
              <span>{agentInfo.icon}</span>
              <span className="capitalize text-sm">
                {agentInfo.technology && agentInfo.technology.startsWith("ansible")
                  ? "Ansible"
                  : agentInfo.technology?.replace('-', ' ')
                }
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">Technology</div>
          </div>

          {/* Smart Status Card */}
          <div className="text-center bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${
              statusText === 'Upgrade Needed'
                ? 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30'
                : statusText === 'Up to Date'
                ? 'bg-green-900/30 text-green-400 border-green-500/30'
                : statusText === 'Possible Upgrade'
                ? 'bg-blue-900/30 text-blue-400 border-blue-500/30'
                : 'bg-gray-800/50 text-gray-400 border-gray-600/30'
            }`}>
              {statusText === 'Upgrade Needed' && <RefreshCw size={12} />}
              {statusText === 'Up to Date' && <CheckCircle size={12} />}
              {statusText === 'Possible Upgrade' && <AlertTriangle size={12} />}
              {statusText}
            </div>
            <div className="text-xs text-gray-500 mt-1">Status</div>
          </div>

          {/* Complexity or Breaking Changes Count for Ansible */}
          {agentInfo.technology === 'ansible-upgrade' && upgradeInfo?.hasUpgradeData ? (
            <div className="text-center bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${
                (typeof upgradeInfo.breakingChangesCount === 'number' && upgradeInfo.breakingChangesCount > 0) 
                  ? 'text-red-400 bg-red-900/30 border-red-500/30' 
                  : 'text-green-400 bg-green-900/30 border-green-500/30'
              }`}>
                <span>{(typeof upgradeInfo.breakingChangesCount === 'number' && upgradeInfo.breakingChangesCount > 0) ? '⚠️' : ''}</span>
                <span>{typeof upgradeInfo.breakingChangesCount === 'number' ? upgradeInfo.breakingChangesCount : 0} Breaking</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Changes</div>
            </div>
          ) : complexityInfo ? (
            <div className="text-center bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${
                complexityInfo.color === 'text-red-400' ? 'text-red-400 bg-red-900/30 border-red-500/30' :
                complexityInfo.color === 'text-yellow-400' ? 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30' :
                'text-green-400 bg-green-900/30 border-green-500/30'
              }`}>
                <span>{complexityInfo.level === 'HIGH' ? '🔴' : complexityInfo.level === 'MEDIUM' ? '🟡' : '🟢'}</span>
                <span>{complexityInfo.display}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Complexity</div>
            </div>
          ) : null}

          {/* Migration Effort or Version Info for Ansible */}
          {agentInfo.technology === 'ansible-upgrade' && upgradeInfo?.hasUpgradeData && upgradeInfo.currentVersion !== 'Not specified' ? (
            <div className="text-center bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className="text-xs font-medium text-blue-400">
                {typeof upgradeInfo.currentVersion === 'string' ? upgradeInfo.currentVersion : 'Not specified'}
                {typeof upgradeInfo.recommendedVersion === 'string' && 
                 upgradeInfo.recommendedVersion !== 'Not specified' && 
                 upgradeInfo.recommendedVersion !== upgradeInfo.currentVersion && (
                  <span className="text-gray-500"> → {upgradeInfo.recommendedVersion}</span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">Version</div>
            </div>
          ) : migrationInfo ? (
            <div className="text-center bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${migrationInfo.color.replace('text-', 'border-').replace('-400', '-500/30')} ${migrationInfo.color.replace('text-', 'bg-').replace('-400', '-900/30')}`}>
                <TrendingUp size={12} />
                <span>{migrationInfo.display}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Migration</div>
            </div>
          ) : null}

        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 px-4 pt-3 bg-gray-900/30">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                activeTab === tab.id
                  ? 'bg-blue-900/50 text-blue-300 shadow-sm border border-blue-500/30'
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content - SAFE: Pass sanitized result */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 bg-black">
        {activeTab === 'overview' && <AnalysisOverviewTab result={safeResult} />}
        {activeTab === 'technical' && <TechnicalDetailsTab result={safeResult} />}
        {activeTab === 'assessment' && <AssessmentTab result={safeResult} />}
      </div>
      
    </div>
  );
};

export default AnalysisPanel;