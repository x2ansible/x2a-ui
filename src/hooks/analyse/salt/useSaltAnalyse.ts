import { useCallback } from "react";
import { BackendAnalysisResponse } from "@/components/analyse/types/BackendTypes";

interface UseSaltAnalyseProps {
  BACKEND_URL: string;
  files: { name: string; content: string }[] | Record<string, string>;
  setAnalysisResult: (result: BackendAnalysisResponse | undefined) => void; // Changed from null
  setLoading: (loading: boolean) => void;
  addLog: (msg: string) => void;
}

export const useSaltAnalyse = ({
  // BACKEND_URL, // Removed as it's assigned but never used
  files,
  setAnalysisResult,
  setLoading,
  addLog,
}: UseSaltAnalyseProps) => {
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

  const analyseSalt = useCallback(
    async (filesArg?: unknown) => {
      let inputFiles;
      if (filesArg) {
        inputFiles = normalizeFiles(filesArg);
      } else {
        inputFiles = normalizeFiles(files);
      }

      if (!inputFiles.length) {
        addLog("No files selected for Salt analysis.");
        return;
      }

      setLoading(true);
      const startTime = Date.now();
      addLog("🧂 Salt analysis agent starting...");

      try {
        const analyseApiUrl = "/api/analyse/salt/stream";
        addLog(`Connecting to: ${analyseApiUrl}`);

        const filesDict: Record<string, string> = {};
        inputFiles.forEach((file) => {
          filesDict[file.name] = file.content;
        });

        const requestBody = { 
          name: inputFiles.length === 1 ? inputFiles[0].name.replace(/\.[^/.]+$/, "") : `salt_analysis_${Date.now()}`,
          files: filesDict,
          metadata: {
            technology_type: 'salt',
            analysis_timestamp: new Date().toISOString(),
            client_request_id: `ui-salt-${Date.now()}`,
          }
        };

        addLog(`Sending ${inputFiles.length} file(s): ${inputFiles.map((f) => f.name).join(", ")}`);

        const response = await fetch(analyseApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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
        let finalResult: Record<string, unknown> | null = null;
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

            let eventData: Record<string, unknown> | null = null;

            if (trimmed.startsWith("data: ")) {
              try {
                const jsonStr = trimmed.slice(6).trim();
                if (jsonStr === "[DONE]") {
                  addLog(" Stream completed");
                  continue;
                }
                eventData = JSON.parse(jsonStr) as Record<string, unknown>;
              } catch (parseError) {
                console.warn("Failed to parse SSE data:", trimmed, parseError);
                continue;
              }
            } else if (trimmed.startsWith("{")) {
              try {
                eventData = JSON.parse(trimmed) as Record<string, unknown>;
              } catch (parseError) {
                console.warn("Failed to parse JSON line:", trimmed, parseError);
                continue;
              }
            } else {
              addLog(`📝 ${trimmed}`);
              continue;
            }

            if (eventData) {
              if (eventData.type === "final_analysis" || eventData.type === "result") {
                finalResult = (eventData.data || eventData) as Record<string, unknown>;
                addLog(" Analysis complete - processing results...");
              } else if (eventData.type === "progress" || eventData.type === "status") {
                const message = eventData.message || eventData.status || "Processing...";
                addLog(` ${message}`);
              } else if (eventData.type === "error") {
                throw new Error(String(eventData.error || eventData.message || "Backend reported an error"));
              } else if (eventData.type === "log") {
                addLog(`🔍 ${eventData.message || eventData.data}`);
              } else if (!eventData.type && (eventData.detailed_analysis || eventData.description)) {
                finalResult = eventData as Record<string, unknown>;
                addLog(" Analysis complete - processing results...");
              } else {
                console.log("Unknown event type:", eventData);
                addLog(`📊 ${eventData.message || JSON.stringify(eventData).slice(0, 100)}`);
              }
            }
          }
        }

        if (!hasReceivedData) {
          throw new Error("No data received from stream");
        }

        if (!finalResult) {
          throw new Error("No final analysis result received from stream");
        }

        addLog("🧂 Salt analysis completed successfully");

        const analysisResult: BackendAnalysisResponse = {
          ...finalResult,
          success: finalResult.success !== false,
          duration_ms: Date.now() - startTime,
          metadata: {
            ...(finalResult.metadata as Record<string, unknown> || {}),
            analyzed_at: new Date().toISOString(),
            analysis_duration_ms: Date.now() - startTime,
            files_analyzed: inputFiles.map(f => f.name),
            total_code_size: inputFiles.reduce((sum, f) => sum + f.content.length, 0),
            technology_type: (finalResult.metadata as Record<string, unknown>)?.technology_type as string || 'salt',
            agent_name: (finalResult.metadata as Record<string, unknown>)?.agent_name as string || 'Salt Analysis Agent',
            agent_icon: (finalResult.metadata as Record<string, unknown>)?.agent_icon as string || '🧂'
          }
        };

        setAnalysisResult(analysisResult);

        // Log key insights
        const typedResult = finalResult as BackendAnalysisResponse;
        if (typedResult.functionality?.primary_purpose) {
          addLog(`🎯 Purpose: ${typedResult.functionality.primary_purpose}`);
        }
        if (typedResult.version_requirements?.migration_effort) {
          const effort = typedResult.version_requirements.migration_effort;
          const hours = typedResult.version_requirements.estimated_hours;
          addLog(`🚀 Migration: ${effort} effort${hours ? ` (${hours}h)` : ""}`);
        }
        if (typedResult.recommendations?.consolidation_action) {
          addLog(`💡 Recommendation: ${typedResult.recommendations.consolidation_action}`);
        }

        const duration = Date.now() - startTime;
        addLog(` Salt analysis completed in ${duration}ms`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Salt analysis error:", error);
        addLog(`❌ Salt analysis failed: ${errorMessage}`);
        setAnalysisResult(undefined);
      } finally {
        setLoading(false);
      }
    },
    [addLog, setLoading, setAnalysisResult, files]
  );

  return {
    analyseSalt,
  };
};