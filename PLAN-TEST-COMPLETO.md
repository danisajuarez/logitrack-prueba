# 🧪 PLAN DE TEST COMPLETO - Base de Datos

## 📊 Estado Inicial

**Totales actuales:**
- Viajes: 679
- Autorizaciones: 1655
- Detalles: 4878

---

## 🎯 TEST 1: CREAR VIAJE NUEVO

### Paso 1.1: Crear el viaje desde la web

1. Abre: `http://localhost:3000/viajes`
2. Clic en **"Nuevo Viaje"**
3. Completa:
   - **Cliente:** Cualquier tercero
   - **Origen:** Cualquier localidad
   - **Destino:** Cualquier localidad
   - **Artículo:** Cualquier producto
   - **Cupos:** 10
   - **Tarifa:** 5000
4. Guarda
5. **ANOTA EL NÚMERO DE VIAJE** (ej: 000711)

### Paso 1.2: Verificar en la BD

Ejecuta:
```bash
node verificar-viaje.js <NUMERO>
```

**Qué verificar:**
- ✅ El viaje existe en la BD
- ✅ Cliente está correcto
- ✅ Origen/Destino correctos
- ✅ Artículo correcto
- ✅ Cupos = 10
- ✅ Tarifa = 5000
- ✅ Fecha de hoy
- ✅ Usuario que creó el viaje

---

## 🎯 TEST 2: AGREGAR CHOFERES/POSTULACIONES

### Paso 2.1: Agregar choferes desde la web

1. Busca tu viaje en la lista
2. Clic en botón verde **"Choferes"**
3. Agrega **3 choferes** diferentes
4. Guarda cada uno

### Paso 2.2: Verificar en la BD

Ejecuta:
```bash
node verificar-viaje.js <NUMERO>
```

**Qué verificar:**
- ✅ Muestra "AUTORIZACIONES: 1" (o más)
- ✅ Muestra "Detalles (choferes): 3"
- ✅ Lista los 3 choferes con nombres
- ✅ Cada chofer tiene CUIT
- ✅ La autorización tiene ECP_IdEcp

---

## 🎯 TEST 3: EDITAR VIAJE

### Paso 3.1: Editar desde la web

1. Busca tu viaje
2. Clic en **"Editar"** (botón azul)
3. Cambia:
   - **Cupos:** 15 (era 10)
   - **Tarifa:** 7000 (era 5000)
4. Guarda

### Paso 3.2: Verificar en la BD

Ejecuta:
```bash
node verificar-viaje.js <NUMERO>
```

**Qué verificar:**
- ✅ Cupos totales: 15 ✅
- ✅ Tarifa: 7000 ✅
- ✅ Los choferes siguen ahí (3 choferes)

---

## 🎯 TEST 4: INTENTAR ELIMINAR CON CHOFERES (debe fallar)

### Paso 4.1: Intentar eliminar

1. Busca tu viaje
2. Clic en **"Editar"**
3. Clic en **"Eliminar"**

**Resultado esperado:**
```
❌ Error: "No se puede eliminar: el viaje tiene choferes postulados.
         Elimine las postulaciones primero."
```

✅ **Si muestra este error, el test es EXITOSO**

---

## 🎯 TEST 5: ELIMINAR CHOFERES

### Paso 5.1: Eliminar desde la web

1. Abre el modal de choferes de tu viaje
2. Elimina **TODOS** los choferes uno por uno
3. Cierra el modal

### Paso 5.2: Verificar en la BD

Ejecuta:
```bash
node verificar-viaje.js <NUMERO>
```

**Qué verificar:**
- ✅ Viaje aún existe
- ✅ AUTORIZACIONES: 1 (cabecera huérfana)
- ✅ Detalles (choferes): 0

---

## 🎯 TEST 6: ELIMINAR VIAJE (ahora debe funcionar)

### Paso 6.1: Eliminar desde la web

1. Busca tu viaje
2. Clic en **"Editar"**
3. Clic en **"Eliminar"**

**Resultado esperado:**
```
✅ "Viaje eliminado correctamente"
```

### Paso 6.2: Verificar en la BD

Ejecuta:
```bash
node verificar-viaje.js <NUMERO>
```

**Resultado esperado:**
```
❌ El viaje NO EXISTE en la base de datos
```

---

## 🎯 TEST 7: VERIFICAR INTEGRIDAD FINAL

Ejecuta:
```bash
node test-eliminacion-viajes.js
```

**Qué verificar:**
- ✅ Total viajes: 679 (igual que al inicio)
- ✅ Total autorizaciones: 1655 (igual que al inicio)
- ✅ Total detalles: 4878 (igual que al inicio)
- ✅ Autorizaciones huérfanas: 0

---

## ✅ CHECKLIST FINAL

| Test | Descripción | Estado |
|------|-------------|--------|
| 1 | Crear viaje | ⬜ |
| 2 | Agregar choferes | ⬜ |
| 3 | Editar viaje | ⬜ |
| 4 | Intentar eliminar con choferes (debe fallar) | ⬜ |
| 5 | Eliminar choferes | ⬜ |
| 6 | Eliminar viaje | ⬜ |
| 7 | Verificar integridad final | ⬜ |

---

## 📝 Registro de tu Test

**Número de viaje creado:** _____________

**Test 1 - Crear viaje:**
- [ ] Viaje encontrado en BD
- [ ] Datos correctos

**Test 2 - Agregar choferes:**
- [ ] 3 choferes agregados
- [ ] Visible en BD

**Test 3 - Editar viaje:**
- [ ] Cupos cambiados a 15
- [ ] Tarifa cambiada a 7000

**Test 4 - Intentar eliminar:**
- [ ] Error de choferes postulados

**Test 5 - Eliminar choferes:**
- [ ] Todos eliminados
- [ ] Cabecera huérfana detectada

**Test 6 - Eliminar viaje:**
- [ ] Viaje eliminado
- [ ] No existe en BD

**Test 7 - Integridad:**
- [ ] Totales iguales al inicio
- [ ] Sin huérfanas

---

**¿Listo para empezar?**

Sigue los pasos en orden y ve marcando cada checkbox ✅
