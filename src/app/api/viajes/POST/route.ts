import { db } from "../../../../lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const {
      razonSocial,
      origen,
      destino,
      articulo,
      equipo,
      cupos,
      cuposReservados,
      cuposPendientes,
      tarifa,
      vendedor,
      proveedorId,
    } = data;

    // Generar fecha automáticamente en el servidor
    const fechaActual = new Date();
    const fechaSQL = fechaActual.toISOString().slice(0, 19).replace('T', ' ');

    // Generar número de viaje automáticamente
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const numero = `${timestamp}${random}`;

    // Obtener nombre del proveedor si se proporciona ID
    let proveedorNombre = null;
    if (proveedorId) {
      const [proveedorResult] = await db.query(
        'SELECT TER_RazonSocialTer FROM sige_ter_tercero WHERE TER_IDTercero = ?',
        [proveedorId]
      ) as unknown as [any[]];
      proveedorNombre = proveedorResult[0]?.TER_RazonSocialTer || null;
    }

    await db.query(
      `INSERT INTO viajes_nuevos (
        fecha, numero, razonSocial, origen, destino,
        articulo, equipo, cupos, cuposReservados,
        cuposPendientes, tarifa, vendedor, proveedorId, proveedorNombre
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fechaSQL,
        numero,
        razonSocial,
        origen,
        destino,
        articulo,
        equipo,
        cupos,
        cuposReservados,
        cuposPendientes,
        tarifa,
        vendedor,
        proveedorId || null,
        proveedorNombre,
      ]
    );

    return NextResponse.json({ message: "Viaje guardado con éxito" });
  } catch (error) {
    console.error("Error al guardar el viaje:", error);
    return NextResponse.json(
      { error: "Error al guardar el viaje" },
      { status: 500 }
    );
  }
}
