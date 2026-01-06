const mysql = require('mysql2/promise');

async function checkCodigosPostales() {
  const db = await mysql.createConnection({
    host: 'remoto.retec.com.ar',
    user: 'danisa',
    password: 'danisa2025',
    database: 'lt',
    port: 3307
  });

  console.log('Verificando códigos postales guardados en sige_ter_tercero:\n');

  const [rows] = await db.query(`
    SELECT
      TER_IDTercero,
      TER_RazonSocialTer,
      TER_CodPostalTer,
      LENGTH(TER_CodPostalTer) as largo,
      HEX(TER_CodPostalTer) as hex_value,
      CHAR_LENGTH(TER_CodPostalTer) as char_length
    FROM sige_ter_tercero
    WHERE TER_CodPostalTer IS NOT NULL
      AND TER_CodPostalTer != ""
    LIMIT 10
  `);

  rows.forEach(r => {
    console.log(`ID: ${r.TER_IDTercero}`);
    console.log(`  Razón: ${r.TER_RazonSocialTer?.substring(0,40)}`);
    console.log(`  CP: [${r.TER_CodPostalTer}]`);
    console.log(`  Largo (bytes): ${r.largo}`);
    console.log(`  Largo (chars): ${r.char_length}`);
    console.log(`  Hex: ${r.hex_value}`);
    console.log('');
  });

  await db.end();
}

checkCodigosPostales().catch(console.error);
