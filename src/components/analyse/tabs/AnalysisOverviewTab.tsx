import React from 'react';
import { Clock, FileText, AlertTriangle, Database, Zap } from 'lucide-react';
import { BackendAnalysisResponse } from '../types/BackendTypes';
import { 
  getAnalysisTiming, 
  hasBackendData, 
  getAnalysisContent  // ONLY NEW ADDITION - safe content extraction
} from '../utils/backendUtils';

interface AnalysisOverviewTabProps {
  result: BackendAnalysisResponse;
}

export const AnalysisOverviewTab: React.FC<AnalysisOverviewTabProps> = ({ result }) => {
  const timing = getAnalysisTiming(result);

  // REPLACED: Show actual analysis content from backend with clear labeling
  // OLD: Multiple if statements checking different fields
  // NEW: Single safe function that handles objects
  const analysisContent = getAnalysisContent(result);

  // KEPT EXACTLY THE SAME: Real metrics from actual backend data (NO speed improvement calculation)
  const getRealMetrics = () => {
    const metrics = [];
    
    // Analysis timing - always show if available
    if (timing.ms > 0) {
      metrics.push({
        label: 'Analysis Time',
        value: timing.display,
        icon: Clock,
        color: 'text-blue-400',
        description: 'Total processing time'
      });
    }

    // Files analyzed - from backend metadata
    if (result.metadata?.files_analyzed?.length) {
      metrics.push({
        label: 'Files Processed',
        value: `${result.metadata.files_analyzed.length} files`,
        icon: FileText,
        color: 'text-green-400',
        description: 'Successfully analyzed'
      });
    }

    // Code size - from backend metadata
    if (result.metadata?.total_code_size) {
      const size = result.metadata.total_code_size;
      const sizeDisplay = size > 1024 
        ? `${(size / 1024).toFixed(1)}KB` 
        : `${size} chars`;
      metrics.push({
        label: 'Code Analyzed',
        value: sizeDisplay,
        icon: Database,
        color: 'text-purple-400',
        description: 'Total code processed'
      });
    }

    // Resources found - from tree-sitter facts
    if (result.tree_sitter_facts?.total_resources) {
      metrics.push({
        label: 'Resources Found',
        value: result.tree_sitter_facts.total_resources.toString(),
        icon: Zap,
        color: 'text-orange-400',
        description: 'Automation resources detected'
      });
    }

    return metrics;
  };

  const realMetrics = getRealMetrics();

  return (
    <div className="space-y-6">
      
      {/* REPLACED: Analysis Content from Backend - SAFE RENDERING */}
      {/* OLD: Manual checks for detailed_analysis, primary_purpose, recommendations.rationale */}
      {/* NEW: Single safe function that tries all fields and handles objects */}
      {analysisContent && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className="text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-200">{analysisContent.type}</h3>
            <span className="text-xs text-gray-500 ml-2">({analysisContent.description})</span>
          </div>
          <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg p-4 border border-blue-500/30">
            <div className="text-gray-300 leading-relaxed">
              {analysisContent.content}
            </div>
          </div>
        </div>
      )}

      {/* KEPT EXACTLY THE SAME: Real Backend Metrics */}
      {realMetrics.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
            <Database size={18} />
            Analysis Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {realMetrics.map((metric, index) => (
              <div key={index} className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <metric.icon size={16} className={metric.color} />
                  <span className="text-xs text-gray-500">{metric.label}</span>
                </div>
                <div className={`text-lg font-bold ${metric.color}`}>
                  {metric.value}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {metric.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KEPT EXACTLY THE SAME: File Analysis Details */}
      {result.metadata?.files_analyzed && result.metadata.files_analyzed.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
            <FileText size={18} />
            Files Analyzed
          </h3>
          <div className="bg-gray-800/20 rounded-lg p-3 border border-gray-700/30">
            <div className="grid grid-cols-1 gap-2">
              {result.metadata.files_analyzed.slice(0, 5).map((filename, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <FileText size={14} className="text-gray-500 flex-shrink-0" />
                  <code className="text-gray-300 bg-gray-900/50 px-2 py-1 rounded text-xs font-mono">
                    {filename}
                  </code>
                </div>
              ))}
              {result.metadata.files_analyzed.length > 5 && (
                <div className="text-xs text-gray-500 mt-2">
                  ... and {result.metadata.files_analyzed.length - 5} more files
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KEPT EXACTLY THE SAME: Session Information - Enhanced */}
      {(result?.metadata?.correlation_id || result?.session_info?.session_id || result?.metadata?.analyzed_at) && (
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} />
            Session Details
          </h3>
          <div className="bg-gray-800/20 rounded-lg p-3 border border-gray-700/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              
              {result.metadata?.correlation_id && (
                <div>
                  <span className="text-gray-500">Correlation ID:</span>
                  <code className="ml-2 text-gray-300 bg-gray-900/50 px-2 py-1 rounded text-xs">
                    {result.metadata.correlation_id}
                  </code>
                </div>
              )}
              
              {result.metadata?.analyzed_at && (
                <div>
                  <span className="text-gray-500">Analyzed:</span>
                  <span className="ml-2 text-gray-300">
                    {new Date(result.metadata.analyzed_at).toLocaleTimeString()}
                  </span>
                </div>
              )}
              
              {result.metadata?.agent_name && (
                <div>
                  <span className="text-gray-500">Agent:</span>
                  <span className="ml-2 text-gray-300 flex items-center gap-1">
                    {result.metadata.agent_icon && <span>{result.metadata.agent_icon}</span>}
                    {result.metadata.agent_name}
                  </span>
                </div>
              )}
              
              {result.metadata?.technology_type && (
                <div>
                  <span className="text-gray-500">Technology:</span>
                  <span className="ml-2 text-gray-300 capitalize">
                    {result.metadata.technology_type}
                  </span>
                </div>
              )}
              
            </div>
          </div>
        </div>
      )}

      {/* KEPT EXACTLY THE SAME: Graceful Fallback - only if NO content available */}
      {!analysisContent && realMetrics.length === 0 && !result.metadata?.files_analyzed?.length && (
        <div className="text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <AlertTriangle size={48} className="mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">Analysis completed successfully</p>
          <p className="text-sm text-gray-500 mt-1">
            Ready to proceed to next step
          </p>
        </div>
      )}
      
    </div>
  );
};