/**
 * SCRIPT INTERACTIVO DE CONSULTA A LA BASE DE DATOS
 *
 * Uso: node consulta-db.js [comando] [parametros]
 *
 * Comandos disponibles:
 *   viajes [id]              - Ver todos los viajes o uno específico
 *   viaje-completo [id]      - Ver viaje con todos sus datos relacionados
 *   autorizaciones [viajeId] - Ver autorizaciones de un viaje
 *   postulaciones [viajeId]  - Ver postulaciones de un viaje
 *   inconsistentes           - Ver viajes con cupos inconsistentes
 *   recientes [dias]         - Ver viajes de los últimos N días (default: 7)
 *   query "SQL"              - Ejecutar query personalizado
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
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(text) {
  console.log("\n" + colors.cyan + "═".repeat(80) + colors.reset);
  console.log(colors.bright + colors.cyan + text + colors.reset);
  console.log(colors.cyan + "═".repeat(80) + colors.reset + "\n");
}

function formatDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

function formatNumber(num) {
  if (num == null) return 'N/A';
  return new Intl.NumberFormat('es-AR').format(num);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);
    log("✓ Conectado a la base de datos", colors.green);

    switch (command) {
      case 'help':
        showHelp();
        break;

      case 'viajes':
        await mostrarViajes(connection, args[1]);
        break;

      case 'viaje-completo':
        await mostrarViajeCompleto(connection, args[1]);
        break;

      case 'autorizaciones':
        await mostrarAutorizaciones(connection, args[1]);
        break;

      case 'postulaciones':
        await mostrarPostulaciones(connection, args[1]);
        break;

      case 'inconsistentes':
        await mostrarInconsistentes(connection);
        break;

      case 'recientes':
        await mostrarRecientes(connection, args[1] || 7);
        break;

      case 'query':
        await ejecutarQuery(connection, args.slice(1).join(' '));
        break;

      case 'stats':
        await mostrarEstadisticas(connection);
        break;

      case 'fix-cupos':
        await arreglarCupos(connection, args[1]);
        break;

      default:
        log(`Comando desconocido: ${command}`, colors.red);
        showHelp();
    }

  } catch (error) {
    log(`\n✗ Error: ${error.message}`, colors.red);
    if (error.sql) {
      log(`SQL: ${error.sql}`, colors.dim);
    }
  } finally {
    if (connection) {
      await connection.end();
      log("\n✓ Conexión cerrada", colors.dim);
    }
  }
}

function showHelp() {
  header("COMANDOS DISPONIBLES");

  console.log(colors.bright + "Consultas básicas:" + colors.reset);
  console.log("  node consulta-db.js viajes                    - Listar últimos 20 viajes");
  console.log("  node consulta-db.js viajes 123                - Ver viaje con ID 123");
  console.log("  node consulta-db.js viaje-completo 123        - Ver viaje con todos los detalles");
  console.log("  node consulta-db.js recientes [dias]          - Viajes de últimos N días (default: 7)");

  console.log("\n" + colors.bright + "Relaciones:" + colors.reset);
  console.log("  node consulta-db.js autorizaciones 123        - Autorizaciones del viaje 123");
  console.log("  node consulta-db.js postulaciones 123         - Postulaciones del viaje 123");

  console.log("\n" + colors.bright + "Análisis:" + colors.reset);
  console.log("  node consulta-db.js inconsistentes            - Viajes con cupos mal calculados");
  console.log("  node consulta-db.js stats                     - Estadísticas generales");

  console.log("\n" + colors.bright + "Utilidades:" + colors.reset);
  console.log("  node consulta-db.js query \"SELECT...\"         - Ejecutar SQL personalizado");
  console.log("  node consulta-db.js fix-cupos [id]            - Recalcular cupos de un viaje (o todos si no hay id)");

  console.log("\n" + colors.dim + "Ejemplos:" + colors.reset);
  console.log(colors.dim + "  node consulta-db.js viajes 1");
  console.log("  node consulta-db.js recientes 30");
  console.log("  node consulta-db.js query \"SELECT COUNT(*) FROM sige_ent_encnegtra\"" + colors.reset);
}

async function mostrarViajes(connection, id) {
  if (id) {
    // Mostrar un viaje específico
    const [rows] = await connection.query(`
      SELECT
        ENT_IdEnt as id,
        ENT_Numero as numero,
        ENT_Fecha as fecha,
        TER_RazonSocialTer as razonSocial,
        LOC_NomLocalidadOrig as origen,
        LOC_NomLocalidadDest as destino,
        ENT_CantCupos as cupos,
        ENT_CantCuposReser as reservados,
        ENT_CantCuposPend as pendientes,
        (ENT_CantCupos - ENT_CantCuposReser) as pendientesCalculados,
        ENT_Tarifa as tarifa,
        VEN_IdVendPostula as vendedorId
      FROM sige_ent_encnegtra
      WHERE ENT_IdEnt = ?
    `, [id]);

    if (rows.length === 0) {
      log(`No se encontró viaje con ID ${id}`, colors.yellow);
      return;
    }

    header(`VIAJE #${id}`);
    const v = rows[0];

    console.log(colors.bright + "Información básica:" + colors.reset);
    console.log(`  ID:            ${v.id}`);
    console.log(`  Número:        ${v.numero}`);
    console.log(`  Fecha:         ${formatDate(v.fecha)}`);
    console.log(`  Razón Social:  ${v.razonSocial}`);
    console.log(`  Origen:        ${v.origen}`);
    console.log(`  Destino:       ${v.destino}`);

    console.log("\n" + colors.bright + "Cupos:" + colors.reset);
    console.log(`  Totales:       ${v.cupos}`);
    console.log(`  Reservados:    ${v.reservados}`);
    console.log(`  Pendientes:    ${v.pendientes}` +
      (v.pendientes !== v.pendientesCalculados ?
        colors.red + ` ⚠ (debería ser ${v.pendientesCalculados})` + colors.reset :
        colors.green + " ✓" + colors.reset));

    console.log("\n" + colors.bright + "Comercial:" + colors.reset);
    console.log(`  Tarifa:        $${formatNumber(v.tarifa)}`);
    console.log(`  Vendedor ID:   ${v.vendedorId || 'N/A'}`);

  } else {
    // Listar últimos viajes
    const [rows] = await connection.query(`
      SELECT
        ENT_IdEnt as id,
        ENT_Numero as numero,
        ENT_Fecha as fecha,
        TER_RazonSocialTer as razonSocial,
        LOC_NomLocalidadOrig as origen,
        LOC_NomLocalidadDest as destino,
        ENT_CantCupos as cupos,
        ENT_CantCuposReser as reservados,
        ENT_CantCuposPend as pendientes,
        (ENT_CantCupos - ENT_CantCuposReser) as pendientesCalculados
      FROM sige_ent_encnegtra
      WHERE ENT_IdEnt > 0
      ORDER BY ENT_Fecha DESC, ENT_IdEnt DESC
      LIMIT 20
    `);

    header("ÚLTIMOS 20 VIAJES");

    console.table(rows.map(v => ({
      ID: v.id,
      Número: v.numero,
      Fecha: formatDate(v.fecha),
      'Razón Social': v.razonSocial.substring(0, 30),
      Cupos: v.cupos,
      Reserv: v.reservados,
      Pend: v.pendientes,
      OK: v.pendientes === v.pendientesCalculados ? '✓' : '✗'
    })));
  }
}

async function mostrarViajeCompleto(connection, id) {
  if (!id) {
    log("Debe especificar un ID de viaje", colors.red);
    return;
  }

  await mostrarViajes(connection, id);

  // Mostrar autorizaciones
  const [autorizaciones] = await connection.query(`
    SELECT
      ECP_IdEcp as id,
      ECP_Numero as numero,
      ECP_Fecha as fecha,
      ECP_Tarifa as tarifa,
      ECP_PreCartaPorte as preCartaPorte
    FROM sige_ecp_enccarpor
    WHERE ENT_IdEnt = ?
  `, [id]);

  if (autorizaciones.length > 0) {
    console.log("\n" + colors.bright + "Autorizaciones/Cartas de Porte:" + colors.reset);
    autorizaciones.forEach(a => {
      console.log(`  #${a.id} (${a.numero}) - ${formatDate(a.fecha)} - $${formatNumber(a.tarifa)} - PreCP: ${a.preCartaPorte}`);
    });
  }

  // Mostrar postulaciones
  const [postulaciones] = await connection.query(`
    SELECT
      icp.ICP_Orden as orden,
      icp.TIC_IdTic as tipoId,
      icp.TIC_DescripcionTic as tipo,
      icp.TER_RazonSocialTerTic as chofer
    FROM sige_ecp_enccarpor ecp
    INNER JOIN sige_icp_intcarpor icp ON ecp.ECP_IdEcp = icp.ECP_IdEcp
    WHERE ecp.ENT_IdEnt = ?
    ORDER BY icp.ICP_Orden
  `, [id]);

  if (postulaciones.length > 0) {
    console.log("\n" + colors.bright + "Postulaciones/Intermediarios:" + colors.reset);
    postulaciones.forEach(p => {
      console.log(`  ${p.orden}. ${p.tipo} (TIC ${p.tipoId}): ${p.chofer || 'N/A'}`);
    });
  }

  // Mostrar artículos
  const [articulos] = await connection.query(`
    SELECT
      dnt.DNT_Renglon as renglon,
      dnt.ART_IdArticulo as articuloId,
      COALESCE(dnt.DNT_Detalle, dnt.ART_DesArticulo, art_desarticulo) as descripcion
    FROM sige_dnt_detnegtra dnt
    WHERE dnt.ENT_IdEnt = ?
    ORDER BY dnt.DNT_Renglon
  `, [id]);

  if (articulos.length > 0) {
    console.log("\n" + colors.bright + "Artículos:" + colors.reset);
    articulos.forEach(a => {
      console.log(`  ${a.renglon}. ${a.descripcion} (ID: ${a.articuloId})`);
    });
  }
}

async function mostrarAutorizaciones(connection, viajeId) {
  if (!viajeId) {
    log("Debe especificar un ID de viaje", colors.red);
    return;
  }

  const [rows] = await connection.query(`
    SELECT
      ecp.ECP_IdEcp as id,
      ecp.ECP_Numero as numero,
      ecp.ECP_Fecha as fecha,
      ecp.ECP_Tarifa as tarifa,
      ecp.TER_RazonSocialTerEst as tercero,
      ecp.LOC_NomLocalidadEst as origen,
      ecp.LOC_NomLocalidadGran as destino,
      COUNT(icp.ECP_IdEcp) as cantidadDetalles
    FROM sige_ecp_enccarpor ecp
    LEFT JOIN sige_icp_intcarpor icp ON ecp.ECP_IdEcp = icp.ECP_IdEcp
    WHERE ecp.ENT_IdEnt = ?
    GROUP BY ecp.ECP_IdEcp
  `, [viajeId]);

  header(`AUTORIZACIONES DEL VIAJE #${viajeId}`);

  if (rows.length === 0) {
    log("No hay autorizaciones para este viaje", colors.yellow);
    return;
  }

  rows.forEach(a => {
    console.log(`\n${colors.bright}Autorización #${a.id} (${a.numero})${colors.reset}`);
    console.log(`  Fecha:     ${formatDate(a.fecha)}`);
    console.log(`  Tercero:   ${a.tercero}`);
    console.log(`  Origen:    ${a.origen}`);
    console.log(`  Destino:   ${a.destino}`);
    console.log(`  Tarifa:    $${formatNumber(a.tarifa)}`);
    console.log(`  Detalles:  ${a.cantidadDetalles} ${a.cantidadDetalles === 0 ? colors.red + '(HUÉRFANA)' + colors.reset : ''}`);
  });
}

async function mostrarPostulaciones(connection, viajeId) {
  if (!viajeId) {
    log("Debe especificar un ID de viaje", colors.red);
    return;
  }

  const [rows] = await connection.query(`
    SELECT
      ecp.ECP_IdEcp as autorizacionId,
      ecp.ECP_Numero as autorizacionNumero,
      icp.ICP_Orden as orden,
      icp.TIC_IdTic as tipoId,
      icp.TIC_DescripcionTic as tipo,
      icp.TER_RazonSocialTerTic as nombre,
      icp.TER_CUITTerTic as cuit
    FROM sige_ecp_enccarpor ecp
    INNER JOIN sige_icp_intcarpor icp ON ecp.ECP_IdEcp = icp.ECP_IdEcp
    WHERE ecp.ENT_IdEnt = ?
    ORDER BY ecp.ECP_IdEcp, icp.ICP_Orden
  `, [viajeId]);

  header(`POSTULACIONES DEL VIAJE #${viajeId}`);

  if (rows.length === 0) {
    log("No hay postulaciones para este viaje", colors.yellow);
    return;
  }

  let currentAuth = null;
  rows.forEach(p => {
    if (currentAuth !== p.autorizacionId) {
      console.log(`\n${colors.bright}Autorización ${p.autorizacionNumero}:${colors.reset}`);
      currentAuth = p.autorizacionId;
    }
    const tipoColor = p.tipoId === 9 ? colors.green : colors.cyan;
    console.log(`  ${p.orden}. ${tipoColor}${p.tipo}${colors.reset} (TIC ${p.tipoId})`);
    console.log(`     ${p.nombre || 'N/A'}`);
    if (p.cuit) console.log(`     CUIT: ${p.cuit}`);
  });
}

async function mostrarInconsistentes(connection) {
  const [rows] = await connection.query(`
    SELECT
      ENT_IdEnt as id,
      ENT_Numero as numero,
      ENT_Fecha as fecha,
      TER_RazonSocialTer as razonSocial,
      ENT_CantCupos as cupos,
      ENT_CantCuposReser as reservados,
      ENT_CantCuposPend as pendientes,
      (ENT_CantCupos - ENT_CantCuposReser) as pendientesCalculados,
      (ENT_CantCuposPend - (ENT_CantCupos - ENT_CantCuposReser)) as diferencia
    FROM sige_ent_encnegtra
    WHERE ENT_CantCuposPend != (ENT_CantCupos - ENT_CantCuposReser)
      AND ENT_IdEnt > 0
    ORDER BY ABS(ENT_CantCuposPend - (ENT_CantCupos - ENT_CantCuposReser)) DESC
    LIMIT 50
  `);

  header(`VIAJES CON CUPOS INCONSISTENTES (${rows.length})`);

  if (rows.length === 0) {
    log("✓ No hay viajes con cupos inconsistentes", colors.green);
    return;
  }

  console.table(rows.map(v => ({
    ID: v.id,
    Número: v.numero,
    Fecha: formatDate(v.fecha),
    Cupos: v.cupos,
    Reserv: v.reservados,
    'Pend (BD)': v.pendientes,
    'Pend (Calc)': v.pendientesCalculados,
    Dif: v.diferencia
  })));

  console.log(`\n${colors.yellow}Para arreglar estos viajes, usa:${colors.reset}`);
  console.log(`  node consulta-db.js fix-cupos         (arreglar todos)`);
  console.log(`  node consulta-db.js fix-cupos 123     (arreglar solo el viaje 123)`);
}

async function mostrarRecientes(connection, dias) {
  const [rows] = await connection.query(`
    SELECT
      ENT_IdEnt as id,
      ENT_Numero as numero,
      ENT_Fecha as fecha,
      TER_RazonSocialTer as razonSocial,
      LOC_NomLocalidadOrig as origen,
      LOC_NomLocalidadDest as destino,
      ENT_CantCupos as cupos,
      ENT_CantCuposReser as reservados,
      ENT_CantCuposPend as pendientes,
      ENT_Tarifa as tarifa
    FROM sige_ent_encnegtra
    WHERE ENT_Fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      AND ENT_IdEnt > 0
    ORDER BY ENT_Fecha DESC, ENT_IdEnt DESC
  `, [dias]);

  header(`VIAJES DE LOS ÚLTIMOS ${dias} DÍAS (${rows.length} encontrados)`);

  if (rows.length === 0) {
    log("No hay viajes en este período", colors.yellow);
    return;
  }

  console.table(rows.map(v => ({
    ID: v.id,
    Número: v.numero,
    Fecha: formatDate(v.fecha),
    'Razón Social': v.razonSocial.substring(0, 25),
    'Ruta': `${v.origen} → ${v.destino}`.substring(0, 30),
    Cupos: v.cupos,
    Pend: v.pendientes,
    Tarifa: `$${formatNumber(v.tarifa)}`
  })));
}

async function ejecutarQuery(connection, sql) {
  if (!sql) {
    log("Debe especificar una query SQL", colors.red);
    log('Ejemplo: node consulta-db.js query "SELECT * FROM sige_ent_encnegtra LIMIT 5"', colors.dim);
    return;
  }

  header("EJECUTANDO QUERY PERSONALIZADO");
  log(sql, colors.dim);

  const [rows] = await connection.query(sql);

  console.log(`\n${colors.green}✓ ${rows.length} filas${colors.reset}\n`);

  if (rows.length > 0) {
    if (rows.length <= 50) {
      console.table(rows);
    } else {
      console.table(rows.slice(0, 50));
      log(`\n... mostrando solo las primeras 50 de ${rows.length} filas`, colors.dim);
    }
  }
}

async function mostrarEstadisticas(connection) {
  header("ESTADÍSTICAS GENERALES");

  const [totalViajes] = await connection.query(`SELECT COUNT(*) as total FROM sige_ent_encnegtra WHERE ENT_IdEnt > 0`);
  const [viajesHoy] = await connection.query(`SELECT COUNT(*) as total FROM sige_ent_encnegtra WHERE DATE(ENT_Fecha) = CURDATE()`);
  const [viajesSemana] = await connection.query(`SELECT COUNT(*) as total FROM sige_ent_encnegtra WHERE ENT_Fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`);
  const [cuposStats] = await connection.query(`
    SELECT
      SUM(ENT_CantCupos) as totalCupos,
      SUM(ENT_CantCuposReser) as totalReservados,
      SUM(ENT_CantCuposPend) as totalPendientes
    FROM sige_ent_encnegtra
    WHERE ENT_Fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
  `);
  const [inconsistentes] = await connection.query(`
    SELECT COUNT(*) as total
    FROM sige_ent_encnegtra
    WHERE ENT_CantCuposPend != (ENT_CantCupos - ENT_CantCuposReser)
  `);

  console.log(colors.bright + "Viajes:" + colors.reset);
  console.log(`  Total en BD:             ${formatNumber(totalViajes[0].total)}`);
  console.log(`  Creados hoy:             ${formatNumber(viajesHoy[0].total)}`);
  console.log(`  Últimos 7 días:          ${formatNumber(viajesSemana[0].total)}`);

  console.log("\n" + colors.bright + "Cupos (últimos 30 días):" + colors.reset);
  console.log(`  Total cupos:             ${formatNumber(cuposStats[0].totalCupos)}`);
  console.log(`  Reservados:              ${formatNumber(cuposStats[0].totalReservados)}`);
  console.log(`  Pendientes (según BD):   ${formatNumber(cuposStats[0].totalPendientes)}`);

  console.log("\n" + colors.bright + "Problemas:" + colors.reset);
  const inconsistentesCount = inconsistentes[0].total;
  if (inconsistentesCount > 0) {
    console.log(`  Cupos inconsistentes:    ${colors.red}${formatNumber(inconsistentesCount)} ⚠${colors.reset}`);
  } else {
    console.log(`  Cupos inconsistentes:    ${colors.green}0 ✓${colors.reset}`);
  }
}

async function arreglarCupos(connection, id) {
  header("ARREGLAR CUPOS PENDIENTES");

  if (id) {
    // Arreglar un viaje específico
    log(`Arreglando viaje #${id}...`, colors.yellow);

    const [result] = await connection.query(`
      UPDATE sige_ent_encnegtra
      SET ENT_CantCuposPend = (ENT_CantCupos - ENT_CantCuposReser)
      WHERE ENT_IdEnt = ?
        AND ENT_CantCuposPend != (ENT_CantCupos - ENT_CantCuposReser)
    `, [id]);

    if (result.affectedRows > 0) {
      log(`✓ Viaje #${id} arreglado`, colors.green);
    } else {
      log(`El viaje #${id} ya estaba correcto o no existe`, colors.yellow);
    }

  } else {
    // Arreglar todos
    log("Recalculando cupos pendientes de TODOS los viajes inconsistentes...", colors.yellow);

    const [result] = await connection.query(`
      UPDATE sige_ent_encnegtra
      SET ENT_CantCuposPend = (ENT_CantCupos - ENT_CantCuposReser)
      WHERE ENT_CantCuposPend != (ENT_CantCupos - ENT_CantCuposReser)
        AND ENT_IdEnt > 0
    `);

    log(`✓ ${result.affectedRows} viajes arreglados`, colors.green);
  }

  // Verificar
  const [verificacion] = await connection.query(`
    SELECT COUNT(*) as total
    FROM sige_ent_encnegtra
    WHERE ENT_CantCuposPend != (ENT_CantCupos - ENT_CantCuposReser)
  `);

  if (verificacion[0].total === 0) {
    log("\n✓ Todos los cupos están consistentes ahora", colors.green);
  } else {
    log(`\n⚠ Aún quedan ${verificacion[0].total} viajes inconsistentes`, colors.yellow);
  }
}

// Ejecutar
main().catch(err => {
  console.error(colors.red + "Error fatal:" + colors.reset, err);
  process.exit(1);
});
