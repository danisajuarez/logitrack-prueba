import { db } from "../../../../lib/db";
import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const minCuposPendientes = searchParams.get("minCuposPendientes");
    const vendedor = searchParams.get("vendedor");

    // Construir filtros para tabla nueva
    const filtrosNuevos: string[] = [];
    const paramsNuevos: any[] = [];

    if (fechaDesde) {
      filtrosNuevos.push(`fecha >= ?`);
      paramsNuevos.push(fechaDesde);
    }
    if (fechaHasta) {
      filtrosNuevos.push(`fecha <= ?`);
      paramsNuevos.push(fechaHasta);
    }
    if (minCuposPendientes) {
      filtrosNuevos.push(`cuposPendientes >= ?`);
      paramsNuevos.push(parseInt(minCuposPendientes));
    }
    if (vendedor) {
      filtrosNuevos.push(`vendedor LIKE ?`);
      paramsNuevos.push(`%${vendedor}%`);
    }

    // Construir filtros para tabla vieja
    const filtrosViejos: string[] = [];
    const paramsViejos: any[] = [];

    if (fechaDesde) {
      filtrosViejos.push(`e.ENT_Fecha >= ?`);
      paramsViejos.push(fechaDesde);
    }
    if (fechaHasta) {
      filtrosViejos.push(`e.ENT_Fecha <= ?`);
      paramsViejos.push(fechaHasta);
    }
    if (minCuposPendientes) {
      filtrosViejos.push(`e.ENT_CantCuposPend >= ?`);
      paramsViejos.push(parseInt(minCuposPendientes));
    }
    if (vendedor) {
      filtrosViejos.push(`v.VEN_NomVen LIKE ?`);
      paramsViejos.push(`%${vendedor}%`);
    }

    const whereClauseNuevos = filtrosNuevos.length ? `WHERE ${filtrosNuevos.join(" AND ")}` : "";
    const whereClauseViejos = filtrosViejos.length ? `AND ${filtrosViejos.join(" AND ")}` : "";

    const allParams = [...paramsNuevos, ...paramsViejos];

    // Intentar consulta con columnas de proveedor, si falla usar consulta básica
    let query;
    try {
      query = `
        SELECT 
          id,
          numero,
          fecha,
          razonSocial,
          origen,
          destino,
          articulo,
          equipo,
          cupos,
          cuposReservados,
          cuposPendientes,
          tarifa,
          vendedor,
          proveedorId,
          proveedorNombre
        FROM viajes_nuevos
        ${whereClauseNuevos}

        UNION ALL

        SELECT 
          NULL AS id,
          e.ENT_Numero AS numero,
          e.ENT_Fecha AS fecha,
          e.TER_RazonSocialTer AS razonSocial,
          e.LOC_NomLocalidadOrig AS origen,
          e.LOC_NomLocalidadDest AS destino,
          d.ART_DesArticulo AS articulo,
          eq.EQU_DesEquipo AS equipo,
          e.ENT_CantCupos AS cupos,
          e.ENT_CantCuposReser AS cuposReservados,
          e.ENT_CantCuposPend AS cuposPendientes,
          e.ENT_Tarifa AS tarifa,
          v.VEN_NomVen AS vendedor,
          NULL AS proveedorId,
          NULL AS proveedorNombre
        FROM sige_ent_encnegtra e
        INNER JOIN sige_dnt_detnegtra d ON e.ENT_IdEnt = d.ENT_IdEnt
        INNER JOIN sige_usu_usuario u ON e.USU_IdUsuario = u.USU_IdUsuario
        INNER JOIN sige_equ_equipos eq ON e.EQU_IDEquipo = eq.EQU_IDEquipo
        LEFT JOIN sige_ven_vendedor v ON e.VEN_IdVendPostula = v.VEN_IdVendedor
        WHERE e.TER_IdTercero > 0
        ${whereClauseViejos}
        ORDER BY fecha DESC
      `;
      
      const [rows] = await db.query<RowDataPacket[]>(query, allParams);
      return NextResponse.json(rows);
    } catch (error) {
      // Si falla, usar consulta sin columnas de proveedor
      console.warn("Columnas de proveedor no existen, usando consulta básica");
      query = `
        SELECT 
          id,
          numero,
          fecha,
          razonSocial,
          origen,
          destino,
          articulo,
          equipo,
          cupos,
          cuposReservados,
          cuposPendientes,
          tarifa,
          vendedor,
          NULL as proveedorId,
          NULL as proveedorNombre
        FROM viajes_nuevos
        ${whereClauseNuevos}

        UNION ALL

        SELECT 
          NULL AS id,
          e.ENT_Numero AS numero,
          e.ENT_Fecha AS fecha,
          e.TER_RazonSocialTer AS razonSocial,
          e.LOC_NomLocalidadOrig AS origen,
          e.LOC_NomLocalidadDest AS destino,
          d.ART_DesArticulo AS articulo,
          eq.EQU_DesEquipo AS equipo,
          e.ENT_CantCupos AS cupos,
          e.ENT_CantCuposReser AS cuposReservados,
          e.ENT_CantCuposPend AS cuposPendientes,
          e.ENT_Tarifa AS tarifa,
          v.VEN_NomVen AS vendedor,
          NULL AS proveedorId,
          NULL AS proveedorNombre
        FROM sige_ent_encnegtra e
        INNER JOIN sige_dnt_detnegtra d ON e.ENT_IdEnt = d.ENT_IdEnt
        INNER JOIN sige_usu_usuario u ON e.USU_IdUsuario = u.USU_IdUsuario
        INNER JOIN sige_equ_equipos eq ON e.EQU_IDEquipo = eq.EQU_IDEquipo
        LEFT JOIN sige_ven_vendedor v ON e.VEN_IdVendPostula = v.VEN_IdVendedor
        WHERE e.TER_IdTercero > 0
        ${whereClauseViejos}
        ORDER BY fecha DESC
      `;
    }

    const [rows] = await db.query<RowDataPacket[]>(query, allParams);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error al obtener viajes:", error);
    return NextResponse.json(
      { error: "Error al obtener los viajes" },
      { status: 500 }
    );
  }
}
