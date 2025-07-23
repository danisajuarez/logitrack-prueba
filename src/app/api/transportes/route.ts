import { NextResponse } from "next/server";
import { db } from "../../../../src/lib/db"; // Asegurate de exportar `db` como conexión MySQL desde acá

export async function GET() {
  try {
    const [rows] = await db.query(`
      SELECT 
        TRA_IDTransporte,
        TRA_NomTrans,
        TRA_DirTrans,
        TRA_TelTrans,
        TRA_CUITTrans
      FROM sige_tra_transport
    `);

    // Mapeamos para usar nombres claros en el frontend
    const data = (rows as any[]).map((row) => ({
      id: row.TRA_IDTransporte,
      nombre: row.TRA_NomTrans,
      direccion: row.TRA_DirTrans,
      telefono: row.TRA_TelTrans,
      cuit: row.TRA_CUITTrans,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error al obtener transportes:", error);
    return NextResponse.json(
      { error: "Error al obtener transportes" },
      { status: 500 }
    );
  }
}
