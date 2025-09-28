// /api/transportistas/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Devuelve solo transportistas que tienen al menos un chofer con patente asociada
export async function GET() {
  const [rows] = await db.query(`
    SELECT 
      tra.TRA_IDTransporte AS id,
      COALESCE(ter.TER_RazonSocialTer, tra.TRA_NomTrans) AS nombre
    FROM sige_tra_transport tra
    LEFT JOIN sige_ter_tercero ter
      ON ter.TER_IDTercero = tra.TRA_IDTransporte
    WHERE EXISTS (
      SELECT 1
      FROM sige_tvp_terveipat tvp
      WHERE tvp.ter_idtercero = tra.TRA_IDTransporte
        AND tvp.TVP_Patente IS NOT NULL
        AND tvp.TVP_Patente <> ''
    )
    ORDER BY nombre
  `);
  return NextResponse.json(rows);
}
