import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const connection = await db.getConnection();

  try {
    // Ver estructura de la tabla
    const [columns]: any = await connection.query('DESCRIBE sige_icp_intcarpor');

    // Ver un registro de ejemplo
    const [sample]: any = await connection.query('SELECT * FROM sige_icp_intcarpor LIMIT 1');

    return NextResponse.json({
      columns,
      sample
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
