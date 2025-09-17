import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const viajeId = Number(body?.viajeId);
    const transportistaId = Number(body?.transportistaId);
    const choferId = Number(body?.choferId);
    const vendedorId = body?.vendedorId ? Number(body.vendedorId) : null;
    const patChasis = body?.patChasis || null;
    const patAcoplado = body?.patAcoplado || null;
    const sendEmail = Boolean(body?.sendEmail);

    if (!Number.isInteger(viajeId) || !Number.isInteger(transportistaId) || !Number.isInteger(choferId)) {
      return NextResponse.json(
        { error: "viajeId, transportistaId y choferId deben ser enteros validos" },
        { status: 400 }
      );
    }

    // 1) Verificar viaje - buscar en tabla nueva o legacy
    let viajeEncontrado = false;

    try {
      // Intentar tabla nueva primero
      const [viajeRows]: any = await db.query(
        "SELECT 1 FROM viajes_nuevos WHERE id = ? LIMIT 1",
        [viajeId]
      );
      viajeEncontrado = Array.isArray(viajeRows) && viajeRows.length > 0;
    } catch (error) {
      // Ignoramos el error y continuamos con la tabla legacy
    }

    if (!viajeEncontrado) {
      // Buscar en tabla legacy
      const [viajeRowsLegacy]: any = await db.query(
        "SELECT 1 FROM sige_ent_encnegtra WHERE ENT_IdEnt = ? LIMIT 1",
        [viajeId]
      );
      viajeEncontrado = Array.isArray(viajeRowsLegacy) && viajeRowsLegacy.length > 0;
    }

    if (!viajeEncontrado) {
      return NextResponse.json(
        { error: "Viaje no encontrado" },
        { status: 404 }
      );
    }

    // 2) Verificar transportista
    const [transportistaRows]: any = await db.query(
      "SELECT 1 FROM sige_tra_transport WHERE TRA_IDTransporte = ? LIMIT 1",
      [transportistaId]
    );
    if (!Array.isArray(transportistaRows) || transportistaRows.length === 0) {
      return NextResponse.json(
        { error: "Transportista no encontrado" },
        { status: 404 }
      );
    }

    // 3) Verificar chofer
    const [choferRows]: any = await db.query(
      "SELECT 1 FROM sige_ter_tercero WHERE TER_IDTercero = ? LIMIT 1",
      [choferId]
    );
    if (!Array.isArray(choferRows) || choferRows.length === 0) {
      return NextResponse.json(
        { error: "Chofer no encontrado" },
        { status: 404 }
      );
    }

    // 4) Insertar relacion - probar diferentes estructuras de tabla

    let result: any;
    let created = false;

    // Intento 1: sin transportista_id
    try {
      [result] = await db.query(
        `INSERT INTO viajes_choferes
         (viaje_id, chofer_id, vendedor_id, pat_chasis, pat_acoplado, send_email)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [viajeId, choferId, vendedorId, patChasis, patAcoplado, sendEmail ? 1 : 0]
      );
      created = result?.affectedRows > 0;

    } catch (firstError) {
      const firstErrorMessage = firstError instanceof Error ? firstError.message : String(firstError);

      // Intento 2: con transporte_id
      try {
        [result] = await db.query(
          `INSERT INTO viajes_choferes
           (viaje_id, transporte_id, chofer_id, vendedor_id, pat_chasis, pat_acoplado, send_email)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [viajeId, transportistaId, choferId, vendedorId, patChasis, patAcoplado, sendEmail ? 1 : 0]
        );
        created = result?.affectedRows > 0;

      } catch (secondError) {
        const secondErrorMessage = secondError instanceof Error ? secondError.message : String(secondError);
        throw new Error(`No se pudo insertar en viajes_choferes. Errores: ${firstErrorMessage} | ${secondErrorMessage}`);
      }
    }

    return NextResponse.json({
      success: true,
      created,
      message: created
        ? "Chofer postulado exitosamente"
        : "El chofer ya estaba postulado a este viaje",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
