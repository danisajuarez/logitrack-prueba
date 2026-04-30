// /api/choferes/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fixEncodingObject } from "@/lib/encoding";

export async function GET() {
  const [rows] = await db.query(`
    SELECT ch.TER_IDTercero AS id, ch.TER_RazonSocialTer AS nombre
    FROM sige_tvp_terveipat tvp
    JOIN sige_ter_tercero ch
      ON ch.TER_IDTercero = tvp.TER_IdTerceroAsoc
    WHERE ch.TTE_IDTipoTercero = 2
    GROUP BY ch.TER_IDTercero, ch.TER_RazonSocialTer
    ORDER BY ch.TER_RazonSocialTer
  `);
  const fixedRows = Array.isArray(rows) ? rows.map(row => fixEncodingObject(row)) : rows;
  return NextResponse.json(fixedRows);
}
