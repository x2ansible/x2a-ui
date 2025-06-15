import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = 
  process.env.LLAMASTACK_API_URL ||
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8321";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    console.log("📤 Proxying context ingest to:", `${BACKEND_URL}/api/context/ingest`);
    
    const response = await fetch(`${BACKEND_URL}/api/context/ingest`, {
      method: "POST",
      body: formData,
      // Don't set Content-Type header - let the browser set it for FormData
    });

    console.log("📥 Backend response status:", response.status);
    
    // Handle non-JSON responses gracefully
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }
    
    console.log("📊 Backend response data:", data);

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: `Upload failed with status ${response.status}`,
          detail: data?.message || data?.error || "Unknown error",
          backend_response: data 
        }, 
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      data: data
    });

  } catch (error) {
    console.error("❌ Context ingest proxy error:", error);
    return NextResponse.json(
      { 
        error: "Failed to ingest document", 
        detail: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}