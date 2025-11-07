import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const viajeId = Number(searchParams.get("viajeId"));

  if (!viajeId) {
    return NextResponse.json({ error: "Falta viajeId" }, { status: 400 });
  }

  const connection = await db.getConnection();

  try {
    // Obtener todas las ECPs del viaje
    const [ecpRows]: any = await connection.query(
      `SELECT ECP_IdEcp, ECP_Numero FROM sige_ecp_enccarpor WHERE ENT_IdEnt = ? ORDER BY ECP_IdEcp`,
      [viajeId]
    );

    const resultado: any = {
      viajeId,
      totalECPs: ecpRows.length,
      ecps: []
    };

    // Para cada ECP, contar los intermediarios
    for (const ecp of ecpRows) {
      const ecpId = ecp.ECP_IdEcp;

      const [icps]: any = await connection.query(
        `SELECT TIC_IdTic, TIC_DescripcionTic, TER_RazonSocialTerTic, ICP_Orden
         FROM sige_icp_intcarpor
         WHERE ECP_IdEcp = ?
         ORDER BY ICP_Orden`,
        [ecpId]
      );

      resultado.ecps.push({
        ecpId,
        ecpNumero: ecp.ECP_Numero,
        totalIntermediarios: icps.length,
        destinatarios: icps.filter((i: any) => i.TIC_IdTic === 6).length,
        transportistas: icps.filter((i: any) => i.TIC_IdTic === 8).length,
        choferes: icps.filter((i: any) => i.TIC_IdTic === 9).length,
        detalles: icps
      });
    }

    // Verificar si hay ECPs con menos de 3 registros
    const ecpsIncompletas = resultado.ecps.filter((e: any) => e.totalIntermediarios < 3);

    resultado.resumen = {
      todasTienen3Registros: ecpsIncompletas.length === 0,
      ecpsIncompletas: ecpsIncompletas.map((e: any) => ({
        ecpId: e.ecpId,
        totalIntermediarios: e.totalIntermediarios,
        faltantes: 3 - e.totalIntermediarios
      }))
    };

    return NextResponse.json(resultado);

  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
