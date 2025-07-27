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

    // Intentar actualizar en la tabla nueva primero (por ID)
    if (!isNaN(Number(identifier))) {
      try {
        // Obtener nombre del proveedor si se proporciona ID
        let proveedorNombre = null;
        if (proveedorId) {
          const [proveedorResult] = await db.query(
            'SELECT TER_RazonSocialTer FROM sige_ter_tercero WHERE TER_IDTercero = ?',
            [proveedorId]
          ) as unknown as [any[]];
          proveedorNombre = proveedorResult[0]?.TER_RazonSocialTer || null;
        }

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
            pendientes,
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

    // Si no se pudo actualizar en tabla nueva, actualizar en tabla vieja (por numero)
    // Nota: La tabla vieja tiene estructura compleja, por ahora solo permitimos editar ciertos campos
    // No actualizamos la fecha en la tabla vieja para mantener la fecha original
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