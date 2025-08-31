import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const {
      razonSocial,
      origen,
      destino,
      articulo,
      // equipo,
      cupos,
      cuposReservados,
      cuposPendientes,
      tarifa,
      vendedor,
      proveedorId,
    } = data;

    // Aceptar también nombres usados por el formulario (reservados/pendientes)
    const reservadosIn = data?.reservados ?? cuposReservados ?? null;
    const pendientesIn = data?.pendientes ?? cuposPendientes ?? null;

    // Normalizar tipos numéricos (el formulario envía strings)
    const toNumber = (v: any): number | null => {
      if (v == null) return null;
      const s = String(v).trim().replace(',', '.');
      if (s === '') return null;
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    };

    const cuposNum = toNumber(cupos);
    const reservadosNum = toNumber(reservadosIn);
    // Calcular pendientes (no se debe ingresar manualmente)
    const pendientesNumRaw = (cuposNum ?? 0) - (reservadosNum ?? 0);
    const pendientesNum = Number.isFinite(pendientesNumRaw) ? pendientesNumRaw : null;
    const tarifaNum = toNumber(tarifa);

    // Validaciones mínimas para facilitar el diagnóstico en el cliente
    const errores: string[] = [];
    if (!razonSocial) errores.push('Falta razonSocial');
    if (!origen) errores.push('Falta origen');
    if (!destino) errores.push('Falta destino');
    if (!articulo) errores.push('Falta articulo');
    if (cupos != null && toNumber(cupos) === null && String(cupos).trim() !== '') errores.push('Cupos inválido');
    if (reservadosIn != null && toNumber(reservadosIn) === null && String(reservadosIn).trim() !== '') errores.push('Reservados inválido');
    if (tarifa != null && toNumber(tarifa) === null && String(tarifa).trim() !== '') errores.push('Tarifa inválida');

    if (errores.length) {
      return NextResponse.json({ error: 'Datos inválidos', detalles: errores }, { status: 400 });
    }

    const fechaActual = new Date();
    const fechaSQL = fechaActual.toISOString().slice(0, 19).replace("T", " ");

    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    const numero = `${timestamp}${random}`;

    let proveedorNombre = null as string | null;
    if (proveedorId) {
      const [proveedorResult] = (await db.query(
        "SELECT TER_RazonSocialTer FROM sige_ter_tercero WHERE TER_IDTercero = ?",
        [proveedorId]
      )) as unknown as [any[]];
      proveedorNombre = proveedorResult[0]?.TER_RazonSocialTer || null;
    }

    // Asegurar que la tabla exista (idempotente)
    await db.query(`
      CREATE TABLE IF NOT EXISTS viajes_nuevos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fecha DATETIME NOT NULL,
        numero VARCHAR(32) NOT NULL,
        razonSocial VARCHAR(255) NOT NULL,
        origen VARCHAR(255),
        destino VARCHAR(255),
        articulo VARCHAR(255),
        equipo VARCHAR(255),
        cupos INT,
        cuposReservados INT,
        cuposPendientes INT,
        tarifa DECIMAL(12,2),
        vendedor VARCHAR(255),
        proveedorId INT NULL,
        proveedorNombre VARCHAR(255) NULL,
        INDEX idx_fecha (fecha),
        INDEX idx_numero (numero)
      );
    `);

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
        '0',
        cuposNum,
        reservadosNum,
        pendientesNum,
        tarifaNum,
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
