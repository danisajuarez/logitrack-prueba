/**
 * TEST DE INTEGRIDAD DE BASE DE DATOS
 *
 * Este script prueba directamente la base de datos para encontrar inconsistencias
 * que el cliente podría encontrar
 */

const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'remoto.retec.com.ar',
  port: 3307,
  user: 'danisa',
  password: 'danisa2025',
  database: 'lt'
};

// Colores
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(name) {
  console.log(`\n${colors.cyan}━━━ ${name} ━━━${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

let testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  issues: []
};

async function runTests() {
  let connection;

  try {
    console.log("\n" + "=".repeat(70));
    log("TEST DE INTEGRIDAD DE BASE DE DATOS - VIAJES", colors.blue);
    console.log("=".repeat(70));

    connection = await mysql.createConnection(dbConfig);
    log("✓ Conectado a la base de datos", colors.green);

    // ============================================
    // TEST 1: Viajes con cupos inconsistentes
    // ============================================
    logTest("TEST 1: Viajes con cupos inconsistentes");

    const [viajesInconsistentes] = await connection.query(`
      SELECT
        ENT_IdEnt as id,
        ENT_Numero as numero,
        ENT_Fecha as fecha,
        TER_RazonSocialTer as razonSocial,
        ENT_CantCupos as cupos,
        ENT_CantCuposReser as reservados,
        ENT_CantCuposPend as pendientes,
        (ENT_CantCupos - ENT_CantCuposReser) as pendientesCalculados
      FROM sige_ent_encnegtra
      WHERE ENT_CantCuposPend != (ENT_CantCupos - ENT_CantCuposReser)
        AND ENT_IdEnt > 0
      LIMIT 20
    `);

    if (viajesInconsistentes.length > 0) {
      logError(`Encontrados ${viajesInconsistentes.length} viajes con cupos pendientes mal calculados`);
      viajesInconsistentes.slice(0, 5).forEach(v => {
        console.log(`  ID ${v.id} (${v.numero}): cuposPendientes=${v.pendientes}, debería ser ${v.pendientesCalculados}`);
        testResults.issues.push({
          type: 'CUPOS_INCONSISTENTES',
          id: v.id,
          numero: v.numero,
          error: `cuposPendientes=${v.pendientes}, debería ser ${v.pendientesCalculados}`
        });
      });
      testResults.failed++;
    } else {
      logSuccess("Todos los viajes tienen cupos pendientes calculados correctamente");
      testResults.passed++;
    }

    // ============================================
    // TEST 2: Viajes con cupos negativos
    // ============================================
    logTest("TEST 2: Viajes con cupos negativos o cero");

    const [viajesCuposNegativos] = await connection.query(`
      SELECT
        ENT_IdEnt as id,
        ENT_Numero as numero,
        ENT_Fecha as fecha,
        TER_RazonSocialTer as razonSocial,
        ENT_CantCupos as cupos,
        ENT_CantCuposReser as reservados,
        ENT_CantCuposPend as pendientes
      FROM sige_ent_encnegtra
      WHERE (ENT_CantCupos <= 0 OR ENT_CantCuposReser < 0 OR ENT_CantCuposPend < 0)
        AND ENT_IdEnt > 0
      LIMIT 20
    `);

    if (viajesCuposNegativos.length > 0) {
      logError(`Encontrados ${viajesCuposNegativos.length} viajes con cupos negativos o inválidos`);
      viajesCuposNegativos.slice(0, 5).forEach(v => {
        console.log(`  ID ${v.id}: cupos=${v.cupos}, reservados=${v.reservados}, pendientes=${v.pendientes}`);
        testResults.issues.push({
          type: 'CUPOS_NEGATIVOS',
          id: v.id,
          numero: v.numero,
          cupos: v.cupos,
          reservados: v.reservados,
          pendientes: v.pendientes
        });
      });
      testResults.failed++;
    } else {
      logSuccess("No hay viajes con cupos negativos");
      testResults.passed++;
    }

    // ============================================
    // TEST 3: Viajes con reservados > cupos totales
    // ============================================
    logTest("TEST 3: Viajes con reservados > cupos totales");

    const [viajesReservasMayores] = await connection.query(`
      SELECT
        ENT_IdEnt as id,
        ENT_Numero as numero,
        ENT_Fecha as fecha,
        TER_RazonSocialTer as razonSocial,
        ENT_CantCupos as cupos,
        ENT_CantCuposReser as reservados
      FROM sige_ent_encnegtra
      WHERE ENT_CantCuposReser > ENT_CantCupos
        AND ENT_IdEnt > 0
      LIMIT 20
    `);

    if (viajesReservasMayores.length > 0) {
      logError(`Encontrados ${viajesReservasMayores.length} viajes con reservados > cupos totales`);
      viajesReservasMayores.slice(0, 5).forEach(v => {
        console.log(`  ID ${v.id}: cupos=${v.cupos}, reservados=${v.reservados}`);
        testResults.issues.push({
          type: 'RESERVADOS_MAYORES',
          id: v.id,
          numero: v.numero,
          cupos: v.cupos,
          reservados: v.reservados
        });
      });
      testResults.failed++;
    } else {
      logSuccess("No hay viajes con reservados > cupos");
      testResults.passed++;
    }

    // ============================================
    // TEST 4: Viajes con tarifas negativas
    // ============================================
    logTest("TEST 4: Viajes con tarifas negativas");

    const [viajesTarifasNegativas] = await connection.query(`
      SELECT
        ENT_IdEnt as id,
        ENT_Numero as numero,
        ENT_Fecha as fecha,
        TER_RazonSocialTer as razonSocial,
        ENT_Tarifa as tarifa
      FROM sige_ent_encnegtra
      WHERE ENT_Tarifa < 0
        AND ENT_IdEnt > 0
      LIMIT 20
    `);

    if (viajesTarifasNegativas.length > 0) {
      logError(`Encontrados ${viajesTarifasNegativas.length} viajes con tarifas negativas`);
      viajesTarifasNegativas.slice(0, 5).forEach(v => {
        console.log(`  ID ${v.id}: tarifa=${v.tarifa}`);
        testResults.issues.push({
          type: 'TARIFA_NEGATIVA',
          id: v.id,
          numero: v.numero,
          tarifa: v.tarifa
        });
      });
      testResults.failed++;
    } else {
      logSuccess("No hay viajes con tarifas negativas");
      testResults.passed++;
    }

    // ============================================
    // TEST 5: Viajes sin datos obligatorios
    // ============================================
    logTest("TEST 5: Viajes sin datos obligatorios (razón social, origen, destino)");

    const [viajesSinDatos] = await connection.query(`
      SELECT
        ENT_IdEnt as id,
        ENT_Numero as numero,
        ENT_Fecha as fecha,
        TER_RazonSocialTer as razonSocial,
        LOC_NomLocalidadOrig as origen,
        LOC_NomLocalidadDest as destino
      FROM sige_ent_encnegtra
      WHERE (TER_RazonSocialTer IS NULL OR TER_RazonSocialTer = ''
         OR LOC_NomLocalidadOrig IS NULL OR LOC_NomLocalidadOrig = ''
         OR LOC_NomLocalidadDest IS NULL OR LOC_NomLocalidadDest = '')
        AND ENT_IdEnt > 0
      LIMIT 20
    `);

    if (viajesSinDatos.length > 0) {
      logWarning(`Encontrados ${viajesSinDatos.length} viajes sin datos obligatorios`);
      viajesSinDatos.slice(0, 5).forEach(v => {
        console.log(`  ID ${v.id}: razonSocial="${v.razonSocial || ''}", origen="${v.origen || ''}", destino="${v.destino || ''}"`);
        testResults.issues.push({
          type: 'DATOS_FALTANTES',
          id: v.id,
          numero: v.numero
        });
      });
      testResults.warnings++;
    } else {
      logSuccess("Todos los viajes tienen datos obligatorios");
      testResults.passed++;
    }

    // ============================================
    // TEST 6: Viajes con autorizaciones huérfanas
    // ============================================
    logTest("TEST 6: Viajes con autorizaciones sin detalles (huérfanas)");

    const [autorizacionesHuerfanas] = await connection.query(`
      SELECT
        ecp.ECP_IdEcp as id,
        ecp.ECP_Numero as numero,
        ecp.ENT_IdEnt as viajeId,
        COUNT(icp.ECP_IdEcp) as cantidadDetalles
      FROM sige_ecp_enccarpor ecp
      LEFT JOIN sige_icp_intcarpor icp ON ecp.ECP_IdEcp = icp.ECP_IdEcp
      WHERE ecp.ENT_IdEnt > 0
      GROUP BY ecp.ECP_IdEcp
      HAVING cantidadDetalles = 0
      LIMIT 20
    `);

    if (autorizacionesHuerfanas.length > 0) {
      logWarning(`Encontradas ${autorizacionesHuerfanas.length} autorizaciones sin detalles (pueden ser residuos)`);
      autorizacionesHuerfanas.slice(0, 5).forEach(a => {
        console.log(`  Autorización ${a.numero} (ECP_IdEcp=${a.id}) del viaje ${a.viajeId}`);
        testResults.issues.push({
          type: 'AUTORIZACION_HUERFANA',
          autorizacionId: a.id,
          numero: a.numero,
          viajeId: a.viajeId
        });
      });
      testResults.warnings++;
    } else {
      logSuccess("Todas las autorizaciones tienen detalles");
      testResults.passed++;
    }

    // ============================================
    // TEST 7: Postulaciones vs Cupos
    // ============================================
    logTest("TEST 7: Verificar relación entre postulaciones y cupos");

    const [viajesConPostulaciones] = await connection.query(`
      SELECT
        e.ENT_IdEnt as id,
        e.ENT_Numero as numero,
        e.ENT_CantCupos as cupos,
        e.ENT_CantCuposReser as reservados,
        e.ENT_CantCuposPend as pendientes,
        COUNT(icp.ECP_IdEcp) as postulados,
        (e.ENT_CantCupos - e.ENT_CantCuposReser - COUNT(icp.ECP_IdEcp)) as disponibles
      FROM sige_ent_encnegtra e
      LEFT JOIN sige_ecp_enccarpor ecp ON e.ENT_IdEnt = ecp.ENT_IdEnt
      LEFT JOIN sige_icp_intcarpor icp ON ecp.ECP_IdEcp = icp.ECP_IdEcp AND icp.TIC_IdTic = 9
      WHERE e.ENT_IdEnt > 0
        AND e.ENT_Fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY e.ENT_IdEnt
      HAVING (postulados + reservados) > cupos
      LIMIT 20
    `);

    if (viajesConPostulaciones.length > 0) {
      logError(`Encontrados ${viajesConPostulaciones.length} viajes donde postulados + reservados > cupos`);
      viajesConPostulaciones.slice(0, 5).forEach(v => {
        console.log(`  ID ${v.id}: cupos=${v.cupos}, reservados=${v.reservados}, postulados=${v.postulados}`);
        testResults.issues.push({
          type: 'SOBRECUPO',
          id: v.id,
          numero: v.numero,
          cupos: v.cupos,
          reservados: v.reservados,
          postulados: v.postulados
        });
      });
      testResults.failed++;
    } else {
      logSuccess("No hay viajes con sobrecupo (postulados + reservados > cupos)");
      testResults.passed++;
    }

    // ============================================
    // TEST 8: Viajes recientes sin carta porte
    // ============================================
    logTest("TEST 8: Viajes recientes sin carta porte asociada");

    const [viajesSinCartaPorte] = await connection.query(`
      SELECT
        e.ENT_IdEnt as id,
        e.ENT_Numero as numero,
        e.ENT_Fecha as fecha,
        e.TER_RazonSocialTer as razonSocial
      FROM sige_ent_encnegtra e
      LEFT JOIN sige_ecp_enccarpor ecp ON e.ENT_IdEnt = ecp.ENT_IdEnt
      WHERE e.ENT_Fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        AND e.ENT_IdEnt > 0
        AND ecp.ECP_IdEcp IS NULL
      LIMIT 20
    `);

    if (viajesSinCartaPorte.length > 0) {
      logWarning(`Encontrados ${viajesSinCartaPorte.length} viajes recientes (últimos 7 días) sin carta porte`);
      viajesSinCartaPorte.slice(0, 5).forEach(v => {
        console.log(`  ID ${v.id} (${v.numero}): ${v.fecha} - ${v.razonSocial}`);
        testResults.issues.push({
          type: 'SIN_CARTA_PORTE',
          id: v.id,
          numero: v.numero,
          fecha: v.fecha
        });
      });
      testResults.warnings++;
    } else {
      logSuccess("Todos los viajes recientes tienen carta porte");
      testResults.passed++;
    }

  } catch (error) {
    logError(`Error fatal: ${error.message}`);
    console.error(error);
    testResults.failed++;
  } finally {
    if (connection) {
      await connection.end();
    }

    // Resumen
    console.log("\n" + "=".repeat(70));
    log("RESUMEN DE TESTS DE INTEGRIDAD", colors.blue);
    console.log("=".repeat(70));
    logSuccess(`Tests exitosos: ${testResults.passed}`);
    logError(`Tests fallidos: ${testResults.failed}`);
    logWarning(`Advertencias: ${testResults.warnings}`);

    if (testResults.issues.length > 0) {
      console.log(`\n${colors.yellow}Total de problemas encontrados: ${testResults.issues.length}${colors.reset}`);

      // Agrupar por tipo
      const byType = {};
      testResults.issues.forEach(issue => {
        byType[issue.type] = (byType[issue.type] || 0) + 1;
      });

      console.log("\nProblemas por tipo:");
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    }

    console.log("=".repeat(70) + "\n");
  }
}

runTests().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
