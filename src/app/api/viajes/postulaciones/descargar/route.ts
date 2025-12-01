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
 * Endpoint para descargar un PDF de postulación de chofer
 *
 * Query params:
 * - viajeId: ID del viaje
 * - choferId: ID del chofer
 * - ecpId: ID de la carta porte (opcional, si no se especifica se busca)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const viajeId = toInt(searchParams.get("viajeId"));
    const choferId = toInt(searchParams.get("choferId"));
    let ecpIdParam = toInt(searchParams.get("ecpId"));

    console.log("[DESCARGAR-PDF-POSTULACION] Request params:", { viajeId, choferId, ecpIdParam });

    if (!viajeId || !choferId) {
      return NextResponse.json(
        { error: "viajeId y choferId son obligatorios" },
        { status: 400 }
      );
    }

    const connection = await db.getConnection();
    try {
      // Si no viene ecpId, buscarlo
      let ecpId = ecpIdParam;
      if (!ecpId) {
        const [ecpRows]: any = await connection.query(
          `SELECT DISTINCT ecp.ECP_IdEcp
           FROM sige_ecp_enccarpor ecp
           INNER JOIN sige_icp_intcarpor icp ON ecp.ECP_IdEcp = icp.ECP_IdEcp
           WHERE ecp.ENT_IdEnt = ? AND icp.TER_IDTerceroTic = ? AND icp.TIC_IdTic = 9
           LIMIT 1`,
          [viajeId, choferId]
        );

        if (!Array.isArray(ecpRows) || ecpRows.length === 0) {
          return NextResponse.json(
            { error: "No se encontró la postulación" },
            { status: 404 }
          );
        }

        ecpId = ecpRows[0].ECP_IdEcp;
      }

      console.log("[DESCARGAR-PDF-POSTULACION] ECP ID:", ecpId);

      // Obtener datos del viaje (incluyendo ID del tercero para buscar CUIT y domicilio)
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

      // Obtener datos del chofer
      const [choferRows] = await connection.query<RowDataPacket[]>(
        `SELECT TER_RazonSocialTer, TER_CUITTer FROM sige_ter_tercero WHERE TER_IDTercero = ? LIMIT 1`,
        [choferId]
      );

      if (!Array.isArray(choferRows) || choferRows.length === 0) {
        return NextResponse.json(
          { error: "No se encontraron datos del chofer" },
          { status: 404 }
        );
      }

      const chofer = choferRows[0];
      const choferNombre = (chofer.TER_RazonSocialTer as string) || "Chofer";
      const choferCuit = (chofer.TER_CUITTer as string) || "";

      // Obtener patentes de la ECP
      const [ecpDataRows] = await connection.query<RowDataPacket[]>(
        `SELECT ECP_PatCamion, ECP_PatAcoplado FROM sige_ecp_enccarpor WHERE ECP_IdEcp = ? LIMIT 1`,
        [ecpId]
      );

      const patChasis = ecpDataRows?.[0]?.ECP_PatCamion
        ? String(ecpDataRows[0].ECP_PatCamion).toUpperCase()
        : "N/A";
      const patAcoplado = ecpDataRows?.[0]?.ECP_PatAcoplado
        ? String(ecpDataRows[0].ECP_PatAcoplado).toUpperCase()
        : null;

      // Obtener datos del transportista desde ICP
      const [transRows] = await connection.query<RowDataPacket[]>(
        `SELECT icp.TER_RazonSocialTerTic, icp.TER_CUITTerTic
         FROM sige_icp_intcarpor icp
         WHERE icp.ECP_IdEcp = ? AND icp.TIC_IdTic = 8
         LIMIT 1`,
        [ecpId]
      );

      const transportistaNombre =
        transRows?.[0]?.TER_RazonSocialTerTic
          ? String(transRows[0].TER_RazonSocialTerTic)
          : "";
      const transportistaCuit =
        transRows?.[0]?.TER_CUITTerTic
          ? String(transRows[0].TER_CUITTerTic)
          : "";

      // Obtener CUIT, domicilio y tipo de proveedor (mayorista o no)
      let proveedorCuit: string | null = null;
      let proveedorDomicilio: string | null = null;
      let esMayorista: boolean = false;

      const terceroId = viaje.terceroId;
      console.log("[DESCARGAR-PDF-POSTULACION] Tercero ID del viaje:", terceroId);

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
            console.log("[DESCARGAR-PDF-POSTULACION] Datos del proveedor obtenidos:", {
              cuit: proveedorCuit,
              domicilio: proveedorDomicilio,
              mayorista: esMayorista
            });
          } else {
            console.log("[DESCARGAR-PDF-POSTULACION] No se encontraron datos del proveedor con ID:", terceroId);
          }
        } catch (err) {
          console.error("[DESCARGAR-PDF-POSTULACION] Error al obtener datos del proveedor:", err);
        }
      } else {
        console.log("[DESCARGAR-PDF-POSTULACION] El viaje no tiene terceroId");
      }

      // Generar PDF
      const { generarPDFAutorizacionAsignacion } = await import(
        "@/lib/pdf-autorizacion"
      );

      const pdfBuffer = await generarPDFAutorizacionAsignacion({
        fecha: (viaje.fecha as any) || new Date().toISOString(),
        proveedor: (viaje.razonSocial as any) || "",
        proveedorCuit,
        proveedorDomicilio,
        procedencia: (viaje.origen as any) || "",
        destino: (viaje.destino as any) || "",
        tarifa: Number(viaje.tarifa ?? 0),
        transportista: transportistaNombre,
        transportistaCuit,
        chofer: choferNombre,
        choferCuit,
        patChasis,
        patAcoplado,
        mostrarIntermediario: esMayorista,
        intermediarioNombre: process.env.COMPANY_SHORTNAME || "LOGITRACK",
        intermediarioCuit: process.env.COMPANY_CUIT || undefined,
      });

      const nombrePDF = `Autorizacion_${choferNombre.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}_${(viaje.numero as any) || String(viajeId)}.pdf`;

      console.log("[DESCARGAR-PDF-POSTULACION] PDF generado:", nombrePDF);

      // Devolver PDF como descarga
      return new NextResponse(pdfBuffer, {
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
    console.error("[DESCARGAR-PDF-POSTULACION] Error al generar PDF:", error);
    return NextResponse.json(
      { error: error?.message || "Error al generar PDF" },
      { status: 500 }
    );
  }
}
