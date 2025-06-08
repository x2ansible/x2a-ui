import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "http://127.0.0.1:8000";

export async function GET() {
  try {
    const response = await fetch(BACKEND_URL + "/api/agents/status");
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
    throw new Error("Backend not available");
  } catch (error) {
    return NextResponse.json({ 
      registry: { registered_agents: 0, active_sessions: 0, agents: {}, sessions: {} },
      agents: {},
      error: "Backend connection failed"
    });
  }
}
