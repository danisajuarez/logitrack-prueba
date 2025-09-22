import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const viajeIdParam = searchParams.get("viajeId");
  const viajeId = viajeIdParam ? Number(viajeIdParam) : NaN;

  if (!Number.isInteger(viajeId) || viajeId <= 0) {
    return NextResponse.json(
      { error: "viajeId es requerido y debe ser un entero válido" },
      { status: 400 }
    );
  }

  try {
    const query = `
      SELECT
        vc.id,
        vc.viaje_id,
        CASE
          WHEN rel.TER_IDTercero = vc.chofer_id THEN rel.TER_IDTerceroAsoc
          ELSE rel.TER_IDTercero
        END as transporte_id,
        COALESCE(
          CASE
            WHEN rel.TER_IDTercero = vc.chofer_id THEN tra_asoc.TRA_NomTrans
            ELSE tra_chofer.TRA_NomTrans
          END,
          CASE
            WHEN rel.TER_IDTercero = vc.chofer_id THEN ter_asoc.TER_RazonSocialTer
            ELSE ter_chofer.TER_RazonSocialTer
          END
        ) AS transportistaNombre,
        vc.chofer_id,
        ch.TER_RazonSocialTer AS choferNombre,
        vc.vendedor_id,
        ven.VEN_NomVen AS vendedorNombre,
        vc.pat_chasis,
        vc.pat_acoplado,
        vc.send_email
      FROM viajes_choferes vc
      LEFT JOIN sige_ter_tercero ch ON ch.TER_IDTercero = vc.chofer_id
      LEFT JOIN sige_ven_vendedor ven ON ven.VEN_IDVendedor = vc.vendedor_id
      LEFT JOIN sige_tvp_terveipat rel ON (rel.TER_IDTercero = vc.chofer_id OR rel.TER_IDTerceroAsoc = vc.chofer_id)
      LEFT JOIN sige_tra_transport tra_chofer ON tra_chofer.TRA_IDTransporte = rel.TER_IDTercero
      LEFT JOIN sige_tra_transport tra_asoc ON tra_asoc.TRA_IDTransporte = rel.TER_IDTerceroAsoc
      LEFT JOIN sige_ter_tercero ter_chofer ON ter_chofer.TER_IDTercero = rel.TER_IDTercero
      LEFT JOIN sige_ter_tercero ter_asoc ON ter_asoc.TER_IDTercero = rel.TER_IDTerceroAsoc
      WHERE vc.viaje_id = ?
      GROUP BY vc.id, vc.viaje_id, vc.chofer_id, vc.vendedor_id, vc.pat_chasis, vc.pat_acoplado, vc.send_email
      ORDER BY COALESCE(vc.id, vc.chofer_id)
    `;

    const [rows] = (await db.query(query, [viajeId]) as unknown as [RowDataPacket[]]) ?? [];
    if (!Array.isArray(rows)) {
      return NextResponse.json([]);
    }

    const mapped = rows.map((row: any) => ({
      id: row.id ?? `${row.viaje_id}-${row.chofer_id}`,
      viajeId: row.viaje_id,
      transporteId: row.transporte_id ?? null,
      transportistaNombre: row.transportistaNombre ?? null,
      choferId: row.chofer_id,
      choferNombre: row.choferNombre ?? null,
      vendedorId: row.vendedor_id ?? null,
      vendedorNombre: row.vendedorNombre ?? null,
      patChasis: row.pat_chasis ?? null,
      patAcoplado: row.pat_acoplado ?? null,
      sendEmail: Boolean(row.send_email),
    }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    if (error?.code === "ER_NO_SUCH_TABLE") {
      return NextResponse.json([]);
    }
    console.error("Error al obtener postulaciones:", error);
    return NextResponse.json(
      { error: "Error al obtener las postulaciones" },
      { status: 500 }
    );
  }
}
