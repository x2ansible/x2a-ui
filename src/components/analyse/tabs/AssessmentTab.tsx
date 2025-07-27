import React from 'react';
import { GitBranch, AlertTriangle, Shield, TrendingUp, Clock, CheckCircle, Target } from 'lucide-react';
import { BackendAnalysisResponse } from '../types/BackendTypes';
import { 
  getMigrationInfo, 
  getRiskInfo, 
  getBackendValue,
  getComplexityInfo  // ADDED: Import the complexity function
} from '../utils/backendUtils';

interface AssessmentTabProps {
  result: BackendAnalysisResponse;
}

export const AssessmentTab: React.FC<AssessmentTabProps> = ({ result }) => {
  const migrationInfo = getMigrationInfo(result);
  const riskInfo = getRiskInfo(result);
  const complexityInfo = getComplexityInfo(result);  // ADDED: Get complexity info
  const recommendations = result.recommendations;
  const anyResult = result as Record<string, unknown>;
  
  // Technology detection
  const isSalt = result.metadata?.technology_type === 'salt' || anyResult.managed_services || anyResult.object_type;
  const isAnsibleUpgrade = result.metadata?.technology_type === 'ansible-upgrade';
  const isPuppet = result.metadata?.technology_type === 'puppet' || result.object_type || result.puppet_resources;

  return (
    <div className="space-y-6">
      
      {/* Backend Recommendation - Only if recommendations exist */}
      {recommendations && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-400/30">
              <GitBranch size={18} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">
              {isSalt ? 'Salt State Assessment' : 
               isAnsibleUpgrade ? 'Upgrade Assessment' :
               isPuppet ? 'Puppet Conversion Assessment' :
               'Backend Recommendations'}
            </h3>
            {recommendations.migration_priority && (
              <div className={`px-2 py-1 rounded text-xs font-semibold ${
                recommendations.migration_priority === 'LOW' ? 'bg-green-900/40 text-green-300' :
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
                        Backend Analysis
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
                      ? 'Backend confirms this is convertible to Ansible' 
                      : 'Backend identified conversion challenges'}
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

      {/* Complexity Assessment - Only if tree_sitter or complexity_level exists */}
      {(result.tree_sitter_facts?.complexity_score !== undefined || result.complexity_level) && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-400/30">
              <TrendingUp size={18} className="text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">Complexity Analysis</h3>
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm shadow-lg">
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Tree-sitter Complexity Score */}
                {result.tree_sitter_facts?.complexity_score !== undefined && (
                  <div className="text-center bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-lg p-4 border border-purple-500/30">
                    <div className="text-2xl font-bold text-purple-400 mb-1">
                      {result.tree_sitter_facts.complexity_score}
                    </div>
                    <div className="text-xs text-gray-500">Static Analysis Score</div>
                    <div className={`text-xs mt-1 font-semibold ${
                      result.tree_sitter_facts.complexity_score > 15 ? 'text-red-400' :
                      result.tree_sitter_facts.complexity_score > 8 ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>
                      {result.tree_sitter_facts.complexity_score > 15 ? 'HIGH' :
                       result.tree_sitter_facts.complexity_score > 8 ? 'MEDIUM' : 'LOW'}
                    </div>
                  </div>
                )}
                
                {/* LLM Complexity Level - UPDATED to use getComplexityInfo */}
                {complexityInfo && (
                  <div className="text-center bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-lg p-4 border border-blue-500/30">
                    <div className={`text-lg font-bold mb-1 ${complexityInfo.color}`}>
                      {complexityInfo.display}
                    </div>
                    <div className="text-xs text-gray-500">
                      {complexityInfo.source === 'puppet' ? 'Puppet Assessment' :
                       complexityInfo.source === 'tree-sitter' ? 'Static Analysis' :
                       complexityInfo.source === 'llm' ? 'LLM Assessment' :
                       'Complexity Assessment'}
                    </div>
                  </div>
                )}
                
                {/* Resource Count */}
                {result.tree_sitter_facts?.total_resources !== undefined && (
                  <div className="text-center bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-lg p-4 border border-green-500/30">
                    <div className="text-2xl font-bold text-green-400 mb-1">
                      {result.tree_sitter_facts.total_resources}
                    </div>
                    <div className="text-xs text-gray-500">Resources Found</div>
                  </div>
                )}
                
              </div>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent"></div>
          </div>
        </div>
      )}

      {/* Safe Fallback - only if no assessment data at all */}
      {!recommendations && 
       !migrationInfo && 
       (result as Record<string, unknown>).convertible === undefined && 
       !result.tree_sitter_facts?.complexity_score && 
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