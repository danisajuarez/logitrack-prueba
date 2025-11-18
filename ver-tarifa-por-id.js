const mysql = require('mysql2/promise');

async function verTarifa(viajeId) {
  const connection = await mysql.createConnection({
    host: 'remoto.retec.com.ar',
    user: 'danisa',
    password: 'danisa2025',
    database: 'lt',
    port: 3307
  });

  const [viajes] = await connection.execute(
    'SELECT ENT_IdEnt, ENT_Numero, ENT_Tarifa, TER_RazonSocialTer FROM sige_ent_encnegtra WHERE ENT_IdEnt = ?',
    [viajeId]
  );

  if (viajes.length === 0) {
    console.log('❌ Viaje no encontrado');
    await connection.end();
    return;
  }

  const v = viajes[0];
  console.log(`\n📊 VIAJE ${v.ENT_IdEnt}`);
  console.log(`   • Cliente: ${v.TER_RazonSocialTer}`);
  console.log(`   • Número: ${v.ENT_Numero || '(sin número)'}`);
  console.log(`   • Tarifa actual: ${v.ENT_Tarifa}\n`);

  await connection.end();
}

const id = process.argv[2];
if (!id) {
  console.log('\nUso: node ver-tarifa-por-id.js <ID>');
  console.log('Ejemplo: node ver-tarifa-por-id.js 698\n');
  process.exit(1);
}

verTarifa(id).catch(console.error);
