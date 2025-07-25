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

    const filtros: string[] = [];
    const params: any[] = [];

    // Filtros para la tabla vieja
    if (fechaDesde) {
      filtros.push(`e.ENT_Fecha >= ?`);
      params.push(fechaDesde);
    }
    if (fechaHasta) {
      filtros.push(`e.ENT_Fecha <= ?`);
      params.push(fechaHasta);
    }
    if (minCuposPendientes) {
      filtros.push(`e.ENT_CantCuposPend > ?`);
      params.push(minCuposPendientes);
    }
    if (vendedor) {
      filtros.push(`v.VEN_NomVen LIKE ?`);
      params.push(`%${vendedor}%`);
    }

    const whereClause = filtros.length ? `AND ${filtros.join(" AND ")}` : "";

    const query = `
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
        vendedor
      FROM viajes_nuevos

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
        v.VEN_NomVen AS vendedor
      FROM sige_ent_encnegtra e
      INNER JOIN sige_dnt_detnegtra d ON e.ENT_IdEnt = d.ENT_IdEnt
      INNER JOIN sige_usu_usuario u ON e.USU_IdUsuario = u.USU_IdUsuario
      INNER JOIN sige_equ_equipos eq ON e.EQU_IDEquipo = eq.EQU_IDEquipo
      LEFT JOIN sige_ven_vendedor v ON e.VEN_IdVendPostula = v.VEN_IdVendedor
      WHERE e.TER_IdTercero > 0
      ${whereClause}
      ORDER BY fecha DESC
    `;

    const [rows] = await db.query<RowDataPacket[]>(query, params);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error al obtener viajes:", error);
    return NextResponse.json(
      { error: "Error al obtener los viajes" },
      { status: 500 }
    );
  }
}
