import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "./db";
import { RowDataPacket } from "mysql2";
import bcrypt from "bcryptjs";

export const { auth, signIn, signOut, handlers } = NextAuth({
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60, // 1 hora de inactividad
    updateAge: 0, // Actualizar en cada request para trackear inactividad
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    }
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/");
      const isOnLoginPage = nextUrl.pathname.startsWith("/login");

      if (isOnLoginPage) {
        if (isLoggedIn) return Response.redirect(new URL("/viajes", nextUrl));
        return true;
      }

      if (!isLoggedIn && !isOnLoginPage) {
        return false;
      }

      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = (user as any).id;
        token.name = (user as any).name;
        token.username = (user as any).username;
        token.vendedorId = (user as any).vendedorId ?? null;
        token.vendedorNombre = (user as any).vendedorNombre ?? null;
        // Inicializar timestamp en el primer login
        token.lastActivity = Date.now();
      } else {
        // Actualizar timestamp de última actividad en cada request
        token.lastActivity = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token as any).id as string;
        session.user.name = (token as any).name as string;
        (session.user as any).username = (token as any).username as string | undefined;
        (session.user as any).vendedorId = (token as any).vendedorId as number | null | undefined;
        (session.user as any).vendedorNombre = (token as any).vendedorNombre as string | null | undefined;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const { username, password } = credentials as {
          username: string;
          password: string;
        };

        if (!username || !password) {
          return null;
        }

        try {
          const query = `
            SELECT
              u.USU_IdUsuario as id,
              u.USU_LogUsu as username,
              u.USU_PassWord as password,
              u.USU_DatosUsu as nombre,
              u.ven_idvendedor as vendedorId,
              v.VEN_EMailVen as email,
              v.VEN_NomVen as vendedorNombre
            FROM sige_usu_usuario u
            LEFT JOIN sige_ven_vendedor v ON u.ven_idvendedor = v.VEN_IDVendedor
            WHERE UPPER(u.USU_LogUsu) = UPPER(?)
            LIMIT 1
          `;

          const [rows] = (await db.query(query, [username])) as unknown as [
            RowDataPacket[]
          ];

          if (!rows || rows.length === 0) {
            return null;
          }

          const user = rows[0];

          const isValidPassword = await bcrypt.compare(password, user.password);
          const isPlainTextMatch = password.toLowerCase() === user.password.toLowerCase();

          if (!isValidPassword && !isPlainTextMatch) {
            return null;
          }

          return {
            id: user.id.toString(),
            name: user.nombre || user.username,
            username: user.username,
            email: user.email,
            vendedorId: user.vendedorId ?? null,
            vendedorNombre: user.vendedorNombre ?? null,
          } as any;
        } catch (error) {
          console.error("Error during authentication:", error);
          return null;
        }
      },
    }),
  ],
});
