import { NextRequest, NextResponse } from "next/server";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { db } from "@/lib/db";
import { obtenerRelacionActivaChofer } from "@/lib/choferes";

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

async function fetchViajeMetrics(connection: PoolConnection, viajeId: number): Promise<ViajeMetrics> {
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

async function ensureVendedorExiste(connection: PoolConnection, vendedorId: number): Promise<void> {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT 1 FROM sige_ven_vendedor WHERE VEN_IDVendedor = ? LIMIT 1`,
    [vendedorId]
  );
  if (!Array.isArray(rows) || rows.length === 0) {
    throw Object.assign(new Error("El vendedor no existe"), { statusCode: 400 });
  }
}

async function ensureChoferExiste(connection: PoolConnection, choferId: number): Promise<void> {
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
        { error: "viajeId y choferId son obligatorios y deben ser enteros válidos" },
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
      const ecpIds: number[] = ecpRows.map((r: any) => Number(r.ECP_IdEcp)).filter((n: number) => Number.isInteger(n));
      const ecpIdEcp = ecpIds[ecpIds.length - 1]; // usar la ECP más reciente

      // Verificar si ESTE MISMO chofer ya está postulado para este viaje
      // (Solo bloqueamos duplicados del mismo chofer, NO otros choferes)
      const placeholders = ecpIds.map(() => '?').join(', ');
      const [dupRows] = await connection.query<RowDataPacket[]>(
        `SELECT 1 FROM sige_icp_intcarpor
         WHERE ECP_IdEcp IN (${placeholders}) AND TER_IDTerceroTic = ? AND TIC_IdTic = 9
         LIMIT 1`,
        [...ecpIds, choferId]
      );
      if (Array.isArray(dupRows) && dupRows.length > 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: "Este chofer ya está postulado para este viaje" },
          { status: 409 }
        );
      }

      // Estrategia: Crear una nueva ECP para CADA chofer nuevo
      // Esto permite tener múltiples choferes por viaje (según cupos disponibles)
      let ecpIdForInsert = ecpIdEcp;

      console.log(`[DEBUG] ===== INICIO ASIGNACIÓN ECP =====`);
      console.log(`[DEBUG] ViajeId: ${viajeId}, ChoferId: ${choferId}`);
      console.log(`[DEBUG] ECPs existentes para este viaje:`, ecpIds);

      // SIEMPRE crear una nueva ECP para cada chofer (excepto si es el primero y la ECP original está vacía)
      const placeholdersCheck = ecpIds.map(() => '?').join(', ');
      const [perEcpCounts] = await connection.query<RowDataPacket[]>(
        `SELECT ECP_IdEcp AS id, COUNT(*) AS total
         FROM sige_icp_intcarpor
         WHERE ECP_IdEcp IN (${placeholdersCheck}) AND TIC_IdTic = 9
         GROUP BY ECP_IdEcp`,
        ecpIds
      );

      console.log(`[DEBUG] Conteo de choferes por ECP:`, perEcpCounts);

      const countsMap = new Map<number, number>(
        (Array.isArray(perEcpCounts) ? perEcpCounts : []).map((r: any) => [Number(r.id ?? r.ECP_IdEcp), Number(r.total) || 0])
      );

      console.log(`[DEBUG] Mapa de conteos:`, Object.fromEntries(countsMap));

      // Buscar una ECP libre (sin choferes asignados)
      const libre = ecpIds.find((id) => (countsMap.get(id) ?? 0) === 0);
      console.log(`[DEBUG] ECP libre encontrada:`, libre);

      if (libre != null) {
        // Usar la ECP libre existente
        ecpIdForInsert = libre;
        console.log(`[DEBUG] Usando ECP libre existente: ${libre}`);
      } else {
        // NO hay ECPs libres, crear una nueva para este chofer
        console.log(`[DEBUG] Todas las ECPs tienen choferes, creando nueva ECP para chofer ${choferId}`);
        try {
          await connection.execute(
            "UPDATE sige_aut_autonum SET AUT_Numero = LAST_INSERT_ID(AUT_Numero + 1) WHERE AUT_Tabla = ?",
            ["sige_ecp_enccarpor"]
          );
          const [rowsEcpNum]: any = await connection.query("SELECT LAST_INSERT_ID() AS numero");
          const newEcpId = Number(rowsEcpNum?.[0]?.numero);
          if (Number.isFinite(newEcpId)) {
            const newNumero = String(newEcpId).padStart(6, "0");

            // Copiar TODOS los datos desde la ECP original (la primera del viaje)
            // Esto garantiza que tenga los mismos datos de localidad/provincia
            const ecpOriginal = ecpIds[0]; // La primera ECP tiene todos los datos completos

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
            console.log(`[DEBUG] Nueva ECP creada: ${newEcpId} copiando datos completos desde ECP original ${ecpOriginal}`);
          }
        } catch (error) {
          console.error('[DEBUG] Error al crear nueva ECP:', error);
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
      const pendientesAntes = metrics.cupos - metrics.reservados - postuladosActuales;

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
        const message = error?.message ?? "No se pudo determinar la relación activa del chofer";
        const status = typeof error?.statusCode === "number" ? error.statusCode : 409;
        return NextResponse.json({ error: message }, { status });
      }

      if (!relacion.relacionActiva) {
        await connection.rollback();
        return NextResponse.json(
          { error: "La relación del chofer con el transportista/vehículo no está activa" },
          { status: 409 }
        );
      }

      const patenteChasis = relacion.patChasis?.toUpperCase();
      if (!patenteChasis) {
        await connection.rollback();
        return NextResponse.json(
          { error: "No se pudo determinar una patente válida para el chofer seleccionado" },
          { status: 409 }
        );
      }

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
          console.log('[DEBUG] Patentes actualizadas en sige_ecp_enccarpor al postular chofer', {
            viajeId,
            choferId,
            ECP_PatCamion: patenteChasis,
            ECP_PatAcoplado: relacion.patAcoplado ? relacion.patAcoplado.toUpperCase() : null,
          });
        } catch (e) {
          console.error('[DEBUG] Error al actualizar patentes en sige_ecp_enccarpor durante postulación:', e);
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

          // Obtener datos del chofer
          const [choferRows] = await connection.query<RowDataPacket[]>(
            `SELECT TER_RazonSocialTer, TER_CUITTer FROM sige_ter_tercero WHERE TER_IDTercero = ? LIMIT 1`,
            [choferId]
          );

          // Obtener datos del transportista
          const [transRows] = await connection.query<RowDataPacket[]>(
            `SELECT TER_RazonSocialTer, TER_CUITTer FROM sige_ter_tercero WHERE TER_IDTercero = ? LIMIT 1`,
            [relacion.transportistaId]
          );

          if (Array.isArray(transRows) && transRows.length > 0) {
            const transportista = transRows[0];
            currentOrden += 1;
            const ordenTrans = currentOrden;

            // Insertar Transportista (TIC_IdTic = 8)
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
              console.log('[DEBUG] Transportista insertado en sige_icp_intcarpor', {
                ecpId: ecpIdForInsert,
                transportistaId: relacion.transportistaId,
              });
            } catch (icpError: any) {
              if (icpError?.code !== "ER_DUP_ENTRY") {
                console.error('[DEBUG] Error al insertar transportista en ICP:', icpError);
              }
            }
          }

          if (Array.isArray(choferRows) && choferRows.length > 0) {
            const chofer = choferRows[0];
            currentOrden += 1;
            const ordenChofer = currentOrden;

            // Insertar Chofer (TIC_IdTic = 9)
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
              console.log('[DEBUG] Chofer insertado en sige_icp_intcarpor', {
                ecpId: ecpIdForInsert,
                choferId,
              });
            } catch (icpError: any) {
              if (icpError?.code !== "ER_DUP_ENTRY") {
                console.error('[DEBUG] Error al insertar chofer en ICP:', icpError);
              }
            }
          }
        } catch (e) {
          console.error('[DEBUG] Error al insertar intermediarios en sige_icp_intcarpor:', e);
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

            console.log('[DEBUG] Copiando registro DCP desde ECP original', {
              ecpOriginal,
              ecpNueva: ecpIdForInsert
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

            console.log('[DEBUG] Registro DCP copiado exitosamente', {
              ecpOriginal,
              ecpNueva: ecpIdForInsert,
              choferId,
            });
          } else {
            console.log('[DEBUG] DCP ya existe para esta ECP, saltando inserción', {
              ecpId: ecpIdForInsert
            });
          }
        } catch (e) {
          console.error('[DEBUG] Error al copiar registro en SIGE_DCP_DetCarPor:', e);
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
      const pendientesFinales = Math.max(metrics.cupos - metrics.reservados - postuladosFinales, 0);

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
        message: "Chofer postulado exitosamente",
        data: {
          viajeId,
          transportistaId: relacion.transportistaId,
          patChasis: patenteChasis,
          patAcoplado: relacion.patAcoplado ? relacion.patAcoplado.toUpperCase() : null,
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
      const status = typeof error?.statusCode === "number" ? error.statusCode : 500;
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
        { error: "Debe indicar el identificador de la postulación o del chofer" },
        { status: 400 }
      );
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Validar que el viaje no tenga órdenes de carga asociadas
      // Si existen renglones en SIGE_OCP_OrdCarPor para el ECP relacionado, bloquear eliminación
      const [ocpRows] = await connection.query<RowDataPacket[]>(
        `SELECT 1
         FROM SIGE_OCP_OrdCarPor ocp
         WHERE ocp.ECP_IdEcp = ?
         LIMIT 1`,
        [viajeId]
      );
      if (Array.isArray(ocpRows) && ocpRows.length > 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: "No se puede eliminar la postulación: existen órdenes de carga" },
          { status: 409 }
        );
      }

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

      // Verificar que el chofer esté postulado (TIC_IdTic = 9)
      const placeholders = ecpIds.map(() => '?').join(', ');
      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT ICP_IDIcp, TER_IDTerceroTic FROM sige_icp_intcarpor
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

      // Eliminar chofer de intermediarios (TIC_IdTic = 9)
      await connection.query(
        `DELETE FROM sige_icp_intcarpor
         WHERE ECP_IdEcp IN (${placeholders}) AND TER_IDTerceroTic = ? AND TIC_IdTic = 9`,
        [...ecpIds, choferId]
      );

      // También eliminar el transportista asociado (TIC_IdTic = 8) si existe
      try {
        await connection.query(
          `DELETE FROM sige_icp_intcarpor
           WHERE ECP_IdEcp = ? AND TIC_IdTic = 8
           LIMIT 1`,
          [ecpIdEcp]
        );
      } catch (e) {
        // No es crítico si no existe transportista
        console.log('[DEBUG] No se eliminó transportista (puede que no exista)');
      }

      // Contar choferes restantes
      const [countRows] = await connection.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM sige_icp_intcarpor
         WHERE ECP_IdEcp IN (${placeholders}) AND TIC_IdTic = 9`,
        ecpIds
      );
      const postuladosRestantes = normalizeNumber(countRows?.[0]?.total);
      const pendientesFinales = Math.max(metrics.cupos - metrics.reservados - postuladosRestantes, 0);

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
      const status = typeof error?.statusCode === "number" ? error.statusCode : 500;
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
