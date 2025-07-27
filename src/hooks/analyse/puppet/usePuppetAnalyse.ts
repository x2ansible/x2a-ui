// src/hooks/analyse/puppet/usePuppetAnalyse.ts
import { useCallback } from "react";
import { BackendAnalysisResponse } from "@/components/analyse/types/BackendTypes";

interface UsePuppetAnalyseProps {
  BACKEND_URL: string;
  files: { name: string; content: string }[] | Record<string, string>;
  setAnalysisResult: (result: BackendAnalysisResponse | undefined) => void;
  setLoading: (loading: boolean) => void;
  addLog: (msg: string) => void;
}

export const usePuppetAnalyse = ({
  BACKEND_URL,
  files,
  setAnalysisResult,
  setLoading,
  addLog,
}: UsePuppetAnalyseProps) => {
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

  const analysePuppet = useCallback(
    async (filesArg?: unknown) => {
      const inputFiles = filesArg ? normalizeFiles(filesArg) : normalizeFiles(files);
      if (!inputFiles.length) {
        addLog("No files selected for Puppet analysis.");
        return;
      }
      setLoading(true);
      const startTime = Date.now();
      addLog("🎭 Puppet analysis agent starting...");

      try {
        // This endpoint matches your actual backend route!
        const analyseApiUrl = "/api/analyse/puppet/stream";
        addLog(`Connecting to: ${analyseApiUrl}`);

        const filesDict: Record<string, string> = {};
        inputFiles.forEach((file) => {
          filesDict[file.name] = file.content;
        });

        const requestBody = { 
          files: filesDict,
          metadata: {
            technology_type: 'puppet',
            analysis_timestamp: new Date().toISOString(),
            client_request_id: `ui-puppet-${Date.now()}`,
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
        let finalResult: BackendAnalysisResponse | null = null;
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
                  break;
                }
                eventData = JSON.parse(jsonStr);
              } catch {
                addLog(`⚠️ Failed to parse data: ${trimmed.substring(0, 100)}...`);
                continue;
              }
            } else {
              try {
                eventData = JSON.parse(trimmed);
              } catch {
                addLog(`⚠️ Failed to parse line: ${trimmed.substring(0, 100)}...`);
                continue;
              }
            }

            if (eventData) {
              if (eventData.type === 'progress') {
                const progress = typeof eventData.progress === 'number' ? eventData.progress : 0;
                addLog(`📊 Progress: ${eventData.message} (${Math.round(progress * 100)}%)`);
              } else if (eventData.type === 'final_analysis') {
                addLog("📋 Received final analysis");
                console.log('🎭 Puppet final analysis eventData:', eventData);
                console.log('🎭 Puppet final analysis data:', eventData.data);
                console.log('🎭 Puppet detailed_analysis field:', (eventData.data as BackendAnalysisResponse)?.detailed_analysis);
                finalResult = eventData.data as BackendAnalysisResponse;
                setAnalysisResult(eventData.data as BackendAnalysisResponse);
              } else if (eventData.type === 'error') {
                const errorMsg = typeof eventData.error === 'string' ? eventData.error : 'Analysis error';
                throw new Error(errorMsg);
              }
            }
          }
        }

        if (!hasReceivedData) {
          throw new Error("No data received from analysis stream");
        }

        if (!finalResult) {
          throw new Error("No final analysis result received");
        }

        const duration = Date.now() - startTime;
        addLog(` Puppet analysis completed successfully in ${duration}ms`);

        // Create proper analysis result with metadata (similar to Chef hook)
        const analysisResult: BackendAnalysisResponse = {
          ...finalResult,
          success: finalResult.success !== false,
          duration_ms: duration,
          metadata: {
            ...(finalResult.metadata || {}),
            analyzed_at: new Date().toISOString(),
            analysis_duration_ms: duration,
            files_analyzed: inputFiles.map(f => f.name),
            total_code_size: inputFiles.reduce((sum, f) => sum + f.content.length, 0),
            technology_type: finalResult.metadata?.technology_type || 'puppet',
            agent_name: finalResult.metadata?.agent_name || 'Puppet Analysis Agent',
            agent_icon: finalResult.metadata?.agent_icon || '🎭'
          }
        };

        setAnalysisResult(analysisResult);

        // Log key insights
        if (finalResult?.functionality?.primary_purpose) {
          addLog(`🎯 Purpose: ${finalResult.functionality.primary_purpose}`);
        }
        if (finalResult?.version_requirements?.migration_effort) {
          const effort = finalResult.version_requirements.migration_effort;
          const hours = finalResult.version_requirements.estimated_hours;
          addLog(`🚀 Migration: ${effort} effort${hours ? ` (${hours}h)` : ""}`);
        }
        if (finalResult?.recommendations?.consolidation_action) {
          addLog(`💡 Recommendation: ${finalResult.recommendations.consolidation_action}`);
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        addLog(`❌ Analysis failed: ${errorMessage}`);
        setAnalysisResult(undefined);
      } finally {
        setLoading(false);
      }
    },
    [BACKEND_URL, files, setAnalysisResult, setLoading, addLog]
  );

  return { analysePuppet };
}; 