import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // NEW: Extract vector_db_id from request body
    const { vector_db_id, ...queryBody } = body;
    
    // Use the correct streaming endpoint
    const streamingUrl = `${BACKEND_URL}/api/context/query/stream`;
    console.log("🔗 Proxying context query to:", streamingUrl);
    console.log("📤 Request body:", body);
    console.log("📌 Using vector DB ID:", vector_db_id); // NEW: Log the database ID
    
    // NEW: Add vector_db_id to the request if provided
    const requestBody = vector_db_id 
      ? { ...queryBody, vector_db_id }
      : queryBody;

    const response = await fetch(streamingUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
      },
      body: JSON.stringify(requestBody), // NEW: Use the updated request body
    });

    console.log("📡 Backend response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Backend error:", errorText);
      return NextResponse.json(
        { error: `Backend error: ${response.status}`, detail: errorText },
        { status: response.status }
      );
    }

    if (!response.body) {
      return NextResponse.json(
        { error: "No response body from backend" },
        { status: 500 }
      );
    }

    // Create a streaming response
    const stream = new ReadableStream({
      start(controller) {
        const reader = response.body!.getReader(); // Add ! to assert non-null
        
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

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      }
    });

  } catch (error) {
    console.error("❌ Context query proxy error:", error);
    return NextResponse.json(
      { error: "Failed to query context", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}