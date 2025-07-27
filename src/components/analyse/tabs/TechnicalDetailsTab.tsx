import React from 'react';
import { Server, Package, Code, Settings, Zap, GitBranch, FileText } from 'lucide-react';
import { BackendAnalysisResponse } from '../types/BackendTypes';
import { 
  getVersionRequirements, 
  getKeyOperations,
  getBackendValue 
} from '../utils/backendUtils';

interface TechnicalDetailsTabProps {
  result: BackendAnalysisResponse;
}

// Safe version validation
const getSafeVersion = (version: unknown): string | null => {
  if (!version || version === 'Unknown' || version === 'Not specified' || version === '' || version === 'string') {
    return null;
  }
  const versionStr = String(version).trim();
  if (/^[\d\.\-\+a-zA-Z\>\=\<\s]+$/.test(versionStr) && versionStr.length > 0 && versionStr.length < 50) {
    return versionStr;
  }
  return null;
};

// Get Salt-specific functionality
const getSaltFunctionality = (result: BackendAnalysisResponse) => {
  const anyResult = result as Record<string, unknown>;
  return {
    services: anyResult.managed_services as string[] || [],
    packages: anyResult.managed_packages as string[] || [],
    files_managed: anyResult.managed_files as string[] || [],
    primary_purpose: anyResult.primary_purpose as string || anyResult.detailed_analysis as string,
    reusability: anyResult.reusability_level as string || 'MEDIUM',
    customization_points: anyResult.customization_points as string[] || []
  };
};

// Version Requirements Section Component
const VersionRequirementsSection: React.FC<{
  versionReqs: {
    chef: string;
    ruby: string;
    salt: string;
    ansible: string;
    puppet: string;
    effort?: string;
    hours?: number;
    deprecated: string[];
  };
  chefVersion: string | null;
  rubyVersion: string | null;
  saltVersion: string | null;
  ansibleVersion: string | null;
  puppetVersion: string | null;
}> = ({ versionReqs, chefVersion, rubyVersion, saltVersion, ansibleVersion, puppetVersion }) => {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-400/30">
          <Settings size={18} className="text-purple-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-200">Version Requirements</h3>
      </div>
      
      <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gray-800/30 backdrop-blur-sm shadow-lg">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {chefVersion && (
              <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                <div className="text-sm text-gray-500 mb-1">Chef Version</div>
                <div className="text-lg font-mono text-orange-400">{String(chefVersion)}</div>
              </div>
            )}
            
            {rubyVersion && (
              <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                <div className="text-sm text-gray-500 mb-1">Ruby Version</div>
                <div className="text-lg font-mono text-red-400">{String(rubyVersion)}</div>
              </div>
            )}
            
            {saltVersion && (
              <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                <div className="text-sm text-gray-500 mb-1">Salt Version</div>
                <div className="text-lg font-mono text-blue-400">{String(saltVersion)}</div>
              </div>
            )}
            
            {ansibleVersion && (
              <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                <div className="text-sm text-gray-500 mb-1">Ansible Version</div>
                <div className="text-lg font-mono text-green-400">{String(ansibleVersion)}</div>
              </div>
            )}
            
            {puppetVersion && (
              <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                <div className="text-sm text-gray-500 mb-1">Puppet Version</div>
                <div className="text-lg font-mono text-purple-400">{String(puppetVersion)}</div>
              </div>
            )}
            
          </div>
          
          {/* Migration Effort - only if provided */}
          {(versionReqs.effort || versionReqs.hours) && (
            <div className="mt-4 pt-4 border-t border-gray-700/50">
              <div className="flex items-center gap-4">
                {versionReqs.effort && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Effort:</span>
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-500/30">
                      {versionReqs.effort}
                    </div>
                  </div>
                )}
                {versionReqs.hours && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Hours:</span>
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-green-900/30 text-green-400 border border-green-500/30">
                      {versionReqs.hours}h
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Deprecated Features - only if array exists and has items */}
          {versionReqs.deprecated && versionReqs.deprecated.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700/50">
              <div className="text-sm text-gray-500 mb-2">Deprecated Features ({versionReqs.deprecated.length})</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {versionReqs.deprecated.slice(0, 6).map((feature: string, i: number) => (
                  <div key={i} className="text-xs text-gray-300 bg-red-900/30 px-2 py-1 rounded border border-red-700/30">
                    {String(getBackendValue(feature))}
                  </div>
                ))}
                {versionReqs.deprecated.length > 6 && (
                  <div className="text-xs text-red-400">
                    +{versionReqs.deprecated.length - 6} more deprecated features
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent"></div>
      </div>
    </div>
  );
};

// Primary Purpose Section Component
const PrimaryPurposeSection: React.FC<{ functionality: BackendAnalysisResponse['functionality'] }> = ({ functionality }) => {
  if (!functionality?.primary_purpose) return null;
  
  return (
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
            {String(getBackendValue(functionality.primary_purpose))}
          </div>
          
          {/* Reusability - only if provided */}
          {functionality.reusability && (
            <div className="mt-3 pt-3 border-t border-gray-700/50">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Backend Reusability Assessment:</span>
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
  );
};

// Managed Resources Section Component
const ManagedResourcesSection: React.FC<{ 
  services: string[], 
  packages: string[], 
  files_managed: string[] 
}> = ({ services, packages, files_managed }) => {
  const hasManagedResources = services.length > 0 || packages.length > 0 || files_managed.length > 0;
  
  if (!hasManagedResources) return null;
  
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-400/30">
          <Code size={18} className="text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-200">Managed Resources</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Services Card */}
        <div className={`relative overflow-hidden rounded-xl border border-blue-500/30 bg-blue-900/10 backdrop-blur-sm shadow-lg ${
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
                {services.slice(0, 4).map((service: unknown, i: number) => (
                  <div key={i} className="text-sm text-gray-300 bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-700/30">
                    {String(getBackendValue(service))}
                  </div>
                ))}
                {services.length > 4 && (
                  <div className="text-xs text-blue-400 font-medium">
                    +{services.length - 4} more
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">No services managed</div>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent"></div>
        </div>
        
        {/* Packages Card */}
        <div className={`relative overflow-hidden rounded-xl border border-green-500/30 bg-green-900/10 backdrop-blur-sm shadow-lg ${
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
                {packages.slice(0, 4).map((pkg: unknown, i: number) => (
                  <div key={i} className="text-sm text-gray-300 bg-green-900/30 px-3 py-1.5 rounded-lg border border-green-700/30">
                    {String(getBackendValue(pkg))}
                  </div>
                ))}
                {packages.length > 4 && (
                  <div className="text-xs text-green-400 font-medium">
                    +{packages.length - 4} more
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">No packages managed</div>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-400/30 to-transparent"></div>
        </div>
        
        {/* Files Managed Card */}
        <div className={`relative overflow-hidden rounded-xl border border-purple-500/30 bg-purple-900/10 backdrop-blur-sm shadow-lg ${
          files_managed.length === 0 ? 'opacity-30' : ''
        }`}>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-purple-500/20 rounded border border-purple-400/30">
                <FileText size={14} className="text-purple-400" />
              </div>
              <span className="text-sm font-medium text-purple-300">
                Files ({files_managed.length})
              </span>
            </div>
            {files_managed.length > 0 ? (
              <div className="space-y-2">
                {files_managed.slice(0, 4).map((file: unknown, i: number) => (
                  <div key={i} className="text-sm text-gray-300 bg-purple-900/30 px-3 py-1.5 rounded-lg border border-purple-700/30">
                    {String(getBackendValue(file))}
                  </div>
                ))}
                {files_managed.length > 4 && (
                  <div className="text-xs text-purple-400 font-medium">
                    +{files_managed.length - 4} more
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">No files managed</div>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent"></div>
        </div>
      </div>
    </div>
  );
};

// Key Operations Section Component
const KeyOperationsSection: React.FC<{ keyOperations: string[] }> = ({ keyOperations }) => {
  if (keyOperations.length === 0) return null;
  
  return (
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
            {keyOperations.map((operation: string, i: number) => (
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
  );
};

// Dependencies Section Component
const DependenciesSection: React.FC<{ dependencies: BackendAnalysisResponse['dependencies'] }> = ({ dependencies }) => {
  if (!dependencies) return null;
  
  const hasDependencyData = dependencies.is_wrapper !== undefined || 
                           dependencies.circular_risk || 
                           (dependencies.direct_deps && dependencies.direct_deps.length > 0) ||
                           (dependencies.runtime_deps && dependencies.runtime_deps.length > 0) ||
                           (dependencies.wrapped_cookbooks && dependencies.wrapped_cookbooks.length > 0);
  
  if (!hasDependencyData) return null;
  
  return (
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
            
            {/* Wrapper Status - only if is_wrapper field exists */}
            {dependencies.is_wrapper !== undefined && (
              <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                <div className="text-sm text-gray-500 mb-2">Wrapper Status</div>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium ${
                  dependencies.is_wrapper 
                    ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30'
                    : 'bg-green-900/30 text-green-400 border border-green-500/30'
                }`}>
                  <span>{dependencies.is_wrapper ? '📦' : '📄'}</span>
                  <span>{dependencies.is_wrapper ? 'Wrapper' : 'Direct'}</span>
                </div>
              </div>
            )}

            {/* Circular Risk - only if circular_risk field exists */}
            {dependencies.circular_risk && (
              <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                <div className="text-sm text-gray-500 mb-2">Circular Risk</div>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium ${
                  dependencies.circular_risk === 'high' 
                    ? 'bg-red-900/30 text-red-400 border border-red-500/30'
                    : dependencies.circular_risk === 'medium'
                    ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30'
                    : 'bg-green-900/30 text-green-400 border border-green-500/30'
                }`}>
                  <span>
                    {dependencies.circular_risk === 'high' ? '🔴' : 
                     dependencies.circular_risk === 'medium' ? '🟡' : '🟢'}
                  </span>
                  <span className="capitalize">{dependencies.circular_risk}</span>
                </div>
              </div>
            )}
            
          </div>
          
          {/* Dependencies Lists - only if arrays exist and have items */}
          {((dependencies.direct_deps && dependencies.direct_deps.length > 0) ||
            (dependencies.runtime_deps && dependencies.runtime_deps.length > 0) ||
            (dependencies.wrapped_cookbooks && dependencies.wrapped_cookbooks.length > 0)) && (
            <div className="mt-4 pt-4 border-t border-gray-700/50 space-y-3">
              
              {dependencies.direct_deps && dependencies.direct_deps.length > 0 && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">Direct Dependencies ({dependencies.direct_deps.length})</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {dependencies.direct_deps.slice(0, 6).map((dep: string, i: number) => (
                      <div key={i} className="text-xs text-gray-300 bg-blue-900/30 px-2 py-1 rounded border border-blue-700/30">
                        {String(getBackendValue(dep))}
                      </div>
                    ))}
                    {dependencies.direct_deps.length > 6 && (
                      <div className="text-xs text-blue-400">
                        +{dependencies.direct_deps.length - 6} more direct deps
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {dependencies.runtime_deps && dependencies.runtime_deps.length > 0 && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">Runtime Dependencies ({dependencies.runtime_deps.length})</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {dependencies.runtime_deps.slice(0, 6).map((dep: string, i: number) => (
                      <div key={i} className="text-xs text-gray-300 bg-green-900/30 px-2 py-1 rounded border border-green-700/30">
                        {String(getBackendValue(dep))}
                      </div>
                    ))}
                    {dependencies.runtime_deps.length > 6 && (
                      <div className="text-xs text-green-400">
                        +{dependencies.runtime_deps.length - 6} more runtime deps
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {dependencies.wrapped_cookbooks && dependencies.wrapped_cookbooks.length > 0 && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">Wrapped Cookbooks ({dependencies.wrapped_cookbooks.length})</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {dependencies.wrapped_cookbooks.slice(0, 6).map((cookbook: string, i: number) => (
                      <div key={i} className="text-xs text-gray-300 bg-purple-900/30 px-2 py-1 rounded border border-purple-700/30">
                        {String(getBackendValue(cookbook))}
                      </div>
                    ))}
                    {dependencies.wrapped_cookbooks.length > 6 && (
                      <div className="text-xs text-purple-400">
                        +{dependencies.wrapped_cookbooks.length - 6} more cookbooks
                      </div>
                    )}
                  </div>
                </div>
              )}
              
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent"></div>
      </div>
    </div>
  );
};

// Ansible Upgrade Section Component
const AnsibleUpgradeSection: React.FC<{ result: BackendAnalysisResponse }> = ({ result }) => {
  const anyResult = result as Record<string, unknown>;
  const isAnsibleUpgrade = result.metadata?.technology_type === 'ansible-upgrade' || 
                          anyResult.current_state || 
                          anyResult.upgrade_requirements;
  
  if (!isAnsibleUpgrade || !anyResult.upgrade_requirements) return null;
  
  const upgradeReqs = anyResult.upgrade_requirements as Record<string, unknown>;
  const fqcnConversions = upgradeReqs.fqcn_conversions_needed as string[] || [];
  const structuralChanges = upgradeReqs.structural_changes_needed as string[] || [];
  
  const hasUpgradeData = fqcnConversions.length > 0 || structuralChanges.length > 0;
  
  if (!hasUpgradeData) return null;
  
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-400/30">
          <Settings size={18} className="text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-200">Ansible Upgrade Requirements</h3>
      </div>
      
      <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gray-800/30 backdrop-blur-sm shadow-lg">
        <div className="p-4 space-y-4">
          
          {fqcnConversions.length > 0 && (
            <div>
              <div className="text-sm text-gray-500 mb-2">FQCN Conversions Needed ({fqcnConversions.length})</div>
              <div className="space-y-1">
                {fqcnConversions.slice(0, 5).map((conversion: unknown, i: number) => (
                  <div key={i} className="text-xs text-gray-300 bg-yellow-900/30 px-2 py-1 rounded border border-yellow-700/30 font-mono">
                    {String(getBackendValue(conversion))}
                  </div>
                ))}
                {fqcnConversions.length > 5 && (
                  <div className="text-xs text-yellow-400">
                    +{fqcnConversions.length - 5} more conversions
                  </div>
                )}
              </div>
            </div>
          )}
          
          {structuralChanges.length > 0 && (
            <div>
              <div className="text-sm text-gray-500 mb-2">Structural Changes ({structuralChanges.length})</div>
              <div className="space-y-1">
                {structuralChanges.slice(0, 3).map((change: unknown, i: number) => (
                  <div key={i} className="text-xs text-gray-300 bg-blue-900/30 px-2 py-1 rounded border border-blue-700/30">
                    {String(getBackendValue(change))}
                  </div>
                ))}
                {structuralChanges.length > 3 && (
                  <div className="text-xs text-blue-400">
                    +{structuralChanges.length - 3} more changes
                  </div>
                )}
              </div>
            </div>
          )}
          
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent"></div>
      </div>
    </div>
  );
};

// Puppet Resources Section Component
const PuppetResourcesSection: React.FC<{ result: BackendAnalysisResponse }> = ({ result }) => {
  // const anyResult = result as Record<string, unknown>; // Removed as it's assigned but never used
  const isPuppet = result.metadata?.technology_type === 'puppet' || 
                  result.object_type || 
                  result.puppet_resources;
  
  if (!isPuppet) return null;
  
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-400/30">
          <Code size={18} className="text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-200">Puppet Resources</h3>
      </div>
      
      <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gray-800/30 backdrop-blur-sm shadow-lg">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            
            {/* Object Type - only if object_type field exists */}
            {result.object_type && (
              <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                <div className="text-sm text-gray-500 mb-2">Object Type</div>
                <div className="text-lg font-mono text-blue-400">{String(getBackendValue(result.object_type))}</div>
              </div>
            )}

            {/* Puppet Resources - only if puppet_resources field exists */}
            {result.puppet_resources && (
              <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                <div className="text-sm text-gray-500 mb-2">Total Resources</div>
                <div className="text-lg font-mono text-blue-400">{result.puppet_resources.total_resources || 0}</div>
              </div>
            )}

            {/* Resource Types - only if resource_types field exists */}
            {result.puppet_resources?.resource_types && Object.keys(result.puppet_resources.resource_types).length > 0 && (
              <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                <div className="text-sm text-gray-500 mb-2">Resource Types</div>
                <div className="text-sm text-gray-300 bg-gray-900/50 px-3 py-2 rounded border border-gray-700/30">
                  {Object.entries(result.puppet_resources.resource_types).map(([type, count]) => 
                    `${type}: ${String(count)}`
                  ).join(', ')}
                </div>
              </div>
            )}

            {/* Dependencies - only if dependencies field exists */}
            {result.puppet_resources?.dependencies && result.puppet_resources.dependencies.length > 0 && (
              <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                <div className="text-sm text-gray-500 mb-2">Dependencies</div>
                <div className="text-sm text-gray-300 bg-gray-900/50 px-3 py-2 rounded border border-gray-700/30">
                  {result.puppet_resources.dependencies.join(', ')}
                </div>
              </div>
            )}
            
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent"></div>
      </div>
    </div>
  );
};

// Main Technical Details Tab Component
export const TechnicalDetailsTab: React.FC<TechnicalDetailsTabProps> = ({ result }) => {
  // Extract version requirements
  const versionReqs = getVersionRequirements(result);
  
  // Safe version extraction with explicit typing
  const chefVersion: string | null = getSafeVersion(versionReqs?.chef);
  const rubyVersion: string | null = getSafeVersion(versionReqs?.ruby);
  const saltVersion: string | null = getSafeVersion(versionReqs?.salt);
  const ansibleVersion: string | null = getSafeVersion(versionReqs?.ansible);
  const puppetVersion: string | null = getSafeVersion(versionReqs?.puppet);
  
  // Check if we have any meaningful versions
  const hasVersions = Boolean(chefVersion || rubyVersion || saltVersion || ansibleVersion || puppetVersion);
  
  // Get functionality data
  const isSalt = result.metadata?.technology_type === 'salt' || 
                (result as Record<string, unknown>).managed_services || 
                (result as Record<string, unknown>).managed_packages;
  const functionality = isSalt ? getSaltFunctionality(result) : result.functionality;
  
  // Safe array access
  const services = functionality?.services || [];
  const packages = functionality?.packages || [];
  const files_managed = functionality?.files_managed || [];
  
  // Get key operations
  const keyOperations: string[] = getKeyOperations(result);

  return (
    <div className="space-y-6">
      {/* Primary Purpose Section */}
      <PrimaryPurposeSection functionality={functionality} />

      {/* Managed Resources Section */}
      <ManagedResourcesSection 
        services={services}
        packages={packages}
        files_managed={files_managed}
      />

      {/* Version Requirements Section */}
      {hasVersions && versionReqs && (
        <VersionRequirementsSection
          versionReqs={versionReqs}
          chefVersion={chefVersion}
          rubyVersion={rubyVersion}
          saltVersion={saltVersion}
          ansibleVersion={ansibleVersion}
          puppetVersion={puppetVersion}
        />
      )}

      {/* Key Operations Section */}
      <KeyOperationsSection keyOperations={keyOperations} />

      {/* Dependencies Section */}
      <DependenciesSection dependencies={result.dependencies} />

      {/* Ansible Upgrade Section */}
      <AnsibleUpgradeSection result={result} />

      {/* Puppet Resources Section */}
      <PuppetResourcesSection result={result} />
    </div>
  );
};