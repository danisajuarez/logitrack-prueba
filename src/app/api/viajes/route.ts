import { db } from "../../../../src/lib/db";

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fechaDesde = searchParams.get("fechaDesde");
  const fechaHasta = searchParams.get("fechaHasta");
  const idVendedor = searchParams.get("idVendedor");
  const minPendientes = searchParams.get("minPendientes");

  let condiciones = [`e.TER_IdTercero > 0`];

  if (fechaDesde) condiciones.push(`e.ENT_Fecha >= '${fechaDesde}'`);
  if (fechaHasta) condiciones.push(`e.ENT_Fecha <= '${fechaHasta}'`);
  if (minPendientes) condiciones.push(`e.ENT_CantCuposPend > ${minPendientes}`);
  if (idVendedor) condiciones.push(`e.VEN_IdVendPostula = ${idVendedor}`);

  const whereClause = condiciones.length
    ? `WHERE ${condiciones.join(" AND ")}`
    : "";

  try {
    const [rows] = await db.query(`
      SELECT 
        e.ENT_IdEnt AS id,
        e.ENT_Numero AS numero,
        e.ENT_Fecha AS fecha,
        e.TER_RazonSocialTer AS razonSocial,
        e.LOC_NomLocalidadOrig AS origen,
        e.LOC_NomLocalidadDest AS destino,
        e.ENT_Tarifa AS tarifa,
        e.ENT_CantCupos AS cupos,
        e.ENT_CantCuposReser AS cuposReservados,
        e.ENT_CantCuposPend AS cuposPendientes,
        u.USU_DatosUsu AS usuario,
        eq.EQU_DesEquipo AS equipo,
        v.VEN_NomVen AS vendedor,
        d.ART_DesArticulo AS articulo
      FROM sige_ent_encnegtra e
      INNER JOIN sige_dnt_detnegtra d ON e.ENT_IdEnt = d.ENT_IdEnt
      INNER JOIN sige_usu_usuario u ON e.USU_IdUsuario = u.USU_IdUsuario
      INNER JOIN sige_equ_equipos eq ON e.EQU_IDEquipo = eq.EQU_IDEquipo
      LEFT JOIN sige_ven_vendedor v ON e.VEN_IdVendPostula = v.VEN_IdVendedor
      ${whereClause}
      ORDER BY e.ENT_Fecha DESC, e.ENT_IdEnt DESC
    `);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error en la consulta de viajes:", error);
    return NextResponse.json(
      { error: "Error en la consulta" },
      { status: 500 }
    );
  }
}
