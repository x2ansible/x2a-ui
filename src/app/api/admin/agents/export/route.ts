// app/api/admin/agents/export/route.ts
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://host.containers.internal:8000";

// GET /api/admin/agents/export - Export agent configurations as YAML
export async function GET(request: NextRequest) {
  try {
    // Point to your LlamaStack export endpoint (change if needed!)
    const response = await fetch(`${BACKEND_URL}/v1/agents/export`, {
      method: "GET",
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      let errorData;
      if (contentType && contentType.includes("application/json")) {
        errorData = await response.json();
      } else {
        errorData = { detail: await response.text() };
      }
      return NextResponse.json(
        { error: "Failed to export configurations", detail: errorData.detail || "Unknown backend error" },
        { status: response.status }
      );
    }

    // Forward the file response (YAML)
    const blob = await response.blob();
    const headers = new Headers();
    const contentType = response.headers.get("content-type");
    const contentDisposition = response.headers.get("content-disposition");
    if (contentType) {
      headers.set("Content-Type", contentType);
    } else {
      headers.set("Content-Type", "application/x-yaml");
    }
    if (contentDisposition) {
      headers.set("Content-Disposition", contentDisposition);
    } else {
      const timestamp = new Date().toISOString().split("T")[0];
      headers.set("Content-Disposition", `attachment; filename="agent-config-${timestamp}.yaml"`);
    }

    return new NextResponse(blob, { status: 200, headers });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to export agent configurations",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
