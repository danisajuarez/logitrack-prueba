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

      const [dupRows] = await connection.query<RowDataPacket[]>(
        `SELECT 1 FROM viajes_choferes WHERE viaje_id = ? AND chofer_id = ? LIMIT 1`,
        [viajeId, choferId]
      );
      if (Array.isArray(dupRows) && dupRows.length > 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: "El chofer ya está postulado para este viaje" },
          { status: 409 }
        );
      }

      const [countRows] = await connection.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM viajes_choferes WHERE viaje_id = ?`,
        [viajeId]
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
        await connection.query(
          `INSERT INTO viajes_choferes
             (viaje_id, chofer_id, vendedor_id, pat_chasis, pat_acoplado, send_email)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            viajeId,
            choferId,
            vendedorId,
            patenteChasis,
            relacion.patAcoplado ? relacion.patAcoplado.toUpperCase() : null,
            sendEmail ? 1 : 0,
          ]
        );
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

      const metrics = await fetchViajeMetrics(connection, viajeId);

      let whereClause: string;
      let params: any[];

      if (postulacionId) {
        whereClause = "id = ? AND viaje_id = ?";
        params = [postulacionId, viajeId];
      } else {
        whereClause = "viaje_id = ? AND chofer_id = ?";
        params = [viajeId, choferId];
      }

      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT id, viaje_id, chofer_id FROM viajes_choferes WHERE ${whereClause} LIMIT 1`,
        params
      );

      if (!Array.isArray(rows) || rows.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: "Postulación no encontrada" },
          { status: 404 }
        );
      }

      await connection.query(
        `DELETE FROM viajes_choferes WHERE ${whereClause} LIMIT 1`,
        params
      );

      const [countRows] = await connection.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM viajes_choferes WHERE viaje_id = ?`,
        [viajeId]
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
