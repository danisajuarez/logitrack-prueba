import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [rows] = (await db.query(
      `SELECT
        TER_IDTercero AS id,
        TER_RazonSocialTer AS razonSocial,
        TER_CUITTer AS cuit,
        TER_TelefonoTer AS telefono,
        TER_EMailTer AS email,
        TER_TipoDoc AS tipo,
        LOC_IDLocalidad AS localidad
      FROM sige_ter_tercero
      WHERE TER_RazonSocialTer IS NOT NULL
        AND TER_RazonSocialTer != ''
        AND TTE_IDTipoTercero = 1
      ORDER BY TER_RazonSocialTer ASC
      LIMIT 500;`
    )) as unknown as [any[]];

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error al obtener datos en /api/terceros:", error);
    return NextResponse.json(
      { error: "Error al obtener datos" },
      { status: 500 }
    );
  }
}

