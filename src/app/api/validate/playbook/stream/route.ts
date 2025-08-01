import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  console.log("🚨 USING ROUTE HANDLER - VERSION 2 🚨");
  
  try {
    const body = await request.json();
    const { playbook_content, profile = 'basic' } = body;

    if (!playbook_content || !playbook_content.trim()) {
      return NextResponse.json(
        { error: "No playbook content provided" },
        { status: 400 }
      );
    }

    // Use the correct working endpoint
    const streamingUrl = `${BACKEND_URL}/api/validate/playbook/stream`;
    console.log("🔗 Connecting to validation service:", streamingUrl);
    console.log("📤 Request payload:", { playbook_length: playbook_content.length, profile });

    try {
      const response = await fetch(streamingUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        body: JSON.stringify({
          playbook_content,
          profile,
        }),
        // Add timeout to prevent hanging - increased for complex validations
        signal: AbortSignal.timeout(600000), // 10 minute timeout for LLM-driven validations
      });

      console.log("📡 Backend response status:", response.status);
      console.log("📡 Backend response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Backend validation error:", errorText);
        
        return NextResponse.json({
          passed: false,
          summary: `Validation service error: ${response.status}`,
          issues: [],
          raw_output: errorText,
          error_message: `Backend validation error: ${response.status} - ${errorText}`,
          debug_info: {
            status: "error",
            error_code: response.status,
            playbook_length: playbook_content.length
          }
        }, { status: 200 });
      }

      const contentType = response.headers.get("content-type");
      
      // Handle direct JSON response (fallback)
      if (contentType?.includes("application/json")) {
        console.log("📊 Received JSON response from streaming endpoint");
        const data = await response.json();
        return NextResponse.json(data);
      }

      // Handle streaming response - the main path
      if (contentType?.includes("text/event-stream") || contentType?.includes("text/plain")) {
        console.log("🌊 Handling streaming response...");

        const stream = new ReadableStream({
          async start(controller) {
            const reader = response.body?.getReader();
            if (!reader) {
              controller.close();
              return;
            }

            const decoder = new TextDecoder();
            let buffer = '';

            try {
              while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                  console.log(" Stream completed successfully");
                  controller.close();
                  break;
                }
                
                if (!value) {
                  continue;
                }
                
                buffer += decoder.decode(value, { stream: true });
                
                // Process complete lines
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer
                
                for (const line of lines) {
                  const trimmedLine = line.trim();
                  if (!trimmedLine) continue;
                  
                  try {
                    let data;
                    
                    // Handle SSE format
                    if (trimmedLine.startsWith('data: ')) {
                      const dataStr = trimmedLine.slice(6);
                      if (dataStr === '[DONE]') {
                        console.log("🏁 Received [DONE] signal");
                        controller.close();
                        return;
                      }
                      data = JSON.parse(dataStr);
                    } else {
                      // Try parsing as direct JSON
                      data = JSON.parse(trimmedLine);
                    }

                    // Forward the parsed data as SSE format
                    const sseData = `data: ${JSON.stringify(data)}\n\n`;
                    controller.enqueue(new TextEncoder().encode(sseData));
                    
                  } catch (parseError) {
                    console.warn("⚠️ Failed to parse line:", trimmedLine, parseError);
                    continue;
                  }
                }
              }
            } catch (error) {
              console.error("❌ Stream reading error:", error);
              controller.error(error);
            } finally {
              try {
                reader.releaseLock();
              } catch (lockError) {
                console.warn("⚠️ Error releasing reader lock:", lockError);
              }
            }
          }
        });

        return new NextResponse(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      // Unexpected content type, try to handle as text
      const textResponse = await response.text();
      console.warn("🤔 Unexpected content type, got text:", textResponse.substring(0, 200));
      
      try {
        const jsonData = JSON.parse(textResponse);
        return NextResponse.json(jsonData);
      } catch {
        // If it's not JSON, treat as error
        throw new Error(`Unexpected response format: ${textResponse.substring(0, 100)}`);
      }

    } catch (fetchError) {
      console.error("❌ Backend connection failed:", fetchError);
      
      return NextResponse.json({
        passed: false,
        summary: "Validation service unavailable",
        issues: [],
        raw_output: `Service Error: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
        error_message: "Unable to connect to validation service. Please check if the backend is running.",
        debug_info: {
          status: "service_unavailable",
          playbook_length: playbook_content.length,
          error: "Backend connection failed"
        }
      }, { status: 200 });
    }

  } catch (error) {
    console.error("❌ Validation proxy error:", error);
    return NextResponse.json(
      {
        error: "Validation service unavailable",
        detail: error instanceof Error ? error.message : "Unknown error",
        passed: false,
        issues: [],
        raw_output: "",
        debug_info: {
          error: "Validation service error",
          status: "failed"
        }
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}