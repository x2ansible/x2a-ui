import React from 'react';
import { Clock, FileText, AlertTriangle, Database, Zap, CheckCircle, Target, Award, Activity } from 'lucide-react';
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

  // ENHANCED: Get analysis quality indicators
  const getQualityIndicators = () => {
    const indicators = [];
    
    // Syntax success rate
    if (result.tree_sitter_facts?.syntax_success_rate) {
      const rate = result.tree_sitter_facts.syntax_success_rate;
      const percentage = rate > 1 ? rate : rate * 100;
      indicators.push({
        label: 'Syntax Quality',
        value: percentage >= 95 ? 'EXCELLENT' : percentage >= 80 ? 'GOOD' : 'NEEDS REVIEW',
        color: percentage >= 95 ? 'text-green-400' : percentage >= 80 ? 'text-yellow-400' : 'text-red-400',
        percentage: percentage.toFixed(1) + '%'
      });
    }

    // Complexity assessment
    if (result.tree_sitter_facts?.complexity_score !== undefined) {
      const score = result.tree_sitter_facts.complexity_score;
      indicators.push({
        label: 'Code Complexity',
        value: score <= 5 ? 'SIMPLE' : score <= 15 ? 'MODERATE' : 'COMPLEX',
        color: score <= 5 ? 'text-green-400' : score <= 15 ? 'text-yellow-400' : 'text-red-400',
        score: score.toString()
      });
    }

    // Migration readiness
    if (result.convertible !== undefined) {
      indicators.push({
        label: 'Migration Ready',
        value: result.convertible ? 'YES' : 'NEEDS WORK',
        color: result.convertible ? 'text-green-400' : 'text-red-400',
        icon: result.convertible ? CheckCircle : AlertTriangle
      });
    }

    return indicators;
  };

  // ENHANCED: Get real metrics with better formatting
  const getRealMetrics = () => {
    const metrics = [];
    
    // Analysis timing - enhanced with performance indicator
    if (timing.ms > 0) {
      const performanceLevel = timing.ms < 10000 ? 'FAST' : timing.ms < 30000 ? 'NORMAL' : 'SLOW';
      const performanceColor = timing.ms < 10000 ? 'text-green-400' : timing.ms < 30000 ? 'text-blue-400' : 'text-yellow-400';
      
      metrics.push({
        label: 'Analysis Time',
        value: timing.display,
        icon: Clock,
        color: performanceColor,
        description: `${performanceLevel} performance`,
        badge: performanceLevel
      });
    }

    // Files analyzed - with processing rate
    if (result.metadata?.files_analyzed?.length) {
      const fileCount = result.metadata.files_analyzed.length;
      const processingRate = timing.ms > 0 ? (fileCount / (timing.ms / 1000)).toFixed(1) : '0';
      
      metrics.push({
        label: 'Files Processed',
        value: `${fileCount} file${fileCount > 1 ? 's' : ''}`,
        icon: FileText,
        color: 'text-green-400',
        description: `${processingRate} files/sec`,
        badge: fileCount > 5 ? 'BATCH' : 'SINGLE'
      });
    }

    // Code size - enhanced with readability indicator
    if (result.metadata?.total_code_size) {
      const size = result.metadata.total_code_size;
      const sizeDisplay = size > 1024 ? `${(size / 1024).toFixed(1)}KB` : `${size} chars`;
      const sizeCategory = size > 10000 ? 'LARGE' : size > 5000 ? 'MEDIUM' : 'SMALL';
      const sizeColor = size > 10000 ? 'text-orange-400' : size > 5000 ? 'text-purple-400' : 'text-blue-400';
      
      metrics.push({
        label: 'Code Analyzed',
        value: sizeDisplay,
        icon: Database,
        color: sizeColor,
        description: `${sizeCategory} codebase`,
        badge: sizeCategory
      });
    }

    // Resources found - enhanced with density indicator
    if (result.tree_sitter_facts?.total_resources) {
      const resources = result.tree_sitter_facts.total_resources;
      const codeSize = result.metadata?.total_code_size || 1;
      const density = (resources / (codeSize / 1000)).toFixed(2); // resources per KB
      
      metrics.push({
        label: 'Resources Found',
        value: resources.toString(),
        icon: Zap,
        color: 'text-orange-400',
        description: `${density} per KB`,
        badge: resources > 10 ? 'RICH' : resources > 5 ? 'MODERATE' : 'LEAN'
      });
    }

    return metrics;
  };

  // ENHANCED: Get technology insights
  const getTechnologyInsights = () => {
    const insights = [];
    
    // Wrapper detection
    if (result.dependencies?.is_wrapper !== undefined) {
      insights.push({
        type: result.dependencies.is_wrapper ? 'Wrapper Cookbook' : 'Direct Implementation',
        description: result.dependencies.is_wrapper 
          ? 'Uses wrapper pattern - may have dependencies'
          : 'Direct implementation - self-contained',
        color: result.dependencies.is_wrapper ? 'text-yellow-400' : 'text-green-400',
        icon: result.dependencies.is_wrapper ? '📦' : '📄'
      });
    }

    // Reusability level
    if (result.functionality?.reusability) {
      insights.push({
        type: `${result.functionality.reusability} Reusability`,
        description: result.functionality.reusability === 'HIGH' 
          ? 'Highly reusable across environments'
          : result.functionality.reusability === 'MEDIUM'
          ? 'Moderately reusable with some customization'
          : 'Limited reusability - specific use case',
        color: result.functionality.reusability === 'HIGH' ? 'text-green-400' : 
               result.functionality.reusability === 'MEDIUM' ? 'text-yellow-400' : 'text-red-400',
        icon: result.functionality.reusability === 'HIGH' ? '🔄' : 
              result.functionality.reusability === 'MEDIUM' ? '🔧' : '🎯'
      });
    }

    return insights;
  };

  const realMetrics = getRealMetrics();
  const qualityIndicators = getQualityIndicators();
  const technologyInsights = getTechnologyInsights();

  return (
    <div className="space-y-6">
      
      {/* ENHANCED: Analysis Content with better styling */}
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
              <span className="text-xs text-green-400 font-medium">ANALYZED</span>
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

      {/* ENHANCED: Quality Indicators */}
      {qualityIndicators.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <Award size={18} className="text-purple-400" />
            Quality Assessment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {qualityIndicators.map((indicator, index) => (
              <div key={index} className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm shadow-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  {indicator.icon && <indicator.icon size={16} className={indicator.color} />}
                  <span className="text-xs text-gray-500">{indicator.label}</span>
                </div>
                <div className={`text-lg font-bold ${indicator.color} mb-1`}>
                  {indicator.value}
                </div>
                <div className="text-xs text-gray-600">
                  {indicator.percentage || indicator.score || 'Assessed'}
                </div>
                <div className={`absolute top-0 right-0 w-1 h-full ${
                  indicator.color.includes('green') ? 'bg-green-400/40' :
                  indicator.color.includes('yellow') ? 'bg-yellow-400/40' :
                  'bg-red-400/40'
                }`}></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ENHANCED: Analysis Metrics with performance indicators */}
      {realMetrics.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <Activity size={18} className="text-cyan-400" />
            Analysis Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {realMetrics.map((metric, index) => (
              <div key={index} className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm shadow-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <metric.icon size={16} className={metric.color} />
                    <span className="text-xs text-gray-500">{metric.label}</span>
                  </div>
                  {metric.badge && (
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      metric.badge === 'FAST' || metric.badge === 'SINGLE' || metric.badge === 'SMALL' || metric.badge === 'LEAN' 
                        ? 'bg-green-900/40 text-green-300'
                        : metric.badge === 'NORMAL' || metric.badge === 'BATCH' || metric.badge === 'MEDIUM' || metric.badge === 'MODERATE'
                        ? 'bg-blue-900/40 text-blue-300' 
                        : 'bg-orange-900/40 text-orange-300'
                    }`}>
                      {metric.badge}
                    </span>
                  )}
                </div>
                <div className={`text-lg font-bold ${metric.color} mb-1`}>
                  {metric.value}
                </div>
                <div className="text-xs text-gray-600">
                  {metric.description}
                </div>
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${
                  metric.color.includes('green') ? 'bg-green-400/40' :
                  metric.color.includes('blue') ? 'bg-blue-400/40' :
                  metric.color.includes('purple') ? 'bg-purple-400/40' :
                  metric.color.includes('orange') ? 'bg-orange-400/40' :
                  'bg-yellow-400/40'
                }`}></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ENHANCED: Technology Insights */}
      {technologyInsights.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <Target size={18} className="text-emerald-400" />
            Technology Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {technologyInsights.map((insight, index) => (
              <div key={index} className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm shadow-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{insight.icon}</div>
                  <div className="flex-1">
                    <div className={`font-semibold ${insight.color} mb-1`}>
                      {insight.type}
                    </div>
                    <div className="text-sm text-gray-400 leading-relaxed">
                      {insight.description}
                    </div>
                  </div>
                </div>
                <div className={`absolute top-0 right-0 w-1 h-full ${
                  insight.color.includes('green') ? 'bg-green-400/40' :
                  insight.color.includes('yellow') ? 'bg-yellow-400/40' :
                  'bg-red-400/40'
                }`}></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ENHANCED: Files Analyzed with better presentation */}
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

      {/* ENHANCED: Session Information */}
      {(result?.metadata?.correlation_id || result?.session_info?.session_id || result?.metadata?.analyzed_at) && (
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <Database size={18} className="text-gray-400" />
            Session Details
          </h3>
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm shadow-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {result.metadata?.correlation_id && (
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                  <div className="text-xs text-gray-500 mb-1">Correlation ID</div>
                  <code className="text-gray-300 text-sm font-mono">
                    {result.metadata.correlation_id}
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

      {/* ENHANCED: Graceful Fallback */}
      {!analysisContent && realMetrics.length === 0 && !result.metadata?.files_analyzed?.length && (
        <div className="text-center py-12 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-xl border border-gray-700/50">
          <div className="p-4 bg-blue-500/20 rounded-full inline-flex mb-4">
            <CheckCircle size={48} className="text-blue-400" />
          </div>
          <p className="text-gray-300 text-lg font-semibold mb-2">Analysis Completed Successfully</p>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Your code has been analyzed and is ready for the next step in the conversion process.
          </p>
          <div className="mt-4 text-xs text-gray-600">
            Proceed to Assessment or Technical Details for more information
          </div>
        </div>
      )}
      
    </div>
  );
};