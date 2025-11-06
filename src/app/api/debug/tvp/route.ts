import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const connection = await db.getConnection();

    // Estructura de la tabla TVP
    const [columns]: any = await connection.query('DESCRIBE sige_tvp_terveipat');

    // Algunos registros de ejemplo (sin filtrar por TVP_Activo por si no existe)
    const [rows]: any = await connection.query(`
      SELECT *
      FROM sige_tvp_terveipat
      LIMIT 10
    `);

    connection.release();

    return NextResponse.json({
      estructura: columns,
      ejemplos: rows
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
