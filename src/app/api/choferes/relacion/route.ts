// /api/choferes/relacion/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const choferId = Number(new URL(req.url).searchParams.get("choferId"));
  if (!Number.isInteger(choferId) || choferId <= 0) {
    return NextResponse.json({ error: "choferId inválido" }, { status: 400 });
  }

  const [rows] = await db.query(
    `SELECT
       tr.TER_IDTercero        AS transportista_id,
       tr.TER_RazonSocialTer   AS transportista_nombre,
       tr.TER_CUITTer          AS transportista_cuit,
       tr.TER_TelefonoTer      AS transportista_telefono,
       tr.TER_DomicilioTer     AS transportista_direccion,
       tvp.tvp_patente         AS patChasis,
       tvp.TVP_PatenteAcoplado AS patAcoplado
     FROM sige_tvp_terveipat tvp
     JOIN sige_ter_tercero tr
       ON tr.TER_IDTercero = tvp.ter_idtercero
     WHERE tvp.TER_IdTerceroAsoc = ?
     ORDER BY tvp.ter_idtercero DESC
     LIMIT 1`,
    [choferId]
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ choferId, relacionActiva: false });
  }
  const r: any = rows[0];
  return NextResponse.json({
    choferId,
    relacionActiva: true,
    transportista: {
      id: r.transportista_id,
      nombre: r.transportista_nombre,
      cuit: r.transportista_cuit,
      telefono: r.transportista_telefono,
      direccion: r.transportista_direccion,
    },
    patChasis: r.patChasis,
    patAcoplado: r.patAcoplado,
  });
}
