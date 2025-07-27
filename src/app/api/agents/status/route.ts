import { NextResponse } from "next/server";

// Environment-aware backend URL with local fallback
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function GET() {
  try {
    const response = await fetch(BACKEND_URL + "/api/agents/status");
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
    throw new Error("Backend not available");
  } catch {
    return NextResponse.json({ 
      registry: { registered_agents: 0, active_sessions: 0, agents: {}, sessions: {} },
      agents: {},
      error: "Backend connection failed"
    });
  }
}
