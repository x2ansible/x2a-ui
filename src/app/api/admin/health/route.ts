// app/api/admin/health/route.ts
import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// GET /api/admin/health - Health check for admin API
export async function GET() {
  try {
    console.log("🏥 Checking admin API health from backend");
    
    const response = await fetch(`${BACKEND_URL}/api/admin/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("📥 Backend response status:", response.status);
    
    const contentType = response.headers.get("content-type");
    
    let data;
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
      console.log(" Backend JSON response:", JSON.stringify(data, null, 2));
    } else {
      const textResponse = await response.text();
      console.error(" Backend returned non-JSON:", textResponse);
      return NextResponse.json(
        { 
          status: "unhealthy",
          service: "admin",
          error: "Backend returned invalid response", 
          detail: textResponse 
        }, 
        { status: 500 }
      );
    }
    
    if (!response.ok) {
      console.error(" Backend error response:", data);
      return NextResponse.json(
        { 
          status: "unhealthy",
          service: "admin",
          error: "Backend health check failed", 
          detail: data.detail || data.error || "Unknown backend error" 
        }, 
        { status: response.status }
      );
    }

    // Add frontend info to health response
    const healthResponse = {
      ...data,
      frontend: {
        status: "healthy",
        service: "nextjs-admin-proxy",
        backend_url: BACKEND_URL,
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(healthResponse);
  } catch (error) {
    console.error(" Admin health check error:", error);
    return NextResponse.json(
      { 
        status: "unhealthy",
        service: "admin",
        error: "Failed to check admin health", 
        detail: error instanceof Error ? error.message : "Unknown error",
        frontend: {
          status: "unhealthy",
          service: "nextjs-admin-proxy",
          backend_url: BACKEND_URL,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}