// /api/transportistas/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Devuelve todos los transportistas únicos que tienen vehículos/choferes asociados
export async function GET() {
  const [rows] = await db.query(`
    SELECT DISTINCT
      sige_ter_tercero.TER_IDTercero AS id,
      sige_ter_tercero.TER_RazonSocialTer AS nombre
    FROM sige_tvp_terveipat
    INNER JOIN sige_ter_tercero
      ON sige_tvp_terveipat.ter_idtercero = sige_ter_tercero.TER_IDTercero
    WHERE sige_tvp_terveipat.tvp_patente IS NOT NULL
      AND sige_tvp_terveipat.tvp_patente <> ''
    ORDER BY nombre
  `);
  return NextResponse.json(rows);
}
