import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    console.log("=== OBTENIENDO TRANSPORTISTAS ===");

    const [rows] = await db.query(
      `SELECT
        TRA_IDTransporte,
        TRA_NomTrans,
        TRA_DirTrans,
        TRA_TelTrans,
        TRA_CUITTrans
      FROM sige_tra_transport
      ORDER BY TRA_NomTrans`
    );

    console.log(
      `Encontrados ${Array.isArray(rows) ? rows.length : 0} transportes en BD`
    );

    const data = (rows as any[]).map((row) => ({
      id: row.TRA_IDTransporte,
      nombre: row.TRA_NomTrans,
      direccion: row.TRA_DirTrans,
      telefono: row.TRA_TelTrans,
      cuit: row.TRA_CUITTrans,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ Error al obtener transportes:", error);
    return NextResponse.json(
      { error: "Error al obtener transportes" },
      { status: 500 }
    );
  }
}
