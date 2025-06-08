import { useCallback } from "react";
import { ClassificationResponse } from "@/types/api";

interface UseClassificationProps {
  BACKEND_URL: string;
  code: string;
  setClassificationResult: (result: ClassificationResponse | null) => void;
  setStep: (step: number) => void;
  step: number;
  setLoading: (loading: boolean) => void;
  loading: boolean;
  addLog: (msg: string) => void;
}

export const useClassification = ({
  BACKEND_URL,
  code,
  setClassificationResult,
  setStep,
  step,
  setLoading,
  loading,
  addLog,
}: UseClassificationProps) => {

  const classifyCode = useCallback(async (input: string) => {
    if (!input.trim()) {
      addLog("⚠️ No code content to classify");
      return;
    }
    
    setLoading(true);
    const startTime = Date.now();
    addLog("🧠 Classifier agent starting...");

    try {
      // Use environment variable for the correct endpoint
      const classifyApiUrl = process.env.NEXT_PUBLIC_CLASSIFY_API || `${BACKEND_URL}/api/chef/analyze/stream`;
      
      addLog(`🔗 Connecting to: ${classifyApiUrl}`);

      // Format the request body to match backend expectations
      const requestBody = {
        files: {
          "input_file": input // Single file with the combined content
        }
      };

      addLog(`📤 Sending ${Object.keys(requestBody.files).length} file(s) for analysis`);

      const response = await fetch(classifyApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream", // Important for streaming
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      addLog("📡 Receiving streaming response...");

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body reader available");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: any = null;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim() === "") continue;
          
          // Parse Server-Sent Events format
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6); // Remove 'data: ' prefix
              const eventData = JSON.parse(jsonStr);
              
              // Look for the final result - handle the actual backend format
              if (eventData.type === 'final_analysis') {
                console.log("🎯 Found final analysis result:", eventData);
                finalResult = eventData.data; // Extract the data field
                addLog("🎉 Analysis complete - processing results...");
              } else if (eventData.type === 'progress') {
                // Just log progress, don't treat as final result
                addLog(`📊 ${eventData.message || 'Processing...'}`);
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

      addLog("✅ Classification completed successfully");

      // Enhanced transformation to preserve ALL backend data
      const transformedResult: ClassificationResponse = {
        // Basic identification - improved logic
        classification: finalResult.cookbook_name || 
                       finalResult.classification || 
                       'Chef Cookbook',
        
        // Rich summary from multiple sources
        summary: finalResult.functionality?.primary_purpose || 
                finalResult.detailed_analysis?.split('\n')[0] || // First line of detailed analysis
                finalResult.summary ||
                'Chef cookbook analysis completed',
        
        detailed_analysis: finalResult.detailed_analysis || 
                          finalResult.functionality?.primary_purpose ||
                          'No detailed analysis available',
        
        // Convertible status with smart fallback
        convertible: finalResult.convertible !== undefined ? 
                    finalResult.convertible : 
                    // Smart fallback - if we have services/packages, likely convertible
                    Boolean(finalResult.functionality?.services?.length || 
                           finalResult.functionality?.packages?.length ||
                           finalResult.version_requirements?.migration_effort === 'LOW'),
        
        // Enhanced conversion notes
        conversion_notes: finalResult.conversion_notes || 
                         (() => {
                           const effort = finalResult.version_requirements?.migration_effort;
                           const isConvertible = finalResult.convertible !== false;
                           if (isConvertible) {
                             return `This cookbook can be converted to Ansible with ${effort?.toLowerCase() || 'moderate'} effort. ${
                               finalResult.functionality?.primary_purpose ? 
                               `Primary function: ${finalResult.functionality.primary_purpose}` : ''
                             }`;
                           } else {
                             return 'Conversion not recommended for this cookbook.';
                           }
                         })(),
        
        // Complexity with intelligent fallback
        complexity_level: finalResult.complexity_level || 
                         (() => {
                           // Infer complexity from analysis
                           const services = finalResult.functionality?.services?.length || 0;
                           const packages = finalResult.functionality?.packages?.length || 0;
                           const files = finalResult.functionality?.files_managed?.length || 0;
                           const deps = finalResult.dependencies?.direct_deps?.length || 0;
                           
                           const totalComplexity = services + packages + files + deps;
                           
                           if (totalComplexity > 10) return 'High - Multiple services and complex configuration';
                           if (totalComplexity > 5) return 'Medium - Standard configuration with multiple components';
                           if (totalComplexity > 0) return 'Low - Simple configuration';
                           return 'Simple - Basic setup';
                         })(),
        
        // Rich key operations from multiple sources
        key_operations: finalResult.key_operations || 
                       (() => {
                         const operations = [];
                         if (finalResult.functionality?.services?.length) {
                           operations.push(`Service management (${finalResult.functionality.services.join(', ')})`);
                         }
                         if (finalResult.functionality?.packages?.length) {
                           operations.push(`Package installation (${finalResult.functionality.packages.join(', ')})`);
                         }
                         if (finalResult.functionality?.files_managed?.length) {
                           operations.push(`File management (${finalResult.functionality.files_managed.length} files)`);
                         }
                         if (finalResult.functionality?.customization_points?.length) {
                           operations.push(...finalResult.functionality.customization_points);
                         }
                         return operations.length > 0 ? operations : ['System configuration and management'];
                       })(),
        
        // Enhanced resources combining packages and services
        resources: [
          ...(finalResult.functionality?.packages || []),
          ...(finalResult.functionality?.services || []),
          ...(finalResult.resources || [])
        ].filter((item, index, arr) => arr.indexOf(item) === index), // Remove duplicates
        
        // Rich dependencies information
        dependencies: (() => {
          if (finalResult.dependencies) {
            const deps = finalResult.dependencies;
            const depInfo = [];
            
            if (deps.direct_deps?.length) {
              depInfo.push(`Direct Dependencies: ${deps.direct_deps.join(', ')}`);
            }
            if (deps.runtime_deps?.length) {
              depInfo.push(`Runtime Dependencies: ${deps.runtime_deps.join(', ')}`);
            }
            if (deps.wrapped_cookbooks?.length) {
              depInfo.push(`Wrapped Cookbooks: ${deps.wrapped_cookbooks.join(', ')}`);
            }
            if (deps.is_wrapper !== undefined) {
              depInfo.push(`Wrapper Cookbook: ${deps.is_wrapper ? 'Yes' : 'No'}`);
            }
            if (deps.circular_risk && deps.circular_risk !== 'none') {
              depInfo.push(`Circular Risk: ${deps.circular_risk.toUpperCase()}`);
            }
            
            return depInfo.length > 0 ? depInfo.join('\n') : 'No external dependencies identified';
          }
          return 'Dependencies information not available';
        })(),
        
        // Enhanced configuration details
        configuration_details: (() => {
          const configParts = [];
          
          // Add primary purpose
          if (finalResult.functionality?.primary_purpose) {
            configParts.push(`Purpose: ${finalResult.functionality.primary_purpose}`);
          }
          
          // Add version requirements
          if (finalResult.version_requirements?.min_chef_version) {
            configParts.push(`Chef Version: ${finalResult.version_requirements.min_chef_version}+`);
          }
          if (finalResult.version_requirements?.min_ruby_version) {
            configParts.push(`Ruby Version: ${finalResult.version_requirements.min_ruby_version}+`);
          }
          
          // Add reusability info
          if (finalResult.functionality?.reusability) {
            configParts.push(`Reusability: ${finalResult.functionality.reusability}`);
          }
          
          // Add files managed
          if (finalResult.functionality?.files_managed?.length) {
            configParts.push(`Managed Files: ${finalResult.functionality.files_managed.slice(0, 3).join(', ')}${
              finalResult.functionality.files_managed.length > 3 ? ` (+${finalResult.functionality.files_managed.length - 3} more)` : ''
            }`);
          }
          
          // Add customization points
          if (finalResult.functionality?.customization_points?.length) {
            configParts.push(`Customization: ${finalResult.functionality.customization_points.slice(0, 2).join(', ')}${
              finalResult.functionality.customization_points.length > 2 ? ` (+${finalResult.functionality.customization_points.length - 2} more)` : ''
            }`);
          }
          
          return configParts.length > 0 ? configParts.join('\n') : 
                 finalResult.configuration_details || 
                 'Standard Chef cookbook configuration';
        })(),
        
        // Timing information
        duration_ms: Date.now() - startTime,
        manual_estimate_ms: ((finalResult.version_requirements?.estimated_hours || 
                             finalResult.estimated_hours || 
                             2) * 60 * 60 * 1000),
        speedup: (() => {
          const hours = finalResult.version_requirements?.estimated_hours || 
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
        session_info: finalResult.session_info
      };

      console.log("🎯 Enhanced transformation result:", transformedResult);
      setClassificationResult(transformedResult);

      // Enhanced logging with rich backend data
      if (finalResult.metadata?.analyzed_at) {
        addLog(`⏱️ Analysis completed at ${new Date(finalResult.metadata.analyzed_at).toLocaleTimeString()}`);
      }
      
      if (finalResult.functionality?.primary_purpose) {
        addLog(`🎯 Purpose: ${finalResult.functionality.primary_purpose}`);
      }
      
      if (finalResult.version_requirements?.migration_effort) {
        const effort = finalResult.version_requirements.migration_effort;
        const hours = finalResult.version_requirements.estimated_hours;
        addLog(`📈 Migration: ${effort} effort${hours ? ` (${hours}h estimated)` : ''}`);
      }
      
      if (finalResult.recommendations?.consolidation_action) {
        addLog(`💡 Recommendation: ${finalResult.recommendations.consolidation_action}`);
      }
      
      if (transformedResult.speedup && transformedResult.speedup > 1) {
        addLog(`⚡ Analysis speedup: ${transformedResult.speedup.toFixed(1)}x faster than manual review`);
      }

    } catch (error) {
      const errorMessage = (error as Error).message;
      addLog(`❌ Classification failed: ${errorMessage}`);
      console.error("Classification error:", error);
      setClassificationResult(null);
    } finally {
      setLoading(false);
    }
  }, [BACKEND_URL, addLog, setLoading, setClassificationResult]);

  const handleManualClassify = useCallback(() => {
    if (loading) {
      addLog("⚠️ Classification already in progress");
      return;
    }
    if (!code.trim()) {
      addLog("⚠️ No code loaded. Please select or upload a file first");
      return;
    }
    classifyCode(code);
  }, [loading, code, addLog, classifyCode]);

  return {
    classifyCode,
    handleManualClassify,
  };
};