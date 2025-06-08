"use client";

import React, { useState } from "react";
import { X, Brain, Save, AlertCircle } from "lucide-react";
import { CreateAgentRequest } from "../hooks/useAdminConfig";

interface CreateAgentModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (config: CreateAgentRequest) => Promise<void>;
}

export const CreateAgentModal: React.FC<CreateAgentModalProps> = ({ open, onClose, onCreate }) => {
  const [formData, setFormData] = useState<CreateAgentRequest>({
    name: "",
    model: "meta-llama/Llama-3.1-8B-Instruct",
    instructions: "",
    tools: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError("Agent name is required");
      return;
    }
    
    if (!formData.instructions.trim()) {
      setError("Instructions are required");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      await onCreate(formData);
      // Reset form and close modal
      setFormData({
        name: "",
        model: "meta-llama/Llama-3.1-8B-Instruct",
        instructions: "",
        tools: [],
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Create New Agent</h2>
                <p className="text-sm text-slate-400">Configure a new AI agent</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-400 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Agent Name */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Agent Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., my_custom_agent"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
              required
            />
            <p className="text-xs text-slate-400 mt-1">
              Use lowercase letters, numbers, and underscores only
            </p>
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Model
            </label>
            <select
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="meta-llama/Llama-3.1-8B-Instruct">Llama 3.1 8B Instruct</option>
              <option value="meta-llama/Llama-3.1-70B-Instruct">Llama 3.1 70B Instruct</option>
            </select>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Instructions *
            </label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="Enter detailed instructions for your agent..."
              rows={8}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
              disabled={loading}
              required
            />
            <p className="text-xs text-slate-400 mt-1">
              Define the agent's role, capabilities, and behavior
            </p>
          </div>

          {/* Tools */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Tools (Optional)
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rag_tool"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({
                        ...formData,
                        tools: [
                          ...(formData.tools || []),
                          {
                            name: "builtin::rag",
                            args: { vector_db_ids: ["iac"] }
                          }
                        ]
                      });
                    } else {
                      setFormData({
                        ...formData,
                        tools: (formData.tools || []).filter(t => t.name !== "builtin::rag")
                      });
                    }
                  }}
                  className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                  disabled={loading}
                />
                <label htmlFor="rag_tool" className="text-sm text-slate-300">
                  RAG (Knowledge Search) Tool
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="lint_tool"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({
                        ...formData,
                        tools: [
                          ...(formData.tools || []),
                          { name: "ansible_lint_tool" }
                        ]
                      });
                    } else {
                      setFormData({
                        ...formData,
                        tools: (formData.tools || []).filter(t => t.name !== "ansible_lint_tool")
                      });
                    }
                  }}
                  className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                  disabled={loading}
                />
                <label htmlFor="lint_tool" className="text-sm text-slate-300">
                  Ansible Lint Tool
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Create Agent
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
