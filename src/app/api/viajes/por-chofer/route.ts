import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

// Devuelve los IDs de viajes donde el chofer dado está postulado (TIC_IdTic = 9)
export async function GET(req: NextRequest) {
  const choferId = Number(new URL(req.url).searchParams.get("choferId"));
  if (!Number.isInteger(choferId) || choferId <= 0) {
    return NextResponse.json({ error: "choferId inválido" }, { status: 400 });
  }

  const [rows] = (await db.query(
    `SELECT DISTINCT ecp.ENT_IdEnt AS viajeId
     FROM sige_icp_intcarpor icp
     INNER JOIN sige_ecp_enccarpor ecp ON ecp.ECP_IdEcp = icp.ECP_IdEcp
     WHERE icp.TER_IDTerceroTic = ? AND icp.TIC_IdTic = 9`,
    [choferId]
  )) as unknown as [RowDataPacket[]];

  const ids = Array.isArray(rows) ? rows.map((r: any) => Number(r.viajeId)) : [];
  return NextResponse.json({ ids });
}
