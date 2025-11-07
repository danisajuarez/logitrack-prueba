import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const connection = await db.getConnection();

  try {
    const resultado: any = {
      viajeNuevo: {},
      viajeViejo: {},
      conclusion: ""
    };

    // 1. Ver los últimos 3 viajes creados
    const [viajes]: any = await connection.query(`
      SELECT ENT_IdEnt, ENT_Numero, ENT_Fecha, TER_RazonSocialTer, LOC_NomLocalidadOrig, LOC_NomLocalidadDest
      FROM sige_ent_encnegtra
      ORDER BY ENT_IdEnt DESC
      LIMIT 3
    `);

    resultado.ultimosViajes = viajes;

    if (viajes.length === 0) {
      return NextResponse.json({ error: "No hay viajes en el sistema" });
    }

    // Tomar el último viaje para análisis detallado
    const viajeId = viajes[0].ENT_IdEnt;
    resultado.viajeNuevo.id = viajeId;
    resultado.viajeNuevo.datos = viajes[0];

    // 2. Ver todas las ECPs de este viaje
    const [ecps]: any = await connection.query(`
      SELECT ECP_IdEcp, ECP_Numero, ECP_Fecha, TER_RazonSocialTerEst, LOC_NomLocalidadEst, LOC_NomLocalidadGran
      FROM sige_ecp_enccarpor
      WHERE ENT_IdEnt = ?
      ORDER BY ECP_IdEcp
    `, [viajeId]);

    resultado.viajeNuevo.ecps = ecps;
    resultado.viajeNuevo.totalEcps = ecps.length;

    if (ecps.length > 0) {
      const ecpIds = ecps.map((e: any) => e.ECP_IdEcp);

      // 3. Ver todos los registros DCP
      const [dcps]: any = await connection.query(`
        SELECT ecp_idecp, dcp_renglondcp, art_idarticulo, art_desarticulo, dcp_pesobruto, dcp_pesoneto
        FROM SIGE_DCP_DetCarPor
        WHERE ecp_idecp IN (${ecpIds.map(() => '?').join(',')})
        ORDER BY ecp_idecp, dcp_renglondcp
      `, ecpIds);

      resultado.viajeNuevo.dcps = dcps;
      resultado.viajeNuevo.totalDcps = dcps.length;

      // 4. Ver todos los intermediarios
      const [icps]: any = await connection.query(`
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

      resultado.viajeNuevo.icps = icps;
      resultado.viajeNuevo.totalIntermediarios = icps.length;
      resultado.viajeNuevo.choferes = icps.filter((i: any) => i.TIC_IdTic === 9).length;

      // 5. Resumen por ECP
      const [resumen]: any = await connection.query(`
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

      resultado.viajeNuevo.resumenPorEcp = resumen;
    }

    // 6. COMPARAR con un viaje del sistema viejo
    const [viejoEjemplo]: any = await connection.query(`
      SELECT DISTINCT e.ENT_IdEnt, e.ENT_Numero, e.ENT_Fecha, COUNT(DISTINCT icp.TER_IDTerceroTic) as total_choferes
      FROM sige_ent_encnegtra e
      JOIN sige_ecp_enccarpor ecp ON e.ENT_IdEnt = ecp.ENT_IdEnt
      JOIN sige_icp_intcarpor icp ON ecp.ECP_IdEcp = icp.ECP_IdEcp
      WHERE icp.TIC_IdTic = 9
        AND e.ENT_Fecha < '2025-11-01'
      GROUP BY e.ENT_IdEnt, e.ENT_Numero, e.ENT_Fecha
      HAVING COUNT(DISTINCT icp.TER_IDTerceroTic) >= 2
      ORDER BY e.ENT_IdEnt DESC
      LIMIT 1
    `);

    if (viejoEjemplo.length > 0) {
      const viejoId = viejoEjemplo[0].ENT_IdEnt;
      resultado.viajeViejo.id = viejoId;
      resultado.viajeViejo.datos = viejoEjemplo[0];

      const [viejoEcps]: any = await connection.query(`
        SELECT ECP_IdEcp, ECP_Numero
        FROM sige_ecp_enccarpor
        WHERE ENT_IdEnt = ?
      `, [viejoId]);

      resultado.viajeViejo.ecps = viejoEcps;
      resultado.viajeViejo.totalEcps = viejoEcps.length;

      if (viejoEcps.length > 0) {
        const viejoEcpIds = viejoEcps.map((e: any) => e.ECP_IdEcp);

        const [viejoDcps]: any = await connection.query(`
          SELECT ecp_idecp, dcp_renglondcp, art_idarticulo, art_desarticulo
          FROM SIGE_DCP_DetCarPor
          WHERE ecp_idecp IN (${viejoEcpIds.map(() => '?').join(',')})
          ORDER BY ecp_idecp, dcp_renglondcp
        `, viejoEcpIds);

        resultado.viajeViejo.dcps = viejoDcps;
        resultado.viajeViejo.totalDcps = viejoDcps.length;

        const [viejoIcps]: any = await connection.query(`
          SELECT ECP_IdEcp, TIC_IdTic, ICP_Orden, TIC_DescripcionTic, TER_RazonSocialTerTic
          FROM sige_icp_intcarpor
          WHERE ECP_IdEcp IN (${viejoEcpIds.map(() => '?').join(',')})
          ORDER BY ECP_IdEcp, ICP_Orden
        `, viejoEcpIds);

        resultado.viajeViejo.icps = viejoIcps;
        resultado.viajeViejo.totalIntermediarios = viejoIcps.length;
        resultado.viajeViejo.choferes = viejoIcps.filter((i: any) => i.TIC_IdTic === 9).length;
      }

      // Generar conclusión comparativa
      resultado.conclusion = `
PATRÓN DETECTADO:

VIAJE VIEJO (${viejoId}):
  - ECPs: ${resultado.viajeViejo.totalEcps}
  - Registros DCP: ${resultado.viajeViejo.totalDcps}
  - Choferes: ${resultado.viajeViejo.choferes}
  - Relación: ${resultado.viajeViejo.totalEcps === 1 ? 'UNA ECP con múltiples choferes' : 'MÚLTIPLES ECPs (una por chofer)'}

VIAJE NUEVO (${viajeId}):
  - ECPs: ${resultado.viajeNuevo.totalEcps}
  - Registros DCP: ${resultado.viajeNuevo.totalDcps}
  - Choferes: ${resultado.viajeNuevo.choferes}
  - Relación: ${resultado.viajeNuevo.totalEcps === 1 ? 'UNA ECP con múltiples choferes' : 'MÚLTIPLES ECPs (una por chofer)'}

${resultado.viajeViejo.totalEcps !== resultado.viajeNuevo.totalEcps
  ? '⚠️ DIFERENCIA DETECTADA: El patrón de ECPs es diferente entre viejo y nuevo'
  : '✅ PATRÓN COINCIDE: Ambos usan la misma estructura'}
      `;
    } else {
      resultado.conclusion = "No se encontró un viaje viejo con múltiples choferes para comparar";
    }

    return NextResponse.json(resultado, { status: 200 });

  } catch (error: any) {
    console.error("Error en análisis:", error);
    return NextResponse.json(
      { error: "Error al analizar", details: error?.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
