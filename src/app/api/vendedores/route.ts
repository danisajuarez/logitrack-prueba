import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fixEncodingObject } from "@/lib/encoding";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [rows] = (await db.query(
      `SELECT 
        VEN_IDVendedor AS id,
        VEN_NomVen AS nombre
      FROM sige_ven_vendedor
      WHERE VEN_NomVen IS NOT NULL 
        AND VEN_NomVen != ''
      ORDER BY VEN_NomVen ASC
      LIMIT 500;`
    )) as unknown as [any[]];

    const fixedRows = Array.isArray(rows) ? rows.map(row => fixEncodingObject(row)) : rows;
  return NextResponse.json(fixedRows);
  } catch (error) {
    console.error("Error al obtener vendedores:", error);
    return NextResponse.json(
      { error: "Error al obtener vendedores" },
      { status: 500 }
    );
  }
}

