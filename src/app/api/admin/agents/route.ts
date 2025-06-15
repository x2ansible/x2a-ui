import { NextRequest, NextResponse } from "next/server";

// Use your backend URL structure
const BACKEND_URL =
  process.env.LLAMASTACK_API_URL ||
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8321"\;

// GET /api/admin/agents - List all agents using the new backend structure
export async function GET(request: NextRequest) {
  try {
    // Use the admin endpoint from your backend
    const response = await fetch(`${BACKEND_URL}/api/admin/agents`, {
      method: "GET",
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      // Try to parse error message from response
      let err: unknown = "Unknown backend error";
      try {
        err = await response.json();
      } catch {}
      return NextResponse.json(
        { error: "Failed to fetch agents", detail: err.detail || err.error || err },
        { status: response.status }
      );
    }

    // Your backend returns { agents: {name: id}, count: number }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch agents", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/agents - Create new agent using your backend format
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields for your backend format
    if (!body.name || !body.model || !body.instructions) {
      return NextResponse.json(
        { error: "Missing required fields: name, model, or instructions." },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/admin/agents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: body.name,
        model: body.model,
        instructions: body.instructions,
        tools: body.tools || [],
      }),
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
