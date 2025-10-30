import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const viajeId = searchParams.get("id") || "673";

    const connection = await db.getConnection();

    // Ver el registro completo de ENT
    const [entRows]: any = await connection.query(`
      SELECT
        ENT_IdEnt,
        ENT_Numero,
        ENT_Fecha,
        TER_RazonSocialTer,
        TVP_Caracteristicas,
        ENT_CantCupos,
        ENT_CantCuposReser,
        ENT_CantCuposPend,
        TCP_IDTipoComp,
        EQU_IDEquipo,
        USU_IdUsuario,
        VEN_IdVendPostula
      FROM sige_ent_encnegtra
      WHERE ENT_IdEnt = ?
    `, [viajeId]);

    connection.release();

    return NextResponse.json({
      viajeId,
      viaje: entRows[0] || null
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
