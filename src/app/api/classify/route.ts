// src/app/api/chef/analyze/stream/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Proxying chef analysis request to backend...');
    
    const body = await request.json();
    console.log('📝 Analysis request body:', {
      codeLength: body.code?.length || 0,
      hasCode: !!body.code
    });
    
    // Validate the request
    if (!body.code || typeof body.code !== 'string') {
      console.error(' Invalid request: missing or invalid code field');
      return NextResponse.json(
        { error: 'Missing or invalid code field' }, 
        { status: 400 }
      );
    }

    console.log(` Making request to: ${BACKEND_URL}/api/chef/analyze`);
    
    // Forward the request to your FastAPI backend
    const response = await fetch(`${BACKEND_URL}/api/chef/analyze`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log(`📥 Backend response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(' Backend error:', errorText);
      
      // Try to parse error as JSON if possible
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      
      return NextResponse.json(
        errorData,
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(' Successfully got analysis result from backend');
    
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error(' Chef analysis proxy error:', error);
    return NextResponse.json(
      { error: `Analysis failed: ${error.message}` },
      { status: 500 }
    );
  }
}