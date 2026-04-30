import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

// Devuelve IDs de viajes donde el transportista (dueño del camión) está asignado (TIC_IdTic = 8)
export async function GET(req: NextRequest) {
  const transportistaId = Number(new URL(req.url).searchParams.get("transportistaId"));
  if (!Number.isInteger(transportistaId) || transportistaId <= 0) {
    return NextResponse.json({ error: "transportistaId inválido" }, { status: 400 });
  }

  const [rows] = (await db.query(
    `SELECT DISTINCT ecp.ENT_IdEnt AS viajeId
     FROM sige_icp_intcarpor icp
     INNER JOIN sige_ecp_enccarpor ecp ON ecp.ECP_IdEcp = icp.ECP_IdEcp
     WHERE icp.TER_IDTerceroTic = ? AND icp.TIC_IdTic = 8`,
    [transportistaId]
  )) as unknown as [RowDataPacket[]];

  const ids = Array.isArray(rows) ? rows.map((r: any) => Number(r.viajeId)) : [];
  return NextResponse.json({ ids });
}
