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
      // Primero verificar que el viaje no tenga reservas
      const [viajeCheck] = await db.execute(
        "SELECT ENT_CantCuposReser FROM sige_ent_encnegtra WHERE ENT_IdEnt = ?",
        [idNum]
      );

      if ((viajeCheck as any[]).length === 0) {
        // El viaje no existe, continuar para intentar por número
      } else {
        const reservas = (viajeCheck as any[])[0].ENT_CantCuposReser || 0;
        if (reservas > 0) {
          return NextResponse.json(
            { error: "No se puede eliminar: el viaje tiene reservas activas" },
            { status: 400 }
          );
        }

        // Verificar si hay postulaciones/autorizaciones activas con detalles
        const [autorizacionesConDetalles] = await db.execute(
          `SELECT COUNT(*) as total
           FROM sige_ecp_enccarpor ecp
           INNER JOIN sige_icp_intcarpor icp ON ecp.ECP_IdEcp = icp.ECP_IdEcp
           WHERE ecp.ENT_IdEnt = ?`,
          [idNum]
        );

        const tienePostulaciones = (autorizacionesConDetalles as any[])[0].total > 0;
        if (tienePostulaciones) {
          return NextResponse.json(
            { error: "No se puede eliminar: el viaje tiene choferes postulados. Elimine las postulaciones primero." },
            { status: 400 }
          );
        }

        // Si llegamos aquí, solo hay autorizaciones huérfanas (sin detalles), las podemos eliminar
        try {
          // Buscar autorizaciones huérfanas del viaje (solo cabeceras, sin detalles)
          const [autorizaciones] = await db.execute(
            "SELECT ECP_IdEcp FROM sige_ecp_enccarpor WHERE ENT_IdEnt = ?",
            [idNum]
          );

          // Eliminar cabeceras de autorizaciones huérfanas
          await db.execute(
            "DELETE FROM sige_ecp_enccarpor WHERE ENT_IdEnt = ?",
            [idNum]
          );
        } catch (err: any) {
          console.error("Error al eliminar autorizaciones huérfanas:", err);
          // Continuar con la eliminación del viaje aunque falle la limpieza de autorizaciones
        }

        // Ahora eliminar el viaje
        const [delOldById] = await db.execute(
          "DELETE FROM sige_ent_encnegtra WHERE ENT_IdEnt = ?",
          [idNum]
        );
        if ((delOldById as any).affectedRows > 0) {
          return NextResponse.json({ message: "Viaje eliminado correctamente" });
        }
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
      { error: "No se puede eliminar: el viaje tiene reservas, postulaciones activas, o no existe" },
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
      tarifaTransportista,
      tolerancia,
      vendedor,
    } = body;

    // Validaciones de negocio
    const cuposNum = cupos != null ? Number(cupos) : 0;
    const reservadosNum = reservados != null ? Number(reservados) : 0;
    const tarifaNum = tarifa != null ? Number(tarifa) : 0;
    const tarifaTransNum = tarifaTransportista != null ? Number(tarifaTransportista) : 0;
    const toleranciaNum = tolerancia != null ? Number(tolerancia) : 0;

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

    // Intentar actualizar todos los campos disponibles en la tabla principal
    const [updOld] = await db.execute(
      `UPDATE sige_ent_encnegtra SET
        TER_RazonSocialTer = ?,
        LOC_NomLocalidadOrig = ?,
        LOC_NomLocalidadDest = ?,
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
        cupos,
        reservados,
        pendientes != null ? pendientes : pendientesCalc,
        tarifa,
        vendedor ? parseInt(vendedor) : null,
        whereValue,
      ]
    );

    if ((updOld as any).affectedRows > 0) {
      // Actualizar el artículo en la tabla de detalles si existe
      if (articulo) {
        try {
          await db.execute(
            `UPDATE sige_dnt_detnegtra
             SET art_desarticulo = ?
             WHERE ent_ident = ? AND dnt_renglondcp = 1`,
            [articulo, whereValue]
          );
        } catch (artErr: any) {
          console.error("Error al actualizar artículo en detalles:", artErr);
          // No fallar si no existe el detalle
        }
      }

      // También actualizar campos relacionados en las autorizaciones (sige_ecp_enccarpor)
      try {
        await db.execute(
          `UPDATE sige_ecp_enccarpor SET
            TER_RazonSocialTerEst = ?,
            LOC_NomLocalidadEst = ?,
            LOC_NomLocalidadGran = ?,
            ECP_Tarifa = ?,
            ECP_TarifaTrans = ?,
            ENT_Tolerancia = ?
          WHERE ENT_IdEnt = ?`,
          [razonSocial, origen, destino, tarifa, tarifaTransNum, toleranciaNum, whereValue]
        );
      } catch (authErr: any) {
        console.error("Error al actualizar autorizaciones relacionadas:", authErr);
      }

      try {
        await db.execute(
          `UPDATE sige_ent_encnegtra SET ENT_TarifaTrans = ? WHERE ${whereColumn} = ?`,
          [tarifaTransNum, whereValue],
        );
      } catch {}
      try {
        await db.execute(
          `UPDATE sige_ent_encnegtra SET ENT_Tolerancia = ? WHERE ${whereColumn} = ?`,
          [toleranciaNum, whereValue],
        );
      } catch {}

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

