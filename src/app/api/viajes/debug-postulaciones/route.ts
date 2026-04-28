import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const viajeIdParam = searchParams.get("viajeId");
  const viajeId = viajeIdParam ? Number(viajeIdParam) : NaN;

  if (!Number.isInteger(viajeId) || viajeId <= 0) {
    return NextResponse.json(
      { error: "viajeId es requerido y debe ser un entero válido" },
      { status: 400 }
    );
  }

  try {
    // 1. Obtener todas las ECPs del viaje
    const [ecpRows]: any = await db.query(
      `SELECT ECP_IdEcp, ECP_Numero, ECP_PatCamion, ECP_PatAcoplado, VEN_IdVendPostula
       FROM sige_ecp_enccarpor
       WHERE ENT_IdEnt = ?
       ORDER BY ECP_IdEcp`,
      [viajeId]
    );

    // 2. Para cada ECP, obtener sus intermediarios (choferes y transportistas)
    const ecpDetails = [];
    for (const ecp of ecpRows) {
      const [icpRows]: any = await db.query(
        `SELECT
          TIC_IdTic,
          TIC_DescripcionTic,
          TER_IDTerceroTic,
          TER_RazonSocialTerTic,
          ICP_Orden
         FROM sige_icp_intcarpor
         WHERE ECP_IdEcp = ?
         ORDER BY ICP_Orden`,
        [ecp.ECP_IdEcp]
      );

      const [dcpRows]: any = await db.query(
        `SELECT ecp_idecp, dcp_renglondcp, art_idarticulo, art_desarticulo
         FROM SIGE_DCP_DetCarPor
         WHERE ecp_idecp = ?`,
        [ecp.ECP_IdEcp]
      );

      ecpDetails.push({
        ecp_id: ecp.ECP_IdEcp,
        ecp_numero: ecp.ECP_Numero,
        pat_camion: ecp.ECP_PatCamion,
        pat_acoplado: ecp.ECP_PatAcoplado,
        vendedor_id: ecp.VEN_IdVendPostula,
        dcp: dcpRows.length > 0 ? dcpRows : "SIN DCP ❌",
        intermediarios: icpRows.map((icp: any) => ({
          tipo: icp.TIC_IdTic === 8 ? 'Transportista' : icp.TIC_IdTic === 9 ? 'Chofer' : 'Otro',
          tipo_id: icp.TIC_IdTic,
          descripcion: icp.TIC_DescripcionTic,
          tercero_id: icp.TER_IDTerceroTic,
          tercero_nombre: icp.TER_RazonSocialTerTic,
          orden: icp.ICP_Orden
        }))
      });
    }

    // 3. Obtener información del viaje
    const [viajeRows]: any = await db.query(
      `SELECT ENT_IdEnt, ENT_Numero, ENT_CantCupos, ENT_CantCuposReser, ENT_CantCuposPend
       FROM sige_ent_encnegtra
       WHERE ENT_IdEnt = ?`,
      [viajeId]
    );

    const viaje = viajeRows[0] || null;

    return NextResponse.json({
      viaje: viaje ? {
        id: viaje.ENT_IdEnt,
        numero: viaje.ENT_Numero,
        cupos_totales: viaje.ENT_CantCupos,
        cupos_reservados: viaje.ENT_CantCuposReser,
        cupos_pendientes: viaje.ENT_CantCuposPend
      } : null,
      total_ecps: ecpRows.length,
      ecps: ecpDetails,
      total_choferes: ecpDetails.reduce((sum, ecp) =>
        sum + ecp.intermediarios.filter((i: any) => i.tipo_id === 9).length, 0
      ),
      total_transportistas: ecpDetails.reduce((sum, ecp) =>
        sum + ecp.intermediarios.filter((i: any) => i.tipo_id === 8).length, 0
      )
    });
  } catch (error: any) {
    console.error("[ERROR debug-postulaciones]", error);
    return NextResponse.json(
      { error: "Error al obtener información de debug", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
