const mysql = require('mysql2/promise');

async function verificarTarifaAutorizacion(viajeId) {
  const connection = await mysql.createConnection({
    host: 'remoto.retec.com.ar',
    user: 'danisa',
    password: 'danisa2025',
    database: 'lt',
    port: 3307
  });

  console.log(`\n🔍 VERIFICANDO TARIFAS DEL VIAJE ${viajeId}\n`);

  // 1. Tarifa del viaje
  const [viaje] = await connection.execute(
    'SELECT ENT_IdEnt, ENT_Numero, ENT_Tarifa, TER_RazonSocialTer FROM sige_ent_encnegtra WHERE ENT_IdEnt = ?',
    [viajeId]
  );

  if (viaje.length === 0) {
    console.log('❌ Viaje no encontrado');
    await connection.end();
    return;
  }

  const v = viaje[0];
  console.log('📊 VIAJE (sige_ent_encnegtra):');
  console.log(`   • ID: ${v.ENT_IdEnt}`);
  console.log(`   • Cliente: ${v.TER_RazonSocialTer}`);
  console.log(`   • Tarifa (ENT_Tarifa): ${v.ENT_Tarifa} ✅\n`);

  // 2. Tarifas de las autorizaciones
  const [autorizaciones] = await connection.execute(
    `SELECT
      ECP_IdEcp,
      ECP_Numero,
      ECP_Tarifa,
      ECP_TarifaTrans,
      ENT_IdEnt
    FROM sige_ecp_enccarpor
    WHERE ENT_IdEnt = ?`,
    [viajeId]
  );

  if (autorizaciones.length === 0) {
    console.log('ℹ️  No hay autorizaciones para este viaje\n');
  } else {
    console.log('📋 AUTORIZACIONES (sige_ecp_enccarpor):');
    autorizaciones.forEach((auth, idx) => {
      console.log(`\n   ${idx + 1}. Autorización ECP_IdEcp: ${auth.ECP_IdEcp}`);
      console.log(`      • Número: ${auth.ECP_Numero || 'N/A'}`);
      console.log(`      • ECP_Tarifa: ${auth.ECP_Tarifa} ${auth.ECP_Tarifa === v.ENT_Tarifa ? '✅' : '❌ NO COINCIDE'}`);
      console.log(`      • ECP_TarifaTrans: ${auth.ECP_TarifaTrans}`);
    });
    console.log();
  }

  // 3. Comparación
  console.log('🔍 ANÁLISIS:');
  if (autorizaciones.length > 0) {
    const coinciden = autorizaciones.every(auth => auth.ECP_Tarifa === v.ENT_Tarifa);
    if (coinciden) {
      console.log('   ✅ Las tarifas de las autorizaciones coinciden con el viaje');
    } else {
      console.log('   ❌ LAS TARIFAS NO COINCIDEN - HAY UN BUG');
      console.log(`   • Tarifa del viaje: ${v.ENT_Tarifa}`);
      autorizaciones.forEach(auth => {
        console.log(`   • Tarifa autorización ${auth.ECP_IdEcp}: ${auth.ECP_Tarifa}`);
      });
    }
  }

  console.log();

  await connection.end();
}

const id = process.argv[2];
if (!id) {
  console.log('\n❌ Uso: node verificar-tarifa-autorizacion.js <VIAJE_ID>');
  console.log('Ejemplo: node verificar-tarifa-autorizacion.js 708\n');
  process.exit(1);
}

verificarTarifaAutorizacion(id).catch(console.error);
