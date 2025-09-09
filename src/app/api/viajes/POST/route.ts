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

    // Insertar directamente en sige_ent_encnegtra
    // ENT_IdEnt será auto-increment y el trigger se encargará de ENT_Numero
    await db.query(
      `INSERT INTO sige_ent_encnegtra (
        ENT_Fecha,
        TER_RazonSocialTer,
        LOC_NomLocalidadOrig,
        LOC_NomLocalidadDest,
        TVP_Caracteristicas,
        EQU_IDEquipo,
        ENT_CantCupos,
        ENT_CantCuposReser,
        ENT_CantCuposPend,
        ENT_Tarifa,
        VEN_IdVendedor,
        TER_IdTercero,
        USU_IdUsuario
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fechaSQL,
        razonSocial,
        origen,
        destino,
        articulo,
        0, // EQU_IDEquipo por defecto
        cuposNum,
        reservadosNum,
        pendientesNum,
        tarifaNum,
        vendedor ? parseInt(vendedor) : null,
        proveedorId ? parseInt(proveedorId) : null,
        1 // USU_IdUsuario por defecto
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
