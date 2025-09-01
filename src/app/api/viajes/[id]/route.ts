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

    if (!isNaN(Number(identifier))) {
      // Solo permitir eliminar si no tiene reservados
      const [result] = await db.execute(
        "DELETE FROM viajes_nuevos WHERE id = ? AND COALESCE(cuposReservados,0) = 0",
        [identifier]
      );
      if ((result as any).affectedRows > 0) {
        return NextResponse.json({ message: "Viaje eliminado correctamente" });
      }
    }

    // Para viajes de la tabla vieja: sólo si no tienen reservados
    const [result] = await db.execute(
      "DELETE FROM sige_ent_encnegtra WHERE ENT_Numero = ? AND IFNULL(ENT_CantCuposReser,0) = 0",
      [identifier]
    );

    if ((result as any).affectedRows > 0) {
      return NextResponse.json({ message: "Viaje eliminado correctamente" });
    } else {
      return NextResponse.json(
        { error: "No se puede eliminar: tiene reservas o no existe" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error al eliminar viaje:", error);
    return NextResponse.json(
      { error: "Error al eliminar el viaje" },
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
      proveedorId,
    } = body;

    if (!isNaN(Number(identifier))) {
      try {
        let proveedorNombre = null as string | null;
        if (proveedorId) {
          const [proveedorResult] = (await db.query(
            "SELECT TER_RazonSocialTer FROM sige_ter_tercero WHERE TER_IDTercero = ?",
            [proveedorId]
          )) as unknown as [any[]];
          proveedorNombre = proveedorResult[0]?.TER_RazonSocialTer || null;
        }

        // Calcular pendientes si no viene informado
        const pendientesCalc =
          (cupos != null ? Number(cupos) : 0) - (reservados != null ? Number(reservados) : 0);

        const [result] = await db.execute(
          `UPDATE viajes_nuevos SET
            razonSocial = ?, origen = ?, destino = ?,
            articulo = ?, equipo = ?, cupos = ?, cuposReservados = ?,
            cuposPendientes = ?, tarifa = ?, vendedor = ?, proveedorId = ?, proveedorNombre = ?
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
            proveedorId || null,
            proveedorNombre,
            identifier,
          ]
        );

        if ((result as any).affectedRows > 0) {
          return NextResponse.json({ message: "Viaje actualizado correctamente" });
        }
      } catch (err) {
        console.log("No se pudo actualizar en tabla nueva, intentando tabla vieja");
      }
    }

    const [result] = await db.execute(
      `UPDATE sige_ent_encnegtra SET
        ENT_CantCupos = ?, ENT_CantCuposReser = ?,
        ENT_CantCuposPend = ?, ENT_Tarifa = ?
      WHERE ENT_Numero = ?`,
      [cupos, reservados, pendientes, tarifa, identifier]
    );

    if ((result as any).affectedRows > 0) {
      return NextResponse.json({ message: "Viaje actualizado correctamente (campos limitados)" });
    } else {
      return NextResponse.json(
        { error: "Viaje no encontrado" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error al actualizar viaje:", error);
    return NextResponse.json(
      { error: "Error al actualizar el viaje" },
      { status: 500 }
    );
  }
}
