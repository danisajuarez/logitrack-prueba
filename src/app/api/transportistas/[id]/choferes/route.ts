// /api/transportistas/[id]/choferes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const transportistaId = Number(id);
  if (!Number.isInteger(transportistaId) || transportistaId <= 0) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const [rows] = await db.query(
    `SELECT
       ch.TER_IDTercero        AS id,
       ch.TER_RazonSocialTer   AS nombre,
       ch.TER_CUITTer          AS cuit,
       ch.TER_TelefonoTer      AS telefono,
       tvp.tvp_patente         AS patChasis,
       tvp.TVP_PatenteAcoplado AS patAcoplado
     FROM sige_tvp_terveipat tvp
     JOIN sige_ter_tercero ch
       ON ch.TER_IDTercero = tvp.TER_IdTerceroAsoc
     WHERE tvp.ter_idtercero = 61992
     ORDER BY ch.TER_RazonSocialTer`,
    [transportistaId]
  );
  return NextResponse.json(rows);
}
