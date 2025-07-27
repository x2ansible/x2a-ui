// src/app/api/analyse/ansible-upgrade/stream/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid content field' }, 
        { status: 400 }
      );
    }

    if (body.content.trim().length === 0) {
      return NextResponse.json(
        { error: 'No content provided for analysis' }, 
        { status: 400 }
      );
    }

    // Forward the request with content and any metadata
    const requestPayload: Record<string, unknown> = {
      content: body.content
    };
    if (body.metadata) {
      requestPayload.metadata = body.metadata;
    }
    
    const response = await fetch(`${BACKEND_URL}/api/ansible-upgrade/analyze/stream`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
      },
      body: JSON.stringify(requestPayload),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
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
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const errorEvent = `data: ${JSON.stringify({
          type: 'error',
          error: 'Ansible upgrade analysis failed',
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