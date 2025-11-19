/**
 * TEST DE OPERACIONES CON VIAJES NUEVOS
 *
 * Este script prueba crear, editar y eliminar viajes usando el endpoint interno
 */

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

function header(text) {
  console.log("\n" + colors.cyan + "═".repeat(70) + colors.reset);
  console.log(colors.cyan + text + colors.reset);
  console.log(colors.cyan + "═".repeat(70) + colors.reset);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testOperaciones() {
  header("TEST DE CREAR, EDITAR Y ELIMINAR VIAJE");

  let viajeId = null;

  try {
    // PASO 1: Crear viaje
    log("\n1️⃣  CREANDO VIAJE NUEVO...", colors.blue);

    const viajeNuevo = {
      razonSocial: "TEST AUTOMATICO SA",
      origen: "Buenos Aires",
      destino: "Rosario",
      articulo: "Cereales",
      cupos: 10,
      cuposReservados: 2,
      tarifa: 150000,
      vendedor: null
    };

    const createResponse = await fetch("http://localhost:3000/api/viajes/POST", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(viajeNuevo)
    });

    const createData = await createResponse.json();

    if (!createResponse.ok) {
      log(`✗ Error al crear: ${createData.error || createData.details}`, colors.red);
      return;
    }

    viajeId = createData.data.entIdEnt;
    const numero = createData.numero;

    log(`✓ Viaje creado: ID=${viajeId}, Numero=${numero}`, colors.green);
    log(`  Cupos: ${viajeNuevo.cupos}, Reservados: ${viajeNuevo.cuposReservados}, Esperado Pendientes: ${viajeNuevo.cupos - viajeNuevo.cuposReservados}`, colors.cyan);

    // PASO 2: Verificar que se guardó correctamente
    await sleep(1000);
    log("\n2️⃣  VERIFICANDO DATOS EN LA BASE...", colors.blue);

    const getResponse = await fetch("http://localhost:3000/api/viajes/GET");
    const viajes = await getResponse.json();
    const viajeCreado = viajes.find(v => v.id === viajeId);

    if (!viajeCreado) {
      log(`✗ El viaje NO se encuentra en la BD`, colors.red);
      return;
    }

    log(`✓ Viaje encontrado en la BD`, colors.green);
    log(`  ID: ${viajeCreado.id}`, colors.cyan);
    log(`  Número: ${viajeCreado.numero}`, colors.cyan);
    log(`  Razón Social: ${viajeCreado.razonSocial}`, colors.cyan);
    log(`  Cupos: ${viajeCreado.cupos}`, colors.cyan);
    log(`  Reservados: ${viajeCreado.cuposReservados}`, colors.cyan);
    log(`  Pendientes: ${viajeCreado.cuposPendientes}`, colors.cyan);
    log(`  Tarifa: $${viajeCreado.tarifa}`, colors.cyan);

    // VERIFICACIONES
    let errores = 0;

    const pendientesEsperados = viajeNuevo.cupos - viajeNuevo.cuposReservados;
    if (viajeCreado.cuposPendientes !== pendientesEsperados) {
      log(`✗ ERROR: cuposPendientes=${viajeCreado.cuposPendientes}, esperado=${pendientesEsperados}`, colors.red);
      errores++;
    } else {
      log(`✓ Cupos pendientes calculados correctamente (${viajeCreado.cuposPendientes})`, colors.green);
    }

    if (viajeCreado.razonSocial !== viajeNuevo.razonSocial) {
      log(`✗ ERROR: razonSocial no coincide`, colors.red);
      errores++;
    } else {
      log(`✓ Razón social correcta`, colors.green);
    }

    if (viajeCreado.tarifa !== viajeNuevo.tarifa) {
      log(`✗ ERROR: tarifa=${viajeCreado.tarifa}, esperado=${viajeNuevo.tarifa}`, colors.red);
      errores++;
    } else {
      log(`✓ Tarifa correcta`, colors.green);
    }

    // PASO 3: Editar viaje
    await sleep(1000);
    log("\n3️⃣  EDITANDO VIAJE...", colors.blue);

    const updateData = {
      razonSocial: "TEST AUTOMATICO SA - MODIFICADO",
      origen: "Buenos Aires",
      destino: "Córdoba",
      articulo: "Granos",
      equipo: "Equipo 1",
      cupos: 15,
      reservados: 3,
      pendientes: 12,
      tarifa: 200000,
      vendedor: null
    };

    const updateResponse = await fetch(`http://localhost:3000/api/viajes/${viajeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    const updateResult = await updateResponse.json();

    if (!updateResponse.ok) {
      log(`✗ Error al editar: ${updateResult.error}`, colors.red);
      errores++;
    } else {
      log(`✓ Viaje editado correctamente`, colors.green);
    }

    // PASO 4: Verificar cambios
    await sleep(1000);
    log("\n4️⃣  VERIFICANDO CAMBIOS...", colors.blue);

    const getResponse2 = await fetch("http://localhost:3000/api/viajes/GET");
    const viajes2 = await getResponse2.json();
    const viajeEditado = viajes2.find(v => v.id === viajeId);

    if (!viajeEditado) {
      log(`✗ El viaje NO se encuentra después de editar`, colors.red);
      errores++;
    } else {
      log(`  Razón Social: ${viajeEditado.razonSocial}`, colors.cyan);
      log(`  Destino: ${viajeEditado.destino}`, colors.cyan);
      log(`  Cupos: ${viajeEditado.cupos}`, colors.cyan);
      log(`  Reservados: ${viajeEditado.cuposReservados}`, colors.cyan);
      log(`  Pendientes: ${viajeEditado.cuposPendientes}`, colors.cyan);
      log(`  Tarifa: $${viajeEditado.tarifa}`, colors.cyan);

      if (viajeEditado.razonSocial !== updateData.razonSocial) {
        log(`✗ ERROR: Razón social no se actualizó`, colors.red);
        errores++;
      } else {
        log(`✓ Razón social actualizada correctamente`, colors.green);
      }

      if (viajeEditado.destino !== updateData.destino) {
        log(`✗ ERROR: Destino no se actualizó`, colors.red);
        errores++;
      } else {
        log(`✓ Destino actualizado correctamente`, colors.green);
      }

      if (viajeEditado.tarifa !== updateData.tarifa) {
        log(`✗ ERROR: Tarifa no se actualizó`, colors.red);
        errores++;
      } else {
        log(`✓ Tarifa actualizada correctamente`, colors.green);
      }

      const pendientesEsperadosEdit = updateData.cupos - updateData.reservados;
      if (viajeEditado.cuposPendientes !== pendientesEsperadosEdit) {
        log(`✗ ERROR: cuposPendientes=${viajeEditado.cuposPendientes}, esperado=${pendientesEsperadosEdit}`, colors.red);
        errores++;
      } else {
        log(`✓ Cupos pendientes recalculados correctamente (${viajeEditado.cuposPendientes})`, colors.green);
      }
    }

    // PASO 5: Eliminar viaje
    await sleep(1000);
    log("\n5️⃣  ELIMINANDO VIAJE...", colors.blue);

    const deleteResponse = await fetch(`http://localhost:3000/api/viajes/${viajeId}`, {
      method: 'DELETE'
    });

    const deleteResult = await deleteResponse.json();

    if (!deleteResponse.ok) {
      log(`✗ Error al eliminar: ${deleteResult.error}`, colors.red);
      errores++;
    } else {
      log(`✓ Viaje eliminado correctamente`, colors.green);
    }

    // PASO 6: Verificar eliminación
    await sleep(1000);
    log("\n6️⃣  VERIFICANDO ELIMINACIÓN...", colors.blue);

    const getResponse3 = await fetch("http://localhost:3000/api/viajes/GET");
    const viajes3 = await getResponse3.json();
    const viajeEliminado = viajes3.find(v => v.id === viajeId);

    if (viajeEliminado) {
      log(`✗ ERROR: El viaje aún existe en la BD`, colors.red);
      errores++;
    } else {
      log(`✓ Viaje eliminado de la BD correctamente`, colors.green);
    }

    // RESUMEN
    header("RESUMEN DEL TEST");

    if (errores === 0) {
      log(`\n✓ TODAS LAS OPERACIONES FUNCIONAN CORRECTAMENTE`, colors.green);
      log(`  - Crear viaje: OK`, colors.green);
      log(`  - Cupos pendientes se calculan bien: OK`, colors.green);
      log(`  - Editar viaje: OK`, colors.green);
      log(`  - Cambios se persisten: OK`, colors.green);
      log(`  - Eliminar viaje: OK`, colors.green);
    } else {
      log(`\n✗ SE ENCONTRARON ${errores} ERRORES`, colors.red);
      log(`\nRevisa los logs anteriores para ver los detalles`, colors.yellow);
    }

  } catch (error) {
    log(`\n✗ ERROR FATAL: ${error.message}`, colors.red);
    console.error(error);
  }
}

// Ejecutar
testOperaciones().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
