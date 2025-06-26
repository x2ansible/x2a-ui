import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  SparklesIcon, 
  ClipboardDocumentIcon, 
  ExclamationCircleIcon,
  CodeBracketIcon,
  PlayIcon,
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
        logMessage(` Playbook generated: ${data.playbook.length} characters`);
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
    <div ref={panelRef} className="h-full w-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {error && (
        <div className="mx-6 my-4 p-4 glassmorphism-error rounded-xl backdrop-blur-sm shadow-xl">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <ExclamationCircleIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-red-300 font-semibold text-base">Generation Failed</h3>
              <p className="text-red-400/90 mt-1 text-sm leading-relaxed">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 text-red-400 hover:text-red-300 transition-colors rounded-md hover:bg-red-500/20"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* MAIN SCROLL PANEL */}
      <div className="flex-1 p-6 min-h-0 overflow-y-auto generate-scrollbar">
        
        {/* Glass Morphism Header */}
        <div className="glassmorphism-header rounded-2xl p-6 mb-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                <SparklesIcon className="w-8 h-8 text-white relative z-10" />
              </div>
              <div>
                <h1 className="font-bold text-white text-2xl lg:text-3xl mb-1">Generate Ansible Playbook</h1>
                <p className="text-white/70 text-base">
                  AI-powered infrastructure conversion with {hasAnalyzedFiles ? `${Object.keys(analysisFiles).length} files` : 'your code'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Status Badge */}
              {hasAnyData && (
                <div className="px-3 py-1.5 glassmorphism-badge rounded-full flex items-center gap-2">
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
                className={`generate-button px-6 py-3 rounded-xl font-bold text-white shadow-xl transition-all duration-300 transform relative overflow-hidden ${
                  loading || streamingState.isStreaming || !hasAnyData
                    ? "opacity-70 cursor-not-allowed scale-95"
                    : "hover:scale-105 hover:shadow-2xl active:scale-95"
                }`}
              >
                {/* Button shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="flex items-center space-x-2 relative z-10">
                  {loading ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : hasGenerated ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5" />
                      <span>Regenerate</span>
                    </>
                  ) : hasAnyData ? (
                    <>
                      <SparklesIcon className="w-5 h-5" />
                      <span>Generate Playbook</span>
                    </>
                  ) : (
                    <>
                      <ExclamationCircleIcon className="w-5 h-5" />
                      <span>No Code Available</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Generation Results */}
        {(panelMode === 'generating' || panelMode === 'complete') && (
          <div className="space-y-6">
            
            {/* Glass Results Header */}
            <div className="glassmorphism-card rounded-xl p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                      <CodeBracketIcon className="w-6 h-6 text-white" />
                    </div>
                    {streamingState.isStreaming && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full animate-ping"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xl">Ansible Playbook</h3>
                    <p className="text-white/60 text-sm">
                      {streamingState.isStreaming ? 'Live streaming from AI agent...' : 
                        panelMode === 'complete' ? `Generated ${playbook.length} characters` : 'Processing...'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {/* Streaming Status */}
                  {streamingState.isStreaming && (
                    <div className="flex items-center space-x-2 px-3 py-1.5 glassmorphism-badge rounded-full">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                      <span className="text-emerald-300 text-xs font-medium">STREAMING</span>
                    </div>
                  )}
                  
                  {/* Complete Status */}
                  {panelMode === 'complete' && (
                    <div className="flex items-center space-x-2 px-3 py-1.5 glassmorphism-badge rounded-full">
                      <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300 text-xs font-medium">COMPLETE</span>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    {streamingState.isStreaming && (
                      <button
                        onClick={stopStreaming}
                        className="p-2 text-red-400 hover:text-red-300 transition-all duration-200 rounded-lg hover:bg-red-500/20 glassmorphism-button"
                        title="Stop streaming"
                      >
                        <StopIcon className="w-4 h-4" />
                      </button>
                    )}
                    {(playbook || streamingState.currentText) && (
                      <button
                        onClick={() => copyToClipboard(playbook || streamingState.currentText)}
                        className="p-2 text-white/60 hover:text-cyan-300 transition-all duration-200 rounded-lg hover:bg-cyan-500/20 glassmorphism-button relative"
                        title="Copy YAML"
                      >
                        <ClipboardDocumentIcon className="w-4 h-4" />
                        {copiedFeedback && (
                          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-green-500/90 backdrop-blur-sm text-white text-xs rounded-lg font-medium animate-fade-in border border-green-400/30">
                            Copied!
                          </div>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Glass Code Display */}
            <div className="glassmorphism-code rounded-xl overflow-hidden shadow-2xl">
              {(streamingState.currentText || playbook) ? (
                <pre 
                  ref={codeCanvasRef}
                  className="p-6 text-slate-100 font-mono text-sm leading-relaxed overflow-auto max-h-96 lg:max-h-[500px] generate-code-scrollbar"
                  style={{ 
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, monospace',
                    tabSize: 2,
                    background: 'rgba(0,0,0,0.3)'
                  }}
                >
                  {streamingState.currentText || playbook}
                  {streamingState.isStreaming && (
                    <span className="inline-block w-2 h-5 bg-cyan-400 animate-pulse ml-1 align-top" />
                  )}
                </pre>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 glassmorphism-placeholder rounded-xl flex items-center justify-center mx-auto mb-4">
                    <CodeBracketIcon className="w-8 h-8 text-white/50" />
                  </div>
                  <p className="text-white/70 text-lg font-medium mb-2">Preparing Generation</p>
                  <p className="text-white/50 text-sm">
                    AI agent is processing your infrastructure code...
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!context && !classificationResult && (
          <div className="text-center py-16">
            <div className="w-20 h-20 glassmorphism-empty rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <SparklesIcon className="w-10 h-10 text-white/70" />
            </div>
            <h3 className="text-white/90 text-2xl font-bold mb-3">Ready for AI Conversion</h3>
            <p className="text-white/60 text-lg mb-8 max-w-md mx-auto">
              Complete context analysis first to see intelligent conversion insights and generate your Ansible playbook
            </p>
            <div className="glassmorphism-info rounded-lg p-4 max-w-sm mx-auto">
              <p className="text-white/50 text-sm">
                📋 Context analysis will unlock detailed infrastructure analysis and conversion strategy
              </p>
            </div>
          </div>
        )}

      </div>
      
      {/* Add Glass Morphism Styles */}
      <style jsx>{`
        .glassmorphism-header {
          background: rgba(59, 130, 246, 0.1);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(59, 130, 246, 0.2);
          box-shadow: 
            0 8px 32px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.1);
        }
        
        .glassmorphism-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 
            0 8px 32px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.1);
        }
        
        .glassmorphism-code {
          background: rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 
            0 8px 32px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,255,255,0.05);
        }
        
        .glassmorphism-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          box-shadow: 
            0 8px 32px rgba(239, 68, 68, 0.2),
            inset 0 1px 0 rgba(255,255,255,0.1);
        }
        
        .glassmorphism-badge {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .glassmorphism-button {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .glassmorphism-empty {
          background: rgba(148, 163, 184, 0.1);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          box-shadow: 
            0 8px 32px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.1);
        }
        
        .glassmorphism-info {
          background: rgba(59, 130, 246, 0.1);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        
        .glassmorphism-placeholder {
          background: rgba(148, 163, 184, 0.2);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(148, 163, 184, 0.2);
        }
        
        .generate-button {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(37, 99, 235, 0.9));
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(59, 130, 246, 0.3);
          box-shadow: 
            0 8px 32px rgba(59, 130, 246, 0.3),
            inset 0 1px 0 rgba(255,255,255,0.2);
        }
        
        .generate-button:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(37, 99, 235, 1));
          box-shadow: 
            0 12px 40px rgba(59, 130, 246, 0.4),
            inset 0 1px 0 rgba(255,255,255,0.2);
        }
        
        .generate-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        
        .generate-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        
        .generate-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(45deg, rgba(59, 130, 246, 0.5), rgba(168, 85, 247, 0.5));
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        
        .generate-code-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .generate-code-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.2);
          border-radius: 6px;
        }
        
        .generate-code-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.5);
          border-radius: 6px;
        }
        
        .generate-code-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.7);
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}