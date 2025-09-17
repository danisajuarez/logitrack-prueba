import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    console.log("=== BUSCANDO CHOFERES (CONDUCTORES) ===");

    // Los choferes son CONDUCTORES, no dueños de camiones
    // Buscar en terceros que sean tipo 9 (choferes) o que tengan términos relacionados

    // 1. Primero buscar específicamente por tipo 9
    console.log("1. Buscando terceros tipo 9 (choferes)...");
    const tipo9Query = `
      SELECT
        TER_IDTercero as id,
        TER_RazonSocialTer as razonSocial,
        TER_CUITTer as cuit,
        TER_TelefonoTer as telefono,
        TER_EMailTer as email
      FROM sige_ter_tercero
      WHERE TTE_IDTipoTercero = 9
      ORDER BY TER_RazonSocialTer
      LIMIT 50
    `;

    const [tipo9Rows] = await db.query(tipo9Query);
    console.log(`Encontrados ${Array.isArray(tipo9Rows) ? tipo9Rows.length : 0} terceros tipo 9:`, tipo9Rows);

    // 2. Si no hay tipo 9, buscar por nombres que indiquen que son conductores
    if (!Array.isArray(tipo9Rows) || tipo9Rows.length === 0) {
      console.log("2. No hay tipo 9, buscando por nombres de conductores...");
      const conductoresQuery = `
        SELECT
          TER_IDTercero as id,
          TER_RazonSocialTer as razonSocial,
          TER_CUITTer as cuit,
          TER_TelefonoTer as telefono,
          TER_EMailTer as email,
          TTE_IDTipoTercero as tipoTercero
        FROM sige_ter_tercero
        WHERE (
          UPPER(TER_RazonSocialTer) LIKE '%CHOFER%' OR
          UPPER(TER_RazonSocialTer) LIKE '%CONDUCTOR%' OR
          UPPER(TER_RazonSocialTer) LIKE '%DRIVER%' OR
          -- Buscar nombres de personas (no empresas)
          TER_RazonSocialTer REGEXP '^[A-Z][a-z]+ [A-Z][a-z]+' OR
          TER_RazonSocialTer NOT LIKE '%S.A.%' AND
          TER_RazonSocialTer NOT LIKE '%S.R.L.%' AND
          TER_RazonSocialTer NOT LIKE '%S.A.S.%'
        )
        ORDER BY TER_RazonSocialTer
        LIMIT 50
      `;

      const [conductorRows] = await db.query(conductoresQuery);
      console.log(`Encontrados ${Array.isArray(conductorRows) ? conductorRows.length : 0} posibles conductores:`, conductorRows);

      return NextResponse.json(conductorRows || []);
    }

    // 3. Si encontramos tipo 9, verificar si algunos tienen info adicional
    console.log("3. Enriqueciendo datos de choferes tipo 9...");
    return NextResponse.json(tipo9Rows || []);

  } catch (error) {
    console.error("❌ Error al buscar choferes:", error);
    return NextResponse.json(
      { error: "Error al obtener choferes", details: (error as any)?.message },
      { status: 500 }
    );
  }
}