// components/analyse/AnalysisPanel.tsx
"use client";

import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  FileCode, 
  Clock,
  TrendingUp,
  Info
} from 'lucide-react';

import { BackendAnalysisResponse, ClassificationPanelProps, TabId } from './types/BackendTypes';
import { 
  getAgentInfo, 
  getAnalysisTiming, 
  getMigrationInfo, 
  getComplexityInfo, 
  hasBackendData 
} from './utils/backendUtils';

import { AnalysisOverviewTab } from './tabs/AnalysisOverviewTab';
import { TechnicalDetailsTab } from './tabs/TechnicalDetailsTab';
import { AssessmentTab } from './tabs/AssessmentTab';

const AnalysisPanel: React.FC<ClassificationPanelProps> = ({
  result,
  loading,
  error
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Handle loading state
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-center text-gray-400">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg text-gray-300">Analyzing code...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-center text-red-400">
          <XCircle size={48} className="mx-auto mb-4" />
          <p className="text-lg text-red-300">Analysis Error</p>
          <p className="text-sm mt-2 text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  // Handle no result
  if (!result) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-center text-gray-400">
          <FileCode size={48} className="mx-auto mb-4 text-gray-600" />
          <p className="text-lg text-gray-300">No analysis performed yet</p>
          <p className="text-sm mt-2 text-gray-500">Upload and analyze files to see results</p>
        </div>
      </div>
    );
  }

  // Handle backend failure
  if (result.success === false) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-center text-red-400">
          <XCircle size={48} className="mx-auto mb-4" />
          <p className="text-lg text-red-300">Analysis Failed</p>
          <p className="text-sm mt-2 text-gray-400">
            {result.error || 'Backend analysis was not successful'}
          </p>
        </div>
      </div>
    );
  }

  // Get data for display
  const agentInfo = getAgentInfo(result);
  const timing = getAnalysisTiming(result);
  const migrationInfo = getMigrationInfo(result);
  const complexityInfo = getComplexityInfo(result);

  // Tab configuration
  const tabs = [
    { id: 'overview' as TabId, label: 'Overview', icon: FileCode },
    { id: 'technical' as TabId, label: 'Technical', icon: AlertTriangle },
    { id: 'assessment' as TabId, label: 'Assessment', icon: TrendingUp }
  ];

  // Convertible status
  const getConvertibleDisplay = () => {
    if (result.convertible === true) {
      return { 
        text: 'Yes', 
        color: 'bg-green-900/30 text-green-400 border-green-500/30',
        icon: CheckCircle 
      };
    } else if (result.convertible === false) {
      return { 
        text: 'Issues', 
        color: 'bg-red-900/30 text-red-400 border-red-500/30',
        icon: XCircle 
      };
    }
    
    // Infer from recommendation
    const action = result.recommendations?.consolidation_action;
    if (action === 'REUSE' || action === 'EXTEND') {
      return { 
        text: 'Likely', 
        color: 'bg-blue-900/30 text-blue-400 border-blue-500/30',
        icon: CheckCircle 
      };
    }
    
    return { 
      text: 'Unknown', 
      color: 'bg-gray-800/50 text-gray-400 border-gray-600/30',
      icon: AlertTriangle 
    };
  };

  const convertibleStatus = getConvertibleDisplay();

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 text-white">
      
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
              <FileCode className="text-blue-400" size={20} />
              Analysis Results
              {agentInfo.icon && <span className="text-lg">{agentInfo.icon}</span>}
            </h2>
            <p className="text-gray-400 mt-1 text-sm">
              {agentInfo.name}
              {agentInfo.correlationId && (
                <span className="ml-2 text-xs text-gray-500">
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
      <div className="flex-shrink-0 p-4 bg-gray-800/50 border-b border-gray-700">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Agent/Technology */}
          <div className="text-center bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <div className="text-lg font-bold text-orange-400 flex items-center justify-center gap-1">
              <span>{agentInfo.icon}</span>
              <span className="capitalize">{agentInfo.technology}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">Technology</div>
          </div>

          {/* Convertible Status */}
          <div className="text-center bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${convertibleStatus.color}`}>
              <convertibleStatus.icon size={12} />
              {convertibleStatus.text}
            </div>
            <div className="text-xs text-gray-500 mt-1">Convertible</div>
          </div>

          {/* Complexity */}
          {complexityInfo && (
            <div className="text-center bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${
                complexityInfo.level === 'HIGH' ? 'text-red-400 bg-red-900/30 border-red-500/30' :
                complexityInfo.level === 'MEDIUM' ? 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30' :
                'text-green-400 bg-green-900/30 border-green-500/30'
              }`}>
                <span>{complexityInfo.level === 'HIGH' ? '🔴' : complexityInfo.level === 'MEDIUM' ? '🟡' : '🟢'}</span>
                <span>{complexityInfo.display}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Complexity</div>
            </div>
          )}

          {/* Migration Effort */}
          {migrationInfo && (
            <div className="text-center bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${migrationInfo.color.replace('text-', 'border-').replace('-400', '-500/30')} ${migrationInfo.color.replace('text-', 'bg-').replace('-400', '-900/30')}`}>
                <TrendingUp size={12} />
                <span>{migrationInfo.display}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Migration</div>
            </div>
          )}

        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 px-4 pt-3">
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

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        {activeTab === 'overview' && <AnalysisOverviewTab result={result} />}
        {activeTab === 'technical' && <TechnicalDetailsTab result={result} />}
        {activeTab === 'assessment' && <AssessmentTab result={result} />}
      </div>
      
    </div>
  );
};

export default AnalysisPanel;