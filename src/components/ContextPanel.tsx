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
    if (!hasLoggedInit.current && code) {
      logMessage("🔧 Context Panel initialized");
      hasLoggedInit.current = true;
    }
  }, [logMessage, code]);

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

  const handleQuery = async () => {
    if (!code.trim()) {
      setError("No Infrastructure as Code to analyze");
      logMessage("⚠️ Error: No code to analyze");
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
      logMessage("📤 Sending context query to backend...");

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream", // Important for streaming
        },
        body: JSON.stringify({ 
          code: code,
          top_k: 5 
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
              
              logMessage(`📊 ${eventData.message || eventData.msg || 'Processing...'}`);
              
              // Look for context results - match the actual backend format
              if (eventData.event === 'result') {
                console.log("🎯 Found context result:", eventData);
                finalResult = eventData;
                if (eventData.context && Array.isArray(eventData.context)) {
                  contextItems = eventData.context;
                  logMessage(`📄 Found ${contextItems.length} context pattern(s)`);
                  contextItems.forEach((item, i) => {
                    logMessage(`📄 Pattern ${i + 1}: ${item.text.slice(0, 100)}...`);
                  });
                }
              } else if (eventData.event === 'progress') {
                logMessage(`📊 ${eventData.msg || 'Processing...'}`);
              } else if (eventData.event === 'start') {
                logMessage(`⚡ ${eventData.msg || 'Context search started'}`);
              }
            } catch (parseError) {
              console.warn("Failed to parse event data:", line, parseError);
            }
          }
        }
      }

      const duration = Date.now() - startTime;

      // If we got context items during streaming, use them
      if (contextItems.length > 0) {
        finalResult = {
          success: true,
          context: contextItems
        };
      }

      if (!finalResult || !finalResult.context) {
        throw new Error("No context patterns found in the knowledge base");
      }

      logMessage(`✅ Context retrieved in ${duration}ms (${contextItems.length} patterns)`);

      setResult({
        success: true,
        context: contextItems
      });
      setError(null);

      if (contextItems.length && onContextRetrieved) {
        onContextRetrieved(contextItems.map((c) => c.text).join("\n\n"));
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

  // --- Prettier context card render ---
  const renderResults = () => {
    if (!result) return null;
    const patterns = result.context || [];
    if (!patterns.length) {
      return (
        <div className="text-slate-400 text-center p-8 text-base">
          <span>No Conversion Patterns Found</span>
        </div>
      );
    }

    return (
      <div className="context-results flex flex-col gap-8">
        {patterns.map((item, i) => {
          const isExpanded = expandedChunks.has(i);
          const lines = item.text?.split("\n") || [];
          const preview =
            lines.slice(0, 12).join("\n").slice(0, 800) +
            ((lines.length > 12 || (item.text?.length ?? 0) > 800) ? "\n\n..." : "");
          const hasMore = lines.length > 12 || (item.text?.length ?? 0) > 800;

          // Gradient border, animated on hover
          const borderGradients = [
            "bg-gradient-to-t from-cyan-400 to-blue-500",
            "bg-gradient-to-t from-pink-400 to-violet-500",
            "bg-gradient-to-t from-emerald-400 to-cyan-500",
            "bg-gradient-to-t from-yellow-400 to-orange-500"
          ];
          const borderClass = borderGradients[i % borderGradients.length];

          return (
            <div
              key={i}
              className="relative rounded-3xl overflow-hidden shadow-2xl hover:shadow-blue-700/30 group transition"
              style={{ background: "rgba(32, 41, 66, 0.85)", backdropFilter: "blur(3.5px)" }}
            >
              <div className={`absolute left-0 top-0 h-full w-2.5 ${borderClass} animate-pulse group-hover:opacity-80`} />
              <div className="relative p-6 pl-8">
                {/* Pattern Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-extrabold bg-gradient-to-r from-blue-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent drop-shadow">
                      <span className="mr-2">🔎</span> Pattern {i + 1}
                    </span>
                    {/* Metadata Pills */}
                    {item.type && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-900/70 text-blue-200">
                        {item.type}
                      </span>
                    )}
                    {item.source && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-900/60 text-cyan-200">
                        {item.source}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {hasMore && (
                      <button
                        className="text-xs underline text-blue-400 hover:text-cyan-300 transition"
                        onClick={() => toggleChunkExpansion(i)}
                      >
                        {isExpanded ? "Show Less" : "Show More"}
                      </button>
                    )}
                    <button
                      onClick={() => handleCopyWithFeedback(item.text, i)}
                      className="text-xs text-blue-400 rounded-full p-1 hover:bg-blue-900/60 hover:text-blue-200 relative transition"
                      title="Copy to clipboard"
                    >
                      <ClipboardDocumentIcon className="w-5 h-5" />
                      {copiedIndex === i && (
                        <span className="absolute left-full ml-1 text-xs text-green-400 font-bold animate-fade-in">
                          Copied!
                        </span>
                      )}
                    </button>
                  </div>
                </div>
                {/* Markdown, scroll for big blocks */}
                <div
                  className="mt-2 text-slate-200 text-base overflow-x-auto prose prose-invert prose-sm max-w-none context-markdown"
                  style={{
                    maxHeight: isExpanded ? 600 : 320,
                    overflowY: isExpanded || hasMore ? 'auto' : 'unset',
                    background: "none",
                    padding: 0
                  }}
                >
                  <ReactMarkdown components={markdownComponents}>
                    {isExpanded || !hasMore ? item.text : preview}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900 rounded-2xl p-8 shadow-xl context-panel-outer">
      <div className="flex items-center mb-4 gap-2">
        <MagnifyingGlassIcon className="w-7 h-7 text-blue-400" />
        <h2 className="text-white font-bold text-2xl tracking-tight">Context Discovery</h2>
      </div>
      <button
        className={`w-full py-2.5 rounded-xl font-semibold text-white text-lg transition-all duration-100 mb-2
          ${loading
            ? "bg-gradient-to-r from-blue-500/50 to-cyan-500/50 cursor-not-allowed"
            : hasQueried
            ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:scale-105"
            : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:scale-105"}
        `}
        onClick={handleQuery}
        disabled={loading || !code.trim()}
      >
        {loading ? (
          <>
            <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
            Discovering Conversion Patterns...
          </>
        ) : hasQueried ? (
          <>
            <CheckCircleIcon className="w-5 h-5 inline mr-2" />
            Refresh Context
          </>
        ) : (
          <>
            <MagnifyingGlassIcon className="w-5 h-5 inline mr-2" />
            Discover Context
          </>
        )}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-xl">
          <div className="flex items-center space-x-2">
            <ExclamationCircleIcon className="w-5 h-5 text-red-400" />
            <div>
              <div className="text-red-300 font-medium text-sm">Context Discovery Failed</div>
              <div className="text-red-400/80 mt-0.5 text-xs">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* --- Prettier, scrollable, Markdown-aware results panel --- */}
      <div className="mt-8 max-h-[34rem] overflow-y-auto pr-2 context-sidebar-scrollbar">
        {renderResults()}
      </div>
    </div>
  );
};

export default ContextPanel;