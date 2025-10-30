import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const connection = await db.getConnection();

    // Estructura de la tabla
    const [columns]: any = await connection.query('DESCRIBE sige_ecp_enccarpor');

    // Últimos 3 registros
    const [rows]: any = await connection.query(`
      SELECT * FROM sige_ecp_enccarpor
      ORDER BY ECP_IdEcp DESC
      LIMIT 3
    `);

    connection.release();

    return NextResponse.json({
      estructura: columns,
      ultimosRegistros: rows
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
