# 📚 Guía de Testing - Eliminación de Viajes

Esta guía te ayudará a verificar que el sistema de eliminación de viajes funciona correctamente.

---

## 🚀 Scripts Disponibles

### 1️⃣ `verificar-viaje.js` - Verificar estado de un viaje

**Uso:**
```bash
node verificar-viaje.js <ID_VIAJE>
```

**Ejemplo:**
```bash
node verificar-viaje.js 709
```

**Qué hace:**
- Muestra información completa del viaje
- Lista todas las autorizaciones asociadas
- Muestra todos los detalles (choferes/terceros)
- Indica si el viaje se puede eliminar
- Te da instrucciones de cómo proceder

**Cuándo usarlo:**
- ANTES de eliminar un viaje (para ver qué se va a eliminar)
- DESPUÉS de eliminar (para confirmar que se eliminó todo)

---

### 2️⃣ `test-eliminacion-viajes.js` - Análisis general de la BD

**Uso:**
```bash
node test-eliminacion-viajes.js
```

**Qué hace:**
- Muestra estadísticas generales de la base de datos
- Lista los últimos 10 viajes
- Identifica viajes candidatos para pruebas
- Detecta autorizaciones huérfanas
- Sugiere viajes para testear

**Cuándo usarlo:**
- Para obtener una visión general del estado de la BD
- Para encontrar viajes de prueba
- Para verificar que no hay autorizaciones huérfanas

---

### 3️⃣ `investigar-autorizaciones.js` - Análisis de autorizaciones

**Uso:**
```bash
node investigar-autorizaciones.js
```

**Qué hace:**
- Muestra estructura de las tablas de autorizaciones
- Detecta cabeceras huérfanas (sin detalles)
- Genera estadísticas de la base de datos

**Cuándo usarlo:**
- Para debugging avanzado
- Para detectar problemas de integridad
- Para verificación periódica de la BD

---

### 4️⃣ `limpiar-huerfanas.js` - Limpiar autorizaciones huérfanas

**Uso:**
```bash
node limpiar-huerfanas.js
```

**Qué hace:**
- Busca todas las cabeceras de autorizaciones sin detalles
- Lista las que va a eliminar
- Las elimina de forma segura
- Reporta resultados

**Cuándo usarlo:**
- Si se detectan autorizaciones huérfanas
- Como parte del mantenimiento periódico
- SOLO si encuentras problemas de integridad

---

## 🧪 Plan de Testing Paso a Paso

### Opción A: Testing con Viaje Existente (Recomendado)

#### Paso 1: Identificar un viaje de prueba
```bash
node test-eliminacion-viajes.js
```

Busca en la salida un viaje que:
- Tenga autorizaciones
- NO tenga reservas (🟢 SIN RESERVAS)
- Ejemplo: Viaje ID 709

#### Paso 2: Verificar estado ANTES de eliminar
```bash
node verificar-viaje.js 709
```

**Anota los datos que muestra:**
- Cantidad de autorizaciones
- Cantidad de detalles
- IDs de las autorizaciones

#### Paso 3: Eliminar desde la interfaz web

1. Abre el navegador en `http://localhost:3000/viajes`
2. Busca el viaje (ID 709 en nuestro ejemplo)
3. Haz clic en el botón **Editar** (azul)
4. En el modal, haz clic en **Eliminar**
5. Confirma la eliminación

#### Paso 4: Verificar estado DESPUÉS de eliminar
```bash
node verificar-viaje.js 709
```

**Resultado esperado:**
```
❌ El viaje NO EXISTE en la base de datos

✅ Posibles razones:
  • Ya fue eliminado correctamente
```

#### Paso 5: Verificar integridad general
```bash
node test-eliminacion-viajes.js
```

**Verifica que:**
- Total de viajes disminuyó en 1
- Total de autorizaciones disminuyó según lo esperado
- Autorizaciones huérfanas = 0 ✅

---

### Opción B: Testing con Viaje Nuevo

#### Paso 1: Crear nuevo viaje

1. Abre `http://localhost:3000/viajes`
2. Haz clic en **Nuevo Viaje**
3. Completa los datos:
   - Cliente: Cualquiera
   - Origen: Cualquiera
   - Destino: Cualquiera
   - Artículo: Cualquiera
   - Cupos: 10
   - Tarifa: 1000
4. Guarda el viaje
5. **Anota el ID del viaje creado**

#### Paso 2: Agregar postulaciones/choferes

1. En la lista de viajes, busca el viaje recién creado
2. Haz clic en el botón **Choferes** (verde)
3. Agrega 2-3 choferes/postulaciones
4. Guarda

#### Paso 3: Verificar estado del viaje
```bash
node verificar-viaje.js <ID_VIAJE_NUEVO>
```

Deberías ver:
- El viaje
- Las autorizaciones
- Los choferes que agregaste

#### Paso 4: Eliminar el viaje

1. Haz clic en **Editar**
2. Haz clic en **Eliminar**
3. Confirma

#### Paso 5: Verificar que se eliminó todo
```bash
node verificar-viaje.js <ID_VIAJE_NUEVO>
```

Deberías ver:
```
❌ El viaje NO EXISTE en la base de datos
```

---

## ✅ Lista de Verificación

Usa esta checklist para asegurarte que todo funciona:

### Antes de la Eliminación
- [ ] El viaje existe en la BD
- [ ] Las autorizaciones están registradas
- [ ] Los detalles de las autorizaciones existen
- [ ] El viaje NO tiene reservas

### Durante la Eliminación
- [ ] El sistema muestra confirmación
- [ ] El proceso completa sin errores
- [ ] La página se recarga automáticamente
- [ ] El viaje desaparece de la lista

### Después de la Eliminación
- [ ] El viaje NO existe en `sige_ent_encnegtra`
- [ ] Las autorizaciones NO existen en `sige_ecp_enccarpor`
- [ ] Los detalles NO existen en `sige_icp_intcarpor`
- [ ] No hay autorizaciones huérfanas
- [ ] No hay detalles huérfanos

---

## 🔍 Solución de Problemas

### Problema: El viaje no se elimina

**Posibles causas:**
1. Tiene reservas activas
2. Error en la API
3. Problema de permisos

**Solución:**
```bash
# Verificar el viaje
node verificar-viaje.js <ID_VIAJE>

# Si tiene reservas, elimínalas primero
# Si no tiene reservas, revisa los logs del servidor
```

---

### Problema: Se eliminó el viaje pero quedan autorizaciones

**Posibles causas:**
1. La función DELETE no se actualizó correctamente
2. Error durante la eliminación

**Solución:**
```bash
# Verificar autorizaciones huérfanas
node investigar-autorizaciones.js

# Si hay huérfanas, limpiarlas
node limpiar-huerfanas.js
```

---

### Problema: El viaje todavía aparece en la interfaz

**Posibles causas:**
1. Caché del navegador
2. La página no se recargó

**Solución:**
1. Presiona F5 o Ctrl+R para recargar
2. Presiona Ctrl+Shift+R para recarga forzada
3. Cierra y abre el navegador

---

## 📊 Comandos Útiles para Debugging

### Ver últimos viajes creados
```bash
node test-eliminacion-viajes.js
```

### Ver detalles de un viaje específico
```bash
node verificar-viaje.js <ID>
```

### Buscar autorizaciones huérfanas
```bash
node investigar-autorizaciones.js
```

### Limpiar autorizaciones huérfanas
```bash
node limpiar-huerfanas.js
```

---

## 🎯 Casos de Prueba Recomendados

### Caso 1: Viaje sin autorizaciones ✅
- **Crear:** Viaje sin agregar choferes
- **Eliminar:** Debería eliminarse sin problemas
- **Verificar:** No debe quedar nada

### Caso 2: Viaje con 1 autorización y 1 detalle ✅
- **Crear:** Viaje con 1 chofer
- **Eliminar:** Debería eliminar viaje + 1 autorización + 1 detalle
- **Verificar:** Todo eliminado correctamente

### Caso 3: Viaje con múltiples autorizaciones ✅
- **Crear:** Viaje con 3-5 choferes
- **Eliminar:** Debería eliminar todo en cascada
- **Verificar:** 0 registros huérfanos

### Caso 4: Viaje con reservas ⚠️
- **Crear:** Viaje con reservas activas
- **Intentar eliminar:** Debería FALLAR con mensaje claro
- **Verificar:** El viaje NO se elimina

---

## 📝 Registro de Pruebas

Usa esta tabla para documentar tus pruebas:

| Fecha | Viaje ID | Autorizaciones | Detalles | Resultado | Notas |
|-------|----------|----------------|----------|-----------|-------|
| 2025-11-18 | 710 | 1 | 1 | ✅ EXITOSO | Test inicial |
| | | | | | |
| | | | | | |

---

## 🆘 Soporte

Si encuentras algún problema:

1. **Ejecuta el diagnóstico completo:**
   ```bash
   node test-eliminacion-viajes.js > diagnostico.txt
   node investigar-autorizaciones.js >> diagnostico.txt
   ```

2. **Revisa el archivo `TESTING-RESULTS.md`** para comparar con resultados anteriores

3. **Verifica los logs del servidor** (en la consola donde ejecutas `yarn dev`)

---

**Última actualización:** 2025-11-18
**Versión:** 1.0
**Estado:** ✅ Todos los tests pasaron
