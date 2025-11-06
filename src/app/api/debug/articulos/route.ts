import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const viajeId = searchParams.get("viajeId") || "677";

    const connection = await db.getConnection();

    // Buscar el ECP_IdEcp correspondiente al viaje
    const [ecpRows]: any = await connection.query(`
      SELECT ECP_IdEcp FROM sige_ecp_enccarpor WHERE ENT_IdEnt = ? LIMIT 1
    `, [viajeId]);

    const ecpIdEcp = ecpRows?.[0]?.ECP_IdEcp;

    // Artículos en DCP (Detalle de Carta de Porte)
    const [dcpRows]: any = await connection.query(`
      SELECT
        ecp_idecp,
        dcp_renglondcp,
        art_idarticulo,
        art_desarticulo,
        dcp_cosecha
      FROM SIGE_DCP_DetCarPor
      WHERE ecp_idecp = ?
    `, [ecpIdEcp]);

    // Artículos en DNT (Detalle de Negociación)
    let dntRows: any[] = [];
    try {
      const [rows]: any = await connection.query(`
        SELECT *
        FROM sige_dnt_detnegtra
        WHERE ENT_IdEnt = ?
      `, [viajeId]);
      dntRows = rows;
    } catch (dntError: any) {
      console.error('Error consultando DNT:', dntError);
    }

    // Ver ENT y ECP para comparar
    const [entRows]: any = await connection.query(`
      SELECT
        ENT_IdEnt,
        ENT_Numero,
        TVP_Caracteristicas AS ENT_TVP_Caracteristicas
      FROM sige_ent_encnegtra
      WHERE ENT_IdEnt = ?
    `, [viajeId]);

    const [ecpRowsDetail]: any = await connection.query(`
      SELECT
        ECP_IdEcp,
        TVP_Caracteristicas AS ECP_TVP_Caracteristicas,
        ENT_IdEnt
      FROM sige_ecp_enccarpor
      WHERE ENT_IdEnt = ?
    `, [viajeId]);

    connection.release();

    return NextResponse.json({
      viajeId,
      ecpIdEcp,
      ENT: entRows[0] || null,
      ECP: ecpRowsDetail[0] || null,
      DCP_Articulos: dcpRows,
      DNT_Articulos: dntRows,
      resumen: {
        mensaje: "El artículo se guarda en DCP y DNT",
        DCP_tiene_articulo: dcpRows.length > 0,
        DNT_tiene_articulo: dntRows.length > 0,
        ENT_TVP_Caracteristicas: entRows[0]?.ENT_TVP_Caracteristicas || "(vacío)",
        ECP_TVP_Caracteristicas: ecpRowsDetail[0]?.ECP_TVP_Caracteristicas || "(vacío)"
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
