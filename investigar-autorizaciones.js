const mysql = require('mysql2/promise');

async function investigarAutorizaciones() {
  const connection = await mysql.createConnection({
    host: 'remoto.retec.com.ar',
    user: 'danisa',
    password: 'danisa2025',
    database: 'lt',
    port: 3307
  });

  console.log('🔍 Investigando estructura de autorizaciones...\n');

  // 1. Verificar estructura de tabla de cabecera
  console.log('📋 Estructura de sige_ecp_enccarpor (cabecera):');
  const [descCabecera] = await connection.execute('DESCRIBE sige_ecp_enccarpor');
  descCabecera.forEach(col => {
    console.log(`  - ${col.Field} (${col.Type}) ${col.Key ? '[' + col.Key + ']' : ''}`);
  });

  // 2. Verificar estructura de tabla de detalle
  console.log('\n📋 Estructura de sige_icp_intcarpor (detalle):');
  const [descDetalle] = await connection.execute('DESCRIBE sige_icp_intcarpor');
  descDetalle.forEach(col => {
    console.log(`  - ${col.Field} (${col.Type}) ${col.Key ? '[' + col.Key + ']' : ''}`);
  });

  // 3. Buscar cabeceras huérfanas (sin detalles)
  console.log('\n🔎 Buscando cabeceras huérfanas (sin detalles):');
  const [huerfanas] = await connection.execute(`
    SELECT ecp.ECP_IdEcp, ecp.ENT_IdEnt, COUNT(icp.TIC_IdTic) as cant_detalles
    FROM sige_ecp_enccarpor ecp
    LEFT JOIN sige_icp_intcarpor icp ON ecp.ECP_IdEcp = icp.ECP_IdEcp
    GROUP BY ecp.ECP_IdEcp, ecp.ENT_IdEnt
    HAVING cant_detalles = 0
    LIMIT 20
  `);

  if (huerfanas.length > 0) {
    console.log(`  ✅ Encontradas ${huerfanas.length} cabeceras sin detalles:`);
    huerfanas.forEach(row => {
      console.log(`    - ECP_IdEcp: ${row.ECP_IdEcp}, ENT_IdEnt: ${row.ENT_IdEnt}`);
    });
  } else {
    console.log('  ❌ No se encontraron cabeceras huérfanas');
  }

  // 4. Verificar específicamente el viaje 1907
  console.log('\n🔎 Verificando autorizaciones del viaje 1907:');
  const [auth1907] = await connection.execute(`
    SELECT ecp.ECP_IdEcp, ecp.ENT_IdEnt, COUNT(icp.TIC_IdTic) as cant_detalles
    FROM sige_ecp_enccarpor ecp
    LEFT JOIN sige_icp_intcarpor icp ON ecp.ECP_IdEcp = icp.ECP_IdEcp
    WHERE ecp.ENT_IdEnt = 1907
    GROUP BY ecp.ECP_IdEcp, ecp.ENT_IdEnt
  `);

  if (auth1907.length > 0) {
    console.log(`  ✅ Encontradas ${auth1907.length} autorizaciones:`);
    auth1907.forEach(row => {
      console.log(`    - ECP_IdEcp: ${row.ECP_IdEcp}, Detalles: ${row.cant_detalles}`);
    });
  } else {
    console.log('  ❌ No se encontraron autorizaciones para el viaje 1907');
  }

  // 5. Contar totales
  console.log('\n📊 Resumen general:');
  const [totalCabeceras] = await connection.execute('SELECT COUNT(*) as total FROM sige_ecp_enccarpor');
  const [totalDetalles] = await connection.execute('SELECT COUNT(*) as total FROM sige_icp_intcarpor');
  console.log(`  - Total cabeceras: ${totalCabeceras[0].total}`);
  console.log(`  - Total detalles: ${totalDetalles[0].total}`);
  console.log(`  - Cabeceras huérfanas: ${huerfanas.length}`);

  await connection.end();
}

investigarAutorizaciones().catch(console.error);
