import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.LLAMASTACK_API_URL ||
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8321";

// GET single agent config: /api/admin/agents/[agentId]
export async function GET(request: NextRequest, { params }: { params: { agentId: string } }) {
  const { agentId } = params;

  if (!agentId) {
    return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
  }

  try {
    const response = await fetch(`${BACKEND_URL}/v1/agents/${agentId}`, {
      method: "GET",
      headers: { "accept": "application/json" },
    });

    if (!response.ok) {
      let err: any = "Unknown backend error";
      try {
        err = await response.json();
      } catch {}
      return NextResponse.json(
        { error: "Failed to fetch agent", detail: err.detail || err.error || err },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch agent", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE agent: /api/admin/agents/[agentId]
export async function DELETE(request: NextRequest, { params }: { params: { agentId: string } }) {
  const { agentId } = params;

  if (!agentId) {
    return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
  }

  try {
    const response = await fetch(`${BACKEND_URL}/v1/agents/${agentId}`, {
      method: "DELETE",
      headers: { "accept": "application/json" },
    });

    if (!response.ok) {
      let err: any = "Unknown backend error";
      try {
        err = await response.json();
      } catch {}
      return NextResponse.json(
        { error: "Failed to delete agent", detail: err.detail || err.error || err },
        { status: response.status }
      );
    }

    // Some APIs return 204 No Content, some 200 OK with JSON
    return NextResponse.json({ success: true, agent_id: agentId });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete agent", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
