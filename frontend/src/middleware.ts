import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";

const protectedPrefixes = ["/cart", "/checkout", "/my-account", "/admin", "/employee"];

function employeeAccessPending(token: JWT | null) {
  const permissions = Array.isArray(token?.permissions) ? token.permissions : [];
  return (
    token?.role === "employee" &&
    (token.roleStatus === "unassigned" || token.assignedRoleActive === false || permissions.length === 0)
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
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
    if (role !== "employee") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (pathname !== "/employee/access-pending" && employeeAccessPending(token)) {
      return NextResponse.redirect(new URL("/employee/access-pending", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/cart/:path*", "/checkout/:path*", "/my-account/:path*", "/admin/:path*", "/employee/:path*"],
};
