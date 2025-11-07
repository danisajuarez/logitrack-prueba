const mysql = require('mysql2/promise');

async function analizar() {
  const connection = await mysql.createConnection({
    host: '190.188.150.107',
    port: 3307,
    user: 'root',
    password: 'Ltoneladas',
    database: 'lt'
  });

  console.log('\n=== ANÁLISIS DE ESTRUCTURA DCP ===\n');

  // 1. Ver un viaje reciente completo
  console.log('1. ÚLTIMOS 3 VIAJES CREADOS (ENT):');
  const [viajes] = await connection.query(`
    SELECT ENT_IdEnt, ENT_Numero, ENT_Fecha, TER_RazonSocialTer, LOC_NomLocalidadOrig, LOC_NomLocalidadDest
    FROM sige_ent_encnegtra
    ORDER BY ENT_IdEnt DESC
    LIMIT 3
  `);
  console.table(viajes);

  // Tomar el último viaje para análisis detallado
  const viajeId = viajes[0].ENT_IdEnt;
  console.log(`\n2. ANALIZANDO VIAJE ${viajeId} EN DETALLE:\n`);

  // 2. Ver todas las ECPs de este viaje
  console.log('2a. CARTAS DE PORTE (ECP) para este viaje:');
  const [ecps] = await connection.query(`
    SELECT ECP_IdEcp, ECP_Numero, ECP_Fecha, TER_RazonSocialTerEst, LOC_NomLocalidadEst, LOC_NomLocalidadGran
    FROM sige_ecp_enccarpor
    WHERE ENT_IdEnt = ?
    ORDER BY ECP_IdEcp
  `, [viajeId]);
  console.table(ecps);

  if (ecps.length === 0) {
    console.log('⚠️ NO HAY ECPs para este viaje!');
    await connection.end();
    return;
  }

  // 3. Ver todos los registros DCP de estas ECPs
  const ecpIds = ecps.map(e => e.ECP_IdEcp);
  console.log(`\n2b. DETALLE CARTA PORTE (DCP) para ECPs: ${ecpIds.join(', ')}`);
  const [dcps] = await connection.query(`
    SELECT ecp_idecp, dcp_renglondcp, art_idarticulo, art_desarticulo, dcp_pesobruto, dcp_pesoneto
    FROM SIGE_DCP_DetCarPor
    WHERE ecp_idecp IN (${ecpIds.map(() => '?').join(',')})
    ORDER BY ecp_idecp, dcp_renglondcp
  `, ecpIds);
  console.table(dcps);
  console.log(`Total registros DCP: ${dcps.length}`);

  // 4. Ver todos los intermediarios (choferes, transportistas) de estas ECPs
  console.log(`\n2c. INTERMEDIARIOS (ICP) para ECPs: ${ecpIds.join(', ')}`);
  const [icps] = await connection.query(`
    SELECT
      ECP_IdEcp,
      TIC_IdTic,
      ICP_Orden,
      TIC_DescripcionTic,
      TER_IDTerceroTic,
      TER_RazonSocialTerTic,
      TER_CUITTerTic
    FROM sige_icp_intcarpor
    WHERE ECP_IdEcp IN (${ecpIds.map(() => '?').join(',')})
    ORDER BY ECP_IdEcp, ICP_Orden
  `, ecpIds);
  console.table(icps);
  console.log(`Total intermediarios: ${icps.length}`);

  // 5. Contar choferes por ECP
  console.log(`\n2d. RESUMEN - Choferes por ECP:`);
  const [resumen] = await connection.query(`
    SELECT
      ECP_IdEcp,
      COUNT(*) as total_intermediarios,
      SUM(CASE WHEN TIC_IdTic = 6 THEN 1 ELSE 0 END) as destinatarios,
      SUM(CASE WHEN TIC_IdTic = 8 THEN 1 ELSE 0 END) as transportistas,
      SUM(CASE WHEN TIC_IdTic = 9 THEN 1 ELSE 0 END) as choferes
    FROM sige_icp_intcarpor
    WHERE ECP_IdEcp IN (${ecpIds.map(() => '?').join(',')})
    GROUP BY ECP_IdEcp
  `, ecpIds);
  console.table(resumen);

  // 6. COMPARAR con un viaje del sistema viejo que tenga múltiples choferes
  console.log('\n\n3. COMPARACIÓN CON VIAJE DEL SISTEMA VIEJO:');
  console.log('Buscando un viaje viejo con múltiples choferes...\n');

  const [viejoEjemplo] = await connection.query(`
    SELECT DISTINCT e.ENT_IdEnt, e.ENT_Numero, COUNT(DISTINCT icp.TER_IDTerceroTic) as total_choferes
    FROM sige_ent_encnegtra e
    JOIN sige_ecp_enccarpor ecp ON e.ENT_IdEnt = ecp.ENT_IdEnt
    JOIN sige_icp_intcarpor icp ON ecp.ECP_IdEcp = icp.ECP_IdEcp
    WHERE icp.TIC_IdTic = 9
      AND e.ENT_Fecha < '2025-11-01'
    GROUP BY e.ENT_IdEnt, e.ENT_Numero
    HAVING COUNT(DISTINCT icp.TER_IDTerceroTic) >= 2
    ORDER BY e.ENT_IdEnt DESC
    LIMIT 1
  `);

  if (viejoEjemplo.length > 0) {
    const viejoId = viejoEjemplo[0].ENT_IdEnt;
    console.log(`Encontrado viaje viejo ${viejoId} con ${viejoEjemplo[0].total_choferes} choferes:\n`);

    const [viejoEcps] = await connection.query(`
      SELECT ECP_IdEcp, ECP_Numero
      FROM sige_ecp_enccarpor
      WHERE ENT_IdEnt = ?
    `, [viejoId]);
    console.log('3a. ECPs del viaje viejo:');
    console.table(viejoEcps);

    const viejoEcpIds = viejoEcps.map(e => e.ECP_IdEcp);

    const [viejoDcps] = await connection.query(`
      SELECT ecp_idecp, dcp_renglondcp, art_idarticulo, art_desarticulo
      FROM SIGE_DCP_DetCarPor
      WHERE ecp_idecp IN (${viejoEcpIds.map(() => '?').join(',')})
      ORDER BY ecp_idecp, dcp_renglondcp
    `, viejoEcpIds);
    console.log('\n3b. DCPs del viaje viejo:');
    console.table(viejoDcps);

    const [viejoIcps] = await connection.query(`
      SELECT ECP_IdEcp, TIC_IdTic, TIC_DescripcionTic, TER_RazonSocialTerTic
      FROM sige_icp_intcarpor
      WHERE ECP_IdEcp IN (${viejoEcpIds.map(() => '?').join(',')})
      ORDER BY ECP_IdEcp, ICP_Orden
    `, viejoEcpIds);
    console.log('\n3c. ICPs (intermediarios) del viaje viejo:');
    console.table(viejoIcps);

    console.log(`\n📊 PATRÓN DETECTADO EN SISTEMA VIEJO:`);
    console.log(`   - Total ECPs: ${viejoEcps.length}`);
    console.log(`   - Total registros DCP: ${viejoDcps.length}`);
    console.log(`   - Total intermediarios: ${viejoIcps.length}`);
    console.log(`   - Choferes: ${viejoIcps.filter(i => i.TIC_IdTic === 9).length}`);
  } else {
    console.log('No se encontraron viajes viejos con múltiples choferes para comparar.');
  }

  console.log('\n\n=== CONCLUSIÓN ===');
  console.log(`\n📋 VIAJE NUEVO (${viajeId}):`);
  console.log(`   - ECPs creadas: ${ecps.length}`);
  console.log(`   - Registros DCP: ${dcps.length}`);
  console.log(`   - Total intermediarios: ${icps.length}`);
  console.log(`   - Choferes postulados: ${icps.filter(i => i.TIC_IdTic === 9).length}`);

  await connection.end();
}

analizar().catch(console.error);
