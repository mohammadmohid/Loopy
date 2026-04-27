import { NextRequest, NextResponse } from "next/server";

function backendBase(): string {
  const raw =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:8000";
  return raw.replace(/\/$/, "");
}

/**
 * Proxies GET /api/projects/notifications/inbox to the real backend so the
 * request is handled on the Next server (cookies forwarded) even when dev
 * rewrites do not match this path reliably.
 */
export async function GET(request: NextRequest) {
  const url = `${backendBase()}/api/projects/notifications/inbox`;
  const cookie = request.headers.get("cookie") ?? "";
  const authorization = request.headers.get("authorization");

  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(authorization ? { authorization } : {}),
    },
    cache: "no-store",
  });

  const body = await res.text();
  const ct = res.headers.get("content-type") ?? "application/json";
  return new NextResponse(body, {
    status: res.status,
    headers: { "content-type": ct },
  });
}
