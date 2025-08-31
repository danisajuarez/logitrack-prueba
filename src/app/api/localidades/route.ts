import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [rows] = (await db.query(
      `SELECT 
        LOC_IDLocalidad AS id,
        LOC_NomLocalidad AS nombre
      FROM sige_loc_localidad
      WHERE LOC_NomLocalidad IS NOT NULL 
        AND LOC_NomLocalidad != ''
      ORDER BY LOC_NomLocalidad ASC
      LIMIT 1000;`
    )) as unknown as [any[]];

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error al obtener localidades:", error);
    return NextResponse.json(
      { error: "Error al obtener localidades" },
      { status: 500 }
    );
  }
}

