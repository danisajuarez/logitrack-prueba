import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const viajeClienteId = searchParams.get("viajeCliente") || "683"; // Viaje del cliente
    const viajeTuyoId = searchParams.get("viajeTuyo"); // Viaje que creaste vos

    const resultados: any = {
      viaje_cliente: {},
      viaje_tuyo: {}
    };

    // Analizar viaje del cliente
    const [entCliente]: any = await db.query(
      `SELECT * FROM sige_ent_encnegtra WHERE ENT_IdEnt = ?`,
      [viajeClienteId]
    );
    resultados.viaje_cliente.ent = entCliente?.[0] || null;

    const [ecpCliente]: any = await db.query(
      `SELECT * FROM sige_ecp_enccarpor WHERE ENT_IdEnt = ?`,
      [viajeClienteId]
    );
    resultados.viaje_cliente.ecp = ecpCliente?.[0] || null;
    resultados.viaje_cliente.tiene_ecp = ecpCliente?.length > 0;

    // Si existe ECP, ver intermediarios
    if (ecpCliente?.length > 0) {
      const [icpCliente]: any = await db.query(
        `SELECT * FROM sige_icp_intcarpor WHERE ECP_IdEcp = ?`,
        [ecpCliente[0].ECP_IdEcp]
      );
      resultados.viaje_cliente.intermediarios = icpCliente;
    }

    // Analizar viaje tuyo (si lo proporcionaste)
    if (viajeTuyoId) {
      const [entTuyo]: any = await db.query(
        `SELECT * FROM sige_ent_encnegtra WHERE ENT_IdEnt = ?`,
        [viajeTuyoId]
      );
      resultados.viaje_tuyo.ent = entTuyo?.[0] || null;

      const [ecpTuyo]: any = await db.query(
        `SELECT * FROM sige_ecp_enccarpor WHERE ENT_IdEnt = ?`,
        [viajeTuyoId]
      );
      resultados.viaje_tuyo.ecp = ecpTuyo?.[0] || null;
      resultados.viaje_tuyo.tiene_ecp = ecpTuyo?.length > 0;

      // Si existe ECP, ver intermediarios
      if (ecpTuyo?.length > 0) {
        const [icpTuyo]: any = await db.query(
          `SELECT * FROM sige_icp_intcarpor WHERE ECP_IdEcp = ?`,
          [ecpTuyo[0].ECP_IdEcp]
        );
        resultados.viaje_tuyo.intermediarios = icpTuyo;
      }
    }

    return NextResponse.json({
      comparacion: resultados,
      diferencias: {
        viaje_cliente_tiene_ecp: resultados.viaje_cliente.tiene_ecp,
        viaje_tuyo_tiene_ecp: resultados.viaje_tuyo.tiene_ecp,
        mismo_numero_ecp: resultados.viaje_cliente.ecp?.ECP_IdEcp === resultados.viaje_tuyo.ecp?.ECP_IdEcp
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
