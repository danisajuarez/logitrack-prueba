import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const viajeId = Number(searchParams.get("viajeId") || "683");

    // Obtener ECP_IdEcp
    const [ecpRows]: any = await db.query(
      `SELECT ECP_IdEcp, VEN_IdVendPostula, ECP_PatCamion, ECP_PatAcoplado
       FROM sige_ecp_enccarpor
       WHERE ENT_IdEnt = ? LIMIT 1`,
      [viajeId]
    );

    if (!ecpRows || ecpRows.length === 0) {
      return NextResponse.json({ error: "No se encontró carta porte" });
    }

    const { ECP_IdEcp: ecpIdEcp, VEN_IdVendPostula: vendedorId, ECP_PatCamion: patCamion, ECP_PatAcoplado: patAcoplado } = ecpRows[0];

    // Query simplificado SIN joins complejos
    const querySimple = `
      SELECT
        CONCAT(?, '-', icp.TER_IDTerceroTic) AS id,
        ? AS viaje_id,
        icp.TER_IDTerceroTic AS chofer_id,
        ch.TER_RazonSocialTer AS choferNombre,
        ? AS vendedor_id,
        ven.VEN_NomVen AS vendedorNombre,
        ? AS pat_chasis,
        ? AS pat_acoplado
      FROM sige_icp_intcarpor icp
      LEFT JOIN sige_ter_tercero ch ON ch.TER_IDTercero = icp.TER_IDTerceroTic
      LEFT JOIN sige_ven_vendedor ven ON ven.VEN_IDVendedor = ?
      WHERE icp.ECP_IdEcp = ? AND icp.TIC_IdTic = 9
      ORDER BY icp.TER_IDTerceroTic
    `;

    const [rowsSimple] = await db.query(querySimple, [
      viajeId,
      viajeId,
      vendedorId,
      patCamion,
      patAcoplado,
      vendedorId,
      ecpIdEcp
    ]) as any;

    // Query completo (el que está en el código actual)
    const queryCompleto = `
      SELECT
        CONCAT(?, '-', icp.TER_IDTerceroTic) AS id,
        ? AS viaje_id,
        CASE
          WHEN rel.TER_IDTercero = icp.TER_IDTerceroTic THEN rel.TER_IDTerceroAsoc
          ELSE rel.TER_IDTercero
        END as transporte_id,
        COALESCE(
          CASE
            WHEN rel.TER_IDTercero = icp.TER_IDTerceroTic THEN tra_asoc.TRA_NomTrans
            ELSE tra_chofer.TRA_NomTrans
          END,
          CASE
            WHEN rel.TER_IDTercero = icp.TER_IDTerceroTic THEN ter_asoc.TER_RazonSocialTer
            ELSE ter_chofer.TER_RazonSocialTer
          END
        ) AS transportistaNombre,
        icp.TER_IDTerceroTic AS chofer_id,
        ch.TER_RazonSocialTer AS choferNombre,
        ? AS vendedor_id,
        ven.VEN_NomVen AS vendedorNombre,
        ? AS pat_chasis,
        ? AS pat_acoplado,
        1 AS send_email
      FROM sige_icp_intcarpor icp
      LEFT JOIN sige_ter_tercero ch ON ch.TER_IDTercero = icp.TER_IDTerceroTic
      LEFT JOIN sige_ven_vendedor ven ON ven.VEN_IDVendedor = ?
      LEFT JOIN sige_tvp_terveipat rel ON (rel.TER_IDTercero = icp.TER_IDTerceroTic OR rel.TER_IDTerceroAsoc = icp.TER_IDTerceroTic)
      LEFT JOIN sige_tra_transport tra_chofer ON tra_chofer.TRA_IDTransporte = rel.TER_IDTercero
      LEFT JOIN sige_tra_transport tra_asoc ON tra_asoc.TRA_IDTransporte = rel.TER_IDTerceroAsoc
      LEFT JOIN sige_ter_tercero ter_chofer ON ter_chofer.TER_IDTercero = rel.TER_IDTercero
      LEFT JOIN sige_ter_tercero ter_asoc ON ter_asoc.TER_IDTercero = rel.TER_IDTerceroAsoc
      WHERE icp.ECP_IdEcp = ? AND icp.TIC_IdTic = 9
      GROUP BY icp.TER_IDTerceroTic
      ORDER BY icp.TER_IDTerceroTic
    `;

    const [rowsCompleto] = await db.query(queryCompleto, [
      viajeId,
      viajeId,
      vendedorId,
      patCamion,
      patAcoplado,
      vendedorId,
      ecpIdEcp
    ]) as any;

    return NextResponse.json({
      ecpIdEcp,
      vendedorId,
      patCamion,
      patAcoplado,
      resultados_query_simple: rowsSimple,
      resultados_query_completo: rowsCompleto,
      mensaje: `Query simple: ${rowsSimple?.length || 0} resultados. Query completo: ${rowsCompleto?.length || 0} resultados.`
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
