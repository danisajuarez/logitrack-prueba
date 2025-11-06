import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const viajeId = 683;
    const choferId = 66337;

    // Test 1: CONCAT sin CAST
    const [test1]: any = await db.query(
      `SELECT CONCAT(?, '-', ?) AS id_sin_cast`,
      [viajeId, choferId]
    );

    // Test 2: CONCAT con CAST
    const [test2]: any = await db.query(
      `SELECT CAST(CONCAT(?, '-', ?) AS CHAR) AS id_con_cast`,
      [viajeId, choferId]
    );

    // Test 3: Usando CONCAT_WS
    const [test3]: any = await db.query(
      `SELECT CONCAT_WS('-', ?, ?) AS id_concat_ws`,
      [viajeId, choferId]
    );

    return NextResponse.json({
      test1_sin_cast: {
        valor: test1[0].id_sin_cast,
        tipo: typeof test1[0].id_sin_cast,
        es_buffer: Buffer.isBuffer(test1[0].id_sin_cast)
      },
      test2_con_cast: {
        valor: test2[0].id_con_cast,
        tipo: typeof test2[0].id_con_cast,
        es_buffer: Buffer.isBuffer(test2[0].id_con_cast)
      },
      test3_concat_ws: {
        valor: test3[0].id_concat_ws,
        tipo: typeof test3[0].id_concat_ws,
        es_buffer: Buffer.isBuffer(test3[0].id_concat_ws)
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
