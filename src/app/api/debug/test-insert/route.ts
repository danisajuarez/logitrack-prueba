import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const body = await request.json();
    const { viajeId, choferId } = body;

    console.log('[TEST] Iniciando test de inserción', { viajeId, choferId });

    // 1. Obtener ECP_IdEcp
    const [ecpRows]: any = await connection.query(
      `SELECT ECP_IdEcp FROM sige_ecp_enccarpor WHERE ENT_IdEnt = ? LIMIT 1`,
      [viajeId]
    );

    if (!ecpRows || ecpRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: "No se encontró carta porte" });
    }

    const ecpIdEcp = ecpRows[0].ECP_IdEcp;
    console.log('[TEST] ECP_IdEcp encontrado:', ecpIdEcp);

    // 2. Obtener datos del chofer
    const [choferRows]: any = await connection.query(
      `SELECT TER_RazonSocialTer, TER_CUITTer FROM sige_ter_tercero WHERE TER_IDTercero = ? LIMIT 1`,
      [choferId]
    );

    if (!choferRows || choferRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: "No se encontró el chofer" });
    }

    const chofer = choferRows[0];
    console.log('[TEST] Chofer encontrado:', chofer);

    // 3. Intentar insertar
    try {
      const result = await connection.query(
        `INSERT INTO sige_icp_intcarpor (
          ECP_IdEcp, TIC_IdTic, ICP_Orden, TIC_DescripcionTic,
          TER_IDTerceroTic, TER_RazonSocialTerTic, TER_CUITTerTic
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          ecpIdEcp,
          9, // TIC_IdTic = 9 para Chofer
          3, // Orden 3
          "Chofer",
          choferId,
          chofer.TER_RazonSocialTer || "",
          chofer.TER_CUITTer || "",
        ]
      );
      console.log('[TEST] Inserción exitosa:', result);

      await connection.commit();

      return NextResponse.json({
        success: true,
        message: "Chofer insertado correctamente",
        ecpIdEcp,
        choferId,
        result
      });
    } catch (insertError: any) {
      await connection.rollback();
      console.error('[TEST] Error al insertar:', insertError);
      return NextResponse.json({
        error: "Error al insertar chofer",
        code: insertError.code,
        message: insertError.message,
        sqlMessage: insertError.sqlMessage
      }, { status: 500 });
    }
  } catch (error: any) {
    await connection.rollback();
    console.error('[TEST] Error general:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  } finally {
    connection.release();
  }
}
