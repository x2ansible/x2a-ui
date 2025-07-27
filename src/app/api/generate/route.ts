// src/app/api/generate/route.ts

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log('🔄 Proxying generate request to backend...');
    console.log('📝 Generate request body:', {
      hasInputCode: !!body.input_code,
      inputCodeLength: body.input_code?.length || 0,
      hasContext: !!body.context
    });

    // Use the streaming endpoint
    const response = await fetch(`${BACKEND_URL}/api/generate/stream`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
      },
      body: JSON.stringify(body),
    });

    console.log(`📥 Backend response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      return NextResponse.json(
        { error: `Backend error: ${response.status}`, detail: errorText },
        { status: response.status }
      );
    }

    // Handle streaming response
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
              console.log("✅ Generate stream completed successfully");
              controller.close();
              break;
            }
            
            if (!value) {
              continue;
            }
            
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine) continue;
              
              // Forward the line as-is to maintain SSE format
              controller.enqueue(new TextEncoder().encode(line + '\n'));
            }
          }
        } catch (error) {
          console.error("❌ Generate stream reading error:", error);
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

  } catch (error: unknown) {
    console.error('❌ Generate proxy error:', error);
    
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const errorEvent = `data: ${JSON.stringify({
          type: 'error',
          error: 'Generate failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        })}\n\n`;
        controller.enqueue(encoder.encode(errorEvent));
        controller.close();
      }
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  }
}