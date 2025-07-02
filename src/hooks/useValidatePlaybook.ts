import { useState, useCallback, useRef } from 'react';

// --- Enhanced Types for Rich Streaming ---
interface ValidationStep {
  step: number;
  agent_action: 'lint' | 'llm_fix';
  summary: string;
  code: string;
  message?: string;
  timestamp?: number;
}

interface StreamingProgress {
  type: 'progress' | 'final_result' | 'error';
  message?: string;
  step?: number;
  agent_action?: 'lint' | 'llm_fix';
  summary?: string;
  code?: string;
  data?: {
    passed: boolean;
    final_code: string;
    steps: ValidationStep[];
  };
}

interface EnhancedValidationResult {
  passed: boolean;
  final_code: string;
  original_code: string;
  steps: ValidationStep[];
  total_steps: number;
  duration_ms?: number;
  summary: {
    fixes_applied: number;
    lint_iterations: number;
    final_status: 'passed' | 'failed';
  };
  // Legacy compatibility
  issues: ValidationStep[];
  raw_output: string;
  debug_info: {
    status: string;
    playbook_length: number;
    steps_completed: number;
    [key: string]: unknown;
  };
  error_message?: string;
}

interface ValidationRequest {
  playbook: string;
  lint_profile?: string;
}

interface ValidationState {
  validationResult: EnhancedValidationResult | null;
  isValidating: boolean;
  validationError: string | null;
  progress: string | null;
  currentStep: ValidationStep | null;
  steps: ValidationStep[];
  streamingActive: boolean;
}

// --- Enhanced Hook ---
export const useValidatePlaybook = () => {
  const [state, setState] = useState<ValidationState>({
    validationResult: null,
    isValidating: false,
    validationError: null,
    progress: null,
    currentStep: null,
    steps: [],
    streamingActive: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);

  const updateState = useCallback((updates: Partial<ValidationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const validatePlaybook = useCallback(
    async ({ playbook, lint_profile = "production" }: ValidationRequest) => {
      // Reset state
      const startTime = Date.now();
      startTimeRef.current = startTime;
      
      setState({
        validationResult: null,
        isValidating: true,
        validationError: null,
        progress: "Initializing validation...",
        currentStep: null,
        steps: [],
        streamingActive: false,
      });

      // Create abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Add overall timeout
      const timeoutId = setTimeout(() => {
        abortController.abort();
        updateState({
          validationError: "Validation timed out after 2 minutes",
          isValidating: false,
          progress: null,
          streamingActive: false,
        });
        console.log("[useValidatePlaybook] Validation timed out");
      }, 120000);

      try {
        const cleanedPlaybook = playbook.trim();
        if (!cleanedPlaybook) {
          throw new Error("No playbook content to validate");
        }

        updateState({ progress: "Connecting to validation service..." });

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
          updateState({ progress: "Processing validation results..." });
          const result = await response.json();
          console.log("[useValidatePlaybook] Received direct JSON response");
          
          const enhancedResult = createEnhancedResult(result, cleanedPlaybook, []);
          updateState({
            validationResult: enhancedResult,
            progress: null,
            isValidating: false,
            streamingActive: false,
          });
          return;
        }

        // Handle streaming response
        if (!contentType?.includes("text/event-stream")) {
          throw new Error(`Unexpected content type: ${contentType}`);
        }

        if (!response.body) {
          throw new Error("No response body received");
        }

        updateState({ 
          progress: "Processing streaming response...",
          streamingActive: true 
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let collectedSteps: ValidationStep[] = [];
        let streamComplete = false;

        try {
          while (!streamComplete) {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log("[useValidatePlaybook] Stream reading completed");
              streamComplete = true;
              break;
            }
            
            if (!value) continue;
            
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine) continue;
              
              try {
                let data: StreamingProgress;
                
                if (trimmedLine.startsWith('data: ')) {
                  const dataStr = trimmedLine.slice(6);
                  if (dataStr === '[DONE]') {
                    console.log("[useValidatePlaybook] Received [DONE] signal");
                    streamComplete = true;
                    break;
                  }
                  data = JSON.parse(dataStr);
                } else {
                  data = JSON.parse(trimmedLine);
                }

                // Handle different message types
                if (data.type === "progress") {
                  const step: ValidationStep = {
                    step: data.step || collectedSteps.length + 1,
                    agent_action: data.agent_action || 'lint',
                    summary: data.summary || data.message || '',
                    code: data.code || '',
                    message: data.message,
                    timestamp: Date.now(),
                  };

                  collectedSteps.push(step);
                  
                  updateState({
                    progress: data.message || `Step ${step.step}: ${step.agent_action}`,
                    currentStep: step,
                    steps: [...collectedSteps],
                  });

                  console.log(`[useValidatePlaybook] Progress Step ${step.step}:`, step.agent_action);
                } 
                else if (data.type === "final_result" && data.data) {
                  console.log("[useValidatePlaybook] Received final result");
                  
                  const finalData = data.data;
                  const enhancedResult = createEnhancedResult(finalData, cleanedPlaybook, collectedSteps);
                  
                  updateState({
                    validationResult: enhancedResult,
                    progress: null,
                    isValidating: false,
                    streamingActive: false,
                  });
                  
                  streamComplete = true;
                  break;
                } 
                else if (data.type === "error") {
                  throw new Error(data.message || "Validation error occurred");
                }
              } catch (parseError) {
                console.warn("[useValidatePlaybook] Failed to parse line:", trimmedLine, parseError);
                continue;
              }
            }
          }
          
        } catch (streamError) {
          throw streamError;
        } finally {
          try {
            reader.releaseLock();
          } catch (lockError) {
            console.warn("[useValidatePlaybook] Error releasing reader lock:", lockError);
          }
        }

        // If we reach here without a final result, create one from collected steps
        if (!state.validationResult && collectedSteps.length > 0) {
          const lastStep = collectedSteps[collectedSteps.length - 1];
          const mockResult = {
            passed: lastStep.agent_action === 'lint' && lastStep.summary.includes('No issues'),
            final_code: lastStep.code || cleanedPlaybook,
            steps: collectedSteps,
          };
          
          const enhancedResult = createEnhancedResult(mockResult, cleanedPlaybook, collectedSteps);
          updateState({
            validationResult: enhancedResult,
            progress: null,
            isValidating: false,
            streamingActive: false,
          });
        }

      } catch (error: unknown) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          console.log("[useValidatePlaybook] Validation was cancelled");
          updateState({
            progress: "Validation cancelled",
            isValidating: false,
            streamingActive: false,
          });
          return;
        }

        const errorMessage = error.message || "Validation failed";
        console.error("[useValidatePlaybook] Validation error:", errorMessage);
        
        updateState({
          validationError: errorMessage,
          isValidating: false,
          progress: null,
          streamingActive: false,
          validationResult: {
            passed: false,
            final_code: playbook,
            original_code: playbook,
            steps: state.steps,
            total_steps: state.steps.length,
            summary: {
              fixes_applied: 0,
              lint_iterations: 0,
              final_status: 'failed',
            },
            issues: [],
            raw_output: errorMessage,
            error_message: errorMessage,
            debug_info: {
              status: "error",
              error_count: 1,
              playbook_length: playbook?.length || 0,
              steps_completed: state.steps.length,
            }
          }
        });
      }
    },
    [state.steps, updateState]
  );

  const cancelValidation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      updateState({
        isValidating: false,
        progress: "Cancelling validation...",
        streamingActive: false,
        validationError: "Validation cancelled",
      });
      
      setTimeout(() => updateState({ progress: null }), 1000);
    }
  }, [updateState]);

  const resetValidation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setState({
      validationResult: null,
      isValidating: false,
      validationError: null,
      progress: null,
      currentStep: null,
      steps: [],
      streamingActive: false,
    });
    
    abortControllerRef.current = null;
    console.log("[useValidatePlaybook] State reset");
  }, []);

  return {
    ...state,
    validatePlaybook,
    cancelValidation,
    resetValidation,
  };
};

// Helper function to create enhanced result
function createEnhancedResult(
  data: any, 
  originalCode: string, 
  streamSteps: ValidationStep[]
): EnhancedValidationResult {
  const steps = data.steps || streamSteps || [];
  const finalCode = data.final_code || originalCode;
  
  const lintSteps = steps.filter((s: ValidationStep) => s.agent_action === 'lint');
  const fixSteps = steps.filter((s: ValidationStep) => s.agent_action === 'llm_fix');
  
  return {
    passed: data.passed || false,
    final_code: finalCode,
    original_code: originalCode,
    steps: steps,
    total_steps: steps.length,
    summary: {
      fixes_applied: fixSteps.length,
      lint_iterations: lintSteps.length,
      final_status: data.passed ? 'passed' : 'failed',
    },
    // Legacy compatibility
    issues: steps.filter((s: ValidationStep) => s.agent_action === 'lint' && s.summary.includes('Failed')),
    raw_output: steps.map((s: ValidationStep) => `Step ${s.step} (${s.agent_action}): ${s.summary}`).join('\n\n'),
    debug_info: {
      status: data.passed ? "passed" : "failed",
      playbook_length: originalCode.length,
      steps_completed: steps.length,
      lint_iterations: lintSteps.length,
      fixes_applied: fixSteps.length,
    },
    error_message: data.passed ? undefined : "Validation completed with issues",
  };
}