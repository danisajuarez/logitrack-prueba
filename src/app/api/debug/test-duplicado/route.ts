import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const viajeId = Number(searchParams.get("viajeId"));
  const choferId = Number(searchParams.get("choferId"));

  if (!viajeId || !choferId) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const connection = await db.getConnection();

  try {
    // Obtener todas las ECPs del viaje
    const [ecpRows]: any = await connection.query(
      `SELECT ECP_IdEcp FROM sige_ecp_enccarpor WHERE ENT_IdEnt = ? ORDER BY ECP_IdEcp`,
      [viajeId]
    );

    const ecpIds = ecpRows.map((r: any) => r.ECP_IdEcp);

    // Buscar si el chofer ya está postulado
    const placeholders = ecpIds.map(() => '?').join(', ');
    const [dupRows]: any = await connection.query(
      `SELECT ECP_IdEcp, TIC_IdTic, TER_IDTerceroTic, TER_RazonSocialTerTic
       FROM sige_icp_intcarpor
       WHERE ECP_IdEcp IN (${placeholders}) AND TER_IDTerceroTic = ? AND TIC_IdTic = 9`,
      [...ecpIds, choferId]
    );

    return NextResponse.json({
      viajeId,
      choferId,
      ecps: ecpIds,
      postulacionesEncontradas: dupRows.length,
      detalles: dupRows,
      yaDuplicado: dupRows.length > 0
    });

  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
