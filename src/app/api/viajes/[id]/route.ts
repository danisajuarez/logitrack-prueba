import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const identifier = id;
    const idNum = Number(identifier);
    const isNumeric = !Number.isNaN(idNum);

    // 1) Intentar borrar en tabla nueva por id (si existe)
    if (isNumeric) {
      try {
        const [delNew] = await db.execute(
          "DELETE FROM viajes_nuevos WHERE id = ? AND COALESCE(cuposReservados,0) = 0",
          [idNum]
        );
        if ((delNew as any).affectedRows > 0) {
          return NextResponse.json({ message: "Viaje eliminado correctamente" });
        }
      } catch (err: any) {
        // Si la tabla no existe, continuar con la siguiente opción
        if (err?.code !== "ER_NO_SUCH_TABLE") {
          throw err;
        }
        console.log("Tabla viajes_nuevos no existe, intentando tabla principal");
      }
    }

    // 2) Intentar borrar en tabla vieja por ENT_IdEnt si es numérico
    if (isNumeric) {
      const [delOldById] = await db.execute(
        "DELETE FROM sige_ent_encnegtra WHERE ENT_IdEnt = ? AND IFNULL(ENT_CantCuposReser,0) = 0",
        [idNum]
      );
      if ((delOldById as any).affectedRows > 0) {
        return NextResponse.json({ message: "Viaje eliminado correctamente" });
      }
    }

    // 3) Último intento: borrar por ENT_Numero
    const [delOldByNumero] = await db.execute(
      "DELETE FROM sige_ent_encnegtra WHERE ENT_Numero = ? AND IFNULL(ENT_CantCuposReser,0) = 0",
      [identifier]
    );

    if ((delOldByNumero as any).affectedRows > 0) {
      return NextResponse.json({ message: "Viaje eliminado correctamente" });
    }

    return NextResponse.json(
      { error: "No se puede eliminar: tiene reservas o no existe" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error al eliminar viaje:", error);
    return NextResponse.json(
      {
        error: "Error al eliminar el viaje",
        details: error?.message || String(error),
        code: error?.code || "UNKNOWN"
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const identifier = id;
    const idNum = Number(identifier);
    const isNumeric = !Number.isNaN(idNum);
    const body = await request.json();

    const {
      razonSocial,
      origen,
      destino,
      articulo,
      equipo,
      cupos,
      reservados,
      pendientes,
      tarifa,
      vendedor,
    } = body;

    // Validaciones de negocio
    const cuposNum = cupos != null ? Number(cupos) : 0;
    const reservadosNum = reservados != null ? Number(reservados) : 0;
    const tarifaNum = tarifa != null ? Number(tarifa) : 0;

    if (tarifaNum < 0) {
      return NextResponse.json(
        { error: "La tarifa no puede ser negativa" },
        { status: 400 }
      );
    }

    if (cuposNum <= 0) {
      return NextResponse.json(
        { error: "Los cupos deben ser mayor a 0" },
        { status: 400 }
      );
    }

    if (reservadosNum > cuposNum) {
      return NextResponse.json(
        { error: "Los cupos reservados no pueden ser mayores que los cupos totales" },
        { status: 400 }
      );
    }

    // Calcular pendientes si no viene informado
    const pendientesCalc = cuposNum - reservadosNum;

    // 1) Intentar actualizar en tabla nueva por id
    if (isNumeric) {
      try {
        const [updNew] = await db.execute(
          `UPDATE viajes_nuevos SET
            razonSocial = ?, origen = ?, destino = ?,
            articulo = ?, equipo = ?, cupos = ?, cuposReservados = ?,
            cuposPendientes = ?, tarifa = ?, vendedor = ?
          WHERE id = ?`,
          [
            razonSocial,
            origen,
            destino,
            articulo,
            equipo,
            cupos,
            reservados,
            pendientes != null ? pendientes : pendientesCalc,
            tarifa,
            vendedor,
            idNum,
          ]
        );
        if ((updNew as any).affectedRows > 0) {
          return NextResponse.json({ message: "Viaje actualizado correctamente" });
        }
      } catch (err) {
        console.log("No se pudo actualizar en tabla nueva, intentando tabla vieja");
      }
    }

    // 2) Actualizar en tabla vieja por ENT_IdEnt si es numérico; caso contrario por ENT_Numero
    const whereColumn = isNumeric ? "ENT_IdEnt" : "ENT_Numero";
    const whereValue: any = isNumeric ? idNum : identifier;

    // Intentar actualizar todos los campos disponibles
    const [updOld] = await db.execute(
      `UPDATE sige_ent_encnegtra SET
        TER_RazonSocialTer = ?,
        LOC_NomLocalidadOrig = ?,
        LOC_NomLocalidadDest = ?,
        TVP_Caracteristicas = ?,
        ENT_CantCupos = ?,
        ENT_CantCuposReser = ?,
        ENT_CantCuposPend = ?,
        ENT_Tarifa = ?,
        VEN_IdVendPostula = ?
      WHERE ${whereColumn} = ?`,
      [
        razonSocial,
        origen,
        destino,
        articulo,
        cupos,
        reservados,
        pendientes != null ? pendientes : pendientesCalc,
        tarifa,
        vendedor ? parseInt(vendedor) : null,
        whereValue,
      ]
    );

    if ((updOld as any).affectedRows > 0) {
      return NextResponse.json({ message: "Viaje actualizado correctamente" });
    }

    return NextResponse.json(
      { error: "Viaje no encontrado" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error al actualizar viaje:", error);
    return NextResponse.json(
      { error: "Error al actualizar el viaje", details: (error as any)?.message },
      { status: 500 }
    );
  }
}

