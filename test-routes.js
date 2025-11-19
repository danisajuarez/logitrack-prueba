async function testRoute(url) {
  try {
    console.log(`\nProbando: ${url}`);
    const response = await fetch(url);
    console.log(`Status: ${response.status}`);

    const contentType = response.headers.get('content-type');
    console.log(`Content-Type: ${contentType}`);

    if (contentType && contentType.includes('application/json')) {
      const json = await response.json();
      console.log('✓ Es JSON');
      if (Array.isArray(json)) {
        console.log(`✓ Es array con ${json.length} elementos`);
      } else if (json.error) {
        console.log(`✗ Error: ${json.error}`);
      }
    } else {
      console.log('✗ NO es JSON, es HTML (404 o error de Next.js)');
    }
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
  }
}

async function main() {
  console.log('=== PROBANDO RUTAS ===\n');

  // Rutas que probablemente NO funcionen (carpetas en mayúscula)
  await testRoute('http://localhost:3000/api/viajes/GET');
  await testRoute('http://localhost:3000/api/viajes/POST');

  // Rutas que SÍ deberían funcionar
  await testRoute('http://localhost:3000/api/terceros');
  await testRoute('http://localhost:3000/api/productos');
  await testRoute('http://localhost:3000/api/vendedores');
  await testRoute('http://localhost:3000/api/localidades');

  // Probar si existe un route.ts en la raíz de viajes
  await testRoute('http://localhost:3000/api/viajes');
}

main();
