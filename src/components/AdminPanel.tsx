"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Save,
  RotateCcw,
  Eye,
  Edit3,
  Brain,
  Code,
  Shield,
  FileText,
  Layers,
  AlertCircle,
  CheckCircle,
  Copy,
  Download,
  RefreshCw,
  Lock,
  Info,
} from "lucide-react";
import { useAdminConfig, type AgentConfig, type CreateAgentRequest } from "../hooks/useAdminConfig";
import { CreateAgentModal } from "./CreateAgentModal";

// Agent metadata (icons and descriptions)
const AGENT_METADATA: Record<
  string,
  {
    name: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    description: string;
    color: string;
  }
> = {
  chef_analysis_chaining: {
    name: "Chef Analysis Agent",
    icon: Brain,
    description: "Analyzes Chef cookbooks with prompt chaining",
    color: "from-orange-500 to-red-400",
  },
  context: {
    name: "Context Agent",
    icon: Layers,
    description: "Retrieves relevant context from vector database using RAG",
    color: "from-purple-500 to-violet-400",
  },
  generate: {
    name: "Code Generator Agent",
    icon: Code,
    description: "Converts infrastructure code to Ansible playbooks",
    color: "from-green-500 to-emerald-400",
  },
  validate: {
    name: "Validation Agent",
    icon: Shield,
    description: "Validates Ansible playbooks using custom linting tools",
    color: "from-blue-500 to-cyan-400",
  },
};

type SaveStatus = "saving" | "success" | "error" | null;

const AdminPanel: React.FC = () => {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [selectedAgentName, setSelectedAgentName] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editedInstructions, setEditedInstructions] = useState<string>("");
  const [unsavedChanges, setUnsavedChanges] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [systemInfo, setSystemInfo] = useState<any>(null);

  // Use the admin config hook
  const {
    loading,
    error,
    clearError,
    getAgentConfigs,
    getAgentConfig,
    updateAgent,
    reloadConfigs,
    exportConfig,
    createAgent,
    refreshAgents,
    getSystemInfo,
  } = useAdminConfig();

  // Load agent configurations
  useEffect(() => {
    loadAgentConfigs();
    loadSystemInfo();
    // eslint-disable-next-line
  }, []);

  // Update selected agent when agents list changes
  useEffect(() => {
    if (agents.length > 0) {
      const defaultAgentName = selectedAgentName || agents[0].agent_config.name;
      setSelectedAgentName(defaultAgentName);
    }
  }, [agents, selectedAgentName]);

  // Load agent instructions when selected agent changes
  useEffect(() => {
    if (selectedAgentName) {
      loadAgentInstructions(selectedAgentName);
    }
  }, [selectedAgentName]);

  const loadAgentConfigs = async (): Promise<void> => {
    try {
      clearError();
      const agentsData = await getAgentConfigs();
      setAgents(agentsData);
      if (!selectedAgentName && agentsData.length > 0) {
        setSelectedAgentName(agentsData[0].agent_config.name);
      }
    } catch (err) {
      console.error("Failed to load agent configs:", err);
    }
  };

  const loadSystemInfo = async (): Promise<void> => {
    try {
      const info = await getSystemInfo();
      setSystemInfo(info);
    } catch (err) {
      console.warn("Could not load system info:", err);
    }
  };

  const loadAgentInstructions = async (agentName: string): Promise<void> => {
    try {
      // Try to get detailed agent config with instructions
      const agentDetail = await getAgentConfig(agentName);
      setEditedInstructions(agentDetail.agent_config.instructions || "");
      setUnsavedChanges(false);
    } catch (err) {
      console.warn(`Could not load instructions for ${agentName}:`, err);
      // Fallback to empty instructions
      setEditedInstructions("");
      setUnsavedChanges(false);
    }
  };

  const handleInstructionsChange = (value: string): void => {
    setEditedInstructions(value);
    const currentAgent = agents.find((a) => a.agent_config.name === selectedAgentName);
    setUnsavedChanges(value !== (currentAgent?.agent_config.instructions || ""));
  };

  const saveChanges = async (): Promise<void> => {
    if (!selectedAgentName) return;
    
    try {
      setSaveStatus("saving");
      setIsLocked(true);
      clearError();

      // Note: Your backend doesn't seem to have update functionality
      // This will likely fail unless you implement update in your backend
      const updateRequest: CreateAgentRequest = {
        name: selectedAgentName,
        model: "meta-llama/Llama-3.1-8B-Instruct",
        instructions: editedInstructions,
        tools: [],
      };
      
      await updateAgent(selectedAgentName, updateRequest);

      // Refresh agent list
      await loadAgentConfigs();

      setUnsavedChanges(false);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error("Save failed:", err);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 5000);
    } finally {
      setIsLocked(false);
    }
  };

  const resetChanges = (): void => {
    const currentAgent = agents.find((a) => a.agent_config.name === selectedAgentName);
    setEditedInstructions(currentAgent?.agent_config.instructions || "");
    setUnsavedChanges(false);
  };

  const copyInstructions = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(editedInstructions);
    } catch (err) {
      console.warn("Copy failed:", err);
    }
  };

  const exportConfiguration = async (): Promise<void> => {
    try {
      await exportConfig();
    } catch (err) {
      console.warn("Export failed:", err);
    }
  };

  const reloadConfiguration = async (): Promise<void> => {
    try {
      clearError();
      await refreshAgents();
      await loadAgentConfigs();
    } catch (err) {
      console.error("Reload failed:", err);
    }
  };

  // Handle creation of new agent from modal
  const handleCreateAgent = async (agentRequest: CreateAgentRequest) => {
    await createAgent(agentRequest);
    await loadAgentConfigs();
  };

  if (loading && agents.length === 0) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Loading agent configurations...</p>
        </div>
      </div>
    );
  }

  if (error && agents.length === 0) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
          <p className="text-red-300 mb-4">Failed to load configurations</p>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          <button
            onClick={loadAgentConfigs}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const currentAgent = agents.find((a) => a.agent_config.name === selectedAgentName);
  const agentMeta = selectedAgentName && AGENT_METADATA[selectedAgentName]
    ? AGENT_METADATA[selectedAgentName]
    : {};

  const AgentIcon = agentMeta.icon || Brain;

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex">
      {/* Sidebar */}
      <div className="w-80 bg-slate-800/50 border-r border-slate-600/30 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-600/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Agent Admin</h1>
              <p className="text-xs text-slate-400">Manage AI Agent Configurations</p>
            </div>
          </div>

          {/* System Info */}
          {systemInfo && (
            <div className="mb-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
              <div className="flex items-center gap-2 mb-2">
                <Info size={14} className="text-blue-400" />
                <span className="text-xs font-medium text-slate-300">System Status</span>
              </div>
              <div className="text-xs text-slate-400 space-y-1">
                <div>Registered: {systemInfo.registered_agents || 0} agents</div>
                <div>LlamaStack: {systemInfo.llamastack_url ? "Connected" : "Unknown"}</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={reloadConfiguration}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs transition-colors border border-slate-600/30"
              title="Reload agents"
            >
              <RefreshCw size={14} />
              Reload
            </button>
            <button
              onClick={exportConfiguration}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs transition-colors border border-slate-600/30"
            >
              <Download size={14} />
              Export
            </button>
          </div>
          <div className="pt-2 flex justify-center">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium transition-colors"
            >
              + New Agent
            </button>
          </div>
        </div>

        {/* Agent List */}
        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          {agents.map((agent) => {
            const agentName = agent.agent_config.name;
            const meta = agentName && AGENT_METADATA[agentName] ? AGENT_METADATA[agentName] : {};
            const IconComponent = meta.icon || Brain;
            const isSelected = selectedAgentName === agentName;
            
            return (
              <button
                key={agent.agent_id || agentName}
                onClick={() => setSelectedAgentName(agentName)}
                className={`w-full p-4 rounded-xl text-left transition-all border ${
                  isSelected
                    ? "bg-blue-900/50 border-blue-500/50 shadow-lg"
                    : "bg-slate-800/30 border-slate-700/50 hover:bg-slate-700/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${
                      meta.color || "from-gray-500 to-gray-600"
                    }`}
                  >
                    <IconComponent size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm text-white truncate">
                        {meta.name || agentName || "Unknown Agent"}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {meta.description || "AI Agent"}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-slate-500">
                        {agent.agent_config.model}
                      </span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-slate-500">
                        {agent.status || "active"}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-600/30 bg-slate-800/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br ${
                  agentMeta.color || "from-gray-500 to-gray-600"
                }`}
              >
                <AgentIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {agentMeta.name || selectedAgentName || "No Agent Selected"}
                </h2>
                <p className="text-slate-400 mt-1">
                  {agentMeta.description || "AI Agent Configuration"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-900/50 text-red-400 border border-red-500/30 rounded-lg text-sm">
                  <AlertCircle size={16} />
                  <span className="max-w-xs truncate">{error}</span>
                </div>
              )}

              {saveStatus && (
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    saveStatus === "success"
                      ? "bg-green-900/50 text-green-400 border border-green-500/30"
                      : saveStatus === "error"
                      ? "bg-red-900/50 text-red-400 border border-red-500/30"
                      : "bg-blue-900/50 text-blue-400 border border-blue-500/30"
                  }`}
                >
                  {saveStatus === "saving" && (
                    <RefreshCw size={16} className="animate-spin" />
                  )}
                  {saveStatus === "success" && <CheckCircle size={16} />}
                  {saveStatus === "error" && <AlertCircle size={16} />}
                  {saveStatus === "saving"
                    ? "Saving..."
                    : saveStatus === "success"
                    ? "Saved Successfully!"
                    : "Save Failed (Update not implemented)"}
                </div>
              )}

              {isLocked && (
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-900/50 text-orange-400 border border-orange-500/30 rounded-lg text-sm">
                  <Lock size={16} />
                  <span>Locked</span>
                </div>
              )}

              {/* Back Button */}
              <button
                onClick={() => {
                  const urlParams = new URLSearchParams(window.location.search);
                  const fromWorkflow = urlParams.get("from") || "x2ansible";
                  window.location.href = `/run?workflow=${fromWorkflow}`;
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white border border-slate-600/30 rounded-lg transition-colors"
              >
                <RotateCcw size={16} />
                Back
              </button>

              <button
                onClick={() => setEditMode(!editMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  editMode
                    ? "bg-orange-900/50 text-orange-400 border border-orange-500/30"
                    : "bg-slate-700/50 text-slate-300 border border-slate-600/30 hover:bg-slate-700"
                }`}
              >
                {editMode ? <Eye size={16} /> : <Edit3 size={16} />}
                {editMode ? "Preview" : "Edit"}
              </button>

              {editMode && (
                <>
                  <button
                    onClick={resetChanges}
                    disabled={!unsavedChanges || isLocked}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg transition-colors border border-slate-600/30"
                  >
                    <RotateCcw size={16} />
                    Reset
                  </button>

                  <button
                    onClick={saveChanges}
                    disabled={
                      !unsavedChanges || saveStatus === "saving" || isLocked
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors shadow-md"
                    title="Note: Update functionality may not be implemented in backend"
                  >
                    <Save size={16} />
                    Save Changes
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Agent Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <div className="text-xs text-slate-500 mb-1">Model</div>
              <div className="text-sm font-semibold text-blue-400">
                {currentAgent?.agent_config.model || "unknown"}
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <div className="text-xs text-slate-500 mb-1">Status</div>
              <div className="text-sm font-semibold text-slate-300">
                {currentAgent?.status || "unknown"}
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <div className="text-xs text-slate-500 mb-1">Instructions</div>
              <div className="text-sm font-semibold text-slate-300">
                {editedInstructions.length.toLocaleString()} chars
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <div className="text-xs text-slate-500 mb-1">Agent ID</div>
              <div className="text-xs text-slate-400 break-all">
                {currentAgent?.agent_id || "unknown"}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions Editor/Viewer */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="h-full bg-slate-900 rounded-xl border border-slate-700/50 overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-700/50 bg-slate-800/30">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-200">
                  Agent Instructions
                </h3>
                <div className="flex items-center gap-2">
                  {unsavedChanges && (
                    <div className="flex items-center gap-1 text-xs text-orange-400">
                      <AlertCircle size={12} />
                      Unsaved changes
                    </div>
                  )}
                  <button
                    onClick={copyInstructions}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700/50 hover:bg-slate-700 rounded border border-slate-600/30 text-slate-300 transition-colors"
                  >
                    <Copy size={12} />
                    Copy
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="h-full p-4 overflow-y-auto">
              {editMode ? (
                <textarea
                  value={editedInstructions}
                  onChange={(e) =>
                    handleInstructionsChange(e.target.value)
                  }
                  className="w-full h-full bg-transparent text-slate-200 font-mono text-sm resize-none outline-none leading-relaxed"
                  placeholder="Enter agent instructions..."
                  spellCheck={false}
                  disabled={isLocked}
                />
              ) : (
                <div className="prose prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-slate-200 font-mono text-sm leading-relaxed bg-transparent">
                    {editedInstructions || "No instructions available. Instructions may need to be loaded separately or may not be accessible through the current API."}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* New Agent Modal */}
      <CreateAgentModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateAgent}
      />
    </div>
  );
};

export default AdminPanel;