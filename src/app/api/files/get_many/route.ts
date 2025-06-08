// x2ansible-ui/src/app/api/files/get_many/route.ts
import { NextRequest, NextResponse } from "next/server";

// Force IPv4 localhost to avoid IPv6 connection issues
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  try {
    console.log(`Making request to: ${BACKEND_URL}/api/files/get_many`);
    
    const body = await request.json();
    console.log('Request body:', body);
    
    // Forward the exact payload to backend
    const response = await fetch(`${BACKEND_URL}/api/files/get_many`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    
    console.log(`Backend response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend error: ${response.status} ${response.statusText}`, errorText);
      return NextResponse.json(
        { error: `Backend error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log(`Successfully got ${data.files?.length || 0} files`);
    return NextResponse.json(data);
  } catch (error) {
    console.error("get_many proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch files", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}