"use client";

import { useState, useCallback } from "react";

const API_BASE = "/api";

export interface AgentConfig {
  agent_id?: string;
  session_id?: string;
  agent_config: {
    name: string;
    model: string;
    instructions: string;
    sampling_params?: unknown;
    max_infer_iters?: number;
    tools?: unknown[];
    toolgroups?: unknown[];
    enable_session_persistence?: boolean;
    [key: string]: unknown;
  };
  created_at?: string;
  status?: string;
}

export interface AgentStatusResponse {
  registry: {
    registered_agents: number;
    active_sessions: number;
    agents: Record<string, string>;
    sessions: Record<string, string>;
  };
  agents: Record<string, {
    agent_id: string;
    session_id: string;
    status: string;
    pattern: string;
  }>;
  specialized_agents?: unknown;
}

export interface CreateAgentRequest {
  name: string;
  model: string;
  instructions: string;
  tools?: unknown[];
}

export interface ApiError {
  error: string;
  detail?: string;
}

export const useAdminConfig = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const getAgentConfigs = useCallback(async (): Promise<AgentConfig[]> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/agents/status`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.error || `HTTP ${res.status}`);
      }
      
      const data: AgentStatusResponse = await res.json();
      const agentConfigs: AgentConfig[] = [];
      
      for (const [agentName, agentInfo] of Object.entries(data.agents)) {
        agentConfigs.push({
          agent_id: agentInfo.agent_id,
          session_id: agentInfo.session_id,
          agent_config: {
            name: agentName,
            model: "meta-llama/Llama-3.1-8B-Instruct",
            instructions: "",
          },
          status: agentInfo.status,
        });
      }
      
      return agentConfigs;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // FIXED: Use the correct instructions endpoint
  const getAgentConfig = useCallback(async (agentName: string): Promise<AgentConfig> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/agents/${agentName}/instructions`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      
      return {
        agent_id: "unknown",
        agent_config: {
          name: data.agent_name,
          model: data.model,
          instructions: data.instructions,
          tools: data.tools,
          sampling_params: data.sampling_params,
        },
        status: "active",
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createAgent = useCallback(
    async (agentConfig: AgentConfig["agent_config"]): Promise<AgentConfig> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/admin/agents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: agentConfig.name,
            model: agentConfig.model,
            instructions: agentConfig.instructions,
            tools: agentConfig.tools || [],
          }),
        });
        
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || err.error || `HTTP ${res.status}`);
        }
        
        const data = await res.json();
        
        return {
          agent_id: data.agent_id,
          agent_config: {
            name: data.name || agentConfig.name,
            model: agentConfig.model,
            instructions: agentConfig.instructions,
            tools: agentConfig.tools,
          },
          status: data.status,
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteAgent = useCallback(async (agentName: string): Promise<{ success: boolean; agent_id: string }> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/agents/${agentName}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return { success: true, agent_id: data.agent_id };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAgent = useCallback(
    async (agentName: string, agentConfig: AgentConfig["agent_config"]): Promise<AgentConfig> => {
      throw new Error("Agent update not implemented in backend");
    },
    []
  );

  const refreshAgents = useCallback(async (): Promise<AgentConfig[]> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/agents/refresh`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      
      const agentConfigs: AgentConfig[] = [];
      for (const [agentName, agentId] of Object.entries(data.agents as Record<string, string>)) {
        agentConfigs.push({
          agent_id: agentId,
          agent_config: {
            name: agentName,
            model: "meta-llama/Llama-3.1-8B-Instruct",
            instructions: "",
          },
          status: "active",
        });
      }
      
      return agentConfigs;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const exportConfig = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      const systemRes = await fetch(`${API_BASE}/admin/info`);
      if (systemRes.ok) {
        const systemInfo = await systemRes.json();
        const agentRes = await fetch(`${API_BASE}/admin/agents`);
        if (agentRes.ok) {
          const agentData = await agentRes.json();
          
          const exportData = {
            system: systemInfo,
            agents: agentData,
            exported_at: new Date().toISOString(),
          };
          
          const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `agent-config-${new Date().toISOString().split("T")[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          return;
        }
      }
      
      throw new Error("Export not available");
    } catch (err) {
      setError("Export functionality not available");
      throw err;
    }
  }, []);

  const getSystemInfo = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/info`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn("Could not fetch system info:", err);
    }
    return null;
  }, []);

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
    refreshAgents,
    exportConfig,
    getSystemInfo,
  } as const;
};
