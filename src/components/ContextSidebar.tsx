import React, { useEffect, useState } from "react";
import { 
  CircleStackIcon, 
  CloudArrowUpIcon, 
  Cog6ToothIcon, 
  DocumentPlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

interface ContextSidebarProps {
  vectorDbId: string;
  contextConfig?: {
    includeComments: boolean;
    analyzeDependencies: boolean;
    environmentType: 'development' | 'staging' | 'production';
    scanDepth: 'shallow' | 'medium' | 'deep';
  };
  setContextConfig?: React.Dispatch<React.SetStateAction<{
    includeComments: boolean;
    analyzeDependencies: boolean;
    environmentType: 'development' | 'staging' | 'production';
    scanDepth: 'shallow' | 'medium' | 'deep';
  }>>;
  onDocUploaded?: () => void;
  onDatabaseChange?: (dbId: string) => void; // NEW: Add this prop
}

export default function ContextSidebar({ 
  vectorDbId, 
  contextConfig, 
  setContextConfig, 
  onDocUploaded,
  onDatabaseChange // NEW: Add this prop
}: ContextSidebarProps) {
  const [vectorDbs, setVectorDbs] = useState<Record<string, unknown>[]>([]);
  const [currentVectorDb, setCurrentVectorDb] = useState<Record<string, unknown> | null>(null);
  const [selectedDbId, setSelectedDbId] = useState<string>(vectorDbId);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Fetch vector DB info
  useEffect(() => {
    async function fetchVectorDbs() {
      setLoading(true);
      setError(null);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_VECTOR_DB_LIST_API || "/api/vector-db/list";
        console.log("🔗 Fetching vector DBs from:", apiUrl);
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log("📊 Vector DBs received:", data);
        
        const dbArray = Array.isArray(data) ? data : [];
        setVectorDbs(dbArray);
        
        // Smart default selection
        let defaultDbId = vectorDbId;
        
        // Try to find the requested database
        const requestedDb = dbArray.find((db: Record<string, unknown>) => 
          (db.identifier as string) === vectorDbId || 
          (db.provider_resource_id as string) === vectorDbId ||
          (db.vector_db_id as string) === vectorDbId
        );
        
        if (!requestedDb && dbArray.length > 0) {
          // Find default database or use first available
          const defaultDb = dbArray.find((db: Record<string, unknown>) => 
            (db.is_default as boolean) === true || 
            (db.default as boolean) === true ||
            (db.active as boolean) === true ||
            (db.identifier as string) === 'iac'
          ) || dbArray[0];
          
          defaultDbId = (defaultDb.identifier as string) || (defaultDb.vector_db_id as string) || (defaultDb.provider_resource_id as string);
        }
        
        setSelectedDbId(defaultDbId);
        
        // Find and set current database
        const currentDb = dbArray.find((db: Record<string, unknown>) => 
          (db.identifier as string) === defaultDbId || 
          (db.provider_resource_id as string) === defaultDbId ||
          (db.vector_db_id as string) === defaultDbId
        );
        
        setCurrentVectorDb(currentDb || null);
        console.log("🎯 Selected DB:", currentDb);
        
      } catch (err) {
        console.error("Failed to fetch vector DBs:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch knowledge base");
        
        // Fallback: Set a default database when API fails
        const fallbackDb = {
          identifier: vectorDbId,
          embedding_model: 'Unknown',
          embedding_dimension: 'Unknown',
          provider_id: 'Unknown'
        };
        setCurrentVectorDb(fallbackDb);
        setSelectedDbId(vectorDbId);
        
        // Also set a fallback for the dropdown
        setVectorDbs([fallbackDb]);
      } finally {
        setLoading(false);
      }
    }
    fetchVectorDbs();
  }, [vectorDbId]);

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a conversion pattern file");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Use environment variable for ingest endpoint
      const ingestUrl = process.env.NEXT_PUBLIC_CONTEXT_INGEST_API || "/api/context/ingest";
      console.log("📤 Uploading to:", ingestUrl);

      const response = await fetch(ingestUrl, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setSuccess("Conversion pattern added successfully!");
        setFile(null);
        if (onDocUploaded) {
          onDocUploaded();
        }
        setTimeout(() => setSuccess(null), 4000);
      } else {
        const errorText = `Upload failed with status ${response.status}`;
        throw new Error(errorText);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      setError(err instanceof Error ? err.message : "Failed to add conversion pattern");
    } finally {
      setUploading(false);
    }
  };

  const handleConfigChange = (key: string, value: unknown) => {
    if (setContextConfig && contextConfig) {
      setContextConfig({
        ...contextConfig,
        [key]: value
      });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const getScanDepthColor = (depth: string) => {
    switch (depth) {
      case 'shallow': return 'from-yellow-500 to-orange-400';
      case 'deep': return 'from-purple-500 to-pink-400';
      default: return 'from-blue-500 to-cyan-400';
    }
  };

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case 'production': return 'from-red-500 to-pink-400';
      case 'staging': return 'from-yellow-500 to-orange-400';
      default: return 'from-green-500 to-emerald-400';
    }
  };

  // Handle database selection change
  const handleDbChange = (newDbId: string) => {
    setSelectedDbId(newDbId);
    const newDb = vectorDbs.find((db: Record<string, unknown>) => 
      (db.identifier as string) === newDbId || 
      (db.provider_resource_id as string) === newDbId ||
      (db.vector_db_id as string) === newDbId
    );
    setCurrentVectorDb(newDb || null);
    
    // NEW: Notify parent of database change
    if (onDatabaseChange) {
      onDatabaseChange(newDbId);
    }
  };

  // Also notify parent when the initial database is set
  useEffect(() => {
    if (selectedDbId && onDatabaseChange) {
      onDatabaseChange(selectedDbId);
    }
  }, [selectedDbId, onDatabaseChange]);

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-r border-slate-600/30">
      <div className="p-6 space-y-6 h-full overflow-y-auto context-sidebar-scrollbar">
        {/* Header */}
        <div className="relative">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-400 rounded-xl flex items-center justify-center shadow-lg">
              <CircleStackIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">Knowledge Base</h3>
              <p className="text-xs text-slate-400">IaC Conversion Patterns</p>
            </div>
          </div>
        </div>

        {/* Knowledge Base Selector */}
        {vectorDbs.length > 0 && (
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
            <div className="flex items-center space-x-2 mb-3">
              <CircleStackIcon className="w-4 h-4 text-slate-400" />
              <h4 className="font-semibold text-slate-200 text-sm">Select Knowledge Base</h4>
            </div>
            
            <select
              value={selectedDbId}
              onChange={(e) => handleDbChange(e.target.value)}
              className="w-full p-2 text-xs rounded-lg border border-slate-600/50 bg-slate-700/50 text-slate-200 focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/25 transition-colors"
            >
              {vectorDbs.map((db) => (
                <option key={db.identifier as string} value={db.identifier as string}>
                  {db.identifier as string} {(db.is_default as boolean) ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Vector Database Status */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-200 text-sm flex items-center space-x-2">
              <CircleStackIcon className="w-4 h-4" />
              <span>Active Knowledge Base</span>
            </h4>
            {loading && (
              <div className="w-4 h-4 border-2 border-slate-400/30 border-t-blue-400 rounded-full animate-spin"></div>
            )}
          </div>
          
          {currentVectorDb ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">ID:</span>
                <span className="text-xs text-slate-200 font-mono bg-slate-700/50 px-2 py-1 rounded">
                  {(currentVectorDb.identifier as string) || selectedDbId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Model:</span>
                <span className="text-xs text-blue-300">{currentVectorDb.embedding_model as string}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Dimensions:</span>
                <span className="text-xs text-cyan-300">{currentVectorDb.embedding_dimension as string}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Provider:</span>
                <span className="text-xs text-green-300">{currentVectorDb.provider_id as string}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 text-center py-2">
              {loading ? "Loading knowledge base..." : "Knowledge base not found"}
            </div>
          )}
        </div>

        {/* Context Configuration */}
        {contextConfig && setContextConfig && (
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
            <div className="flex items-center space-x-2 mb-4">
              <Cog6ToothIcon className="w-4 h-4 text-slate-400" />
              <h4 className="font-semibold text-slate-200 text-sm">Discovery Settings</h4>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Environment</label>
                <select
                  value={contextConfig.environmentType || 'development'}
                  onChange={(e) => handleConfigChange('environmentType', e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border border-slate-600/50 bg-slate-700/50 text-slate-200 focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/25 transition-colors"
                >
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
                <div className={`mt-1 h-1 rounded-full bg-gradient-to-r ${getEnvironmentColor(contextConfig.environmentType || 'development')}`}></div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Search Depth</label>
                <select
                  value={contextConfig.scanDepth || 'medium'}
                  onChange={(e) => handleConfigChange('scanDepth', e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border border-slate-600/50 bg-slate-700/50 text-slate-200 focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/25 transition-colors"
                >
                  <option value="shallow">Shallow (3 patterns)</option>
                  <option value="medium">Medium (5 patterns)</option>
                  <option value="deep">Deep (10 patterns)</option>
                </select>
                <div className={`mt-1 h-1 rounded-full bg-gradient-to-r ${getScanDepthColor(contextConfig.scanDepth || 'medium')}`}></div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={contextConfig.includeComments || false}
                    onChange={(e) => handleConfigChange('includeComments', e.target.checked)}
                    className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600 rounded focus:ring-blue-400/25 focus:ring-2"
                  />
                  <span className="text-xs text-slate-300 group-hover:text-white transition-colors">Include Comments</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={contextConfig.analyzeDependencies || false}
                    onChange={(e) => handleConfigChange('analyzeDependencies', e.target.checked)}
                    className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600 rounded focus:ring-blue-400/25 focus:ring-2"
                  />
                  <span className="text-xs text-slate-300 group-hover:text-white transition-colors">Analyze Dependencies</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Document Upload */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
          <div className="flex items-center space-x-2 mb-4">
            <DocumentPlusIcon className="w-4 h-4 text-slate-400" />
            <h4 className="font-semibold text-slate-200 text-sm">Add Conversion Patterns</h4>
          </div>
          
          {/* Drag and Drop Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 ${
              dragActive 
                ? 'border-blue-400 bg-blue-500/10' 
                : 'border-slate-600/50 hover:border-slate-500'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".txt,.md,.yaml,.yml,.json,.py,.js,.ts,.tf,.pp,.rb,.sh"
              disabled={uploading}
            />
            
            <div className="space-y-2">
              <CloudArrowUpIcon className={`w-8 h-8 mx-auto ${dragActive ? 'text-blue-400' : 'text-slate-400'} transition-colors`} />
              <div>
                <p className="text-sm font-medium text-slate-300">
                  {file ? file.name : 'Drop conversion patterns here'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  or click to browse files
                </p>
              </div>
              <div className="text-xs text-slate-500">
                Supports: Chef, Puppet, Shell, Terraform, YAML
              </div>
            </div>
          </div>
          
          {/* Upload Button */}
          <button
            className={`w-full mt-4 py-3 rounded-lg font-medium text-sm transition-all duration-300 transform ${
              uploading 
                ? "bg-gradient-to-r from-blue-500/50 to-cyan-500/50 cursor-not-allowed scale-95" 
                : !file
                ? "bg-gradient-to-r from-slate-600 to-slate-700 cursor-not-allowed text-slate-400"
                : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 hover:scale-105 text-white shadow-lg"
            }`}
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            <div className="flex items-center justify-center space-x-2">
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Adding Pattern...</span>
                </>
              ) : (
                <>
                  <CloudArrowUpIcon className="w-4 h-4" />
                  <span>Add to Knowledge Base</span>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-300 font-medium text-sm">Connection Failed</p>
                <p className="text-red-400/80 text-xs mt-1">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-green-300 font-medium text-sm">Success!</p>
                <p className="text-green-400/80 text-xs mt-1">{success}</p>
              </div>
              <button 
                onClick={() => setSuccess(null)}
                className="text-green-400 hover:text-green-300 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Knowledge Base Stats */}
        {vectorDbs.length > 0 && (
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
            <div className="flex items-center space-x-2 mb-3">
              <CircleStackIcon className="w-4 h-4 text-slate-400" />
              <h4 className="font-semibold text-slate-200 text-sm">Available Knowledge Bases</h4>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Total Databases:</span>
                <span className="text-xs font-medium text-blue-300">{vectorDbs.length}</span>
              </div>
              
              {/* Preview of available databases */}
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {vectorDbs.slice(0, 3).map((db, i) => (
                  <div key={i} className="flex items-center space-x-2 text-xs">
                    <div className={`w-2 h-2 rounded-full ${
                      db.identifier === selectedDbId ? 'bg-green-400' : 'bg-slate-500'
                    }`}></div>
                    <span className={`font-mono truncate ${
                      db.identifier === selectedDbId ? 'text-green-300' : 'text-slate-400'
                    }`}>
                      {db.identifier as string}
                    </span>
                  </div>
                ))}
                {vectorDbs.length > 3 && (
                  <div className="text-xs text-slate-500 italic">
                    ...{vectorDbs.length - 3} more
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}