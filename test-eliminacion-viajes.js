const mysql = require('mysql2/promise');

async function testEliminacionViajes() {
  const connection = await mysql.createConnection({
    host: 'remoto.retec.com.ar',
    user: 'danisa',
    password: 'danisa2025',
    database: 'lt',
    port: 3307
  });

  console.log('🧪 TEST DE ELIMINACIÓN DE VIAJES CON AUTORIZACIONES\n');
  console.log('='.repeat(60));

  // ===== PASO 1: VERIFICAR ESTADO INICIAL =====
  console.log('\n📊 PASO 1: Verificando estado inicial de la base de datos...\n');

  const [totalViajes] = await connection.execute(
    'SELECT COUNT(*) as total FROM sige_ent_encnegtra'
  );
  console.log(`  ✅ Total de viajes: ${totalViajes[0].total}`);

  const [totalAutorizaciones] = await connection.execute(
    'SELECT COUNT(*) as total FROM sige_ecp_enccarpor'
  );
  console.log(`  ✅ Total de autorizaciones (cabecera): ${totalAutorizaciones[0].total}`);

  const [totalDetalles] = await connection.execute(
    'SELECT COUNT(*) as total FROM sige_icp_intcarpor'
  );
  console.log(`  ✅ Total de detalles de autorizaciones: ${totalDetalles[0].total}`);

  // Verificar autorizaciones huérfanas
  const [huerfanas] = await connection.execute(`
    SELECT COUNT(*) as total
    FROM sige_ecp_enccarpor ecp
    LEFT JOIN sige_icp_intcarpor icp ON ecp.ECP_IdEcp = icp.ECP_IdEcp
    GROUP BY ecp.ECP_IdEcp
    HAVING COUNT(icp.TIC_IdTic) = 0
  `);
  console.log(`  ✅ Autorizaciones huérfanas actuales: ${huerfanas.length}`);

  // ===== PASO 2: BUSCAR VIAJES RECIENTES PARA TESTEAR =====
  console.log('\n📋 PASO 2: Buscando viajes recientes para testear...\n');

  const [viajesRecientes] = await connection.execute(`
    SELECT
      ent.ENT_IdEnt,
      ent.ENT_Numero,
      ent.TER_RazonSocialTer,
      ent.ENT_CantCuposReser,
      COUNT(ecp.ECP_IdEcp) as cant_autorizaciones
    FROM sige_ent_encnegtra ent
    LEFT JOIN sige_ecp_enccarpor ecp ON ent.ENT_IdEnt = ecp.ENT_IdEnt
    WHERE ent.ENT_Fecha >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY ent.ENT_IdEnt, ent.ENT_Numero, ent.TER_RazonSocialTer, ent.ENT_CantCuposReser
    ORDER BY ent.ENT_IdEnt DESC
    LIMIT 10
  `);

  console.log('  Últimos 10 viajes:');
  viajesRecientes.forEach(v => {
    const status = v.ENT_CantCuposReser > 0 ? '🔒 CON RESERVAS' : '🟢 SIN RESERVAS';
    console.log(`    - ID: ${v.ENT_IdEnt}, Número: ${v.ENT_Numero}, Autorizaciones: ${v.cant_autorizaciones} ${status}`);
  });

  // ===== PASO 3: ANALIZAR UN VIAJE ESPECÍFICO =====
  console.log('\n🔍 PASO 3: Análisis detallado de viajes con autorizaciones...\n');

  // Buscar viajes que tengan autorizaciones pero SIN reservas (candidatos para eliminar)
  const [candidatos] = await connection.execute(`
    SELECT
      ent.ENT_IdEnt,
      ent.ENT_Numero,
      ent.TER_RazonSocialTer,
      ent.ENT_CantCuposReser,
      COUNT(ecp.ECP_IdEcp) as cant_autorizaciones
    FROM sige_ent_encnegtra ent
    INNER JOIN sige_ecp_enccarpor ecp ON ent.ENT_IdEnt = ecp.ENT_IdEnt
    WHERE IFNULL(ent.ENT_CantCuposReser, 0) = 0
    GROUP BY ent.ENT_IdEnt, ent.ENT_Numero, ent.TER_RazonSocialTer, ent.ENT_CantCuposReser
    ORDER BY ent.ENT_IdEnt DESC
    LIMIT 5
  `);

  if (candidatos.length > 0) {
    console.log(`  ✅ Encontrados ${candidatos.length} viajes SIN RESERVAS pero CON autorizaciones:`);
    candidatos.forEach(v => {
      console.log(`    - ID: ${v.ENT_IdEnt}, Número: ${v.ENT_Numero}, Autorizaciones: ${v.cant_autorizaciones}`);
    });

    // Analizar detalles del primer candidato
    const viajeTest = candidatos[0];
    console.log(`\n  📊 Detalles del viaje ${viajeTest.ENT_IdEnt}:`);

    const [authDetails] = await connection.execute(`
      SELECT
        ecp.ECP_IdEcp,
        COUNT(icp.TIC_IdTic) as cant_detalles
      FROM sige_ecp_enccarpor ecp
      LEFT JOIN sige_icp_intcarpor icp ON ecp.ECP_IdEcp = icp.ECP_IdEcp
      WHERE ecp.ENT_IdEnt = ?
      GROUP BY ecp.ECP_IdEcp
    `, [viajeTest.ENT_IdEnt]);

    authDetails.forEach(auth => {
      console.log(`    - Autorización ECP_IdEcp: ${auth.ECP_IdEcp}, Detalles: ${auth.cant_detalles}`);
    });
  } else {
    console.log('  ℹ️  No se encontraron viajes con autorizaciones y sin reservas');
  }

  // ===== PASO 4: INSTRUCCIONES DE PRUEBA =====
  console.log('\n📝 PASO 4: Plan de testing recomendado\n');
  console.log('  1️⃣  Crea un nuevo viaje desde la interfaz web');
  console.log('  2️⃣  Agrega algunas postulaciones/choferes a ese viaje');
  console.log('  3️⃣  Elimina las postulaciones una por una');
  console.log('  4️⃣  Intenta eliminar el viaje');
  console.log('  5️⃣  Verifica que:');
  console.log('      - El viaje se elimina correctamente');
  console.log('      - Las autorizaciones (cabecera) se eliminan');
  console.log('      - No quedan registros huérfanos\n');

  if (candidatos.length > 0) {
    console.log('  💡 ALTERNATIVA: Puedes probar con el viaje existente:');
    console.log(`     - ID: ${candidatos[0].ENT_IdEnt}`);
    console.log(`     - Número: ${candidatos[0].ENT_Numero}`);
    console.log(`     - Tiene ${candidatos[0].cant_autorizaciones} autorizaciones`);
    console.log(`     - No tiene reservas (se puede eliminar)`);
  }

  console.log('\n='.repeat(60));
  console.log('✅ Verificación completada\n');

  await connection.end();
}

testEliminacionViajes().catch(console.error);
