const mysql = require('mysql2/promise');

async function limpiarHuerfanas() {
  const connection = await mysql.createConnection({
    host: 'remoto.retec.com.ar',
    user: 'danisa',
    password: 'danisa2025',
    database: 'lt',
    port: 3307
  });

  console.log('🧹 Limpiando autorizaciones huérfanas...\n');

  // 1. Buscar todas las cabeceras huérfanas
  console.log('🔎 Buscando cabeceras huérfanas...');
  const [huerfanas] = await connection.execute(`
    SELECT ecp.ECP_IdEcp, ecp.ENT_IdEnt, COUNT(icp.TIC_IdTic) as cant_detalles
    FROM sige_ecp_enccarpor ecp
    LEFT JOIN sige_icp_intcarpor icp ON ecp.ECP_IdEcp = icp.ECP_IdEcp
    GROUP BY ecp.ECP_IdEcp, ecp.ENT_IdEnt
    HAVING cant_detalles = 0
  `);

  console.log(`  ✅ Encontradas ${huerfanas.length} cabeceras huérfanas\n`);

  if (huerfanas.length === 0) {
    console.log('✅ No hay autorizaciones huérfanas para limpiar');
    await connection.end();
    return;
  }

  // 2. Mostrar las cabeceras que se van a eliminar
  console.log('📋 Cabeceras a eliminar:');
  huerfanas.forEach(row => {
    console.log(`  - ECP_IdEcp: ${row.ECP_IdEcp}, ENT_IdEnt: ${row.ENT_IdEnt}`);
  });

  // 3. Eliminar las cabeceras huérfanas
  console.log('\n🗑️  Eliminando cabeceras huérfanas...');
  let eliminadas = 0;
  for (const row of huerfanas) {
    try {
      const [result] = await connection.execute(
        'DELETE FROM sige_ecp_enccarpor WHERE ECP_IdEcp = ?',
        [row.ECP_IdEcp]
      );
      if (result.affectedRows > 0) {
        eliminadas++;
        console.log(`  ✅ Eliminada ECP_IdEcp: ${row.ECP_IdEcp}`);
      }
    } catch (err) {
      console.error(`  ❌ Error al eliminar ECP_IdEcp: ${row.ECP_IdEcp}`, err.message);
    }
  }

  console.log(`\n✅ Proceso completado: ${eliminadas} cabeceras eliminadas de ${huerfanas.length}`);

  await connection.end();
}

limpiarHuerfanas().catch(console.error);
