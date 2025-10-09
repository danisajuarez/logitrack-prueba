// /api/estaciones-servicio/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await db.query(`
   SELECT
     t.TER_IDTercero      AS id,
     t.TER_RazonSocialTer AS razonSocial,
     t.TER_CUITTer        AS cuit,
     t.TER_DomicilioTer   AS direccion,
     t.TER_TelefonoTer    AS telefono
   FROM sige_ter_tercero t
   JOIN sige_cct_catcliente cct ON t.CCT_IDCCT = cct.CCT_IDCCT
   WHERE t.TTE_IDTipoTercero = 2    
     AND t.CCT_IDCCT = 9            
   ORDER BY t.TER_RazonSocialTer, t.TER_IDTercero
 `);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error al obtener estaciones de servicio:", error);
    return NextResponse.json(
      { error: "Error al obtener estaciones de servicio" },
      { status: 500 }
    );
  }
}
