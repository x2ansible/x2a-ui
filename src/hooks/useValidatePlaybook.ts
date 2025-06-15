import { useState, useCallback, useRef } from 'react';

// --- Types ---
interface ValidatePlaybookResult {
  passed: boolean;
  summary: string | any;
  issues: Array<any>;
  raw_output: string | { stdout?: string; stderr?: string };
  raw_stdout?: string;
  raw_stderr?: string;
  debug_info: {
    status?: string;
    playbook_length?: number;
    num_issues?: number;
    error_count?: number;
    warning_count?: number;
    info_count?: number;
    exit_code?: number;
    profile_used?: string;
    [key: string]: unknown;
  };
  error_message?: string;
}

interface ValidationRequest {
  playbook: string;
  lint_profile?: string;
}

interface StreamResponse {
  type?: string;
  message?: string;
  data?: unknown;
  tool?: string;
  output?: unknown;
  passed?: boolean;
  summary?: unknown;
  issues?: unknown[];
  raw_output?: unknown;
  debug_info?: unknown;
  error_message?: string;
}

// --- Utilities ---
const isValidationResult = (data: unknown): boolean => {
  return data && (
    data.passed !== undefined ||
    data.summary !== undefined ||
    data.issues !== undefined ||
    (data.tool === "lint_ansible_playbook" && data.output)
  );
};

const transformBackendResponse = (data: unknown, playbookLength: number = 0): ValidatePlaybookResult => {
  // Handle backend tool execution format
  if (data.tool === "lint_ansible_playbook" && data.output) {
    const output = data.output;
    const summary = output.summary || {};
    
    return {
      passed: summary.passed || false,
      summary: summary,
      issues: output.issues || [],
      raw_output: output.raw_output || "",
      debug_info: {
        status: summary.passed ? "passed" : "failed",
        playbook_length: playbookLength,
        exit_code: summary.exit_code,
        profile_used: summary.profile_used,
        issue_count: summary.issue_count || 0,
        error_count: summary.error_count || 0,
        warning_count: summary.warning_count || 0,
        ...summary
      },
      error_message: summary.passed ? undefined : extractErrorFromOutput(output.raw_output)
    };
  }
  
  // Handle direct validation result format
  if (data.passed !== undefined || data.summary !== undefined) {
    return {
      passed: data.passed || false,
      summary: data.summary || {},
      issues: data.issues || [],
      raw_output: data.raw_output || "",
      raw_stdout: data.raw_stdout,
      raw_stderr: data.raw_stderr,
      debug_info: {
        status: data.passed ? "passed" : "failed",
        playbook_length: playbookLength,
        ...data.debug_info
      },
      error_message: data.error_message
    };
  }
  
  // Fallback for unknown format
  return {
    passed: false,
    summary: "Unknown response format",
    issues: [],
    raw_output: JSON.stringify(data, null, 2),
    debug_info: {
      status: "error",
      playbook_length: playbookLength,
      error_count: 1
    },
    error_message: "Received unexpected response format from validation service"
  };
};

const extractErrorFromOutput = (rawOutput: unknown): string => {
  if (typeof rawOutput === 'string') {
    return rawOutput.trim();
  }
  
  if (typeof rawOutput === 'object' && rawOutput) {
    if (rawOutput.stderr && rawOutput.stderr.trim()) {
      return rawOutput.stderr.trim();
    }
    if (rawOutput.stdout && rawOutput.stdout.trim()) {
      return rawOutput.stdout.trim();
    }
  }
  
  return "Validation failed - check raw output for details";
};

// --- Main Hook ---
export const useValidatePlaybook = () => {
  const [validationResult, setValidationResult] = useState<ValidatePlaybookResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const validatePlaybook = useCallback(
    async ({ playbook, lint_profile = "production" }: ValidationRequest) => {
      // Reset state
      setIsValidating(true);
      setValidationError(null);
      setValidationResult(null);
      setProgress("Initializing validation...");

      // Create abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Add overall timeout to prevent infinite hanging
      const timeoutId = setTimeout(() => {
        abortController.abort();
        setValidationError("Validation timed out after 2 minutes");
        setIsValidating(false);
        setProgress(null);
        console.log("[useValidatePlaybook] Validation timed out");
      }, 120000); // 2 minutes timeout

      try {
        // Clean playbook content
        const cleanedPlaybook = playbook.trim();
        if (!cleanedPlaybook) {
          throw new Error("No playbook content to validate");
        }

        setProgress("Connecting to validation service...");

        const response = await fetch('/api/validate/playbook/stream', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream, application/json',
          },
          body: JSON.stringify({ 
            playbook_content: cleanedPlaybook, 
            profile: lint_profile 
          }),
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Validation request failed: ${response.status} - ${errorText}`);
        }

        const contentType = response.headers.get("content-type");

        // Handle direct JSON response
        if (contentType?.includes("application/json")) {
          setProgress("Processing validation results...");
          const result = await response.json();
          console.log("[useValidatePlaybook] Received direct JSON response");
          const transformedResult = transformBackendResponse(result, cleanedPlaybook.length);
          setValidationResult(transformedResult);
          setProgress(null);
          return;
        }

        // Handle streaming response
        if (!contentType?.includes("text/event-stream")) {
          throw new Error(`Unexpected content type: ${contentType}`);
        }

        if (!response.body) {
          throw new Error("No response body received");
        }

        setProgress("Processing streaming response...");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalResult: unknown = null;
        let streamComplete = false;

        // Add stream timeout
        const streamTimeoutId = setTimeout(() => {
          reader.cancel();
          throw new Error("Stream processing timed out after 90 seconds");
        }, 90000);

        try {
          let iterationCount = 0;
          const MAX_ITERATIONS = 1000; // Prevent infinite loops
          
          while (!streamComplete && iterationCount < MAX_ITERATIONS) {
            iterationCount++;
            
            const { done, value } = await reader.read();
            
            if (done) {
              console.log("[useValidatePlaybook] Stream reading completed naturally");
              streamComplete = true;
              break;
            }
            
            if (!value) {
              console.warn("[useValidatePlaybook] Received empty value from stream");
              continue;
            }
            
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer
            
            let shouldBreakStream = false;
            
            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine) continue;
              
              try {
                let data: StreamResponse;
                
                // Handle SSE format
                if (trimmedLine.startsWith('data: ')) {
                  const dataStr = trimmedLine.slice(6);
                  if (dataStr === '[DONE]') {
                    console.log("[useValidatePlaybook] Received [DONE] signal");
                    streamComplete = true;
                    shouldBreakStream = true;
                    break;
                  }
                  data = JSON.parse(dataStr);
                } else {
                  // Try parsing as direct JSON
                  data = JSON.parse(trimmedLine);
                }

                // Handle different message types
                if (data.type === "progress" && data.message) {
                  setProgress(data.message);
                  console.log("[useValidatePlaybook] Progress:", data.message);
                } 
                else if (data.type === "final_result" && data.data) {
                  console.log("[useValidatePlaybook] Received final_result event");
                  finalResult = data.data;
                  streamComplete = true;
                  shouldBreakStream = true;
                  break;
                } 
                else if (data.type === "error") {
                  throw new Error(data.message || "Validation error occurred");
                }
                // Handle backend tool execution format
                else if (data.tool === "lint_ansible_playbook" && data.output) {
                  console.log("[useValidatePlaybook] Received tool execution result");
                  finalResult = data;
                  streamComplete = true;
                  shouldBreakStream = true;
                  break;
                }
                // Handle direct validation result format
                else if (isValidationResult(data)) {
                  console.log("[useValidatePlaybook] Received direct validation result");
                  finalResult = data;
                  streamComplete = true;
                  shouldBreakStream = true;
                  break;
                }
              } catch (parseError) {
                console.warn("[useValidatePlaybook] Failed to parse line:", trimmedLine, parseError);
                continue;
              }
            }
            
            // Break outer loop if needed
            if (shouldBreakStream) {
              break;
            }
            
            // Additional safety check
            if (finalResult) {
              streamComplete = true;
              break;
            }
          }
          
          clearTimeout(streamTimeoutId);
          
          if (iterationCount >= MAX_ITERATIONS) {
            throw new Error("Stream processing exceeded maximum iterations - possible infinite loop");
          }
          
        } catch (streamError) {
          clearTimeout(streamTimeoutId);
          throw streamError;
        } finally {
          try {
            reader.releaseLock();
          } catch (lockError) {
            console.warn("[useValidatePlaybook] Error releasing reader lock:", lockError);
          }
        }

        // Process final result
        if (finalResult) {
          const transformedResult = transformBackendResponse(finalResult, cleanedPlaybook.length);
          setValidationResult(transformedResult);
          setProgress(null);
          console.log("[useValidatePlaybook] Validation completed:", transformedResult.passed ? "PASSED" : "FAILED");
        } else {
          // If we reach here without a result, treat it as an error
          throw new Error("Stream ended without providing validation result");
        }

      } catch (error: unknown) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          console.log("[useValidatePlaybook] Validation was cancelled");
          setProgress("Validation cancelled");
          return;
        }

        const errorMessage = error.message || "Validation failed";
        console.error("[useValidatePlaybook] Validation error:", errorMessage);
        setValidationError(errorMessage);
        
        // Create a mock failed result for UI consistency
        setValidationResult({
          passed: false,
          summary: "Validation Error",
          issues: [],
          raw_output: errorMessage,
          error_message: errorMessage,
          debug_info: {
            status: "error",
            error_count: 1,
            playbook_length: playbook?.length || 0
          }
        });
      } finally {
        setIsValidating(false);
        setProgress(null);
        abortControllerRef.current = null;
      }
    },
    []
  );

  const cancelValidation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsValidating(false);
      setProgress("Cancelling validation...");
      setValidationError("Validation cancelled");
      
      // Clear progress after a short delay
      setTimeout(() => setProgress(null), 1000);
    }
  }, []);

  const resetValidation = useCallback(() => {
    // Cancel any ongoing validation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Reset all state
    setValidationResult(null);
    setValidationError(null);
    setProgress(null);
    setIsValidating(false);
    abortControllerRef.current = null;
    
    console.log("[useValidatePlaybook] State reset");
  }, []);

  return {
    validationResult,
    isValidating,
    validationError,
    progress,
    validatePlaybook,
    cancelValidation,
    resetValidation,
  };
};