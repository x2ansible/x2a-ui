// src/app/api/chef/analyze/stream/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Proxying chef analysis stream request to backend...');
    
    const body = await request.json();
    console.log('📝 Analysis request body:', {
      filesCount: body.files ? Object.keys(body.files).length : 0,
      hasFiles: !!body.files
    });
    
    // Validate the request
    if (!body.files || typeof body.files !== 'object') {
      console.error(' Invalid request: missing or invalid files field');
      return NextResponse.json(
        { error: 'Missing or invalid files field' }, 
        { status: 400 }
      );
    }

    // Check if files object is empty
    if (Object.keys(body.files).length === 0) {
      console.error(' Invalid request: no files provided');
      return NextResponse.json(
        { error: 'No files provided for analysis' }, 
        { status: 400 }
      );
    }

    console.log(`🚀 Making request to: ${BACKEND_URL}/api/chef/analyze/stream`);
    
    // Forward the request to your FastAPI backend streaming endpoint
    const response = await fetch(`${BACKEND_URL}/api/chef/analyze/stream`, {
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
      console.error(' Backend error:', errorText);
      
      // Return error as SSE stream for consistency
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            error: `Backend error: ${response.status}`,
            details: errorText
          })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
        }
      });

      return new Response(stream, {
        status: 200, // Keep 200 for SSE
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    console.log(' Successfully connected to backend stream');

    // Properly handle the streaming response
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
              console.log("✅ Stream completed successfully");
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
    console.error(' Chef analysis stream proxy error:', error);
    
    // Return error as SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const errorEvent = `data: ${JSON.stringify({
          type: 'error',
          error: 'Analysis failed',
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