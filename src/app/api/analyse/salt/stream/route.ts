// src/app/api/analyse/salt/stream/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Proxying Salt analysis stream request to backend...');
    
    const body = await request.json();
    console.log('📝 Salt analysis request body:', {
      name: body.name,
      filesCount: body.files ? Object.keys(body.files).length : 0,
      hasFiles: !!body.files
    });
    
    if (!body.files || typeof body.files !== 'object') {
      console.error('❌ Invalid request: missing or invalid files field');
      return NextResponse.json(
        { error: 'Missing or invalid files field' }, 
        { status: 400 }
      );
    }

    if (Object.keys(body.files).length === 0) {
      console.error('❌ Invalid request: no files provided');
      return NextResponse.json(
        { error: 'No files provided for analysis' }, 
        { status: 400 }
      );
    }

    if (!body.name) {
      console.error('❌ Invalid request: missing name field');
      return NextResponse.json(
        { error: 'Missing name field' }, 
        { status: 400 }
      );
    }

    console.log(`🚀 Making request to: ${BACKEND_URL}/api/salt/analyze/stream`);
    
    const response = await fetch(`${BACKEND_URL}/api/salt/analyze/stream`, {
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
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    console.log(' Successfully connected to Salt backend stream');

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
    console.error('❌ Salt analysis stream proxy error:', error);
    
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const errorEvent = `data: ${JSON.stringify({
          type: 'error',
          error: 'Salt analysis failed',
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