import React from 'react';
import { GitBranch, AlertTriangle, Shield, Clock, CheckCircle, Target, Settings } from 'lucide-react';
import { BackendAnalysisResponse } from '../types/BackendTypes';
import { 
  getMigrationInfo, 
  getRiskInfo, 
  getBackendValue
} from '../utils/backendUtils';

interface AssessmentTabProps {
  result: BackendAnalysisResponse;
}

export const AssessmentTab: React.FC<AssessmentTabProps> = ({ result }) => {
  const migrationInfo = getMigrationInfo(result);
  const riskInfo = getRiskInfo(result);
  const recommendations = result.recommendations;

  return (
    <div className="space-y-6">
      
      {/* Chef Cookbook Identity - Only if meaningful Chef-specific data exists */}
      {((result.cookbook_name && !result.cookbook_name.includes('stream_cookbook_')) || 
       (result.pattern_analyzer_facts?.extracted_cookbook_name && 
        !result.pattern_analyzer_facts.extracted_cookbook_name.includes('stream_cookbook_')) ||
       (result.pattern_analyzer_facts?.extracted_version && 
        result.pattern_analyzer_facts.extracted_version !== 'unknown') ||
       result.confidence_source || 
       result.analysis_method) && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-400/30">
              <Shield size={18} className="text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">Chef Cookbook Identity</h3>
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm shadow-lg">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Extracted Cookbook Name */}
                {((result.cookbook_name && !result.cookbook_name.includes('stream_cookbook_')) || 
                  (result.pattern_analyzer_facts?.extracted_cookbook_name && 
                   !result.pattern_analyzer_facts.extracted_cookbook_name.includes('stream_cookbook_'))) && (
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                    <div className="text-sm text-gray-500 mb-1">Cookbook Name</div>
                    <div className="text-lg font-mono text-emerald-400">
                      {result.cookbook_name || result.pattern_analyzer_facts?.extracted_cookbook_name}
                    </div>
                  </div>
                )}
                
                {/* Extracted Version */}
                {result.pattern_analyzer_facts?.extracted_version && 
                 result.pattern_analyzer_facts.extracted_version !== 'unknown' && (
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                    <div className="text-sm text-gray-500 mb-1">Extracted Version</div>
                    <div className="text-lg font-mono text-blue-400">
                      {result.pattern_analyzer_facts.extracted_version}
                    </div>
                  </div>
                )}
                
                {/* Analysis Method */}
                {result.analysis_method && (
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                    <div className="text-sm text-gray-500 mb-1">Analysis Method</div>
                    <div className="text-sm text-gray-300">
                      {result.analysis_method}
                    </div>
                  </div>
                )}
                
                {/* Confidence Source */}
                {result.confidence_source && (
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                    <div className="text-sm text-gray-500 mb-1">Confidence Source</div>
                    <div className="text-sm text-gray-300">
                      {result.confidence_source}
                    </div>
                  </div>
                )}
                
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent"></div>
          </div>
        </div>
      )}

      {/* Chef Configuration Assessment - Only if configuration_details exists */}
      {result.configuration_details && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-400/30">
              <Settings size={18} className="text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">Chef Configuration Assessment</h3>
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm shadow-lg">
            <div className="p-6">
              <div className="bg-gray-900/50 rounded border border-gray-700/30 p-4">
                <div className="text-sm text-gray-500 mb-2">Configuration Details</div>
                <div className="text-gray-300 leading-relaxed text-sm">
                  {result.configuration_details}
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent"></div>
          </div>
        </div>
            )}

      {/* Chef Analysis Details - Only if pattern_analyzer_facts exist */}
      {result.pattern_analyzer_facts && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-400/30">
              <Target size={18} className="text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">Chef Analysis Details</h3>
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm shadow-lg">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Extraction Method */}
                {result.pattern_analyzer_facts.extraction_method && (
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                    <div className="text-sm text-gray-500 mb-1">Extraction Method</div>
                    <div className="text-sm text-gray-300">
                      {result.pattern_analyzer_facts.extraction_method}
                    </div>
                  </div>
                )}
                
                {/* AST Available */}
                {result.pattern_analyzer_facts.ast_available !== undefined && (
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                    <div className="text-sm text-gray-500 mb-1">AST Available</div>
                    <div className={`text-sm font-semibold ${
                      result.pattern_analyzer_facts.ast_available ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {result.pattern_analyzer_facts.ast_available ? 'Yes' : 'No'}
                    </div>
                  </div>
                )}
                
                {/* Pattern Fallback Used */}
                {result.pattern_analyzer_facts.pattern_fallback_used !== undefined && (
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                    <div className="text-sm text-gray-500 mb-1">Pattern Fallback</div>
                    <div className={`text-sm font-semibold ${
                      result.pattern_analyzer_facts.pattern_fallback_used ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {result.pattern_analyzer_facts.pattern_fallback_used ? 'Used' : 'Not Used'}
                    </div>
                  </div>
                )}
                
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent"></div>
          </div>
        </div>
      )}

      {/* Backend Recommendation - Only if meaningful recommendations exist */}
      {recommendations && (
        recommendations.consolidation_action || 
        recommendations.rationale || 
        (recommendations.migration_priority && recommendations.migration_priority !== 'LOW') ||
        (recommendations.risk_factors && recommendations.risk_factors.length > 0)
      ) && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-400/30">
              <GitBranch size={18} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">
              Chef Analysis Assessment
            </h3>
            {recommendations.migration_priority && recommendations.migration_priority !== 'LOW' && (
              <div className={`px-2 py-1 rounded text-xs font-semibold ${
                recommendations.migration_priority === 'MEDIUM' ? 'bg-yellow-900/40 text-yellow-300' :
                'bg-red-900/40 text-red-300'
              }`}>
                {recommendations.migration_priority} PRIORITY
              </div>
            )}
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm shadow-lg">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
              recommendations.consolidation_action === 'REUSE' ? 'bg-gradient-to-b from-green-400 to-green-600' :
              recommendations.consolidation_action === 'EXTEND' ? 'bg-gradient-to-b from-blue-400 to-blue-600' :
              recommendations.consolidation_action === 'REPLACE' ? 'bg-gradient-to-b from-red-400 to-red-600' :
              'bg-gradient-to-b from-gray-400 to-gray-600'
            }`}></div>
            
            <div className="p-6 pl-8">
              {/* Action Badge - only if consolidation_action exists */}
              {recommendations.consolidation_action && (
                <div className="flex items-center gap-3 mb-4">
                  <div className={`px-4 py-2 rounded-full font-bold text-sm border-2 ${
                    recommendations.consolidation_action === 'REUSE' ? 'bg-green-500/20 text-green-300 border-green-400/40' :
                    recommendations.consolidation_action === 'EXTEND' ? 'bg-blue-500/20 text-blue-300 border-blue-400/40' :
                    recommendations.consolidation_action === 'REPLACE' ? 'bg-red-500/20 text-red-300 border-red-400/40' :
                    'bg-gray-500/20 text-gray-300 border-gray-400/40'
                  }`}>
                    <span className="mr-2">
                      {recommendations.consolidation_action === 'REUSE' ? '' :
                       recommendations.consolidation_action === 'EXTEND' ? '🔧' :
                       recommendations.consolidation_action === 'REPLACE' ? '🔄' : ''}
                    </span>
                    {recommendations.consolidation_action} RECOMMENDED
                  </div>
                </div>
              )}

              {/* Rationale - only if provided by backend */}
              {recommendations.rationale && (
                <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/30 rounded-lg p-4 border border-slate-600/30 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-400/30 flex-shrink-0 mt-1">
                      <Target size={16} className="text-blue-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-200 mb-2">
                        Analysis Summary
                      </div>
                      <div className="text-gray-300 leading-relaxed text-sm">
                        {getBackendValue(recommendations.rationale)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Risk factors - only if provided by backend */}
              {riskInfo.factors.length > 0 && (
                <div className="bg-gradient-to-r from-red-900/20 to-red-800/10 rounded-lg p-4 border border-red-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={16} className="text-red-400" />
                    <span className="font-semibold text-red-300">Backend Risk Factors</span>
                    <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full">
                      {riskInfo.factors.length}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {riskInfo.factors.map((factor, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-red-200">
                        <span className="text-red-400 flex-shrink-0 mt-1">•</span>
                        <span>{getBackendValue(factor)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>
          </div>
        </div>
      )}
      
      {/* Migration Information - Only if version_requirements exist */}
      {migrationInfo && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-500/20 rounded-lg border border-orange-400/30">
              <Clock size={18} className="text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">Migration Information</h3>
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm shadow-lg">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                
                {/* Migration Effort - only if provided */}
                {migrationInfo.effort && (
                  <div className={`text-center rounded-lg p-4 border ${
                    migrationInfo.effort === 'HIGH' ? 'bg-red-900/20 border-red-500/30' :
                    migrationInfo.effort === 'MEDIUM' ? 'bg-yellow-900/20 border-yellow-500/30' :
                    'bg-green-900/20 border-green-500/30'
                  }`}>
                    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full font-bold text-sm ${
                      migrationInfo.effort === 'HIGH' ? 'bg-red-500/30 text-red-300' :
                      migrationInfo.effort === 'MEDIUM' ? 'bg-yellow-500/30 text-yellow-300' :
                      'bg-green-500/30 text-green-300'
                    }`}>
                      <Clock size={14} />
                      {migrationInfo.effort}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">Migration Effort</div>
                  </div>
                )}

                {/* Estimated Hours - only if provided */}
                {migrationInfo.hours && (
                  <div className="text-center bg-blue-900/20 border-blue-500/30 rounded-lg p-4 border">
                    <div className="text-2xl font-bold text-blue-400 mb-1">
                      {migrationInfo.hours}h
                    </div>
                    <div className="text-xs text-gray-500">Estimated Time</div>
                  </div>
                )}

                {/* Migration Timeline Visualization */}
                {migrationInfo.effort && (
                  <div className="text-center bg-purple-900/20 border-purple-500/30 rounded-lg p-4 border">
                    <div className="flex items-center justify-center mb-2">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <div className={`h-1 w-8 ${
                          migrationInfo.effort === 'LOW' ? 'bg-green-400' :
                          migrationInfo.effort === 'MEDIUM' ? 'bg-yellow-400' :
                          'bg-red-400'
                        }`}></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">Migration Path</div>
                  </div>
                )}

              </div>

              {/* Version Requirements - only if meaningful versions exist */}
              {result.version_requirements && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.version_requirements.min_chef_version && 
                   result.version_requirements.min_chef_version !== 'string' && (
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                      <div className="text-sm text-gray-500 mb-1">Minimum Chef Version</div>
                      <div className="text-lg font-mono text-orange-400">
                        {result.version_requirements.min_chef_version}
                      </div>
                    </div>
                  )}
                  
                  {result.version_requirements.min_ruby_version && 
                   result.version_requirements.min_ruby_version !== 'string' && (
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                      <div className="text-sm text-gray-500 mb-1">Minimum Ruby Version</div>
                      <div className="text-lg font-mono text-red-400">
                        {result.version_requirements.min_ruby_version}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Deprecated Features List - only if they exist */}
              {result.version_requirements?.deprecated_features && 
               result.version_requirements.deprecated_features.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-700/50">
                  <div className="text-sm text-gray-500 mb-2">Deprecated Features</div>
                  <div className="flex flex-wrap gap-2">
                    {result.version_requirements.deprecated_features.map((feature, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded border border-red-500/30">
                        <span>⚠️</span>
                        {getBackendValue(feature)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-400/30 to-transparent"></div>
          </div>
        </div>
      )}

      {/* Conversion Assessment - Only if convertible field exists */}
      {result.convertible !== undefined && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-cyan-500/20 rounded-lg border border-cyan-400/30">
              <Shield size={18} className="text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">Conversion Assessment</h3>
            <div className={`px-2 py-1 rounded-full text-xs font-bold ${
              result.convertible ? 'bg-green-500/30 text-green-300' : 'bg-red-500/30 text-red-300'
            }`}>
              {result.convertible ? 'CONVERTIBLE' : 'CONVERSION ISSUES'}
            </div>
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm shadow-lg">
            <div className="p-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${
                  result.convertible ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                }`}>
                  {result.convertible ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                </div>
                
                <div className="flex-1">
                  <div className="font-semibold text-gray-200 mb-2">
                    {result.convertible 
                      ? 'Conversion Status: Ready' 
                      : 'Conversion Status: Requires Review'}
                  </div>
                  
                  {typeof (result as Record<string, unknown>).conversion_notes === 'string' && 
                   (result as Record<string, unknown>).conversion_notes !== "No conversion notes are required for this cookbook." && (
                    <div className="bg-gray-900/50 rounded border border-gray-700/30 p-3 text-sm text-gray-300 leading-relaxed">
                      <div className="text-xs text-gray-500 mb-1">Backend Notes:</div>
                      <div className="text-gray-300">
                        {(result as Record<string, unknown>).conversion_notes as string}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Safe Fallback - only if no assessment data at all */}
      {!recommendations && 
       !migrationInfo && 
       (result as Record<string, unknown>).convertible === undefined && 
       !result.pattern_analyzer_facts?.complexity_score && 
       !result.complexity_level && (
        <div className="text-center py-12 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-xl border border-gray-700/50">
          <div className="p-4 bg-gray-700/20 rounded-full inline-flex mb-4">
            <AlertTriangle size={48} className="text-gray-500" />
          </div>
          <p className="text-gray-400 text-lg font-semibold mb-2">Assessment Data Not Available</p>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            No assessment information was provided by the backend analysis.
          </p>
        </div>
      )}
      
    </div>
  );
};