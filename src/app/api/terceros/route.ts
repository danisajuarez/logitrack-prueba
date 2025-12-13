import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fixEncodingObject } from "@/lib/encoding";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Primero ver qué tipos existen
    const [tiposDebug]: any = await db.query(
      `SELECT DISTINCT TTE_IDTipoTercero, COUNT(*) as cant
       FROM sige_ter_tercero
       WHERE TER_RazonSocialTer IS NOT NULL AND TER_RazonSocialTer != ''
       GROUP BY TTE_IDTipoTercero`
    );
    console.log("[DEBUG /api/terceros] Tipos disponibles:", tiposDebug);

    const [rows] = (await db.query(
      `SELECT
        TER_IDTercero AS id,
        TER_RazonSocialTer AS razonSocial,
        TER_CUITTer AS cuit,
        TER_TelefonoTer AS telefono,
        TER_EMailTer AS email,
        TER_TipoDoc AS tipo,
        LOC_IDLocalidad AS localidad,
        TTE_IDTipoTercero AS tipoTercero,
        CCT_IDCCT AS categoriaCliente
      FROM sige_ter_tercero
      WHERE TER_RazonSocialTer IS NOT NULL
        AND TER_RazonSocialTer != ''
        AND TTE_IDTipoTercero = 1
        AND CCT_IDCCT = 1
      ORDER BY TER_RazonSocialTer ASC
    ;`
    )) as unknown as [any[]];

    console.log(
      "[DEBUG /api/terceros] Registros encontrados con TTE_IDTipoTercero=1 Y CCT_IDCCT=1:",
      rows.length
    );
    console.log(
      "[DEBUG /api/terceros] Primeros 3 registros:",
      rows.slice(0, 3)
    );

    // Corregir encoding
    const fixedRows = rows.map((row) => fixEncodingObject(row));

    return NextResponse.json(fixedRows);
  } catch (error: any) {
    console.error("Error al obtener datos en /api/terceros:", error);
    // Si hay error de columna, intentar sin filtro para ver qué pasa
    if (error?.code === "ER_BAD_FIELD_ERROR") {
      console.log(
        "[DEBUG] La columna TTE_IDTipoTercero no existe, intentando sin filtro"
      );
      try {
        const [rowsSinFiltro] = (await db.query(
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
          ORDER BY TER_RazonSocialTer ASC
          `
        )) as unknown as [any[]];
        console.log(
          "[DEBUG] Sin filtro encontró:",
          rowsSinFiltro.length,
          "registros"
        );
        const fixedRowsSinFiltro = rowsSinFiltro.map((row) =>
          fixEncodingObject(row)
        );
        return NextResponse.json(fixedRowsSinFiltro);
      } catch (e2) {
        console.error("[DEBUG] Error sin filtro también:", e2);
      }
    }
    return NextResponse.json(
      { error: "Error al obtener datos", details: error?.message },
      { status: 500 }
    );
  }
}
