import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const identifier = id;
    
    // Intentar eliminar de la tabla nueva primero (por ID)
    if (!isNaN(Number(identifier))) {
      const [result] = await db.execute("DELETE FROM viajes_nuevos WHERE id = ?", [identifier]);
      if ((result as any).affectedRows > 0) {
        return NextResponse.json({ message: "Viaje eliminado correctamente" });
      }
    }
    
    // Si no se encontró por ID, intentar eliminar de la tabla vieja (por numero)
    const [result] = await db.execute(
      "DELETE FROM sige_ent_encnegtra WHERE ENT_Numero = ?", 
      [identifier]
    );
    
    if ((result as any).affectedRows > 0) {
      return NextResponse.json({ message: "Viaje eliminado correctamente" });
    } else {
      return NextResponse.json(
        { error: "Viaje no encontrado" },
        { status: 404 }
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const identifier = id;
    const body = await request.json();
    
    const {
      fecha,
      numero,
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

    // Intentar actualizar en la tabla nueva primero (por ID)
    if (!isNaN(Number(identifier))) {
      try {
        const [result] = await db.execute(
          `UPDATE viajes_nuevos SET
            fecha = ?, numero = ?, razonSocial = ?, origen = ?, destino = ?,
            articulo = ?, equipo = ?, cupos = ?, cuposReservados = ?,
            cuposPendientes = ?, tarifa = ?, vendedor = ?
          WHERE id = ?`,
          [
            fecha,
            numero,
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

    // Si no se pudo actualizar en tabla nueva, actualizar en tabla vieja (por numero)
    // Nota: La tabla vieja tiene estructura compleja, por ahora solo permitimos editar ciertos campos
    const [result] = await db.execute(
      `UPDATE sige_ent_encnegtra SET
        ENT_Fecha = ?, ENT_CantCupos = ?, ENT_CantCuposReser = ?,
        ENT_CantCuposPend = ?, ENT_Tarifa = ?
      WHERE ENT_Numero = ?`,
      [fecha, cupos, reservados, pendientes, tarifa, identifier]
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