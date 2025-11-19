const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'remoto.retec.com.ar',
  port: 3307,
  user: 'danisa',
  password: 'danisa2025',
  database: 'lt'
};

async function main() {
  const connection = await mysql.createConnection(dbConfig);

  // Ver estructura de la tabla
  const [columns] = await connection.query('DESCRIBE sige_ecp_enccarpor');

  console.log('\n=== ESTRUCTURA DE sige_ecp_enccarpor ===\n');
  console.table(columns.map(c => ({
    Campo: c.Field,
    Tipo: c.Type,
    Nulo: c.Null,
    Default: c.Default
  })));

  await connection.end();
}

main().catch(console.error);
