/**
 * Test final con espera para compilación
 */

const BASE_URL = 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

async function waitForServer() {
  log.info('Esperando a que el servidor termine de compilar...');
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${BASE_URL}/api/terceros`);
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        log.success('Servidor listo!');
        return true;
      }

      log.warn(`Intento ${attempts + 1}/${maxAttempts} - Todavía compilando...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    } catch (error) {
      log.warn(`Intento ${attempts + 1}/${maxAttempts} - Error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }
  }

  throw new Error('El servidor no respondió correctamente después de varios intentos');
}

async function testAPI(name, method, endpoint, body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const contentType = response.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Respuesta no es JSON. Content-Type: ${contentType}`);
    }

    const data = await response.json();

    log.success(name);
    return { success: true, response, data };
  } catch (error) {
    log.error(`${name}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log.section('🧪 TESTING - SISTEMA DE VIAJES');

  let passed = 0;
  let failed = 0;

  // Test 1: Listar terceros
  const t1 = await testAPI('GET /api/terceros', 'GET', '/api/terceros');
  t1.success ? passed++ : failed++;

  // Test 2: Listar productos
  const t2 = await testAPI('GET /api/productos', 'GET', '/api/productos');
  t2.success ? passed++ : failed++;

  // Test 3: Listar vendedores
  const t3 = await testAPI('GET /api/vendedores', 'GET', '/api/vendedores');
  t3.success ? passed++ : failed++;

  // Test 4: Listar localidades
  const t4 = await testAPI('GET /api/localidades', 'GET', '/api/localidades');
  t4.success ? passed++ : failed++;

  // Test 5: Listar viajes (ruta correcta)
  const t5 = await testAPI('GET /api/viajes/GET', 'GET', '/api/viajes/GET');
  t5.success ? passed++ : failed++;

  // Test 6: Crear viaje
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

  const t6 = await testAPI('POST /api/viajes/POST - Crear viaje', 'POST', '/api/viajes/POST', nuevoViaje);
  t6.success ? passed++ : failed++;

  let viajeId = null;
  if (t6.success && t6.data.data && t6.data.data.entIdEnt) {
    viajeId = t6.data.data.entIdEnt;
    log.info(`  → Viaje creado con ID: ${viajeId}`);

    // Test 7: Editar viaje
    const viajeEditado = { ...nuevoViaje, articulo: 'MAIZ', tarifa: 60000 };
    const t7 = await testAPI(`PUT /api/viajes/${viajeId} - Editar viaje`, 'PUT', `/api/viajes/${viajeId}`, viajeEditado);
    t7.success ? passed++ : failed++;

    // Test 8: Eliminar viaje
    const t8 = await testAPI(`DELETE /api/viajes/${viajeId} - Eliminar viaje`, 'DELETE', `/api/viajes/${viajeId}`);
    t8.success ? passed++ : failed++;
  }

  // Reporte final
  log.section('📊 RESULTADOS');
  console.log(`Total: ${passed + failed}`);
  console.log(`${colors.green}✓ Pasados: ${passed}${colors.reset}`);
  console.log(`${colors.red}✗ Fallidos: ${failed}${colors.reset}`);

  const percentage = ((passed / (passed + failed)) * 100).toFixed(2);
  console.log(`\nPorcentaje de éxito: ${percentage}%`);

  if (failed === 0) {
    log.section('🎉 ¡TODO FUNCIONA CORRECTAMENTE!');
  }
}

async function main() {
  try {
    await waitForServer();
    await runTests();
  } catch (error) {
    log.error(`Error fatal: ${error.message}`);
    process.exit(1);
  }
}

main();
