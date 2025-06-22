import { useCallback } from "react";
import { BackendAnalysisResponse } from "@/components/analyse/types/BackendTypes";

interface UseChefAnalyseProps {
  BACKEND_URL: string;
  files: { name: string; content: string }[] | Record<string, string>;
  setAnalysisResult: (result: BackendAnalysisResponse | null) => void;
  setLoading: (loading: boolean) => void;
  addLog: (msg: string) => void;
}

export const useChefAnalyse = ({
  BACKEND_URL,
  files,
  setAnalysisResult,
  setLoading,
  addLog,
}: UseChefAnalyseProps) => {
  // Normalization helper: accepts array or dict
  const normalizeFiles = (input: unknown): { name: string; content: string }[] => {
    if (Array.isArray(input)) return input;
    if (input && typeof input === "object" && !(input instanceof File)) {
      return Object.entries(input).map(([name, content]) => ({
        name,
        content: String(content),
      }));
    }
    return [];
  };

  const analyseChef = useCallback(
    async (filesArg?: unknown) => {
      let inputFiles = filesArg ? normalizeFiles(filesArg) : normalizeFiles(files);
      if (!inputFiles.length) {
        addLog("No files selected for Chef analysis.");
        return;
      }
      setLoading(true);
      const startTime = Date.now();
      addLog("🍳 Chef analysis agent starting...");

      try {
        // This endpoint matches your actual backend route!
        const analyseApiUrl = "/api/analyse/chef/stream";
        addLog(`Connecting to: ${analyseApiUrl}`);

        const filesDict: Record<string, string> = {};
        inputFiles.forEach((file) => {
          filesDict[file.name] = file.content;
        });

        const requestBody = { 
          files: filesDict,
          metadata: {
            technology_type: 'chef',
            analysis_timestamp: new Date().toISOString(),
            client_request_id: `ui-chef-${Date.now()}`,
          }
        };

        addLog(`Sending ${inputFiles.length} file(s): ${inputFiles.map((f) => f.name).join(", ")}`);

        const response = await fetch(analyseApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
        }

        addLog("📡 Receiving streaming response...");
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body reader available");

        const decoder = new TextDecoder();
        let buffer = "";
        let finalResult: any = null;
        let hasReceivedData = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            hasReceivedData = true;

            let eventData: any = null;
            if (trimmed.startsWith("data: ")) {
              try {
                const jsonStr = trimmed.slice(6).trim();
                if (jsonStr === "[DONE]") {
                  addLog(" Stream completed");
                  continue;
                }
                eventData = JSON.parse(jsonStr);
              } catch (parseError) {
                continue;
              }
            } else if (trimmed.startsWith("{")) {
              try {
                eventData = JSON.parse(trimmed);
              } catch {
                continue;
              }
            } else {
              addLog(`📝 ${trimmed}`);
              continue;
            }

            if (eventData) {
              if (eventData.type === "final_analysis" || eventData.type === "result") {
                finalResult = eventData.data || eventData;
                addLog(" Analysis complete - processing results...");
              } else if (eventData.type === "progress" || eventData.type === "status") {
                const message = eventData.message || eventData.status || "Processing...";
                addLog(`📋 ${message}`);
              } else if (eventData.type === "error") {
                throw new Error(eventData.error || eventData.message || "Backend reported an error");
              } else if (eventData.type === "log") {
                addLog(`🔍 ${eventData.message || eventData.data}`);
              } else if (!eventData.type && eventData.detailed_analysis) {
                finalResult = eventData;
                addLog(" Analysis complete - processing results...");
              } else {
                addLog(`📊 ${eventData.message || JSON.stringify(eventData).slice(0, 100)}`);
              }
            }
          }
        }

        if (!hasReceivedData) throw new Error("No data received from stream");
        if (!finalResult) throw new Error("No final analysis result received from stream");

        addLog("🍳 Chef analysis completed successfully");

        const analysisResult: BackendAnalysisResponse = {
          ...finalResult,
          success: finalResult.success !== false,
          duration_ms: Date.now() - startTime,
          metadata: {
            ...finalResult.metadata,
            analyzed_at: new Date().toISOString(),
            analysis_duration_ms: Date.now() - startTime,
            files_analyzed: inputFiles.map(f => f.name),
            total_code_size: inputFiles.reduce((sum, f) => sum + f.content.length, 0),
            technology_type: finalResult.metadata?.technology_type || 'chef',
            agent_name: finalResult.metadata?.agent_name || 'Chef Analysis Agent',
            agent_icon: finalResult.metadata?.agent_icon || '🍳'
          }
        };

        setAnalysisResult(analysisResult);

        if (finalResult.functionality?.primary_purpose) {
          addLog(` Purpose: ${finalResult.functionality.primary_purpose}`);
        }
        if (finalResult.version_requirements?.migration_effort) {
          const effort = finalResult.version_requirements.migration_effort;
          const hours = finalResult.version_requirements.estimated_hours;
          addLog(` Migration: ${effort} effort${hours ? ` (${hours}h)` : ""}`);
        }
        if (finalResult.recommendations?.consolidation_action) {
          addLog(` Recommendation: ${finalResult.recommendations.consolidation_action}`);
        }

        const duration = Date.now() - startTime;
        addLog(`🎉 Chef analysis completed in ${duration}ms`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addLog(` Chef analysis failed: ${errorMessage}`);
        setAnalysisResult(null);
      } finally {
        setLoading(false);
      }
    },
    [addLog, setLoading, setAnalysisResult, files]
  );

  return { analyseChef };
};
