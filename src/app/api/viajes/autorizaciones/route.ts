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
  adelantos?: Array<{ importe: number }>;
  combustibles?: Array<{ litros: number }>;
}

// Artículos según sistema
const ARTICULO_COMBUSTIBLE_ID = "COMB";
const ARTICULO_COMBUSTIBLE_DESC = "COMBUSTIBLE";
// Si la columna permite NULL para adelanto, dejalo en null.
// Si NO permite, reemplazalo por el código real (p.ej. "ADE").
const ARTICULO_ADELANTO_ID: string | null = null;
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

      // Validar que el chofer pertenece al viaje
      const [choferRows] = await connection.query<RowDataPacket[]>(
        `SELECT id FROM viajes_choferes WHERE viaje_id = ? AND chofer_id = ? LIMIT 1`,
        [viajeId, choferId]
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
      const ecpIdEcp = viajeRows[0].ENT_IdEnt;

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
          console.log("[DEBUG API] Insertando adelanto en renglón:", renglon);

          const [result] = await connection.query(
            `INSERT INTO SIGE_OCP_OrdCarPor
             (ECP_IdEcp, OCP_Renglon, TER_IdTercero, TER_RazonSocialTer,
              ART_IdArticulo, ART_DesArticulo, OCP_Importe,
              OCP_Cantidad, OCP_CantPend, OCP_CantReal, OCP_CantRealPend,
              EFO_IdEfcFac, EFO_IdEfcRp)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0)`,
            [
              ecpIdEcp,
              renglon,
              estacionId,
              estacionRazonSocial,
              ARTICULO_ADELANTO_ID, // null si se permite, o el código real cuando lo pases
              ARTICULO_ADELANTO_DESC, // "ADELANTO"
              importe,
            ]
          );
          console.log("[DEBUG API] Adelanto insertado correctamente");
          adelantosIds.push(renglon);
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

          const renglon = await getNextRenglon(ecpIdEcp);
          console.log(
            "[DEBUG API] Insertando combustible en renglón:",
            renglon
          );

          const [result] = await connection.query(
            `INSERT INTO SIGE_OCP_OrdCarPor
             (ECP_IdEcp, OCP_Renglon, TER_IdTercero, TER_RazonSocialTer,
              ART_IdArticulo, ART_DesArticulo, OCP_Importe,
              OCP_Cantidad, OCP_CantPend, OCP_CantReal, OCP_CantRealPend,
              EFO_IdEfcFac, EFO_IdEfcRp)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 0, ?, 0, 0)`,
            [
              ecpIdEcp,
              renglon,
              estacionId,
              estacionRazonSocial,
              ARTICULO_COMBUSTIBLE_ID, // "COMB"
              ARTICULO_COMBUSTIBLE_DESC, // "COMBUSTIBLE"
              litros, // OCP_Cantidad
              litros, // OCP_CantPend
              litros, // OCP_CantRealPend
            ]
          );
          console.log("[DEBUG API] Combustible insertado correctamente");
          combustiblesIds.push(renglon);
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
             ENT_Numero              AS numeroNegocio,
             ENT_Fecha               AS fecha,
             COALESCE(ENT_FechaVencimiento, ENT_Fecha) AS fechaVencimiento,
             TER_RazonSocialTer      AS proveedor,
             LOC_NomLocalidadOrig    AS procedencia,
             LOC_NomLocalidadDest    AS destino,
             TVP_Caracteristicas     AS articulo,
             ENT_Tarifa              AS tarifa,
             ENT_CantCupos           AS cupos
           FROM sige_ent_encnegtra
           WHERE ENT_IdEnt = ?
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

    // Trae renglones de ADELANTO y/o COMBUSTIBLE para el ECP
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
        ter.TER_CUITTer         AS estacionCuit
      FROM SIGE_OCP_OrdCarPor ocp
      LEFT JOIN sige_ter_tercero ter ON ter.TER_IDTercero = ocp.TER_IdTercero
      WHERE ocp.ECP_IdEcp = ?
        AND (
              ocp.ART_IdArticulo = ?                 -- "COMB"
           OR ocp.ART_DesArticulo IN ('ADELANTO','COMBUSTIBLE')
        )
      ORDER BY ocp.OCP_Renglon DESC
    `;

    const [rows] = await db.query(query, [viajeId, ARTICULO_COMBUSTIBLE_ID]);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error al obtener autorizaciones:", error);
    return NextResponse.json(
      { error: "Error al obtener autorizaciones" },
      { status: 500 }
    );
  }
}
