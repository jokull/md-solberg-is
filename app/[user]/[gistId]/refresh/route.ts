import { isValidGistId } from "@/lib/github";
import { NextRequest, NextResponse } from "next/server";

// With force-dynamic rendering, pages are always fresh.
// This endpoint is kept for API compatibility but is effectively a no-op.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ user: string; gistId: string }> },
) {
  const { gistId } = await params;

  if (!isValidGistId(gistId)) {
    return NextResponse.json({ error: "Invalid gist ID" }, { status: 400 });
  }

  return NextResponse.json({ revalidated: true });
}
