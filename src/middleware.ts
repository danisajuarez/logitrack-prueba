import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config";

const { auth } = NextAuth(authConfig);

const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hora

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnLoginPage = req.nextUrl.pathname.startsWith("/login");

  if (isOnLoginPage) {
    if (isLoggedIn) {
      return Response.redirect(new URL("/viajes", req.url));
    }
    return;
  }

  if (isLoggedIn && req.auth) {
    const token = req.auth as any;
    const lastActivity = token.lastActivity;

    if (lastActivity) {
      const timeSinceLastActivity = Date.now() - lastActivity;
      if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
        const loginUrl = new URL("/login", req.url);
        return Response.redirect(loginUrl);
      }
    }
  }

  if (isLoggedIn && req.nextUrl.pathname === "/") {
    return Response.redirect(new URL("/viajes", req.url));
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/((?!api/auth|api/testing|api/debug|_next/static|_next/image|favicon.ico).*)"],
};
