import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { db } from "@/lib/db";
import { fixEncodingObject } from "@/lib/encoding";
export const runtime = "nodejs"; // fuerza Node (no Edge)
export const dynamic = "force-dynamic"; // evita que Next intente prerender
export const revalidate = 0; // sin cache estática para API

function toInt(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isInteger(num) ? num : null;
}

function toDecimal(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

interface AutorizacionRequest {
  viajeId: number;
  ecpId?: number; // ID específico de la ECP (opcional para backward compatibility)
  choferId: number;
  estacionId: number;
  patChasis?: string | null;
  patAcoplado?: string | null;
  adelantos?: Array<{ importe: number }>;
  combustibles?: Array<{ litros: number; precioUnitario?: number }>;
}

// Artículos según sistema
const ARTICULO_COMBUSTIBLE_ID = "COMB";
const ARTICULO_COMBUSTIBLE_DESC = "COMBUSTIBLE";
const ARTICULO_ADELANTO_ID = "ADE";
const ARTICULO_ADELANTO_DESC = "ADELANTO";

export async function POST(request: NextRequest) {
  try {
    const body: AutorizacionRequest = await request.json();
    console.log("[DEBUG API] Request body recibido:", body);

    const viajeId = toInt(body?.viajeId);
    const ecpIdFromRequest = toInt(body?.ecpId); // ECP específico desde el frontend
    const choferId = toInt(body?.choferId);
    const estacionId = toInt(body?.estacionId);

    console.log("[DEBUG API] Parámetros parseados:", {
      viajeId,
      ecpIdFromRequest,
      choferId,
      estacionId,
    });

    if (!viajeId || !choferId || !estacionId) {
      return NextResponse.json(
        { error: "viajeId, choferId y estacionId son obligatorios" },
        { status: 400 }
      );
    }

    const { adelantos, combustibles } = body;

    // Validar que al menos haya un array con elementos
    const hasAdelantos = Array.isArray(adelantos) && adelantos.length > 0;
    const hasCombustibles =
      Array.isArray(combustibles) && combustibles.length > 0;

    if (!hasAdelantos && !hasCombustibles) {
      return NextResponse.json(
        { error: "Debe especificar al menos un adelanto o un combustible" },
        { status: 400 }
      );
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Si viene ecpId en el request, usarlo directamente; sino buscarlo
      let ecpIdEcpValid: number;

      if (ecpIdFromRequest) {
        // Usar el ECP específico que vino del frontend
        ecpIdEcpValid = ecpIdFromRequest;
        console.log(
          "[DEBUG] Usando ECP específico del frontend:",
          ecpIdEcpValid
        );
      } else {
        // Fallback: buscar la ECP del chofer (para backward compatibility)
        const [ecpDelChoferRows]: any = await connection.query(
          `SELECT DISTINCT ecp.ECP_IdEcp
         FROM sige_ecp_enccarpor ecp
         INNER JOIN sige_icp_intcarpor icp ON ecp.ECP_IdEcp = icp.ECP_IdEcp
         WHERE ecp.ENT_IdEnt = ?
           AND icp.TER_IDTerceroTic = ?
           AND icp.TIC_IdTic = 9
         LIMIT 1`,
          [viajeId, choferId]
        );

        if (!Array.isArray(ecpDelChoferRows) || ecpDelChoferRows.length === 0) {
          await connection.rollback();
          return NextResponse.json(
            {
              error:
                "No se encontró la carta porte para este chofer en este viaje",
            },
            { status: 404 }
          );
        }

        ecpIdEcpValid = ecpDelChoferRows[0].ECP_IdEcp;
        console.log("[DEBUG] ECP encontrada mediante búsqueda:", ecpIdEcpValid);
      }

      console.log("[DEBUG] ECP final a usar:", {
        viajeId,
        choferId,
        ecpIdEcp: ecpIdEcpValid,
      });

      console.log("[DEBUG] ChoferId que se usará para el PDF:", choferId);

      // Traer estación válida (tipo=2, categoría=9)
      const [estacionRows] = await connection.query<RowDataPacket[]>(
        `SELECT TER_IDTercero, TER_RazonSocialTer
         FROM sige_ter_tercero
         WHERE TER_IDTercero = ?
           AND TTE_IDTipoTercero = 2
           AND CCT_IDCCT = 9
         LIMIT 1`,
        [estacionId]
      );
      if (!Array.isArray(estacionRows) || estacionRows.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: "La estación de servicio no existe o no es válida" },
          { status: 404 }
        );
      }
      const estacionRazonSocial = estacionRows[0].TER_RazonSocialTer;

      // Usar la ECP específica del chofer que encontramos arriba
      const ecpIdEcp = ecpIdEcpValid;

      // Actualizar patentes en sige_ecp_enccarpor si vienen en el request
      const { patChasis, patAcoplado } = body;
      if (patChasis || patAcoplado) {
        try {
          const updates: string[] = [];
          const params: any[] = [];

          if (patChasis) {
            updates.push("ECP_PatCamion = ?");
            params.push(patChasis.toUpperCase());
          }
          if (patAcoplado) {
            updates.push("ECP_PatAcoplado = ?");
            params.push(patAcoplado.toUpperCase());
          }

          if (updates.length > 0) {
            params.push(ecpIdEcp);
            await connection.execute(
              `UPDATE sige_ecp_enccarpor SET ${updates.join(
                ", "
              )} WHERE ECP_IdEcp = ?`,
              params
            );
            console.log("[DEBUG] Patentes actualizadas en carta porte:", {
              patChasis,
              patAcoplado,
              ecpIdEcp,
            });
          }
        } catch (patError) {
          console.error("[DEBUG] Error al actualizar patentes:", patError);
          // No fallar la transacción por esto, solo loguear
        }
      }

      // Próximo renglón
      const getNextRenglon = async (ecpId: number): Promise<number> => {
        const [rows] = await connection.query<RowDataPacket[]>(
          `SELECT COALESCE(MAX(OCP_Renglon), 0) + 1 AS nextRenglon
           FROM SIGE_OCP_OrdCarPor
           WHERE ECP_IdEcp = ?`,
          [ecpId]
        );
        return rows[0]?.nextRenglon || 1;
      };

      const adelantosIds: number[] = [];
      const combustiblesIds: number[] = [];

      // ADELANTOS (múltiples)
      if (hasAdelantos) {
        console.log("[DEBUG API] Procesando adelantos:", adelantos);
        for (const adelanto of adelantos) {
          const importe = toDecimal(adelanto.importe);
          if (!importe) {
            await connection.rollback();
            return NextResponse.json(
              {
                error:
                  "Todos los importes de adelanto deben ser números válidos mayores a 0",
              },
              { status: 400 }
            );
          }

          const renglon = await getNextRenglon(ecpIdEcp);
          console.log(
            "[DEBUG API] Insertando adelanto en renglón:",
            renglon,
            "para chofer:",
            choferId
          );

          // Intentar insertar con CHO_IdChofer si la columna existe
          try {
            const [result] = await connection.query(
              `INSERT INTO SIGE_OCP_OrdCarPor
               (ECP_IdEcp, OCP_Renglon, TER_IdTercero, TER_RazonSocialTer,
                ART_IdArticulo, ART_DesArticulo, OCP_Importe,
                OCP_Cantidad, OCP_CantPend, OCP_CantReal, OCP_CantRealPend,
                EFO_IdEfcFac, EFO_IdEfcRp, CHO_IdChofer)
               VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 0, 0, 0, 0, ?)`,
              [
                ecpIdEcp,
                renglon,
                estacionId,
                estacionRazonSocial,
                ARTICULO_ADELANTO_ID,
                ARTICULO_ADELANTO_DESC,
                importe,
                importe, // OCP_CantPend = importe para adelantos
                choferId, // Guardar el ID del chofer
              ]
            );
            console.log(
              "[DEBUG API] Adelanto insertado correctamente con choferId"
            );
            adelantosIds.push(renglon);
          } catch (e: any) {
            // Si la columna CHO_IdChofer no existe, insertar sin ella
            if (e?.code === "ER_BAD_FIELD_ERROR") {
              console.log(
                "[DEBUG API] Columna CHO_IdChofer no existe, insertando sin ella"
              );
              const [result] = await connection.query(
                `INSERT INTO SIGE_OCP_OrdCarPor
                 (ECP_IdEcp, OCP_Renglon, TER_IdTercero, TER_RazonSocialTer,
                  ART_IdArticulo, ART_DesArticulo, OCP_Importe,
                  OCP_Cantidad, OCP_CantPend, OCP_CantReal, OCP_CantRealPend,
                  EFO_IdEfcFac, EFO_IdEfcRp)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 0, 0, 0, 0)`,
                [
                  ecpIdEcp,
                  renglon,
                  estacionId,
                  estacionRazonSocial,
                  ARTICULO_ADELANTO_ID,
                  ARTICULO_ADELANTO_DESC,
                  importe,
                  importe, // OCP_CantPend = importe para adelantos
                ]
              );
              console.log(
                "[DEBUG API] Adelanto insertado sin choferId (columna no existe)"
              );
              adelantosIds.push(renglon);
            } else {
              throw e;
            }
          }
        }
      }

      // COMBUSTIBLES (múltiples)
      if (hasCombustibles) {
        console.log("[DEBUG API] Procesando combustibles:", combustibles);
        for (const combustible of combustibles) {
          const litros = toDecimal(combustible.litros);
          if (!litros) {
            await connection.rollback();
            return NextResponse.json(
              {
                error:
                  "Todos los litros de combustible deben ser números válidos mayores a 0",
              },
              { status: 400 }
            );
          }

          // Calcular importe: litros * precio unitario (si viene, sino 0)
          const precioUnitario = toDecimal(combustible.precioUnitario) ?? 0;
          const importe = litros * precioUnitario;

          const renglon = await getNextRenglon(ecpIdEcp);
          console.log(
            "[DEBUG API] Insertando combustible en renglón:",
            renglon,
            { litros, precioUnitario, importe, choferId }
          );

          // Intentar insertar con CHO_IdChofer si la columna existe
          try {
            await connection.query(
              `INSERT INTO SIGE_OCP_OrdCarPor
               (ECP_IdEcp, OCP_Renglon, TER_IdTercero, TER_RazonSocialTer,
                ART_IdArticulo, ART_DesArticulo, OCP_Importe,
                OCP_Cantidad, OCP_CantPend, OCP_CantReal, OCP_CantRealPend,
                EFO_IdEfcFac, EFO_IdEfcRp, CHO_IdChofer)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?)`,
              [
                ecpIdEcp,
                renglon,
                estacionId,
                estacionRazonSocial,
                ARTICULO_COMBUSTIBLE_ID,
                ARTICULO_COMBUSTIBLE_DESC,
                importe,
                litros,
                litros,
                choferId, // Guardar el ID del chofer
              ]
            );
            console.log(
              "[DEBUG API] Combustible insertado correctamente con choferId"
            );
            combustiblesIds.push(renglon);
          } catch (e: any) {
            // Si la columna CHO_IdChofer no existe, insertar sin ella
            if (e?.code === "ER_BAD_FIELD_ERROR") {
              console.log(
                "[DEBUG API] Columna CHO_IdChofer no existe, insertando sin ella"
              );
              await connection.query(
                `INSERT INTO SIGE_OCP_OrdCarPor
                 (ECP_IdEcp, OCP_Renglon, TER_IdTercero, TER_RazonSocialTer,
                  ART_IdArticulo, ART_DesArticulo, OCP_Importe,
                  OCP_Cantidad, OCP_CantPend, OCP_CantReal, OCP_CantRealPend,
                  EFO_IdEfcFac, EFO_IdEfcRp)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0)`,
                [
                  ecpIdEcp,
                  renglon,
                  estacionId,
                  estacionRazonSocial,
                  ARTICULO_COMBUSTIBLE_ID,
                  ARTICULO_COMBUSTIBLE_DESC,
                  importe,
                  litros,
                  litros,
                ]
              );
              console.log(
                "[DEBUG API] Combustible insertado sin choferId (columna no existe)"
              );
              combustiblesIds.push(renglon);
            } else {
              throw e;
            }
          }
        }
      }

      console.log("[DEBUG API] Haciendo commit de la transacción...");
      await connection.commit();
      console.log("[DEBUG API] Commit exitoso");

      // Enviar email con resumen del negocio y PDF adjunto (no bloquea el guardado principal)

      // Generar y enviar PDF de Orden de Entrega por cada autorización guardada
      try {
        console.log(
          "[PDF-EMAIL] Iniciando generación de PDFs y envío de emails..."
        );

        // Obtener datos necesarios para el PDF
        // Primero obtener datos del chofer directamente
        console.log("[PDF-EMAIL] Buscando datos del chofer con ID:", choferId);

        const [choferRows] = await connection.query<RowDataPacket[]>(
          `SELECT TER_RazonSocialTer AS nombre, TER_CUITTer AS cuit
           FROM sige_ter_tercero
           WHERE TER_IDTercero = ?
           LIMIT 1`,
          [choferId]
        );

        console.log("[PDF-EMAIL] Resultado del query del chofer:", choferRows);

        const choferData = Array.isArray(choferRows) && choferRows.length > 0
          ? choferRows[0]
          : { nombre: null, cuit: null };

        console.log("[PDF-EMAIL] Datos del chofer parseados:", choferData);

        const [datosRows] = await connection.query<RowDataPacket[]>(
          `SELECT
             e.ENT_Numero AS viajeNumero,
             e.ENT_Fecha AS fecha,
             e.TER_RazonSocialTer AS proveedor,
             t.TER_RazonSocialTer AS transportista,
             t.TER_CUITTer AS transportistaCuit,
             ecp.ECP_PatCamion AS patChasis,
             ecp.ECP_PatAcoplado AS patAcoplado,
             v.VEN_NomVen AS vendedor,
             v.VEN_EMailVen AS vendedorEmail
           FROM sige_ent_encnegtra e
           INNER JOIN sige_ecp_enccarpor ecp ON e.ENT_IdEnt = ecp.ENT_IdEnt
           LEFT JOIN sige_icp_intcarpor icp ON icp.ECP_IdEcp = ecp.ECP_IdEcp AND icp.TIC_IdTic = 8
           LEFT JOIN sige_ter_tercero t ON t.TER_IDTercero = icp.TER_IDTerceroTic
           -- Enviar al vendedor que postuló (tomado desde la ECP creada al postular)
           LEFT JOIN sige_ven_vendedor v ON v.VEN_IDVendedor = ecp.VEN_IdVendPostula
           WHERE e.ENT_IdEnt = ? AND ecp.ECP_IdEcp = ?
           LIMIT 1`,
          [viajeId, ecpIdEcp]
        );

        if (!Array.isArray(datosRows) || datosRows.length === 0) {
          console.warn("[PDF-EMAIL] No se encontraron datos para generar PDF");
        } else {
          const datos = datosRows[0];
          const vendedorEmail = datos.vendedorEmail;

          if (!vendedorEmail || !vendedorEmail.includes("@")) {
            console.warn(
              "[PDF-EMAIL] Vendedor no tiene email válido, saltando envío"
            );
          } else {
            // Importar funciones de PDF y email
            const { generarPDFOrdenEntrega, generarNombrePDF } = await import(
              "@/lib/pdf-autorizacion"
            );
            const { enviarEmailConPDFAdjunto } = await import("@/lib/email");

            const patentes = `${datos.patChasis || ""}${
              datos.patAcoplado ? " " + datos.patAcoplado : ""
            }`.trim();

            // Usar datos del chofer obtenidos previamente
            const choferNombre = choferData.nombre || "N/A";
            const choferCuit = choferData.cuit || "";

            console.log("[PDF-EMAIL] Variables para PDF:", {
              choferNombre,
              choferCuit,
              transportista: datos.transportista,
              patChasis: datos.patChasis,
              patAcoplado: datos.patAcoplado,
            });

            // Generar PDF por cada adelanto guardado
            for (const renglonId of adelantosIds) {
              try {
                // Obtener datos específicos del adelanto
                const [adelantoData] = await connection.query<RowDataPacket[]>(
                  `SELECT OCP_Importe AS importe FROM SIGE_OCP_OrdCarPor 
                   WHERE ECP_IdEcp = ? AND OCP_Renglon = ? LIMIT 1`,
                  [ecpIdEcp, renglonId]
                );

                if (Array.isArray(adelantoData) && adelantoData.length > 0) {
                  const numeroOrden = `0001-${String(ecpIdEcp).padStart(
                    8,
                    "0"
                  )}`;

                  const pdfBuffer = await generarPDFOrdenEntrega({
                    numero: numeroOrden,
                    fecha: datos.fecha || new Date().toISOString(),
                    proveedor: estacionRazonSocial || "N/A", // ESTACIÓN DE SERVICIO, no el cliente
                    transportista: datos.transportista || "N/A",
                    transportistaCuit: datos.transportistaCuit || "",
                    chofer: choferNombre,
                    choferCuit: choferCuit,
                    patente: patentes || "N/A",
                    tipo: "adelanto",
                    cantidad: Number(adelantoData[0].importe || 0),
                    importe: 0,
                  });

                  const nombrePDF = generarNombrePDF({
                    numero: numeroOrden,
                    fecha: datos.fecha,
                    proveedor: estacionRazonSocial, // ESTACIÓN DE SERVICIO
                    transportista: datos.transportista,
                    transportistaCuit: datos.transportistaCuit,
                    chofer: choferNombre,
                    choferCuit: choferCuit,
                    patente: patentes,
                    tipo: "adelanto",
                    cantidad: Number(adelantoData[0].importe || 0),
                    importe: 0,
                  });

                  const htmlEmail = `
                    <h2>Orden de Entrega - Adelanto</h2>
                    <p>Hola ${datos.vendedor || "Vendedor"},</p>
                    <p>Se ha generado una nueva orden de entrega para el chofer <strong>${choferNombre}</strong>.</p>
                    <p><strong>Viaje:</strong> ${datos.viajeNumero}</p>
                    <p><strong>Tipo:</strong> Adelanto</p>
                    <p><strong>Monto:</strong> $${Number(
                      adelantoData[0].importe || 0
                    ).toFixed(2)}</p>
                    <p>El PDF adjunto contiene todos los detalles.</p>
                  `;

                  await enviarEmailConPDFAdjunto({
                    to: vendedorEmail,
                    subject: `Orden de Entrega - Adelanto - ${choferNombre}`,
                    htmlContent: htmlEmail,
                    pdfBuffer,
                    pdfNombre: nombrePDF,
                  });

                  console.log(
                    "[PDF-EMAIL] PDF de adelanto enviado:",
                    nombrePDF
                  );
                }
              } catch (pdfErr) {
                console.error(
                  "[PDF-EMAIL] Error al generar/enviar PDF de adelanto:",
                  pdfErr
                );
              }
            }

            // Generar PDF por cada combustible guardado
            for (const renglonId of combustiblesIds) {
              try {
                // Obtener datos específicos del combustible
                const [combustibleData] = await connection.query<
                  RowDataPacket[]
                >(
                  `SELECT OCP_Cantidad AS litros FROM SIGE_OCP_OrdCarPor 
                   WHERE ECP_IdEcp = ? AND OCP_Renglon = ? LIMIT 1`,
                  [ecpIdEcp, renglonId]
                );

                if (
                  Array.isArray(combustibleData) &&
                  combustibleData.length > 0
                ) {
                  const numeroOrden = `0001-${String(ecpIdEcp).padStart(
                    8,
                    "0"
                  )}`;

                  const pdfBuffer = await generarPDFOrdenEntrega({
                    numero: numeroOrden,
                    fecha: datos.fecha || new Date().toISOString(),
                    proveedor: estacionRazonSocial || "N/A", // ESTACIÓN DE SERVICIO, no el cliente
                    transportista: datos.transportista || "N/A",
                    transportistaCuit: datos.transportistaCuit || "",
                    chofer: choferNombre,
                    choferCuit: choferCuit,
                    patente: patentes || "N/A",
                    tipo: "combustible",
                    cantidad: Number(combustibleData[0].litros || 0),
                    importe: 0,
                  });

                  const nombrePDF = generarNombrePDF({
                    numero: numeroOrden,
                    fecha: datos.fecha,
                    proveedor: estacionRazonSocial, // ESTACIÓN DE SERVICIO
                    transportista: datos.transportista,
                    transportistaCuit: datos.transportistaCuit,
                    chofer: choferNombre,
                    choferCuit: choferCuit,
                    patente: patentes,
                    tipo: "combustible",
                    cantidad: Number(combustibleData[0].litros || 0),
                    importe: 0,
                  });

                  const htmlEmail = `
                    <h2>Orden de Entrega - Combustible</h2>
                    <p>Hola ${datos.vendedor || "Vendedor"},</p>
                    <p>Se ha generado una nueva orden de entrega para el chofer <strong>${choferNombre}</strong>.</p>
                    <p><strong>Viaje:</strong> ${datos.viajeNumero}</p>
                    <p><strong>Tipo:</strong> Combustible</p>
                    <p><strong>Cantidad:</strong> ${Number(
                      combustibleData[0].litros || 0
                    ).toFixed(2)} litros</p>
                    <p>El PDF adjunto contiene todos los detalles.</p>
                  `;

                  await enviarEmailConPDFAdjunto({
                    to: vendedorEmail,
                    subject: `Orden de Entrega - Combustible - ${choferNombre}`,
                    htmlContent: htmlEmail,
                    pdfBuffer,
                    pdfNombre: nombrePDF,
                  });

                  console.log(
                    "[PDF-EMAIL] PDF de combustible enviado:",
                    nombrePDF
                  );
                }
              } catch (pdfErr) {
                console.error(
                  "[PDF-EMAIL] Error al generar/enviar PDF de combustible:",
                  pdfErr
                );
              }
            }
          }
        }
      } catch (emailErr) {
        console.error(
          "[PDF-EMAIL] Error general en generación/envío de PDFs:",
          emailErr
        );
      }
      const response = {
        success: true,
        message: "Autorizaciones guardadas exitosamente",
        data: { viajeId, choferId, estacionId, ecpIdEcp },
        renglones: {
          adelantos: adelantosIds,
          combustibles: combustiblesIds,
        },
      };

      console.log("[DEBUG API] Respuesta a enviar:", response);

      // Corregir encoding en la respuesta
      const fixedResponse = fixEncodingObject(response);

      return NextResponse.json(fixedResponse);
    } catch (error: any) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error("Error en rollback:", rollbackErr);
      }
      console.error("Error al guardar autorizaciones:", error);
      return NextResponse.json(
        { error: error?.message || "Error al guardar autorizaciones" },
        { status: 500 }
      );
    } finally {
      // @ts-ignore connection may not exist if getConnection failed
      if (typeof connection?.release === "function") connection.release();
    }
  } catch (error) {
    console.error("Error inesperado al guardar autorizaciones:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const ecpIdEcp = toInt(body?.ecpIdEcp);
    const renglon = toInt(body?.renglon);

    console.log("[DEBUG DELETE] Request body:", { ecpIdEcp, renglon });

    if (!ecpIdEcp || !renglon) {
      return NextResponse.json(
        { error: "ecpIdEcp y renglon son obligatorios" },
        { status: 400 }
      );
    }

    // Verificar que el registro existe antes de eliminar
    const [existingRows]: any = await db.query(
      `SELECT OCP_Renglon, ART_IdArticulo, ART_DesArticulo
       FROM SIGE_OCP_OrdCarPor
       WHERE ECP_IdEcp = ? AND OCP_Renglon = ?
       LIMIT 1`,
      [ecpIdEcp, renglon]
    );

    if (!Array.isArray(existingRows) || existingRows.length === 0) {
      return NextResponse.json(
        { error: "No se encontró la autorización a eliminar" },
        { status: 404 }
      );
    }

    const registro = existingRows[0];

    // Verificar que sea un adelanto o combustible
    const esAdelanto = registro.ART_IdArticulo === ARTICULO_ADELANTO_ID ||
                       registro.ART_DesArticulo === ARTICULO_ADELANTO_DESC;
    const esCombustible = registro.ART_IdArticulo === ARTICULO_COMBUSTIBLE_ID ||
                          registro.ART_DesArticulo === ARTICULO_COMBUSTIBLE_DESC;

    if (!esAdelanto && !esCombustible) {
      return NextResponse.json(
        { error: "El registro no corresponde a una autorización de adelanto o combustible" },
        { status: 400 }
      );
    }

    // Eliminar el registro
    const [result]: any = await db.query(
      `DELETE FROM SIGE_OCP_OrdCarPor
       WHERE ECP_IdEcp = ? AND OCP_Renglon = ?`,
      [ecpIdEcp, renglon]
    );

    console.log("[DEBUG DELETE] Resultado de eliminación:", result);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "No se pudo eliminar la autorización" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Autorización eliminada exitosamente",
      data: { ecpIdEcp, renglon, tipo: esAdelanto ? "adelanto" : "combustible" }
    });

  } catch (error: any) {
    console.error("Error al eliminar autorización:", error);
    return NextResponse.json(
      { error: error?.message || "Error al eliminar autorización" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const viajeId = toInt(searchParams.get("viajeId"));
    const choferId = toInt(searchParams.get("choferId")); // guardado por si luego querés filtrar por chofer

    if (!viajeId) {
      return NextResponse.json(
        { error: "viajeId es obligatorio" },
        { status: 400 }
      );
    }

    // Obtener TODAS las ECPs del viaje (no solo la primera)
    const [ecpRows]: any = await db.query(
      `SELECT ECP_IdEcp FROM sige_ecp_enccarpor WHERE ENT_IdEnt = ? ORDER BY ECP_IdEcp`,
      [viajeId]
    );

    if (!Array.isArray(ecpRows) || ecpRows.length === 0) {
      // Si no hay carta porte, devolver array vacío
      return NextResponse.json([]);
    }

    const ecpIds = ecpRows.map((r: any) => r.ECP_IdEcp);
    console.log(
      "[DEBUG GET] Buscando autorizaciones para ENT_IdEnt:",
      viajeId,
      "ECPs:",
      ecpIds
    );

    // Trae renglones de ADELANTO y/o COMBUSTIBLE para TODAS las ECPs del viaje
    const placeholders = ecpIds.map(() => "?").join(", ");
    const query = `
      SELECT
        ocp.ECP_IdEcp           AS ecpIdEcp,
        ocp.OCP_Renglon         AS renglon,
        ocp.TER_IdTercero       AS estacionId,
        ocp.TER_RazonSocialTer  AS estacionNombre,
        ocp.ART_IdArticulo      AS articuloId,
        ocp.ART_DesArticulo     AS articuloDesc,
        ocp.OCP_Importe         AS importe,
        ocp.OCP_Cantidad        AS cantidad,
        ocp.OCP_CantPend        AS cantidadPendiente,
        ter.TER_CUITTer         AS estacionCuit,
        ocp.CHO_IdChofer        AS choferId,
        chofer.TER_RazonSocialTer AS choferNombre,
        chofer.TER_CUITTer      AS choferCuit
      FROM SIGE_OCP_OrdCarPor ocp
      LEFT JOIN sige_ter_tercero ter ON ter.TER_IDTercero = ocp.TER_IdTercero
      LEFT JOIN sige_ter_tercero chofer ON chofer.TER_IDTercero = ocp.CHO_IdChofer
      WHERE ocp.ECP_IdEcp IN (${placeholders})
        AND (
              ocp.ART_IdArticulo = ?                 -- "COMB"
           OR ocp.ART_DesArticulo IN ('ADELANTO','COMBUSTIBLE')
           OR ocp.ART_IdArticulo = ?                 -- "ADE"
        )
      ORDER BY ocp.ECP_IdEcp, ocp.OCP_Renglon DESC
    `;

    try {
      const [rows] = await db.query(query, [
        ...ecpIds,
        ARTICULO_COMBUSTIBLE_ID,
        ARTICULO_ADELANTO_ID,
      ]);
      console.log("[DEBUG GET] Autorizaciones encontradas:", rows);
      return NextResponse.json(rows);
    } catch (e: any) {
      // Si la columna CHO_IdChofer no existe, obtener chofer desde sige_icp_intcarpor
      if (e?.code === "ER_BAD_FIELD_ERROR") {
        console.log(
          "[DEBUG GET] Columna CHO_IdChofer no existe, obteniendo chofer desde sige_icp_intcarpor"
        );
        const queryFallback = `
          SELECT
            ocp.ECP_IdEcp           AS ecpIdEcp,
            ocp.OCP_Renglon         AS renglon,
            ocp.TER_IdTercero       AS estacionId,
            ocp.TER_RazonSocialTer  AS estacionNombre,
            ocp.ART_IdArticulo      AS articuloId,
            ocp.ART_DesArticulo     AS articuloDesc,
            ocp.OCP_Importe         AS importe,
            ocp.OCP_Cantidad        AS cantidad,
            ocp.OCP_CantPend        AS cantidadPendiente,
            ter.TER_CUITTer         AS estacionCuit,
            icp.TER_IDTerceroTic    AS choferId,
            chofer.TER_RazonSocialTer AS choferNombre,
            chofer.TER_CUITTer      AS choferCuit
          FROM SIGE_OCP_OrdCarPor ocp
          LEFT JOIN sige_ter_tercero ter ON ter.TER_IDTercero = ocp.TER_IdTercero
          LEFT JOIN sige_icp_intcarpor icp ON icp.ECP_IdEcp = ocp.ECP_IdEcp AND icp.TIC_IdTic = 9
          LEFT JOIN sige_ter_tercero chofer ON chofer.TER_IDTercero = icp.TER_IDTerceroTic
          WHERE ocp.ECP_IdEcp IN (${placeholders})
            AND (
                  ocp.ART_IdArticulo = ?
               OR ocp.ART_DesArticulo IN ('ADELANTO','COMBUSTIBLE')
               OR ocp.ART_IdArticulo = ?
            )
          ORDER BY ocp.ECP_IdEcp, ocp.OCP_Renglon DESC
        `;
        const [rows] = await db.query(queryFallback, [
          ...ecpIds,
          ARTICULO_COMBUSTIBLE_ID,
          ARTICULO_ADELANTO_ID,
        ]);
        console.log("[DEBUG GET] Autorizaciones encontradas (fallback):", rows);
        return NextResponse.json(rows);
      }
      throw e;
    }
  } catch (error) {
    console.error("Error al obtener autorizaciones:", error);
    return NextResponse.json(
      { error: "Error al obtener autorizaciones" },
      { status: 500 }
    );
  }
}
