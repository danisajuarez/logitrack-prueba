import type { NextAuthConfig } from "next-auth";

// Configuración de auth sin dependencias de Node.js (mysql2, bcrypt, etc.)
// Solo se usa en el middleware (Edge Runtime)
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60,
    updateAge: 0,
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLoginPage = nextUrl.pathname.startsWith("/login");
      if (isOnLoginPage) {
        if (isLoggedIn) return Response.redirect(new URL("/viajes", nextUrl));
        return true;
      }
      if (!isLoggedIn) return false;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.name = (user as any).name;
        token.username = (user as any).username;
        token.vendedorId = (user as any).vendedorId ?? null;
        token.vendedorNombre = (user as any).vendedorNombre ?? null;
        token.lastActivity = Date.now();
      } else {
        token.lastActivity = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token as any).id as string;
        session.user.name = (token as any).name as string;
        (session.user as any).username = (token as any).username;
        (session.user as any).vendedorId = (token as any).vendedorId;
        (session.user as any).vendedorNombre = (token as any).vendedorNombre;
      }
      return session;
    },
  },
  providers: [], // Sin providers aquí: el login real está en auth.ts
};
