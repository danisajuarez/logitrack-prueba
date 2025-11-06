# 🧪 Guía de Prueba Manual - Email con PDF

## Flujo Completo de Prueba

### Paso 1: Crear un Viaje
1. Ir a http://localhost:3000/viajes
2. Hacer clic en "Nuevo Viaje" o "Agregar"
3. Completar el formulario:
   - **Proveedor**: "TEST PROVEEDOR SA"
   - **Origen**: "Rosario"
   - **Destino**: "Buenos Aires"
   - **Artículo**: "Soja"
   - **Cupos**: 10
   - **Tarifa**: 50000
   - **Vendedor**: Seleccionar cualquiera
4. Guardar
5. **Anotar el número de viaje** que se creó

### Paso 2: Postular un Chofer
1. En la lista de viajes, buscar el viaje recién creado
2. Hacer clic en "Postular Chofer" o similar
3. Seleccionar:
   - **Chofer**: Cualquier chofer disponible
   - **Vendedor**: Cualquier vendedor
4. Guardar

### Paso 3: Crear Autorización (🎯 AQUÍ SE ENVÍA EL EMAIL)
1. En el viaje con el chofer postulado, hacer clic en "Autorizaciones" o "Crear Autorización"
2. Completar:
   - **Chofer**: El que postulaste
   - **Estación de Servicio**: Seleccionar una
   - **Adelantos**: Por ejemplo, $10000
   - **Combustible**: Por ejemplo, 100 litros
3. **Guardar**

### 🎉 Resultado Esperado

**En la consola del servidor deberías ver:**

```
[DEBUG API] Haciendo commit de la transacción...
[DEBUG API] Commit exitoso
[EMAIL] Iniciando generación de PDF y envío de email...
[PDF] Iniciando generación de PDF para negocio: 000123
[PDF] Navegador lanzado exitosamente
[PDF] Contenido HTML cargado
[PDF] PDF generado exitosamente, tamaño: 45678 bytes
[PDF] Navegador cerrado
[EMAIL] Email enviado exitosamente: msg_xxxxxxxxxxxxx
```

**En tu email (el que pusiste en EMAIL_LOGISTICA):**
- Deberías recibir un email con asunto: "Nuevo Negocio Registrado - N° 000XXX"
- Con un PDF adjunto
- Con todos los datos del negocio

## 🧪 Prueba Rápida sin Frontend

Si quieres probar directamente la API:

### Usando cURL o Postman

```bash
# 1. Crear viaje
curl -X POST http://localhost:3000/api/viajes/POST \
  -H "Content-Type: application/json" \
  -d '{
    "razonSocial": "TEST SA",
    "origen": "Rosario",
    "destino": "Buenos Aires",
    "articulo": "Soja",
    "cupos": 10,
    "tarifa": 50000,
    "vendedor": 1
  }'

# Anotar el "entIdEnt" de la respuesta

# 2. Postular chofer
curl -X POST http://localhost:3000/api/viajes/postular-chofer \
  -H "Content-Type: application/json" \
  -d '{
    "viajeId": [EL_ID_DEL_VIAJE],
    "choferId": 1,
    "vendedorId": 1,
    "sendEmail": false
  }'

# 3. Crear autorización (AQUÍ SE ENVÍA EL EMAIL)
curl -X POST http://localhost:3000/api/viajes/autorizaciones \
  -H "Content-Type: application/json" \
  -d '{
    "viajeId": [EL_ID_DEL_VIAJE],
    "choferId": 1,
    "estacionId": 15,
    "adelantos": [{"importe": 10000}],
    "combustibles": [{"litros": 100}]
  }'
```

## 🔍 Verificación en Base de Datos

Después de crear el viaje, verificar:

```sql
-- Ver el viaje creado con fecha de vencimiento
SELECT
  ENT_IdEnt,
  ENT_Numero,
  ENT_Fecha,
  ENT_FechaVencimiento,
  TER_RazonSocialTer
FROM sige_ent_encnegtra
ORDER BY ENT_IdEnt DESC
LIMIT 1;

-- Ver el detalle del negocio (nueva tabla)
SELECT *
FROM sige_dnt_detnegtra
ORDER BY DNT_IdDnt DESC
LIMIT 1;

-- Ver la autorización creada
SELECT *
FROM SIGE_OCP_OrdCarPor
ORDER BY ECP_IdEcp DESC, OCP_Renglon DESC
LIMIT 5;
```

## ⚠️ Solución de Problemas

### Error: "RESEND_API_KEY no está configurada"
- Verificar que el archivo `.env` existe
- Reiniciar el servidor: `npm run dev`

### Error: "Email "from" debe ser un dominio verificado"
- Si estás testeando, usar: `EMAIL_FROM=onboarding@resend.dev`
- Este dominio ya está verificado por Resend para testing

### No recibo el email
1. Verificar la bandeja de SPAM
2. Verificar que pusiste tu email en `.env`
3. Revisar los logs del servidor
4. Verificar la API key de Resend en el dashboard

### Error al generar PDF
- Puppeteer está instalando Chromium en background
- Esperar a que termine: `npm install puppeteer`
- En Windows puede tardar 2-3 minutos

### El viaje se crea pero no se envía email
- **Esto es normal**: El email se envía al crear la AUTORIZACIÓN, no al crear el viaje
- Debes completar los 3 pasos: Viaje → Postular Chofer → Crear Autorización

## 📊 Verificar que Todo Funciona

Checklist:
- [ ] Viaje creado con ENT_FechaVencimiento
- [ ] Registro en sige_dnt_detnegtra creado
- [ ] Chofer postulado exitosamente
- [ ] Autorización creada
- [ ] Logs muestran "[EMAIL] Email enviado exitosamente"
- [ ] Email recibido en tu casilla
- [ ] PDF adjunto se puede abrir
- [ ] PDF contiene todos los datos correctos

## 🎯 Prueba Más Rápida (Solo Email)

Si solo quieres probar el servicio de email sin crear viajes:

Crear archivo: `src/app/api/test-email/route.ts`

```typescript
import { NextResponse } from "next/server";
import { sendNegocioEmail } from "@/lib/email";
import { generateNegocioPDF } from "@/lib/pdf";

export async function GET() {
  const testData = {
    numeroNegocio: "TEST-001",
    fecha: new Date().toISOString(),
    fechaVencimiento: new Date().toISOString(),
    proveedor: "TEST PROVEEDOR SA",
    procedencia: "Rosario",
    destino: "Buenos Aires",
    articulo: "Soja",
    tarifa: 50000,
    cupos: 10,
    vendedor: "Juan Pérez",
  };

  try {
    const pdf = await generateNegocioPDF(testData);
    const result = await sendNegocioEmail(testData, pdf);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

Luego visitar: http://localhost:3000/api/test-email

Deberías recibir el email en segundos.
