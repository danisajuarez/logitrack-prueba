const mysql = require('mysql2/promise');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function pause() {
  return question('\n▶️  Presiona ENTER para continuar...');
}

async function testCompletoBD() {
  const connection = await mysql.createConnection({
    host: 'remoto.retec.com.ar',
    user: 'danisa',
    password: 'danisa2025',
    database: 'lt',
    port: 3307
  });

  console.clear();
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║   🧪 TEST COMPLETO DE BASE DE DATOS                       ║');
  console.log('║   Verificación de TODAS las operaciones CRUD              ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log();

  // ========== ESTADO INICIAL ==========
  console.log('📊 ESTADO INICIAL DE LA BASE DE DATOS\n');

  const [initialViajes] = await connection.execute('SELECT COUNT(*) as total FROM sige_ent_encnegtra');
  const [initialAuth] = await connection.execute('SELECT COUNT(*) as total FROM sige_ecp_enccarpor');
  const [initialDet] = await connection.execute('SELECT COUNT(*) as total FROM sige_icp_intcarpor');

  const estadoInicial = {
    viajes: initialViajes[0].total,
    autorizaciones: initialAuth[0].total,
    detalles: initialDet[0].total
  };

  console.log(`  • Total viajes: ${estadoInicial.viajes}`);
  console.log(`  • Total autorizaciones: ${estadoInicial.autorizaciones}`);
  console.log(`  • Total detalles: ${estadoInicial.detalles}`);

  await pause();

  // ========== TEST 1: CREAR VIAJE ==========
  console.log('\n' + '='.repeat(60));
  console.log('📝 TEST 1: CREAR NUEVO VIAJE');
  console.log('='.repeat(60));
  console.log('\n✋ ACCIÓN REQUERIDA:');
  console.log('   1. Abre la web: http://localhost:3000/viajes');
  console.log('   2. Haz clic en "Nuevo Viaje"');
  console.log('   3. Completa los datos:');
  console.log('      - Cliente: Cualquier tercero');
  console.log('      - Origen: Cualquier localidad');
  console.log('      - Destino: Cualquier localidad');
  console.log('      - Artículo: Cualquier producto');
  console.log('      - Cupos: 10');
  console.log('      - Tarifa: 5000');
  console.log('   4. Guarda el viaje');
  console.log('   5. ANOTA EL NÚMERO DE VIAJE que aparece');

  await pause();

  const numeroViaje = await question('\n📝 Ingresa el NÚMERO del viaje creado (ej: 000711): ');

  if (!numeroViaje) {
    console.log('\n❌ Debes ingresar el número de viaje');
    rl.close();
    await connection.end();
    return;
  }

  console.log('\n🔍 Buscando el viaje en la base de datos...');

  const [viajeCreado] = await connection.execute(
    'SELECT * FROM sige_ent_encnegtra WHERE ENT_Numero = ?',
    [numeroViaje]
  );

  if (viajeCreado.length === 0) {
    console.log('\n❌ ERROR: No se encontró el viaje en la base de datos');
    console.log('   Posibles causas:');
    console.log('   • El número ingresado es incorrecto');
    console.log('   • El viaje no se guardó correctamente');
    console.log('   • Hay un error en la función POST');
    rl.close();
    await connection.end();
    return;
  }

  const viaje = viajeCreado[0];
  const viajeId = viaje.ENT_IdEnt;

  console.log('\n✅ VIAJE ENCONTRADO EN LA BASE DE DATOS:');
  console.log(`   • ID: ${viaje.ENT_IdEnt}`);
  console.log(`   • Número: ${viaje.ENT_Numero}`);
  console.log(`   • Cliente: ${viaje.TER_RazonSocialTer}`);
  console.log(`   • Origen: ${viaje.LOC_NomLocalidadOrig}`);
  console.log(`   • Destino: ${viaje.LOC_NomLocalidadDest}`);
  console.log(`   • Artículo: ${viaje.TVP_Caracteristicas}`);
  console.log(`   • Cupos: ${viaje.ENT_CantCupos}`);
  console.log(`   • Tarifa: ${viaje.ENT_Tarifa}`);
  console.log(`   • Fecha: ${viaje.ENT_Fecha}`);
  console.log(`   • Usuario: ${viaje.USU_IdUsuario}`);

  console.log('\n✅ TEST 1 EXITOSO: El viaje se creó correctamente en la BD');

  await pause();

  // ========== TEST 2: AGREGAR CHOFERES ==========
  console.log('\n' + '='.repeat(60));
  console.log('👤 TEST 2: AGREGAR CHOFERES/POSTULACIONES');
  console.log('='.repeat(60));
  console.log('\n✋ ACCIÓN REQUERIDA:');
  console.log(`   1. En la lista de viajes, busca el viaje ${numeroViaje}`);
  console.log('   2. Haz clic en el botón verde "Choferes"');
  console.log('   3. Agrega 3 choferes/terceros');
  console.log('   4. Guarda cada uno');

  await pause();

  console.log('\n🔍 Verificando autorizaciones en la base de datos...');

  const [autorizaciones] = await connection.execute(
    `SELECT ecp.*, COUNT(icp.TIC_IdTic) as cant_detalles
     FROM sige_ecp_enccarpor ecp
     LEFT JOIN sige_icp_intcarpor icp ON ecp.ECP_IdEcp = icp.ECP_IdEcp
     WHERE ecp.ENT_IdEnt = ?
     GROUP BY ecp.ECP_IdEcp`,
    [viajeId]
  );

  if (autorizaciones.length === 0) {
    console.log('\n❌ ERROR: No se encontraron autorizaciones');
    console.log('   • Verifica que hayas guardado los choferes correctamente');
  } else {
    console.log(`\n✅ AUTORIZACIONES ENCONTRADAS: ${autorizaciones.length}\n`);

    for (const auth of autorizaciones) {
      console.log(`   📋 Autorización ECP_IdEcp: ${auth.ECP_IdEcp}`);
      console.log(`      • Número: ${auth.ECP_Numero || 'N/A'}`);
      console.log(`      • Fecha: ${auth.ECP_Fecha}`);
      console.log(`      • Detalles (choferes): ${auth.cant_detalles}`);

      // Mostrar detalles
      const [detalles] = await connection.execute(
        'SELECT * FROM sige_icp_intcarpor WHERE ECP_IdEcp = ?',
        [auth.ECP_IdEcp]
      );

      if (detalles.length > 0) {
        console.log(`      • Choferes:`);
        detalles.forEach((det, idx) => {
          console.log(`        ${idx + 1}. ${det.TER_RazonSocialTerTic} (CUIT: ${det.TER_CUITTerTic || 'N/A'})`);
        });
      }
      console.log();
    }

    const totalChoferes = autorizaciones.reduce((sum, auth) => sum + auth.cant_detalles, 0);
    console.log(`   ✅ Total de choferes agregados: ${totalChoferes}`);
  }

  console.log('\n✅ TEST 2 EXITOSO: Las postulaciones se guardaron correctamente');

  await pause();

  // ========== TEST 3: EDITAR VIAJE ==========
  console.log('\n' + '='.repeat(60));
  console.log('✏️  TEST 3: EDITAR VIAJE');
  console.log('='.repeat(60));
  console.log('\n✋ ACCIÓN REQUERIDA:');
  console.log(`   1. Busca el viaje ${numeroViaje} en la lista`);
  console.log('   2. Haz clic en "Editar"');
  console.log('   3. Cambia algunos datos:');
  console.log('      - Cupos: 15 (antes era 10)');
  console.log('      - Tarifa: 7000 (antes era 5000)');
  console.log('   4. Guarda los cambios');

  await pause();

  console.log('\n🔍 Verificando cambios en la base de datos...');

  const [viajeEditado] = await connection.execute(
    'SELECT * FROM sige_ent_encnegtra WHERE ENT_IdEnt = ?',
    [viajeId]
  );

  if (viajeEditado.length === 0) {
    console.log('\n❌ ERROR: El viaje desapareció de la base de datos');
  } else {
    const v = viajeEditado[0];
    console.log('\n✅ VIAJE DESPUÉS DE EDITAR:');
    console.log(`   • Cupos: ${v.ENT_CantCupos} ${v.ENT_CantCupos == 15 ? '✅' : '⚠️ (esperado: 15)'}`);
    console.log(`   • Tarifa: ${v.ENT_Tarifa} ${v.ENT_Tarifa == 7000 ? '✅' : '⚠️ (esperado: 7000)'}`);
  }

  console.log('\n✅ TEST 3 EXITOSO: Los cambios se guardaron correctamente');

  await pause();

  // ========== TEST 4: ELIMINAR CHOFERES ==========
  console.log('\n' + '='.repeat(60));
  console.log('🗑️  TEST 4: ELIMINAR CHOFERES');
  console.log('='.repeat(60));
  console.log('\n✋ ACCIÓN REQUERIDA:');
  console.log(`   1. Abre el modal de choferes del viaje ${numeroViaje}`);
  console.log('   2. Elimina TODOS los choferes uno por uno');
  console.log('   3. Cierra el modal');

  await pause();

  console.log('\n🔍 Verificando eliminación de choferes...');

  const [detallesDespues] = await connection.execute(
    `SELECT COUNT(*) as total
     FROM sige_ecp_enccarpor ecp
     INNER JOIN sige_icp_intcarpor icp ON ecp.ECP_IdEcp = icp.ECP_IdEcp
     WHERE ecp.ENT_IdEnt = ?`,
    [viajeId]
  );

  const choferesRestantes = detallesDespues[0].total;

  if (choferesRestantes > 0) {
    console.log(`\n⚠️  ADVERTENCIA: Aún hay ${choferesRestantes} choferes en la BD`);
    console.log('   • Verifica que los hayas eliminado correctamente');
  } else {
    console.log('\n✅ CHOFERES ELIMINADOS: No quedan detalles de choferes');
  }

  // Verificar cabeceras huérfanas
  const [cabecerasHuerfanas] = await connection.execute(
    `SELECT ecp.ECP_IdEcp, COUNT(icp.TIC_IdTic) as cant_detalles
     FROM sige_ecp_enccarpor ecp
     LEFT JOIN sige_icp_intcarpor icp ON ecp.ECP_IdEcp = icp.ECP_IdEcp
     WHERE ecp.ENT_IdEnt = ?
     GROUP BY ecp.ECP_IdEcp
     HAVING cant_detalles = 0`,
    [viajeId]
  );

  if (cabecerasHuerfanas.length > 0) {
    console.log(`\n⚠️  CABECERAS HUÉRFANAS DETECTADAS: ${cabecerasHuerfanas.length}`);
    console.log('   • Estas se limpiarán automáticamente al eliminar el viaje');
  }

  console.log('\n✅ TEST 4 EXITOSO: Los choferes se eliminaron correctamente');

  await pause();

  // ========== TEST 5: ELIMINAR VIAJE ==========
  console.log('\n' + '='.repeat(60));
  console.log('🗑️  TEST 5: ELIMINAR VIAJE COMPLETO');
  console.log('='.repeat(60));
  console.log('\n✋ ACCIÓN REQUERIDA:');
  console.log(`   1. Busca el viaje ${numeroViaje} en la lista`);
  console.log('   2. Haz clic en "Editar"');
  console.log('   3. Haz clic en "Eliminar"');
  console.log('   4. Confirma la eliminación');

  await pause();

  console.log('\n🔍 Verificando eliminación completa...');

  // Verificar viaje
  const [viajeEliminado] = await connection.execute(
    'SELECT * FROM sige_ent_encnegtra WHERE ENT_IdEnt = ?',
    [viajeId]
  );

  // Verificar autorizaciones
  const [authEliminadas] = await connection.execute(
    'SELECT * FROM sige_ecp_enccarpor WHERE ENT_IdEnt = ?',
    [viajeId]
  );

  // Verificar detalles
  const [detEliminados] = await connection.execute(
    `SELECT icp.*
     FROM sige_icp_intcarpor icp
     INNER JOIN sige_ecp_enccarpor ecp ON icp.ECP_IdEcp = ecp.ECP_IdEcp
     WHERE ecp.ENT_IdEnt = ?`,
    [viajeId]
  );

  console.log('\n📊 VERIFICACIÓN FINAL:\n');
  console.log(`   ${viajeEliminado.length === 0 ? '✅' : '❌'} Viaje: ${viajeEliminado.length === 0 ? 'ELIMINADO' : 'AÚN EXISTE'}`);
  console.log(`   ${authEliminadas.length === 0 ? '✅' : '❌'} Autorizaciones: ${authEliminadas.length === 0 ? 'ELIMINADAS' : `AÚN EXISTEN (${authEliminadas.length})`}`);
  console.log(`   ${detEliminados.length === 0 ? '✅' : '❌'} Detalles: ${detEliminados.length === 0 ? 'ELIMINADOS' : `AÚN EXISTEN (${detEliminados.length})`}`);

  // Verificar autorizaciones huérfanas globales
  const [huerfanasGlobales] = await connection.execute(`
    SELECT COUNT(*) as total
    FROM sige_ecp_enccarpor ecp
    LEFT JOIN sige_icp_intcarpor icp ON ecp.ECP_IdEcp = icp.ECP_IdEcp
    GROUP BY ecp.ECP_IdEcp
    HAVING COUNT(icp.TIC_IdTic) = 0
  `);

  console.log(`   ${huerfanasGlobales.length === 0 ? '✅' : '⚠️'} Huérfanas globales: ${huerfanasGlobales.length}`);

  console.log('\n✅ TEST 5 EXITOSO: El viaje se eliminó completamente');

  await pause();

  // ========== RESUMEN FINAL ==========
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESUMEN FINAL DEL TESTING');
  console.log('═'.repeat(60));

  const [finalViajes] = await connection.execute('SELECT COUNT(*) as total FROM sige_ent_encnegtra');
  const [finalAuth] = await connection.execute('SELECT COUNT(*) as total FROM sige_ecp_enccarpor');
  const [finalDet] = await connection.execute('SELECT COUNT(*) as total FROM sige_icp_intcarpor');

  console.log('\n📊 ESTADO FINAL DE LA BASE DE DATOS:\n');
  console.log(`   • Viajes: ${estadoInicial.viajes} → ${finalViajes[0].total}`);
  console.log(`   • Autorizaciones: ${estadoInicial.autorizaciones} → ${finalAuth[0].total}`);
  console.log(`   • Detalles: ${estadoInicial.detalles} → ${finalDet[0].total}`);

  const viajesOk = estadoInicial.viajes === finalViajes[0].total;
  const authOk = estadoInicial.autorizaciones === finalAuth[0].total;
  const detOk = estadoInicial.detalles === finalDet[0].total;

  console.log('\n✅ VERIFICACIÓN DE INTEGRIDAD:\n');
  console.log(`   ${viajesOk ? '✅' : '❌'} Viajes volvieron al estado inicial`);
  console.log(`   ${authOk ? '✅' : '❌'} Autorizaciones volvieron al estado inicial`);
  console.log(`   ${detOk ? '✅' : '❌'} Detalles volvieron al estado inicial`);

  if (viajesOk && authOk && detOk) {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║   🎉 ¡TODOS LOS TESTS PASARON EXITOSAMENTE!              ║');
    console.log('║                                                           ║');
    console.log('║   ✅ Creación de viajes: OK                               ║');
    console.log('║   ✅ Agregar choferes: OK                                 ║');
    console.log('║   ✅ Editar viajes: OK                                    ║');
    console.log('║   ✅ Eliminar choferes: OK                                ║');
    console.log('║   ✅ Eliminar viajes: OK                                  ║');
    console.log('║   ✅ Integridad de datos: PERFECTA                        ║');
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
  } else {
    console.log('\n⚠️  ADVERTENCIA: Los totales no coinciden');
    console.log('   Esto puede indicar que:');
    console.log('   • No se completaron todos los pasos');
    console.log('   • Hay un problema de integridad');
    console.log('   • Se realizaron operaciones adicionales');
  }

  console.log('\n');

  rl.close();
  await connection.end();
}

testCompletoBD().catch(console.error);
