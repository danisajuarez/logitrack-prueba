import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { db } from "@/lib/db";
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
    const choferId = toInt(body?.choferId);
    const estacionId = toInt(body?.estacionId);

    console.log("[DEBUG API] Parámetros parseados:", {
      viajeId,
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

      // Obtener ECP_IdEcp desde ENT_IdEnt (viajeId) primero
      const [ecpValidRows]: any = await connection.query(
        `SELECT ECP_IdEcp FROM sige_ecp_enccarpor WHERE ENT_IdEnt = ? LIMIT 1`,
        [viajeId]
      );
      if (!Array.isArray(ecpValidRows) || ecpValidRows.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: "No se encontró la carta porte para este viaje" },
          { status: 404 }
        );
      }
      const ecpIdEcpValid = ecpValidRows[0].ECP_IdEcp;

      // Validar que el chofer pertenece al viaje (usando sige_icp_intcarpor)
      const [choferRows] = await connection.query<RowDataPacket[]>(
        `SELECT ICP_IDIcp FROM sige_icp_intcarpor
         WHERE ECP_IdEcp = ? AND TER_IDTerceroTic = ? AND TIC_IdTic = 9
         LIMIT 1`,
        [ecpIdEcpValid, choferId]
      );
      if (!Array.isArray(choferRows) || choferRows.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: "El chofer no está postulado para este viaje" },
          { status: 404 }
        );
      }

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

      // Obtener ECP (id del encabezado) desde la tabla de viajes (ajustado a tu DB)
      const [viajeRows] = await connection.query<RowDataPacket[]>(
        `SELECT ENT_IdEnt FROM sige_ent_encnegtra WHERE ENT_IdEnt = ? LIMIT 1`,
        [viajeId]
      );
      if (!Array.isArray(viajeRows) || viajeRows.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: "No se encontró el viaje en el sistema" },
          { status: 404 }
        );
      }
      const entIdEnt = viajeRows[0].ENT_IdEnt;

      // Obtener el ECP_IdEcp real desde sige_ecp_enccarpor
      const [ecpRows] = await connection.query<RowDataPacket[]>(
        `SELECT ECP_IdEcp FROM sige_ecp_enccarpor WHERE ENT_IdEnt = ? LIMIT 1`,
        [entIdEnt]
      );
      if (!Array.isArray(ecpRows) || ecpRows.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: "No se encontró la carta porte para este viaje" },
          { status: 404 }
        );
      }
      const ecpIdEcp = ecpRows[0].ECP_IdEcp;
      console.log('[DEBUG] ECP_IdEcp encontrado:', ecpIdEcp, 'para ENT_IdEnt:', entIdEnt);

      // Actualizar patentes en sige_ecp_enccarpor si vienen en el request
      const { patChasis, patAcoplado } = body;
      if (patChasis || patAcoplado) {
        try {
          const updates: string[] = [];
          const params: any[] = [];

          if (patChasis) {
            updates.push('ECP_PatCamion = ?');
            params.push(patChasis.toUpperCase());
          }
          if (patAcoplado) {
            updates.push('ECP_PatAcoplado = ?');
            params.push(patAcoplado.toUpperCase());
          }

          if (updates.length > 0) {
            params.push(ecpIdEcp);
            await connection.execute(
              `UPDATE sige_ecp_enccarpor SET ${updates.join(', ')} WHERE ECP_IdEcp = ?`,
              params
            );
            console.log('[DEBUG] Patentes actualizadas en carta porte:', { patChasis, patAcoplado, ecpIdEcp });
          }
        } catch (patError) {
          console.error('[DEBUG] Error al actualizar patentes:', patError);
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
          console.log("[DEBUG API] Insertando adelanto en renglón:", renglon, "para chofer:", choferId);

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
            console.log("[DEBUG API] Adelanto insertado correctamente con choferId");
            adelantosIds.push(renglon);
          } catch (e: any) {
            // Si la columna CHO_IdChofer no existe, insertar sin ella
            if (e?.code === 'ER_BAD_FIELD_ERROR') {
              console.log("[DEBUG API] Columna CHO_IdChofer no existe, insertando sin ella");
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
              console.log("[DEBUG API] Adelanto insertado sin choferId (columna no existe)");
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
            console.log("[DEBUG API] Combustible insertado correctamente con choferId");
            combustiblesIds.push(renglon);
          } catch (e: any) {
            // Si la columna CHO_IdChofer no existe, insertar sin ella
            if (e?.code === 'ER_BAD_FIELD_ERROR') {
              console.log("[DEBUG API] Columna CHO_IdChofer no existe, insertando sin ella");
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
              console.log("[DEBUG API] Combustible insertado sin choferId (columna no existe)");
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
      try {
        console.log(
          "[EMAIL] Iniciando generaci��n de PDF y env��o de email..."
        );
        // Traer datos del negocio para el email
        const [negRows] = await connection.query<RowDataPacket[]>(
          `SELECT
             e.ENT_Numero              AS numeroNegocio,
             e.ENT_Fecha               AS fecha,
             COALESCE(e.ENT_FechaVencimiento, e.ENT_Fecha) AS fechaVencimiento,
             e.TER_RazonSocialTer      AS proveedor,
             e.LOC_NomLocalidadOrig    AS procedencia,
             e.LOC_NomLocalidadDest    AS destino,
             e.TVP_Caracteristicas     AS articulo,
             e.ENT_Tarifa              AS tarifa,
             e.ENT_CantCupos           AS cupos
           FROM sige_ent_encnegtra e
           WHERE e.ENT_IdEnt = ?
           LIMIT 1`,
          [viajeId]
        );

        if (Array.isArray(negRows) && negRows.length > 0) {
          const row: any = negRows[0];
          const emailData = {
            numeroNegocio: String(row.numeroNegocio ?? viajeId),
            fecha: new Date(row.fecha ?? new Date()).toISOString(),
            fechaVencimiento: new Date(
              row.fechaVencimiento ?? row.fecha ?? new Date()
            ).toISOString(),
            proveedor: String(row.proveedor ?? ""),
            procedencia: String(row.procedencia ?? ""),
            destino: String(row.destino ?? ""),
            articulo: String(row.articulo ?? ""),
            tarifa: Number(row.tarifa ?? 0),
            cupos: row.cupos != null ? Number(row.cupos) : undefined,
          } as const;

          const [{ generateNegocioPDF }, { sendNegocioEmail }] = await Promise.all([
            import("@/lib/pdf"),
            import("@/lib/email"),
          ]);

          const pdf = await generateNegocioPDF(emailData);
          const result = await sendNegocioEmail(emailData, pdf);

          if (!result.success) {
            console.error("[EMAIL] Error al enviar email:", result.error);
          } else {
            console.log(
              "[EMAIL] Email enviado exitosamente:",
              result.messageId
            );
          }
        } else {
          console.warn(
            "[EMAIL] No se encontraron datos del negocio para viajeId",
            viajeId
          );
        }
      } catch (emailErr) {
        console.error("[EMAIL] Error general en flujo de email:", emailErr);
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

      return NextResponse.json(response);
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

    // Primero obtener el ECP_IdEcp desde ENT_IdEnt (viajeId)
    const [ecpRows]: any = await db.query(
      `SELECT ECP_IdEcp FROM sige_ecp_enccarpor WHERE ENT_IdEnt = ? LIMIT 1`,
      [viajeId]
    );

    if (!Array.isArray(ecpRows) || ecpRows.length === 0) {
      // Si no hay carta porte, devolver array vacío (no es error, simplemente no hay autorizaciones aún)
      return NextResponse.json([]);
    }

    const ecpIdEcp = ecpRows[0].ECP_IdEcp;
    console.log('[DEBUG GET] Buscando autorizaciones para ENT_IdEnt:', viajeId, 'ECP_IdEcp:', ecpIdEcp);

    // Trae renglones de ADELANTO y/o COMBUSTIBLE para el ECP
    // Incluye CHO_IdChofer para filtrar por chofer (si la columna existe)
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
        ocp.CHO_IdChofer        AS choferId
      FROM SIGE_OCP_OrdCarPor ocp
      LEFT JOIN sige_ter_tercero ter ON ter.TER_IDTercero = ocp.TER_IdTercero
      WHERE ocp.ECP_IdEcp = ?
        AND (
              ocp.ART_IdArticulo = ?                 -- "COMB"
           OR ocp.ART_DesArticulo IN ('ADELANTO','COMBUSTIBLE')
           OR ocp.ART_IdArticulo = ?                 -- "ADE"
        )
      ORDER BY ocp.OCP_Renglon DESC
    `;

    try {
      const [rows] = await db.query(query, [ecpIdEcp, ARTICULO_COMBUSTIBLE_ID, ARTICULO_ADELANTO_ID]);
      console.log('[DEBUG GET] Autorizaciones encontradas:', rows);
      return NextResponse.json(rows);
    } catch (e: any) {
      // Si la columna CHO_IdChofer no existe, consultar sin ella
      if (e?.code === 'ER_BAD_FIELD_ERROR') {
        console.log('[DEBUG GET] Columna CHO_IdChofer no existe, usando query fallback');
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
            ter.TER_CUITTer         AS estacionCuit
          FROM SIGE_OCP_OrdCarPor ocp
          LEFT JOIN sige_ter_tercero ter ON ter.TER_IDTercero = ocp.TER_IdTercero
          WHERE ocp.ECP_IdEcp = ?
            AND (
                  ocp.ART_IdArticulo = ?
               OR ocp.ART_DesArticulo IN ('ADELANTO','COMBUSTIBLE')
               OR ocp.ART_IdArticulo = ?
            )
          ORDER BY ocp.OCP_Renglon DESC
        `;
        const [rows] = await db.query(queryFallback, [ecpIdEcp, ARTICULO_COMBUSTIBLE_ID, ARTICULO_ADELANTO_ID]);
        console.log('[DEBUG GET] Autorizaciones encontradas (fallback):', rows);
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
