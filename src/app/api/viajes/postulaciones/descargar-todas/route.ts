import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function toInt(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isInteger(num) ? num : null;
}

/**
 * Endpoint para descargar todas las postulaciones de un viaje en un solo PDF
 *
 * Query params:
 * - viajeId: ID del viaje
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const viajeId = toInt(searchParams.get("viajeId"));

    console.log("[DESCARGAR-TODAS-POSTULACIONES] Request params:", { viajeId });

    if (!viajeId) {
      return NextResponse.json(
        { error: "viajeId es obligatorio" },
        { status: 400 }
      );
    }

    const connection = await db.getConnection();
    try {
      // Obtener datos del viaje
      const [viajeRows] = await connection.query<RowDataPacket[]>(
        `SELECT
          ent.ENT_Numero AS numero,
          ent.ENT_Fecha AS fecha,
          ent.LOC_NomLocalidadOrig AS origen,
          ent.LOC_NomLocalidadDest AS destino,
          ent.TER_RazonSocialTer AS razonSocial,
          ent.ENT_Tarifa AS tarifa,
          ent.TER_IdTercero AS terceroId
         FROM sige_ent_encnegtra ent
         WHERE ent.ENT_IdEnt = ?
         LIMIT 1`,
        [viajeId]
      );

      if (!Array.isArray(viajeRows) || viajeRows.length === 0) {
        return NextResponse.json(
          { error: "No se encontraron datos del viaje" },
          { status: 404 }
        );
      }

      const viaje = viajeRows[0];

      // Obtener CUIT, domicilio y tipo de proveedor
      let proveedorCuit: string | null = null;
      let proveedorDomicilio: string | null = null;
      let esMayorista: boolean = false;

      const terceroId = viaje.terceroId;
      if (terceroId) {
        try {
          const [provRows] = await connection.query<RowDataPacket[]>(
            `SELECT TER_CUITTer AS cuit, TER_DomicilioTer AS domicilio, TER_Mayorista AS mayorista
             FROM sige_ter_tercero
             WHERE TER_IDTercero = ?
             LIMIT 1`,
            [terceroId]
          );
          if (Array.isArray(provRows) && provRows.length > 0) {
            proveedorCuit = (provRows[0].cuit as any) || null;
            proveedorDomicilio = (provRows[0].domicilio as any) || null;
            esMayorista = provRows[0].mayorista === "S";
          }
        } catch (err) {
          console.error("[DESCARGAR-TODAS-POSTULACIONES] Error al obtener datos del proveedor:", err);
        }
      }

      // Obtener todas las ECPs del viaje
      const [ecpRows]: any = await connection.query(
        `SELECT ECP_IdEcp FROM sige_ecp_enccarpor WHERE ENT_IdEnt = ? ORDER BY ECP_IdEcp`,
        [viajeId]
      );

      if (!Array.isArray(ecpRows) || ecpRows.length === 0) {
        return NextResponse.json(
          { error: "No se encontraron postulaciones para este viaje" },
          { status: 404 }
        );
      }

      const ecpIds: number[] = ecpRows
        .map((r: any) => Number(r.ECP_IdEcp))
        .filter((n: number) => Number.isInteger(n));

      console.log("[DESCARGAR-TODAS-POSTULACIONES] ECPs encontradas:", ecpIds);

      // Obtener todas las postulaciones (choferes) de todas las ECPs
      const placeholders = ecpIds.map(() => "?").join(", ");
      const [postulacionesRows] = await connection.query<RowDataPacket[]>(
        `SELECT DISTINCT
          icp.ECP_IdEcp,
          icp.TER_IDTerceroTic AS choferId,
          icp.TER_RazonSocialTerTic AS choferNombre,
          icp.TER_CUITTerTic AS choferCuit
         FROM sige_icp_intcarpor icp
         WHERE icp.ECP_IdEcp IN (${placeholders}) AND icp.TIC_IdTic = 9
         ORDER BY icp.ECP_IdEcp`,
        ecpIds
      );

      if (!Array.isArray(postulacionesRows) || postulacionesRows.length === 0) {
        return NextResponse.json(
          { error: "No hay choferes postulados para este viaje" },
          { status: 404 }
        );
      }

      console.log("[DESCARGAR-TODAS-POSTULACIONES] Postulaciones encontradas:", postulacionesRows.length);

      // Recopilar datos de cada asignación
      const asignaciones = [];

      for (const postulacion of postulacionesRows) {
        const ecpId = postulacion.ECP_IdEcp;

        // Obtener patentes
        const [ecpDataRows] = await connection.query<RowDataPacket[]>(
          `SELECT ECP_PatCamion, ECP_PatAcoplado FROM sige_ecp_enccarpor WHERE ECP_IdEcp = ? LIMIT 1`,
          [ecpId]
        );

        const patChasis = ecpDataRows?.[0]?.ECP_PatCamion
          ? String(ecpDataRows[0].ECP_PatCamion).toUpperCase()
          : null;
        const patAcoplado = ecpDataRows?.[0]?.ECP_PatAcoplado
          ? String(ecpDataRows[0].ECP_PatAcoplado).toUpperCase()
          : null;

        // Obtener datos del transportista
        const [transRows] = await connection.query<RowDataPacket[]>(
          `SELECT icp.TER_RazonSocialTerTic, icp.TER_CUITTerTic
           FROM sige_icp_intcarpor icp
           WHERE icp.ECP_IdEcp = ? AND icp.TIC_IdTic = 8
           LIMIT 1`,
          [ecpId]
        );

        const transportistaNombre = transRows?.[0]?.TER_RazonSocialTerTic
          ? String(transRows[0].TER_RazonSocialTerTic)
          : null;
        const transportistaCuit = transRows?.[0]?.TER_CUITTerTic
          ? String(transRows[0].TER_CUITTerTic)
          : null;

        asignaciones.push({
          chofer: postulacion.choferNombre || "N/A",
          choferCuit: postulacion.choferCuit || "",
          transportista: transportistaNombre,
          transportistaCuit: transportistaCuit,
          patChasis: patChasis,
          patAcoplado: patAcoplado,
          procedencia: (viaje.origen as any) || "",
          destino: (viaje.destino as any) || "",
          tarifa: Number(viaje.tarifa ?? 0),
        });
      }

      console.log("[DESCARGAR-TODAS-POSTULACIONES] Asignaciones preparadas:", asignaciones.length);

      // Generar PDF con múltiples asignaciones
      const { generarPDFAsignacionesMultiples } = await import("@/lib/pdf-autorizacion");

      const pdfBuffer = await generarPDFAsignacionesMultiples({
        fecha: (viaje.fecha as any) || new Date().toISOString(),
        proveedor: (viaje.razonSocial as any) || "",
        proveedorCuit,
        proveedorDomicilio,
        mostrarIntermediario: esMayorista,
        asignaciones: asignaciones,
      });

      const nombrePDF = `Asignaciones_Viaje_${(viaje.numero as any) || String(viajeId)}.pdf`;

      console.log("[DESCARGAR-TODAS-POSTULACIONES] PDF generado:", nombrePDF);

      // Devolver PDF como descarga
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${nombrePDF}"`,
        },
      });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error("[DESCARGAR-TODAS-POSTULACIONES] Error al generar PDF:", error);
    return NextResponse.json(
      { error: error?.message || "Error al generar PDF" },
      { status: 500 }
    );
  }
}
