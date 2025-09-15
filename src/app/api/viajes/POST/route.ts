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
      cupos,
      cuposReservados,
      cuposPendientes,
      tarifa,
      vendedor,
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

    // 1) Intentar crear en tabla nueva (viajes_nuevos) usando numerador sige_aut_autonum
    let canUseNewTable = true;
    try {
      await db.query("SELECT 1 FROM viajes_nuevos LIMIT 1");
    } catch (probeErr: any) {
      if (probeErr?.code === 'ER_NO_SUCH_TABLE' || probeErr?.code === 'ER_TABLEACCESS_DENIED_ERROR' || probeErr?.code === 'ER_DBACCESS_DENIED_ERROR') {
        canUseNewTable = false;
      } else {
        throw probeErr; // otros errores deben exponerse
      }
    }

    if (canUseNewTable) {
      // Obtener el siguiente número de manera atómica y en la misma conexión
      const conn = await (db as any).getConnection();
      try {
        const [upd]: any = await conn.execute(
          "UPDATE sige_aut_autonum SET AUT_Numero = LAST_INSERT_ID(AUT_Numero + 1) WHERE AUT_Tabla = ?",
          ['sige_ent_encnegtra']
        );
        // Si no hay fila afectada, no existe el numerador configurado
        if (!upd || upd.affectedRows === 0) {
          return NextResponse.json({ error: 'No existe numerador para sige_ent_encnegtra' }, { status: 400 });
        }
        const [rowsNum]: any = await conn.query("SELECT LAST_INSERT_ID() AS numero");
        const nextNumero = rowsNum?.[0]?.numero;
        if (!nextNumero && nextNumero !== 0) {
          return NextResponse.json({ error: 'No se pudo obtener el próximo número' }, { status: 400 });
        }
        const numeroStr = String(nextNumero);

        const [result] = await conn.execute(
          `INSERT INTO viajes_nuevos (
            fecha, numero, razonSocial, origen, destino, articulo, equipo,
            cupos, cuposReservados, cuposPendientes, tarifa, vendedor
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            fechaSQL,
            numeroStr,
            razonSocial,
            origen,
            destino,
            articulo,
            '0', // equipo (no usado por ahora)
            cuposNum,
            reservadosNum,
            pendientesNum,
            tarifaNum,
            vendedor ? String(vendedor) : null,
          ]
        );
        conn.release();
        return NextResponse.json({ message: "Viaje guardado con éxito", id: (result as any)?.insertId, numero: numeroStr });
      } catch (err) {
        try { conn.release(); } catch {}
        // Si falla por tabla inexistente, caer a viejo; otros errores propagar
        if ((err as any)?.code !== 'ER_NO_SUCH_TABLE') {
          throw err;
        }
      }
    }

    // 2) Fallback: Insertar en tabla vieja (sige_ent_encnegtra)
    const [insertOld] = await db.execute(
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
        VEN_IdVendPostula,
        USU_IdUsuario
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fechaSQL,
        razonSocial,
        origen,
        destino,
        articulo,
        1, // EQU_IDEquipo - usar ID válido
        cuposNum,
        reservadosNum,
        pendientesNum,
        tarifaNum,
        (() => {
          if (!vendedor) return null;
          const vendedorNum = parseInt(vendedor);
          return !isNaN(vendedorNum) ? vendedorNum : null;
        })(),
        1 // USU_IdUsuario - usar ID válido
      ]
    );

    // Obtener ENT_Numero asignado al registro insertado
    const insertId = (insertOld as any)?.insertId;
    let numeroOld: string | null = null;
    if (insertId) {
      const [rowsNum] = (await db.query(
        `SELECT ENT_Numero AS numero FROM sige_ent_encnegtra WHERE ENT_IdEnt = ?`,
        [insertId]
      )) as unknown as [Array<{ numero: string }>, any];
      numeroOld = rowsNum?.[0]?.numero ?? null;
    }

    return NextResponse.json({ message: "Viaje guardado con éxito", id: insertId, numero: numeroOld });
  } catch (error) {
    console.error("Error al guardar el viaje:", error);
    return NextResponse.json(
      { error: "Error al guardar el viaje", details: (error as any)?.message },
      { status: 500 }
    );
  }
}
