/**
 * Script de Testing Exhaustivo para el Sistema de Viajes
 *
 * Ejecutar: node test-api-completo.js
 *
 * Este script prueba TODAS las funcionalidades críticas del sistema.
 */

const BASE_URL = 'http://localhost:3000';

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

async function test(name, fn) {
  testResults.total++;
  try {
    await fn();
    testResults.passed++;
    log.success(name);
    return true;
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ name, error: error.message });
    log.error(`${name}: ${error.message}`);
    return false;
  }
}

// ============================================
// HELPERS
// ============================================

async function apiCall(method, endpoint, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json().catch(() => null);

  return { response, data };
}

// ============================================
// TESTS: VIAJES
// ============================================

async function testViajes() {
  log.section('📋 TESTING: VIAJES');

  let viajeCreado = null;
  let viajeId = null;

  // Test 1: Listar viajes
  await test('GET /api/viajes/GET - Listar viajes', async () => {
    const { response, data } = await apiCall('GET', '/api/viajes/GET');
    if (!response.ok) throw new Error(`Status ${response.status}`);
    if (!Array.isArray(data)) throw new Error('La respuesta no es un array');
  });

  // Test 2: Crear viaje válido
  await test('POST /api/viajes/POST - Crear viaje válido', async () => {
    const nuevoViaje = {
      razonSocial: 'COOP AGROPECUARIA DE DAIREAUX LTDA',
      origen: 'DAIREAUX',
      destino: 'BAHIA BLANCA',
      articulo: 'TRIGO',
      cupos: 10,
      reservados: 0,
      tarifa: 50000,
      vendedor: ''
    };

    const { response, data } = await apiCall('POST', '/api/viajes/POST', nuevoViaje);
    if (!response.ok) throw new Error(`Status ${response.status}: ${data?.error || data?.details}`);
    if (!data.numero) throw new Error('No se generó número de viaje');

    viajeCreado = data;
    viajeId = data.data?.entIdEnt;
    log.info(`  → Viaje creado: #${data.numero} (ID: ${viajeId})`);
  });

  // Test 3: Validación - Cupos <= 0
  await test('POST /api/viajes/POST - Validar cupos <= 0', async () => {
    const viajeInvalido = {
      razonSocial: 'COOP AGROPECUARIA DE DAIREAUX LTDA',
      origen: 'DAIREAUX',
      destino: 'BAHIA BLANCA',
      articulo: 'TRIGO',
      cupos: 0,
      reservados: 0,
      tarifa: 50000
    };

    const { response, data } = await apiCall('POST', '/api/viajes/POST', viajeInvalido);
    if (response.ok) throw new Error('Debería haber rechazado cupos <= 0');
    if (!data.error.includes('cupos')) throw new Error('Error incorrecto');
  });

  // Test 4: Validación - Tarifa negativa
  await test('POST /api/viajes/POST - Validar tarifa negativa', async () => {
    const viajeInvalido = {
      razonSocial: 'COOP AGROPECUARIA DE DAIREAUX LTDA',
      origen: 'DAIREAUX',
      destino: 'BAHIA BLANCA',
      articulo: 'TRIGO',
      cupos: 10,
      reservados: 0,
      tarifa: -100
    };

    const { response, data } = await apiCall('POST', '/api/viajes/POST', viajeInvalido);
    if (response.ok) throw new Error('Debería haber rechazado tarifa negativa');
    if (!data.error.includes('tarifa')) throw new Error('Error incorrecto');
  });

  // Test 5: Validación - Reservados > Cupos
  await test('POST /api/viajes/POST - Validar reservados > cupos', async () => {
    const viajeInvalido = {
      razonSocial: 'COOP AGROPECUARIA DE DAIREAUX LTDA',
      origen: 'DAIREAUX',
      destino: 'BAHIA BLANCA',
      articulo: 'TRIGO',
      cupos: 10,
      reservados: 15,
      tarifa: 50000
    };

    const { response, data } = await apiCall('POST', '/api/viajes/POST', viajeInvalido);
    if (response.ok) throw new Error('Debería haber rechazado reservados > cupos');
    if (!data.error.includes('reservados')) throw new Error('Error incorrecto');
  });

  // Test 6: Editar viaje - cambiar artículo (BUG CORREGIDO)
  if (viajeId) {
    await test('PUT /api/viajes/[id] - Editar artículo', async () => {
      const viajeEditado = {
        razonSocial: 'COOP AGROPECUARIA DE DAIREAUX LTDA',
        origen: 'DAIREAUX',
        destino: 'BAHIA BLANCA',
        articulo: 'MAIZ', // Cambio de TRIGO a MAIZ
        cupos: 10,
        reservados: 0,
        tarifa: 50000,
        vendedor: ''
      };

      const { response, data } = await apiCall('PUT', `/api/viajes/${viajeId}`, viajeEditado);
      if (!response.ok) throw new Error(`Status ${response.status}: ${data?.error}`);
    });

    // Test 7: Verificar que el artículo se actualizó
    await test('GET /api/viajes/GET - Verificar actualización de artículo', async () => {
      const { response, data } = await apiCall('GET', '/api/viajes/GET');
      if (!response.ok) throw new Error(`Status ${response.status}`);

      const viajeActualizado = data.find(v => v.id === viajeId);
      if (!viajeActualizado) throw new Error('No se encontró el viaje actualizado');
      if (viajeActualizado.articulo !== 'MAIZ') {
        throw new Error(`Artículo no se actualizó. Esperado: MAIZ, Recibido: ${viajeActualizado.articulo}`);
      }
    });

    // Test 8: Editar viaje - cambiar tarifa
    await test('PUT /api/viajes/[id] - Editar tarifa', async () => {
      const viajeEditado = {
        razonSocial: 'COOP AGROPECUARIA DE DAIREAUX LTDA',
        origen: 'DAIREAUX',
        destino: 'BAHIA BLANCA',
        articulo: 'MAIZ',
        cupos: 10,
        reservados: 0,
        tarifa: 60000, // Cambio de 50000 a 60000
        vendedor: ''
      };

      const { response, data } = await apiCall('PUT', `/api/viajes/${viajeId}`, viajeEditado);
      if (!response.ok) throw new Error(`Status ${response.status}: ${data?.error}`);
    });

    // Test 9: Editar viaje - cambiar cupos y reservados
    await test('PUT /api/viajes/[id] - Editar cupos y reservados', async () => {
      const viajeEditado = {
        razonSocial: 'COOP AGROPECUARIA DE DAIREAUX LTDA',
        origen: 'DAIREAUX',
        destino: 'BAHIA BLANCA',
        articulo: 'MAIZ',
        cupos: 20, // Cambio de 10 a 20
        reservados: 5, // Cambio de 0 a 5
        tarifa: 60000,
        vendedor: ''
      };

      const { response, data } = await apiCall('PUT', `/api/viajes/${viajeId}`, viajeEditado);
      if (!response.ok) throw new Error(`Status ${response.status}: ${data?.error}`);
    });

    // Test 10: Eliminar viaje sin reservas (debería funcionar)
    await test('DELETE /api/viajes/[id] - Eliminar viaje sin reservas', async () => {
      const { response, data } = await apiCall('DELETE', `/api/viajes/${viajeId}`);
      if (!response.ok) throw new Error(`Status ${response.status}: ${data?.error}`);
      log.info(`  → Viaje #${viajeCreado.numero} eliminado correctamente`);
    });
  }

  // Test 11: Crear viaje para testing de eliminación con reservas
  let viajeConReservas = null;
  await test('POST /api/viajes/POST - Crear viaje con reservas', async () => {
    const nuevoViaje = {
      razonSocial: 'COOP AGROPECUARIA DE DAIREAUX LTDA',
      origen: 'DAIREAUX',
      destino: 'BAHIA BLANCA',
      articulo: 'SOJA',
      cupos: 10,
      reservados: 5, // CON RESERVAS
      tarifa: 45000,
      vendedor: ''
    };

    const { response, data } = await apiCall('POST', '/api/viajes/POST', nuevoViaje);
    if (!response.ok) throw new Error(`Status ${response.status}: ${data?.error}`);
    viajeConReservas = data.data?.entIdEnt;
    log.info(`  → Viaje con reservas creado: #${data.numero} (ID: ${viajeConReservas})`);
  });

  // Test 12: Intentar eliminar viaje CON reservas (debería fallar)
  if (viajeConReservas) {
    await test('DELETE /api/viajes/[id] - Rechazar eliminar viaje con reservas', async () => {
      const { response, data } = await apiCall('DELETE', `/api/viajes/${viajeConReservas}`);
      if (response.ok) throw new Error('Debería haber rechazado eliminar viaje con reservas');
      if (!data.error) throw new Error('No se recibió mensaje de error');
    });
  }
}

// ============================================
// TESTS: FILTROS
// ============================================

async function testFiltros() {
  log.section('🔍 TESTING: FILTROS');

  // Test 1: Filtro por fecha desde
  await test('GET /api/viajes/GET?fechaDesde - Filtrar por fecha', async () => {
    const fechaDesde = '2025-01-01';
    const { response, data } = await apiCall('GET', `/api/viajes/GET?fechaDesde=${fechaDesde}`);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    if (!Array.isArray(data)) throw new Error('La respuesta no es un array');
  });

  // Test 2: Filtro por razón social
  await test('GET /api/viajes/GET?razonSocial - Filtrar por cliente', async () => {
    const razonSocial = 'COOP';
    const { response, data } = await apiCall('GET', `/api/viajes/GET?razonSocial=${razonSocial}`);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    if (!Array.isArray(data)) throw new Error('La respuesta no es un array');
  });

  // Test 3: Filtro por cupos pendientes mínimos
  await test('GET /api/viajes/GET?minCuposPendientes - Filtrar por cupos pendientes', async () => {
    const minCuposPendientes = 1;
    const { response, data } = await apiCall('GET', `/api/viajes/GET?minCuposPendientes=${minCuposPendientes}`);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    if (!Array.isArray(data)) throw new Error('La respuesta no es un array');
  });
}

// ============================================
// TESTS: TERCEROS, PRODUCTOS, ETC.
// ============================================

async function testMaestros() {
  log.section('📚 TESTING: MAESTROS (Terceros, Productos, etc.)');

  // Test 1: Listar terceros
  await test('GET /api/terceros - Listar terceros', async () => {
    const { response, data } = await apiCall('GET', '/api/terceros');
    if (!response.ok) throw new Error(`Status ${response.status}`);
    if (!Array.isArray(data)) throw new Error('La respuesta no es un array');
  });

  // Test 2: Listar productos
  await test('GET /api/productos - Listar productos', async () => {
    const { response, data } = await apiCall('GET', '/api/productos');
    if (!response.ok) throw new Error(`Status ${response.status}`);
    if (!Array.isArray(data)) throw new Error('La respuesta no es un array');
  });

  // Test 3: Listar vendedores
  await test('GET /api/vendedores - Listar vendedores', async () => {
    const { response, data } = await apiCall('GET', '/api/vendedores');
    if (!response.ok) throw new Error(`Status ${response.status}`);
    if (!Array.isArray(data)) throw new Error('La respuesta no es un array');
  });

  // Test 4: Listar localidades
  await test('GET /api/localidades - Listar localidades', async () => {
    const { response, data } = await apiCall('GET', '/api/localidades');
    if (!response.ok) throw new Error(`Status ${response.status}`);
    if (!Array.isArray(data)) throw new Error('La respuesta no es un array');
  });

  // Test 5: Listar transportes
  await test('GET /api/transportes - Listar transportes', async () => {
    const { response, data } = await apiCall('GET', '/api/transportes');
    if (!response.ok) throw new Error(`Status ${response.status}`);
    if (!Array.isArray(data)) throw new Error('La respuesta no es un array');
  });

  // Test 6: Listar choferes
  await test('GET /api/choferes - Listar choferes', async () => {
    const { response, data } = await apiCall('GET', '/api/choferes');
    if (!response.ok) throw new Error(`Status ${response.status}`);
    if (!Array.isArray(data)) throw new Error('La respuesta no es un array');
  });
}

// ============================================
// REPORTE FINAL
// ============================================

function printReport() {
  log.section('📊 REPORTE FINAL');

  console.log(`Total de tests: ${testResults.total}`);
  console.log(`${colors.green}✓ Pasados: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}✗ Fallidos: ${testResults.failed}${colors.reset}`);

  const percentage = ((testResults.passed / testResults.total) * 100).toFixed(2);
  console.log(`\nPorcentaje de éxito: ${percentage}%`);

  if (testResults.failed > 0) {
    log.section('❌ ERRORES ENCONTRADOS');
    testResults.errors.forEach((err, i) => {
      console.log(`\n${i + 1}. ${colors.red}${err.name}${colors.reset}`);
      console.log(`   ${err.error}`);
    });
  } else {
    log.section('🎉 ¡TODOS LOS TESTS PASARON!');
    console.log('El sistema está funcionando correctamente.');
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log(`${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║         TESTING EXHAUSTIVO - SISTEMA DE VIAJES              ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  log.info(`Servidor: ${BASE_URL}`);
  log.info('Iniciando tests...\n');

  // Verificar que el servidor esté corriendo
  try {
    const response = await fetch(BASE_URL);
    if (!response.ok && response.status !== 404) {
      throw new Error('Servidor no responde correctamente');
    }
  } catch (error) {
    log.error('No se puede conectar al servidor. ¿Está corriendo en http://localhost:3000?');
    process.exit(1);
  }

  // Ejecutar todos los tests
  await testViajes();
  await testFiltros();
  await testMaestros();

  // Mostrar reporte
  printReport();

  // Exit code basado en resultados
  process.exit(testResults.failed > 0 ? 1 : 0);
}

main();
