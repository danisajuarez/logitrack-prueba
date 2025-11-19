// Test simple para ver qué carajo está pasando

async function testEndpoint(url) {
  try {
    console.log(`\nProbando: ${url}`);
    const response = await fetch(url);
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);

    const text = await response.text();
    console.log(`Response (primeros 500 chars):\n${text.substring(0, 500)}`);

    try {
      const json = JSON.parse(text);
      console.log(`Es JSON válido:`, typeof json);
      if (json.error) console.log(`ERROR: ${json.error}`);
      if (json.details) console.log(`DETAILS: ${json.details}`);
    } catch {
      console.log('NO ES JSON VÁLIDO');
    }
  } catch (error) {
    console.error(`Error de fetch: ${error.message}`);
  }
}

async function main() {
  await testEndpoint('http://localhost:3000/api/viajes/GET');
  await testEndpoint('http://localhost:3000/api/terceros');
  await testEndpoint('http://localhost:3000/api/productos');
}

main();
