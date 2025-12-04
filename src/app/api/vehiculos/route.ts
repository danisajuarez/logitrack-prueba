import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fixEncodingObject } from "@/lib/encoding";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const choferId = searchParams.get("choferId");

    console.log(`=== BUSCANDO VEHÍCULOS para ID: ${choferId} ===`);

    if (choferId) {
      // Primero ver qué hay en la tabla de vehículos
      console.log("1. Verificando estructura de tabla de vehículos...");
      const testQuery = `
        SELECT
          TER_IDTerceroAsoc,
          TVP_Patente,
          TVP_PatenteAcoplado
        FROM sige_tvp_terveipat
        LIMIT 5
      `;
      const [testRows] = await db.query(testQuery);
      console.log("Muestra de tabla sige_tvp_terveipat:", testRows);

      // Investigar la relación entre transportistas y terceros
      console.log(`2. Investigando relación transportista ${choferId} con terceros...`);

      // Buscar si hay una relación directa entre sige_tra_transport y sige_ter_tercero
      const relationQuery = `
        SELECT
          t.TRA_IDTransporte as transporteId,
          t.TRA_NomTrans as transporteNombre,
          ter.TER_IDTercero as terceroId,
          ter.TER_RazonSocialTer as terceroNombre
        FROM sige_tra_transport t
        LEFT JOIN sige_ter_tercero ter ON t.TRA_IDTransporte = ter.TER_IDTercero
        WHERE t.TRA_IDTransporte = ?
        LIMIT 1
      `;

      const [relationRows] = await db.query(relationQuery, [choferId]);
      console.log(`Relación transportista-tercero:`, relationRows);

      // Buscar vehículos específicos del transportista
      const query = `
        SELECT
          TVP_Patente as patente,
          TVP_PatenteAcoplado as patenteAcoplado,
          TER_IDTerceroAsoc as terceroId
        FROM sige_tvp_terveipat
        WHERE TER_IDTerceroAsoc = ?
      `;

      console.log(`3. Buscando vehículos para transportista ${choferId}...`);
      const [rows] = await db.query(query, [choferId]);
      console.log(`Encontrados ${Array.isArray(rows) ? rows.length : 0} vehículos:`, rows);

      // También buscar si hay algún vehículo con ID similar al transportista
      console.log(`4. Buscando vehículos por rango de ID cercano...`);
      const rangeQuery = `
        SELECT
          TVP_Patente as patente,
          TVP_PatenteAcoplado as patenteAcoplado,
          TER_IDTerceroAsoc as terceroId
        FROM sige_tvp_terveipat
        WHERE TER_IDTerceroAsoc BETWEEN ? AND ?
        LIMIT 5
      `;
      const [rangeRows] = await db.query(rangeQuery, [parseInt(choferId) - 50, parseInt(choferId) + 50]);
      console.log(`Vehículos en rango cercano:`, rangeRows);

      // Si no encuentra vehículos específicos, devolver todas las patentes disponibles
      if (!Array.isArray(rows) || rows.length === 0) {
        console.log("5. No se encontraron vehículos específicos, devolviendo todas las patentes...");
        const allVehiclesQuery = `
          SELECT DISTINCT
            TVP_Patente as patente,
            TVP_PatenteAcoplado as patenteAcoplado,
            TER_IDTerceroAsoc as terceroId
          FROM sige_tvp_terveipat
          WHERE TVP_Patente IS NOT NULL AND TVP_Patente != ''
          ORDER BY TVP_Patente
          LIMIT 50
        `;

        const [allVehicles] = await db.query(allVehiclesQuery);
        console.log(`Devolviendo todas las patentes disponibles: ${Array.isArray(allVehicles) ? allVehicles.length : 0}`, allVehicles);
        return NextResponse.json(allVehicles || []);
      }

      const fixedRows = Array.isArray(rows) ? rows.map(row => fixEncodingObject(row)) : rows;
  return NextResponse.json(fixedRows);
    } else {
      // Si no se especifica chofer, devolver todos los vehículos disponibles
      console.log("4. Devolviendo todos los vehículos disponibles...");
      const query = `
        SELECT DISTINCT
          TVP_Patente as patente,
          TVP_PatenteAcoplado as patenteAcoplado
        FROM sige_tvp_terveipat
        WHERE TVP_Patente IS NOT NULL AND TVP_Patente != ''
        ORDER BY TVP_Patente
        LIMIT 50
      `;

      const [rows] = await db.query(query);
      console.log(`Todos los vehículos: ${Array.isArray(rows) ? rows.length : 0}`, rows);
      const fixedRows = Array.isArray(rows) ? rows.map(row => fixEncodingObject(row)) : rows;
  return NextResponse.json(fixedRows);
    }
  } catch (error) {
    console.error("❌ Error al obtener vehículos:", error);
    return NextResponse.json(
      { error: "Error al obtener vehículos", details: (error as any)?.message },
      { status: 500 }
    );
  }
}