import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const minCuposPendientes = searchParams.get("minCuposPendientes");
    const vendedor = searchParams.get("vendedor");

    // Por defecto, traer desde ayer si no se especifica
    if (!fechaDesde) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      fechaDesde = `${yyyy}-${mm}-${dd}`;
    }

    const filtrosViejos: string[] = [];
    const paramsViejos: any[] = [];

    const filtrosNuevos: string[] = [];
    const paramsNuevos: any[] = [];

    if (fechaDesde) {
      filtrosViejos.push(`e.ENT_Fecha >= ?`);
      paramsViejos.push(fechaDesde);
    }
    if (fechaHasta) {
      filtrosViejos.push(`e.ENT_Fecha <= ?`);
      paramsViejos.push(fechaHasta);
    }
    if (minCuposPendientes) {
      filtrosViejos.push(`(e.ENT_CantCupos - e.ENT_CantCuposReser) >= ?`);
      paramsViejos.push(parseInt(minCuposPendientes));
    }
    if (vendedor) {
      filtrosViejos.push(`v.VEN_NomVen LIKE ?`);
      paramsViejos.push(`%${vendedor}%`);
    }

    // Filtros para la tabla nueva (viajes_nuevos)
    if (fechaDesde) {
      filtrosNuevos.push(`n.fecha >= ?`);
      paramsNuevos.push(fechaDesde);
    }
    if (fechaHasta) {
      filtrosNuevos.push(`n.fecha <= ?`);
      paramsNuevos.push(fechaHasta);
    }
    if (minCuposPendientes) {
      filtrosNuevos.push(`n.cuposPendientes >= ?`);
      paramsNuevos.push(parseInt(minCuposPendientes));
    }
    if (vendedor) {
      filtrosNuevos.push(`n.vendedor LIKE ?`);
      paramsNuevos.push(`%${vendedor}%`);
    }

    const whereClauseViejos = filtrosViejos.length ? `AND ${filtrosViejos.join(" AND ")}` : "";
    const whereClauseNuevos = filtrosNuevos.length ? `WHERE ${filtrosNuevos.join(" AND ")}` : "";

    const query = `
      SELECT 
        n.id AS id,
        n.numero AS numero,
        n.fecha AS fecha,
        n.razonSocial AS razonSocial,
        n.origen AS origen,
        n.destino AS destino,
        n.articulo AS articulo,
        n.equipo AS equipo,
        n.cupos AS cupos,
        n.cuposReservados AS cuposReservados,
        n.cuposPendientes AS cuposPendientes,
        n.tarifa AS tarifa,
        n.vendedor AS vendedor,
        n.proveedorId AS proveedorId,
        n.proveedorNombre AS proveedorNombre
      FROM viajes_nuevos n
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
        (e.ENT_CantCupos - e.ENT_CantCuposReser) AS cuposPendientes,
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

    const paramsAll = [...paramsNuevos, ...paramsViejos];
    const [rows] = await db.query<RowDataPacket[]>(query, paramsAll);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error al obtener viajes:", error);
    return NextResponse.json(
      { error: "Error al obtener los viajes" },
      { status: 500 }
    );
  }
}
    // Asegurar que la tabla nueva exista para evitar errores en la UNION
    await db.query(`
      CREATE TABLE IF NOT EXISTS viajes_nuevos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fecha DATETIME NOT NULL,
        numero VARCHAR(32) NOT NULL,
        razonSocial VARCHAR(255) NOT NULL,
        origen VARCHAR(255),
        destino VARCHAR(255),
        articulo VARCHAR(255),
        equipo VARCHAR(255),
        cupos INT,
        cuposReservados INT,
        cuposPendientes INT,
        tarifa DECIMAL(12,2),
        vendedor VARCHAR(255),
        proveedorId INT NULL,
        proveedorNombre VARCHAR(255) NULL,
        INDEX idx_fecha (fecha),
        INDEX idx_numero (numero)
      );
    `);
