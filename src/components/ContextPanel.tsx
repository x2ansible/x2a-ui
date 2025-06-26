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
  ClipboardDocumentIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentIcon,
  FolderIcon
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
  const [isCodeSectionExpanded, setIsCodeSectionExpanded] = useState(false);
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
      logMessage(`❌ Context discovery failed after ${duration}ms: ${errorMessage}`);
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

  // --- Glass Morphism Catalog Cards ---
  const renderResults = () => {
    if (!result) return null;
    const patterns = result.context || [];
    if (!patterns.length) {
      return (
        <div className="text-center py-16">
          <div className="w-20 h-20 glassmorphism-card rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <MagnifyingGlassIcon className="w-10 h-10 text-white/70" />
          </div>
          <p className="text-white/80 text-xl font-medium mb-2">No Conversion Patterns Found</p>
          <p className="text-white/50 text-sm">Discover patterns from your knowledge base</p>
        </div>
      );
    }

    return (
      <div className="patterns-catalog">
        <div className="mb-6">
          <h3 className="text-white/90 text-lg font-semibold mb-2">📚 Conversion Pattern Library</h3>
          <p className="text-white/60 text-sm">Click any pattern card to explore implementation details</p>
        </div>
        
        {/* Glass Catalog Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {patterns.map((item, i) => {
            const isExpanded = expandedChunks.has(i);
            const lines = item.text?.split("\n") || [];
            const preview = lines.slice(0, 6).join("\n").slice(0, 400) + 
              ((lines.length > 6 || (item.text?.length ?? 0) > 400) ? "\n..." : "");
            const hasMore = lines.length > 6 || (item.text?.length ?? 0) > 400;

            // Pattern type detection for better categorization
            const patternType = item.type || 
              (item.text.includes('package') ? 'Package Management' :
               item.text.includes('service') ? 'Service Management' :
               item.text.includes('file') ? 'File Operations' :
               item.text.includes('template') ? 'Configuration' :
               'General Pattern');

            // Glass card color themes
            const glassThemes = [
              { 
                bg: "rgba(59, 130, 246, 0.1)", 
                border: "rgba(59, 130, 246, 0.2)",
                accent: "from-blue-400 to-cyan-400",
                icon: "🔧"
              },
              { 
                bg: "rgba(168, 85, 247, 0.1)", 
                border: "rgba(168, 85, 247, 0.2)",
                accent: "from-purple-400 to-pink-400",
                icon: "⚙️"
              },
              { 
                bg: "rgba(34, 197, 94, 0.1)", 
                border: "rgba(34, 197, 94, 0.2)",
                accent: "from-emerald-400 to-teal-400",
                icon: "📦"
              },
              { 
                bg: "rgba(251, 146, 60, 0.1)", 
                border: "rgba(251, 146, 60, 0.2)",
                accent: "from-orange-400 to-amber-400",
                icon: "🚀"
              },
              { 
                bg: "rgba(236, 72, 153, 0.1)", 
                border: "rgba(236, 72, 153, 0.2)",
                accent: "from-pink-400 to-rose-400",
                icon: "✨"
              }
            ];
            const theme = glassThemes[i % glassThemes.length];

            return (
              <div
                key={i}
                className={`glass-pattern-card group relative overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.02] ${
                  isExpanded ? 'xl:col-span-2' : ''
                }`}
                style={{
                  background: `linear-gradient(135deg, ${theme.bg}, rgba(255,255,255,0.05))`,
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: `1px solid ${theme.border}`,
                  borderRadius: "24px",
                  boxShadow: `
                    0 8px 32px rgba(0,0,0,0.3),
                    inset 0 1px 0 rgba(255,255,255,0.1),
                    0 0 0 1px rgba(255,255,255,0.05)
                  `
                }}
                onClick={() => toggleChunkExpansion(i)}
              >
                {/* Glass shine effect */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)"
                  }}
                />
                
                {/* Floating accent orb */}
                <div 
                  className={`absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br ${theme.accent} rounded-full opacity-20 group-hover:opacity-30 transition-opacity duration-500 blur-xl`}
                />
                
                <div className="relative p-6">
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      {/* Pattern Icon */}
                      <div 
                        className={`w-12 h-12 bg-gradient-to-br ${theme.accent} rounded-2xl flex items-center justify-center text-2xl shadow-lg backdrop-blur-sm`}
                        style={{
                          background: `linear-gradient(135deg, ${theme.bg}, rgba(255,255,255,0.1))`,
                          border: `1px solid ${theme.border}`
                        }}
                      >
                        {theme.icon}
                      </div>
                      
                      {/* Pattern Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-white font-semibold text-base">
                            Pattern #{i + 1}
                          </h4>
                          <span 
                            className="px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm"
                            style={{
                              background: theme.bg,
                              border: `1px solid ${theme.border}`,
                              color: "rgba(255,255,255,0.9)"
                            }}
                          >
                            {patternType}
                          </span>
                        </div>
                        <p className="text-white/60 text-sm">
                          {item.text.length.toLocaleString()} characters • {lines.length} lines
                        </p>
                        {item.source && (
                          <p className="text-white/50 text-xs mt-1">
                            Source: {item.source}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyWithFeedback(item.text, i);
                        }}
                        className="p-2 text-white/60 hover:text-white transition-all duration-200 hover:scale-110 backdrop-blur-sm rounded-xl"
                        style={{
                          background: "rgba(255,255,255,0.1)",
                          border: "1px solid rgba(255,255,255,0.1)"
                        }}
                        title="Copy pattern"
                      >
                        <ClipboardDocumentIcon className="w-5 h-5" />
                        {copiedIndex === i && (
                          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-green-500/90 backdrop-blur-sm text-white text-xs rounded-lg font-medium animate-fade-in border border-green-400/30">
                            Copied!
                          </div>
                        )}
                      </button>
                      
                      {hasMore && (
                        <div className="p-2 text-white/40">
                          {isExpanded ? (
                            <ChevronDownIcon className="w-5 h-5" />
                          ) : (
                            <ChevronRightIcon className="w-5 h-5" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Pattern Content Preview */}
                  <div 
                    className="relative rounded-2xl overflow-hidden backdrop-blur-sm"
                    style={{
                      background: "rgba(0,0,0,0.2)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      maxHeight: isExpanded ? "500px" : "240px"
                    }}
                  >
                    <div className="p-4 overflow-y-auto custom-scrollbar">
                      <div className="prose prose-invert prose-sm max-w-none text-white/90 text-sm leading-relaxed">
                        <ReactMarkdown components={markdownComponents}>
                          {isExpanded || !hasMore ? item.text : preview}
                        </ReactMarkdown>
                      </div>
                    </div>
                    
                    {/* Expand hint overlay */}
                    {!isExpanded && hasMore && (
                      <div 
                        className="absolute bottom-0 left-0 right-0 h-12 flex items-end justify-center pb-2"
                        style={{
                          background: "linear-gradient(transparent, rgba(0,0,0,0.6))"
                        }}
                      >
                        <span className="text-white/60 text-xs font-medium">
                          Click to expand full pattern
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Pattern Stats */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-4 text-xs text-white/50">
                      <span>📄 {lines.length} lines</span>
                      <span>🔤 {item.text.length} chars</span>
                      {item.type && <span>🏷️ {item.type}</span>}
                    </div>
                    <div className="text-xs text-white/40">
                      {isExpanded ? 'Click to collapse' : 'Click to expand'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // NEW: Determine what data we have available
  const hasAnalyzedFiles = Object.keys(analysisFiles).length > 0;
  const hasCode = code.trim();
  const hasAnyData = hasAnalyzedFiles || hasCode;

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 backdrop-blur-sm context-panel-outer">
      {/* Compact Header with better spacing */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/80 to-slate-700/80 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
            <MagnifyingGlassIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg tracking-tight">Context Discovery</h2>
            <p className="text-slate-400 text-xs mt-0.5">Find relevant conversion patterns</p>
          </div>
        </div>
        
        {/* Compact status indicator */}
        <div className="flex items-center gap-2">
          {hasQueried && result && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-300 text-xs font-medium">Ready</span>
            </div>
          )}
          {loading && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-blue-300 text-xs font-medium">Searching...</span>
            </div>
          )}
        </div>
      </div>

      {/* Ultra-Compact Collapsible Status Information */}
      <div className="border-b border-slate-700/30">
        <button
          onClick={() => setIsCodeSectionExpanded(!isCodeSectionExpanded)}
          className="w-full p-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-md flex items-center justify-center">
              {hasAnalyzedFiles ? <FolderIcon className="w-3 h-3 text-white" /> : <DocumentIcon className="w-3 h-3 text-white" />}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-300 font-medium">Source Code:</span>
              {hasAnalyzedFiles && (
                <span className="text-green-300 text-xs font-medium">
                  {Object.keys(analysisFiles).length} files
                </span>
              )}
              {hasCode && !hasAnalyzedFiles && (
                <span className="text-blue-300 text-xs">
                  {code.length.toLocaleString()} chars
                </span>
              )}
              {!hasAnyData && (
                <span className="text-red-300 text-xs">
                  No code available
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-xs">
              {isCodeSectionExpanded ? 'Hide' : 'Show'} Details
            </span>
            {isCodeSectionExpanded ? (
              <ChevronDownIcon className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </button>
        
        {/* Expandable detailed view */}
        {isCodeSectionExpanded && (
          <div className="px-4 pb-3">
            <div className="bg-gradient-to-r from-slate-800/60 to-slate-700/60 rounded-lg p-3 border border-slate-600/30">
              {hasAnalyzedFiles && (
                <div className="space-y-2">
                  <div className="bg-slate-900/50 rounded-md p-2 border border-slate-600/20">
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
                <div className="text-blue-300 text-xs">
                  Single code block ready for analysis
                </div>
              )}
              {!hasAnyData && (
                <div className="text-red-300 text-xs">
                  Please complete the analysis step first to provide source code.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Compact Action Button */}
      <div className="p-4 border-b border-slate-700/30">
        <button
          className={`w-full py-3 rounded-xl font-semibold text-white text-sm transition-all duration-300 transform relative overflow-hidden group ${
            loading
              ? "bg-gradient-to-r from-blue-500/50 to-cyan-500/50 cursor-not-allowed"
              : hasQueried
              ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/25"
              : hasAnyData
              ? "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/25"
              : "bg-gradient-to-r from-gray-500/50 to-gray-600/50 cursor-not-allowed"
          }`}
          onClick={handleQuery}
          disabled={loading || !hasAnyData}
        >
          {/* Button background effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <div className="relative flex items-center justify-center gap-2">
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Discovering Patterns...</span>
              </>
            ) : hasQueried ? (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                <span>Refresh Context</span>
              </>
            ) : hasAnyData ? (
              <>
                <MagnifyingGlassIcon className="w-4 h-4" />
                <span>Discover Context</span>
              </>
            ) : (
              <>
                <ExclamationCircleIcon className="w-4 h-4" />
                <span>Complete Analysis First</span>
              </>
            )}
          </div>
        </button>
      </div>

      {/* Compact Error Display */}
      {error && (
        <div className="p-4 border-b border-slate-700/30">
          <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-red-500 to-pink-500 rounded-md flex items-center justify-center">
                <ExclamationCircleIcon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-red-300 font-medium text-xs mb-1">Discovery Failed</h4>
                <p className="text-red-400/80 text-xs leading-relaxed">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Glass Morphism Catalog Panel */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="h-full overflow-y-auto pr-2 catalog-scrollbar">
          {renderResults()}
        </div>
      </div>
      
      {/* Add custom styles for glass morphism */}
      <style jsx>{`
        .glass-pattern-card {
          position: relative;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .glass-pattern-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 
            0 20px 40px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,255,255,0.2),
            0 0 0 1px rgba(255,255,255,0.1) !important;
        }
        
        .glassmorphism-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 
            0 8px 32px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.1);
        }
        
        .patterns-catalog {
          animation: fadeInUp 0.6s ease-out;
        }
        
        .catalog-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        
        .catalog-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        
        .catalog-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(45deg, rgba(59, 130, 246, 0.5), rgba(168, 85, 247, 0.5));
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        
        .catalog-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(45deg, rgba(59, 130, 246, 0.8), rgba(168, 85, 247, 0.8));
          background-clip: content-box;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.2);
          border-radius: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.3);
          border-radius: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.5);
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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
};

export default ContextPanel;