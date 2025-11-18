const mysql = require('mysql2/promise');

async function testEliminarViaje710() {
  const connection = await mysql.createConnection({
    host: 'remoto.retec.com.ar',
    user: 'danisa',
    password: 'danisa2025',
    database: 'lt',
    port: 3307
  });

  console.log('🧪 TEST: Simulación de eliminación del viaje 710\n');
  console.log('='.repeat(60));

  const viajeId = 710;

  // ===== ANTES =====
  console.log('\n📊 ANTES DE ELIMINAR:\n');

  // Verificar viaje
  const [viaje] = await connection.execute(
    'SELECT ENT_IdEnt, ENT_Numero, TER_RazonSocialTer, ENT_CantCuposReser FROM sige_ent_encnegtra WHERE ENT_IdEnt = ?',
    [viajeId]
  );

  if (viaje.length === 0) {
    console.log('  ❌ El viaje no existe');
    await connection.end();
    return;
  }

  console.log(`  ✅ Viaje encontrado:`);
  console.log(`     - ID: ${viaje[0].ENT_IdEnt}`);
  console.log(`     - Número: ${viaje[0].ENT_Numero}`);
  console.log(`     - Cliente: ${viaje[0].TER_RazonSocialTer}`);
  console.log(`     - Reservas: ${viaje[0].ENT_CantCuposReser || 0}`);

  // Verificar autorizaciones
  const [autorizaciones] = await connection.execute(
    'SELECT ECP_IdEcp FROM sige_ecp_enccarpor WHERE ENT_IdEnt = ?',
    [viajeId]
  );

  console.log(`\n  ✅ Autorizaciones encontradas: ${autorizaciones.length}`);
  autorizaciones.forEach(auth => {
    console.log(`     - ECP_IdEcp: ${auth.ECP_IdEcp}`);
  });

  // Verificar detalles
  for (const auth of autorizaciones) {
    const [detalles] = await connection.execute(
      'SELECT TIC_IdTic, TER_RazonSocialTerTic FROM sige_icp_intcarpor WHERE ECP_IdEcp = ?',
      [auth.ECP_IdEcp]
    );
    console.log(`     - Detalles de ECP_IdEcp ${auth.ECP_IdEcp}: ${detalles.length}`);
    detalles.forEach(det => {
      console.log(`       · TIC_IdTic: ${det.TIC_IdTic}, Chofer: ${det.TER_RazonSocialTerTic}`);
    });
  }

  // ===== PROCESO DE ELIMINACIÓN (SIMULADO) =====
  console.log('\n🔧 SIMULANDO PROCESO DE ELIMINACIÓN:\n');

  console.log('  1️⃣  Buscando autorizaciones del viaje...');
  const [authList] = await connection.execute(
    'SELECT ECP_IdEcp FROM sige_ecp_enccarpor WHERE ENT_IdEnt = ?',
    [viajeId]
  );
  console.log(`     ✅ ${authList.length} autorizaciones encontradas`);

  console.log('\n  2️⃣  Eliminando detalles de autorizaciones...');
  let detallesEliminados = 0;
  for (const auth of authList) {
    const [result] = await connection.execute(
      'DELETE FROM sige_icp_intcarpor WHERE ECP_IdEcp = ?',
      [auth.ECP_IdEcp]
    );
    detallesEliminados += result.affectedRows;
    console.log(`     ✅ Eliminados ${result.affectedRows} detalles de ECP_IdEcp ${auth.ECP_IdEcp}`);
  }

  console.log('\n  3️⃣  Eliminando cabeceras de autorizaciones...');
  const [resultCabeceras] = await connection.execute(
    'DELETE FROM sige_ecp_enccarpor WHERE ENT_IdEnt = ?',
    [viajeId]
  );
  console.log(`     ✅ Eliminadas ${resultCabeceras.affectedRows} cabeceras`);

  console.log('\n  4️⃣  Eliminando viaje...');
  const [resultViaje] = await connection.execute(
    'DELETE FROM sige_ent_encnegtra WHERE ENT_IdEnt = ? AND IFNULL(ENT_CantCuposReser,0) = 0',
    [viajeId]
  );
  console.log(`     ✅ Viaje eliminado: ${resultViaje.affectedRows > 0 ? 'SÍ' : 'NO'}`);

  // ===== DESPUÉS =====
  console.log('\n📊 DESPUÉS DE ELIMINAR:\n');

  // Verificar viaje
  const [viajeAfter] = await connection.execute(
    'SELECT * FROM sige_ent_encnegtra WHERE ENT_IdEnt = ?',
    [viajeId]
  );
  console.log(`  ${viajeAfter.length === 0 ? '✅' : '❌'} Viaje: ${viajeAfter.length === 0 ? 'ELIMINADO' : 'AÚN EXISTE'}`);

  // Verificar autorizaciones
  const [authAfter] = await connection.execute(
    'SELECT * FROM sige_ecp_enccarpor WHERE ENT_IdEnt = ?',
    [viajeId]
  );
  console.log(`  ${authAfter.length === 0 ? '✅' : '❌'} Autorizaciones: ${authAfter.length === 0 ? 'ELIMINADAS' : `AÚN EXISTEN (${authAfter.length})`}`);

  // Verificar detalles huérfanos
  const [detallesHuerfanos] = await connection.execute(`
    SELECT icp.*
    FROM sige_icp_intcarpor icp
    LEFT JOIN sige_ecp_enccarpor ecp ON icp.ECP_IdEcp = ecp.ECP_IdEcp
    WHERE ecp.ECP_IdEcp IS NULL
  `);
  console.log(`  ${detallesHuerfanos.length === 0 ? '✅' : '⚠️'} Detalles huérfanos: ${detallesHuerfanos.length}`);

  // Verificar cabeceras huérfanas
  const [cabecerasHuerfanas] = await connection.execute(`
    SELECT ecp.ECP_IdEcp, ecp.ENT_IdEnt
    FROM sige_ecp_enccarpor ecp
    LEFT JOIN sige_icp_intcarpor icp ON ecp.ECP_IdEcp = icp.ECP_IdEcp
    GROUP BY ecp.ECP_IdEcp, ecp.ENT_IdEnt
    HAVING COUNT(icp.TIC_IdTic) = 0
  `);
  console.log(`  ${cabecerasHuerfanas.length === 0 ? '✅' : '⚠️'} Cabeceras huérfanas en toda la BD: ${cabecerasHuerfanas.length}`);

  // ===== RESUMEN =====
  console.log('\n📝 RESUMEN:\n');
  console.log(`  • Detalles eliminados: ${detallesEliminados}`);
  console.log(`  • Cabeceras eliminadas: ${resultCabeceras.affectedRows}`);
  console.log(`  • Viaje eliminado: ${resultViaje.affectedRows > 0 ? 'SÍ' : 'NO'}`);

  const todoOk = viajeAfter.length === 0 &&
                 authAfter.length === 0 &&
                 detallesHuerfanos.length === 0 &&
                 resultViaje.affectedRows > 0;

  console.log('\n' + '='.repeat(60));
  console.log(todoOk ? '✅ TEST EXITOSO: Todo se eliminó correctamente' : '❌ TEST FALLIDO: Hay problemas');
  console.log('='.repeat(60) + '\n');

  await connection.end();
}

testEliminarViaje710().catch(console.error);
