// components/analyse/tabs/AssessmentTab.tsx
import React from 'react';
import { GitBranch, AlertTriangle, Shield, TrendingUp, Clock } from 'lucide-react';
import { BackendAnalysisResponse } from '../types/BackendTypes';
import { getMigrationInfo, getRiskInfo, hasBackendData } from '../utils/backendUtils';

interface AssessmentTabProps {
  result: BackendAnalysisResponse;
}

export const AssessmentTab: React.FC<AssessmentTabProps> = ({ result }) => {
  const migrationInfo = getMigrationInfo(result);
  const riskInfo = getRiskInfo(result);
  const recommendations = result.recommendations;
  
  return (
    <div className="space-y-6">
      
      {/* Agent Recommendation */}
      {recommendations?.consolidation_action && (
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <GitBranch size={18} />
            Recommended Action
          </h3>
          
          <div className={`p-4 rounded-lg border-l-4 ${
            recommendations.consolidation_action === 'REUSE' ? 'bg-green-900/20 border-green-500' :
            recommendations.consolidation_action === 'EXTEND' ? 'bg-blue-900/20 border-blue-500' :
            recommendations.consolidation_action === 'REPLACE' ? 'bg-red-900/20 border-red-500' :
            'bg-gray-800/20 border-gray-500'
          }`}>
            <div className="text-xl font-bold mb-3 text-gray-200">
              {recommendations.consolidation_action}
            </div>
            {recommendations.rationale && (
              <p className="text-sm text-gray-300 leading-relaxed">
                {recommendations.rationale}
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Migration Assessment */}
      {migrationInfo && (
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <TrendingUp size={18} />
            Migration Assessment
          </h3>
          
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div>
                <div className="text-sm text-gray-500 mb-2">Migration Effort</div>
                <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-semibold ${
                  migrationInfo.effort === 'LOW' ? 'bg-green-900/30 text-green-400' :
                  migrationInfo.effort === 'HIGH' ? 'bg-red-900/30 text-red-400' :
                  'bg-yellow-900/30 text-yellow-400'
                }`}>
                  <TrendingUp size={16} />
                  {migrationInfo.display}
                </div>
              </div>
              
              {migrationInfo.hours && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">Estimated Time</div>
                  <div className="flex items-center gap-2 text-orange-400">
                    <Clock size={16} />
                    <span className="font-semibold">
                      {migrationInfo.hours < 1 
                        ? `${(migrationInfo.hours * 60).toFixed(0)} minutes`
                        : migrationInfo.hours < 24
                          ? `${migrationInfo.hours} hours`
                          : `${(migrationInfo.hours / 24).toFixed(1)} days`
                      }
                    </span>
                  </div>
                </div>
              )}
              
            </div>
            
            {recommendations?.migration_priority && (
              <div className="mt-4 pt-4 border-t border-gray-700/50">
                <div className="text-sm text-gray-500 mb-2">Migration Priority</div>
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                  recommendations.migration_priority === 'HIGH' ? 'bg-red-900/30 text-red-400' :
                  recommendations.migration_priority === 'MEDIUM' ? 'bg-yellow-900/30 text-yellow-400' :
                  'bg-blue-900/30 text-blue-400'
                }`}>
                  <Shield size={12} />
                  {recommendations.migration_priority} Priority
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Risk Assessment */}
      <div>
        <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <AlertTriangle size={18} />
          Risk Assessment
        </h3>
        
        <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
          <div className="flex items-center gap-3 mb-4">
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-semibold ${
              riskInfo.level === 'HIGH' ? 'bg-red-900/30 text-red-400' :
              riskInfo.level === 'MEDIUM' ? 'bg-yellow-900/30 text-yellow-400' :
              'bg-green-900/30 text-green-400'
            }`}>
              <AlertTriangle size={16} />
              {riskInfo.level} RISK
            </div>
            
            {riskInfo.factors.length > 0 && (
              <div className="text-sm text-gray-500">
                {riskInfo.factors.length} factor(s) identified
              </div>
            )}
          </div>
          
          {riskInfo.factors.length > 0 ? (
            <div className="space-y-2">
              {riskInfo.factors.map((factor, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-red-900/20 rounded-lg border border-red-500/30">
                  <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300 text-sm">{factor}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <Shield size={32} className="mx-auto mb-2 text-green-500" />
              <p className="text-green-400 text-sm font-medium">No significant risk factors identified</p>
              <p className="text-gray-500 text-xs mt-1">This configuration appears suitable for migration</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Convertible Status */}
      {hasBackendData(result.convertible) && (
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <Shield size={18} />
            Conversion Assessment
          </h3>
          
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
            <div className={`inline-flex items-center gap-2 px-4 py-3 rounded-lg font-semibold ${
              result.convertible === true 
                ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                : 'bg-red-900/30 text-red-400 border border-red-500/30'
            }`}>
              {result.convertible === true ? (
                <>
                  <Shield size={16} />
                  <span>CONVERTIBLE</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={16} />
                  <span>CONVERSION CHALLENGES</span>
                </>
              )}
            </div>
            
            {result.conversion_notes && (
              <div className="mt-3 p-3 bg-gray-900/50 rounded border border-gray-700/30">
                <div className="text-sm text-gray-300 leading-relaxed">
                  {result.conversion_notes}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Tree-sitter Analysis Details */}
      {result.tree_sitter_facts && (
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <GitBranch size={18} />
            Analysis Details
          </h3>
          
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              
              {result.tree_sitter_facts.complexity_score !== undefined && (
                <div>
                  <div className="text-2xl font-bold text-blue-400">
                    {result.tree_sitter_facts.complexity_score}
                  </div>
                  <div className="text-xs text-gray-500">Complexity Score</div>
                </div>
              )}
              
              {result.tree_sitter_facts.syntax_success_rate !== undefined && (
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    {(result.tree_sitter_facts.syntax_success_rate * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">Syntax Success</div>
                </div>
              )}
              
              {result.tree_sitter_facts.total_resources !== undefined && (
                <div>
                  <div className="text-2xl font-bold text-purple-400">
                    {result.tree_sitter_facts.total_resources}
                  </div>
                  <div className="text-xs text-gray-500">Total Resources</div>
                </div>
              )}
              
              {result.tree_sitter_facts.is_wrapper !== undefined && (
                <div>
                  <div className={`text-2xl font-bold ${
                    result.tree_sitter_facts.is_wrapper ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {result.tree_sitter_facts.is_wrapper ? 'YES' : 'NO'}
                  </div>
                  <div className="text-xs text-gray-500">Wrapper Cookbook</div>
                </div>
              )}
              
            </div>
          </div>
        </div>
      )}
      
      {/* No Assessment Data */}
      {!recommendations?.consolidation_action && 
       !migrationInfo && 
       riskInfo.factors.length === 0 && 
       !hasBackendData(result.convertible) && (
        <div className="text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <AlertTriangle size={48} className="mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">No assessment information available</p>
          <p className="text-sm text-gray-500 mt-1">
            Backend analysis did not provide recommendations or risk assessment
          </p>
        </div>
      )}
      
    </div>
  );
};