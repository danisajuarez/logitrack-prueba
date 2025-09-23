// /api/choferes/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const [rows] = await db.query(`
    SELECT ch.TER_IDTercero AS id, ch.TER_RazonSocialTer AS nombre
    FROM sige_tvp_terveipat tvp
    JOIN sige_ter_tercero ch
      ON ch.TER_IDTercero = tvp.TER_IdTerceroAsoc
    GROUP BY ch.TER_IDTercero, ch.TER_RazonSocialTer
    ORDER BY ch.TER_RazonSocialTer
  `);
  return NextResponse.json(rows);
}
