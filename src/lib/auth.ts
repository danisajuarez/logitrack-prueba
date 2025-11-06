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
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/");
      const isOnLoginPage = nextUrl.pathname.startsWith("/login");

      if (isOnLoginPage) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      if (!isLoggedIn && !isOnLoginPage) {
        return false;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
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
              v.VEN_EMailVen as email
            FROM sige_usu_usuario u
            LEFT JOIN sige_ven_vendedor v ON u.ven_idvendedor = v.VEN_IDVendedor
            WHERE u.USU_LogUsu = ?
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
          const isPlainTextMatch = password === user.password;

          if (!isValidPassword && !isPlainTextMatch) {
            return null;
          }

          return {
            id: user.id.toString(),
            name: user.nombre || user.username,
            username: user.username,
            email: user.email,
          };
        } catch (error) {
          console.error("Error during authentication:", error);
          return null;
        }
      },
    }),
  ],
});
