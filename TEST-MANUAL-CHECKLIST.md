# Checklist de Testing Manual - Sistema de Viajes

## INSTRUCCIONES PARA EL CLIENTE
Por favor, probá TODAS estas funcionalidades y anotá CADA error que encuentres.
NO pares al primer error - seguí probando todo y mandame la lista completa.

---

## 1. GESTIÓN DE VIAJES

### Crear Viaje
- [ ] Crear viaje con todos los campos completos
- [ ] Crear viaje sin vendedor (opcional)
- [ ] Validación: Cupos <= 0 debe dar error
- [ ] Validación: Tarifa negativa debe dar error
- [ ] Validación: Reservados > Cupos debe dar error
- [ ] El número de viaje se genera automáticamente
- [ ] Los pendientes se calculan automáticamente (Cupos - Reservados)

### Editar Viaje
- [ ] Editar viaje existente - cambiar cliente
- [ ] Editar viaje existente - cambiar origen/destino
- [ ] Editar viaje existente - cambiar artículo/producto ⚠️ (bug corregido)
- [ ] Editar viaje existente - cambiar cupos
- [ ] Editar viaje existente - cambiar reservados
- [ ] Editar viaje existente - cambiar tarifa
- [ ] Editar viaje existente - cambiar vendedor
- [ ] Validaciones funcionan igual que en crear

### Eliminar Viaje
- [ ] Eliminar viaje sin reservas (debería funcionar)
- [ ] Eliminar viaje CON reservas (debería dar error)
- [ ] Eliminar viaje con choferes postulados (debería dar error)
- [ ] Mensaje de confirmación antes de eliminar

### Listar/Filtrar Viajes
- [ ] Ver lista de viajes
- [ ] Filtrar por fecha desde
- [ ] Filtrar por fecha hasta
- [ ] Filtrar por mínimo de cupos pendientes
- [ ] Filtrar por vendedor
- [ ] Filtrar por razón social (cliente)
- [ ] Los viajes se ordenan por fecha DESC

---

## 2. AUTORIZACIONES

### Crear Autorización
- [ ] Crear autorización para un viaje
- [ ] Seleccionar chofer
- [ ] La tarifa se copia del viaje automáticamente
- [ ] Validar que no se pueda crear si no hay cupos disponibles

### Editar Autorización
- [ ] Cambiar chofer en autorización existente
- [ ] Cambiar tarifa en autorización
- [ ] Cambiar estado de autorización

### Eliminar Autorización
- [ ] Eliminar autorización que NO tiene ítems (debería funcionar)
- [ ] Eliminar autorización que SÍ tiene ítems (debería dar error o limpiar items primero)

---

## 3. POSTULACIONES DE CHOFERES

### Postular Chofer
- [ ] Postular chofer a viaje con cupos disponibles
- [ ] Validar que no se puede postular si no hay cupos
- [ ] Validar que no se puede postular el mismo chofer dos veces al mismo viaje

### Ver Postulaciones
- [ ] Ver lista de choferes postulados por viaje
- [ ] Ver contador de postulados en la lista de viajes

### Eliminar Postulación
- [ ] Eliminar postulación de chofer

---

## 4. GESTIÓN DE TERCEROS (Clientes)

- [ ] Ver lista de terceros
- [ ] Crear nuevo tercero
- [ ] Editar tercero existente
- [ ] Eliminar tercero (validar que no tenga viajes asociados)
- [ ] Buscar terceros en el selector del modal de viajes

---

## 5. GESTIÓN DE PRODUCTOS

- [ ] Ver lista de productos
- [ ] Crear nuevo producto
- [ ] Editar producto existente
- [ ] Eliminar producto
- [ ] Buscar productos en el selector del modal de viajes

---

## 6. GESTIÓN DE TRANSPORTES

- [ ] Ver lista de transportes
- [ ] Crear nuevo transporte
- [ ] Editar transporte existente
- [ ] Eliminar transporte

---

## 7. UI/UX GENERAL

### Modales
- [ ] El modal se abre correctamente
- [ ] El modal se cierra con el botón X
- [ ] El modal se cierra con el botón Cancelar
- [ ] Los datos se cargan correctamente al abrir para editar
- [ ] Los selectores con búsqueda funcionan (terceros, productos, vendedores, localidades)

### Notificaciones
- [ ] Aparecen notificaciones de éxito al crear
- [ ] Aparecen notificaciones de éxito al editar
- [ ] Aparecen notificaciones de éxito al eliminar
- [ ] Aparecen notificaciones de error cuando algo falla
- [ ] Las notificaciones muestran el mensaje correcto

### Responsive
- [ ] La app funciona en desktop
- [ ] La app funciona en tablet
- [ ] La app funciona en mobile
- [ ] Los modales son usables en mobile

---

## 8. VALIDACIONES DE NEGOCIO

- [ ] No se puede crear viaje con cupos <= 0
- [ ] No se puede crear viaje con tarifa negativa
- [ ] No se puede tener más reservados que cupos totales
- [ ] No se puede eliminar viaje con reservas
- [ ] No se puede eliminar viaje con postulaciones activas
- [ ] Los cupos pendientes se calculan correctamente: Cupos - Reservados - Postulados

---

## 9. PERFORMANCE

- [ ] Las páginas cargan en tiempo razonable
- [ ] Los selectores con búsqueda responden rápido
- [ ] Los filtros funcionan sin lag
- [ ] No hay errores en la consola del navegador (F12)

---

## FORMATO PARA REPORTAR ERRORES

Por cada error encontrado, anotá:

1. **Qué estabas haciendo**: "Intenté editar el artículo de un viaje existente"
2. **Qué esperabas que pasara**: "Que se actualice el artículo"
3. **Qué pasó realmente**: "El artículo no se actualiza, sigue mostrando el anterior"
4. **Pasos para reproducir**:
   - Ir a viajes
   - Abrir viaje #123
   - Cambiar artículo de X a Y
   - Guardar
   - Volver a abrir y sigue siendo X

---

## IMPORTANTE
- Probá TODO aunque algo falle
- Anotá TODOS los errores
- Mandame la lista completa de una sola vez
- Mientras más detalle mejor
