"use client";
import React, { useState } from "react";
import { Save, X } from "lucide-react";
import type { AgentConfig } from "../hooks/useAdminConfig";

interface CreateAgentModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (agentConfig: AgentConfig["agent_config"]) => Promise<void>;
}

const defaultConfig = {
  model: "",
  instructions: "",
  name: "",
  sampling_params: {
    strategy: { type: "greedy" },
    max_tokens: 0,
    repetition_penalty: 1,
    stop: null,
  },
  input_shields: [],
  output_shields: [],
  toolgroups: [],
  client_tools: [],
  tool_choice: null,
  tool_prompt_format: null,
  tool_config: {
    tool_choice: "auto",
    tool_prompt_format: null,
    system_message_behavior: "append",
  },
  max_infer_iters: 10,
  enable_session_persistence: false,
  response_format: null,
};

export const CreateAgentModal: React.FC<CreateAgentModalProps> = ({
  open,
  onClose,
  onCreate,
}) => {
  const [fields, setFields] = useState<any>({ ...defaultConfig });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFields({ ...fields, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fields.model.trim() || !fields.instructions.trim()) {
      setError("Model and Instructions are required");
      return;
    }

    setSaving(true);
    try {
      await onCreate(fields);
      setFields({ ...defaultConfig }); // Reset
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create agent");
    }
    setSaving(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
      <div className="w-full max-w-lg bg-slate-900 rounded-xl shadow-lg border border-slate-700/60 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-red-500"
        >
          <X size={22} />
        </button>
        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-white mb-1">Create New Agent</h2>
          <label className="text-xs text-slate-400">
            Agent Name (optional)
            <input
              name="name"
              value={fields.name || ""}
              onChange={handleChange}
              className="w-full p-2 mt-1 bg-slate-800 text-slate-100 rounded border border-slate-700 outline-none"
              maxLength={64}
            />
          </label>
          <label className="text-xs text-slate-400">
            Model <span className="text-red-400">*</span>
            <input
              name="model"
              value={fields.model}
              onChange={handleChange}
              className="w-full p-2 mt-1 bg-slate-800 text-slate-100 rounded border border-slate-700 outline-none"
              required
              placeholder="meta-llama/Llama-3.1-8B-Instruct"
            />
          </label>
          <label className="text-xs text-slate-400">
            Instructions <span className="text-red-400">*</span>
            <textarea
              name="instructions"
              value={fields.instructions}
              onChange={handleChange}
              className="w-full h-28 p-2 mt-1 bg-slate-800 text-slate-100 rounded border border-slate-700 outline-none resize-none"
              required
              placeholder="Agent instructions prompt"
            />
          </label>
          {error && (
            <div className="text-xs text-red-400 py-1">{error}</div>
          )}
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm font-medium shadow"
              disabled={saving}
            >
              <Save size={16} />
              {saving ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
