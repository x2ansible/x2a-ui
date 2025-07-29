import React from 'react';
import { Server, Package, Code, Settings, Zap, GitBranch, FileText } from 'lucide-react';
import { BackendAnalysisResponse } from '../types/BackendTypes';
import { 
  getBackendValue
} from '../utils/backendUtils';

interface TechnicalDetailsTabProps {
  result: BackendAnalysisResponse;
}



// Chef Version Requirements Section Component
const ChefVersionRequirementsSection: React.FC<{
  versionReqs: {
    min_chef_version?: string;
    min_ruby_version?: string;
    migration_effort?: string;
    estimated_hours?: number;
    deprecated_features?: string[];
  };
}> = ({ versionReqs }) => {
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
            
            {versionReqs.min_chef_version && (
              <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                <div className="text-sm text-gray-500 mb-1">Chef Version</div>
                <div className="text-lg font-mono text-orange-400">{versionReqs.min_chef_version}</div>
              </div>
            )}
            
            {versionReqs.min_ruby_version && (
              <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                <div className="text-sm text-gray-500 mb-1">Ruby Version</div>
                <div className="text-lg font-mono text-red-400">{versionReqs.min_ruby_version}</div>
              </div>
            )}
            
          </div>
          
          {/* Migration Effort - only if provided */}
          {(versionReqs.migration_effort || versionReqs.estimated_hours) && (
            <div className="mt-4 pt-4 border-t border-gray-700/50">
              <div className="flex items-center gap-4">
                {versionReqs.migration_effort && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Effort:</span>
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-500/30">
                      {versionReqs.migration_effort}
                    </div>
                  </div>
                )}
                {versionReqs.estimated_hours && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Hours:</span>
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-green-900/30 text-green-400 border border-green-500/30">
                      {versionReqs.estimated_hours}h
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Deprecated Features - only if array exists and has items */}
          {versionReqs.deprecated_features && versionReqs.deprecated_features.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700/50">
              <div className="text-sm text-gray-500 mb-2">Deprecated Features ({versionReqs.deprecated_features.length})</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {versionReqs.deprecated_features.slice(0, 6).map((feature: string, i: number) => (
                  <div key={i} className="text-xs text-gray-300 bg-red-900/30 px-2 py-1 rounded border border-red-700/30">
                    {String(getBackendValue(feature))}
                  </div>
                ))}
                {versionReqs.deprecated_features.length > 6 && (
                  <div className="text-xs text-red-400">
                    +{versionReqs.deprecated_features.length - 6} more deprecated features
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
                Services ({[...new Set(services)].length})
              </span>
            </div>
            {services.length > 0 ? (
              <div className="space-y-2">
                {[...new Set(services)].slice(0, 4).map((service: unknown, i: number) => (
                  <div key={i} className="text-sm text-gray-300 bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-700/30">
                    {String(getBackendValue(service))}
                  </div>
                ))}
                {[...new Set(services)].length > 4 && (
                  <div className="text-xs text-blue-400 font-medium">
                    +{[...new Set(services)].length - 4} more
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
                Packages ({[...new Set(packages)].length})
              </span>
            </div>
            {packages.length > 0 ? (
              <div className="space-y-2">
                {[...new Set(packages)].slice(0, 4).map((pkg: unknown, i: number) => (
                  <div key={i} className="text-sm text-gray-300 bg-green-900/30 px-3 py-1.5 rounded-lg border border-green-700/30">
                    {String(getBackendValue(pkg))}
                  </div>
                ))}
                {[...new Set(packages)].length > 4 && (
                  <div className="text-xs text-green-400 font-medium">
                    +{[...new Set(packages)].length - 4} more
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
                Files ({[...new Set(files_managed)].length})
              </span>
            </div>
            {files_managed.length > 0 ? (
              <div className="space-y-2">
                {[...new Set(files_managed)].slice(0, 4).map((file: unknown, i: number) => (
                  <div key={i} className="text-sm text-gray-300 bg-purple-900/30 px-3 py-1.5 rounded-lg border border-purple-700/30">
                    {String(getBackendValue(file))}
                  </div>
                ))}
                {[...new Set(files_managed)].length > 4 && (
                  <div className="text-xs text-purple-400 font-medium">
                    +{[...new Set(files_managed)].length - 4} more
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
                  <div className="text-sm text-gray-500 mb-2">Wrapped Cookbooks ({[...new Set(dependencies.wrapped_cookbooks)].length})</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {[...new Set(dependencies.wrapped_cookbooks)].slice(0, 6).map((cookbook: string, i: number) => (
                      <div key={i} className="text-xs text-gray-300 bg-purple-900/30 px-2 py-1 rounded border border-purple-700/30">
                        {String(getBackendValue(cookbook))}
                      </div>
                    ))}
                    {[...new Set(dependencies.wrapped_cookbooks)].length > 6 && (
                      <div className="text-xs text-purple-400">
                        +{[...new Set(dependencies.wrapped_cookbooks)].length - 6} more cookbooks
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

// Ansible Upgrade Section Component - REMOVED for Chef-only UI
// const AnsibleUpgradeSection: React.FC<{ result: BackendAnalysisResponse }> = ({ result }) => {
//   // Component removed for Chef-only UI
// };

// Puppet Resources Section Component - REMOVED for Chef-only UI
// const PuppetResourcesSection: React.FC<{ result: BackendAnalysisResponse }> = ({ result }) => {
//   // Component removed for Chef-only UI
// };

// Configuration Details Section Component
const ConfigurationDetailsSection: React.FC<{ details: string }> = ({ details }) => {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-400/30">
          <Settings size={18} className="text-indigo-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-200">Configuration Details</h3>
      </div>
      
      <div className="relative overflow-hidden rounded-xl border border-gray-600/30 bg-gray-800/30 backdrop-blur-sm shadow-lg">
        <div className="p-4">
          <div className="text-gray-300 leading-relaxed text-sm">
            {details}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent"></div>
      </div>
    </div>
  );
};

// Main Technical Details Tab Component
export const TechnicalDetailsTab: React.FC<TechnicalDetailsTabProps> = ({ result }) => {

  return (
    <div className="space-y-6">
      {/* Primary Purpose Section */}
      {result.functionality?.primary_purpose && (
        <PrimaryPurposeSection functionality={result.functionality} />
      )}

      {/* Managed Resources Section */}
      <ManagedResourcesSection 
        services={result.functionality?.services || []}
        packages={result.functionality?.packages || []}
        files_managed={result.functionality?.files_managed || []}
      />

      {/* Chef Version Requirements Section */}
      {result.version_requirements && (
        <ChefVersionRequirementsSection versionReqs={result.version_requirements} />
      )}

      {/* Key Operations Section */}
      {result.key_operations && result.key_operations.length > 0 && (
        <KeyOperationsSection keyOperations={result.key_operations} />
      )}

      {/* Dependencies Section */}
      {result.dependencies && (
        <DependenciesSection dependencies={result.dependencies} />
      )}

      {/* Configuration Details Section */}
      {result.configuration_details && (
        <ConfigurationDetailsSection details={result.configuration_details} />
      )}
    </div>
  );
};