// Script para probar el endpoint de terceros con código postal alfanumérico
// Esto verifica que la API esté funcionando correctamente

const testApiCodPostal = async () => {
  console.log('=== TEST DEL API DE TERCEROS CON CÓDIGO POSTAL ALFANUMÉRICO ===\n');

  const baseUrl = 'http://localhost:3000'; // Ajusta si tu servidor está en otro puerto

  // Datos de prueba con código postal alfanumérico
  const testData = {
    razonSocial: 'TEST EMPRESA CP ALFANUMÉRICO',
    cuit: '20123456789',
    telefono: '1234567890',
    email: 'test@test.com',
    tipoDoc: 'CUIT',
    localidad: 1,
    tipoTercero: 1,
    categoriaCliente: 1,
    domicilio: 'Calle Falsa 123',
    codigoPostal: 'S2000XYZ' // CÓDIGO POSTAL ALFANUMÉRICO
  };

  try {
    console.log('1️⃣  Enviando POST a /api/terceros');
    console.log('   Código postal a enviar:', testData.codigoPostal);
    console.log('   Tipo:', typeof testData.codigoPostal);
    console.log('');

    const response = await fetch(`${baseUrl}/api/terceros`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('   Response status:', response.status);
    console.log('   Response headers:', response.headers.get('content-type'));

    const responseText = await response.text();
    console.log('   Response (primeros 200 caracteres):', responseText.substring(0, 200));
    console.log('');

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ La respuesta NO es JSON válido');
      console.error('   Respuesta completa:', responseText.substring(0, 500));
      return;
    }

    console.log('2️⃣  Respuesta del servidor:');
    console.log('   Status:', response.status);
    console.log('   Body:', result);
    console.log('');

    if (result.success && result.id) {
      console.log(`✅ Tercero creado exitosamente con ID: ${result.id}`);
      console.log('');

      // Ahora verificar en la BD que se guardó correctamente
      console.log('3️⃣  Verificando en la base de datos...');

      const mysql = require('mysql2/promise');
      const db = await mysql.createConnection({
        host: 'remoto.retec.com.ar',
        user: 'danisa',
        password: 'danisa2025',
        database: 'lt',
        port: 3307
      });

      const [rows] = await db.query(`
        SELECT
          TER_IDTercero,
          TER_RazonSocialTer,
          TER_CodPostalTer,
          HEX(TER_CodPostalTer) as hex_value
        FROM sige_ter_tercero
        WHERE TER_IDTercero = ?
      `, [result.id]);

      if (rows.length > 0) {
        const saved = rows[0];
        console.log(`   ID: ${saved.TER_IDTercero}`);
        console.log(`   Razón Social: ${saved.TER_RazonSocialTer}`);
        console.log(`   Código Postal guardado: "${saved.TER_CodPostalTer}"`);
        console.log(`   HEX: ${saved.hex_value}`);
        console.log('');

        if (saved.TER_CodPostalTer === testData.codigoPostal) {
          console.log('✅ ¡PERFECTO! El código postal se guardó correctamente');
        } else {
          console.log('❌ ERROR: El código postal NO coincide');
          console.log(`   Esperado: "${testData.codigoPostal}"`);
          console.log(`   Guardado: "${saved.TER_CodPostalTer}"`);
        }

        // Limpiar
        console.log('');
        console.log('4️⃣  Limpiando registro de prueba...');
        await db.query('DELETE FROM sige_ter_tercero WHERE TER_IDTercero = ?', [result.id]);
        console.log(`   ✅ Registro eliminado (ID: ${result.id})`);
      }

      await db.end();
    } else {
      console.log('❌ Error al crear tercero:', result.error || result);
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('');
      console.error('⚠️  No se pudo conectar al servidor.');
      console.error('   Asegúrate de que el servidor esté corriendo con: yarn dev');
    }
  }

  console.log('');
  console.log('=== FIN DEL TEST ===');
};

testApiCodPostal();
