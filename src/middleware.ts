import { auth } from "./lib/auth";

const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hora de inactividad

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

  // Verificar si la sesión expiró por inactividad
  if (isLoggedIn && req.auth) {
    const token = req.auth as any;
    const lastActivity = token.lastActivity;

    // Solo validar si lastActivity existe (sesión válida)
    if (lastActivity) {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;

      if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
        console.log('[AUTH] Sesión expirada por inactividad - última actividad hace', Math.floor(timeSinceLastActivity / 1000 / 60), 'minutos');
        const loginUrl = new URL("/login", req.url);
        return Response.redirect(loginUrl);
      }
    }
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
