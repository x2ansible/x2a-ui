import React from 'react';
import { Server, Package, FileCode, Database, Code, Settings } from 'lucide-react';
import { BackendAnalysisResponse } from '../types/BackendTypes';
import { 
  hasBackendData, 
  getVersionRequirements, 
  getKeyOperations,
  getBackendValue 
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
  const functionality = isSalt ? getSaltFunctionality(result) : result.functionality;
  const keyOperations = getKeyOperations(result);

  const chefVersion = getSafeVersion(versionReqs?.chef);
  const rubyVersion = getSafeVersion(versionReqs?.ruby);
  const saltVersion = getSafeVersion(versionReqs?.salt);
  const showVersionBlock = !!(chefVersion || rubyVersion || saltVersion);

  const services = functionality?.services || [];
  const packages = functionality?.packages || [];
  const files_managed = functionality?.files_managed || [];

  // —————————— FIX: Always render all 3 cards (hide empty with invisible) ———————————
  return (
    <div className="space-y-6">
      {/* ...Salt details and other sections unchanged... */}

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
          <div className={`relative overflow-hidden rounded-xl border border-blue-500/30 bg-blue-900/10 backdrop-blur-sm transition-all duration-300 shadow-lg min-w-0
            ${services.length === 0 ? 'invisible' : ''}`}>
            {services.length > 0 && (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-blue-500/20 rounded border border-blue-400/30">
                    <Server size={14} className="text-blue-400" />
                  </div>
                  <span className="text-sm font-medium text-blue-300">
                    Services ({services.length})
                  </span>
                </div>
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
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400/40"></div>
          </div>

          {/* Packages Card */}
          <div className={`relative overflow-hidden rounded-xl border border-green-500/30 bg-green-900/10 backdrop-blur-sm transition-all duration-300 shadow-lg min-w-0
            ${packages.length === 0 ? 'invisible' : ''}`}>
            {packages.length > 0 && (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-green-500/20 rounded border border-green-400/30">
                    <Package size={14} className="text-green-400" />
                  </div>
                  <span className="text-sm font-medium text-green-300">
                    Packages ({packages.length})
                  </span>
                </div>
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
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-400/40"></div>
          </div>

          {/* Files Managed Card */}
          <div className={`relative overflow-hidden rounded-xl border border-yellow-500/30 bg-yellow-900/10 backdrop-blur-sm transition-all duration-300 shadow-lg min-w-0
            ${files_managed.length === 0 ? 'invisible' : ''}`}>
            {files_managed.length > 0 && (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-yellow-500/20 rounded border border-yellow-400/30">
                    <FileCode size={14} className="text-yellow-400" />
                  </div>
                  <span className="text-sm font-medium text-yellow-300">
                    Files ({files_managed.length})
                  </span>
                </div>
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
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400/40"></div>
          </div>
        </div>
      </div>

      {/* ——— Rest of your code below (unchanged, show versions, dependencies, etc.) ——— */}
      {/* ...leave your existing details code for versions, key operations, dependencies, etc. untouched... */}
    </div>
  );
};
