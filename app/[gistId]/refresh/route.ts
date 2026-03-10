import { isValidGistId } from "@/lib/github";
import { NextRequest, NextResponse } from "next/server";

// Purges the CF Cache entry for this gist page so the next request gets fresh data.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gistId: string }> },
) {
  const { gistId } = await params;

  if (!isValidGistId(gistId)) {
    return NextResponse.json({ error: "Invalid gist ID" }, { status: 400 });
  }

  // Build the page URL to purge from CF Cache
  const url = new URL(`/${gistId}`, request.url);
  const cacheKey = new Request(url.toString(), { method: "GET" });

  try {
    const cache = caches.default;
    await cache.delete(cacheKey);
  } catch {
    // Cache API not available (dev mode)
  }

  return NextResponse.json({ revalidated: true });
}
