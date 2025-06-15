import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Use the correct streaming endpoint
    const streamingUrl = `${BACKEND_URL}/api/context/query/stream`;
    console.log("🔗 Proxying context query to:", streamingUrl);
    console.log("📤 Request body:", body);
    
    const response = await fetch(streamingUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "text/event-stream", // Important for streaming
      },
      body: JSON.stringify(body),
    });

    console.log("📡 Backend response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(" Backend error:", errorText);
      return NextResponse.json(
        { error: `Backend error: ${response.status}`, detail: errorText },
        { status: response.status }
      );
    }

    // For streaming endpoints, we need to handle the stream
    if (response.headers.get("content-type")?.includes("text/event-stream")) {
      console.log("📊 Handling streaming response...");
      
      // Stream the response back to the client
      const stream = new ReadableStream({
        start(controller) {
          const reader = response.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          function pump(): unknown {
            return reader.read().then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }
              controller.enqueue(value);
              return pump();
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
        },
      });
    } else {
      // Handle non-streaming response
      const data = await response.json();
      console.log("📊 Backend response data:", data);
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error(" Context query proxy error:", error);
    return NextResponse.json(
      { 
        error: "Failed to query context", 
        detail: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}