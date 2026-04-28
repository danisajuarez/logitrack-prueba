import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// Endpoint temporal para insertar DCP faltantes en ECPs que no lo tienen
// GET /api/viajes/fix-dcp?viajeId=2173  -> solo muestra qué faltaría insertar
// POST /api/viajes/fix-dcp?viajeId=2173 -> inserta los DCP faltantes

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const viajeId = Number(searchParams.get("viajeId"));

  if (!viajeId || !Number.isFinite(viajeId)) {
    return NextResponse.json({ error: "viajeId requerido" }, { status: 400 });
  }

  const [ecpRows]: any = await db.query(
    `SELECT e.ECP_IdEcp, e.ECP_Numero,
            d.ecp_idecp AS dcp_existe,
            dnt.ART_IdArticulo, dnt.DNT_Detalle
     FROM sige_ecp_enccarpor e
     LEFT JOIN SIGE_DCP_DetCarPor d ON d.ecp_idecp = e.ECP_IdEcp
     LEFT JOIN sige_dnt_detnegtra dnt ON dnt.ENT_IdEnt = e.ENT_IdEnt
     WHERE e.ENT_IdEnt = ?
     ORDER BY e.ECP_IdEcp`,
    [viajeId]
  );

  const sinDcp = ecpRows.filter((r: any) => !r.dcp_existe);
  return NextResponse.json({
    total_ecps: ecpRows.length,
    sin_dcp: sinDcp.length,
    ecps: ecpRows.map((r: any) => ({
      ecp_id: r.ECP_IdEcp,
      ecp_numero: r.ECP_Numero,
      tiene_dcp: !!r.dcp_existe,
      articulo_id: r.ART_IdArticulo,
      articulo_desc: r.DNT_Detalle,
    })),
  });
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const viajeId = Number(searchParams.get("viajeId"));

  if (!viajeId || !Number.isFinite(viajeId)) {
    return NextResponse.json({ error: "viajeId requerido" }, { status: 400 });
  }

  const [ecpRows]: any = await db.query(
    `SELECT e.ECP_IdEcp, e.ECP_Numero,
            d.ecp_idecp AS dcp_existe,
            dnt.ART_IdArticulo, dnt.DNT_Detalle
     FROM sige_ecp_enccarpor e
     LEFT JOIN SIGE_DCP_DetCarPor d ON d.ecp_idecp = e.ECP_IdEcp
     LEFT JOIN sige_dnt_detnegtra dnt ON dnt.ENT_IdEnt = e.ENT_IdEnt
     WHERE e.ENT_IdEnt = ?
     ORDER BY e.ECP_IdEcp`,
    [viajeId]
  );

  const sinDcp = ecpRows.filter((r: any) => !r.dcp_existe);

  if (sinDcp.length === 0) {
    return NextResponse.json({ message: "Todas las ECPs ya tienen DCP", insertados: 0 });
  }

  let insertados = 0;
  const errores: string[] = [];

  for (const row of sinDcp) {
    try {
      await db.execute(
        `INSERT INTO SIGE_DCP_DetCarPor (
          ecp_idecp, dcp_renglondcp, art_idarticulo, art_desarticulo,
          dcp_cosecha, dcp_pesobruto, dcp_pesotara, dcp_pesoneto,
          DCP_PesoBrutoDescarga, DCP_PesoTaraDescarga, DCP_PesoNetoDescarga, DEP_IDDeposito
        ) VALUES (?, 1, ?, ?, '', 0, 0, 0, 0, 0, 0, 1)`,
        [
          row.ECP_IdEcp,
          row.ART_IdArticulo ?? "7",
          row.DNT_Detalle ?? "",
        ]
      );
      insertados++;
    } catch (e: any) {
      errores.push(`ECP ${row.ECP_IdEcp}: ${e?.message}`);
    }
  }

  return NextResponse.json({
    message: `Se insertaron ${insertados} DCP faltantes`,
    insertados,
    errores,
  });
}
