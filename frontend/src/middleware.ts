import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const BACKEND_BASE_URL = "http://backend.railway.internal:8787";

const FORWARDED_REQUEST_HEADERS = ["authorization", "content-type", "accept", "accept-language", "cookie"];

const FORWARDED_RESPONSE_HEADERS = ["content-type", "cache-control", "set-cookie"];

const protectedPrefixes = ["/cart", "/checkout", "/my-account", "/admin", "/employee"];

async function proxyToBackend(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const backendUrl = `${BACKEND_BASE_URL}${url.pathname}${url.search}`;

  const forwardedHeaders: Record<string, string> = {};
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = req.headers.get(name);
    if (value !== null) {
      forwardedHeaders[name] = value;
    }
  }

  const hasBody = !["GET", "HEAD"].includes(req.method.toUpperCase());

  const backendResponse = await fetch(backendUrl, {
    method: req.method,
    headers: forwardedHeaders,
    body: hasBody ? req.body : undefined,
    // @ts-expect-error — Node.js fetch supports duplex but the type definition omits it
    duplex: "half",
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = backendResponse.headers.get(name);
    if (value !== null) {
      responseHeaders.set(name, value);
    }
  }

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders,
  });
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Proxy all /api/v1/* requests directly to the backend service
  if (pathname.startsWith("/api/v1/")) {
    return proxyToBackend(req);
  }

  const needsAuth = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!needsAuth) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const signInUrl = new URL("/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (pathname.startsWith("/admin")) {
    const role = typeof token.role === "string" ? token.role : "customer";
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  if (pathname.startsWith("/employee")) {
    const role = typeof token.role === "string" ? token.role : "customer";
    if (role !== "employee" && role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/v1/:path*",
    "/cart/:path*",
    "/checkout/:path*",
    "/my-account/:path*",
    "/admin/:path*",
    "/employee/:path*",
  ],
};
