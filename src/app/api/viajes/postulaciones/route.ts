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
    console.log('[DEBUG postulaciones] Buscando viaje ID:', viajeId);

    // Obtener todos los ECP_IdEcp asociados al ENT_IdEnt (pueden existir múltiples)
    const [ecpRows]: any = await db.query(
      `SELECT ECP_IdEcp, VEN_IdVendPostula, ECP_PatCamion, ECP_PatAcoplado
       FROM sige_ecp_enccarpor
       WHERE ENT_IdEnt = ?
       ORDER BY ECP_IdEcp`,
      [viajeId]
    );

    console.log('[DEBUG postulaciones] ECP rows:', Array.isArray(ecpRows) ? ecpRows.length : 0);

    if (!Array.isArray(ecpRows) || ecpRows.length === 0) {
      console.log('[DEBUG postulaciones] No se encontró carta porte');
      return NextResponse.json([]);
    }

    const ecpIds: number[] = ecpRows.map((r: any) => Number(r.ECP_IdEcp)).filter((n: number) => Number.isInteger(n));
    if (ecpIds.length === 0) {
      return NextResponse.json([]);
    }

    // Buscar choferes postulados (TIC_IdTic = 9) para TODOS los ECP del viaje
    const placeholders = ecpIds.map(() => '?').join(', ');
    const query = `
      SELECT
        CAST(CONCAT(ecp.ENT_IdEnt, '-', icp.TER_IDTerceroTic, '-', ecp.ECP_IdEcp) AS CHAR) AS id,
        ecp.ENT_IdEnt AS viaje_id,
        ecp.ECP_IdEcp AS ecp_id,
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
        ecp.VEN_IdVendPostula AS vendedor_id,
        ven.VEN_NomVen AS vendedorNombre,
        ecp.ECP_PatCamion AS pat_chasis,
        ecp.ECP_PatAcoplado AS pat_acoplado,
        1 AS send_email
      FROM sige_icp_intcarpor icp
      INNER JOIN sige_ecp_enccarpor ecp ON ecp.ECP_IdEcp = icp.ECP_IdEcp
      LEFT JOIN sige_ter_tercero ch ON ch.TER_IDTercero = icp.TER_IDTerceroTic
      LEFT JOIN sige_ven_vendedor ven ON ven.VEN_IDVendedor = ecp.VEN_IdVendPostula
      LEFT JOIN sige_tvp_terveipat rel ON (rel.TER_IDTercero = icp.TER_IDTerceroTic OR rel.TER_IDTerceroAsoc = icp.TER_IDTerceroTic)
      LEFT JOIN sige_tra_transport tra_chofer ON tra_chofer.TRA_IDTransporte = rel.TER_IDTercero
      LEFT JOIN sige_tra_transport tra_asoc ON tra_asoc.TRA_IDTransporte = rel.TER_IDTerceroAsoc
      LEFT JOIN sige_ter_tercero ter_chofer ON ter_chofer.TER_IDTercero = rel.TER_IDTercero
      LEFT JOIN sige_ter_tercero ter_asoc ON ter_asoc.TER_IDTercero = rel.TER_IDTerceroAsoc
      WHERE icp.ECP_IdEcp IN (${placeholders}) AND icp.TIC_IdTic = 9
        AND icp.TER_IDTerceroTic IS NOT NULL AND icp.TER_IDTerceroTic > 0
      GROUP BY icp.TER_IDTerceroTic, ecp.ECP_IdEcp
      ORDER BY ecp.ECP_IdEcp ASC
    `;

    console.log('[DEBUG postulaciones] Ejecutando query con ECPs:', ecpIds);

    const [rows] = (await db.query(query, ecpIds) as unknown as [RowDataPacket[]]) ?? [];

    console.log('[DEBUG postulaciones] Rows obtenidas:', rows?.length || 0);

    if (!Array.isArray(rows)) {
      console.log('[DEBUG postulaciones] Rows no es un array');
      return NextResponse.json([]);
    }

    const mapped = rows.map((row: any) => ({
      id: row.id ?? `${row.viaje_id}-${row.chofer_id}-${row.ecp_id}`,
      viajeId: row.viaje_id,
      ecpId: row.ecp_id, // ID específico de la ECP de esta postulación
      transporteId: row.transporte_id ?? null,
      transportistaNombre: row.transportistaNombre ?? null,
      choferId: row.chofer_id,
      choferNombre: row.choferNombre ?? null,
      vendedorId: row.vendedor_id ?? null,
      vendedorNombre: row.vendedorNombre ?? null,
      patChasis: row.pat_chasis ?? null,
      patAcoplado: row.pat_acoplado ?? null,
      sendEmail: Boolean(row.send_email),
    }));

    console.log('[DEBUG postulaciones] Devolviendo', mapped.length, 'postulaciones');
    return NextResponse.json(mapped);
  } catch (error: any) {
    if (error?.code === "ER_NO_SUCH_TABLE") {
      console.log('[DEBUG postulaciones] Tabla no existe');
      return NextResponse.json([]);
    }
    console.error("[ERROR postulaciones] Error completo:", error);
    console.error("[ERROR postulaciones] Error stack:", error?.stack);
    console.error("[ERROR postulaciones] Error code:", error?.code);
    console.error("[ERROR postulaciones] Error sqlMessage:", error?.sqlMessage);
    return NextResponse.json(
      { error: "Error al obtener las postulaciones", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
