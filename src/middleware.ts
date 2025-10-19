import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("session");
  const pathname = request.nextUrl.pathname;

  // Rutas públicas que NO requieren autenticación
  const isPublicPath =
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico" ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".map") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico");

  // Si es ruta pública, dejar pasar
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Si no hay sesión, redirigir a login
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Verificar que la sesión sea válida (JSON parseable)
  try {
    JSON.parse(sessionCookie.value);
    return NextResponse.next();
  } catch {
    // Sesión corrupta, redirigir a login
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("session");
    return response;
  }
}

// Aplicar middleware a todas las rutas (el filtrado se hace dentro del middleware)
export const config = {
  matcher: "/:path*",
};
