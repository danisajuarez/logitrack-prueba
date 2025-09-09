import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    console.log("Iniciando consulta de proveedores...");

    const [rows] = (await db.query(
      `
      SELECT 
        TER_IDTercero AS id,
        TER_RazonSocialTer AS razonSocial
      FROM sige_ter_tercero
      WHERE TER_TipoDoc = 2
        AND TER_RazonSocialTer IS NOT NULL 
        AND TER_RazonSocialTer != ''
      ORDER BY TER_RazonSocialTer ASC
      LIMIT 50;
      `
    )) as unknown as [any[]];

    let result = Array.isArray(rows) ? rows : [];
    console.log("Proveedores obtenidos (doc=2):", result.length);

    // Fallback: si no hay ninguno con TER_TipoDoc=2, traer los primeros por razón social
    if (result.length === 0) {
      const [fallback] = (await db.query(
        `
        SELECT 
          TER_IDTercero AS id,
          TER_RazonSocialTer AS razonSocial
        FROM sige_ter_tercero
        WHERE TER_RazonSocialTer IS NOT NULL 
          AND TER_RazonSocialTer != ''
        ORDER BY TER_RazonSocialTer ASC
        LIMIT 100;
        `
      )) as unknown as [any[]];
      result = Array.isArray(fallback) ? fallback : [];
      console.log("Proveedores obtenidos (fallback):", result.length);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error al obtener proveedores:", error);
    return NextResponse.json(
      { error: "Error al obtener proveedores" },
      { status: 500 }
    );
  }
}
