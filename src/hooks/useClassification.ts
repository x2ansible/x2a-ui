import { useCallback } from "react";
import { ClassificationResponse } from "@/types/api";

// Accepts files as [{ name, content }] OR { [filename]: content }
interface UseClassificationProps {
  BACKEND_URL: string;
  files: { name: string; content: string }[] | Record<string, string>;
  setClassificationResult: (result: ClassificationResponse | null) => void;
  setStep: (step: number) => void;
  step: number;
  setLoading: (loading: boolean) => void;
  loading: boolean;
  addLog: (msg: string) => void;
}

export const useClassification = ({
  BACKEND_URL,
  files,
  setClassificationResult,
  setStep,
  step,
  setLoading,
  loading,
  addLog,
}: UseClassificationProps) => {
  // Defensive: always return [{ name, content }]
  const normalizeFiles = (input: unknown): { name: string; content: string }[] => {
    if (Array.isArray(input)) return input;
    if (input && typeof input === "object" && !(input instanceof File)) {
      // Convert {filename: content, ...} to [{name, content}, ...]
      return Object.entries(input).map(([name, content]) => ({
        name,
        content: String(content),
      }));
    }
    return [];
  };

  const classifyCode = useCallback(
    async (filesArg?: unknown) => {
      // Use provided files or fall back to the hook's files parameter
      let inputFiles;
      
      if (filesArg) {
        inputFiles = normalizeFiles(filesArg);
      } else {
        inputFiles = normalizeFiles(files);
      }

      if (!inputFiles.length) {
        addLog("No files selected for classification.");
        return;
      }

      setLoading(true);
      const startTime = Date.now();
      addLog("Classifier agent starting...");

      try {
        const classifyApiUrl =
          process.env.NEXT_PUBLIC_CLASSIFY_API ||
          `${BACKEND_URL}/api/chef/analyze/stream`;

        addLog(`Connecting to: ${classifyApiUrl}`);

        // Backend expects { files: { filename: content } }
        const filesDict: Record<string, string> = {};
        inputFiles.forEach((file) => {
          filesDict[file.name] = file.content;
        });
        const requestBody = { files: filesDict };

        addLog(
          `Sending ${inputFiles.length} file(s): ${inputFiles
            .map((f) => f.name)
            .join(", ")}`
        );

        const response = await fetch(classifyApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        addLog("Receiving streaming response...");

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body reader available");

        const decoder = new TextDecoder();
        let buffer = "";
        let finalResult: unknown = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim() === "") continue;
            if (line.startsWith("data: ")) {
              try {
                const jsonStr = line.slice(6);
                const eventData = JSON.parse(jsonStr);
                if (eventData.type === "final_analysis") {
                  finalResult = eventData.data;
                  addLog("Analysis complete - processing results...");
                } else if (eventData.type === "progress") {
                  addLog(`${eventData.message || "Processing..."}`);
                }
              } catch (parseError) {
                console.warn("Failed to parse event data:", line, parseError);
              }
            }
          }
        }

        if (!finalResult) {
          throw new Error("No classification result received from stream");
        }

        addLog("Classification completed successfully");

        // Transform for your ClassificationPanel with dynamic language detection
        const transformedResult: ClassificationResponse = {
          // UPDATED: Dynamic classification detection
          classification:
            finalResult.tree_sitter_facts?.verified_cookbook_name ||
            finalResult.cookbook_name ||
            finalResult.classification ||
            "Infrastructure Code",

          summary:
            finalResult.functionality?.primary_purpose ||
            (typeof finalResult.detailed_analysis === "string"
              ? finalResult.detailed_analysis.split("\n")[0]
              : undefined) ||
            finalResult.summary ||
            "Infrastructure analysis completed",

          detailed_analysis:
            finalResult.detailed_analysis ||
            finalResult.functionality?.primary_purpose ||
            "No detailed analysis available",

          convertible:
            finalResult.convertible !== undefined
              ? finalResult.convertible
              : Boolean(
                  finalResult.functionality?.services?.length ||
                    finalResult.functionality?.packages?.length ||
                    finalResult.version_requirements?.migration_effort ===
                      "LOW"
                ),

          conversion_notes:
            finalResult.conversion_notes ||
            (() => {
              const effort = finalResult.version_requirements?.migration_effort;
              const isConvertible = finalResult.convertible !== false;
              if (isConvertible) {
                return `This configuration can be converted to Ansible with ${
                  effort?.toLowerCase() || "moderate"
                } effort. ${
                  finalResult.functionality?.primary_purpose
                    ? `Primary function: ${finalResult.functionality.primary_purpose}`
                    : ""
                }`;
              } else {
                return "Conversion not recommended for this configuration.";
              }
            })(),

          complexity_level:
            finalResult.complexity_level ||
            (() => {
              const services = finalResult.functionality?.services?.length || 0;
              const packages = finalResult.functionality?.packages?.length || 0;
              const files = finalResult.functionality?.files_managed?.length || 0;
              const deps = finalResult.dependencies?.direct_deps?.length || 0;
              const totalComplexity = services + packages + files + deps;
              if (totalComplexity > 10)
                return "High - Multiple services and complex configuration";
              if (totalComplexity > 5)
                return "Medium - Standard configuration with multiple components";
              if (totalComplexity > 0) return "Low - Simple configuration";
              return "Simple - Basic setup";
            })(),

          key_operations:
            finalResult.key_operations ||
            (() => {
              const operations = [];
              if (finalResult.functionality?.services?.length) {
                operations.push(
                  `Service management (${finalResult.functionality.services.join(
                    ", "
                  )})`
                );
              }
              if (finalResult.functionality?.packages?.length) {
                operations.push(
                  `Package installation (${finalResult.functionality.packages.join(
                    ", "
                  )})`
                );
              }
              if (finalResult.functionality?.files_managed?.length) {
                operations.push(
                  `File management (${finalResult.functionality.files_managed.length} files)`
                );
              }
              if (finalResult.functionality?.customization_points?.length) {
                operations.push(
                  ...finalResult.functionality.customization_points
                );
              }
              return operations.length > 0
                ? operations
                : ["System configuration and management"];
            })(),

          resources: [
            ...(finalResult.functionality?.packages || []),
            ...(finalResult.functionality?.services || []),
            ...(finalResult.resources || []),
          ].filter((item, index, arr) => arr.indexOf(item) === index),

          dependencies: (() => {
            if (finalResult.dependencies) {
              const deps = finalResult.dependencies;
              const depInfo = [];
              if (deps.direct_deps?.length) {
                depInfo.push(`Direct Dependencies: ${deps.direct_deps.join(", ")}`);
              }
              if (deps.runtime_deps?.length) {
                depInfo.push(
                  `Runtime Dependencies: ${deps.runtime_deps.join(", ")}`
                );
              }
              if (deps.wrapped_cookbooks?.length) {
                depInfo.push(
                  `Wrapped Cookbooks: ${deps.wrapped_cookbooks.join(", ")}`
                );
              }
              if (deps.is_wrapper !== undefined) {
                depInfo.push(
                  `Wrapper Cookbook: ${deps.is_wrapper ? "Yes" : "No"}`
                );
              }
              if (deps.circular_risk && deps.circular_risk !== "none") {
                depInfo.push(`Circular Risk: ${deps.circular_risk.toUpperCase()}`);
              }
              return depInfo.length > 0
                ? depInfo.join("\n")
                : "No external dependencies identified";
            }
            return "Dependencies information not available";
          })(),

          configuration_details: (() => {
            const configParts = [];
            if (finalResult.functionality?.primary_purpose) {
              configParts.push(
                `Purpose: ${finalResult.functionality.primary_purpose}`
              );
            }
            if (finalResult.version_requirements?.min_chef_version) {
              configParts.push(
                `Chef Version: ${finalResult.version_requirements.min_chef_version}+`
              );
            }
            if (finalResult.version_requirements?.min_ruby_version) {
              configParts.push(
                `Ruby Version: ${finalResult.version_requirements.min_ruby_version}+`
              );
            }
            if (finalResult.functionality?.reusability) {
              configParts.push(
                `Reusability: ${finalResult.functionality.reusability}`
              );
            }
            if (finalResult.functionality?.files_managed?.length) {
              configParts.push(
                `Managed Files: ${finalResult.functionality.files_managed
                  .slice(0, 3)
                  .join(", ")}${
                  finalResult.functionality.files_managed.length > 3
                    ? ` (+${
                        finalResult.functionality.files_managed.length - 3
                      } more)`
                    : ""
                }`
              );
            }
            if (finalResult.functionality?.customization_points?.length) {
              configParts.push(
                `Customization: ${finalResult.functionality.customization_points
                  .slice(0, 2)
                  .join(", ")}${
                  finalResult.functionality.customization_points.length > 2
                    ? ` (+${
                        finalResult.functionality.customization_points.length - 2
                      } more)`
                    : ""
                }`
              );
            }
            return configParts.length > 0
              ? configParts.join("\n")
              : finalResult.configuration_details ||
                  "Standard infrastructure configuration";
          })(),

          duration_ms: Date.now() - startTime,
          manual_estimate_ms:
            ((finalResult.version_requirements?.estimated_hours ||
              finalResult.estimated_hours ||
              2) *
              60 *
              60 *
              1000),
          speedup: (() => {
            const hours =
              finalResult.version_requirements?.estimated_hours ||
              finalResult.estimated_hours ||
              2;
            const actualMs = Date.now() - startTime;
            const estimatedMs = hours * 60 * 60 * 1000;
            return estimatedMs / actualMs;
          })(),

          // Preserve ALL backend data for detailed display
          cookbook_name: finalResult.cookbook_name,
          version_requirements: finalResult.version_requirements,
          functionality: finalResult.functionality,
          recommendations: finalResult.recommendations,
          metadata: finalResult.metadata,
          confidence_source: finalResult.confidence_source,
          session_info: finalResult.session_info,
          tree_sitter_facts: finalResult.tree_sitter_facts,
          analysis_method: finalResult.analysis_method,
        };

        setClassificationResult(transformedResult);

        // Enhanced logging for debugging
        if (finalResult.metadata?.analyzed_at) {
          addLog(
            `Analysis completed at ${new Date(
              finalResult.metadata.analyzed_at
            ).toLocaleTimeString()}`
          );
        }
        if (finalResult.functionality?.primary_purpose) {
          addLog(`Purpose: ${finalResult.functionality.primary_purpose}`);
        }
        if (finalResult.tree_sitter_facts?.verified_cookbook_name) {
          addLog(`Detected: ${finalResult.tree_sitter_facts.verified_cookbook_name}`);
        }
        if (finalResult.version_requirements?.migration_effort) {
          const effort = finalResult.version_requirements.migration_effort;
          const hours = finalResult.version_requirements.estimated_hours;
          addLog(
            `Migration: ${effort} effort${hours ? ` (${hours}h estimated)` : ""}`
          );
        }
        if (finalResult.recommendations?.consolidation_action) {
          addLog(
            `Recommendation: ${finalResult.recommendations.consolidation_action}`
          );
        }
        if (transformedResult.speedup && transformedResult.speedup > 1) {
          addLog(
            `Analysis speedup: ${transformedResult.speedup.toFixed(
              1
            )}x faster than manual review`
          );
        }
      } catch (error) {
        const errorMessage = (error as Error).message;
        addLog(`Classification failed: ${errorMessage}`);
        setClassificationResult(null);
      } finally {
        setLoading(false);
      }
    },
    [BACKEND_URL, addLog, setLoading, setClassificationResult, files]
  );

  // Manual trigger: UI button etc
  const handleManualClassify = useCallback(
    (filesArg?: unknown) => {
      classifyCode(filesArg);
    },
    [classifyCode]
  );

  return {
    classifyCode,
    handleManualClassify,
  };
};