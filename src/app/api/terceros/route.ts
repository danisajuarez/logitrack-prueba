import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { fixEncodingObject } from "@/lib/encoding";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Primero ver qué tipos existen
    const [tiposDebug]: any = await db.query(
      `SELECT DISTINCT TTE_IDTipoTercero, COUNT(*) as cant
       FROM sige_ter_tercero
       WHERE TER_RazonSocialTer IS NOT NULL AND TER_RazonSocialTer != ''
       GROUP BY TTE_IDTipoTercero`
    );
    console.log("[DEBUG /api/terceros] Tipos disponibles:", tiposDebug);

    const [rows] = (await db.query(
      `SELECT
        TER_IDTercero AS id,
        TER_RazonSocialTer AS razonSocial,
        TER_CUITTer AS cuit,
        TER_TelefonoTer AS telefono,
        TER_EMailTer AS email,
        TER_TipoDoc AS tipo,
        LOC_IDLocalidad AS localidad,
        TTE_IDTipoTercero AS tipoTercero,
        CCT_IDCCT AS categoriaCliente
      FROM sige_ter_tercero
      WHERE TER_RazonSocialTer IS NOT NULL
        AND TER_RazonSocialTer != ''
        AND TTE_IDTipoTercero = 1
        AND CCT_IDCCT = 1
      ORDER BY TER_RazonSocialTer ASC
    ;`
    )) as unknown as [any[]];

    console.log(
      "[DEBUG /api/terceros] Registros encontrados con TTE_IDTipoTercero=1 Y CCT_IDCCT=1:",
      rows.length
    );
    console.log(
      "[DEBUG /api/terceros] Primeros 3 registros:",
      rows.slice(0, 3)
    );

    // Corregir encoding
    const fixedRows = rows.map((row) => fixEncodingObject(row));

    return NextResponse.json(fixedRows);
  } catch (error: any) {
    console.error("Error al obtener datos en /api/terceros:", error);
    // Si hay error de columna, intentar sin filtro para ver qué pasa
    if (error?.code === "ER_BAD_FIELD_ERROR") {
      console.log(
        "[DEBUG] La columna TTE_IDTipoTercero no existe, intentando sin filtro"
      );
      try {
        const [rowsSinFiltro] = (await db.query(
          `SELECT
            TER_IDTercero AS id,
            TER_RazonSocialTer AS razonSocial,
            TER_CUITTer AS cuit,
            TER_TelefonoTer AS telefono,
            TER_EMailTer AS email,
            TER_TipoDoc AS tipo,
            LOC_IDLocalidad AS localidad
          FROM sige_ter_tercero
          WHERE TER_RazonSocialTer IS NOT NULL
            AND TER_RazonSocialTer != ''
          ORDER BY TER_RazonSocialTer ASC
          `
        )) as unknown as [any[]];
        console.log(
          "[DEBUG] Sin filtro encontró:",
          rowsSinFiltro.length,
          "registros"
        );
        const fixedRowsSinFiltro = rowsSinFiltro.map((row) =>
          fixEncodingObject(row)
        );
        return NextResponse.json(fixedRowsSinFiltro);
      } catch (e2) {
        console.error("[DEBUG] Error sin filtro también:", e2);
      }
    }
    return NextResponse.json(
      { error: "Error al obtener datos", details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      razonSocial,
      cuit,
      telefono,
      email,
      tipoDoc,
      localidad,
      tipoTercero,
      categoriaCliente,
      domicilio,
      codigoPostal, // IMPORTANTE: Campo alfanumérico
    } = body;

    // Validaciones básicas
    if (!razonSocial || !cuit) {
      return NextResponse.json(
        { error: "Razón Social y CUIT son requeridos" },
        { status: 400 }
      );
    }

    // Validar que código postal sea string y no número
    const cpLimpio = codigoPostal ? String(codigoPostal).trim() : null;

    // Verificar si ya existe un tercero con ese CUIT
    const [existing]: any = await db.query(
      `SELECT TER_IDTercero FROM sige_ter_tercero WHERE TER_CUITTer = ? LIMIT 1`,
      [cuit]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Ya existe un tercero con ese CUIT" },
        { status: 409 }
      );
    }

    // Obtener el siguiente ID disponible
    const [maxId]: any = await db.query(
      `SELECT MAX(TER_IDTercero) as maxId FROM sige_ter_tercero`
    );
    const nextId = (maxId[0].maxId || 0) + 1;

    // Insertar nuevo tercero
    await db.query(
      `INSERT INTO sige_ter_tercero (
        TER_IDTercero,
        TER_RazonSocialTer,
        TER_CUITTer,
        TER_TelefonoTer,
        TER_EMailTer,
        TER_TipoDoc,
        TER_DomicilioTer,
        TER_CodPostalTer,
        LOC_IDLocalidad,
        TTE_IDTipoTercero,
        CCT_IDCCT
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nextId,
        razonSocial,
        cuit,
        telefono || null,
        email || null,
        tipoDoc || null,
        domicilio || null,
        cpLimpio, // String alfanumérico
        localidad || null,
        tipoTercero || 1,
        categoriaCliente || 1,
      ]
    );

    console.log(
      `✅ Tercero creado: ID=${nextId}, CP="${cpLimpio}" (tipo: ${typeof cpLimpio})`
    );

    return NextResponse.json(
      {
        success: true,
        id: nextId,
        message: "Tercero creado exitosamente",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error al crear tercero:", error);
    return NextResponse.json(
      { error: "Error al crear tercero", details: error?.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      razonSocial,
      cuit,
      telefono,
      email,
      tipoDoc,
      localidad,
      domicilio,
      codigoPostal, // IMPORTANTE: Campo alfanumérico
    } = body;

    // Validaciones básicas
    if (!id) {
      return NextResponse.json(
        { error: "ID es requerido para actualizar" },
        { status: 400 }
      );
    }

    // Validar que código postal sea string
    const cpLimpio = codigoPostal ? String(codigoPostal).trim() : null;

    // Verificar que el tercero existe
    const [existing]: any = await db.query(
      `SELECT TER_IDTercero FROM sige_ter_tercero WHERE TER_IDTercero = ?`,
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Tercero no encontrado" },
        { status: 404 }
      );
    }

    // Actualizar tercero
    await db.query(
      `UPDATE sige_ter_tercero SET
        TER_RazonSocialTer = COALESCE(?, TER_RazonSocialTer),
        TER_CUITTer = COALESCE(?, TER_CUITTer),
        TER_TelefonoTer = ?,
        TER_EMailTer = ?,
        TER_TipoDoc = ?,
        TER_DomicilioTer = ?,
        TER_CodPostalTer = ?,
        LOC_IDLocalidad = ?
      WHERE TER_IDTercero = ?`,
      [
        razonSocial,
        cuit,
        telefono,
        email,
        tipoDoc,
        domicilio,
        cpLimpio, // String alfanumérico
        localidad,
        id,
      ]
    );

    console.log(
      `✅ Tercero actualizado: ID=${id}, CP="${cpLimpio}" (tipo: ${typeof cpLimpio})`
    );

    return NextResponse.json({
      success: true,
      message: "Tercero actualizado exitosamente",
    });
  } catch (error: any) {
    console.error("Error al actualizar tercero:", error);
    return NextResponse.json(
      { error: "Error al actualizar tercero", details: error?.message },
      { status: 500 }
    );
  }
}
