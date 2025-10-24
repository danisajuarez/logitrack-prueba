# Implementación de Envío de Email con PDF para Negocios

Este documento consolida todas las instrucciones para implementar el envío automático de emails con PDF cuando se crea una autorización de carga (negocio).

## 📋 Resumen de Cambios

Según los requisitos, cuando se crea un negocio el sistema debe:

1. ✅ Generar registros en `sige_ent_encnegtra` y `sige_dnt_detnegtra`
2. ✅ Agregar campo `ENT_FechaVencimiento` (igual a la fecha del negocio)
3. ✅ Validar que no se eliminen postulaciones con órdenes de carga
4. ✅ Generar un resumen en HTML con los datos del negocio
5. ✅ Enviar el email a logística, administración y transportista (si tiene email)
6. ✅ Adjuntar el PDF generado desde el HTML

## 🚀 Pasos de Implementación

### 1. Instalar Dependencias

```bash
npm install resend puppeteer
```

O con yarn:

```bash
yarn add resend puppeteer
```

**Nota**: Puppeteer descargará Chromium automáticamente (~170MB).

---

### 2. Configurar Variables de Entorno

Crear o actualizar el archivo `.env` en la raíz del proyecto:

```env
# Database Configuration
DB_HOST=190.188.150.107
DB_PORT=3307
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_NAME=lt

# Resend Email Service
# Obtener API Key desde: https://resend.com/api-keys
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx

# Email Configuration
# Email "from" debe ser un dominio verificado en Resend
EMAIL_FROM=notificaciones@tudominio.com

# Emails destino para notificaciones de negocios
EMAIL_LOGISTICA=logistica@tuempresa.com
EMAIL_ADMINISTRACION=administracion@tuempresa.com

# Environment
NODE_ENV=development
```

**Pasos para obtener RESEND_API_KEY:**

1. Ir a [https://resend.com](https://resend.com)
2. Crear una cuenta o iniciar sesión
3. Ir a "API Keys" en el dashboard
4. Crear una nueva API key
5. Copiar la key y pegarla en `.env`

**Verificar dominio en Resend:**

1. Ir a "Domains" en el dashboard de Resend
2. Agregar tu dominio
3. Configurar los registros DNS según las instrucciones
4. Esperar a que se verifique el dominio
5. Usar un email de ese dominio en `EMAIL_FROM`

---

### 3. Aplicar Migraciones SQL

Ejecutar los siguientes scripts en tu base de datos MySQL en este orden:

```bash
# 1. Agregar campo ENT_FechaVencimiento
mysql -h 190.188.150.107 -P 3307 -u tu_usuario -p lt < migrations/001_add_ent_fechavencimiento.sql

# 2. Agregar campo TER_Mayorista
mysql -h 190.188.150.107 -P 3307 -u tu_usuario -p lt < migrations/002_add_ter_mayorista.sql

# 3. Crear tabla sige_dnt_detnegtra (si no existe)
mysql -h 190.188.150.107 -P 3307 -u tu_usuario -p lt < migrations/003_create_sige_dnt_detnegtra.sql
```

O ejecutar manualmente en tu cliente MySQL preferido.

---

### 4. Aplicar Cambios en el Código

**IMPORTANTE**: Antes de aplicar los cambios, **detener el servidor de desarrollo** si está corriendo:

```bash
# Detener con Ctrl+C si está corriendo, o:
taskkill /F /IM node.exe  # En Windows
```

#### 4.1. Modificar `src/app/api/viajes/POST/route.ts`

Seguir las instrucciones en el archivo: **`CAMBIOS_PENDIENTES.md`**

**Cambios principales:**
- Agregar campo `ENT_FechaVencimiento` al INSERT de `sige_ent_encnegtra`
- Agregar inserción en tabla `sige_dnt_detnegtra` después de crear el negocio

#### 4.2. Modificar `src/app/api/viajes/postular-chofer/route.ts`

Seguir las instrucciones en el archivo: **`CAMBIOS_VALIDACION_POSTULACION.md`**

**Cambios principales:**
- Agregar validación en método DELETE para verificar que la postulación no tenga órdenes de carga
- Si tiene órdenes de carga, retornar error 409

#### 4.3. Modificar `src/app/api/viajes/autorizaciones/route.ts`

Seguir las instrucciones en el archivo: **`CAMBIOS_AUTORIZACIONES.md`**

**Cambios principales:**
- Importar servicios de email y PDF
- Obtener datos completos del negocio después de crear las autorizaciones
- Generar PDF con los datos del negocio
- Enviar email con PDF adjunto a logística, administración y transportista

---

### 5. Archivos Nuevos Creados

Los siguientes archivos ya están creados y listos para usar:

- ✅ `src/lib/email.ts` - Servicio de envío de emails con Resend
- ✅ `src/lib/pdf.ts` - Servicio de generación de PDF con Puppeteer
- ✅ `.env.example` - Plantilla de variables de entorno
- ✅ Migraciones SQL en carpeta `migrations/`

---

### 6. Verificar Implementación

Después de aplicar todos los cambios:

1. **Iniciar servidor de desarrollo:**
   ```bash
   npm run dev
   # o
   yarn dev
   ```

2. **Probar el flujo completo:**

   a) Crear un nuevo viaje
   b) Postular un chofer al viaje
   c) Crear una autorización de carga
   d) Verificar que se envíe el email

3. **Revisar logs:**
   ```
   [DEBUG] Insertando detalle del negocio en sige_dnt_detnegtra...
   [EMAIL] Iniciando generación de PDF y envío de email...
   [PDF] PDF generado exitosamente, tamaño: XXXXX bytes
   [EMAIL] Email enviado exitosamente: msg_xxxxxxxxxxxxx
   ```

4. **Verificar en la base de datos:**
   ```sql
   -- Verificar campo ENT_FechaVencimiento
   SELECT ENT_IdEnt, ENT_Numero, ENT_Fecha, ENT_FechaVencimiento
   FROM sige_ent_encnegtra
   ORDER BY ENT_IdEnt DESC
   LIMIT 5;

   -- Verificar tabla sige_dnt_detnegtra
   SELECT *
   FROM sige_dnt_detnegtra
   ORDER BY DNT_IdDnt DESC
   LIMIT 5;

   -- Verificar campo TER_Mayorista
   SELECT TER_IDTercero, TER_RazonSocialTer, TER_Mayorista
   FROM sige_ter_tercero
   LIMIT 5;
   ```

---

## 📧 Estructura del Email

El email enviado incluye:

### Encabezado
- Título: "Nuevo Negocio Registrado"
- Número de negocio

### Secciones del Email
1. **Fechas**: Fecha y Fecha de Vencimiento
2. **Proveedor**: Razón Social y CUIT
3. **Ubicaciones**: Procedencia y Destino
4. **Transporte**: Intermediario, Transportista, Chofer (con CUITs)
5. **Vehículos**: Patente Camión y Acoplado
6. **Artículo**: Descripción y Cupos
7. **Tarifa**: Monto en ARS
8. **Vendedor**: Nombre del vendedor

### Destinatarios
- Logística (desde `EMAIL_LOGISTICA`)
- Administración (desde `EMAIL_ADMINISTRACION`)
- Transportista (si tiene email en `TER_EMailTer`)

### Adjunto
- PDF generado con el mismo contenido del email

---

## 🔧 Troubleshooting

### Error: "RESEND_API_KEY no está configurada"
- Verificar que el archivo `.env` existe en la raíz del proyecto
- Verificar que `RESEND_API_KEY` está definida con el valor correcto
- Reiniciar el servidor de desarrollo

### Error: "Email "from" debe ser un dominio verificado"
- Verificar que el dominio en `EMAIL_FROM` está verificado en Resend
- Ir al dashboard de Resend > Domains
- Completar la verificación DNS

### Error al generar PDF: "Failed to launch browser"
- Puppeteer requiere Chromium
- Ejecutar `npm install puppeteer` nuevamente
- En algunos sistemas puede requerir dependencias adicionales

### No se envía el email pero la autorización se guarda
- **Esto es esperado**: El email es un proceso secundario
- Revisar los logs del servidor para ver el error específico
- Verificar configuración de Resend
- El sistema continúa funcionando aunque falle el email

### Error al aplicar migraciones SQL
- Verificar que tienes permisos de ALTER TABLE
- Verificar que la tabla `sige_ent_encnegtra` existe
- Ejecutar cada migración individualmente para identificar el problema

---

## 📝 Notas Importantes

1. **Campo TER_Mayorista**:
   - Valores permitidos: 'S' (Sí) o 'N' (No)
   - Se puede usar para filtrar terceros mayoristas en el futuro

2. **Tabla sige_dnt_detnegtra**:
   - Se crea automáticamente con la migración
   - Tiene relación FK con `sige_ent_encnegtra`
   - El renglón siempre es 1 según requisitos

3. **Validación de eliminación**:
   - No se pueden eliminar postulaciones que tengan órdenes de carga
   - Error 409 si se intenta eliminar

4. **Costos de Resend**:
   - Plan gratuito: 3,000 emails/mes
   - Suficiente para testing y producción inicial
   - [Ver precios](https://resend.com/pricing)

5. **Tamaño del PDF**:
   - Típicamente 20-50 KB
   - Sin límite de tamaño en Resend (hasta 40MB)

---

## 📚 Archivos de Referencia

- `INSTRUCCIONES_INSTALACION.md` - Instrucciones detalladas de instalación
- `CAMBIOS_PENDIENTES.md` - Cambios en POST /viajes
- `CAMBIOS_VALIDACION_POSTULACION.md` - Cambios en eliminación de postulaciones
- `CAMBIOS_AUTORIZACIONES.md` - Cambios en autorizaciones (envío de email)
- `.env.example` - Plantilla de variables de entorno

---

## ✅ Checklist de Implementación

- [ ] Dependencias instaladas (resend, puppeteer)
- [ ] Variables de entorno configuradas (.env)
- [ ] Dominio verificado en Resend
- [ ] Migración 001 ejecutada (ENT_FechaVencimiento)
- [ ] Migración 002 ejecutada (TER_Mayorista)
- [ ] Migración 003 ejecutada (sige_dnt_detnegtra)
- [ ] Cambios aplicados en POST /viajes
- [ ] Cambios aplicados en DELETE postular-chofer
- [ ] Cambios aplicados en POST autorizaciones
- [ ] Servidor reiniciado
- [ ] Prueba de creación de viaje
- [ ] Prueba de postulación de chofer
- [ ] Prueba de autorización (email enviado)
- [ ] Verificación de datos en base de datos
- [ ] Email recibido correctamente
- [ ] PDF adjunto correcto

---

## 🤝 Soporte

Si encuentras algún problema durante la implementación:

1. Revisar los logs del servidor
2. Verificar que todas las migraciones se ejecutaron correctamente
3. Verificar configuración de Resend
4. Revisar este documento y los archivos de referencia

---

**Fecha de creación**: 2025-01-24
**Versión del proyecto**: Next.js 15.4.2
**Documentación de Resend**: https://resend.com/docs
**Documentación de Puppeteer**: https://pptr.dev
