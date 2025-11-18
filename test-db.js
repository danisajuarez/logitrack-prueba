const mysql = require('mysql2/promise');
const fs = require('fs');

// Load .env.local manually
function loadEnv() {
  const envFile = fs.readFileSync('.env.local', 'utf-8');
  const lines = envFile.split('\n');
  lines.forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes
      value = value.replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
}

loadEnv();

async function testDB() {
  console.log('🔍 Testing database connection...\n');

  const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3307'),
    connectTimeout: 60000, // 60 seconds
  };

  console.log('Configuration:', {
    host: config.host,
    user: config.user,
    database: config.database,
    port: config.port,
    password: config.password ? '***' : 'NOT SET'
  });

  try {
    console.log('\n📡 Connecting to database...');
    const connection = await mysql.createConnection(config);
    console.log('✅ Connected successfully!\n');

    // Test 1: Check database
    console.log('📋 Current database:');
    const [dbResult] = await connection.query('SELECT DATABASE() as db');
    console.log('  Database:', dbResult[0].db);

    // Test 2: List all tables
    console.log('\n📊 Tables in database:');
    const [tables] = await connection.query('SHOW TABLES');
    tables.forEach((table) => {
      console.log('  -', Object.values(table)[0]);
    });

    // Test 3: Check users table
    console.log('\n👥 Checking users table (sige_usu_usuario):');
    try {
      const [users] = await connection.query(`
        SELECT
          USU_IdUsuario as id,
          USU_LogUsu as username,
          USU_DatosUsu as nombre,
          ven_idvendedor as vendedorId,
          LENGTH(USU_PassWord) as passwordLength
        FROM sige_usu_usuario
        LIMIT 5
      `);

      if (users.length === 0) {
        console.log('  ⚠️  No users found in database');
      } else {
        console.log(`  Found ${users.length} users:`);
        users.forEach(user => {
          console.log(`    - ID: ${user.id}, Username: ${user.username}, Name: ${user.nombre || 'N/A'}, Password Length: ${user.passwordLength}`);
        });
      }
    } catch (error) {
      console.log('  ❌ Error querying users:', error.message);
    }

    // Test 4: Check viajes table
    console.log('\n🚌 Checking viajes table (sige_viaje):');
    try {
      const [viajes] = await connection.query(`
        SELECT COUNT(*) as count FROM sige_viaje
      `);
      console.log(`  Total viajes: ${viajes[0].count}`);
    } catch (error) {
      console.log('  ❌ Error querying viajes:', error.message);
    }

    await connection.end();
    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Code:', error.code);
    if (error.errno) console.error('Errno:', error.errno);
    process.exit(1);
  }
}

testDB();
