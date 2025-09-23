// /api/transportistas/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const [rows] = await db.query(`
    SELECT t.TER_IDTercero AS id, t.TER_RazonSocialTer AS nombre
    FROM sige_ter_tercero t
    WHERE t.TTE_IDTipoTercero = 2
    ORDER BY t.TER_RazonSocialTer
  `);
  return NextResponse.json(rows);
}
