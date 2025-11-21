const mysql = require('mysql2/promise');

async function checkAutonum() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: '190.188.150.107',
      port: 3307,
      user: 'lg',
      password: 'L0g1st1c4.2d24G',
      database: 'lt',
      connectTimeout: 10000
    });

    console.log("=== DIAGNÓSTICO DE AUTONUMERADOR ===\n");

    // 1. Ver todos los registros de autonumerador para ECP
    console.log("1. Buscando autonumerador para sige_ecp_enccarpor...");
    const [autonum] = await connection.query(
      "SELECT * FROM sige_aut_autonum WHERE AUT_Tabla LIKE '%ecp%' OR AUT_Tabla LIKE '%ECP%'"
    );
    console.log("Registros encontrados:", autonum.length);
    autonum.forEach((row, i) => {
      console.log(`   [${i}] AUT_Tabla: '${row.AUT_Tabla}', AUT_Numero: ${row.AUT_Numero}`);
    });

    // 2. Buscar con LOWER
    console.log("\n2. Búsqueda con LOWER()...");
    const [lowerSearch] = await connection.query(
      "SELECT * FROM sige_aut_autonum WHERE LOWER(AUT_Tabla) = LOWER('sige_ecp_enccarpor')"
    );
    console.log("Resultados:", lowerSearch.length);
    lowerSearch.forEach(row => {
      console.log(`   AUT_Tabla: '${row.AUT_Tabla}', AUT_Numero: ${row.AUT_Numero}`);
    });

    // 3. Ver MAX ID en sige_ecp_enccarpor
    console.log("\n3. MAX(ECP_IdEcp) en sige_ecp_enccarpor...");
    const [maxId] = await connection.query("SELECT MAX(ECP_IdEcp) as maxId FROM sige_ecp_enccarpor");
    console.log("   Max ID:", maxId[0].maxId);

    // 4. Verificar si hay registro con ID 0
    console.log("\n4. ¿Existe ECP_IdEcp = 0?");
    const [zero] = await connection.query("SELECT COUNT(*) as cnt FROM sige_ecp_enccarpor WHERE ECP_IdEcp = 0");
    console.log("   Registros con ID 0:", zero[0].cnt);

    // 5. Estructura de la columna ECP_IdEcp
    console.log("\n5. Estructura de ECP_IdEcp...");
    const [cols] = await connection.query("SHOW COLUMNS FROM sige_ecp_enccarpor WHERE Field = 'ECP_IdEcp'");
    console.log("   Columna:", JSON.stringify(cols[0]));

    // 6. Simular la operación
    console.log("\n6. Simulando operación del código...");
    await connection.beginTransaction();

    const [rows] = await connection.query(
      "SELECT AUT_Numero, AUT_Tabla FROM sige_aut_autonum WHERE LOWER(AUT_Tabla) = LOWER(?) FOR UPDATE",
      ["sige_ecp_enccarpor"]
    );

    console.log("   Query result:", JSON.stringify(rows));

    if (rows.length > 0) {
      const tablaOriginal = rows[0].AUT_Tabla;
      const autNumeroActual = rows[0].AUT_Numero;
      const ecpNumero = Number(autNumeroActual) + 1;

      console.log(`   tablaOriginal: '${tablaOriginal}'`);
      console.log(`   autNumeroActual: ${autNumeroActual} (tipo: ${typeof autNumeroActual})`);
      console.log(`   ecpNumero calculado: ${ecpNumero}`);

      // Ver si ya existe ese ID
      const [exists] = await connection.query(
        "SELECT COUNT(*) as cnt FROM sige_ecp_enccarpor WHERE ECP_IdEcp = ?",
        [ecpNumero]
      );
      console.log(`   ¿ID ${ecpNumero} ya existe?: ${exists[0].cnt > 0 ? 'SÍ - CONFLICTO!' : 'No'}`);
    }

    await connection.rollback();

    console.log("\n=== FIN DIAGNÓSTICO ===");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkAutonum();
