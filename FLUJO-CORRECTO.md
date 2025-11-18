# 🎯 Flujo Correcto de Eliminación de Viajes

## ✅ Reglas de Negocio

### ❌ NO se puede eliminar un viaje si:
1. Tiene **reservas activas** (`ENT_CantCuposReser > 0`)
2. Tiene **choferes postulados** (registros en `sige_icp_intcarpor`)

### ✅ SÍ se puede eliminar un viaje si:
1. NO tiene reservas
2. NO tiene choferes postulados
3. Puede tener autorizaciones huérfanas (cabeceras sin detalles) - se limpian automáticamente

---

## 🔄 Flujo de Eliminación

### Caso 1: Viaje SIN postulaciones
```
Usuario → Eliminar viaje
Sistema → ✅ Elimina viaje
        → ✅ Limpia autorizaciones huérfanas (si las hay)
```

### Caso 2: Viaje CON postulaciones
```
Usuario → Eliminar viaje
Sistema → ❌ Error: "No se puede eliminar: el viaje tiene choferes postulados.
                     Elimine las postulaciones primero."
```

Usuario debe:
1. Ir al modal de choferes
2. Eliminar cada postulación manualmente
3. Luego puede eliminar el viaje

### Caso 3: Viaje CON reservas
```
Usuario → Eliminar viaje
Sistema → ❌ Error: "No se puede eliminar: el viaje tiene reservas activas"
```

---

## 📝 Plan de Testing Correcto

### Test 1: Viaje CON choferes (debe fallar)

**Viaje a usar:** 709

**Estado actual:**
- Tiene 3 choferes postulados
- NO tiene reservas

**Pasos:**
1. Intentar eliminar el viaje 709
2. **Resultado esperado:** ❌ Error "tiene choferes postulados"
3. Ir al modal de choferes
4. Eliminar los 3 choferes uno por uno
5. Intentar eliminar el viaje de nuevo
6. **Resultado esperado:** ✅ Se elimina correctamente

---

### Test 2: Viaje SIN choferes (debe funcionar)

**Buscar un viaje sin postulaciones:**
```bash
node test-eliminacion-viajes.js
```

Buscar uno que tenga:
- 🟢 SIN RESERVAS
- Autorizaciones: 0 o autorizaciones huérfanas (sin detalles)

**Pasos:**
1. Eliminar el viaje directamente
2. **Resultado esperado:** ✅ Se elimina correctamente
3. Verificar que no quedan registros huérfanos

---

## 🧪 Scripts de Testing Actualizados

Los scripts existentes siguen siendo válidos, pero ahora sabemos que:

- **Viaje 709:** NO se puede eliminar directamente (tiene choferes)
- **Necesitamos:** Buscar un viaje SIN choferes para el Test 2

---

## 💡 Próximos Pasos

1. **Test del flujo correcto con viaje 709:**
   - Intentar eliminar (debe fallar)
   - Eliminar choferes
   - Eliminar viaje (debe funcionar)

2. **Buscar otro viaje para testing:**
   - Sin choferes
   - Sin reservas
   - Probar eliminación directa
