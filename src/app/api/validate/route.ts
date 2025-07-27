import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playbook_content, profile = 'production' } = body;

    if (!playbook_content || !playbook_content.trim()) {
      return NextResponse.json(
        { error: "No playbook content provided" },
        { status: 400 }
      );
    }

    // Try streaming endpoint first
    const streamingUrl = `${BACKEND_URL}/api/validate/playbook/stream`;
    console.log("🔗 Attempting streaming validation:", streamingUrl);
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
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      console.log("📡 Backend response status:", response.status);
      console.log("📡 Backend response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Backend streaming error:", errorText);
        
        // Try fallback to regular validation endpoint
        return await tryRegularValidation(playbook_content, profile);
      }

      const contentType = response.headers.get("content-type");
      
      // Handle direct JSON response (backend might return JSON instead of streaming)
      if (contentType?.includes("application/json")) {
        console.log("📊 Received JSON response from streaming endpoint");
        const data = await response.json();
        return NextResponse.json(data);
      }

      // Handle streaming response
      if (contentType?.includes("text/event-stream")) {
        console.log("📊 Handling streaming response...");

        if (!response.body) {
          throw new Error("No response body for streaming");
        }

        const stream = new ReadableStream({
          start(controller) {
            const reader = response.body!.getReader(); // Assert non-null since we checked above
            
            function pump(): unknown {
              return reader.read().then(({ done, value }) => {
                if (done) {
                  controller.close();
                  return;
                }
                controller.enqueue(value);
                return pump();
              }).catch((error) => {
                console.error("Stream reading error:", error);
                controller.error(error);
              });
            }

            return pump();
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

    } catch (streamError) {
      console.error("❌ Streaming endpoint failed:", streamError);
      
      // Fallback to regular validation endpoint
      return await tryRegularValidation(playbook_content, profile);
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

// Fallback function to try regular validation endpoint
async function tryRegularValidation(playbook_content: string, profile: string) {
  const regularUrl = `${BACKEND_URL}/api/validate/playbook`;
  console.log("🔄 Trying regular validation endpoint:", regularUrl);

  try {
    const response = await fetch(regularUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playbook_content,
        profile,
      }),
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Regular validation error:", errorText);
      
      // Return a structured error response
      return NextResponse.json({
        passed: false,
        summary: `Validation failed: ${response.status}`,
        issues: [],
        raw_output: errorText,
        error_message: `Backend validation error: ${response.status} - ${errorText}`,
        debug_info: {
          status: "error",
          error_code: response.status,
          playbook_length: playbook_content.length
        }
      }, { status: 200 }); // Return 200 so frontend can handle the validation failure
    }

    const data = await response.json();
    console.log(" Regular validation successful");
    return NextResponse.json(data);

  } catch (regularError) {
    console.error("❌ Regular validation also failed:", regularError);
    
    // Return a mock failed validation result
    return NextResponse.json({
      passed: false,
      summary: "Validation service unavailable",
      issues: [],
      raw_output: `Service Error: ${regularError instanceof Error ? regularError.message : 'Unknown error'}`,
      error_message: "Unable to connect to validation service. Please check if the backend is running.",
      debug_info: {
        status: "service_unavailable",
        playbook_length: playbook_content.length,
        error: "Backend connection failed"
      }
    }, { status: 200 });
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