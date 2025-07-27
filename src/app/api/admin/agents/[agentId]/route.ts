import { NextRequest, NextResponse } from "next/server";

// Environment-aware backend URL with local fallback
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function GET(request: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;

  try {
    const response = await fetch(BACKEND_URL + "/api/admin/agents/" + agentId + "/instructions");
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
    throw new Error("Agent not found");
  } catch {
    return NextResponse.json({ 
      error: "Failed to fetch agent",
      name: agentId,
      agent_id: "unknown",
      status: "unknown"
    }, { status: 404 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;

  try {
    const response = await fetch(BACKEND_URL + "/api/admin/agents/" + agentId, {
      method: "DELETE"
    });
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({ success: true, ...data });
    }
    throw new Error("Failed to delete agent");
  } catch {
    return NextResponse.json({ 
      error: "Failed to delete agent"
    }, { status: 500 });
  }
}