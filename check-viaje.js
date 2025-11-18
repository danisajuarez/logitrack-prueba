const mysql = require('mysql2/promise');

async function checkViaje() {
  const connection = await mysql.createConnection({
    host: 'remoto.retec.com.ar',
    user: 'danisa',
    password: 'danisa2025',
    database: 'lt',
    port: 3307
  });

  console.log('🔍 Buscando viaje 1907...\n');

  // Buscar por ID
  const [byId] = await connection.execute(
    'SELECT ENT_IdEnt, ENT_Numero, TER_RazonSocialTer, ENT_CantCuposReser FROM sige_ent_encnegtra WHERE ENT_IdEnt = ?',
    [1907]
  );

  console.log('📋 Búsqueda por ENT_IdEnt = 1907:');
  if (byId.length > 0) {
    console.log('  ✅ ENCONTRADO:');
    byId.forEach(row => {
      console.log(`    - ID: ${row.ENT_IdEnt}`);
      console.log(`    - Número: ${row.ENT_Numero}`);
      console.log(`    - Razón Social: ${row.TER_RazonSocialTer}`);
      console.log(`    - Cupos Reservados: ${row.ENT_CantCuposReser}`);
    });
  } else {
    console.log('  ❌ No encontrado');
  }

  // Buscar por número
  console.log('\n📋 Búsqueda por ENT_Numero = "1907":');
  const [byNumero] = await connection.execute(
    'SELECT ENT_IdEnt, ENT_Numero, TER_RazonSocialTer, ENT_CantCuposReser FROM sige_ent_encnegtra WHERE ENT_Numero = ?',
    ['1907']
  );

  if (byNumero.length > 0) {
    console.log('  ✅ ENCONTRADO:');
    byNumero.forEach(row => {
      console.log(`    - ID: ${row.ENT_IdEnt}`);
      console.log(`    - Número: ${row.ENT_Numero}`);
      console.log(`    - Razón Social: ${row.TER_RazonSocialTer}`);
      console.log(`    - Cupos Reservados: ${row.ENT_CantCuposReser}`);
    });
  } else {
    console.log('  ❌ No encontrado');
  }

  await connection.end();
}

checkViaje().catch(console.error);
