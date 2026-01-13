const mysql = require('mysql2/promise');

async function verificarCompletoCodPostal() {
  const db = await mysql.createConnection({
    host: 'remoto.retec.com.ar',
    user: 'danisa',
    password: 'danisa2025',
    database: 'lt',
    port: 3307
  });

  console.log('=== VERIFICACIÓN COMPLETA DE CÓDIGOS POSTALES ===\n');

  // 1. Verificar charset y collation actual
  console.log('1️⃣  CHARSET Y COLLATION ACTUAL:');
  const [columns] = await db.query(`
    SHOW FULL COLUMNS FROM sige_ter_tercero
    WHERE Field = 'TER_CodPostalTer'
  `);
  console.log(columns[0]);
  console.log('');

  // 2. Ver algunos códigos postales actuales
  console.log('2️⃣  CÓDIGOS POSTALES ACTUALES (últimos 5):');
  const [existing] = await db.query(`
    SELECT
      TER_IDTercero,
      TER_RazonSocialTer,
      TER_CodPostalTer,
      LENGTH(TER_CodPostalTer) as bytes,
      CHAR_LENGTH(TER_CodPostalTer) as chars,
      HEX(TER_CodPostalTer) as hex_value
    FROM sige_ter_tercero
    WHERE TER_CodPostalTer IS NOT NULL
      AND TER_CodPostalTer != ""
    ORDER BY TER_IDTercero DESC
    LIMIT 5
  `);

  existing.forEach(r => {
    console.log(`  ID: ${r.TER_IDTercero} | CP: "${r.TER_CodPostalTer}" | Bytes: ${r.bytes} | Chars: ${r.char_length}`);
  });
  console.log('');

  // 3. Intentar INSERT de prueba con código postal alfanumérico
  console.log('3️⃣  PRUEBA DE INSERCIÓN:');

  // Obtener próximo ID
  const [maxIdResult] = await db.query(
    `SELECT MAX(TER_IDTercero) as maxId FROM sige_ter_tercero`
  );
  const testId = maxIdResult[0].maxId + 1;

  const codigoPostalTest = 'C1234ABC'; // Código postal alfanumérico de prueba

  try {
    await db.query(`
      INSERT INTO sige_ter_tercero (
        TER_IDTercero,
        TER_RazonSocialTer,
        TER_CUITTer,
        TER_CodPostalTer,
        TTE_IDTipoTercero,
        CCT_IDCCT
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      testId,
      'TEST CÓDIGO POSTAL ALFANUMÉRICO',
      '99999999999',
      codigoPostalTest,
      1,
      1
    ]);

    console.log(`  ✅ Inserción exitosa con ID: ${testId}`);
    console.log(`  📝 Código postal enviado: "${codigoPostalTest}"`);

    // 4. Verificar cómo se guardó
    console.log('\n4️⃣  VERIFICACIÓN DE GUARDADO:');
    const [verification] = await db.query(`
      SELECT
        TER_IDTercero,
        TER_RazonSocialTer,
        TER_CodPostalTer,
        LENGTH(TER_CodPostalTer) as bytes,
        CHAR_LENGTH(TER_CodPostalTer) as chars,
        HEX(TER_CodPostalTer) as hex_value
      FROM sige_ter_tercero
      WHERE TER_IDTercero = ?
    `, [testId]);

    const saved = verification[0];
    console.log(`  Código postal guardado: "${saved.TER_CodPostalTer}"`);
    console.log(`  Bytes: ${saved.bytes}`);
    console.log(`  Chars: ${saved.chars}`);
    console.log(`  HEX: ${saved.hex_value}`);

    // Comparar
    if (saved.TER_CodPostalTer === codigoPostalTest) {
      console.log('  ✅ ¡CORRECTO! El código postal se guardó exactamente como se envió');
    } else {
      console.log('  ❌ ERROR: El código postal NO coincide');
      console.log(`     Esperado: "${codigoPostalTest}"`);
      console.log(`     Guardado: "${saved.TER_CodPostalTer}"`);
    }

    // 5. Limpiar registro de prueba
    console.log('\n5️⃣  LIMPIEZA:');
    await db.query(`DELETE FROM sige_ter_tercero WHERE TER_IDTercero = ?`, [testId]);
    console.log(`  ✅ Registro de prueba eliminado (ID: ${testId})`);

  } catch (error) {
    console.error('  ❌ ERROR en la inserción:', error.message);
    console.error('  Código de error:', error.code);
  }

  console.log('\n=== FIN DE LA VERIFICACIÓN ===');
  await db.end();
}

verificarCompletoCodPostal().catch(console.error);
