import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { db } from "@/lib/db";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function toInt(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isInteger(num) ? num : null;
}

/**
 * Endpoint para descargar todas las autorizaciones (adelantos y combustibles) de un viaje en un solo PDF
 *
 * Query params:
 * - viajeId: ID del viaje (ENT_IdEnt)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const viajeId = toInt(searchParams.get("viajeId"));

    console.log("[DESCARGAR-TODAS] Request params:", { viajeId });

    if (!viajeId) {
      return NextResponse.json(
        { error: "viajeId es obligatorio" },
        { status: 400 }
      );
    }

    const connection = await db.getConnection();
    try {
      // Obtener todas las ECPs del viaje
      const [ecpRows] = await connection.query<RowDataPacket[]>(
        `SELECT ECP_IdEcp FROM sige_ecp_enccarpor WHERE ENT_IdEnt = ? ORDER BY ECP_IdEcp`,
        [viajeId]
      );

      if (!Array.isArray(ecpRows) || ecpRows.length === 0) {
        return NextResponse.json(
          { error: "No se encontraron cartas porte para este viaje" },
          { status: 404 }
        );
      }

      const ecpIds = ecpRows.map((r) => r.ECP_IdEcp);
      console.log("[DESCARGAR-TODAS] ECPs encontradas:", ecpIds);

      // Obtener todas las autorizaciones (adelantos y combustibles)
      const placeholders = ecpIds.map(() => "?").join(", ");
      let autorizacionesQuery = `
        SELECT
          ocp.ECP_IdEcp AS ecpIdEcp,
          ocp.OCP_Renglon AS renglon,
          ocp.ART_IdArticulo AS articuloId,
          ocp.ART_DesArticulo AS articuloDesc,
          ocp.OCP_Importe AS importe,
          ocp.OCP_Cantidad AS cantidad,
          ocp.TER_RazonSocialTer AS estacionNombre,
          ocp.CHO_IdChofer AS choferId
        FROM SIGE_OCP_OrdCarPor ocp
        WHERE ocp.ECP_IdEcp IN (${placeholders})
          AND (
            ocp.ART_IdArticulo IN ('ADE', 'COMB')
            OR ocp.ART_DesArticulo IN ('ADELANTO', 'COMBUSTIBLE')
          )
        ORDER BY ocp.ECP_IdEcp, ocp.OCP_Renglon
      `;

      let autorizacionRows: RowDataPacket[];
      try {
        const [rows] = await connection.query<RowDataPacket[]>(
          autorizacionesQuery,
          ecpIds
        );
        autorizacionRows = rows;
      } catch (error: any) {
        // Si la columna CHO_IdChofer no existe, intentar sin ella
        if (error?.code === "ER_BAD_FIELD_ERROR") {
          console.log(
            "[DESCARGAR-TODAS] Columna CHO_IdChofer no existe, reintentando sin ella"
          );
          autorizacionesQuery = `
            SELECT
              ocp.ECP_IdEcp AS ecpIdEcp,
              ocp.OCP_Renglon AS renglon,
              ocp.ART_IdArticulo AS articuloId,
              ocp.ART_DesArticulo AS articuloDesc,
              ocp.OCP_Importe AS importe,
              ocp.OCP_Cantidad AS cantidad,
              ocp.TER_RazonSocialTer AS estacionNombre
            FROM SIGE_OCP_OrdCarPor ocp
            WHERE ocp.ECP_IdEcp IN (${placeholders})
              AND (
                ocp.ART_IdArticulo IN ('ADE', 'COMB')
                OR ocp.ART_DesArticulo IN ('ADELANTO', 'COMBUSTIBLE')
              )
            ORDER BY ocp.ECP_IdEcp, ocp.OCP_Renglon
          `;
          const [rows] = await connection.query<RowDataPacket[]>(
            autorizacionesQuery,
            ecpIds
          );
          autorizacionRows = rows;
        } else {
          throw error;
        }
      }

      if (!Array.isArray(autorizacionRows) || autorizacionRows.length === 0) {
        return NextResponse.json(
          { error: "No se encontraron autorizaciones para este viaje" },
          { status: 404 }
        );
      }

      console.log(
        `[DESCARGAR-TODAS] Se encontraron ${autorizacionRows.length} autorizaciones`
      );

      // Generar un PDF por cada autorización
      const { generarPDFOrdenEntrega } = await import("@/lib/pdf-autorizacion");
      const pdfBuffers: Buffer[] = [];

      for (const autorizacion of autorizacionRows) {
        const esAdelanto =
          autorizacion.articuloId === "ADE" ||
          autorizacion.articuloDesc === "ADELANTO";
        const esCombustible =
          autorizacion.articuloId === "COMB" ||
          autorizacion.articuloDesc === "COMBUSTIBLE";

        if (!esAdelanto && !esCombustible) {
          console.log(
            "[DESCARGAR-TODAS] Saltando autorización no válida:",
            autorizacion
          );
          continue;
        }

        // Obtener datos del viaje, chofer y transportista para esta autorización
        let datosQuery: string;
        let datosParams: any[];

        // Intentar primero con CHO_IdChofer si existe
        if (autorizacion.choferId !== undefined) {
          datosQuery = `
            SELECT
              e.ENT_Numero AS viajeNumero,
              e.ENT_Fecha AS fecha,
              e.TER_RazonSocialTer AS proveedor,
              t.TER_RazonSocialTer AS transportista,
              t.TER_CUITTer AS transportistaCuit,
              c.TER_RazonSocialTer AS chofer,
              c.TER_CUITTer AS choferCuit,
              ecp.ECP_PatCamion AS patChasis,
              ecp.ECP_PatAcoplado AS patAcoplado
            FROM sige_ecp_enccarpor ecp
            INNER JOIN sige_ent_encnegtra e ON e.ENT_IdEnt = ecp.ENT_IdEnt
            LEFT JOIN sige_ter_tercero c ON c.TER_IDTercero = ?
            LEFT JOIN sige_icp_intcarpor icp ON icp.ECP_IdEcp = ecp.ECP_IdEcp AND icp.TIC_IdTic = 8
            LEFT JOIN sige_ter_tercero t ON t.TER_IDTercero = icp.TER_IDTerceroTic
            WHERE ecp.ECP_IdEcp = ?
            LIMIT 1
          `;
          datosParams = [autorizacion.choferId, autorizacion.ecpIdEcp];
        } else {
          // Fallback: obtener chofer desde sige_icp_intcarpor
          datosQuery = `
            SELECT
              e.ENT_Numero AS viajeNumero,
              e.ENT_Fecha AS fecha,
              e.TER_RazonSocialTer AS proveedor,
              t.TER_RazonSocialTer AS transportista,
              t.TER_CUITTer AS transportistaCuit,
              chofer.TER_RazonSocialTer AS chofer,
              chofer.TER_CUITTer AS choferCuit,
              ecp.ECP_PatCamion AS patChasis,
              ecp.ECP_PatAcoplado AS patAcoplado
            FROM sige_ecp_enccarpor ecp
            INNER JOIN sige_ent_encnegtra e ON e.ENT_IdEnt = ecp.ENT_IdEnt
            LEFT JOIN sige_icp_intcarpor icp_trans ON icp_trans.ECP_IdEcp = ecp.ECP_IdEcp AND icp_trans.TIC_IdTic = 8
            LEFT JOIN sige_ter_tercero t ON t.TER_IDTercero = icp_trans.TER_IDTerceroTic
            LEFT JOIN sige_icp_intcarpor icp_chofer ON icp_chofer.ECP_IdEcp = ecp.ECP_IdEcp AND icp_chofer.TIC_IdTic = 9
            LEFT JOIN sige_ter_tercero chofer ON chofer.TER_IDTercero = icp_chofer.TER_IDTerceroTic
            WHERE ecp.ECP_IdEcp = ?
            LIMIT 1
          `;
          datosParams = [autorizacion.ecpIdEcp];
        }

        const [datosRows] = await connection.query<RowDataPacket[]>(
          datosQuery,
          datosParams
        );

        if (!Array.isArray(datosRows) || datosRows.length === 0) {
          console.warn(
            "[DESCARGAR-TODAS] No se encontraron datos para autorización:",
            autorizacion
          );
          continue;
        }

        const datos = datosRows[0];

        const patentes = `${datos.patChasis || ""}${
          datos.patAcoplado ? " " + datos.patAcoplado : ""
        }`.trim();

        const numeroOrden = `0001-${String(autorizacion.ecpIdEcp).padStart(
          8,
          "0"
        )}`;

        const pdfBuffer = await generarPDFOrdenEntrega({
          numero: numeroOrden,
          fecha: datos.fecha || new Date().toISOString(),
          proveedor: autorizacion.estacionNombre || "N/A",
          transportista: datos.transportista || "N/A",
          transportistaCuit: datos.transportistaCuit || "",
          chofer: datos.chofer || "N/A",
          choferCuit: datos.choferCuit || "",
          patente: patentes || "N/A",
          tipo: esAdelanto ? "adelanto" : "combustible",
          cantidad: Number(
            esAdelanto ? autorizacion.importe : autorizacion.cantidad || 0
          ),
          importe: 0,
        });

        pdfBuffers.push(pdfBuffer);
      }

      if (pdfBuffers.length === 0) {
        return NextResponse.json(
          { error: "No se pudieron generar PDFs para las autorizaciones" },
          { status: 500 }
        );
      }

      // Combinar todos los PDFs en uno solo
      const mergedPdf = await PDFDocument.create();

      for (const pdfBuffer of pdfBuffers) {
        const pdf = await PDFDocument.load(pdfBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });
      }

      const mergedPdfBytes = await mergedPdf.save();
      const mergedPdfBuffer = Buffer.from(mergedPdfBytes);

      console.log(
        `[DESCARGAR-TODAS] PDF combinado generado con ${pdfBuffers.length} autorizaciones`
      );

      // Generar nombre del archivo
      const fecha = new Date().toISOString().split("T")[0];
      const nombrePDF = `Autorizaciones_Viaje_${viajeId}_${fecha}.pdf`;

      // Devolver PDF como descarga
      return new NextResponse(mergedPdfBuffer, {
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
    console.error("[DESCARGAR-TODAS] Error al generar PDF:", error);
    return NextResponse.json(
      { error: error?.message || "Error al generar PDF" },
      { status: 500 }
    );
  }
}
