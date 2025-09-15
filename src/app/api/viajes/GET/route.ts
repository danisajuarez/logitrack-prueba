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
    const razonSocial = searchParams.get("razonSocial");

    // Por defecto, traer desde hoy si no se especifica
    if (!fechaDesde) {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      fechaDesde = `${yyyy}-${mm}-${dd}`;
    }

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
      filtrosViejos.push(`(e.ENT_CantCupos - e.ENT_CantCuposReser) >= ?`);
      paramsViejos.push(parseInt(minCuposPendientes));
    }
    if (vendedor) {
      filtrosViejos.push(`v.VEN_NomVen LIKE ?`);
      paramsViejos.push(`%${vendedor}%`);
    }
    if (razonSocial) {
      filtrosViejos.push(`e.TER_RazonSocialTer LIKE ?`);
      paramsViejos.push(`%${razonSocial}%`);
    }

    const whereClauseViejos = filtrosViejos.length ? `AND ${filtrosViejos.join(" AND ")}` : "";

    // Consultar primero la tabla nueva si existe
    let rowsNuevos: RowDataPacket[] = [];
    try {
      const filtrosNuevos: string[] = [];
      const paramsNuevos: any[] = [];

      if (fechaDesde) {
        filtrosNuevos.push(`DATE(fecha) >= ?`);
        paramsNuevos.push(fechaDesde);
      }
      if (fechaHasta) {
        filtrosNuevos.push(`DATE(fecha) <= ?`);
        paramsNuevos.push(fechaHasta);
      }
      if (minCuposPendientes) {
        filtrosNuevos.push(`cuposPendientes >= ?`);
        paramsNuevos.push(parseInt(minCuposPendientes));
      }
      if (razonSocial) {
        filtrosNuevos.push(`razonSocial LIKE ?`);
        paramsNuevos.push(`%${razonSocial}%`);
      }

      const whereClauseNuevos = filtrosNuevos.length ? `WHERE ${filtrosNuevos.join(" AND ")}` : "";

      const queryNuevos = `
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
        ${whereClauseNuevos}
        ORDER BY fecha DESC, numero DESC
      `;
      const [rows] = (await db.query(queryNuevos, paramsNuevos)) as unknown as [RowDataPacket[]];
      rowsNuevos = rows || [];
    } catch (error) {
      // Si la tabla no existe, continuar con la tabla vieja
      console.log('Tabla viajes_nuevos no disponible, usando tabla legacy');
    }

    // Consultar tabla vieja
    const query = `
      SELECT
        e.ENT_IdEnt AS id,
        e.ENT_Numero AS numero,
        e.ENT_Fecha AS fecha,
        e.TER_RazonSocialTer AS razonSocial,
        e.LOC_NomLocalidadOrig AS origen,
        e.LOC_NomLocalidadDest AS destino,
        COALESCE(d.ART_DesArticulo, e.TVP_Caracteristicas) AS articulo,
        COALESCE(eq.EQU_DesEquipo, CAST(e.EQU_IDEquipo AS CHAR)) AS equipo,
        e.ENT_CantCupos AS cupos,
        e.ENT_CantCuposReser AS cuposReservados,
        e.ENT_CantCuposPend AS cuposPendientes,
        e.ENT_Tarifa AS tarifa,
        e.VEN_IdVendPostula AS vendedor
      FROM sige_ent_encnegtra e
      LEFT JOIN sige_dnt_detnegtra d ON e.ENT_IdEnt = d.ENT_IdEnt
      LEFT JOIN sige_equ_equipos eq ON e.EQU_IDEquipo = eq.EQU_IDEquipo
      LEFT JOIN sige_ven_vendedor v ON e.VEN_IdVendPostula = v.VEN_IdVendedor
      WHERE e.ENT_IdEnt > 0
      ${whereClauseViejos.replace('AND', 'AND')}
      ORDER BY e.ENT_Fecha DESC, e.ENT_Numero DESC
    `;
    const [rowsViejos] = (await db.query(query, paramsViejos)) as unknown as [RowDataPacket[]];

    // Combinar ambas tablas y ordenar por fecha
    const allRows = [...rowsNuevos, ...(rowsViejos || [])];
    const rows = allRows.sort((a, b) => {
      const dateA = new Date(a.fecha).getTime();
      const dateB = new Date(b.fecha).getTime();
      if (dateB - dateA !== 0) return dateB - dateA; // Fecha DESC
      return b.numero.localeCompare(a.numero); // Numero DESC
    });
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error al obtener viajes:", error);
    const expose = process.env.EXPOSE_ERRORS === "1";
    const body = expose
      ? { error: "Error al obtener los viajes", code: (error as any)?.code, message: (error as any)?.message }
      : { error: "Error al obtener los viajes" };
    return NextResponse.json(body, { status: 500 });
  }
}
    
