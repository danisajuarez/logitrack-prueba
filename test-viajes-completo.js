/**
 * TEST COMPLETO DE VIAJES API
 *
 * Este script prueba todos los endpoints de viajes con casos edge y validaciones
 * Ejecutar con: node test-viajes-completo.js
 */

const API_BASE = "http://localhost:3000/api/viajes";

// Colores para la consola
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
};

let createdViajesIds = []; // Para limpiar después

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// TEST 1: GET - Obtener viajes
// ============================================
async function testGetViajes() {
  logTest("TEST 1: GET /api/viajes/GET");

  try {
    // Test 1.1: GET sin filtros
    const response1 = await fetch(`${API_BASE}/GET`);
    const data1 = await response1.json();

    if (response1.ok && Array.isArray(data1)) {
      logSuccess(`GET sin filtros: ${data1.length} viajes encontrados`);
      testResults.passed++;
    } else {
      logError(`GET sin filtros falló: ${response1.status}`);
      testResults.failed++;
    }

    // Test 1.2: GET con filtro de fecha
    const today = new Date().toISOString().split('T')[0];
    const response2 = await fetch(`${API_BASE}/GET?fechaDesde=${today}`);
    const data2 = await response2.json();

    if (response2.ok && Array.isArray(data2)) {
      logSuccess(`GET con fechaDesde=${today}: ${data2.length} viajes`);
      testResults.passed++;
    } else {
      logError(`GET con fechaDesde falló`);
      testResults.failed++;
    }

    // Test 1.3: GET con filtro de cupos pendientes
    const response3 = await fetch(`${API_BASE}/GET?minCuposPendientes=1`);
    const data3 = await response3.json();

    if (response3.ok && Array.isArray(data3)) {
      logSuccess(`GET con minCuposPendientes=1: ${data3.length} viajes`);

      // Verificar que todos tengan cuposPendientes >= 1
      const allValid = data3.every(v => v.cuposPendientes >= 1);
      if (allValid) {
        logSuccess("Todos los viajes cumplen con minCuposPendientes >= 1");
        testResults.passed++;
      } else {
        logError("Algunos viajes NO cumplen con el filtro de cuposPendientes");
        testResults.failed++;
      }
    } else {
      logError(`GET con minCuposPendientes falló`);
      testResults.failed++;
    }

    // Test 1.4: Verificar estructura de datos
    if (data1.length > 0) {
      const viaje = data1[0];
      const requiredFields = ['id', 'numero', 'fecha', 'razonSocial', 'origen', 'destino', 'cupos', 'tarifa'];
      const hasAllFields = requiredFields.every(field => viaje.hasOwnProperty(field));

      if (hasAllFields) {
        logSuccess("Estructura de datos correcta");
        testResults.passed++;
      } else {
        logError("Estructura de datos incompleta");
        logWarning(`Campos presentes: ${Object.keys(viaje).join(', ')}`);
        testResults.failed++;
      }
    }

  } catch (error) {
    logError(`Error en test GET: ${error.message}`);
    testResults.failed++;
  }
}

// ============================================
// TEST 2: POST - Crear viajes
// ============================================
async function testCreateViaje() {
  logTest("TEST 2: POST /api/viajes/POST");

  // Test 2.1: Crear viaje válido
  try {
    const viajeValido = {
      razonSocial: "TEST EMPRESA SA",
      origen: "Buenos Aires",
      destino: "Rosario",
      articulo: "Cereales",
      cupos: 5,
      cuposReservados: 0,
      tarifa: 150000,
      vendedor: null
    };

    const response = await fetch(`${API_BASE}/POST`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(viajeValido)
    });

    const data = await response.json();

    if (response.ok && data.success) {
      logSuccess(`Viaje creado: ID=${data.data.entIdEnt}, Numero=${data.numero}`);
      createdViajesIds.push(data.data.entIdEnt);
      testResults.passed++;
    } else {
      logError(`Error al crear viaje válido: ${data.error || data.details}`);
      testResults.failed++;
    }
  } catch (error) {
    logError(`Error en POST viaje válido: ${error.message}`);
    testResults.failed++;
  }

  // Test 2.2: Crear viaje sin campos obligatorios
  try {
    const viajeInvalido = {
      razonSocial: "TEST",
      // Falta origen, destino, articulo
      cupos: 5,
      tarifa: 100000
    };

    const response = await fetch(`${API_BASE}/POST`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(viajeInvalido)
    });

    const data = await response.json();

    if (!response.ok && data.error) {
      logSuccess(`Validación correcta: rechaza viaje sin campos obligatorios`);
      testResults.passed++;
    } else {
      logError(`ERROR: Aceptó viaje sin campos obligatorios`);
      testResults.failed++;
    }
  } catch (error) {
    logError(`Error en POST sin campos obligatorios: ${error.message}`);
    testResults.failed++;
  }

  // Test 2.3: Tarifa negativa
  try {
    const viajeTarifaNegativa = {
      razonSocial: "TEST EMPRESA SA",
      origen: "Buenos Aires",
      destino: "Rosario",
      articulo: "Cereales",
      cupos: 5,
      cuposReservados: 0,
      tarifa: -1000,
      vendedor: null
    };

    const response = await fetch(`${API_BASE}/POST`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(viajeTarifaNegativa)
    });

    const data = await response.json();

    if (!response.ok && data.error && data.error.includes("tarifa")) {
      logSuccess(`Validación correcta: rechaza tarifa negativa`);
      testResults.passed++;
    } else {
      logError(`ERROR: Aceptó tarifa negativa`);
      testResults.failed++;
    }
  } catch (error) {
    logError(`Error en POST tarifa negativa: ${error.message}`);
    testResults.failed++;
  }

  // Test 2.4: Cupos cero o negativos
  try {
    const viajeCuposCero = {
      razonSocial: "TEST EMPRESA SA",
      origen: "Buenos Aires",
      destino: "Rosario",
      articulo: "Cereales",
      cupos: 0,
      cuposReservados: 0,
      tarifa: 100000,
      vendedor: null
    };

    const response = await fetch(`${API_BASE}/POST`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(viajeCuposCero)
    });

    const data = await response.json();

    if (!response.ok && data.error && data.error.includes("cupos")) {
      logSuccess(`Validación correcta: rechaza cupos <= 0`);
      testResults.passed++;
    } else {
      logError(`ERROR: Aceptó cupos <= 0`);
      testResults.failed++;
    }
  } catch (error) {
    logError(`Error en POST cupos cero: ${error.message}`);
    testResults.failed++;
  }

  // Test 2.5: Cupos reservados mayores que totales
  try {
    const viajeReservasMayores = {
      razonSocial: "TEST EMPRESA SA",
      origen: "Buenos Aires",
      destino: "Rosario",
      articulo: "Cereales",
      cupos: 5,
      cuposReservados: 10,
      tarifa: 100000,
      vendedor: null
    };

    const response = await fetch(`${API_BASE}/POST`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(viajeReservasMayores)
    });

    const data = await response.json();

    if (!response.ok && data.error && data.error.includes("reservados")) {
      logSuccess(`Validación correcta: rechaza reservados > cupos`);
      testResults.passed++;
    } else {
      logError(`ERROR: Aceptó cuposReservados > cupos`);
      testResults.failed++;
    }
  } catch (error) {
    logError(`Error en POST reservas mayores: ${error.message}`);
    testResults.failed++;
  }
}

// ============================================
// TEST 3: PUT - Actualizar viajes
// ============================================
async function testUpdateViaje() {
  logTest("TEST 3: PUT /api/viajes/[id]");

  if (createdViajesIds.length === 0) {
    logWarning("No hay viajes creados para actualizar, saltando tests de PUT");
    return;
  }

  const viajeId = createdViajesIds[0];

  // Test 3.1: Actualizar viaje válido
  try {
    const updateData = {
      razonSocial: "TEST EMPRESA SA MODIFICADA",
      origen: "Buenos Aires",
      destino: "Córdoba",
      articulo: "Granos",
      equipo: "Equipo 1",
      cupos: 10,
      reservados: 2,
      pendientes: 8,
      tarifa: 200000,
      vendedor: null
    };

    const response = await fetch(`${API_BASE}/${viajeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    const data = await response.json();

    if (response.ok && data.message) {
      logSuccess(`Viaje actualizado correctamente: ID=${viajeId}`);
      testResults.passed++;

      // Verificar que los cambios se guardaron
      await sleep(500);
      const getResponse = await fetch(`${API_BASE}/GET`);
      const viajes = await getResponse.json();
      const viajeActualizado = viajes.find(v => v.id === viajeId);

      if (viajeActualizado && viajeActualizado.razonSocial === "TEST EMPRESA SA MODIFICADA") {
        logSuccess("Cambios verificados en la base de datos");
        testResults.passed++;
      } else {
        logError("Los cambios NO se reflejaron en la base de datos");
        testResults.failed++;
      }
    } else {
      logError(`Error al actualizar viaje: ${data.error || data.details}`);
      testResults.failed++;
    }
  } catch (error) {
    logError(`Error en PUT viaje válido: ${error.message}`);
    testResults.failed++;
  }

  // Test 3.2: Actualizar con tarifa negativa
  try {
    const updateInvalido = {
      razonSocial: "TEST",
      origen: "Buenos Aires",
      destino: "Rosario",
      articulo: "Cereales",
      equipo: "Equipo 1",
      cupos: 5,
      reservados: 0,
      pendientes: 5,
      tarifa: -5000,
      vendedor: null
    };

    const response = await fetch(`${API_BASE}/${viajeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateInvalido)
    });

    const data = await response.json();

    if (!response.ok && data.error && data.error.includes("tarifa")) {
      logSuccess(`Validación correcta: rechaza actualización con tarifa negativa`);
      testResults.passed++;
    } else {
      logError(`ERROR: Aceptó actualización con tarifa negativa`);
      testResults.failed++;
    }
  } catch (error) {
    logError(`Error en PUT tarifa negativa: ${error.message}`);
    testResults.failed++;
  }

  // Test 3.3: Actualizar viaje inexistente
  try {
    const response = await fetch(`${API_BASE}/999999999`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razonSocial: "TEST",
        origen: "Buenos Aires",
        destino: "Rosario",
        articulo: "Cereales",
        equipo: "Equipo 1",
        cupos: 5,
        reservados: 0,
        pendientes: 5,
        tarifa: 100000,
        vendedor: null
      })
    });

    const data = await response.json();

    if (!response.ok && (data.error === "Viaje no encontrado" || response.status === 404)) {
      logSuccess(`Validación correcta: rechaza actualización de viaje inexistente`);
      testResults.passed++;
    } else {
      logError(`ERROR: No maneja correctamente viaje inexistente`);
      testResults.failed++;
    }
  } catch (error) {
    logError(`Error en PUT viaje inexistente: ${error.message}`);
    testResults.failed++;
  }
}

// ============================================
// TEST 4: DELETE - Eliminar viajes
// ============================================
async function testDeleteViaje() {
  logTest("TEST 4: DELETE /api/viajes/[id]");

  // Test 4.1: Intentar eliminar viaje inexistente
  try {
    const response = await fetch(`${API_BASE}/999999999`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok && data.error) {
      logSuccess(`Validación correcta: no permite eliminar viaje inexistente`);
      testResults.passed++;
    } else {
      logWarning(`Comportamiento inesperado al eliminar viaje inexistente`);
      testResults.warnings++;
    }
  } catch (error) {
    logError(`Error en DELETE viaje inexistente: ${error.message}`);
    testResults.failed++;
  }

  // Test 4.2: Eliminar viajes de test creados
  for (const viajeId of createdViajesIds) {
    try {
      const response = await fetch(`${API_BASE}/${viajeId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok && data.message) {
        logSuccess(`Viaje de test eliminado: ID=${viajeId}`);
        testResults.passed++;
      } else if (data.error && data.error.includes("reservas")) {
        logWarning(`No se pudo eliminar (tiene reservas): ID=${viajeId}`);
        testResults.warnings++;
      } else {
        logError(`Error al eliminar viaje de test: ${data.error}`);
        testResults.failed++;
      }
    } catch (error) {
      logError(`Error en DELETE viaje ${viajeId}: ${error.message}`);
      testResults.failed++;
    }
  }
}

// ============================================
// TEST 5: Casos Edge y Concurrencia
// ============================================
async function testEdgeCases() {
  logTest("TEST 5: Casos Edge");

  // Test 5.1: Crear y actualizar rápidamente (simular concurrencia)
  try {
    const viaje = {
      razonSocial: "TEST CONCURRENCIA SA",
      origen: "Buenos Aires",
      destino: "Rosario",
      articulo: "Cereales",
      cupos: 10,
      cuposReservados: 0,
      tarifa: 100000,
      vendedor: null
    };

    const createResponse = await fetch(`${API_BASE}/POST`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(viaje)
    });

    const createData = await createResponse.json();

    if (createResponse.ok) {
      const viajeId = createData.data.entIdEnt;

      // Intentar múltiples actualizaciones simultáneas
      const updatePromises = [];
      for (let i = 0; i < 3; i++) {
        updatePromises.push(
          fetch(`${API_BASE}/${viajeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...viaje,
              tarifa: 100000 + (i * 10000),
              cupos: 10,
              reservados: 0,
              pendientes: 10,
              equipo: "Equipo 1"
            })
          })
        );
      }

      const results = await Promise.all(updatePromises);
      const allOk = results.every(r => r.ok);

      if (allOk) {
        logSuccess("Múltiples actualizaciones simultáneas manejadas correctamente");
        testResults.passed++;
      } else {
        logWarning("Algunas actualizaciones simultáneas fallaron (puede ser esperado)");
        testResults.warnings++;
      }

      // Limpiar
      await fetch(`${API_BASE}/${viajeId}`, { method: 'DELETE' });
    }
  } catch (error) {
    logError(`Error en test de concurrencia: ${error.message}`);
    testResults.failed++;
  }

  // Test 5.2: Campos con valores extremos
  try {
    const viajeExtremo = {
      razonSocial: "A".repeat(200), // Texto muy largo
      origen: "Buenos Aires",
      destino: "Rosario",
      articulo: "X",
      cupos: 999999,
      cuposReservados: 0,
      tarifa: 999999999,
      vendedor: null
    };

    const response = await fetch(`${API_BASE}/POST`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(viajeExtremo)
    });

    const data = await response.json();

    if (response.ok) {
      logSuccess("Maneja valores extremos correctamente");
      testResults.passed++;
      // Limpiar
      if (data.data && data.data.entIdEnt) {
        await fetch(`${API_BASE}/${data.data.entIdEnt}`, { method: 'DELETE' });
      }
    } else {
      logWarning(`Rechazó valores extremos: ${data.error}`);
      testResults.warnings++;
    }
  } catch (error) {
    logError(`Error en test de valores extremos: ${error.message}`);
    testResults.failed++;
  }
}

// ============================================
// TEST 6: Integridad de datos después de operaciones
// ============================================
async function testDataIntegrity() {
  logTest("TEST 6: Integridad de Datos");

  try {
    // Crear viaje
    const viaje = {
      razonSocial: "TEST INTEGRIDAD SA",
      origen: "Buenos Aires",
      destino: "Rosario",
      articulo: "Cereales",
      cupos: 10,
      cuposReservados: 3,
      tarifa: 150000,
      vendedor: null
    };

    const createResponse = await fetch(`${API_BASE}/POST`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(viaje)
    });

    const createData = await createResponse.json();

    if (createResponse.ok) {
      const viajeId = createData.data.entIdEnt;
      await sleep(500); // Esperar que se propague

      // Verificar que se creó correctamente
      const getResponse = await fetch(`${API_BASE}/GET`);
      const viajes = await getResponse.json();
      const viajeCreado = viajes.find(v => v.id === viajeId);

      if (viajeCreado) {
        // Verificar cálculo de cupos pendientes
        const cuposPendientesEsperados = viaje.cupos - viaje.cuposReservados;
        if (viajeCreado.cuposPendientes === cuposPendientesEsperados) {
          logSuccess(`Cálculo correcto de cuposPendientes: ${viajeCreado.cuposPendientes}`);
          testResults.passed++;
        } else {
          logError(`Cálculo incorrecto: esperado ${cuposPendientesEsperados}, obtenido ${viajeCreado.cuposPendientes}`);
          testResults.failed++;
        }

        // Verificar que todos los campos se guardaron
        if (viajeCreado.razonSocial === viaje.razonSocial &&
            viajeCreado.cupos === viaje.cupos &&
            viajeCreado.tarifa === viaje.tarifa) {
          logSuccess("Todos los campos se persistieron correctamente");
          testResults.passed++;
        } else {
          logError("Algunos campos no se guardaron correctamente");
          testResults.failed++;
        }
      } else {
        logError("El viaje no se encuentra después de crearlo");
        testResults.failed++;
      }

      // Limpiar
      await fetch(`${API_BASE}/${viajeId}`, { method: 'DELETE' });
    }
  } catch (error) {
    logError(`Error en test de integridad: ${error.message}`);
    testResults.failed++;
  }
}

// ============================================
// EJECUTAR TODOS LOS TESTS
// ============================================
async function runAllTests() {
  console.log("\n" + "=".repeat(60));
  log("SUITE DE TESTING COMPLETA - API DE VIAJES", colors.blue);
  console.log("=".repeat(60));

  await testGetViajes();
  await testCreateViaje();
  await testUpdateViaje();
  await testDeleteViaje();
  await testEdgeCases();
  await testDataIntegrity();

  // Resumen final
  console.log("\n" + "=".repeat(60));
  log("RESUMEN DE TESTS", colors.blue);
  console.log("=".repeat(60));
  logSuccess(`Tests exitosos: ${testResults.passed}`);
  logError(`Tests fallidos: ${testResults.failed}`);
  logWarning(`Advertencias: ${testResults.warnings}`);

  const total = testResults.passed + testResults.failed;
  const percentage = total > 0 ? ((testResults.passed / total) * 100).toFixed(2) : 0;

  console.log("\n");
  if (testResults.failed === 0) {
    log(`✓ TODOS LOS TESTS PASARON (${percentage}%)`, colors.green);
  } else if (percentage >= 80) {
    log(`⚠ ${percentage}% de tests pasaron`, colors.yellow);
  } else {
    log(`✗ ${percentage}% de tests pasaron - REVISAR`, colors.red);
  }
  console.log("=".repeat(60) + "\n");
}

// Ejecutar
runAllTests().catch(err => {
  logError(`Error fatal: ${err.message}`);
  console.error(err);
  process.exit(1);
});
