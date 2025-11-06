import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get("session");

  if (!sessionCookie) {
    return NextResponse.json(
      { error: "No hay sesión activa" },
      { status: 401 }
    );
  }

  try {
    const session = JSON.parse(sessionCookie.value);
    return NextResponse.json({
      user: {
        username: session.username,
        displayName: session.displayName,
        email: session.email,
        vendedorId: session.vendedorId ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Sesión inválida" },
      { status: 401 }
    );
  }
}
