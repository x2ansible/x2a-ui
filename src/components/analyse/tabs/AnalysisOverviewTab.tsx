import React from 'react';
import { Clock, Zap, AlertTriangle } from 'lucide-react';
import { BackendAnalysisResponse } from '../types/BackendTypes';
import { getAnalysisTiming, hasBackendData } from '../utils/backendUtils';


interface AnalysisOverviewTabProps {
  result: BackendAnalysisResponse;
}

export const AnalysisOverviewTab: React.FC<AnalysisOverviewTabProps> = ({ result }) => {
  const timing = getAnalysisTiming(result);

  // Show actual analysis content from backend
  const getAnalysisContent = () => {
    // Priority: detailed_analysis > primary_purpose > rationale
    if (hasBackendData(result?.detailed_analysis)) {
      return result.detailed_analysis;
    }
    if (hasBackendData(result?.functionality?.primary_purpose)) {
      return result.functionality.primary_purpose;
    }
    if (hasBackendData(result?.recommendations?.rationale)) {
      return result.recommendations.rationale;
    }
    return null;
  };

  const analysisContent = getAnalysisContent();

  // Performance metrics from actual backend data
  const getPerformanceMetrics = () => {
    const metrics = [];
    if (timing.ms > 0) {
      metrics.push({
        label: 'Analysis Time',
        value: timing.display,
        icon: Clock,
        color: 'text-blue-400'
      });
    }
    if (result.version_requirements?.estimated_hours && timing.ms > 0) {
      const estimatedMs = result.version_requirements.estimated_hours * 3600 * 1000;
      const speedup = estimatedMs / timing.ms;
      if (speedup > 1) {
        metrics.push({
          label: 'Speed Improvement',
          value: `${speedup.toFixed(1)}x faster`,
          icon: Zap,
          color: 'text-green-400'
        });
      }
    }
    if (result.tree_sitter_facts?.total_resources) {
      metrics.push({
        label: 'Resources Analyzed',
        value: result.tree_sitter_facts.total_resources.toString(),
        icon: AlertTriangle,
        color: 'text-purple-400'
      });
    }
    return metrics;
  };

  const performanceMetrics = getPerformanceMetrics();

  return (
    <div className="space-y-6">
      {/* Analysis Content from Backend */}
      {analysisContent && (
        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg p-4 border border-blue-500/30">
          <div className="text-gray-300 leading-relaxed">
            {analysisContent}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {performanceMetrics.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-3">Performance Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {performanceMetrics.map((metric, index) => (
              <div key={index} className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <metric.icon size={16} className={metric.color} />
                  <span className="text-xs text-gray-500">{metric.label}</span>
                </div>
                <div className={`text-lg font-bold ${metric.color}`}>
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Information */}
      {(result?.metadata?.correlation_id || result?.session_info?.session_id) && (
        <div className="bg-gray-800/20 rounded-lg p-3 border border-gray-700/30">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Session Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {result.metadata?.correlation_id && (
              <div>
                <span className="text-gray-500">Correlation ID:</span>
                <code className="ml-2 text-gray-300 bg-gray-900/50 px-1 py-0.5 rounded">
                  {result.metadata.correlation_id}
                </code>
              </div>
            )}
            {result.session_info?.session_id && (
              <div>
                <span className="text-gray-500">Session ID:</span>
                <code className="ml-2 text-gray-300 bg-gray-900/50 px-1 py-0.5 rounded">
                  {result.session_info.session_id.substring(0, 8)}...
                </code>
              </div>
            )}
            {result.analysis_method && (
              <div>
                <span className="text-gray-500">Method:</span>
                <span className="ml-2 text-gray-300">{result.analysis_method}</span>
              </div>
            )}
            {result.metadata?.files_analyzed && (
              <div>
                <span className="text-gray-500">Files:</span>
                <span className="ml-2 text-gray-300">{result.metadata.files_analyzed.length}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Content Fallback */}
      {!analysisContent && performanceMetrics.length === 0 && (
        <div className="text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <AlertTriangle size={48} className="mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">Analysis completed successfully</p>
          <p className="text-sm text-gray-500 mt-1">
            No detailed analysis content available in backend response
          </p>
        </div>
      )}
    </div>
  );
};
