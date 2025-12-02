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
 * Endpoint para descargar un PDF de autorización (adelanto o combustible)
 *
 * Query params:
 * - ecpIdEcp: ID de la carta porte (ECP)
 * - renglon: Número de renglón de la autorización
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ecpIdEcp = toInt(searchParams.get("ecpIdEcp"));
    const renglon = toInt(searchParams.get("renglon"));

    console.log("[DESCARGAR-PDF] Request params:", { ecpIdEcp, renglon });

    if (!ecpIdEcp || !renglon) {
      return NextResponse.json(
        { error: "ecpIdEcp y renglon son obligatorios" },
        { status: 400 }
      );
    }

    const connection = await db.getConnection();
    try {
      // Obtener datos de la autorización
      const [autorizacionRows] = await connection.query<RowDataPacket[]>(
        `SELECT
          ocp.ART_IdArticulo AS articuloId,
          ocp.ART_DesArticulo AS articuloDesc,
          ocp.OCP_Importe AS importe,
          ocp.OCP_Cantidad AS cantidad,
          ocp.TER_RazonSocialTer AS estacionNombre,
          ocp.CHO_IdChofer AS choferId
         FROM SIGE_OCP_OrdCarPor ocp
         WHERE ocp.ECP_IdEcp = ? AND ocp.OCP_Renglon = ?
         LIMIT 1`,
        [ecpIdEcp, renglon]
      );

      if (!Array.isArray(autorizacionRows) || autorizacionRows.length === 0) {
        return NextResponse.json(
          { error: "No se encontró la autorización" },
          { status: 404 }
        );
      }

      const autorizacion = autorizacionRows[0];
      const esAdelanto =
        autorizacion.articuloId === "ADE" ||
        autorizacion.articuloDesc === "ADELANTO";
      const esCombustible =
        autorizacion.articuloId === "COMB" ||
        autorizacion.articuloDesc === "COMBUSTIBLE";

      if (!esAdelanto && !esCombustible) {
        return NextResponse.json(
          {
            error:
              "El registro no corresponde a una autorización de adelanto o combustible",
          },
          { status: 400 }
        );
      }

      // Obtener datos del viaje, chofer, transportista, etc.
      const [datosRows] = await connection.query<RowDataPacket[]>(
        `SELECT
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
         LIMIT 1`,
        [autorizacion.choferId, ecpIdEcp]
      );

      if (!Array.isArray(datosRows) || datosRows.length === 0) {
        return NextResponse.json(
          { error: "No se encontraron datos del viaje" },
          { status: 404 }
        );
      }

      const datos = datosRows[0];

      // Generar PDF
      const { generarPDFOrdenEntrega, generarNombrePDF } = await import(
        "@/lib/pdf-autorizacion"
      );

      const patentes = `${datos.patChasis || ""}${
        datos.patAcoplado ? " " + datos.patAcoplado : ""
      }`.trim();

      const numeroOrden = `0001-${String(ecpIdEcp).padStart(8, "0")}`;

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

      const nombrePDF = generarNombrePDF({
        numero: numeroOrden,
        fecha: datos.fecha,
        proveedor: autorizacion.estacionNombre,
        transportista: datos.transportista,
        transportistaCuit: datos.transportistaCuit,
        chofer: datos.chofer,
        choferCuit: datos.choferCuit,
        patente: patentes,
        tipo: esAdelanto ? "adelanto" : "combustible",
        cantidad: Number(
          esAdelanto ? autorizacion.importe : autorizacion.cantidad || 0
        ),
        importe: 0,
      });

      console.log("[DESCARGAR-PDF] PDF generado:", nombrePDF);

      // Devolver PDF como descarga
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${nombrePDF}"`,
        },
      });
    } catch (error: any) {
      // Si la columna CHO_IdChofer no existe, intentar sin ella
      if (error?.code === "ER_BAD_FIELD_ERROR") {
        console.log(
          "[DESCARGAR-PDF] Columna CHO_IdChofer no existe, reintentando sin ella"
        );

        // Obtener datos de la autorización sin CHO_IdChofer
        const [autorizacionRows] = await connection.query<RowDataPacket[]>(
          `SELECT
            ocp.ART_IdArticulo AS articuloId,
            ocp.ART_DesArticulo AS articuloDesc,
            ocp.OCP_Importe AS importe,
            ocp.OCP_Cantidad AS cantidad,
            ocp.TER_RazonSocialTer AS estacionNombre
           FROM SIGE_OCP_OrdCarPor ocp
           WHERE ocp.ECP_IdEcp = ? AND ocp.OCP_Renglon = ?
           LIMIT 1`,
          [ecpIdEcp, renglon]
        );

        if (!Array.isArray(autorizacionRows) || autorizacionRows.length === 0) {
          return NextResponse.json(
            { error: "No se encontró la autorización" },
            { status: 404 }
          );
        }

        const autorizacion = autorizacionRows[0];
        const esAdelanto =
          autorizacion.articuloId === "ADE" ||
          autorizacion.articuloDesc === "ADELANTO";
        const esCombustible =
          autorizacion.articuloId === "COMB" ||
          autorizacion.articuloDesc === "COMBUSTIBLE";

        if (!esAdelanto && !esCombustible) {
          return NextResponse.json(
            {
              error:
                "El registro no corresponde a una autorización de adelanto o combustible",
            },
            { status: 400 }
          );
        }

        // Obtener datos del viaje y del chofer desde sige_icp_intcarpor
        const [datosRows] = await connection.query<RowDataPacket[]>(
          `SELECT
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
           LIMIT 1`,
          [ecpIdEcp]
        );

        if (!Array.isArray(datosRows) || datosRows.length === 0) {
          return NextResponse.json(
            { error: "No se encontraron datos del viaje" },
            { status: 404 }
          );
        }

        const datos = datosRows[0];

        console.log("[DESCARGAR-PDF] Datos obtenidos para PDF:", {
          chofer: datos.chofer,
          choferCuit: datos.choferCuit,
          transportista: datos.transportista,
        });

        // Generar PDF
        const { generarPDFOrdenEntrega, generarNombrePDF } = await import(
          "@/lib/pdf-autorizacion"
        );

        const patentes = `${datos.patChasis || ""}${
          datos.patAcoplado ? " " + datos.patAcoplado : ""
        }`.trim();

        const numeroOrden = `0001-${String(ecpIdEcp).padStart(8, "0")}`;

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

        const nombrePDF = generarNombrePDF({
          numero: numeroOrden,
          fecha: datos.fecha,
          proveedor: autorizacion.estacionNombre,
          transportista: datos.transportista,
          transportistaCuit: datos.transportistaCuit,
          chofer: datos.chofer || "N/A",
          choferCuit: datos.choferCuit || "",
          patente: patentes,
          tipo: esAdelanto ? "adelanto" : "combustible",
          cantidad: Number(
            esAdelanto ? autorizacion.importe : autorizacion.cantidad || 0
          ),
          importe: 0,
        });

        console.log("[DESCARGAR-PDF] PDF generado (fallback):", nombrePDF);

        // Devolver PDF como descarga
        return new NextResponse(new Uint8Array(pdfBuffer), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${nombrePDF}"`,
          },
        });
      }

      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error("[DESCARGAR-PDF] Error al generar PDF:", error);
    return NextResponse.json(
      { error: error?.message || "Error al generar PDF" },
      { status: 500 }
    );
  }
}
