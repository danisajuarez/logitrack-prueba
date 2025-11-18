const mysql = require('mysql2/promise');

async function testAutorizacionCompleta(viajeId) {
  const connection = await mysql.createConnection({
    host: 'remoto.retec.com.ar',
    user: 'danisa',
    password: 'danisa2025',
    database: 'lt',
    port: 3307
  });

  console.log(`\n🔍 TEST COMPLETO DE AUTORIZACIONES - VIAJE ${viajeId}\n`);
  console.log('='.repeat(70));

  // 1. Datos del viaje
  const [viaje] = await connection.execute(
    `SELECT
      ENT_IdEnt,
      ENT_Numero,
      ENT_Fecha,
      TER_RazonSocialTer,
      LOC_NomLocalidadOrig,
      LOC_NomLocalidadDest,
      TVP_Caracteristicas,
      ENT_Tarifa,
      ENT_CantCupos
    FROM sige_ent_encnegtra
    WHERE ENT_IdEnt = ?`,
    [viajeId]
  );

  if (viaje.length === 0) {
    console.log('❌ Viaje no encontrado');
    await connection.end();
    return;
  }

  const v = viaje[0];
  console.log('\n📊 DATOS DEL VIAJE (sige_ent_encnegtra):\n');
  console.log(`   • ID: ${v.ENT_IdEnt}`);
  console.log(`   • Número: ${v.ENT_Numero || '(sin número)'}`);
  console.log(`   • Fecha: ${v.ENT_Fecha}`);
  console.log(`   • Cliente: ${v.TER_RazonSocialTer}`);
  console.log(`   • Origen: ${v.LOC_NomLocalidadOrig}`);
  console.log(`   • Destino: ${v.LOC_NomLocalidadDest}`);
  console.log(`   • Artículo: ${v.TVP_Caracteristicas}`);
  console.log(`   • Tarifa: ${v.ENT_Tarifa}`);
  console.log(`   • Cupos: ${v.ENT_CantCupos}`);

  // 2. Autorizaciones
  const [autorizaciones] = await connection.execute(
    `SELECT * FROM sige_ecp_enccarpor WHERE ENT_IdEnt = ?`,
    [viajeId]
  );

  console.log(`\n📋 AUTORIZACIONES (sige_ecp_enccarpor): ${autorizaciones.length}\n`);

  if (autorizaciones.length === 0) {
    console.log('   ℹ️  No hay autorizaciones para este viaje');
    console.log('   💡 Agrega choferes para crear una autorización\n');
    await connection.end();
    return;
  }

  for (const auth of autorizaciones) {
    console.log(`   📄 Autorización ECP_IdEcp: ${auth.ECP_IdEcp}`);
    console.log(`      • Número: ${auth.ECP_Numero || 'N/A'}`);
    console.log(`      • Fecha: ${auth.ECP_Fecha}`);
    console.log();

    // Comparar campos con el viaje
    console.log('      🔍 COMPARACIÓN CON EL VIAJE:');

    // Tarifa
    const tarifaOk = auth.ECP_Tarifa === v.ENT_Tarifa;
    console.log(`      • Tarifa: ${auth.ECP_Tarifa} ${tarifaOk ? '✅' : `❌ (viaje: ${v.ENT_Tarifa})`}`);

    // Cliente
    const clienteOk = auth.TER_RazonSocialTerEst === v.TER_RazonSocialTer;
    console.log(`      • Cliente: ${auth.TER_RazonSocialTerEst || 'N/A'} ${clienteOk ? '✅' : `❌ (viaje: ${v.TER_RazonSocialTer})`}`);

    // Origen
    const origenOk = auth.LOC_NomLocalidadEst === v.LOC_NomLocalidadOrig;
    console.log(`      • Origen: ${auth.LOC_NomLocalidadEst || 'N/A'} ${origenOk ? '✅' : `❌ (viaje: ${v.LOC_NomLocalidadOrig})`}`);

    // Destino
    const destinoOk = auth.LOC_NomLocalidadGran === v.LOC_NomLocalidadDest;
    console.log(`      • Destino: ${auth.LOC_NomLocalidadGran || 'N/A'} ${destinoOk ? '✅' : `❌ (viaje: ${v.LOC_NomLocalidadDest})`}`);

    // Artículo
    const articuloOk = auth.TVP_Caracteristicas === v.TVP_Caracteristicas;
    console.log(`      • Artículo: ${auth.TVP_Caracteristicas || 'N/A'} ${articuloOk ? '✅' : `❌ (viaje: ${v.TVP_Caracteristicas})`}`);

    // Detalles (choferes)
    const [detalles] = await connection.execute(
      `SELECT * FROM sige_icp_intcarpor WHERE ECP_IdEcp = ?`,
      [auth.ECP_IdEcp]
    );

    console.log(`\n      👥 CHOFERES/DETALLES: ${detalles.length}`);
    if (detalles.length > 0) {
      detalles.forEach((det, idx) => {
        console.log(`         ${idx + 1}. ${det.TER_RazonSocialTerTic} (CUIT: ${det.TER_CUITTerTic || 'N/A'})`);
      });
    }

    console.log();

    // Resumen de la autorización
    const todosOk = tarifaOk && clienteOk && origenOk && destinoOk && articuloOk;
    if (todosOk) {
      console.log('      ✅ TODOS LOS CAMPOS COINCIDEN CON EL VIAJE');
    } else {
      console.log('      ⚠️  ALGUNOS CAMPOS NO COINCIDEN - Puede indicar un problema');
    }
    console.log();
  }

  console.log('='.repeat(70));
  console.log();

  await connection.end();
}

const id = process.argv[2];
if (!id) {
  console.log('\n❌ Uso: node test-autorizacion-completa.js <VIAJE_ID>');
  console.log('Ejemplo: node test-autorizacion-completa.js 708\n');
  process.exit(1);
}

testAutorizacionCompleta(id).catch(console.error);
