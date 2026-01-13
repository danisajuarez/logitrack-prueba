import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Endpoint de testing para verificar que los códigos postales alfanuméricos funcionan
 * No requiere autenticación (ver middleware.ts)
 */
export async function POST() {
  const testId = Math.floor(Math.random() * 1000000) + 900000;
  const codigoPostalTest = "S2000ABC"; // Código postal alfanumérico de prueba

  try {
    console.log("=== TEST CÓDIGO POSTAL ALFANUMÉRICO ===");
    console.log(`1. Intentando insertar ID: ${testId} con CP: "${codigoPostalTest}"`);

    // Insertar registro de prueba
    await db.query(
      `INSERT INTO sige_ter_tercero (
        TER_IDTercero,
        TER_RazonSocialTer,
        TER_CUITTer,
        TER_CodPostalTer,
        TTE_IDTipoTercero,
        CCT_IDCCT
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        testId,
        "TEST CÓDIGO POSTAL ALFANUMÉRICO",
        "99999999999",
        codigoPostalTest, // String alfanumérico
        1,
        1,
      ]
    );

    console.log(`✅ Inserción exitosa`);

    // Verificar cómo se guardó
    const [verification]: any = await db.query(
      `SELECT
        TER_IDTercero,
        TER_RazonSocialTer,
        TER_CodPostalTer,
        LENGTH(TER_CodPostalTer) as bytes,
        CHAR_LENGTH(TER_CodPostalTer) as chars,
        HEX(TER_CodPostalTer) as hex_value
      FROM sige_ter_tercero
      WHERE TER_IDTercero = ?`,
      [testId]
    );

    const saved = verification[0];
    console.log(`2. Código postal guardado: "${saved.TER_CodPostalTer}"`);

    const isCorrect = saved.TER_CodPostalTer === codigoPostalTest;

    // Limpiar
    await db.query(`DELETE FROM sige_ter_tercero WHERE TER_IDTercero = ?`, [
      testId,
    ]);
    console.log(`3. Registro de prueba eliminado`);

    return NextResponse.json({
      success: isCorrect,
      test: {
        enviado: codigoPostalTest,
        guardado: saved.TER_CodPostalTer,
        bytes: saved.bytes,
        chars: saved.chars,
        hex: saved.hex_value,
        coincide: isCorrect,
      },
      message: isCorrect
        ? "✅ Código postal alfanumérico funcionando correctamente"
        : "❌ Error: El código postal NO se guardó correctamente",
    });
  } catch (error: any) {
    console.error("❌ Error en test:", error);

    // Intentar limpiar si quedó registro
    try {
      await db.query(`DELETE FROM sige_ter_tercero WHERE TER_IDTercero = ?`, [testId]);
    } catch (e) {
      // Ignorar error de limpieza
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "❌ Error al probar código postal",
      },
      { status: 500 }
    );
  }
}

/**
 * GET para ver información sobre códigos postales actuales
 */
export async function GET() {
  try {
    // Ver charset actual
    const [columns]: any = await db.query(`
      SHOW FULL COLUMNS FROM sige_ter_tercero
      WHERE Field = 'TER_CodPostalTer'
    `);

    // Ver últimos códigos postales
    const [samples]: any = await db.query(`
      SELECT
        TER_IDTercero,
        TER_RazonSocialTer,
        TER_CodPostalTer,
        LENGTH(TER_CodPostalTer) as bytes
      FROM sige_ter_tercero
      WHERE TER_CodPostalTer IS NOT NULL
        AND TER_CodPostalTer != ""
      ORDER BY TER_IDTercero DESC
      LIMIT 10
    `);

    return NextResponse.json({
      charset: {
        collation: columns[0].Collation,
        type: columns[0].Type,
      },
      samples: samples.map((s: any) => ({
        id: s.TER_IDTercero,
        razonSocial: s.TER_RazonSocialTer?.substring(0, 40),
        codigoPostal: s.TER_CodPostalTer,
        bytes: s.bytes,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 }
    );
  }
}
