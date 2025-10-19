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
    const [rows] = await db.query<UserRow[]>(
      `SELECT
        sige_usu_usuario.USU_LogUsu,
        sige_usu_usuario.USU_PassWord,
        sige_usu_usuario.USU_DatosUsu,
        sige_ven_vendedor.VEN_EMailVen
      FROM sige_usu_usuario
      LEFT JOIN sige_ven_vendedor
        ON sige_usu_usuario.ven_idvendedor = sige_ven_vendedor.VEN_IDVendedor
      WHERE sige_usu_usuario.USU_LogUsu = ?`,
      [username]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos" },
        { status: 401 }
      );
    }

    const user = rows[0];

    // Verificar contraseña (sin hash por ahora - IMPORTANTE: deberías usar bcrypt en producción)
    if (user.USU_PassWord !== password) {
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
      loginTime: new Date().toISOString(),
    };

    const response = NextResponse.json({
      success: true,
      message: "Login exitoso",
      user: {
        username: user.USU_LogUsu,
        displayName: user.USU_DatosUsu,
        email: user.VEN_EMailVen,
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
