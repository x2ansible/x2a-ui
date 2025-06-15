import React, { useState, useEffect, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import dynamic from "next/dynamic";

// Dynamically import SyntaxHighlighter to avoid SSR issues
const SyntaxHighlighter = dynamic(
  () => import("react-syntax-highlighter").then((mod) => mod.Prism),
  { 
    ssr: false,
    loading: () => (
      <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto">
        <code>Loading...</code>
      </pre>
    )
  }
);

// Dynamically import the theme
const oneDark = dynamic(
  () => import("react-syntax-highlighter/dist/esm/styles/prism").then((mod) => mod.oneDark),
  { ssr: false }
);
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClipboardDocumentIcon
} from "@heroicons/react/24/outline";

interface ContextPanelProps {
  code: string;
  analysisFiles?: Record<string, string>; // NEW: All analyzed files for context
  onLogMessage?: (msg: string) => void;
  onContextRetrieved?: (context: string) => void;
}

interface ContextItem {
  text: string;
  type?: string;
  source?: string;
}

interface ContextResult {
  success: boolean;
  context: ContextItem[];
  steps?: unknown[];
}

const ContextPanel: React.FC<ContextPanelProps> = ({
  code,
  analysisFiles = {}, // NEW: Default to empty object
  onLogMessage,
  onContextRetrieved,
}) => {
  const [result, setResult] = useState<ContextResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());
  const hasLoggedInit = useRef(false);

  // For animated "Copied!" feedback
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Logging utility
  const logMessage = useCallback(
    (message: string) => {
      if (onLogMessage) onLogMessage(message);
      if (process.env.NODE_ENV !== "production") console.log("[ContextPanel]", message);
    },
    [onLogMessage]
  );

  useEffect(() => {
    if (!hasLoggedInit.current && (code || Object.keys(analysisFiles).length > 0)) {
      logMessage("🔧 Context Panel initialized");
      hasLoggedInit.current = true;
    }
  }, [logMessage, code, analysisFiles]);

  const toggleChunkExpansion = (index: number) => {
    setExpandedChunks((prev) => {
      const copy = new Set(prev);
      copy.has(index) ? copy.delete(index) : copy.add(index);
      return copy;
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      logMessage("Copied pattern to clipboard");
    } catch {
      logMessage("Failed to copy to clipboard");
    }
  };

  const handleCopyWithFeedback = async (text: string, i: number) => {
    await copyToClipboard(text);
    setCopiedIndex(i);
    setTimeout(() => setCopiedIndex(null), 1200);
  };

  // Helper function to clean context content
  const cleanContextContent = (text: string): string => {
    return text
      // Remove tool invocation messages
      .replace(/Invoking knowledge_search tool to retrieve relevant context for the given code\.\.\.\s*/g, '')
      // Remove all search pattern messages
      .replace(/Searching for patterns related to [^.]*\.\.\.\s*/g, '')
      // Remove "Retrieved context:" header
      .replace(/Retrieved context:\s*/g, '')
      // Remove excessive newlines (3+ newlines become 2)
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      // Remove leading/trailing whitespace
      .trim();
  };

  const handleQuery = async () => {
    // NEW: Check for analyzed files first, fall back to code
    const hasAnalyzedFiles = Object.keys(analysisFiles).length > 0;
    const hasCode = code.trim();

    if (!hasAnalyzedFiles && !hasCode) {
      setError("No Infrastructure as Code to analyze");
      logMessage("⚠️ Error: No code or analyzed files available");
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);
    setHasQueried(true);

    const startTime = Date.now();
    try {
      // Use the streaming endpoint
      const apiUrl = process.env.NEXT_PUBLIC_CONTEXT_QUERY_API || "http://localhost:8000/api/context/query/stream";
      
      logMessage(`🔗 Connecting to: ${apiUrl}`);
      
      // NEW: Determine what to send based on available data
      let requestBody;
      if (hasAnalyzedFiles) {
        logMessage(`📤 Sending ${Object.keys(analysisFiles).length} analyzed files for context discovery...`);
        logMessage(`📄 Files: ${Object.keys(analysisFiles).join(", ")}`);
        
        // For now, combine files into a single code block since the backend might expect 'code' field
        const combinedCode = Object.entries(analysisFiles)
          .map(([path, content]) => `// === FILE: ${path} ===\n${content}`)
          .join('\n\n');
        
        requestBody = { 
          code: combinedCode, // Combined code for compatibility
          top_k: 5 
        };
        
        logMessage(`📋 Request body preview: ${JSON.stringify(requestBody).substring(0, 200)}...`);
      } else {
        logMessage("📤 Sending single code block for context discovery...");
        requestBody = { 
          code: code,
          top_k: 5 
        };
        logMessage(`📋 Request body preview: ${JSON.stringify(requestBody).substring(0, 200)}...`);
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream", // Important for streaming
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Try to get the error details from the response
        let errorDetails;
        try {
          const errorText = await response.text();
          logMessage(`🔍 Error response body: ${errorText}`);
          errorDetails = errorText;
        } catch {
          errorDetails = response.statusText;
        }
        throw new Error(`HTTP ${response.status}: ${errorDetails}`);
      }

      logMessage("📡 Receiving streaming response...");

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body reader available");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: unknown = null;
      let contextItems: ContextItem[] = [];

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
              
              // Filter out all search pattern messages completely
              const isSearchPattern = eventData.msg?.includes('Searching for patterns related to') || 
                                    eventData.message?.includes('Searching for patterns related to');
              
              // Only log important events, not search patterns (those go to agent log only)
              if (eventData.event === 'result') {
                console.log("🎯 Found context result:", eventData);
                finalResult = eventData;
                if (eventData.context && Array.isArray(eventData.context)) {
                  contextItems = eventData.context;
                  logMessage(`📄 Found ${contextItems.length} context pattern(s)`);
                }
              } else if (eventData.event === 'start') {
                logMessage(`⚡ Context search started`);
              } else if (eventData.event === 'progress' && !isSearchPattern) {
                // Only log non-search progress messages
                logMessage(`📊 ${eventData.msg || eventData.message || 'Processing...'}`);
              }
              // Completely skip logging any search pattern messages
            } catch (parseError) {
              console.warn("Failed to parse event data:", line, parseError);
            }
          }
        }
      }

      const duration = Date.now() - startTime;

      // If we got context items during streaming, use them
      if (contextItems.length > 0) {
        // Clean up the context items by removing search pattern messages AND agent tool invocations
        const cleanedContextItems = contextItems.map(item => ({
          ...item,
          text: cleanContextContent(item.text)
        })).filter(item => item.text.length > 0); // Remove empty items

        finalResult = {
          success: true,
          context: cleanedContextItems
        };
      }

      if (!finalResult || !finalResult.context) {
        throw new Error("No context patterns found in the knowledge base");
      }

      logMessage(` Context retrieved in ${duration}ms (${finalResult.context.length} patterns)`);

      setResult({
        success: true,
        context: finalResult.context
      });
      setError(null);

      if (finalResult.context.length && onContextRetrieved) {
        onContextRetrieved(finalResult.context.map((c) => c.text).join("\n\n"));
      }
    } catch (err: unknown) {
      const duration = Date.now() - startTime;
      const errorMessage = err?.message || "Unknown error in context discovery";
      setError(errorMessage);
      logMessage(` Context discovery failed after ${duration}ms: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Markdown Components: Hydration-safe code renderer ---
  const markdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || "");
      
      if (inline) {
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      }

      // Use div wrapper instead of letting ReactMarkdown create a p tag
      return (
        <div style={{ margin: "0.5em 0" }}>
          <SyntaxHighlighter
            style={oneDark || {}}
            language={match ? match[1] : ""}
            customStyle={{
              borderRadius: 12,
              padding: "1.2em",
              fontSize: "1em",
              background: "#23272e",
              boxShadow: "0 2px 24px 0 rgba(20,40,100,0.20)",
              margin: 0
            }}
            {...props}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        </div>
      );
    },
    // Override paragraph to prevent p > div issues
    p({ children }: any) {
      return <div className="mb-4">{children}</div>;
    },
  };

  // --- Enhanced context card render with modern design ---
  const renderResults = () => {
    if (!result) return null;
    const patterns = result.context || [];
    if (!patterns.length) {
      return (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MagnifyingGlassIcon className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-400 text-lg font-medium">No Conversion Patterns Found</p>
          <p className="text-slate-500 text-sm mt-1">Try adjusting your search criteria or check your knowledge base</p>
        </div>
      );
    }

    return (
      <div className="context-results space-y-6">
        {patterns.map((item, i) => {
          const isExpanded = expandedChunks.has(i);
          const lines = item.text?.split("\n") || [];
          const preview =
            lines.slice(0, 12).join("\n").slice(0, 800) +
            ((lines.length > 12 || (item.text?.length ?? 0) > 800) ? "\n\n..." : "");
          const hasMore = lines.length > 12 || (item.text?.length ?? 0) > 800;

          // Enhanced gradient borders with more variety
          const borderGradients = [
            "from-cyan-400 via-blue-500 to-indigo-600",
            "from-pink-400 via-violet-500 to-purple-600", 
            "from-emerald-400 via-cyan-500 to-teal-600",
            "from-yellow-400 via-orange-500 to-red-500",
            "from-indigo-400 via-purple-500 to-pink-600"
          ];
          const borderClass = borderGradients[i % borderGradients.length];

          return (
            <div
              key={i}
              className="group relative rounded-2xl overflow-hidden shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300 transform hover:-translate-y-1"
              style={{ 
                background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.8) 100%)", 
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(148, 163, 184, 0.1)"
              }}
            >
              {/* Enhanced gradient border */}
              <div className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${borderClass} opacity-80 group-hover:opacity-100 group-hover:w-1.5 transition-all duration-300`} />
              
              <div className="relative p-6">
                {/* Enhanced Pattern Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${borderClass} rounded-xl flex items-center justify-center shadow-lg`}>
                      <span className="text-white text-lg font-bold">{i + 1}</span>
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        🔍 Pattern {i + 1}
                        {/* Enhanced metadata pills */}
                        {item.type && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 text-blue-300">
                            {item.type}
                          </span>
                        )}
                        {item.source && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 text-emerald-300">
                            {item.source}
                          </span>
                        )}
                      </h3>
                      <p className="text-slate-400 text-sm mt-0.5">
                        {item.text.length.toLocaleString()} characters
                      </p>
                    </div>
                  </div>
                  
                  {/* Enhanced action buttons */}
                  <div className="flex items-center gap-2">
                    {hasMore && (
                      <button
                        className="px-3 py-1.5 text-xs font-medium text-blue-300 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-400/50 rounded-lg transition-all duration-200"
                        onClick={() => toggleChunkExpansion(i)}
                      >
                        {isExpanded ? "Show Less" : "Show More"}
                      </button>
                    )}
                    <button
                      onClick={() => handleCopyWithFeedback(item.text, i)}
                      className="relative p-2 text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-all duration-200 hover:scale-105"
                      title="Copy to clipboard"
                    >
                      <ClipboardDocumentIcon className="w-4 h-4" />
                      {copiedIndex === i && (
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-green-500 text-white text-xs rounded-md font-medium animate-fade-in">
                          Copied!
                        </div>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Enhanced content area with better styling */}
                <div
                  className="bg-gradient-to-br from-slate-900/60 to-slate-800/60 rounded-xl p-4 border border-slate-600/20 backdrop-blur-sm"
                  style={{
                    maxHeight: isExpanded ? 600 : 320,
                    overflowY: isExpanded || hasMore ? 'auto' : 'visible',
                  }}
                >
                  <div className="prose prose-invert prose-sm max-w-none context-markdown text-slate-200">
                    <ReactMarkdown components={markdownComponents}>
                      {isExpanded || !hasMore ? item.text : preview}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // NEW: Determine what data we have available
  const hasAnalyzedFiles = Object.keys(analysisFiles).length > 0;
  const hasCode = code.trim();
  const hasAnyData = hasAnalyzedFiles || hasCode;

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 backdrop-blur-sm context-panel-outer">
      {/* Enhanced Header with gradient and better spacing */}
      <div className="flex items-center justify-between p-6 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/80 to-slate-700/80 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
            <MagnifyingGlassIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-xl tracking-tight">Context Discovery</h2>
            <p className="text-slate-400 text-sm mt-0.5">Find relevant conversion patterns</p>
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {hasQueried && result && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-300 text-xs font-medium">Context Ready</span>
            </div>
          )}
          {loading && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-full">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-blue-300 text-xs font-medium">Searching...</span>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Status information with better visual hierarchy */}
      <div className="p-6 border-b border-slate-700/30">
        <div className="bg-gradient-to-r from-slate-800/60 to-slate-700/60 rounded-xl p-4 border border-slate-600/30">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">📋</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-slate-200 font-medium text-sm mb-2">Code being sent for context retrieval:</h3>
              {hasAnalyzedFiles && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-green-300 text-sm font-medium">
                      {Object.keys(analysisFiles).length} analyzed files
                    </span>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-600/20">
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(analysisFiles).map((filename, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-md text-xs font-mono text-blue-300"
                        >
                          {filename}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {hasCode && !hasAnalyzedFiles && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-blue-300 text-sm">
                    Single code block: {code.length.toLocaleString()} characters
                  </span>
                </div>
              )}
              {!hasAnyData && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                  <span className="text-red-300 text-sm">
                    No code available. Please complete the analysis step first.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Action Button */}
      <div className="p-6 border-b border-slate-700/30">
        <button
          className={`w-full py-4 rounded-xl font-semibold text-white text-base transition-all duration-300 transform relative overflow-hidden group ${
            loading
              ? "bg-gradient-to-r from-blue-500/50 to-cyan-500/50 cursor-not-allowed"
              : hasQueried
              ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 hover:scale-[1.02] hover:shadow-xl hover:shadow-green-500/25"
              : hasAnyData
              ? "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/25"
              : "bg-gradient-to-r from-gray-500/50 to-gray-600/50 cursor-not-allowed"
          }`}
          onClick={handleQuery}
          disabled={loading || !hasAnyData}
        >
          {/* Button background effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <div className="relative flex items-center justify-center gap-3">
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Discovering Conversion Patterns...</span>
              </>
            ) : hasQueried ? (
              <>
                <CheckCircleIcon className="w-5 h-5" />
                <span>Refresh Context</span>
              </>
            ) : hasAnyData ? (
              <>
                <MagnifyingGlassIcon className="w-5 h-5" />
                <span>Discover Context</span>
              </>
            ) : (
              <>
                <ExclamationCircleIcon className="w-5 h-5" />
                <span>Complete Analysis First</span>
              </>
            )}
          </div>
        </button>
      </div>

      {/* Enhanced Error Display */}
      {error && (
        <div className="p-6 border-b border-slate-700/30">
          <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                <ExclamationCircleIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-red-300 font-medium text-sm mb-1">Context Discovery Failed</h4>
                <p className="text-red-400/80 text-xs leading-relaxed">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Results Panel with better scrolling */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="h-full overflow-y-auto pr-2 context-sidebar-scrollbar">
          {renderResults()}
        </div>
      </div>
    </div>
  );
};

export default ContextPanel;