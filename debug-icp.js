const mysql = require('mysql2/promise');

async function debugICP() {
  const connection = await mysql.createConnection({
    host: '190.188.150.107',
    port: 3307,
    user: 'lt',
    password: 'lt2025..',
    database: 'lt'
  });

  console.log('=== ESTRUCTURA DE sige_icp_intcarpor ===');
  const [columns] = await connection.query('DESCRIBE sige_icp_intcarpor');
  console.table(columns);

  console.log('\n=== ÚLTIMOS 5 REGISTROS ===');
  const [rows] = await connection.query(`
    SELECT * FROM sige_icp_intcarpor
    ORDER BY ECP_IdEcp DESC
    LIMIT 5
  `);
  console.table(rows);

  console.log('\n=== CONTAR REGISTROS TOTALES ===');
  const [count] = await connection.query('SELECT COUNT(*) as total FROM sige_icp_intcarpor');
  console.log('Total registros:', count[0].total);

  await connection.end();
}

debugICP().catch(console.error);
