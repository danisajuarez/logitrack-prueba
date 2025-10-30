import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const connection = await db.getConnection();

    // Estructura de la tabla
    const [columns]: any = await connection.query('DESCRIBE sige_ent_encnegtra');

    // Últimos 3 registros
    const [rows]: any = await connection.query(`
      SELECT ENT_IdEnt, ENT_Numero, ENT_Fecha, TER_RazonSocialTer,
             LOC_NomLocalidadOrig, LOC_NomLocalidadDest, TVP_Caracteristicas,
             ENT_CantCupos, ENT_CantCuposReser, ENT_CantCuposPend
      FROM sige_ent_encnegtra
      ORDER BY ENT_IdEnt DESC
      LIMIT 5
    `);

    connection.release();

    return NextResponse.json({
      estructura: columns.filter((c: any) =>
        ['ENT_IdEnt', 'ENT_Numero', 'TVP_Caracteristicas', 'ENT_CantCupos',
         'ENT_CantCuposReser', 'ENT_CantCuposPend'].includes(c.Field)
      ),
      ultimosRegistros: rows
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
