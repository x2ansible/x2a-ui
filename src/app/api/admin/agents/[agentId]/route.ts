import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "http://127.0.0.1:8000";

export async function GET(request: NextRequest, { params }: { params: { agentId: string } }) {
  const { agentId } = params;

  try {
    const response = await fetch(BACKEND_URL + "/api/admin/agents/" + agentId + "/instructions");
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
    throw new Error("Agent not found");
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to fetch agent",
      name: agentId,
      agent_id: "unknown",
      status: "unknown"
    }, { status: 404 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { agentId: string } }) {
  const { agentId } = params;

  try {
    const response = await fetch(BACKEND_URL + "/api/admin/agents/" + agentId, {
      method: "DELETE"
    });
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({ success: true, ...data });
    }
    throw new Error("Failed to delete agent");
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to delete agent"
    }, { status: 500 });
  }
}
