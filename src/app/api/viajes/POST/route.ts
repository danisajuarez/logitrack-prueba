import { db } from "../../../../lib/db";
import { NextRequest, NextResponse } from "next/server";

// 🔧 Convierte "DD/MM/YYYY" → "YYYY-MM-DD"
function convertirFecha(fecha: string): string {
  const [dia, mes, anio] = fecha.split("/");
  return `${anio}-${mes}-${dia}`;
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const {
      fecha,
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
    } = data;

    const fechaSQL = convertirFecha(fecha);

    await db.query(
      `INSERT INTO viajes_nuevos (
        fecha, numero, razonSocial, origen, destino,
        articulo, equipo, cupos, cuposReservados,
        cuposPendientes, tarifa, vendedor
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
