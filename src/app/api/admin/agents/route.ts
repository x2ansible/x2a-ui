import { NextRequest, NextResponse } from "next/server";

// Use LLAMASTACK_API_URL if set, else fallback to BACKEND_URL, then NEXT_PUBLIC_BACKEND_URL, then localhost.
const BACKEND_URL =
  process.env.LLAMASTACK_API_URL ||
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8321";

// GET /api/admin/agents - List all agents
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/v1/agents`, {
      method: "GET",
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      // Try to parse error message from response
      let err: any = "Unknown backend error";
      try {
        err = await response.json();
      } catch {}
      return NextResponse.json(
        { error: "Failed to fetch agents", detail: err.detail || err.error || err },
        { status: response.status }
      );
    }

    // LlamaStack returns { data: [...], has_more: bool }
    const data = await response.json();
    return NextResponse.json({ agents: data.data, has_more: data.has_more });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch agents", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/agents - Create new agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Minimal validation
    if (!body.agent_config || !body.agent_config.model || !body.agent_config.instructions) {
      return NextResponse.json(
        { error: "Missing required agent_config, model, or instructions." },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/v1/agents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent_config: body.agent_config }),
    });

    const contentType = response.headers.get("content-type") || "";
    let data =
      contentType.includes("application/json")
        ? await response.json()
        : await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to create agent", detail: typeof data === "object" ? data.detail || data.error : data },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create agent", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
