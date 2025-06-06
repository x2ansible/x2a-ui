import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.LLAMASTACK_API_URL ||
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8321";

// POST /api/admin/agents/reload - Refresh agent list from backend
export async function POST(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/v1/agents`, {
      method: "GET",
      headers: { "accept": "application/json" },
    });

    if (!response.ok) {
      let err: any = "Unknown backend error";
      try {
        err = await response.json();
      } catch {}
      return NextResponse.json(
        { error: "Failed to refresh agents", detail: err.detail || err.error || err },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ agents: data.data, has_more: data.has_more });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to refresh agents", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
