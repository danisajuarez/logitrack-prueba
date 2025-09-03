import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Probar conexión básica
    const [pong] = (await db.query("SELECT 1 AS ok")) as unknown as [any[]];

    // Verificar si existe la tabla viajes_nuevos (no falla la ruta si no existe)
    let viajesNuevosExists = false;
    try {
      await db.query("SELECT 1 FROM viajes_nuevos LIMIT 1");
      viajesNuevosExists = true;
    } catch {}

    return NextResponse.json({
      ok: true,
      ping: pong?.[0]?.ok === 1,
      viajesNuevosExists,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.code || "UNKNOWN",
        message: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

