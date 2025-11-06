import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const viajeId = searchParams.get("viajeId") || "683";

    // 1. Ver si existe la carta porte
    const [ecpRows]: any = await db.query(
      `SELECT ECP_IdEcp, ENT_IdEnt, VEN_IdVendPostula, ECP_PatCamion, ECP_PatAcoplado
       FROM sige_ecp_enccarpor
       WHERE ENT_IdEnt = ?`,
      [viajeId]
    );

    // 2. Ver todos los intermediarios de esta carta porte
    const ecpIdEcp = ecpRows?.[0]?.ECP_IdEcp;
    let intermediarios: any = [];

    if (ecpIdEcp) {
      [intermediarios] = await db.query(
        `SELECT
          ECP_IdEcp,
          TIC_IdTic,
          TIC_DescripcionTic,
          ICP_Orden,
          TER_IDTerceroTic,
          TER_RazonSocialTerTic,
          TER_CUITTerTic
         FROM sige_icp_intcarpor
         WHERE ECP_IdEcp = ?
         ORDER BY ICP_Orden`,
        [ecpIdEcp]
      );
    }

    // 3. Contar choferes (TIC_IdTic = 9)
    let choferesCount = 0;
    if (ecpIdEcp) {
      const [countRows]: any = await db.query(
        `SELECT COUNT(*) as total FROM sige_icp_intcarpor
         WHERE ECP_IdEcp = ? AND TIC_IdTic = 9`,
        [ecpIdEcp]
      );
      choferesCount = countRows?.[0]?.total || 0;
    }

    return NextResponse.json({
      viajeId,
      carta_porte: ecpRows?.[0] || null,
      intermediarios,
      choferes_count: choferesCount,
      mensaje: `Carta porte: ${ecpIdEcp ? 'ENCONTRADA' : 'NO ENCONTRADA'}. Choferes postulados: ${choferesCount}`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
