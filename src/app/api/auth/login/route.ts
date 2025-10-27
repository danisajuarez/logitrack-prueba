import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";

interface LoginRequest {
  username: string;
  password: string;
}

interface UserRow extends RowDataPacket {
  USU_LogUsu: string;
  USU_PassWord: string;
  USU_DatosUsu: string;
  VEN_EMailVen: string | null;
  vendedorId: number | null;
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuario y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    // Consulta SQL proporcionada (corregida con VEN_IDVendedor)
    const [rows] = (await db.query(
      `SELECT
        u.USU_LogUsu,
        u.USU_PassWord,
        u.USU_DatosUsu,
        u.ven_idvendedor AS vendedorId,
        v.VEN_EMailVen
      FROM sige_usu_usuario u
      LEFT JOIN sige_ven_vendedor v
        ON u.ven_idvendedor = v.VEN_IDVendedor
      WHERE UPPER(u.USU_LogUsu) = UPPER(?)`,
      [username]
    )) as [UserRow[], any];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos" },
        { status: 401 }
      );
    }

    const user = rows[0];

    // Verificar contraseña sin sensibilidad a mayúsculas/minúsculas
    // Nota: En producción se recomienda usar hash (bcrypt) y mantener sensibilidad por seguridad
    const dbPass = (user.USU_PassWord ?? "").toString();
    const inPass = (password ?? "").toString();
    if (dbPass.toLowerCase() !== inPass.toLowerCase()) {
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos" },
        { status: 401 }
      );
    }

    // Crear sesión simple con cookie
    const sessionData = {
      username: user.USU_LogUsu,
      displayName: user.USU_DatosUsu,
      email: user.VEN_EMailVen,
      vendedorId: user.vendedorId ?? null,
      loginTime: new Date().toISOString(),
    };

    const response = NextResponse.json({
      success: true,
      message: "Login exitoso",
      user: {
        username: user.USU_LogUsu,
        displayName: user.USU_DatosUsu,
        email: user.VEN_EMailVen,
        vendedorId: user.vendedorId ?? null,
      },
    });

    // Establecer cookie de sesión (válida por 24 horas)
    response.cookies.set("session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 horas
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Error en login:", error);
    return NextResponse.json(
      { error: error?.message || "Error al iniciar sesión" },
      { status: 500 }
    );
  }
}
