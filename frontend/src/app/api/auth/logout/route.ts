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
  const response = NextResponse.redirect(new URL("/", request.url));

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
