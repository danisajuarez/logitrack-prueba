import { auth } from "./lib/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnLoginPage = req.nextUrl.pathname.startsWith("/login");

  // Allow access to login page
  if (isOnLoginPage) {
    if (isLoggedIn) {
      return Response.redirect(new URL("/viajes", req.url));
    }
    return;
  }

  // If logged in and at root, send to viajes list by default
  if (isLoggedIn && req.nextUrl.pathname === "/") {
    return Response.redirect(new URL("/viajes", req.url));
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/((?!api/auth|api/testing|api/debug|_next/static|_next/image|favicon.ico).*)"],
};
