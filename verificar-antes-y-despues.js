const mysql = require('mysql2/promise');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function verificarAntesYDespues() {
  const connection = await mysql.createConnection({
    host: 'remoto.retec.com.ar',
    user: 'danisa',
    password: 'danisa2025',
    database: 'lt',
    port: 3307
  });

  console.log('\n🔍 VERIFICADOR ANTES Y DESPUÉS DE ELIMINAR VIAJE\n');
  console.log('='.repeat(60));
  console.log('\nEste script te ayudará a verificar que un viaje se elimina');
  console.log('correctamente junto con todas sus autorizaciones.\n');

  // Pedir ID del viaje
  const viajeId = await question('Ingresa el ID del viaje a verificar: ');

  if (!viajeId || isNaN(viajeId)) {
    console.log('\n❌ ID inválido');
    rl.close();
    await connection.end();
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 ESTADO ACTUAL DEL VIAJE ' + viajeId);
  console.log('='.repeat(60));

  // Verificar viaje
  const [viaje] = await connection.execute(
    `SELECT
      ENT_IdEnt,
      ENT_Numero,
      ENT_Fecha,
      TER_RazonSocialTer,
      ENT_CantCupos,
      ENT_CantCuposReser,
      ENT_CantCuposPend
    FROM sige_ent_encnegtra
    WHERE ENT_IdEnt = ?`,
    [viajeId]
  );

  if (viaje.length === 0) {
    console.log('\n❌ El viaje NO EXISTE en la base de datos');
    console.log('\nPosibles razones:');
    console.log('  • Ya fue eliminado');
    console.log('  • El ID es incorrecto');
    console.log('  • Se eliminó desde otra sesión\n');
    rl.close();
    await connection.end();
    return;
  }

  const v = viaje[0];
  console.log('\n✅ VIAJE ENCONTRADO:');
  console.log(`  • ID: ${v.ENT_IdEnt}`);
  console.log(`  • Número: ${v.ENT_Numero}`);
  console.log(`  • Fecha: ${v.ENT_Fecha ? new Date(v.ENT_Fecha).toLocaleDateString('es-ES') : 'N/A'}`);
  console.log(`  • Cliente: ${v.TER_RazonSocialTer}`);
  console.log(`  • Cupos totales: ${v.ENT_CantCupos || 0}`);
  console.log(`  • Cupos reservados: ${v.ENT_CantCuposReser || 0}`);
  console.log(`  • Cupos pendientes: ${v.ENT_CantCuposPend || 0}`);

  // Verificar si se puede eliminar
  const tieneReservas = (v.ENT_CantCuposReser || 0) > 0;
  if (tieneReservas) {
    console.log('\n⚠️  ADVERTENCIA: Este viaje tiene reservas activas');
    console.log('   No se podrá eliminar hasta que se cancelen las reservas\n');
  } else {
    console.log('\n✅ Este viaje NO tiene reservas, se puede eliminar\n');
  }

  // Verificar autorizaciones
  const [autorizaciones] = await connection.execute(
    `SELECT
      ecp.ECP_IdEcp,
      ecp.ECP_Numero,
      ecp.ECP_Fecha,
      ecp.TER_RazonSocialTerFlete,
      COUNT(icp.TIC_IdTic) as cant_detalles
    FROM sige_ecp_enccarpor ecp
    LEFT JOIN sige_icp_intcarpor icp ON ecp.ECP_IdEcp = icp.ECP_IdEcp
    WHERE ecp.ENT_IdEnt = ?
    GROUP BY ecp.ECP_IdEcp, ecp.ECP_Numero, ecp.ECP_Fecha, ecp.TER_RazonSocialTerFlete`,
    [viajeId]
  );

  console.log(`📋 AUTORIZACIONES: ${autorizaciones.length}`);
  if (autorizaciones.length > 0) {
    autorizaciones.forEach((auth, index) => {
      console.log(`\n  ${index + 1}. Autorización ECP_IdEcp: ${auth.ECP_IdEcp}`);
      console.log(`     • Número: ${auth.ECP_Numero || 'N/A'}`);
      console.log(`     • Fecha: ${auth.ECP_Fecha ? new Date(auth.ECP_Fecha).toLocaleDateString('es-ES') : 'N/A'}`);
      console.log(`     • Transportista: ${auth.TER_RazonSocialTerFlete || 'N/A'}`);
      console.log(`     • Detalles (choferes): ${auth.cant_detalles}`);
    });

    // Mostrar detalles
    for (const auth of autorizaciones) {
      const [detalles] = await connection.execute(
        `SELECT
          TIC_IdTic,
          TIC_DescripcionTic,
          TER_RazonSocialTerTic,
          TER_CUITTerTic
        FROM sige_icp_intcarpor
        WHERE ECP_IdEcp = ?`,
        [auth.ECP_IdEcp]
      );

      if (detalles.length > 0) {
        console.log(`\n     Choferes/Terceros:`);
        detalles.forEach((det, idx) => {
          console.log(`       ${idx + 1}. ${det.TER_RazonSocialTerTic} (${det.TER_CUITTerTic || 'Sin CUIT'})`);
        });
      }
    }
  } else {
    console.log('  • No hay autorizaciones asociadas');
  }

  console.log('\n' + '='.repeat(60));
  console.log('📝 RESUMEN PARA ELIMINACIÓN');
  console.log('='.repeat(60));
  console.log(`\nCuando elimines el viaje ${viajeId}, se eliminarán:\n`);
  console.log(`  • 1 viaje`);
  console.log(`  • ${autorizaciones.length} autorización(es)`);

  const totalDetalles = autorizaciones.reduce((sum, auth) => sum + auth.cant_detalles, 0);
  console.log(`  • ${totalDetalles} detalle(s) de autorizaciones\n`);

  if (tieneReservas) {
    console.log('⚠️  NO SE PUEDE ELIMINAR: Tiene reservas activas\n');
  } else {
    console.log('✅ SE PUEDE ELIMINAR: No tiene reservas\n');
  }

  console.log('💡 INSTRUCCIONES:');
  console.log('   1. Ve a la interfaz web');
  console.log('   2. Busca el viaje en la lista');
  console.log('   3. Haz clic en "Editar"');
  console.log('   4. Haz clic en "Eliminar"');
  console.log('   5. Ejecuta este script nuevamente para verificar\n');

  console.log('='.repeat(60) + '\n');

  rl.close();
  await connection.end();
}

verificarAntesYDespues().catch(console.error);
