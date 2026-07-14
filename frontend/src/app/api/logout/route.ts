import { NextResponse } from "next/server";

const NEXT_AUTH_COOKIE_NAMES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
  "next-auth.pkce.code_verifier",
  "__Secure-next-auth.pkce.code_verifier",
  "next-auth.state",
  "__Secure-next-auth.state",
  "next-auth.nonce",
  "__Secure-next-auth.nonce",
];

export function GET(request: Request) {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL;
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const proxyOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : null;
  const isUsableOrigin = (value: string | null | undefined) => {
    if (!value || /(?:^|\/\/)(?:0\.0\.0\.0|127\.0\.0\.1|localhost)(?::|\/|$)/i.test(value)) return false;
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };
  const origin = isUsableOrigin(configuredOrigin)
    ? configuredOrigin!
    : isUsableOrigin(proxyOrigin)
      ? proxyOrigin!
      : new URL(request.url).origin;
  const response = NextResponse.redirect(new URL("/", origin), { status: 303 });
  response.headers.set("Cache-Control", "no-store, max-age=0");

  for (const name of NEXT_AUTH_COOKIE_NAMES) {
    response.cookies.set(name, "", {
      path: "/",
      httpOnly: true,
      secure: name.startsWith("__Secure-") || name.startsWith("__Host-"),
      sameSite: "lax",
      maxAge: 0,
      expires: new Date(0),
    });
  }

  return response;
}
