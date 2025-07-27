import React from 'react';
import { Clock, FileText, Database, Target, Activity } from 'lucide-react';
import { BackendAnalysisResponse } from '../types/BackendTypes';
import { 
  getAnalysisTiming, 
  hasBackendData, 
  getAnalysisContent
} from '../utils/backendUtils';

interface AnalysisOverviewTabProps {
  result: BackendAnalysisResponse;
}

export const AnalysisOverviewTab: React.FC<AnalysisOverviewTabProps> = ({ result }) => {
  const timing = getAnalysisTiming(result);
  const analysisContent = getAnalysisContent(result);

  // ADD DEBUGGING for session data
  console.log('🔍 AnalysisOverviewTab - Session data debugging:');
  console.log('🔍 result.metadata?.correlation_id:', result?.metadata?.correlation_id);
  console.log('🔍 result.session_info?.correlation_id:', result?.session_info?.correlation_id);
  console.log('🔍 result.session_info?.session_id:', result?.session_info?.session_id);
  console.log('🔍 result.metadata?.analyzed_at:', result?.metadata?.analyzed_at);
  console.log('🔍 Session condition result:', !!(result?.metadata?.correlation_id || result?.session_info?.correlation_id || result?.session_info?.session_id || result?.metadata?.analyzed_at));
  console.log(' Full result object:', result);

  console.log('📋 AnalysisOverviewTab - analysisContent:', analysisContent);
  console.log('📋 AnalysisOverviewTab - analysisContent.content:', analysisContent?.content);

  // Get real metrics from backend data only
  const getRealMetrics = () => {
    const metrics = [];
    
    // Analysis timing - only if available
    if (timing.ms > 0) {
      metrics.push({
        label: 'Analysis Time',
        value: timing.display,
        icon: Clock,
        color: 'text-blue-400',
        description: 'Processing Duration'
      });
    }

    // Files analyzed - only if provided by backend
    if (result.metadata?.files_analyzed?.length) {
      const fileCount = result.metadata.files_analyzed.length;
      
      metrics.push({
        label: 'Files Processed',
        value: `${fileCount}`,
        icon: FileText,
        color: 'text-green-400',
        description: fileCount === 1 ? 'File' : 'Files'
      });
    }

    // Code size - only if provided by backend
    if (result.metadata?.total_code_size) {
      const size = result.metadata.total_code_size;
      const sizeDisplay = size > 1024 ? `${(size / 1024).toFixed(1)}KB` : `${size} chars`;
      
      metrics.push({
        label: 'Code Size',
        value: sizeDisplay,
        icon: Database,
        color: 'text-purple-400',
        description: 'Analyzed'
      });
    }

    // NEW: Puppet-specific metrics
    if (result.puppet_resources?.total_resources) {
      metrics.push({
        label: 'Puppet Resources',
        value: result.puppet_resources.total_resources.toString(),
        icon: Target,
        color: 'text-orange-400',
        description: 'Resources Detected'
      });
    }

    // NEW: Puppet resource types breakdown
    if (result.puppet_resources?.resource_types && Object.keys(result.puppet_resources.resource_types).length > 0) {
      const resourceTypes = Object.keys(result.puppet_resources.resource_types);
      const totalTypes = resourceTypes.length;
      
      metrics.push({
        label: 'Resource Types',
        value: `${totalTypes}`,
        icon: Database,
        color: 'text-cyan-400',
        description: totalTypes === 1 ? 'Type' : 'Types'
      });
    }

    // Complexity Score - only if provided by tree-sitter
    if (result.tree_sitter_facts?.complexity_score !== undefined) {
      metrics.push({
        label: 'Complexity Score',
        value: result.tree_sitter_facts.complexity_score.toString(),
        icon: Target,
        color: 'text-orange-400',
        description: 'Static Analysis'
      });
    }

    // Syntax Success Rate - only if provided by tree-sitter
    if (result.tree_sitter_facts?.syntax_success_rate !== undefined) {
      metrics.push({
        label: 'Syntax Success',
        value: `${result.tree_sitter_facts.syntax_success_rate}%`,
        icon: Target,
        color: 'text-green-400',
        description: 'Parser Success'
      });
    }

    // Total Resources - only if provided by tree-sitter
    if (result.tree_sitter_facts?.total_resources !== undefined) {
      metrics.push({
        label: 'Resources Found',
        value: result.tree_sitter_facts.total_resources.toString(),
        icon: Database,
        color: 'text-orange-400',
        description: 'Detected'
      });
    }

    return metrics;
  };

  const realMetrics = getRealMetrics();

  return (
    <div className="space-y-6">
      
      {/* Analysis Content - Only if detailed_analysis exists */}
      {analysisContent && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-400/30">
                <FileText size={18} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-200">{analysisContent.type}</h3>
                <span className="text-xs text-gray-500">{analysisContent.description}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-400 font-medium">COMPLETED</span>
            </div>
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-900/20 to-purple-900/20 backdrop-blur-sm shadow-lg">
            <div className="p-6">
              <div className="text-gray-300 leading-relaxed text-sm">
                {analysisContent.content}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent"></div>
          </div>
        </div>
      )}

      {/* Analysis Metrics - Only show if backend provides them */}
      {realMetrics.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <Activity size={18} className="text-cyan-400" />
            Analysis Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {realMetrics.map((metric, index) => (
              <div key={index} className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm shadow-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <metric.icon size={16} className={metric.color} />
                  <span className="text-xs text-gray-500">{metric.label}</span>
                </div>
                <div className={`text-lg font-bold ${metric.color} mb-1`}>
                  {metric.value}
                </div>
                <div className="text-xs text-gray-600">
                  {metric.description}
                </div>
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${
                  metric.color.includes('blue') ? 'bg-blue-400/40' :
                  metric.color.includes('green') ? 'bg-green-400/40' :
                  metric.color.includes('purple') ? 'bg-purple-400/40' :
                  metric.color.includes('orange') ? 'bg-orange-400/40' :
                  'bg-gray-400/40'
                }`}></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Backend Verification - Only if tree_sitter provides meaningful verification data */}
      {(hasBackendData(result.tree_sitter_facts?.verified_cookbook_name) || 
        hasBackendData(result.tree_sitter_facts?.verified_version) || 
        result.tree_sitter_facts?.has_metadata === true) && (
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <Target size={18} className="text-emerald-400" />
            Code Verification
          </h3>
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm shadow-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {hasBackendData(result.tree_sitter_facts?.verified_cookbook_name) && (
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                  <div className="text-xs text-gray-500 mb-1">Verified Name</div>
                  <div className="text-gray-300 text-sm font-semibold">
                    {result.tree_sitter_facts?.verified_cookbook_name}
                  </div>
                </div>
              )}
              
              {hasBackendData(result.tree_sitter_facts?.verified_version) && (
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                  <div className="text-xs text-gray-500 mb-1">Verified Version</div>
                  <div className="text-gray-300 text-sm font-mono">
                    {result.tree_sitter_facts?.verified_version}
                  </div>
                </div>
              )}
              
              {result.tree_sitter_facts?.has_metadata === true && (
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                  <div className="text-xs text-gray-500 mb-1">Metadata Available</div>
                  <div className="text-sm font-semibold text-green-400">
                    Yes
                  </div>
                </div>
              )}
              
            </div>
          </div>
        </div>
      )}

      {/* Files Analyzed - Only if backend provides file list */}
      {result.metadata?.files_analyzed && result.metadata.files_analyzed.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <FileText size={18} className="text-blue-400" />
            Files Analyzed
            <span className="px-2 py-1 bg-blue-900/40 text-blue-300 text-xs rounded-full">
              {result.metadata.files_analyzed.length}
            </span>
          </h3>
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm shadow-lg p-4">
            <div className="grid grid-cols-1 gap-3">
              {result.metadata.files_analyzed.slice(0, 5).map((filename, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700/30">
                  <div className="p-1.5 bg-blue-500/20 rounded border border-blue-400/30">
                    <FileText size={12} className="text-blue-400" />
                  </div>
                  <code className="text-gray-300 font-mono text-sm flex-1">
                    {filename}
                  </code>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                </div>
              ))}
              {result.metadata.files_analyzed.length > 5 && (
                <div className="text-center py-2 text-xs text-gray-500 border-t border-gray-700/30">
                  + {result.metadata.files_analyzed.length - 5} more files analyzed
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Session Information - Only if backend provides session data */}
      {(result?.metadata?.correlation_id || result?.session_info?.correlation_id || result?.session_info?.session_id || result?.metadata?.analyzed_at) && (
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <Database size={18} className="text-gray-400" />
            Session Details
          </h3>
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm shadow-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {(result.metadata?.correlation_id || result.session_info?.correlation_id) && (
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                  <div className="text-xs text-gray-500 mb-1">Correlation ID</div>
                  <code className="text-gray-300 text-sm font-mono">
                    {result.metadata?.correlation_id || result.session_info?.correlation_id}
                  </code>
                </div>
              )}
              
              {result.session_info?.session_id && (
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                  <div className="text-xs text-gray-500 mb-1">Session ID</div>
                  <code className="text-gray-300 text-sm font-mono">
                    {result.session_info.session_id}
                  </code>
                </div>
              )}
              
              {result.metadata?.analyzed_at && (
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                  <div className="text-xs text-gray-500 mb-1">Analysis Time</div>
                  <div className="text-gray-300 text-sm">
                    {new Date(result.metadata.analyzed_at).toLocaleString()}
                  </div>
                </div>
              )}
              
              {result.metadata?.agent_name && (
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                  <div className="text-xs text-gray-500 mb-1">Analysis Agent</div>
                  <div className="text-gray-300 text-sm flex items-center gap-2">
                    {result.metadata.agent_icon && <span>{result.metadata.agent_icon}</span>}
                    {result.metadata.agent_name}
                  </div>
                </div>
              )}
              
              {result.metadata?.technology_type && (
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                  <div className="text-xs text-gray-500 mb-1">Technology</div>
                  <div className="text-gray-300 text-sm capitalize font-semibold">
                    {result.metadata.technology_type}
                  </div>
                </div>
              )}
              
            </div>
          </div>
        </div>
      )}

      {/* Graceful Fallback - Only if no meaningful data at all */}
      {!analysisContent && 
       realMetrics.length === 0 && 
       !result.metadata?.files_analyzed?.length && 
       !result.metadata?.correlation_id && (
        <div className="text-center py-12 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-xl border border-gray-700/50">
          <div className="p-4 bg-blue-500/20 rounded-full inline-flex mb-4">
            <FileText size={48} className="text-blue-400" />
          </div>
          <p className="text-gray-300 text-lg font-semibold mb-2">Analysis Completed</p>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Your code has been analyzed successfully. Check other tabs for detailed information.
          </p>
        </div>
      )}
      
    </div>
  );
};