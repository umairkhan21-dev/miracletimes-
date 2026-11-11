import { revalidatePath, revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function configuredToken(): string {
  return (process.env.REVALIDATE_TOKEN || "").trim();
}

function tokensEqual(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

type RevalidateBody = {
  tags?: unknown;
  paths?: unknown;
  reason?: unknown;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 50);
}

/**
 * Secure on-demand cache revalidation for the self-hosted Next.js app.
 * Called by the Express API after publish/update/archive/delete.
 *
 * Auth: header `X-Revalidate-Token` (preferred) or JSON body `{ token }` —
 * never accept tokens via query string.
 */
export async function POST(request: NextRequest) {
  const expected = configuredToken();
  if (!expected) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "NOT_CONFIGURED",
          message: "REVALIDATE_TOKEN is not configured",
        },
      },
      { status: 503 },
    );
  }

  let body: RevalidateBody & { token?: string } = {};
  try {
    body = (await request.json()) as RevalidateBody & { token?: string };
  } catch {
    body = {};
  }

  const headerToken = request.headers.get("x-revalidate-token") || "";
  const bodyToken = typeof body.token === "string" ? body.token : "";
  const provided = headerToken || bodyToken;

  if (!tokensEqual(provided, expected)) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid revalidation token" },
      },
      { status: 401 },
    );
  }

  const tags = asStringArray(body.tags);
  const paths = asStringArray(body.paths);
  const reason =
    typeof body.reason === "string" && body.reason.trim()
      ? body.reason.trim().slice(0, 120)
      : "unspecified";

  // Sensible defaults when the API only signals "something public changed".
  const effectiveTags =
    tags.length > 0
      ? tags
      : ["home", "articles", "latest", "sitemap", "feed"];

  for (const tag of effectiveTags) {
    revalidateTag(tag);
  }
  for (const path of paths) {
    // Layout: false — only the matched route segment.
    revalidatePath(path, "page");
  }

  return NextResponse.json({
    success: true,
    data: {
      revalidated: true,
      tags: effectiveTags,
      paths,
      reason,
      now: new Date().toISOString(),
    },
  });
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Use POST with X-Revalidate-Token",
      },
    },
    { status: 405 },
  );
}
