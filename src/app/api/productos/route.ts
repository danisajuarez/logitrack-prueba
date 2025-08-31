import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [rows] = (await db.query(
      `SELECT 
        ART_IDArticulo AS id,
        ART_DesArticulo AS nombre,
        ART_PVP AS precio,
        ART_StockArt AS stock,
        ART_EsOferta AS oferta,
        ART_EsNovedad AS novedad
      FROM sige_art_articulo
      WHERE (ART_EstadoArt IS NULL OR ART_EstadoArt != 'B')
        AND ART_DesArticulo IS NOT NULL 
        AND ART_DesArticulo != ''
      ORDER BY ART_DesArticulo ASC
      LIMIT 500`
    )) as unknown as [any[]];

    const parsed = rows.map((p) => ({
      ...p,
      oferta: p.oferta === "S",
      novedad: p.novedad === "S",
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    return NextResponse.json(
      { error: "Error al obtener productos" },
      { status: 500 }
    );
  }
}

