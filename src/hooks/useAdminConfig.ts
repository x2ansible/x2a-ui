"use client";

import { useState, useCallback } from "react";

// API base
const API_BASE = "/api/admin";

// LlamaStack agent config shape (matches your backend)
export interface AgentConfig {
  agent_id?: string;
  agent_config: {
    sampling_params?: any;
    input_shields?: any[];
    output_shields?: any[];
    toolgroups?: any[];
    client_tools?: any[];
    tool_choice?: string | null;
    tool_prompt_format?: string | null;
    tool_config?: any;
    max_infer_iters?: number;
    model: string;
    instructions: string;
    name?: string | null;
    enable_session_persistence?: boolean;
    response_format?: string | null;
    [key: string]: any; // for extension
  };
  created_at?: string;
}

export interface AgentsResponse {
  agents: AgentConfig[];
  has_more?: boolean;
}

export interface ApiError {
  error: string;
  detail?: string;
}

export const useAdminConfig = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // List all agents
  const getAgentConfigs = useCallback(async (): Promise<AgentConfig[]> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/agents`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.error || `HTTP ${res.status}`);
      }
      const data: AgentsResponse = await res.json();
      return data.agents;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get a single agent
  const getAgentConfig = useCallback(async (agentId: string): Promise<AgentConfig> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/agents/${agentId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create agent
  const createAgent = useCallback(
    async (agentConfig: AgentConfig["agent_config"]): Promise<AgentConfig> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/agents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent_config: agentConfig }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || err.error || `HTTP ${res.status}`);
        }
        return await res.json();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Delete agent
  const deleteAgent = useCallback(async (agentId: string): Promise<{ success: boolean; agent_id: string }> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/agents/${agentId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // "Update" agent: delete and create (optional helper)
  const updateAgent = useCallback(
    async (agentId: string, agentConfig: AgentConfig["agent_config"]): Promise<AgentConfig> => {
      // Delete, then re-create (same as "update" for LlamaStack)
      await deleteAgent(agentId);
      return await createAgent(agentConfig);
    },
    [deleteAgent, createAgent]
  );

  // Optionally, support export (see previous answers; only if backend supports it)
  const exportConfig = useCallback(async (): Promise<void> => {
    setError(null);
    const res = await fetch(`${API_BASE}/agents/export`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agent-config-${new Date().toISOString().split("T")[0]}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, []);

  // "Reload" just re-fetches agent list; legacy for UI
  const reloadConfigs = getAgentConfigs;

  return {
    loading,
    error,
    clearError,
    getAgentConfigs,
    getAgentConfig,
    createAgent,
    updateAgent,
    deleteAgent,
    reloadConfigs,
    exportConfig,
  } as const;
};
