const mysql = require('mysql2/promise');

async function verCodigosPostales() {
  const connection = await mysql.createConnection({
    host: 'logitrack.dyndns-home.com',
    port: 3307,
    user: 'root',
    password: 'lt',
    database: 'lt',
    connectTimeout: 30000
  });

  console.log('=== ¿DE DÓNDE VIENEN LOS CÓDIGOS POSTALES? ===\n');

  // 1. Total de terceros
  console.log('1. RESUMEN GENERAL:');
  const [total] = await connection.query(`
    SELECT COUNT(*) as total FROM sige_ter_tercero
  `);
  console.log(`   Total de terceros en la BD: ${total[0].total}`);

  // 2. Terceros CON código postal
  const [conCP] = await connection.query(`
    SELECT COUNT(*) as total
    FROM sige_ter_tercero
    WHERE TER_CodPostalTer IS NOT NULL
      AND TER_CodPostalTer != ''
      AND TER_CodPostalTer != '0'
  `);
  console.log(`   Terceros CON código postal: ${conCP[0].total}`);

  // 3. Terceros SIN código postal
  const [sinCP] = await connection.query(`
    SELECT COUNT(*) as total
    FROM sige_ter_tercero
    WHERE TER_CodPostalTer IS NULL
      OR TER_CodPostalTer = ''
      OR TER_CodPostalTer = '0'
  `);
  console.log(`   Terceros SIN código postal: ${sinCP[0].total}`);

  // 4. Ejemplos de terceros CON código postal
  console.log('\n2. EJEMPLOS DE TERCEROS CON CÓDIGO POSTAL:');
  const [ejemplos] = await connection.query(`
    SELECT
      TER_IDTercero as id,
      TER_RazonSocialTer as razonSocial,
      TER_CodPostalTer as codigoPostal,
      TER_DomicilioTer as domicilio,
      TTE_IDTipoTercero as tipo
    FROM sige_ter_tercero
    WHERE TER_CodPostalTer IS NOT NULL
      AND TER_CodPostalTer != ''
      AND TER_CodPostalTer != '0'
    LIMIT 10
  `);

  if (ejemplos.length > 0) {
    ejemplos.forEach(e => {
      console.log(`   ID: ${e.id} | Tipo: ${e.tipo}`);
      console.log(`   Razón Social: ${e.razonSocial}`);
      console.log(`   Código Postal: "${e.codigoPostal}"`);
      console.log(`   Domicilio: ${e.domicilio || '(vacío)'}`);
      console.log('');
    });
  } else {
    console.log('   No hay terceros con código postal');
  }

  // 5. Ver estructura de tabla de transportes
  console.log('3. TRANSPORTES (tabla sige_tra_transport):');
  const [transTotal] = await connection.query(`
    SELECT COUNT(*) as total FROM sige_tra_transport
  `);
  console.log(`   Total de transportes: ${transTotal[0].total}`);

  // Ver si tienen campo de código postal
  const [transCols] = await connection.query(`
    SHOW COLUMNS FROM sige_tra_transport
  `);
  const cpCol = transCols.find(c =>
    c.Field.toLowerCase().includes('cp') ||
    c.Field.toLowerCase().includes('postal')
  );

  if (cpCol) {
    console.log(`   ✅ Tienen campo de código postal: ${cpCol.Field} (${cpCol.Type})`);

    const [transCP] = await connection.query(`
      SELECT
        TRA_IDTransporte as id,
        TRA_NomTrans as nombre,
        ${cpCol.Field} as cp
      FROM sige_tra_transport
      WHERE ${cpCol.Field} IS NOT NULL AND ${cpCol.Field} != ''
      LIMIT 5
    `);

    if (transCP.length > 0) {
      console.log('\n   Ejemplos:');
      transCP.forEach(t => {
        console.log(`   - ${t.nombre}: CP="${t.cp}"`);
      });
    }
  } else {
    console.log('   ❌ NO tienen campo de código postal');
  }

  // 6. Verificar si hay aplicación externa escribiendo
  console.log('\n4. VERIFICANDO APLICACIÓN ORIGEN:');
  console.log('   Buscando pistas en la base de datos...');

  // Ver si hay tablas de auditoría o logs
  const [auditTables] = await connection.query(`
    SHOW TABLES LIKE '%log%'
  `);

  if (auditTables.length > 0) {
    console.log('   Tablas de log encontradas:');
    auditTables.forEach(t => {
      console.log(`   - ${Object.values(t)[0]}`);
    });
  }

  // Ver si hay usuarios/aplicaciones registradas
  const [usuarios] = await connection.query(`
    SELECT TABLE_NAME
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = 'lt'
      AND (TABLE_NAME LIKE '%usu%' OR TABLE_NAME LIKE '%user%')
    LIMIT 5
  `);

  if (usuarios.length > 0) {
    console.log('\n   Tablas de usuarios encontradas:');
    usuarios.forEach(u => {
      console.log(`   - ${u.TABLE_NAME}`);
    });
  }

  await connection.end();
}

verCodigosPostales().catch(console.error);
