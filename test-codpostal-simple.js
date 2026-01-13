// Test simple del endpoint de códigos postales (sin autenticación)

const testCodPostal = async () => {
  console.log("=== TEST DE CÓDIGOS POSTALES ALFANUMÉRICOS ===\n");

  const baseUrl = "http://localhost:3000";

  try {
    // 1. Ver información actual
    console.log("1️⃣  Obteniendo información de la BD...");
    const infoResponse = await fetch(`${baseUrl}/api/testing/codpostal`);
    const info = await infoResponse.json();

    console.log("   Charset actual:", info.charset.collation);
    console.log("   Tipo de campo:", info.charset.type);
    console.log("   Ejemplos de códigos postales guardados:");
    info.samples.slice(0, 5).forEach((s) => {
      console.log(`     - "${s.codigoPostal}" (${s.bytes} bytes)`);
    });
    console.log("");

    // 2. Probar inserción
    console.log("2️⃣  Probando inserción de código postal alfanumérico...");
    const testResponse = await fetch(`${baseUrl}/api/testing/codpostal`, {
      method: "POST",
    });

    const testResult = await testResponse.json();

    console.log("   Resultado:", testResult.message);
    console.log("   Detalles:");
    console.log(`     - Enviado: "${testResult.test.enviado}"`);
    console.log(`     - Guardado: "${testResult.test.guardado}"`);
    console.log(`     - Bytes: ${testResult.test.bytes}`);
    console.log(`     - Coincide: ${testResult.test.coincide ? "✅ SÍ" : "❌ NO"}`);
    console.log("");

    if (testResult.success) {
      console.log("✅ ¡TODO FUNCIONA CORRECTAMENTE!");
      console.log("   Los códigos postales alfanuméricos se guardan bien.");
      console.log("");
      console.log("   Si los usuarios reportan problemas:");
      console.log("   1. Verifica que el servidor de producción esté actualizado");
      console.log("   2. Verifica que esté corriendo la última versión del código");
      console.log("   3. Reinicia el servidor de producción");
    } else {
      console.log("❌ HAY UN PROBLEMA");
      console.log("   Los códigos postales NO se están guardando correctamente");
    }
  } catch (error) {
    console.error("❌ ERROR:", error.message);
    if (error.code === "ECONNREFUSED") {
      console.error("");
      console.error("⚠️  No se pudo conectar al servidor.");
      console.error("   Inicia el servidor con: yarn dev");
    }
  }

  console.log("");
  console.log("=== FIN DEL TEST ===");
};

testCodPostal();
