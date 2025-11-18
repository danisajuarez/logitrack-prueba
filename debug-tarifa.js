const mysql = require('mysql2/promise');

async function debugTarifa(viajeNumero) {
  const connection = await mysql.createConnection({
    host: 'remoto.retec.com.ar',
    user: 'danisa',
    password: 'danisa2025',
    database: 'lt',
    port: 3307
  });

  console.log(`\n🔍 DEBUG: Verificando tarifa del viaje ${viajeNumero}\n`);

  // Buscar por número
  const [viajes] = await connection.execute(
    'SELECT ENT_IdEnt, ENT_Numero, ENT_Tarifa, ENT_CantCupos FROM sige_ent_encnegtra WHERE ENT_Numero = ?',
    [viajeNumero]
  );

  if (viajes.length === 0) {
    console.log('❌ No se encontró el viaje');
    await connection.end();
    return;
  }

  const viaje = viajes[0];
  console.log('📊 DATOS EN LA BASE DE DATOS:');
  console.log(`  • ID: ${viaje.ENT_IdEnt}`);
  console.log(`  • Número: ${viaje.ENT_Numero}`);
  console.log(`  • Tarifa: ${viaje.ENT_Tarifa}`);
  console.log(`  • Cupos: ${viaje.ENT_CantCupos}`);

  console.log('\n💡 PREGUNTA:');
  console.log(`  • ¿La tarifa debería ser 7000?`);
  console.log(`  • ¿Cuándo editaste el viaje?`);
  console.log(`  • ¿Viste el mensaje "Viaje actualizado correctamente"?`);

  await connection.end();
}

const numero = process.argv[2];

if (!numero) {
  console.log('\n❌ Uso: node debug-tarifa.js <NUMERO_VIAJE>');
  console.log('Ejemplo: node debug-tarifa.js 000711\n');
  process.exit(1);
}

debugTarifa(numero).catch(console.error);
