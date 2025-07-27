import React from "react";
import {
  SparklesIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

interface GenerateSidebarProps {
  conversionConfig: {
    targetFormat: string;
    outputStyle: string;
    includeComments: boolean;
    validateSyntax: boolean;
    useHandlers: boolean;
    useRoles: boolean;
    useVars: boolean;
  };
  setConversionConfig: (config: Record<string, unknown>) => void;
  contextSummary?: string | {
    tokens: number;
    docCount: number;
    topics: string[];
  };
  code?: string;
  analysisFiles?: Record<string, string>;
  context?: string;
  classificationResult?: unknown;
  onLogMessage?: (message: string) => void;
  onComplete?: (playbook: string) => void;
}

export default function GenerateSidebar({
  conversionConfig,
  setConversionConfig,
  contextSummary,
  code,
  analysisFiles = {},
}: GenerateSidebarProps) {
  
  // Calculate meaningful stats
  const hasAnalyzedFiles = Object.keys(analysisFiles).length > 0;
  const hasCode = code && code.trim().length > 0;
  const totalFiles = hasAnalyzedFiles ? Object.keys(analysisFiles).length : (hasCode ? 1 : 0);
  
  // Handle contextSummary which can be either a string or an object
  const contextTokens = typeof contextSummary === 'object' ? contextSummary?.tokens || 0 : 0;
  const contextDocs = typeof contextSummary === 'object' ? contextSummary?.docCount || 0 : 0;
  const contextTopics = typeof contextSummary === 'object' ? contextSummary?.topics || [] : [];
  const hasContext = typeof contextSummary === 'string' ? contextSummary.length > 0 : contextTokens > 0;

  const handleToggleOption = (key: string) => {
    setConversionConfig({ 
      ...conversionConfig, 
      [key]: !conversionConfig[key as keyof typeof conversionConfig] 
    });
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-r border-slate-600/30 p-6 space-y-6 overflow-y-auto">
      
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-400 rounded-xl flex items-center justify-center shadow-lg">
          <SparklesIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-white">Generate Ansible</h3>
          <p className="text-xs text-slate-400">Configuration & Status</p>
        </div>
      </div>

      {/* Input Status */}
      <div className="bg-slate-800/40 border border-slate-600/40 rounded-lg p-4">
        <h4 className="text-slate-200 text-sm font-semibold flex items-center space-x-2 mb-3">
          <CheckCircleIcon className="w-4 h-4 text-green-400" />
          <span>Input Status</span>
        </h4>
        
        <div className="space-y-3">
          {/* Files Status */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Files to Convert:</span>
            <span className="text-xs font-medium text-slate-200">
              {totalFiles} {totalFiles === 1 ? 'file' : 'files'}
            </span>
          </div>
          
          {/* Context Status */}
          {hasContext && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Context Available:</span>
              <span className="text-xs font-medium text-slate-200">
                {typeof contextSummary === 'object' 
                  ? `${contextDocs} docs, ${contextTokens} tokens`
                  : 'Context loaded'
                }
              </span>
            </div>
          )}
          
          {/* Technology Type */}
          {hasAnalyzedFiles && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Source Type:</span>
              <span className="text-xs font-medium text-slate-200">
                {Object.keys(analysisFiles).some(f => f.includes('chef')) ? 'Chef' :
                 Object.keys(analysisFiles).some(f => f.includes('puppet')) ? 'Puppet' :
                 Object.keys(analysisFiles).some(f => f.includes('salt')) ? 'Salt' :
                 'Configuration'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Generation Options */}
      <div className="bg-slate-800/40 border border-slate-600/40 rounded-lg p-4">
        <h4 className="text-slate-200 text-sm font-semibold flex items-center space-x-2 mb-3">
          <InformationCircleIcon className="w-4 h-4 text-blue-400" />
          <span>Generation Options</span>
        </h4>
        
        <div className="space-y-3">
          {/* Output Style */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Output Style</label>
            <select
              value={conversionConfig.outputStyle}
              onChange={(e) => setConversionConfig({ ...conversionConfig, outputStyle: e.target.value })}
              className="w-full p-2 text-xs rounded-lg border border-slate-600 bg-slate-700 text-slate-100"
            >
              <option value="minimal">Minimal - Basic playbook</option>
              <option value="detailed">Detailed - With comments & structure</option>
              <option value="enterprise">Enterprise - Production-ready</option>
            </select>
          </div>

          {/* Quality Options */}
          <div className="space-y-2">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={conversionConfig.includeComments}
                onChange={() => handleToggleOption('includeComments')}
                className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600 rounded"
              />
              <span className="text-xs text-slate-300">Include helpful comments</span>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={conversionConfig.validateSyntax}
                onChange={() => handleToggleOption('validateSyntax')}
                className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600 rounded"
              />
              <span className="text-xs text-slate-300">Validate YAML syntax</span>
            </label>
          </div>
        </div>
      </div>

      {/* Context Summary */}
      {hasContext && typeof contextSummary === 'object' && contextTokens > 0 && (
        <div className="bg-slate-800/40 border border-slate-600/40 rounded-lg p-4">
          <h4 className="text-slate-200 text-sm font-semibold flex items-center space-x-2 mb-3">
            <InformationCircleIcon className="w-4 h-4 text-purple-400" />
            <span>Context Information</span>
          </h4>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Relevant documents:</span>
              <span className="text-slate-200 font-medium">{contextDocs}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Context tokens:</span>
              <span className="text-slate-200 font-medium">{contextTokens}</span>
            </div>
            {contextTopics.length > 0 && (
              <div className="pt-2 border-t border-slate-600/30">
                <span className="text-slate-400">Key topics:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {contextTopics.slice(0, 4).map((topic, index) => (
                    <span 
                      key={index}
                      className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded text-xs"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="border-t border-slate-600/30 pt-4">
        <div className="flex items-center space-x-2 text-xs text-slate-400 mb-2">
          <ExclamationTriangleIcon className="w-4 h-4" />
          <span>Need help?</span>
        </div>
        <div className="space-y-1 text-xs">
          <a
            href="https://docs.ansible.com/ansible/latest/playbook_guide/index.html"
            target="_blank"
            rel="noreferrer"
            className="text-blue-300 hover:text-blue-200 underline block"
          >
            Ansible Playbook Guide
          </a>
          <a
            href="https://docs.ansible.com/ansible/latest/user_guide/playbooks_best_practices.html"
            target="_blank"
            rel="noreferrer"
            className="text-blue-300 hover:text-blue-200 underline block"
          >
            Best Practices
          </a>
        </div>
      </div>
    </div>
  );
}
