import React from 'react';
import { Server, Package, FileCode, Database, Code, Settings, Zap, GitBranch } from 'lucide-react';
import { BackendAnalysisResponse } from '../types/BackendTypes';
import { 
  hasBackendData, 
  getVersionRequirements, 
  getKeyOperations,
  getBackendValue,
  formatArray 
} from '../utils/backendUtils';

interface TechnicalDetailsTabProps {
  result: BackendAnalysisResponse;
}

const getSafeVersion = (version: any): string | null => {
  if (!version || version === 'Unknown' || version === 'Not specified' || version === '') {
    return null;
  }
  const versionStr = String(version).trim();
  if (/^[\d\.\-\+a-zA-Z]+$/.test(versionStr) && versionStr.length > 0 && versionStr.length < 50) {
    return versionStr;
  }
  return null;
};

const getSaltFunctionality = (result: BackendAnalysisResponse) => {
  const anyResult = result as any;
  return {
    services: anyResult.managed_services || [],
    packages: anyResult.managed_packages || [],
    files_managed: anyResult.managed_files || [],
    primary_purpose: anyResult.primary_purpose || anyResult.detailed_analysis,
    reusability: anyResult.reusability_level || 'MEDIUM',
    customization_points: anyResult.customization_points || []
  };
};

export const TechnicalDetailsTab: React.FC<TechnicalDetailsTabProps> = ({ result }) => {
  const versionReqs = getVersionRequirements(result);
  const anyResult = result as any;
  const isSalt = result.metadata?.technology_type === 'salt' || anyResult.managed_services || anyResult.managed_packages;
  const isAnsibleUpgrade = result.metadata?.technology_type === 'ansible-upgrade' || anyResult.current_state || anyResult.upgrade_requirements;
  const functionality = isSalt ? getSaltFunctionality(result) : result.functionality;
  const keyOperations = getKeyOperations(result);

  const chefVersion = getSafeVersion(versionReqs?.chef);
  const rubyVersion = getSafeVersion(versionReqs?.ruby);
  const saltVersion = getSafeVersion(versionReqs?.salt);
  const ansibleVersion = getSafeVersion(versionReqs?.ansible);
  const showVersionBlock = !!(chefVersion || rubyVersion || saltVersion || ansibleVersion);

  const services = functionality?.services || [];
  const packages = functionality?.packages || [];
  const files_managed = functionality?.files_managed || [];

  return (
    <div className="space-y-6">

      {/* Primary Purpose - Enhanced */}
      {functionality?.primary_purpose && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-cyan-500/20 rounded-lg border border-cyan-400/30">
              <Zap size={18} className="text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">Primary Purpose</h3>
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gray-800/30 backdrop-blur-sm shadow-lg">
            <div className="p-4">
              <div className="text-gray-300 leading-relaxed">
                {getBackendValue(functionality.primary_purpose)}
              </div>
              
              {functionality.reusability && (
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Reusability:</span>
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                      functionality.reusability === 'HIGH' ? 'bg-green-900/30 text-green-400' :
                      functionality.reusability === 'LOW' ? 'bg-red-900/30 text-red-400' :
                      'bg-yellow-900/30 text-yellow-400'
                    }`}>
                      {functionality.reusability}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>
          </div>
        </div>
      )}

      {/* Managed Resources */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-400/30">
            <Code size={18} className="text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-200">Managed Resources</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Services Card */}
          <div className={`relative overflow-hidden rounded-xl border border-blue-500/30 bg-blue-900/10 backdrop-blur-sm transition-all duration-300 shadow-lg min-w-0 ${
            services.length === 0 ? 'opacity-30' : ''
          }`}>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-blue-500/20 rounded border border-blue-400/30">
                  <Server size={14} className="text-blue-400" />
                </div>
                <span className="text-sm font-medium text-blue-300">
                  Services ({services.length})
                </span>
              </div>
              {services.length > 0 ? (
                <div className="space-y-2">
                  {services.slice(0, 4).map((service, i) => (
                    <div key={i} className="text-sm text-gray-300 bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-700/30">
                      {service}
                    </div>
                  ))}
                  {services.length > 4 && (
                    <div className="text-xs text-blue-400 font-medium">
                      +{services.length - 4} more
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-500">No services managed</div>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400/40"></div>
          </div>

          {/* Packages Card */}
          <div className={`relative overflow-hidden rounded-xl border border-green-500/30 bg-green-900/10 backdrop-blur-sm transition-all duration-300 shadow-lg min-w-0 ${
            packages.length === 0 ? 'opacity-30' : ''
          }`}>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-green-500/20 rounded border border-green-400/30">
                  <Package size={14} className="text-green-400" />
                </div>
                <span className="text-sm font-medium text-green-300">
                  Packages ({packages.length})
                </span>
              </div>
              {packages.length > 0 ? (
                <div className="space-y-2">
                  {packages.slice(0, 4).map((pkg, i) => (
                    <div key={i} className="text-sm text-gray-300 bg-green-900/30 px-3 py-1.5 rounded-lg border border-green-700/30">
                      {pkg}
                    </div>
                  ))}
                  {packages.length > 4 && (
                    <div className="text-xs text-green-400 font-medium">
                      +{packages.length - 4} more
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-500">No packages managed</div>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-400/40"></div>
          </div>

          {/* Files Managed Card */}
          <div className={`relative overflow-hidden rounded-xl border border-yellow-500/30 bg-yellow-900/10 backdrop-blur-sm transition-all duration-300 shadow-lg min-w-0 ${
            files_managed.length === 0 ? 'opacity-30' : ''
          }`}>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-yellow-500/20 rounded border border-yellow-400/30">
                  <FileCode size={14} className="text-yellow-400" />
                </div>
                <span className="text-sm font-medium text-yellow-300">
                  Files ({files_managed.length})
                </span>
              </div>
              {files_managed.length > 0 ? (
                <div className="space-y-2">
                  {files_managed.slice(0, 3).map((file, i) => (
                    <div key={i} className="text-xs text-gray-300 bg-yellow-900/30 px-2 py-1.5 rounded-lg border border-yellow-700/30 font-mono break-all">
                      {file.length > 40 ? `...${file.slice(-37)}` : file}
                    </div>
                  ))}
                  {files_managed.length > 3 && (
                    <div className="text-xs text-yellow-400 font-medium">
                      +{files_managed.length - 3} more files
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-500">No files managed</div>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400/40"></div>
          </div>
        </div>
      </div>

      {/* Version Requirements */}
      {showVersionBlock && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-400/30">
              <Settings size={18} className="text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">Version Requirements</h3>
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gray-800/30 backdrop-blur-sm shadow-lg">
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {chefVersion && (
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                    <div className="text-sm text-gray-500 mb-1">Chef Version</div>
                    <div className="text-lg font-mono text-orange-400">{chefVersion}</div>
                  </div>
                )}
                
                {rubyVersion && (
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                    <div className="text-sm text-gray-500 mb-1">Ruby Version</div>
                    <div className="text-lg font-mono text-red-400">{rubyVersion}</div>
                  </div>
                )}
                
                {saltVersion && (
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                    <div className="text-sm text-gray-500 mb-1">Salt Version</div>
                    <div className="text-lg font-mono text-blue-400">{saltVersion}</div>
                  </div>
                )}
                
                {ansibleVersion && (
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                    <div className="text-sm text-gray-500 mb-1">Ansible Version</div>
                    <div className="text-lg font-mono text-green-400">{ansibleVersion}</div>
                  </div>
                )}
                
              </div>
              
              {/* Deprecated Features */}
              {versionReqs?.deprecated && versionReqs.deprecated.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-700/50">
                  <div className="text-sm text-gray-500 mb-2">Deprecated Features</div>
                  <div className="flex flex-wrap gap-2">
                    {versionReqs.deprecated.map((feature, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded border border-red-500/30">
                        <span>⚠️</span>
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent"></div>
          </div>
        </div>
      )}

      {/* Key Operations */}
      {keyOperations.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-500/20 rounded-lg border border-orange-400/30">
              <Zap size={18} className="text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">Key Operations</h3>
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gray-800/30 backdrop-blur-sm shadow-lg">
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {keyOperations.map((operation, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700/30">
                    <div className="p-1.5 bg-orange-500/20 rounded border border-orange-400/30">
                      <Zap size={12} className="text-orange-400" />
                    </div>
                    <span className="text-sm text-gray-300">{operation}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-400/30 to-transparent"></div>
          </div>
        </div>
      )}

      {/* Dependencies */}
      {result.dependencies && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-400/30">
              <GitBranch size={18} className="text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">Dependencies</h3>
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gray-800/30 backdrop-blur-sm shadow-lg">
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Wrapper Status */}
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                  <div className="text-sm text-gray-500 mb-2">Wrapper Status</div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium ${
                    result.dependencies.is_wrapper 
                      ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30'
                      : 'bg-green-900/30 text-green-400 border border-green-500/30'
                  }`}>
                    <span>{result.dependencies.is_wrapper ? '📦' : '📄'}</span>
                    <span>{result.dependencies.is_wrapper ? 'Wrapper' : 'Direct'}</span>
                  </div>
                </div>

                {/* Circular Risk */}
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                  <div className="text-sm text-gray-500 mb-2">Circular Risk</div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium ${
                    result.dependencies.circular_risk === 'high' 
                      ? 'bg-red-900/30 text-red-400 border border-red-500/30'
                      : result.dependencies.circular_risk === 'medium'
                      ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30'
                      : 'bg-green-900/30 text-green-400 border border-green-500/30'
                  }`}>
                    <span>
                      {result.dependencies.circular_risk === 'high' ? '🔴' : 
                       result.dependencies.circular_risk === 'medium' ? '🟡' : '🟢'}
                    </span>
                    <span className="capitalize">{result.dependencies.circular_risk}</span>
                  </div>
                </div>
                
              </div>
              
              {/* Dependencies Lists */}
              {(result.dependencies.direct_deps?.length > 0 || result.dependencies.runtime_deps?.length > 0 || result.dependencies.wrapped_cookbooks?.length > 0) && (
                <div className="mt-4 pt-4 border-t border-gray-700/50 space-y-3">
                  
                  {result.dependencies.direct_deps?.length > 0 && (
                    <div>
                      <div className="text-sm text-gray-500 mb-2">Direct Dependencies</div>
                      <div className="text-sm text-gray-300 bg-gray-900/50 px-3 py-2 rounded border border-gray-700/30">
                        {formatArray(result.dependencies.direct_deps, 5)}
                      </div>
                    </div>
                  )}
                  
                  {result.dependencies.runtime_deps?.length > 0 && (
                    <div>
                      <div className="text-sm text-gray-500 mb-2">Runtime Dependencies</div>
                      <div className="text-sm text-gray-300 bg-gray-900/50 px-3 py-2 rounded border border-gray-700/30">
                        {formatArray(result.dependencies.runtime_deps, 5)}
                      </div>
                    </div>
                  )}
                  
                  {result.dependencies.wrapped_cookbooks?.length > 0 && (
                    <div>
                      <div className="text-sm text-gray-500 mb-2">Wrapped Cookbooks</div>
                      <div className="text-sm text-gray-300 bg-gray-900/50 px-3 py-2 rounded border border-gray-700/30">
                        {formatArray(result.dependencies.wrapped_cookbooks, 5)}
                      </div>
                    </div>
                  )}
                  
                </div>
              )}
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent"></div>
          </div>
        </div>
      )}

      {/* Configuration Details */}
      {result.configuration_details && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-teal-500/20 rounded-lg border border-teal-400/30">
              <Database size={18} className="text-teal-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">Configuration Details</h3>
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gray-800/30 backdrop-blur-sm shadow-lg">
            <div className="p-4">
              <div className="text-gray-300 leading-relaxed">
                {getBackendValue(result.configuration_details)}
              </div>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-400/30 to-transparent"></div>
          </div>
        </div>
      )}

      {/* Customization Points */}
      {functionality?.customization_points && functionality.customization_points.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-pink-500/20 rounded-lg border border-pink-400/30">
              <Settings size={18} className="text-pink-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">Customization Points</h3>
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gray-800/30 backdrop-blur-sm shadow-lg">
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {functionality.customization_points.map((point, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700/30">
                    <div className="p-1.5 bg-pink-500/20 rounded border border-pink-400/30">
                      <Settings size={12} className="text-pink-400" />
                    </div>
                    <span className="text-sm text-gray-300">{point}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pink-400/30 to-transparent"></div>
          </div>
        </div>
      )}

      {/* Ansible Upgrade Specific Information */}
      {isAnsibleUpgrade && anyResult.upgrade_requirements && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-400/30">
              <GitBranch size={18} className="text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200">Upgrade Requirements</h3>
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gray-800/30 backdrop-blur-sm shadow-lg">
            <div className="p-4 space-y-4">
              
              {anyResult.upgrade_requirements.fqcn_conversions_needed?.length > 0 && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">FQCN Conversions Needed ({anyResult.upgrade_requirements.fqcn_conversions_needed.length})</div>
                  <div className="space-y-1">
                    {anyResult.upgrade_requirements.fqcn_conversions_needed.slice(0, 5).map((conversion: string, i: number) => (
                      <div key={i} className="text-xs text-gray-300 bg-yellow-900/30 px-2 py-1 rounded border border-yellow-700/30 font-mono">
                        {conversion}
                      </div>
                    ))}
                    {anyResult.upgrade_requirements.fqcn_conversions_needed.length > 5 && (
                      <div className="text-xs text-yellow-400">
                        +{anyResult.upgrade_requirements.fqcn_conversions_needed.length - 5} more conversions
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {anyResult.upgrade_requirements.structural_changes_needed?.length > 0 && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">Structural Changes ({anyResult.upgrade_requirements.structural_changes_needed.length})</div>
                  <div className="space-y-1">
                    {anyResult.upgrade_requirements.structural_changes_needed.slice(0, 3).map((change: string, i: number) => (
                      <div key={i} className="text-xs text-gray-300 bg-blue-900/30 px-2 py-1 rounded border border-blue-700/30">
                        {change}
                      </div>
                    ))}
                    {anyResult.upgrade_requirements.structural_changes_needed.length > 3 && (
                      <div className="text-xs text-blue-400">
                        +{anyResult.upgrade_requirements.structural_changes_needed.length - 3} more changes
                      </div>
                    )}
                  </div>
                </div>
              )}
              
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent"></div>
          </div>
        </div>
      )}

      {/* No Technical Data Available */}
      {!functionality?.primary_purpose && 
       services.length === 0 && 
       packages.length === 0 && 
       files_managed.length === 0 && 
       !showVersionBlock && 
       keyOperations.length === 0 && 
       !result.dependencies && (
        <div className="text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <Database size={48} className="mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">No technical details available</p>
          <p className="text-sm text-gray-500 mt-1">
            Backend analysis did not provide technical information
          </p>
        </div>
      )}

    </div>
  );
};