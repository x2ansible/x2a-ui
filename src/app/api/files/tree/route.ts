import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  try {
    // Get the path parameter from the request
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    
    // Build the backend URL with path parameter if provided
    const backendUrl = path 
      ? `${BACKEND_URL}/api/files/tree?path=${encodeURIComponent(path)}`
      : `${BACKEND_URL}/api/files/tree`;
    
    console.log(` Proxying files tree to: ${backendUrl}`);
    
    const response = await fetch(backendUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    console.log(`📥 Backend response status: ${response.status}`);
    
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(" Files tree proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch files tree", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
