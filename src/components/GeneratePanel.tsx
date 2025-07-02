import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  SparklesIcon, 
  ClipboardDocumentIcon, 
  ExclamationCircleIcon,
  CodeBracketIcon,
  StopIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";

interface GeneratePanelProps {
  code: string;
  analysisFiles?: Record<string, string>;
  context: string;
  classificationResult?: unknown;
  onLogMessage?: (message: string) => void;
  onComplete?: (playbook: string) => void;
}

interface StreamingState {
  isStreaming: boolean;
  currentText: string;
  fullText: string;
  currentIndex: number;
}

type PanelMode = 'ready' | 'generating' | 'complete';

export default function GeneratePanel({ 
  code, 
  analysisFiles = {},
  context, 
  classificationResult, 
  onLogMessage, 
  onComplete 
}: GeneratePanelProps) {
  const [playbook, setPlaybook] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('ready');
  const [hasGenerated, setHasGenerated] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  // Streaming state
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    currentText: '',
    fullText: '',
    currentIndex: 0
  });

  const streamingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const codeCanvasRef = useRef<HTMLPreElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const logMessage = useCallback((msg: string) => {
    onLogMessage?.(msg);
  }, [onLogMessage]);

  const startStreaming = useCallback((fullText: string) => {
    setPanelMode('generating');
    setStreamingState({
      isStreaming: true,
      currentText: '',
      fullText,
      currentIndex: 0
    });
    let currentIndex = 0;
    streamingIntervalRef.current = setInterval(() => {
      if (currentIndex >= fullText.length) {
        setStreamingState(prev => ({ ...prev, isStreaming: false }));
        if (streamingIntervalRef.current) clearInterval(streamingIntervalRef.current);
        setPanelMode('complete');
        setHasGenerated(true);
        logMessage("✨ Playbook generation completed");
        if (onComplete) setTimeout(() => onComplete(fullText), 500);
        return;
      }
      let charsToAdd = 1;
      const char = fullText[currentIndex];
      if (char === '\n') charsToAdd = 1;
      else if (char === ' ') charsToAdd = Math.min(2, fullText.length - currentIndex);
      else if (/[a-zA-Z0-9]/.test(char)) charsToAdd = Math.min(3, fullText.length - currentIndex);
      const newText = fullText.substring(0, currentIndex + charsToAdd);
      setStreamingState(prev => ({
        ...prev,
        currentText: newText,
        currentIndex: currentIndex + charsToAdd
      }));
      currentIndex += charsToAdd;
      if (codeCanvasRef.current) codeCanvasRef.current.scrollTop = codeCanvasRef.current.scrollHeight;
    }, 20);
  }, [logMessage, onComplete]);

  const stopStreaming = useCallback(() => {
    if (streamingIntervalRef.current) clearInterval(streamingIntervalRef.current);
    setStreamingState(prev => ({
      ...prev,
      isStreaming: false,
      currentText: prev.fullText
    }));
    setPanelMode('complete');
    setHasGenerated(true);
    logMessage("⏹️ Streaming stopped");
  }, [logMessage]);

  const handleGenerate = useCallback(async () => {
    const hasAnalyzedFiles = Object.keys(analysisFiles).length > 0;
    const hasCode = code.trim();
    
    if (!hasAnalyzedFiles && !hasCode) {
      setError("No input code provided");
      logMessage("❌ No input code provided");
      return;
    }

    setLoading(true);
    setError(null);
    setPlaybook("");
    setStreamingState({ isStreaming: false, currentText: '', fullText: '', currentIndex: 0 });
    logMessage("🚀 Starting playbook generation...");
    
    try {
      // Use analyzed files if available, otherwise fall back to code
      const inputCode = hasAnalyzedFiles 
        ? Object.entries(analysisFiles)
            .map(([path, content]) => `# === FILE: ${path} ===\n${content}`)
            .join('\n\n')
        : code;
      
      const payload = {
        input_code: inputCode,
        context: context
      };
      
      logMessage(`📤 Sending ${hasAnalyzedFiles ? Object.keys(analysisFiles).length + ' files' : 'single file'} for conversion...`);
      
      // Use Next.js API route instead of direct backend call
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      if (data.playbook) {
        setPlaybook(data.playbook);
        startStreaming(data.playbook);
        logMessage(`✅ Playbook generated: ${data.playbook.length} characters`);
        if (onComplete) onComplete(data.playbook);
      } else {
        throw new Error("No playbook in response");
      }
    } catch (err: unknown) {
      const errorMessage = err?.message || "Generation failed";
      setError(errorMessage);
      logMessage(`❌ Generation failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [code, analysisFiles, context, startStreaming, onComplete, logMessage]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2000);
      logMessage("📋 Copied to clipboard");
    } catch (err) {
      logMessage("❌ Failed to copy to clipboard");
    }
  }, [logMessage]);

  // Check what data we have available
  const hasAnalyzedFiles = Object.keys(analysisFiles).length > 0;
  const hasCode = code.trim();
  const hasAnyData = hasAnalyzedFiles || hasCode;

  return (
    <div ref={panelRef} className="h-full w-full flex flex-col bg-black overflow-hidden">
      
      {/* Error Banner */}
      {error && (
        <div className="flex-shrink-0 mx-4 mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
          <div className="flex items-start space-x-3">
            <ExclamationCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-red-300 font-semibold text-sm">Generation Failed</h3>
              <p className="text-red-400/90 mt-1 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 text-red-400 hover:text-red-300 transition-colors rounded hover:bg-red-500/20"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Consolidated Header + Content */}
      <div className="flex-1 flex flex-col min-h-0 p-4">
        
        {/* Single Combined Header */}
        <div className="flex-shrink-0 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-bold text-white text-lg">Generate Ansible Content</h1>
                <p className="text-gray-400 text-sm">
                  Convert {hasAnalyzedFiles ? `${Object.keys(analysisFiles).length} files` : 'your code'} to Ansible
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Status */}
              {hasAnyData && (
                <div className="px-3 py-1.5 bg-green-900/30 border border-green-500/30 rounded-full flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-300 text-xs font-medium">
                    {hasAnalyzedFiles ? `${Object.keys(analysisFiles).length} Files Ready` : 'Code Ready'}
                  </span>
                </div>
              )}
              
              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={loading || streamingState.isStreaming || !hasAnyData}
                className={`px-4 py-2 rounded-lg font-semibold text-white transition-all duration-200 flex items-center gap-2 ${
                  loading || streamingState.isStreaming || !hasAnyData
                    ? "bg-gray-600 opacity-50 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl"
                }`}
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : hasGenerated ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4" />
                    <span>Regenerate</span>
                  </>
                ) : hasAnyData ? (
                  <>
                    <SparklesIcon className="w-4 h-4" />
                    <span>Generate</span>
                  </>
                ) : (
                  <>
                    <ExclamationCircleIcon className="w-4 h-4" />
                    <span>No Code</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Generation Status */}
          {(panelMode === 'generating' || panelMode === 'complete') && (
            <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <CodeBracketIcon className="w-5 h-5 text-emerald-400" />
                  {streamingState.isStreaming && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping"></div>
                  )}
                </div>
                <div>
                  <span className="text-white font-medium text-sm">
                    {streamingState.isStreaming ? 'Streaming...' : 
                     panelMode === 'complete' ? `Generated ${playbook.length} characters` : 'Processing...'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Status Badge */}
                {streamingState.isStreaming ? (
                  <div className="px-2 py-1 bg-emerald-900/30 border border-emerald-500/30 rounded-full">
                    <span className="text-emerald-300 text-xs font-medium">STREAMING</span>
                  </div>
                ) : panelMode === 'complete' ? (
                  <div className="px-2 py-1 bg-green-900/30 border border-green-500/30 rounded-full">
                    <span className="text-green-300 text-xs font-medium">COMPLETE</span>
                  </div>
                ) : null}
                
                {/* Action Buttons */}
                {streamingState.isStreaming && (
                  <button
                    onClick={stopStreaming}
                    className="p-1.5 text-red-400 hover:text-red-300 transition-colors rounded hover:bg-red-500/20"
                    title="Stop streaming"
                  >
                    <StopIcon className="w-4 h-4" />
                  </button>
                )}
                {(playbook || streamingState.currentText) && (
                  <button
                    onClick={() => copyToClipboard(playbook || streamingState.currentText)}
                    className="p-1.5 text-gray-400 hover:text-cyan-300 transition-colors rounded hover:bg-cyan-500/20 relative"
                    title="Copy YAML"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4" />
                    {copiedFeedback && (
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-green-500 text-white text-xs rounded font-medium">
                        Copied!
                      </div>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Code Display Area */}
        <div className="flex-1 min-h-0">
          {loading || streamingState.isStreaming ? (
            /* Professional Generation Animation */
            <div className="h-full bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center max-w-md px-6">
                  
                  {/* Animated Tech Stack */}
                  <div className="relative mb-8">
                    <div className="flex items-center justify-center space-x-4 mb-6">
                      
                      {/* Source Icon */}
                      <div className="relative">
                        <div className="w-12 h-12 bg-orange-500/20 border-2 border-orange-400/40 rounded-xl flex items-center justify-center transform transition-all duration-1000 animate-pulse">
                          <span className="text-orange-400 text-xl font-bold">🍳</span>
                        </div>
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-orange-400 font-medium">
                          {hasAnalyzedFiles ? `${Object.keys(analysisFiles).length} Files` : 'Source'}
                        </div>
                      </div>
                      
                      {/* Arrow Animation */}
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-0.5 bg-gradient-to-r from-cyan-400 to-transparent rounded animate-pulse"></div>
                        <div className="w-2 h-0.5 bg-gradient-to-r from-cyan-400 to-transparent rounded animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-0.5 bg-gradient-to-r from-cyan-400 to-transparent rounded animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        <div className="text-cyan-400 animate-bounce" style={{ animationDelay: '0.6s' }}>→</div>
                      </div>
                      
                      {/* AI Engine */}
                      <div className="relative">
                        <div className="w-16 h-12 bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-2 border-purple-400/50 rounded-xl flex items-center justify-center relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                          <span className="text-purple-400 text-lg font-bold relative z-10">🧠</span>
                        </div>
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-purple-400 font-medium">
                          AI Engine
                        </div>
                      </div>
                      
                      {/* Arrow Animation */}
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-0.5 bg-gradient-to-r from-green-400 to-transparent rounded animate-pulse" style={{ animationDelay: '0.8s' }}></div>
                        <div className="w-2 h-0.5 bg-gradient-to-r from-green-400 to-transparent rounded animate-pulse" style={{ animationDelay: '1.0s' }}></div>
                        <div className="w-2 h-0.5 bg-gradient-to-r from-green-400 to-transparent rounded animate-pulse" style={{ animationDelay: '1.2s' }}></div>
                        <div className="text-green-400 animate-bounce" style={{ animationDelay: '1.4s' }}>→</div>
                      </div>
                      
                      {/* Ansible Output */}
                      <div className="relative">
                        <div className="w-12 h-12 bg-red-500/20 border-2 border-red-400/40 rounded-xl flex items-center justify-center animate-pulse">
                          <span className="text-red-400 text-xl font-bold">🅰️</span>
                        </div>
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-red-400 font-medium">
                          Ansible
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status Text */}
                  <div className="mb-6">
                    <h3 className="text-white text-xl font-bold mb-2 flex items-center justify-center gap-2">
                      {streamingState.isStreaming ? (
                        <>
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          Streaming Playbook
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                          Generating Ansible Content
                        </>
                      )}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {streamingState.isStreaming 
                        ? 'AI agent is streaming your Ansible playbook...'
                        : 'AI agent is analyzing your infrastructure code...'
                      }
                    </p>
                  </div>
                  
                  {/* Progress Simulation */}
                  <div className="w-full bg-gray-800 rounded-full h-2 mb-6 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full animate-progress"></div>
                  </div>
                  
                  {/* Animated Steps */}
                  <div className="space-y-3">
                    {[
                      { text: 'Parsing infrastructure code', delay: '0s', icon: '📄' },
                      { text: 'Analyzing dependencies', delay: '1s', icon: '🔍' },
                      { text: 'Optimizing for Ansible', delay: '2s', icon: '⚙️' },
                      { text: streamingState.isStreaming ? 'Streaming results' : 'Generating YAML', delay: '3s', icon: streamingState.isStreaming ? '📡' : '📝' }
                    ].map((step, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/30 animate-step-reveal opacity-0"
                        style={{ 
                          animationDelay: step.delay,
                          animationFillMode: 'forwards'
                        }}
                      >
                        <span className="text-lg">{step.icon}</span>
                        <span className="text-gray-300 text-sm font-medium flex-1">{step.text}</span>
                        <div className="flex space-x-1">
                          <div className="w-1 h-1 bg-cyan-400 rounded-full animate-ping" style={{ animationDelay: '0s' }}></div>
                          <div className="w-1 h-1 bg-cyan-400 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-1 h-1 bg-cyan-400 rounded-full animate-ping" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Floating Particles */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-1 h-1 bg-cyan-400/60 rounded-full animate-float"
                        style={{
                          left: `${20 + Math.random() * 60}%`,
                          top: `${20 + Math.random() * 60}%`,
                          animationDelay: `${Math.random() * 3}s`,
                          animationDuration: `${3 + Math.random() * 2}s`
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (streamingState.currentText || playbook) ? (
            <div className="h-full bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
              <pre 
                ref={codeCanvasRef}
                className="h-full p-4 text-gray-100 font-mono text-sm leading-relaxed overflow-auto custom-scrollbar"
                style={{ 
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  tabSize: 2
                }}
              >
                {streamingState.currentText || playbook}
                {streamingState.isStreaming && (
                  <span className="inline-block w-0.5 h-4 bg-cyan-400 animate-pulse ml-1 align-middle" />
                )}
              </pre>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-900/30 border border-gray-700/30 rounded-xl">
              <div className="text-center max-w-md px-4">
                <div className="w-16 h-16 bg-gray-700/50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <CodeBracketIcon className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-gray-300 text-lg font-semibold mb-2">Ready to Generate</h3>
                <p className="text-gray-500 text-sm mb-6">
                  {hasAnyData 
                    ? "Click Generate to convert your infrastructure code to Ansible"
                    : "Upload files or complete analysis first to generate playbooks"
                  }
                </p>
                {hasAnyData && (
                  <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3">
                    <p className="text-blue-300 text-xs">
                      💡 Your {hasAnalyzedFiles ? 'analyzed files' : 'code'} will be converted to optimized Ansible YAML
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.2);
          border-radius: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.5);
          border-radius: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.7);
        }
        
        /* Professional Generation Animations */
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        
        @keyframes progress {
          0% { width: 0%; }
          20% { width: 30%; }
           { width: 60%; }
          80% { width: 85%; }
          100% { width: 95%; }
        }
        
        .animate-progress {
          animation: progress 4s ease-out infinite;
        }
        
        @keyframes step-reveal {
          from { 
            opacity: 0; 
            transform: translateY(10px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        .animate-step-reveal {
          animation: step-reveal 0.6s ease-out;
        }
        
        @keyframes float {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg); 
            opacity: 0.6; 
          }
          25% { 
            transform: translateY(-10px) rotate(90deg); 
            opacity: 1; 
          }
          50% { 
            transform: translateY(-20px) rotate(180deg); 
            opacity: 0.8; 
          }
          75% { 
            transform: translateY(-10px) rotate(270deg); 
            opacity: 1; 
          }
        }
        
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}