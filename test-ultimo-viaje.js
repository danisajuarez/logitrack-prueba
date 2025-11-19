/**
 * Consultar el último viaje creado/modificado
 */

const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'remoto.retec.com.ar',
  port: 3307,
  user: 'danisa',
  password: 'danisa2025',
  database: 'lt'
};

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bright: "\x1b[1m",
};

async function main() {
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);
    console.log(colors.green + "✓ Conectado" + colors.reset + "\n");

    // Obtener últimos 5 viajes
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
      WHERE ENT_IdEnt > 0
      ORDER BY ENT_IdEnt DESC
      LIMIT 5
    `);

    console.log(colors.bright + colors.cyan + "═══ ÚLTIMOS 5 VIAJES EN LA BASE DE DATOS ═══" + colors.reset + "\n");

    rows.forEach((v, idx) => {
      console.log(colors.bright + `${idx + 1}. Viaje #${v.id} (${v.numero})` + colors.reset);
      console.log(`   Razón Social: ${v.razonSocial}`);
      console.log(`   Ruta: ${v.origen} → ${v.destino}`);
      console.log(`   Cupos: ${v.cupos} | Reservados: ${v.reservados} | Pendientes: ${v.pendientes}` +
        (v.pendientes !== v.pendientesCalculados ?
          colors.red + ` ⚠ (debería ser ${v.pendientesCalculados})` + colors.reset :
          colors.green + " ✓" + colors.reset));
      console.log(`   Tarifa: $${v.tarifa.toLocaleString('es-AR')}`);
      console.log(`   Fecha: ${new Date(v.fecha).toLocaleString('es-AR')}\n`);
    });

    console.log(colors.yellow + "Ahora modificá un viaje desde el navegador y volvé a ejecutar este script para ver si se guardó" + colors.reset);

  } catch (error) {
    console.error(colors.red + "Error:", error.message + colors.reset);
  } finally {
    if (connection) await connection.end();
  }
}

main();
