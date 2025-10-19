import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Sesión cerrada exitosamente",
  });

  // Eliminar cookie de sesión
  response.cookies.delete("session");

  return response;
}
