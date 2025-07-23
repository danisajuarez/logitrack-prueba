import { db } from "../../../../src/lib/db";

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [rows] = (await db.query(`
     SELECT 
    TER_IDTercero AS id,
    TER_RazonSocialTer AS razonSocial,
    TER_CUITTer AS cuit,
    TER_TelefonoTer AS telefono,
    TER_EMailTer AS email,
    TER_TipoDoc AS tipo,
    LOC_IDLocalidad AS localidad
    FROM sige_ter_tercero
    LIMIT 100;
    `)) as unknown as [any[]];

    return NextResponse.json(rows);
  } catch (error) {
    console.error("💥 Error al obtener datos en /api/terceros:", error);
    return NextResponse.json(
      { error: "Error al obtener datos" },
      { status: 500 }
    );
  }
}
