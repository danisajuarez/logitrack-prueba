import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Ver qué valores distintos existen en TTE_IDTipoTercero
    const [tipos]: any = await db.query(
      `SELECT
        TTE_IDTipoTercero,
        COUNT(*) as cantidad
      FROM sige_ter_tercero
      WHERE TER_RazonSocialTer IS NOT NULL
        AND TER_RazonSocialTer != ''
      GROUP BY TTE_IDTipoTercero
      ORDER BY TTE_IDTipoTercero;`
    );

    // Ver qué valores distintos existen en CCT_IDCCT
    const [categorias]: any = await db.query(
      `SELECT
        CCT_IDCCT,
        COUNT(*) as cantidad
      FROM sige_ter_tercero
      WHERE TER_RazonSocialTer IS NOT NULL
        AND TER_RazonSocialTer != ''
      GROUP BY CCT_IDCCT
      ORDER BY CCT_IDCCT;`
    );

    // Ver algunos ejemplos de terceros con todos sus campos
    const [ejemplos]: any = await db.query(
      `SELECT
        TER_IDTercero,
        TER_RazonSocialTer,
        TTE_IDTipoTercero,
        CCT_IDCCT,
        TER_CUITTer
      FROM sige_ter_tercero
      WHERE TER_RazonSocialTer IS NOT NULL
        AND TER_RazonSocialTer != ''
      ORDER BY TER_IDTercero
      LIMIT 30;`
    );

    // Ejemplos específicos por cada tipo de tercero
    const ejemplosPorTipo: any = {};
    for (const tipo of tipos) {
      const tipoId = tipo.TTE_IDTipoTercero;
      const [ejTipo]: any = await db.query(
        `SELECT TER_RazonSocialTer, TER_CUITTer, CCT_IDCCT
         FROM sige_ter_tercero
         WHERE TTE_IDTipoTercero = ?
           AND TER_RazonSocialTer IS NOT NULL
           AND TER_RazonSocialTer != ''
         LIMIT 5`,
        [tipoId]
      );
      ejemplosPorTipo[`tipo_${tipoId}`] = ejTipo;
    }

    return NextResponse.json({
      tipos_tercero: tipos,
      categorias_cliente: categorias,
      ejemplos_terceros: ejemplos,
      ejemplos_por_tipo: ejemplosPorTipo,
      mensaje: "Analizá estos datos para ver qué valor de TTE_IDTipoTercero corresponde a clientes"
    });
  } catch (error: any) {
    console.error("Error al obtener datos de debug:", error);
    return NextResponse.json(
      { error: "Error al obtener datos", details: error?.message },
      { status: 500 }
    );
  }
}
