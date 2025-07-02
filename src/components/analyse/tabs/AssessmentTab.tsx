import React from 'react';
import { GitBranch, AlertTriangle, Shield, TrendingUp, Clock, CheckCircle, Target, Zap, Award } from 'lucide-react';
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

// ENHANCED: More intelligent recommendation rendering with visual improvements
function renderRecommendationDetails(rec: any) {
  if (typeof rec !== "object" || rec === null) return null;
  
  // Handle Chef/Standard format (current backend response) - ENHANCED STYLING
  if (rec.migration_priority || rec.rationale || rec.consolidation_action) {
    return (
      <div className="space-y-4">
        {/* Action Badge */}
        {rec.consolidation_action && (
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-full font-bold text-sm border-2 ${
              rec.consolidation_action === 'REUSE' ? 'bg-green-500/20 text-green-300 border-green-400/40' :
              rec.consolidation_action === 'EXTEND' ? 'bg-blue-500/20 text-blue-300 border-blue-400/40' :
              rec.consolidation_action === 'REPLACE' ? 'bg-red-500/20 text-red-300 border-red-400/40' :
              'bg-gray-500/20 text-gray-300 border-gray-400/40'
            }`}>
              <span className="mr-2">
                {rec.consolidation_action === 'REUSE' ? '✅' :
                 rec.consolidation_action === 'EXTEND' ? '🔧' :
                 rec.consolidation_action === 'REPLACE' ? '🔄' : '📋'}
              </span>
              {rec.consolidation_action} RECOMMENDED
            </div>
            
            {rec.migration_priority && (
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                rec.migration_priority === 'LOW' ? 'bg-green-900/40 text-green-300 border border-green-500/30' :
                rec.migration_priority === 'MEDIUM' ? 'bg-yellow-900/40 text-yellow-300 border border-yellow-500/30' :
                'bg-red-900/40 text-red-300 border border-red-500/30'
              }`}>
                {rec.migration_priority} PRIORITY
              </div>
            )}
          </div>
        )}

        {/* Rationale with enhanced typography */}
        {rec.rationale && (
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/30 rounded-lg p-4 border border-slate-600/30">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-400/30 flex-shrink-0 mt-1">
                <Target size={16} className="text-blue-400" />
              </div>
              <div>
                <div className="font-semibold text-gray-200 mb-2 flex items-center gap-2">
                  <span>Analysis Rationale</span>
                </div>
                <div className="text-gray-300 leading-relaxed text-sm">
                  {rec.rationale}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Risk factors with enhanced display */}
        {rec.risk_factors && rec.risk_factors.length > 0 && (
          <div className="bg-gradient-to-r from-red-900/20 to-red-800/10 rounded-lg p-4 border border-red-500/30">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-red-400" />
              <span className="font-semibold text-red-300">Risk Factors Identified</span>
              <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full">
                {rec.risk_factors.length}
              </span>
            </div>
            <ul className="space-y-2">
              {rec.risk_factors.map((factor: any, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-red-200">
                  <span className="text-red-400 flex-shrink-0 mt-1">•</span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
  
  // Handle Salt/Ansible Upgrade format (original structure) - ENHANCED
  if (rec.upgrade_priority || rec.upgrade_approach) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rec.upgrade_priority && (
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-600/30">
              <div className="text-xs text-gray-500 mb-1">Upgrade Priority</div>
              <div className="font-semibold text-gray-200">{rec.upgrade_priority}</div>
            </div>
          )}
          {rec.upgrade_approach && (
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-600/30">
              <div className="text-xs text-gray-500 mb-1">Approach</div>
              <div className="font-semibold text-gray-200">{rec.upgrade_approach}</div>
            </div>
          )}
        </div>
        
        {rec.key_considerations && (
          <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-500/30">
            <div className="font-semibold text-blue-300 mb-2">Key Considerations</div>
            <ul className="space-y-1">
              {Array.isArray(rec.key_considerations)
                ? rec.key_considerations.map((item: any, idx: number) => (
                    <li key={idx} className="text-sm text-blue-200 flex items-start gap-2">
                      <span className="text-blue-400 flex-shrink-0 mt-1">•</span>
                      {item}
                    </li>
                  ))
                : rec.key_considerations ? (
                    <li className="text-sm text-blue-200">{rec.key_considerations}</li>
                  ) : null}
            </ul>
          </div>
        )}
        
        {rec.ansible_equivalent_approach && (
          <div className="bg-green-900/20 rounded-lg p-3 border border-green-500/30">
            <div className="font-semibold text-green-300 mb-2">Ansible Equivalent Approach</div>
            <div className="text-sm text-green-200">{rec.ansible_equivalent_approach}</div>
          </div>
        )}
      </div>
    );
  }
  
  // Fallback: Enhanced simple rationale display
  if (rec.rationale) {
    return (
      <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/30 rounded-lg p-4 border border-slate-600/30">
        <div className="text-gray-300 leading-relaxed">
          {rec.rationale}
        </div>
      </div>
    );
  }
  
  return null;
}

export const AssessmentTab: React.FC<AssessmentTabProps> = ({ result }) => {
  const migrationInfo = getMigrationInfo(result);
  const riskInfo = getRiskInfo(result);
  const recommendations = result.recommendations;
  const anyResult = result as any;
  
  // Technology detection
  const isSalt = result.metadata?.technology_type === 'salt' || anyResult.managed_services || anyResult.object_type;
  const isChef = result.metadata?.technology_type === 'chef' || result.functionality || result.tree_sitter_facts;
  const isAnsibleUpgrade = result.metadata?.technology_type === 'ansible-upgrade';
  
  // ENHANCED: Get recommendation info with better action mapping
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
                    `Salt state with ${complexity} complexity - ${action.toLowerCase()} recommended`,
          confidence: complexity === 'low' ? 'HIGH' : 'MEDIUM'
        };
      }
      return null;
    }
    
    if (typeof recommendations === 'string') {
      return {
        action: 'ANALYZE',
        rationale: recommendations,
        confidence: 'MEDIUM'
      };
    }
    
    if (typeof recommendations === 'object') {
      return {
        action: recommendations.consolidation_action || 'ANALYZE',
        rationale: getBackendValue(recommendations.rationale || recommendations.description || recommendations),
        priority: recommendations.migration_priority || 'MEDIUM',
        confidence: recommendations.migration_priority === 'LOW' ? 'HIGH' : 'MEDIUM'
      };
    }
    
    return null;
  };
  
  // ENHANCED: Get complexity assessment with better visuals
  const getComplexityAssessment = () => {
    // Tree-sitter complexity (most reliable)
    if (result.tree_sitter_facts?.complexity_score !== undefined) {
      const score = result.tree_sitter_facts.complexity_score;
      const level = score > 15 ? 'HIGH' : score > 8 ? 'MEDIUM' : 'LOW';
      return {
        level,
        score,
        source: 'Static Analysis',
        description: `Complexity score: ${score}`,
        color: level === 'HIGH' ? 'red' : level === 'MEDIUM' ? 'yellow' : 'green'
      };
    }
    
    // LLM complexity
    if (result.complexity_level) {
      const level = result.complexity_level.toUpperCase();
      return {
        level,
        source: 'AI Analysis',
        description: `Assessed as ${result.complexity_level} complexity`,
        color: level === 'HIGH' ? 'red' : level === 'MEDIUM' ? 'yellow' : 'green'
      };
    }
    
    // Salt complexity
    if (isSalt && anyResult.complexity_level) {
      const level = anyResult.complexity_level.toUpperCase();
      return {
        level,
        source: 'Salt Analysis',
        description: `Salt state complexity: ${anyResult.complexity_level}`,
        color: level === 'HIGH' ? 'red' : level === 'MEDIUM' ? 'yellow' : 'green'
      };
    }
    
    return null;
  };
  
  // ENHANCED: Get conversion confidence
  const getConversionConfidence = () => {
    const convertible = result.convertible;
    const notes = result.conversion_notes;
    
    if (convertible === true) {
      return {
        level: 'HIGH',
        description: 'Highly convertible to Ansible',
        color: 'green',
        notes
      };
    } else if (convertible === false) {
      return {
        level: 'LOW',
        description: 'Conversion challenges identified',
        color: 'red',
        notes
      };
    }
    
    // Infer from other data
    if (migrationInfo?.effort === 'LOW') {
      return {
        level: 'HIGH',
        description: 'Low effort migration suggests good convertibility',
        color: 'green'
      };
    }
    
    return {
      level: 'MEDIUM',
      description: 'Conversion feasible with moderate effort',
      color: 'yellow'
    };
  };
  
  const recommendationInfo = getRecommendationInfo();
  const complexityAssessment = getComplexityAssessment();
  const conversionConfidence = getConversionConfidence();
  
  return (
    <div className="space-y-6">
      
      {/* ENHANCED: Assessment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Recommendation Card */}
        {recommendationInfo && (
          <div className={`relative overflow-hidden rounded-xl border backdrop-blur-sm shadow-lg p-4 ${
            recommendationInfo.action === 'REUSE' ? 'bg-green-900/20 border-green-500/30' :
            recommendationInfo.action === 'EXTEND' ? 'bg-blue-900/20 border-blue-500/30' :
            recommendationInfo.action === 'REPLACE' ? 'bg-red-900/20 border-red-500/30' :
            'bg-gray-800/30 border-gray-600/30'
          }`}>
            <div className="text-center">
              <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full font-bold text-sm mb-2 ${
                recommendationInfo.action === 'REUSE' ? 'bg-green-500/30 text-green-300' :
                recommendationInfo.action === 'EXTEND' ? 'bg-blue-500/30 text-blue-300' :
                recommendationInfo.action === 'REPLACE' ? 'bg-red-500/30 text-red-300' :
                'bg-gray-500/30 text-gray-300'
              }`}>
                <Award size={14} />
                {recommendationInfo.action}
              </div>
              <div className="text-xs text-gray-500">Recommended Action</div>
              {recommendationInfo.confidence && (
                <div className={`text-xs mt-1 ${
                  recommendationInfo.confidence === 'HIGH' ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {recommendationInfo.confidence} Confidence
                </div>
              )}
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${
              recommendationInfo.action === 'REUSE' ? 'bg-green-400/40' :
              recommendationInfo.action === 'EXTEND' ? 'bg-blue-400/40' :
              recommendationInfo.action === 'REPLACE' ? 'bg-red-400/40' :
              'bg-gray-400/40'
            }`}></div>
          </div>
        )}
        
        {/* Complexity Card */}
        {complexityAssessment && (
          <div className={`relative overflow-hidden rounded-xl border backdrop-blur-sm shadow-lg p-4 ${
            complexityAssessment.color === 'red' ? 'bg-red-900/20 border-red-500/30' :
            complexityAssessment.color === 'yellow' ? 'bg-yellow-900/20 border-yellow-500/30' :
            'bg-green-900/20 border-green-500/30'
          }`}>
            <div className="text-center">
              <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full font-bold text-sm mb-2 ${
                complexityAssessment.color === 'red' ? 'bg-red-500/30 text-red-300' :
                complexityAssessment.color === 'yellow' ? 'bg-yellow-500/30 text-yellow-300' :
                'bg-green-500/30 text-green-300'
              }`}>
                <TrendingUp size={14} />
                {complexityAssessment.level}
              </div>
              <div className="text-xs text-gray-500">Complexity</div>
              <div className="text-xs mt-1 text-gray-400">
                {complexityAssessment.source}
              </div>
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${
              complexityAssessment.color === 'red' ? 'bg-red-400/40' :
              complexityAssessment.color === 'yellow' ? 'bg-yellow-400/40' :
              'bg-green-400/40'
            }`}></div>
          </div>
        )}
        
        {/* Migration Effort Card */}
        {migrationInfo && (
          <div className={`relative overflow-hidden rounded-xl border backdrop-blur-sm shadow-lg p-4 ${
            migrationInfo.effort === 'HIGH' ? 'bg-red-900/20 border-red-500/30' :
            migrationInfo.effort === 'MEDIUM' ? 'bg-yellow-900/20 border-yellow-500/30' :
            'bg-green-900/20 border-green-500/30'
          }`}>
            <div className="text-center">
              <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full font-bold text-sm mb-2 ${
                migrationInfo.effort === 'HIGH' ? 'bg-red-500/30 text-red-300' :
                migrationInfo.effort === 'MEDIUM' ? 'bg-yellow-500/30 text-yellow-300' :
                'bg-green-500/30 text-green-300'
              }`}>
                <Clock size={14} />
                {migrationInfo.effort}
              </div>
              <div className="text-xs text-gray-500">Migration Effort</div>
              {migrationInfo.hours && (
                <div className="text-xs mt-1 text-gray-400">
                  ~{migrationInfo.hours} hours
                </div>
              )}
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${
              migrationInfo.effort === 'HIGH' ? 'bg-red-400/40' :
              migrationInfo.effort === 'MEDIUM' ? 'bg-yellow-400/40' :
              'bg-green-400/40'
            }`}></div>
          </div>
        )}
        
      </div>

      {/* ENHANCED: Detailed Recommendation Section */}
      {recommendationInfo?.action && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-400/30">
              <GitBranch size={18} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">
              {isSalt ? 'Salt State Assessment' : 
               isAnsibleUpgrade ? 'Upgrade Assessment' :
               'Recommended Strategy'}
            </h3>
            {recommendationInfo.priority && (
              <div className={`px-2 py-1 rounded text-xs font-semibold ${
                recommendationInfo.priority === 'LOW' ? 'bg-green-900/40 text-green-300' :
                recommendationInfo.priority === 'MEDIUM' ? 'bg-yellow-900/40 text-yellow-300' :
                'bg-red-900/40 text-red-300'
              }`}>
                {recommendationInfo.priority} PRIORITY
              </div>
            )}
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm shadow-lg">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
              recommendationInfo.action === 'REUSE' ? 'bg-gradient-to-b from-green-400 to-green-600' :
              recommendationInfo.action === 'EXTEND' ? 'bg-gradient-to-b from-blue-400 to-blue-600' :
              recommendationInfo.action === 'REPLACE' ? 'bg-gradient-to-b from-red-400 to-red-600' :
              'bg-gradient-to-b from-gray-400 to-gray-600'
            }`}></div>
            
            <div className="p-6 pl-8">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-lg ${
                  recommendationInfo.action === 'REUSE' ? 'bg-green-500/20 text-green-300' :
                  recommendationInfo.action === 'EXTEND' ? 'bg-blue-500/20 text-blue-300' :
                  recommendationInfo.action === 'REPLACE' ? 'bg-red-500/20 text-red-300' :
                  'bg-gray-500/20 text-gray-300'
                }`}>
                  {recommendationInfo.action === 'REUSE' ? <CheckCircle size={24} /> :
                   recommendationInfo.action === 'EXTEND' ? <Zap size={24} /> :
                   recommendationInfo.action === 'REPLACE' ? <GitBranch size={24} /> :
                   <Target size={24} />}
                </div>
                
                <div>
                  <div className="text-xl font-bold text-gray-200 flex items-center gap-2">
                    {isSalt && <span>🧂</span>}
                    {isChef && <span>🍳</span>}
                    {isAnsibleUpgrade && <span>📈</span>}
                    {recommendationInfo.action}
                  </div>
                  <div className="text-sm text-gray-400">
                    {recommendationInfo.action === 'REUSE' ? 'Keep existing implementation with minimal changes' :
                     recommendationInfo.action === 'EXTEND' ? 'Enhance current implementation' :
                     recommendationInfo.action === 'REPLACE' ? 'Complete rewrite recommended' :
                     'Further analysis needed'}
                  </div>
                </div>
              </div>
              
              {/* ENHANCED: Render recommendation details */}
              {renderRecommendationDetails(recommendations)}
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>
          </div>
        </div>
      )}
      
      {/* ENHANCED: Risk Assessment with better visuals */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-500/20 rounded-lg border border-red-400/30">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-200">Risk Assessment</h3>
          <div className={`px-2 py-1 rounded-full text-xs font-bold ${
            riskInfo.level === 'HIGH' ? 'bg-red-500/30 text-red-300' :
            riskInfo.level === 'MEDIUM' ? 'bg-yellow-500/30 text-yellow-300' :
            'bg-green-500/30 text-green-300'
          }`}>
            {riskInfo.level} RISK
          </div>
        </div>
        
        <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm shadow-lg">
          <div className="p-4">
            
            {riskInfo.factors.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${
                    riskInfo.level === 'HIGH' ? 'bg-red-500/20 text-red-300' :
                    riskInfo.level === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-green-500/20 text-green-300'
                  }`}>
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-200">
                      {riskInfo.factors.length} Risk Factor{riskInfo.factors.length > 1 ? 's' : ''} Identified
                    </div>
                    <div className="text-sm text-gray-400">
                      Review these items before proceeding with migration
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {riskInfo.factors.map((factor, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 bg-gradient-to-r from-red-900/20 to-red-800/10 rounded-lg border border-red-500/30">
                      <div className="p-1 bg-red-500/20 rounded border border-red-400/30 flex-shrink-0 mt-1">
                        <AlertTriangle size={12} className="text-red-400" />
                      </div>
                      <div className="flex-1">
                        <span className="text-gray-300 text-sm leading-relaxed">{factor}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="p-4 bg-green-500/20 rounded-full inline-flex mb-4">
                  <Shield size={32} className="text-green-400" />
                </div>
                <div className="space-y-2">
                  <p className="text-green-400 text-lg font-semibold">
                    {isSalt ? 'Salt state appears well-structured' : 
                     isChef ? 'Chef cookbook is low-risk' :
                     'No significant risk factors identified'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {isSalt ? 'Good candidate for Ansible conversion' : 
                     isChef ? 'This cookbook appears suitable for migration' :
                     'Configuration appears suitable for migration'}
                  </p>
                  <div className="flex justify-center gap-4 mt-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <CheckCircle size={12} className="text-green-400" />
                      Clean structure
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle size={12} className="text-green-400" />
                      No deprecated features
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle size={12} className="text-green-400" />
                      Standard patterns
                    </span>
                  </div>
                </div>
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
      
      {/* ENHANCED: Conversion Confidence */}
      {hasBackendData(result.convertible) && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-cyan-500/20 rounded-lg border border-cyan-400/30">
              <Shield size={18} className="text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">
              Conversion Assessment
            </h3>
            <div className={`px-2 py-1 rounded-full text-xs font-bold ${
              conversionConfidence.color === 'green' ? 'bg-green-500/30 text-green-300' :
              conversionConfidence.color === 'yellow' ? 'bg-yellow-500/30 text-yellow-300' :
              'bg-red-500/30 text-red-300'
            }`}>
              {conversionConfidence.level} CONFIDENCE
            </div>
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm shadow-lg">
            <div className="p-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${
                  conversionConfidence.color === 'green' ? 'bg-green-500/20 text-green-300' :
                  conversionConfidence.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-red-500/20 text-red-300'
                }`}>
                  {conversionConfidence.color === 'green' ? <CheckCircle size={24} /> :
                   conversionConfidence.color === 'yellow' ? <AlertTriangle size={24} /> :
                   <AlertTriangle size={24} />}
                </div>
                
                <div className="flex-1">
                  <div className="font-semibold text-gray-200 mb-2">
                    {conversionConfidence.description}
                  </div>
                  
                  {conversionConfidence.notes && (
                    <div className="bg-gray-900/50 rounded border border-gray-700/30 p-3 text-sm text-gray-300 leading-relaxed">
                      {getBackendValue(conversionConfidence.notes)}
                    </div>
                  )}
                  
                  {/* Conversion factors */}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {result.convertible === true && (
                      <>
                        <span className="flex items-center gap-1 px-2 py-1 bg-green-900/30 text-green-300 rounded border border-green-500/30">
                          <CheckCircle size={10} />
                          Ansible Compatible
                        </span>
                        {migrationInfo?.effort === 'LOW' && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-blue-900/30 text-blue-300 rounded border border-blue-500/30">
                            <Clock size={10} />
                            Low Effort
                          </span>
                        )}
                        {riskInfo.factors.length === 0 && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-purple-900/30 text-purple-300 rounded border border-purple-500/30">
                            <Shield size={10} />
                            Low Risk
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ENHANCED: Technical Metrics Summary */}
      {result.tree_sitter_facts && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-400/30">
              <GitBranch size={18} className="text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">Technical Analysis</h3>
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm shadow-lg">
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {result.tree_sitter_facts.complexity_score !== undefined && (
                  <div className="text-center bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-lg p-4 border border-blue-500/30">
                    <div className="text-2xl font-bold text-blue-400 mb-1">
                      {result.tree_sitter_facts.complexity_score}
                    </div>
                    <div className="text-xs text-gray-500">Complexity Score</div>
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
                
                {result.tree_sitter_facts.syntax_success_rate !== undefined && (
                  <div className="text-center bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-lg p-4 border border-green-500/30">
                    <div className="text-2xl font-bold text-green-400 mb-1">
                      {(() => {
                        const rate = result.tree_sitter_facts.syntax_success_rate;
                        const percentage = rate > 1 ? rate : rate * 100;
                        return percentage > 100 ? '100%' : `${percentage.toFixed(1)}%`;
                      })()}
                    </div>
                    <div className="text-xs text-gray-500">Syntax Success</div>
                    <div className="text-xs mt-1 font-semibold text-green-400">CLEAN</div>
                  </div>
                )}
                
                {result.tree_sitter_facts.total_resources !== undefined && (
                  <div className="text-center bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-lg p-4 border border-purple-500/30">
                    <div className="text-2xl font-bold text-purple-400 mb-1">
                      {result.tree_sitter_facts.total_resources}
                    </div>
                    <div className="text-xs text-gray-500">Resources</div>
                    <div className={`text-xs mt-1 font-semibold ${
                      result.tree_sitter_facts.total_resources > 10 ? 'text-orange-400' :
                      result.tree_sitter_facts.total_resources > 5 ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>
                      {result.tree_sitter_facts.total_resources > 10 ? 'MANY' :
                       result.tree_sitter_facts.total_resources > 5 ? 'SEVERAL' : 'FEW'}
                    </div>
                  </div>
                )}
                
                {result.tree_sitter_facts.is_wrapper !== undefined && (
                  <div className="text-center bg-gradient-to-br from-gray-900/30 to-gray-800/20 rounded-lg p-4 border border-gray-500/30">
                    <div className={`text-2xl font-bold mb-1 ${
                      result.tree_sitter_facts.is_wrapper ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {result.tree_sitter_facts.is_wrapper ? 'YES' : 'NO'}
                    </div>
                    <div className="text-xs text-gray-500">Wrapper</div>
                    <div className={`text-xs mt-1 font-semibold ${
                      result.tree_sitter_facts.is_wrapper ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {result.tree_sitter_facts.is_wrapper ? 'COMPLEX' : 'DIRECT'}
                    </div>
                  </div>
                )}
                
              </div>

              {/* Quality Indicators */}
              <div className="mt-4 pt-4 border-t border-gray-700/50">
                <div className="flex justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      (result.tree_sitter_facts.syntax_success_rate || 0) >= 95 ? 'bg-green-400' : 'bg-yellow-400'
                    }`}></div>
                    <span className="text-gray-400">Code Quality</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      (result.tree_sitter_facts.complexity_score || 0) <= 8 ? 'bg-green-400' : 
                      (result.tree_sitter_facts.complexity_score || 0) <= 15 ? 'bg-yellow-400' : 'bg-red-400'
                    }`}></div>
                    <span className="text-gray-400">Complexity</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      !result.tree_sitter_facts.is_wrapper ? 'bg-green-400' : 'bg-yellow-400'
                    }`}></div>
                    <span className="text-gray-400">Structure</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent"></div>
          </div>
        </div>
      )}

      {/* ENHANCED: Migration Timeline */}
      {migrationInfo && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-500/20 rounded-lg border border-orange-400/30">
              <Clock size={18} className="text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">Migration Timeline</h3>
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm shadow-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="text-center">
                  <div className="w-4 h-4 bg-blue-500 rounded-full mb-2 mx-auto"></div>
                  <div className="text-xs text-gray-400">Current</div>
                  <div className="text-sm font-semibold text-gray-200">
                    {isChef ? 'Chef' : isSalt ? 'Salt' : 'Legacy'}
                  </div>
                </div>
                
                <div className="flex-1 mx-4">
                  <div className="relative">
                    <div className="h-1 bg-gray-700 rounded-full"></div>
                    <div className={`h-1 rounded-full absolute top-0 left-0 transition-all duration-1000 ${
                      migrationInfo.effort === 'LOW' ? 'bg-green-400 w-1/3' :
                      migrationInfo.effort === 'MEDIUM' ? 'bg-yellow-400 w-2/3' :
                      'bg-red-400 w-full'
                    }`}></div>
                  </div>
                  <div className="text-center mt-2">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                      migrationInfo.effort === 'LOW' ? 'text-green-400' :
                      migrationInfo.effort === 'MEDIUM' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      <TrendingUp size={10} />
                      {migrationInfo.effort} EFFORT
                    </div>
                    {migrationInfo.hours && (
                      <div className="text-xs text-gray-500 mt-1">
                        ~{migrationInfo.hours}h estimated
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="w-4 h-4 bg-green-500 rounded-full mb-2 mx-auto"></div>
                  <div className="text-xs text-gray-400">Target</div>
                  <div className="text-sm font-semibold text-gray-200">Ansible</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-500/30">
                  <div className="font-semibold text-blue-300 mb-1">Phase 1: Analysis</div>
                  <div className="text-xs text-gray-400">✅ Complete</div>
                </div>
                
                <div className={`rounded-lg p-3 border ${
                  migrationInfo.effort === 'LOW' ? 'bg-green-900/20 border-green-500/30' :
                  'bg-yellow-900/20 border-yellow-500/30'
                }`}>
                  <div className={`font-semibold mb-1 ${
                    migrationInfo.effort === 'LOW' ? 'text-green-300' : 'text-yellow-300'
                  }`}>
                    Phase 2: Conversion
                  </div>
                  <div className="text-xs text-gray-400">
                    {migrationInfo.effort} complexity
                  </div>
                </div>
                
                <div className="bg-gray-700/20 rounded-lg p-3 border border-gray-500/30">
                  <div className="font-semibold text-gray-300 mb-1">Phase 3: Validation</div>
                  <div className="text-xs text-gray-400">Pending</div>
                </div>
              </div>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-400/30 to-transparent"></div>
          </div>
        </div>
      )}

      {/* No Assessment Data - Enhanced fallback */}
      {!recommendationInfo?.action && 
       !migrationInfo && 
       riskInfo.factors.length === 0 && 
       !hasBackendData(result.convertible) && 
       !complexityAssessment && (
        <div className="text-center py-12 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-xl border border-gray-700/50">
          <div className="p-4 bg-gray-700/20 rounded-full inline-flex mb-4">
            <AlertTriangle size={48} className="text-gray-500" />
          </div>
          <p className="text-gray-400 text-lg font-semibold mb-2">Assessment Incomplete</p>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            {isSalt ? 'Salt analysis completed but detailed assessment data is limited. The configuration appears to be analyzed successfully.' : 
             isChef ? 'Chef analysis completed but comprehensive assessment data is not available from the backend.' :
             'Backend analysis completed but detailed assessment information was not provided.'}
          </p>
          <div className="mt-4 text-xs text-gray-600">
            Try rerunning the analysis or check the backend response format
          </div>
        </div>
      )}
      
    </div>
  );
};