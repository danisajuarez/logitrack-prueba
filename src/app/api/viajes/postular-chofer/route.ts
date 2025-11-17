import { NextRequest, NextResponse } from "next/server";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { db } from "@/lib/db";
import { obtenerRelacionActivaChofer } from "@/lib/choferes";
import { enviarEmailVendedorPostulacion } from "@/lib/email";

interface ViajeMetrics {
  id: number;
  numero: string | null;
  cupos: number;
  reservados: number;
  tipo: "nuevo" | "legacy";
}

function toInt(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isInteger(num) ? num : null;
}

function normalizeNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

async function fetchViajeMetrics(
  connection: PoolConnection,
  viajeId: number
): Promise<ViajeMetrics> {
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT id, numero, cupos, cuposReservados FROM viajes_nuevos WHERE id = ? LIMIT 1`,
      [viajeId]
    );
    if (Array.isArray(rows) && rows.length > 0) {
      const row = rows[0];
      return {
        id: Number(row.id),
        numero: row.numero ? String(row.numero) : null,
        cupos: normalizeNumber(row.cupos),
        reservados: normalizeNumber(row.cuposReservados),
        tipo: "nuevo",
      };
    }
  } catch (error: any) {
    if (error?.code !== "ER_NO_SUCH_TABLE") {
      throw error;
    }
  }

  const [legacyRows] = await connection.query<RowDataPacket[]>(
    `SELECT
       ENT_IdEnt AS id,
       ENT_Numero AS numero,
       ENT_CantCupos AS cupos,
       ENT_CantCuposReser AS reservados
     FROM sige_ent_encnegtra
     WHERE ENT_IdEnt = ?
     LIMIT 1`,
    [viajeId]
  );

  if (!Array.isArray(legacyRows) || legacyRows.length === 0) {
    throw Object.assign(new Error("Viaje no encontrado"), { statusCode: 404 });
  }

  const row = legacyRows[0];
  return {
    id: Number(row.id),
    numero: row.numero ? String(row.numero) : null,
    cupos: normalizeNumber(row.cupos),
    reservados: normalizeNumber(row.reservados),
    tipo: "legacy",
  };
}

async function ensureVendedorExiste(
  connection: PoolConnection,
  vendedorId: number
): Promise<void> {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT 1 FROM sige_ven_vendedor WHERE VEN_IDVendedor = ? LIMIT 1`,
    [vendedorId]
  );
  if (!Array.isArray(rows) || rows.length === 0) {
    throw Object.assign(new Error("El vendedor no existe"), {
      statusCode: 400,
    });
  }
}

async function ensureChoferExiste(
  connection: PoolConnection,
  choferId: number
): Promise<void> {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT 1 FROM sige_ter_tercero WHERE TER_IDTercero = ? LIMIT 1`,
    [choferId]
  );
  if (!Array.isArray(rows) || rows.length === 0) {
    throw Object.assign(new Error("Chofer no encontrado"), { statusCode: 404 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const viajeId = toInt(body?.viajeId);
    const choferId = toInt(body?.choferId);
    const vendedorId = toInt(body?.vendedorId);
    const sendEmail = Boolean(body?.sendEmail);

    if (!viajeId || !choferId) {
      return NextResponse.json(
        {
          error:
            "viajeId y choferId son obligatorios y deben ser enteros válidos",
        },
        { status: 400 }
      );
    }

    if (!vendedorId) {
      return NextResponse.json(
        { error: "Debe seleccionar un vendedor válido" },
        { status: 400 }
      );
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await ensureChoferExiste(connection, choferId);
      await ensureVendedorExiste(connection, vendedorId);

      const metrics = await fetchViajeMetrics(connection, viajeId);

      // Obtener TODOS los ECP_IdEcp desde ENT_IdEnt (viajeId)
      const [ecpRows]: any = await connection.query(
        `SELECT ECP_IdEcp FROM sige_ecp_enccarpor WHERE ENT_IdEnt = ? ORDER BY ECP_IdEcp`,
        [viajeId]
      );
      if (!Array.isArray(ecpRows) || ecpRows.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: "No se encontró la carta porte para este viaje" },
          { status: 404 }
        );
      }
      const ecpIds: number[] = ecpRows
        .map((r: any) => Number(r.ECP_IdEcp))
        .filter((n: number) => Number.isInteger(n));
      const ecpIdEcp = ecpIds[ecpIds.length - 1]; // usar la ECP más reciente
      const placeholders = ecpIds.map(() => "?").join(", ");

      // Estrategia: Crear una nueva ECP para CADA postulación (permite duplicados del mismo chofer)
      // Esto permite tener múltiples choferes por viaje (según cupos disponibles)
      let ecpIdForInsert = ecpIdEcp;

      console.log(`[DEBUG] ===== INICIO ASIGNACIÓN ECP =====`);
      console.log(`[DEBUG] ViajeId: ${viajeId}, ChoferId: ${choferId}`);
      console.log(`[DEBUG] ECPs existentes para este viaje:`, ecpIds);

      // SIEMPRE crear una nueva ECP para cada chofer (excepto si es el primero y la ECP original está vacía)
      const placeholdersCheck = ecpIds.map(() => "?").join(", ");
      const [perEcpCounts] = await connection.query<RowDataPacket[]>(
        `SELECT ECP_IdEcp AS id, COUNT(*) AS total
         FROM sige_icp_intcarpor
         WHERE ECP_IdEcp IN (${placeholdersCheck}) AND TIC_IdTic = 9
         GROUP BY ECP_IdEcp`,
        ecpIds
      );

      console.log(`[DEBUG] Conteo de choferes por ECP:`, perEcpCounts);

      const countsMap = new Map<number, number>(
        (Array.isArray(perEcpCounts) ? perEcpCounts : []).map((r: any) => [
          Number(r.id ?? r.ECP_IdEcp),
          Number(r.total) || 0,
        ])
      );

      console.log(`[DEBUG] Mapa de conteos:`, Object.fromEntries(countsMap));

      // Buscar una ECP libre (sin choferes asignados)
      const libre = ecpIds.find((id) => (countsMap.get(id) ?? 0) === 0);
      console.log(`[DEBUG] ECP libre encontrada:`, libre);

      if (libre != null) {
        // Usar la ECP libre existente, pero actualizar el vendedor
        ecpIdForInsert = libre;
        console.log(`[DEBUG] Usando ECP libre existente: ${libre}, actualizando vendedor a ${vendedorId}`);

        // Actualizar el VEN_IdVendPostula en la ECP libre para reflejar el vendedor correcto de esta postulación
        try {
          await connection.execute(
            `UPDATE sige_ecp_enccarpor SET VEN_IdVendPostula = ? WHERE ECP_IdEcp = ?`,
            [vendedorId, libre]
          );
          console.log(`[DEBUG] Vendedor actualizado en ECP ${libre} a vendedorId ${vendedorId}`);
        } catch (e) {
          console.error(`[DEBUG] Error al actualizar vendedor en ECP ${libre}:`, e);
          // No abortar por esto
        }
      } else {
        // NO hay ECPs libres, crear una nueva para este chofer
        console.log(
          `[DEBUG] Todas las ECPs tienen choferes, creando nueva ECP para chofer ${choferId}`
        );
        try {
          await connection.execute(
            "UPDATE sige_aut_autonum SET AUT_Numero = LAST_INSERT_ID(AUT_Numero + 1) WHERE AUT_Tabla = ?",
            ["sige_ecp_enccarpor"]
          );
          const [rowsEcpNum]: any = await connection.query(
            "SELECT LAST_INSERT_ID() AS numero"
          );
          const newEcpId = Number(rowsEcpNum?.[0]?.numero);
          if (Number.isFinite(newEcpId)) {
            const newNumero = String(newEcpId).padStart(6, "0");

            // Copiar TODOS los datos desde la ECP original (la primera del viaje)
            // Esto garantiza que tenga los mismos datos de localidad/provincia
            const ecpOriginal = ecpIds[0]; // La primera ECP tiene todos los datos completos

            // Copiar todos los datos desde la ECP original, pero actualizar el VEN_IdVendPostula con el vendedor de esta postulación
            await connection.execute(
              `INSERT INTO sige_ecp_enccarpor (
                 ECP_IdEcp, ECP_Numero, ECP_Fecha, ECP_FechaVencimiento,
                 TCP_IDTipoComp, EPC_IdEpd,
                 TER_IDTerceroEst, TER_RazonSocialTerEst,
                 LOC_NomLocalidadEst, LOC_IDLocalidadEst, PRO_IDProvinciaEst, PRO_NomProvinciaEst,
                 LOC_NomLocalidadGran, LOC_IDLocalidadGran, PRO_IDProvinciaGran, PRO_NomProvinciaGran,
                 ECP_Tarifa, TVP_Caracteristicas, DEP_IDDeposito,
                 ENT_IdEnt, VEN_IdVendPostula, USU_IdUsuario, EQU_IDEquipo,
                 ECP_PreCartaPorte, ECP_CancCompra, ECP_CancVenta
               )
               SELECT ?, ?, NOW(), NOW(),
                      ECP.TCP_IDTipoComp, ECP.EPC_IdEpd,
                      ECP.TER_IDTerceroEst, ECP.TER_RazonSocialTerEst,
                      ECP.LOC_NomLocalidadEst, ECP.LOC_IDLocalidadEst, ECP.PRO_IDProvinciaEst, ECP.PRO_NomProvinciaEst,
                      ECP.LOC_NomLocalidadGran, ECP.LOC_IDLocalidadGran, ECP.PRO_IDProvinciaGran, ECP.PRO_NomProvinciaGran,
                      ECP.ECP_Tarifa, ECP.TVP_Caracteristicas, ECP.DEP_IDDeposito,
                      ECP.ENT_IdEnt, ?, ECP.USU_IdUsuario, ECP.EQU_IDEquipo,
                      ECP.ECP_PreCartaPorte, ECP.ECP_CancCompra, ECP.ECP_CancVenta
               FROM sige_ecp_enccarpor ECP
               WHERE ECP.ECP_IdEcp = ?
               LIMIT 1`,
              [newEcpId, newNumero, vendedorId, ecpOriginal]
            );
            ecpIdForInsert = newEcpId;
            ecpIds.push(newEcpId);
            console.log(
              `[DEBUG] Nueva ECP creada: ${newEcpId} copiando datos completos desde ECP original ${ecpOriginal}`
            );
          }
        } catch (error) {
          console.error("[DEBUG] Error al crear nueva ECP:", error);
          throw error;
        }
      }

      // Contar choferes postulados (TIC_IdTic = 9)
      const [countRows] = await connection.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM sige_icp_intcarpor
         WHERE ECP_IdEcp IN (${placeholders}) AND TIC_IdTic = 9`,
        ecpIds
      );
      const postuladosActuales = normalizeNumber(countRows?.[0]?.total);
      const pendientesAntes =
        metrics.cupos - metrics.reservados - postuladosActuales;

      if (pendientesAntes <= 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: "No hay cupos pendientes disponibles para este viaje" },
          { status: 409 }
        );
      }

      let relacion;
      try {
        relacion = await obtenerRelacionActivaChofer(choferId, connection);
      } catch (error: any) {
        await connection.rollback();
        const message =
          error?.message ??
          "No se pudo determinar la relación activa del chofer";
        const status =
          typeof error?.statusCode === "number" ? error.statusCode : 409;
        return NextResponse.json({ error: message }, { status });
      }

      if (!relacion.relacionActiva) {
        await connection.rollback();
        return NextResponse.json(
          {
            error:
              "La relación del chofer con el transportista/vehículo no está activa",
          },
          { status: 409 }
        );
      }

      const patenteChasis = relacion.patChasis?.toUpperCase();
      if (!patenteChasis) {
        await connection.rollback();
        return NextResponse.json(
          {
            error:
              "No se pudo determinar una patente válida para el chofer seleccionado",
          },
          { status: 409 }
        );
      }

      // Declarar choferRows fuera del try para que esté disponible después
      let choferRows: RowDataPacket[] = [];

      try {
        // Actualizar las patentes en la carta porte asociada (sige_ecp_enccarpor)
        // para que ECP_PatCamion y ECP_PatAcoplado queden reflejadas apenas se postula el chofer.
        // Se identifica la carta porte por ENT_IdEnt = viajeId (columna presente en la tabla ECP).
        try {
          await connection.query(
            `UPDATE sige_ecp_enccarpor
               SET ECP_PatCamion = ?, ECP_PatAcoplado = ?
             WHERE ECP_IdEcp = ?`,
            [
              patenteChasis,
              relacion.patAcoplado ? relacion.patAcoplado.toUpperCase() : null,
              ecpIdForInsert,
            ]
          );
          console.log(
            "[DEBUG] Patentes actualizadas en sige_ecp_enccarpor al postular chofer",
            {
              viajeId,
              choferId,
              ECP_PatCamion: patenteChasis,
              ECP_PatAcoplado: relacion.patAcoplado
                ? relacion.patAcoplado.toUpperCase()
                : null,
            }
          );
        } catch (e) {
          console.error(
            "[DEBUG] Error al actualizar patentes en sige_ecp_enccarpor durante postulación:",
            e
          );
          // No abortamos la transacción por esto; la postulación sigue siendo válida.
        }

        // Insertar intermediarios en sige_icp_intcarpor (ya tenemos ecpIdEcp desde arriba)
        try {
          // Determinar orden dinámico para evitar colisiones (hacerlo ANTES de insertar)
          const [ordenRows] = await connection.query<RowDataPacket[]>(
            `SELECT COALESCE(MAX(ICP_Orden), 0) AS maxOrden FROM sige_icp_intcarpor WHERE ECP_IdEcp = ?`,
            [ecpIdForInsert]
          );
          const baseOrden = Number((ordenRows as any)?.[0]?.maxOrden) || 0;
          let currentOrden = baseOrden;

          // Obtener datos del destinatario (tercero del viaje) desde la ECP
          const [ecpDestRows] = await connection.query<RowDataPacket[]>(
            `SELECT TER_IDTerceroEst, TER_RazonSocialTerEst
             FROM sige_ecp_enccarpor
             WHERE ECP_IdEcp = ?
             LIMIT 1`,
            [ecpIdForInsert]
          );

          let destinatarioId: number | null = null;
          let destinatarioNombre: string = "";
          let destinatarioCUIT: string = "";

          if (Array.isArray(ecpDestRows) && ecpDestRows.length > 0) {
            destinatarioId = ecpDestRows[0].TER_IDTerceroEst || null;
            destinatarioNombre = ecpDestRows[0].TER_RazonSocialTerEst || "";

            // Obtener CUIT del destinatario
            if (destinatarioId) {
              const [destCuitRows] = await connection.query<RowDataPacket[]>(
                `SELECT TER_CUITTer FROM sige_ter_tercero WHERE TER_IDTercero = ? LIMIT 1`,
                [destinatarioId]
              );
              if (Array.isArray(destCuitRows) && destCuitRows.length > 0) {
                destinatarioCUIT = destCuitRows[0].TER_CUITTer || "";
              }
            }
          }

          // Obtener datos del chofer (incluyendo email para notificaciones)
          [choferRows] = await connection.query<RowDataPacket[]>(
            `SELECT TER_RazonSocialTer, TER_CUITTer, TER_EMailTer FROM sige_ter_tercero WHERE TER_IDTercero = ? LIMIT 1`,
            [choferId]
          );

          // Obtener datos del transportista
          const [transRows] = await connection.query<RowDataPacket[]>(
            `SELECT TER_RazonSocialTer, TER_CUITTer FROM sige_ter_tercero WHERE TER_IDTercero = ? LIMIT 1`,
            [relacion.transportistaId]
          );

          // 1. Insertar Destinatario (TIC_IdTic = 6) - SIEMPRE primero
          if (destinatarioId) {
            currentOrden += 1;
            try {
              await connection.query(
                `INSERT INTO sige_icp_intcarpor (
                  ECP_IdEcp, TIC_IdTic, ICP_Orden, TIC_DescripcionTic,
                  TER_IDTerceroTic, TER_RazonSocialTerTic, TER_CUITTerTic
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  ecpIdForInsert,
                  6, // TIC_IdTic = 6 para Destinatario
                  currentOrden,
                  "Destinatario",
                  destinatarioId,
                  destinatarioNombre,
                  destinatarioCUIT,
                ]
              );
              console.log(
                "[DEBUG] Destinatario insertado en sige_icp_intcarpor",
                {
                  ecpId: ecpIdForInsert,
                  destinatarioId,
                }
              );
            } catch (icpError: any) {
              if (icpError?.code !== "ER_DUP_ENTRY") {
                console.error(
                  "[DEBUG] Error al insertar destinatario en ICP:",
                  icpError
                );
              }
            }
          }

          // 2. Insertar Transportista (TIC_IdTic = 8)
          if (Array.isArray(transRows) && transRows.length > 0) {
            const transportista = transRows[0];
            currentOrden += 1;
            const ordenTrans = currentOrden;
            try {
              await connection.query(
                `INSERT INTO sige_icp_intcarpor (
                  ECP_IdEcp, TIC_IdTic, ICP_Orden, TIC_DescripcionTic,
                  TER_IDTerceroTic, TER_RazonSocialTerTic, TER_CUITTerTic
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  ecpIdForInsert,
                  8, // TIC_IdTic = 8 para Transportista
                  ordenTrans,
                  "Transportista",
                  relacion.transportistaId,
                  transportista.TER_RazonSocialTer || "",
                  transportista.TER_CUITTer || "",
                ]
              );
              console.log(
                "[DEBUG] Transportista insertado en sige_icp_intcarpor",
                {
                  ecpId: ecpIdForInsert,
                  transportistaId: relacion.transportistaId,
                }
              );
            } catch (icpError: any) {
              if (icpError?.code !== "ER_DUP_ENTRY") {
                console.error(
                  "[DEBUG] Error al insertar transportista en ICP:",
                  icpError
                );
              }
            }
          }

          // 3. Insertar Chofer (TIC_IdTic = 9)
          if (Array.isArray(choferRows) && choferRows.length > 0) {
            const chofer = choferRows[0];
            currentOrden += 1;
            const ordenChofer = currentOrden;
            try {
              await connection.query(
                `INSERT INTO sige_icp_intcarpor (
                  ECP_IdEcp, TIC_IdTic, ICP_Orden, TIC_DescripcionTic,
                  TER_IDTerceroTic, TER_RazonSocialTerTic, TER_CUITTerTic
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  ecpIdForInsert,
                  9, // TIC_IdTic = 9 para Chofer
                  ordenChofer,
                  "Chofer",
                  choferId,
                  chofer.TER_RazonSocialTer || "",
                  chofer.TER_CUITTer || "",
                ]
              );
              console.log("[DEBUG] Chofer insertado en sige_icp_intcarpor", {
                ecpId: ecpIdForInsert,
                choferId,
              });
            } catch (icpError: any) {
              if (icpError?.code !== "ER_DUP_ENTRY") {
                console.error(
                  "[DEBUG] Error al insertar chofer en ICP:",
                  icpError
                );
              }
            }
          }
        } catch (e) {
          console.error(
            "[DEBUG] Error al insertar intermediarios en sige_icp_intcarpor:",
            e
          );
          // No abortamos la transacción por esto
        }

        // ============================================
        // PASO 4: Insertar registro en SIGE_DCP_DetCarPor para este chofer
        // ============================================
        try {
          // Verificar si ya existe un registro DCP para esta ECP
          const [existingDcp] = await connection.query<RowDataPacket[]>(
            `SELECT 1 FROM SIGE_DCP_DetCarPor WHERE ecp_idecp = ? LIMIT 1`,
            [ecpIdForInsert]
          );

          // Solo insertar si NO existe (para evitar duplicados)
          if (!Array.isArray(existingDcp) || existingDcp.length === 0) {
            // Copiar el registro DCP desde la primera ECP del viaje (la ECP original)
            const ecpOriginal = ecpIds[0]; // La primera ECP tiene todos los datos completos

            console.log("[DEBUG] Copiando registro DCP desde ECP original", {
              ecpOriginal,
              ecpNueva: ecpIdForInsert,
            });

            // Copiar TODOS los datos del DCP original a la nueva ECP
            await connection.execute(
              `INSERT INTO SIGE_DCP_DetCarPor (
                ecp_idecp,
                dcp_renglondcp,
                art_idarticulo,
                art_desarticulo,
                dcp_cosecha,
                dcp_pesobruto,
                dcp_pesotara,
                dcp_pesoneto,
                DCP_PesoBrutoDescarga,
                DCP_PesoTaraDescarga,
                DCP_PesoNetoDescarga,
                DEP_IDDeposito
              )
              SELECT
                ?, -- nueva ecp_idecp
                dcp_renglondcp,
                art_idarticulo,
                art_desarticulo,
                dcp_cosecha,
                dcp_pesobruto,
                dcp_pesotara,
                dcp_pesoneto,
                DCP_PesoBrutoDescarga,
                DCP_PesoTaraDescarga,
                DCP_PesoNetoDescarga,
                DEP_IDDeposito
              FROM SIGE_DCP_DetCarPor
              WHERE ecp_idecp = ?
              LIMIT 1`,
              [ecpIdForInsert, ecpOriginal]
            );

            console.log("[DEBUG] Registro DCP copiado exitosamente", {
              ecpOriginal,
              ecpNueva: ecpIdForInsert,
              choferId,
            });
          } else {
            console.log(
              "[DEBUG] DCP ya existe para esta ECP, saltando inserción",
              {
                ecpId: ecpIdForInsert,
              }
            );
          }
        } catch (e) {
          console.error(
            "[DEBUG] Error al copiar registro en SIGE_DCP_DetCarPor:",
            e
          );
          // No abortamos la transacción por esto
        }
      } catch (error: any) {
        const code = typeof error?.code === "string" ? error.code : null;
        if (code === "ER_DUP_ENTRY") {
          await connection.rollback();
          return NextResponse.json(
            { error: "El chofer ya está postulado para este viaje" },
            { status: 409 }
          );
        }
        throw error;
      }

      const postuladosFinales = postuladosActuales + 1;
      const pendientesFinales = Math.max(
        metrics.cupos - metrics.reservados - postuladosFinales,
        0
      );

      if (metrics.tipo === "nuevo") {
        try {
          await connection.query(
            `UPDATE viajes_nuevos
             SET cuposPendientes = ?
             WHERE id = ?`,
            [pendientesFinales, metrics.id]
          );
        } catch (error: any) {
          if (error?.code !== "ER_NO_SUCH_TABLE") {
            throw error;
          }
        }
      } else {
        // Actualizar ENT_CantCuposPend en sige_ent_encnegtra para viajes legacy
        await connection.query(
          `UPDATE sige_ent_encnegtra
           SET ENT_CantCuposPend = ?
           WHERE ENT_IdEnt = ?`,
          [pendientesFinales, metrics.id]
        );
      }

      await connection.commit();

      // PDF de asignación para vendedor (envío adjunto si se solicitó)
      if (sendEmail && vendedorId) {
        try {
          // Buscar email/nombre del vendedor
          const [vRows] = await connection.query<RowDataPacket[]>(
            `SELECT VEN_NomVen, VEN_EMailVen FROM sige_ven_vendedor WHERE VEN_IDVendedor = ? LIMIT 1`,
            [vendedorId]
          );
          if (Array.isArray(vRows) && vRows.length > 0) {
            const rawEmail = vRows[0].VEN_EMailVen as string | null;
            const vendedorNombre = (vRows[0].VEN_NomVen as string) || "Vendedor";
            const fallback = process.env.EMAIL_TEST || process.env.EMAIL_FROM || null;
            const vendedorEmail = rawEmail && rawEmail.includes("@") ? rawEmail : fallback;
            if (vendedorEmail && vendedorEmail.includes("@")) {
              // Datos del viaje para PDF
              const [vInfo] = await connection.query<RowDataPacket[]>(
                `SELECT ENT_Numero AS numero, ENT_Fecha AS fecha, LOC_NomLocalidadOrig AS origen,
                        LOC_NomLocalidadDest AS destino, TER_RazonSocialTer AS razonSocial, ENT_Tarifa AS tarifa
                 FROM sige_ent_encnegtra WHERE ENT_IdEnt = ? LIMIT 1`,
                [viajeId]
              );
              if (Array.isArray(vInfo) && vInfo.length > 0) {
                const viaje = vInfo[0];
                const choferNombre =
                  Array.isArray(choferRows) && choferRows.length > 0
                    ? (choferRows[0].TER_RazonSocialTer as string) || "Chofer"
                    : "Chofer";
                const choferCuit =
                  Array.isArray(choferRows) && choferRows.length > 0
                    ? (choferRows[0].TER_CUITTer as string) || ""
                    : "";

                const { generarPDFAutorizacionAsignacion } = await import("@/lib/pdf-autorizacion");
                const { enviarEmailConPDFAdjunto } = await import("@/lib/email");

                // Intentar completar CUIT y domicilio del proveedor a partir de su razón social
                let proveedorCuit: string | null = null;
                let proveedorDomicilio: string | null = null;
                try {
                  const [provRows] = await connection.query<RowDataPacket[]>(
                    `SELECT TER_CUITTer AS cuit, TER_DireccionTer AS domicilio
                     FROM sige_ter_tercero
                     WHERE UPPER(TER_RazonSocialTer) = UPPER(?)
                     LIMIT 1`,
                    [viaje.razonSocial]
                  );
                  if (Array.isArray(provRows) && provRows.length > 0) {
                    proveedorCuit = (provRows[0].cuit as any) || null;
                    proveedorDomicilio = (provRows[0].domicilio as any) || null;
                  }
                } catch {}

                const pdfBuffer = await generarPDFAutorizacionAsignacion({
                  fecha: (viaje.fecha as any) || new Date().toISOString(),
                  proveedor: (viaje.razonSocial as any) || "",
                  proveedorCuit,
                  proveedorDomicilio,
                  procedencia: (viaje.origen as any) || "",
                  destino: (viaje.destino as any) || "",
                  tarifa: Number(viaje.tarifa ?? 0),
                  transportista: relacion.transportistaNombre || "",
                  transportistaCuit: relacion.transportistaCuit || "",
                  chofer: choferNombre,
                  choferCuit,
                  patChasis: patenteChasis,
                  patAcoplado: relacion.patAcoplado ? relacion.patAcoplado.toUpperCase() : null,
                  intermediarioNombre: process.env.COMPANY_SHORTNAME || "LOGITRACK",
                  intermediarioCuit: process.env.COMPANY_CUIT || undefined,
                });

                const htmlContent = `
                  <div style="font-family: Arial, sans-serif; color: #111">
                    <p>Hola ${vendedorNombre},</p>
                    <p>Adjuntamos la autorización en PDF con el detalle de la asignación para el viaje <strong>#${
                      (viaje.numero as any) || String(viajeId)
                    }</strong>.</p>
                    <p style="color:#666; font-size:12px">Este es un envío automático del sistema.</p>
                  </div>
                `;

                const nombrePDF = `Autorizacion_${(choferNombre || "").replace(/[^a-zA-Z0-9]/g, "_")}_${
                  (viaje.numero as any) || String(viajeId)
                }.pdf`;

                await enviarEmailConPDFAdjunto({
                  to: vendedorEmail,
                  subject: `Autorización de asignación - Viaje #${(viaje.numero as any) || String(viajeId)}`,
                  htmlContent,
                  pdfBuffer,
                  pdfNombre: nombrePDF,
                });
                console.log("[EMAIL] PDF de asignación enviado a:", vendedorEmail, "(vendedorId:", vendedorId, ")");
              }
            } else {
              console.warn("[EMAIL] Vendedor sin email válido y sin fallback configurado");
            }
          }
        } catch (e) {
          console.error("[EMAIL] Error al generar/enviar PDF de asignación:", e);
          // No romper la respuesta principal
        }
      }

      // Enviar email de notificación si está habilitado y el chofer tiene email
      if (sendEmail && vendedorId) {
        try {
          // Obtener email del vendedor
          const [vendedorRows] = await connection.query<RowDataPacket[]>(
            `SELECT VEN_NomVen, VEN_EMailVen FROM sige_ven_vendedor WHERE VEN_IDVendedor = ? LIMIT 1`,
            [vendedorId]
          );

          if (Array.isArray(vendedorRows) && vendedorRows.length > 0) {
            const vendedorEmail = vendedorRows[0].VEN_EMailVen;
            const vendedorNombre = vendedorRows[0].VEN_NomVen || "Vendedor";

            // Envío unificado con PDF se hace más arriba. Evito duplicados aquí.
            if (false && vendedorEmail && vendedorEmail.includes("@")) {
              // Obtener datos completos del viaje para el email
              const [viajeRows] = await connection.query<RowDataPacket[]>(
                `SELECT
                   ENT_Numero AS numero,
                   ENT_Fecha AS fecha,
                   LOC_NomLocalidadOrig AS origen,
                   LOC_NomLocalidadDest AS destino,
                   TER_RazonSocialTer AS razonSocial
                 FROM sige_ent_encnegtra
                 WHERE ENT_IdEnt = ?
                 LIMIT 1`,
                [viajeId]
              );
              if (Array.isArray(viajeRows) && viajeRows.length > 0) {
                const viaje = viajeRows[0];
                const choferNombre =
                  Array.isArray(choferRows) && choferRows.length > 0
                    ? choferRows[0].TER_RazonSocialTer || "Chofer"
                    : "Chofer";

                // Enviar email en segundo plano (no bloqueante)
                enviarEmailVendedorPostulacion({
                  to: vendedorEmail,
                  vendedorNombre,
                  choferNombre,
                  viajeNumero:
                    metrics.numero || viaje.numero || String(viajeId),
                  fecha: viaje.fecha || new Date().toISOString(),
                  origen: viaje.origen || "N/A",
                  destino: viaje.destino || "N/A",
                  razonSocial: viaje.razonSocial || "Cliente",
                  patChasis: patenteChasis,
                  patAcoplado: relacion.patAcoplado
                    ? relacion.patAcoplado.toUpperCase()
                    : null,
                }).catch((error) => {
                  // No fallar la respuesta si el email falla
                  console.error(
                    "[EMAIL] Error al enviar email al vendedor:",
                    error
                  );
                });

                console.log(
                  "[EMAIL] Email de postulación programado para vendedor:",
                  vendedorEmail
                );
              }
            }
          }
        } catch (emailError) {
          // No fallar la respuesta si el email falla
          console.error(
            "[EMAIL] Error al obtener datos del vendedor para email:",
            emailError
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: "Chofer postulado exitosamente",
        data: {
          viajeId,
          transportistaId: relacion.transportistaId,
          patChasis: patenteChasis,
          patAcoplado: relacion.patAcoplado
            ? relacion.patAcoplado.toUpperCase()
            : null,
          postulados: postuladosFinales,
          pendientes: pendientesFinales,
        },
      });
    } catch (error: any) {
      try {
        await connection.rollback();
      } catch {
        // ignore rollback errors
      }
      const status =
        typeof error?.statusCode === "number" ? error.statusCode : 500;
      if (status !== 500) {
        return NextResponse.json(
          { error: error?.message ?? "Error al postular chofer" },
          { status }
        );
      }
      console.error("Error al postular chofer:", error);
      return NextResponse.json(
        { error: "Error al postular chofer" },
        { status: 500 }
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error inesperado al postular chofer:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const viajeId = toInt(searchParams.get("viajeId"));
    const postulacionId = toInt(searchParams.get("id"));
    const choferId = toInt(searchParams.get("choferId"));

    if (!viajeId) {
      return NextResponse.json(
        { error: "viajeId es obligatorio" },
        { status: 400 }
      );
    }

    if (!postulacionId && !choferId) {
      return NextResponse.json(
        {
          error: "Debe indicar el identificador de la postulación o del chofer",
        },
        { status: 400 }
      );
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const metrics = await fetchViajeMetrics(connection, viajeId);

      // Obtener ECPs del viaje
      const [ecpRows]: any = await connection.query(
        `SELECT ECP_IdEcp FROM sige_ecp_enccarpor WHERE ENT_IdEnt = ? ORDER BY ECP_IdEcp`,
        [viajeId]
      );
      if (!Array.isArray(ecpRows) || ecpRows.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: "No se encontró la carta porte para este viaje" },
          { status: 404 }
        );
      }
      const ecpIdEcp = ecpRows[0].ECP_IdEcp;
      const ecpIds: number[] = ecpRows
        .map((r: any) => Number(r.ECP_IdEcp))
        .filter((n: number) => Number.isInteger(n));

      // Buscar la ECP específica de este chofer
      const placeholders = ecpIds.map(() => "?").join(", ");
      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT ECP_IdEcp, TER_IDTerceroTic FROM sige_icp_intcarpor
         WHERE ECP_IdEcp IN (${placeholders}) AND TER_IDTerceroTic = ? AND TIC_IdTic = 9
         LIMIT 1`,
        [...ecpIds, choferId]
      );

      if (!Array.isArray(rows) || rows.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: "Postulación no encontrada" },
          { status: 404 }
        );
      }

      const ecpDelChofer = rows[0].ECP_IdEcp;

      // Validar que esta postulación específica no tenga órdenes de carga asociadas
      // Si existen renglones en SIGE_OCP_OrdCarPor para el ECP del chofer, bloquear eliminación
      const [ocpRows] = await connection.query<RowDataPacket[]>(
        `SELECT 1
         FROM SIGE_OCP_OrdCarPor ocp
         WHERE ocp.ECP_IdEcp = ?
         LIMIT 1`,
        [ecpDelChofer]
      );
      if (Array.isArray(ocpRows) && ocpRows.length > 0) {
        await connection.rollback();
        return NextResponse.json(
          {
            error:
              "No se puede eliminar la postulación: existen órdenes de carga",
          },
          { status: 409 }
        );
      }

      console.log("[DEBUG] Eliminando postulación", {
        viajeId,
        choferId,
        ecpDelChofer,
      });

      // Eliminar TODOS los intermediarios de la ECP de este chofer (destinatario, transportista, chofer)
      await connection.query(
        `DELETE FROM sige_icp_intcarpor
         WHERE ECP_IdEcp = ?`,
        [ecpDelChofer]
      );

      console.log(
        "[DEBUG] Eliminados todos los intermediarios de ECP",
        ecpDelChofer
      );

      // Eliminar registro DCP de esta ECP
      try {
        await connection.query(
          `DELETE FROM SIGE_DCP_DetCarPor
           WHERE ecp_idecp = ?`,
          [ecpDelChofer]
        );
        console.log("[DEBUG] Eliminado registro DCP de ECP", ecpDelChofer);
      } catch (e) {
        console.log(
          "[DEBUG] No se pudo eliminar DCP (puede que no exista):",
          e
        );
      }

      // Si esta ECP NO es la primera del viaje, eliminarla completamente
      const primeraEcp = ecpIds[0];
      if (ecpDelChofer !== primeraEcp) {
        try {
          await connection.query(
            `DELETE FROM sige_ecp_enccarpor
             WHERE ECP_IdEcp = ?`,
            [ecpDelChofer]
          );
          console.log("[DEBUG] Eliminada ECP completa", ecpDelChofer);
        } catch (e) {
          console.log("[DEBUG] No se pudo eliminar ECP:", e);
        }
      }

      // Contar choferes restantes
      const [countRows] = await connection.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM sige_icp_intcarpor
         WHERE ECP_IdEcp IN (${placeholders}) AND TIC_IdTic = 9`,
        ecpIds
      );
      const postuladosRestantes = normalizeNumber(countRows?.[0]?.total);
      const pendientesFinales = Math.max(
        metrics.cupos - metrics.reservados - postuladosRestantes,
        0
      );

      if (metrics.tipo === "nuevo") {
        try {
          await connection.query(
            `UPDATE viajes_nuevos
             SET cuposPendientes = ?
             WHERE id = ?`,
            [pendientesFinales, metrics.id]
          );
        } catch (error: any) {
          if (error?.code !== "ER_NO_SUCH_TABLE") {
            throw error;
          }
        }
      } else {
        // Actualizar ENT_CantCuposPend en sige_ent_encnegtra para viajes legacy
        await connection.query(
          `UPDATE sige_ent_encnegtra
           SET ENT_CantCuposPend = ?
           WHERE ENT_IdEnt = ?`,
          [pendientesFinales, metrics.id]
        );
      }

      await connection.commit();

      return NextResponse.json({
        success: true,
        message: "Postulación eliminada",
        data: {
          viajeId,
          postulados: postuladosRestantes,
          pendientes: pendientesFinales,
        },
      });
    } catch (error: any) {
      try {
        await connection.rollback();
      } catch {
        // ignore rollback errors
      }
      const status =
        typeof error?.statusCode === "number" ? error.statusCode : 500;
      if (status !== 500) {
        return NextResponse.json(
          { error: error?.message ?? "No se pudo eliminar la postulación" },
          { status }
        );
      }
      console.error("Error al eliminar postulación:", error);
      return NextResponse.json(
        { error: "Error al eliminar la postulación" },
        { status: 500 }
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error inesperado al eliminar postulación:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
