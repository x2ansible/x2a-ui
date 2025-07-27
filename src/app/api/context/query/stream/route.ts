import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Proxying context query stream request to backend...');
    
    const body = await request.json();
    console.log('📝 Context query request body:', {
      hasCode: !!body.code,
      codeLength: body.code?.length || 0,
      topK: body.top_k,
      vectorDbId: body.vector_db_id
    });
    
    // Validate the request
    if (!body.code || typeof body.code !== 'string') {
      console.error('❌ Invalid request: missing or invalid code field');
      return NextResponse.json(
        { error: 'Missing or invalid code field' }, 
        { status: 400 }
      );
    }

    if (body.code.trim().length === 0) {
      console.error('❌ Invalid request: no code provided');
      return NextResponse.json(
        { error: 'No code provided for context query' }, 
        { status: 400 }
      );
    }

    console.log(`�� Making request to: ${BACKEND_URL}/api/context/query/stream`);
    
    // Forward the request to your FastAPI backend streaming endpoint
    const response = await fetch(`${BACKEND_URL}/api/context/query/stream`, {
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

    // Return the stream directly with proper headers
    return new Response(response.body, {
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
    console.error('❌ Context query stream proxy error:', error);
    
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const errorEvent = `data: ${JSON.stringify({
          type: 'error',
          error: 'Context query failed',
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