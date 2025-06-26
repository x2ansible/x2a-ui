import React from 'react';
import { GitBranch, AlertTriangle, Shield, TrendingUp, Clock } from 'lucide-react';
import { BackendAnalysisResponse } from '../types/BackendTypes';
import { 
  getMigrationInfo, 
  getRiskInfo, 
  hasBackendData,
  getBackendValue 
} from '../utils/backendUtils';

interface AssessmentTabProps {
  result: BackendAnalysisResponse;
}

// Utility function to render structured recommendations
function renderRecommendationDetails(rec: any) {
  if (typeof rec !== "object" || rec === null) return null;
  return (
    <div>
      <div className="mb-1"><b>Upgrade Priority:</b> {rec.upgrade_priority}</div>
      <div className="mb-1"><b>Upgrade Approach:</b> {rec.upgrade_approach}</div>
      <div className="mb-1"><b>Key Considerations:</b>
        <ul className="list-disc ml-5">
          {Array.isArray(rec.key_considerations)
            ? rec.key_considerations.map((item: any, idx: number) => (
                <li key={idx}>{item}</li>
              ))
            : rec.key_considerations ? <li>{rec.key_considerations}</li> : null}
        </ul>
      </div>
      <div className="mb-1"><b>Ansible Equivalent Approach:</b> {rec.ansible_equivalent_approach}</div>
    </div>
  );
}

export const AssessmentTab: React.FC<AssessmentTabProps> = ({ result }) => {
  const migrationInfo = getMigrationInfo(result);
  const riskInfo = getRiskInfo(result);
  const recommendations = result.recommendations;
  const anyResult = result as any;
  
  // SALT-SPECIFIC: Check if this is a Salt analysis
  const isSalt = result.metadata?.technology_type === 'salt' || anyResult.managed_services || anyResult.object_type;
  
  // SAFE: Extract recommendation action and rationale (handles both object and string)
  const getRecommendationInfo = () => {
    if (!recommendations) {
      // For Salt, infer recommendation from analysis
      if (isSalt && anyResult.complexity_level) {
        const complexity = anyResult.complexity_level.toLowerCase();
        const action = complexity === 'low' ? 'REUSE' : 
                     complexity === 'medium' ? 'EXTEND' : 'REPLACE';
        return {
          action,
          rationale: anyResult.detailed_analysis || 
                    `Salt state with ${complexity} complexity - ${action.toLowerCase()} recommended`
        };
      }
      return null;
    }
    
    if (typeof recommendations === 'string') {
      return {
        action: 'ANALYZE',
        rationale: recommendations
      };
    }
    
    if (typeof recommendations === 'object') {
      return {
        action: recommendations.consolidation_action || 'ANALYZE',
        rationale: getBackendValue(recommendations.rationale || recommendations.description || recommendations)
      };
    }
    
    return null;
  };
  
  // SALT-SPECIFIC: Get complexity assessment from Salt response
  const getSaltComplexityInfo = () => {
    if (!isSalt || !anyResult.complexity_level) return null;
    
    const level = anyResult.complexity_level.toUpperCase();
    const color = level === 'HIGH' ? 'text-red-400' :
                 level === 'MEDIUM' ? 'text-yellow-400' : 'text-green-400';
    
    return { level, color, display: anyResult.complexity_level };
  };
  
  // SALT-SPECIFIC: Assess convertibility based on Salt response
  const getSaltConvertibility = () => {
    if (!isSalt) return null;
    
    // Salt states with ansible_equivalent are highly convertible
    if (anyResult.ansible_equivalent) {
      return {
        convertible: true,
        notes: "Salt state has direct Ansible equivalent generated. Conversion is straightforward."
      };
    }
    
    // Simple states are usually convertible
    if (anyResult.complexity_level === 'Low') {
      return {
        convertible: true,
        notes: "Low complexity Salt state - good candidate for Ansible conversion."
      };
    }
    
    return {
      convertible: true,
      notes: "Salt state appears convertible to Ansible with some effort."
    };
  };
  
  const recommendationInfo = getRecommendationInfo();
  const saltComplexity = getSaltComplexityInfo();
  const saltConvertibility = getSaltConvertibility();
  
  return (
    <div className="space-y-6">
      
      {/* Agent Recommendation - Enhanced for Salt */}
      {recommendationInfo?.action && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-400/30">
              <GitBranch size={18} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">
              {isSalt ? 'Salt State Assessment' : 'Recommended Action'}
            </h3>
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gray-800/30 backdrop-blur-sm shadow-lg">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
              recommendationInfo.action === 'REUSE' ? 'bg-green-500' :
              recommendationInfo.action === 'EXTEND' ? 'bg-blue-500' :
              recommendationInfo.action === 'REPLACE' ? 'bg-red-500' :
              'bg-gray-500'
            }`}></div>
            
            <div className="p-4 pl-6">
              <div className="text-xl font-bold mb-3 text-gray-200 flex items-center gap-2">
                {isSalt && <span>🧂</span>}
                {recommendationInfo.action}
              </div>
              {/* Render recommendations pretty if object, else string fallback */}
              {typeof recommendations === "object"
                ? renderRecommendationDetails(recommendations)
                : (recommendationInfo.rationale && (
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {recommendationInfo.rationale}
                    </p>
                  ))
              }
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>
          </div>
        </div>
      )}
      
      {/* Salt Complexity Assessment - New section for Salt */}
      {saltComplexity && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-400/30">
              <TrendingUp size={18} className="text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">Complexity Assessment</h3>
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gray-800/30 backdrop-blur-sm shadow-lg">
            <div className="p-4">
              <div className="flex items-center gap-4">
                <div className={`inline-flex items-center gap-2 px-4 py-3 rounded-lg font-semibold border ${
                  saltComplexity.level === 'HIGH' ? 'bg-red-900/30 text-red-400 border-red-500/30' :
                  saltComplexity.level === 'MEDIUM' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30' :
                  'bg-green-900/30 text-green-400 border-green-500/30'
                }`}>
                  <span>{saltComplexity.level === 'HIGH' ? '🔴' : saltComplexity.level === 'MEDIUM' ? '🟡' : '🟢'}</span>
                  <span>{saltComplexity.display} Complexity</span>
                </div>
                
                <div className="text-sm text-gray-400">
                  {saltComplexity.level === 'LOW' ? 'Simple state structure' :
                   saltComplexity.level === 'MEDIUM' ? 'Moderate complexity' :
                   'Complex state with dependencies'}
                </div>
              </div>
            </div>
            
            <div className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r ${
              saltComplexity.level === 'HIGH' ? 'from-transparent via-red-400/30 to-transparent' :
              saltComplexity.level === 'MEDIUM' ? 'from-transparent via-yellow-400/30 to-transparent' :
              'from-transparent via-green-400/30 to-transparent'
            }`}></div>
          </div>
        </div>
      )}
      
      {/* Migration Assessment - Glass Enhancement */}
      {migrationInfo && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-500/20 rounded-lg border border-orange-400/30">
              <TrendingUp size={18} className="text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">Migration Assessment</h3>
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gray-800/30 backdrop-blur-sm shadow-lg">
            <div className="p-4">
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
              
              {/* SAFE: Migration Priority */}
              {typeof recommendations === 'object' && recommendations?.migration_priority && (
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
            
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-400/30 to-transparent"></div>
          </div>
        </div>
      )}
      
      {/* Risk Assessment - Glass Enhancement */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-500/20 rounded-lg border border-red-400/30">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-200">Risk Assessment</h3>
        </div>
        
        <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gray-800/30 backdrop-blur-sm shadow-lg">
          <div className="p-4">
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
                <p className="text-green-400 text-sm font-medium">
                  {isSalt ? 'Salt state appears well-structured' : 'No significant risk factors identified'}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  {isSalt ? 'Good candidate for Ansible conversion' : 'This configuration appears suitable for migration'}
                </p>
              </div>
            )}
          </div>
          
          <div className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r ${
            riskInfo.level === 'HIGH' ? 'from-transparent via-red-400/30 to-transparent' :
            riskInfo.level === 'MEDIUM' ? 'from-transparent via-yellow-400/30 to-transparent' :
            'from-transparent via-green-400/30 to-transparent'
          }`}></div>
        </div>
      </div>
      
      {/* Convertible Status - Enhanced with Salt support */}
      {(hasBackendData(result.convertible) || saltConvertibility) && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-cyan-500/20 rounded-lg border border-cyan-400/30">
              <Shield size={18} className="text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">
              {isSalt ? 'Ansible Conversion Assessment' : 'Conversion Assessment'}
            </h3>
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gray-800/30 backdrop-blur-sm shadow-lg">
            <div className="p-4">
              {(() => {
                const convertible = saltConvertibility?.convertible ?? result.convertible;
                const notes = saltConvertibility?.notes ?? result.conversion_notes;
                
                return (
                  <>
                    <div className={`inline-flex items-center gap-2 px-4 py-3 rounded-lg font-semibold ${
                      convertible === true 
                        ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                        : 'bg-red-900/30 text-red-400 border border-red-500/30'
                    }`}>
                      {convertible === true ? (
                        <>
                          <Shield size={16} />
                          <span>{isSalt ? 'ANSIBLE CONVERTIBLE' : 'CONVERTIBLE'}</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={16} />
                          <span>CONVERSION CHALLENGES</span>
                        </>
                      )}
                    </div>
                    
                    {notes && (
                      <div className="mt-3 p-3 bg-gray-900/50 rounded border border-gray-700/30">
                        <div className="text-sm text-gray-300 leading-relaxed">
                          {getBackendValue(notes)}
                        </div>
                      </div>
                    )}
                    
                    {/* Show Ansible equivalent info for Salt */}
                    {isSalt && anyResult.ansible_equivalent && (
                      <div className="mt-3 p-3 bg-blue-900/20 rounded border border-blue-500/30">
                        <div className="text-sm text-blue-300 font-medium mb-2 flex items-center gap-2">
                          <span>📜</span>
                          Ansible Equivalent Available
                        </div>
                        <div className="text-xs text-blue-200">
                          Direct Ansible playbook generated - conversion is straightforward
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      
      {/* Tree-sitter Analysis Details - Glass Enhancement */}
      {result.tree_sitter_facts && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-400/30">
              <GitBranch size={18} className="text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">Analysis Details</h3>
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gray-800/30 backdrop-blur-sm shadow-lg">
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                
                {result.tree_sitter_facts.complexity_score !== undefined && (
                  <div className="p-3 bg-gray-900/40 rounded-lg border border-gray-700/30">
                    <div className="text-2xl font-bold text-blue-400">
                      {result.tree_sitter_facts.complexity_score}
                    </div>
                    <div className="text-xs text-gray-500">Complexity Score</div>
                  </div>
                )}
                
                {result.tree_sitter_facts.syntax_success_rate !== undefined && (
                  <div className="p-3 bg-gray-900/40 rounded-lg border border-gray-700/30">
                    <div className="text-2xl font-bold text-green-400">
                      {(() => {
                        const rate = result.tree_sitter_facts.syntax_success_rate;
                        // Handle both decimal (0.0-1.0) and percentage (0-100) formats
                        const percentage = rate > 1 ? rate : rate * 100;
                        return percentage > 100 ? '100%' : `${percentage.toFixed(1)}%`;
                      })()}
                    </div>
                    <div className="text-xs text-gray-500">Syntax Success</div>
                  </div>
                )}
                
                {result.tree_sitter_facts.total_resources !== undefined && (
                  <div className="p-3 bg-gray-900/40 rounded-lg border border-gray-700/30">
                    <div className="text-2xl font-bold text-purple-400">
                      {result.tree_sitter_facts.total_resources}
                    </div>
                    <div className="text-xs text-gray-500">Total Resources</div>
                  </div>
                )}
                
                {result.tree_sitter_facts.is_wrapper !== undefined && (
                  <div className="p-3 bg-gray-900/40 rounded-lg border border-gray-700/30">
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
            
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent"></div>
          </div>
        </div>
      )}
      
      {/* No Assessment Data - Enhanced fallback */}
      {!recommendationInfo?.action && 
       !migrationInfo && 
       riskInfo.factors.length === 0 && 
       !hasBackendData(result.convertible) && 
       !saltConvertibility &&
       !saltComplexity && (
        <div className="text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <AlertTriangle size={48} className="mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">No assessment information available</p>
          <p className="text-sm text-gray-500 mt-1">
            {isSalt ? 'Salt analysis completed but assessment data is limited' : 
             'Backend analysis did not provide recommendations or risk assessment'}
          </p>
        </div>
      )}
      
    </div>
  );
};
