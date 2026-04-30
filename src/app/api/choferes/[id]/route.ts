import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { fixEncodingObject } from "@/lib/encoding";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const choferId = Number(id);
  if (!Number.isInteger(choferId) || choferId <= 0) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  // Chofer + transportista + patentes (el chofer viene de sige_tvp_terveipat como TER_IdTerceroAsoc)
  const [relRows] = (await db.query(
    `SELECT
       ch.TER_IDTercero        AS id,
       ch.TER_RazonSocialTer   AS nombre,
       ch.TER_CUITTer          AS cuit,
       ch.TER_TelefonoTer      AS telefono,
       ch.TER_DomicilioTer     AS direccion,
       tr.TER_IDTercero        AS transportista_id,
       tr.TER_RazonSocialTer   AS transportista_nombre,
       tr.TER_CUITTer          AS transportista_cuit,
       tr.TER_TelefonoTer      AS transportista_telefono,
       tr.TER_DomicilioTer     AS transportista_direccion,
       tvp.tvp_patente         AS patChasis,
       tvp.TVP_PatenteAcoplado AS patAcoplado
     FROM sige_tvp_terveipat tvp
     JOIN sige_ter_tercero ch ON ch.TER_IDTercero = tvp.TER_IdTerceroAsoc
     JOIN sige_ter_tercero tr ON tr.TER_IDTercero = tvp.ter_idtercero
     WHERE ch.TER_IDTercero = ?
     ORDER BY tvp.ter_idtercero DESC
     LIMIT 1`,
    [choferId]
  )) as unknown as [RowDataPacket[]];

  if (!Array.isArray(relRows) || relRows.length === 0) {
    return NextResponse.json({ error: "Chofer no encontrado" }, { status: 404 });
  }

  const r: any = relRows[0];

  // Viajes donde está postulado
  const [viajeRows] = (await db.query(
    `SELECT DISTINCT
       e.ENT_IdEnt              AS id,
       e.ENT_Numero             AS numero,
       e.ENT_Fecha              AS fecha,
       e.TER_RazonSocialTer     AS razonSocial,
       e.LOC_NomLocalidadOrig   AS origen,
       e.LOC_NomLocalidadDest   AS destino,
       COALESCE(dnt.art_desarticulo, e.TVP_Caracteristicas, '') AS articulo,
       e.ENT_CantCupos          AS cupos
     FROM sige_icp_intcarpor icp
     INNER JOIN sige_ecp_enccarpor ecp ON ecp.ECP_IdEcp = icp.ECP_IdEcp
     INNER JOIN sige_ent_encnegtra e ON e.ENT_IdEnt = ecp.ENT_IdEnt
     LEFT JOIN sige_dnt_detnegtra dnt ON e.ENT_IdEnt = dnt.ent_ident AND dnt.dnt_renglondcp = 1
     WHERE icp.TER_IDTerceroTic = ? AND icp.TIC_IdTic = 9
     ORDER BY e.ENT_Fecha DESC`,
    [choferId]
  )) as unknown as [RowDataPacket[]];

  const viajes = Array.isArray(viajeRows)
    ? viajeRows.map((v: any) => fixEncodingObject(v))
    : [];

  const fixed = fixEncodingObject(r);

  return NextResponse.json({
    id: fixed.id,
    nombre: fixed.nombre,
    cuit: fixed.cuit || null,
    telefono: fixed.telefono || null,
    direccion: fixed.direccion || null,
    transportista: {
      id: fixed.transportista_id,
      nombre: fixed.transportista_nombre,
      cuit: fixed.transportista_cuit || null,
      telefono: fixed.transportista_telefono || null,
      direccion: fixed.transportista_direccion || null,
    },
    patChasis: fixed.patChasis || null,
    patAcoplado: fixed.patAcoplado || null,
    viajes,
  });
}
