/**
 * Endpoint de testing interno para verificar integridad de datos
 * Acceso: GET http://localhost:3000/api/testing/integrity
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

interface Issue {
  type: string;
  id?: number;
  numero?: string;
  [key: string]: any;
}

interface TestResults {
  passed: number;
  failed: number;
  warnings: number;
  issues: Issue[];
  tests: {
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: any[];
  }[];
}

export async function GET(req: NextRequest) {
  const results: TestResults = {
    passed: 0,
    failed: 0,
    warnings: 0,
    issues: [],
    tests: []
  };

  try {
    // TEST 1: Viajes con cupos inconsistentes
    const [viajesInconsistentes] = await db.query(`
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
      LIMIT 50
    `) as unknown as [RowDataPacket[]];

    if (viajesInconsistentes.length > 0) {
      results.failed++;
      results.tests.push({
        name: "Cupos Pendientes Consistentes",
        status: "fail",
        message: `${viajesInconsistentes.length} viajes con cupos pendientes mal calculados`,
        details: viajesInconsistentes.slice(0, 10)
      });
      viajesInconsistentes.forEach(v => {
        results.issues.push({
          type: 'CUPOS_INCONSISTENTES',
          id: v.id,
          numero: v.numero,
          error: `cuposPendientes=${v.pendientes}, debería ser ${v.pendientesCalculados}`
        });
      });
    } else {
      results.passed++;
      results.tests.push({
        name: "Cupos Pendientes Consistentes",
        status: "pass",
        message: "Todos los viajes tienen cupos pendientes calculados correctamente"
      });
    }

    // TEST 2: Viajes con cupos negativos o cero
    const [viajesCuposNegativos] = await db.query(`
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
      LIMIT 50
    `) as unknown as [RowDataPacket[]];

    if (viajesCuposNegativos.length > 0) {
      results.failed++;
      results.tests.push({
        name: "Sin Cupos Negativos",
        status: "fail",
        message: `${viajesCuposNegativos.length} viajes con cupos negativos o inválidos`,
        details: viajesCuposNegativos.slice(0, 10)
      });
      viajesCuposNegativos.forEach(v => {
        results.issues.push({
          type: 'CUPOS_NEGATIVOS',
          id: v.id,
          numero: v.numero,
          cupos: v.cupos,
          reservados: v.reservados,
          pendientes: v.pendientes
        });
      });
    } else {
      results.passed++;
      results.tests.push({
        name: "Sin Cupos Negativos",
        status: "pass",
        message: "No hay viajes con cupos negativos"
      });
    }

    // TEST 3: Viajes con reservados > cupos totales
    const [viajesReservasMayores] = await db.query(`
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
      LIMIT 50
    `) as unknown as [RowDataPacket[]];

    if (viajesReservasMayores.length > 0) {
      results.failed++;
      results.tests.push({
        name: "Reservados <= Cupos Totales",
        status: "fail",
        message: `${viajesReservasMayores.length} viajes con reservados > cupos totales`,
        details: viajesReservasMayores.slice(0, 10)
      });
      viajesReservasMayores.forEach(v => {
        results.issues.push({
          type: 'RESERVADOS_MAYORES',
          id: v.id,
          numero: v.numero,
          cupos: v.cupos,
          reservados: v.reservados
        });
      });
    } else {
      results.passed++;
      results.tests.push({
        name: "Reservados <= Cupos Totales",
        status: "pass",
        message: "No hay viajes con reservados > cupos"
      });
    }

    // TEST 4: Viajes con tarifas negativas
    const [viajesTarifasNegativas] = await db.query(`
      SELECT
        ENT_IdEnt as id,
        ENT_Numero as numero,
        ENT_Fecha as fecha,
        TER_RazonSocialTer as razonSocial,
        ENT_Tarifa as tarifa
      FROM sige_ent_encnegtra
      WHERE ENT_Tarifa < 0
        AND ENT_IdEnt > 0
      LIMIT 50
    `) as unknown as [RowDataPacket[]];

    if (viajesTarifasNegativas.length > 0) {
      results.failed++;
      results.tests.push({
        name: "Sin Tarifas Negativas",
        status: "fail",
        message: `${viajesTarifasNegativas.length} viajes con tarifas negativas`,
        details: viajesTarifasNegativas.slice(0, 10)
      });
      viajesTarifasNegativas.forEach(v => {
        results.issues.push({
          type: 'TARIFA_NEGATIVA',
          id: v.id,
          numero: v.numero,
          tarifa: v.tarifa
        });
      });
    } else {
      results.passed++;
      results.tests.push({
        name: "Sin Tarifas Negativas",
        status: "pass",
        message: "No hay viajes con tarifas negativas"
      });
    }

    // TEST 5: Viajes sin datos obligatorios
    const [viajesSinDatos] = await db.query(`
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
      LIMIT 50
    `) as unknown as [RowDataPacket[]];

    if (viajesSinDatos.length > 0) {
      results.warnings++;
      results.tests.push({
        name: "Datos Obligatorios Completos",
        status: "warning",
        message: `${viajesSinDatos.length} viajes sin datos obligatorios`,
        details: viajesSinDatos.slice(0, 10)
      });
      viajesSinDatos.forEach(v => {
        results.issues.push({
          type: 'DATOS_FALTANTES',
          id: v.id,
          numero: v.numero
        });
      });
    } else {
      results.passed++;
      results.tests.push({
        name: "Datos Obligatorios Completos",
        status: "pass",
        message: "Todos los viajes tienen datos obligatorios"
      });
    }

    // TEST 6: Autorizaciones huérfanas
    const [autorizacionesHuerfanas] = await db.query(`
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
      LIMIT 50
    `) as unknown as [RowDataPacket[]];

    if (autorizacionesHuerfanas.length > 0) {
      results.warnings++;
      results.tests.push({
        name: "Autorizaciones con Detalles",
        status: "warning",
        message: `${autorizacionesHuerfanas.length} autorizaciones sin detalles (pueden ser residuos)`,
        details: autorizacionesHuerfanas.slice(0, 10)
      });
      autorizacionesHuerfanas.forEach(a => {
        results.issues.push({
          type: 'AUTORIZACION_HUERFANA',
          autorizacionId: a.id,
          numero: a.numero,
          viajeId: a.viajeId
        });
      });
    } else {
      results.passed++;
      results.tests.push({
        name: "Autorizaciones con Detalles",
        status: "pass",
        message: "Todas las autorizaciones tienen detalles"
      });
    }

    // TEST 7: Sobrecupo (postulados + reservados > cupos)
    const [viajesConSobrecupo] = await db.query(`
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
      LIMIT 50
    `) as unknown as [RowDataPacket[]];

    if (viajesConSobrecupo.length > 0) {
      results.failed++;
      results.tests.push({
        name: "Sin Sobrecupo",
        status: "fail",
        message: `${viajesConSobrecupo.length} viajes donde postulados + reservados > cupos`,
        details: viajesConSobrecupo.slice(0, 10)
      });
      viajesConSobrecupo.forEach(v => {
        results.issues.push({
          type: 'SOBRECUPO',
          id: v.id,
          numero: v.numero,
          cupos: v.cupos,
          reservados: v.reservados,
          postulados: v.postulados
        });
      });
    } else {
      results.passed++;
      results.tests.push({
        name: "Sin Sobrecupo",
        status: "pass",
        message: "No hay viajes con sobrecupo (postulados + reservados > cupos)"
      });
    }

    // TEST 8: Viajes recientes sin carta porte
    const [viajesSinCartaPorte] = await db.query(`
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
      LIMIT 50
    `) as unknown as [RowDataPacket[]];

    if (viajesSinCartaPorte.length > 0) {
      results.warnings++;
      results.tests.push({
        name: "Viajes con Carta Porte",
        status: "warning",
        message: `${viajesSinCartaPorte.length} viajes recientes (últimos 7 días) sin carta porte`,
        details: viajesSinCartaPorte.slice(0, 10)
      });
      viajesSinCartaPorte.forEach(v => {
        results.issues.push({
          type: 'SIN_CARTA_PORTE',
          id: v.id,
          numero: v.numero,
          fecha: v.fecha
        });
      });
    } else {
      results.passed++;
      results.tests.push({
        name: "Viajes con Carta Porte",
        status: "pass",
        message: "Todos los viajes recientes tienen carta porte"
      });
    }

    // Resumen
    const total = results.passed + results.failed;
    const percentage = total > 0 ? ((results.passed / total) * 100).toFixed(2) : '0';

    return NextResponse.json({
      summary: {
        total: results.tests.length,
        passed: results.passed,
        failed: results.failed,
        warnings: results.warnings,
        percentage: `${percentage}%`,
        totalIssues: results.issues.length
      },
      tests: results.tests,
      issues: results.issues,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Error en tests de integridad:", error);
    return NextResponse.json(
      {
        error: "Error al ejecutar tests de integridad",
        details: error?.message,
        stack: process.env.NODE_ENV === "development" ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}
