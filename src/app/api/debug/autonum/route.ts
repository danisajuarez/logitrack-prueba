import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  let connection: any = null;

  try {
    connection = await db.getConnection();

    const results: any = {
      timestamp: new Date().toISOString(),
      checks: []
    };

    // 1. Buscar autonumerador
    const [autonum]: any = await connection.query(
      "SELECT * FROM sige_aut_autonum WHERE AUT_Tabla LIKE '%ecp%' OR AUT_Tabla LIKE '%ECP%'"
    );
    results.checks.push({
      name: "Autonumeradores con 'ecp'",
      data: autonum.map((r: any) => ({ tabla: r.AUT_Tabla, numero: r.AUT_Numero }))
    });

    // 2. Buscar con LOWER
    const [lowerSearch]: any = await connection.query(
      "SELECT * FROM sige_aut_autonum WHERE LOWER(AUT_Tabla) = LOWER('sige_ecp_enccarpor')"
    );
    results.checks.push({
      name: "Búsqueda con LOWER()",
      found: lowerSearch.length,
      data: lowerSearch.map((r: any) => ({ tabla: r.AUT_Tabla, numero: r.AUT_Numero }))
    });

    // 3. Max ID
    const [maxId]: any = await connection.query(
      "SELECT MAX(ECP_IdEcp) as maxId FROM sige_ecp_enccarpor"
    );
    results.checks.push({
      name: "MAX(ECP_IdEcp)",
      value: maxId[0].maxId
    });

    // 4. Existe ID 0?
    const [zero]: any = await connection.query(
      "SELECT COUNT(*) as cnt FROM sige_ecp_enccarpor WHERE ECP_IdEcp = 0"
    );
    results.checks.push({
      name: "Registros con ECP_IdEcp = 0",
      count: zero[0].cnt,
      critical: zero[0].cnt > 0
    });

    // 5. Si hay ID 0, mostrar datos
    if (zero[0].cnt > 0) {
      const [zeroData]: any = await connection.query(
        "SELECT ECP_IdEcp, ECP_Numero, ECP_Fecha, ENT_IdEnt FROM sige_ecp_enccarpor WHERE ECP_IdEcp = 0 LIMIT 5"
      );
      results.checks.push({
        name: "Datos de registros con ID 0",
        data: zeroData
      });
    }

    // 6. Siguiente ID que se usaría
    if (lowerSearch.length > 0) {
      const nextId = Number(lowerSearch[0].AUT_Numero) + 1;
      const [exists]: any = await connection.query(
        "SELECT COUNT(*) as cnt FROM sige_ecp_enccarpor WHERE ECP_IdEcp = ?",
        [nextId]
      );
      results.checks.push({
        name: "Próximo ID a usar",
        nextId: nextId,
        yaExiste: exists[0].cnt > 0
      });
    }

    connection.release();
    return NextResponse.json(results);

  } catch (error: any) {
    if (connection) {
      try { connection.release(); } catch {}
    }
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
