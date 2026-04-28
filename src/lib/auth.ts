import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "./db";
import { RowDataPacket } from "mysql2";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
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
