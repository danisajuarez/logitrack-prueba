import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Ver registros creados por el cliente (los que tienen ecp_idecp = 1821 por ejemplo)
    const [registrosCliente]: any = await db.query(
      `SELECT
        ecp_idecp,
        OCP_Renglon AS renglon,
        ART_IdArticulo,
        ART_DesArticulo,
        OCP_Importe,
        OCP_Cantidad,
        OCP_CantPend,
        OCP_CantReal,
        OCP_CantRealPend,
        TER_RazonSocialTer
      FROM SIGE_OCP_OrdCarPor
      WHERE ecp_idecp IN (1821, 1820, 1819)
        AND (ART_IdArticulo IN ('COMB', 'ADE') OR ART_DesArticulo IN ('COMBUSTIBLE', 'ADELANTO'))
      ORDER BY ecp_idecp DESC, OCP_Renglon
      LIMIT 20;`
    );

    // Ver registros que creamos nosotros (los que tienen ecp_idecp < 1000 por ejemplo)
    const [registrosNuestros]: any = await db.query(
      `SELECT
        ecp_idecp,
        OCP_Renglon AS renglon,
        ART_IdArticulo,
        ART_DesArticulo,
        OCP_Importe,
        OCP_Cantidad,
        OCP_CantPend,
        OCP_CantReal,
        OCP_CantRealPend,
        TER_RazonSocialTer
      FROM SIGE_OCP_OrdCarPor
      WHERE ecp_idecp < 1000
        AND (ART_IdArticulo IN ('COMB', 'ADE') OR ART_DesArticulo IN ('COMBUSTIBLE', 'ADELANTO'))
      ORDER BY ecp_idecp DESC, OCP_Renglon
      LIMIT 20;`
    );

    return NextResponse.json({
      mensaje: "Comparación de registros del cliente vs nuestros",
      registros_cliente: registrosCliente,
      registros_nuestros: registrosNuestros,
      analisis: {
        total_cliente: registrosCliente.length,
        total_nuestros: registrosNuestros.length,
        diferencias: "Mirá los valores de OCP_Cantidad, OCP_CantPend, OCP_CantReal, OCP_CantRealPend"
      }
    });
  } catch (error: any) {
    console.error("Error al obtener datos de debug OCP:", error);
    return NextResponse.json(
      { error: "Error al obtener datos", details: error?.message },
      { status: 500 }
    );
  }
}
