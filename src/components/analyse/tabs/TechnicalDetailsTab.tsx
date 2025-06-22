import React from 'react';
import { Server, Package, FileCode, Database, Code } from 'lucide-react';
import { BackendAnalysisResponse } from '../types/BackendTypes';
import { getBackendValue, hasBackendData, formatArray, getVersionRequirements } from '../utils/backendUtils';

interface TechnicalDetailsTabProps {
  result: BackendAnalysisResponse;
}

export const TechnicalDetailsTab: React.FC<TechnicalDetailsTabProps> = ({ result }) => {
  const versionReqs = getVersionRequirements(result);
  const functionality = result.functionality;

  // Determine if at least one version field is populated meaningfully
  const chefShown = !!(versionReqs?.chef && versionReqs.chef !== 'Not specified');
  const rubyShown = !!(versionReqs?.ruby && versionReqs.ruby !== 'Not specified');
  const showVersionBlock = chefShown || rubyShown;

  return (
    <div className="space-y-6">
      
      {/* What This Code Does */}
      <div>
        <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <Code size={18} />
          Functionality
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Services */}
          {functionality?.services && functionality.services.length > 0 && (
            <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Server size={16} className="text-blue-400" />
                <span className="text-sm font-medium text-blue-300">
                  Services ({functionality.services.length})
                </span>
              </div>
              <div className="space-y-1">
                {functionality.services.map((service, i) => (
                  <div key={i} className="text-sm text-gray-300 bg-blue-900/30 px-2 py-1 rounded">
                    {service}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Packages */}
          {functionality?.packages && functionality.packages.length > 0 && (
            <div className="bg-green-900/20 rounded-lg p-4 border border-green-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Package size={16} className="text-green-400" />
                <span className="text-sm font-medium text-green-300">
                  Packages ({functionality.packages.length})
                </span>
              </div>
              <div className="space-y-1">
                {functionality.packages.map((pkg, i) => (
                  <div key={i} className="text-sm text-gray-300 bg-green-900/30 px-2 py-1 rounded">
                    {pkg}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Files Managed */}
          {functionality?.files_managed && functionality.files_managed.length > 0 && (
            <div className="bg-yellow-900/20 rounded-lg p-4 border border-yellow-500/30">
              <div className="flex items-center gap-2 mb-3">
                <FileCode size={16} className="text-yellow-400" />
                <span className="text-sm font-medium text-yellow-300">
                  Files ({functionality.files_managed.length})
                </span>
              </div>
              <div className="space-y-1">
                {functionality.files_managed.map((file, i) => (
                  <div key={i} className="text-xs text-gray-300 bg-yellow-900/30 px-2 py-1 rounded font-mono break-all">
                    {file}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Additional Functionality Details */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {functionality?.reusability && (
            <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50">
              <div className="text-sm text-gray-500 mb-1">Reusability</div>
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                functionality.reusability === 'HIGH' ? 'bg-green-900/30 text-green-400' :
                functionality.reusability === 'MEDIUM' ? 'bg-yellow-900/30 text-yellow-400' :
                'bg-red-900/30 text-red-400'
              }`}>
                {functionality.reusability}
              </div>
            </div>
          )}
          {functionality?.customization_points && functionality.customization_points.length > 0 && (
            <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50">
              <div className="text-sm text-gray-500 mb-2">Customization Points</div>
              <div className="space-y-1">
                {functionality.customization_points.map((point, i) => (
                  <div key={i} className="text-xs text-gray-400 bg-gray-900/50 px-2 py-1 rounded">
                    {point}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Version Requirements (Chef/Ruby) */}
      {showVersionBlock && (
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <Database size={18} />
            Version Requirements
          </h3>
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {chefShown && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Chef Version</div>
                  <div className="text-gray-300 font-mono bg-gray-900/50 px-3 py-2 rounded">
                    {versionReqs.chef}
                  </div>
                </div>
              )}
              {rubyShown && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Ruby Version</div>
                  <div className="text-gray-300 font-mono bg-gray-900/50 px-3 py-2 rounded">
                    {versionReqs.ruby}
                  </div>
                </div>
              )}
            </div>
            {versionReqs.deprecated.length > 0 && (
              <div className="pt-4 border-t border-gray-700/50">
                <div className="text-sm text-gray-500 mb-2">Deprecated Features</div>
                <div className="space-y-1">
                  {versionReqs.deprecated.map((feature, i) => (
                    <div key={i} className="text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded border-l-2 border-red-500">
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dependencies */}
      {hasBackendData(result.dependencies) && (
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-3">Dependencies</h3>
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3">
            <div className="text-amber-300 text-sm whitespace-pre-line">
              {typeof result.dependencies === 'string' 
                ? result.dependencies 
                : JSON.stringify(result.dependencies, null, 2)}
            </div>
          </div>
        </div>
      )}

      {/* Configuration Details */}
      {hasBackendData(result.configuration_details) && (
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-3">Configuration</h3>
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
            <div className="text-purple-300 text-sm whitespace-pre-line">
              {result.configuration_details}
            </div>
          </div>
        </div>
      )}

      {/* Key Operations */}
      {result.key_operations && result.key_operations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-3">Key Operations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {result.key_operations.map((operation, i) => (
              <div key={i} className="bg-gray-800/50 rounded-lg p-2 border border-gray-700/30">
                <div className="text-sm text-gray-300">{operation}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Technical Data */}
      {!functionality?.services?.length && 
       !functionality?.packages?.length && 
       !functionality?.files_managed?.length && 
       !showVersionBlock &&
       !hasBackendData(result.dependencies) && (
        <div className="text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <Database size={48} className="mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">No detailed technical information available</p>
          <p className="text-sm text-gray-500 mt-1">
            Backend analysis did not provide technical details
          </p>
        </div>
      )}
    </div>
  );
};
