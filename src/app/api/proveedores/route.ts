import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [rows] = (await db.query(`
     SELECT 
    TER_IDTercero AS id,
    TER_RazonSocialTer AS razonSocial,
    TER_CUITTer AS cuit,
    TER_TelefonoTer AS telefono,
    TER_EMailTer AS email
    FROM sige_ter_tercero
    WHERE TTE_IDTipoTercero = 2
    AND TER_RazonSocialTer IS NOT NULL 
    AND TER_RazonSocialTer != ''
    ORDER BY TER_RazonSocialTer ASC
    LIMIT 500;
    `)) as unknown as [any[]];

    return NextResponse.json(rows);
  } catch (error) {
    console.error("💥 Error al obtener proveedores:", error);
    return NextResponse.json(
      { error: "Error al obtener proveedores" },
      { status: 500 }
    );
  }
}
