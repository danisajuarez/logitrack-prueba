import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const connection = await db.getConnection();

    // Estructura de la tabla
    const [columns]: any = await connection.query('DESCRIBE sige_icp_intcarpor');

    // Últimos registros
    const [rows]: any = await connection.query(`
      SELECT * FROM sige_icp_intcarpor
      ORDER BY ECP_IdEcp DESC
      LIMIT 10
    `);

    // Contar total
    const [count]: any = await connection.query('SELECT COUNT(*) as total FROM sige_icp_intcarpor');

    connection.release();

    return NextResponse.json({
      estructura: columns,
      ultimosRegistros: rows,
      totalRegistros: count[0].total
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
